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
    "Arsenal": { "atk": 1.328, "def": 0.419 },
    "Aston Villa": { "atk": 0.705, "def": 1.142 },
    "Bournemouth": { "atk": 1.016, "def": 0.822 },
    "Brentford": { "atk": 0.994, "def": 0.829 },
    "Brighton & Hove Albion": { "atk": 1.291, "def": 0.97 },
    "Chelsea": { "atk": 1.271, "def": 1.422 },
    "Coventry City": { "atk": 0, "def": 1.182 },
    "Crystal Palace": { "atk": 0.869, "def": 1.508 },
    "Everton": { "atk": 1.095, "def": 1.025 },
    "Fulham": { "atk": 0.791, "def": 1.148 },
    "Hull City": { "atk": 0.7, "def": 0 },
    "Ipswich Town": { "atk": 0.945, "def": 1.954 },
    "Leeds United": { "atk": 0.826, "def": 0.693 },
    "Liverpool FC": { "atk": 1.359, "def": 1.05 },
    "Manchester City": { "atk": 1.503, "def": 0.607 },
    "Manchester United": { "atk": 1.529, "def": 1.017 },
    "Newcastle United": { "atk": 1.12, "def": 1.079 },
    "Nottingham Forest": { "atk": 0.991, "def": 0.747 },
    "Sunderland": { "atk": 0.857, "def": 0.956 },
    "Tottenham Hotspur": { "atk": 0.486, "def": 1.158 }
  },
  "BL1": {
    "1. FC Köln": { "atk": 0.906, "def": 1.385 },
    "1. FC Union Berlin": { "atk": 0.829, "def": 1.301 },
    "1. FSV Mainz 05": { "atk": 1.078, "def": 0.591 },
    "Bayer 04 Leverkusen": { "atk": 1.302, "def": 0.842 },
    "Borussia Dortmund": { "atk": 1.321, "def": 0.614 },
    "Borussia M'gladbach": { "atk": 0.789, "def": 1.161 },
    "Eintracht Frankfurt": { "atk": 0.973, "def": 1.316 },
    "FC Augsburg": { "atk": 1.19, "def": 0.805 },
    "FC Bayern München": { "atk": 1.861, "def": 0.631 },
    "FC Schalke 04": { "atk": 0.8, "def": 1.22 },
    "Hamburger SV": { "atk": 0.553, "def": 1.244 },
    "RB Leipzig": { "atk": 1.108, "def": 0.915 },
    "SC Freiburg": { "atk": 1.043, "def": 0.804 },
    "SC Paderborn 07": { "atk": 0.093, "def": 0.298 },
    "SV 07 Elversberg": { "atk": 0.82, "def": 1.18 },
    "SV Werder Bremen": { "atk": 0.732, "def": 1.078 },
    "TSG Hoffenheim": { "atk": 1.04, "def": 1.218 },
    "VfB Stuttgart": { "atk": 1.393, "def": 1.095 }
  },
  "SA": {
    "AC Milan": { "atk": 0.986, "def": 0.795 },
    "AS Roma": { "atk": 1.936, "def": 0.607 },
    "Atalanta": { "atk": 1.046, "def": 0.782 },
    "Bologna": { "atk": 0.782, "def": 1.008 },
    "Cagliari": { "atk": 0.709, "def": 0.762 },
    "Como": { "atk": 1.616, "def": 0.652 },
    "Fiorentina": { "atk": 0.589, "def": 1.314 },
    "Frosinone": { "atk": 1.583, "def": 0.788 },
    "Genoa": { "atk": 0.565, "def": 1.258 },
    "Inter": { "atk": 2.001, "def": 0.838 },
    "Juventus": { "atk": 1.124, "def": 0.567 },
    "Lazio": { "atk": 0.969, "def": 0.737 },
    "Lecce": { "atk": 0.631, "def": 1.075 },
    "Monza": { "atk": 1.028, "def": 2.013 },
    "Parma": { "atk": 0.502, "def": 1.015 },
    "Sassuolo": { "atk": 1.105, "def": 1.105 },
    "SSC Napoli": { "atk": 1.249, "def": 0.969 },
    "Torino": { "atk": 1.056, "def": 1.257 },
    "Udinese": { "atk": 1.104, "def": 0.893 },
    "Venezia": { "atk": 0.545, "def": 1.816 }
  },
  "PD": {
    "Athletic Club": { "atk": 0.98, "def": 1.058 },
    "Atlético Madrid": { "atk": 1.102, "def": 1.142 },
    "Celta Vigo": { "atk": 0.658, "def": 0.864 },
    "Deportivo Alavés": { "atk": 1.354, "def": 0.93 },
    "Deportivo de A Coruña": { "atk": 1.422, "def": 0.88 },
    "Elche": { "atk": 0.861, "def": 1.485 },
    "Espanyol": { "atk": 0.838, "def": 1.003 },
    "FC Barcelona": { "atk": 2.094, "def": 0.504 },
    "Getafe": { "atk": 0.526, "def": 0.643 },
    "Levante UD": { "atk": 0.952, "def": 0.975 },
    "Málaga CF": { "atk": 0.169, "def": 1.2 },
    "Osasuna": { "atk": 0.801, "def": 1.076 },
    "Rayo Vallecano": { "atk": 1.107, "def": 1.101 },
    "Real Betis": { "atk": 0.975, "def": 0.888 },
    "Real Madrid": { "atk": 1.465, "def": 0.637 },
    "Real Racing Club": { "atk": 1.225, "def": 1.406 },
    "Real Sociedad": { "atk": 1.04, "def": 1.219 },
    "Sevilla": { "atk": 0.922, "def": 1.009 },
    "Valencia": { "atk": 0.681, "def": 1.2 },
    "Villarreal": { "atk": 1.244, "def": 1.135 }
  },
  "DED": {
    "ADO Den Haag": { "atk": 0.71, "def": 1.583 },
    "AFC Ajax": { "atk": 1.021, "def": 0.578 },
    "AZ Alkmaar": { "atk": 1.38, "def": 0.659 },
    "Excelsior": { "atk": 1.157, "def": 0.685 },
    "FC Groningen": { "atk": 1.01, "def": 1.099 },
    "FC Twente": { "atk": 1.213, "def": 0.731 },
    "FC Utrecht": { "atk": 0.987, "def": 1.281 },
    "Feyenoord": { "atk": 1.204, "def": 0.728 },
    "Fortuna Sittard": { "atk": 1.014, "def": 1.071 },
    "Go Ahead Eagles": { "atk": 1.242, "def": 1.109 },
    "NEC Nijmegen": { "atk": 1.141, "def": 0.898 },
    "PEC Zwolle": { "atk": 0.688, "def": 1.179 },
    "PSV Eindhoven": { "atk": 1.896, "def": 0.743 },
    "SC Cambuur": { "atk": 0.704, "def": 2.016 },
    "SC Heerenveen": { "atk": 0.856, "def": 0.967 },
    "SC Telstar": { "atk": 0.866, "def": 1.108 },
    "Sparta Rotterdam": { "atk": 0.843, "def": 1.113 },
    "Willem II Tilburg": { "atk": 0.641, "def": 1.225 }
  },
  "BSA": {
    "Athletico": { "atk": 1.218, "def": 0.899 },
    "Atlético Mineiro": { "atk": 1.015, "def": 0.797 },
    "Bahia": { "atk": 1.297, "def": 0.992 },
    "Botafogo": { "atk": 0.886, "def": 1.054 },
    "Chapecoense": { "atk": 0.822, "def": 1.556 },
    "Corinthians": { "atk": 0.836, "def": 0.832 },
    "Coritiba": { "atk": 1.032, "def": 1.121 },
    "Cruzeiro": { "atk": 1.264, "def": 0.89 },
    "Flamengo": { "atk": 1.575, "def": 0.539 },
    "Fluminense": { "atk": 1.159, "def": 0.954 },
    "Grêmio": { "atk": 0.715, "def": 0.992 },
    "Internacional": { "atk": 0.883, "def": 1.101 },
    "Mirassol": { "atk": 0.815, "def": 1.234 },
    "Palmeiras": { "atk": 1.239, "def": 0.6 },
    "Red Bull Bragantino": { "atk": 0.966, "def": 0.932 },
    "Remo": { "atk": 0.899, "def": 1.251 },
    "Santos": { "atk": 1.192, "def": 1.046 },
    "São Paulo": { "atk": 0.869, "def": 0.945 },
    "Vasco da Gama": { "atk": 0.675, "def": 1.237 },
    "Vitória": { "atk": 0.572, "def": 1.048 }
  },
  "MXL": {
    "Atlante FC": { "atk": 0.683, "def": 0.888 },
    "Atlas FC": { "atk": 0.966, "def": 0.972 },
    "Atlético San Luis": { "atk": 0.832, "def": 1.304 },
    "CD Guadalajara": { "atk": 1.275, "def": 0.635 },
    "CD Toluca": { "atk": 1.418, "def": 0.491 },
    "CF Monterrey": { "atk": 1.455, "def": 1.205 },
    "CF Pachuca": { "atk": 0.973, "def": 0.835 },
    "Club América": { "atk": 1.412, "def": 0.359 },
    "Club León": { "atk": 0.891, "def": 0.784 },
    "Club Necaxa": { "atk": 0.909, "def": 1.247 },
    "Club Puebla": { "atk": 1.072, "def": 1.199 },
    "Club Tijuana": { "atk": 1.207, "def": 0.927 },
    "Cruz Azul": { "atk": 1.165, "def": 1.01 },
    "FC Juárez": { "atk": 0.466, "def": 1.985 },
    "Pumas UNAM": { "atk": 0.92, "def": 0.956 },
    "Querétaro FC": { "atk": 1.064, "def": 0.878 },
    "Santos Laguna": { "atk": 0.456, "def": 1.16 },
    "Tigres UANL": { "atk": 0.946, "def": 0.954 }
  },
  "PPT": {
    "Académico Viseu FC": { "atk": 0.755, "def": 1.213 },
    "Benfica": { "atk": 2.252, "def": 0.573 },
    "Casa Pia": { "atk": 0.34, "def": 1.216 },
    "CD Nacional": { "atk": 0.833, "def": 1.059 },
    "CF Estrela Amadora": { "atk": 1.163, "def": 1.372 },
    "CS Marítimo": { "atk": 0.899, "def": 1.289 },
    "Estoril Praia": { "atk": 0.651, "def": 1.174 },
    "Famalicão": { "atk": 0.801, "def": 0.784 },
    "FC Alverca": { "atk": 0.788, "def": 1.289 },
    "FC Arouca": { "atk": 1.195, "def": 0.736 },
    "FC Porto": { "atk": 1.519, "def": 0.424 },
    "Gil Vicente": { "atk": 0.815, "def": 0.768 },
    "Moreirense": { "atk": 0.594, "def": 1.465 },
    "Rio Ave": { "atk": 0.482, "def": 1.48 },
    "Santa Clara": { "atk": 1.151, "def": 0.726 },
    "Sporting Braga": { "atk": 1.337, "def": 0.832 },
    "Sporting CP": { "atk": 2.064, "def": 0.72 },
    "Vitória SC": { "atk": 0.681, "def": 1.018 }
  },
  "SPL": {
    "Al-Ahli": { "atk": 1.658, "def": 0.876 },
    "Al-Ettifaq": { "atk": 1.01, "def": 0.999 },
    "Al-Fateh": { "atk": 0.444, "def": 0.799 },
    "Al-Fayha": { "atk": 0.883, "def": 1.19 },
    "Al-Hazem": { "atk": 0.76, "def": 0.873 },
    "Al-Hilal": { "atk": 1.818, "def": 0.512 },
    "Al-Ittihad": { "atk": 1.075, "def": 0.88 },
    "Al-Khaleej": { "atk": 0.476, "def": 1.305 },
    "Al-Kholood": { "atk": 0.976, "def": 1.096 },
    "Al-Nassr": { "atk": 1.882, "def": 0.634 },
    "Al-Qadsiah": { "atk": 1.708, "def": 0.673 },
    "Al-Riyadh": { "atk": 0.74, "def": 1.542 },
    "Al-Shabab": { "atk": 0.963, "def": 1.362 },
    "Al-Taawoun": { "atk": 0.668, "def": 0.907 },
    "Neom SC": { "atk": 1.016, "def": 0.674 },
    "Al Faisaly": { "atk": 0.455, "def": 1.141 },
    "Abha": { "atk": 0.57, "def": 1.567 },
    "Diriyah": { "atk": 0.73, "def": 0.585 }
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
  BL1: 1.35,
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
