// Treino em curso, edição de sessões passadas e detalhe de uma sessão
import { EX, DAYS, BAND_LEVELS, PAIN_SPOTS, CONDITIONS } from './data.js';
import * as E from './engine.js';
import { local, persistLocal, put, get, remove, syncNow } from './store.js';
import {
  icons, navigate, rerender, toast, modal, confirmDialog, header, startRest, stopRest, unlockAudio, releaseWakeLock, requestWakeLock, applyPendingUpdate,
} from './ui.js';
import { barbellSVG, platesFor, plateText } from './plates.js';
import { resetChosenDay } from './view-today.js';
import { esc, fmtNum, fmt1, fmtDateLong, fmtDuration, parseNum, uid, now, debounce } from './util.js';

const RPES = [6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10];
let editing = null; // cópia de uma sessão passada em edição
const openCues = new Set();
let clockTimer = null;

const saveActive = debounce(() => persistLocal(), 300);

function fmtIn(v) {
  return v === null || v === undefined ? '' : String(v).replace('.', ',');
}

function setLabels(entry) {
  let n = 0;
  return entry.sets.map((s) => {
    if (s.kind === 'warm') return 'Aq';
    if (s.kind === 'top') return 'P';
    n++;
    return String(n);
  });
}

function weightCell(kind, s) {
  if (kind === 'bodyweight') return '<span class="cell-static">corpo</span>';
  if (kind === 'hold') return '<span class="cell-static">barra</span>';
  if (kind === 'band') {
    return `<select data-f="band" class="cell-input" aria-label="Banda">${BAND_LEVELS.map((b) => `<option ${s.band === b ? 'selected' : ''}>${b}</option>`).join('')}</select>`;
  }
  const unit = kind === 'weighted_bw' ? '+kg' : 'kg';
  return `<label class="cell"><input data-f="w" inputmode="decimal" autocomplete="off" class="cell-input num" value="${fmtIn(s.w)}" placeholder="—" aria-label="Peso"><span class="unit">${unit}</span></label>`;
}

function setRow(entry, s, si, ei, label, kind) {
  const warm = s.kind === 'warm';
  return `<div class="set ${s.done ? 'done' : ''} k-${s.kind}" data-e="${ei}" data-s="${si}">
    <span class="set-label ${s.kind === 'top' ? 'top' : ''}" title="${warm ? 'Aquecimento' : s.kind === 'top' ? 'Série principal' : ''}">${label}</span>
    ${weightCell(kind, s)}
    <label class="cell"><input data-f="reps" inputmode="numeric" autocomplete="off" class="cell-input num" value="${fmtIn(s.reps)}" placeholder="${esc(s.tReps || '')}" aria-label="${kind === 'hold' ? 'Segundos' : 'Reps'}"><span class="unit">${kind === 'hold' ? 's' : 'reps'}</span></label>
    ${warm || kind === 'hold'
      ? `<span class="cell-static muted">${warm ? 'aquec.' : ''}</span>`
      : `<select data-f="rpe" class="cell-input rpe ${s.rpe === null || s.rpe === undefined ? 'is-empty' : ''}" aria-label="RPE"><option value="">RPE</option>${RPES.map((r) => `<option value="${r}" ${s.rpe === r ? 'selected' : ''}>${fmtNum(r)}</option>`).join('')}</select>`}
    <button class="done-btn" data-act="done" aria-label="Série feita" aria-pressed="${!!s.done}">${icons.check}</button>
  </div>`;
}

// Nota no início do treino: como fazer as séries e como funciona a progressão.
// Aberta nos primeiros treinos; depois fica fechada (toca para abrir).
function howToSets() {
  const open = E.sessions().length < 4;
  return `<details class="howto" ${open ? 'open' : ''}>
    <summary>Como fazer as séries</summary>
    <ul>
      <li><strong>Esforço:</strong> cada série vai até RPE 8 a 9, ou seja, paras quando ainda conseguias mais 1 ou 2 reps. A primeira série também: não te poupes para as outras. No bench press segue o RPE escrito no exercício (série principal a RPE 8, as seguintes a RPE 7); os aquecimentos são leves.</li>
      <li><strong>Mesmo peso em todas as séries</strong> (fora o bench press do A, que tem uma série principal mais pesada). As reps vão ficar iguais ou descer um pouco (por exemplo 10, 9, 8, 8). É normal: é o cansaço a acumular.</li>
      <li><strong>A progressão é entre treinos:</strong> cada série compara-se com a mesma série da vez anterior. Com o mesmo peso e o mesmo esforço, tenta +1 rep. Quando chegares ao topo da gama em todas as séries, a app sobe o peso.</li>
      <li><strong>Escolher o peso (primeira vez):</strong> se passares do topo da gama e ainda estiveres longe de RPE 8, sobe na série seguinte; se não chegares ao mínimo, baixa.</li>
      <li><strong>Descanso:</strong> respeita o temporizador, que arranca ao marcar a série. Se as reps caírem muito de uma série para a outra, descansa mais.</li>
      <li><strong>Regista o que fizeste de facto:</strong> peso, reps e RPE. O botão (i) de cada exercício tem as dicas de técnica.</li>
    </ul>
  </details>`;
}

function entryCard(entry, ei, session, mode) {
  const info = E.exInfo(entry.ex, entry);
  const kind = info.kind;
  const slot = E.slotById(entry.slotId);
  const anyDone = entry.sets.some((s) => s.done);
  const alts = slot && slot.mode !== 'skill' && info.alts && info.alts.length && !anyDone ? info.alts : null;
  const firstWork = entry.sets.find((s) => s.kind !== 'warm');
  const showBar = kind === 'barbell' && firstWork && firstWork.w;
  const S = E.S();
  const labels = setLabels(entry);
  const allDone = entry.sets.length && entry.sets.every((s) => s.done);
  const tgtRpe = firstWork && firstWork.tRPE ? `, RPE ${fmtNum(firstWork.tRPE)}` : '';
  const plates = showBar ? platesFor(firstWork.w, S.bar, S.plates) : null;
  return `<section class="ex-card ${allDone ? 'all-done' : ''}" data-card="${ei}">
    <header class="ex-head">
      <div class="ex-title">
        <h3>${esc(info.name)}</h3>
        <p class="ex-sub">${esc(entry.target || '')}${entry.mode === 'top_backoff' ? '' : tgtRpe}${info.note ? ` <span class="muted">(${esc(info.note)})</span>` : ''}</p>
      </div>
      <div class="ex-tools">
        ${info.cues && info.cues.length ? `<button class="icon-btn" data-act="cues" aria-label="Técnica" aria-expanded="${openCues.has(entry.key)}">${icons.info}</button>` : ''}
        ${alts ? `<button class="icon-btn" data-act="swap" aria-label="Trocar exercício">${icons.swap}</button>` : ''}
        ${!anyDone ? `<button class="icon-btn" data-act="remove-ex" aria-label="Remover exercício">${icons.trash}</button>` : ''}
      </div>
    </header>
    ${mode === 'active' ? E.remindersFor(entry.ex, session.date)
    // Cada lembrete só aparece no primeiro exercício do treino a que se aplica
    .filter((r) => !session.exercises.slice(0, ei).some((x) => (r.ex || []).includes(x.ex)))
    .map((r) => `
      <div class="reminder" role="note">
        <strong>Lembrete${r.title ? `: ${esc(r.title)}` : ''}</strong>
        <ul>${(r.items || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
        <button class="link" data-act="reminder-done" data-id="${esc(r.id)}">Já não preciso deste lembrete</button>
      </div>`).join('') : ''}
    ${openCues.has(entry.key) ? `<ul class="cues">${info.cues.map((c) => `<li>${esc(c)}</li>`).join('')}</ul>` : ''}
    ${entry.note ? `<p class="ex-note">${esc(entry.note)}</p>` : ''}
    ${showBar ? `<div class="ex-bar">${barbellSVG(plates)}<span class="plate-text">${esc(plateText(plates))}</span></div>` : ''}
    <div class="sets">
      <div class="set set-head" aria-hidden="true"><span>Série</span><span>${kind === 'band' ? 'Banda' : kind === 'bodyweight' || kind === 'hold' ? '' : 'Peso'}</span><span>${kind === 'hold' ? 'Segundos' : 'Reps'}</span><span>${kind === 'hold' ? '' : 'RPE'}</span><span></span></div>
      ${entry.sets.map((s, si) => setRow(entry, s, si, ei, labels[si], kind)).join('')}
    </div>
    <div class="ex-foot">
      <button class="btn ghost small" data-act="add-set">${icons.plus} Série</button>
      ${entry.sets.length ? `<button class="btn ghost small" data-act="remove-set">${icons.minus} Série</button>` : ''}
    </div>
  </section>`;
}

function getSession(mode) {
  return mode === 'edit' ? editing : local.active;
}

function save(mode) {
  if (mode === 'active') saveActive();
}

export function startEdit(id) {
  const s = get('sessions', id);
  if (!s) return false;
  editing = structuredClone(s);
  return true;
}

export function renderWorkout(root, { mode = 'active', id } = {}) {
  if (mode === 'edit' && (!editing || editing.id !== id)) {
    if (!startEdit(id)) return navigate('#/historico');
  }
  const session = getSession(mode);
  if (!session) return navigate('#/hoje');
  if (mode === 'active') requestWakeLock();
  const tpl = DAYS[session.day];
  const title = E.dayTitle(session.day);

  const draw = () => {
    root.innerHTML = `
      <header class="vhead wk-head">
        ${mode === 'edit' ? `<a class="icon-btn back" href="#/sessao/${session.id}" aria-label="Voltar">${icons.back}</a>` : ''}
        <div class="vhead-text">
          <h1>${esc(title)}</h1>
          <p class="vhead-sub">${mode === 'edit' ? 'A editar: ' + esc(fmtDateLong(session.date)) : `<span data-clock>${fmtDuration(Date.now() - session.startedAt)}</span>${session.deload ? ', semana de deload' : ''}`}</p>
        </div>
        ${mode === 'active' ? `<button class="btn ghost small" data-act="discard">Descartar</button>` : ''}
      </header>
      ${mode === 'active' ? howToSets() : ''}
      <div class="ex-list">
        ${session.exercises.map((e, i) => entryCard(e, i, session, mode)).join('')}
      </div>
      <button class="btn secondary block" data-act="add-ex">${icons.plus} Adicionar exercício</button>
      <label class="field notes-field"><span>Notas do treino</span><textarea data-notes class="input" rows="2" placeholder="Como te sentiste, dores, o que mudar">${esc(session.notes || '')}</textarea></label>
      <button class="btn primary block big" data-act="finish">${mode === 'edit' ? 'Guardar alterações' : 'Terminar treino'}</button>`;
  };
  draw();

  if (clockTimer) clearInterval(clockTimer);
  if (mode === 'active') {
    clockTimer = setInterval(() => {
      const c = document.querySelector('[data-clock]');
      if (!c || !local.active) { clearInterval(clockTimer); return; }
      c.textContent = fmtDuration(Date.now() - local.active.startedAt);
    }, 15000);
  }

  const redrawCard = (ei) => {
    const card = root.querySelector(`[data-card="${ei}"]`);
    if (card) card.outerHTML = entryCard(session.exercises[ei], ei, session, mode);
  };

  const updateField = (el) => {
    const row = el.closest('.set');
    if (!row) return;
    const entry = session.exercises[Number(row.dataset.e)];
    const s = entry.sets[Number(row.dataset.s)];
    const f = el.dataset.f;
    if (f === 'w') { s.w = parseNum(el.value); s.auto = false; }
    else if (f === 'reps') s.reps = parseNum(el.value);
    else if (f === 'rpe') { s.rpe = parseNum(el.value); el.classList.toggle('is-empty', s.rpe === null); }
    else if (f === 'band') s.band = el.value;
    save(mode);
  };

  root.addEventListener('input', (e) => {
    if (e.target.matches('[data-f]')) updateField(e.target);
    if (e.target.matches('[data-notes]')) { session.notes = e.target.value; save(mode); }
  });
  root.addEventListener('change', (e) => {
    if (e.target.matches('select[data-f]')) updateField(e.target);
  });
  root.addEventListener('focusin', (e) => {
    if (e.target.matches('input.cell-input')) setTimeout(() => e.target.select && e.target.select(), 0);
  });

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const card = btn.closest('[data-card]');
    const ei = card ? Number(card.dataset.card) : null;
    const entry = ei !== null ? session.exercises[ei] : null;

    if (act === 'done') {
      const row = btn.closest('.set');
      const s = entry.sets[Number(row.dataset.s)];
      const info = E.exInfo(entry.ex, entry);
      if (!s.done) {
        if (E.usesWeight(info.kind) && info.kind !== 'weighted_bw' && (s.w === null || s.w === undefined)) {
          toast('Escreve o peso desta série primeiro.');
          row.querySelector('[data-f="w"]')?.focus();
          return;
        }
        if (s.reps === null || s.reps === undefined) {
          toast('Escreve as reps que fizeste (0 se falhaste).');
          row.querySelector('[data-f="reps"]')?.focus();
          return;
        }
        if (info.kind === 'weighted_bw' && (s.w === null || s.w === undefined)) s.w = 0;
        s.done = true;
        s.doneAt = now();
        if (mode === 'active') {
          unlockAudio();
          const remaining = session.exercises.some((x) => x.sets.some((y) => !y.done));
          if (remaining && s.kind !== 'warm') startRest(E.restFor(entry.ex), info.name);
          else if (remaining && s.kind === 'warm') startRest(60, 'aquecimento');
        }
        if (entry.mode === 'top_backoff' && s.kind === 'top') {
          const slot = E.slotById(entry.slotId);
          if (slot) {
            const nw = E.backoffWeight(slot, entry.ex, s);
            let changed = false;
            entry.sets.forEach((b) => {
              if (b.kind === 'back' && !b.done && b.auto !== false && b.w !== nw) { b.w = nw; changed = true; }
            });
            if (s.rpe === null || s.rpe === undefined) toast('Marca o RPE da série principal para afinar as séries seguintes.', { timeout: 4500 });
            else if (changed) toast(`Séries seguintes ajustadas para ${fmtNum(nw)} kg`);
          }
        }
      } else {
        s.done = false;
      }
      save(mode);
      redrawCard(ei);
    } else if (act === 'add-set') {
      const last = entry.sets[entry.sets.length - 1];
      const base = last ? { ...last } : { kind: 'work', w: null, reps: null };
      entry.sets.push({ ...base, kind: base.kind === 'top' || base.kind === 'warm' ? 'back' : base.kind, done: false, rpe: null, auto: false });
      save(mode);
      redrawCard(ei);
    } else if (act === 'remove-set') {
      let idx = -1;
      for (let i = entry.sets.length - 1; i >= 0; i--) if (!entry.sets[i].done) { idx = i; break; }
      if (idx < 0) idx = entry.sets.length - 1;
      entry.sets.splice(idx, 1);
      save(mode);
      redrawCard(ei);
    } else if (act === 'reminder-done') {
      const r = get('reminders', btn.dataset.id);
      if (r) put('reminders', r.id, { ...r, dismissedAt: now() });
      session.exercises.forEach((x, i) => { if (x.ex === entry.ex || (r && (r.ex || []).includes(x.ex))) redrawCard(i); });
      toast('Lembrete escondido. Continua no histórico.');
    } else if (act === 'cues') {
      if (openCues.has(entry.key)) openCues.delete(entry.key); else openCues.add(entry.key);
      redrawCard(ei);
    } else if (act === 'swap') {
      const info = E.exInfo(entry.ex);
      const slot = E.slotById(entry.slotId);
      const options = [slot.ex, ...(EX[slot.ex].alts || [])].filter((v, i, a) => a.indexOf(v) === i);
      const choice = await modal({
        title: 'Trocar exercício',
        body: `<p class="muted">Fica trocado nos próximos treinos também. Atual: ${esc(info.name)}.</p>
          <div class="choice-list">${options.map((o) => `<button class="choice ${o === entry.ex ? 'on' : ''}" data-pick="${o}">${esc(EX[o].name)}</button>`).join('')}</div>`,
        actions: [{ label: 'Cancelar', value: null }],
        onMount: (wrap, done) => wrap.addEventListener('click', (ev) => {
          const p = ev.target.closest('[data-pick]');
          if (p) done(p.dataset.pick);
        }),
      });
      if (choice && choice !== entry.ex) {
        put('overrides', slot.id, { slotId: slot.id, ex: choice === slot.ex ? null : choice });
        const [fresh] = E.buildEntry(slot, session.deload);
        session.exercises[ei] = fresh;
        save(mode);
        redrawCard(ei);
      }
    } else if (act === 'remove-ex') {
      const ok = await confirmDialog(`Remover ${E.exInfo(entry.ex, entry).name} deste treino?`, { ok: 'Remover' });
      if (ok) {
        session.exercises.splice(ei, 1);
        save(mode);
        draw();
      }
    } else if (act === 'add-ex') {
      const groups = {};
      for (const [id, x] of Object.entries(EX)) (groups[x.group] = groups[x.group] || []).push([id, x]);
      const res = await modal({
        title: 'Adicionar exercício',
        body: `<label class="field"><span>Exercício</span><select class="input" data-pick-ex>
            ${Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map(([id, x]) => `<option value="${id}">${esc(x.name)}</option>`).join('')}</optgroup>`).join('')}
            <option value="custom">Outro…</option></select></label>
          <label class="field" data-custom hidden><span>Nome</span><input class="input" data-custom-name placeholder="Ex.: prancha"></label>
          <label class="field"><span>Séries</span><input class="input num" data-nsets inputmode="numeric" value="3"></label>`,
        actions: [
          { label: 'Cancelar', value: null },
          {
            label: 'Adicionar', kind: 'primary',
            fn: (wrap) => {
              const ex = wrap.querySelector('[data-pick-ex]').value;
              const name = wrap.querySelector('[data-custom-name]').value.trim();
              if (ex === 'custom' && !name) { toast('Escreve o nome do exercício.'); return false; }
              addEx({ ex, name, n: Math.min(10, Math.max(1, parseNum(wrap.querySelector('[data-nsets]').value) || 3)) });
            },
            value: 'ok',
          },
        ],
        onMount: (wrap) => {
          wrap.querySelector('[data-pick-ex]').addEventListener('change', (ev) => {
            wrap.querySelector('[data-custom]').hidden = ev.target.value !== 'custom';
          });
        },
      });
      function addEx({ ex, name, n }) {
        const last = ex !== 'custom' ? E.lastForExercise(ex) : null;
        const lw = last ? E.workSets(last.entry) : [];
        const sets = Array.from({ length: n }, (_, i) => ({ kind: 'work', w: lw[i] ? lw[i].w : lw[0] ? lw[0].w : null, reps: lw[i] ? lw[i].reps : null, rpe: null, done: false }));
        session.exercises.push({ key: uid(), slotId: null, ex: ex === 'custom' ? 'custom' : ex, name: ex === 'custom' ? name : undefined, mode: 'free', target: '', note: last ? `Da última vez: ${lw.map((s) => `${s.w !== null && s.w !== undefined ? fmtNum(s.w) + '×' : ''}${s.reps}`).join(', ')}` : '', sets });
        save(mode);
        draw();
        setTimeout(() => root.querySelector(`[data-card="${session.exercises.length - 1}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
      }
      void res;
    } else if (act === 'discard') {
      const ok = await confirmDialog('Descartar este treino? O que registaste perde-se.', { ok: 'Descartar', danger: true });
      if (ok) {
        local.active = null;
        persistLocal();
        stopRest();
        releaseWakeLock();
        navigate('#/hoje');
        applyPendingUpdate();
      }
    } else if (act === 'finish') {
      finish(session, mode);
    }
  });
}

// Guarda só as séries feitas; o que ficou por fazer vai para "skipped" (fica no histórico,
// mas não conta para pesos, recordes nem marcos).
function cleanSession(session) {
  const c = structuredClone(session);
  const skippedEx = [];
  c.exercises = c.exercises
    .map((e) => {
      const left = e.sets.filter((s) => !s.done && s.kind !== 'warm').length;
      return { ...e, sets: e.sets.filter((s) => s.done).map(({ auto, ...rest }) => rest), ...(left ? { skippedSets: left } : {}) };
    })
    .filter((e) => {
      if (e.sets.length) return true;
      skippedEx.push({ ex: e.ex, slotId: e.slotId || null, name: e.name, target: e.target, prescribed: e.prescribed || null });
      return false;
    });
  if (skippedEx.length) c.skippedExercises = [...(c.skippedExercises || []), ...skippedEx];
  E.annotateSession(c);
  return c;
}

// Perguntas rápidas no fim do treino (todas opcionais)
function feedbackForm(session) {
  const place = DAYS[session.day] && DAYS[session.day].place;
  const chips = (name, opts, multi) => `<div class="chips" data-group="${name}" data-multi="${multi ? 1 : 0}">${opts.map((o) => `<button type="button" class="chip" data-v="${o.value}">${esc(o.label)}</button>`).join('')}</div>`;
  return `<div class="fb">
    <div class="field"><span>Esforço do treino (1 = muito fácil, 10 = máximo)</span>${chips('srpe', [4, 5, 6, 7, 8, 9, 10].map((n) => ({ value: n, label: String(n) })))}</div>
    <div class="field"><span>Energia hoje</span>${chips('energy', [{ value: 1, label: 'Muito baixa' }, { value: 2, label: 'Baixa' }, { value: 3, label: 'Normal' }, { value: 4, label: 'Boa' }, { value: 5, label: 'Ótima' }])}</div>
    <div class="field"><span>Dor ou desconforto</span>${chips('pain', [{ value: 'nenhuma', label: 'Nenhuma' }, ...PAIN_SPOTS], true)}</div>
    ${place === 'estadio' ? `<div class="field"><span>Condições no parque</span>${chips('cond', CONDITIONS, true)}</div>` : ''}
    <label class="field"><span>Notas</span><textarea class="input" data-notes rows="2" maxlength="500" placeholder="Ex.: pulso esquerdo a incomodar no bench press">${esc(session.notes || '')}</textarea></label>
  </div>`;
}

function bindFeedback(wrap, out) {
  wrap.addEventListener('click', (e) => {
    const b = e.target.closest('[data-group] .chip');
    if (!b) return;
    const g = b.parentElement;
    const name = g.dataset.group;
    const multi = g.dataset.multi === '1';
    const v = isNaN(Number(b.dataset.v)) ? b.dataset.v : Number(b.dataset.v);
    if (multi) {
      if (v === 'nenhuma') g.querySelectorAll('.chip').forEach((x) => x !== b && x.classList.remove('on'));
      else g.querySelector('[data-v="nenhuma"]')?.classList.remove('on');
      b.classList.toggle('on');
      out[name] = [...g.querySelectorAll('.chip.on')].map((x) => x.dataset.v);
    } else {
      const on = !b.classList.contains('on');
      g.querySelectorAll('.chip').forEach((x) => x.classList.remove('on'));
      if (on) b.classList.add('on');
      out[name] = on ? v : null;
    }
  });
  const ta = wrap.querySelector('[data-notes]');
  if (ta) ta.addEventListener('input', () => { out.notes = ta.value; });
}

async function finish(session, mode) {
  const clean = cleanSession(session);
  const nSets = clean.exercises.reduce((a, e) => a + e.sets.filter((s) => s.kind !== 'warm').length, 0);
  if (mode === 'edit') {
    const prev = get('sessions', clean.id);
    if (prev) put('revisions', `${clean.id}@${now()}`, { coll: 'sessions', key: clean.id, at: now(), data: prev });
    put('sessions', clean.id, { ...clean, finishedAt: editing.finishedAt || now(), edits: ((prev && prev.edits) || 0) + 1, editedAt: now() });
    editing = null;
    toast('Alterações guardadas');
    navigate(`#/sessao/${clean.id}`);
    return;
  }
  if (!nSets) {
    const ok = await confirmDialog('Ainda não marcaste nenhuma série como feita. Queres descartar o treino?', { ok: 'Descartar', danger: true });
    if (ok) {
      local.active = null;
      persistLocal();
      stopRest();
      releaseWakeLock();
      navigate('#/hoje');
    }
    return;
  }
  const pending = session.exercises.reduce((a, e) => a + e.sets.filter((s) => !s.done && s.kind !== 'warm').length, 0);
  const fb = {};
  const ok = await modal({
    title: 'Terminar treino',
    body: `<p>${nSets} séries feitas em ${fmtDuration(Date.now() - session.startedAt)}.${pending ? ` Há ${pending} séries por marcar; ficam no histórico como não feitas.` : ''}</p>${feedbackForm(session)}`,
    actions: [{ label: 'Voltar', value: false }, { label: 'Guardar treino', value: true, kind: 'primary' }],
    onMount: (wrap) => bindFeedback(wrap, fb),
    autofocus: false,
  });
  if (!ok) return;
  clean.finishedAt = now();
  clean.duration = clean.finishedAt - clean.startedAt;
  if (fb.notes !== undefined) clean.notes = fb.notes.trim();
  const { notes, ...rest } = fb;
  clean.feedback = { srpe: null, energy: null, pain: [], cond: [], ...rest, at: now() };
  if (clean.feedback.srpe) clean.load = Math.round(clean.feedback.srpe * (clean.duration / 60000));
  put('sessions', clean.id, clean);
  local.active = null;
  persistLocal();
  stopRest();
  releaseWakeLock();
  resetChosenDay();
  syncNow();
  navigate(`#/sessao/${clean.id}/novo`);
  setTimeout(applyPendingUpdate, 1500);
}

// ---------- Detalhe da sessão ----------
export function setLine(exId, s, entry) {
  const info = E.exInfo(exId, entry);
  let w = '';
  if (info.kind === 'weighted_bw') w = s.w ? `+${fmtNum(s.w)} kg × ` : '';
  else if (info.kind === 'band') w = `banda ${s.band || ''} × `;
  else if (info.kind !== 'bodyweight' && info.kind !== 'hold' && s.w !== null && s.w !== undefined) w = `${fmtNum(s.w)} × `;
  if (info.kind === 'hold') return `${fmtNum(s.reps)} s`;
  return `${w}${fmtNum(s.reps)}${s.rpe ? ` @${fmtNum(s.rpe)}` : ''}`;
}

export function sessionMeta(s) {
  const bits = [];
  const c = s.ctx || {};
  if (c.makeup) bits.push('Treino de reposição');
  else if (c.extra) bits.push('Treino extra');
  const f = s.feedback || {};
  if (f.srpe) bits.push(`Esforço ${f.srpe}/10`);
  if (f.energy) bits.push(`Energia ${f.energy}/5`);
  const pain = (f.pain || []).filter((p) => p !== 'nenhuma');
  if (pain.length) bits.push(`Dor: ${pain.map((p) => (PAIN_SPOTS.find((x) => x.value === p) || { label: p }).label.toLowerCase()).join(', ')}`);
  if ((f.cond || []).length) bits.push(f.cond.map((v) => (CONDITIONS.find((x) => x.value === v) || { label: v }).label).join(', '));
  const skipped = (s.skippedExercises || []).length + s.exercises.reduce((a, e) => a + (e.skippedSets || 0), 0);
  if (skipped) bits.push(`${skipped} ${skipped === 1 ? 'série ou exercício ficou' : 'séries ou exercícios ficaram'} por fazer`);
  return bits.length ? `<p class="sess-meta muted">${bits.map(esc).join('. ')}.</p>` : '';
}

export function renderSession(root, { id, fresh }) {
  const s = get('sessions', id);
  if (!s) {
    root.innerHTML = header('Sessão não encontrada', { back: '#/historico' });
    return;
  }
  const tpl = DAYS[s.day];
  const prs = E.sessionPRs(s);
  const nSets = s.exercises.reduce((a, e) => a + e.sets.filter((x) => x.kind !== 'warm').length, 0);
  const benchBest = E.exerciseHistory('bench').find((h) => h.sessionId === s.id);
  root.innerHTML = `
    ${header(fresh ? 'Treino guardado' : E.dayTitle(s.day), { back: '#/historico', sub: fmtDateLong(s.date) })}
    <section class="panel summary">
      <div class="stat"><span class="num big2">${fmtDuration(s.duration || (s.finishedAt - s.startedAt))}</span><span class="muted">duração</span></div>
      <div class="stat"><span class="num big2">${nSets}</span><span class="muted">séries</span></div>
      ${benchBest && benchBest.e1rm ? `<div class="stat"><span class="num big2">${fmt1(benchBest.e1rm)} kg</span><span class="muted">1RM estimado no bench press</span></div>` : ''}
    </section>
    ${prs.length ? `<section class="panel prs"><h2 class="panel-title">Recordes</h2><ul>${prs.map((p) => `<li>${esc(p)}</li>`).join('')}</ul></section>` : fresh ? '<p class="muted">Sem recordes hoje; o que conta é a consistência.</p>' : ''}
    ${s.deload ? '<p class="muted">Semana de deload.</p>' : ''}
    ${sessionMeta(s)}
    <section class="panel">
      ${s.exercises.map((e) => `
        <div class="sess-ex">
          <h3>${esc(E.exInfo(e.ex, e).name)}</h3>
          <p class="sess-sets num">${e.sets.filter((x) => x.kind !== 'warm').map((x) => `<span class="${x.kind === 'top' ? 'top' : ''}">${esc(setLine(e.ex, x, e))}</span>`).join('')}</p>
        </div>`).join('')}
      ${s.notes ? `<p class="sess-notes">${esc(s.notes)}</p>` : ''}
    </section>
    <div class="row-actions">
      ${fresh ? '<a class="btn primary" href="#/hoje">Feito</a>' : ''}
      <button class="btn secondary" data-act="edit">${icons.edit} Editar</button>
      <button class="btn ghost danger-text" data-act="delete">${icons.trash} Apagar</button>
    </div>`;

  root.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    if (b.dataset.act === 'edit') {
      startEdit(s.id);
      navigate(`#/sessao/${s.id}/editar`);
    } else if (b.dataset.act === 'delete') {
      const ok = await confirmDialog('Apagar este treino? Não dá para desfazer.', { ok: 'Apagar', danger: true });
      if (ok) {
        remove('sessions', s.id);
        toast('Treino apagado');
        navigate('#/historico');
      }
    }
  });
}

export { rerender };
