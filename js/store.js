// Estado da app: guardado no dispositivo e, opcionalmente, sincronizado num gist privado do GitHub.
import { DEFAULT_SETTINGS } from './data.js';
import { now, uid, debounce } from './util.js';

const KEY = 'forja.state.v1';
const LOCAL_KEY = 'forja.local.v1';
const FILE = 'forja-dados.json';
const API = 'https://api.github.com';

export const COLLS = ['sessions', 'bodyweight', 'waist', 'habits', 'runs', 'milestones', 'deloadWeeks', 'overrides', 'purchases', 'stock'];

function emptyState() {
  return {
    v: 1,
    settings: { ...structuredClone(DEFAULT_SETTINGS), updatedAt: 0 },
    sessions: {}, bodyweight: {}, waist: {}, habits: {}, runs: {}, milestones: {}, deloadWeeks: {}, overrides: {}, purchases: {}, stock: {},
  };
}

function normalize(s) {
  const e = emptyState();
  const out = { ...e };
  const st = (s && s.settings) || {};
  out.settings = {
    ...e.settings,
    ...st,
    rest: { ...e.settings.rest, ...(st.rest || {}) },
    baseline: {
      ...e.settings.baseline,
      ...(st.baseline || {}),
      bench: { ...e.settings.baseline.bench, ...((st.baseline || {}).bench || {}) },
    },
  };
  for (const c of COLLS) out[c] = (s && s[c]) || {};
  return out;
}

// O estado sincronizado (dados de treino). É uma "live binding": não guardes cópias dele.
export let state = emptyState();

// Estado só deste dispositivo: treino em curso e configuração de sincronização.
export let local = {
  deviceId: uid(),
  active: null,
  sync: { token: '', gistId: '', lastSync: 0, lastError: '', status: 'off' },
};

const listeners = new Set();
export function onChange(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
function emit(kind) {
  for (const fn of listeners) {
    try { fn(kind); } catch (e) { console.error(e); }
  }
}

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) state = normalize(JSON.parse(raw));
  } catch (e) {
    console.error('Falha a ler dados', e);
  }
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) {
      const l = JSON.parse(raw);
      local = { ...local, ...l, sync: { ...local.sync, ...(l.sync || {}) } };
    }
  } catch (e) {
    console.error(e);
  }
  local.sync.status = local.sync.token ? (local.sync.lastError ? 'error' : 'ok') : 'off';
  // Pede ao browser para não apagar os dados quando falta espaço
  if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {});
}

let saveError = null;
function saveRaw() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    saveError = null;
  } catch (e) {
    saveError = e;
    console.error(e);
    emit('save-error');
  }
}

export function persist() {
  saveRaw();
  emit('state');
  scheduleSync();
}

export function persistLocal() {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(local));
  } catch (e) {
    console.error(e);
  }
}

export function getSaveError() {
  return saveError;
}

export function put(coll, key, rec) {
  state[coll][key] = { ...rec, updatedAt: now() };
  persist();
  return state[coll][key];
}

export function remove(coll, key) {
  state[coll][key] = { deleted: true, updatedAt: now() };
  persist();
}

export function get(coll, key) {
  const r = state[coll][key];
  return r && !r.deleted ? r : null;
}

export function list(coll) {
  return Object.values(state[coll]).filter((r) => r && !r.deleted);
}

export function settings() {
  return state.settings;
}

export function setSettings(patch) {
  state.settings = { ...state.settings, ...patch, updatedAt: now() };
  persist();
}

// Junta dois estados: por registo, ganha o que foi alterado mais recentemente.
export function merge(a, b) {
  a = normalize(a);
  b = normalize(b);
  const out = emptyState();
  out.settings = (b.settings.updatedAt || 0) > (a.settings.updatedAt || 0) ? b.settings : a.settings;
  for (const c of COLLS) {
    const A = a[c];
    const B = b[c];
    const r = {};
    for (const k of new Set([...Object.keys(A), ...Object.keys(B)])) {
      const x = A[k];
      const y = B[k];
      if (!x) r[k] = y;
      else if (!y) r[k] = x;
      else r[k] = (y.updatedAt || 0) > (x.updatedAt || 0) ? y : x;
    }
    out[c] = r;
  }
  return normalize(out);
}

// JSON com chaves ordenadas, para comparar estados
function stable(v) {
  if (Array.isArray(v)) return '[' + v.map(stable).join(',') + ']';
  if (v && typeof v === 'object') {
    return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + stable(v[k])).join(',') + '}';
  }
  return JSON.stringify(v);
}

// ---------- Backup ----------
export function exportJSON() {
  return JSON.stringify({ app: 'forja', exportedAt: new Date().toISOString(), ...state }, null, 1);
}

export function importJSON(obj) {
  if (!obj || typeof obj !== 'object' || !obj.settings) throw new Error('O ficheiro não parece um backup da app.');
  state = merge(state, obj);
  persist();
  emit('import');
}

export function resetAll() {
  state = emptyState();
  local.active = null;
  saveRaw();
  persistLocal();
  emit('state');
}

// ---------- Dados enviados pelo Claude ----------
// O Claude pode escrever registos em claude/inbox.json no repositório (por exemplo compras e stock).
// A app junta-os ao estado com a mesma regra da sincronização: ganha a versão mais recente de cada registo,
// por isso o que alterares ou apagares na app não volta atrás.
let inboxAt = 0;
export async function loadInbox({ force = false } = {}) {
  if (!force && Date.now() - inboxAt < 10 * 60 * 1000) return false;
  inboxAt = Date.now();
  try {
    const res = await fetch('./claude/inbox.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return false;
    const inbox = await res.json();
    const incoming = { settings: { updatedAt: -1 } };
    for (const c of COLLS) if (inbox[c] && typeof inbox[c] === 'object') incoming[c] = inbox[c];
    const merged = merge(state, incoming);
    if (stable(merged) === stable(state)) return false;
    state = merged;
    saveRaw();
    emit('remote');
    scheduleSync();
    return true;
  } catch (e) {
    return false;
  }
}

// ---------- Sincronização (GitHub Gist) ----------
function setStatus(status) {
  local.sync.status = status;
  persistLocal();
  emit('sync-status');
}

async function gh(path, { method = 'GET', body } = {}) {
  const headers = {
    Accept: 'application/vnd.github+json',
    Authorization: 'Bearer ' + local.sync.token.trim(),
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (body) headers['Content-Type'] = 'application/json';
  let res;
  try {
    res = await fetch(API + path, { method, headers, body: body ? JSON.stringify(body) : undefined, cache: 'no-store' });
  } catch (e) {
    throw new Error('Sem ligação ao GitHub.');
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error('O token é inválido ou expirou.');
    if (res.status === 404) throw new Error('Gist não encontrado, ou o token não tem permissão para gists.');
    if (res.status === 403) throw new Error('O GitHub recusou o pedido (permissões do token ou limite de pedidos).');
    throw new Error('Erro do GitHub: ' + res.status);
  }
  return res.status === 204 ? null : res.json();
}

async function findGist() {
  for (let page = 1; page <= 5; page++) {
    const listRes = await gh(`/gists?per_page=100&page=${page}`);
    const g = listRes.find((x) => x.files && x.files[FILE]);
    if (g) return g.id;
    if (listRes.length < 100) break;
  }
  return null;
}

async function readGist(id) {
  const g = await gh('/gists/' + id);
  const f = g.files && g.files[FILE];
  if (!f) return null;
  let content = f.content;
  if (f.truncated && f.raw_url) {
    const r = await fetch(f.raw_url, { cache: 'no-store' });
    content = await r.text();
  }
  return JSON.parse(content);
}

async function writeGist(id, data) {
  return gh('/gists/' + id, { method: 'PATCH', body: { files: { [FILE]: { content: JSON.stringify(data) } } } });
}

async function createGist(data) {
  const g = await gh('/gists', {
    method: 'POST',
    body: {
      description: 'Forja: dados de treino (sincronização da app)',
      public: false,
      files: { [FILE]: { content: JSON.stringify(data) } },
    },
  });
  return g.id;
}

let syncing = null;

export function syncConfigured() {
  return !!local.sync.token;
}

export async function syncNow() {
  if (!local.sync.token) return { ok: false, reason: 'off' };
  if (!navigator.onLine) {
    setStatus('offline');
    return { ok: false, reason: 'offline' };
  }
  if (syncing) return syncing;
  syncing = (async () => {
    setStatus('syncing');
    try {
      let id = local.sync.gistId || (await findGist());
      if (!id) {
        id = await createGist(state);
        local.sync.gistId = id;
      } else {
        local.sync.gistId = id;
        const remote = await readGist(id);
        const merged = remote ? merge(state, remote) : state;
        const mergedStr = stable(merged);
        if (mergedStr !== stable(state)) {
          state = merged;
          saveRaw();
          emit('remote');
        }
        if (!remote || mergedStr !== stable(normalize(remote))) await writeGist(id, merged);
      }
      local.sync.lastSync = now();
      local.sync.lastError = '';
      setStatus('ok');
      return { ok: true };
    } catch (e) {
      local.sync.lastError = e.message || String(e);
      setStatus('error');
      return { ok: false, reason: local.sync.lastError };
    } finally {
      persistLocal();
      syncing = null;
    }
  })();
  return syncing;
}

const debouncedSync = debounce(() => {
  if (local.sync.token) syncNow();
}, 6000);

export function scheduleSync() {
  if (local.sync.token) debouncedSync();
}

export function connectSync(token) {
  local.sync.token = token.trim();
  local.sync.gistId = '';
  local.sync.lastError = '';
  persistLocal();
  return syncNow();
}

export function disconnectSync() {
  local.sync = { token: '', gistId: '', lastSync: 0, lastError: '', status: 'off' };
  persistLocal();
  emit('sync-status');
}
