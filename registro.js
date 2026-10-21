// registro.js
// v9: agregarEntrada ya no borra si los picks son distintos.
//     - Individual: misma liga+local+visitante+pick exacto → reemplaza.
//     - Combinada: misma liga+local+visitante+combinación exacta → reemplaza.
// v8: con 2+ picks (combinada) hay UNA sola cuota (la del ticket) y su cierre.

import { FILTRO_EV, LIGAS, getFiltroEV } from './leagues.js';
import { clvPct, resumenCLV } from './clv.js';
import { valorPick, cuotaMinima } from './picks.js';
import { resolveLeagueId, findUpcomingEvent, fetchEventOdds, normalizarOddsBzzoiro } from './api.js';

const KEY = 'suertudo_registro_v1';
const Z = 1.64;
const META_PARTIDOS = 100;
const ESCANEO_MIN_N = 30;
const CLV_MIN_N = 30;
const CLV_FIRME_N = 100;
const CIERRE_MAX_MIN = 180;

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
  
  const arraysIguales = (a, b) => {
    if (a.length !== b.length) return false;
    const sa = [...a].sort().join(',');
    const sb = [...b].sort().join(',');
    return sa === sb;
  };

  const i = arr.findIndex(e => 
    !e.resultado && 
    e.liga === entrada.liga && 
    e.local === entrada.local && 
    e.visitante === entrada.visitante &&
    arraysIguales(e.picks, entrada.picks)
  );

  let reemplazada = false;
  if (i >= 0) { 
    entrada.id = arr[i].id; 
    arr[i] = entrada; 
    reemplazada = true; 
  } else {
    arr.push(entrada);
  }
  
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

export function clavesCuota(e) {
  const n = (e.picks || []).length;
  return n >= 2 ? ['combinada'] : (e.picks || []);
}

export function probCombinada(e) {
  let p = 1;
  for (const k of (e.picks || [])) {
    const m = MERCADO_POR_KEY[k];
    const v = m ? m.p(e) : null;
    if (!Number.isFinite(v)) return null;
    p *= v / 100;
  }
  return (e.picks || []).length ? +(p * 100).toFixed(1) : null;
}

export function guardarCuotas(id, mapa) {
  const arr = leerRegistro();
  const e = arr.find(x => x.id === id);
  if (!e) throw new Error('No existe esa entrada');
  const nuevas = Object.assign({}, e.cuotas || {});
  const permitidas = new Set([...(e.picks || []), ...((e.picks || []).length >= 2 ? ['combinada'] : [])]);
  for (const k of permitidas) {
    if (!(k in (mapa || {}))) continue;
    const n = parseFloat(String(mapa[k]).replace(',', '.'));
    if (Number.isFinite(n) && n > 1) nuevas[k] = +n.toFixed(2); else delete nuevas[k];
  }
  e.cuotas = nuevas;
  guardarRegistro(arr);
  return e;
}

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
  const picks = e.picks || [];
  const faltan = picks.filter(k => !odds[k]);
  let mapa;
  if (picks.length >= 2) {
    if (faltan.length) throw new Error('Bzzoiro no tiene cuota para ' + faltan.join(', ') + ': cargá a mano el cierre de la combinada.');
    mapa = { combinada: +picks.reduce((a, k) => a * odds[k], 1).toFixed(2) };
  } else {
    mapa = {};
    for (const k of picks) if (odds[k]) mapa[k] = odds[k];
    if (!Object.keys(mapa).length) throw new Error('Bzzoiro no tiene cuota para este mercado (' + faltan.join(', ') + '). Cargala a mano.');
  }
  guardarCierre(id, mapa, { fuente: 'bzzoiro', minutos });
  return { mapa, faltan: picks.length >= 2 ? [] : faltan, minutos };
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

const inv = (x) => (Number.isFinite(x) ? 100 - x : null);

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
  { key: 'under15', label: 'Menos de 1.5 goles', p: e => inv(e.prob?.over15), hit: r => r.gl + r.gv < 1.5 },
  { key: 'under25', label: 'Menos de 2.5 goles', p: e => inv(e.prob?.over25), hit: r => r.gl + r.gv < 2.5 },
  { key: 'under35', label: 'Menos de 3.5 goles', p: e => inv(e.prob?.over35), hit: r => r.gl + r.gv < 3.5 },
  { key: 'under45', label: 'Menos de 4.5 goles', p: e => inv(e.prob?.over45), hit: r => r.gl + r.gv < 4.5 },
  { key: 'bttsSi', label: 'BTTS Sí', p: e => e.prob?.btts, hit: r => r.gl > 0 && r.gv > 0 },
  { key: 'bttsNo', label: 'BTTS No', p: e => inv(e.prob?.btts), hit: r => !(r.gl > 0 && r.gv > 0) },
  { key: 'c_over75', label: 'Más de 7.5 córners', corners: true, p: e => e.corners?.over7, hit: r => r.corners > 7.5 },
  { key: 'c_over85', label: 'Más de 8.5 córners', corners: true, p: e => e.corners?.over8, hit: r => r.corners > 8.5 },
  { key: 'c_over95', label: 'Más de 9.5 córners', corners: true, p: e => e.corners?.over9, hit: r => r.corners > 9.5 },
  { key: 'c_under95', label: 'Menos de 9.5 córners', corners: true, p: e => inv(e.corners?.over9), hit: r => r.corners < 9.5 },
  { key: 'c_under105', label: 'Menos de 10.5 córners', corners: true, p: e => inv(e.corners?.over10), hit: r => r.corners < 10.5 },
];

const MERCADO_POR_KEY = {};
for (const m of MERCADOS) MERCADO_POR_KEY[m.key] = m;

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

  if (cuotaGlobal != null && picksTildados.length > 0 && !(picksTildados.length > 1 && out.combinada != null)) {
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

export function filasCLV(entradas) {
  const out = [];
  for (const e of entradas) {
    if (!e || !e.cierre || !Array.isArray(e.picks)) continue;
    if (Number.isFinite(e.cierreMin) && e.cierreMin > CIERRE_MAX_MIN) continue;
    const cuotas = cuotasEfectivas(e);
    const claves = e.picks.length >= 2 ? [...e.picks, 'combinada'] : e.picks;
    for (const key of claves) {
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
    return { key, label: key === 'combinada' ? 'Combinada (cuota del ticket)' : ((MERCADO_POR_KEY[key] && MERCADO_POR_KEY[key].label) || key), n: r.n, media: r.media, pctPositivo: r.pctPositivo };
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
    b1x2, mercados: Object.values(mk).map(m => m.summary()).filter(s => s.n > 
