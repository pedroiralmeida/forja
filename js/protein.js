// Registo da proteína do dia: alimentos com porção (½, 1, 1½, 2), valor personalizado
// (somar, tirar, definir total), lista do que se comeu no dia e desfazer.
// Cada alimento tocado fica guardado em habits[dia].foods, para o histórico ficar completo.
import * as E from './engine.js';
import { put, list } from './store.js';
import { toast, rerender } from './ui.js';
import { esc, fmtNum, parseNum, uid, todayISO, addDays } from './util.js';

// Proteína aproximada por porção. g: null usa o valor da whey nas definições.
export const FOODS = [
  { id: 'whey', name: 'Whey', portion: '1 dose', g: null },
  { id: 'yopro', name: 'YoPro', portion: '1 unidade', g: 25 },
  { id: 'bife_peru', name: 'Bife de peru', portion: '1 bife', g: 25 },
  { id: 'salmao', name: 'Salmão', portion: '1 posta média (~150 g cru)', g: 30 },
  { id: 'salmao_peq', name: 'Salmão, posta pequena', portion: '1 posta pequena (~90 g cru)', g: 18 },
  { id: 'carne', name: 'Carne, frango ou peixe', portion: 'palma da mão', g: 35 },
  { id: 'ovo', name: 'Ovo', portion: '1 ovo', g: 6 },
  { id: 'atum', name: 'Atum', portion: '1 lata escorrida', g: 20 },
  { id: 'cavala', name: 'Cavala', portion: '1 lata', g: 16 },
  { id: 'fiambre_peru', name: 'Fiambre de peru', portion: '4 fatias', g: 10 },
  { id: 'queijo', name: 'Queijo', portion: '1 fatia', g: 5 },
  { id: 'requeijao', name: 'Requeijão', portion: '100 g', g: 10 },
  { id: 'skyr', name: 'Skyr', portion: '1 copo', g: 16 },
  { id: 'leite', name: 'Leite', portion: '1 copo (250 ml)', g: 8 },
  { id: 'amendoas', name: 'Amêndoas', portion: 'um punhado (30 g)', g: 6 },
  { id: 'pao', name: 'Pão', portion: '1 carcaça', g: 5 },
  { id: 'planta', name: 'Planta (para barrar)', portion: 'no pão', g: 0 },
  { id: 'arroz', name: 'Arroz', portion: '1 prato', g: 4 },
  { id: 'massa', name: 'Massa', portion: '1 prato', g: 7 },
  { id: 'batata', name: 'Batata', portion: '1 prato', g: 3 },
  { id: 'sopa', name: 'Sopa de legumes', portion: '1 prato', g: 3 },
  { id: 'brocolos', name: 'Brócolos', portion: '1 porção', g: 3 },
  { id: 'banana', name: 'Banana', portion: '1 banana', g: 1 },
  { id: 'pera', name: 'Pera', portion: '1 pera', g: 0.5 },
];

// Compatibilidade com quem importava a lista antiga
export const PROTEIN_REF = FOODS.filter((f) => f.g !== null).map((f) => [`${f.name} (${f.portion})`, f.g]);

const MULTS = [[0.5, '½'], [1, '1'], [1.5, '1½'], [2, '2']];
const TOP = 10;
let mult = 1;

const r1 = (x) => Math.round(x * 10) / 10;
const multLabel = (m) => (MULTS.find(([v]) => v === m) || [m, fmtNum(m)])[1];

function foodG(f) {
  return f.g === null ? (E.S().wheyProtein || 21) : f.g;
}

// Catálogo + alimentos escritos à mão (com nome) já usados, ordenados pelo uso nos últimos 60 dias
function catalog() {
  const from = addDays(todayISO(), -60);
  const count = new Map();
  const custom = new Map();
  for (const h of list('habits')) {
    for (const it of h.foods || []) {
      if (h.date >= from) count.set(it.food, (count.get(it.food) || 0) + 1);
      if (it.food && it.food.startsWith('c:') && it.qty) {
        const prev = custom.get(it.food);
        if (!prev || (it.at || 0) > prev.at) custom.set(it.food, { id: it.food, name: it.name, portion: 'como da última vez', g: r1(it.g / it.qty), at: it.at || 0 });
      }
    }
  }
  const all = [...FOODS, ...[...custom.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt'))];
  return all
    .map((f, i) => ({ ...f, uses: count.get(f.id) || 0, i }))
    .sort((a, b) => b.uses - a.uses || a.i - b.i);
}

function foodChip(f) {
  return `<button type="button" class="chip food-chip" data-food="${esc(f.id)}" title="${esc(f.portion)}">${esc(f.name)} <span class="fg">${fmtNum(foodG(f))} g</span></button>`;
}

function eatenList(h) {
  const items = h.foods || [];
  if (!items.length) return '';
  const sum = r1(items.reduce((s, it) => s + (it.g || 0), 0));
  return `<div class="eaten">
    <div class="eaten-head muted small">Alimentos registados hoje: ${fmtNum(sum)} g${sum !== r1(h.protein || 0) ? `; o resto (${fmtNum(r1((h.protein || 0) - sum))} g) foi somado sem alimento` : ''}</div>
    <div class="chips">${items.map((it) => `<span class="eaten-item">${it.qty && it.qty !== 1 ? `${esc(multLabel(it.qty))} × ` : ''}${esc(it.name)} <span class="fg">${fmtNum(it.g)} g</span><button type="button" class="eaten-del" data-food-del="${esc(it.id)}" aria-label="Tirar ${esc(it.name)}">×</button></span>`).join('')}</div>
  </div>`;
}

export function proteinBlock(h, target) {
  const pct = Math.min(100, ((h.protein || 0) / target) * 100);
  const foods = catalog();
  const top = foods.slice(0, TOP);
  const rest = foods.slice(TOP);
  return `
    <div class="protein-line"><span class="num big2">${fmtNum(h.protein || 0)}</span><span class="muted"> de ${target} g</span></div>
    <div class="meter thin"><span style="width:${Math.max(1, pct)}%"></span></div>
    <div class="food-pick">
      <div class="mult-row" role="group" aria-label="Quantidade">
        <span class="muted small">Quantidade</span>
        ${MULTS.map(([v, l]) => `<button type="button" class="chip mult ${v === mult ? 'on' : ''}" data-mult="${v}" aria-pressed="${v === mult}">${l}</button>`).join('')}
      </div>
      <div class="chips">${top.map(foodChip).join('')}</div>
      ${rest.length ? `<details class="prot-ref"><summary>Mais alimentos</summary><div class="chips">${rest.map(foodChip).join('')}</div></details>` : ''}
    </div>
    ${eatenList(h)}
    <form class="prot-form" data-form="prot">
      <input name="what" autocomplete="off" class="input prot-what" placeholder="Outro alimento (opcional)" aria-label="Nome do alimento">
      <span class="with-unit"><input name="g" inputmode="decimal" autocomplete="off" class="input num" placeholder="30" aria-label="Gramas de proteína"><i>g</i></span>
      <button class="btn secondary small" name="op" value="add">Somar</button>
      <button class="btn ghost small" name="op" value="sub">Tirar</button>
      <button class="btn ghost small" name="op" value="set">Definir total</button>
    </form>`;
}

// Um só aviso de proteína de cada vez; o "Desfazer" desfaz exatamente a última ação
let closeLast = null;
function save(iso, patch, msg, undo) {
  const before = E.habitsFor(iso);
  put('habits', iso, { ...before, ...patch });
  rerender();
  if (closeLast) closeLast();
  closeLast = toast(msg, {
    timeout: 5000,
    action: {
      label: 'Desfazer',
      fn: () => {
        const h = E.habitsFor(iso);
        put('habits', iso, { ...h, ...(undo ? undo(h) : { protein: before.protein || 0 }) });
        rerender();
      },
    },
  });
}

function addFood(iso, f, qty, gOverride) {
  const h = E.habitsFor(iso);
  const g = r1(gOverride ?? foodG(f) * qty);
  const entry = { id: uid(), food: f.id, name: f.name, portion: f.portion || null, qty, g, at: Date.now() };
  const total = r1(Math.max(0, (h.protein || 0) + g));
  save(iso, { protein: total, foods: [...(h.foods || []), entry] },
    `${qty !== 1 ? `${multLabel(qty)} × ` : ''}${f.name}: +${fmtNum(g)} g. Hoje: ${fmtNum(total)} g`,
    (cur) => ({ protein: r1(Math.max(0, (cur.protein || 0) - g)), foods: (cur.foods || []).filter((x) => x.id !== entry.id) }));
}

export function bindProtein(root, iso) {
  root.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mult]');
    if (m) {
      e.preventDefault();
      mult = Number(m.dataset.mult);
      root.querySelectorAll('[data-mult]').forEach((b) => {
        const on = Number(b.dataset.mult) === mult;
        b.classList.toggle('on', on);
        b.setAttribute('aria-pressed', String(on));
      });
      return;
    }
    const fb = e.target.closest('[data-food]');
    if (fb) {
      e.preventDefault();
      const f = catalog().find((x) => x.id === fb.dataset.food);
      if (!f) return;
      const qty = mult;
      mult = 1;
      addFood(iso, f, qty);
      return;
    }
    const del = e.target.closest('[data-food-del]');
    if (del) {
      e.preventDefault();
      const h = E.habitsFor(iso);
      const it = (h.foods || []).find((x) => x.id === del.dataset.foodDel);
      if (!it) return;
      const total = r1(Math.max(0, (h.protein || 0) - (it.g || 0)));
      save(iso, { protein: total, foods: (h.foods || []).filter((x) => x !== it) }, `Tirado: ${it.name}. Hoje: ${fmtNum(total)} g`,
        (cur) => ({ protein: r1((cur.protein || 0) + (it.g || 0)), foods: [...(cur.foods || []), it].sort((a, b) => (a.at || 0) - (b.at || 0)) }));
      return;
    }
    const b = e.target.closest('[data-prot]');
    if (b) {
      e.preventDefault();
      const h = E.habitsFor(iso);
      const total = r1((h.protein || 0) + Number(b.dataset.prot));
      save(iso, { protein: total }, `Proteína de hoje: ${fmtNum(total)} g`);
    }
  });
  root.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form="prot"]');
    if (!f) return;
    e.preventDefault();
    const g = parseNum(f.g.value);
    if (g === null || g < 0 || g > 500) { toast('Escreve os gramas de proteína, por exemplo 30.'); return; }
    const op = (e.submitter && e.submitter.value) || 'add';
    const h = E.habitsFor(iso);
    const cur = h.protein || 0;
    if (op === 'add') {
      const name = f.what.value.trim();
      const food = name
        ? { id: `c:${name.toLowerCase().replace(/\s+/g, ' ')}`, name, portion: null }
        : { id: 'outro', name: 'Outro', portion: null };
      addFood(iso, food, 1, g);
      return;
    }
    const total = r1(Math.max(0, op === 'set' ? g : cur - g));
    save(iso, { protein: total }, `Proteína de hoje: ${fmtNum(total)} g`);
  });
}
