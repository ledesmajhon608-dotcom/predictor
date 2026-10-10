// ratings.js
// Lógica pura (sin DOM) para estimar ataque/defensa por equipo a partir de
// partidos jugados. Se usa en: calibración (calibrate.js), backtest walk-forward
// y la página "Recalcular ratings".

import { RATINGS_PRIOR_JUEGOS, RATINGS_HALFLIFE_DIAS } from './leagues.js';

export function fechaMs(fechaStr) {
  if (!fechaStr) return null;
  const t = new Date(fechaStr).getTime();
  return Number.isFinite(t) ? t : null;
}

// A los `halflife` días, un partido pesa la mitad que uno de hoy.
export function pesoPorAntiguedad(fechaStr, halflifeDias, ahoraMs = Date.now()) {
  if (!fechaStr) return 0.3; // sin fecha: peso bajo, no se descarta
  const dias = (ahoraMs - new Date(fechaStr).getTime()) / (1000 * 60 * 60 * 24);
  if (!Number.isFinite(dias) || dias < 0) return 0.3;
  return Math.pow(0.5, dias / halflifeDias);
}

// Recalcula atk/def por equipo. Modelo multiplicativo AJUSTADO POR RIVAL, con
// ventaja local y encogimiento según cuántos partidos hay.
// NUEVO: `prior(team) -> {atk, def} | null` encoge hacia el rating estático del
// equipo (en vez de hacia 1.0). Sin `prior` se comporta exactamente como antes.
export function recalcularRatings(partidos, {
  halflifeDias = 60, minMatches = 3, ahoraMs = Date.now(),
  homeAdv = 1.2, priorJuegos = 4, iteraciones = 30, prior = null,
} = {}) {
  const validos = [];
  const conteo = {};
  let sumaPesoGoles = 0, sumaPeso = 0;

  for (const p of partidos) {
    if (p.goles_local == null || p.goles_visitante == null || !p.local || !p.visitante) continue;
    const w = pesoPorAntiguedad(p.fecha, halflifeDias, ahoraMs);
    validos.push({ h: p.local, a: p.visitante, gl: p.goles_local, gv: p.goles_visitante, w });
    conteo[p.local] = (conteo[p.local] || 0) + 1;
    conteo[p.visitante] = (conteo[p.visitante] || 0) + 1;
    sumaPesoGoles += w * (p.goles_local + p.goles_visitante);
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
      // goles del local = avg * atk_local * def_visita * sq ; visitante = avg * atk_visita * def_local / sq
      numA[m.h] += m.w * m.gl;  denA[m.h] += m.w * avg * def[m.a] * sq;
      numA[m.a] += m.w * m.gv;  denA[m.a] += m.w * avg * def[m.h] / sq;
      numD[m.h] += m.w * m.gv;  denD[m.h] += m.w * avg * atk[m.a] / sq;
      numD[m.a] += m.w * m.gl;  denD[m.a] += m.w * avg * atk[m.h] * sq;
    }
    let sA = 0, sD = 0;
    for (const n of nombres) { atk[n] = numA[n] / denA[n]; def[n] = numD[n] / denD[n]; sA += atk[n]; sD += def[n]; }
    const mA = sA / nombres.length, mD = sD / nombres.length; // media 1.0
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

// Ratings "como se habrían conocido" antes de cada partido: r[i] solo usa
// partidos[0..i-1]. `partidos` debe venir válido y ordenado por fecha.
// Para no recalcular 200 veces, se refit cada `paso` partidos (sin mirar nunca
// hacia adelante). r[i] = null mientras haya muy pocos partidos previos.
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
