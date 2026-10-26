// walkforward.js
// v7: Agrega "Goles por Equipo" (Home/Away Over 0.5 y 1.5) al Walk-Forward.

import {
  LIGAS, SHRINK_ALPHA, FILTRO_EV, HOME_ADVANTAGE, DIXON_COLES_RHO, DEFAULT_HOME_ADV, DEFAULT_RHO,
  HA_MIN, HA_MAX, RHO_MIN, RHO_MAX, RATING_MIN, RATING_MAX, GOALS_AVG_PRIOR_MATCHES,
} from './leagues.js';
import { simulateMatch, calcLambdas } from './model.js';
import { calibrarLigaMLE, shrinkHaciaBase } from './calibrate.js';
import { calcGoalMarkets, plattCalibrate, logLikMarcador } from './stats.js';
import { recalcularRatings } from './ratings.js';

const Z_SIGNIFICATIVO = 1.64;
const ESCANEO_MIN_N = 30;
const W_LIST = [0, 0.25, 0.5, 0.75, 1];
const SIGMA_HA = 0.15;
const SIGMA_RHO = 0.06;

const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

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
const media = (a) => meanSd(a).mean;
const brier3 = (probsPct, idx) => probsPct.reduce((s, p, j) => s + (p / 100 - (j === idx ? 1 : 0)) ** 2, 0);

export function predecir(leagueKey, hR, aR, { goalsAvg, homeAdv, rho }) {
  const { lambdaHome, lambdaAway } = calcLambdas(goalsAvg, hR, aR, homeAdv);
  const mk = calcGoalMarkets(lambdaHome, lambdaAway, leagueKey, rho);
  const calL = plattCalibrate(mk.resultProbs.home, 'resultado');
  const calE = plattCalibrate(mk.resultProbs.draw, 'resultado');
  const calV = plattCalibrate(mk.resultProbs.away, 'resultado');
  const suma = calL + calE + calV;
  return {
    resultProbs: {
      local: +(calL * 100 / suma).toFixed(1),
      empate: +(calE * 100 / suma).toFixed(1),
      visitante: +(calV * 100 / suma).toFixed(1),
    },
    over15: plattCalibrate(mk.over15, 'goals15'),
    over25: plattCalibrate(mk.over25, 'goals25'),
    over35: plattCalibrate(mk.over35, 'goals35'),
    btts: plattCalibrate(mk.btts, 'btts'),
    homeOver05: plattCalibrate(mk.homeOver05, 'goals15'),
    homeOver15: plattCalibrate(mk.homeOver15, 'goals25'),
    awayOver05: plattCalibrate(mk.awayOver05, 'goals15'),
    awayOver15: plattCalibrate(mk.awayOver15, 'goals25'),
  };
}

export function estimarRatings(partidos, {
  halflifeDias = 60, minMatches = 3, ahoraMs = Date.now(),
  homeAdv = 1.2, priorJuegos = 4, iteraciones = 30,
} = {}) {
  const { equipos } = recalcularRatings(partidos, {
    halflifeDias, minMatches, ahoraMs, homeAdv, priorJuegos, iteraciones,
  });
  const mapa = {};
  for (const e of equipos) {
    mapa[e.team] = {
      atk: clamp(e.atk, RATING_MIN, RATING_MAX),
      def: clamp(e.def, RATING_MIN, RATING_MAX),
    };
  }
  return mapa;
}

function ajustarHaRho(matches, goalsAvg, haPrior, rhoPrior) {
  let mejor = { ha: haPrior, rho: rhoPrior, obj: -Infinity };
  for (let ha = HA_MIN; ha <= HA_MAX + 1e-9; ha += 0.01) {
    const lam = matches.map(m => calcLambdas(goalsAvg, m.h, m.a, ha));
    for (let rho = RHO_MIN; rho <= RHO_MAX + 1e-9; rho += 0.01) {
      let ll = 0;
      for (let i = 0; i < matches.length; i++) {
        ll += logLikMarcador(matches[i].gl, matches[i].gv, lam[i].lambdaHome, lam[i].lambdaAway, rho);
      }
      const pen = 0.5 * (((ha - haPrior) / SIGMA_HA) ** 2 + ((rho - rhoPrior) / SIGMA_RHO) ** 2);
      const obj = ll - pen;
      if (obj > mejor.obj) mejor = { ha, rho, obj };
    }
  }
  return { ha: +mejor.ha.toFixed(3), rho: +mejor.rho.toFixed(3) };
}

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
    const bModelo = n ? media(this.bm) : null;
    const bMercado = n ? media(this.bk) : null;
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

class MezclaAcc {
  constructor() { this.cols = W_LIST.map(w => ({ w, b3: [], bg: [], rets: [] })); }
  add({ p1x2, k1x2, idx, bin, lados }) {
    for (const c of this.cols) {
      if (k1x2) c.b3.push(brier3(p1x2.map((pm, j) => (1 - c.w) * pm + c.w * k1x2[j]), idx));
      for (const b of bin) {
        if (b.pk == null) continue;
        const pb = (1 - c.w) * b.pm + c.w * b.pk;
        c.bg.push((pb / 100 - (b.hit ? 1 : 0)) ** 2);
      }
      for (const l of lados) {
        if (l.pk == null || !l.cuota) continue;
        const pb = (1 - c.w) * l.pm + c.w * l.pk;
        if ((pb / 100) * l.cuota > FILTRO_EV) c.rets.push(l.hit ? l.cuota - 1 : -1);
      }
    }
  }
  summary() {
    const base = this.cols[0];
    return this.cols.map(c => {
      const { mean, sd } = meanSd(c.rets);
      const se = sd != null ? sd / Math.sqrt(c.rets.length) : null;
      return {
        w: c.w,
        n1x2: c.b3.length, brier1x2: media(c.b3),
        z1x2: c.w === 0 ? null : zMedia(base.b3.map((v, i) => v - c.b3[i])),
        nG: c.bg.length, brierG: media(c.bg),
        zG: c.w === 0 ? null : zMedia(base.bg.map((v, i) => v - c.bg[i])),
        apuestas: c.rets.length,
        roi: mean != null ? mean * 100 : null,
        se: se != null ? se * 100 : null,
        z: se && se > 1e-12 ? mean / se : null,
      };
    });
  }
}

function entradaMezcla(rp3, g, mk, p, idx, tg, bttsReal, gl, gv) {
  const inv = (x) => (x == null ? null : 100 - x);
  return {
    p1x2: rp3, k1x2: mk.m3, idx,
    bin: [
      { pm: g.over15, pk: mk.f15, hit: tg > 1.5 },
      { pm: g.over25, pk: mk.f25, hit: tg > 2.5 },
      { pm: g.over35, pk: mk.f35, hit: tg > 3.5 },
      { pm: g.btts, pk: mk.fb, hit: bttsReal },
    ],
    lados: [
      { pm: rp3[0], pk: mk.m3 ? mk.m3[0] : null, cuota: p.odds_local, hit: idx === 0 },
      { pm: rp3[1], pk: mk.m3 ? mk.m3[1] : null, cuota: p.odds_empate, hit: idx === 1 },
      { pm: rp3[2], pk: mk.m3 ? mk.m3[2] : null, cuota: p.odds_visitante, hit: idx === 2 },
      { pm: g.over15, pk: mk.f15, cuota: p.odds_over15, hit: tg > 1.5 },
      { pm: 100 - g.over15, pk: inv(mk.f15), cuota: p.odds_under15, hit: tg < 1.5 },
      { pm: g.over25, pk: mk.f25, cuota: p.odds_over25, hit: tg > 2.5 },
      { pm: 100 - g.over25, pk: inv(mk.f25), cuota: p.odds_under25, hit: tg < 2.5 },
      { pm: g.over35, pk: mk.f35, cuota: p.odds_over35, hit: tg > 3.5 },
      { pm: 100 - g.over35, pk: inv(mk.f35), cuota: p.odds_under35, hit: tg < 3.5 },
      { pm: g.btts, pk: mk.fb, cuota: p.odds_btts_si, hit: bttsReal },
      { pm: 100 - g.btts, pk: inv(mk.fb), cuota: p.odds_btts_no, hit: !bttsReal },
    ],
  };
}

export async function walkForward(leagueKey, partidosIn, { warmup = 40, step = 20, ventana = 200, onLog = null } = {}) {
  const log = (m) => { if (onLog) onLog(m); };
  const todos = [...partidosIn]
    .filter(p => p.goles_local != null && p.goles_visitante != null && p.local && p.visitante)
    .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
  const n = todos.length;
  const liga = LIGAS[leagueKey];
  if (!liga) return { error: 'Liga no reconocida' };
  if (n < warmup + 10) return { error: 'Solo ' + n + ' partidos válidos: hacen falta al menos ' + (warmup + 10) + '.' };

  const b3Todos = { cal: [], base: [], dCalBase: [] };
  const b3Cuota = { cal: [], base: [], mkt: [], dMkt: [] };
  const bEstAll = [], bFueraAll = [], dRatings = [];
  const mk = {
    local: new BrierVsMercado('Local gana'),
    empate: new BrierVsMercado('Empate'),
    visitante: new BrierVsMercado('Visitante gana'),
    over15: new BrierVsMercado('Over 1.5 goles'),
    over25: new BrierVsMercado('Over 2.5 goles'),
    over35: new BrierVsMercado('Over 3.5 goles'),
    btts: new BrierVsMercado('Ambos marcan (Sí)'),
    homeOver05: new BrierVsMercado('Local > 0.5 goles'),
    homeOver15: new BrierVsMercado('Local > 1.5 goles'),
    awayOver05: new BrierVsMercado('Visitante > 0.5 goles'),
    awayOver15: new BrierVsMercado('Visitante > 1.5 goles'),
  };
  const escaneo = new Escaneo();
  const mezA = new MezclaAcc(), mezB = new MezclaAcc();
  const bloques = [];
  let evaluados = 0, saltados = 0;

  const ha0 = HOME_ADVANTAGE[leagueKey] != null ? HOME_ADVANTAGE[leagueKey] : DEFAULT_HOME_ADV;
  const rho0 = DIXON_COLES_RHO[leagueKey] != null ? DIXON_COLES_RHO[leagueKey] : (DIXON_COLES_RHO.default != null ? DIXON_COLES_RHO.default : DEFAULT_RHO);

  for (let start = warmup; start < n; start += step) {
    const train = todos.slice(Math.max(0, start - ventana), start);
    const test = todos.slice(start, start + step);

    let cal = null, tasas = null;
    try {
      const r = await calibrarLigaMLE(leagueKey, train, { minPartidos: 20 });
      cal = r.calibracion; tasas = r.tasas;
    } catch (e) {
      log('⚠️ Bloque en ' + start + ': calibración falló (' + e.message + ').');
    }

    const ahoraMs = new Date(test[0].fecha).getTime();
    const mapa = estimarRatings(train, { ahoraMs, homeAdv: ha0 });
    const obsAvg = train.reduce((s, p) => s + p.goles_local + p.goles_visitante, 0) / train.length;
    const goalsAvgB = (train.length * obsAvg + GOALS_AVG_PRIOR_MATCHES * liga.goalsAvg) / (train.length + GOALS_AVG_PRIOR_MATCHES);
    const msB = train
      .filter(p => mapa[p.local] && mapa[p.visitante])
      .map(p => ({ h: mapa[p.local], a: mapa[p.visitante], gl: p.goles_local, gv: p.goles_visitante }));
    const parB = msB.length >= 20 ? ajustarHaRho(msB, goalsAvgB, ha0, rho0) : { ha: ha0, rho: rho0 };
    const checksum = +Object.values(mapa).reduce((s, r) => s + r.atk + r.def, 0).toFixed(6);

    bloques.push({
      nTrain: train.length, nTest: test.length,
      trainHasta: train[train.length - 1].fecha,
      testDesde: test[0].fecha, testHasta: test[test.length - 1].fecha,
      ha: cal ? cal.homeAdvantage : null, rho: cal ? cal.rho : null, calibrado: !!cal,
      haB: parB.ha, rhoB: parB.rho, equiposB: Object.keys(mapa).length, checksumRatings: checksum,
    });

    const etiquetaCal = cal ? ' · HA ' + cal.homeAdvantage.toFixed(2) + ' rho ' + cal.rho.toFixed(2) : '';
    log('Bloque ' + bloques.length + ': entrena ' + train.length + ' · prueba ' + test.length + etiquetaCal + ' · fuera: ' + Object.keys(mapa).length + ' equipos');

    for (const p of test) {
      let pc, pb;
      try {
        pc = await simulateMatch(leagueKey, p.local, p.visitante, { staticOnly: true, calibracion: cal });
        pb = await simulateMatch(leagueKey, p.local, p.visitante, { staticOnly: true, calibracion: null });
      } catch (e) { saltados++; continue; }
      evaluados++;

      const rp = SHRINK_ALPHA > 0 && tasas ? shrinkHaciaBase(pc.resultProbs, tasas, SHRINK_ALPHA) : pc.resultProbs;
      const hF = mapa[p.local] || { atk: 1, def: 1 };
      const aF = mapa[p.visitante] || { atk: 1, def: 1 };
      const pF = predecir(leagueKey, hF, aF, { goalsAvg: goalsAvgB, homeAdv: parB.ha, rho: parB.rho });
      const rpF = SHRINK_ALPHA > 0 && tasas ? shrinkHaciaBase(pF.resultProbs, tasas, SHRINK_ALPHA) : pF.resultProbs;

      const gl = p.goles_local, gv = p.goles_visitante, tg = gl + gv;
      const idx = gl > gv ? 0 : gl === gv ? 1 : 2;
      const resultado = ['local', 'empate', 'visitante'][idx];
      const bttsReal = gl > 0 && gv > 0;

      const arrCal = [rp.local, rp.empate, rp.visitante];
      const arrBase = [pb.resultProbs.local, pb.resultProbs.empate, pb.resultProbs.visitante];
      const arrF = [rpF.local, rpF.empate, rpF.visitante];
      const bC = brier3(arrCal, idx), bB = brier3(arrBase, idx), bF = brier3(arrF, idx);
      b3Todos.cal.push(bC); b3Todos.base.push(bB); b3Todos.dCalBase.push(bB - bC);
      bEstAll.push(bC); bFueraAll.push(bF); dRatings.push(bF - bC);

      const m3 = devigar3(p.odds_local, p.odds_empate, p.odds_visitante);
      const f15 = devigar2(p.odds_over15, p.odds_under15);
      const f25 = devigar2(p.odds_over25, p.odds_under25);
      const f35 = devigar2(p.odds_over35, p.odds_under35);
      const fb = devigar2(p.odds_btts_si, p.odds_btts_no);

      if (m3) {
        const bM = brier3(m3, idx);
        b3Cuota.cal.push(bC); b3Cuota.base.push(bB); b3Cuota.mkt.push(bM); b3Cuota.dMkt.push(bM - bC);
        mk.local.add(rp.local, m3[0], idx === 0);
        mk.empate.add(rp.empate, m3[1], idx === 1);
        mk.visitante.add(rp.visitante, m3[2], idx === 2);
      }
      if (f15 != null) mk.over15.add(pc.over15, f15, tg > 1.5);
      if (f25 != null) mk.over25.add(pc.over25, f25, tg > 2.5);
      if (f35 != null) mk.over35.add(pc.over35, f35, tg > 3.5);
      if (fb != null) mk.btts.add(pc.btts, fb, bttsReal);

      // NUEVO: Evaluación de goles por equipo
      const fHome05 = devigar2(p.odds_home_over05, p.odds_home_under05);
      const fHome15 = devigar2(p.odds_home_over15, p.odds_home_under15);
      const fAway05 = devigar2(p.odds_away_over05, p.odds_away_under05);
      const fAway15 = devigar2(p.odds_away_over15, p.odds_away_under15);

      if (fHome05 != null) mk.homeOver05.add(pc.homeOver05, fHome05, gl > 0.5);
      if (fHome15 != null) mk.homeOver15.add(pc.homeOver15, fHome15, gl > 1.5);
      if (fAway05 != null) mk.awayOver05.add(pc.awayOver05, fAway05, gv > 0.5);
      if (fAway15 != null) mk.awayOver15.add(pc.awayOver15, fAway15, gv > 1.5);

      const esLocalOEmpate = (resultado === 'local' || resultado === 'empate');
      const esEmpateOVisitante = (resultado === 'empate' || resultado === 'visitante');
      const lados = [
        ['1x', 'Local o Empate (1X)', rp.local + rp.empate, null, esLocalOEmpate],
        ['x2', 'Empate o Visitante (X2)', rp.empate + rp.visitante, null, esEmpateOVisitante],
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
        ['h05', 'Local > 0.5 goles', pc.homeOver05, p.odds_home_over05, gl > 0.5],
        ['h15', 'Local > 1.5 goles', pc.homeOver15, p.odds_home_over15, gl > 1.5],
        ['a05', 'Visitante > 0.5 goles', pc.awayOver05, p.odds_away_over05, gv > 0.5],
        ['a15', 'Visitante > 1.5 goles', pc.awayOver15, p.odds_away_over15, gv > 1.5],
      ];
      for (const [k, label, prob, cuota, hit] of lados) escaneo.add(k, label, prob, cuota, hit);

      const mkt = { m3, f15, f25, f35, fb };
      mezA.add(entradaMezcla(arrCal, pc, mkt, p, idx, tg, bttsReal, gl, gv));
      mezB.add(entradaMezcla(arrF, pF, mkt, p, idx, tg, bttsReal, gl, gv));
    }
    await new Promise(r => setTimeout(r, 0));
  }

  return {
    leagueKey, nTotal: n, evaluados, saltados, warmup, step, ventana, bloques,
    calibracionVsBase: { n: b3Todos.cal.length, cal: media(b3Todos.cal), base: media(b3Todos.base), z: zMedia(b3Todos.dCalBase) },
    modeloVsMercado1x2: {
      n: b3Cuota.cal.length,
      cal: media(b3Cuota.cal),
      base: media(b3Cuota.base),
      mkt: media(b3Cuota.mkt),
      zVsMkt: zMedia(b3Cuota.dMkt),
      mejoraVsMkt: b3Cuota.mkt.length ? (media(b3Cuota.mkt) - media(b3Cuota.cal)) / media(b3Cuota.mkt) * 100 : null,
    },
    ratings: { n: bEstAll.length, estatico: media(bEstAll), fuera: media(bFueraAll), z: zMedia(dRatings) },
    mezcla: { estatico: mezA.summary(), fuera: mezB.summary() },
    mercados: Object.values(mk).map(m => m.summary()).filter(s => s.n > 0),
    escaneo: escaneo.summary(),
  };
}

function mejorMezcla(filas) {
  const con = filas.filter(f => f.n1x2 > 0 && f.brier1x2 != null);
  if (!con.length) return null;
  return con.reduce((a, b) => (b.brier1x2 < a.brier1x2 ? b : a));
}

export function lecturaResultado(res) {
  const out = [];
  const c = res.calibracionVsBase;
  if (c.z != null) {
    if (c.z > Z_SIGNIFICATIVO) out.push('La calibración mejora el 1X2 fuera de muestra respecto a los valores base.');
    else if (c.z < -Z_SIGNIFICATIVO) out.push('La calibración EMPEORA el 1X2 fuera de muestra: conviene usar los valores base.');
    else out.push('La calibración no se distingue de los valores base fuera de muestra.');
  }
  const mejores = res.mercados.filter(m => m.z != null && m.z > Z_SIGNIFICATIVO).map(m => m.label);
  const peores = res.mercados.filter(m => m.z != null && m.z < -Z_SIGNIFICATIVO).map(m => m.label);
  if (mejores.length) out.push('Mejor que la cuota (significativo): ' + mejores.join(', ') + '.');
  if (peores.length) out.push('Peor que la cuota (significativo): ' + peores.join(', ') + '.');
  if (!mejores.length && !peores.length) out.push('Ningún mercado se separa claramente de la cuota.');

  const r = res.ratings;
  if (r && r.z != null) {
    if (r.z > Z_SIGNIFICATIVO) out.push('Los ratings de leagues.js predicen MEJOR que los calculados con partidos anteriores.');
    else if (r.z < -Z_SIGNIFICATIVO) out.push('Los ratings calculados con partidos anteriores predicen MEJOR: conviene actualizarlos con datos.');
    else out.push('Los ratings de leagues.js y los calculados rinden parecido.');
  }

  const pares = [['estatico', 'ratings leagues.js'], ['fuera', 'ratings fuera de muestra']];
  for (const [clave, nombre] of pares) {
    const filas = res.mezcla ? res.mezcla[clave] : null;
    const mejor = filas ? mejorMezcla(filas) : null;
    if (!mejor) continue;
    const puro = filas[0];
    if (mejor.w === 0) {
      out.push('Mezcla con la cuota (' + nombre + '): el modelo puro ya es lo mejor.');
    } else {
      const sig = mejor.z1x2 != null && mejor.z1x2 > Z_SIGNIFICATIVO ? 'mejora significativa' : 'mejora no significativa';
      out.push('Mezcla con la cuota (' + nombre + '): mejor peso = ' + Math.round(mejor.w * 100) + '% (Brier ' + mejor.brier1x2.toFixed(3) + ' vs ' + puro.brier1x2.toFixed(3) + ', ' + sig + ').');
    }
  }

  const roiOk = res.escaneo
    .filter(e => e.n >= ESCANEO_MIN_N && e.z != null && e.z > Z_SIGNIFICATIVO)
    .map(e => e.label);
  if (roiOk.length) out.push('ROI positivo significativo: ' + roiOk.join(', ') + '.');
  else out.push('Ningún mercado muestra ROI positivo distinguible de la suerte (con n ≥ 30).');
  return out;
}

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

  const log = (m) => {
    logSection.style.display = 'block';
    logDiv.textContent += m + '\n';
    logDiv.scrollTop = logDiv.scrollHeight;
  };
  const f1 = (x) => Number(x).toFixed(1);
  const f3 = (x) => x == null ? '—' : Number(x).toFixed(3);
  const dim = 'var(--text-dim,#8b95a5)';

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    runBtn.disabled = true; historial = null;
    if (!file) { fileInfo.textContent = ''; return; }
    try {
      const data = JSON.parse(await file.text());
      if (!data.leagueKey || !LIGAS[data.leagueKey]) {
        fileInfo.textContent = '❌ El archivo no tiene una liga reconocida (leagueKey).';
        return;
      }
      if (!Array.isArray(data.partidos) || data.partidos.length === 0) {
        fileInfo.textContent = '❌ El archivo no tiene partidos.';
        return;
      }
      historial = data;
      fileInfo.textContent = '✅ ' + (data.liga || data.leagueKey) + ' — ' + data.partidos.length + ' partidos cargados.';
      runBtn.disabled = false;
    } catch (err) {
      fileInfo.textContent = '❌ No se pudo leer el archivo: ' + err.message;
    }
  });

  const senal = (z) => z == null ? '—' : z > Z_SIGNIFICATIVO ? '✅ mejor' : z < -Z_SIGNIFICATIVO ? '❌ peor' : '≈ empate';
  const colSenal = (z) => z == null ? dim : z > Z_SIGNIFICATIVO ? 'var(--green)' : z < -Z_SIGNIFICATIVO ? 'var(--red)' : 'var(--yellow)';

  function tablaMezcla(titulo, filas) {
    const mejor = mejorMezcla(filas);
    const rows = filas.map(f => {
      let nombre;
      if (f.w === 0) nombre = '0% (modelo puro)';
      else if (f.w === 1) nombre = '100% (solo cuota)';
      else nombre = Math.round(f.w * 100) + '% cuota';
      const esMejor = mejor && f.w === mejor.w;
      let roiTxt;
      if (f.apuestas) {
        const sep = f.se != null ? ' ±' + f1(f.se) : '';
        roiTxt = (f.roi >= 0 ? '+' : '') + f1(f.roi) + '%' + sep + ' (' + f.apuestas + ')';
      } else {
        roiTxt = 'sin apuestas';
      }
      const colRoi = !f.apuestas ? dim
        : f.z != null && f.z > Z_SIGNIFICATIVO && f.apuestas >= ESCANEO_MIN_N ? 'var(--green)'
        : f.roi > 0 ? 'var(--yellow)' : 'var(--red)';
      return '<div class="compare-row">' +
        '<span>' + (esMejor ? '⭐ ' : '') + nombre + '</span>' +
        '<span class="grid-plain" style="color:' + (f.w === 0 ? 'inherit' : colSenal(f.z1x2)) + '">' + f3(f.brier1x2) + '</span>' +
        '<span class="grid-plain" style="color:' + (f.w === 0 ? 'inherit' : colSenal(f.zG)) + '">' + f3(f.brierG) + '</span>' +
        '<span class="grid-plain" style="color:' + colRoi + '">' + roiTxt + '</span>' +
      '</div>';
    }).join('');

    return '<div class="card">' +
      '<h3>' + titulo + ' <small>(' + filas[0].n1x2 + ' partidos con cuotas)</small></h3>' +
      '<div class="compare-row compare-head"><span>Peso de la cuota</span><span>Brier 1X2</span><span>Brier goles</span><span>ROI EV≥' + FILTRO_EV + ' (apuestas)</span></div>' +
      rows +
      '<p style="margin:10px 0 0;font-size:.75rem;color:' + dim + ';line-height:1.5;">Brier: menor = mejor. ⭐ = mejor Brier 1X2.</p>' +
    '</div>';
  }

  function render(res) {
    const c = res.calibracionVsBase;
    const m = res.modeloVsMercado1x2;
    const r = res.ratings;

    const lecturas = lecturaResultado(res).map(t => '<p style="margin:0 0 6px;font-size:.85rem;">• ' + t + '</p>').join('');

    const filasMk = res.mercados.map(s => {
      const mejoraTxt = s.mejora == null ? '—' : ((s.mejora >= 0 ? '+' : '') + f1(s.mejora) + '%');
      return '<div class="compare-row">' +
        '<span>' + s.label + '</span>' +
        '<span class="grid-plain">' + s.n + '</span>' +
        '<span class="grid-plain">' + f3(s.bModelo) + ' vs ' + f3(s.bMercado) + '</span>' +
        '<span class="grid-plain" style="color:' + colSenal(s.z) + '">' + mejoraTxt + ' ' + senal(s.z) + '</span>' +
      '</div>';
    }).join('');

    const filasEs = res.escaneo.map(e => {
      const col = e.n >= ESCANEO_MIN_N && e.z != null && e.z > Z_SIGNIFICATIVO ? 'var(--green)'
        : e.roi > 0 ? 'var(--yellow)' : 'var(--red)';
      const warn = e.n < ESCANEO_MIN_N ? ' ⚠️' : '';
      const seTxt = e.se != null ? ' ±' + f1(e.se) : '';
      return '<div class="compare-row">' +
        '<span>' + e.label + warn + '</span>' +
        '<span class="grid-plain">' + e.n + ' · ' + f1(e.rate) + '%</span>' +
        '<span class="grid-plain">EV ' + e.evMedio.toFixed(2) + '</span>' +
        '<span class="grid-plain" style="color:' + col + '">' + (e.roi >= 0 ? '+' : '') + f1(e.roi) + '%' + seTxt + '</span>' +
      '</div>';
    }).join('');

    const filasBl = res.bloques.map((b, i) => {
      const fechaDesde = (b.testDesde || '').slice(0, 10);
      const haTxt = b.ha != null ? ('HA ' + b.ha.toFixed(2)) : 'base';
      return '<div class="compare-row">' +
        '<span>#' + (i + 1) + ' · ' + fechaDesde + '</span>' +
        '<span class="grid-plain">train ' + b.nTrain + ' · test ' + b.nTest + '</span>' +
        '<span class="grid-plain">' + haTxt + '</span>' +
        '<span class="grid-plain">fuera ' + b.equiposB + 'eq · HA ' + b.haB.toFixed(2) + '</span>' +
      '</div>';
    }).join('');

    let ratingTxt;
    if (r.z == null) ratingTxt = '—';
    else if (r.z > Z_SIGNIFICATIVO) ratingTxt = '✅ leagues.js mejor';
    else if (r.z < -Z_SIGNIFICATIVO) ratingTxt = '✅ fuera de muestra mejor';
    else ratingTxt = '≈ empate';

    const mejoraMktTxt = m.mejoraVsMkt == null
      ? '—'
      : ((m.mejoraVsMkt >= 0 ? '+' : '') + f1(m.mejoraVsMkt) + '% ' + senal(m.zVsMkt));

    resultsContent.innerHTML =
      '<div class="card" style="border:2px solid var(--green);">' +
        '<h3>🧭 Lectura <small>(' + res.evaluados + ' partidos fuera de muestra)</small></h3>' +
        lecturas +
      '</div>' +
      '<div class="card">' +
        '<h3>Ratings: leagues.js vs calculados <small>(Brier 1X2, ' + r.n + ' partidos)</small></h3>' +
        '<div class="compare-row"><span>Ratings de leagues.js</span><span class="grid-plain">' + f3(r.estatico) + '</span><span class="grid-plain"></span><span class="grid-plain"></span></div>' +
        '<div class="compare-row"><span>Ratings fuera de muestra</span><span class="grid-plain">' + f3(r.fuera) + '</span><span class="grid-plain"></span><span class="grid-plain" style="color:' + dim + '">' + ratingTxt + '</span></div>' +
      '</div>' +
      tablaMezcla('Mezcla con la cuota · ratings de leagues.js', res.mezcla.estatico) +
      tablaMezcla('Mezcla con la cuota · ratings fuera de muestra', res.mezcla.fuera) +
      '<div class="card">' +
        '<h3>Calibración vs valores base <small>(Brier 1X2, menor = mejor)</small></h3>' +
        '<div class="compare-row"><span>Calibrado + shrink</span><span class="grid-plain">' + f3(c.cal) + '</span><span class="grid-plain"></span><span class="grid-plain">n ' + c.n + '</span></div>' +
        '<div class="compare-row"><span>Valores base</span><span class="grid-plain">' + f3(c.base) + '</span><span class="grid-plain"></span><span class="grid-plain" style="color:' + colSenal(c.z) + '">' + senal(c.z) + '</span></div>' +
      '</div>' +
      '<div class="card">' +
        '<h3>1X2 vs cuota real <small>(' + m.n + ' partidos con cuotas)</small></h3>' +
        '<div class="compare-row"><span>Modelo calibrado</span><span class="grid-plain">' + f3(m.cal) + '</span><span class="grid-plain"></span><span class="grid-plain"></span></div>' +
        '<div class="compare-row"><span>Cuota (sin margen)</span><span class="grid-plain">' + f3(m.mkt) + '</span><span class="grid-plain"></span><span class="grid-plain" style="color:' + colSenal(m.zVsMkt) + '">' + mejoraMktTxt + '</span></div>' +
      '</div>' +
      '<div class="card">' +
        '<h3>Modelo vs cuota por mercado <small>(Brier, menor = mejor)</small></h3>' +
        '<div class="compare-row compare-head"><span>Mercado</span><span>n</span><span>Modelo vs cuota</span><span>Mejora</span></div>' +
        (filasMk || '<div class="compare-row"><span>Sin cuotas en el historial.</span></div>') +
      '</div>' +
      '<div class="card" style="border:2px solid var(--yellow);">' +
        '<h3>🔎 Apostar con EV ≥ ' + FILTRO_EV + ' <small>(modelo puro, fuera de muestra)</small></h3>' +
        '<div class="compare-row compare-head"><span>Mercado</span><span>Apuestas · acierto</span><span>EV medio</span><span>ROI ± error</span></div>' +
        (filasEs || '<div class="compare-row"><span>Ningún lado superó el filtro EV.</span></div>') +
        '<p style="margin:10px 0 0;font-size:.78rem;color:' + dim + ';line-height:1.5;">' +
          'ROI ± error estándar. Si el ROI no supera ~1.64 veces el error, puede ser suerte. ⚠️ = menos de ' + ESCANEO_MIN_N + ' apuestas.' +
        '</p>' +
      '</div>' +
      '<div class="card">' +
        '<h3>Bloques <small>(entrena con lo anterior, prueba el bloque)</small></h3>' +
        filasBl +
      '</div>';

    resultsSection.style.display = 'block';
  }

  runBtn.addEventListener('click', async () => {
    if (!historial) return;
    runBtn.disabled = true;
    runBtn.textContent = 'Calculando...';
    logDiv.textContent = '';
    resultsSection.style.display = 'none';
    try {
      const warmup = Math.max(20, +warmupInput.value || 40);
      const step = Math.max(5, +stepInput.value || 20);
      const res = await walkForward(historial.leagueKey, historial.partidos, { warmup, step, onLog: log });
      if (res.error) {
        log('❌ ' + res.error);
      } else {
        log('✅ Listo: ' + res.evaluados + ' evaluados, ' + res.saltados + ' salteados.');
        render(res);
      }
    } catch (err) {
      console.error(err);
      log('❌ Error: ' + err.message);
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = 'Ejecutar walk-forward';
    }
  });
}
