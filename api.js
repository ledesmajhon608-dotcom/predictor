// api.js
// Cliente para Bzzoiro Sports API v2
// Documentación: https://dashboard.bzzoiro.com

const API_BASE = 'https://api.bzzoiro.com';
const API_TIMEOUT = 15000;
const TOKEN_KEY = 'bzzoiro_token';

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function token() {
  const t = localStorage.getItem(TOKEN_KEY);
  if (!t) throw new Error('API key no configurada. Ingresala arriba y guardala.');
  return t;
}

function esErrorTransitorio(err) {
  if (err.name === 'AbortError') return true;
  const m = String(err.message || '');
  return /fetch|Failed|NetworkError|Load failed|timed? ?out/i.test(m);
}

async function fetchFromAPI(endpoint, { params = {}, intentos = 3 } = {}) {
  let lastErr;
  for (let i = 1; i <= intentos; i++) {
    const url = new URL(API_BASE + endpoint);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), API_TIMEOUT);
    try {
      const res = await fetch(url, {
        signal: ctrl.signal,
        headers: { 'Authorization': 'Bearer ' + token(), 'Accept': 'application/json' },
      });
      clearTimeout(t);
      if (res.status === 401 || res.status === 403) {
        const txt = await res.text().catch(() => '');
        throw new Error(`API ${res.status}: ${res.statusText} — ${txt.slice(0, 200)}`);
      }
      if (res.status === 429) {
        await delay(1200 * i);
        lastErr = new Error('API 429: rate limit');
        continue;
      }
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        throw new Error(`API ${res.status}: ${res.statusText} — ${txt.slice(0, 200)}`);
      }
      return await res.json();
    } catch (err) {
      clearTimeout(t);
      if (i < intentos && esErrorTransitorio(err)) { await delay(600 * i); lastErr = err; continue; }
      throw err;
    }
  }
  throw lastErr || new Error('API: fallaron todos los reintentos');
}

// ---------- utilidades ----------
const norm = (s) => String(s ?? '')
  .toLowerCase()
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/^(fc|cf|ac|cd|sc|ud|rc)\s+/i, '')
  .replace(/[^a-z0-9\s]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const tokens = (s) => norm(s).split(' ').filter(Boolean);

function todasLasPalabrasEstan(tokensBuscados, tokensObjetivo) {
  const t = new Set(tokensObjetivo);
  return tokensBuscados.every(x => t.has(x));
}

// ---------- descubrimiento de liga ----------
const leagueIdCache = new Map();

export async function resolveLeagueId(leagueKey, leagueDisplayName) {
  if (leagueIdCache.has(leagueKey)) return leagueIdCache.get(leagueKey);
  const displayTokens = tokens(leagueDisplayName);
  const shortTokens = displayTokens.filter(w => w.length >= 3);
  for (const tk of shortTokens) {
    try {
      const data = await fetchFromAPI('/leagues/', { params: { search: tk, limit: 100 } });
      const results = data.results || data || [];
      const found = results.find(l => {
        const nombre = [l.name, l.short_name, l.country?.name].filter(Boolean).join(' ');
        const lt = tokens(nombre);
        return displayTokens.every(w => lt.includes(w));
      });
      if (found) { leagueIdCache.set(leagueKey, found.id); return found.id; }
    } catch (e) { /* probamos con la siguiente palabra */ }
  }
  leagueIdCache.set(leagueKey, null);
  return null;
}

// ---------- proximos partidos (calendario) ----------
export async function fetchUpcomingMatches(bzzoiroLeagueId, daysAhead = 14) {
  const hoy = new Date();
  const desde = hoy.toISOString().slice(0, 10);
  const hasta = new Date(hoy.getTime() + daysAhead * 86400000).toISOString().slice(0, 10);
  const data = await fetchFromAPI('/events/', { params: { league_id: bzzoiroLeagueId, date_from: desde, date_to: hasta, limit: 100 } });
  return data.results || data || [];
}

// ---------- temporada actual ----------
export async function fetchCurrentSeason(bzzoiroLeagueId) {
  const data = await fetchFromAPI('/seasons/', { params: { league_id: bzzoiroLeagueId } });
  const results = data.results || data || [];
  const now = new Date();
  const actual = results.find(s => {
    if (!s.start_date || !s.end_date) return false;
    return new Date(s.start_date) <= now && now <= new Date(s.end_date);
  });
  if (actual) return actual;
  results.sort((a, b) => new Date(b.start_date || 0) - new Date(a.start_date || 0));
  return results[0] || null;
}

// ---------- tabla de posiciones ----------
export async function fetchStandings(bzzoiroLeagueId, seasonId) {
  const data = await fetchFromAPI('/standings/', { params: { league_id: bzzoiroLeagueId, season_id: seasonId } });
  return data.results || data || [];
}

// ---------- equipo por nombre (para escudo) ----------
export async function fetchTeamByName(nombre) {
  const tk = tokens(nombre).filter(w => w.length >= 3);
  for (const t of tk) {
    try {
      const data = await fetchFromAPI('/teams/', { params: { search: t, limit: 20 } });
      const results = data.results || data || [];
      const nt = tokens(nombre);
      const found = results.find(eq => {
        const et = tokens([eq.name, eq.short_name].filter(Boolean).join(' '));
        return todasLasPalabrasEstan(nt, et) || todasLasPalabrasEstan(et, nt);
      });
      if (found) return found;
    } catch (e) { /* siguiente */ }
  }
  return null;
}

// ---------- eventos recientes ----------
export async function fetchRecentEvents(bzzoiroLeagueId, daysBack = 21) {
  const hasta = new Date().toISOString().slice(0, 10);
  const desde = new Date(Date.now() - daysBack * 86400000).toISOString().slice(0, 10);
  const data = await fetchFromAPI('/events/', { params: { league_id: bzzoiroLeagueId, date_from: desde, date_to: hasta, limit: 100 } });
  return data.results || data || [];
}

// ---------- probabilidades ML del partido ----------
export async function fetchMatchPrediction(eventId) {
  const data = await fetchFromAPI(`/predictions/${eventId}/`);
  return data?.predictions?.winner || data?.prediction || data || null;
}

// ============================================================
// CUOTAS REALES (Odds API — add-on de Bzzoiro)
// Busca el evento próximo del partido y trae sus cuotas.
// ============================================================

// Encuentra el evento próximo (próximos 14 días) que coincide con local/visitante.
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

// Cuotas de un evento. Lanza error si el token no tiene el add-on Odds (403).
export async function fetchEventOdds(eventId) {
  return await fetchFromAPI(`/events/${eventId}/odds/`);
}

// Convierte la respuesta cruda de /odds/ al formato de cuotas de la app.
// Parser DEFENSIVO: recorre todo el JSON buscando pares (nombre, cuota) y los
// mapea por palabras clave. Si Bzzoiro cambia el formato, seguirá encontrando
// las cuotas mientras vengan como {algo: nombre, algo: numero > 1}.
export function normalizarOddsBzzoiro(raw) {
  const pares = [];
  (function walk(node) {
    if (node == null) return;
    if (Array.isArray(node)) { node.forEach(walk); return; }
    if (typeof node === 'object') {
      const nombre = node.name ?? node.label ?? node.outcome ?? node.selection
        ?? node.team?.name ?? (typeof node.value === 'string' ? node.value : null);
      const odd = node.odd ?? node.price ?? node.odds ?? (typeof node.value === 'number' ? node.value : null)
        ?? node.coefficient ?? node.rate;
      const cuota = parseFloat(odd);
      if (typeof nombre === 'string' && Number.isFinite(cuota) && cuota > 1 && cuota < 1000) {
        pares.push({
          label: nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''),
          mercado: String(node.market?.name ?? node.market ?? node.group ?? node.category ?? '').toLowerCase(),
          odd: +cuota.toFixed(2),
        });
      }
      Object.values(node).forEach(walk);
    }
  })(raw);

  const out = {};
  const pick = (reMerc, reLabel) => {
    let mejor = null;
    for (const p of pares) {
      if (reMerc && !reMerc.test(p.mercado)) continue;
      if (!reLabel.test(p.label)) continue;
      if (!mejor || p.odd > mejor.odd) mejor = p;
    }
    return mejor ? mejor.odd : null;
  };
  const asignar = (target, reMerc, reLabel) => {
    const o = pick(reMerc, reLabel);
    if (o && !out[target]) out[target] = o;
  };

  // 1X2
  asignar('local', /1x2|match|result|moneyline|winner|game|^$/, /^(1|home|local)$/);
  asignar('empate', /1x2|match|result|draw|^$/, /^(x|draw|empate)$/);
  asignar('visitante', /1x2|match|result|moneyline|winner|game|^$/, /^(2|away|visitante|visitor)$/);
  // Goles Over/Under
  asignar('over15', /goal|goles|total|^$/, /^over 1\.5$/);
  asignar('under15', /goal|goles|total|^$/, /^under 1\.5$/);
  asignar('over25', /goal|goles|total|^$/, /^over 2\.5$/);
  asignar('under25', /goal|goles|total|^$/, /^under 2\.5$/);
  asignar('over35', /goal|goles|total|^$/, /^over 3\.5$/);
  asignar('under35', /goal|goles|total|^$/, /^under 3\.5$/);
  asignar('over45', /goal|goles|total|^$/, /^over 4\.5$/);
  asignar('under45', /goal|goles|total|^$/, /^under 4\.5$/);
  // BTTS
  asignar('bttsSi', /btts|both|ambos|team.*score|^$/, /^(yes|si|sí)$/);
  asignar('bttsNo', /btts|both|ambos|team.*score|^$/, /^(no)$/);
  // Córners
  asignar('c_over75', /corner|córner/, /^over 7\.5$/);
  asignar('c_over85', /corner|córner/, /^over 8\.5$/);
  asignar('c_over95', /corner|córner/, /^over 9\.5$/);
  asignar('c_under95', /corner|córner/, /^under 9\.5$/);
  asignar('c_under105', /corner|córner/, /^under 10\.5$/);

  return out;
}
