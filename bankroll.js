// ============================================================================
// bankroll.js — Gestión de banca (prioridad #1)
// Kelly fraccionado + límite de drawdown + persistencia.
// Lógica pura (sin DOM): testeable en Node y usable en app.js / registro.js.
// ============================================================================

const KEY = 'suertudo_bankroll_v1';

// ---------- persistencia ----------
function store() { return (typeof localStorage !== 'undefined') ? localStorage : null; }

export function estadoInicial(banca = 100) {
  return {
    bancaInicial: banca,
    banca: banca,
    pico: banca,               // máximo histórico de la banca
    drawdownActualPct: 0,
    nivelRiesgo: 1.0,          // multiplicador global (baja automáticamente en drawdown)
    apuestas: 0,
  };
}

export function leerBanca() {
  try {
    const raw = store()?.getItem(KEY);
    if (!raw) return estadoInicial();
    const e = JSON.parse(raw);
    return (e && Number.isFinite(e.banca)) ? e : estadoInicial();
  } catch { return estadoInicial(); }
}

export function guardarBanca(e) { store()?.setItem(KEY, JSON.stringify(e)); }

// ---------- Kelly ----------
// f* = (p*cuota - 1) / (cuota - 1), en fracción de banca.
// Se usa el MENOR entre Kelly/fraccion y el tope absoluto, y nunca negativo.
export function kellyFraccion(prob, cuota, fraccion = 0.25, topePct = 2.0) {
  if (!Number.isFinite(prob) || !Number.isFinite(cuota) || cuota <= 1) return 0;
  const p = prob / 100;
  const b = cuota - 1;
  const f = (p * cuota - 1) / b;           // edge / (cuota - 1)
  if (f <= 0) return 0;
  return Math.min(f * fraccion, topePct / 100);
}

// ---------- Drawdown ----------
// Niveles de reducción de riesgo según caída desde el pico.
// Con ROI pequeño, una racha mala no debe poder fundir la banca.
export function factorDrawdown(drawdownPct) {
  if (drawdownPct >= 25) return 0;     // STOP: no apostar hasta revisión manual
  if (drawdownPct >= 20) return 0.25;
  if (drawdownPct >= 15) return 0.5;
  if (drawdownPct >= 10) return 0.75;
  return 1.0;
}

// Decide el stake (en unidades de la banca actual, 0 = no apostar).
// stakeBase viene de LIGAS[x].betting.stake (unidades "planas" de referencia).
export function calcularStake({ prob, cuota, banca, stakeBase = 1, fraccionKelly = 0.25, topePct = 2.0, pico, drawdownPct }) {
  const dd = Number.isFinite(drawdownPct) ? drawdownPct
    : (Number.isFinite(pico) && pico > 0 ? (1 - banca / pico) * 100 : 0);
  const fDD = factorDrawdown(dd);
  if (fDD === 0) return { stake: 0, motivo: `STOP: drawdown ${dd.toFixed(1)}% ≥ 25%` };
  const k = kellyFraccion(prob, cuota, fraccionKelly, topePct) * 100; // % de banca
  if (k <= 0) return { stake: 0, motivo: 'Sin edge (Kelly ≤ 0)' };
  // El stake final es el MENOR entre Kelly fraccional y el plano configurado,
  // escalado por el factor de drawdown. Nunca arriesga más del plano.
  const stake = Math.min(k, stakeBase) * fDD;
  return { stake: +stake.toFixed(2), motivo: null, kellyPct: +k.toFixed(2), factorDD: fDD };
}

// Registra el resultado de una apuesta y actualiza pico / drawdown.
export function registrarResultado(estado, stakeUnidades, gananciaUnidades) {
  const e = { ...estado };
  e.banca += gananciaUnidades;                       // stake ya descontado al apostar
  e.banca = +e.banca.toFixed(2);
  e.apuestas += 1;
  if (e.banca > e.pico) e.pico = e.banca;
  e.drawdownActualPct = e.pico > 0 ? +((1 - e.banca / e.pico) * 100).toFixed(2) : 0;
  guardarBanca(e);
  return e;
}

// Devuelve el stake sugerido para un pick concreto.
export function stakeParaPick(estado, pick) {
  const s = calcularStake({
    prob: pick.prob,
    cuota: pick.casaOdds ?? pick.cuota,   // acepta ambas formas de pasar la cuota
    banca: estado.banca, stakeBase: pick.stakeBase ?? 1,
    pico: estado.pico, drawdownPct: estado.drawdownActualPct,
  });
  return s;
}
