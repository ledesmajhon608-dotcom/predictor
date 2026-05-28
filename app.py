from flask import Flask, jsonify, request, send_from_directory
from flask_cors import CORS
import json, time, requests, re
import numpy as np
from scipy.stats import poisson, nbinom
from bs4 import BeautifulSoup

app = Flask(__name__, static_folder='static')
CORS(app)

LEAGUES = {
    "EPL": {"name": "🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier League", "understat": "EPL", "goals_avg": 2.85, "corners_avg": 10.1},
    "La_liga": {"name": "🇪🇸 La Liga", "understat": "La_liga", "goals_avg": 2.55, "corners_avg": 9.5},
    "Serie_A": {"name": "🇮🇹 Serie A", "understat": "Serie_A", "goals_avg": 2.65, "corners_avg": 9.0},
    "Bundesliga": {"name": "🇩🇪 Bundesliga", "understat": "Bundesliga", "goals_avg": 3.00, "corners_avg": 9.8},
    "Ligue_1": {"name": "🇫🇷 Ligue 1", "understat": "Ligue_1", "goals_avg": 2.70, "corners_avg": 9.3}
}

CACHE = {}

def get_understat_data(league_code, season="2024"):
    if league_code in CACHE:
        return CACHE[league_code]
    try:
        url = f"https://understat.com/league/{league_code}/{season}"
        headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        resp = requests.get(url, headers=headers, timeout=15)
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
    except Exception as e:
        print(f"Error fetching {league_code}: {e}")
        return []

def parse_matches(data):
    matches = []
    for m in data:
        if m.get("isResult"):
            matches.append({
                "date": m.get("datetime", ""),
                "home": m["h"]["title"],
                "away": m["a"]["title"],
                "h_xg": float(m.get("xG", {}).get("h", 0) or 0),
                "a_xg": float(m.get("xG", {}).get("a", 0) or 0)
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
                weights = np.exp(np.linspace(-2, 0, len(stats[team][key])))
                stats[team][key] = float(np.average(stats[team][key], weights=weights))
            else:
                stats[team][key] = None
    return stats

def prob_over(lambda_val, thresh):
    if lambda_val <= 0:
        return 0
    return round(max(0, min(100, (1 - poisson.cdf(np.floor(thresh), lambda_val)) * 100)), 1)

def predict_match(league_code, home, away):
    league = LEAGUES.get(league_code, LEAGUES["EPL"])
    data = get_understat_data(league_code)
    matches = parse_matches(data)
    stats = compute_team_stats(matches)
    goals_avg = league["goals_avg"]
    corners_avg = league["corners_avg"]
    
    h = stats.get(home, {})
    a = stats.get(away, {})
    
    hxg_f = h.get("h_xgf") or (goals_avg / 2 * 1.08)
    hxg_a = h.get("h_xga") or (goals_avg / 2 * 0.92)
    axg_f = a.get("a_xgf") or (goals_avg / 2 * 0.92)
    axg_a = a.get("a_xga") or (goals_avg / 2 * 1.08)
    
    lh = (hxg_f + axg_a) / 2 * 1.06
    la = (axg_f + hxg_a) / 2 * 0.94
    total_lambda = lh + la
    
    home_win = sum(poisson.pmf(i, lh) * poisson.pmf(j, la) for i in range(12) for j in range(12) if i > j)
    away_win = sum(poisson.pmf(i, lh) * poisson.pmf(j, la) for i in range(12) for j in range(12) if i < j)
    draw = 1 - home_win - away_win
    
    p0_home = poisson.pmf(0, lh)
    p0_away = poisson.pmf(0, la)
    btts = max(0, min(100, (1 - p0_home - p0_away + p0_home * p0_away) * 100))
    
    lh_ht = lh * 0.44
    la_ht = la * 0.40
    ht_lambda = lh_ht + la_ht
    
    lambda_corners = corners_avg * 1.02
    r_corners = 6
    
    def prob_corners(thresh):
        if lambda_corners <= 0:
            return 0
        return round(max(0, min(100, (1 - nbinom.cdf(np.floor(thresh), r_corners, r_corners/(r_corners+lambda_corners))) * 100)), 1)
    
    return {
        "league": league["name"],
        "home": home,
        "away": away,
        "l_home": round(lh, 3),
        "l_away": round(la, 3),
        "goals": {
            "over15": prob_over(total_lambda, 1.5),
            "over25": prob_over(total_lambda, 2.5)
        },
        "btts": round(btts, 1),
        "result": {
            "home_win": round(home_win * 100, 1),
            "draw": round(draw * 100, 1),
            "away_win": round(away_win * 100, 1)
        },
        "ht_goals": {
            "over05": prob_over(ht_lambda, 0.5),
            "over15": prob_over(ht_lambda, 1.5)
        },
        "corners": {
            "over75": prob_corners(7.5),
            "over85": prob_corners(8.5)
        }
    }

@app.route('/api/leagues')
def get_leagues():
    return jsonify([{"code": k, "name": v["name"]} for k, v in LEAGUES.items()])

@app.route('/api/teams')
def get_teams():
    league = request.args.get('league', 'EPL')
    data = get_understat_data(league)
    matches = parse_matches(data)
    teams = sorted(set(m["home"] for m in matches) | set(m["away"] for m in matches))
    return jsonify(teams)

@app.route('/api/predict')
def api_predict():
    league = request.args.get('league', 'EPL')
    home = request.args.get('home', '')
    away = request.args.get('away', '')
    if not home or not away:
        return jsonify({"error": "Faltan equipos"}), 400
    try:
        pred = predict_match(league, home, away)
        return jsonify(pred)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
