// Arranque: navegação, tema, service worker e sincronização
import { load, local, settings, onChange, syncNow, syncConfigured, loadInbox, snapshotSettings, noteVersion, put, persistLocal } from './store.js';
import * as E from './engine.js';
import { APP_VERSION } from './data.js';
import { setRouter, icons, toast, buildRest, requestWakeLock, unlockAudio, header } from './ui.js';
import { renderToday, renderOnboarding } from './view-today.js';
import { renderWorkout, renderSession } from './view-workout.js';
import { renderProgress, renderExercise, renderHistory } from './view-progress.js';
import { renderBody } from './view-body.js';
import { renderMore, renderTools, renderGuide, renderSettings, renderSync, renderData } from './view-more.js';
import { renderStock } from './view-stock.js';
import { esc } from './util.js';

load();
// Histórico: versão da app, dispositivo e definições em vigor hoje
try {
  if (settings().onboarded) { noteVersion(APP_VERSION); snapshotSettings(); }
} catch (e) { console.error(e); }

const TABS = [
  { id: 'today', href: '#/hoje', label: 'Hoje', icon: icons.today },
  { id: 'progress', href: '#/progresso', label: 'Progresso', icon: icons.progress },
  { id: 'body', href: '#/corpo', label: 'Corpo', icon: icons.body },
  { id: 'history', href: '#/historico', label: 'Histórico', icon: icons.history },
  { id: 'more', href: '#/mais', label: 'Mais', icon: icons.more },
];

const nav = document.getElementById('nav');
nav.innerHTML = `
  <a class="brand" href="#/hoje" aria-label="Forja: início"><span class="brand-mark" aria-hidden="true"></span><span class="brand-name">Forja</span></a>
  <div class="tabs">${TABS.map((t) => `<a class="tab" data-tab="${t.id}" href="${t.href}">${t.icon}<span class="tab-label">${t.label}</span></a>`).join('')}</div>
  <div class="nav-sync" data-sync aria-live="polite"></div>`;

// Tema: escolha deste dispositivo (botão no canto ou Definições) ou, sem escolha, o das definições
const SUN = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/></svg>';
const MOON = '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.5 8.5 0 1 1 9.5 3.5a7 7 0 0 0 11 11Z"/></svg>';
const isDark = () => {
  const t = local.theme || settings().theme || 'auto';
  return t === 'dark' || (t === 'auto' && !matchMedia('(prefers-color-scheme: light)').matches);
};
const themeFab = document.body.appendChild(Object.assign(document.createElement('button'), { className: 'theme-fab', type: 'button' }));
function applyTheme() {
  const t = local.theme || settings().theme || 'auto';
  document.documentElement.dataset.theme = t;
  const dark = isDark();
  document.querySelector('meta[name="theme-color"]').setAttribute('content', dark ? '#1C2026' : '#EEF0F2');
  themeFab.innerHTML = dark ? SUN : MOON;
  themeFab.setAttribute('aria-label', dark ? 'Desligar o modo escuro' : 'Ligar o modo escuro');
  themeFab.title = dark ? 'Modo claro' : 'Modo escuro';
}
themeFab.addEventListener('click', () => {
  local.theme = isDark() ? 'light' : 'dark';
  persistLocal();
  applyTheme();
});
applyTheme();
matchMedia('(prefers-color-scheme: light)').addEventListener('change', applyTheme);
window.addEventListener('forja-theme', applyTheme);

function setActiveTab(tab) {
  nav.querySelectorAll('.tab').forEach((a) => {
    const on = a.dataset.tab === tab;
    a.classList.toggle('on', on);
    if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
  });
  const todayTab = nav.querySelector('[data-tab="today"]');
  todayTab.classList.toggle('live', !!local.active);
  todayTab.querySelector('.tab-label').textContent = local.active ? 'Treino' : 'Hoje';
  todayTab.setAttribute('href', local.active ? '#/treino' : '#/hoje');
}

function updateSyncIndicator() {
  const el = nav.querySelector('[data-sync]');
  const s = local.sync;
  if (!s.token) { el.innerHTML = ''; return; }
  const map = { ok: 'Sincronizado', syncing: 'A sincronizar', error: 'Erro de sincronização', offline: 'Sem internet' };
  el.innerHTML = `<a href="#/mais/sync" class="sync-pill s-${s.status}">${icons.sync}<span>${map[s.status] || ''}</span></a>`;
}

const view = document.getElementById('view');
let lastPath = null;

function render() {
  const raw = location.hash.slice(1) || '/hoje';
  const path = raw.split('#')[0];
  const parts = path.split('/').filter(Boolean);
  const S = settings();
  if (!S.onboarded && !['inicio', 'mais'].includes(parts[0])) {
    location.replace('#/inicio');
    return;
  }
  const same = path === lastPath;
  const scrollY = window.scrollY;
  lastPath = path;
  const root = document.createElement('div');
  root.className = 'view-inner';
  view.replaceChildren(root);
  let tab = 'today';
  try {
    switch (parts[0]) {
      case 'inicio':
        if (S.onboarded) { location.replace('#/hoje'); return; }
        tab = null; renderOnboarding(root); break;
      case 'hoje': renderToday(root); break;
      case 'treino': renderWorkout(root, { mode: 'active' }); break;
      case 'progresso': tab = 'progress'; renderProgress(root); break;
      case 'exercicio': tab = 'progress'; renderExercise(root, { id: parts[1] }); break;
      case 'corpo': tab = 'body'; renderBody(root); break;
      case 'historico': tab = 'history'; renderHistory(root); break;
      case 'sessao':
        tab = 'history';
        if (parts[2] === 'editar') renderWorkout(root, { mode: 'edit', id: parts[1] });
        else renderSession(root, { id: parts[1], fresh: parts[2] === 'novo' });
        break;
      case 'mais':
        tab = 'more';
        if (!parts[1]) renderMore(root);
        else if (parts[1] === 'ferramentas') renderTools(root);
        else if (parts[1] === 'guia') renderGuide(root, { id: parts[2] });
        else if (parts[1] === 'definicoes') renderSettings(root);
        else if (parts[1] === 'sync') renderSync(root);
        else if (parts[1] === 'dados') renderData(root);
        else if (parts[1] === 'stock') renderStock(root);
        else renderMore(root);
        break;
      default:
        location.replace('#/hoje');
        return;
    }
  } catch (err) {
    console.error(err);
    root.innerHTML = `${header('Algo correu mal')}<section class="panel"><p>Este ecrã falhou a abrir: ${esc(err.message)}</p><a class="btn primary" href="#/hoje">Voltar a Hoje</a></section>`;
  }
  document.body.classList.toggle('no-nav', tab === null);
  setActiveTab(tab);
  updateSyncIndicator();
  if (same) window.scrollTo(0, scrollY);
  else window.scrollTo(0, 0);
}

setRouter(render);
window.addEventListener('hashchange', render);

function isTyping() {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT');
}

let lastSyncErr = local.sync.status === 'error';
onChange((kind) => {
  if (kind === 'remote') {
    applyTheme();
    if (!isTyping()) render();
  } else if (kind === 'sync-status') {
    updateSyncIndicator();
    // O aviso de erro de sincronização vive no ecrã Hoje: redesenha quando o erro aparece ou desaparece
    const isErr = local.sync.status === 'error';
    if (isErr !== lastSyncErr) {
      lastSyncErr = isErr;
      if ((location.hash || '#/hoje').startsWith('#/hoje') && !isTyping()) render();
    }
  } else if (kind === 'save-error') {
    toast('Não foi possível guardar neste dispositivo (espaço cheio?). Exporta um backup.', { timeout: 8000 });
  }
});

// Desbloqueia o som no primeiro toque (os browsers exigem um gesto)
window.addEventListener('pointerdown', unlockAudio, { once: true });

// Previsão da chuva no Estádio (decide trocas entre Supera e Estádio): no máximo de 3 em 3 horas
function refreshWeather() {
  E.refreshWeather().then((changed) => {
    if (changed && (location.hash || '#/hoje').startsWith('#/hoje') && !isTyping() && !local.active) render();
  });
}
refreshWeather();

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') {
    refreshWeather();
    if (local.active) requestWakeLock();
    buildRest();
    if (syncConfigured() && Date.now() - (local.sync.lastSync || 0) > 120000) syncNow();
    loadInbox();
  }
});
window.addEventListener('online', () => { if (syncConfigured()) syncNow(); refreshWeather(); });

// Service worker: funciona offline e avisa quando há versão nova
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('./sw.js').then((reg) => {
    // Versão nova pronta: fora de um treino, atualiza sozinha; durante um treino, mostra um aviso fixo
    // (para não recarregar a meio de uma série).
    const ready = (w) => {
      if (!navigator.serviceWorker.controller) return;
      if (!local.active) { w.postMessage('skipWaiting'); return; }
      const bar = document.getElementById('update-bar') || document.body.appendChild(Object.assign(document.createElement('div'), { id: 'update-bar' }));
      bar.className = 'update-bar';
      bar.innerHTML = '<span>Há uma versão nova da app.</span><button class="btn primary small">Atualizar</button>';
      bar.querySelector('button').onclick = () => w.postMessage('skipWaiting');
    };
    if (reg.waiting) ready(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener('statechange', () => {
        if (nw.state === 'installed') ready(nw);
      });
    });
    // Procura versões novas ao abrir, ao voltar à app e de hora a hora
    reg.update().catch(() => {});
    document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });
    setInterval(() => reg.update().catch(() => {}), 60 * 60 * 1000);
  }).catch((e) => console.warn('SW', e));
  let refreshing = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (refreshing) return;
    refreshing = true;
    location.reload();
  });
}

render();
buildRest();
// Copia para os treinos já guardados as notas de execução que ainda não tinham (ex.: um braço de cada vez)
function annotateSaved() {
  try {
    for (const sess of E.sessions()) {
      const c = structuredClone(sess);
      if (E.annotateSession(c)) put('sessions', c.id, c);
    }
  } catch (e) { console.error(e); }
}
loadInbox({ force: true }).finally(() => { annotateSaved(); if (syncConfigured()) syncNow(); });
