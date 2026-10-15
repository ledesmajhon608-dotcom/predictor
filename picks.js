// picks.js
// v4: agrega 1X y X2 (doble oportunidad).

import { LIGAS, getUmbrales, SHRINK_ALPHA, FILTRO_EV, KELLY_FRACTION, STAKE_MAX_PCT, getFiltroEV } from './leagues.js';
import { shrinkHaciaBase } from './calibrate.js';

export function getBettingConfig(ligaKey) {
  const liga = LIGAS[ligaKey];
  return liga?.betting || { status: 'unknown' };
}

export function esMercadoValido(ligaKey, mercado) {
  const config = getBettingConfig(ligaKey);
  if (config.status !== 'green' && config.status !== 'yellow') return false;
  if (!config.mercados) return false;
  return config.mercados.some(m => mercado.includes(m) || m.includes(mercado));
}

// [NUEVO] DC se permite si la liga lista 1X2 o explícitamente 1X/X2/DC.
function esMercadoDCValido(ligaKey) {
  const config = getBettingConfig(ligaKey);
  if (config.status !== 'green' && config.status !== 'yellow') return false;
  if (!config.mercados || config.mercados.length === 0) return false;
  return config.mercados.some(m => /1X2|1X|X2|DC|doble/i.test(m));
}

export function aplicarShrink(resultProbs, tasas, alpha = SHRINK_ALPHA) {
  if (!tasas || !(alpha > 0)) return resultProbs;
  if (![tasas.homeRate, tasas.drawRate, tasas.awayRate].every(Number.isFinite)) return resultProbs;
  return shrinkHaciaBase(resultProbs, tasas, alpha);
}

export function stakeSugerido(ligaKey) {
  const c = getBettingConfig(ligaKey);
  if (Number.isFinite(c.stake)) return c.stake;
  return c.status === 'green' ? 1 : c.status === 'yellow' ? 0.5 : 0;
}

export function stakeKelly(probPct, cuota, { fraccion = KELLY_FRACTION, tope = STAKE_MAX_PCT } = {}) {
  if (!Number.isFinite(probPct) || !Number.isFinite(cuota) || cuota <= 1) return null;
  const p = probPct / 100;
  const b = cuota - 1;
  const f = (p * cuota - 1) / b;
  if (!Number.isFinite(f) || f <= 0) return null;
  return +Math.min(f * fraccion * 100, tope).toFixed(2);
}

export function calcEV(probPct, cuota) {
  if (!Number.isFinite(probPct) || !Number.isFinite(cuota) || cuota <= 1) return null;
  return (probPct / 100) * cuota;
}

export function cuotaMinima(probPct, mercado = 'default') {
  if (!Number.isFinite(probPct) || probPct <= 0) return null;
  const filtro = getFiltroEV(mercado);
  return Math.ceil((filtro / (probPct / 100)) * 100 - 1e-9) / 100;
}

export function generarPicks(data, ligaKey) {
  const picks = [];
  const config = getBettingConfig(ligaKey);
  if (config.status === 'red') return [];
  if (data.sinRating && data.sinRating.length > 0) return [];

  const U = getUmbrales(ligaKey);
  const rp = data.resultProbs;
  const max1x2 = Math.max(rp.local, rp.empate, rp.visitante);

  // --- 1X2 individual ---
  if (max1x2 >= U.umbral1x2 && esMercadoValido(ligaKey, '1X2')) {
    if (rp.local === max1x2) picks.push({ key: 'local', label: 'Local gana', prob: rp.local, mercado: '1X2' });
    else if (rp.empate === max1x2) picks.push({ key: 'empate', label: 'Empate', prob: rp.empate, mercado: '1X2' });
    else picks.push({ key: 'visitante', label: 'Visitante gana', prob: rp.visitante, mercado: '1X2' });
  }

  // --- [NUEVO] Doble oportunidad 1X / X2 ---
  const dc1X = +(rp.local + rp.empate).toFixed(1);
  const dcX2 = +(rp.empate + rp.visitante).toFixed(1);
  const umbralDC = U.umbralDC ?? 68;

  if (dc1X >= umbralDC && esMercadoDCValido(ligaKey)) {
    picks.push({ key: 'dc1X', label: 'Local o Empate (1X)', prob: dc1X, mercado: '1X' });
  }
  if (dcX2 >= umbralDC && esMercadoDCValido(ligaKey)) {
    picks.push({ key: 'dcX2', label: 'Empate o Visitante (X2)', prob: dcX2, mercado: 'X2' });
  }

  // --- Overs ---
  const overs = [
    { key: 'over35', label: 'Over 3.5 goles', prob: data.over35, mercado: 'Over 3.5' },
    { key: 'over25', label: 'Over 2.5 goles', prob: data.over25, mercado: 'Over 2.5' },
    { key: 'over15', label: 'Over 1.5 goles', prob: data.over15, mercado: 'Over 1.5' },
  ];
  for (const l of overs) {
    if (l.prob != null && l.prob >= U.umbralGoles && esMercadoValido(ligaKey, l.mercado)) {
      picks.push({ key: l.key, label: l.label, prob: l.prob, mercado: l.mercado });
      break;
    }
  }

  // --- Unders ---
  const under15 = data.under15 ?? (data.over15 != null ? 100 - data.over15 : null);
  const under25 = data.under25 ?? (data.over25 != null ? 100 - data.over25 : null);
  const under35 = data.under35 ?? (data.over35 != null ? 100 - data.over35 : null);
  const unders = [
    { key: 'under15', label: 'Under 1.5 goles', prob: under15, mercado: 'Under 1.5', umbral: 82 },
    { key: 'under25', label: 'Under 2.5 goles', prob: under25, mercado: 'Under 2.5', umbral: 75 },
    { key: 'under35', label: 'Under 3.5 goles', prob: under35, mercado: 'Under 3.5', umbral: 72 },
  ];
  for (const l of unders) {
    if (l.prob != null && l.prob >= l.umbral && esMercadoValido(ligaKey, l.mercado)) {
      picks.push({ key: l.key, label: l.label, prob: l.prob, mercado: l.mercado });
      break;
    }
  }

  // --- BTTS ---
  if (data.btts != null && data.btts >= U.umbralBtss && esMercadoValido(ligaKey, 'BTTS')) {
    picks.push({ key: 'bttsSi', label: 'Ambos marcan (Sí)', prob: data.btts, mercado: 'BTTS Sí' });
  }
  if (data.btts != null && (100 - data.btts) >= (100 - U.umbralBtss) && esMercadoValido(ligaKey, 'BTTS')) {
    picks.push({ key: 'bttsNo', label: 'Ambos marcan (No)', prob: 100 - data.btts, mercado: 'BTTS No' });
  }

  // --- Córners ---
  if (data.cornerProbs && LIGAS[ligaKey]?.markets?.corn !== false) {
    const lineasCorners = [
      { key: 'c_over95', label: 'Over 9.5 córners', prob: data.cornerProbs.over9, mercado: 'Córners' },
      { key: 'c_over85', label: 'Over 8.5 córners', prob: data.cornerProbs.over8, mercado: 'Córners' },
      { key: 'c_over75', label: 'Over 7.5 córners', prob: data.cornerProbs.over7, mercado: 'Córners' },
    ];
    for (const l of lineasCorners) {
      if (l.prob != null && l.prob >= U.umbralCorners) {
        picks.push({ key: l.key, label: l.label, prob: l.prob, mercado: l.mercado });
        break;
      }
    }
  }

  return picks;
}

export function textoUmbrales(ligaKey) {
  const U = getUmbrales(ligaKey);
  return `Umbrales ${ligaKey}: 1X2 ≥${U.umbral1x2}% · DC ≥${U.umbralDC}% · Goles ≥${U.umbralGoles}% · BTTS ≥${U.umbralBtss}% · Córners ≥${U.umbralCorners}%`;
}
