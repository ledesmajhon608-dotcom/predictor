import { LIGAS, TEAM_STRENGTH_DB, HOME_ADVANTAGE, DEFAULT_HOME_ADV } from './leagues.js';
import { pesoPorAntiguedad, recalcularRatings } from './ratings.js';

// La lógica pura vive en ratings.js (para que calibrate.js y el backtest la
// compartan sin tocar el DOM de esta página). Se re-exporta por compatibilidad.
export { pesoPorAntiguedad, recalcularRatings };

// ---------- Interfaz (solo corre en el navegador) ----------

if (typeof document !== 'undefined') {
  const fileInput = document.getElementById('historial-file');
  const fileInfo = document.getElementById('file-info');
  const halflifeInput = document.getElementById('halflife');
  const minMatchesInput = document.getElementById('minmatches');
  const runBtn = document.getElementById('run-btn');
  const resultsSection = document.getElementById('results');
  const resultsContent = document.getElementById('results-content');

  let historial = null;

  fileInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    runBtn.disabled = true;
    historial = null;
    if (!file) { fileInfo.textContent = ''; return; }
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      if (!data.leagueKey || !LIGAS[data.leagueKey]) {
        fileInfo.textContent = '❌ El archivo no tiene una liga reconocida (leagueKey).';
        return;
      }
      if (!Array.isArray(data.partidos) || data.partidos.length === 0) {
        fileInfo.textContent = '❌ El archivo no tiene partidos.';
        return;
      }
      historial = data;
      fileInfo.textContent = `✅ ${data.liga || data.leagueKey} — ${data.partidos.length} partidos cargados.`;
      runBtn.disabled = false;
    } catch (err) {
      fileInfo.textContent = '❌ No se pudo leer el archivo: ' + err.message;
    }
  });

  runBtn.addEventListener('click', () => {
    if (!historial) return;
    const halflifeDias = Math.max(1, +halflifeInput.value || 60);
    const minMatches = Math.max(1, +minMatchesInput.value || 3);

    const homeAdv = HOME_ADVANTAGE[historial.leagueKey] ?? DEFAULT_HOME_ADV;
    const { ligaAvgPorLado, equipos } = recalcularRatings(historial.partidos, { halflifeDias, minMatches, homeAdv });

    if (!ligaAvgPorLado || equipos.length === 0) {
      resultsContent.innerHTML = `<div class="card"><h3>Sin datos suficientes</h3><p style="color:var(--chalk-dim)">Bajá el mínimo de partidos o cargá un historial más grande.</p></div>`;
      resultsSection.style.display = 'block';
      return;
    }

    renderResultados(equipos, historial.leagueKey);
  });

  function renderResultados(equipos, leagueKey) {
    const viejo = TEAM_STRENGTH_DB[leagueKey] || {};

    const filasHtml = equipos.map(f => {
      const v = viejo[f.team];
      const flechaAtk = v ? (f.atk >= v.atk ? '↑' : '↓') : '';
      const flechaDef = v ? (f.def >= v.def ? '↑' : '↓') : '';
      return `
        <div class="compare-row">
          <span>${f.team}</span>
          <span class="grid-plain">${f.atk} ${flechaAtk}</span>
          <span class="grid-plain">${f.def} ${flechaDef}</span>
          <span class="grid-plain">${f.partidos}p</span>
        </div>`;
    }).join('');

    const nuevoObj = {};
    for (const f of equipos) nuevoObj[f.team] = { atk: f.atk, def: f.def };
    const snippet = JSON.stringify(nuevoObj, null, 2);

    resultsContent.innerHTML = `
      <div class="card">
        <h3>${equipos.length} equipos recalculados</h3>
        <div class="compare-row compare-head"><span></span><span>Ataque</span><span>Defensa</span><span>Muestras</span></div>
        ${filasHtml}
      </div>
      <div class="card">
        <h3>Para pegar en leagues.js</h3>
        <p style="color:var(--chalk-dim); font-size:0.85rem; margin-top:0;">
          Reemplazá a mano los valores de estos equipos dentro de <code>TEAM_STRENGTH_DB["${leagueKey}"]</code>.
          Esto no te toca el archivo solo — vos decidís qué pegar.
        </p>
        <textarea readonly style="width:100%; min-height:220px; background:var(--surface-2); color:var(--chalk); border:1px solid var(--line); border-radius:8px; padding:10px; font-family:'IBM Plex Mono',monospace; font-size:0.78rem;">${snippet}</textarea>
      </div>
    `;
    resultsSection.style.display = 'block';
  }
}
