// Registo da proteína do dia, por refeição: alimentos com porção (½, 1, 1½, 2), alimentos escritos à mão,
// acerto do total (somar, tirar, definir) e desfazer.
// Cada alimento fica guardado em habits[dia].foods com a refeição (meal), para o histórico ficar completo.
import * as E from './engine.js';
import { put, list } from './store.js';
import { toast, rerender } from './ui.js';
import { esc, fmtNum, parseNum, uid, todayISO, addDays } from './util.js';
import { MEAL_SLOTS } from './data.js';

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
  { id: 'aveia', name: 'Aveia instantânea', portion: '45 g', g: 6 },
  { id: 'manteiga_amendoim', name: 'Manteiga de amendoim', portion: '1 colher (15 g)', g: 4 },
  { id: 'pao', name: 'Pão', portion: '1 carcaça', g: 5 },
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
let pickMeal = null; // refeição escolhida no bloco da proteína; null = pela hora do dia

const r1 = (x) => Math.round(x * 10) / 10;
const multLabel = (m) => (MULTS.find(([v]) => v === m) || [m, fmtNum(m)])[1];
export const mealName = (id) => (MEAL_SLOTS.find((m) => m.id === id) || { name: 'Sem refeição' }).name;

// Refeição pela hora: até às 11h pequeno-almoço, até 15h30 almoço, até 19h30 lanche, depois jantar.
// Não há ceia: o que se come à noite conta no jantar.
export function mealAt(d = new Date()) {
  const m = d.getHours() * 60 + d.getMinutes();
  if (m < 4 * 60) return 'jantar';
  if (m < 11 * 60) return 'pa';
  if (m < 15 * 60 + 30) return 'almoco';
  if (m < 19 * 60 + 30) return 'lanche';
  return 'jantar';
}

// Registos antigos marcados como ceia passam a contar no jantar
export const normMeal = (m) => (m === 'ceia' ? 'jantar' : m);

export function foodG(f) {
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

export function entryChip(it) {
  return `<span class="eaten-item">${it.qty && it.qty !== 1 ? `${esc(multLabel(it.qty))} × ` : ''}${esc(it.name)} <span class="fg">${fmtNum(it.g)} g</span><button type="button" class="eaten-del" data-food-del="${esc(it.id)}" aria-label="Tirar ${esc(it.name)}">×</button></span>`;
}

export function mealTotals(h) {
  const out = {};
  for (const it of h.foods || []) {
    const k = normMeal(it.meal) || 'none';
    out[k] = r1((out[k] || 0) + (it.g || 0));
  }
  return out;
}

// Escolha de alimentos. meal fixa (painel das refeições) ou escolhida aqui (bloco da proteína).
export function foodPicker(meal = null) {
  const foods = catalog();
  const top = foods.slice(0, TOP);
  const rest = foods.slice(TOP);
  const cur = pickMeal || mealAt();
  return `<div class="food-pick" ${meal ? `data-meal-scope="${meal}"` : ''}>
    ${meal ? '' : `<div class="mult-row" role="group" aria-label="Refeição">
      <span class="muted small">Refeição</span>
      ${MEAL_SLOTS.map((m) => `<button type="button" class="chip mult meal-pick ${m.id === cur ? 'on' : ''}" data-pick-meal="${m.id}" aria-pressed="${m.id === cur}">${esc(m.short)}</button>`).join('')}
    </div>`}
    <div class="mult-row" role="group" aria-label="Quantidade">
      <span class="muted small">Quantidade</span>
      ${MULTS.map(([v, l]) => `<button type="button" class="chip mult ${v === mult ? 'on' : ''}" data-mult="${v}" aria-pressed="${v === mult}">${l}</button>`).join('')}
    </div>
    <div class="chips">${top.map(foodChip).join('')}</div>
    ${rest.length ? `<details class="prot-ref"><summary>Mais alimentos</summary><div class="chips">${rest.map(foodChip).join('')}</div></details>` : ''}
    <form class="prot-form" data-form="food-add">
      <input name="what" autocomplete="off" class="input prot-what" placeholder="Outro alimento" aria-label="Nome do alimento">
      <span class="with-unit"><input name="g" inputmode="decimal" autocomplete="off" class="input num" placeholder="10" aria-label="Gramas de proteína"><i>g</i></span>
      <button class="btn secondary small">Juntar</button>
    </form>
  </div>`;
}

// Lista do dia agrupada por refeição
function eatenByMeal(h) {
  const items = h.foods || [];
  if (!items.length) return '';
  const groups = [...MEAL_SLOTS.map((m) => m.id), 'none'];
  return `<div class="eaten">${groups.map((g) => {
    const its = items.filter((it) => (normMeal(it.meal) || 'none') === g);
    if (!its.length) return '';
    const sum = r1(its.reduce((a, it) => a + (it.g || 0), 0));
    return `<div class="eaten-group"><div class="eaten-head muted small">${esc(mealName(g))}: ${fmtNum(sum)} g</div><div class="chips">${its.map(entryChip).join('')}</div></div>`;
  }).join('')}</div>`;
}

function adjustForm() {
  return `<details class="prot-adjust"><summary>Acertar o total</summary>
    <form class="prot-form" data-form="prot">
      <span class="with-unit"><input name="g" inputmode="decimal" autocomplete="off" class="input num" placeholder="30" aria-label="Gramas de proteína"><i>g</i></span>
      <button class="btn secondary small" name="op" value="add">Somar</button>
      <button class="btn ghost small" name="op" value="sub">Tirar</button>
      <button class="btn ghost small" name="op" value="set">Definir total</button>
    </form>
  </details>`;
}

// compact: só o total e o resumo por refeição (o registo faz-se no painel das refeições)
export function proteinBlock(h, target, { compact = false } = {}) {
  const pct = Math.min(100, ((h.protein || 0) / target) * 100);
  const tot = mealTotals(h);
  const parts = MEAL_SLOTS.filter((m) => tot[m.id]).map((m) => `${m.name.toLowerCase()} ${fmtNum(tot[m.id])} g`);
  const listed = r1(Object.values(tot).reduce((a, x) => a + x, 0));
  const other = r1((h.protein || 0) - listed);
  if (other > 0.05 && (h.foods || []).length) parts.push(`sem alimento ${fmtNum(other)} g`);
  const summary = parts.length ? `<p class="muted small prot-sum">${esc(parts.join(', ').replace(/^./, (c) => c.toUpperCase()))}.</p>` : '';
  return `
    <div class="protein-line"><span class="num big2">${fmtNum(h.protein || 0)}</span><span class="muted"> de ${target} g</span></div>
    <div class="meter thin"><span style="width:${Math.max(1, pct)}%"></span></div>
    ${summary}
    ${compact ? '<button type="button" class="link small" data-goto-meals>Registar o que comeste, por refeição</button>' : `${foodPicker()}${eatenByMeal(h)}`}
    ${adjustForm()}`;
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

function addFood(iso, f, qty, gOverride, meal) {
  const h = E.habitsFor(iso);
  const g = r1(gOverride ?? foodG(f) * qty);
  const entry = { id: uid(), food: f.id, name: f.name, portion: f.portion || null, qty, g, at: Date.now(), meal: meal || mealAt() };
  const total = r1(Math.max(0, (h.protein || 0) + g));
  save(iso, { protein: total, foods: [...(h.foods || []), entry] },
    `${mealName(entry.meal)}: ${qty !== 1 ? `${multLabel(qty)} × ` : ''}${f.name}, +${fmtNum(g)} g. Hoje: ${fmtNum(total)} g`,
    (cur) => ({ protein: r1(Math.max(0, (cur.protein || 0) - g)), foods: (cur.foods || []).filter((x) => x.id !== entry.id) }));
}

// Regista vários alimentos de uma vez (por exemplo, a sugestão de uma refeição), com um só "Desfazer"
export function addFoods(iso, items, meta = {}, label = 'Refeição') {
  const h = E.habitsFor(iso);
  const at = Date.now();
  const entries = items.map(([fid, qty]) => {
    const f = FOODS.find((x) => x.id === fid);
    return f ? { id: uid(), food: f.id, name: f.name, portion: f.portion || null, qty, g: r1(foodG(f) * qty), at, ...meta } : null;
  }).filter(Boolean);
  if (!entries.length) return;
  const add = r1(entries.reduce((a, e) => a + e.g, 0));
  const total = r1((h.protein || 0) + add);
  const ids = new Set(entries.map((e) => e.id));
  save(iso, { protein: total, foods: [...(h.foods || []), ...entries] }, `${label}: +${fmtNum(add)} g. Hoje: ${fmtNum(total)} g`,
    (cur) => ({ protein: r1(Math.max(0, (cur.protein || 0) - add)), foods: (cur.foods || []).filter((x) => !ids.has(x.id)) }));
}

function setRow(root, attr, value) {
  root.querySelectorAll(`[${attr}]`).forEach((b) => {
    const on = b.getAttribute(attr) === String(value);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

export function bindProtein(root, iso) {
  root.addEventListener('click', (e) => {
    const m = e.target.closest('[data-mult]');
    if (m) {
      e.preventDefault();
      mult = Number(m.dataset.mult);
      setRow(root, 'data-mult', m.dataset.mult);
      return;
    }
    const pm = e.target.closest('[data-pick-meal]');
    if (pm) {
      e.preventDefault();
      pickMeal = pm.dataset.pickMeal;
      setRow(root, 'data-pick-meal', pickMeal);
      return;
    }
    const fb = e.target.closest('[data-food]');
    if (fb) {
      e.preventDefault();
      const f = catalog().find((x) => x.id === fb.dataset.food);
      if (!f) return;
      const scope = fb.closest('[data-meal-scope]');
      const qty = mult;
      mult = 1;
      addFood(iso, f, qty, undefined, scope ? scope.dataset.mealScope : pickMeal || mealAt());
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
    const fa = e.target.closest('[data-form="food-add"]');
    if (fa) {
      e.preventDefault();
      const g = parseNum(fa.g.value);
      const name = fa.what.value.trim();
      if (!name) { toast('Escreve o nome do alimento.'); fa.what.focus(); return; }
      if (g === null || g < 0 || g > 300) { toast('Escreve os gramas de proteína (0 se não tiver), por exemplo 10.'); fa.g.focus(); return; }
      const scope = fa.closest('[data-meal-scope]');
      const food = { id: `c:${name.toLowerCase().replace(/\s+/g, ' ')}`, name, portion: null };
      addFood(iso, food, 1, g, scope ? scope.dataset.mealScope : pickMeal || mealAt());
      return;
    }
    const f = e.target.closest('[data-form="prot"]');
    if (!f) return;
    e.preventDefault();
    const g = parseNum(f.g.value);
    if (g === null || g < 0 || g > 500) { toast('Escreve os gramas de proteína, por exemplo 30.'); return; }
    const op = (e.submitter && e.submitter.value) || 'add';
    const cur = E.habitsFor(iso).protein || 0;
    const total = r1(Math.max(0, op === 'set' ? g : op === 'sub' ? cur - g : cur + g));
    save(iso, { protein: total }, `Proteína de hoje: ${fmtNum(total)} g`);
  });
}
