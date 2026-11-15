// Cálculos: 1RM estimado, progressão, prescrições, marcos, objetivos, peso corporal
import { EX, DAYS, MU_STAGES, MILESTONES, BAND_LEVELS, PLACE_DAYS, PLACES } from './data.js';
import { state, list, get } from './store.js';
import {
  uid, now, todayISO, addDays, daysBetween, weekStart, isoToMs, roundTo, clamp, mean, linreg, fmtNum, fmt1, DAY_MS,
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
  if (k === 'bodyweight' || k === 'band') return null;
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
  if (daysBetween(lastDate, todayISO()) > 21) v *= 0.95;
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

// Próximo dia da rotação de um sítio (Supera: A, B, C; Estádio: E1, E2)
export function nextDay(place = 'supera') {
  const order = dayOrder(place);
  const last = sessions().find((s) => order.includes(s.day));
  if (!last) return order[0];
  return order[(order.indexOf(last.day) + 1) % order.length];
}

export function planFor(iso = todayISO()) {
  const dow = new Date(isoToMs(iso)).getDay();
  const plan = S().weekPlan || {};
  return plan[dow] || plan[String(dow)] || 'descanso';
}

export function weekTarget() {
  const plan = S().weekPlan || {};
  return Object.values(plan).filter((v) => v === 'supera' || v === 'estadio').length;
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

// Dia livre: sugere o sítio onde faltou treino esta semana.
// Até ao primeiro muscle-up, o Estádio tem prioridade; depois, o Supera.
export function suggestPlace(iso = todayISO()) {
  const plan = S().weekPlan || {};
  const planned = { supera: 0, estadio: 0 };
  for (const v of Object.values(plan)) if (planned[v] !== undefined) planned[v]++;
  const ws = weekStart(iso);
  const done = { supera: 0, estadio: 0 };
  for (const s of sessions()) {
    if (s.date < ws || s.date > addDays(ws, 6)) continue;
    const pl = DAYS[s.day] && DAYS[s.day].place;
    if (pl) done[pl]++;
  }
  const def = { supera: planned.supera - done.supera, estadio: planned.estadio - done.estadio };
  const muDone = milestoneMap().mu1.achieved;
  const order = muDone ? ['supera', 'estadio'] : ['estadio', 'supera'];
  const place = order.find((p) => def[p] > 0) || null;
  return { place, planned, done };
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
  const weeksTrained = Math.floor(daysBetween(from, thisWeek) / 7) + 1;
  if (weeksTrained >= S().deloadEvery) {
    return { reason: `Esta é a semana ${weeksTrained} seguida de treino. Uma semana mais leve agora ajuda-te a recuperar e a voltar mais forte.` };
  }
  const wk = weeklyBenchMax().filter(([w]) => w < thisWeek);
  if (wk.length >= 6) {
    const last3 = Math.max(...wk.slice(-3).map((x) => x[1]));
    const prev3 = Math.max(...wk.slice(-6, -3).map((x) => x[1]));
    if (last3 <= prev3 + 0.5) {
      return { reason: 'O teu 1RM estimado no supino não sobe há 3 semanas. Uma semana de deload costuma desbloquear.' };
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
      note: i === 0 ? `Fase ${stage.n} do muscle-up (${stage.name.toLowerCase()}). Escreve as reps que fizeste de facto (0 se falhaste) e descansa 2 min entre séries.` : '',
      sets: Array.from({ length: n }, () => setObj('work', null, null, { tReps: range, ...(band ? { band } : {}) })),
    };
  });
}

export function buildEntry(slot, deload) {
  if (slot.mode === 'skill') return buildSkill(slot, deload);
  const exId = slotEx(slot);
  let r;
  if (slot.mode === 'top_backoff') r = buildTopBackoff(slot, exId, deload);
  else if (slot.mode === 'reps') r = buildReps(slot, exId, deload);
  else r = buildDouble(slot, exId, deload);
  return [{ key: slot.id, slotId: slot.id, ex: exId, mode: slot.mode, target: r.target, note: r.note, sets: r.sets }];
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
    if (info.kind === 'bodyweight' || info.kind === 'band') {
      const best = Math.max(...sets.map((s) => s.reps));
      const pb = priorSets.length ? Math.max(...priorSets.map((s) => s.reps)) : 0;
      if (priorSets.length && best > pb) prs.push(`${info.name}: ${best} reps seguidas, o teu recorde`);
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
      id: 'b80x6', title: 'Supino 80 kg × 6', color: 'blue', done: best80 >= 6,
      progress: best80 >= 6 ? 1 : prog(TARGET_80x6),
      big: best80 ? `80 × ${best80}` : '—',
      detail: best80 >= 6 ? 'Objetivo cumprido.' : `Melhor série com 80 kg ou mais: ${best80 ? best80 + ' reps' : 'ainda nenhuma'}. Precisas de um 1RM estimado de cerca de ${fmt1(TARGET_80x6)} kg.`,
      target: TARGET_80x6,
    },
    {
      id: 'b100', title: 'Supino 100 kg × 1', color: 'red', done: best100,
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
    status = { level: 'warn', text: 'A média não sobe há 2 semanas. Acrescenta algo fixo ao teu dia: um batido de leite com aveia e banana, ou uma porção extra de arroz ou massa.' };
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
  const ss = sessions().filter((s) => s.date >= ws && s.date <= we);
  const rr = runs().filter((r) => r.date >= ws && r.date <= we);
  return { sessions: ss.length, km: rr.reduce((a, r) => a + (r.km || 0), 0), runs: rr.length };
}

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
  const rows = [['data', 'dia', 'exercicio', 'serie', 'tipo', 'peso_kg', 'reps', 'rpe', 'banda', 'deload']];
  for (const s of sessions().slice().reverse()) {
    for (const e of s.exercises) {
      const name = exInfo(e.ex, e).name;
      let i = 0;
      for (const set of e.sets) {
        if (!set.done) continue;
        i++;
        rows.push([s.date, s.day || '', name, i, set.kind, set.w ?? '', set.reps ?? '', set.rpe ?? '', set.band ?? '', s.deload ? 'sim' : '']);
      }
    }
  }
  return rows.map((r) => r.map((c) => (/[",;\n]/.test(String(c)) ? `"${String(c).replace(/"/g, '""')}"` : c)).join(',')).join('\n');
}

export { BAND_LEVELS, isoToMs };
