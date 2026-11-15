// Progresso, detalhe de exercício e histórico
import { EX, DAYS, MU_STAGES, MILESTONES } from './data.js';
import * as E from './engine.js';
import { put, get } from './store.js';
import { icons, navigate, rerender, toast, header, confirmDialog } from './ui.js';
import { lineChart } from './charts.js';
import { goalMeters } from './view-today.js';
import {
  esc, fmtNum, fmt1, fmtSigned, fmtDate, fmtMonthYear, fmtDuration, todayISO, addDays, weekStart, isoToMs, plural,
} from './util.js';

function forecastText(f, label) {
  if (f.status === 'done') return `${label}: o teu 1RM estimado já lá chegou. Falta fazê-lo na barra.`;
  if (f.status === 'few') return `${label}: preciso de mais ${f.needed} ${plural(f.needed, 'semana', 'semanas')} de registos para estimar quando lá chegas.`;
  if (f.status === 'flat') return `${label}: o 1RM estimado não está a subir nas últimas semanas, por isso não dá para prever.`;
  if (f.status === 'far') return `${label}: ao ritmo atual, mais de 2 anos.`;
  return `${label}: ao ritmo atual (${fmtSigned(f.weekly)} kg por semana), por volta de ${fmtMonthYear(f.date)}.`;
}

function calendar() {
  const today = todayISO();
  const start = addDays(weekStart(today), -7 * 15);
  const trained = new Set(E.sessions().map((s) => s.date));
  const ran = new Map();
  for (const r of E.runs()) ran.set(r.date, (ran.get(r.date) || 0) + (r.km || 0));
  let cells = '';
  for (let w = 0; w < 16; w++) {
    for (let d = 0; d < 7; d++) {
      const iso = addDays(start, w * 7 + d);
      const future = iso > today;
      const t = trained.has(iso);
      const km = ran.get(iso);
      const label = `${fmtDate(iso, { weekday: 'short', day: 'numeric', month: 'short' })}${t ? ': treino' : ''}${km ? `${t ? ' e' : ':'} ${fmt1(km)} km` : ''}`;
      cells += `<span class="cal-cell ${t ? 't' : ''} ${km ? 'r' : ''} ${future ? 'f' : ''} ${iso === today ? 'today' : ''}" style="grid-column:${w + 1};grid-row:${d + 1}" title="${esc(label)}"></span>`;
    }
  }
  const last8 = E.sessions().filter((s) => s.date >= addDays(weekStart(today), -49)).length;
  return `<div class="cal" role="img" aria-label="Treinos nas últimas 16 semanas">${cells}</div>
    <div class="cal-legend"><span><i class="cal-cell t"></i> treino</span><span><i class="cal-cell r"></i> corrida</span></div>
    <p class="muted">Média das últimas 8 semanas: ${fmt1(last8 / 8)} treinos por semana.</p>`;
}

function milestonesBlock() {
  const m = E.milestoneMap();
  const stage = MU_STAGES[E.muStage() - 1];
  return `
    <p class="stage-line"><strong>Fase ${stage.n} de 4: ${esc(stage.name)}.</strong> ${esc(stage.goal)}</p>
    <ul class="milestones">
      ${MILESTONES.map((x) => {
        const s = m[x.id];
        return `<li class="${s.achieved ? 'ok' : ''} ${x.bonus ? 'bonus' : ''} ${x.goal ? 'goal-ms' : ''}">
          <span class="ms-check">${s.achieved ? icons.check : ''}</span>
          <span class="ms-label">${esc(x.label)}</span>
          ${s.achieved
            ? `<span class="ms-date muted">${s.date ? esc(fmtDate(s.date)) : ''}${s.how === 'marcado à mão' ? ' (à mão)' : ''}</span>`
            : `<button class="link small" data-ms="${x.id}">Marcar</button>`}
        </li>`;
      }).join('')}
    </ul>
    <p class="muted small">Os marcos ficam cumpridos sozinhos quando registas as reps num treino.</p>`;
}

function benchRecords() {
  const sets = E.allSets('bench');
  const b = E.S().baseline;
  sets.push({ w: b.bench.w, reps: b.bench.reps, date: b.date });
  const cur = E.currentBenchE1RM();
  let rows = '';
  for (let r = 1; r <= 10; r++) {
    const ok = sets.filter((s) => s.reps >= r);
    const best = ok.length ? ok.reduce((a, s) => (s.w > a.w || (s.w === a.w && s.date < a.date) ? s : a)) : null;
    const est = E.roundW('bench', cur * E.pct(r, 10));
    rows += `<tr><td class="num">${r}</td><td class="num">${best ? `${fmtNum(best.w)} kg` : '—'}</td><td class="muted">${best && best.date ? esc(fmtDate(best.date)) : ''}</td><td class="num muted">${fmtNum(est)} kg</td></tr>`;
  }
  return `<table class="table"><thead><tr><th>Reps</th><th>Melhor</th><th>Quando</th><th>Possível hoje</th></tr></thead><tbody>${rows}</tbody></table>
    <p class="muted small">"Possível hoje" é o peso que, pelo teu 1RM estimado, conseguirias fazer nessas reps a esforço máximo.</p>`;
}

export function renderProgress(root) {
  const goals = E.goals();
  const cur = E.currentBenchE1RM();
  const best = E.bestBenchE1RM();
  const f80 = E.forecast(E.TARGET_80x6);
  const f100 = E.forecast(100);
  const trained = E.trainedExercises().sort((a, b) => b.last.localeCompare(a.last));
  const wp = E.exerciseHistory('weighted_pullup').filter((h) => h.e1rm);

  root.innerHTML = `
    ${header('Progresso')}
    <section class="panel">
      <h2 class="panel-title">Objetivos</h2>
      ${goalMeters(goals)}
      <div class="forecast">
        <p>${esc(forecastText(f80, '80 × 6'))}</p>
        <p>${esc(forecastText(f100, '100 kg'))}</p>
        <p class="muted small">Estimativa grosseira: assume que continuas ao ritmo das últimas semanas, o que raramente é linear.</p>
      </div>
    </section>
    <div class="two-col">
      <section class="panel">
        <h2 class="panel-title">1RM estimado no supino</h2>
        <p class="muted small">Melhor série de cada treino. Atual: <b class="num">${fmt1(cur)} kg</b>; máximo: <b class="num">${fmt1(best)} kg</b>.</p>
        <div class="chart-box" data-chart="bench"></div>
      </section>
      <section class="panel">
        <h2 class="panel-title">Muscle-up</h2>
        ${milestonesBlock()}
      </section>
    </div>
    <div class="two-col">
      <section class="panel">
        <h2 class="panel-title">Recordes no supino</h2>
        ${benchRecords()}
      </section>
      <section class="panel">
        <h2 class="panel-title">Consistência</h2>
        ${calendar()}
      </section>
    </div>
    ${wp.length ? `<section class="panel"><h2 class="panel-title">Elevações com peso</h2><p class="muted small">Peso extra máximo estimado para 1 rep.</p><div class="chart-box" data-chart="wp"></div></section>` : ''}
    <section class="panel">
      <h2 class="panel-title">Exercícios</h2>
      ${trained.length
        ? `<ul class="link-list">${trained.map((t) => `<li><a href="#/exercicio/${t.ex}"><span>${esc(EX[t.ex].name)}</span><span class="muted">${t.count} ${plural(t.count, 'treino', 'treinos')}</span>${icons.chevron}</a></li>`).join('')}</ul>`
        : '<p class="muted">Os exercícios aparecem aqui depois do primeiro treino.</p>'}
    </section>`;

  const hist = E.benchHistory();
  lineChart(root.querySelector('[data-chart="bench"]'), {
    label: '1RM estimado no supino ao longo do tempo',
    series: [{
      name: '1RM estimado', color: 'var(--blue)',
      points: hist.map((p) => ({ x: isoToMs(p.date), y: p.e1rm, tip: `${fmt1(p.e1rm)} kg (${fmtNum(p.bestSet.w)} × ${p.bestSet.reps}${p.bestSet.rpe ? ' @' + fmtNum(p.bestSet.rpe) : ''})` })),
      dots: hist.length < 20,
    }],
    refs: [{ y: E.TARGET_80x6, label: '80×6', color: 'var(--blue)' }, { y: 100, label: '100', color: 'var(--red)' }],
    includeRefs: true,
    yFmt: (v) => fmtNum(v),
    height: 210,
  });
  if (wp.length) {
    lineChart(root.querySelector('[data-chart="wp"]'), {
      label: 'Elevações com peso: peso extra estimado para 1 rep',
      series: [{ name: 'Peso extra (1RM)', color: 'var(--green)', points: wp.map((h) => ({ x: isoToMs(h.date), y: h.e1rm - E.bodyweightAt(h.date), tip: `+${fmt1(h.e1rm - E.bodyweightAt(h.date))} kg` })), dots: true }],
      yFmt: (v) => `+${fmtNum(v)}`,
    });
  }

  root.addEventListener('click', async (e) => {
    const ms = e.target.closest('[data-ms]');
    if (ms) {
      const x = MILESTONES.find((m) => m.id === ms.dataset.ms);
      const ok = await confirmDialog(`Marcar "${x.label}" como cumprido?`, { ok: 'Marcar' });
      if (ok) {
        put('milestones', x.id, { id: x.id, achieved: true, date: todayISO() });
        toast('Marco cumprido');
        rerender();
      }
    }
  });
}

// ---------- Exercício ----------
export function renderExercise(root, { id }) {
  const info = EX[id];
  if (!info) return navigate('#/progresso');
  const hist = E.exerciseHistory(id);
  const loadBased = info.kind !== 'bodyweight' && info.kind !== 'band';
  const pts = hist.filter((h) => (loadBased ? h.e1rm : h.maxReps));
  const yOf = (h) => (loadBased ? (info.kind === 'weighted_bw' ? h.e1rm - E.bodyweightAt(h.date) : h.e1rm) : h.maxReps);
  const fmtSet = (s) => {
    if (!s) return '';
    if (info.kind === 'weighted_bw') return `${s.w ? '+' + fmtNum(s.w) + ' kg × ' : ''}${s.reps}`;
    if (info.kind === 'band') return `banda ${s.band || ''} × ${s.reps}`;
    if (info.kind === 'bodyweight') return `${s.reps} reps`;
    return `${fmtNum(s.w)} × ${s.reps}${s.rpe ? ' @' + fmtNum(s.rpe) : ''}`;
  };
  root.innerHTML = `
    ${header(info.name, { back: '#/progresso', sub: info.note || '' })}
    <section class="panel">
      <h2 class="panel-title">${loadBased ? (info.kind === 'weighted_bw' ? 'Peso extra estimado para 1 rep' : '1RM estimado') : 'Máximo de reps numa série'}</h2>
      <div class="chart-box" data-chart="ex"></div>
    </section>
    <section class="panel">
      <h2 class="panel-title">Técnica</h2>
      <ul class="cues">${(info.cues || []).map((c) => `<li>${esc(c)}</li>`).join('')}</ul>
    </section>
    <section class="panel">
      <h2 class="panel-title">Treinos</h2>
      ${hist.length ? `<table class="table"><thead><tr><th>Data</th><th>Melhor série</th><th>Séries</th></tr></thead><tbody>
        ${hist.slice().reverse().map((h) => `<tr data-href="#/sessao/${h.sessionId}"><td>${esc(fmtDate(h.date))}</td><td class="num">${esc(fmtSet(loadBased ? h.bestSet : h.maxRepsSet))}</td><td class="num">${h.sets}${h.deload ? ' <span class="muted">(deload)</span>' : ''}</td></tr>`).join('')}
      </tbody></table>` : '<p class="muted">Ainda sem registos.</p>'}
    </section>`;
  lineChart(root.querySelector('[data-chart="ex"]'), {
    label: info.name,
    series: [{ name: info.name, color: 'var(--blue)', points: pts.map((h) => ({ x: isoToMs(h.date), y: yOf(h), tip: fmtSet(loadBased ? h.bestSet : h.maxRepsSet) })), dots: true }],
    yFmt: (v) => (info.kind === 'weighted_bw' ? `+${fmtNum(v)}` : fmtNum(v)),
    minSpan: loadBased ? 4 : 2,
  });
  root.addEventListener('click', (e) => {
    const tr = e.target.closest('[data-href]');
    if (tr) navigate(tr.dataset.href);
  });
}

// ---------- Histórico ----------
function sessionHighlight(s) {
  const bench = s.exercises.find((e) => ['bench', 'bench_paused', 'bench_close'].includes(e.ex));
  if (bench) {
    const ws = E.workSets(bench);
    const top = ws.find((x) => x.kind === 'top') || ws.reduce((a, x) => ((x.w || 0) > (a.w || 0) ? x : a), ws[0]);
    if (top) return `${E.exInfo(bench.ex).name} ${fmtNum(top.w)} × ${top.reps}`;
  }
  const mu = s.exercises.find((e) => e.ex === 'muscle_up');
  if (mu) return `Muscle-up: ${Math.max(...E.workSets(mu).map((x) => x.reps))} reps`;
  return `${s.exercises.length} exercícios`;
}

export function renderHistory(root) {
  const ss = E.sessions();
  if (!ss.length) {
    root.innerHTML = `${header('Histórico')}<section class="empty"><p>Ainda não há treinos guardados. O primeiro começa no ecrã Hoje.</p><a class="btn primary" href="#/hoje">Ir para Hoje</a></section>`;
    return;
  }
  const groups = new Map();
  for (const s of ss) {
    const k = s.date.slice(0, 7);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(s);
  }
  let html = header('Histórico', { sub: `${ss.length} ${plural(ss.length, 'treino', 'treinos')}` });
  for (const [k, list] of groups) {
    html += `<section class="panel"><h2 class="panel-title">${esc(fmtMonthYear(isoToMs(k + '-01')))}</h2><ul class="hist-list">`;
    for (const s of list) {
      const tpl = DAYS[s.day];
      html += `<li><a href="#/sessao/${s.id}">
        <span class="hist-date"><span class="num">${s.date.slice(8)}</span><small>${esc(fmtDate(s.date, { weekday: 'short' }))}</small></span>
        <span class="hist-main"><b>${tpl ? `Dia ${s.day}: ${esc(tpl.title)}` : 'Treino livre'}${s.deload ? ' <span class="tag">deload</span>' : ''}</b><span class="muted">${esc(sessionHighlight(s))}</span></span>
        <span class="muted small">${fmtDuration(s.duration || s.finishedAt - s.startedAt)}</span>
      </a></li>`;
    }
    html += `</ul></section>`;
  }
  root.innerHTML = html;
}
