// app.js
// v7: muestra "cuota justa" (100/prob) al lado de cada mercado — informativo.
//     Los picks muestran "justa X.XX · mín. valor Y.YY" para contexto.
// v6: la app es SOLO predicción (casillas para elegir). Las cuotas de la casa se cargan
//     en el registro (Pendientes), no acá.

import { LIGAS } from './leagues.js';
import { simulateMatch, getTeamsForLeague } from './model.js';
import { AutoCalibrate } from './auto-calibrate.js';
import { generarPicks, getBettingConfig, aplicarShrink, textoUmbrales, cuotaMinima, stakeSugerido } from './picks.js';
import { agregarEntrada, entradaDesdeSimulacion } from './registro.js';

const ESTADO_KEY = 'vv_estado_seleccion';
function guardarEstado(leagueKey, homeTeam, awayTeam) {
  try { localStorage.setItem(ESTADO_KEY, JSON.stringify({ liga: leagueKey, local: homeTeam, visitante: awayTeam })); } catch (e) {}
}
function leerEstado() {
  try { const raw = localStorage.getItem(ESTADO_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
document.addEventListener('DOMContentLoaded', () => {
  const apiKeyInput = document.getElementById('api-key');
  const saveApiKeyBtn = document.getElementById('save-api-key');
  const apiStatus = document.getElementById('api-status');
  const leagueSelect = document.getElementById('league-select');
  const homeSelect = document.getElementById('home-team-select');
  const awaySelect = document.getElementById('away-team-select');
  const simulateBtn = document.getElementById('simulate-btn');
  const resultsDiv = document.getElementById('results');
  const predictionsContent = document.getElementById('predictions-content');

  let ultimo = null;

  function updateTokenStatus() {
    const token = localStorage.getItem('bzzoiro_token');
    if (token) {
      apiKeyInput.value = token;
      apiStatus.textContent = '✅ Token guardado';
      apiStatus.style.color = 'var(--green)';
    } else {
      apiStatus.textContent = '⚠️ No hay token';
      apiStatus.style.color = 'var(--yellow)';
    }
  }

  saveApiKeyBtn.addEventListener('click', () => {
    const token = apiKeyInput.value.trim();
    if (token) {
      localStorage.setItem('bzzoiro_token', token);
      updateTokenStatus();
    } else {
      apiStatus.textContent = '❌ Ingresa un token válido';
      apiStatus.style.color = 'var(--red)';
    }
  });

  updateTokenStatus();

  async function mostrarParamsActivos(ligaKey) {
    const params = await AutoCalibrate.getParamsActivos(ligaKey);
    const el = document.getElementById('params-status');
    if (!el) return;

    if (!params) {
      el.innerHTML = '⚠️ Sin calibración guardada: se usan valores base de la liga (corré el backtest para calibrar)';
      el.style.color = 'var(--yellow)';
      return;
    }

    const fuente = params.fuente === 'repo' ? ' (del repo)' : ' (local)';
    const config = getBettingConfig(ligaKey);
    const stake = stakeSugerido(ligaKey);

    let html = '<div style="font-family:\'IBM Plex Mono\',monospace; font-size:0.78rem; line-height:1.5;">';
    html += '<div>📊 HA=' + params.homeAdvantage.toFixed(3) + ' rho=' + params.rho.toFixed(3) +
      (params.goalsAvg ? ' goles=' + params.goalsAvg.toFixed(2) : '') +
      (params.cornAvg ? ' córn=' + params.cornAvg.toFixed(2) : '') + fuente + '</div>';
    if (params.ratings) html += '<div style="font-size:0.72rem;">📈 Ratings goles: ' + Object.keys(params.ratings).length + ' equipos</div>';
    if (params.cornerRatings) html += '<div style="font-size:0.72rem;">🎯 Ratings córners: ' + Object.keys(params.cornerRatings).length + ' equipos</div>';

    if (config.status === 'green') {
      el.style.color = 'var(--green)';
      html += '<div style="color:var(--green); font-weight:600; margin-top:4px;">✅ LIGA APTA PARA APOSTAR</div>';
      if (config.mercados) html += '<div style="font-size:0.72rem; margin-top:2px;">Mercados: ' + config.mercados.join(' · ') + '</div>';
      html += '<div style="font-size:0.72rem;">Stake base: ' + stake + '% de la banca (la cuota se carga en el registro)</div>';
      if (config.nota) html += '<div style="font-size:0.7rem; color:var(--chalk-dim); margin-top:2px;">' + config.nota + '</div>';
    } else if (config.status === 'yellow') {
      el.style.color = 'var(--yellow)';
      html += '<div style="color:var(--yellow); font-weight:600; margin-top:4px;">⚠️ LIGA PROMETEDORA (stake bajo)</div>';
      if (config.mercados) html += '<div style="font-size:0.72rem; margin-top:2px;">Mercados: ' + config.mercados.join(' · ') + '</div>';
      html += '<div style="font-size:0.72rem;">Stake base: ' + stake + '% de la banca</div>';
      if (config.nota) html += '<div style="font-size:0.7rem; color:var(--chalk-dim); margin-top:2px;">' + config.nota + '</div>';
    } else if (config.status === 'red') {
      el.style.color = 'var(--red)';
      html += '<div style="color:var(--red); font-weight:600; margin-top:4px;">❌ NO APOSTAR EN ESTA LIGA</div>';
      html += '<div style="font-size:0.72rem;">Esta liga pierde contra cuota. Solo para análisis.</div>';
      if (config.nota) html += '<div style="font-size:0.7rem; color:var(--chalk-dim); margin-top:2px;">' + config.nota + '</div>';
    }
    html += '</div>';
    el.innerHTML = html;
  }

  function populateLeagues() {
    for (const [key, liga] of Object.entries(LIGAS)) {
      const option = document.createElement('option');
      option.value = key;
      option.textContent = liga.name;
      leagueSelect.appendChild(option);
    }
  }

  function populateTeams(leagueKey) {
    homeSelect.innerHTML = ''; awaySelect.innerHTML = '';
    const teams = getTeamsForLeague(leagueKey);
    const teamNames = Object.keys(teams);
    if (teamNames.length === 0) return;
    for (const name of teamNames) {
      homeSelect.appendChild(new Option(name, name));
      awaySelect.appendChild(new Option(name, name));
    }
    homeSelect.selectedIndex = 0;
    awaySelect.selectedIndex = Math.min(1, teamNames.length - 1);
  }

  async function restaurarEstado() {
    const estado = leerEstado();
    if (estado && estado.liga && LIGAS[estado.liga]) {
      leagueSelect.value = estado.liga;
      populateTeams(estado.liga);
      const teamNames = Object.keys(getTeamsForLeague(estado.liga));
      if (estado.local && teamNames.includes(estado.local)) homeSelect.value = estado.local;
      if (estado.visitante && teamNames.includes(estado.visitante) && estado.visitante !== homeSelect.value) {
        awaySelect.value = estado.visitante;
      }
    } else {
      const firstLeague = Object.keys(LIGAS)[0];
      if (firstLeague) { leagueSelect.value = firstLeague; populateTeams(firstLeague); }
    }
    await mostrarParamsActivos(leagueSelect.value);
  }

  leagueSelect.addEventListener('change', async (e) => {
    populateTeams(e.target.value);
    guardarEstado(e.target.value, homeSelect.value, awaySelect.value);
    await mostrarParamsActivos(e.target.value);
  });
  homeSelect.addEventListener('change', () => { guardarEstado(leagueSelect.value, homeSelect.value, awaySelect.value); });
  awaySelect.addEventListener('change', () => { guardarEstado(leagueSelect.value, homeSelect.value, awaySelect.value); });

  simulateBtn.addEventListener('click', async () => {
    const leagueKey = leagueSelect.value;
    const homeTeam = homeSelect.value;
    const awayTeam = awaySelect.value;
    if (!leagueKey || !homeTeam || !awayTeam || homeTeam === awayTeam) {
      alert('Selecciona liga y dos equipos distintos');
      return;
    }
    guardarEstado(leagueKey, homeTeam, awayTeam);
    simulateBtn.disabled = true;
    simulateBtn.textContent = 'Calculando...';
    try {
      const paramsGuardados = await AutoCalibrate.getParamsActivos(leagueKey);
      const results = await simulateMatch(leagueKey, homeTeam, awayTeam, { calibracion: paramsGuardados || undefined });
      results.resultProbs = aplicarShrink(results.resultProbs, paramsGuardados && paramsGuardados.tasas);
      ultimo = { base: results, ligaKey: leagueKey };
      render();
    } catch (err) {
      alert('Error: ' + err.message);
      console.error('❌ Error en simulación', err);
    } finally {
      simulateBtn.disabled = false;
      simulateBtn.textContent = 'Simular partido';
    }
  });

  // ---------- helpers de render ----------
  function fmt(n) { return Number(n).toFixed(1); }

  function getColor(prob) {
    if (prob >= 65) return 'var(--green)';
    if (prob >= 42) return 'var(--yellow)';
    return 'var(--red)';
  }

  // Cuota justa = lo que el mercado "debería" pagar si estuviera de acuerdo con el modelo.
  // 100/prob sin margen. Informativo, no reemplaza a cuotaMinima (que sí aplica el filtro EV).
  function cuotaJusta(probPct) {
    if (!Number.isFinite(probPct) || probPct <= 0) return null;
    return 100 / probPct;
  }

  function fila(label, prob, key) {
    const color = getColor(prob);
    const pct = Math.max(0, Math.min(100, prob));
    const check = key ? '<input type="checkbox" class="pick-check" data-key="' + key + '" style="width:16px;height:16px;flex-shrink:0;accent-color:#3ecf8e;margin-right:10px;">' : '';
    const justa = cuotaJusta(prob);
    const justaHtml = justa ? '<small style="color:var(--text-dim);font-weight:400;margin-left:6px;">cuota justa ' + justa.toFixed(2) + '</small>' : '';
    return '<div class="prob-row" style="display:flex;align-items:center;">' + check +
      '<div style="flex:1;min-width:0;"><div class="prob-row-top"><span>' + label + justaHtml + '</span><span class="prob" style="color:' + color + '">' + fmt(prob) + '%</span></div>' +
      '<div class="semaforo-track"><div class="semaforo-fill" style="width:' + pct + '%;background:' + color + '"></div></div></div></div>';
  }

  // Dato informativo: cuota justa del modelo + cuota mínima con valor (aplica filtro EV).
  function textoMinima(prob, mercado) {
    const min = cuotaMinima(prob, mercado);
    if (min == null) return '';
    const justa = cuotaJusta(prob);
    const justaTxt = justa ? justa.toFixed(2) : '—';
    return 'justa ' + justaTxt + ' · mín. con valor ' + min.toFixed(2);
  }

  function renderPicksCard(data, ligaKey) {
    const picks = generarPicks(data, ligaKey);
    const config = getBettingConfig(ligaKey);
    const umbrales = textoUmbrales(ligaKey);

    if (data.sinRating && data.sinRating.length > 0) {
      return '<div class="card" style="border:2px solid var(--yellow);">' +
        '<h3 style="color:var(--yellow);">⚠️ Sin rating para: ' + data.sinRating.join(', ') + '</h3>' +
        '<p style="color:var(--chalk-dim); margin:8px 0 0; font-size:0.9rem;">No se recomiendan picks: el modelo usaría "equipo promedio" para uno de los dos. Corré el backtest o cargá el historial para que se aprendan los ratings.</p></div>';
    }

    if (config.status === 'red') {
      return '<div class="card" style="border:2px solid var(--red);"><h3 style="color:var(--red);">❌ NO APOSTAR EN ESTA LIGA</h3><p style="color:var(--chalk-dim); margin:8px 0 0; font-size:0.9rem;">Esta liga pierde contra cuota. Usala solo para análisis.</p>' +
        (config.nota ? '<p style="color:var(--text-dim); margin:6px 0 0; font-size:0.72rem;">' + config.nota + '</p>' : '') + '</div>';
    }

    if (picks.length === 0) {
      return '<div class="card" style="border:2px solid var(--line); opacity:0.8;"><h3>🎯 Mejores picks para este partido</h3>' +
        '<p style="color:var(--chalk-dim); margin:8px 0 0; font-size:0.9rem;">Sin picks. Ningún mercado habilitado supera los umbrales.</p>' +
        '<p style="color:var(--chalk-dim); margin:6px 0 0; font-size:0.72rem;">' + umbrales + '</p></div>';
    }

    const filas = picks.map(p => {
      return '<div class="prob-row">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<input type="checkbox" class="pick-check" data-key="' + p.key + '" checked style="width:18px;height:18px;flex-shrink:0;accent-color:#3ecf8e;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="prob-row-top"><span>✅ ' + p.label + '</span><span class="prob" style="color:' + getColor(p.prob) + '">' + fmt(p.prob) + '%</span></div>' +
            '<div class="semaforo-track"><div class="semaforo-fill" style="width:' + p.prob + '%;background:' + getColor(p.prob) + '"></div></div>' +
            '<div style="font-size:0.7rem;color:var(--text-dim);margin-top:4px;">' + textoMinima(p.prob, p.mercado) + '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="card" style="border:2px solid var(--green);"><h3>🎯 Mejores picks <small>(' + picks.length + ')</small></h3>' + filas +
      '<p style="color:var(--chalk-dim); margin:10px 0 0; font-size:0.72rem;">' + umbrales + '<br>"Cuota justa" = 100/prob (lo que el mercado debería pagar si coincidiera con el modelo). "Mín. con valor" = la cuota mínima para que tenga EV positivo. La cuota real la cargás en el registro.</p></div>';
  }

  function renderMLCard(ml) {
    if (!ml || !ml.resultProbs) return '';
    const f = (x) => (typeof x === 'number' && Number.isFinite(x)) ? fmt(x) + '%' : '—';
    const row = (a, b) => '<div class="compare-row" style="grid-template-columns:1fr auto;"><span>' + a + '</span><span class="grid-plain">' + b + '</span></div>';
    return '<div class="card"><h3>🤖 ML de Bzzoiro <small>(solo referencia, no entra en los picks)</small></h3>' +
      row('Local / Empate / Visitante', f(ml.resultProbs.local) + ' · ' + f(ml.resultProbs.empate) + ' · ' + f(ml.resultProbs.visitante)) +
      row('Over 2.5', f(ml.over25)) + row('BTTS Sí', f(ml.btts)) +
      (ml.confidence != null ? row('Confianza', fmt(ml.confidence * 100) + '%') : '') + '</div>';
  }

  function render() {
    if (!ultimo) return;
    displayResults(ultimo.base, ultimo.ligaKey);
  }

  function displayResults(data, ligaKey) {
    const saveCard = '<div class="card" style="border:2px solid var(--accent);"><h3>📝 ¿Qué apostás?</h3>' +
      '<p style="color:var(--chalk-dim); font-size:0.75rem; margin:0 0 10px; line-height:1.5;">Tildá todo lo que vayas a jugar: los picks de arriba (ya vienen tildados) y/o cualquier mercado de las tarjetas de abajo. Después cargás la cuota de la casa en el registro (Pendientes).</p>' +
      '<button id="guardar-picks" style="width:100%;">💾 Guardar seleccionados</button>' +
      '<p id="guardar-status" style="margin:8px 0 0; font-size:0.78rem; color:var(--text-dim,#8b95a5);">Guardalo antes de que empiece el partido. <a href="registro.html" style="color:var(--accent);">Ver registro</a></p></div>';

    const dc1X = +(data.resultProbs.local + data.resultProbs.empate).toFixed(1);
    const dcX2 = +(data.resultProbs.empate + data.resultProbs.visitante).toFixed(1);
    const under15 = data.under15 != null ? data.under15 : (data.over15 != null ? 100 - data.over15 : null);
    const under25 = data.under25 != null ? data.under25 : (data.over25 != null ? 100 - data.over25 : null);
    const under35 = data.under35 != null ? data.under35 : (data.over35 != null ? 100 - data.over35 : null);
    const bttsNo = data.bttsNo != null ? data.bttsNo : (data.btts != null ? 100 - data.btts : null);

    const corners = data.cornerProbs
      ? '<div class="card"><h3>Córneres</h3>' + fila('Over 7.5', data.cornerProbs.over7, 'c_over75') + fila('Over 8.5', data.cornerProbs.over8, 'c_over85') + fila('Over 9.5', data.cornerProbs.over9, 'c_over95') + '</div>'
      : '';

    predictionsContent.innerHTML =
      renderPicksCard(data, ligaKey) +
      saveCard +
      '<div class="card"><h3>Resultado 1X2</h3>' +
        fila('Local', data.resultProbs.local, 'local') + fila('Empate', data.resultProbs.empate, 'empate') + fila('Visitante', data.resultProbs.visitante, 'visitante') + '</div>' +
      '<div class="card"><h3>Doble oportunidad <small>(menos varianza)</small></h3>' +
        fila('1X — Local o Empate', dc1X, 'dc1X') + fila('X2 — Empate o Visitante', dcX2, 'dcX2') + '</div>' +
      '<div class="card"><h3>Goles</h3>' +
        fila('Over 1.5', data.over15, 'over15') + fila('Over 2.5', data.over25, 'over25') + fila('Over 3.5', data.over35, 'over35') +
        (under15 != null ? fila('Under 1.5', under15, 'under15') : '') +
        (under25 != null ? fila('Under 2.5', under25, 'under25') : '') +
        (under35 != null ? fila('Under 3.5', under35, 'under35') : '') + '</div>' +
      '<div class="card"><h3>Ambos marcan (BTTS)</h3>' + fila('Sí', data.btts, 'bttsSi') + (bttsNo != null ? fila('No', bttsNo, 'bttsNo') : '') + '</div>' +
      corners +
      renderMLCard(ultimo.base.bzzoiroML);
    resultsDiv.style.display = 'block';
  }

  // ---------- guardar selección en el registro (sin cuotas: se cargan allá) ----------
  function guardarSeleccion() {
    const st = document.getElementById('guardar-status');
    if (!st || !ultimo) return;
    const elegidos = [...new Set([...document.querySelectorAll('.pick-check:checked')].map(c => c.dataset.key))];
    if (!elegidos.length) { st.textContent = '⚠️ Tildá al menos un mercado para guardar.'; st.style.color = 'var(--yellow)'; return; }
    try {
      const r = agregarEntrada(entradaDesdeSimulacion(ultimo.base, ultimo.ligaKey, {}, elegidos));
      const n = elegidos.length;
      st.textContent = (r.reemplazada ? '✅ Actualizada con ' : '✅ Guardada con ') + n + ' seleccionado' + (n > 1 ? 's' : '') + '. Total: ' + r.total + '. Cargá la cuota en el registro.';
      st.style.color = 'var(--green)';
    } catch (e) {
      st.textContent = '❌ No se pudo guardar: ' + e.message;
      st.style.color = 'var(--red)';
    }
  }

  predictionsContent.addEventListener('click', (ev) => {
    const t = ev.target && ev.target.closest ? ev.target.closest('button') : null;
    if (t && t.id === 'guardar-picks') guardarSeleccion();
  });

  populateLeagues();
  restaurarEstado();
});
