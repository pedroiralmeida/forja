// Ecrã "Hoje" e configuração inicial
import { DAYS, PLACES, MU_STAGES, MISS_REASONS, WEEKDAYS } from './data.js';
import * as E from './engine.js';
import { local, put, get, setSettings, persistLocal, remove, syncNow } from './store.js';
import { icons, navigate, rerender, toast, header, segmented, requestWakeLock, modal, confirmDialog, stopRest, releaseWakeLock, applyPendingUpdate } from './ui.js';
import { barbellSVG, platesFor, plateText } from './plates.js';
import { proteinBlock, bindProtein } from './protein.js';
import { setLine, sessionMeta } from './view-workout.js';
import { mealsPanel, bindMeals, logDay, daySwitch, dayWord } from './meals.js';
import { openDayImage } from './story.js';
import { esc, fmtNum, fmt1, fmtDateLong, fmtDate, todayISO, parseNum, weekStart, fmtDuration, plural, isoToMs, addDays, now } from './util.js';

const PLACE_NAME = { supera: 'Supera', estadio: 'Estádio' };

function weekdayName(iso) {
  return WEEKDAYS[new Date(isoToMs(iso)).getDay()].toLowerCase();
}

// Escolha do motivo de uma falta (guardado em days/<data>)
async function askReason(iso, { skip = false } = {}) {
  const p = E.planFor(iso);
  const res = await modal({
    title: skip ? 'Hoje não dá para treinar' : `Treino de ${weekdayName(iso)} (${PLACE_NAME[p] || ''})`,
    body: `<p>${skip ? 'Fica registado. ' : ''}O que aconteceu?</p>
      <div class="chips reason-chips">${MISS_REASONS.map((r) => `<button class="chip" data-reason="${r.value}">${esc(r.label)}</button>`).join('')}
      ${skip ? '' : '<button class="chip" data-reason="nao-registado">Treinei mas não registei</button>'}</div>
      <label class="field"><span>Nota (opcional)</span><input class="input" data-note maxlength="200" placeholder="${skip ? 'Ex.: reunião até tarde' : 'Ex.: estava com dor no pulso'}"></label>`,
    actions: [{ label: 'Cancelar', value: null }],
    autofocus: false,
    onMount: (wrap, done) => {
      wrap.addEventListener('click', (e) => {
        const b = e.target.closest('[data-reason]');
        if (b) done({ reason: b.dataset.reason, note: wrap.querySelector('[data-note]').value.trim() });
      });
    },
  });
  if (!res) return false;
  put('days', iso, {
    date: iso, plan: p, reason: res.reason, note: res.note || '', missed: res.reason !== 'nao-registado', skip, decidedAt: now(),
    decidedBefore: skip, weekdayName: weekdayName(iso),
  });
  return true;
}

let chosenDay = null;
let chosenPlace = null;
export function resetChosenDay() {
  chosenDay = null;
  chosenPlace = null;
}

const BENCH_FAMILY = ['bench', 'bench_paused', 'bench_close'];

export function weightSummary(entry) {
  const info = E.exInfo(entry.ex, entry);
  const work = entry.sets.filter((s) => s.kind !== 'warm');
  if (info.kind === 'bodyweight') return 'peso corporal';
  if (info.kind === 'hold') return 'pendurado na barra';
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

function habitsCard(realToday, trainingDayToday) {
  // Dia dos registos: hoje, ou ontem / outro dia passado escolhido nos botões
  const today = logDay();
  const isToday = today === realToday;
  const trainingDay = isToday && trainingDayToday;
  const h = E.habitsFor(today);
  const target = E.proteinTarget();
  const bwToday = E.bodyweightEntries().find((b) => b.date === today);
  return `
  <section class="panel ${isToday ? '' : 'log-past'}" data-log-date="${today}">
    <div class="meals-head">
      <h2 class="panel-title">${isToday ? 'O teu dia' : esc(dayWord(today, true))}</h2>
      ${daySwitch()}
    </div>
    ${isToday ? '' : `<p class="muted small log-past-note">Estás a registar ${esc(dayWord(today))}. Volta a "Hoje" quando acabares.</p>`}
    <div class="daily">
      ${trainingDay ? `<div class="daily-row"><div class="daily-label">Antes do treino</div><div class="daily-value"><span>Lanche por volta das 17h, antes de saíres do trabalho: sandes e iogurte, ou banana e skyr.</span></div></div>` : ''}
      ${(() => {
        const ws = E.waistStats();
        const ss = E.shoulderStats();
        const bits = [];
        if (ws && ws.daysSince >= 7) bits.push(`cintura há ${ws.daysSince} dias`);
        if (ws && (!ss || ss.daysSince >= 28)) bits.push(ss ? `ombros há ${ss.daysSince} dias` : 'ombros ainda por medir');
        return bits.length && isToday ? `<div class="daily-row"><div class="daily-label">Medidas</div><div class="daily-value"><span>Última medição: ${bits.join(', ')}.</span> <a class="link" href="#/corpo">Medir</a></div></div>` : '';
      })()}
      <div class="daily-row">
        <div class="daily-label">Peso ${isToday ? 'de hoje' : `de ${esc(dayWord(today))}`}</div>
        ${bwToday
          ? `<div class="daily-value"><span class="num big2">${fmt1(bwToday.kg)} kg</span> <button class="link" data-act="bw-edit">Alterar</button></div>`
          : `<form class="inline-form" data-form="bw"><input name="kg" inputmode="decimal" placeholder="${fmt1(E.latestBodyweight())}" aria-label="Peso em kg" class="input num"><span class="unit">kg</span><button class="btn secondary small">Guardar</button></form>`}
      </div>
      <div class="daily-row">
        <div class="daily-label">Proteína <span class="muted">aprox.</span></div>
        <div class="daily-value">${proteinBlock(h, target, { compact: true })}</div>
      </div>
      <div class="daily-row">
        <div class="daily-label">Creatina</div>
        <div class="daily-value">
          <button class="toggle ${h.creatine ? 'on' : ''}" data-act="creatine" aria-pressed="${h.creatine}">${h.creatine ? icons.check + ' Tomada' : 'Marcar como tomada'}</button>
          <span class="muted small">${esc(E.S().creatineNote || '1 medida por dia')}${E.creatineStreak() > 1 ? `, ${E.creatineStreak()} dias seguidos` : ''}</span>
        </div>
      </div>
      ${(() => {
        const band = E.sleepBand(h);
        return `<div class="daily-row">
        <div class="daily-label">Sono <span class="muted">${isToday ? 'esta noite' : 'na noite antes'}</span></div>
        <div class="daily-value sleep-pick">
          ${E.SLEEP_BANDS.map((x) => `<button class="toggle sleep-${x.value} ${band === x.value ? 'on' : ''}" data-act="sleep-band" data-v="${x.value}" aria-pressed="${band === x.value}">${x.label}</button>`).join('')}
          ${h.sleep ? `<span class="muted small">${fmtNum(h.sleep)} h registadas em Corpo</span>` : ''}
        </div>
      </div>`;
      })()}
    </div>
    <div class="day-image">
      <button class="btn secondary" data-act="day-image">${icons.image} Imagem ${isToday ? 'do dia' : `de ${esc(dayWord(today))}`} para a história</button>
    </div>
  </section>`;
}

// Os 7 dias da semana: feito, falhado, por fazer, descanso
function weekDots(st, today) {
  const lbl = { feito: 'feito', extra: 'treino extra', falhado: 'falhado', 'por-fazer': 'por fazer', livre: 'sem treino', antes: 'antes de começares' };
  return `<div class="week-dots" aria-label="Dias desta semana">${st.days.map((d) => {
    const t = d.plan === 'supera' || d.plan === 'estadio';
    const kind = d.status === 'feito' || d.status === 'extra' ? 'done' : d.status === 'falhado' ? 'miss' : t || E.isFlex(d.plan) ? 'todo' : 'rest';
    const letter = WEEKDAYS[new Date(isoToMs(d.date)).getDay()].slice(0, 3);
    const what = d.plan === 'livre' ? 'reposição' : d.plan === 'repor' ? 'reposição opcional' : PLACE_NAME[d.plan] || d.plan;
    return `<span class="wd ${kind} ${d.date === today ? 'today' : ''} ${E.isFlex(d.plan) ? 'flex' : ''}" title="${esc(`${fmtDate(d.date)}: ${what}, ${lbl[d.status] || ''}`)}"><i>${letter}</i></span>`;
  }).join('')}</div>`;
}

function clock(ms) {
  return ms ? new Date(ms).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' }) : '';
}

function dayLabel(iso, today) {
  if (iso === addDays(today, 1)) return 'Amanhã';
  return weekdayName(iso).replace(/^./, (c) => c.toUpperCase());
}

// Resumo do treino feito hoje, no lugar do próximo treino
function doneCard(s) {
  const work = s.exercises.map((e) => ({ e, sets: e.sets.filter((x) => x.kind !== 'warm') })).filter((x) => x.sets.length);
  const nSets = work.reduce((a, x) => a + x.sets.length, 0);
  const bench = E.exerciseHistory('bench').find((h) => h.sessionId === s.id);
  const prs = E.sessionPRs(s);
  const dur = s.duration || (s.finishedAt - s.startedAt);
  return `<section class="done-card">
    <div class="done-head">
      <span class="done-badge">${icons.check} Treino terminado</span>
      <h2>${esc(E.dayTitle(s.day))}</h2>
      ${s.startedAt && s.finishedAt ? `<p class="muted">Das ${clock(s.startedAt)} às ${clock(s.finishedAt)}</p>` : ''}
    </div>
    <div class="summary done-stats">
      <div class="stat"><span class="num big2">${fmtDuration(dur)}</span><span class="muted">duração</span></div>
      <div class="stat"><span class="num big2">${nSets}</span><span class="muted">séries</span></div>
      ${bench && bench.e1rm ? `<div class="stat"><span class="num big2">${fmt1(bench.e1rm)} kg</span><span class="muted">1RM estimado no bench press</span></div>` : ''}
    </div>
    ${prs.length ? `<div class="done-prs"><strong>Recordes</strong><ul>${prs.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    ${sessionMeta(s)}
    <div class="done-ex">${work.map(({ e, sets }) => `
      <div class="sess-ex">
        <h3>${esc(E.exInfo(e.ex, e).name)}</h3>
        <p class="sess-sets num">${sets.map((x) => `<span class="${x.kind === 'top' ? 'top' : ''}">${esc(setLine(e.ex, x, e))}</span>`).join('')}</p>
      </div>`).join('')}</div>
    ${s.notes ? `<p class="sess-notes">${esc(s.notes)}</p>` : ''}
    <a class="btn secondary" href="#/sessao/${esc(s.id)}">Ver ou editar</a>
  </section>`;
}

// Próximos dias com treino; tocar num mostra o plano dele mais abaixo
function upcomingList(up, today, shown) {
  if (!up.length) return '<p class="muted">Sem treinos no plano para os próximos dias.</p>';
  return `<ul class="up-list">${up.map((u) => {
    const what = u.place
      ? `<span class="up-what">${esc(E.dayTitle(u.day))}</span>`
      : `<span class="up-what muted">${u.plan === 'repor' ? 'Reposição opcional, se ainda faltar algum treino' : 'Reposição, só se faltares a algum treino'}</span>`;
    const inner = `<span class="up-day">${esc(dayLabel(u.date, today))} <span class="muted">${esc(fmtDate(u.date))}</span></span>${what}`;
    return `<li>${u.place
      ? `<button class="up-row ${shown && shown.date === u.date ? 'on' : ''}" data-preview="${u.place}:${u.day}:${u.date}">${inner}</button>`
      : `<div class="up-row static">${inner}</div>`}</li>`;
  }).join('')}</ul>`;
}

export function renderToday(root) {
  const S = E.S();
  if (!S.onboarded) return navigate('#/inicio');
  const today = todayISO();
  const plan = E.planFor(today);
  const sug = E.isFlex(plan) ? E.suggestPlace(today) : null;
  // Treino aberto neste dispositivo que ficou esquecido: de outro dia, com mais de 4 horas,
  // ou começado antes de um treino que já guardaste hoje (por exemplo, noutro dispositivo)
  const openActive = local.active;
  const savedAfter = openActive ? E.sessions().filter((x) => x.date === today && (x.finishedAt || 0) > (openActive.startedAt || 0)) : [];
  const staleActive = !!openActive && (openActive.date !== today || Date.now() - (openActive.startedAt || 0) > 4 * 3600e3 || savedAfter.length > 0);
  const active = staleActive ? null : openActive;
  // Já treinaste hoje: mostra o resumo e, abaixo, os próximos treinos
  const doneToday = active ? [] : E.sessions().filter((x) => x.date === today).reverse();
  const isDone = doneToday.length > 0;
  const up = isDone ? E.upcomingPlan(today) : [];
  const nextUp = up.find((u) => u.place);
  const autoPlace = isDone && nextUp ? nextUp.place
    : plan === 'estadio' ? 'estadio' : E.isFlex(plan) && sug.place ? sug.place : 'supera';
  const place = chosenPlace || autoPlace;
  const order = E.dayOrder(place);
  const next = E.nextDay(place);
  const day = chosenDay && order.includes(chosenDay) ? chosenDay : next;
  const shown = isDone ? (up.find((u) => u.place === place && u.day === day) || up.find((u) => u.place === place) || null) : null;
  const hoursIso = shown ? shown.date : today;
  const deloadOn = E.isDeloadWeek();
  const session = E.buildSession(day, { deload: deloadOn });
  const tpl = DAYS[day];
  const hours = E.placeHours(place, hoursIso);
  const hoursWhen = hoursIso === today ? 'hoje' : hoursIso === addDays(today, 1) ? 'amanhã' : weekdayName(hoursIso);
  const main = session.exercises.find((e) => BENCH_FAMILY.includes(e.ex));
  const mainSets = main ? main.sets.filter((s) => s.kind !== 'warm') : [];
  const W = mainSets.length ? mainSets[0].w : null;
  const plates = W ? platesFor(W, S.bar, S.plates) : null;
  const stage = MU_STAGES[E.muStage() - 1];
  const sugg = E.deloadSuggestion();
  const showSugg = sugg && local.dismissDeload !== weekStart(today);
  const week = E.weekSummary();
  const mins = E.estimateMinutes(session);
  const firstEver = E.sessions().length === 0;
  const trainingDay = plan === 'supera' || plan === 'estadio';

  let html = header('Hoje', { sub: fmtDateLong(today) });
  // Sincronização com erro: no telemóvel o indicador da barra lateral não aparece, por isso avisa aqui
  if (local.sync.token && local.sync.status === 'error') {
    const last = local.sync.lastSync ? new Date(local.sync.lastSync) : null;
    const when = last ? ` desde ${fmtDate(todayISO(last))} às ${String(last.getHours()).padStart(2, '0')}:${String(last.getMinutes()).padStart(2, '0')}` : '';
    html += `<section class="banner warn sync-banner"><p><strong>Os dados deste dispositivo não estão a ser guardados no GitHub${when}.</strong> ${esc(local.sync.lastError || '')}</p><div class="row-actions"><button class="btn small primary" data-act="sync-retry">Tentar outra vez</button><a class="btn small ghost" href="#/mais/sync">Ver sincronização</a></div></section>`;
  }
  html += E.generalReminders(today).map((r) => `<section class="daily-reminder"><p><strong>${esc(r.title || 'Lembrete')}:</strong> ${esc(r.short || '')}${(r.items || []).map((i) => ` <span class="muted">${esc(i)}</span>`).join('')}</p><button class="btn ghost small" data-act="general-reminder-done" data-id="${esc(r.id)}">Já não preciso</button></section>`).join('');

  if (staleActive) {
    const nDone = openActive.exercises.reduce((a, e) => a + e.sets.filter((x) => x.done && x.kind !== 'warm').length, 0);
    html += `<section class="banner stale-banner"><div><strong>Ficou um treino aberto neste dispositivo</strong>
      <p>${esc(E.dayTitle(openActive.day))}, começado há ${fmtDuration(Date.now() - openActive.startedAt)}${openActive.date !== today ? ` (${esc(fmtDate(openActive.date))})` : ''} e nunca terminado.${savedAfter.length ? ` Hoje já guardaste o ${esc(E.dayTitle(savedAfter[0].day))}, por isso este pode ser descartado.` : ''} ${nDone ? `Tem ${nDone} ${nDone === 1 ? 'série feita' : 'séries feitas'}: abre-o para terminar e guardar, se for para manter.` : 'Não tem nenhuma série feita.'}</p></div>
      <div class="banner-actions"><button class="btn secondary small" data-act="stale-discard">Descartar</button><a class="btn ghost small" href="#/treino">Abrir</a></div></section>`;
  }

  if (active) {
    const elapsed = Date.now() - active.startedAt;
    html += `<section class="banner active-banner">
      <div><strong>Treino em curso: ${esc(E.dayTitle(active.day))}</strong><p>Começou há ${fmtDuration(elapsed)}.</p></div>
      <a class="btn primary" href="#/treino">Continuar treino</a>
    </section>`;
  }

  const noteToday = E.dayNote(today);
  const skippedToday = trainingDay && noteToday && noteToday.skip && !E.sessions().some((x) => x.date === today);
  const missed = E.missedDays(today);

  if (!active && missed.length) {
    const m = missed[0];
    html += `<section class="banner miss-banner"><div><strong>${esc(weekdayName(m.date).replace(/^./, (c) => c.toUpperCase()))}, ${esc(fmtDate(m.date))}: treino do ${PLACE_NAME[m.plan]} sem registo</strong>
      <p>Faltar acontece; a app retoma onde ficaste${E.weekStatus(today).days.some((d) => E.isFlex(d.plan) && d.date >= today) ? ' e o fim de semana serve para repor' : ''}. Diz o que aconteceu, para ficar no histórico.</p></div>
      <div class="banner-actions"><button class="btn secondary small" data-act="miss-reason" data-date="${m.date}">Registar motivo</button><button class="btn ghost small" data-act="miss-none" data-date="${m.date}">Sem motivo</button></div></section>`;
  }

  if (!active && skippedToday) {
    const st = E.weekStatus(today);
    html += `<section class="banner"><div><strong>Hoje fica sem treino</strong><p>Motivo: ${esc(E.reasonLabel(noteToday.reason))}${noteToday.note ? ` (${esc(noteToday.note)})` : ''}. ${st.done + st.remainingPlanned < st.target ? 'Repões no fim de semana: a app diz-te onde ir.' : ''}</p></div><button class="btn secondary small" data-act="unskip">Afinal vou treinar</button></section>`;
  } else if (!active && plan === 'corrida') {
    html += `<section class="banner"><div><strong>Dia de corrida</strong><p>No teu plano, hoje é para correr. Regista a corrida em Corpo. Se quiseres treinar na mesma, escolhe abaixo.</p></div><a class="btn secondary small" href="#/corpo">Registar corrida</a></section>`;
  } else if (!active && E.isFlex(plan)) {
    const w = sug.week;
    // Dias de reposição que ainda sobram depois de hoje, nesta semana
    const laterFlex = w.days.filter((d) => E.isFlex(d.plan) && d.date > today).length;
    const ph = E.placeHours(sug.place, today);
    const hoursNote = ph && !ph.always ? (ph.open ? ` O ${PLACE_NAME[sug.place]} hoje abre das ${ph.from} às ${ph.to}.` : ` O ${PLACE_NAME[sug.place]} hoje está fechado: repõe no Estádio.`) : '';
    if (sug.mandatory && plan === 'repor') {
      html += `<section class="banner must-banner"><div><strong>Hoje dá para repor</strong><p>Esta semana fizeste ${w.done} de ${w.target} treinos. Se puderes, repõe hoje no ${PLACE_NAME[sug.place]}.${hoursNote} É opcional; se não der, descansa.${sug.short > 1 ? ' Faz só um treino: não faças dois no mesmo dia para compensar.' : ''}</p></div></section>`;
    } else if (sug.mandatory) {
      const lost = sug.short - 1;
      const later = Math.min(lost, laterFlex);
      const gone = lost - later;
      html += `<section class="banner must-banner"><div><strong>Hoje é obrigatório</strong><p>Esta semana fizeste ${w.done} de ${w.target} treinos. Hoje repões no ${PLACE_NAME[sug.place]}.${hoursNote}${later > 0 && gone === 0 ? ' O outro treino em falta pode ficar para amanhã.' : ''}${later > 0 && gone > 0 ? ` Outro pode ficar para amanhã; ${gone === 1 ? 'o que sobra fica' : `os ${gone} que sobram ficam`} por esta semana.` : ''}${later === 0 && gone > 0 ? ` ${gone === 1 ? 'O outro treino em falta fica' : `Os outros ${gone} treinos em falta ficam`} por esta semana.` : ''}${lost > 0 ? ' Não faças dois treinos no mesmo dia para compensar.' : ''}</p></div></section>`;
    } else if (plan === 'repor') {
      html += `<section class="banner"><div><strong>Dia de descanso</strong><p>Já fizeste os ${w.target} treinos desta semana${w.extra ? ` e mais ${w.extra}` : ''}, por isso hoje não há nada para repor. Se quiseres treinar na mesma, escolhe abaixo.</p></div></section>`;
    } else {
      html += `<section class="banner"><div><strong>Hoje é opcional</strong><p>Já fizeste os ${w.target} treinos desta semana${w.extra ? ` e mais ${w.extra}` : ''}. Se te apetecer, ${PLACE_NAME[sug.place]}${sug.place === 'supera' ? ' (o C, treino extra)' : ''}; se não, descansa ou corre. As duas opções estão certas.</p></div><a class="btn secondary small" href="#/corpo">Registar corrida</a></section>`;
    }
  } else if (!active && plan === 'descanso') {
    const st = E.weekStatus(today);
    const tomorrow = addDays(today, 1);
    const satMust = E.planFor(tomorrow) === 'livre' && st.done < st.target && tomorrow <= addDays(st.week, 6);
    html += `<section class="banner"><div><strong>Dia de descanso</strong><p>Recuperar também faz parte do plano.${satMust ? ` Amanhã é obrigatório: falta${st.target - st.done > 1 ? 'm' : ''} ${st.target - st.done} treino${st.target - st.done > 1 ? 's' : ''} esta semana.` : ''} Se quiseres treinar na mesma, escolhe abaixo.</p></div></section>`;
  }

  const stockSug = E.stockSuggestions(today).filter((s) => s.level !== 'info' || s.purchase).slice(0, 2);
  if (stockSug.length) {
    html += `<section class="banner stock-banner"><div><strong>Compras e stock</strong>${stockSug.map((s) => `<p>${esc(s.text)}</p>`).join('')}</div><a class="btn secondary small" href="#/mais/stock">Ver</a></section>`;
  }

  if (firstEver && place === 'supera') {
    html += `<section class="banner"><div><strong>Primeiro treino no Supera</strong><p>Vê se há discos de 1,25 kg (se não houver, tira-os em Mais → Definições), cinto de lastro e barras de segurança para o bench press.</p></div></section>`;
  }

  if (deloadOn) {
    html += `<section class="banner"><div><strong>Semana de deload</strong><p>Menos séries e cerca de 10% menos peso em todos os exercícios.</p></div><button class="btn secondary small" data-act="deload-off">Desativar</button></section>`;
  } else if (showSugg) {
    html += `<section class="banner"><div><strong>Altura de um deload?</strong><p>${esc(sugg.reason)}</p></div>
      <div class="banner-actions"><button class="btn secondary small" data-act="deload-on">Fazer esta semana</button><button class="btn ghost small" data-act="deload-dismiss">Agora não</button></div></section>`;
  }

  if (isDone) {
    html += doneToday.map(doneCard).join('');
    html += `<section class="panel next-panel">
      <h2 class="panel-title">Próximos treinos</h2>
      ${upcomingList(up, today, chosenDay || chosenPlace ? shown : null)}
    </section>`;
  }

  html += `${isDone ? `<details class="next-details" ${chosenDay || chosenPlace ? 'open' : ''}><summary>${shown ? `Ver o treino de ${esc(dayLabel(shown.date, today).toLowerCase())} em detalhe` : 'Ver os treinos em detalhe'}</summary>` : ''}<section class="today-hero">
    <div class="place-row">
      <div class="seg place-pick" role="tablist" aria-label="Onde treinas">
        ${['supera', 'estadio'].map((pl) => `<button role="tab" class="seg-btn ${pl === place ? 'on' : ''}" data-place="${pl}" aria-selected="${pl === place}">${esc(PLACES[pl].short)}${plan === pl ? ' <small>(plano)</small>' : sug && sug.place === pl ? ' <small>(sugerido)</small>' : ''}</button>`).join('')}
      </div>
      <p class="place-hours ${hours && !hours.open ? 'closed' : ''}">${hours && hours.always ? 'Parque de calistenia com acesso livre' : hours && hours.open ? `Aberto ${hoursWhen} das ${hours.from} às ${hours.to} <span class="muted">(${hours.holiday ? `${esc(hours.holiday)}: horário de feriado` : 'horário do Supera'})</span>` : `Fechado ${hoursWhen} <span class="muted">(horário do Supera)</span>`}</p>
    </div>
    <div class="day-pick" role="tablist" aria-label="Escolher o treino">
      ${order.map((d) => `<button role="tab" class="day-chip ${d === day ? 'on' : ''}" data-day="${d}" aria-selected="${d === day}">
        <span class="day-letter">${d}</span><span class="day-name">${esc(DAYS[d].title)}</span>${d === next ? '<span class="day-next">a seguir</span>' : E.isExtraDay(d) ? '<span class="day-next extra">extra</span>' : ''}</button>`).join('')}
    </div>
    <div class="hero-main">
      <div class="hero-head">
        <h2>${esc(E.dayTitle(day))}</h2>
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
        ${E.remindersFor(main.ex, hoursIso).map((r) => `<p class="hero-reminder"><strong>Lembrete:</strong> ${esc(r.short || r.title || '')} <span class="muted">Tens as dicas todas no treino.</span></p>`).join('')}
      </div>` : place === 'estadio' ? `
      <div class="hero-lift">
        <div class="hero-lift-text">
          <span class="hero-ex">Muscle-up</span>
          <span class="hero-weight num">Fase ${stage.n}<small> de 4</small></span>
          <span class="hero-target">${esc(stage.name)}</span>
        </div>
        <div class="hero-mu"><p><strong>Para passar de fase:</strong> ${esc(stage.goal)}</p><p class="muted small">Faz o muscle-up primeiro, ainda fresco. Se correres hoje, corre depois.</p></div>
      </div>` : ''}
      <ol class="plan-list">
        ${session.exercises.map((e) => `
          <li class="${BENCH_FAMILY.includes(e.ex) || e.mode === 'skill' ? 'is-main' : ''}">
            <span class="plan-name">${esc(E.exInfo(e.ex, e).name)}</span>
            <span class="plan-target num">${esc(e.target)}</span>
            <span class="plan-weight">${esc(weightSummary(e))}</span>
          </li>`).join('')}
      </ol>
      ${active ? '' : `<button class="btn ${isDone ? 'secondary' : 'primary'} block big" data-act="start">${isDone ? 'Começar outro treino hoje' : 'Começar treino'}</button>`}
      ${!active && trainingDay && !skippedToday && !isDone ? `<button class="btn ghost block small skip-btn" data-act="skip-today">Hoje não dá para treinar</button>` : ''}
    </div>
  </section>${isDone ? '</details>' : ''}`;

  html += `<div class="two-col">`;
  html += habitsCard(today, trainingDay && !isDone);
  html += `<section class="panel">
    <h2 class="panel-title">Esta semana</h2>
    <p class="week-line"><span class="num big2">${Math.min(week.sessions, week.target)}</span> de ${week.target} treinos${week.status.extra ? ` <span class="tag">+${week.status.extra} extra</span>` : ''}${week.km ? `, <span class="num big2">${fmt1(week.km)}</span> km de corrida` : ''}</p>
    ${weekDots(week.status, today)}
    ${(() => {
      const st = week.status;
      const def = Object.entries(st.owed).filter(([, n]) => n > 0);
      const left = st.target - st.done;
      if (left <= 0 || !def.length) return '';
      const flex = st.days.filter((d) => E.isFlex(d.plan) && d.date >= today).length;
      const owed = def.reduce((a, [, n]) => a + n, 0);
      const when = flex >= 2 ? 'O fim de semana' : flex === 1 ? (st.days.find((d) => E.isFlex(d.plan) && d.date >= today).plan === 'repor' ? 'O domingo' : 'O sábado') : '';
      return `<p class="muted small">Falta repor: ${def.map(([pl, n]) => `${n} no ${PLACE_NAME[pl]}`).join(' e ')}.${flex ? (owed > flex ? ` ${when} repõe ${flex === 1 ? 'um' : flex}; o resto fica por esta semana.` : ` ${when} serve para isso.`) : ''}</p>`;
    })()}
    ${goalMeters(E.goals(), true)}
    ${(() => {
      const sw = E.sleepWeek(today);
      if (!sw.logged) return '';
      const parts = [[sw.ge8, '8 h ou mais'], [sw['7to8'], 'entre 7 e 8 h'], [sw.lt7, 'menos de 7 h']].filter(([n]) => n).map(([n, l]) => `${n} ${n === 1 ? 'noite' : 'noites'} com ${l}`);
      return `<p class="muted small">Sono esta semana: ${parts.join(', ')}.</p>`;
    })()}
    <a class="link" href="#/progresso">Ver progresso</a>
  </section>`;
  html += `</div>`;
  html += mealsPanel();

  root.innerHTML = html;
  bindProtein(root, today);
  bindMeals(root);

  root.addEventListener('click', async (e) => {
    const prev = e.target.closest('[data-preview]');
    if (prev) {
      const [pl, d] = prev.dataset.preview.split(':');
      chosenPlace = pl;
      chosenDay = d;
      rerender();
      const det = document.querySelector('.next-details');
      if (det) det.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const placeBtn = e.target.closest('[data-place]');
    if (placeBtn) {
      chosenPlace = placeBtn.dataset.place;
      chosenDay = null;
      rerender();
      return;
    }
    const dayBtn = e.target.closest('[data-day]');
    if (dayBtn) {
      chosenDay = dayBtn.dataset.day;
      rerender();
      return;
    }
    const act = e.target.closest('[data-act]');
    if (!act) return;
    const a = act.dataset.act;
    if (a === 'start') {
      local.active = E.buildSession(day, { deload: deloadOn });
      local.active.ctx = E.sessionContext({ day, place, suggestedDay: next, suggestedPlace: autoPlace });
      persistLocal();
      requestWakeLock();
      navigate('#/treino');
    } else if (a === 'stale-discard') {
      const n = openActive ? openActive.exercises.reduce((x, en) => x + en.sets.filter((st) => st.done && st.kind !== 'warm').length, 0) : 0;
      if (n && !(await confirmDialog(`Descartar este treino? As ${n} séries feitas perdem-se.`, { ok: 'Descartar', danger: true }))) return;
      local.active = null;
      persistLocal();
      stopRest();
      releaseWakeLock();
      toast('Treino aberto descartado');
      rerender();
      applyPendingUpdate();
    } else if (a === 'skip-today') {
      if (await askReason(today, { skip: true })) rerender();
    } else if (a === 'unskip') {
      remove('days', today);
      rerender();
    } else if (a === 'miss-reason') {
      if (await askReason(act.dataset.date)) { toast('Motivo guardado'); rerender(); }
    } else if (a === 'miss-none') {
      const d = act.dataset.date;
      put('days', d, { date: d, plan: E.planFor(d), reason: 'sem-motivo', note: '', missed: true, skip: false, decidedAt: now() });
      rerender();
    } else if (a === 'day-image') {
      const d = act.closest('[data-log-date]')?.dataset.logDate || today;
      act.disabled = true;
      await openDayImage(d, d === today ? 'do dia' : `de ${dayWord(d)}`);
      act.disabled = false;
    } else if (a === 'sleep-band') {
      const d = act.closest('[data-log-date]')?.dataset.logDate || today;
      const h = E.habitsFor(d);
      const v = act.dataset.v;
      const off = E.sleepBand(h) === v;
      const keepHours = !off && h.sleep !== null && h.sleep !== undefined && E.bandForHours(h.sleep) === v;
      put('habits', d, { ...h, sleepBand: off ? null : v, sleepOk: off ? null : v !== 'lt7', sleep: keepHours ? h.sleep : null, sleepAt: off ? null : now() });
      rerender();
    } else if (a === 'creatine') {
      const d = act.closest('[data-log-date]')?.dataset.logDate || today;
      const h = E.habitsFor(d);
      put('habits', d, { ...h, creatine: !h.creatine });
      rerender();
    } else if (a === 'bw-edit') {
      remove('bodyweight', act.closest('[data-log-date]')?.dataset.logDate || today);
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
    } else if (a === 'sync-retry') {
      act.disabled = true;
      act.textContent = 'A sincronizar…';
      syncNow().then((r) => { toast(r.ok ? 'Sincronizado' : `Ainda não deu: ${r.reason}`, { timeout: 6000 }); rerender(); });
    } else if (a === 'general-reminder-done') {
      const r = get('reminders', act.dataset.id);
      if (r) put('reminders', r.id, { ...r, dismissedAt: now() });
      toast('Lembrete escondido.');
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
    const d = f.closest('[data-log-date]')?.dataset.logDate || today;
    put('bodyweight', d, E.bodyweightRecord(d, kg, d === today ? 'hoje' : 'registo atrasado'));
    toast(d === today ? 'Peso guardado' : `Peso de ${dayWord(d)} guardado`);
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
    <p class="onboard-lead">O teu plano para o muscle-up e para os 100 kg no bench press. Confirma o ponto de partida; os pesos de cada treino são calculados a partir daqui.</p>
    <form class="form" data-form="onboard">
      <fieldset>
        <legend>Bench press: a tua melhor série recente</legend>
        <div class="field-row">
          <label class="field"><span>Peso</span><span class="with-unit"><input name="w" inputmode="decimal" value="${fmtNum(b.bench.w)}" class="input num"><i>kg</i></span></label>
          <label class="field"><span>Reps</span><input name="reps" inputmode="numeric" value="${b.bench.reps}" class="input num"></label>
          <label class="field"><span>Esforço (RPE)</span>
            <select name="rpe" class="input">${[10, 9.5, 9, 8.5, 8, 7].map((r) => `<option value="${r}" ${r === b.bench.rpe ? 'selected' : ''}>${fmtNum(r)}${r === 10 ? ' (máximo)' : ''}</option>`).join('')}</select>
          </label>
        </div>
      </fieldset>
      <div class="field-row">
        <label class="field"><span>Pull-ups seguidos</span><input name="pullups" inputmode="numeric" value="${b.pullups}" class="input num"></label>
        <label class="field"><span>Peso corporal</span><span class="with-unit"><input name="bw" inputmode="decimal" value="${fmtNum(b.bw)}" class="input num"><i>kg</i></span></label>
      </div>
      <div class="field"><span>O ginásio tem discos de 1,25 kg?</span>${segmented('small', [{ value: 'yes', label: 'Sim' }, { value: 'no', label: 'Não, o mais pequeno é 2,5 kg' }], S.plates.includes(1.25) ? 'yes' : 'no')}</div>
      <p class="muted small">Plano semanal por defeito: 4 treinos (Supera à segunda e quarta, Estádio à terça e quinta). O sábado é obrigatório se faltares a algum, senão é opcional. Sexta e domingo de descanso. Mudas em Mais → Definições.</p>
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
    if (!w || !reps || reps > 20) return toast('Confirma o peso e as reps do bench press.');
    if (!bw || bw < 30) return toast('Confirma o teu peso corporal.');
    const today = todayISO();
    const plates = f.small.value === 'yes' ? [25, 20, 15, 10, 5, 2.5, 1.25] : [25, 20, 15, 10, 5, 2.5];
    setSettings({
      onboarded: true,
      plates,
      baseline: { date: today, bench: { w, reps, rpe: Number(f.rpe.value) }, pullups, bw },
    });
    put('bodyweight', today, E.bodyweightRecord(today, bw, 'inicio'));
    toast(`Pronto. 1RM estimado de partida: ${fmt1(E.e1rm(w, reps, Number(f.rpe.value)))} kg`, { timeout: 5000 });
    navigate('#/hoje');
  });
}

export { plural };
