// ============================================================================
// roi-ci.js — Intervalo de confianza del ROI (bootstrap + t-test)
// ============================================================================

function mediaSd(arr) {
  const n = arr.length;
  if (!n) return { media: null, sd: null };
  const media = arr.reduce((s, v) => s + v, 0) / n;
  if (n < 2) return { media, sd: null };
  return { media, sd: Math.sqrt(arr.reduce((s, v) => s + (v - media) ** 2, 0) / (n - 1)) };
}

export function rendimientos(picks) {
  return picks.filter(p => Number.isFinite(p.cuota) && p.cuota > 1 && p.hit != null)
    .map(p => p.hit ? (p.cuota - 1) : -1);
}

export function roiBootstrap(picks, { iteraciones = 2000, semilla = 42, nivel = 0.95 } = {}) {
  const r = rendimientos(picks);
  const n = r.length;
  if (n < 20) return { n, roi: null, ic: null, aviso: 'n<20: muestra insuficiente para IC fiable' };
  let s = semilla >>> 0;
  const rnd = () => { s |= 0; s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const medias = [];
  for (let it = 0; it < iteraciones; it++) {
    let suma = 0;
    for (let i = 0; i < n; i++) suma += r[Math.floor(rnd() * n)];
    medias.push(suma / n);
  }
  medias.sort((a, b) => a - b);
  const alpha = (1 - nivel) / 2;
  const roi = r.reduce((x, y) => x + y, 0) / n;
  return {
    n,
    roi: +(roi * 100).toFixed(2),
    ic: [+(medias[Math.floor(alpha * iteraciones)] * 100).toFixed(2),
         +(medias[Math.floor((1 - alpha) * iteraciones)] * 100).toFixed(2)],
  };
}

export function roiSignificativo(picks, nivel = 0.95) {
  const r = rendimientos(picks);
  const { media, sd } = mediaSd(r);
  if (media == null || sd == null || sd < 1e-9) return { n: r.length, t: null, significativo: false };
  const t = media / (sd / Math.sqrt(r.length));
  const crit = nivel === 0.90 ? 1.645 : 1.96;
  return { n: r.length, media: +(media * 100).toFixed(2), t: +t.toFixed(2), significativo: t > crit };
}
