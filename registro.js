// registro.js
// Registro de predicciones hacia adelante (forward test).
// Guardás la predicción del modelo ANTES del partido (con las cuotas que veas),
// después cargás el resultado, y acá se compara contra la cuota con la misma
// lógica del walk-forward (Brier vs cuota sin margen, ROI con EV >= FILTRO_EV).
// Es la única prueba limpia: nada de lo evaluado pudo usarse para ajustar.

import { FILTRO_EV } from './leagues.js';
import { resumenCLV, clvPct } from './clv.js';

const KEY = 'suertudo_registro_v1';
const Z = 1.64;
const META_PARTIDOS = 100;
const ESCANEO_MIN_N = 30;

// ---------- almacenamiento ----------
function store() { return (typeof localStorage !== 'undefined') ? localStorage : null; }

export function leerRegistro() {
  try {
    const raw = store()?.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch (e) { return []; }
}

export function guardarRegistro(arr) {
  const s = store();
  if (!s) throw new Error('Sin almacenamiento local en este navegador');
  s.setItem(KEY, JSON.stringify(arr));
}

const nuevoId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const r2 = (v) => (typeof v === 'number' && Number.isFinite(v) ? +v.toFixed(2) : null);

// Arma la entrada a partir del resultado de simulateMatch (ya con shrink aplicado).
// cuotas: { local, empate, visitante, over15, under15, ..., bttsSi, bttsNo, c_over75, c_under75, ... }
export function entradaDesdeSimulacion(data, ligaKey, cuotas = {}) {
  const rp = data.resultProbs;
  const cp = data.cornerProbs;
  const limpias = {};
  for (const [k, v] of Object.entries(cuotas)) if (Number.isFinite(v) && v > 1) limpias[k] = v;
  return {
    id: nuevoId(),
    creado: new Date().toISOString(),
    liga: ligaKey,
    ligaNombre: data.liga || ligaKey,
    local: data.homeTeam,
    visitante: data.awayTeam,
    prob: {
      local: r2(rp.local), empate: r2(rp.empate), visitante: r2(rp.visitante),
      over15: r2(data.over15), over25: r2(data.over25), over35: r2(data.over35), over45: r2(data.over45), btts: r2(data.btts),
    },
    corners: cp ? { over7: r2(cp.over7), over8: r2(cp.over8), over9: r2(cp.over9), over10: r2(cp.over10) } : null,
    cuotas: limpias,
    cierre: null,   // cuota de cierre (se completa al cargar el resultado)
    resultado: null,
  };
}

// Si ya hay una pendiente del mismo partido, la reemplaza (no se cuenta dos veces).
export function agregarEntrada(entrada) {
  const arr = leerRegistro();
  const i = arr.findIndex(e => !e.resultado && e.liga === entrada.liga && e.local === entrada.local && e.visitante === entrada.visitante);
  let reemplazada = false;
  if (i >= 0) { entrada.id = arr[i].id; arr[i] = entrada; reemplazada = true; }
  else arr.push(entrada);
  guardarRegistro(arr);
  return { reemplazada, id: entrada.id, total: arr.length };
}

export function actualizarResultado(id, { gl, gv, corners = null, cierre = null }) {
  if (!Number.isInteger(gl) || !Number.isInteger(gv) || gl < 0 || gv < 0) throw new Error('Goles inválidos');
  const arr = leerRegistro();
  const e = arr.find(x => x.id === id);
  if (!e) throw new Error('No existe esa entrada');
  e.resultado = { gl, gv };
  if (Number.isInteger(corners) && corners >= 0) e.resultado.corners = corners;
  if (Number.isFinite(cierre) && cierre > 1) e.cierre = +cierre.toFixed(2);
  e.resuelto = new Date().toISOString();
  guardarRegistro(arr);
  return e;
}

export function borrarResultado(id) {
  const arr = leerRegistro();
  const e = arr.find(x => x.id === id);
  if (!e) return;
  e.resultado = null; delete e.resuelto;
  guardarRegistro(arr);
}

export function borrarEntrada(id) {
  guardarRegistro(leerRegistro().filter(e => e.id !== id));
}

export function importarEntradas(nuevas) {
  const lista = Array.isArray(nuevas) ? nuevas : nuevas?.entradas;
  if (!Array.isArray(lista)) throw new Error('El archivo no tiene una lista de entradas');
  const arr = leerRegistro();
  const ids = new Set(arr.map(e => e.id));
  let agregadas = 0, omitidas = 0;
  for (const e of lista) {
    const valida = e && e.id && e.liga && e.local && e.visitante && e.prob
      && ['local', 'empate', 'visitante'].every(k => Number.isFinite(e.prob[k]));
    if (!valida || ids.has(e.id)) { omitidas++; continue; }
    arr.push(e); ids.add(e.id); agregadas++;
  }
  guardarRegistro(arr);
  return { agregadas, omitidas };
}

// ---------- estadística ----------
function devigar2(a, b) { if (!a || !b) return null; const pa = 1 / a, pb = 1 / b; return (pa / (pa + pb)) * 100; }
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
  return { mean, sd: Math.sqrt(arr.reduce((x, y) => x + (y - mean) ** 2, 0) / (n - 1)) };
}
function zMedia(arr) {
  const { mean, sd } = meanSd(arr);
  if (sd == null || sd < 1e-12) return null;
  return mean / (sd / Math.sqrt(arr.length));
}
const media = (a) => meanSd(a).mean;
const brier3 = (ps, idx) => ps.reduce((s, p, j) => s + (p / 100 - (j === idx ? 1 : 0)) ** 2, 0);

class BrierVs {
  constructor(label) { this.label = label; this.bm = []; this.bk = []; this.d = []; }
  add(pm, pk, hit) {
    if (pm == null || pk == null || !Number.isFinite(pm) || !Number.isFinite(pk)) return;
    const o = hit ? 1 : 0, bm = (pm / 100 - o) ** 2, bk = (pk / 100 - o) ** 2;
    this.bm.push(bm); this.bk.push(bk); this.d.push(bk - bm);
  }
  summary() {
    const n = this.d.length, bModelo = n ? media(this.bm) : null, bMercado = n ? media(this.bk) : null;
    return { label: this.label, n, bModelo, bMercado, mejora: n && bMercado > 1e-9 ? (bMercado - bModelo) / bMercado * 100 : null, z: zMedia(this.d) };
  }
}

class Apuestas {
  constructor() { this.m = {}; this.pool = []; }
  add(clave, label, probPct, cuota, hit) {
    if (!cuota || probPct == null || !Number.isFinite(probPct) || hit == null) return;
    if (!((probPct / 100) * cuota > FILTRO_EV)) return;
    if (!this.m[clave]) this.m[clave] = { label, rets: [], hits: 0, sumEV: 0 };
    const o = this.m[clave], ret = hit ? cuota - 1 : -1;
    o.rets.push(ret); o.sumEV += (probPct / 100) * cuota; if (hit) o.hits++;
    this.pool.push(ret);
  }
  static resumir(rets) {
    const n = rets.length, { mean, sd } = meanSd(rets), se = sd != null ? sd / Math.sqrt(n) : null;
    return { n, roi: mean != null ? mean * 100 : null, se: se != null ? se * 100 : null, z: se && se > 1e-12 ? mean / se : null };
  }
  summary() {
    return Object.entries(this.m).map(([key, o]) => ({
      key, label: o.label, ...Apuestas.resumir(o.rets), rate: o.hits / o.rets.length * 100, evMedio: o.sumEV / o.rets.length,
    })).sort((a, b) => b.roi - a.roi);
  }
}

// Mercados que se siguen en el registro (los únicos que aparecen en la app y acá).
// Los de una sola cara (Más de 1.5, Más de 2.5, Menos de 3.5, Menos de 4.5 y
// los de córners) no tienen cuota contraria para quitar el margen, así que se
// miden por calibración (predicho vs real) y ROI. 1X2 y BTTS sí se comparan
// contra la cuota sin margen.
export const MERCADOS = [
  { key: 'local', label: 'Local gana', p: e => e.prob?.local, hit: r => r.gl > r.gv },
  { key: 'empate', label: 'Empate', p: e => e.prob?.empate, hit: r => r.gl === r.gv },
  { key: 'visitante', label: 'Visitante gana', p: e => e.prob?.visitante, hit: r => r.gl < r.gv },
  { key: 'over15', label: 'Más de 1.5 goles', p: e => e.prob?.over15, hit: r => r.gl + r.gv > 1.5 },
  { key: 'over25', label: 'Más de 2.5 goles', p: e => e.prob?.over25, hit: r => r.gl + r.gv > 2.5 },
  { key: 'under35', label: 'Menos de 3.5 goles', p: e => 100 - e.prob?.over35, hit: r => r.gl + r.gv < 3.5 },
  { key: 'under45', label: 'Menos de 4.5 goles', p: e => 100 - e.prob?.over45, hit: r => r.gl + r.gv < 4.5 },
  { key: 'bttsSi', label: 'BTTS Sí', p: e => e.prob?.btts, hit: r => r.gl > 0 && r.gv > 0 },
  { key: 'bttsNo', label: 'BTTS No', p: e => 100 - e.prob?.btts, hit: r => !(r.gl > 0 && r.gv > 0) },
  { key: 'c_over75', label: 'Más de 7.5 córners', corners: true, p: e => e.corners?.over7, hit: r => r.corners > 7.5 },
  { key: 'c_over85', label: 'Más de 8.5 córners', corners: true, p: e => e.corners?.over8, hit: r => r.corners > 8.5 },
  { key: 'c_under95', label: 'Menos de 9.5 córners', corners: true, p: e => 100 - e.corners?.over9, hit: r => r.corners < 9.5 },
  { key: 'c_under105', label: 'Menos de 10.5 córners', corners: true, p: e => 100 - e.corners?.over10, hit: r => r.corners < 10.5 },
];
const CLAVES_MERCADOS = new Set(MERCADOS.map(m => m.key));

export function evaluar(entradas) {
  const res = entradas.filter(e => e.resultado && Number.isFinite(e.resultado.gl) && Number.isFinite(e.resultado.gv) && e.prob);
  const b3Modelo = [], b3ModC = [], b3Mkt = [], dMkt = [];
  const mk = {
    local: new BrierVs('Local gana'), empate: new BrierVs('Empate'), visitante: new BrierVs('Visitante gana'),
    bttsSi: new BrierVs('BTTS Sí'),
  };
  const ap = new Apuestas();
  const cal = Object.fromEntries(MERCADOS.map(m => [m.key, { n: 0, sumP: 0, hits: 0 }]));
  let conCuotas1x2 = 0;

  for (const e of res) {
    const p = e.prob, o = e.cuotas || {}, r = e.resultado, { gl, gv } = r;
    const idx = gl > gv ? 0 : gl === gv ? 1 : 2, bttsReal = gl > 0 && gv > 0;
    const bModelo = brier3([p.local, p.empate, p.visitante], idx);
    b3Modelo.push(bModelo);

    const m3 = devigar3(o.local, o.empate, o.visitante);
    if (m3) {
      conCuotas1x2++;
      b3ModC.push(bModelo); b3Mkt.push(brier3(m3, idx)); dMkt.push(brier3(m3, idx) - bModelo);
      mk.local.add(p.local, m3[0], idx === 0); mk.empate.add(p.empate, m3[1], idx === 1); mk.visitante.add(p.visitante, m3[2], idx === 2);
    }
    const fb = devigar2(o.bttsSi, o.bttsNo);
    if (fb != null) mk.bttsSi.add(p.btts, fb, bttsReal);

    for (const m of MERCADOS) {
      const prob = m.p(e);
      if (!Number.isFinite(prob)) continue;
      if (m.corners && !Number.isFinite(r.corners)) continue;
      const hit = m.hit(r);
      const c = cal[m.key]; c.n++; c.sumP += prob; if (hit) c.hits++;
      ap.add(m.key, m.label, prob, o[m.key], hit);
    }
  }

  const n = res.length;
  const b1x2 = {
    n, modelo: media(b3Modelo),
    nCuota: b3ModC.length, modeloCuota: media(b3ModC), mercado: media(b3Mkt), z: zMedia(dMkt),
    mejora: b3Mkt.length ? (media(b3Mkt) - media(b3ModC)) / media(b3Mkt) * 100 : null,
  };
  const escaneo = ap.summary();
  const pool = Apuestas.resumir(ap.pool);
  const calibracion = MERCADOS.map(m => ({
    key: m.key, label: m.label, n: cal[m.key].n,
    probMedia: cal[m.key].n ? cal[m.key].sumP / cal[m.key].n : null,
    frecReal: cal[m.key].n ? cal[m.key].hits / cal[m.key].n * 100 : null,
  })).filter(c => c.n > 0);

  const lectura = [];
  lectura.push(n >= META_PARTIDOS ? `Resueltas: ${n} (ya pasaste las ${META_PARTIDOS} recomendadas para una primera lectura; ${entradas.length - n} pendientes).` : `Resueltas: ${n} de ${META_PARTIDOS} recomendadas para una primera lectura (${entradas.length - n} pendientes).`);
  if (n < 30) lectura.push('Muestra muy chica: todavía no saques conclusiones.');
  else if (conCuotas1x2 < 30) lectura.push('Hay pocas con cuotas 1X2 cargadas: sin cuota no se puede comparar contra la casa. Cargala al guardar cada predicción.');
  else if (b1x2.z != null) {
    if (b1x2.z > Z) lectura.push('En 1X2 el modelo le gana a la cuota de forma significativa.');
    else if (b1x2.z < -Z) lectura.push('En 1X2 el modelo es PEOR que la cuota de forma significativa.');
    else lectura.push('En 1X2 el modelo y la cuota están a la par (no se distinguen).');
  }
  if (pool.n >= ESCANEO_MIN_N && pool.roi != null) {
    const sig = pool.z != null && pool.z > Z ? ' y supera el umbral de significancia' : pool.z != null && pool.z < -Z ? ' y es significativamente negativo' : ' pero no se distingue de la suerte';
    lectura.push(`Apostando todo lo que el modelo ve con EV ≥ ${FILTRO_EV}: ROI ${pool.roi >= 0 ? '+' : ''}${pool.roi.toFixed(1)}% ±${pool.se.toFixed(1)} en ${pool.n} apuestas${sig}.`);
  }
  if (n >= 30) {
    const malos = calibracion.filter(c => c.n >= 30 && Math.abs(c.probMedia - c.frecReal) >= 8).map(c => c.label);
    if (malos.length) lectura.push(`Calibración floja (predicho y real difieren 8 puntos o más): ${malos.join(', ')}.`);
    lectura.push('Para confirmar un ROI real de pocos puntos hacen falta más de 1000 apuestas; el Brier contra la cuota y la calibración se estabilizan antes.');
  }

  return {
    n, pendientes: entradas.length - n, meta: META_PARTIDOS, conCuotas1x2,
    b1x2, mercados: Object.values(mk).map(m => m.summary()).filter(s => s.n > 0),
    escaneo, pool, calibracion, lectura,
  };
}

// ---------- interfaz (solo en registro.html) ----------
if (typeof document !== 'undefined' && document.getElementById('reg-pendientes')) {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const f1 = (x) => Number(x).toFixed(1);
  const f3 = (x) => x == null ? '—' : Number(x).toFixed(3);
  const dim = 'var(--text-dim,#8b95a5)';
  const col = (z) => z == null ? dim : z > Z ? 'var(--green)' : z < -Z ? 'var(--red)' : 'var(--yellow)';
  const senal = (z) => z == null ? '—' : z > Z ? '✅ mejor' : z < -Z ? '❌ peor' : '≈ empate';
  const fechaCorta = (iso) => (iso || '').slice(0, 10);

  function cuotasTxt(e) {
    const n = Object.keys(e.cuotas || {}).filter(k => CLAVES_MERCADOS.has(k)).length;
    return n ? `${n} cuotas` : 'sin cuotas';
  }

  function cardPendiente(e) {
    const p = e.prob;
    return `<div class="card">
      <h3 style="font-size:.95rem;">${esc(e.local)} vs ${esc(e.visitante)}</h3>
      <p style="margin:0 0 8px;font-size:.75rem;color:${dim};">${esc(e.ligaNombre)} · guardada ${fechaCorta(e.creado)} · L ${f1(p.local)}% E ${f1(p.empate)}% V ${f1(p.visitante)}% · ${cuotasTxt(e)}</p>
      <div class="field-row" style="margin-bottom:8px;grid-template-columns:1fr 1fr 1fr;">
        <input type="text" inputmode="numeric" id="gl-${esc(e.id)}" placeholder="goles local" style="padding:8px;text-align:center;">
        <input type="text" inputmode="numeric" id="gv-${esc(e.id)}" placeholder="goles visit." style="padding:8px;text-align:center;">
        <input type="text" inputmode="numeric" id="cc-${esc(e.id)}" placeholder="córners tot." style="padding:8px;text-align:center;">
      </div>
      <div class="field-row" style="margin-bottom:8px;grid-template-columns:1fr;">
        <input type="text" inputmode="decimal" id="ci-${esc(e.id)}" placeholder="cuota de cierre del pick (opcional)" style="padding:8px;text-align:center;">
      </div>
      <button data-accion="resultado" data-id="${esc(e.id)}" style="margin-right:8px;">Guardar resultado</button>
      <button data-accion="borrar" data-id="${esc(e.id)}" style="background:var(--surface-2,#1c2530);color:var(--text,#f0f3f7);">🗑</button>
    </div>`;
  }

  function cardResuelta(e) {
    const r = e.resultado;
    return `<div class="compare-row" style="grid-template-columns:1.6fr .7fr auto;"><span>${esc(e.local)} vs ${esc(e.visitante)}<br><small style="color:${dim};">${fechaCorta(e.creado)} · ${cuotasTxt(e)}</small></span><span class="grid-plain"><strong>${r.gl}-${r.gv}</strong>${Number.isFinite(r.corners) ? `<br><small>${r.corners} córn.</small>` : ''}</span><span><button data-accion="reabrir" data-id="${esc(e.id)}" style="padding:6px 10px;font-size:.75rem;">↩︎</button></span></div>`;
  }

  function render() {
    const arr = leerRegistro();
    const ev = evaluar(arr);
    const pend = arr.filter(e => !e.resultado).sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
    const resu = arr.filter(e => e.resultado).sort((a, b) => (b.resuelto || '').localeCompare(a.resuelto || ''));

    $('reg-resumen').innerHTML = `<div class="compare-row"><span>Guardadas</span><span class="grid-plain">${arr.length}</span><span class="grid-plain"></span><span class="grid-plain"></span></div>
      <div class="compare-row"><span>Pendientes de resultado</span><span class="grid-plain">${pend.length}</span><span class="grid-plain"></span><span class="grid-plain"></span></div>
      <div class="compare-row"><span>Resueltas</span><span class="grid-plain">${ev.n} / ${ev.meta}</span><span class="grid-plain"></span><span class="grid-plain"></span></div>
      <div class="semaforo-track" style="margin-top:8px;"><div class="semaforo-fill" style="width:${Math.min(100, ev.n / ev.meta * 100)}%;background:var(--green)"></div></div>`;

    $('reg-pendientes').innerHTML = pend.length ? pend.map(cardPendiente).join('') : `<p style="color:${dim};font-size:.85rem;">No hay predicciones pendientes. Simulá un partido en la app y tocá "Guardar predicción".</p>`;
    $('reg-resueltas').innerHTML = resu.length ? `<div class="card">${resu.slice(0, 30).map(cardResuelta).join('')}</div>` : `<p style="color:${dim};font-size:.85rem;">Todavía no cargaste resultados.</p>`;

    if (!ev.n) { $('reg-eval').innerHTML = `<p style="color:${dim};font-size:.85rem;">La evaluación aparece cuando cargues el primer resultado.</p>`; return; }

    // ——— CLV: ¿le ganamos a la cuota de cierre? ———
    const conCierre = resu.filter(e => e.cierre && e.cuotas && Object.keys(e.cuotas).length);
    if (conCierre.length >= 5) {
      const r = resumenCLV(conCierre.map(e => ({
        cuota: Math.max(...Object.values(e.cuotas)),
        cuotaCierre: e.cierre,
      })));
      const colorClv = r.media > 1 ? 'var(--green)' : r.media > -1 ? 'var(--yellow)' : 'var(--red)';
      $('reg-resumen').innerHTML += `<div class="compare-row"><span>CLV (${r.n} con cierre)</span><span class="grid-plain" style="color:${colorClv}">${r.media >= 0 ? '+' : ''}${r.media}% media</span><span class="grid-plain">${r.pctPositivo}% positivo</span><span class="grid-plain" style="color:${colorClv}">${r.media > 0 ? 'vence al cierre ✅' : 'no vence al cierre ⚠️'}</span></div>`;
    }


    const lectura = ev.lectura.map(t => `<p style="margin:0 0 6px;font-size:.85rem;">• ${esc(t)}</p>`).join('');
    const filasMk = ev.mercados.map(s => `<div class="compare-row"><span>${s.label}</span><span class="grid-plain">${s.n}</span><span class="grid-plain">${f3(s.bModelo)} vs ${f3(s.bMercado)}</span><span class="grid-plain" style="color:${col(s.z)}">${s.mejora >= 0 ? '+' : ''}${f1(s.mejora)}% ${senal(s.z)}</span></div>`).join('');
    const filasEs = ev.escaneo.map(e => {
      const c = e.n >= ESCANEO_MIN_N && e.z != null && e.z > Z ? 'var(--green)' : e.roi > 0 ? 'var(--yellow)' : 'var(--red)';
      return `<div class="compare-row"><span>${e.label}${e.n < ESCANEO_MIN_N ? ' ⚠️' : ''}</span><span class="grid-plain">${e.n} · ${f1(e.rate)}%</span><span class="grid-plain">EV ${e.evMedio.toFixed(2)}</span><span class="grid-plain" style="color:${c}">${e.roi >= 0 ? '+' : ''}${f1(e.roi)}%${e.se != null ? ` ±${f1(e.se)}` : ''}</span></div>`;
    }).join('');
    const filasCal = ev.calibracion.map(c => { const d = c.frecReal - c.probMedia; const cc = Math.abs(d) >= 8 ? 'var(--red)' : Math.abs(d) >= 4 ? 'var(--yellow)' : 'var(--green)'; return `<div class="compare-row"><span>${c.label}</span><span class="grid-plain">${c.n}</span><span class="grid-plain">pred ${f1(c.probMedia)}%</span><span class="grid-plain" style="color:${cc}">real ${f1(c.frecReal)}%</span></div>`; }).join('');
    const b = ev.b1x2;

    $('reg-eval').innerHTML = `
      <div class="card" style="border:2px solid var(--green);"><h3>🧭 Lectura <small>(${ev.n} resueltas)</small></h3>${lectura}</div>
      <div class="card"><h3>1X2 <small>(Brier, menor = mejor)</small></h3>
        <div class="compare-row"><span>Modelo (todas)</span><span class="grid-plain">${f3(b.modelo)}</span><span class="grid-plain">n ${b.n}</span><span class="grid-plain"></span></div>
        <div class="compare-row"><span>Modelo (con cuotas)</span><span class="grid-plain">${f3(b.modeloCuota)}</span><span class="grid-plain">n ${b.nCuota}</span><span class="grid-plain"></span></div>
        <div class="compare-row"><span>Cuota (sin margen)</span><span class="grid-plain">${f3(b.mercado)}</span><span class="grid-plain"></span><span class="grid-plain" style="color:${col(b.z)}">${b.mejora == null ? '—' : (b.mejora >= 0 ? '+' : '') + f1(b.mejora) + '% ' + senal(b.z)}</span></div>
      </div>
      <div class="card"><h3>Modelo vs cuota <small>(solo 1X2 y BTTS: tienen cuota contraria)</small></h3>
        <div class="compare-row compare-head"><span>Mercado</span><span>n</span><span>Modelo vs cuota</span><span>Mejora</span></div>
        ${filasMk || `<div class="compare-row"><span>Sin cuotas cargadas.</span></div>`}</div>
      <div class="card" style="border:2px solid var(--yellow);"><h3>🔎 Apostar con EV ≥ ${FILTRO_EV} <small>(${ev.pool.n} apuestas${ev.pool.roi != null ? `, ROI ${ev.pool.roi >= 0 ? '+' : ''}${f1(ev.pool.roi)}%${ev.pool.se != null ? ` ±${f1(ev.pool.se)}` : ''}` : ''})</small></h3>
        <div class="compare-row compare-head"><span>Mercado</span><span>Apuestas · acierto</span><span>EV medio</span><span>ROI ± error</span></div>
        ${filasEs || `<div class="compare-row"><span>Ningún lado superó el filtro EV con cuotas cargadas.</span></div>`}
        <p style="margin:10px 0 0;font-size:.78rem;color:${dim};line-height:1.5;">Simula apostar 1 unidad a todo lo que el modelo veía con valor. ⚠️ = menos de ${ESCANEO_MIN_N} apuestas.</p></div>
      <div class="card"><h3>Calibración por mercado <small>(predicho vs real)</small></h3>
        <div class="compare-row compare-head"><span>Mercado</span><span>n</span><span>Predicho</span><span>Real</span></div>
        ${filasCal}
        <p style="margin:10px 0 0;font-size:.78rem;color:${dim};line-height:1.5;">Si lo predicho y lo real se alejan 8 puntos o más (rojo), el modelo está mal calibrado en ese mercado. Los mercados de una sola cara no tienen cuota contraria, por eso se miden así y con el ROI.</p></div>`;
  }

  function entero(txt) {
    const t = String(txt ?? '').trim();
    return /^\d+$/.test(t) ? parseInt(t, 10) : null;
  }

  $('reg-pendientes').addEventListener('click', (ev) => {
    const t = ev.target, id = t?.dataset?.id, acc = t?.dataset?.accion;
    if (!id || !acc) return;
    if (acc === 'borrar') { if (confirm('¿Borrar esta predicción?')) { borrarEntrada(id); render(); } return; }
    if (acc === 'resultado') {
      const gl = entero($('gl-' + id).value), gv = entero($('gv-' + id).value);
      const ccTxt = $('cc-' + id).value;
      const cc = String(ccTxt ?? '').trim() === '' ? null : entero(ccTxt);
      if (gl == null || gv == null) { alert('Cargá los goles de los dos equipos (números enteros).'); return; }
      if (String(ccTxt ?? '').trim() !== '' && cc == null) { alert('Los córners tienen que ser un número entero (o dejalo vacío).'); return; }
      let cierre = null;
      const ciTxt = String($('ci-' + id)?.value ?? '').trim().replace(',', '.');
      if (ciTxt !== '') {
        const ci = parseFloat(ciTxt);
        if (!Number.isFinite(ci) || ci <= 1) { alert('La cuota de cierre tiene que ser un número mayor que 1 (o dejalo vacío).'); return; }
        cierre = ci;
      }
      try { actualizarResultado(id, { gl, gv, corners: cc, cierre }); render(); } catch (e) { alert('Error: ' + e.message); }
    }
  });

  $('reg-resueltas').addEventListener('click', (ev) => {
    const t = ev.target, id = t?.dataset?.id;
    if (t?.dataset?.accion === 'reabrir' && id) { borrarResultado(id); render(); }
  });

  // CSV: una fila por (partido resuelto × mercado con cuota). Listo para Excel/Sheets.
  function exportarCSV(arr) {
    const resu = arr.filter(e => e.resultado && e.cuotas);
    const enc = ['fecha','liga','partido','mercado','prob_modelo','cuota','ev','cierre','clv','acierto','retorno_u'];
    const escap = (v) => { const t = String(v ?? ''); return /[",\n;]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    const fnum = (v, d = 2) => (v == null || !Number.isFinite(v)) ? '' : Number(v).toFixed(d);
    const lineas = [enc.join(';')];
    for (const e of resu) {
      const r = e.resultado;
      const partido = `${e.local} vs ${e.visitante}`;
      const fecha = (e.creado || '').slice(0, 10);
      for (const m of MERCADOS) {
        const cuota = e.cuotas[m.key];
        if (!Number.isFinite(cuota)) continue;
        const prob = m.p(e);
        if (!Number.isFinite(prob)) continue;
        const hit = m.hit(r);
        const ev = (prob / 100) * cuota;
        const clv = (Number.isFinite(e.cierre) && e.cierre > 1) ? clvPct(cuota, e.cierre) : null;
        lineas.push([fecha, e.liga, partido, m.label, fnum(prob, 1), fnum(cuota), fnum(ev), fnum(e.cierre), clv == null ? '' : fnum(clv, 2), hit ? 1 : 0, fnum(hit ? cuota - 1 : -1)].map(escap).join(';'));
      }
    }
    return '﻿' + lineas.join('\n');   // BOM para que Excel abra las tildes
  }

  function descargar(contenido, nombre, tipo) {
    const blob = new Blob([contenido], { type: tipo });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = nombre;
    document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }

  $('reg-export').addEventListener('click', () => {
    const arr = leerRegistro();
    if (!arr.length) { alert('No hay nada para exportar.'); return; }
    const hoy = new Date().toISOString().slice(0, 10);
    descargar(JSON.stringify({ version: 1, exportado: new Date().toISOString(), entradas: arr }, null, 2), `registro_suertudo_${hoy}.json`, 'application/json');
    descargar(exportarCSV(arr), `picks_suertudo_${hoy}.csv`, 'text/csv;charset=utf-8;');
  });

  $('reg-import').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const r = importarEntradas(JSON.parse(await file.text()));
      $('reg-import-info').textContent = `✅ ${r.agregadas} agregadas, ${r.omitidas} omitidas (repetidas o inválidas).`;
      render();
    } catch (err) { $('reg-import-info').textContent = '❌ ' + err.message; }
  });

  render();
}
