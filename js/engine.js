// Cálculos: 1RM estimado, progressão, prescrições, marcos, objetivos, peso corporal
import {
  EX, DAYS, MU_STAGES, MILESTONES, BAND_LEVELS, PLACE_DAYS, CORE_DAYS, EXTRA_DAYS, PLACES, STOCK_KINDS, PURCHASE_CATEGORIES, MISS_REASONS, APP_VERSION,
} from './data.js';
import { state, list, get } from './store.js';
import {
  uid, now, todayISO, addDays, daysBetween, weekStart, isoToMs, roundTo, clamp, mean, linreg, fmtNum, fmt1, fmtSigned, fmtDate, DAY_MS,
} from './util.js';

export const S = () => state.settings;

// ---------- 1RM estimado (tabela RPE) ----------
// Percentagem do 1RM em função de reps + reps na reserva (passos de 0,5)
const RPE_TABLE = [
  100, 97.8, 95.5, 93.9, 92.2, 90.7, 89.2, 87.8, 86.3, 85.0, 83.7, 82.4, 81.1, 79.9, 78.6, 77.4, 76.2, 75.1, 73.9,
  72.3, 70.7, 69.4, 68.0, 66.7, 65.3, 64.0, 62.6, 61.3, 59.9,
];

export function pct(reps, rpe) {
  const r = rpe === null || rpe === undefined ? 10 : clamp(rpe, 5, 10);
  const eff = Math.max(1, reps + (10 - r));
  const idx = (eff - 1) * 2;
  const last = RPE_TABLE.length - 1;
  let v;
  if (idx >= last) v = Math.max(45, RPE_TABLE[last] - (idx - last) * 1.3);
  else {
    const lo = Math.floor(idx);
    const f = idx - lo;
    v = RPE_TABLE[lo] * (1 - f) + RPE_TABLE[lo + 1] * f;
  }
  return v / 100;
}

export function e1rm(w, reps, rpe) {
  if (!(w > 0) || !(reps > 0)) return null;
  return w / pct(Math.min(reps, 15), rpe);
}

// ---------- Pesos e arredondamentos ----------
export function exInfo(exId, entry) {
  if (EX[exId]) return EX[exId];
  return { name: (entry && entry.name) || 'Exercício', kind: 'free', tier: 'accessory', group: 'outro', cues: [] };
}

export function barStep() {
  const plates = S().plates && S().plates.length ? S().plates : [1.25];
  return Math.min(...plates) * 2;
}

export function incFor(exId) {
  const k = exInfo(exId).kind;
  if (k === 'barbell') return barStep();
  if (k === 'dumbbell') return S().dbStep || 2;
  if (k === 'machine') return S().machineStep || 2.5;
  if (k === 'weighted_bw') return 2.5;
  return 2.5;
}

export function roundW(exId, w) {
  if (w === null || w === undefined) return null;
  const k = exInfo(exId).kind;
  if (k === 'barbell') return Math.max(S().bar, roundTo(w, barStep()));
  if (k === 'weighted_bw') return Math.max(0, roundTo(w, 1.25));
  return Math.max(0, roundTo(w, incFor(exId)));
}

export function usesWeight(kind) {
  return kind === 'barbell' || kind === 'dumbbell' || kind === 'machine' || kind === 'weighted_bw' || kind === 'free';
}

export function restFor(exId) {
  const r = S().rest;
  const tier = exInfo(exId).tier;
  return r[tier] || r.accessory || 90;
}

// ---------- Sessões ----------
export function sessions() {
  return list('sessions')
    .filter((s) => s.finishedAt)
    .sort((a, b) => b.date.localeCompare(a.date) || (b.startedAt || 0) - (a.startedAt || 0));
}

export function bodyweightEntries() {
  return list('bodyweight').sort((a, b) => a.date.localeCompare(b.date));
}

// Registo de pesagem: guarda também as pesagens anteriores desse dia (readings)
export function bodyweightRecord(date, kg, ctx = '') {
  const cur = state.bodyweight[date];
  const prev = cur && (cur.deleted ? cur.was : cur);
  const old = prev ? (prev.readings || [{ kg: prev.kg, at: prev.at || prev.updatedAt || null, ctx: prev.ctx || '' }]) : [];
  return { date, kg, at: now(), ctx, readings: [...old, { kg, at: now(), ctx }].slice(-10) };
}

export function bodyweightAt(iso) {
  const e = bodyweightEntries().filter((b) => b.date <= iso);
  if (e.length) return e[e.length - 1].kg;
  const all = bodyweightEntries();
  if (all.length) return all[0].kg;
  return S().baseline.bw || 64;
}

export function latestBodyweight() {
  return bodyweightAt(todayISO());
}

export function workSets(entry) {
  return (entry.sets || []).filter((s) => s.done && s.kind !== 'warm' && s.reps > 0);
}

export function loadOf(exId, set, iso) {
  const k = exInfo(exId).kind;
  if (k === 'weighted_bw') return bodyweightAt(iso) + (set.w || 0);
  if (k === 'bodyweight' || k === 'band' || k === 'hold') return null;
  return set.w || null;
}

export function setE1rm(exId, set, iso) {
  const load = loadOf(exId, set, iso);
  if (load === null) return null;
  return e1rm(load, set.reps, set.rpe);
}

// Melhor desempenho por sessão para um exercício (ordem cronológica)
export function exerciseHistory(exId) {
  const out = [];
  for (const s of sessions().slice().reverse()) {
    const entries = s.exercises.filter((e) => e.ex === exId);
    if (!entries.length) continue;
    let best = null; let bestSet = null; let maxReps = 0; let maxRepsSet = null; let volume = 0; let sets = 0; let maxW = null;
    for (const e of entries) {
      for (const set of workSets(e)) {
        sets++;
        const v = setE1rm(exId, set, s.date);
        if (v !== null && (best === null || v > best)) { best = v; bestSet = set; }
        if (set.reps > maxReps) { maxReps = set.reps; maxRepsSet = set; }
        const load = loadOf(exId, set, s.date);
        if (load) volume += load * set.reps;
        if (set.w !== null && set.w !== undefined && (maxW === null || set.w > maxW)) maxW = set.w;
      }
    }
    if (!sets) continue;
    out.push({ date: s.date, sessionId: s.id, e1rm: best, bestSet, maxReps, maxRepsSet, volume, sets, maxW, deload: !!s.deload });
  }
  return out;
}

export function benchHistory() {
  const b = S().baseline;
  const pts = [];
  if (b && b.bench && b.bench.w) {
    pts.push({
      date: b.date || todayISO(), e1rm: e1rm(b.bench.w, b.bench.reps, b.bench.rpe), baseline: true,
      bestSet: { w: b.bench.w, reps: b.bench.reps, rpe: b.bench.rpe },
    });
  }
  for (const h of exerciseHistory('bench')) if (h.e1rm) pts.push(h);
  return pts.sort((a, b) => a.date.localeCompare(b.date));
}

// 1RM atual: o melhor das últimas 5 sessões de supino (séries sem RPE contam como falha,
// por isso subestimam; daí usar o máximo e não a média). Pausa longa → desconto de 5%.
export function currentBenchE1RM() {
  const pts = benchHistory().filter((p) => !p.deload);
  if (!pts.length) return 84;
  const recent = pts.slice(-5);
  let v = Math.max(...recent.map((p) => p.e1rm));
  const lastDate = pts[pts.length - 1].date;
  const gap = daysBetween(lastDate, todayISO());
  if (gap > 21) v *= 0.95;
  else if (gap > 10) v *= 0.975;
  return v;
}

export function bestBenchE1RM() {
  const pts = benchHistory();
  return pts.length ? Math.max(...pts.map((p) => p.e1rm)) : null;
}

// ---------- Dias e rotação ----------
export function dayOrder(place = 'supera') {
  return PLACE_DAYS[place] || PLACE_DAYS.supera;
}

// Próximo treino de um sítio. Supera: alterna A e B; o C (extra) só aparece quando
// o A e o B dessa semana já estão feitos. Estádio: alterna E1 e E2.
// Treinos falhados não se perdem: segue-se sempre do último que fizeste.
export function nextDay(place = 'supera', iso = todayISO()) {
  const core = CORE_DAYS[place] || dayOrder(place);
  const ws = weekStart(iso);
  const week = sessions().filter((s) => s.date >= ws && s.date <= addDays(ws, 6));
  const extra = dayOrder(place).filter((d) => EXTRA_DAYS.includes(d));
  if (extra.length && core.every((d) => week.some((s) => s.day === d))) {
    const doneExtra = extra.filter((d) => week.some((s) => s.day === d));
    const left = extra.filter((d) => !doneExtra.includes(d));
    if (left.length) return left[0];
  }
  const last = sessions().find((s) => core.includes(s.day));
  if (!last) return core[0];
  return core[(core.indexOf(last.day) + 1) % core.length];
}

export function isExtraDay(day) {
  return EXTRA_DAYS.includes(day);
}

// Plano em vigor num dia: para dias passados usa a cópia das definições guardada nesse dia
// (ou a mais antiga), para o histórico não mudar quando mudas o plano.
export function weekPlanOn(iso = todayISO()) {
  if (iso >= todayISO()) return S().weekPlan || {};
  const snaps = list('settingsHistory').filter((r) => r.settings && r.settings.weekPlan).sort((a, b) => a.date.localeCompare(b.date));
  if (!snaps.length) return S().weekPlan || {};
  const before = snaps.filter((r) => r.date <= iso);
  return (before.length ? before[before.length - 1] : snaps[0]).settings.weekPlan;
}

export function planFor(iso = todayISO()) {
  const dow = new Date(isoToMs(iso)).getDay();
  const plan = weekPlanOn(iso);
  return plan[dow] || plan[String(dow)] || 'descanso';
}

function planCounts(plan) {
  const c = { supera: 0, estadio: 0 };
  for (const v of Object.values(plan || {})) if (c[v] !== undefined) c[v]++;
  return c;
}

// Treinos obrigatórios por semana (dias de Supera e de Estádio no plano)
export function weekTarget(iso = todayISO()) {
  const c = planCounts(weekPlanOn(iso));
  return c.supera + c.estadio;
}

// Primeiro dia que conta para faltas (dia em que configuraste a app)
export function trackingStart() {
  const b = S().baseline || {};
  const first = sessions().length ? sessions()[sessions().length - 1].date : null;
  return [b.date, first].filter(Boolean).sort()[0] || todayISO();
}

export function dayNote(iso) {
  return get('days', iso);
}

export function reasonLabel(v) {
  const r = MISS_REASONS.find((x) => x.value === v);
  return r ? r.label : v === 'nao-registado' ? 'Treinou sem registar' : v === 'sem-motivo' ? 'Sem motivo registado' : v || '';
}

// Estado de uma semana (segunda a domingo).
// done conta treinos registados e dias marcados como "treinei mas não registei".
export function weekStatus(iso = todayISO()) {
  const ws = weekStart(iso);
  const we = addDays(ws, 6);
  const today = todayISO();
  const plan = weekPlanOn(iso);
  const planned = planCounts(plan);
  const target = planned.supera + planned.estadio;
  const ss = sessions().filter((s) => s.date >= ws && s.date <= we);
  const byPlace = { supera: 0, estadio: 0 };
  for (const s of ss) {
    const pl = DAYS[s.day] && DAYS[s.day].place;
    if (pl) byPlace[pl]++;
  }
  const days = [];
  let unlogged = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(ws, i);
    const p = planFor(d);
    const daySessions = ss.filter((s) => s.date === d);
    const note = dayNote(d);
    let status;
    if (daySessions.length) status = p === 'supera' || p === 'estadio' ? 'feito' : 'extra';
    else if (note && note.reason === 'nao-registado') { status = 'feito'; unlogged++; if (byPlace[p] !== undefined) byPlace[p]++; }
    else if (p === 'supera' || p === 'estadio') {
      if (d < trackingStart()) status = 'antes';
      else if (d < today || (d === today && note && note.skip)) status = 'falhado';
      else status = 'por-fazer';
    } else status = d < today ? 'livre' : 'por-fazer';
    days.push({ date: d, plan: p, status, sessions: daySessions.map((s) => s.id), note: note || null });
  }
  const done = ss.length + unlogged;
  // Em dívida até agora: dias de treino que já passaram (ou marcados "hoje não dá") menos treinos feitos, por sítio
  const owed = { supera: 0, estadio: 0 };
  for (const d of days) if (owed[d.plan] !== undefined && (d.status === 'falhado' || d.status === 'feito')) owed[d.plan]++;
  for (const k of Object.keys(owed)) owed[k] = Math.max(0, owed[k] - byPlace[k]);
  const deficit = { supera: Math.max(0, planned.supera - byPlace.supera), estadio: Math.max(0, planned.estadio - byPlace.estadio) };
  const missed = days.filter((d) => d.status === 'falhado');
  const remainingPlanned = days.filter((d) => d.status === 'por-fazer' && (d.plan === 'supera' || d.plan === 'estadio')).length;
  return { week: ws, plan, planned, target, done, byPlace, deficit, owed, missed, days, remainingPlanned, extra: Math.max(0, done - target) };
}

// Sábado (dia de reposição): obrigatório se a semana ainda não chegou aos treinos obrigatórios,
// opcional se já chegou. Sugere o sítio que ficou a faltar; se não faltar nenhum, até ao primeiro
// muscle-up o Estádio tem prioridade, depois o Supera.
export function suggestPlace(iso = todayISO()) {
  const w = weekStatus(iso);
  const muDone = milestoneMap().mu1.achieved;
  const order = muDone ? ['supera', 'estadio'] : ['estadio', 'supera'];
  const mandatory = w.done < w.target;
  const short = w.target - w.done;
  const place = order.find((p) => w.deficit[p] > 0) || order[0];
  return { place, mandatory, short, planned: w.planned, done: w.byPlace, week: w };
}

// Dias de treino que passaram sem registo nem motivo (para a app perguntar o que aconteceu)
export function missedDays(iso = todayISO()) {
  const from = [addDays(iso, -13), trackingStart()].sort()[1];
  const out = [];
  const trained = new Set(sessions().map((s) => s.date));
  for (let d = addDays(iso, -1); d >= from; d = addDays(d, -1)) {
    const p = planFor(d);
    if (p !== 'supera' && p !== 'estadio') continue;
    if (trained.has(d) || dayNote(d)) continue;
    out.push({ date: d, plan: p });
  }
  return out;
}

export function daysSinceLastSession(iso = todayISO()) {
  const ss = sessions();
  return ss.length ? daysBetween(ss[0].date, iso) : null;
}

// Contexto guardado com cada treino: o que a app sugeria, como estava a semana, etc.
export function sessionContext({ day, place, suggestedDay, suggestedPlace } = {}) {
  const iso = todayISO();
  const w = weekStatus(iso);
  const plan = planFor(iso);
  const bws = bodyweightEntries();
  return {
    plan,
    place,
    suggestedPlace,
    suggestedDay,
    chosenByHand: day !== suggestedDay || place !== suggestedPlace,
    weekDoneBefore: w.done,
    weekTarget: w.target,
    makeup: plan === 'livre' ? w.done < w.target : plan !== place && w.deficit[place] > 0 && (plan === 'supera' || plan === 'estadio'),
    extra: plan === 'descanso' || plan === 'corrida' || (plan === 'livre' && w.done >= w.target),
    daysSinceLast: daysSinceLastSession(iso),
    bodyweight: bws.length ? bws[bws.length - 1].kg : null,
    benchE1rm: Math.round(currentBenchE1RM() * 10) / 10,
    muStage: muStage(),
    deloadWeek: isDeloadWeek(iso),
    appVersion: APP_VERSION,
    tzOffset: new Date().getTimezoneOffset(),
    weekday: new Date().getDay(),
  };
}

// Cumprimento do plano nas últimas semanas
export function adherence(weeks = 8, iso = todayISO()) {
  const start = trackingStart();
  const out = [];
  for (let i = weeks - 1; i >= 0; i--) {
    const d = addDays(weekStart(iso), -7 * i);
    if (addDays(d, 6) < start) continue;
    const w = weekStatus(d);
    // Semana em que começaste a usar a app depois dos dias de treino: não conta
    if (!w.done && !w.days.some((x) => (x.plan === 'supera' || x.plan === 'estadio') && x.status !== 'antes')) continue;
    out.push(w);
  }
  const reasons = {};
  for (const n of list('days')) {
    if (n.reason && n.reason !== 'nao-registado') reasons[n.reason] = (reasons[n.reason] || 0) + 1;
  }
  return { weeks: out, reasons };
}

// Horário de um sítio num dia: { open: bool, from, to }
export function placeHours(place, iso = todayISO()) {
  const p = PLACES[place];
  if (!p) return null;
  if (p.always) return { open: true, always: true };
  const dow = new Date(isoToMs(iso)).getDay();
  const h = p.hours[dow];
  return h ? { open: true, from: h[0], to: h[1] } : { open: false };
}

export function dayTitle(day) {
  const t = DAYS[day];
  return t ? `${t.label}: ${t.title}` : 'Treino livre';
}

export function slotEx(slot) {
  const o = get('overrides', slot.id);
  return (o && o.ex) || slot.ex;
}

// Última entrada para um slot+exercício (ignora sessões de deload se pedido)
function lastEntries(slotId, exId, { noDeload = true } = {}) {
  const out = [];
  for (const s of sessions()) {
    if (noDeload && s.deload) continue;
    const e = s.exercises.find((x) => x.slotId === slotId && x.ex === exId && workSets(x).length);
    if (e) out.push({ session: s, entry: e });
  }
  return out;
}

export function lastForExercise(exId) {
  for (const s of sessions()) {
    const e = s.exercises.find((x) => x.ex === exId && workSets(x).length);
    if (e) return { session: s, entry: e };
  }
  return null;
}

function modeWeight(sets) {
  const counts = new Map();
  for (const s of sets) {
    const w = s.w ?? 0;
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  let best = null; let bestC = -1;
  for (const [w, c] of counts) {
    if (c > bestC || (c === bestC && w > best)) { best = w; bestC = c; }
  }
  return best;
}

// ---------- Marcos e fase do muscle-up ----------
export function milestoneMap() {
  const out = {};
  const ss = sessions().slice().reverse();
  for (const m of MILESTONES) {
    let achieved = false; let date = null; let how = null;
    if (m.baseline && m.id === 'pull10' && (S().baseline.pullups || 0) >= m.reps) {
      achieved = true; date = S().baseline.date; how = 'ponto de partida';
    }
    if (!achieved) {
      outer: for (const s of ss) {
        for (const e of s.exercises) {
          if (!m.ex.includes(e.ex)) continue;
          for (const set of workSets(e)) {
            if (set.reps >= m.reps) { achieved = true; date = s.date; how = 'registo'; break outer; }
          }
        }
      }
    }
    const manual = get('milestones', m.id);
    if (!achieved && manual && manual.achieved) { achieved = true; date = manual.date; how = 'marcado à mão'; }
    out[m.id] = { ...m, achieved, date, how };
  }
  return out;
}

export function muStage() {
  if (S().muStage) return S().muStage;
  const m = milestoneMap();
  if (m.mu1.achieved) return 4;
  if (m.waist3.achieved && m.band3.achieved) return 3;
  if (m.c2b5.achieved && m.sbd8.achieved && m.neg3.achieved) return 2;
  return 1;
}

// ---------- Deload ----------
export function programStart() {
  const ss = sessions();
  return ss.length ? ss[ss.length - 1].date : todayISO();
}

export function isDeloadWeek(iso = todayISO()) {
  const r = get('deloadWeeks', weekStart(iso));
  return !!(r && r.on);
}

function weeklyBenchMax() {
  const map = new Map();
  for (const p of benchHistory()) {
    if (p.baseline || p.deload) continue;
    const wk = weekStart(p.date);
    map.set(wk, Math.max(map.get(wk) || 0, p.e1rm));
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function deloadSuggestion() {
  const today = todayISO();
  if (isDeloadWeek(today)) return null;
  const ss = sessions();
  if (ss.length < 6) return null;
  const thisWeek = weekStart(today);
  const deloads = list('deloadWeeks').filter((d) => d.on).map((d) => d.week).sort();
  const lastDeload = deloads.length ? deloads[deloads.length - 1] : null;
  const from = lastDeload ? addDays(lastDeload, 7) : weekStart(programStart());
  // Conta as semanas seguidas com treino a sério (2 ou mais). Uma semana com 0 ou 1 treino
  // (por faltas, férias ou doença) já serve de descanso e recomeça a contagem.
  let weeksTrained = 0;
  for (let wk = from; wk <= thisWeek; wk = addDays(wk, 7)) {
    const n = sessions().filter((s) => s.date >= wk && s.date <= addDays(wk, 6)).length;
    if (wk < thisWeek && n <= 1) weeksTrained = 0;
    else weeksTrained++;
  }
  if (weeksTrained >= S().deloadEvery) {
    return { reason: `Esta é a semana ${weeksTrained} seguida de treino. Uma semana mais leve agora ajuda-te a recuperar e a voltar mais forte.` };
  }
  const wk = weeklyBenchMax().filter(([w]) => w < thisWeek);
  if (wk.length >= 6) {
    const last3 = Math.max(...wk.slice(-3).map((x) => x[1]));
    const prev3 = Math.max(...wk.slice(-6, -3).map((x) => x[1]));
    if (last3 <= prev3 + 0.5) {
      return { reason: 'O teu 1RM estimado no bench press não sobe há 3 semanas. Uma semana de deload costuma desbloquear.' };
    }
  }
  return null;
}

// ---------- Prescrições ----------
function setObj(kind, w, reps, extra = {}) {
  return { kind, w, reps, rpe: null, done: false, ...extra };
}

export function warmups(exId, W, heavy) {
  const bar = S().bar;
  const out = [];
  if (!W || W < bar + 10) return out;
  const add = (w, reps) => {
    let x = roundW(exId, w);
    if (x < bar) x = bar;
    if (x >= W - 0.01) return;
    if (out.length && out[out.length - 1].w >= x) return;
    out.push(setObj('warm', x, reps));
  };
  add(bar, 10);
  add(W * 0.5, 5);
  add(W * 0.7, 3);
  if (heavy) add(W * 0.85, 1);
  return out;
}

function deloadSets(n) {
  return Math.max(2, Math.round(n * 0.6));
}

export function backoffWeight(slot, exId, topSet) {
  const E = topSet && topSet.done && topSet.reps > 0
    ? e1rm(topSet.w, topSet.reps, topSet.rpe ?? slot.topRPE + 0.5)
    : currentBenchE1RM();
  return roundW(exId, E * pct(slot.backReps, slot.backRPE));
}

function buildTopBackoff(slot, exId, deload) {
  const E = currentBenchE1RM();
  const inc = incFor(exId);
  let top = roundW(exId, E * pct(slot.topReps, slot.topRPE));
  let note = `Série principal de ${slot.topReps} reps a RPE ${slot.topRPE}. As séries seguintes ajustam-se ao que fizeres nela.`;
  const hist = lastEntries(slot.id, exId);
  if (hist.length) {
    const t = workSets(hist[0].entry).find((s) => s.kind === 'top');
    if (t) {
      const r = t.rpe ?? 9;
      let cap = t.w + (r <= 7 ? 2 * inc : inc);
      if (t.reps < slot.topReps || r >= 9.5) cap = t.w;
      if (top > cap) top = cap;
      if (t.reps < slot.topReps && r >= 9.5) note = `Da última vez a série principal custou muito: repete ${fmtNum(top)} kg com boa técnica.`;
    }
  }
  const back = backoffWeight(slot, exId, null);
  const prevTop = sessions().filter((s) => !s.deload && s.exercises.some((e) => e.slotId === slot.id && workSets(e).some((x) => x.kind === 'top'))).length;
  if (!deload && prevTop % 4 === 0) note += ' Filma a série principal de lado para rever a técnica.';
  let sets;
  if (deload) {
    sets = Array.from({ length: deloadSets(slot.backSets + 1) }, () => setObj('work', roundW(exId, back * 0.9), slot.backReps, { tReps: `${slot.backReps}` }));
    note = 'Semana de deload: sem série principal e com menos peso.';
  } else {
    sets = [
      setObj('top', top, slot.topReps, { tReps: `${slot.topReps}`, tRPE: slot.topRPE }),
      ...Array.from({ length: slot.backSets }, () => setObj('back', back, slot.backReps, { tReps: `${slot.backReps}`, tRPE: slot.backRPE, auto: true })),
    ];
  }
  const firstW = sets[0].w;
  return { sets: [...warmups(exId, firstW, !deload), ...sets], note, target: deload ? `${sets.length}×${slot.backReps}` : `1×${slot.topReps} @ RPE ${slot.topRPE} + ${slot.backSets}×${slot.backReps}` };
}

function buildDouble(slot, exId, deload) {
  const info = exInfo(exId);
  const inc = incFor(exId);
  const hist = lastEntries(slot.id, exId);
  const range = `${slot.min}–${slot.max}`;
  let w = null;
  let reps = Array(slot.sets).fill(slot.min);
  let note = '';
  if (!hist.length) {
    if (slot.startPct) w = roundW(exId, currentBenchE1RM() * slot.startPct);
    else if (slot.startAdded !== undefined) w = slot.startAdded;
    else {
      const any = lastForExercise(exId);
      if (any) w = modeWeight(workSets(any.entry));
    }
    note = w === null
      ? `Primeira vez: escolhe um peso com que faças ${slot.min} a ${slot.max} reps deixando 2 na reserva.`
      : `Primeira vez: ${slot.min} a ${slot.max} reps por série, deixando 2 reps na reserva.`;
  } else {
    const ws = workSets(hist[0].entry);
    const lw = modeWeight(ws);
    const allMax = ws.length >= slot.sets && ws.every((s) => s.reps >= slot.max);
    const fail = ws.length < slot.sets || ws.some((s) => s.reps < slot.min);
    let prevFail = false;
    if (hist[1]) {
      const p = workSets(hist[1].entry);
      prevFail = modeWeight(p) === lw && (p.length < slot.sets || p.some((s) => s.reps < slot.min));
    }
    if (allMax) {
      w = roundW(exId, lw + inc);
      note = `Chegaste a ${slot.max} reps em todas as séries: sobe ${fmtNum(w - lw)} kg.`;
    } else if (fail && prevFail) {
      w = roundW(exId, lw * 0.9);
      note = `Ficaste abaixo de ${slot.min} reps duas vezes seguidas: baixa o peso cerca de 10% e volta a subir.`;
    } else {
      w = lw;
      reps = Array.from({ length: slot.sets }, (_, i) => clamp((ws[i] ? ws[i].reps : slot.min) + 1, slot.min, slot.max));
      note = 'Mesmo peso: tenta mais uma rep por série.';
    }
  }
  let n = slot.sets;
  if (deload) {
    n = deloadSets(slot.sets);
    if (w !== null) w = roundW(exId, w * 0.9);
    reps = Array(n).fill(slot.min);
    note = 'Semana de deload: menos séries e menos peso.';
  }
  const sets = Array.from({ length: n }, (_, i) => setObj('work', w, reps[i] ?? slot.min, { tReps: range }));
  const warm = info.kind === 'barbell' && info.tier === 'main' ? warmups(exId, w, false) : [];
  return { sets: [...warm, ...sets], note, target: `${n}×${range}` };
}

function buildReps(slot, exId, deload) {
  const hist = lastEntries(slot.id, exId);
  const range = `${slot.min}–${slot.max}`;
  let reps = Array(slot.sets).fill(slot.min);
  let note = `Reps limpas, todas iguais. Para quando a técnica falhar.`;
  if (hist.length) {
    const ws = workSets(hist[0].entry);
    const allMax = ws.length >= slot.sets && ws.every((s) => s.reps >= slot.max);
    reps = Array.from({ length: slot.sets }, (_, i) => clamp((ws[i] ? ws[i].reps : slot.min) + 1, slot.min, slot.max));
    note = allMax ? 'Já fazes o topo da gama: mantém e foca-te em reps mais explosivas.' : 'Tenta mais uma rep por série.';
  }
  let n = slot.sets;
  if (deload) { n = deloadSets(slot.sets); reps = Array(n).fill(slot.min); note = 'Semana de deload: menos séries.'; }
  return { sets: Array.from({ length: n }, (_, i) => setObj('work', null, reps[i] ?? slot.min, { tReps: range })), note, target: `${n}×${range}` };
}

function lastBand() {
  const l = lastForExercise('mu_band');
  if (!l) return 'média';
  const ws = workSets(l.entry);
  return (ws[ws.length - 1] && ws[ws.length - 1].band) || 'média';
}

function buildSkill(slot, deload) {
  const stage = MU_STAGES[muStage() - 1];
  const drills = stage[slot.focus] || stage.main;
  return drills.map((d, i) => {
    const info = EX[d.ex];
    const n = deload ? deloadSets(d.sets) : d.sets;
    const range = d.min === d.max ? `${d.min}` : `${d.min}–${d.max}`;
    const band = info.kind === 'band' ? lastBand() : undefined;
    return {
      key: `${slot.id}_${i}`,
      slotId: `${slot.id}_${i}`,
      ex: d.ex,
      mode: 'skill',
      target: `${n}×${range}`,
      note: i === 0 ? `Fase ${stage.n} do muscle-up (${stage.name.toLowerCase()}). Aquece os pulsos primeiro. Escreve as reps que fizeste de facto (0 se falhaste) e descansa 2 min entre séries.` : '',
      sets: Array.from({ length: n }, () => setObj('work', null, null, { tReps: range, ...(band ? { band } : {}) })),
    };
  }).map((e) => ({ ...e, prescribed: prescribedOf(e.sets) }));
}

// Cópia do que a app receitou, guardada com o treino para comparar mais tarde com o que fizeste
function prescribedOf(sets) {
  return sets.map((x) => {
    const o = { kind: x.kind, w: x.w ?? null, reps: x.reps ?? null };
    if (x.tReps) o.tReps = x.tReps;
    if (x.band) o.band = x.band;
    return o;
  });
}

function buildHold(slot) {
  const sec = slot.seconds || 60;
  return {
    sets: Array.from({ length: slot.sets || 1 }, () => setObj('work', null, sec, { tReps: `${sec}` })),
    note: 'Para alongar e melhorar a pegada. Regista os segundos que aguentaste.',
    target: `${slot.sets || 1}×${sec} s`,
  };
}

export function buildEntry(slot, deload) {
  if (slot.mode === 'skill') return buildSkill(slot, deload);
  const exId = slotEx(slot);
  let r;
  if (slot.mode === 'top_backoff') r = buildTopBackoff(slot, exId, deload);
  else if (slot.mode === 'reps') r = buildReps(slot, exId, deload);
  else if (slot.mode === 'hold') r = buildHold(slot);
  else r = buildDouble(slot, exId, deload);
  return [{ key: slot.id, slotId: slot.id, ex: exId, mode: slot.mode, target: r.target, note: r.note, sets: r.sets, prescribed: prescribedOf(r.sets) }];
}

export function buildSession(day, { deload = false } = {}) {
  const tpl = DAYS[day];
  const exercises = tpl.slots.flatMap((slot) => buildEntry(slot, deload));
  return { id: uid(), day, date: todayISO(), startedAt: now(), deload, notes: '', exercises };
}

export function slotById(slotId) {
  if (!slotId) return null;
  for (const d of Object.values(DAYS)) {
    const s = d.slots.find((x) => x.id === slotId);
    if (s) return s;
  }
  return null;
}

// Tempo estimado do treino
export function estimateMinutes(session) {
  let sec = 0;
  for (const e of session.exercises) {
    const rest = restFor(e.ex);
    for (const s of e.sets) sec += s.kind === 'warm' ? 60 : 40 + rest;
  }
  return Math.round(sec / 60 / 5) * 5;
}

// ---------- Recordes ----------
export function sessionPRs(session) {
  const prs = [];
  const prior = sessions().filter((s) => s.id !== session.id && (s.date < session.date || (s.date === session.date && (s.startedAt || 0) < (session.startedAt || 0))));
  const exIds = [...new Set(session.exercises.map((e) => e.ex))];
  for (const exId of exIds) {
    const info = exInfo(exId);
    if (!EX[exId]) continue;
    const sets = session.exercises.filter((e) => e.ex === exId).flatMap(workSets);
    if (!sets.length) continue;
    const priorSets = [];
    for (const s of prior) for (const e of s.exercises) if (e.ex === exId) for (const set of workSets(e)) priorSets.push({ ...set, date: s.date });
    if (exId === 'bench') {
      const b = S().baseline.bench;
      priorSets.push({ w: b.w, reps: b.reps, rpe: b.rpe, date: S().baseline.date || session.date });
    }
    if (info.kind === 'bodyweight' || info.kind === 'band' || info.kind === 'hold') {
      const best = Math.max(...sets.map((s) => s.reps));
      const pb = priorSets.length ? Math.max(...priorSets.map((s) => s.reps)) : 0;
      if (priorSets.length && best > pb) prs.push(info.kind === 'hold' ? `${info.name}: ${best} s, o teu recorde` : `${info.name}: ${best} reps seguidas, o teu recorde`);
      continue;
    }
    if (info.tier === 'accessory') {
      const top = Math.max(...sets.map((s) => s.w || 0));
      const prevTop = priorSets.length ? Math.max(...priorSets.map((s) => s.w || 0)) : 0;
      if (priorSets.length && top > prevTop) prs.push(`${info.name}: ${fmtNum(top)} kg, o peso mais alto até agora`);
      continue;
    }
    // Recorde de reps a um dado peso (ou mais pesado)
    let repPR = null;
    for (const s of sets) {
      if (!s.w && info.kind !== 'weighted_bw') continue;
      const atOrAbove = priorSets.filter((p) => (p.w || 0) >= (s.w || 0));
      const pb = atOrAbove.length ? Math.max(...atOrAbove.map((p) => p.reps)) : 0;
      if (priorSets.length && s.reps > pb && (!repPR || s.w > repPR.w || (s.w === repPR.w && s.reps > repPR.reps))) repPR = s;
    }
    if (repPR) {
      const wTxt = info.kind === 'weighted_bw' ? `+${fmtNum(repPR.w || 0)} kg` : `${fmtNum(repPR.w)} kg`;
      prs.push(`${info.name}: ${wTxt} × ${repPR.reps}, recorde para este peso`);
    }
    const best = Math.max(...sets.map((s) => setE1rm(exId, s, session.date) || 0));
    const pbE = priorSets.length ? Math.max(...priorSets.map((s) => setE1rm(exId, s, s.date) || 0)) : 0;
    if (priorSets.length && best > pbE + 0.05) {
      const val = info.kind === 'weighted_bw' ? `+${fmt1(best - bodyweightAt(session.date))} kg` : `${fmt1(best)} kg`;
      prs.push(`${info.name}: novo 1RM estimado de ${val}`);
    }
  }
  return prs;
}

// ---------- Objetivos ----------
export const TARGET_80x6 = e1rm(80, 6, 10);

export function allSets(exId) {
  const out = [];
  for (const s of sessions()) for (const e of s.exercises) if (e.ex === exId) for (const set of workSets(e)) out.push({ ...set, date: s.date });
  return out;
}

export function goals() {
  const hist = benchHistory();
  const E = currentBenchE1RM();
  const base = hist.length ? hist[0].e1rm : E;
  const bench = allSets('bench');
  const b = S().baseline.bench;
  const withBase = [...bench, { w: b.w, reps: b.reps }];
  const at80 = withBase.filter((s) => s.w >= 80);
  const best80 = at80.length ? Math.max(...at80.map((s) => s.reps)) : 0;
  const best100 = bench.some((s) => s.w >= 100);
  const heaviest = withBase.length ? Math.max(...withBase.map((s) => s.w || 0)) : 0;
  const prog = (t) => clamp((E - base) / (t - base), 0, 1);
  const m = milestoneMap();
  const core = MILESTONES.filter((x) => !x.bonus);
  const coreDone = core.filter((x) => m[x.id].achieved).length;
  return [
    {
      id: 'b80x6', title: 'Bench press 80 kg × 6', color: 'blue', done: best80 >= 6,
      progress: best80 >= 6 ? 1 : prog(TARGET_80x6),
      big: best80 ? `80 × ${best80}` : '—',
      detail: best80 >= 6 ? 'Objetivo cumprido.' : `Melhor série com 80 kg ou mais: ${best80 ? best80 + ' reps' : 'ainda nenhuma'}. Precisas de um 1RM estimado de cerca de ${fmt1(TARGET_80x6)} kg.`,
      target: TARGET_80x6,
    },
    {
      id: 'b100', title: 'Bench press 100 kg × 1', color: 'red', done: best100,
      progress: best100 ? 1 : prog(100),
      big: `${fmt1(E)} kg`,
      detail: best100 ? 'Objetivo cumprido.' : `1RM estimado atual. Série mais pesada até agora: ${fmtNum(heaviest)} kg.`,
      target: 100,
    },
    {
      id: 'mu', title: 'Muscle-up', color: 'green', done: m.mu1.achieved,
      progress: coreDone / core.length,
      big: `${coreDone}/${core.length}`,
      detail: m.mu1.achieved ? 'Objetivo cumprido. Agora, reps seguidas.' : `Marcos cumpridos. Fase atual: ${MU_STAGES[muStage() - 1].name.toLowerCase()}.`,
    },
  ];
}

// Previsão linear sobre o máximo semanal do 1RM estimado (últimas 10 semanas)
export function forecast(target) {
  const E = currentBenchE1RM();
  if (E >= target) return { status: 'done' };
  const wk = weeklyBenchMax();
  const cutoff = addDays(todayISO(), -70);
  const pts = wk.filter(([w]) => w >= cutoff).map(([w, y]) => ({ x: daysBetween(cutoff, w), y }));
  if (pts.length < 3) return { status: 'few', needed: 3 - pts.length };
  const reg = linreg(pts);
  if (!reg || reg.slope * 7 < 0.15) return { status: 'flat', weekly: reg ? reg.slope * 7 : 0 };
  const xNow = daysBetween(cutoff, todayISO());
  const yNow = Math.max(E, reg.intercept + reg.slope * xNow);
  const days = (target - yNow) / reg.slope;
  if (days > 730) return { status: 'far', weekly: reg.slope * 7 };
  return { status: 'ok', weekly: reg.slope * 7, date: Date.now() + days * DAY_MS };
}

// ---------- Peso corporal ----------
function avgBetween(entries, fromIso, toIso) {
  const v = entries.filter((e) => e.date >= fromIso && e.date <= toIso).map((e) => e.kg);
  return v.length ? mean(v) : null;
}

export function bwMovingAvg() {
  const e = bodyweightEntries();
  return e.map((x) => ({ date: x.date, kg: x.kg, avg: avgBetween(e, addDays(x.date, -6), x.date) }));
}

export function bwStats() {
  const e = bodyweightEntries();
  if (!e.length) return null;
  const today = todayISO();
  const last = e[e.length - 1];
  const ref = daysBetween(last.date, today) <= 6 ? today : last.date;
  const avgNow = avgBetween(e, addDays(ref, -6), ref);
  const avgPrev = avgBetween(e, addDays(ref, -13), addDays(ref, -7));
  const avgPrev2 = avgBetween(e, addDays(ref, -20), addDays(ref, -14));
  const weekly = avgNow !== null && avgPrev !== null ? avgNow - avgPrev : null;
  const weeklyPrev = avgPrev !== null && avgPrev2 !== null ? avgPrev - avgPrev2 : null;
  let status;
  if (S().bwGoal === 'maintain') {
    if (weekly === null) status = { level: 'info', text: 'Regista o peso 3 a 4 manhãs por semana; em duas semanas já há tendência.' };
    else if (Math.abs(weekly) <= 0.15) status = { level: 'ok', text: 'Peso estável, como pretendes.' };
    else status = { level: 'warn', text: weekly > 0 ? 'A média está a subir. Se quiseres manter, come um pouco menos.' : 'A média está a descer. Se quiseres manter, come um pouco mais.' };
  } else if (weekly === null) {
    status = { level: 'info', text: 'Regista o peso 3 a 4 manhãs por semana; em duas semanas já há tendência.' };
  } else if (weekly < 0.05 && weeklyPrev !== null && weeklyPrev < 0.05) {
    status = { level: 'warn', text: 'A média não sobe há 2 semanas. Acrescenta algo fixo ao teu dia: um shaker de leite com whey e aveia instantânea, um copo de leite e uma banana, ou uma porção extra de arroz ou massa.' };
  } else if (weekly < 0.05) {
    status = { level: 'soft', text: 'Esta semana a média não subiu. Se se repetir na próxima, come mais.' };
  } else if (weekly < 0.1) {
    status = { level: 'ok', text: 'A subir, um pouco abaixo do alvo. Se puderes, come um pouco mais.' };
  } else if (weekly <= 0.35) {
    status = { level: 'ok', text: 'No ritmo certo. Continua igual.' };
  } else {
    status = { level: 'soft', text: 'A subir depressa. Nas primeiras semanas com creatina é normal (é água). Se a cintura estiver a crescer, tira um pouco.' };
  }
  return { last, avgNow, weekly, status, count: e.length };
}

// ---------- Ombros ----------
export const SIDE_DELT_EX = ['lateral_raise', 'lateral_cable', 'lateral_machine'];

export function shoulderEntries() {
  return list('shoulders').sort((a, b) => a.date.localeCompare(b.date));
}

// Perímetro dos ombros, variação e relação ombros/cintura (com a medição de cintura mais próxima, até 10 dias)
export function shoulderStats() {
  const sh = shoulderEntries();
  if (!sh.length) return null;
  const last = sh[sh.length - 1];
  const first = sh[0];
  const daysSince = daysBetween(last.date, todayISO());
  const ws = list('waist');
  const nearWaist = (iso) => {
    const c = ws.filter((w) => Math.abs(daysBetween(w.date, iso)) <= 10).sort((a, b) => Math.abs(daysBetween(a.date, iso)) - Math.abs(daysBetween(b.date, iso)));
    return c.length ? c[0].cm : null;
  };
  const ratio = (e) => { const w = nearWaist(e.date); return w ? e.cm / w : null; };
  return {
    last, first, daysSince, entries: sh,
    change: sh.length > 1 ? last.cm - first.cm : null,
    ratio: ratio(last), ratioFirst: sh.length > 1 ? ratio(first) : null,
    ratios: sh.map((e) => ({ date: e.date, r: ratio(e) })).filter((x) => x.r),
  };
}

// Séries de ombro lateral por semana (média das últimas 4 semanas com treino)
export function sideDeltSets(weeks = 4, iso = todayISO()) {
  const out = [];
  for (let i = 0; i < weeks; i++) {
    const ws = addDays(weekStart(iso), -7 * i);
    const we = addDays(ws, 6);
    let n = 0;
    for (const s of sessions()) {
      if (s.date < ws || s.date > we) continue;
      for (const e of s.exercises) if (SIDE_DELT_EX.includes(e.ex)) n += workSets(e).length;
    }
    out.push({ week: ws, sets: n });
  }
  return out;
}

// ---------- Cintura ----------
export function waistEntries() {
  return list('waist').sort((a, b) => a.date.localeCompare(b.date));
}

function bwAround(iso) {
  const e = bodyweightEntries().filter((b) => Math.abs(daysBetween(b.date, iso)) <= 3);
  return e.length ? mean(e.map((b) => b.kg)) : bodyweightAt(iso);
}

// Compara a cintura com o peso nas últimas semanas (regra prática: até ~1 cm por kg ganho é sobretudo músculo)
export function waistStats() {
  const w = waistEntries();
  if (!w.length) return null;
  const last = w[w.length - 1];
  const daysSince = daysBetween(last.date, todayISO());
  const cutoff = addDays(last.date, -42);
  const ref = w.find((x) => x.date >= cutoff && daysBetween(x.date, last.date) >= 14) || null;
  if (!ref) {
    return { last, daysSince, status: { level: 'info', text: 'Mede uma vez por semana. A partir de 2 semanas de medições a app compara a cintura com o peso.' } };
  }
  const dWaist = last.cm - ref.cm;
  const dBw = bwAround(last.date) - bwAround(ref.date);
  const since = `Desde ${fmtDate(ref.date)}: peso ${fmtSigned(dBw)} kg, cintura ${fmtSigned(dWaist)} cm.`;
  let status;
  if (dBw >= 0.3) {
    status = dWaist <= dBw * 1.0
      ? { level: 'ok', text: `${since} A cintura sobe pouco face ao peso: estás a ganhar sobretudo músculo.` }
      : { level: 'warn', text: `${since} A cintura está a subir mais de 1 cm por cada kg. É sinal de gordura a mais: corta um pouco, por exemplo o batido extra.` };
  } else if (dWaist >= 1) {
    status = { level: 'soft', text: `${since} A cintura subiu sem o peso subir. Confirma que medes sempre da mesma forma (de manhã, à altura do umbigo).` };
  } else {
    status = { level: 'info', text: `${since} Sem grandes mudanças.` };
  }
  return { last, ref, dWaist, dBw, daysSince, status };
}

// ---------- Hábitos e corrida ----------
export function proteinTarget() {
  return Math.round((latestBodyweight() * (S().proteinPerKg || 1.8)) / 5) * 5;
}

export function habitsFor(iso) {
  return get('habits', iso) || { date: iso, protein: 0, creatine: false, sleep: null, shake: false };
}

export function creatineStreak() {
  let n = 0;
  let d = todayISO();
  if (!habitsFor(d).creatine) d = addDays(d, -1);
  while (habitsFor(d).creatine) {
    n++;
    d = addDays(d, -1);
  }
  return n;
}

export function runs() {
  return list('runs').sort((a, b) => b.date.localeCompare(a.date));
}

export function weekSummary(iso = todayISO()) {
  const ws = weekStart(iso);
  const we = addDays(ws, 6);
  const w = weekStatus(iso);
  const rr = runs().filter((r) => r.date >= ws && r.date <= we);
  return { sessions: w.done, target: w.target, status: w, km: rr.reduce((a, r) => a + (r.km || 0), 0), runs: rr.length };
}

// ---------- Compras e stock ----------
// Estados do stock: encomendado → fechado (em casa) → uso → acabou
export function stockItems() {
  const order = { uso: 0, fechado: 1, encomendado: 2, acabou: 3 };
  return list('stock').sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9) || (a.name || '').localeCompare(b.name || ''));
}

export function purchases() {
  return list('purchases').sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

export function stockLabel(kind) {
  return (STOCK_KINDS[kind] || STOCK_KINDS.other).label;
}

export function dailyUse(it) {
  return (Number(it.servingG) || 0) * (it.perDay ?? 1);
}

// Gramas que restam num artigo
export function stockLeft(it, iso = todayISO()) {
  if (it.status === 'acabou') return 0;
  if (it.status !== 'uso') return Number(it.sizeG) || 0;
  const base = it.leftG ?? (Number(it.sizeG) || 0);
  const from = it.leftOn || it.openedOn || iso;
  let used;
  if (it.kind === 'creatine') {
    // Para a creatina conta os dias marcados na app (desde a data de referência)
    let n = 0;
    for (const h of list('habits')) if (h.creatine && h.date >= from && h.date <= iso) n++;
    const days = Math.max(0, daysBetween(from, iso));
    used = (n || days) * (Number(it.servingG) || 0);
  } else {
    used = dailyUse(it) * Math.max(0, daysBetween(from, iso));
  }
  return Math.max(0, base - used);
}

export function stockDaysLeft(it, iso = todayISO()) {
  const d = dailyUse(it);
  if (!d) return null;
  return stockLeft(it, iso) / d;
}

// Cobertura por tipo: o que está em uso mais o que já está em casa ou encomendado
export function stockCoverage(iso = todayISO()) {
  const out = {};
  for (const it of stockItems()) {
    if (it.status === 'acabou' || !STOCK_KINDS[it.kind] || it.kind === 'other') continue;
    const c = out[it.kind] || (out[it.kind] = { kind: it.kind, label: stockLabel(it.kind), inUse: null, spareG: 0, arrivingG: 0, daily: 0 });
    if (it.status === 'uso') { c.inUse = it; c.daily = dailyUse(it); }
    else if (it.status === 'fechado') c.spareG += Number(it.sizeG) || 0;
    else if (it.status === 'encomendado') c.arrivingG += Number(it.sizeG) || 0;
    if (!c.daily) c.daily = dailyUse(it) || dailyUse(STOCK_KINDS[it.kind]);
  }
  for (const c of Object.values(out)) {
    const leftNow = c.inUse ? stockLeft(c.inUse, iso) : 0;
    c.leftNow = leftNow;
    c.daysInUse = c.daily ? leftNow / c.daily : null;
    c.daysTotal = c.daily ? (leftNow + c.spareG + c.arrivingG) / c.daily : null;
    c.runOut = c.daysTotal !== null ? addDays(iso, Math.floor(c.daysTotal)) : null;
  }
  return out;
}

// Valor de um artigo de uma compra (preço total da linha, ou quantidade × preço unitário)
export function itemValue(i) {
  if (i.price != null) return Number(i.price) || 0;
  if (i.unitPrice != null) return (Number(i.unitPrice) || 0) * (Number(i.qty) || 1);
  return 0;
}

// Total de uma compra: o total registado ou, se não houver, a soma dos artigos
export function purchaseTotal(p) {
  if (p.total != null && p.total !== '') return Number(p.total) || 0;
  return (p.items || []).reduce((a, i) => a + itemValue(i), 0);
}

// Gastos de um mês, por categoria. O limite mensal é opcional (0 = sem limite).
export function monthSpend(iso = todayISO()) {
  const ym = iso.slice(0, 7);
  const byCat = {};
  let total = 0;
  let count = 0;
  for (const p of purchases()) {
    if ((p.date || '').slice(0, 7) !== ym) continue;
    const v = purchaseTotal(p);
    byCat[p.category || 'outro'] = (byCat[p.category || 'outro'] || 0) + v;
    total += v;
    count++;
  }
  const gear = byCat.material || 0;
  const food = total - gear;
  const day = Number(iso.slice(8, 10));
  const daysInMonth = new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)), 0).getDate();
  return { total, food, gear, byCat, count, perWeek: (total / Math.max(1, day)) * 7, daysInMonth, budget: Number(S().budgetMonthly) || 0 };
}

// Gastos dos últimos meses (o mais recente primeiro)
export function spendHistory(months = 6, iso = todayISO()) {
  const out = [];
  let y = Number(iso.slice(0, 4));
  let m = Number(iso.slice(5, 7));
  for (let i = 0; i < months; i++) {
    const ym = `${y}-${String(m).padStart(2, '0')}`;
    const r = monthSpend(`${ym}-${i === 0 ? iso.slice(8, 10) : '28'}`);
    if (r.count || i === 0) out.push({ ym, ...r });
    m--;
    if (!m) { m = 12; y--; }
  }
  return out;
}

// Sugestões: o que repor, o que abrir, encomendas a chegar e orçamento
export function stockSuggestions(iso = todayISO()) {
  const out = [];
  for (const c of Object.values(stockCoverage(iso))) {
    if (c.inUse && c.leftNow <= 0 && c.spareG > 0) {
      out.push({ level: 'soft', kind: c.kind, text: `${c.label}: o que estava em uso já deve ter acabado. Abre o próximo e marca-o como "Em uso".` });
    }
    if (c.daysTotal === null) continue;
    const days = Math.floor(c.daysTotal);
    if (days <= 21) {
      const orderBy = addDays(iso, Math.max(0, days - 6));
      out.push({
        level: days <= 10 ? 'warn' : 'soft', kind: c.kind,
        text: days <= 0
          ? `${c.label}: já não tens. Repõe assim que puderes.`
          : `${c.label}: dá para cerca de ${days} dias (até ${fmtDate(c.runOut)}). Encomenda até ${fmtDate(orderBy)} para não ficares sem.`,
      });
    }
  }
  for (const p of purchases()) {
    if (p.status !== 'a caminho') continue;
    const late = p.expected && p.expected < iso;
    out.push({
      level: late ? 'soft' : 'info', purchase: p.id,
      text: late
        ? `A encomenda da ${p.store} devia ter chegado a ${fmtDate(p.expected)}. Já chegou? Marca-a como recebida.`
        : `A caminho: encomenda da ${p.store}${p.expected ? `, prevista para ${fmtDate(p.expected, { weekday: 'long', day: 'numeric', month: 'short' })}` : ''}.`,
    });
  }
  const m = monthSpend(iso);
  if (m.budget > 0 && m.food > m.budget) out.push({ level: 'soft', text: `Este mês já gastaste ${fmtNum(m.food)} € em comida e suplementos, acima dos ${fmtNum(m.budget)} € que definiste.` });
  return out;
}

export { STOCK_KINDS, PURCHASE_CATEGORIES };

// ---------- Lista de exercícios com histórico ----------
export function trainedExercises() {
  const map = new Map();
  for (const s of sessions()) {
    for (const e of s.exercises) {
      if (!workSets(e).length) continue;
      const key = EX[e.ex] ? e.ex : null;
      if (!key) continue;
      if (!map.has(key)) map.set(key, { ex: key, last: s.date, count: 0 });
      map.get(key).count++;
    }
  }
  return [...map.values()];
}

// ---------- CSV ----------
export function exportCSV() {
  const rows = [['data', 'hora', 'dia', 'sitio', 'exercicio', 'serie', 'tipo', 'peso_kg', 'reps', 'rpe', 'banda', 'deload', 'reposicao', 'esforco_treino', 'energia']];
  const hhmm = (ms) => (ms ? new Date(ms).toTimeString().slice(0, 5) : '');
  for (const s of sessions().slice().reverse()) {
    for (const e of s.exercises) {
      const name = exInfo(e.ex, e).name;
      let i = 0;
      for (const set of e.sets) {
        if (!set.done) continue;
        i++;
        const c = s.ctx || {};
        const f = s.feedback || {};
        rows.push([s.date, hhmm(set.doneAt), s.day || '', (DAYS[s.day] && DAYS[s.day].place) || '', name, i, set.kind, set.w ?? '', set.reps ?? '', set.rpe ?? '', set.band ?? '', s.deload ? 'sim' : '', c.makeup ? 'sim' : c.extra ? 'extra' : '', f.srpe ?? '', f.energy ?? '']);
      }
    }
  }
  return rows.map((r) => r.map((c) => (/[",;\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}

export { BAND_LEVELS, isoToMs };
