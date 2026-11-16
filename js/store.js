// Estado da app: guardado no dispositivo e, opcionalmente, sincronizado na nuvem: num repositório privado
// do GitHub (recomendado; cada sincronização fica no histórico do git) ou num gist.
import { DEFAULT_SETTINGS } from './data.js';
import { now, uid, debounce, todayISO } from './util.js';

const KEY = 'forja.state.v1';
const LOCAL_KEY = 'forja.local.v1';
const FILE = 'forja-dados.json';
const API = 'https://api.github.com';

// Coleções guardadas. As últimas servem sobretudo o histórico:
// days: notas por dia (treino falhado e motivo, "hoje não dá");
// settingsHistory: cópia das definições em cada dia em que mudaram (o plano semanal incluído);
// revisions: versões anteriores de treinos editados; meta: versões da app e dispositivos usados;
// exerciseNotes: notas sobre como um exercício é feito (ex.: um braço de cada vez, que máquina), copiadas para os treinos.
// reminders: lembretes de técnica para mostrar nos próximos treinos de um exercício, até os esconderes.
// mealPlans: opção escolhida em cada refeição do guia de refeições, por dia.
export const COLLS = ['sessions', 'bodyweight', 'waist', 'shoulders', 'habits', 'runs', 'milestones', 'deloadWeeks', 'overrides', 'purchases', 'stock',
  'days', 'settingsHistory', 'revisions', 'meta', 'exerciseNotes', 'reminders', 'mealPlans'];

function emptyState() {
  return {
    v: 1,
    settings: { ...structuredClone(DEFAULT_SETTINGS), updatedAt: 0 },
    ...Object.fromEntries(COLLS.map((c) => [c, {}])),
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
  sync: { provider: 'gist', token: '', gistId: '', repo: '', path: 'forja-dados.json', lastSync: 0, lastError: '', status: 'off' },
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

// Cada registo guarda quando foi criado (createdAt) e alterado (updatedAt).
export function put(coll, key, rec) {
  const prev = state[coll][key];
  const t = now();
  const createdAt = (prev && !prev.deleted && prev.createdAt) || rec.createdAt || t;
  state[coll][key] = { ...rec, createdAt, updatedAt: t };
  persist();
  return state[coll][key];
}

// Apagar deixa uma marca (para a sincronização não o ressuscitar) com o conteúdo antigo em "was",
// para o histórico não se perder.
export function remove(coll, key) {
  const prev = state[coll][key];
  const was = prev && !prev.deleted ? prev : prev && prev.was ? prev.was : undefined;
  state[coll][key] = { deleted: true, deletedAt: now(), updatedAt: now(), ...(was ? { was } : {}) };
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
  snapshotSettings();
}

// Guarda uma cópia das definições (com o plano semanal) no dia em que mudam.
// Assim a app sabe que plano estava em vigor em cada dia do passado.
export function snapshotSettings() {
  if (!state.settings.onboarded) return false;
  const { updatedAt, ...cur } = state.settings;
  const snaps = Object.values(state.settingsHistory).filter((r) => r && !r.deleted).sort((a, b) => a.date.localeCompare(b.date));
  const last = snaps[snaps.length - 1];
  if (last && stable(last.settings) === stable(cur)) return false;
  const day = todayISO();
  put('settingsHistory', day, { date: day, settings: structuredClone(cur) });
  return true;
}

// Regista a versão da app e o tipo de dispositivo na primeira vez que aparecem
export function noteVersion(version) {
  const key = 'v' + version;
  if (!state.meta[key]) put('meta', key, { kind: 'version', version, firstSeen: now(), deviceId: local.deviceId });
  const dkey = 'device-' + local.deviceId;
  if (!state.meta[dkey]) {
    const mobile = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches;
    put('meta', dkey, { kind: 'device', deviceId: local.deviceId, firstSeen: now(), mobile, ua: navigator.userAgent.slice(0, 160) });
  }
}

// Tamanho aproximado dos dados guardados (bytes)
export function dataSize() {
  try { return new Blob([JSON.stringify(state)]).size; } catch (e) { return JSON.stringify(state).length; }
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
    const sp = inbox.settingsPatch;
    if (sp && typeof sp === 'object' && (sp.updatedAt || 0) > (merged.settings.updatedAt || 0)) {
      const { updatedAt, ...patch } = sp;
      merged.settings = { ...merged.settings, ...patch, updatedAt };
    }
    if (stable(merged) === stable(state)) return false;
    state = merged;
    saveRaw();
    snapshotSettings();
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

async function gh(path, { method = 'GET', body, allow404 = false, raw = false } = {}) {
  const headers = {
    Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
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
    if (res.status === 404 && allow404) return null;
    if (res.status === 401) throw new Error('O token é inválido ou expirou.');
    if (res.status === 404) {
      throw new Error(local.sync.provider === 'repo'
        ? 'Repositório não encontrado, ou o token não tem acesso a ele (confirma o nome e as permissões do token).'
        : 'Gist não encontrado, ou o token não tem permissão para gists.');
    }
    if (res.status === 409 || res.status === 422) { const e = new Error('Conflito: outro dispositivo gravou ao mesmo tempo.'); e.code = 'conflict'; throw e; }
    if (res.status === 403) throw new Error('O GitHub recusou o pedido (permissões do token ou limite de pedidos).');
    throw new Error('Erro do GitHub: ' + res.status);
  }
  if (res.status === 204) return null;
  return raw ? res.text() : res.json();
}

// ---------- Repositório privado: o ficheiro forja-dados.json, com histórico no git ----------
function b64encode(str) {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
function b64decode(b64) {
  const bin = atob(String(b64).replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
// JSON com chaves ordenadas e uma linha por campo: o histórico do git mostra só o que mudou
function sortKeys(v) {
  if (Array.isArray(v)) return v.map(sortKeys);
  if (v && typeof v === 'object') return Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])]));
  return v;
}
function repoPath() {
  const { repo, path } = local.sync;
  return `/repos/${repo}/contents/${(path || FILE).split('/').map(encodeURIComponent).join('/')}`;
}
async function readRepoFile() {
  const meta = await gh(repoPath(), { allow404: true });
  if (!meta) return { data: null, sha: null };
  let text = meta.content && meta.encoding === 'base64' ? b64decode(meta.content) : null;
  if (text === null || text === '') text = await gh(repoPath(), { raw: true });
  return { data: text ? JSON.parse(text) : null, sha: meta.sha };
}
async function writeRepoFile(data, sha) {
  const when = new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short', timeStyle: 'short' }).format(new Date());
  return gh(repoPath(), {
    method: 'PUT',
    body: {
      message: `Forja: dados (${when}, dispositivo ${local.deviceId.slice(0, 6)})`,
      content: b64encode(JSON.stringify(sortKeys(data), null, 1) + '\n'),
      ...(sha ? { sha } : {}),
    },
  });
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
      const mergeIn = (remote) => {
        const merged = remote ? merge(state, remote) : state;
        if (stable(merged) !== stable(state)) {
          state = merged;
          saveRaw();
          emit('remote');
        }
        snapshotSettings();
        return state;
      };
      if (local.sync.provider === 'repo') {
        for (let attempt = 0; attempt < 3; attempt++) {
          const { data: remote, sha } = await readRepoFile();
          const toWrite = mergeIn(remote);
          if (remote && stable(toWrite) === stable(normalize(remote))) break;
          try {
            await writeRepoFile(toWrite, sha);
            break;
          } catch (e) {
            if (e.code !== 'conflict' || attempt === 2) throw e;
          }
        }
      } else {
        let id = local.sync.gistId || (await findGist());
        if (!id) {
          id = await createGist(state);
          local.sync.gistId = id;
        } else {
          local.sync.gistId = id;
          const remote = await readGist(id);
          const toWrite = mergeIn(remote);
          if (!remote || stable(toWrite) !== stable(normalize(remote))) await writeGist(id, toWrite);
        }
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
}, 15000);

export function scheduleSync() {
  if (local.sync.token) debouncedSync();
}

// provider 'repo': repositório privado (repo = 'dono/nome'); 'gist': gist secreto
export function connectSync(token, { provider = 'gist', repo = '' } = {}) {
  local.sync.token = token.trim();
  local.sync.provider = provider;
  local.sync.repo = repo.trim().replace(/^https?:\/\/github\.com\//, '').replace(/\.git$/, '').replace(/\/$/, '');
  local.sync.path = local.sync.path || FILE;
  local.sync.gistId = '';
  local.sync.lastError = '';
  persistLocal();
  return syncNow();
}

export function disconnectSync() {
  local.sync = { provider: 'gist', token: '', gistId: '', repo: '', path: FILE, lastSync: 0, lastError: '', status: 'off' };
  persistLocal();
  emit('sync-status');
}
