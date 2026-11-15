// Calculadora de discos e desenho da barra carregada
import { PLATE_STYLE } from './data.js';
import { fmtNum, esc } from './util.js';

export function platesFor(total, bar, available) {
  const res = { total, bar, plates: [], remainder: 0, ok: true };
  if (!(total > 0)) return { ...res, ok: false };
  let side = (total - bar) / 2;
  if (side < -1e-9) return { ...res, ok: false, remainder: total - bar };
  const sorted = [...available].sort((a, b) => b - a);
  for (const p of sorted) {
    while (side >= p - 1e-9) {
      res.plates.push(p);
      side = Math.round((side - p) * 1000) / 1000;
    }
  }
  res.remainder = Math.round(side * 2 * 1000) / 1000;
  return res;
}

export function plateText(res) {
  if (!res.ok) return res.remainder < 0 ? `Menos do que a barra (${fmtNum(res.bar)} kg).` : '';
  let t = res.plates.length ? `Por lado: ${res.plates.map(fmtNum).join(' + ')} kg` : 'Só a barra';
  if (res.remainder > 0) t += `. Faltam ${fmtNum(res.remainder)} kg que não dá para pôr com os teus discos`;
  return t;
}

// Barra vista de lado, com os discos dos dois lados
export function barbellSVG(res, { label = '' } = {}) {
  const W = 320;
  const H = 76;
  const cy = H / 2;
  const maxH = 66;
  const collarL = 104;
  const collarR = W - 104;
  let parts = '';
  // Manga e barra
  parts += `<rect x="14" y="${cy - 3.5}" width="${W - 28}" height="7" rx="3.5" class="bb-bar"/>`;
  parts += `<rect x="${collarL - 30}" y="${cy - 2}" width="${collarR - collarL + 60}" height="4" class="bb-shaft"/>`;
  parts += `<rect x="${collarL - 5}" y="${cy - 9}" width="5" height="18" rx="1.5" class="bb-collar"/>`;
  parts += `<rect x="${collarR}" y="${cy - 9}" width="5" height="18" rx="1.5" class="bb-collar"/>`;
  let xl = collarL - 6;
  let xr = collarR + 6;
  for (const p of res.plates || []) {
    const st = PLATE_STYLE[p] || { color: '#888', h: 0.4, w: 5 };
    const h = Math.max(16, st.h * maxH);
    const w = st.w;
    parts += `<rect x="${xl - w}" y="${cy - h / 2}" width="${w}" height="${h}" rx="2" style="fill:${st.color}" class="bb-plate"/>`;
    parts += `<rect x="${xr}" y="${cy - h / 2}" width="${w}" height="${h}" rx="2" style="fill:${st.color}" class="bb-plate"/>`;
    xl -= w + 1.5;
    xr += w + 1.5;
  }
  const aria = label || plateText(res);
  return `<svg class="barbell" viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(aria)}">${parts}</svg>`;
}
