// ratings.js
// v3: recalcularRatings acepta campos personalizados (útil para córners).

import { RATINGS_PRIOR_JUEGOS, RATINGS_HALFLIFE_DIAS } from './leagues.js';

export function fechaMs(fechaStr) {
  if (!fechaStr) return null;
  const t = new Date(fechaStr).getTime();
  return Number.isFinite(t) ? t : null;
}

export function pesoPorAntiguedad(fechaStr, halflifeDias, ahoraMs = Date.now()) {
  if (!fechaStr) return 0.3;
  const dias = (ahoraMs - new Date(fechaStr).getTime()) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(dias) || dias < 0) return 0.3;
  return Math.pow(0.5, dias / halflifeDias);
}

// [MODIFICADO] campoLocal / campoVisitante permiten usar la misma lógica con
// goles (por defecto) o córners u otra métrica.
export function recalcularRatings(partidos, {
  halflifeDias = 60, minMatches = 3, ahoraMs = Date.now(),
  homeAdv = 1.2, priorJuegos = 4, iteraciones = 30, prior = null,
  campoLocal = 'goles_local', campoVisitante = 'goles_visitante',
} = {}) {
  const validos = [];
  const conteo = {};
  let sumaPesoGoles = 0, sumaPeso = 0;

  for (const p of partidos) {
    const gl = p[campoLocal];
    const gv = p[campoVisitante];
    if (gl == null || gv == null || !p.local || !p.visitante) continue;
    const w = pesoPorAntiguedad(p.fecha, halflifeDias, ahoraMs);
    validos.push({ h: p.local, a: p.visitante, gl, gv, w });
    conteo[p.local] = (conteo[p.local] || 0) + 1;
    conteo[p.visitante] = (conteo[p.visitante] || 0) + 1;
    sumaPesoGoles += w * (gl + gv);
    sumaPeso += w * 2;
  }

  const ligaAvgPorLado = sumaPeso > 0 ? sumaPesoGoles / sumaPeso : null;
  if (!ligaAvgPorLado) return { ligaAvgPorLado: null, equipos: [] };

  const nombres = Object.keys(conteo);
  const priorAtk = {}, priorDef = {};
  for (const n of nombres) {
    const pr = prior ? prior(n) : null;
    priorAtk[n] = pr && Number.isFinite(pr.atk) ? pr.atk : 1;
    priorDef[n] = pr && Number.isFinite(pr.def) ? pr.def : 1;
  }
  const atk = {}, def = {};
  for (const n of nombres) { atk[n] = priorAtk[n]; def[n] = priorDef[n]; }
  const sq = Math.sqrt(homeAdv);
  const avg = ligaAvgPorLado;

  for (let it = 0; it < iteraciones; it++) {
    const numA = {}, denA = {}, numD = {}, denD = {};
    for (const n of nombres) {
      numA[n] = priorJuegos * avg * priorAtk[n]; denA[n] = priorJuegos * avg;
      numD[n] = priorJuegos * avg * priorDef[n]; denD[n] = priorJuegos * avg;
    }
    for (const m of validos) {
      numA[m.h] += m.w * m.gl;  denA[m.h] += m.w * avg * def[m.a] * sq;
      numA[m.a] += m.w * m.gv;  denA[m.a] += m.w * avg * def[m.h] / sq;
      numD[m.h] += m.w * m.gv;  denD[m.h] += m.w * avg * atk[m.a] / sq;
      numD[m.a] += m.w * m.gl;  denD[m.a] += m.w * avg * atk[m.h] * sq;
    }
    let sA = 0, sD = 0;
    for (const n of nombres) { atk[n] = numA[n] / denA[n]; def[n] = numD[n] / denD[n]; sA += atk[n]; sD += def[n]; }
    const mA = sA / nombres.length, mD = sD / nombres.length;
    for (const n of nombres) { atk[n] /= mA; def[n] /= mD; }
  }

  const equipos = [];
  for (const n of nombres) {
    if (conteo[n] < minMatches) continue;
    equipos.push({ team: n, atk: +atk[n].toFixed(3), def: +def[n].toFixed(3), partidos: conteo[n] });
  }
  equipos.sort((a, b) => a.team.localeCompare(b.team));
  return { ligaAvgPorLado, equipos };
}

export function equiposAMapa(equipos) {
  const m = {};
  for (const e of equipos) m[e.team] = { atk: e.atk, def: e.def, partidos: e.partidos };
  return m;
}

// [NUEVO] Aprendé ratings de córners a partir del historial.
// homeAdv=1 porque el sesgo local de córners se aplica aparte (CORNER_HOME_BIAS).
export function calcularCornerRatings(partidos, {
  halflifeDias = 90, minMatches = 3, ahoraMs = Date.now(),
  priorJuegos = 8, prior = null,
} = {}) {
  const { equipos } = recalcularRatings(partidos, {
    halflifeDias, minMatches, ahoraMs,
    homeAdv: 1.0, priorJuegos, prior,
    campoLocal: 'corners_local', campoVisitante: 'corners_visitante',
  });
  return equiposAMapa(equipos);
}

export function ratingsWalkForward(partidos, {
  homeAdv = 1.2, prior = null, minPrevios = 10, paso = null,
  halflifeDias = RATINGS_HALFLIFE_DIAS, priorJuegos = RATINGS_PRIOR_JUEGOS,
} = {}) {
  const n = partidos.length;
  const salto = paso ?? Math.max(1, Math.floor(n / 60));
  const out = new Array(n).fill(null);
  let cache = null, cacheI = -Infinity;
  for (let i = minPrevios; i < n; i++) {
    if (!cache || i - cacheI >= salto) {
      const ahoraMs = fechaMs(partidos[i].fecha) ?? Date.now();
      const { equipos } = recalcularRatings(partidos.slice(0, i), {
        halflifeDias, minMatches: 1, ahoraMs, homeAdv, priorJuegos, prior,
      });
      cache = equiposAMapa(equipos);
      cacheI = i;
    }
    out[i] = cache;
  }
  return out;
}
