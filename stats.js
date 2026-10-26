// stats.js
// v3: Agrega cálculo de goles por equipo (Over 0.5 y 1.5 para local y visitante).

import { PLATT_PARAMS, DIXON_COLES_RHO, DEFAULT_RHO } from './leagues.js';

const MAX_GOLES = 12;

export function plattCalibrate(raw, type) {
    const p = Math.max(0.001, Math.min(0.999, raw / 100));
    const logit = Math.log(p / (1 - p));
    const params = PLATT_PARAMS[type] || { A: 0.93, B: -0.04 };
    const calibrated = 1 / (1 + Math.exp(-(params.A * logit + params.B)));
    return Math.min(98, Math.max(2, calibrated * 100));
}

export function poissonExact(lambda, k) {
    if (k < 0) return 0;
    if (k === 0) return Math.exp(-lambda);
    let t = Math.exp(-lambda);
    for (let i = 0; i < k; i++) t *= lambda / (i + 1);
    return t;
}

export function poissonProb(lambda, k) {
    let p = Math.exp(-lambda), t = p;
    for (let i = 1; i <= k; i++) { t *= lambda / i; p += t; }
    return p;
}

export function poissonOver(lambda, th) {
    return Math.min(98, Math.max(2, (1 - poissonProb(lambda, Math.floor(th))) * 100));
}

const LOG_FACT = [0];
for (let i = 1; i <= 40; i++) LOG_FACT[i] = LOG_FACT[i - 1] + Math.log(i);
export function poissonLogPmf(lambda, k) {
    const f = k <= 40 ? LOG_FACT[k] : LOG_FACT[40] + (k - 40) * Math.log(k);
    return -lambda + k * Math.log(lambda) - f;
}

export function negBinExact(mu, r, k) {
    if (k < 0) return 0;
    if (k === 0) return Math.pow(r / (r + mu), r);
    const p = r / (r + mu);
    let logComb = 0;
    for (let i = 1; i <= k; i++) {
        logComb += Math.log(r + i - 1) - Math.log(i);
    }
    const logP = logComb + r * Math.log(p) + k * Math.log(1 - p);
    return Math.exp(logP);
}

export function negBinOver(mu, th, r) {
    const k = Math.floor(th);
    let cdf = 0;
    for (let i = 0; i <= k; i++) cdf += negBinExact(mu, r, i);
    return Math.min(98, Math.max(2, (1 - cdf) * 100));
}

function resolverRho(leagueKey, rhoOverride) {
    return rhoOverride ?? DIXON_COLES_RHO[leagueKey] ?? DIXON_COLES_RHO.default ?? DEFAULT_RHO;
}

export function rhoSeguro(lH, lA, rho) {
    const eps = 0.01;
    const lo = Math.max(-1 / Math.max(lH, 1e-6), -1 / Math.max(lA, 1e-6)) + eps;
    const hi = Math.min(1 / Math.max(lH * lA, 1e-6), 1) - eps;
    if (lo >= hi) return 0;
    return Math.min(hi, Math.max(lo, rho));
}

export function dixonColesTau(x, y, lH, lA, rho) {
    const r = rhoSeguro(lH, lA, rho);
    if (x === 0 && y === 0) return 1 - (lH * lA * r);
    if (x === 0 && y === 1) return 1 + (lH * r);
    if (x === 1 && y === 0) return 1 + (lA * r);
    if (x === 1 && y === 1) return 1 - r;
    return 1;
}

export function scoreGrid(lH, lA, rho) {
    const pH = [], pA = [];
    for (let k = 0; k <= MAX_GOLES; k++) { pH.push(poissonExact(lH, k)); pA.push(poissonExact(lA, k)); }
    const grid = [];
    let total = 0;
    for (let h = 0; h <= MAX_GOLES; h++) {
        grid.push([]);
        for (let a = 0; a <= MAX_GOLES; a++) {
            let p = pH[h] * pA[a];
            if (h <= 1 && a <= 1) p *= dixonColesTau(h, a, lH, lA, rho);
            grid[h].push(p);
            total += p;
        }
    }
    const inv = total > 0 ? 1 / total : 1;
    for (let h = 0; h <= MAX_GOLES; h++) for (let a = 0; a <= MAX_GOLES; a++) grid[h][a] *= inv;
    return grid;
}

const clampPct = (v) => Math.min(98, Math.max(2, v * 100));

export function calcGoalMarkets(lH, lA, leagueKey, rhoOverride) {
    const rho = resolverRho(leagueKey, rhoOverride);
    const grid = scoreGrid(lH, lA, rho);
    let pH = 0, pD = 0, pA = 0, btts = 0;
    const totales = new Array(2 * MAX_GOLES + 1).fill(0);
    
    let home0 = 0, home1 = 0, away0 = 0, away1 = 0;

    for (let h = 0; h <= MAX_GOLES; h++) {
        for (let a = 0; a <= MAX_GOLES; a++) {
            const p = grid[h][a];
            if (h > a) pH += p; else if (h === a) pD += p; else pA += p;
            if (h > 0 && a > 0) btts += p;
            totales[h + a] += p;
            
            if (h === 0) home0 += p;
            if (h === 1) home1 += p;
            if (a === 0) away0 += p;
            if (a === 1) away1 += p;
        }
    }
    const overLinea = (linea) => {
        let cdf = 0;
        for (let t = 0; t <= Math.floor(linea); t++) cdf += totales[t];
        return clampPct(1 - cdf);
    };
    return {
        resultProbs: { home: +(pH * 100).toFixed(1), draw: +(pD * 100).toFixed(1), away: +(pA * 100).toFixed(1) },
        over15: overLinea(1.5),
        over25: overLinea(2.5),
        over35: overLinea(3.5),
        over45: overLinea(4.5),
        btts: clampPct(btts),
        homeOver05: clampPct(1 - home0),
        homeOver15: clampPct(1 - home0 - home1),
        awayOver05: clampPct(1 - away0),
        awayOver15: clampPct(1 - away0 - away1),
    };
}

export function over15DC(lH, lA, leagueKey, rhoOverride) { return calcGoalMarkets(lH, lA, leagueKey, rhoOverride).over15; }
export function calcBTTS(lH, lA, leagueKey, rhoOverride) { return calcGoalMarkets(lH, lA, leagueKey, rhoOverride).btts; }
export function calcResultProbs(lH, lA, leagueKey, rhoOverride) { return calcGoalMarkets(lH, lA, leagueKey, rhoOverride).resultProbs; }

export function logLikMarcador(h, a, lH, lA, rho) {
    const tau = (h <= 1 && a <= 1) ? dixonColesTau(h, a, lH, lA, rho) : 1;
    return poissonLogPmf(lH, h) + poissonLogPmf(lA, a) + Math.log(Math.max(tau, 1e-9));
}

export function colorFor(p) { return p >= 65 ? 'var(--green)' : p >= 42 ? 'var(--yellow)' : 'var(--accent)'; }
export function cardClassFor(p) { return p >= 65 ? 'high' : p >= 42 ? 'mid' : 'low'; }

export function normalizeCornersAvg(v) {
    const n = Number(v);
    if (!Number.isFinite(n) || n <= 0) return null;
    return n;
}

export function splitCornerLambda(totalCorners, homeAtk, homeDef, awayAtk, awayDef, homeBias) {
    const homeShareBase = homeBias / (homeBias + 1);
    const homeFactor = (homeAtk + awayDef) / 2;
    const awayFactor = (awayAtk + homeDef) / 2;
    const home = +(totalCorners * homeShareBase * homeFactor).toFixed(2);
    const away = +(totalCorners * (1 - homeShareBase) * awayFactor).toFixed(2);
    return { home, away };
}
