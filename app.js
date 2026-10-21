function guardarSeleccion() {
  const st = document.getElementById('guardar-status');
  if (!st || !ultimo) return;
  const elegidos = [...new Set([...document.querySelectorAll('.pick-check:checked')].map(c => c.dataset.key))];
  
  if (!elegidos.length) { 
    st.textContent = '⚠️ Tildá al menos un mercado para guardar.'; 
    st.style.color = 'var(--yellow)'; 
    return; 
  }

  // Si hay 2 o más picks, preguntamos cómo guardarlos
  let modo = 'simple';
  if (elegidos.length >= 2) {
    const respuesta = confirm(
      "Tenés " + elegidos.length + " picks tildados. ¿Cómo querés guardarlos?\n\n" +
      "Aceptar = COMBINADA (1 sola apuesta con todos los picks)\n" +
      "Cancelar = INDIVIDUALES (1 apuesta separada por cada pick)"
    );
    modo = respuesta ? 'combinada' : 'individual';
  }

  try {
    if (modo === 'combinada' || elegidos.length === 1) {
      // Guarda 1 sola entrada con todos los picks
      const r = agregarEntrada(entradaDesdeSimulacion(ultimo.base, ultimo.ligaKey, {}, elegidos));
      st.textContent = (r.reemplazada ? '🔄 Actualizada (ya existía) ' : '✅ Guardada NUEVA ') + 
                       (modo === 'combinada' ? 'combinada ' : '') +
                       '. Total: ' + r.total + '. Cargá la cuota en el registro.';
    } else {
      // Guarda N entradas, una por cada pick
      let nuevas = 0;
      let actualizadas = 0;
      for (const p of elegidos) {
        const r = agregarEntrada(entradaDesdeSimulacion(ultimo.base, ultimo.ligaKey, {}, [p]));
        if (r.reemplazada) actualizadas++; else nuevas++;
      }
      st.textContent = `✅ Guardadas ${nuevas} nuevas y ${actualizadas} actualizadas (individuales). Revisá el registro.`;
    }
    st.style.color = 'var(--green)';
  } catch (e) {
    st.textContent = '❌ No se pudo guardar: ' + e.message;
    st.style.color = 'var(--red)';
  }
}
