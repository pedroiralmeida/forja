// Ecrã "Hoje" e configuração inicial
import { DAYS } from './data.js';
import * as E from './engine.js';
import { local, put, setSettings, persistLocal, remove } from './store.js';
import { icons, navigate, rerender, toast, header, segmented, requestWakeLock } from './ui.js';
import { barbellSVG, platesFor, plateText } from './plates.js';
import { esc, fmtNum, fmt1, fmtDateLong, todayISO, parseNum, weekStart, fmtDuration, plural } from './util.js';

let chosenDay = null;
export function resetChosenDay() {
  chosenDay = null;
}

const BENCH_FAMILY = ['bench', 'bench_paused', 'bench_close'];

export function weightSummary(entry) {
  const info = E.exInfo(entry.ex, entry);
  const work = entry.sets.filter((s) => s.kind !== 'warm');
  if (info.kind === 'bodyweight') return 'peso corporal';
  if (info.kind === 'band') return `banda ${(work[0] && work[0].band) || 'média'}`;
  const ws = [...new Set(work.map((s) => s.w))];
  if (!ws.length || ws.every((w) => w === null || w === undefined)) return 'escolhe o peso';
  const each = info.kind === 'dumbbell' ? ' cada' : '';
  const f = (w) => (info.kind === 'weighted_bw' ? (w ? `+${fmtNum(w)} kg` : 'sem peso extra') : `${fmtNum(w)} kg${each}`);
  if (entry.mode === 'top_backoff' && work.length > 1 && work[0].w !== work[1].w) return `${f(work[0].w)}, depois ${f(work[1].w)}`;
  return ws.length === 1 ? f(ws[0]) : ws.map(f).join(' / ');
}

export function goalMeters(goals, compact = false) {
  return `<div class="goals ${compact ? 'compact' : ''}">${goals
    .map((g) => `
      <div class="goal goal-${g.color} ${g.done ? 'is-done' : ''}">
        <div class="goal-top"><span class="goal-title">${esc(g.title)}</span><span class="goal-big num">${esc(g.big)}</span></div>
        <div class="meter" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(g.progress * 100)}" aria-label="${esc(g.title)}"><span style="width:${Math.max(2, g.progress * 100)}%"></span></div>
        ${compact ? '' : `<p class="goal-detail">${esc(g.detail)}</p>`}
      </div>`)
    .join('')}</div>`;
}

function habitsCard(today) {
  const h = E.habitsFor(today);
  const target = E.proteinTarget();
  const bwToday = E.bodyweightEntries().find((b) => b.date === today);
  const pct = Math.min(100, (h.protein / target) * 100);
  return `
  <section class="panel">
    <h2 class="panel-title">O teu dia</h2>
    <div class="daily">
      <div class="daily-row">
        <div class="daily-label">Peso de hoje</div>
        ${bwToday
          ? `<div class="daily-value"><span class="num big2">${fmt1(bwToday.kg)} kg</span> <button class="link" data-act="bw-edit">Alterar</button></div>`
          : `<form class="inline-form" data-form="bw"><input name="kg" inputmode="decimal" placeholder="${fmt1(E.latestBodyweight())}" aria-label="Peso em kg" class="input num"><span class="unit">kg</span><button class="btn secondary small">Guardar</button></form>`}
      </div>
      <div class="daily-row">
        <div class="daily-label">Proteína <span class="muted">aprox.</span></div>
        <div class="daily-value">
          <div class="protein-line"><span class="num big2">${fmtNum(h.protein)}</span><span class="muted"> de ${target} g</span></div>
          <div class="meter thin"><span style="width:${Math.max(1, pct)}%"></span></div>
          <div class="chips">
            <button class="chip" data-prot="35">+ refeição (35 g)</button>
            <button class="chip" data-prot="25">+ whey (25 g)</button>
            ${h.protein ? '<button class="chip ghost" data-prot="-25" aria-label="Tirar 25 gramas">−25</button>' : ''}
          </div>
        </div>
      </div>
      <div class="daily-row">
        <div class="daily-label">Creatina</div>
        <div class="daily-value">
          <button class="toggle ${h.creatine ? 'on' : ''}" data-act="creatine" aria-pressed="${h.creatine}">${h.creatine ? icons.check + ' Tomada' : 'Marcar como tomada'}</button>
          ${E.creatineStreak() > 1 ? `<span class="muted small">${E.creatineStreak()} dias seguidos</span>` : ''}
        </div>
      </div>
    </div>
  </section>`;
}

export function renderToday(root) {
  const S = E.S();
  if (!S.onboarded) return navigate('#/inicio');
  const today = todayISO();
  const order = E.dayOrder();
  const day = chosenDay && order.includes(chosenDay) ? chosenDay : E.nextDay();
  const next = E.nextDay();
  const deloadOn = E.isDeloadWeek();
  const session = E.buildSession(day, { deload: deloadOn });
  const tpl = DAYS[day];
  const main = session.exercises.find((e) => BENCH_FAMILY.includes(e.ex));
  const mainSets = main ? main.sets.filter((s) => s.kind !== 'warm') : [];
  const W = mainSets.length ? mainSets[0].w : null;
  const plates = W ? platesFor(W, S.bar, S.plates) : null;
  const sugg = E.deloadSuggestion();
  const showSugg = sugg && local.dismissDeload !== weekStart(today);
  const week = E.weekSummary();
  const active = local.active;
  const mins = E.estimateMinutes(session);

  let html = header('Hoje', { sub: fmtDateLong(today) });

  if (active) {
    const elapsed = Date.now() - active.startedAt;
    html += `<section class="banner active-banner">
      <div><strong>Treino em curso: dia ${esc(active.day)}</strong><p>Começou há ${fmtDuration(elapsed)}.</p></div>
      <a class="btn primary" href="#/treino">Continuar treino</a>
    </section>`;
  }

  if (deloadOn) {
    html += `<section class="banner"><div><strong>Semana de deload</strong><p>Menos séries e cerca de 10% menos peso em todos os exercícios.</p></div><button class="btn secondary small" data-act="deload-off">Desativar</button></section>`;
  } else if (showSugg) {
    html += `<section class="banner"><div><strong>Altura de um deload?</strong><p>${esc(sugg.reason)}</p></div>
      <div class="banner-actions"><button class="btn secondary small" data-act="deload-on">Fazer esta semana</button><button class="btn ghost small" data-act="deload-dismiss">Agora não</button></div></section>`;
  }

  html += `<section class="today-hero">
    <div class="day-pick" role="tablist" aria-label="Escolher o treino">
      ${order.map((d) => `<button role="tab" class="day-chip ${d === day ? 'on' : ''}" data-day="${d}" aria-selected="${d === day}">
        <span class="day-letter">${d}</span><span class="day-name">${esc(DAYS[d].title)}</span>${d === next ? '<span class="day-next">a seguir</span>' : ''}</button>`).join('')}
    </div>
    <div class="hero-main">
      <div class="hero-head">
        <h2>Dia ${day}: ${esc(tpl.title)}</h2>
        <p class="muted">${esc(tpl.blurb)} Cerca de ${mins} min.</p>
      </div>
      ${main && W ? `
      <div class="hero-lift">
        <div class="hero-lift-text">
          <span class="hero-ex">${esc(E.exInfo(main.ex).name)}</span>
          <span class="hero-weight num">${fmtNum(W)}<small> kg</small></span>
          <span class="hero-target">${esc(main.target)}</span>
        </div>
        <div class="hero-bar">${barbellSVG(plates)}<p class="plate-text">${esc(plateText(plates))}</p></div>
      </div>` : ''}
      <ol class="plan-list">
        ${session.exercises.map((e) => `
          <li class="${BENCH_FAMILY.includes(e.ex) ? 'is-main' : ''}">
            <span class="plan-name">${esc(E.exInfo(e.ex, e).name)}</span>
            <span class="plan-target num">${esc(e.target)}</span>
            <span class="plan-weight">${esc(weightSummary(e))}</span>
          </li>`).join('')}
      </ol>
      ${active
        ? ''
        : `<button class="btn primary block big" data-act="start">Começar treino</button>`}
    </div>
  </section>`;

  html += `<div class="two-col">`;
  html += habitsCard(today);
  html += `<section class="panel">
    <h2 class="panel-title">Esta semana</h2>
    <p class="week-line"><span class="num big2">${week.sessions}</span> de ${S.daysPerWeek} treinos${week.km ? `, <span class="num big2">${fmt1(week.km)}</span> km de corrida` : ''}</p>
    ${goalMeters(E.goals(), true)}
    <a class="link" href="#/progresso">Ver progresso</a>
  </section>`;
  html += `</div>`;

  root.innerHTML = html;

  root.addEventListener('click', async (e) => {
    const dayBtn = e.target.closest('[data-day]');
    if (dayBtn) {
      chosenDay = dayBtn.dataset.day;
      rerender();
      return;
    }
    const prot = e.target.closest('[data-prot]');
    if (prot) {
      const h = E.habitsFor(today);
      put('habits', today, { ...h, protein: Math.max(0, (h.protein || 0) + Number(prot.dataset.prot)) });
      rerender();
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'start') {
      local.active = E.buildSession(day, { deload: deloadOn });
      persistLocal();
      requestWakeLock();
      navigate('#/treino');
    } else if (a === 'creatine') {
      const h = E.habitsFor(today);
      put('habits', today, { ...h, creatine: !h.creatine });
      rerender();
    } else if (a === 'bw-edit') {
      remove('bodyweight', today);
      rerender();
    } else if (a === 'deload-on') {
      const wk = weekStart(today);
      put('deloadWeeks', wk, { week: wk, on: true });
      toast('Semana de deload ativada');
      rerender();
    } else if (a === 'deload-off') {
      const wk = weekStart(today);
      put('deloadWeeks', wk, { week: wk, on: false });
      rerender();
    } else if (a === 'deload-dismiss') {
      local.dismissDeload = weekStart(today);
      persistLocal();
      rerender();
    }
  });

  root.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form="bw"]');
    if (!f) return;
    e.preventDefault();
    const kg = parseNum(f.kg.value);
    if (!kg || kg < 30 || kg > 250) {
      toast('Escreve o peso em kg, por exemplo 64,2');
      return;
    }
    put('bodyweight', today, { date: today, kg });
    toast('Peso guardado');
    rerender();
  });
}

// ---------- Configuração inicial ----------
export function renderOnboarding(root) {
  const S = E.S();
  const b = S.baseline;
  root.innerHTML = `
  <div class="onboard">
    <div class="onboard-mark">${barbellSVG(platesFor(80, 20, [25, 20, 15, 10, 5, 2.5, 1.25]))}</div>
    <h1 class="onboard-title">Forja</h1>
    <p class="onboard-lead">O teu plano para o muscle-up e para os 100 kg no supino. Confirma o ponto de partida; os pesos de cada treino são calculados a partir daqui.</p>
    <form class="form" data-form="onboard">
      <fieldset>
        <legend>Supino: a tua melhor série recente</legend>
        <div class="field-row">
          <label class="field"><span>Peso</span><span class="with-unit"><input name="w" inputmode="decimal" value="${fmtNum(b.bench.w)}" class="input num"><i>kg</i></span></label>
          <label class="field"><span>Reps</span><input name="reps" inputmode="numeric" value="${b.bench.reps}" class="input num"></label>
          <label class="field"><span>Esforço (RPE)</span>
            <select name="rpe" class="input">${[10, 9.5, 9, 8.5, 8, 7].map((r) => `<option value="${r}" ${r === b.bench.rpe ? 'selected' : ''}>${fmtNum(r)}${r === 10 ? ' (máximo)' : ''}</option>`).join('')}</select>
          </label>
        </div>
      </fieldset>
      <div class="field-row">
        <label class="field"><span>Elevações seguidas</span><input name="pullups" inputmode="numeric" value="${b.pullups}" class="input num"></label>
        <label class="field"><span>Peso corporal</span><span class="with-unit"><input name="bw" inputmode="decimal" value="${fmtNum(b.bw)}" class="input num"><i>kg</i></span></label>
      </div>
      <div class="field"><span>Dias de treino por semana</span>${segmented('days', [{ value: 3, label: '3 dias' }, { value: 4, label: '4 dias' }], S.daysPerWeek)}</div>
      <div class="field"><span>O ginásio tem discos de 1,25 kg?</span>${segmented('small', [{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não, o mais pequeno é 2,5 kg' }], S.plates.includes(1.25) ? 'yes' : 'no')}</div>
      <button class="btn primary block big">Começar</button>
      <p class="muted center small">Já usas a Forja noutro dispositivo? <a href="#/mais/sync">Liga a sincronização</a> em vez de recomeçar.</p>
    </form>
  </div>`;

  root.querySelector('[data-form="onboard"]').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target;
    const w = parseNum(f.w.value);
    const reps = parseNum(f.reps.value);
    const bw = parseNum(f.bw.value);
    const pullups = parseNum(f.pullups.value) || 0;
    if (!w || !reps || reps > 20) return toast('Confirma o peso e as reps do supino.');
    if (!bw || bw < 30) return toast('Confirma o teu peso corporal.');
    const today = todayISO();
    const plates = f.small.value === 'yes' ? [25, 20, 15, 10, 5, 2.5, 1.25] : [25, 20, 15, 10, 5, 2.5];
    setSettings({
      onboarded: true,
      daysPerWeek: Number(f.days.value),
      plates,
      baseline: { date: today, bench: { w, reps, rpe: Number(f.rpe.value) }, pullups, bw },
    });
    put('bodyweight', today, { date: today, kg: bw });
    toast(`Pronto. 1RM estimado de partida: ${fmt1(E.e1rm(w, reps, Number(f.rpe.value)))} kg`, { timeout: 5000 });
    navigate('#/hoje');
  });
}

export { plural };
