// picks.js
// MEJORA: se quitaron los córners por equipo (local Over 3.5 y visitante
// Over 3.5). Quedan solo los córners totales (Over 7.5 / 8.5 / 9.5).

import { LIGAS, getUmbrales, SHRINK_ALPHA, FILTRO_EV } from './leagues.js';
import { shrinkHaciaBase } from './calibrate.js';

export function getBettingConfig(ligaKey) {
  const liga = LIGAS[ligaKey];
  return liga?.betting || { status: 'unknown' };
}

export function esMercadoValido(ligaKey, mercado) {
  const config = getBettingConfig(ligaKey);
  if (config.status !== 'green' && config.status !== 'yellow') return false;
  if (!config.mercados) return false;
  return config.mercados.some(m => mercado.includes(m));
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

// EV = prob × cuota. Con valor si EV >= FILTRO_EV (el mismo filtro del backtest).
export function calcEV(probPct, cuota) {
  if (!Number.isFinite(probPct) || !Number.isFinite(cuota) || cuota <= 1) return null;
  return (probPct / 100) * cuota;
}
export function cuotaMinima(probPct) {
  if (!Number.isFinite(probPct) || probPct <= 0) return null;
  return FILTRO_EV / (probPct / 100);
}

export function generarPicks(data, ligaKey) {
  const picks = [];
  const config = getBettingConfig(ligaKey);
  if (config.status === 'red') return [];
  // Equipo sin rating = el modelo asumió "equipo promedio": no se recomienda nada.
  if (data.sinRating && data.sinRating.length > 0) return [];
  const U = getUmbrales(ligaKey);

  const rp = data.resultProbs;
  const max1x2 = Math.max(rp.local, rp.empate, rp.visitante);

  if (max1x2 >= U.umbral1x2 && esMercadoValido(ligaKey, '1X2')) {
    if (rp.local === max1x2) picks.push({ label: 'Local gana', prob: rp.local });
    else if (rp.empate === max1x2) picks.push({ label: 'Empate', prob: rp.empate });
    else picks.push({ label: 'Visitante gana', prob: rp.visitante });
  }

  const lineasGoles = [
    { label: 'Over 3.5 goles', prob: data.over35, mercado: 'Over 3.5' },
    { label: 'Over 2.5 goles', prob: data.over25, mercado: 'Over 2.5' },
    { label: 'Over 1.5 goles', prob: data.over15, mercado: 'Over 1.5' },
  ];
  for (const l of lineasGoles) {
    if (l.prob != null && l.prob >= U.umbralGoles && esMercadoValido(ligaKey, l.mercado)) {
      picks.push({ label: l.label, prob: l.prob });
      break;
    }
  }

  if (data.btts != null && data.btts >= U.umbralBtss && esMercadoValido(ligaKey, 'BTTS')) {
    picks.push({ label: 'Ambos marcan (Sí)', prob: data.btts });
  }

  // Córners TOTALES solamente, y solo en ligas donde los córners están habilitados.
  if (data.cornerProbs && LIGAS[ligaKey]?.markets?.corn !== false) {
    const lineasCorners = [
      { label: 'Over 9.5 córners', prob: data.cornerProbs.over9 },
      { label: 'Over 8.5 córners', prob: data.cornerProbs.over8 },
      { label: 'Over 7.5 córners', prob: data.cornerProbs.over7 },
    ];
    for (const l of lineasCorners) {
      if (l.prob != null && l.prob >= U.umbralCorners) {
        picks.push({ label: l.label, prob: l.prob });
        break;
      }
    }
  }

  return picks;
}

export function textoUmbrales(ligaKey) {
  const U = getUmbrales(ligaKey);
  return `Umbrales ${ligaKey}: 1X2 ≥${U.umbral1x2}% · Goles ≥${U.umbralGoles}% · BTTS ≥${U.umbralBtss}% · Córners ≥${U.umbralCorners}%`;
}
