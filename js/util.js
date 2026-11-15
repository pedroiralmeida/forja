// Pequenos utilitários partilhados

export const DAY_MS = 86400000;

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function now() {
  return Date.now();
}

// Data local no formato AAAA-MM-DD
export function todayISO(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function isoToDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function isoToMs(iso) {
  return isoToDate(iso).getTime();
}

export function addDays(iso, n) {
  const d = isoToDate(iso);
  d.setDate(d.getDate() + n);
  return todayISO(d);
}

export function daysBetween(aIso, bIso) {
  return Math.round((isoToMs(bIso) - isoToMs(aIso)) / DAY_MS);
}

// Segunda-feira da semana de uma data
export function weekStart(iso) {
  const d = isoToDate(iso);
  const dow = (d.getDay() + 6) % 7; // 0 = segunda
  d.setDate(d.getDate() - dow);
  return todayISO(d);
}

// Aceita "62,5" ou "62.5"
export function parseNum(v) {
  if (v === null || v === undefined) return null;
  const s = String(v).replace(',', '.').trim();
  if (s === '') return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

const nf = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 2 });
const nf1 = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export function fmtNum(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return nf.format(Math.round(n * 100) / 100);
}

export function fmt1(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  return nf1.format(n);
}

export function fmtSigned(n, digits = 1) {
  if (n === null || n === undefined || !Number.isFinite(n)) return '—';
  const s = new Intl.NumberFormat('pt-PT', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(Math.abs(n));
  if (Math.abs(n) < Math.pow(10, -digits) / 2) return s;
  return (n > 0 ? '+' : '−') + s;
}

export function fmtDate(iso, opts = { day: 'numeric', month: 'short' }) {
  if (!iso) return '';
  return new Intl.DateTimeFormat('pt-PT', opts).format(isoToDate(iso));
}

export function fmtDateLong(iso) {
  return fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'long' });
}

export function fmtMonthYear(ms) {
  return new Intl.DateTimeFormat('pt-PT', { month: 'long', year: 'numeric' }).format(new Date(ms));
}

export function fmtDuration(ms) {
  if (!ms || ms < 0) return '0 min';
  const min = Math.round(ms / 60000);
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h} h ${String(m).padStart(2, '0')}`;
}

export function fmtClock(sec) {
  sec = Math.max(0, Math.round(sec));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function roundTo(x, step) {
  if (!step) return x;
  return Math.round(x / step) * step;
}

export function clamp(x, a, b) {
  return Math.min(b, Math.max(a, x));
}

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function mean(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Regressão linear simples: devolve { slope, intercept }
export function linreg(points) {
  const n = points.length;
  if (n < 2) return null;
  const mx = mean(points.map((p) => p.x));
  const my = mean(points.map((p) => p.y));
  let num = 0;
  let den = 0;
  for (const p of points) {
    num += (p.x - mx) * (p.y - my);
    den += (p.x - mx) ** 2;
  }
  if (den === 0) return null;
  const slope = num / den;
  return { slope, intercept: my - slope * mx };
}

export function plural(n, one, many) {
  return n === 1 ? one : many;
}
