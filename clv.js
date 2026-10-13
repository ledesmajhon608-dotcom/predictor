// ============================================================================
// clv.js — Closing Line Value
// CLV > 0 sostenido = el modelo vence al mercado a largo plazo.
// ============================================================================

// Convención: prob. implícita de cierre / prob. apostada - 1.
// Apostaste 2.10 y cerró 1.95 → CLV +7.7% (mejor precio que el cierre).
export function clvPct(cuotaApostada, cuotaCierre) {
  if (!Number.isFinite(cuotaApostada) || !Number.isFinite(cuotaCierre)
      || cuotaApostada <= 1 || cuotaCierre <= 1) return null;
  const pA = 1 / cuotaApostada, pC = 1 / cuotaCierre;
  if (pA <= 0) return null;
  return +((pC / pA - 1) * 100).toFixed(2);
}

export function resumenCLV(picks) {
  const vals = [];
  let clvPos = 0, n = 0;
  for (const p of picks) {
    const c = clvPct(p.cuota, p.cuotaCierre);
    if (c == null) continue;
    vals.push(c); n++;
    if (c > 0) clvPos++;
  }
  if (!n) return { n: 0, media: null, mediana: null, pctPositivo: null };
  vals.sort((a, b) => a - b);
  return {
    n,
    media: +(vals.reduce((s, v) => s + v, 0) / n).toFixed(2),
    mediana: +(n % 2 ? vals[(n - 1) / 2] : (vals[n / 2 - 1] + vals[n / 2]) / 2).toFixed(2),
    pctPositivo: +(clvPos / n * 100).toFixed(1),
  };
}

// Line shopping: mejor casa para un mercado.
export function mejorCasa(probPct, cuotasPorCasa, filtroEV = 1.05) {
  let mejor = null;
  for (const [casa, cuota] of Object.entries(cuotasPorCasa)) {
    if (!Number.isFinite(cuota) || cuota <= 1) continue;
    const ev = (probPct / 100) * cuota;
    if (!mejor || cuota > mejor.cuota) mejor = { casa, cuota, ev: +ev.toFixed(3) };
  }
  if (!mejor) return null;
  return { ...mejor, pasaEV: mejor.ev > filtroEV };
}
