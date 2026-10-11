// walkforward.js
// Backtest honesto (walk-forward): cada bloque de partidos se predice con
// parámetros (HA, rho, goles/partido, tasas base) calibrados SOLO con partidos
// anteriores. Nada de lo que se evalúa se usó para ajustar.
// Compara contra la cuota real (sin margen) y mide el ROI de apostar cuando
// EV >= FILTRO_EV, con error estándar para separar señal de suerte.
//
// Limitación: los ratings de equipos de leagues.js son fijos (no se recalculan
// acá); si se armaron mirando partidos que caen en el test, hay algo de sesgo.

import { LIGAS, SHRINK_ALPHA, FILTRO_EV } from './leagues.js';
import { simulateMatch } from './model.js';
import { calibrarLigaMLE, shrinkHaciaBase } from './calibrate.js';

const Z_SIGNIFICATIVO = 1.64;
const ESCANEO_MIN_N = 30;

// ---------- utilidades ----------
function devigar2(a, b) {
  if (!a || !b) return null;
  const pa = 1 / a, pb = 1 / b;
  return (pa / (pa + pb)) * 100;
}
function devigar3(a, b, c) {
  if (!a || !b || !c) return null;
  const pa = 1 / a, pb = 1 / b, pc = 1 / c, s = pa + pb + pc;
  return [(pa / s) * 100, (pb / s) * 100, (pc / s) * 100];
}
function meanSd(arr) {
  const n = arr.length;
  if (!n) return { mean: null, sd: null };
  const mean = arr.reduce((x, y) => x + y, 0) / n;
  if (n < 2) return { mean, sd: null };
  const v = arr.reduce((x, y) => x + (y - mean) ** 2, 0) / (n - 1);
  return { mean, sd: Math.sqrt(v) };
}
function zMedia(arr) {
  const { mean, sd } = meanSd(arr);
  if (sd == null || sd < 1e-12) return null;
  return mean / (sd / Math.sqrt(arr.length));
}
const brier3 = (probsPct, idx) => probsPct.reduce((s, p, j) => s + (p / 100 - (j === idx ? 1 : 0)) ** 2, 0);

// ---------- acumuladores ----------
class BrierVsMercado {
  constructor(label) { this.label = label; this.bm = []; this.bk = []; this.d = []; }
  add(modeloPct, mercadoPct, hit) {
    if (modeloPct == null || mercadoPct == null || !Number.isFinite(modeloPct) || !Number.isFinite(mercadoPct)) return;
    const o = hit ? 1 : 0;
    const bm = (modeloPct / 100 - o) ** 2, bk = (mercadoPct / 100 - o) ** 2;
    this.bm.push(bm); this.bk.push(bk); this.d.push(bk - bm);
  }
  summary() {
    const n = this.d.length;
    const bModelo = n ? meanSd(this.bm).mean : null;
    const bMercado = n ? meanSd(this.bk).mean : null;
    return {
      label: this.label, n, bModelo, bMercado,
      mejora: n && bMercado > 1e-9 ? (bMercado - bModelo) / bMercado * 100 : null,
      z: zMedia(this.d),
    };
  }
}

class Escaneo {
  constructor() { this.m = {}; }
  add(clave, label, probPct, cuota, hit) {
    if (!cuota || probPct == null || !Number.isFinite(probPct) || hit == null) return;
    if (!((probPct / 100) * cuota > FILTRO_EV)) return;
    if (!this.m[clave]) this.m[clave] = { label, rets: [], hits: 0, sumEV: 0 };
    const o = this.m[clave];
    o.rets.push(hit ? cuota - 1 : -1);
    o.sumEV += (probPct / 100) * cuota;
    if (hit) o.hits++;
  }
  summary() {
    return Object.entries(this.m).map(([key, o]) => {
      const n = o.rets.length;
      const { mean, sd } = meanSd(o.rets);
      const se = sd != null ? sd / Math.sqrt(n) : null;
      return {
        key, label: o.label, n, hits: o.hits, rate: o.hits / n * 100, evMedio: o.sumEV / n,
        roi: mean * 100, se: se != null ? se * 100 : null,
        z: se && se > 1e-12 ? mean / se : null,
        profit: o.rets.reduce((x, y) => x + y, 0),
      };
    }).sort((a, b) => b.roi - a.roi);
  }
}

// ---------- motor ----------
export async function walkForward(leagueKey, partidosIn, { warmup = 40, step = 20, ventana = 200, onLog = null } = {}) {
  const log = (m) => { if (onLog) onLog(m); };
  const todos = [...partidosIn]
    .filter(p => p.goles_local != null && p.goles_visitante != null && p.local && p.visitante)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const n = todos.length;
  if (!LIGAS[leagueKey]) return { error: 'Liga no reconocida' };
  if (n < warmup + 10) return { error: `Solo ${n} partidos válidos: hacen falta al menos ${warmup + 10} (calentamiento ${warmup} + 10 de prueba).` };

  const b3Todos = { cal: [], base: [], dCalBase: [] };
  const b3Cuota = { cal: [], base: [], mkt: [], dMkt: [], dCalBase: [] };
  const mk = {
    local: new BrierVsMercado('Local gana'), empate: new BrierVsMercado('Empate'), visitante: new BrierVsMercado('Visitante gana'),
    over15: new BrierVsMercado('Over 1.5 goles'), over25: new BrierVsMercado('Over 2.5 goles'), over35: new BrierVsMercado('Over 3.5 goles'),
    btts: new BrierVsMercado('Ambos marcan (Sí)'),
  };
  const escaneo = new Escaneo();
  const bloques = [];
  let evaluados = 0, saltados = 0;

  for (let start = warmup; start < n; start += step) {
    const train = todos.slice(Math.max(0, start - ventana), start);
    const test = todos.slice(start, start + step);

    let cal = null, tasas = null;
    try {
      const r = await calibrarLigaMLE(leagueKey, train, { minPartidos: 20 });
      cal = r.calibracion; tasas = r.tasas;
    } catch (e) { log(`⚠️ Bloque en ${start}: calibración falló (${e.message}), se usan valores base.`); }

    bloques.push({
      nTrain: train.length, nTest: test.length,
      trainHasta: train[train.length - 1].fecha, testDesde: test[0].fecha, testHasta: test[test.length - 1].fecha,
      ha: cal?.homeAdvantage ?? null, rho: cal?.rho ?? null, calibrado: !!cal,
    });
    log(`Bloque ${bloques.length}: entrena ${train.length} · prueba ${test.length}${cal ? ` · HA ${cal.homeAdvantage.toFixed(2)} rho ${cal.rho.toFixed(2)}` : ' · sin calibrar'}`);

    for (const p of test) {
      let pc, pb;
      try {
        pc = await simulateMatch(leagueKey, p.local, p.visitante, { staticOnly: true, calibracion: cal });
        pb = await simulateMatch(leagueKey, p.local, p.visitante, { staticOnly: true, calibracion: null });
      } catch (e) { saltados++; continue; }
      evaluados++;

      const rp = SHRINK_ALPHA > 0 && tasas ? shrinkHaciaBase(pc.resultProbs, tasas, SHRINK_ALPHA) : pc.resultProbs;
      const gl = p.goles_local, gv = p.goles_visitante, tg = gl + gv;
      const idx = gl > gv ? 0 : gl === gv ? 1 : 2;
      const resultado = ['local', 'empate', 'visitante'][idx];
      const bttsReal = gl > 0 && gv > 0;

      const arrCal = [rp.local, rp.empate, rp.visitante];
      const arrBase = [pb.resultProbs.local, pb.resultProbs.empate, pb.resultProbs.visitante];
      const bC = brier3(arrCal, idx), bB = brier3(arrBase, idx);
      b3Todos.cal.push(bC); b3Todos.base.push(bB); b3Todos.dCalBase.push(bB - bC);

      const m3 = devigar3(p.odds_local, p.odds_empate, p.odds_visitante);
      if (m3) {
        const bM = brier3(m3, idx);
        b3Cuota.cal.push(bC); b3Cuota.base.push(bB); b3Cuota.mkt.push(bM);
        b3Cuota.dMkt.push(bM - bC); b3Cuota.dCalBase.push(bB - bC);
        mk.local.add(rp.local, m3[0], idx === 0);
        mk.empate.add(rp.empate, m3[1], idx === 1);
        mk.visitante.add(rp.visitante, m3[2], idx === 2);
      }
      const f15 = devigar2(p.odds_over15, p.odds_under15); if (f15 != null) mk.over15.add(pc.over15, f15, tg > 1.5);
      const f25 = devigar2(p.odds_over25, p.odds_under25); if (f25 != null) mk.over25.add(pc.over25, f25, tg > 2.5);
      const f35 = devigar2(p.odds_over35, p.odds_under35); if (f35 != null) mk.over35.add(pc.over35, f35, tg > 3.5);
      const fb = devigar2(p.odds_btts_si, p.odds_btts_no); if (fb != null) mk.btts.add(pc.btts, fb, bttsReal);

      const lados = [
        ['1', 'Local gana', rp.local, p.odds_local, resultado === 'local'],
        ['X', 'Empate', rp.empate, p.odds_empate, resultado === 'empate'],
        ['2', 'Visitante gana', rp.visitante, p.odds_visitante, resultado === 'visitante'],
        ['o15', 'Over 1.5 goles', pc.over15, p.odds_over15, tg > 1.5],
        ['u15', 'Under 1.5 goles', 100 - pc.over15, p.odds_under15, tg < 1.5],
        ['o25', 'Over 2.5 goles', pc.over25, p.odds_over25, tg > 2.5],
        ['u25', 'Under 2.5 goles', 100 - pc.over25, p.odds_under25, tg < 2.5],
        ['o35', 'Over 3.5 goles', pc.over35, p.odds_over35, tg > 3.5],
        ['u35', 'Under 3.5 goles', 100 - pc.over35, p.odds_under35, tg < 3.5],
        ['bs', 'BTTS Sí', pc.btts, p.odds_btts_si, bttsReal],
        ['bn', 'BTTS No', 100 - pc.btts, p.odds_btts_no, !bttsReal],
      ];
      for (const [k, label, prob, cuota, hit] of lados) escaneo.add(k, label, prob, cuota, hit);
    }
    await new Promise(r => setTimeout(r, 0));
  }

  const media = (a) => meanSd(a).mean;
  return {
    leagueKey, nTotal: n, evaluados, saltados, warmup, step, ventana, bloques,
    calibracionVsBase: {
      n: b3Todos.cal.length, cal: media(b3Todos.cal), base: media(b3Todos.base), z: zMedia(b3Todos.dCalBase),
    },
    modeloVsMercado1x2: {
      n: b3Cuota.cal.length, cal: media(b3Cuota.cal), base: media(b3Cuota.base), mkt: media(b3Cuota.mkt),
      zVsMkt: zMedia(b3Cuota.dMkt),
      mejoraVsMkt: b3Cuota.mkt.length ? (media(b3Cuota.mkt) - media(b3Cuota.cal)) / media(b3Cuota.mkt) * 100 : null,
    },
    mercados: Object.values(mk).map(m => m.summary()).filter(s => s.n > 0),
    escaneo: escaneo.summary(),
  };
}

// ---------- lectura en texto ----------
export function lecturaResultado(res) {
  const out = [];
  const c = res.calibracionVsBase;
  if (c.z != null) {
    if (c.z > Z_SIGNIFICATIVO) out.push('La calibración mejora el 1X2 fuera de muestra respecto a los valores base.');
    else if (c.z < -Z_SIGNIFICATIVO) out.push('La calibración EMPEORA el 1X2 fuera de muestra: conviene usar los valores base.');
    else out.push('La calibración no se distingue de los valores base fuera de muestra (no aporta ni resta de forma clara).');
  }
  const mejores = res.mercados.filter(m => m.z != null && m.z > Z_SIGNIFICATIVO).map(m => m.label);
  const peores = res.mercados.filter(m => m.z != null && m.z < -Z_SIGNIFICATIVO).map(m => m.label);
  if (mejores.length) out.push(`Mejor que la cuota (significativo): ${mejores.join(', ')}.`);
  if (peores.length) out.push(`Peor que la cuota (significativo): ${peores.join(', ')}.`);
  if (!mejores.length && !peores.length) out.push('Ningún mercado se separa claramente de la cuota: el modelo y la casa están a la par.');
  const roiOk = res.escaneo.filter(e => e.n >= ESCANEO_MIN_N && e.z != null && e.z > Z_SIGNIFICATIVO).map(e => e.label);
  if (roiOk.length) out.push(`ROI positivo estadísticamente distinguible de la suerte: ${roiOk.join(', ')}.`);
  else out.push('Ningún mercado muestra ROI positivo distinguible de la suerte (con n ≥ 30). No hay evidencia de ventaja todavía.');
  return out;
}

// ---------- interfaz (solo navegador) ----------
if (typeof document !== 'undefined' && document.getElementById('wf-run')) {
  const fileInput = document.getElementById('historial-file');
  const fileInfo = document.getElementById('file-info');
  const warmupInput = document.getElementById('warmup');
  const stepInput = document.getElementById('step');
  const runBtn = document.getElementById('wf-run');
  const logSection = document.getElementById('log-section');
  const logDiv = document.getElementById('log');
  const resultsSection = document.getElementById('results-section');
  const resultsContent = document.getElementById('results-content');
  let historial = null;

  const log = (m) => { logSection.style.display = 'block'; logDiv.textContent += m + '\n'; logDiv.scrollTop = logDiv.scrollHeight; };
  const f1 = (x) => Number(x).toFixed(1);
  const f3 = (x) => x == null ? '—' : Number(x).toFixed(3);
  const dim = 'var(--text-dim,#8b95a5)';

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    runBtn.disabled = true; historial = null;
    if (!file) { fileInfo.textContent = ''; return; }
    try {
      const data = JSON.parse(await file.text());
      if (!data.leagueKey || !LIGAS[data.leagueKey]) { fileInfo.textContent = '❌ El archivo no tiene una liga reconocida (leagueKey).'; return; }
      if (!Array.isArray(data.partidos) || data.partidos.length === 0) { fileInfo.textContent = '❌ El archivo no tiene partidos.'; return; }
      historial = data;
      fileInfo.textContent = `✅ ${data.liga || data.leagueKey} — ${data.partidos.length} partidos cargados.`;
      runBtn.disabled = false;
    } catch (err) { fileInfo.textContent = '❌ No se pudo leer el archivo: ' + err.message; }
  });

  const senal = (z) => z == null ? '—' : z > Z_SIGNIFICATIVO ? '✅ mejor' : z < -Z_SIGNIFICATIVO ? '❌ peor' : '≈ empate';
  const colSenal = (z) => z == null ? dim : z > Z_SIGNIFICATIVO ? 'var(--green)' : z < -Z_SIGNIFICATIVO ? 'var(--red)' : 'var(--yellow)';

  function render(res) {
    const c = res.calibracionVsBase, m = res.modeloVsMercado1x2;
    const lectura = lecturaResultado(res).map(t => `<p style="margin:0 0 6px;font-size:.85rem;">• ${t}</p>`).join('');
    const filasMk = res.mercados.map(s => `<div class="compare-row"><span>${s.label}</span><span class="grid-plain">${s.n}</span><span class="grid-plain">${f3(s.bModelo)} vs ${f3(s.bMercado)}</span><span class="grid-plain" style="color:${colSenal(s.z)}">${s.mejora >= 0 ? '+' : ''}${f1(s.mejora)}% ${senal(s.z)}</span></div>`).join('');
    const filasEs = res.escaneo.map(e => {
      const col = e.n >= ESCANEO_MIN_N && e.z != null && e.z > Z_SIGNIFICATIVO ? 'var(--green)' : e.roi > 0 ? 'var(--yellow)' : 'var(--red)';
      return `<div class="compare-row"><span>${e.label}${e.n < ESCANEO_MIN_N ? ' ⚠️' : ''}</span><span class="grid-plain">${e.n} · ${f1(e.rate)}%</span><span class="grid-plain">EV ${e.evMedio.toFixed(2)}</span><span class="grid-plain" style="color:${col}">${e.roi >= 0 ? '+' : ''}${f1(e.roi)}%${e.se != null ? ` ±${f1(e.se)}` : ''}</span></div>`;
    }).join('');
    const filasBl = res.bloques.map((b, i) => `<div class="compare-row"><span>#${i + 1} · ${(b.testDesde || '').slice(0, 10)}</span><span class="grid-plain">train ${b.nTrain}</span><span class="grid-plain">test ${b.nTest}</span><span class="grid-plain">${b.ha != null ? `HA ${b.ha.toFixed(2)} / ${b.rho.toFixed(2)}` : 'base'}</span></div>`).join('');

    resultsContent.innerHTML = `
      <div class="card" style="border:2px solid var(--green);">
        <h3>🧭 Lectura <small>(${res.evaluados} partidos fuera de muestra)</small></h3>
        ${lectura}
      </div>
      <div class="card">
        <h3>Calibración vs valores base <small>(Brier 1X2, menor = mejor)</small></h3>
        <div class="compare-row"><span>Calibrado + shrink</span><span class="grid-plain">${f3(c.cal)}</span><span class="grid-plain"></span><span class="grid-plain">n ${c.n}</span></div>
        <div class="compare-row"><span>Valores base</span><span class="grid-plain">${f3(c.base)}</span><span class="grid-plain"></span><span class="grid-plain" style="color:${colSenal(c.z)}">${senal(c.z)}</span></div>
      </div>
      <div class="card">
        <h3>1X2 vs cuota real <small>(${m.n} partidos con cuotas)</small></h3>
        <div class="compare-row"><span>Modelo calibrado</span><span class="grid-plain">${f3(m.cal)}</span><span class="grid-plain"></span><span class="grid-plain"></span></div>
        <div class="compare-row"><span>Cuota (sin margen)</span><span class="grid-plain">${f3(m.mkt)}</span><span class="grid-plain"></span><span class="grid-plain" style="color:${colSenal(m.zVsMkt)}">${m.mejoraVsMkt == null ? '—' : (m.mejoraVsMkt >= 0 ? '+' : '') + f1(m.mejoraVsMkt) + '% ' + senal(m.zVsMkt)}</span></div>
      </div>
      <div class="card">
        <h3>Modelo vs cuota por mercado <small>(Brier, menor = mejor)</small></h3>
        <div class="compare-row compare-head"><span>Mercado</span><span>n</span><span>Modelo vs cuota</span><span>Mejora</span></div>
        ${filasMk || '<div class="compare-row"><span>Sin cuotas en el historial.</span></div>'}
      </div>
      <div class="card" style="border:2px solid var(--yellow);">
        <h3>🔎 Apostar con EV ≥ ${FILTRO_EV} <small>(fuera de muestra)</small></h3>
        <div class="compare-row compare-head"><span>Mercado</span><span>Apuestas · acierto</span><span>EV medio</span><span>ROI ± error</span></div>
        ${filasEs || '<div class="compare-row"><span>Ningún lado superó el filtro EV.</span></div>'}
        <p style="margin:10px 0 0;font-size:.78rem;color:${dim};line-height:1.5;">
          ROI ± error estándar. Si el ROI no supera ~1.64 veces el error, puede ser suerte. ⚠️ = menos de ${ESCANEO_MIN_N} apuestas.
          Todo se predijo con parámetros calibrados solo con partidos anteriores. Los ratings de equipos de leagues.js son fijos.
        </p>
      </div>
      <div class="card">
        <h3>Bloques <small>(calibración: entrena con lo anterior, prueba el bloque)</small></h3>
        ${filasBl}
      </div>`;
    resultsSection.style.display = 'block';
  }

  runBtn.addEventListener('click', async () => {
    if (!historial) return;
    runBtn.disabled = true; runBtn.textContent = 'Calculando...';
    logDiv.textContent = ''; resultsSection.style.display = 'none';
    try {
      const warmup = Math.max(20, +warmupInput.value || 40);
      const step = Math.max(5, +stepInput.value || 20);
      const res = await walkForward(historial.leagueKey, historial.partidos, { warmup, step, onLog: log });
      if (res.error) { log('❌ ' + res.error); }
      else { log(`✅ Listo: ${res.evaluados} evaluados, ${res.saltados} salteados.`); render(res); }
    } catch (err) {
      console.error(err); log('❌ Error: ' + err.message);
    } finally {
      runBtn.disabled = false; runBtn.textContent = 'Ejecutar walk-forward';
    }
  });
}
