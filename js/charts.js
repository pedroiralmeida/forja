// Gráficos SVG leves: linha temporal e colunas. Com cruz + tooltip ao passar/tocar.
import { esc, fmtNum, fmtDate, todayISO, DAY_MS } from './util.js';

function niceTicks(min, max, count = 4) {
  const span = max - min || 1;
  const raw = span / count;
  const mag = Math.pow(10, Math.floor(Math.log10(raw)));
  const err = raw / mag;
  const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag;
  const lo = Math.floor(min / step) * step;
  const hi = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = lo; v <= hi + step / 2; v += step) ticks.push(Math.round(v * 1000) / 1000);
  return { lo, hi, ticks };
}

const isoOf = (ms) => todayISO(new Date(ms));

function observe(el, draw) {
  if (el._ro) el._ro.disconnect();
  let lastW = 0;
  const ro = new ResizeObserver(() => {
    const w = el.clientWidth;
    if (Math.abs(w - lastW) > 4) {
      lastW = w;
      draw();
    }
  });
  ro.observe(el);
  el._ro = ro;
}

// opts: { series:[{name,color,points:[{x,y,tip?}],line?,dots?,endLabel?}], refs:[{y,label,color}], height, yFmt, empty, includeRefs }
export function lineChart(el, opts) {
  el.classList.add('chart');
  const yFmt = opts.yFmt || ((v) => fmtNum(v));
  const draw = () => {
    const all = opts.series.flatMap((s) => s.points);
    if (!all.length) {
      el.innerHTML = `<p class="chart-empty">${esc(opts.empty || 'Ainda sem dados.')}</p>`;
      return;
    }
    const W = Math.max(260, el.clientWidth || 320);
    const H = opts.height || 190;
    const refs = opts.refs || [];
    const m = { l: 38, r: refs.length ? 48 : 16, t: 14, b: 26 };
    let xmin = Math.min(...all.map((p) => p.x));
    let xmax = Math.max(...all.map((p) => p.x));
    if (xmax - xmin < 6 * DAY_MS) {
      const c = (xmin + xmax) / 2;
      xmin = c - 3.5 * DAY_MS;
      xmax = c + 3.5 * DAY_MS;
    }
    const ys = all.map((p) => p.y);
    if (opts.includeRefs) refs.forEach((r) => ys.push(r.y));
    let ymin = Math.min(...ys);
    let ymax = Math.max(...ys);
    const pad = Math.max((ymax - ymin) * 0.12, opts.minSpan ? opts.minSpan / 2 : 1);
    ymin -= pad;
    ymax += pad;
    const { lo, hi, ticks } = niceTicks(ymin, ymax, 4);
    const X = (x) => m.l + ((x - xmin) / (xmax - xmin)) * (W - m.l - m.r);
    const Y = (y) => m.t + (1 - (y - lo) / (hi - lo)) * (H - m.t - m.b);
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opts.label || '')}">`;
    for (const t of ticks) {
      svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/>`;
      svg += `<text x="${m.l - 6}" y="${Y(t) + 4}" text-anchor="end" class="axis">${esc(yFmt(t))}</text>`;
    }
    const xt = [xmin, (xmin + xmax) / 2, xmax];
    xt.forEach((x, i) => {
      const anchor = i === 0 ? 'start' : i === 2 ? 'end' : 'middle';
      svg += `<text x="${X(x)}" y="${H - 6}" text-anchor="${anchor}" class="axis">${esc(fmtDate(isoOf(x)))}</text>`;
    });
    for (const r of refs) {
      if (r.y < lo || r.y > hi) continue;
      svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(r.y)}" y2="${Y(r.y)}" class="ref" style="stroke:${r.color}"/>`;
      svg += `<text x="${W - m.r + 6}" y="${Y(r.y) + 4}" class="axis ref-label">${esc(r.label)}</text>`;
    }
    opts.series.forEach((s) => {
      const pts = s.points.slice().sort((a, b) => a.x - b.x);
      if (s.line !== false && pts.length > 1) {
        const d = pts.map((p, i) => `${i ? 'L' : 'M'}${X(p.x).toFixed(1)},${Y(p.y).toFixed(1)}`).join('');
        svg += `<path d="${d}" class="line" style="stroke:${s.color}"/>`;
      }
      if (s.dots || pts.length === 1) {
        for (const p of pts) svg += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4" class="dot" style="fill:${s.color}"/>`;
      } else if (pts.length) {
        const p = pts[pts.length - 1];
        svg += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="4" class="dot" style="fill:${s.color}"/>`;
      }
    });
    svg += `<line class="cross" x1="0" x2="0" y1="${m.t}" y2="${H - m.b}" visibility="hidden"/>`;
    svg += `<g class="hl"></g>`;
    svg += `<rect class="hit" x="${m.l}" y="0" width="${W - m.l - m.r}" height="${H}" fill="transparent"/>`;
    svg += `</svg>`;
    el.innerHTML = svg + '<div class="chart-tip" hidden></div>';

    const svgEl = el.querySelector('svg');
    const cross = svgEl.querySelector('.cross');
    const hl = svgEl.querySelector('.hl');
    const tip = el.querySelector('.chart-tip');
    const primary = opts.series[opts.primary || 0].points.slice().sort((a, b) => a.x - b.x);
    const move = (ev) => {
      const rect = svgEl.getBoundingClientRect();
      const px = ((ev.clientX - rect.left) / rect.width) * W;
      const xv = xmin + ((px - m.l) / (W - m.l - m.r)) * (xmax - xmin);
      const pool = primary.length ? primary : all;
      let best = pool[0];
      for (const p of pool) if (Math.abs(p.x - xv) < Math.abs(best.x - xv)) best = p;
      const cx = X(best.x);
      cross.setAttribute('x1', cx);
      cross.setAttribute('x2', cx);
      cross.setAttribute('visibility', 'visible');
      let rows = '';
      let marks = '';
      opts.series.forEach((s) => {
        const p = s.points.find((q) => isoOf(q.x) === isoOf(best.x));
        if (!p) return;
        marks += `<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="5.5" class="dot hot" style="fill:${s.color}"/>`;
        rows += `<div class="tip-row"><i style="background:${s.color}"></i><span>${esc(s.name || '')}</span><b>${esc(p.tip || yFmt(p.y))}</b></div>`;
      });
      hl.innerHTML = marks;
      tip.innerHTML = `<div class="tip-date">${esc(fmtDate(isoOf(best.x), { weekday: 'short', day: 'numeric', month: 'short' }))}</div>${rows}`;
      tip.hidden = false;
      const left = (cx / W) * rect.width;
      const tw = tip.offsetWidth;
      tip.style.left = Math.min(Math.max(0, left - tw / 2), rect.width - tw) + 'px';
    };
    const leave = () => {
      cross.setAttribute('visibility', 'hidden');
      hl.innerHTML = '';
      tip.hidden = true;
    };
    const hit = svgEl.querySelector('.hit');
    hit.addEventListener('pointermove', move);
    hit.addEventListener('pointerdown', move);
    hit.addEventListener('pointerleave', leave);
  };
  draw();
  observe(el, draw);
}

// opts: { bars:[{label, value, tip}], color, height, yFmt, empty }
export function barChart(el, opts) {
  el.classList.add('chart');
  const yFmt = opts.yFmt || ((v) => fmtNum(v));
  const draw = () => {
    const bars = opts.bars;
    if (!bars.length || bars.every((b) => !b.value)) {
      el.innerHTML = `<p class="chart-empty">${esc(opts.empty || 'Ainda sem dados.')}</p>`;
      return;
    }
    const W = Math.max(260, el.clientWidth || 320);
    const H = opts.height || 150;
    const m = { l: 30, r: 8, t: 18, b: 24 };
    const max = Math.max(...bars.map((b) => b.value), 1);
    const { hi, ticks } = niceTicks(0, max, 3);
    const band = (W - m.l - m.r) / bars.length;
    const bw = Math.min(24, band * 0.6);
    const Y = (y) => m.t + (1 - y / hi) * (H - m.t - m.b);
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="${esc(opts.label || '')}">`;
    for (const t of ticks) {
      svg += `<line x1="${m.l}" x2="${W - m.r}" y1="${Y(t)}" y2="${Y(t)}" class="grid"/>`;
      svg += `<text x="${m.l - 6}" y="${Y(t) + 4}" text-anchor="end" class="axis">${esc(yFmt(t))}</text>`;
    }
    bars.forEach((b, i) => {
      const cx = m.l + band * i + band / 2;
      const y0 = Y(0);
      const y1 = Y(b.value);
      const h = y0 - y1;
      if (h > 0.5) {
        const r = Math.min(4, h, bw / 2);
        const x = cx - bw / 2;
        const d = `M${x},${y0}V${y1 + r}Q${x},${y1} ${x + r},${y1}H${x + bw - r}Q${x + bw},${y1} ${x + bw},${y1 + r}V${y0}Z`;
        svg += `<path d="${d}" class="bar" style="fill:${opts.color}"/>`;
      }
      if (i === bars.length - 1 && b.value) svg += `<text x="${cx}" y="${y1 - 5}" text-anchor="middle" class="axis val">${esc(yFmt(b.value))}</text>`;
      if (i % Math.ceil(bars.length / 6) === 0 || i === bars.length - 1) {
        svg += `<text x="${cx}" y="${H - 6}" text-anchor="middle" class="axis">${esc(b.label)}</text>`;
      }
      svg += `<rect x="${cx - band / 2}" y="0" width="${band}" height="${H}" fill="transparent" class="bar-hit" data-i="${i}"/>`;
    });
    svg += '</svg>';
    el.innerHTML = svg + '<div class="chart-tip" hidden></div>';
    const tip = el.querySelector('.chart-tip');
    const svgEl = el.querySelector('svg');
    const show = (ev) => {
      const t = ev.target.closest('.bar-hit');
      if (!t) return;
      const b = bars[Number(t.dataset.i)];
      tip.innerHTML = `<div class="tip-date">${esc(b.label)}</div><div class="tip-row"><i style="background:${opts.color}"></i><b>${esc(b.tip || yFmt(b.value))}</b></div>`;
      tip.hidden = false;
      const rect = svgEl.getBoundingClientRect();
      const cx = ((m.l + band * Number(t.dataset.i) + band / 2) / W) * rect.width;
      const tw = tip.offsetWidth;
      tip.style.left = Math.min(Math.max(0, cx - tw / 2), rect.width - tw) + 'px';
    };
    svgEl.addEventListener('pointermove', show);
    svgEl.addEventListener('pointerdown', show);
    svgEl.addEventListener('pointerleave', () => { tip.hidden = true; });
  };
  draw();
  observe(el, draw);
}
