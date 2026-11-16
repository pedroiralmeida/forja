// Corpo: peso corporal, hábitos e corrida
import * as E from './engine.js';
import { put, remove } from './store.js';
import { icons, rerender, toast, header, confirmDialog } from './ui.js';
import { lineChart, barChart } from './charts.js';
import { proteinBlock, bindProtein } from './protein.js';
import {
  esc, fmtNum, fmt1, fmtSigned, fmtDate, todayISO, addDays, weekStart, parseNum, isoToMs, uid, plural, now,
} from './util.js';

function habitsWeek() {
  const today = todayISO();
  const target = E.proteinTarget();
  let cells = '';
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i);
    const h = E.habitsFor(d);
    const p = Math.min(1, (h.protein || 0) / target);
    cells += `<div class="hw-day ${d === today ? 'today' : ''}">
      <span class="hw-name">${esc(fmtDate(d, { weekday: 'narrow' }))}</span>
      <span class="hw-prot" title="Proteína: ${fmtNum(h.protein || 0)} g"><i style="height:${Math.round(p * 100)}%"></i></span>
      <span class="hw-crea ${h.creatine ? 'on' : ''}" title="Creatina ${h.creatine ? 'tomada' : 'não registada'}">${h.creatine ? icons.check : ''}</span>
      <span class="hw-sleep num ${E.sleepBand(h) === 'lt7' ? 'bad' : ''}" title="Sono">${h.sleep ? fmtNum(h.sleep) + 'h' : E.sleepBand(h) ? E.SLEEP_BANDS.find((x) => x.value === E.sleepBand(h)).short : '—'}</span>
    </div>`;
  }
  return `<div class="hw">${cells}</div>
    <div class="hw-legend muted small"><span>Coluna amarela: proteína face ao alvo (${target} g)</span><span>Círculo verde: creatina</span><span>Número: horas de sono</span></div>`;
}

export function renderBody(root) {
  const today = todayISO();
  const st = E.bwStats();
  const series = E.bwMovingAvg();
  const h = E.habitsFor(today);
  const runs = E.runs();
  const waist = E.waistEntries();
  const ws = E.waistStats();
  const ss = E.shoulderStats();
  const shoulders = E.shoulderEntries();
  const week = E.weekSummary();
  const bw = E.latestBodyweight();
  const weekKcal = Math.round(week.km * bw / 50) * 50;

  // km por semana (últimas 8)
  const ws0 = weekStart(today);
  const bars = [];
  for (let i = 7; i >= 0; i--) {
    const ws = addDays(ws0, -7 * i);
    const we = addDays(ws, 6);
    const km = runs.filter((r) => r.date >= ws && r.date <= we).reduce((a, r) => a + (r.km || 0), 0);
    bars.push({ label: fmtDate(ws, { day: 'numeric', month: 'short' }), value: Math.round(km * 10) / 10, tip: `${fmt1(km)} km` });
  }

  root.innerHTML = `
    ${header('Corpo')}
    <div class="two-col">
      <section class="panel">
        <h2 class="panel-title">Peso corporal</h2>
        <form class="bw-form" data-form="bw">
          <span class="with-unit"><input name="kg" inputmode="decimal" class="input num" placeholder="${fmt1(bw)}" aria-label="Peso em kg"><i>kg</i></span>
          <input name="date" type="date" class="input" value="${today}" max="${today}" aria-label="Data">
          <button class="btn primary">Guardar</button>
        </form>
        ${st ? `
          <div class="stats-row">
            <div class="stat"><span class="num big2">${fmt1(st.avgNow ?? st.last.kg)} kg</span><span class="muted">média de 7 dias</span></div>
            <div class="stat"><span class="num big2">${st.weekly === null ? '—' : fmtSigned(st.weekly, 2) + ' kg'}</span><span class="muted">por semana</span></div>
          </div>
          <p class="status status-${st.status.level}">${esc(st.status.text)}</p>` : ''}
        <div class="chart-box" data-chart="bw"></div>
        <p class="muted small">Pesa-te de manhã, depois da casa de banho e antes de comer. Olha para a média, não para o dia.</p>
      </section>
      <section class="panel">
        <h2 class="panel-title">Hábitos de hoje</h2>
        <div class="daily">
          <div class="daily-row">
            <div class="daily-label">Proteína <span class="muted">aprox.</span></div>
            <div class="daily-value">${proteinBlock(h, E.proteinTarget())}</div>
          </div>
          <div class="daily-row">
            <div class="daily-label">Creatina</div>
            <div class="daily-value"><button class="toggle ${h.creatine ? 'on' : ''}" data-act="creatine" aria-pressed="${!!h.creatine}">${h.creatine ? icons.check + ' Tomada' : 'Marcar como tomada'}</button><span class="muted small">${esc(E.S().creatineNote || '1 medida por dia')}</span></div>
          </div>
          <div class="daily-row">
            <div class="daily-label">Batido extra</div>
            <div class="daily-value"><button class="toggle ${h.shake ? 'on' : ''}" data-act="shake" aria-pressed="${!!h.shake}">${h.shake ? icons.check + ' Bebido' : 'Leite, whey e aveia'}</button></div>
          </div>
          <div class="daily-row">
            <div class="daily-label">Sono</div>
            <div class="daily-value chips">${[6, 6.5, 7, 7.5, 8, 8.5, 9].map((x) => `<button class="chip ${h.sleep === x ? 'on' : ''}" data-sleep="${x}">${fmtNum(x)} h</button>`).join('')}</div>
          </div>
        </div>
        <h3 class="sub-title">Últimos 7 dias</h3>
        ${habitsWeek()}
      </section>
    </div>
    <div class="two-col">
      <section class="panel">
        <h2 class="panel-title">Cintura e ombros</h2>
        <h3 class="sub-title">Cintura</h3>
        <form class="bw-form" data-form="waist">
          <span class="with-unit"><input name="cm" inputmode="decimal" class="input num" placeholder="${ws ? fmt1(ws.last.cm) : '75'}" aria-label="Cintura em cm"><i>cm</i></span>
          <input name="date" type="date" class="input" value="${today}" max="${today}" aria-label="Data">
          <button class="btn primary">Guardar</button>
        </form>
        ${ws ? `
          <div class="stats-row">
            <div class="stat"><span class="num big2">${fmt1(ws.last.cm)} cm</span><span class="muted">última, ${esc(fmtDate(ws.last.date))}</span></div>
            ${ws.dWaist !== undefined ? `<div class="stat"><span class="num big2">${fmtSigned(ws.dWaist, 1)} cm</span><span class="muted">desde ${esc(fmtDate(ws.ref.date))}</span></div>` : ''}
          </div>
          <p class="status status-${ws.status.level}">${esc(ws.status.text)}</p>` : ''}
        <div class="chart-box" data-chart="waist"></div>
        <p class="muted small">Uma vez por semana, de manhã, à altura do umbigo. Fita justa mas sem apertar, e sem encolher a barriga. Regra prática: até cerca de 1 cm de cintura por cada kg que ganhas é sobretudo músculo.</p>
        <h3 class="sub-title">Ombros</h3>
        <form class="bw-form" data-form="shoulders">
          <span class="with-unit"><input name="cm" inputmode="decimal" class="input num" placeholder="${ss ? fmt1(ss.last.cm) : '110'}" aria-label="Perímetro dos ombros em cm"><i>cm</i></span>
          <input name="date" type="date" class="input" value="${today}" max="${today}" aria-label="Data">
          <button class="btn primary">Guardar</button>
        </form>
        ${ss ? `
          <div class="stats-row">
            <div class="stat"><span class="num big2">${fmt1(ss.last.cm)} cm</span><span class="muted">último, ${esc(fmtDate(ss.last.date))}</span></div>
            ${ss.change !== null ? `<div class="stat"><span class="num big2">${fmtSigned(ss.change, 1)} cm</span><span class="muted">desde ${esc(fmtDate(ss.first.date))}</span></div>` : ''}
            ${ss.ratio ? `<div class="stat"><span class="num big2">${fmtNum(Math.round(ss.ratio * 100) / 100)}</span><span class="muted">ombros ÷ cintura</span></div>` : ''}
          </div>` : ''}
        <div class="chart-box" data-chart="shoulders"></div>
        ${shoulders.length ? `<ul class="rec-list">${shoulders.slice(-6).reverse().map((w) => `<li><span>${esc(fmtDate(w.date))}</span><span class="num">${fmt1(w.cm)} cm</span><button class="icon-btn small" data-del-shoulders="${w.date}" aria-label="Apagar medição">${icons.trash}</button></li>`).join('')}</ul>` : ''}
        <p class="muted small">Uma vez por mês. De pé, braços relaxados ao lado do corpo, fita à volta da parte mais larga dos ombros, sem encher o peito. A relação ombros ÷ cintura sobe quando os ombros crescem e a cintura não: é a forma em V.</p>
      </section>
      <section class="panel">
        <h2 class="panel-title">Corrida</h2>
        <form class="run-form" data-form="run">
          <label class="field"><span>Data</span><input name="date" type="date" class="input" value="${today}" max="${today}"></label>
          <label class="field"><span>Distância</span><span class="with-unit"><input name="km" inputmode="decimal" class="input num" placeholder="10"><i>km</i></span></label>
          <label class="field"><span>Tempo</span><span class="with-unit"><input name="min" inputmode="numeric" class="input num" placeholder="55"><i>min</i></span></label>
          <button class="btn secondary">Registar corrida</button>
        </form>
        ${week.km ? `<p class="status status-info">Esta semana: ${fmt1(week.km)} km, cerca de ${weekKcal} kcal a mais para compensar a comer.</p>` : ''}
        <div class="chart-box" data-chart="km"></div>
      </section>
    </div>
    <section class="panel">
        <h2 class="panel-title">Registos recentes</h2>
        <div class="rec-cols">
        <div>
        <h3 class="sub-title">Corridas</h3>
        ${runs.length ? `<ul class="rec-list">${runs.slice(0, 8).map((r) => `<li><span>${esc(fmtDate(r.date))}</span><span class="num">${fmt1(r.km)} km${r.min ? `, ${r.min} min (${pace(r)})` : ''}</span><button class="icon-btn small" data-del-run="${r.id}" aria-label="Apagar corrida">${icons.trash}</button></li>`).join('')}</ul>` : '<p class="muted">Sem corridas registadas.</p>'}
        </div><div>
        <h3 class="sub-title">Pesagens</h3>
        ${series.length ? `<ul class="rec-list">${series.slice(-8).reverse().map((b) => `<li><span>${esc(fmtDate(b.date))}</span><span class="num">${fmt1(b.kg)} kg</span><button class="icon-btn small" data-del-bw="${b.date}" aria-label="Apagar pesagem">${icons.trash}</button></li>`).join('')}</ul>` : '<p class="muted">Sem pesagens.</p>'}
        </div><div>
        <h3 class="sub-title">Cintura</h3>
        ${waist.length ? `<ul class="rec-list">${waist.slice(-8).reverse().map((w) => `<li><span>${esc(fmtDate(w.date))}</span><span class="num">${fmt1(w.cm)} cm</span><button class="icon-btn small" data-del-waist="${w.date}" aria-label="Apagar medição">${icons.trash}</button></li>`).join('')}</ul>` : '<p class="muted">Sem medições.</p>'}
        </div>
        </div>
    </section>`;

  bindProtein(root, today);
  lineChart(root.querySelector('[data-chart="bw"]'), {
    label: 'Peso corporal e média de 7 dias',
    series: [
      { name: 'Média de 7 dias', color: 'var(--yellow)', points: series.filter((s) => s.avg !== null).map((s) => ({ x: isoToMs(s.date), y: s.avg, tip: `${fmt1(s.avg)} kg` })) },
      { name: 'Pesagem', color: 'var(--muted)', points: series.map((s) => ({ x: isoToMs(s.date), y: s.kg, tip: `${fmt1(s.kg)} kg` })), dots: true, line: false },
    ],
    yFmt: (v) => fmtNum(v),
    minSpan: 2,
    empty: 'Regista o primeiro peso para ver a tendência.',
  });
  if (series.length >= 1) {
    const box = root.querySelector('[data-chart="bw"]');
    box.insertAdjacentHTML('beforebegin', '<div class="legend"><span><i class="lg-line" style="background:var(--yellow)"></i>Média de 7 dias</span><span><i class="lg-dot" style="background:var(--muted)"></i>Pesagem</span></div>');
  }
  lineChart(root.querySelector('[data-chart="waist"]'), {
    label: 'Cintura ao longo do tempo',
    series: [{ name: 'Cintura', color: 'var(--green)', points: waist.map((w) => ({ x: isoToMs(w.date), y: w.cm, tip: `${fmt1(w.cm)} cm` })), dots: true }],
    yFmt: (v) => fmtNum(v),
    minSpan: 2,
    height: 160,
    empty: 'Regista a primeira medição para ver a evolução.',
  });
  if (shoulders.length) {
    lineChart(root.querySelector('[data-chart="shoulders"]'), {
      label: 'Perímetro dos ombros',
      series: [{ name: 'Ombros', color: 'var(--blue)', points: shoulders.map((w) => ({ x: isoToMs(w.date), y: w.cm, tip: `${fmt1(w.cm)} cm` })), dots: true }],
      yFmt: (v) => fmtNum(v),
      minSpan: 2,
      height: 160,
    });
  }
  barChart(root.querySelector('[data-chart="km"]'), {
    label: 'Quilómetros por semana', bars, color: 'var(--green)', yFmt: (v) => fmtNum(v), empty: 'Os km por semana aparecem aqui.',
  });

  root.addEventListener('submit', (e) => {
    const f = e.target;
    if (f.dataset.form === 'prot') return;
    e.preventDefault();
    if (f.dataset.form === 'bw') {
      const kg = parseNum(f.kg.value);
      const date = f.date.value || today;
      if (!kg || kg < 30 || kg > 250) return toast('Escreve o peso em kg, por exemplo 64,2');
      put('bodyweight', date, E.bodyweightRecord(date, kg, 'corpo'));
      toast('Peso guardado');
      rerender();
    } else if (f.dataset.form === 'waist') {
      const cm = parseNum(f.cm.value);
      const date = f.date.value || today;
      if (!cm || cm < 40 || cm > 160) return toast('Escreve a cintura em cm, por exemplo 76,5');
      put('waist', date, { date, cm, at: now() });
      toast('Cintura guardada');
      rerender();
    } else if (f.dataset.form === 'shoulders') {
      const cm = parseNum(f.cm.value);
      const date = f.date.value || today;
      if (!cm || cm < 70 || cm > 180) return toast('Escreve o perímetro dos ombros em cm, por exemplo 112');
      put('shoulders', date, { date, cm, at: now() });
      toast('Ombros guardados');
      rerender();
    } else if (f.dataset.form === 'run') {
      const km = parseNum(f.km.value);
      const min = parseNum(f.min.value);
      if (!km || km <= 0 || km > 300) return toast('Escreve a distância em km.');
      const id = uid();
      put('runs', id, { id, date: f.date.value || today, km, min: min || null, at: now() });
      toast(`Corrida registada: ${fmt1(km)} km`);
      rerender();
    }
  });

  root.addEventListener('click', async (e) => {
    const habit = (patch) => {
      put('habits', today, { ...E.habitsFor(today), ...patch });
      rerender();
    };
    const sl = e.target.closest('[data-sleep]');
    if (sl) {
      const v = h.sleep === Number(sl.dataset.sleep) ? null : Number(sl.dataset.sleep);
      return habit({ sleep: v, sleepOk: v === null ? null : v >= 7, sleepBand: v === null ? null : E.bandForHours(v) });
    }
    const act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'creatine') return habit({ creatine: !h.creatine });
    if (act && act.dataset.act === 'shake') return habit({ shake: !h.shake });
    const dr = e.target.closest('[data-del-run]');
    if (dr && (await confirmDialog('Apagar esta corrida?', { ok: 'Apagar', danger: true }))) {
      remove('runs', dr.dataset.delRun);
      rerender();
    }
    const dsh = e.target.closest('[data-del-shoulders]');
    if (dsh) {
      remove('shoulders', dsh.dataset.delShoulders);
      rerender();
      return;
    }
    const dw = e.target.closest('[data-del-waist]');
    if (dw && (await confirmDialog('Apagar esta medição da cintura?', { ok: 'Apagar', danger: true }))) {
      remove('waist', dw.dataset.delWaist);
      rerender();
    }
    const db = e.target.closest('[data-del-bw]');
    if (db && (await confirmDialog('Apagar esta pesagem?', { ok: 'Apagar', danger: true }))) {
      remove('bodyweight', db.dataset.delBw);
      rerender();
    }
  });
}

function pace(r) {
  if (!r.min || !r.km) return '';
  const p = r.min / r.km;
  const m = Math.floor(p);
  const s = Math.round((p - m) * 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

export { plural };
