// ============================================================================
// CONFIGURACIÓN / DATOS DE LIGAS
// v12: LIMPIEZA FINAL. Solo quedan las 6 ligas aprobadas y rentables.
// ============================================================================

export const LIGAS = {
  "MLS": { "name": "🇺🇸 MLS (EEUU)", "goalsAvg": 3.00, "cornAvg": 9.9, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": false }, "betting": { "status": "green", "stake": 1, "mercados": ["1X2", "1X", "X2", "BTTS"], "nota": "Walk-forward: ROI +0.6% (417), modelo ≈ cuota. Calibración desactivada." } },
  "CPA": { "name": "🇨🇴 Categoría Primera A", "goalsAvg": 2.35, "cornAvg": 9.5, "cornR": 17, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "green", "stake": 1, "mercados": ["1X2", "1X", "X2", "Over 1.5", "Over 2.5", "Over 3.5", "BTTS"], "nota": "Walk-forward: +2.3% global, Visitante +5.3% significativo. Calibración desactivada." } },
  "MXL": { "name": "🇲🇽 Liga MX", "goalsAvg": 2.70, "cornAvg": 9.6, "cornR": 17, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "green", "stake": 0.5, "mercados": ["1X2", "1X", "X2", "Over 1.5"], "nota": "Walk-forward: ≈ empate. ÚNICA liga donde la calibración mejora (mantiene activa)." } },
  "FL1": { "name": "🇫🇷 Ligue 1", "goalsAvg": 2.70, "cornAvg": 9.4, "cornR": 17, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "green", "stake": 1, "mercados": ["1X", "X2", "Over 1.5", "Over 3.5"], "nota": "Walk-forward: ≈ empate en todos los mercados. Modelo sano." } },
  "PPT": { "name": "🇵🇹 Liga Portugal", "goalsAvg": 2.60, "cornAvg": 9.4, "cornR": 17, "markets": { "goles": true, "btts": true, "corn": false }, "betting": { "status": "yellow", "stake": 0.5, "mercados": ["1X", "X2", "Over 3.5"], "nota": "Walk-forward: ROI +15.9% (318). Over 3.5 +7.6% significativo. Empate -5.6% roto. Calibración desactivada." } },
  "BL2": { "name": "🇩🇪 2. Bundesliga", "goalsAvg": 3.10, "cornAvg": 10.2, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "yellow", "stake": 0.5, "mercados": ["1X", "X2", "Under 2.5", "Under 3.5", "BTTS No", "Over 3.5"], "nota": "Walk-forward (200p): ROI +10.2% (99 apuestas). Modelo puro mejor que mezcla. Over 3.5 +8.7% vs cuota." } }
};

export const TEAM_STRENGTH_DB = {
  "MLS": {
    "Atlanta United": { "atk": 0.88, "def": 1.12 }, "Austin FC": { "atk": 0.94, "def": 1.06 },
    "CF Montréal": { "atk": 0.85, "def": 1.25 }, "Charlotte FC": { "atk": 1.15, "def": 0.90 },
    "Chicago Fire": { "atk": 1.05, "def": 0.98 }, "Colorado Rapids": { "atk": 0.98, "def": 0.92 },
    "Columbus Crew": { "atk": 0.95, "def": 1.05 }, "DC United": { "atk": 0.89, "def": 1.02 },
    "FC Cincinnati": { "atk": 1.12, "def": 1.30 }, "FC Dallas": { "atk": 1.20, "def": 1.04 },
    "Houston Dynamo": { "atk": 1.02, "def": 0.82 }, "Inter Miami CF": { "atk": 1.45, "def": 1.15 },
    "LA Galaxy": { "atk": 1.30, "def": 1.05 }, "Los Angeles FC": { "atk": 1.25, "def": 0.79 },
    "Minnesota United": { "atk": 0.96, "def": 1.10 }, "Nashville SC": { "atk": 1.22, "def": 0.65 },
    "New England Revolution": { "atk": 1.18, "def": 0.88 }, "New York City FC": { "atk": 0.92, "def": 0.90 },
    "New York Red Bulls": { "atk": 0.90, "def": 1.15 }, "Orlando City SC": { "atk": 1.16, "def": 1.35 },
    "Philadelphia Union": { "atk": 1.21, "def": 0.99 }, "Portland Timbers": { "atk": 0.92, "def": 1.08 },
    "Real Salt Lake": { "atk": 1.28, "def": 1.02 }, "San Diego FC": { "atk": 0.95, "def": 1.00 },
    "San Jose Earthquakes": { "atk": 0.99, "def": 0.95 }, "Seattle Sounders FC": { "atk": 1.04, "def": 0.89 },
    "Sporting Kansas City": { "atk": 0.90, "def": 1.38 }, "St.Louis City": { "atk": 1.00, "def": 0.86 },
    "Toronto FC": { "atk": 0.97, "def": 1.11 }, "Vancouver Whitecaps": { "atk": 1.10, "def": 0.68 }
  },
  "CPA": {
    "Alianza Valledupar FC": { "atk": 0.693, "def": 1.231 }, "América de Cali": { "atk": 1.211, "def": 0.607 },
    "Atlético Bucaramanga": { "atk": 1.194, "def": 0.92 }, "Atlético Nacional": { "atk": 1.432, "def": 0.777 },
    "Boyacá Chicó FC": { "atk": 0.697, "def": 1.33 }, "Deportes Tolima": { "atk": 1.038, "def": 0.812 },
    "Deportivo Pasto": { "atk": 0.768, "def": 1.193 }, "Fortaleza FC": { "atk": 0.86, "def": 1.202 },
    "Cúcuta Deportivo": { "atk": 0.79, "def": 1.17 }, "Deportivo Cali": { "atk": 0.98, "def": 0.98 },
    "Deportivo Pereira": { "atk": 0.67, "def": 1.22 }, "Jaguares de Córdoba": { "atk": 0.76, "def": 1.16 },
    "Llaneros FC": { "atk": 0.81, "def": 1.09 }, "Rionegro Águilas Doradas": { "atk": 0.96, "def": 1.01 },
    "Independiente Medellín": { "atk": 1.323, "def": 0.87 }, "Independiente Santa Fe": { "atk": 1.329, "def": 0.747 },
    "Internacional de Bogotá": { "atk": 0.959, "def": 1.406 }, "Junior Barranquilla": { "atk": 1.183, "def": 0.96 },
    "Millonarios": { "atk": 1.161, "def": 0.706 }, "Once Caldas": { "atk": 0.914, "def": 1.035 }
  },
  "MXL": {
    "Atlante FC": { "atk": 0.84, "def": 1.14 }, "Atlas FC": { "atk": 0.98, "def": 1.06 },
    "Atlético San Luis": { "atk": 0.90, "def": 1.11 }, "CD Guadalajara": { "atk": 1.08, "def": 0.99 },
    "CD Toluca": { "atk": 1.20, "def": 0.93 }, "CF Monterrey": { "atk": 1.16, "def": 0.95 },
    "CF Pachuca": { "atk": 1.04, "def": 1.02 }, "Club América": { "atk": 1.24, "def": 0.90 },
    "Club León": { "atk": 1.02, "def": 1.03 }, "Club Necaxa": { "atk": 0.88, "def": 1.13 },
    "Club Puebla": { "atk": 0.80, "def": 1.18 }, "Club Tijuana": { "atk": 0.96, "def": 1.08 },
    "Cruz Azul": { "atk": 1.18, "def": 0.92 }, "FC Juárez": { "atk": 0.82, "def": 1.16 },
    "Pumas UNAM": { "atk": 1.00, "def": 1.05 }, "Querétaro FC": { "atk": 0.78, "def": 1.20 },
    "Santos Laguna": { "atk": 0.90, "def": 1.11 }, "Tigres UANL": { "atk": 1.22, "def": 0.91 }
  },
  "FL1": {
    "Angers": { "atk": 0.80, "def": 1.18 }, "AS Monaco": { "atk": 1.22, "def": 0.90 },
    "Auxerre": { "atk": 1.04, "def": 1.02 }, "Le Havre": { "atk": 0.83, "def": 1.16 },
    "Le Mans": { "atk": 0.78, "def": 1.20 }, "Lille": { "atk": 1.15, "def": 0.94 },
    "Lorient": { "atk": 0.77, "def": 1.19 }, "Nice": { "atk": 0.95, "def": 1.08 },
    "Olympique de Marseille": { "atk": 1.12, "def": 0.96 }, "Olympique Lyonnais": { "atk": 1.18, "def": 0.92 },
    "Paris FC": { "atk": 0.92, "def": 1.06 }, "Paris Saint-Germain": { "atk": 1.38, "def": 0.82 },
    "RC Lens": { "atk": 1.08, "def": 0.99 }, "RC Strasbourg": { "atk": 0.92, "def": 1.10 },
    "Stade Brestois": { "atk": 0.98, "def": 1.06 }, "Stade Rennais": { "atk": 1.01, "def": 1.04 },
    "Toulouse": { "atk": 0.86, "def": 1.14 }, "Troyes": { "atk": 0.75, "def": 1.20 }
  },
  "PPT": {
    "Académico Viseu FC": { "atk": 0.755, "def": 1.213 }, "Benfica": { "atk": 2.252, "def": 0.573 },
    "Casa Pia": { "atk": 0.34, "def": 1.216 }, "CD Nacional": { "atk": 0.833, "def": 1.059 },
    "CF Estrela Amadora": { "atk": 1.163, "def": 1.372 }, "CS Marítimo": { "atk": 0.899, "def": 1.289 },
    "Estoril Praia": { "atk": 0.651, "def": 1.174 }, "Famalicão": { "atk": 0.801, "def": 0.784 },
    "FC Alverca": { "atk": 0.788, "def": 1.289 }, "FC Arouca": { "atk": 1.195, "def": 0.736 },
    "FC Porto": { "atk": 1.519, "def": 0.424 }, "Gil Vicente": { "atk": 0.815, "def": 0.768 },
    "Moreirense": { "atk": 0.594, "def": 1.465 }, "Rio Ave": { "atk": 0.482, "def": 1.48 },
    "Santa Clara": { "atk": 1.151, "def": 0.726 }, "Sporting Braga": { "atk": 1.337, "def": 0.832 },
    "Sporting CP": { "atk": 2.064, "def": 0.72 }, "Vitória SC": { "atk": 0.681, "def": 1.018 }
  },
  "BL2": {
    "Hamburger SV": { "atk": 1.10, "def": 0.95 }, "Schalke 04": { "atk": 1.05, "def": 1.10 },
    "Hertha BSC": { "atk": 1.08, "def": 1.02 }, "Fortuna Düsseldorf": { "atk": 1.05, "def": 0.98 },
    "SC Paderborn": { "atk": 1.00, "def": 1.05 }, "Hannover 96": { "atk": 0.95, "def": 1.05 },
    "Karlsruher SC": { "atk": 0.92, "def": 1.12 }, "Holstein Kiel": { "atk": 1.02, "def": 1.00 }
  }
};

export const TEAM_ALIASES = {
  'Inter Miami': 'Inter Miami CF', 'LAFC': 'Los Angeles FC', 'LA Galaxy': 'LA Galaxy',
  'NYCFC': 'New York City FC', 'NY Red Bulls': 'New York Red Bulls',
  'Seattle Sounders': 'Seattle Sounders FC', 'Vancouver': 'Vancouver Whitecaps',
  'America': 'Club América', 'Chivas': 'CD Guadalajara',
  'Cruz Azul CDMX': 'Cruz Azul', 'Tigres': 'Tigres UANL',
  'Atletico Nacional': 'Atlético Nacional', 'America de Cali': 'América de Cali',
  'Santa Fe': 'Independiente Santa Fe', 'Medellin': 'Independiente Medellín',
  'Junior': 'Junior Barranquilla',
  'PSG': 'Paris Saint-Germain', 'Marseille': 'Olympique de Marseille', 'Lyon': 'Olympique Lyonnais',
  'Sporting Lisbon': 'Sporting CP', 'Porto': 'FC Porto', 'Benfica Lisbon': 'Benfica'
};

export const HOME_ADVANTAGE = {
  "MLS": 1.26, "CPA": 1.36, "MXL": 1.34, "FL1": 1.19, "PPT": 1.22, "BL2": 1.32
};

export const DIXON_COLES_RHO = {
  "MLS": -0.070, "CPA": -0.095, "MXL": -0.095, "FL1": -0.105, "PPT": -0.080, "BL2": -0.070,
  "default": -0.100
};

export const PLATT_PARAMS = {
  goals15: { A: 0.951, B: -0.038 },
  goals25: { A: 0.933, B: -0.055 },
  goals35: { A: 0.933, B: -0.055 },
  goals45: { A: 0.940, B: -0.045 },
  btts: { A: 0.956, B: -0.034 },
  corners: { A: 0.970, B: -0.022 },
  goals_ht05: { A: 0.960, B: -0.030 },
  goals_ht15: { A: 0.938, B: -0.048 },
  resultado: { A: 0.918, B: -0.068 }
};

export const CORNER_HOME_BIAS = 1.12;
export const CORNER_HOME_BIAS_LEAGUE = { BSA: 1.66 };

export const BZZOIRO_COUNTRY = {
  MLS: 'USA',
  CPA: 'Colombia',
  MXL: 'Mexico',
  FL1: 'France',
  PPT: 'Portugal',
  BL2: 'Germany'
};

// ============================================================================
// CONFIGURACIÓN COMPARTIDA
// ============================================================================
export const MODEL_VERSION = 2;

export const DEFAULT_HOME_ADV = 1.25;
export const DEFAULT_RHO = -0.10;
export const HA_MIN = 1.05, HA_MAX = 1.45;
export const RHO_MIN = -0.20, RHO_MAX = 0.05;

export const RATING_SHRINK = 0.85;
export const RATING_MIN = 0.45, RATING_MAX = 1.90;

export const LIVE_PRIOR_GAMES = 4;
export const GOALS_AVG_PRIOR_MATCHES = 20;

export const ML_MAX_WEIGHT = 0.6;

export const RATINGS_PRIOR_JUEGOS = 6;
export const RATINGS_HALFLIFE_DIAS = 60;
export const CORNER_PRIOR_MATCHES = 20;

export const CORNER_RATINGS_PRIOR_JUEGOS = 8;
export const CORNER_RATINGS_HALFLIFE_DIAS = 90;

export const CALIB_HALFLIFE_DIAS = 90;

export const KELLY_FRACTION = 0.25;
export const STAKE_MAX_PCT = 3;

export const FILTRO_EV = 1.05;

export const FILTRO_EV_POR_MERCADO = {
  '1X2': 1.07,
  '1X': 1.04,
  'X2': 1.04,
  'Over 1.5': 1.10,
  'Over 2.5': 1.05,
  'Over 3.5': 1.07,
  'Under 1.5': 1.10,
  'Under 2.5': 1.08,
  'Under 3.5': 1.08,
  'BTTS Sí': 1.06,
  'BTTS No': 1.10,
  'Córners': 1.10,
  'default': 1.05,
};

export function getFiltroEV(mercado) {
  return FILTRO_EV_POR_MERCADO[mercado] ?? FILTRO_EV_POR_MERCADO.default;
}

export const SHRINK_ALPHA = 0.15;

export const UMBRALES_POR_LIGA = {
  MLS: { umbral1x2: 50, umbralGoles: 65, umbralCorners: 75, umbralBtss: 65, umbralDC: 68, cornersVisitante: false },
  CPA: { umbral1x2: 50, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, umbralDC: 68, cornersVisitante: false },
  MXL: { umbral1x2: 50, umbralGoles: 65, umbralCorners: 75, umbralBtss: 65, umbralDC: 68, cornersVisitante: true },
  FL1: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, umbralDC: 68, cornersVisitante: false },
  PPT: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, umbralDC: 68, cornersVisitante: false },
  BL2: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, umbralDC: 68, cornersVisitante: false },
  DEFAULT: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, umbralDC: 68, cornersVisitante: true },
};

export function getUmbrales(leagueKey) {
  const liga = UMBRALES_POR_LIGA[leagueKey] || {};
  return { ...UMBRALES_POR_LIGA.DEFAULT, ...liga };
}

// ============================================================================
// CALIBRACIÓN SELECTIVA POR LIGA
// ============================================================================
export const CALIBRACION_POR_LIGA = {
  MLS: false,
  CPA: false,
  BL2: false,
  PPT: false,
  // MXL y FL1 quedan con calibración activa (true por defecto)
};

export function usaCalibracion(leagueKey) {
  return CALIBRACION_POR_LIGA[leagueKey] !== false;
}
