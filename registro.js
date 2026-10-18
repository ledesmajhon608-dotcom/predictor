// registro.js
// v7: CLV. Cuota de cierre por pick (manual o desde Bzzoiro), evaluación de ventaja real
//     (global / por liga / por mercado) y estado por liga para decidir promociones con evidencia.
// v6: MERCADOS cubre todo lo que genera picks.js (under15, under25, c_over95).

import { FILTRO_EV, LIGAS } from './leagues.js';
import { clvPct, resumenCLV } from './clv.js';
import { valorPick, cuotaMinima } from './picks.js';
import { resolveLeagueId, findUpcomingEvent, fetchEventOdds, normalizarOddsBzzoiro } from './api.js';

const KEY = 'suertudo_registro_v1';
const Z = 1.64;
const META_PARTIDOS = 100;
const ESCANEO_MIN_N = 30;
const CLV_MIN_N = 30;        // mínimo de picks con cierre para opinar
const CLV_FIRME_N = 100;     // mínimo para confirmar ventaja
const CIERRE_MAX_MIN = 180;  // un cierre tomado a más de 3 h del inicio no cuenta

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

export function entradaDesdeSimulacion(data, ligaKey, cuotas = {}, picks = []) {
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
    picks: Array.isArray(picks) ? [...picks] : [],
    apuesta: null,
    resultado: null,
  };
}

export function agregarEntrada(entrada) {
  const arr = leerRegistro();
  const i = arr.findIndex(e => !e.resultado && e.liga === entrada.liga && e.local === entrada.local && e.visitante === entrada.visitante);
  let reemplazada = false;
  if (i >= 0) { entrada.id = arr[i].id; arr[i] = entrada; reemplazada = true; }
  else arr.push(entrada);
  guardarRegistro(arr);
  return { reemplazada, id: entrada.id, total: arr.length };
}

export function actualizarResultado(id, { gl, gv, corners = null, apCuota = null, apMonto = null }) {
  if (!Number.isInteger(gl) || !Number.isInteger(gv) || gl < 0 || gv < 0) throw new Error('Goles inválidos');
  const arr = leerRegistro();
  const e = arr.find(x => x.id === id);
  if (!e) throw new Error('No existe esa entrada');
  e.resultado = { gl, gv };
  if (Number.isInteger(corners) && corners >= 0) e.resultado.corners = corners;
  const cuota = parseFloat(String(apCuota ?? '').replace(',', '.'));
  const monto = parseFloat(String(apMonto ?? '').replace(',', '.'));
  if (Number.isFinite(cuota) && cuota > 1) {
    if (!Number.isFinite(monto) || monto <= 0) throw new Error('Si cargás cuota, cargá también el monto apostado (> 0).');
    e.apuesta = { cuota: +cuota.toFixed(2), monto: +monto.toFixed(2) };
  } else if (Number.isFinite(monto) && monto > 0) {
    throw new Error('Si cargás monto, cargá también la cuota apostada (> 1).');
  }
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

// Cuota de la casa por pick (la que viste/apostaste). Vacío = se borra.
export function guardarCuotas(id, mapa) {
  const arr = leerRegistro();
  const e = arr.find(x => x.id === id);
  if (!e) throw new Error('No existe esa entrada');
  const nuevas = Object.assign({}, e.cuotas || {});
  for (const k of (e.picks || [])) {
    if (!(k in (mapa || {}))) continue;
    const n = parseFloat(String(mapa[k]).replace(',', '.'));
    if (Number.isFinite(n) && n > 1) nuevas[k] = +n.toFixed(2); else delete nuevas[k];
  }
  e.cuotas = nuevas;
  guardarRegistro(arr);
  return e;
}

// Mercado (para el filtro EV de leagues.js) de cada pick.
export const MERCADO_FILTRO = {
  local: '1X2', empate: '1X2', visitante: '1X2', dc1X: '1X', dcX2: 'X2',
  over15: 'Over 1.5', over25: 'Over 2.5', over35: 'Over 3.5',
  under15: 'Under 1.5', under25: 'Under 2.5', under35: 'Under 3.5',
  bttsSi: 'BTTS Sí', bttsNo: 'BTTS No',
  c_over75: 'Córners', c_over85: 'Córners', c_over95: 'Córners',
};

export function guardarCierre(id, mapa, { fuente = 'manual', minutos = null } = {}) {
  const arr = leerRegistro();
  const e = arr.find(x => x.id === id);
  if (!e) throw new Error('No existe esa entrada');
  const limpio = {};
  for (const [k, v] of Object.entries(mapa || {})) {
    const n = parseFloat(String(v).replace(',', '.'));
    if (Number.isFinite(n) && n > 1) limpio[k] = +n.toFixed(2);
  }
  if (!Object.keys(limpio).length) throw new Error('Cargá al menos una cuota de cierre (mayor a 1).');
  e.cierre = Object.assign({}, e.cierre || {}, limpio);
  e.cierreTs = new Date().toISOString();
  e.cierreFuente = fuente;
  if (Number.isFinite(minutos)) e.cierreMin = Math.round(minutos); else delete e.cierreMin;
  guardarRegistro(arr);
  return e;
}

// Trae la cuota actual de Bzzoiro para los picks de la entrada. Solo vale como cierre
// si el partido todavía no empezó (se guarda cuántos minutos faltaban).
export async function traerCierre(id) {
  const e = leerRegistro().find(x => x.id === id);
  if (!e) throw new Error('No existe esa entrada');
  const nombre = (LIGAS[e.liga] && LIGAS[e.liga].name) || e.ligaNombre || e.liga;
  const bzzoiroId = await resolveLeagueId(e.liga, nombre);
  if (!bzzoiroId) throw new Error('Esta liga no tiene id en Bzzoiro.');
  const ev = await findUpcomingEvent(bzzoiroId, e.local, e.visitante);
  if (!ev) throw new Error('No encontré el partido en los próximos 14 días (¿ya empezó o ya se jugó?).');
  const inicio = Date.parse(ev.event_date || ev.date || '');
  const minutos = Number.isFinite(inicio) ? (inicio - Date.now()) / 60000 : null;
  if (minutos != null && minutos <= 0) throw new Error('El partido ya empezó: esa cuota no sirve como cierre.');
  const odds = normalizarOddsBzzoiro(await fetchEventOdds(ev.id));
  const mapa = {}, faltan = [];
  for (const key of (e.picks || [])) { if (odds[key]) mapa[key] = odds[key]; else faltan.push(key); }
  if (!Object.keys(mapa).length) throw new Error('Bzzoiro no tiene cuota para estos mercados (' + faltan.join(', ') + '). Cargala a mano.');
  guardarCierre(id, mapa, { fuente: 'bzzoiro', minutos });
  return { mapa, faltan, minutos };
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

export const MERCADOS = [
  { key: 'local', label: 'Local gana', p: e => e.prob?.local, hit: r => r.gl > r.gv },
  { key: 'empate', label: 'Empate', p: e => e.prob?.empate, hit: r => r.gl === r.gv },
  { key: 'visitante', label: 'Visitante gana', p: e => e.prob?.visitante, hit: r => r.gl < r.gv },
  { key: 'dc1X', label: 'Local o Empate (1X)',
    p: e => (Number.isFinite(e.prob?.local) && Number.isFinite(e.prob?.empate)) ? e.prob.local + e.prob.empate : null,
    hit: r => r.gl >= r.gv },
  { key: 'dcX2', label: 'Empate o Visitante (X2)',
    p: e => (Number.isFinite(e.prob?.empate) && Number.isFinite(e.prob?.visitante)) ? e.prob.empate + e.prob.visitante : null,
    hit: r => r.gl <= r.gv },
  { key: 'over15', label: 'Más de 1.5 goles', p: e => e.prob?.over15, hit: r => r.gl + r.gv > 1.5 },
  { key: 'over25', label: 'Más de 2.5 goles', p: e => e.prob?.over25, hit: r => r.gl + r.gv > 2.5 },
  { key: 'over35', label: 'Más de 3.5 goles', p: e => e.prob?.over35, hit: r => r.gl + r.gv > 3.5 },
  { key: 'under15', label: 'Menos de 1.5 goles', p: e => 100 - e.prob?.over15, hit: r => r.gl + r.gv < 1.5 },
  { key: 'under25', label: 'Menos de 2.5 goles', p: e => 100 - e.prob?.over25, hit: r => r.gl + r.gv < 2.5 },
  { key: 'under35', label: 'Menos de 3.5 goles', p: e => 100 - e.prob?.over35, hit: r => r.gl + r.gv < 3.5 },
  { key: 'under45', label: 'Menos de 4.5 goles', p: e => 100 - e.prob?.over45, hit: r => r.gl + r.gv < 4.5 },
  { key: 'bttsSi', label: 'BTTS Sí', p: e => e.prob?.btts, hit: r => r.gl > 0 && r.gv > 0 },
  { key: 'bttsNo', label: 'BTTS No', p: e => 100 - e.prob?.btts, hit: r => !(r.gl > 0 && r.gv > 0) },
  { key: 'c_over75', label: 'Más de 7.5 córners', corners: true, p: e => e.corners?.over7, hit: r => r.corners > 7.5 },
  { key: 'c_over85', label: 'Más de 8.5 córners', corners: true, p: e => e.corners?.over8, hit: r => r.corners > 8.5 },
  { key: 'c_over95', label: 'Más de 9.5 córners', corners: true, p: e => e.corners?.over9, hit: r => r.corners > 9.5 },
  { key: 'c_under95', label: 'Menos de 9.5 córners', corners: true, p: e => 100 - e.corners?.over9, hit: r => r.corners < 9.5 },
  { key: 'c_under105', label: 'Menos de 10.5 córners', corners: true, p: e => 100 - e.corners?.over10, hit: r => r.corners < 10.5 },
];

const MERCADO_POR_KEY = {};
for (const m of MERCADOS) MERCADO_POR_KEY[m.key] = m;

// Devuelve un mapa de cuotas efectivas por key, combinando:
//   1. e.cuotas[key]   (cuota específica de ese mercado, si existe)
//   2. e.apuesta.cuota (cuota global al pick tildado de mayor EV)
function cuotasEfectivas(e) {
  const out = {};
  if (e.cuotas && typeof e.cuotas === 'object') {
    for (const [k, v] of Object.entries(e.cuotas)) {
      if (Number.isFinite(v) && v > 1) out[k] = v;
    }
  }
  const picksTildados = Array.isArray(e.picks) ? e.picks : [];
  const cuotaGlobal = e.apuesta && Number.isFinite(e.apuesta.cuota) && e.apuesta.cuota > 1
    ? e.apuesta.cuota : null;

  if (cuotaGlobal != null && picksTildados.length > 0) {
    let pickConCuota = null;
    if (picksTildados.length === 1) {
      pickConCuota = picksTildados[0];
    } else {
      let mejorEV = -Infinity;
      for (const key of picksTildados) {
        const m = MERCADO_POR_KEY[key];
        if (!m) continue;
        const prob = m.p(e);
        if (!Number.isFinite(prob)) continue;
        const ev = (prob / 100) * cuotaGlobal;
        if (ev > mejorEV) { mejorEV = ev; pickConCuota = key; }
      }
    }
    if (pickConCuota != null && out[pickConCuota] == null) {
      out[pickConCuota] = cuotaGlobal;
    }
  }
  return out;
}

// ---------- CLV: ¿conseguís mejor precio que el cierre? ----------
export function filasCLV(entradas) {
  const out = [];
  for (const e of entradas) {
    if (!e || !e.cierre || !Array.isArray(e.picks)) continue;
    if (Number.isFinite(e.cierreMin) && e.cierreMin > CIERRE_MAX_MIN) continue;
    const cuotas = cuotasEfectivas(e);
    for (const key of e.picks) {
      const c = cuotas[key], cc = e.cierre[key];
      const v = clvPct(c, cc);
      if (v == null) continue;
      out.push({ id: e.id, liga: e.liga, key, cuota: c, cierre: cc, clv: v });
    }
  }
  return out;
}

function resumenFilas(rows) {
  if (!rows.length) return { n: 0, media: null, mediana: null, pctPositivo: null, z: null };
  const base = resumenCLV(rows.map(r => ({ cuota: r.cuota, cuotaCierre: r.cierre })));
  return Object.assign({}, base, { z: zMedia(rows.map(r => r.clv)) });
}

export function nivelCLV(r) {
  if (!r || r.n < CLV_MIN_N) return 'pocos';
  if (r.media > 0 && r.n >= CLV_FIRME_N && r.z != null && r.z > Z) return 'confirmada';
  if (r.media > 0) return 'observacion';
  return 'sin_ventaja';
}

function consejoLiga(nivel, statusConfig, n) {
  const activa = statusConfig === 'green' || statusConfig === 'yellow';
  if (nivel === 'confirmada') return 'CLV positivo y significativo: la ventaja se sostiene. Podés mantener o subir el stake.';
  if (nivel === 'observacion') {
    return 'CLV positivo pero sin confirmar (hacen falta ' + CLV_FIRME_N + ' picks y z > ' + Z + ').' +
      (statusConfig === 'green' ? ' Está en verde sin confirmación: bajala a amarillo hasta confirmar.' : ' No pases de amarillo.');
  }
  if (nivel === 'sin_ventaja') {
    return activa ? 'CLV ≤ 0 con ' + n + ' picks: no hay evidencia de ventaja. Bajala a rojo o reducí el stake.'
                  : 'CLV ≤ 0: mantenela en rojo.';
  }
  return n >= 1 ? 'Faltan ' + (CLV_MIN_N - n) + ' picks con cuota y cierre para opinar.' : 'Sin picks con cuota y cierre cargados.';
}

export function estadoPorLiga(entradas) {
  const filas = filasCLV(entradas);
  const porLiga = {};
  for (const f of filas) (porLiga[f.liga] = porLiga[f.liga] || []).push(f);
  const claves = new Set(Object.keys(porLiga));
  for (const [k, l] of Object.entries(LIGAS)) {
    const st = l.betting && l.betting.status;
    if (st === 'green' || st === 'yellow') claves.add(k);
  }
  const out = {};
  for (const liga of claves) {
    const r = resumenFilas(porLiga[liga] || []);
    const statusConfig = (LIGAS[liga] && LIGAS[liga].betting && LIGAS[liga].betting.status) || 'unknown';
    const nivel = nivelCLV(r);
    out[liga] = Object.assign({}, r, { nivel, statusConfig, consejo: consejoLiga(nivel, statusConfig, r.n) });
  }
  return out;
}

export function clvPorMercado(filas) {
  const g = {};
  for (const f of filas) (g[f.key] = g[f.key] || []).push(f);
  return Object.entries(g).map(([key, rows]) => {
    const r = resumenFilas(rows);
    return { key, label: (MERCADO_POR_KEY[key] && MERCADO_POR_KEY[key].label) || key, n: r.n, media: r.media, pctPositivo: r.pctPositivo };
  }).sort((a, b) => b.n - a.n);
}

export function analizarCLV(entradas) {
  const filas = filasCLV(entradas);
  const resumen = resumenFilas(filas);
  return { resumen, nivel: nivelCLV(resumen), porLiga: estadoPorLiga(entradas), porMercado: clvPorMercado(filas) };
}

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
    const p = e.prob, r = e.resultado, { gl, gv } = r;
    const cuotas = cuotasEfectivas(e);
    const idx = gl > gv ? 0 : gl === gv ? 1 : 2, bttsReal = gl > 0 && gv > 0;
    const bModelo = brier3([p.local, p.empate, p.visitante], idx);
    b3Modelo.push(bModelo);

    const m3 = devigar3(cuotas.local, cuotas.empate, cuotas.visitante);
    if (m3) {
      conCuotas1x2++;
      b3ModC.push(bModelo); b3Mkt.push(brier3(m3, idx)); dMkt.push(brier3(m3, idx) - bModelo);
      mk.local.add(p.local, m3[0], idx === 0);
      mk.empate.add(p.empate, m3[1], idx === 1);
      mk.visitante.add(p.visitante, m3[2], idx === 2);
    }
    const fb = devigar2(cuotas.bttsSi, cuotas.bttsNo);
    if (fb != null) mk.bttsSi.add(p.btts, fb, bttsReal);

    for (const m of MERCADOS) {
      const prob = m.p(e);
      if (!Number.isFinite(prob)) continue;
      if (m.corners && !Number.isFinite(r.corners)) continue;
      const hit = m.hit(r);
      const c = cal[m.key]; c.n++; c.sumP += prob; if (hit) c.hits++;
      ap.add(m.key, m.label, prob, cuotas[m.key], hit);
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
  lectura.push(n >= META_PARTIDOS ? `Resueltas: ${n} (ya pasaste las ${META_PARTIDOS} recomendadas).` : `Resueltas: ${n} de ${META_PARTIDOS} recomendadas (${entradas.length - n} pendientes).`);
  if (n < 30) lectura.push('Muestra muy chica: todavía no saques conclusiones.');
  else if (conCuotas1x2 < 30) lectura.push('Hay pocas con cuotas 1X2 cargadas: sin cuota no se puede comparar contra la casa.');
  else if (b1x2.z != null) {
    if (b1x2.z > Z) lectura.push('En 1X2 el modelo le gana a la cuota de forma significativa.');
    else if (b1x2.z < -Z) lectura.push('En 1X2 el modelo es PEOR que la cuota de forma significativa.');
    else lectura.push('En 1X2 el modelo y la cuota están a la par.');
  }
  if (pool.n >= ESCANEO_MIN_N && pool.roi != null) {
    const sig = pool.z != null && pool.z > Z ? ' y supera el umbral de significancia' : pool.z != null && pool.z < -Z ? ' y es significativamente negativo' : ' pero no se distingue de la suerte';
    lectura.push(`Apostando todo lo que el modelo ve con EV ≥ ${FILTRO_EV}: ROI ${pool.roi >= 0 ? '+' : ''}${pool.roi.toFixed(1)}% ±${pool.se.toFixed(1)} en ${pool.n} apuestas${sig}.`);
  }
  if (n >= 30) {
    const malos = calibracion.filter(c => c.n >= 30 && Math.abs(c.probMedia - c.frecReal) >= 8).map(c => c.label);
    if (malos.length) lectura.push(`Calibración floja: ${malos.join(', ')}.`);
  }

  const clv = analizarCLV(entradas);
  if (clv.resumen.n > 0) {
    const txt = { pocos: 'todavía pocos picks para concluir', confirmada: 'ventaja confirmada', observacion: 'positivo pero sin confirmar', sin_ventaja: 'sin evidencia de ventaja' }[clv.nivel];
    lectura.push('CLV: ' + (clv.resumen.media >= 0 ? '+' : '') + clv.resumen.media.toFixed(2) + '% en ' + clv.resumen.n + ' picks con cierre (' + clv.resumen.pctPositivo + '% positivos) → ' + txt + '.');
  } else if (entradas.length) {
    lectura.push('Sin cuotas de cierre cargadas: no se puede medir si le ganás al mercado. Cargalas en "Pendientes" antes del partido.');
  }

  return {
    n, pendientes: entradas.length - n, meta: META_PARTIDOS, conCuotas1x2, clv,
    b1x2, mercados: Object.values(mk).map(m => m.summary()).filter(s => s.n > 0),
    escaneo, pool, calibracion, lectura,
  };
}

// ---------- interfaz ----------
if (typeof document !== 'undefined' && document.getElementById('reg-pendientes')) {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const f1 = (x) => Number(x).toFixed(1);
  const f3 = (x) => x == null ? '—' : Number(x).toFixed(3);
  const dim = 'var(--text-dim,#8b95a5)';
  const col = (z) => z == null ? dim : z > Z ? 'var(--green)' : z < -Z ? 'var(--red)' : 'var(--yellow)';
  const senal = (z) => z == null ? '—' : z > Z ? '✅ mejor' : z < -Z ? '❌ peor' : '≈ empate';
  const fechaCorta = (iso) => (iso || '').slice(0, 10);

  const parseNum = (t) => { const n = parseFloat(String(t ?? '').replace(',', '.')); return Number.isFinite(n) && n > 1 ? n : null; };

  function textoEV(e, key, cuota) {
    const m = MERCADOS.find(x => x.key === key);
    const prob = m ? m.p(e) : null;
    const merc = MERCADO_FILTRO[key] || 'default';
    if (!Number.isFinite(prob)) return { texto: '', color: dim };
    if (cuota == null) {
      const min = cuotaMinima(prob, merc);
      return { texto: `modelo ${f1(prob)}% · cuota mín. con valor ${min == null ? '—' : min.toFixed(2)}`, color: dim };
    }
    const v = valorPick(prob, cuota, merc);
    if (v.ev == null) return { texto: '', color: dim };
    if (v.pasa) return { texto: `EV ${v.ev.toFixed(2)} ✅ valor${v.kelly != null ? ' · Kelly/4 ' + v.kelly + '%' : ''}`, color: 'var(--green)' };
    return { texto: `EV ${v.ev.toFixed(2)} ❌ sin valor (mín. ${cuotaMinima(prob, merc).toFixed(2)})`, color: 'var(--red)' };
  }

  function leerInputs(e) {
    const cuotas = {}, cierre = {};
    for (const key of (e.picks || [])) {
      const a = $('cq-' + e.id + '-' + key), b = $('cl-' + e.id + '-' + key);
      if (a) cuotas[key] = a.value;
      if (b && String(b.value).trim() !== '') cierre[key] = b.value;
    }
    return { cuotas, cierre };
  }

  // Guarda cuotas apostadas y cierre tal como están en pantalla (para no perder lo escrito al re-renderizar).
  function guardarInputs(id) {
    const e = leerRegistro().find(x => x.id === id);
    if (!e) return;
    const { cuotas, cierre } = leerInputs(e);
    guardarCuotas(id, cuotas);
    if (Object.keys(cierre).length) guardarCierre(id, cierre);
  }

  function cierreHtml(e) {
    if (!(e.picks || []).length) return '';
    const filas = e.picks.map(k => {
      const lab = MERCADOS.find(m => m.key === k)?.label || k;
      const cuota = e.cuotas?.[k] ?? null;
      const t = textoEV(e, k, cuota);
      return `<div style="margin-bottom:8px;">
        <div class="field-row" style="grid-template-columns:1.3fr 1fr 1fr;margin-bottom:2px;align-items:center;"><span style="font-size:.78rem;">${esc(lab)}</span>
          <input type="text" inputmode="decimal" data-ev="1" data-id="${esc(e.id)}" data-key="${esc(k)}" id="cq-${esc(e.id)}-${esc(k)}" placeholder="1.85" value="${cuota ?? ''}" style="padding:8px;text-align:center;">
          <input type="text" inputmode="decimal" id="cl-${esc(e.id)}-${esc(k)}" placeholder="1.80" value="${e.cierre?.[k] ?? ''}" style="padding:8px;text-align:center;"></div>
        <div id="ev-${esc(e.id)}-${esc(k)}" style="font-size:.7rem;color:${t.color};">${t.texto}</div></div>`;
    }).join('');
    const estado = e.cierreTs ? `<p style="margin:4px 0 8px;font-size:.72rem;color:var(--green);">Cierre guardado (${esc(e.cierreFuente || 'manual')}${Number.isFinite(e.cierreMin) ? ', ' + e.cierreMin + ' min antes' : ''}).</p>` : '';
    const cab = `<div class="field-row" style="grid-template-columns:1.3fr 1fr 1fr;margin-bottom:4px;"><span></span><small style="color:${dim};text-align:center;">Cuota casa</small><small style="color:${dim};text-align:center;">Cierre</small></div>`;
    return `<p style="margin:8px 0 6px;font-size:.78rem;font-weight:600;">💰 Cuotas por pick <small style="color:${dim};font-weight:400;">(cierre = justo antes del partido)</small></p>${cab}${filas}${estado}
      <div style="margin-bottom:10px;"><button data-accion="guardar-cuotas" data-id="${esc(e.id)}" style="margin-right:8px;padding:8px 12px;font-size:.78rem;">Guardar cuotas</button><button data-accion="traer-cierre" data-id="${esc(e.id)}" style="padding:8px 12px;font-size:.78rem;">Traer cierre de Bzzoiro</button></div>`;
  }

  // Una sola cuota por pick (arriba). Acá solo va el monto; la cuota de la apuesta se deduce de los picks.
  // Entradas viejas sin picks conservan cuota + monto.
  function apuestaHtml(e) {
    const n = (e.picks || []).length;
    const monto = `<input type="text" inputmode="decimal" id="ma-${esc(e.id)}" placeholder="monto apostado (opcional)" value="${e.apuesta?.monto ?? ''}" style="padding:8px;text-align:center;">`;
    const nota = (t) => `<p style="margin:0 0 10px;font-size:.7rem;color:${dim};line-height:1.4;">${t}</p>`;
    if (n === 0) {
      const ca = `<input type="text" inputmode="decimal" id="ca-${esc(e.id)}" placeholder="cuota apostada" value="${e.apuesta?.cuota ?? ''}" style="padding:8px;text-align:center;">`;
      return `<div class="field-row" style="margin-bottom:6px;grid-template-columns:1fr 1fr;">${ca}${monto}</div>` + nota('Opcionales: cuota y monto (van juntos).');
    }
    return `<div class="field-row" style="margin-bottom:6px;grid-template-columns:1fr;">${monto}</div>` +
      nota(n === 1 ? 'La cuota es la del pick de arriba.' : 'Con 2 o más picks se cuenta como combinada: cuota = producto de las cuotas de cada pick.');
  }

  function cardPendiente(e) {
    const p = e.prob;
    return `<div class="card">
      <h3 style="font-size:.95rem;">${esc(e.local)} vs ${esc(e.visitante)}</h3>
      <p style="margin:0 0 8px;font-size:.75rem;color:${dim};">${esc(e.ligaNombre)} · guardada ${fechaCorta(e.creado)} · L ${f1(p.local)}% E ${f1(p.empate)}% V ${f1(p.visitante)}%</p>
      ${(e.picks && e.picks.length) ? `<p style="margin:0 0 8px;font-size:.75rem;color:var(--green);">🎯 ${e.picks.map(k => esc(MERCADOS.find(m => m.key === k)?.label || k)).join(' · ')}</p>` : ''}
      <div class="field-row" style="margin-bottom:8px;grid-template-columns:1fr 1fr 1fr;">
        <input type="text" inputmode="numeric" id="gl-${esc(e.id)}" placeholder="goles local" style="padding:8px;text-align:center;">
        <input type="text" inputmode="numeric" id="gv-${esc(e.id)}" placeholder="goles visit." style="padding:8px;text-align:center;">
        <input type="text" inputmode="numeric" id="cc-${esc(e.id)}" placeholder="córners tot." style="padding:8px;text-align:center;">
      </div>
      ${cierreHtml(e)}
      ${apuestaHtml(e)}
      <button data-accion="resultado" data-id="${esc(e.id)}" style="margin-right:8px;">Guardar resultado</button>
      <button data-accion="borrar" data-id="${esc(e.id)}" style="background:var(--surface-2,#1c2530);color:var(--text,#f0f3f7);">🗑</button>
    </div>`;
  }

  function cardResuelta(e) {
    const r = e.resultado;
    const apTxt = (e.apuesta && Number.isFinite(e.apuesta.cuota)) ? ` · 💰 ${e.apuesta.cuota} × $${e.apuesta.monto}` : '';
    return `<div class="compare-row" style="grid-template-columns:1.6fr .7fr auto;"><span>${esc(e.local)} vs ${esc(e.visitante)}<br><small style="color:${dim};">${fechaCorta(e.creado)}${apTxt}</small></span><span class="grid-plain"><strong>${r.gl}-${r.gv}</strong>${Number.isFinite(r.corners) ? `<br><small>${r.corners} córn.</small>` : ''}</span><span><button data-accion="reabrir" data-id="${esc(e.id)}" style="padding:6px 10px;font-size:.75rem;">↩︎</button></span></div>`;
  }

  const NIVEL_TXT = { pocos: ['Pocos datos', dim], confirmada: ['✅ Ventaja confirmada', 'var(--green)'], observacion: ['🟡 Positivo, sin confirmar', 'var(--yellow)'], sin_ventaja: ['❌ Sin ventaja', 'var(--red)'] };
  const ICONO_ST = { green: '🟢', yellow: '🟡', red: '🔴', unknown: '⚪' };

  function renderCLV(clv, hayEntradas) {
    const el = $('reg-clv');
    if (!el) return;
    const r = clv.resumen;
    if (!r.n) {
      el.innerHTML = `<p style="color:${dim};font-size:.85rem;line-height:1.5;">${hayEntradas ? 'Todavía no hay picks con cuota de cierre.' : 'Todavía no guardaste predicciones.'}<br>El CLV compara la cuota a la que apostaste con la cuota justo antes del partido. Si es positivo de forma sostenida (100+ picks), tenés ventaja real; el ROI solo puede ser suerte. Cargá la cuota en la app al guardar el pick y el cierre en "Pendientes".</p>`;
      return;
    }
    const [nt, nc] = NIVEL_TXT[clv.nivel];
    const sg = (x) => (x >= 0 ? '+' : '') + Number(x).toFixed(2);
    const filasLiga = Object.entries(clv.porLiga).sort((a, b) => b[1].n - a[1].n).map(([k, s]) => {
      const [lt, lc] = NIVEL_TXT[s.nivel];
      return `<div class="card" style="margin-bottom:8px;padding:12px;"><div class="compare-row" style="grid-template-columns:1.4fr .6fr 1fr;border:none;padding:0 0 6px;"><span>${ICONO_ST[s.statusConfig] || '⚪'} ${esc(LIGAS[k]?.name || k)}</span><span class="grid-plain">${s.n} picks</span><span class="grid-plain" style="color:${lc}">${s.n ? sg(s.media) + '%' : '—'} · ${lt}</span></div><p style="margin:0;font-size:.74rem;color:${dim};line-height:1.45;">${esc(s.consejo)}</p></div>`;
    }).join('');
    const filasMk = clv.porMercado.map(m => `<div class="compare-row" style="grid-template-columns:1.6fr .6fr 1fr;"><span>${esc(m.label)}</span><span class="grid-plain">${m.n}</span><span class="grid-plain" style="color:${m.media > 0 ? 'var(--green)' : 'var(--red)'}">${sg(m.media)}% · ${m.pctPositivo}% +</span></div>`).join('');
    el.innerHTML = `<div class="card" style="border:2px solid ${nc};"><h3 style="color:${nc};">${nt} <small>(${r.n} picks con cierre)</small></h3>
        <div class="compare-row" style="grid-template-columns:1fr 1fr 1fr 1fr;"><span>CLV medio</span><span class="grid-plain" style="color:${r.media > 0 ? 'var(--green)' : 'var(--red)'}">${sg(r.media)}%</span><span class="grid-plain">mediana ${sg(r.mediana)}%</span><span class="grid-plain">${r.pctPositivo}% positivos</span></div>
        <p style="margin:8px 0 0;font-size:.75rem;color:${dim};line-height:1.5;">z = ${r.z == null ? '—' : r.z.toFixed(2)} (confirma con z > ${Z} y ≥ ${CLV_FIRME_N} picks). CLV = cuota apostada / cuota de cierre − 1. Compará siempre contra una cuota de cierre de la misma casa o de una casa de margen parecido: si el cierre viene de otra fuente con otro margen, el número se sesga.</p></div>
      <h3 class="corner-team-title">Estado por liga (evidencia real)</h3>${filasLiga || ''}
      <h3 class="corner-team-title">Por mercado</h3><div class="card">${filasMk}</div>`;
  }

  function render() {
    const arr = leerRegistro();
    const ev = evaluar(arr);
    renderCLV(ev.clv, arr.length > 0);
    const pend = arr.filter(e => !e.resultado).sort((a, b) => (b.creado || '').localeCompare(a.creado || ''));
    const resu = arr.filter(e => e.resultado).sort((a, b) => (b.resuelto || '').localeCompare(a.resuelto || ''));

    $('reg-resumen').innerHTML = `<div class="compare-row"><span>Guardadas</span><span class="grid-plain">${arr.length}</span><span class="grid-plain"></span><span class="grid-plain"></span></div>
      <div class="compare-row"><span>Pendientes de resultado</span><span class="grid-plain">${pend.length}</span><span class="grid-plain"></span><span class="grid-plain"></span></div>
      <div class="compare-row"><span>Resueltas</span><span class="grid-plain">${ev.n} / ${ev.meta}</span><span class="grid-plain"></span><span class="grid-plain"></span></div>
      <div class="semaforo-track" style="margin-top:8px;"><div class="semaforo-fill" style="width:${Math.min(100, ev.n / ev.meta * 100)}%;background:var(--green)"></div></div>`;

    $('reg-pendientes').innerHTML = pend.length ? pend.map(cardPendiente).join('') : `<p style="color:${dim};font-size:.85rem;">No hay predicciones pendientes.</p>`;
    $('reg-resueltas').innerHTML = resu.length ? `<div class="card">${resu.slice(0, 30).map(cardResuelta).join('')}</div>` : `<p style="color:${dim};font-size:.85rem;">Todavía no cargaste resultados.</p>`;

    if (!ev.n) { $('reg-eval').innerHTML = `<p style="color:${dim};font-size:.85rem;">La evaluación aparece cuando cargues el primer resultado.</p>`; return; }

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
      <div class="card"><h3>Modelo vs cuota <small>(solo 1X2 y BTTS)</small></h3>
        <div class="compare-row compare-head"><span>Mercado</span><span>n</span><span>Modelo vs cuota</span><span>Mejora</span></div>
        ${filasMk || `<div class="compare-row"><span>Sin cuotas cargadas.</span></div>`}</div>
      <div class="card" style="border:2px solid var(--yellow);"><h3>🔎 Apostar con EV ≥ ${FILTRO_EV} <small>(${ev.pool.n} apuestas${ev.pool.roi != null ? `, ROI ${ev.pool.roi >= 0 ? '+' : ''}${f1(ev.pool.roi)}%${ev.pool.se != null ? ` ±${f1(ev.pool.se)}` : ''}` : ''})</small></h3>
        <div class="compare-row compare-head"><span>Mercado</span><span>Apuestas · acierto</span><span>EV medio</span><span>ROI ± error</span></div>
        ${filasEs || `<div class="compare-row"><span>Ningún lado superó el filtro EV con cuotas cargadas.</span></div>`}
        <p style="margin:10px 0 0;font-size:.78rem;color:${dim};line-height:1.5;">Simula apostar 1 unidad a todo lo que el modelo veía con valor. ⚠️ = menos de ${ESCANEO_MIN_N} apuestas.</p></div>
      <div class="card"><h3>Calibración por mercado <small>(predicho vs real)</small></h3>
        <div class="compare-row compare-head"><span>Mercado</span><span>n</span><span>Predicho</span><span>Real</span></div>
        ${filasCal}
        <p style="margin:10px 0 0;font-size:.78rem;color:${dim};line-height:1.5;">Si lo predicho y lo real se alejan 8 puntos o más (rojo), el modelo está mal calibrado en ese mercado.</p></div>`;
  }

  function entero(txt) {
    const t = String(txt ?? '').trim();
    return /^\d+$/.test(t) ? parseInt(t, 10) : null;
  }

  $('reg-pendientes').addEventListener('click', async (ev) => {
    const t = ev.target, id = t?.dataset?.id, acc = t?.dataset?.accion;
    if (!id || !acc) return;
    if (acc === 'borrar') { if (confirm('¿Borrar esta predicción?')) { borrarEntrada(id); render(); } return; }
    if (acc === 'guardar-cuotas') {
      try { guardarInputs(id); render(); } catch (err) { alert('Error: ' + err.message); }
      return;
    }
    if (acc === 'traer-cierre') {
      t.disabled = true; t.textContent = 'Buscando...';
      try {
        guardarInputs(id);
        const r = await traerCierre(id);
        alert('Cierre guardado (' + (r.minutos != null ? Math.round(r.minutos) + ' min antes del inicio' : 'hora de inicio desconocida') + ').' + (r.faltan.length ? ' Sin cuota para: ' + r.faltan.join(', ') + ' (cargala a mano).' : ''));
      } catch (err) { alert('No se pudo traer el cierre: ' + err.message); }
      render();
      return;
    }
    if (acc === 'resultado') {
      const gl = entero($('gl-' + id).value), gv = entero($('gv-' + id).value);
      const ccTxt = $('cc-' + id).value;
      const cc = String(ccTxt ?? '').trim() === '' ? null : entero(ccTxt);
      if (gl == null || gv == null) { alert('Cargá los goles de los dos equipos.'); return; }
      if (String(ccTxt ?? '').trim() !== '' && cc == null) { alert('Los córners tienen que ser un número entero.'); return; }
      try {
        try { guardarInputs(id); } catch (_) { /* cuotas inválidas: se ignoran */ }
        const ent = leerRegistro().find(x => x.id === id);
        const monto = $('ma-' + id)?.value;
        const hayMonto = String(monto ?? '').trim() !== '';
        let apCuota;
        if (ent && (ent.picks || []).length > 0) {
          const cu = ent.picks.map(k => ent.cuotas?.[k]);
          const completas = cu.every(c => Number.isFinite(c) && c > 1);
          apCuota = (String(monto ?? '').trim() !== '' && completas) ? String(+cu.reduce((a, b) => a * b, 1).toFixed(2)) : '';
        } else apCuota = $('ca-' + id)?.value;
        actualizarResultado(id, { gl, gv, corners: cc, apCuota, apMonto: monto });
        render();
      } catch (e) { alert('Error: ' + e.message); }
    }
  });

  $('reg-pendientes').addEventListener('input', (ev) => {
    const t = ev.target;
    if (!t || !t.dataset || !t.dataset.ev) return;
    const e = leerRegistro().find(x => x.id === t.dataset.id);
    const out = $('ev-' + t.dataset.id + '-' + t.dataset.key);
    if (!e || !out) return;
    const r = textoEV(e, t.dataset.key, parseNum(t.value));
    out.textContent = r.texto; out.style.color = r.color;
  });

  $('reg-resueltas').addEventListener('click', (ev) => {
    const t = ev.target, id = t?.dataset?.id;
    if (t?.dataset?.accion === 'reabrir' && id) { borrarResultado(id); render(); }
  });

  function exportarCSV(arr) {
    const resu = arr.filter(e => e.resultado && e.cuotas);
    const enc = ['fecha','liga','partido','mercado','prob_modelo','cuota','ev','cuota_apostada','acierto','retorno_u','cuota_cierre','clv_pct'];
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
        lineas.push([fecha, e.liga, partido, m.label, fnum(prob, 1), fnum(cuota), fnum(ev), fnum(e.apuesta?.cuota), hit ? 1 : 0, fnum(hit ? cuota - 1 : -1), fnum(e.cierre?.[m.key]), fnum(clvPct(cuota, e.cierre?.[m.key]))].map(escap).join(';'));
      }
    }
    return '﻿' + lineas.join('\n');
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
