// ============================================================================
// CONFIGURACIÓN / DATOS DE LIGAS
// - 14 ligas originales + 8 nuevas a explorar
// - UCL sin país (evita error 429)
// - Umbrales de córners a 75
// ============================================================================

export const LIGAS = {
  // === VERDES (con edge medido) ===
  "MLS": { "name": "🇺🇸 MLS (EEUU)", "goalsAvg": 3.00, "cornAvg": 9.9, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": false }, "betting": { "status": "green", "mercados": ["1X2", "BTTS"], "nota": "Local +1.7% vs cuota. Stake 1%." } },
  "CPA": { "name": "🇨🇴 Categoría Primera A", "goalsAvg": 2.35, "cornAvg": 9.5, "cornR": 17, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "green", "mercados": ["1X2", "Over 1.5", "Over 2.5", "Over 3.5", "BTTS"], "nota": "Visitante +5.9% vs cuota. 4 mercados con edge. Stake 1%." } },
  "MXL": { "name": "🇲🇽 Liga MX", "goalsAvg": 2.70, "cornAvg": 9.6, "cornR": 17, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "green", "mercados": ["1X2", "Over 1.5"], "nota": "Over 1.5 +2.5%, Visitante +2.4% (muestra chica). Stake 0.5%." } },
  "FL1": { "name": "🇫🇷 Ligue 1", "goalsAvg": 2.70, "cornAvg": 9.4, "cornR": 17, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "green", "mercados": ["Over 1.5", "Over 3.5"], "nota": "Over 1.5 +3.7% vs cuota (10 picks). Stake 2%." } },
  "BSA": { "name": "🇧🇷 Brasileirão A", "goalsAvg": 2.45, "cornAvg": 10.3, "cornR": 19, "markets": { "goles": false, "btts": false, "corn": true }, "betting": { "status": "green", "mercados": ["Over 1.5", "Over 3.5"], "nota": "Over 1.5 +1.1% (17 picks), Over 3.5 +2.6%. Stake 1%." } },

  // === AMARILLAS (poca muestra o dudosas) ===
  "PPT": { "name": "🇵🇹 Liga Portugal", "goalsAvg": 2.60, "cornAvg": 9.4, "cornR": 17, "markets": { "goles": false, "btts": true, "corn": false }, "betting": { "status": "yellow", "mercados": ["Over 2.5", "BTTS"], "nota": "⚠️ err 11.7%. Solo Over 2.5 y BTTS." } },
  "DED": { "name": "🇳🇱 Eredivisie (Países bajos)", "goalsAvg": 3.10, "cornAvg": 10.1, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "yellow", "mercados": ["BTTS"], "nota": "⚠️ BTTS +14.5% ROI en 51 picks, pero err 14.5%." } },

  // === ROJAS (no apostar) ===
  "PL": { "name": "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League", "goalsAvg": 2.85, "cornAvg": 10.5, "cornR": 20, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "red" } },
  "PD": { "name": "🇪🇸 La Liga", "goalsAvg": 2.55, "cornAvg": 9.5, "cornR": 17, "markets": { "goles": false, "btts": true, "corn": true }, "betting": { "status": "red" } },
  "SA": { "name": "🇮🇹 Serie A", "goalsAvg": 2.65, "cornAvg": 10.2, "cornR": 19, "markets": { "goles": false, "btts": false, "corn": true }, "betting": { "status": "red" } },
  "BL1": { "name": "🇩🇪 Bundesliga", "goalsAvg": 3.00, "cornAvg": 10.0, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "red" } },
  "ELC": { "name": "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Championship (Inglaterra)", "goalsAvg": 2.65, "cornAvg": 10.5, "cornR": 20, "markets": { "goles": false, "btts": true, "corn": true }, "betting": { "status": "red" } },
  "ARG": { "name": "🇦🇷 Liga Profesional de Fútbol", "goalsAvg": 2.15, "cornAvg": 9.1, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "red" } },
  "UCL": { "name": "⭐ Champions League", "goalsAvg": 2.75, "cornAvg": 10.0, "cornR": 18, "markets": { "goles": false, "btts": true, "corn": true }, "betting": { "status": "red", "nota": "Torneo continental. Solo análisis, sin historial exportable." } },

  // === NUEVAS A EXPLORAR (sin calibrar, status amarillo) ===
  "DNS": { "name": "🇩🇰 Danish Superliga", "goalsAvg": 3.05, "cornAvg": 9.8, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "yellow", "mercados": ["Over 2.5", "BTTS"], "nota": "⚠️ sin calibrar todavía." } },
  "BL2": { "name": "🇩🇪 2. Bundesliga", "goalsAvg": 2.95, "cornAvg": 9.9, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "yellow", "mercados": ["Over 1.5", "BTTS"], "nota": "⚠️ sin calibrar todavía." } },
  "TUR": { "name": "🇹🇷 Trendyol Super Lig", "goalsAvg": 2.90, "cornAvg": 9.7, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "yellow", "mercados": ["1X2", "Over 2.5"], "nota": "⚠️ sin calibrar todavía." } },
  "GRE": { "name": "🇬🇷 Stoiximan Super League", "goalsAvg": 2.40, "cornAvg": 9.3, "cornR": 17, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "yellow", "mercados": ["1X2", "BTTS"], "nota": "⚠️ sin calibrar todavía." } },
  "KOR": { "name": "🇰🇷 K League 1", "goalsAvg": 2.60, "cornAvg": 9.9, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "yellow", "mercados": ["Over 1.5", "Córners"], "nota": "⚠️ sin calibrar todavía." } },
  "ROM": { "name": "🇷🇴 Superliga (Rumania)", "goalsAvg": 2.55, "cornAvg": 10.2, "cornR": 19, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "yellow", "mercados": ["Córners", "Over 1.5"], "nota": "⚠️ sin calibrar todavía." } },
  "JPN": { "name": "🇯🇵 J1 League", "goalsAvg": 2.65, "cornAvg": 10.1, "cornR": 18, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "yellow", "mercados": ["Over 1.5"], "nota": "⚠️ sin calibrar todavía." } },
  "BUL": { "name": "🇧🇬 Parva Liga", "goalsAvg": 2.50, "cornAvg": 9.4, "cornR": 17, "markets": { "goles": true, "btts": true, "corn": true }, "betting": { "status": "yellow", "mercados": ["1X2", "Over 1.5"], "nota": "⚠️ sin calibrar todavía." } }
};

export const TEAM_STRENGTH_DB = {
  "PL": {
    "Arsenal": { "atk": 1.32, "def": 0.88 }, "Aston Villa": { "atk": 1.10, "def": 0.96 },
    "Bournemouth": { "atk": 0.96, "def": 1.06 }, "Brentford": { "atk": 1.06, "def": 0.99 },
    "Brighton & Hove Albion": { "atk": 1.08, "def": 0.98 }, "Chelsea": { "atk": 1.18, "def": 0.89 },
    "Coventry City": { "atk": 0.80, "def": 1.18 }, "Crystal Palace": { "atk": 0.96, "def": 1.06 },
    "Everton": { "atk": 0.94, "def": 1.08 }, "Fulham": { "atk": 1.04, "def": 1.02 },
    "Hull City": { "atk": 0.78, "def": 1.22 }, "Ipswich Town": { "atk": 0.87, "def": 1.13 },
    "Leeds United": { "atk": 0.90, "def": 1.11 }, "Liverpool FC": { "atk": 1.28, "def": 0.85 },
    "Manchester City": { "atk": 1.35, "def": 0.82 }, "Manchester United": { "atk": 1.15, "def": 0.92 },
    "Newcastle United": { "atk": 1.12, "def": 0.95 }, "Nottingham Forest": { "atk": 0.89, "def": 1.12 },
    "Sunderland": { "atk": 0.92, "def": 1.10 }, "Tottenham Hotspur": { "atk": 1.22, "def": 0.91 }
  },
  "BL1": {
    "1. FC Köln": { "atk": 0.85, "def": 1.16 }, "1. FC Union Berlin": { "atk": 0.91, "def": 1.12 },
    "1. FSV Mainz 05": { "atk": 0.94, "def": 1.10 }, "Bayer 04 Leverkusen": { "atk": 1.15, "def": 0.96 },
    "Borussia Dortmund": { "atk": 1.26, "def": 0.88 }, "Borussia M'gladbach": { "atk": 0.89, "def": 1.14 },
    "Eintracht Frankfurt": { "atk": 1.02, "def": 1.04 }, "FC Augsburg": { "atk": 0.96, "def": 1.08 },
    "FC Bayern München": { "atk": 1.38, "def": 0.80 }, "FC Schalke 04": { "atk": 0.80, "def": 1.22 },
    "Hamburger SV": { "atk": 0.87, "def": 1.15 }, "RB Leipzig": { "atk": 1.20, "def": 0.92 },
    "SC Freiburg": { "atk": 1.05, "def": 1.02 }, "SC Paderborn 07": { "atk": 0.90, "def": 1.10 },
    "SV 07 Elversberg": { "atk": 0.82, "def": 1.18 }, "SV Werder Bremen": { "atk": 0.83, "def": 1.17 },
    "TSG Hoffenheim": { "atk": 1.08, "def": 1.00 }, "VfB Stuttgart": { "atk": 1.18, "def": 0.94 }
  },
  "SA": {
    "AC Milan": { "atk": 1.28, "def": 0.88 }, "AS Roma": { "atk": 1.15, "def": 0.94 },
    "Atalanta": { "atk": 1.10, "def": 0.98 }, "Bologna": { "atk": 0.97, "def": 1.07 },
    "Cagliari": { "atk": 0.84, "def": 1.15 }, "Como": { "atk": 0.90, "def": 1.12 },
    "Fiorentina": { "atk": 1.12, "def": 0.96 }, "Frosinone": { "atk": 0.82, "def": 1.18 },
    "Genoa": { "atk": 0.86, "def": 1.14 }, "Inter": { "atk": 1.32, "def": 0.86 },
    "Juventus": { "atk": 1.22, "def": 0.90 }, "Lazio": { "atk": 1.18, "def": 0.92 },
    "Lecce": { "atk": 0.82, "def": 1.16 }, "Monza": { "atk": 1.02, "def": 1.04 },
    "Parma": { "atk": 0.80, "def": 1.17 }, "Sassuolo": { "atk": 0.78, "def": 1.18 },
    "SSC Napoli": { "atk": 1.08, "def": 1.00 }, "Torino": { "atk": 0.99, "def": 1.06 },
    "Udinese": { "atk": 0.92, "def": 1.11 }, "Venezia": { "atk": 0.76, "def": 1.20 }
  },
  "PD": {
    "Athletic Club": { "atk": 1.08, "def": 0.99 }, "Atlético Madrid": { "atk": 1.20, "def": 0.92 },
    "Celta Vigo": { "atk": 0.85, "def": 1.14 }, "Deportivo Alavés": { "atk": 0.83, "def": 1.15 },
    "Deportivo de A Coruña": { "atk": 1.02, "def": 1.04 }, "Elche": { "atk": 0.80, "def": 1.18 },
    "Espanyol": { "atk": 0.79, "def": 1.17 }, "FC Barcelona": { "atk": 1.32, "def": 0.86 },
    "Getafe": { "atk": 0.94, "def": 1.08 }, "Levante UD": { "atk": 0.86, "def": 1.12 },
    "Málaga CF": { "atk": 0.82, "def": 1.16 }, "Osasuna": { "atk": 1.02, "def": 1.03 },
    "Rayo Vallecano": { "atk": 0.99, "def": 1.05 }, "Real Betis": { "atk": 1.05, "def": 1.01 },
    "Real Madrid": { "atk": 1.35, "def": 0.84 }, "Real Racing Club": { "atk": 0.90, "def": 1.10 },
    "Real Sociedad": { "atk": 1.15, "def": 0.95 }, "Sevilla": { "atk": 0.92, "def": 1.10 },
    "Valencia": { "atk": 0.90, "def": 1.11 }, "Villarreal": { "atk": 1.12, "def": 0.97 }
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
  "DED": {
    "ADO Den Haag": { "atk": 0.78, "def": 1.18 }, "AFC Ajax": { "atk": 1.28, "def": 0.88 },
    "AZ Alkmaar": { "atk": 1.18, "def": 0.92 }, "Excelsior": { "atk": 0.85, "def": 1.14 },
    "FC Groningen": { "atk": 0.96, "def": 1.08 }, "FC Twente": { "atk": 1.10, "def": 0.98 },
    "FC Utrecht": { "atk": 1.12, "def": 0.96 }, "Feyenoord": { "atk": 1.22, "def": 0.90 },
    "Fortuna Sittard": { "atk": 0.80, "def": 1.19 }, "Go Ahead Eagles": { "atk": 0.83, "def": 1.17 },
    "NEC Nijmegen": { "atk": 0.92, "def": 1.11 }, "PEC Zwolle": { "atk": 1.02, "def": 1.04 },
    "PSV Eindhoven": { "atk": 1.30, "def": 0.86 }, "SC Cambuur": { "atk": 0.76, "def": 1.20 },
    "SC Heerenveen": { "atk": 1.06, "def": 1.01 }, "SC Telstar": { "atk": 0.72, "def": 1.22 },
    "Sparta Rotterdam": { "atk": 0.75, "def": 1.21 }, "Willem II Tilburg": { "atk": 0.77, "def": 1.20 }
  },
  "BSA": {
    "Athletico": { "atk": 1.02, "def": 0.98 }, "Atlético Mineiro": { "atk": 1.15, "def": 1.04 },
    "Bahia": { "atk": 1.08, "def": 1.06 }, "Botafogo": { "atk": 1.25, "def": 0.88 },
    "Chapecoense": { "atk": 0.88, "def": 1.12 }, "Corinthians": { "atk": 1.04, "def": 1.02 },
    "Coritiba": { "atk": 0.94, "def": 1.05 }, "Cruzeiro": { "atk": 1.06, "def": 0.95 },
    "Flamengo": { "atk": 1.30, "def": 0.92 }, "Fluminense": { "atk": 1.00, "def": 1.08 },
    "Grêmio": { "atk": 1.05, "def": 1.10 }, "Internacional": { "atk": 1.12, "def": 0.90 },
    "Mirassol": { "atk": 0.96, "def": 0.94 }, "Palmeiras": { "atk": 1.28, "def": 0.86 },
    "Red Bull Bragantino": { "atk": 1.03, "def": 1.04 }, "Remo": { "atk": 0.85, "def": 1.08 },
    "Santos": { "atk": 1.10, "def": 0.96 }, "São Paulo": { "atk": 1.14, "def": 0.93 },
    "Vasco da Gama": { "atk": 1.01, "def": 1.14 }, "Vitória": { "atk": 0.97, "def": 1.15 }
  },
  "ELC": {
    "Birmingham City": { "atk": 0.88, "def": 1.12 }, "Blackburn Rovers": { "atk": 0.93, "def": 1.13 },
    "Bolton Wanderers": { "atk": 0.86, "def": 1.18 }, "Bristol City": { "atk": 0.90, "def": 1.15 },
    "Burnley": { "atk": 1.12, "def": 0.94 }, "Cardiff City": { "atk": 0.87, "def": 1.17 },
    "Charlton Athletic": { "atk": 0.84, "def": 1.19 }, "Derby County": { "atk": 0.66, "def": 1.30 },
    "Lincoln City": { "atk": 0.80, "def": 1.22 }, "Middlesbrough": { "atk": 1.08, "def": 1.03 },
    "Millwall": { "atk": 0.69, "def": 1.29 }, "Norwich City": { "atk": 1.20, "def": 0.92 },
    "Portsmouth": { "atk": 0.72, "def": 1.27 }, "Preston North End": { "atk": 0.96, "def": 1.11 },
    "Queens Park Rangers": { "atk": 0.83, "def": 1.21 }, "Sheffield United": { "atk": 1.18, "def": 0.94 },
    "Southampton": { "atk": 0.85, "def": 1.14 }, "Stoke City": { "atk": 0.82, "def": 1.18 },
    "Swansea City": { "atk": 0.84, "def": 1.19 }, "Watford": { "atk": 0.78, "def": 1.23 },
    "West Bromwich Albion": { "atk": 1.02, "def": 1.07 }, "West Ham United": { "atk": 1.15, "def": 0.95 },
    "Wolverhampton": { "atk": 0.95, "def": 1.09 }, "Wrexham": { "atk": 0.80, "def": 1.22 }
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
  "UCL": {
    "AGF": { "atk": 1.02, "def": 1.00 }, "Atert Bissen": { "atk": 0.82, "def": 1.14 },
    "ETO FC Győr": { "atk": 0.90, "def": 1.08 }, "FC Ararat-Armenia": { "atk": 1.08, "def": 0.98 },
    "FC Drita": { "atk": 1.00, "def": 1.02 }, "FC Iberia 1999": { "atk": 1.04, "def": 0.99 },
    "FC Petrocub Hîncesti": { "atk": 0.96, "def": 1.05 }, "FC Thun": { "atk": 1.04, "def": 1.00 },
    "Fenerbahçe": { "atk": 1.26, "def": 0.88 }, "FK Borac Banja Luka": { "atk": 1.02, "def": 1.00 },
    "FK Crvena zvezda": { "atk": 1.28, "def": 0.86 }, "FK Kauno Žalgiris": { "atk": 0.94, "def": 1.06 },
    "FK Sutjeska Nikšić": { "atk": 0.88, "def": 1.10 }, "FK Vardar Skopje": { "atk": 0.92, "def": 1.08 },
    "Flora Tallinn": { "atk": 1.02, "def": 1.01 }, "Floriana FC": { "atk": 0.86, "def": 1.12 },
    "GNK Dinamo Zagreb": { "atk": 1.24, "def": 0.90 }, "Górnik Zabrze": { "atk": 1.00, "def": 1.02 },
    "Hapoel Be'er Sheva": { "atk": 1.08, "def": 0.98 }, "Heart of Midlothian": { "atk": 1.14, "def": 0.94 },
    "Inter Club d'Escaldes": { "atk": 0.90, "def": 1.08 }, "Kairat Almaty": { "atk": 1.04, "def": 0.99 },
    "KF Egnatia": { "atk": 0.94, "def": 1.04 }, "Klaksvíkar Ítróttarfelag": { "atk": 1.00, "def": 1.02 },
    "Kuopion Palloseura": { "atk": 1.16, "def": 0.94 }, "Larne FC": { "atk": 0.92, "def": 1.08 },
    "Lech Poznań": { "atk": 1.20, "def": 0.92 }, "Levski Sofia": { "atk": 1.04, "def": 0.98 },
    "Lincoln Red Imps": { "atk": 0.88, "def": 1.12 }, "Mjällby AIF": { "atk": 1.02, "def": 0.99 },
    "ML Vitebsk": { "atk": 0.96, "def": 1.04 }, "NK Celje": { "atk": 1.06, "def": 0.98 },
    "Omonia Nicosia": { "atk": 1.10, "def": 0.96 }, "Riga FC": { "atk": 1.08, "def": 0.97 },
    "Sabah FK": { "atk": 0.98, "def": 1.02 }, "Shamrock Rovers": { "atk": 1.06, "def": 0.98 },
    "ŠK Slovan Bratislava": { "atk": 1.18, "def": 0.92 }, "SK Sturm Graz": { "atk": 1.20, "def": 0.91 },
    "SP Tre Fiori": { "atk": 0.76, "def": 1.22 }, "The New Saints": { "atk": 1.10, "def": 0.96 },
    "Universitatea Craiova": { "atk": 1.08, "def": 0.97 }, "Víkingur Reykjavík": { "atk": 1.02, "def": 1.00 }
  },
  "ARG": {
    "Aldosivi": { "atk": 0.85, "def": 1.30 }, "Argentinos Juniors": { "atk": 1.05, "def": 0.95 },
    "Atlético Tucumán": { "atk": 1.00, "def": 1.05 }, "Banfield": { "atk": 0.90, "def": 1.10 },
    "Barracas Central": { "atk": 0.85, "def": 1.15 }, "Boca Juniors": { "atk": 1.30, "def": 0.80 },
    "CA Independiente": { "atk": 1.10, "def": 0.90 }, "CA Lanús": { "atk": 1.10, "def": 1.00 },
    "CA Talleres": { "atk": 1.15, "def": 0.85 }, "Central Córdoba": { "atk": 0.90, "def": 1.10 },
    "Club Atlético Belgrano": { "atk": 1.00, "def": 1.00 }, "Club Atlético Platense": { "atk": 0.90, "def": 1.05 },
    "Club Atlético Unión de Santa Fe": { "atk": 0.95, "def": 1.00 }, "Defensa y Justicia": { "atk": 1.10, "def": 0.95 },
    "Deportivo Riestra": { "atk": 0.80, "def": 1.20 }, "Estudiantes de La Plata": { "atk": 1.20, "def": 0.85 },
    "Estudiantes de Río Cuarto": { "atk": 0.85, "def": 1.15 }, "Gimnasia y Esgrima": { "atk": 0.95, "def": 1.05 },
    "Gimnasia y Esgrima Mendoza": { "atk": 0.90, "def": 1.10 }, "Huracán": { "atk": 1.05, "def": 0.90 },
    "Independiente Rivadavia": { "atk": 0.85, "def": 1.20 }, "Instituto De Córdoba": { "atk": 0.95, "def": 1.05 },
    "Newell's Old Boys": { "atk": 1.00, "def": 1.00 }, "Racing Club": { "atk": 1.35, "def": 0.80 },
    "River Plate": { "atk": 1.40, "def": 0.75 }, "Rosario Central": { "atk": 1.05, "def": 0.95 },
    "San Lorenzo": { "atk": 1.05, "def": 0.90 }, "Sarmiento": { "atk": 0.80, "def": 1.20 },
    "Tigre": { "atk": 0.90, "def": 1.15 }, "Vélez Sarsfield": { "atk": 1.15, "def": 0.85 }
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
  }
};

export const HOME_ADVANTAGE = {
  "PL": 1.078, "BL1": 1.185, "SA": 1.087, "PD": 1.419, "FL1": 1.203,
  "DED": 1.113, "BSA": 1.317, "ELC": 1.142, "MXL": 1.281,
  "MLS": 1.303, "PPT": 1.373, "CPA": 1.263, "UCL": 1.2, "ARG": 1.196,
  "DNS": 1.15, "BL2": 1.20, "TUR": 1.25, "GRE": 1.20,
  "KOR": 1.15, "ROM": 1.20, "JPN": 1.20, "BUL": 1.20
};

export const DIXON_COLES_RHO = {
  "PL": -0.065, "BL1": -0.085, "SA": -0.130, "PD": -0.098, "FL1": -0.105,
  "DED": -0.072, "BSA": -0.090, "ELC": -0.078, "MXL": -0.095,
  "MLS": -0.070, "PPT": -0.080, "CPA": -0.095, "UCL": -0.070, "ARG": -0.070,
  "DNS": -0.090, "BL2": -0.090, "TUR": -0.085, "GRE": -0.090,
  "KOR": -0.090, "ROM": -0.090, "JPN": -0.090, "BUL": -0.090,
  "default": -0.100
};

export const PLATT_PARAMS = { goals15: { A: 0.951, B: -0.038 }, goals25: { A: 0.933, B: -0.055 }, goals35: { A: 0.933, B: -0.055 }, btts: { A: 0.956, B: -0.034 }, corners: { A: 0.970, B: -0.022 }, goals_ht05: { A: 0.960, B: -0.030 }, goals_ht15: { A: 0.938, B: -0.048 }, resultado: { A: 0.918, B: -0.068 } };

export const CORNER_HOME_BIAS = 1.12;
export const CORNER_HOME_BIAS_LEAGUE = { BSA: 1.66 };

export const BZZOIRO_COUNTRY = {
  PL: 'England', ELC: 'England',
  BL1: 'Germany', BL2: 'Germany',
  SA: 'Italy',
  PD: 'Spain',
  FL1: 'France',
  DED: 'Netherlands',
  BSA: 'Brazil',
  MXL: 'Mexico',
  MLS: 'USA',
  PPT: 'Portugal',
  ARG: 'Argentina',
  CPA: 'Colombia',
  DNS: 'Denmark',
  TUR: 'Turkey',
  GRE: 'Greece',
  KOR: 'South Korea',
  ROM: 'Romania',
  JPN: 'Japan',
  BUL: 'Bulgaria'
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

export const LIVE_PRIOR_GAMES = 6;
export const GOALS_AVG_PRIOR_MATCHES = 20;

export const ML_MAX_WEIGHT = 0.6;

export const FILTRO_EV = 1.05;
export const SHRINK_ALPHA = 0.15;

export const UMBRALES_POR_LIGA = {
  PL:  { umbral1x2: 50, umbralGoles: 75, umbralCorners: 75, umbralBtss: 70, cornersVisitante: false },
  PD:  { umbral1x2: 50, umbralGoles: 65, umbralCorners: 75, umbralBtss: 65, cornersVisitante: false },
  SA:  { umbral1x2: 50, umbralGoles: 65, umbralCorners: 75, umbralBtss: 65, cornersVisitante: false },
  BL1: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  FL1: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  UCL: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  ELC: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  DED: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  PPT: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  BSA: { umbral1x2: 50, umbralGoles: 65, umbralCorners: 75, umbralBtss: 65, cornersVisitante: true },
  ARG: { umbral1x2: 55, umbralGoles: 65, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  MXL: { umbral1x2: 50, umbralGoles: 65, umbralCorners: 75, umbralBtss: 65, cornersVisitante: true },
  MLS: { umbral1x2: 50, umbralGoles: 65, umbralCorners: 75, umbralBtss: 65, cornersVisitante: false },
  CPA: { umbral1x2: 50, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  DNS: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  BL2: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  TUR: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  GRE: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  KOR: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  ROM: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  JPN: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  BUL: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: false },
  DEFAULT: { umbral1x2: 45, umbralGoles: 60, umbralCorners: 75, umbralBtss: 60, cornersVisitante: true },
};

export function getUmbrales(leagueKey) {
  return UMBRALES_POR_LIGA[leagueKey] || UMBRALES_POR_LIGA.DEFAULT;
}
