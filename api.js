// ============================================================
// api.js – llamadas a la API externa de Bzzoiro
// v3: buscarEquipoEn usa TEAM_ALIASES antes del match difuso.
// ============================================================
import { BZZOIRO_COUNTRY, TEAM_ALIASES } from './leagues.js';

const BASE_URL = 'https://sports.bzzoiro.com/api/v2';
const DEFAULT_TIMEOUT_MS = 12000;
const DEFAULT_RETRIES = 2;

function getToken() {
  if (typeof process !== 'undefined' && process.env?.BZZOIRO_TOKEN) return process.env.BZZOIRO_TOKEN;
  if (typeof window !== 'undefined' && window.localStorage) return localStorage.getItem('bzzoiro_token');
  return null;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

async function fetchFromAPI(endpoint, {
  timeoutMs = DEFAULT_TIMEOUT_MS,
  retries = DEFAULT_RETRIES,
} = {}) {
  const token = getToken();
  if (!token) throw new Error('Token no configurado. Ingresa tu API key de Bzzoiro.');

  let ultimoError = null;
  for (let intento = 0; intento <= retries; intento++) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        headers: { 'Authorization': `Token ${token}` },
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (res.ok) return await res.json();

      const errorText = await res.text();
      const err = new Error(`Error ${res.status}: ${errorText}`);
      err.status = res.status;
      if (res.status >= 400 && res.status < 500 && res.status !== 429) throw err;
      ultimoError = err;
    } catch (e) {
      clearTimeout(timer);
      if (e.status && e.status >= 400 && e.status < 500 && e.status !== 429) throw e;
      ultimoError = e.name === 'AbortError'
        ? new Error(`Timeout tras ${timeoutMs}ms en ${endpoint}`)
        : e;
    }
    if (intento < retries) await sleep(400 * (2 ** intento));
  }
  throw ultimoError || new Error(`Fallo desconocido en ${endpoint}`);
}

function cleanName(name) {
  return name
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{N}\s]/gu, '')
    .trim().toLowerCase();
}
function tokens(name) { return cleanName(name).split(/\s+/).filter(Boolean); }
function todasLasPalabrasEstan(chicas, grandes) {
  const set = new Set(grandes);
  return chicas.length > 0 && chicas.every(t => set.has(t));
}

// [MODIFICADO] Ahora prueba aliases primero.
export function buscarEquipoEn(mapa, nombre) {
  if (!mapa || !nombre) return null;
  if (mapa[nombre]) return mapa[nombre];

  // 1) alias exacto
  const alias = TEAM_ALIASES[nombre];
  if (alias && mapa[alias]) return mapa[alias];

  const limpio = cleanName(nombre);
  const nombres = Object.keys(mapa);

  // 2) match exacto por nombre limpio
  const igual = nombres.find(n => cleanName(n) === limpio);
  if (igual) return mapa[igual];

  // 3) alias con nombre limpio
  for (const [k, v] of Object.entries(TEAM_ALIASES)) {
    if (cleanName(k) === limpio && mapa[v]) return mapa[v];
  }

  // 4) match por tokens
  const tk = tokens(nombre);
  const candidatos = nombres.filter(n => {
    const t = tokens(n);
    return todasLasPalabrasEstan(tk, t) || todasLasPalabrasEstan(t, tk);
  });
  if (candidatos.length === 1) return mapa[candidatos[0]];
  if (candidatos.length > 1) {
    candidatos.sort((a, b) => Math.abs(tokens(a).length - tk.length) - Math.abs(tokens(b).length - tk.length));
    const mejor = Math.abs(tokens(candidatos[0]).length - tk.length);
    const segundo = Math.abs(tokens(candidatos[1]).length - tk.length);
    if (mejor < segundo) return mapa[candidatos[0]];
  }
  return null;
}

const leagueIdCache = new Map();
const seasonIdCache = new Map();

export async function resolveLeagueId(leagueKey, leagueDisplayName) {
  if (leagueIdCache.has(leagueKey)) return leagueIdCache.get(leagueKey);
  const country = BZZOIRO_COUNTRY[leagueKey];
  if (!country) { leagueIdCache.set(leagueKey, null); return null; }

  const data = await fetchFromAPI(`/leagues/?country=${encodeURIComponent(country)}&limit=300`);
  const results = data.results || data || [];
  const target = cleanName(leagueDisplayName);
  const targetTokens = tokens(leagueDisplayName);
  const exacto = results.find(l => cleanName(l.name) === target);

  const PALABRA_CATEGORIA_INFERIOR = /^(\d+|ii|iii|iv|b|u1[6-9]|u2[0-3]|sub\d*|reserva|reservas|reserve|youth|juvenil|femenino|women|ladies)$/i;
  function tienePalabraDeCategoriaInferior(lTokens, tTokens) {
    const targetSet = new Set(tTokens);
    return lTokens.some(t => !targetSet.has(t) && PALABRA_CATEGORIA_INFERIOR.test(t));
  }

  let match = exacto;
  if (!match) {
    const candidatas = [];
    for (const l of results) {
      const lTokens = tokens(l.name);
      const esSubstring = cleanName(l.name).includes(target) || target.includes(cleanName(l.name));
      const esSubconjunto = todasLasPalabrasEstan(targetTokens, lTokens) || todasLasPalabrasEstan(lTokens, targetTokens);
      if (esSubstring || esSubconjunto) {
        const extra = Math.abs(lTokens.length - targetTokens.length);
        const categoriaInferior = tienePalabraDeCategoriaInferior(lTokens, targetTokens);
        candidatas.push({ liga: l, extra, categoriaInferior });
      }
    }
    if (candidatas.length) {
      candidatas.sort((a, b) => a.extra - b.extra || (a.categoriaInferior === b.categoriaInferior ? 0 : a.categoriaInferior ? 1 : -1));
      match = candidatas[0].liga;
    }
  }

  if (!match) {
    const candidatas = results.slice(0, 8).map(l => l.name).join(', ') || '(ninguna)';
    throw new Error(
      `"${leagueDisplayName}" no coincide con ningún nombre de liga que Bzzoiro tiene para ${country}. ` +
      `Ligas que sí devolvió: ${candidatas}`
    );
  }
  leagueIdCache.set(leagueKey, match.id);
  return match.id;
}

async function resolveCurrentSeason(bzzoiroLeagueId) {
  if (seasonIdCache.has(bzzoiroLeagueId)) return seasonIdCache.get(bzzoiroLeagueId);
  try {
    const season = await fetchFromAPI(`/leagues/${bzzoiroLeagueId}/season/`);
    seasonIdCache.set(bzzoiroLeagueId, season.id);
    return season.id;
  } catch (e) {
    if (e.status === 404) { seasonIdCache.set(bzzoiroLeagueId, null); return null; }
    console.warn('⚠️ Error resolviendo temporada actual:', e.message);
    return null;
  }
}

function extractRows(standingsResponse) {
  const table = standingsResponse.standings?.[0];
  if (!table) return [];
  if (Array.isArray(table.rows)) return table.rows;
  if (Array.isArray(table.groups)) return table.groups.flatMap(g => g.rows || []);
  return [];
}

export async function fetchLeagueDynamicData(leagueKey, leagueDisplayName) {
  const bzzoiroLeagueId = await resolveLeagueId(leagueKey, leagueDisplayName);
  if (!bzzoiroLeagueId) throw new Error('Liga no resoluble en Bzzoiro');

  const seasonId = await resolveCurrentSeason(bzzoiroLeagueId);
  const query = seasonId ? `?season_id=${seasonId}` : '';

  console.log(`🔍 Obteniendo standings de liga Bzzoiro #${bzzoiroLeagueId}`);
  const data = await fetchFromAPI(`/leagues/${bzzoiroLeagueId}/standings/${query}`);
  const rows = extractRows(data);
  if (rows.length === 0) throw new Error('No se pudieron obtener standings');

  let totalGF = 0;
  let totalPlayed = 0;
  const teamStats = {};

  for (const row of rows) {
    const name = row.team?.name ?? row.team_name;
    const played = row.played || 0;
    const gf = row.goals_for || 0;
    const ga = row.goals_against || 0;
    teamStats[name] = { played, gf, ga };
    totalGF += gf;
    totalPlayed += played;
  }

  const goalsAvg = totalPlayed > 0 ? (totalGF / totalPlayed) * 2 : null;
  if (!goalsAvg) throw new Error('Datos insuficientes (0 partidos jugados)');

  const teamRatings = {};
  for (const [name, s] of Object.entries(teamStats)) {
    if (s.played < 2) continue;
    const gfPerMatch = s.gf / s.played;
    const gaPerMatch = s.ga / s.played;
    teamRatings[name] = {
      atk: +(gfPerMatch / (goalsAvg / 2)).toFixed(3),
      def: +(gaPerMatch / (goalsAvg / 2)).toFixed(3),
      played: s.played
    };
  }
  console.log(`✅ Standings OK. Equipos con datos en vivo: ${Object.keys(teamRatings).length}/${rows.length}`);
  return { goalsAvg, totalPlayed, cornAvg: null, teamRatings, bzzoiroLeagueId };
}

export async function fetchMatchPrediction(bzzoiroLeagueId, homeTeam, awayTeam) {
  if (!bzzoiroLeagueId) return null;
  const today = new Date();
  const in21 = new Date(today.getTime() + 21 * 24 * 60 * 60 * 1000);
  const fmt = d => d.toISOString().slice(0, 10);
  try {
    const data = await fetchFromAPI(
      `/predictions/?league_id=${bzzoiroLeagueId}&date_from=${fmt(today)}&date_to=${fmt(in21)}&limit=100`
    );
    const results = data.results || data || [];
    const hTokens = tokens(homeTeam);
    const aTokens = tokens(awayTeam);
    const found = results.find(p => {
      const ehTokens = tokens(p.event?.home_team || '');
      const eaTokens = tokens(p.event?.away_team || '');
      const matchHome = todasLasPalabrasEstan(hTokens, ehTokens) || todasLasPalabrasEstan(ehTokens, hTokens);
      const matchAway = todasLasPalabrasEstan(aTokens, eaTokens) || todasLasPalabrasEstan(eaTokens, aTokens);
      if (!(matchHome && matchAway)) return false;
      const fechaStr = p.event?.event_date || p.event?.date || p.event_date || p.date;
      if (fechaStr) {
        const fechaEv = new Date(fechaStr).getTime();
        if (Number.isFinite(fechaEv)) {
          const diffDias = (fechaEv - today.getTime()) / (1000 * 60 * 60 * 24);
          if (diffDias < -2 || diffDias > 23) return false;
        }
      }
      return true;
    });
    if (!found) return null;
    console.log(`🤖 Predicción ML de Bzzoiro encontrada para ${homeTeam} vs ${awayTeam}`);
    return found;
  } catch (e) {
    console.warn('⚠️ No se pudo obtener predicción ML de Bzzoiro:', e.message);
    return null;
  }
}

// ---- Cuotas (sin cambios, se mantienen por compatibilidad) ----
export async function findUpcomingEvent(bzzoiroLeagueId, homeTeam, awayTeam) {
  if (!bzzoiroLeagueId) return null;
  const hoy = new Date();
  const en14 = new Date(hoy.getTime() + 14 * 24 * 60 * 60 * 1000);
  const fmt = d => d.toISOString().slice(0, 10);
  const data = await fetchFromAPI(`/events/?league_id=${bzzoiroLeagueId}&date_from=${fmt(hoy)}&date_to=${fmt(en14)}&limit=100`);
  const results = data.results || data || [];
  const hTk = tokens(homeTeam), aTk = tokens(awayTeam);
  return results.find(ev => {
    const eh = tokens(ev.home_team || ev.event?.home_team || '');
    const ea = tokens(ev.away_team || ev.event?.away_team || '');
    const okH = todasLasPalabrasEstan(hTk, eh) || todasLasPalabrasEstan(eh, hTk);
    const okA = todasLasPalabrasEstan(aTk, ea) || todasLasPalabrasEstan(ea, aTk);
    return okH && okA;
  }) || null;
}

export async function fetchEventOdds(eventId) {
  return await fetchFromAPI(`/events/${eventId}/odds/`);
}

export function normalizarOddsBzzoiro(raw) {
  const out = {};
  const flat = (raw && typeof raw === 'object' && raw.odds && typeof raw.odds === 'object') ? raw.odds : raw;
  const MAPA = {
    local: ['home_win', 'home'], empate: ['draw', 'x'], visitante: ['away_win', 'away'],
    over15: ['over_15_goals'], under15: ['under_15_goals'],
    over25: ['over_25_goals'], under25: ['under_25_goals'],
    over35: ['over_35_goals'], under35: ['under_35_goals'],
    over45: ['over_45_goals'], under45: ['under_45_goals'],
    bttsSi: ['btts_yes', 'both_teams_to_score_yes'],
    bttsNo: ['btts_no', 'both_teams_to_score_no'],
    c_over75: ['over_75_corners', 'corners_over_75', 'over_7_5_corners', 'corner_over_75', 'total_corners_over_75', 'over_corners_75'],
    c_over85: ['over_85_corners', 'corners_over_85', 'over_8_5_corners', 'total_corners_over_85'],
    c_over95: ['over_95_corners', 'corners_over_95', 'over_9_5_corners', 'total_corners_over_95'],
    c_under95: ['under_95_corners', 'corners_under_95', 'under_9_5_corners', 'total_corners_under_95', 'under_corners_95'],
    c_under105: ['under_105_corners', 'corners_under_105', 'total_corners_under_105'],
  };
  for (const [target, keys] of Object.entries(MAPA)) {
    for (const k of keys) {
      const v = parseFloat(flat?.[k]);
      if (Number.isFinite(v) && v > 1 && v < 1000) { out[target] = +v.toFixed(2); break; }
    }
  }
  return out;
}
