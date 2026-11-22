// Componentes partilhados: navegação, avisos, janelas, temporizador de descanso, ecrã ligado
import { esc, fmtClock } from './util.js';
import { local, persistLocal, settings } from './store.js';

let router = null;
export function setRouter(fn) {
  router = fn;
}
export function navigate(hash) {
  if (location.hash === hash) router && router();
  else location.hash = hash;
}
export function rerender() {
  router && router();
}

// ---------- Ícones (traço simples, 24×24) ----------
const P = (d) => `<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
export const icons = {
  today: P('M2 12h20M5 8v8M8 6v12M16 6v12M19 8v8'),
  progress: P('M3 20h18M5 16l5-5 3 3 6-7M15 7h4v4'),
  body: P('M4 7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3zM9 9a4.5 4.5 0 0 1 6 0M12 12l1.5-2.5'),
  history: P('M4 6h16M4 12h16M4 18h10'),
  more: P('M5 12h.01M12 12h.01M19 12h.01'),
  check: P('M5 12.5l4.5 4.5L19 7'),
  plus: P('M12 5v14M5 12h14'),
  minus: P('M5 12h14'),
  info: P('M12 11v6M12 7.5v.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z'),
  swap: P('M7 7h12l-3-3M17 17H5l3 3'),
  close: P('M6 6l12 12M18 6L6 18'),
  back: P('M15 5l-7 7 7 7'),
  trash: P('M5 7h14M10 7V5h4v2M7 7l1 12h8l1-12'),
  edit: P('M4 20h4L19 9l-4-4L4 16zM13 7l4 4'),
  chevron: P('M9 6l6 6-6 6'),
  sync: P('M4 12a8 8 0 0 1 14-5.3L20 9M20 4v5h-5M20 12a8 8 0 0 1-14 5.3L4 15M4 20v-5h5'),
  image: P('M4 6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 16l5-5 4 4 2-2 5 5M15 9h.01'),
  timer: P('M12 8v5l3 2M9 2h6M12 22a8 8 0 1 0 0-16 8 8 0 0 0 0 16z'),
};

// ---------- Avisos ----------
export function toast(msg, { action, timeout = 3500 } = {}) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'status');
  el.innerHTML = `<span>${esc(msg)}</span>${action ? `<button class="toast-action">${esc(action.label)}</button>` : ''}`;
  root.appendChild(el);
  const close = () => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 200);
  };
  if (action) {
    el.querySelector('.toast-action').addEventListener('click', () => {
      action.fn();
      close();
    });
  }
  if (timeout) setTimeout(close, timeout);
  return close;
}

// ---------- Janelas ----------
export function modal({ title = '', body = '', actions = [{ label: 'Fechar', value: null }], onMount, wide = false, autofocus = true } = {}) {
  return new Promise((resolve) => {
    const root = document.getElementById('modal-root');
    const wrap = document.createElement('div');
    wrap.className = 'modal-wrap';
    wrap.innerHTML = `
      <div class="modal ${wide ? 'wide' : ''}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
        ${title ? `<h2 class="modal-title">${esc(title)}</h2>` : ''}
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          ${actions.map((a, i) => `<button class="btn ${a.kind || 'secondary'}" data-i="${i}">${esc(a.label)}</button>`).join('')}
        </div>
      </div>`;
    const prevFocus = document.activeElement;
    const done = (v) => {
      document.removeEventListener('keydown', onKey);
      wrap.classList.add('out');
      setTimeout(() => wrap.remove(), 150);
      if (prevFocus && prevFocus.focus) prevFocus.focus();
      resolve(v);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') done(null);
    };
    wrap.addEventListener('click', (e) => {
      if (e.target === wrap) done(null);
      const b = e.target.closest('[data-i]');
      if (b) {
        const a = actions[Number(b.dataset.i)];
        if (a.fn) {
          const r = a.fn(wrap);
          if (r === false) return;
        }
        done(a.value);
      }
    });
    document.addEventListener('keydown', onKey);
    root.appendChild(wrap);
    if (onMount) onMount(wrap, done);
    const first = (autofocus && wrap.querySelector('input, select, textarea')) || wrap.querySelector('.modal-actions .primary') || wrap.querySelector('button');
    if (first) setTimeout(() => first.focus(), 30);
  });
}

export function confirmDialog(text, { ok = 'Confirmar', danger = false, title = '' } = {}) {
  return modal({
    title,
    body: `<p>${esc(text)}</p>`,
    actions: [
      { label: 'Cancelar', value: false },
      { label: ok, value: true, kind: danger ? 'danger' : 'primary' },
    ],
  });
}

export function downloadFile(name, content, type = 'application/json') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

// ---------- Som e vibração ----------
let audioCtx = null;
export function unlockAudio() {
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') audioCtx.resume();
  } catch (e) { /* sem áudio */ }
}

function beep() {
  if (!audioCtx) return;
  const t0 = audioCtx.currentTime;
  [0, 0.22, 0.44].forEach((d, i) => {
    const o = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    o.type = 'sine';
    o.frequency.value = i === 2 ? 1175 : 880;
    g.gain.setValueAtTime(0.0001, t0 + d);
    g.gain.exponentialRampToValueAtTime(0.35, t0 + d + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + d + 0.18);
    o.connect(g).connect(audioCtx.destination);
    o.start(t0 + d);
    o.stop(t0 + d + 0.2);
  });
}

function alarm(label = '') {
  const s = settings();
  // Se o áudio do descanso estiver a tocar, o apito já vem nele (e toca mesmo com o ecrã bloqueado)
  if (s.sound && !(restAudio && !restAudio.paused)) beep();
  if (s.vibrate && navigator.vibrate) navigator.vibrate([250, 120, 250, 120, 400]);
  notifyRestEnd(label);
}

// ---------- Descanso com o ecrã bloqueado ----------
// Toca um áudio inaudível com a duração exata do descanso e com o apito no fim.
// Com isto: o descanso aparece nos controlos de multimédia do ecrã bloqueado (com a barra
// de tempo), a contagem continua com o telemóvel bloqueado e o apito toca à hora certa.
let restAudio = null;
let restAudioUrl = null;
const REST_TAIL = 2.4; // segundos de apito depois do fim

function restWav(seconds) {
  const rate = 6000;
  const n = Math.round((seconds + REST_TAIL) * rate);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const str = (o, x) => { for (let i = 0; i < x.length; i++) v.setUint8(o + i, x.charCodeAt(i)); };
  str(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); str(8, 'WAVE'); str(12, 'fmt ');
  v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  str(36, 'data'); v.setUint32(40, n * 2, true);
  const start = Math.round(seconds * rate);
  const tones = [[0, 880], [0.22, 880], [0.44, 1175], [1.1, 880], [1.32, 880], [1.54, 1175]];
  for (let i = 0; i < n; i++) {
    let x = i & 1 ? 1 : -1; // sinal mínimo, inaudível, para o telemóvel tratar isto como áudio a tocar
    if (i >= start) {
      const t = (i - start) / rate;
      for (const [d, f] of tones) {
        if (t >= d && t < d + 0.18) {
          const env = Math.min(1, (t - d) / 0.01, (d + 0.18 - t) / 0.02);
          x = Math.round(Math.sin(2 * Math.PI * f * (t - d)) * 15000 * env);
        }
      }
    }
    v.setInt16(44 + i * 2, x, true);
  }
  return new Blob([buf], { type: 'audio/wav' });
}

function stopRestAudio() {
  if (restAudio) { try { restAudio.pause(); } catch (e) { /* nada */ } }
  restAudio = null;
  if (restAudioUrl) URL.revokeObjectURL(restAudioUrl);
  restAudioUrl = null;
  if ('mediaSession' in navigator) {
    try {
      navigator.mediaSession.metadata = null;
      navigator.mediaSession.playbackState = 'none';
      for (const a of ['play', 'pause', 'stop', 'nexttrack', 'seekforward', 'seekbackward']) navigator.mediaSession.setActionHandler(a, null);
    } catch (e) { /* nada */ }
  }
}

function playRestAudio(t) {
  if (settings().lockScreenRest === false) return;
  try {
    stopRestAudio();
    const elapsed = Math.max(0, t.total - (t.endAt - Date.now()) / 1000);
    restAudioUrl = URL.createObjectURL(restWav(t.total));
    const a = new Audio(restAudioUrl);
    restAudio = a;
    a.addEventListener('loadedmetadata', () => {
      if (elapsed > 0.5) a.currentTime = elapsed;
      try { navigator.mediaSession.setPositionState({ duration: a.duration, playbackRate: 1, position: Math.min(elapsed, a.duration) }); } catch (e) { /* nada */ }
    }, { once: true });
    a.addEventListener('ended', () => { if (restAudio === a) stopRestAudio(); });
    a.play().catch(() => { if (restAudio === a) stopRestAudio(); });
    if ('mediaSession' in navigator) {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: t.label ? `Descanso: ${t.label}` : 'Descanso',
        artist: 'Forja',
        album: 'Treino',
        artwork: [
          { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      });
      navigator.mediaSession.playbackState = 'playing';
      const h = (act, fn) => { try { navigator.mediaSession.setActionHandler(act, fn); } catch (e) { /* não suportado */ } };
      h('pause', () => stopRest());
      h('stop', () => stopRest());
      h('nexttrack', () => stopRest());
      h('play', () => { if (restAudio) restAudio.play().catch(() => {}); });
      h('seekforward', () => adjustRest(15));
      h('seekbackward', () => adjustRest(-15));
    }
  } catch (e) {
    console.error(e);
    stopRestAudio();
  }
}

// Notificação no fim do descanso (aparece no ecrã bloqueado), se tiveres dado permissão
function notifyRestEnd(label) {
  try {
    if (!('Notification' in window) || Notification.permission !== 'granted' || !document.hidden) return;
    navigator.serviceWorker?.getRegistration().then((reg) => {
      if (!reg) return;
      reg.showNotification('Descanso terminado', {
        body: label ? `Próxima série: ${label}` : 'Próxima série',
        tag: 'forja-rest', renotify: true, icon: './icons/icon-192.png', vibrate: [250, 120, 250, 120, 400],
      });
    });
  } catch (e) { /* sem notificações */ }
}

export async function enableRestNotifications() {
  if (!('Notification' in window)) return 'unsupported';
  try { return await Notification.requestPermission(); } catch (e) { return 'denied'; }
}

// ---------- Temporizador de descanso ----------
let restTick = null;

export function startRest(sec, label = '') {
  local.timer = { endAt: Date.now() + sec * 1000, total: sec, label, fired: false };
  persistLocal();
  buildRest();
  playRestAudio(local.timer);
}

export function stopRest() {
  local.timer = null;
  persistLocal();
  stopRestAudio();
  buildRest();
}

function adjustRest(d) {
  const t = local.timer;
  if (!t) return;
  t.endAt += d * 1000;
  t.total = Math.max(5, t.total + d);
  if (t.endAt > Date.now()) t.fired = false;
  persistLocal();
  updateRest();
  if (t.endAt > Date.now()) playRestAudio(t);
}

export function buildRest() {
  const el = document.getElementById('restbar');
  const t = local.timer;
  if (!t) {
    el.hidden = true;
    el.innerHTML = '';
    document.body.classList.remove('has-rest');
    clearInterval(restTick);
    restTick = null;
    stopRestAudio();
    return;
  }
  // Descanso que já acabou há muito tempo (app fechada): limpa sem tocar
  if (Date.now() - t.endAt > 30000) {
    local.timer = null;
    persistLocal();
    return buildRest();
  }
  el.hidden = false;
  document.body.classList.add('has-rest');
  el.innerHTML = `
    <div class="rest-fill"></div>
    <div class="rest-inner">
      <div class="rest-text"><span class="rest-label"></span><span class="rest-time num"></span></div>
      <div class="rest-actions">
        <button class="btn ghost small" data-d="-15" aria-label="Menos 15 segundos">−15</button>
        <button class="btn ghost small" data-d="15" aria-label="Mais 15 segundos">+15</button>
        <button class="btn secondary small" data-stop>Saltar</button>
      </div>
    </div>
    ${'Notification' in window && Notification.permission === 'default' ? '<button class="rest-notify" data-notify>Avisar também com notificação no ecrã bloqueado</button>' : ''}`;
  el.onclick = (e) => {
    const d = e.target.closest('[data-d]');
    if (d) adjustRest(Number(d.dataset.d));
    if (e.target.closest('[data-stop]')) stopRest();
    const nb = e.target.closest('[data-notify]');
    if (nb) enableRestNotifications().then((r) => { nb.remove(); toast(r === 'granted' ? 'Vais receber um aviso quando o descanso acabar.' : 'Sem notificações: fica o apito e o descanso nos controlos de multimédia.'); });
  };
  clearInterval(restTick);
  restTick = setInterval(updateRest, 250);
  updateRest();
}

function updateRest() {
  const el = document.getElementById('restbar');
  const t = local.timer;
  if (!t) return;
  const rem = (t.endAt - Date.now()) / 1000;
  const label = el.querySelector('.rest-label');
  const time = el.querySelector('.rest-time');
  const fill = el.querySelector('.rest-fill');
  if (!label) return;
  if (rem <= 0) {
    if (!t.fired) {
      t.fired = true;
      persistLocal();
      alarm(t.label);
      setTimeout(() => {
        if (local.timer && local.timer.fired && local.timer.endAt === t.endAt) stopRest();
      }, 6000);
    }
    el.classList.add('done');
    label.textContent = 'Descanso terminado';
    time.textContent = 'Próxima série';
    fill.style.transform = 'scaleX(1)';
  } else {
    el.classList.remove('done');
    label.textContent = t.label ? `Descanso: ${t.label}` : 'Descanso';
    time.textContent = fmtClock(rem);
    fill.style.transform = `scaleX(${Math.min(1, 1 - rem / t.total)})`;
  }
}

// ---------- Ecrã ligado durante o treino ----------
let wakeLock = null;
export async function requestWakeLock() {
  if (!settings().wakeLock || !('wakeLock' in navigator)) return;
  try {
    if (!wakeLock) {
      wakeLock = await navigator.wakeLock.request('screen');
      wakeLock.addEventListener('release', () => { wakeLock = null; });
    }
  } catch (e) { /* recusado pelo browser */ }
}
export function releaseWakeLock() {
  if (wakeLock) wakeLock.release().catch(() => {});
  wakeLock = null;
}

// ---------- Formulários ----------
export function segmented(name, options, value) {
  return `<div class="seg" role="radiogroup">${options
    .map((o) => `<label class="seg-opt"><input type="radio" name="${esc(name)}" value="${esc(o.value)}" ${String(o.value) === String(value) ? 'checked' : ''}><span>${esc(o.label)}</span></label>`)
    .join('')}</div>`;
}

export function header(title, { back, sub, right = '' } = {}) {
  return `<header class="vhead">
    ${back ? `<a class="icon-btn back" href="${esc(back)}" aria-label="Voltar">${icons.back}</a>` : ''}
    <div class="vhead-text"><h1>${esc(title)}</h1>${sub ? `<p class="vhead-sub">${esc(sub)}</p>` : ''}</div>
    ${right}
  </header>`;
}

// Se há uma versão nova à espera (adiada por causa de um treino em curso), aplica-a já
export function applyPendingUpdate() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.getRegistration().then((r) => {
    if (r && r.waiting && navigator.serviceWorker.controller) r.waiting.postMessage('skipWaiting');
    const bar = document.getElementById('update-bar');
    if (bar && !(r && r.waiting)) bar.remove();
  }).catch(() => {});
}
