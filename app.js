// app.js
// v5: picks con cuota de la casa → EV, cuota mínima y Kelly/4 por pick;
//     mezcla opcional modelo + cuota 1X2 sin margen; ML de Bzzoiro como referencia;
//     Under 1.5 disponible; guarda cuotas en el registro.

import { LIGAS } from './leagues.js';
import { simulateMatch, getTeamsForLeague } from './model.js';
import { AutoCalibrate } from './auto-calibrate.js';
import {
  generarPicks, getBettingConfig, aplicarShrink, textoUmbrales,
  valorPick, cuotaMinima, mezclarConMercado, stakeSugerido,
} from './picks.js';
import { agregarEntrada, entradaDesdeSimulacion } from './registro.js';

const ESTADO_KEY = 'vv_estado_seleccion';
const W_KEY = 'suertudo_w_mercado';
const W_DEFAULT = 0.5; // placeholder: calibralo con la tabla "Mezcla con la cuota" de walkforward.html

function guardarEstado(leagueKey, homeTeam, awayTeam) {
  try { localStorage.setItem(ESTADO_KEY, JSON.stringify({ liga: leagueKey, local: homeTeam, visitante: awayTeam })); } catch (e) {}
}
function leerEstado() {
  try { const raw = localStorage.getItem(ESTADO_KEY); return raw ? JSON.parse(raw) : null; } catch (e) { return null; }
}
function leerW() {
  try {
    const v = parseFloat(localStorage.getItem(W_KEY));
    return Number.isFinite(v) && v >= 0 && v <= 1 ? v : W_DEFAULT;
  } catch (e) { return W_DEFAULT; }
}
function guardarW(v) { try { localStorage.setItem(W_KEY, String(v)); } catch (e) {} }

function parseCuota(txt) {
  const n = parseFloat(String(txt == null ? '' : txt).replace(',', '.'));
  return Number.isFinite(n) && n > 1 ? +n.toFixed(2) : null;
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

  // Estado de la simulación en pantalla
  let ultimo = null;          // { base, ligaKey }  (base = probabilidades del modelo, con shrink)
  let cuotasPick = {};        // key de pick → cuota de la casa
  let mercado1x2 = null;      // { local, empate, visitante } cuotas 1X2 de la casa
  let wMercado = leerW();

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
      html += '<div style="font-size:0.72rem;">Stake base: ' + stake + '% de la banca (Kelly/4 por pick al cargar la cuota)</div>';
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
      cuotasPick = {};
      mercado1x2 = null;
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

  function fila(label, prob, key) {
    const color = getColor(prob);
    const pct = Math.max(0, Math.min(100, prob));
    const check = key ? '<input type="checkbox" class="pick-check" data-key="' + key + '" style="width:16px;height:16px;flex-shrink:0;accent-color:#3ecf8e;margin-right:10px;">' : '';
    return '<div class="prob-row" style="display:flex;align-items:center;">' + check +
      '<div style="flex:1;min-width:0;"><div class="prob-row-top"><span>' + label + '</span><span class="prob" style="color:' + color + '">' + fmt(prob) + '%</span></div>' +
      '<div class="semaforo-track"><div class="semaforo-fill" style="width:' + pct + '%;background:' + color + '"></div></div></div></div>';
  }

  // Texto de valor para un pick: cuota mínima, o EV + Kelly/4 si ya hay cuota.
  function textoValor(prob, cuota, mercado) {
    if (cuota == null) {
      const min = cuotaMinima(prob, mercado);
      return { texto: min == null ? '' : 'cuota mín. con valor: ' + min.toFixed(2), color: 'var(--text-dim)' };
    }
    const v = valorPick(prob, cuota, mercado);
    if (v.ev == null) return { texto: '', color: 'var(--text-dim)' };
    if (v.pasa) {
      const k = v.kelly != null ? ' · Kelly/4 ' + v.kelly + '%' : '';
      return { texto: 'EV ' + v.ev.toFixed(2) + ' ✅ valor' + k, color: 'var(--green)' };
    }
    return { texto: 'EV ' + v.ev.toFixed(2) + ' ❌ sin valor (mín. ' + cuotaMinima(prob, mercado).toFixed(2) + ')', color: 'var(--red)' };
  }

  function actualizarEV(input) {
    const key = input.dataset.key;
    const prob = parseFloat(input.dataset.prob);
    const mercado = input.dataset.mercado;
    const cuota = parseCuota(input.value);
    if (cuota == null) delete cuotasPick[key]; else cuotasPick[key] = cuota;
    const out = document.getElementById('ev-' + key);
    if (!out) return;
    const t = textoValor(prob, cuota, mercado);
    out.textContent = t.texto;
    out.style.color = t.color;
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
      return '<div class="card" style="border:2px solid var(--red);"><h3 style="color:var(--red);">❌ NO APOSTAR EN ESTA LIGA</h3><p style="color:var(--chalk-dim); margin:8px 0 0; font-size:0.9rem;">Esta liga pierde contra cuota. Usala solo para análisis.</p></div>';
    }

    if (picks.length === 0) {
      return '<div class="card" style="border:2px solid var(--line); opacity:0.8;"><h3>🎯 Mejores picks para este partido</h3>' +
        '<p style="color:var(--chalk-dim); margin:8px 0 0; font-size:0.9rem;">Sin picks. Ningún mercado habilitado supera los umbrales.</p>' +
        '<p style="color:var(--chalk-dim); margin:6px 0 0; font-size:0.72rem;">' + umbrales + '</p></div>';
    }

    const filas = picks.map(p => {
      const cuota = cuotasPick[p.key] != null ? cuotasPick[p.key] : null;
      const t = textoValor(p.prob, cuota, p.mercado);
      return '<div class="prob-row">' +
        '<div style="display:flex;align-items:center;gap:10px;">' +
          '<input type="checkbox" class="pick-check" data-key="' + p.key + '" checked style="width:18px;height:18px;flex-shrink:0;accent-color:#3ecf8e;">' +
          '<div style="flex:1;min-width:0;">' +
            '<div class="prob-row-top"><span>✅ ' + p.label + '</span><span class="prob" style="color:' + getColor(p.prob) + '">' + fmt(p.prob) + '%</span></div>' +
            '<div class="semaforo-track"><div class="semaforo-fill" style="width:' + p.prob + '%;background:' + getColor(p.prob) + '"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="odds-line">' +
          '<span>Cuota casa</span>' +
          '<input type="text" inputmode="decimal" class="odds-input" placeholder="ej. 1.85" value="' + (cuota != null ? cuota : '') + '" data-key="' + p.key + '" data-prob="' + p.prob + '" data-mercado="' + p.mercado + '">' +
          '<span class="ev-out" id="ev-' + p.key + '" style="color:' + t.color + '">' + t.texto + '</span>' +
        '</div>' +
      '</div>';
    }).join('');

    return '<div class="card" style="border:2px solid var(--green);"><h3>🎯 Mejores picks <small>(' + picks.length + ')</small></h3>' + filas +
      '<p style="color:var(--chalk-dim); margin:10px 0 0; font-size:0.72rem;">' + umbrales + '<br>Cargá la cuota: solo vale la pena si el EV pasa el filtro del mercado.</p></div>';
  }

  function renderMercadoCard(base, mix) {
    const m = mercado1x2 || {};
    const v = (k) => (m[k] != null ? m[k] : '');
    let info = '';
    if (mix && mix.aplicado) {
      info = '<p style="margin:10px 0 0; font-size:0.78rem; color:var(--green);">Mezcla activa (mercado ' + Math.round(mix.w * 100) + '%): ' +
        'L ' + fmt(mix.resultProbs.local) + '% · E ' + fmt(mix.resultProbs.empate) + '% · V ' + fmt(mix.resultProbs.visitante) + '%' +
        '<br><span style="color:var(--chalk-dim);">Modelo puro: L ' + fmt(base.resultProbs.local) + '% · E ' + fmt(base.resultProbs.empate) + '% · V ' + fmt(base.resultProbs.visitante) + '%' +
        ' · Mercado sin margen: L ' + fmt(mix.mercado[0]) + '% · E ' + fmt(mix.mercado[1]) + '% · V ' + fmt(mix.mercado[2]) + '%</span></p>';
    }
    return '<div class="card"><h3>💱 Cuotas 1X2 de la casa <small>(opcional)</small></h3>' +
      '<div class="field-row" style="grid-template-columns:1fr 1fr 1fr; margin-bottom:8px;">' +
        '<input type="text" inputmode="decimal" id="m-local" placeholder="Local" value="' + v('local') + '" style="padding:8px;text-align:center;">' +
        '<input type="text" inputmode="decimal" id="m-empate" placeholder="Empate" value="' + v('empate') + '" style="padding:8px;text-align:center;">' +
        '<input type="text" inputmode="decimal" id="m-visitante" placeholder="Visitante" value="' + v('visitante') + '" style="padding:8px;text-align:center;">' +
      '</div>' +
      '<div class="odds-line" style="margin-top:0;"><span>Peso del mercado (0–1)</span>' +
        '<input type="text" inputmode="decimal" id="m-w" class="odds-input" value="' + wMercado + '" style="width:80px;">' +
      '</div>' +
      '<div style="margin-top:10px; display:flex; gap:8px;"><button id="aplicar-mercado">Mezclar con mercado</button>' +
        '<button id="limpiar-mercado" style="background:var(--surface-2); color:var(--text);">Quitar</button></div>' +
      info +
      '<p style="margin:8px 0 0; font-size:0.72rem; color:var(--chalk-dim); line-height:1.5;">Mezcla = (1−w)·modelo + w·cuota sin margen. Elegí w con la tabla "Mezcla con la cuota" de walkforward.html; 0.5 es un valor de arranque, no un óptimo.</p></div>';
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

  function datosActuales() {
    const base = ultimo.base;
    if (!mercado1x2) return { data: base, mix: null };
    const mix = mezclarConMercado(base.resultProbs, mercado1x2, wMercado);
    if (!mix.aplicado) return { data: base, mix: mix };
    return { data: Object.assign({}, base, { resultProbs: mix.resultProbs }), mix: mix };
  }

  function render() {
    if (!ultimo) return;
    const d = datosActuales();
    displayResults(d.data, ultimo.ligaKey, d.mix);
  }

  function displayResults(data, ligaKey, mix) {
    const saveCard = '<div class="card" style="border:2px solid var(--accent);"><h3>📝 ¿Qué apostás?</h3>' +
      '<p style="color:var(--chalk-dim); font-size:0.75rem; margin:0 0 10px; line-height:1.5;">Tildá todo lo que vayas a jugar: los picks de arriba (ya vienen tildados) y/o cualquier mercado de las tarjetas de abajo. Las cuotas que cargaste se guardan con la entrada.</p>' +
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
      renderMercadoCard(ultimo.base, mix) +
      renderPicksCard(data, ligaKey) +
      saveCard +
      '<div class="card"><h3>Resultado 1X2' + (mix && mix.aplicado ? ' <small>(mezclado con mercado)</small>' : '') + '</h3>' +
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

  // ---------- acciones (delegadas: sobreviven a los re-render) ----------
  function aplicarMercado() {
    const c = {
      local: parseCuota(document.getElementById('m-local').value),
      empate: parseCuota(document.getElementById('m-empate').value),
      visitante: parseCuota(document.getElementById('m-visitante').value),
    };
    const w = parseFloat(String(document.getElementById('m-w').value).replace(',', '.'));
    if (Number.isFinite(w) && w >= 0 && w <= 1) { wMercado = w; guardarW(w); }
    if (!c.local || !c.empate || !c.visitante) {
      alert('Cargá las tres cuotas 1X2 (mayores a 1).');
      return;
    }
    mercado1x2 = c;
    render();
  }

  function guardarSeleccion() {
    const st = document.getElementById('guardar-status');
    if (!st || !ultimo) return;
    const elegidos = [...new Set([...document.querySelectorAll('.pick-check:checked')].map(c => c.dataset.key))];
    if (!elegidos.length) { st.textContent = '⚠️ Tildá al menos un mercado para guardar.'; st.style.color = 'var(--yellow)'; return; }
    const cuotas = {};
    if (mercado1x2) { cuotas.local = mercado1x2.local; cuotas.empate = mercado1x2.empate; cuotas.visitante = mercado1x2.visitante; }
    for (const k of elegidos) if (cuotasPick[k] != null) cuotas[k] = cuotasPick[k];
    try {
      // Se guarda el modelo PURO (sin mezcla) para poder evaluarlo contra la cuota después.
      const r = agregarEntrada(entradaDesdeSimulacion(ultimo.base, ultimo.ligaKey, cuotas, elegidos));
      const n = elegidos.length;
      st.textContent = (r.reemplazada ? '✅ Actualizada con ' : '✅ Guardada con ') + n + ' seleccionado' + (n > 1 ? 's' : '') + '. Total: ' + r.total + '.';
      st.style.color = 'var(--green)';
    } catch (e) {
      st.textContent = '❌ No se pudo guardar: ' + e.message;
      st.style.color = 'var(--red)';
    }
  }

  predictionsContent.addEventListener('click', (ev) => {
    const t = ev.target && ev.target.closest ? ev.target.closest('button') : null;
    if (!t) return;
    if (t.id === 'guardar-picks') guardarSeleccion();
    else if (t.id === 'aplicar-mercado') aplicarMercado();
    else if (t.id === 'limpiar-mercado') { mercado1x2 = null; render(); }
  });

  predictionsContent.addEventListener('input', (ev) => {
    const t = ev.target;
    if (t && t.classList && t.classList.contains('odds-input') && t.dataset && t.dataset.key) actualizarEV(t);
  });

  populateLeagues();
  restaurarEstado();
});
