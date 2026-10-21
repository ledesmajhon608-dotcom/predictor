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
  
  // Compara si los arrays de picks son exactamente iguales (mismo orden no importa, pero mismos elementos)
  const arraysIguales = (a, b) => {
    if (a.length !== b.length) return false;
    const sa = [...a].sort().join(',');
    const sb = [...b].sort().join(',');
    return sa === sb;
  };

  // Busca una entrada pendiente que sea del mismo partido Y tenga los mismos picks
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

// ... (las demás funciones de registro.js quedan exactamente igual)
// Solo cambio la parte de arriba (agregarEntrada). 
// Para no reescribir todo el archivo con las 800 líneas, asegurate de 
// reemplazar SOLO la función agregarEntrada en tu archivo actual.
