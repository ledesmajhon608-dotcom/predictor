// calibrate.js
// v2: máxima verosimilitud con prior suave + hold-out cronológico.
// SIGMA_HA = 0.15 (revertido de 0.10, que empeoraba el error L/E/V).

import {
  LIGAS, HOME_ADVANTAGE, DIXON_COLES_RHO, DEFAULT_HOME_ADV, DEFAULT_RHO,
  HA_MIN, HA_MAX, RHO_MIN, RHO_MAX, GOALS_AVG_PRIOR_MATCHES,
  RATING_MIN, RATING_MAX, RATINGS_PRIOR_JUEGOS, RATINGS_HALFLIFE_DIAS, CORNER_PRIOR_MATCHES,
} from './leagues.js';
import { simulateMatch, getStaticRating, calcLambdas } from './model.js';
import { logLikMarcador } from './stats.js';
import { recalcularRatings, ratingsWalkForward, equiposAMapa, fechaMs } from './ratings.js';

export function calcularTasasBase(partidos) {
  let n = 0, loc = 0, emp = 0, vis = 0;
  let sumaGoles = 0, sumaCorners = 0, nCorners = 0;
  for (const p of partidos) {
    if (p.goles_local == null || p.goles_visitante == null) continue;
    n++;
    sumaGoles += p.goles_local + p.goles_visitante;
    if (p.goles_local > p.goles_visitante) loc++;
    else if (p.goles_local === p.goles_visitante) emp++;
    else vis++;
    if (p.corners_local != null && p.corners_visitante != null) {
      sumaCorners += p.corners_local + p.corners_visitante;
      nCorners++;
    }
  }
  return {
    n,
    nCorners,
    homeRate: n ? loc / n : 0.45,
    drawRate: n ? emp / n : 0.27,
    awayRate: n ? vis / n : 0.28,
    goalsAvg: n ? sumaGoles / n : 2.5,
    cornAvg: nCorners ? sumaCorners / nCorners : 10,
  };
}

export function sanearRatings(r) {
  if (!r || typeof r !== 'object') return null;
  const out = {};
  let k = 0;
  for (const [team, v] of Object.entries(r)) {
    if (!v || !Number.isFinite(v.atk) || !Number.isFinite(v.def)) continue;
    const e = {
      atk: Math.min(RATING_MAX, Math.max(RATING_MIN, v.atk)),
      def: Math.min(RATING_MAX, Math.max(RATING_MIN, v.def)),
    };
    if (Number.isFinite(v.partidos)) e.partidos = v.partidos;
    out[team] = e;
    if (++k >= 80) break;
  }
  return k ? out : null;
}

export function sanearParams(p) {
  if (!p || !Number.isFinite(p.homeAdvantage) || !Number.isFinite(p.rho)) return null;
  const out = {
    homeAdvantage: Math.min(HA_MAX, Math.max(HA_MIN, p.homeAdvantage)),
    rho: Math.min(RHO_MAX, Math.max(RHO_MIN, p.rho)),
  };
  if (Number.isFinite(p.goalsAvg) && p.goalsAvg >= 1.2 && p.goalsAvg <= 4.5) out.goalsAvg = p.goalsAvg;
  if (Number.isFinite(p.cornAvg) && p.cornAvg >= 5 && p.cornAvg <= 16) out.cornAvg = p.cornAvg;
  const ratings = sanearRatings(p.ratings);
  if (ratings) out.ratings = ratings;
  return out;
}

export function ajustarHomeAdvantage(homeAdvActual, tasas, predHomeRate) {
  const ratio = (tasas.homeRate + 0.02) / (predHomeRate + 0.02);
  const ajuste = Math.pow(ratio, 0.35);
  return Math.max(HA_MIN, Math.min(HA_MAX, homeAdvActual * ajuste));
}
export function ajustarRho(rhoActual, tasas, predDrawRate) {
  const diff = tasas.drawRate - predDrawRate;
  const nuevo = rhoActual - diff * 0.8;
  return Math.max(RHO_MIN, Math.min(RHO_MAX, nuevo));
}

const SIGMA_HA = 0.15;
const SIGMA_RHO = 0.06;
const HOLDOUT_FRAC = 0.25;
const HOLDOUT_MIN_N = 40;
const Z_RECHAZO = 1.64;

function logLikPorPartido(matches, goalsAvg, ha, rho) {
  return matches.map(m => {
    const { lambdaHome, lambdaAway } = calcLambdas(goalsAvg, m.h, m.a, ha);
    return logLikMarcador(m.gl, m.gv, lambdaHome, lambdaAway, rho);
  });
}

function logLik(matches, goalsAvg, ha, rho) {
  let s = 0;
  for (const v of logLikPorPartido(matches, goalsAvg, ha, rho)) s += v;
  return s;
}

function ajustarGrilla(matches, goalsAvg, haPrior, rhoPrior) {
  let mejor = { ha: haPrior, rho: rhoPrior, obj: -Infinity };
  for (let ha = HA_MIN; ha <= HA_MAX + 1e-9; ha += 0.01) {
    for (let rho = RHO_MIN; rho <= RHO_MAX + 1e-9; rho += 0.01) {
      const pen = 0.5 * (((ha - haPrior) / SIGMA_HA) ** 2 + ((rho - rhoPrior) / SIGMA_RHO) ** 2);
      const obj = logLik(matches, goalsAvg, ha, rho) - pen;
      if (obj > mejor.obj) mejor = { ha, rho, obj };
    }
  }
  return { ha: +mejor.ha.toFixed(3), rho: +mejor.rho.toFixed(3) };
}

function pruebaPareada(vA, vB) {
  // diferencia media de log-verosimilitud (A - B) y su error estándar
  const n = vA.length;
  const d = vA.map((v, i) => v - vB[i]);
  const media = d.reduce((x, y) => x + y, 0) / n;
  const varianza = d.reduce((x, y) => x + (y - media) ** 2, 0) / Math.max(1, n - 1);
  return { media, se: Math.sqrt(varianza / n) };
}

export async function calibrarLigaMLE(leagueKey, partidosIn, { onLog = null, minPartidos = 20 } = {}) {
  const log = (m) => { if (onLog) onLog(m); };
  const liga = LIGAS[leagueKey];
  const todos = [...partidosIn]
    .filter(p => p.goles_local != null && p.goles_visitante != null && p.local && p.visitante)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const tasas = calcularTasasBase(todos);
  const haPrior = HOME_ADVANTAGE[leagueKey] ?? DEFAULT_HOME_ADV;
  const rhoPrior = DIXON_COLES_RHO[leagueKey] ?? DIXON_COLES_RHO.default ?? DEFAULT_RHO;
  const priorFn = (team) => getStaticRating(leagueKey, team);

  // Ratings aprendidos SOLO con lo que se sabía antes de cada partido (sin mirar adelante),
  // encogidos hacia el rating estático del equipo.
  const walk = ratingsWalkForward(todos, { homeAdv: haPrior, prior: priorFn });

  const matches = [];
  for (let i = 0; i < todos.length; i++) {
    const p = todos[i];
    const hS = getStaticRating(leagueKey, p.local);
    const aS = getStaticRating(leagueKey, p.visitante);
    const hW = walk[i]?.[p.local] || null;
    const aW = walk[i]?.[p.visitante] || null;
    const h = hW || hS, a = aW || aS;
    if (h && a) matches.push({ h, a, hS: hS || h, aS: aS || a, gl: p.goles_local, gv: p.goles_visitante, p });
  }
  const n = matches.length;
  const sinRating = todos.length - n;
  if (sinRating > 0) log(`   ℹ️ ${sinRating} partidos sin rating para algún equipo (no se usan para ajustar).`);
  if (n < minPartidos) {
    return { calibracion: null, razon: `Solo ${n} partidos utilizables`, tasas, historial: [], leagueKey };
  }

  const obsAvg = matches.reduce((s, m) => s + m.gl + m.gv, 0) / n;
  const goalsAvg = (n * obsAvg + GOALS_AVG_PRIOR_MATCHES * liga.goalsAvg) / (n + GOALS_AVG_PRIOR_MATCHES);
  log(`   Goles/partido: real ${obsAvg.toFixed(2)} · liga (estático) ${liga.goalsAvg.toFixed(2)} · usado ${goalsAvg.toFixed(2)}`);

  const comoEstatico = (m) => ({ ...m, h: m.hS, a: m.aS });
  const nTest = Math.max(8, Math.round(n * HOLDOUT_FRAC));

  // 1) ¿Los ratings aprendidos del historial predicen mejor que los estáticos? (hold-out reciente)
  let usarRatings = false;
  let holdRatings = null;
  if (n >= HOLDOUT_MIN_N) {
    const test = matches.slice(n - nTest);
    const vW = logLikPorPartido(test, goalsAvg, haPrior, rhoPrior);
    const vS = logLikPorPartido(test.map(comoEstatico), goalsAvg, haPrior, rhoPrior);
    const { media, se } = pruebaPareada(vW, vS);
    usarRatings = media > 0;
    holdRatings = { nTest, mejora: +media.toFixed(4), se: +se.toFixed(4), usados: usarRatings };
    log(`   Ratings del historial vs estáticos (${nTest} partidos recientes): dif log-verosim. ${media.toFixed(4)} ± ${se.toFixed(4)} → ${usarRatings ? '✓ se usan' : '✗ no mejoran, se mantienen los estáticos'}`);
  } else {
    log(`   ⚠️ ${n} partidos: muestra chica, no se activan ratings del historial.`);
  }
  const base = usarRatings ? matches : matches.map(comoEstatico);

  // 2) HA y rho: máxima verosimilitud con prior + hold-out
  let aceptado = true;
  let holdout = null;
  if (n >= HOLDOUT_MIN_N) {
    const train = base.slice(0, n - nTest);
    const test = base.slice(n - nTest);
    const fitTrain = ajustarGrilla(train, goalsAvg, haPrior, rhoPrior);
    const vFit = logLikPorPartido(test, goalsAvg, fitTrain.ha, fitTrain.rho);
    const vPrior = logLikPorPartido(test, goalsAvg, haPrior, rhoPrior);
    const { media, se } = pruebaPareada(vFit, vPrior);
    const llFit = vFit.reduce((x, y) => x + y, 0) / nTest;
    const llPrior = vPrior.reduce((x, y) => x + y, 0) / nTest;
    aceptado = media >= -Z_RECHAZO * se;
    holdout = { nTest, llFit: +llFit.toFixed(4), llPrior: +llPrior.toFixed(4), mejora: +media.toFixed(4), se: +se.toFixed(4), aceptado };
    log(`   Hold-out (${nTest} partidos recientes): log-verosim. ajustado ${llFit.toFixed(3)} vs base ${llPrior.toFixed(3)} (dif ${media.toFixed(4)} ± ${se.toFixed(4)}) → ${aceptado ? '✓ se acepta' : '✗ es peor que el valor base, se mantiene el base'}`);
  } else {
    log(`   ⚠️ ${n} partidos: muestra chica, sin hold-out (prior fuerte hacia valores base).`);
  }

  const final = aceptado ? ajustarGrilla(base, goalsAvg, haPrior, rhoPrior) : { ha: haPrior, rho: rhoPrior };
  const calibracion = { homeAdvantage: final.ha, rho: final.rho, goalsAvg: +goalsAvg.toFixed(3) };
  log(`   HA=${final.ha.toFixed(3)} · rho=${final.rho.toFixed(3)} (base ${haPrior.toFixed(3)} / ${rhoPrior.toFixed(3)})`);

  // 3) Córners: promedio real encogido hacia el estático (antes se medía y se tiraba)
  if (tasas.nCorners >= 10) {
    const cornAvg = (tasas.nCorners * tasas.cornAvg + CORNER_PRIOR_MATCHES * liga.cornAvg) / (tasas.nCorners + CORNER_PRIOR_MATCHES);
    calibracion.cornAvg = +cornAvg.toFixed(2);
    log(`   Córners/partido: real ${tasas.cornAvg.toFixed(2)} (${tasas.nCorners}p) · liga (estático) ${liga.cornAvg.toFixed(2)} · usado ${calibracion.cornAvg.toFixed(2)}`);
  }

  // 4) Ratings finales (con todos los partidos) para producción
  if (usarRatings) {
    const ultima = fechaMs(todos[todos.length - 1].fecha);
    const { equipos } = recalcularRatings(todos, {
      halflifeDias: RATINGS_HALFLIFE_DIAS, minMatches: 2, homeAdv: final.ha,
      priorJuegos: RATINGS_PRIOR_JUEGOS, prior: priorFn,
      ahoraMs: (ultima ?? Date.now()) + 24 * 60 * 60 * 1000,
    });
    const ratings = sanearRatings(equiposAMapa(equipos));
    if (ratings) {
      calibracion.ratings = ratings;
      log(`   Ratings del historial guardados para ${Object.keys(ratings).length} equipos.`);
    }
  }

  const paso = Math.max(1, Math.floor(n / 80));
  let sL = 0, sE = 0, sV = 0, k = 0;
  for (let i = 0; i < n; i += paso) {
    const p = matches[i].p;
    try {
      const pred = await simulateMatch(leagueKey, p.local, p.visitante, { staticOnly: true, calibracion });
      sL += pred.resultProbs.local; sE += pred.resultProbs.empate; sV += pred.resultProbs.visitante; k++;
    } catch (e) { /* skip */ }
  }
  const predHome = k ? sL / k / 100 : 0, predDraw = k ? sE / k / 100 : 0, predAway = k ? sV / k / 100 : 0;
  const err = Math.abs(tasas.homeRate - predHome) + Math.abs(tasas.drawRate - predDraw) + Math.abs(tasas.awayRate - predAway);
  const historial = [{ iter: 1, homeAdv: final.ha, rho: final.rho, predHome, predDraw, predAway, err }];
  log(`   Modelo medio L:${(predHome * 100).toFixed(1)}% E:${(predDraw * 100).toFixed(1)}% V:${(predAway * 100).toFixed(1)}% · real L:${(tasas.homeRate * 100).toFixed(1)}% E:${(tasas.drawRate * 100).toFixed(1)}% V:${(tasas.awayRate * 100).toFixed(1)}% (err ${(err * 100).toFixed(1)}%)`);

  return { calibracion, tasas, historial, error: err, diagnostico: { n, sinRating, holdout, holdRatings, aceptado }, leagueKey };
}

export function shrinkHaciaBase(resultProbs, tasas, alpha = 0.15) {
  const modelo = {
    local: resultProbs.local,
    empate: resultProbs.empate,
    visitante: resultProbs.visitante,
  };
  const base = {
    local: tasas.homeRate * 100,
    empate: tasas.drawRate * 100,
    visitante: tasas.awayRate * 100,
  };
  const mezcla = {
    local: modelo.local * (1 - alpha) + base.local * alpha,
    empate: modelo.empate * (1 - alpha) + base.empate * alpha,
    visitante: modelo.visitante * (1 - alpha) + base.visitante * alpha,
  };
  const s = mezcla.local + mezcla.empate + mezcla.visitante;
  if (s <= 0) return resultProbs;
  return {
    local: +(mezcla.local / s * 100).toFixed(1),
    empate: +(mezcla.empate / s * 100).toFixed(1),
    visitante: +(mezcla.visitante / s * 100).toFixed(1),
  };
}
