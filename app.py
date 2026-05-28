from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json, time, requests, re
import numpy as np
from scipy.stats import poisson, nbinom
from bs4 import BeautifulSoup

app = Flask(__name__, static_folder='static')
CORS(app)

# ─── CONFIGURACIÓN DE LIGAS (Understat + medias offline) ───
LEAGUES = {
    "EPL": {"name": "Premier League", "understat": "EPL", "goals_avg": 2.85, "corners_avg": 10.1},
    "La_liga": {"name": "La Liga", "understat": "La_liga", "goals_avg": 2.55, "corners_avg": 9.5},
    "Serie_A": {"name": "Serie A", "understat": "Serie_A", "goals_avg": 2.65, "corners_avg": 9.0},
    "Bundesliga": {"name": "Bundesliga", "understat": "Bundesliga", "goals_avg": 3.00, "corners_avg": 9.8},
    "Ligue_1": {"name": "Ligue 1", "understat": "Ligue_1", "goals_avg": 2.70, "corners_avg": 9.3}
}
CACHE = {}
ODDS_API_KEY = "TU_API_KEY_DE_ODDS_API"  # Gratis en https://the-odds-api.com

# ─── SCRAPING UNDERSTAT ──────────────────────────────────
def get_understat_data(league_code, season="2024"):
    if league_code in CACHE:
        return CACHE[league_code]
    url = f"https://understat.com/league/{league_code}/{season}"
    resp = requests.get(url, headers={"User-Agent": "Mozilla/5.0"})
    soup = BeautifulSoup(resp.text, "html.parser")
    data = []
    for script in soup.find_all("script"):
        if "datesData" in script.text:
            match = re.search(r"datesData\s*=\s*JSON\.parse\('(.*?)'\)", script.text)
            if match:
                decoded = bytes(match.group(1), "utf-8").decode("unicode_escape")
                data = json.loads(decoded)
                break
    CACHE[league_code] = data
    return data

def parse_matches(data):
    matches = []
    for m in data:
        if m["isResult"]:
            matches.append({
                "date": m["datetime"], "home": m["h"]["title"], "away": m["a"]["title"],
                "h_xg": float(m["xG"]["h"]), "a_xg": float(m["xG"]["a"])
            })
    return matches

def compute_team_stats(matches, decay=0.94):
    stats = {}
    for m in matches:
        for team in [m["home"], m["away"]]:
            if team not in stats:
                stats[team] = {"h_xgf": [], "h_xga": [], "a_xgf": [], "a_xga": []}
    for m in matches:
        stats[m["home"]]["h_xgf"].append(m["h_xg"])
        stats[m["home"]]["h_xga"].append(m["a_xg"])
        stats[m["away"]]["a_xgf"].append(m["a_xg"])
        stats[m["away"]]["a_xga"].append(m["h_xg"])
    for team in stats:
        for key in stats[team]:
            if stats[team][key]:
                w = np.exp(np.linspace(-2, 0, len(stats[team][key])))
                stats[team][key] = np.average(stats[team][key], weights=w)
            else:
                stats[team][key] = None
    return stats

# ─── MODELO PREDICTIVO ──────────────────────────────────
def predict_match(league_code, home, away):
    league = LEAGUES[league_code]
    data = get_understat_data(league_code)
    matches = parse_matches(data)
    stats = compute_team_stats(matches)
    goals_avg = league["goals_avg"]
    h = stats.get(home, {})
    a = stats.get(away, {})
    hxg_f = h.get("h_xgf") or goals_avg/2*1.05
    hxg_a = h.get("h_xga") or goals_avg/2*0.95
    axg_f = a.get("a_xgf") or goals_avg/2*0.95
    axg_a = a.get("a_xga") or goals_avg/2*1.05
    lh = (hxg_f + axg_a) / 2 * 1.05
    la = (axg_f + hxg_a) / 2 * 0.95

    # Probabilidades
    def prob_over(thresh):
        return max(0, min(100, (1 - poisson.cdf(np.floor(thresh), lh+la)) * 100))
    def prob_btts():
        p0 = poisson.pmf(0, lh) * poisson.pmf(0, la)
        return max(0, min(100, (1 - p0) * 100))
    def prob_corners(thresh):
        avg = league["corners_avg"]
        lambda_c = avg * 1.02  # aproximación simple (mejorable con datos de FBref)
        r = 6
        return max(0, min(100, (1 - nbinom.cdf(np.floor(thresh), r, r/(r+lambda_c))) * 100))

    # Resultado
    home_win = sum(poisson.pmf(i, lh) * poisson.pmf(j, la) for i in range(11) for j in range(11) if i > j)
    away_win = sum(poisson.pmf(i, lh) * poisson.pmf(j, la) for i in range(11) for j in range(11) if i < j)
    draw = 1 - home_win - away_win

    return {
        "league": league["name"], "home": home, "away": away,
        "l_home": round(lh,3), "l_away": round(la,3),
        "goals": {"over15": prob_over(1.5), "over25": prob_over(2.5)},
        "btts": prob_btts(),
        "result": {"home_win": round(home_win*100,1), "draw": round(draw*100,1), "away_win": round(away_win*100,1)},
        "ht_goals": {"over05": prob_over(0.5)*0.95, "over15": prob_over(1.5)*0.85},  # aprox HT
        "corners": {"over75": prob_corners(7.5), "over85": prob_corners(8.5)}
    }

# ─── OBTENER CUOTAS REALES (The Odds API) ───────────────
def get_real_odds(league_code, home, away):
    if ODDS_API_KEY == "TU_API_KEY_DE_ODDS_API":
        return None
    sport_key_map = {"EPL": "soccer_epl", "La_liga": "soccer_spain_la_liga",
                     "Serie_A": "soccer_italy_serie_a", "Bundesliga": "soccer_germany_bundesliga",
                     "Ligue_1": "soccer_france_ligue_one"}
    key = sport_key_map.get(league_code)
    if not key:
        return None
    url = f"https://api.the-odds-api.com/v4/sports/{key}/odds/?apiKey={ODDS_API_KEY}&regions=eu&markets=h2h,over_under,btts&oddsFormat=decimal"
    try:
        resp = requests.get(url)
        data = resp.json()
        for match in data:
            hn = match["home_team"].replace(" FC", "").strip()
            an = match["away_team"].replace(" FC", "").strip()
            if home.lower() in hn.lower() and away.lower() in an.lower():
                odds = {}
                for book in match["bookmakers"]:
                    if book["key"] == "bet365":
                        for market in book["markets"]:
                            if market["key"] == "h2h":
                                for outcome in market["outcomes"]:
                                    odds[outcome["name"]] = outcome["price"]
                            elif market["key"] == "over_under" and market.get("name") == "Total Goals":
                                for outcome in market["outcomes"]:
                                    if outcome["name"] == "Over" and outcome["point"] == 2.5:
                                        odds["over25"] = outcome["price"]
                            elif market["key"] == "btts":
                                for outcome in market["outcomes"]:
                                    odds["btts"] = outcome["price"]
                return odds
    except:
        pass
    return None

def calc_value(prob, odds):
    if prob is None or odds is None:
        return None
    implied = 1 / odds
    return (prob/100) - implied

# ─── ENDPOINTS ─────────────────────────────────────────
@app.route('/api/leagues')
def get_leagues():
    return jsonify([{"code": k, "name": v["name"]} for k,v in LEAGUES.items()])

@app.route('/api/teams')
def get_teams():
    league = request.args.get('league','EPL')
    data = get_understat_data(league)
    matches = parse_matches(data)
    teams = sorted(set(m["home"] for m in matches) | set(m["away"] for m in matches))
    return jsonify(teams)

@app.route('/api/predict')
def api_predict():
    league = request.args.get('league','EPL')
    home = request.args.get('home','')
    away = request.args.get('away','')
    pred = predict_match(league, home, away)
    odds = get_real_odds(league, home, away)
    if odds:
        pred["odds"] = odds
        pred["value"] = {
            "home_win": calc_value(pred["result"]["home_win"], odds.get("1")),
            "away_win": calc_value(pred["result"]["away_win"], odds.get("2")),
            "over25": calc_value(pred["goals"]["over25"], odds.get("over25")),
            "btts": calc_value(pred["btts"], odds.get("btts"))
        }
    return jsonify(pred)

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

if __name__ == '__main__':
    app.run(debug=True, port=5000)
