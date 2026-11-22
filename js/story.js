// Imagem do dia para as histórias do Instagram e do WhatsApp (PNG de 1080 × 1920).
// Desenhada num canvas com a letra da app: treino com os exercícios, peso, proteína, creatina, sono e refeições.
import { DAYS, MEAL_SLOTS } from './data.js';
import * as E from './engine.js';
import { normMeal, multLabel } from './protein.js';
import { modal, toast } from './ui.js';
import { fmtNum, fmt1, fmtDuration, isoToMs, addDays, esc, fmtDate } from './util.js';

const W = 1080;
const H = 1920;
// O Instagram tapa o topo (barra de progresso e perfil) e o fundo (caixa de resposta)
const TOP = 220;
const BOTTOM = 260;
const X = 64;
const CW = W - 2 * X;
const GAP = 32;
const C = {
  bg: '#1C2026', bg2: '#13161A', surface: '#252A31', line: '#3B424C',
  ink: '#EEF0F2', ink2: '#B1B8C1', muted: '#838C96', yellow: '#F2B90C', green: '#3DB46D',
};
const EMOJI = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji"';
const F = (weight, px, cond = false) => `${weight} ${px}px ${cond ? '"Barlow Condensed", ' : ''}"Barlow", ${EMOJI}, sans-serif`;

// ---------- Dados do dia ----------
function creatineStreakAt(iso) {
  let n = 0;
  for (let d = iso; E.habitsFor(d).creatine; d = addDays(d, -1)) n++;
  return n;
}

function workOf(e) {
  return (e.sets || []).filter((s) => s.kind !== 'warm' && s.done !== false && s.reps !== null && s.reps !== undefined);
}

function repsList(sets, unit = '') {
  const r = sets.map((s) => s.reps);
  if (r.length > 1 && r.every((x) => x === r[0])) return `${r.length}×${fmtNum(r[0])}${unit}`;
  return r.map((x) => `${fmtNum(x)}${unit}`).join(', ');
}

// Séries de um exercício: "65 kg · 3×4", "24 kg · 12, 12, 11", "banda 20 kg · 3, 3", "15 s, 15 s".
// full agrupa por peso ("8 kg · 20 / 10 kg · 20, 18"); a versão curta junta os pesos ("8–10 kg · 20, 20, 18").
function setsSummary(e, full = true) {
  const info = E.exInfo(e.ex, e);
  const sets = workOf(e);
  if (!sets.length) return '';
  const unit = info.kind === 'hold' ? ' s' : '';
  const key = (s) => {
    if (info.kind === 'weighted_bw') return s.w ? `+${fmtNum(s.w)} kg` : '';
    if (info.kind === 'bodyweight' || info.kind === 'band' || info.kind === 'hold') return s.band ? `banda ${s.band}` : '';
    return s.w !== null && s.w !== undefined ? `${fmtNum(s.w)} kg` : '';
  };
  if (!full) {
    const ws = sets.map((s) => s.w).filter((w) => w !== null && w !== undefined);
    const usesW = info.kind !== 'bodyweight' && info.kind !== 'band' && info.kind !== 'hold' && ws.length;
    if (!usesW) return `${repsList(sets, unit)}${sets.some((x) => x.band) ? ' (com banda)' : ''}`;
    const lo = Math.min(...ws);
    const hi = Math.max(...ws);
    const plus = info.kind === 'weighted_bw' ? '+' : '';
    return `${plus}${lo === hi ? fmtNum(lo) : `${fmtNum(lo)}–${fmtNum(hi)}`} kg · ${repsList(sets, unit)}`;
  }
  const groups = [];
  for (const s of sets) {
    const k = key(s);
    const g = groups[groups.length - 1];
    if (g && g.k === k) g.sets.push(s);
    else groups.push({ k, sets: [s] });
  }
  // Banda de ajuda: "4×3 / 3 com banda 20 kg"
  const band = (k) => k.startsWith('banda ');
  return groups
    .map((g) => (!g.k ? repsList(g.sets, unit) : band(g.k) ? `${repsList(g.sets, unit)} com ${g.k}` : `${g.k} · ${repsList(g.sets, unit)}`))
    .join('  /  ');
}

function workoutTitle(s) {
  const d = DAYS[s.day];
  if (!d) return 'Treino livre';
  return d.manual ? d.label : d.title;
}

function foodsText(items) {
  const merged = [];
  for (const it of items) {
    const k = it.food || it.name;
    const m = merged.find((x) => x.k === k);
    if (m) m.qty += it.qty || 1;
    else merged.push({ k, name: it.name, qty: it.qty || 1 });
  }
  return merged.map((m) => (m.qty === 1 ? m.name : m.qty < 1 ? `${multLabel(m.qty)} ${m.name}` : `${multLabel(m.qty)}× ${m.name}`)).join(' + ');
}

export function dayStats(iso) {
  const sess = E.sessions().filter((s) => s.date === iso).sort((a, b) => (a.startedAt || 0) - (b.startedAt || 0));
  const h = E.habitsFor(iso);
  const bw = E.bodyweightEntries().find((b) => b.date === iso);
  const runs = E.runs().filter((r) => r.date === iso);
  const foods = h.foods || [];
  const protein = Math.round(h.protein || foods.reduce((a, f) => a + (f.g || 0), 0));
  const meals = [...MEAL_SLOTS.map((m) => m.id), 'none']
    .map((id) => {
      const items = foods.filter((f) => (normMeal(f.meal) || 'none') === id);
      if (!items.length) return null;
      const name = id === 'none' ? 'Outros' : MEAL_SLOTS.find((m) => m.id === id).name;
      return { name, g: Math.round(items.reduce((a, f) => a + (f.g || 0), 0)), text: foodsText(items) };
    })
    .filter(Boolean);
  const exercises = sess.flatMap((s) => s.exercises).filter((e) => workOf(e).length);
  return {
    iso,
    sessions: sess,
    title: sess.length ? workoutTitle(sess[0]) : null,
    duration: sess.reduce((a, s) => a + (s.duration || (s.finishedAt && s.startedAt ? s.finishedAt - s.startedAt : 0)), 0),
    nSets: exercises.reduce((a, e) => a + workOf(e).length, 0),
    exercises: exercises.map((e) => ({ name: E.exInfo(e.ex, e).name, full: setsSummary(e, true), short: setsSummary(e, false) })),
    prs: sess.flatMap((s) => E.sessionPRs(s)).slice(0, 2),
    runs,
    bw: bw ? bw.kg : null,
    protein,
    proteinTarget: E.proteinTarget(),
    creatine: !!h.creatine,
    creatineStreak: h.creatine ? creatineStreakAt(iso) : 0,
    sleep: h.sleep !== null && h.sleep !== undefined ? `${fmtNum(h.sleep)} h` : ({ lt7: '< 7 h', '7to8': '7–8 h', ge8: '8 h+' })[E.sleepBand(h)] || null,
    meals,
  };
}

// ---------- Desenho ----------
function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) {
    ctx.roundRect(x, y, w, h, r);
  } else {
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }
}

function fillRR(ctx, x, y, w, h, r, color) {
  rrect(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

function tw(ctx, s, font) {
  ctx.font = font;
  return ctx.measureText(s).width;
}

function text(ctx, s, x, y, font, color, align = 'left') {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(s, x, y);
}

// Maior tamanho (até max) com que o texto cabe na largura
function fitPx(ctx, s, maxW, weight, max, min, cond) {
  let px = max;
  while (px > min && tw(ctx, s, F(weight, px, cond)) > maxW) px -= 2;
  return px;
}

function wrap(ctx, s, maxW, font, maxLines) {
  const words = s.split(' ');
  const lines = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (tw(ctx, next, font) <= maxW || !cur) cur = next;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last && tw(ctx, `${last}…`, font) > maxW) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.replace(/[\s+,]+$/, '')}…`;
    return kept;
  }
  return lines;
}

// Cada bloco devolve a altura; com draw=false só mede
function headerBlock(ctx, d, y, draw) {
  const title = 'Balanço do dia 🫡';
  const px = fitPx(ctx, title, CW, 700, 124, 80, true);
  const date = new Date(isoToMs(d.iso)).toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long' });
  if (draw) {
    fillRR(ctx, X, y, 96, 10, 5, C.yellow);
    text(ctx, title, X - 4, y + 40 + px * 0.8, F(700, px, true), C.ink);
    text(ctx, date[0].toUpperCase() + date.slice(1), X, y + 40 + px + 50, F(500, 46), C.ink2);
  }
  return 40 + px + 64;
}

function tilesBlock(ctx, d, y, draw) {
  const tiles = [];
  if (d.bw) tiles.push({ label: 'Peso', value: fmt1(d.bw), unit: 'kg' });
  tiles.push({
    label: 'Proteína', value: String(d.protein), unit: 'g', sub: `meta ${d.proteinTarget} g`,
    meter: d.proteinTarget ? Math.min(1, d.protein / d.proteinTarget) : 0,
  });
  tiles.push({ label: 'Creatina', value: d.creatine ? 'Sim' : 'Não', sub: d.creatineStreak > 1 ? `${d.creatineStreak} dias seguidos` : '', check: d.creatine });
  if (d.sleep) tiles.push({ label: 'Sono', value: d.sleep });
  const h = 216;
  if (!draw) return h;
  const gap = 20;
  const w = (CW - gap * (tiles.length - 1)) / tiles.length;
  tiles.forEach((t, i) => {
    const x = X + i * (w + gap);
    const ix = x + 26;
    const iw = w - 52;
    fillRR(ctx, x, y, w, h, 26, C.surface);
    text(ctx, t.label, ix, y + 54, F(600, 30), C.ink2);
    if (t.check) {
      // visto verde ao lado do rótulo
      const cx = ix + tw(ctx, t.label, F(600, 30)) + 24;
      ctx.beginPath();
      ctx.arc(cx, y + 44, 14, 0, Math.PI * 2);
      ctx.fillStyle = C.green;
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(cx - 6, y + 44);
      ctx.lineTo(cx - 1.5, y + 49);
      ctx.lineTo(cx + 7, y + 39);
      ctx.strokeStyle = '#0E2416';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    const unitW = t.unit ? tw(ctx, ` ${t.unit}`, F(600, 42, true)) : 0;
    const px = fitPx(ctx, t.value, iw - unitW, 700, 92, 48, true);
    const vy = y + 140;
    text(ctx, t.value, ix, vy, F(700, px, true), C.ink);
    if (t.unit) text(ctx, ` ${t.unit}`, ix + tw(ctx, t.value, F(700, px, true)), vy, F(600, 42, true), C.ink2);
    if (t.sub) {
      const spx = fitPx(ctx, t.sub, iw, 500, 28, 20, false);
      text(ctx, t.sub, ix, y + 180, F(500, spx), C.muted);
    }
    if (t.meter !== undefined) {
      fillRR(ctx, ix, y + 196, iw, 6, 3, C.line);
      if (t.meter > 0) fillRR(ctx, ix, y + 196, Math.max(6, iw * t.meter), 6, 3, t.meter >= 1 ? C.green : C.yellow);
    }
  });
  return h;
}

function card(ctx, y, h, draw) {
  if (!draw) return;
  fillRR(ctx, X, y, CW, h, 30, C.surface);
  ctx.fillStyle = C.yellow;
  ctx.fillRect(X, y + 30, 8, h - 60);
}

const IX = X + 44;
const IW = CW - 44 - 36;

function rows(ctx, list, y, draw) {
  // list: [{name, full, short}] → linha com o nome à esquerda e as séries à direita
  const fName = F(600, 38);
  const fSets = F(600, 44, true);
  let cy = y;
  for (const r of list) {
    const nw = tw(ctx, r.name, fName);
    let s = r.full;
    if (nw + 28 + tw(ctx, s, fSets) > IW) s = r.short || r.full;
    const one = nw + 28 + tw(ctx, s, fSets) <= IW;
    const rh = one ? 66 : 110;
    if (draw) {
      ctx.fillStyle = C.line;
      ctx.fillRect(IX, cy, IW, 2);
      text(ctx, r.name, IX, cy + 47, fName, C.ink);
      text(ctx, s, IX + IW, cy + (one ? 47 : 92), fSets, C.ink2, 'right');
    }
    cy += rh;
  }
  return cy - y;
}

function workoutBlock(ctx, d, y, draw) {
  const fText = F(500, 34);
  let h = 34 + 30; // rótulo
  const title = d.title || (d.runs.length ? 'Corrida' : 'Dia de descanso');
  const right = d.sessions.length ? fmtDuration(d.duration) : '';
  const rightW = right ? tw(ctx, right, F(600, 50, true)) + 24 : 0;
  const tpx = fitPx(ctx, title, IW - rightW, 700, 56, 40, false);
  const titleY = y + h + 18 + tpx * 0.8;
  h += 18 + tpx + 26;
  const list = d.exercises.map((e) => ({ ...e }));
  for (const r of d.runs) list.push({ name: 'Corrida', full: `${fmt1(r.km)} km${r.min ? ` em ${r.min} min` : ''}` });
  let restLines = [];
  if (!list.length) restLines = wrap(ctx, 'Recuperar também faz parte do plano.', IW, fText, 2);
  const rowsY = y + h;
  h += list.length ? rows(ctx, list, rowsY, false) : restLines.length * 46;
  // Recordes do dia
  const prLines = d.prs.map((p) => wrap(ctx, p, IW - 44, F(500, 32), 2));
  const prY = y + h;
  if (prLines.length) h += 22 + 40 + prLines.reduce((a, l) => a + l.length * 42 + 8, 0);
  h += 30;
  if (draw) {
    card(ctx, y, h, true);
    text(ctx, 'Treino', IX, y + 34 + 30, F(600, 32), C.yellow);
    if (d.nSets) text(ctx, `${d.nSets} séries`, IX + IW, y + 34 + 30, F(500, 30), C.muted, 'right');
    text(ctx, title, IX, titleY, F(700, tpx), C.ink);
    if (right) text(ctx, right, IX + IW, titleY, F(600, 50, true), C.ink2, 'right');
    if (list.length) rows(ctx, list, rowsY, true);
    else restLines.forEach((l, i) => text(ctx, l, IX, rowsY + 34 + i * 46, fText, C.ink2));
    if (prLines.length) {
      ctx.fillStyle = C.line;
      ctx.fillRect(IX, prY, IW, 2);
      text(ctx, d.prs.length > 1 ? 'Recordes' : 'Recorde', IX, prY + 22 + 32, F(600, 32), C.yellow);
      let py = prY + 22 + 40;
      prLines.forEach((lines) => {
        text(ctx, '🏆', IX, py + 34, F(500, 30), C.ink);
        lines.forEach((l) => {
          text(ctx, l, IX + 44, py + 34, F(500, 32), C.ink);
          py += 42;
        });
        py += 8;
      });
    }
  }
  return h;
}

function mealsBlock(ctx, d, y, draw, foodLines) {
  if (!d.meals.length) return 0;
  const fName = F(600, 38);
  const fG = F(600, 44, true);
  const fFood = F(500, 32);
  let h = 34 + 30 + 24;
  const items = d.meals.map((m) => ({ ...m, lines: wrap(ctx, m.text, IW, fFood, foodLines) }));
  const rowsY = y + h;
  for (const m of items) h += 62 + m.lines.length * 40 + 12;
  h += 20;
  if (draw) {
    card(ctx, y, h, true);
    text(ctx, 'Refeições', IX, y + 34 + 30, F(600, 32), C.yellow);
    text(ctx, 'proteína aprox.', IX + IW, y + 34 + 30, F(500, 28), C.muted, 'right');
    let cy = rowsY;
    for (const m of items) {
      ctx.fillStyle = C.line;
      ctx.fillRect(IX, cy, IW, 2);
      text(ctx, m.name, IX, cy + 50, fName, C.ink);
      text(ctx, `${m.g} g`, IX + IW, cy + 50, fG, C.ink2, 'right');
      m.lines.forEach((l, i) => text(ctx, l, IX, cy + 62 + 30 + i * 40, fFood, C.ink2));
      cy += 62 + m.lines.length * 40 + 12;
    }
  }
  return h;
}

async function loadFonts() {
  if (!document.fonts || !document.fonts.load) return;
  const specs = ['500 40px "Barlow"', '600 40px "Barlow"', '700 40px "Barlow"', '600 40px "Barlow Condensed"', '700 40px "Barlow Condensed"'];
  await Promise.all(specs.map((s) => document.fonts.load(s).catch(() => null)));
}

export async function dayImageCanvas(iso) {
  await loadFonts();
  const d = dayStats(iso);
  const cv = document.createElement('canvas');
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext('2d');

  // Fundo: cinzento-escuro da app, com um brilho amarelo ténue no canto
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, C.bg);
  g.addColorStop(1, C.bg2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  const glow = ctx.createRadialGradient(W - 80, 120, 0, W - 80, 120, 760);
  glow.addColorStop(0, 'rgba(242, 185, 12, 0.13)');
  glow.addColorStop(1, 'rgba(242, 185, 12, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  const avail = H - TOP - BOTTOM;
  const blocks = (foodLines) => [
    (y, draw) => headerBlock(ctx, d, y, draw),
    (y, draw) => tilesBlock(ctx, d, y, draw),
    (y, draw) => workoutBlock(ctx, d, y, draw),
    (y, draw) => mealsBlock(ctx, d, y, draw, foodLines),
  ];
  const measure = (bs) => {
    const hs = bs.map((b) => b(0, false));
    return { hs, total: hs.reduce((a, x) => a + x, 0) + GAP * (hs.filter((x) => x > 0).length - 1) };
  };
  let bs = blocks(2);
  let m = measure(bs);
  if (m.total > avail / 0.85) {
    bs = blocks(1);
    m = measure(bs);
  }
  const s = Math.min(1, avail / m.total);
  const y0 = TOP + Math.max(0, (avail - m.total * s) * 0.4);
  ctx.save();
  ctx.translate((W - W * s) / 2, y0);
  ctx.scale(s, s);
  let y = 0;
  bs.forEach((b, i) => {
    if (!m.hs[i]) return;
    b(y, true);
    y += m.hs[i] + GAP;
  });
  ctx.restore();
  return cv;
}

export async function dayImageBlob(iso) {
  const cv = await dayImageCanvas(iso);
  return new Promise((resolve, reject) => cv.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob'))), 'image/png'));
}

function saveBlob(url, name) {
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

// Pré-visualização com Partilhar (lista das apps do telemóvel: Instagram, Guardar imagem) e Descarregar
export async function openDayImage(iso, word = 'do dia') {
  let blob;
  try {
    blob = await dayImageBlob(iso);
  } catch (err) {
    console.error(err);
    toast('Não foi possível criar a imagem');
    return;
  }
  const name = `balanco-do-dia-${iso}.png`;
  const url = URL.createObjectURL(blob);
  const file = typeof File === 'function' ? new File([blob], name, { type: 'image/png' }) : null;
  const canShare = !!(file && navigator.canShare && navigator.canShare({ files: [file] }));
  await modal({
    title: `Imagem ${word} para a história`,
    body: `<img class="story-preview" src="${url}" alt="Balanço do dia ${esc(fmtDate(iso))}: treino, peso, proteína, creatina e refeições">
      <p class="muted small story-hint">${canShare
        ? 'Partilhar abre a lista das apps: escolhe o Instagram, ou Guardar imagem para a teres nas fotografias.'
        : 'Descarrega a imagem e publica-a na história do Instagram ou no estado do WhatsApp.'}</p>
      <div class="story-actions">
        ${canShare ? '<button class="btn primary" data-story="share">Partilhar</button>' : ''}
        <button class="btn ${canShare ? 'secondary' : 'primary'}" data-story="download">Descarregar</button>
      </div>`,
    actions: [{ label: 'Fechar', value: null }],
    autofocus: false,
    onMount: (wrap) => {
      wrap.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-story]');
        if (!b) return;
        if (b.dataset.story === 'share') {
          try {
            await navigator.share({ files: [file] });
          } catch (err) {
            if (err && err.name !== 'AbortError') {
              saveBlob(url, name);
              toast('Não deu para partilhar: a imagem foi descarregada');
            }
          }
        } else {
          saveBlob(url, name);
          toast('Imagem descarregada');
        }
      });
    },
  });
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
