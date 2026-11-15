// Mais: ferramentas, guia, definições, sincronização e dados
import { EX, GUIDE, ALL_PLATES, MU_STAGES, DAYS } from './data.js';
import * as E from './engine.js';
import {
  local, setSettings, list, put, remove, exportJSON, importJSON, resetAll, connectSync, disconnectSync, syncNow,
} from './store.js';
import { icons, navigate, rerender, toast, header, segmented, confirmDialog, downloadFile, startRest, unlockAudio } from './ui.js';
import { barbellSVG, platesFor, plateText } from './plates.js';
import { esc, fmtNum, fmt1, todayISO, parseNum } from './util.js';

export const APP_VERSION = '1.0.0';

export function renderMore(root) {
  const s = local.sync;
  const syncText = s.token ? (s.status === 'error' ? 'Erro: ' + s.lastError : s.lastSync ? 'Ligada' : 'A ligar') : 'Desligada';
  root.innerHTML = `
    ${header('Mais')}
    <section class="panel">
      <h2 class="panel-title">Ferramentas</h2>
      <ul class="link-list">
        <li><a href="#/mais/ferramentas#discos"><span>Calculadora de discos</span><span class="muted">que discos pôr na barra</span>${icons.chevron}</a></li>
        <li><a href="#/mais/ferramentas#rm"><span>Calculadora de 1RM</span><span class="muted">a partir de uma série</span>${icons.chevron}</a></li>
        <li><a href="#/mais/ferramentas#timer"><span>Temporizador</span><span class="muted">descanso manual</span>${icons.chevron}</a></li>
      </ul>
    </section>
    <section class="panel">
      <h2 class="panel-title">Guia</h2>
      <ul class="link-list">${GUIDE.map((g) => `<li><a href="#/mais/guia/${g.id}"><span>${esc(g.title)}</span>${icons.chevron}</a></li>`).join('')}</ul>
    </section>
    <section class="panel">
      <h2 class="panel-title">App</h2>
      <ul class="link-list">
        <li><a href="#/mais/definicoes"><span>Definições</span><span class="muted">plano, discos, descansos</span>${icons.chevron}</a></li>
        <li><a href="#/mais/sync"><span>Sincronização</span><span class="muted">${esc(syncText)}</span>${icons.chevron}</a></li>
        <li><a href="#/mais/dados"><span>Backup e dados</span><span class="muted">exportar, importar</span>${icons.chevron}</a></li>
      </ul>
      <p class="muted small">Forja ${APP_VERSION}. Os dados ficam neste dispositivo${s.token ? ' e no teu gist privado do GitHub' : ''}.</p>
    </section>`;
}

// ---------- Ferramentas ----------
export function renderTools(root) {
  const S = E.S();
  const cur = E.currentBenchE1RM();
  const startW = E.roundW('bench', cur * E.pct(3, 8));
  root.innerHTML = `
    ${header('Ferramentas', { back: '#/mais' })}
    <section class="panel" id="discos">
      <h2 class="panel-title">Calculadora de discos</h2>
      <form class="inline-form" data-form="plates">
        <input name="w" inputmode="decimal" class="input num" value="${fmtNum(startW)}" aria-label="Peso total"><span class="unit">kg no total</span>
      </form>
      <div class="chips">${[60, 70, 80, 90, 100].map((w) => `<button class="chip" data-pw="${w}">${w}</button>`).join('')}</div>
      <div data-plates class="plates-out"></div>
      <p class="muted small">Barra de ${fmtNum(S.bar)} kg. Discos disponíveis: ${S.plates.map(fmtNum).join(', ')} kg (muda nas definições).</p>
    </section>
    <section class="panel" id="rm">
      <h2 class="panel-title">Calculadora de 1RM</h2>
      <form class="field-row" data-form="rm">
        <label class="field"><span>Peso</span><span class="with-unit"><input name="w" inputmode="decimal" class="input num" value="80"><i>kg</i></span></label>
        <label class="field"><span>Reps</span><input name="reps" inputmode="numeric" class="input num" value="2"></label>
        <label class="field"><span>RPE</span><select name="rpe" class="input">${[10, 9.5, 9, 8.5, 8, 7.5, 7, 6].map((r) => `<option value="${r}">${fmtNum(r)}</option>`).join('')}</select></label>
      </form>
      <div data-rm></div>
    </section>
    <section class="panel" id="timer">
      <h2 class="panel-title">Temporizador</h2>
      <div class="chips big">${[60, 90, 120, 150, 180, 240].map((t) => `<button class="chip" data-t="${t}">${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</button>`).join('')}</div>
      <p class="muted small">Durante um treino o descanso começa sozinho quando marcas uma série.</p>
    </section>`;

  const pf = root.querySelector('[data-form="plates"]');
  const showPlates = () => {
    const w = parseNum(pf.w.value);
    const out = root.querySelector('[data-plates]');
    if (!w) { out.innerHTML = ''; return; }
    const res = platesFor(w, S.bar, S.plates);
    out.innerHTML = `${barbellSVG(res)}<p class="plate-text">${esc(plateText(res))}</p>`;
  };
  const rf = root.querySelector('[data-form="rm"]');
  const showRM = () => {
    const w = parseNum(rf.w.value);
    const reps = parseNum(rf.reps.value);
    const rpe = parseNum(rf.rpe.value);
    const out = root.querySelector('[data-rm]');
    const v = E.e1rm(w, reps, rpe);
    if (!v) { out.innerHTML = ''; return; }
    let rows = '';
    for (let r = 1; r <= 10; r++) rows += `<tr><td class="num">${r}</td><td class="num">${fmtNum(E.roundW('bench', v * E.pct(r, 10)))} kg</td><td class="num">${fmtNum(E.roundW('bench', v * E.pct(r, 8)))} kg</td></tr>`;
    out.innerHTML = `<p class="rm-big"><span class="num">${fmt1(v)}</span> kg <span class="muted">de 1RM estimado</span></p>
      <table class="table"><thead><tr><th>Reps</th><th>Esforço máximo</th><th>RPE 8</th></tr></thead><tbody>${rows}</tbody></table>`;
  };
  pf.addEventListener('input', showPlates);
  pf.addEventListener('submit', (e) => e.preventDefault());
  rf.addEventListener('input', showRM);
  rf.addEventListener('change', showRM);
  showPlates();
  showRM();
  root.addEventListener('click', (e) => {
    const pw = e.target.closest('[data-pw]');
    if (pw) { pf.w.value = pw.dataset.pw; showPlates(); }
    const t = e.target.closest('[data-t]');
    if (t) { unlockAudio(); startRest(Number(t.dataset.t), ''); }
  });
  const hash = location.hash.split('#')[2];
  if (hash) setTimeout(() => root.querySelector('#' + hash)?.scrollIntoView({ block: 'start' }), 30);
}

// ---------- Guia ----------
export function renderGuide(root, { id }) {
  const g = GUIDE.find((x) => x.id === id) || GUIDE[0];
  const i = GUIDE.indexOf(g);
  const next = GUIDE[i + 1];
  root.innerHTML = `
    ${header(g.title, { back: '#/mais' })}
    <article class="panel prose">${g.body}</article>
    ${next ? `<a class="btn secondary" href="#/mais/guia/${next.id}">Seguinte: ${esc(next.title)}</a>` : ''}`;
}

// ---------- Definições ----------
export function renderSettings(root) {
  const S = E.S();
  const b = S.baseline;
  const overrides = list('overrides').filter((o) => o.ex);
  root.innerHTML = `
    ${header('Definições', { back: '#/mais' })}
    <form class="form" data-form="settings">
      <section class="panel">
        <h2 class="panel-title">Plano</h2>
        <div class="field"><span>Dias de treino por semana</span>${segmented('daysPerWeek', [{ value: 3, label: '3 dias (A, B, C)' }, { value: 4, label: '4 dias (+ D)' }], S.daysPerWeek)}</div>
        <label class="field"><span>Fase do muscle-up</span>
          <select name="muStage" class="input">
            <option value="">Automática (pelos marcos): fase ${E.muStage()}</option>
            ${MU_STAGES.map((m) => `<option value="${m.n}" ${S.muStage === m.n ? 'selected' : ''}>Fase ${m.n}: ${esc(m.name)}</option>`).join('')}
          </select></label>
        <label class="field"><span>Sugerir deload a cada</span>
          <select name="deloadEvery" class="input">${[4, 5, 6, 7, 8].map((n) => `<option value="${n}" ${S.deloadEvery === n ? 'selected' : ''}>${n} semanas</option>`).join('')}</select></label>
      </section>
      <section class="panel">
        <h2 class="panel-title">Ponto de partida</h2>
        <p class="muted small">Usado até haver treinos registados no supino.</p>
        <div class="field-row">
          <label class="field"><span>Supino</span><span class="with-unit"><input name="bw_w" inputmode="decimal" class="input num" value="${fmtNum(b.bench.w)}"><i>kg</i></span></label>
          <label class="field"><span>Reps</span><input name="bw_reps" inputmode="numeric" class="input num" value="${b.bench.reps}"></label>
          <label class="field"><span>RPE</span><select name="bw_rpe" class="input">${[10, 9.5, 9, 8.5, 8, 7].map((r) => `<option value="${r}" ${r === b.bench.rpe ? 'selected' : ''}>${fmtNum(r)}</option>`).join('')}</select></label>
        </div>
        <label class="field"><span>Elevações seguidas</span><input name="pullups" inputmode="numeric" class="input num" value="${b.pullups}"></label>
      </section>
      <section class="panel">
        <h2 class="panel-title">Material</h2>
        <label class="field"><span>Peso da barra</span><span class="with-unit"><input name="bar" inputmode="decimal" class="input num" value="${fmtNum(S.bar)}"><i>kg</i></span></label>
        <div class="field"><span>Discos disponíveis</span>
          <div class="checks">${ALL_PLATES.map((p) => `<label class="check"><input type="checkbox" name="plate" value="${p}" ${S.plates.includes(p) ? 'checked' : ''}><span>${fmtNum(p)}</span></label>`).join('')}</div>
        </div>
        <div class="field"><span>Halteres sobem de</span>${segmented('dbStep', [1, 2, 2.5].map((v) => ({ value: v, label: fmtNum(v) + ' kg' })), S.dbStep)}</div>
        <div class="field"><span>Máquinas e polias sobem de</span>${segmented('machineStep', [1, 2.5, 5].map((v) => ({ value: v, label: fmtNum(v) + ' kg' })), S.machineStep)}</div>
      </section>
      <section class="panel">
        <h2 class="panel-title">Descansos</h2>
        <div class="field-row">
          ${[['main', 'Supino'], ['secondary', 'Elevações e dips'], ['accessory', 'Acessórios'], ['skill', 'Muscle-up']].map(([k, l]) => `
            <label class="field"><span>${l}</span><select name="rest_${k}" class="input">${[60, 90, 120, 150, 180, 210, 240, 300].map((t) => `<option value="${t}" ${S.rest[k] === t ? 'selected' : ''}>${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</option>`).join('')}</select></label>`).join('')}
        </div>
        <label class="check line"><input type="checkbox" name="sound" ${S.sound ? 'checked' : ''}><span>Som no fim do descanso</span></label>
        <label class="check line"><input type="checkbox" name="vibrate" ${S.vibrate ? 'checked' : ''}><span>Vibrar no fim do descanso (Android)</span></label>
        <label class="check line"><input type="checkbox" name="wakeLock" ${S.wakeLock ? 'checked' : ''}><span>Manter o ecrã ligado durante o treino</span></label>
      </section>
      <section class="panel">
        <h2 class="panel-title">Alimentação</h2>
        <div class="field"><span>Objetivo de peso</span>${segmented('bwGoal', [{ value: 'gain', label: 'Ganhar devagar' }, { value: 'maintain', label: 'Manter' }], S.bwGoal)}</div>
        <label class="field"><span>Proteína por kg de peso</span><select name="proteinPerKg" class="input">${[1.6, 1.8, 2, 2.2].map((v) => `<option value="${v}" ${S.proteinPerKg === v ? 'selected' : ''}>${fmtNum(v)} g/kg (${Math.round(E.latestBodyweight() * v)} g por dia)</option>`).join('')}</select></label>
      </section>
      <section class="panel">
        <h2 class="panel-title">Aspeto</h2>
        <div class="field"><span>Tema</span>${segmented('theme', [{ value: 'auto', label: 'Automático' }, { value: 'dark', label: 'Escuro' }, { value: 'light', label: 'Claro' }], S.theme)}</div>
      </section>
      ${overrides.length ? `<section class="panel"><h2 class="panel-title">Exercícios trocados</h2><ul class="rec-list">${overrides.map((o) => {
        const slot = E.slotById(o.slotId);
        return `<li><span>${esc(EX[o.ex]?.name || o.ex)}</span><span class="muted">em vez de ${esc(slot ? EX[slot.ex].name : '')}</span><button type="button" class="link small" data-unswap="${o.slotId}">Repor</button></li>`;
      }).join('')}</ul></section>` : ''}
    </form>`;

  const f = root.querySelector('[data-form="settings"]');
  const apply = () => {
    const plates = [...f.querySelectorAll('input[name="plate"]:checked')].map((x) => Number(x.value));
    if (!plates.length) { toast('Escolhe pelo menos um disco.'); return; }
    const bar = parseNum(f.bar.value);
    const w = parseNum(f.bw_w.value);
    const reps = parseNum(f.bw_reps.value);
    setSettings({
      daysPerWeek: Number(f.daysPerWeek.value),
      muStage: f.muStage.value ? Number(f.muStage.value) : null,
      deloadEvery: Number(f.deloadEvery.value),
      bar: bar && bar > 0 ? bar : S.bar,
      plates,
      dbStep: Number(f.dbStep.value),
      machineStep: Number(f.machineStep.value),
      rest: { main: Number(f.rest_main.value), secondary: Number(f.rest_secondary.value), accessory: Number(f.rest_accessory.value), skill: Number(f.rest_skill.value) },
      sound: f.sound.checked,
      vibrate: f.vibrate.checked,
      wakeLock: f.wakeLock.checked,
      bwGoal: f.bwGoal.value,
      proteinPerKg: Number(f.proteinPerKg.value),
      theme: f.theme.value,
      baseline: { ...S.baseline, bench: { w: w || S.baseline.bench.w, reps: reps || S.baseline.bench.reps, rpe: Number(f.bw_rpe.value) }, pullups: parseNum(f.pullups.value) ?? S.baseline.pullups },
    });
    document.documentElement.dataset.theme = f.theme.value;
    toast('Definições guardadas', { timeout: 1500 });
  };
  f.addEventListener('change', apply);
  f.addEventListener('submit', (e) => e.preventDefault());
  root.addEventListener('click', (e) => {
    const u = e.target.closest('[data-unswap]');
    if (u) {
      put('overrides', u.dataset.unswap, { slotId: u.dataset.unswap, ex: null });
      rerender();
    }
  });
}

// ---------- Sincronização ----------
export function renderSync(root) {
  const s = local.sync;
  const last = s.lastSync ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(s.lastSync)) : null;
  root.innerHTML = `
    ${header('Sincronização', { back: '#/mais' })}
    <section class="panel prose">
      <p>Para teres os mesmos dados no PC e no telemóvel, a app guarda uma cópia num <strong>gist privado</strong> do teu GitHub (um ficheiro de texto alojado na tua conta). Cada dispositivo junta as alterações dos outros automaticamente.</p>
      <p>Um gist "secreto" não aparece no teu perfil nem em pesquisas, mas quem tiver o link exato consegue abri-lo. Para dados de treino isso costuma chegar.</p>
    </section>
    ${s.token ? `
      <section class="panel">
        <h2 class="panel-title">Estado</h2>
        <p class="status status-${s.status === 'error' ? 'warn' : s.status === 'ok' ? 'ok' : 'info'}">${
          s.status === 'syncing' ? 'A sincronizar…'
          : s.status === 'error' ? esc(s.lastError)
          : s.status === 'offline' ? 'Sem internet; sincroniza quando voltar.'
          : last ? `Sincronizado em ${esc(last)}.` : 'Ligado.'}</p>
        <div class="row-actions">
          <button class="btn primary" data-act="sync">${icons.sync} Sincronizar agora</button>
          <button class="btn ghost danger-text" data-act="disconnect">Desligar neste dispositivo</button>
        </div>
        ${s.gistId ? `<p class="muted small">Gist: <a href="https://gist.github.com/${esc(s.gistId)}" target="_blank" rel="noopener">${esc(s.gistId.slice(0, 8))}…</a></p>` : ''}
      </section>` : `
      <section class="panel">
        <h2 class="panel-title">Ligar</h2>
        <ol class="steps">
          <li>Abre <a href="https://github.com/settings/tokens/new?scopes=gist&description=Forja%20app" target="_blank" rel="noopener">esta página do GitHub</a> (já vem com a permissão certa marcada: só <em>gist</em>).</li>
          <li>Em "Expiration" escolhe "No expiration" ou uma data longa, e carrega em "Generate token".</li>
          <li>Copia o token (começa por <code>ghp_</code>) e cola-o aqui. Faz o mesmo no outro dispositivo, com o mesmo token.</li>
        </ol>
        <form class="inline-form" data-form="token">
          <input name="token" type="password" autocomplete="off" class="input" placeholder="ghp_…" aria-label="Token do GitHub">
          <button class="btn primary small">Ligar</button>
        </form>
        <p class="muted small">O token fica guardado só neste dispositivo e só dá acesso aos teus gists.</p>
      </section>`}`;

  root.addEventListener('submit', async (e) => {
    e.preventDefault();
    const t = e.target.token.value.trim();
    if (t.length < 20) return toast('Esse token parece incompleto.');
    toast('A ligar ao GitHub…');
    const wasOnboarded = E.S().onboarded;
    const r = await connectSync(t);
    if (r.ok) {
      toast('Sincronização ligada');
      if (!wasOnboarded && E.S().onboarded) return navigate('#/hoje');
    } else toast(r.reason || 'Não foi possível ligar.', { timeout: 6000 });
    rerender();
  });
  root.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    if (a.dataset.act === 'sync') {
      const r = await syncNow();
      toast(r.ok ? 'Sincronizado' : r.reason || 'Falhou');
      rerender();
    } else if (a.dataset.act === 'disconnect') {
      if (await confirmDialog('Desligar a sincronização neste dispositivo? Os dados locais ficam; o gist não é apagado.', { ok: 'Desligar' })) {
        disconnectSync();
        rerender();
      }
    }
  });
}

// ---------- Dados ----------
export function renderData(root) {
  const n = E.sessions().length;
  root.innerHTML = `
    ${header('Backup e dados', { back: '#/mais' })}
    <section class="panel">
      <h2 class="panel-title">Exportar</h2>
      <p class="muted">${n} treinos, ${E.bodyweightEntries().length} pesagens e ${E.runs().length} corridas.</p>
      <div class="row-actions">
        <button class="btn secondary" data-act="json">Exportar backup (JSON)</button>
        <button class="btn secondary" data-act="csv">Exportar séries (CSV)</button>
      </div>
      <p class="muted small">O CSV abre no Excel ou no Google Sheets; o JSON serve para restaurar.</p>
    </section>
    <section class="panel">
      <h2 class="panel-title">Importar backup</h2>
      <p class="muted">Junta o backup com os dados atuais (não apaga nada; ganha a versão mais recente de cada registo).</p>
      <input type="file" accept="application/json,.json" data-import class="input">
    </section>
    <section class="panel">
      <h2 class="panel-title">Apagar tudo</h2>
      <p class="muted">Apaga os dados deste dispositivo. Se a sincronização estiver ligada, desliga-a primeiro, senão os dados voltam do gist.</p>
      <button class="btn danger" data-act="reset">Apagar todos os dados</button>
    </section>`;
  root.addEventListener('click', async (e) => {
    const a = e.target.closest('[data-act]');
    if (!a) return;
    const stamp = todayISO();
    if (a.dataset.act === 'json') downloadFile(`forja-backup-${stamp}.json`, exportJSON());
    else if (a.dataset.act === 'csv') downloadFile(`forja-series-${stamp}.csv`, '﻿' + E.exportCSV(), 'text/csv;charset=utf-8');
    else if (a.dataset.act === 'reset') {
      const ok = await confirmDialog('Apagar todos os treinos, pesagens e definições deste dispositivo?', { ok: 'Apagar tudo', danger: true });
      if (!ok) return;
      const ok2 = await confirmDialog('Tens a certeza? Não dá para desfazer (a não ser com um backup).', { ok: 'Sim, apagar', danger: true });
      if (ok2) {
        resetAll();
        navigate('#/inicio');
      }
    }
  });
  root.querySelector('[data-import]').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      importJSON(JSON.parse(await file.text()));
      toast('Backup importado');
      rerender();
    } catch (err) {
      toast(err.message || 'Ficheiro inválido', { timeout: 5000 });
    }
  });
}

export { DAYS };
