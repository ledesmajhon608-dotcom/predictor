// ============================================================================
// CATÁLOGO DE LIGAS Y EQUIPOS
// ============================================================================
// - Ajustar la fórmula de goles/corners/BTTS  -> ve a stats.js (NO aquí).
// - Agregar/actualizar equipos                -> TEAM_STRENGTH_DB abajo.
// - Ajustar el promedio de la liga            -> LIGAS.<codigo>.goalsAvg / cornAvg.
// ============================================================================

export const LIGAS = {
  "PL": { "name": "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League", "goalsAvg": 2.85, "cornAvg": 10.5, "cornR": 20, "markets": {"goles":true,"btts":true,"corn":true} },
  "BL1": { "name": "🇩🇪 Bundesliga", "goalsAvg": 3, "cornAvg": 10, "cornR": 18, "markets": {"goles":true,"btts":true,"corn":true} },
  "SA": { "name": "🇮🇹 Serie A", "goalsAvg": 2.65, "cornAvg": 8.83, "cornR": 19, "markets": {"goles":false,"btts":false,"corn":true} },
  "PD": { "name": "🇪🇸 La Liga", "goalsAvg": 2.55, "cornAvg": 9.5, "cornR": 17, "markets": {"goles":false,"btts":true,"corn":true} },
  "DED": { "name": "🇳🇱 Eredivisie (Países bajos)", "goalsAvg": 3.1, "cornAvg": 10.1, "cornR": 18, "markets": {"goles":true,"btts":true,"corn":true} },
  "BSA": { "name": "🇧🇷 Brasileirão A", "goalsAvg": 2.45, "cornAvg": 10.3, "cornR": 19, "markets": {"goles":false,"btts":false,"corn":true} },
  "MXL": { "name": "🇲🇽 Liga MX", "goalsAvg": 2.7, "cornAvg": 9.6, "cornR": 17, "markets": {"goles":true,"btts":true,"corn":true} },
  "PPT": { "name": "🇵🇹 Liga Portugal", "goalsAvg": 2.6, "cornAvg": 9.4, "cornR": 17, "markets": {"goles":false,"btts":true,"corn":false} },
  "SPL": { "name": "🇸🇦 Saudi Pro League", "goalsAvg": 2.9, "cornAvg": 9.6, "cornR": 17, "markets": {"goles":true,"btts":true,"corn":false} },
};

export const TEAM_STRENGTH_DB = {
  "PL": {
    "Arsenal": { "atk": 1.32, "def": 0.88 },
    "Aston Villa": { "atk": 1.1, "def": 0.96 },
    "Bournemouth": { "atk": 0.96, "def": 1.06 },
    "Brentford": { "atk": 1.06, "def": 0.99 },
    "Brighton & Hove Albion": { "atk": 1.08, "def": 0.98 },
    "Chelsea": { "atk": 1.18, "def": 0.89 },
    "Coventry City": { "atk": 0.8, "def": 1.18 },
    "Crystal Palace": { "atk": 0.96, "def": 1.06 },
    "Everton": { "atk": 0.94, "def": 1.08 },
    "Fulham": { "atk": 1.04, "def": 1.02 },
    "Hull City": { "atk": 0.78, "def": 1.22 },
    "Ipswich Town": { "atk": 0.87, "def": 1.13 },
    "Leeds United": { "atk": 0.9, "def": 1.11 },
    "Liverpool FC": { "atk": 1.28, "def": 0.85 },
    "Manchester City": { "atk": 1.35, "def": 0.82 },
    "Manchester United": { "atk": 1.15, "def": 0.92 },
    "Newcastle United": { "atk": 1.12, "def": 0.95 },
    "Nottingham Forest": { "atk": 0.89, "def": 1.12 },
    "Sunderland": { "atk": 0.92, "def": 1.1 },
    "Tottenham Hotspur": { "atk": 1.22, "def": 0.91 }
  },
  "BL1": {
    "1. FC Köln": { "atk": 0.85, "def": 1.16 },
    "1. FC Union Berlin": { "atk": 0.91, "def": 1.12 },
    "1. FSV Mainz 05": { "atk": 0.94, "def": 1.1 },
    "Bayer 04 Leverkusen": { "atk": 1.15, "def": 0.96 },
    "Borussia Dortmund": { "atk": 1.26, "def": 0.88 },
    "Borussia M'gladbach": { "atk": 0.89, "def": 1.14 },
    "Eintracht Frankfurt": { "atk": 1.02, "def": 1.04 },
    "FC Augsburg": { "atk": 0.96, "def": 1.08 },
    "FC Bayern München": { "atk": 1.38, "def": 0.8 },
    "FC Schalke 04": { "atk": 0.8, "def": 1.22 },
    "Hamburger SV": { "atk": 0.87, "def": 1.15 },
    "RB Leipzig": { "atk": 1.2, "def": 0.92 },
    "SC Freiburg": { "atk": 1.05, "def": 1.02 },
    "SC Paderborn 07": { "atk": 0.9, "def": 1.1 },
    "SV 07 Elversberg": { "atk": 0.82, "def": 1.18 },
    "SV Werder Bremen": { "atk": 0.83, "def": 1.17 },
    "TSG Hoffenheim": { "atk": 1.08, "def": 1 },
    "VfB Stuttgart": { "atk": 1.18, "def": 0.94 }
  },
  "SA": {
    "AC Milan": { "atk": 1.28, "def": 0.88 },
    "AS Roma": { "atk": 1.15, "def": 0.94 },
    "Atalanta": { "atk": 1.1, "def": 0.98 },
    "Bologna": { "atk": 0.97, "def": 1.07 },
    "Cagliari": { "atk": 0.84, "def": 1.15 },
    "Como": { "atk": 0.9, "def": 1.12 },
    "Fiorentina": { "atk": 1.12, "def": 0.96 },
    "Frosinone": { "atk": 0.82, "def": 1.18 },
    "Genoa": { "atk": 0.86, "def": 1.14 },
    "Inter": { "atk": 1.32, "def": 0.86 },
    "Juventus": { "atk": 1.22, "def": 0.9 },
    "Lazio": { "atk": 1.18, "def": 0.92 },
    "Lecce": { "atk": 0.82, "def": 1.16 },
    "Monza": { "atk": 1.02, "def": 1.04 },
    "Parma": { "atk": 0.8, "def": 1.17 },
    "Sassuolo": { "atk": 0.78, "def": 1.18 },
    "SSC Napoli": { "atk": 1.08, "def": 1 },
    "Torino": { "atk": 0.99, "def": 1.06 },
    "Udinese": { "atk": 0.92, "def": 1.11 },
    "Venezia": { "atk": 0.76, "def": 1.2 }
  },
  "PD": {
    "Athletic Club": { "atk": 1.08, "def": 0.99 },
    "Atlético Madrid": { "atk": 1.2, "def": 0.92 },
    "Celta Vigo": { "atk": 0.85, "def": 1.14 },
    "Deportivo Alavés": { "atk": 0.83, "def": 1.15 },
    "Deportivo de A Coruña": { "atk": 1.02, "def": 1.04 },
    "Elche": { "atk": 0.8, "def": 1.18 },
    "Espanyol": { "atk": 0.79, "def": 1.17 },
    "FC Barcelona": { "atk": 1.32, "def": 0.86 },
    "Getafe": { "atk": 0.94, "def": 1.08 },
    "Levante UD": { "atk": 0.86, "def": 1.12 },
    "Málaga CF": { "atk": 0.82, "def": 1.16 },
    "Osasuna": { "atk": 1.02, "def": 1.03 },
    "Rayo Vallecano": { "atk": 0.99, "def": 1.05 },
    "Real Betis": { "atk": 1.05, "def": 1.01 },
    "Real Madrid": { "atk": 1.35, "def": 0.84 },
    "Real Racing Club": { "atk": 0.9, "def": 1.1 },
    "Real Sociedad": { "atk": 1.15, "def": 0.95 },
    "Sevilla": { "atk": 0.92, "def": 1.1 },
    "Valencia": { "atk": 0.9, "def": 1.11 },
    "Villarreal": { "atk": 1.12, "def": 0.97 }
  },
  "DED": {
    "ADO Den Haag": { "atk": 0.78, "def": 1.18 },
    "AFC Ajax": { "atk": 1.28, "def": 0.88 },
    "AZ Alkmaar": { "atk": 1.18, "def": 0.92 },
    "Excelsior": { "atk": 0.85, "def": 1.14 },
    "FC Groningen": { "atk": 0.96, "def": 1.08 },
    "FC Twente": { "atk": 1.1, "def": 0.98 },
    "FC Utrecht": { "atk": 1.12, "def": 0.96 },
    "Feyenoord": { "atk": 1.22, "def": 0.9 },
    "Fortuna Sittard": { "atk": 0.8, "def": 1.19 },
    "Go Ahead Eagles": { "atk": 0.83, "def": 1.17 },
    "NEC Nijmegen": { "atk": 0.92, "def": 1.11 },
    "PEC Zwolle": { "atk": 1.02, "def": 1.04 },
    "PSV Eindhoven": { "atk": 1.3, "def": 0.86 },
    "SC Cambuur": { "atk": 0.76, "def": 1.2 },
    "SC Heerenveen": { "atk": 1.06, "def": 1.01 },
    "SC Telstar": { "atk": 0.72, "def": 1.22 },
    "Sparta Rotterdam": { "atk": 0.75, "def": 1.21 },
    "Willem II Tilburg": { "atk": 0.77, "def": 1.2 }
  },
  "BSA": {
    "Athletico": { "atk": 1.1, "def": 0.96 },
    "Atlético Mineiro": { "atk": 1.12, "def": 0.98 },
    "Bahia": { "atk": 0.93, "def": 1.12 },
    "Botafogo": { "atk": 1.02, "def": 1.06 },
    "Chapecoense": { "atk": 0.78, "def": 1.22 },
    "Corinthians": { "atk": 1.16, "def": 0.96 },
    "Coritiba": { "atk": 0.81, "def": 1.2 },
    "Cruzeiro": { "atk": 0.96, "def": 1.1 },
    "Flamengo": { "atk": 1.24, "def": 0.9 },
    "Fluminense": { "atk": 0.99, "def": 1.08 },
    "Grêmio": { "atk": 1.1, "def": 1 },
    "Internacional": { "atk": 1.08, "def": 1.02 },
    "Mirassol": { "atk": 0.72, "def": 1.25 },
    "Palmeiras": { "atk": 1.22, "def": 0.92 },
    "Red Bull Bragantino": { "atk": 0.84, "def": 1.18 },
    "Remo": { "atk": 0.75, "def": 1.24 },
    "Santos": { "atk": 1.05, "def": 1.04 },
    "São Paulo": { "atk": 1.18, "def": 0.94 },
    "Vasco da Gama": { "atk": 0.87, "def": 1.16 },
    "Vitória": { "atk": 0.69, "def": 1.27 }
  },
  "MXL": {
    "Atlante FC": { "atk": 0.84, "def": 1.14 },
    "Atlas FC": { "atk": 0.98, "def": 1.06 },
    "Atlético San Luis": { "atk": 0.9, "def": 1.11 },
    "CD Guadalajara": { "atk": 1.08, "def": 0.99 },
    "CD Toluca": { "atk": 1.2, "def": 0.93 },
    "CF Monterrey": { "atk": 1.16, "def": 0.95 },
    "CF Pachuca": { "atk": 1.04, "def": 1.02 },
    "Club América": { "atk": 1.24, "def": 0.9 },
    "Club León": { "atk": 1.02, "def": 1.03 },
    "Club Necaxa": { "atk": 0.88, "def": 1.13 },
    "Club Puebla": { "atk": 0.8, "def": 1.18 },
    "Club Tijuana": { "atk": 0.96, "def": 1.08 },
    "Cruz Azul": { "atk": 1.18, "def": 0.92 },
    "FC Juárez": { "atk": 0.82, "def": 1.16 },
    "Pumas UNAM": { "atk": 1, "def": 1.05 },
    "Querétaro FC": { "atk": 0.78, "def": 1.2 },
    "Santos Laguna": { "atk": 0.9, "def": 1.11 },
    "Tigres UANL": { "atk": 1.22, "def": 0.91 }
  },
  "PPT": {
    "Académico Viseu FC": { "atk": 0.86, "def": 1.12 },
    "Benfica": { "atk": 1.28, "def": 0.88 },
    "Casa Pia": { "atk": 0.82, "def": 1.14 },
    "CD Nacional": { "atk": 0.9, "def": 1.08 },
    "CF Estrela Amadora": { "atk": 0.84, "def": 1.13 },
    "CS Marítimo": { "atk": 0.94, "def": 1.06 },
    "Estoril Praia": { "atk": 1, "def": 1.03 },
    "Famalicão": { "atk": 0.96, "def": 1.04 },
    "FC Alverca": { "atk": 0.78, "def": 1.2 },
    "FC Arouca": { "atk": 0.92, "def": 1.06 },
    "FC Porto": { "atk": 1.26, "def": 0.9 },
    "Gil Vicente": { "atk": 0.9, "def": 1.08 },
    "Moreirense": { "atk": 0.88, "def": 1.09 },
    "Rio Ave": { "atk": 0.86, "def": 1.11 },
    "Santa Clara": { "atk": 0.98, "def": 1.02 },
    "Sporting Braga": { "atk": 1.14, "def": 0.96 },
    "Sporting CP": { "atk": 1.3, "def": 0.86 },
    "Vitória SC": { "atk": 1.02, "def": 1 }
  },
  "SPL": {
    "Al-Ahli": { "atk": 1.2, "def": 0.92 },
    "Al-Ettifaq": { "atk": 0.98, "def": 1.04 },
    "Al-Fateh": { "atk": 0.96, "def": 1.06 },
    "Al-Fayha": { "atk": 0.9, "def": 1.1 },
    "Al-Hazem": { "atk": 0.82, "def": 1.16 },
    "Al-Hilal": { "atk": 1.34, "def": 0.84 },
    "Al-Ittihad": { "atk": 1.28, "def": 0.88 },
    "Al-Khaleej": { "atk": 0.9, "def": 1.1 },
    "Al-Kholood": { "atk": 0.84, "def": 1.14 },
    "Al-Nassr": { "atk": 1.3, "def": 0.86 },
    "Al-Qadsiah": { "atk": 1.08, "def": 0.98 },
    "Al-Riyadh": { "atk": 0.86, "def": 1.12 },
    "Al-Shabab": { "atk": 1.1, "def": 0.96 },
    "Al-Taawoun": { "atk": 1.02, "def": 1 },
    "Neom SC": { "atk": 0.86, "def": 1.12 },
    "Al Faisaly": { "atk": 0.457, "def": 1.145 },
    "Abha": { "atk": 0.566, "def": 1.557 },
    "Diriyah": { "atk": 0.721, "def": 0.577 }
  },
};

export const HOME_ADVANTAGE = {
  "PL": 1.08, "BL1": 1.09, "SA": 1.04, "PD": 1.05, "DED": 1.08, "BSA": 1.12, "MXL": 1.06, "PPT": 1.06, "SPL": 1.08
};

export const DIXON_COLES_RHO = {
  "PL": -0.065, "BL1": -0.085, "SA": -0.13, "PD": -0.098, "DED": -0.072, "BSA": -0.09, "MXL": -0.095, "PPT": -0.08, "SPL": -0.075, "default": -0.13
};

export const PLATT_PARAMS = {"goals15":{"A":0.951,"B":-0.038},"goals25":{"A":0.933,"B":-0.055},"btts":{"A":0.956,"B":-0.034},"corners":{"A":0.97,"B":-0.022},"goals_ht05":{"A":0.96,"B":-0.03},"goals_ht15":{"A":0.938,"B":-0.048},"resultado":{"A":0.918,"B":-0.068}};

// Valor por defecto cuando no hay medición real para esa liga.
export const CORNER_HOME_BIAS = 1.12;

// Overrides por liga, calculados a partir de historiales reales (no adivinados).
export const CORNER_HOME_BIAS_LEAGUE = {
  SA: 1.31,
  BSA: 1.66,
};

// Bzzoiro identifica las ligas con un id numérico propio, no con estos códigos
// cortos. Para pedir datos en vivo hay que resolver el id real buscando por
// país (ver resolveLeagueId en api.js).
export const BZZOIRO_COUNTRY = {
  PL: 'England',
  BL1: 'Germany',
  SA: 'Italy',
  PD: 'Spain',
  DED: 'Netherlands',
  BSA: 'Brazil',
  MXL: 'Mexico',
  PPT: 'Portugal',
  SPL: 'Saudi Arabia',
};
