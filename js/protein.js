// Registo da proteína do dia, por refeição: alimentos com porções (− e + de meia em meia, ou escritas à mão),
// alimentos escritos à mão, mudar as porções de um alimento já registado, acerto do total e desfazer.
// Cada alimento fica guardado em habits[dia].foods com a refeição (meal), para o histórico ficar completo.
import * as E from './engine.js';
import { put, list, setSettings } from './store.js';
import { toast, rerender, modal } from './ui.js';
import { esc, fmtNum, parseNum, uid, todayISO, addDays } from './util.js';
import { MEAL_SLOTS } from './data.js';

// Proteína aproximada por porção. g: null usa o valor da whey nas definições.
// meals: refeições em que o alimento entra. Cada refeição só mostra os seus alimentos (e os que já lá registaste);
// o resto escreve-se em "Outro alimento".
const PL = ['pa', 'lanche'], AJ = ['almoco', 'jantar'], LAJ = ['lanche', 'almoco', 'jantar'], ALL = ['pa', 'almoco', 'lanche', 'jantar'];
export const FOODS = [
  { id: 'pao_fiambre', name: 'Pão com fiambre de peru', portion: '1 carcaça com 2 fatias', g: 10, meals: PL },
  { id: 'pao_fiambre_normal', name: 'Pão com fiambre', portion: '1 carcaça com 2 fatias', g: 10, meals: PL },
  { id: 'pao_queijo', name: 'Pão com queijo', portion: '1 carcaça com 2 fatias', g: 15, meals: PL },
  { id: 'whey', name: 'Whey', portion: '1 dose', g: null, meals: PL },
  { id: 'yopro', name: 'YoPro', portion: '1 unidade', g: 25, meals: PL },
  { id: 'bife_peru', name: 'Bife de peru', portion: '1 bife', g: 25, meals: AJ },
  { id: 'salmao', name: 'Salmão', portion: '1 posta média (~150 g cru)', g: 30, meals: AJ },
  { id: 'salmao_peq', name: 'Salmão, posta pequena', portion: '1 posta pequena (~90 g cru)', g: 18, meals: AJ },
  { id: 'carne', name: 'Carne, frango ou peixe', portion: 'palma da mão', g: 35, meals: AJ },
  { id: 'ovo', name: 'Ovo', portion: '1 ovo', g: 6, meals: ['pa', 'almoco', 'jantar'] },
  { id: 'atum', name: 'Atum', portion: '1 lata escorrida', g: 20, meals: LAJ },
  { id: 'cavala', name: 'Cavala', portion: '1 lata', g: 16, meals: LAJ },
  { id: 'fiambre', name: 'Fiambre', portion: '2 fatias', g: 5, meals: PL },
  { id: 'fiambre_peru', name: 'Fiambre de peru', portion: '4 fatias', g: 10, meals: PL },
  { id: 'queijo', name: 'Queijo', portion: '1 fatia', g: 5, meals: PL },
  { id: 'requeijao', name: 'Requeijão', portion: '100 g', g: 10, meals: PL },
  { id: 'skyr', name: 'Skyr', portion: '1 copo', g: 16, meals: PL },
  { id: 'leite', name: 'Leite', portion: '1 copo (250 ml)', g: 8, meals: PL },
  { id: 'aveia', name: 'Aveia instantânea', portion: '45 g', g: 6, meals: PL },
  { id: 'amendoas', name: 'Amêndoas', portion: 'um punhado (30 g)', g: 6, meals: PL },
  { id: 'cajus', name: 'Cajus', portion: 'um punhado (30 g)', g: 5, meals: PL },
  { id: 'manteiga_amendoim', name: 'Manteiga de amendoim', portion: '1 colher (15 g)', g: 4, meals: PL },
  { id: 'pao', name: 'Pão', portion: '1 carcaça', g: 5, meals: ALL },
  { id: 'arroz', name: 'Arroz', portion: '1 prato', g: 4, meals: AJ },
  { id: 'massa', name: 'Massa', portion: '1 prato', g: 7, meals: AJ },
  { id: 'batata', name: 'Batata', portion: '1 prato', g: 3, meals: AJ },
  { id: 'sopa', name: 'Sopa de legumes', portion: '1 prato', g: 3, meals: AJ },
  { id: 'brocolos', name: 'Brócolos', portion: '1 porção', g: 3, meals: AJ },
  { id: 'banana', name: 'Banana', portion: '1 banana', g: 1, meals: ALL },
  { id: 'pera', name: 'Pera', portion: '1 pera', g: 0.5, meals: ALL },
  // Mais alimentos do dia a dia
  { id: 'frango', name: 'Frango', portion: 'palma da mão (~120 g)', g: 30, meals: AJ },
  { id: 'porco', name: 'Carne de porco', portion: 'palma da mão (~120 g)', g: 28, meals: AJ },
  { id: 'vaca', name: 'Carne de vaca', portion: 'palma da mão (~120 g)', g: 28, meals: AJ },
  { id: 'hamburguer', name: 'Hambúrguer', portion: '1 hambúrguer (~100 g)', g: 18, meals: AJ },
  { id: 'peixe', name: 'Peixe branco (pescada, dourada…)', portion: 'palma da mão (~120 g)', g: 22, meals: AJ },
  { id: 'bacalhau', name: 'Bacalhau', portion: '1 posta (~120 g)', g: 25, meals: AJ },
  { id: 'leguminosas', name: 'Feijão, grão ou lentilhas', portion: '1 concha (~150 g cozido)', g: 10, meals: AJ },
  { id: 'salada', name: 'Salada', portion: '1 prato', g: 1, meals: AJ },
  { id: 'iogurte', name: 'Iogurte natural', portion: '1 iogurte (125 g)', g: 5, meals: PL },
  { id: 'iogurte_grego', name: 'Iogurte grego', portion: '1 iogurte (~120 g)', g: 8, meals: PL },
  { id: 'cereais', name: 'Cereais', portion: '1 taça (40 g)', g: 3, meals: PL },
  { id: 'pao_forma', name: 'Pão de forma', portion: '2 fatias', g: 5, meals: PL },
  { id: 'tosta_mista', name: 'Tosta mista', portion: '1 tosta (queijo e fiambre)', g: 15, meals: PL },
  { id: 'nozes', name: 'Nozes', portion: 'um punhado (30 g)', g: 4, meals: PL },
  { id: 'maca', name: 'Maçã', portion: '1 maçã', g: 0.5, meals: ALL },
  { id: 'laranja', name: 'Laranja', portion: '1 laranja', g: 1, meals: ALL },
  { id: 'kiwi', name: 'Kiwi', portion: '1 kiwi', g: 1, meals: ALL },
];

// Compatibilidade com quem importava a lista antiga
export const PROTEIN_REF = FOODS.filter((f) => f.g !== null).map((f) => [`${f.name} (${f.portion})`, f.g]);

// Porções: − e + andam de meia em meia (mínimo ¼); também dá para escrever, por exemplo 0,75 ou 3
const QTY_MIN = 0.25;
const QTY_MAX = 20;
const FRAC = { 0.25: '¼', 0.5: '½', 0.75: '¾' };
const TOP_MEAL = 20;
let mult = 1;
let pickMeal = null; // refeição escolhida no bloco da proteína; null = pela hora do dia

const r1 = (x) => Math.round(x * 10) / 10;
// 0,5 → ½, 1,5 → 1½, 2,25 → 2¼; o resto com vírgula (1,3)
export function multLabel(m) {
  const q = Number(m) || 0;
  const whole = Math.floor(q + 1e-9);
  const frac = Math.round((q - whole) * 100) / 100;
  if (!frac) return String(whole);
  return FRAC[frac] ? `${whole || ''}${FRAC[frac]}` : fmtNum(q);
}
const stepQty = (q, dir) => (dir > 0
  ? (q < 0.5 ? 0.5 : Math.min(QTY_MAX, Math.floor(q * 2 + 1e-9) / 2 + 0.5))
  : (q <= 0.5 ? QTY_MIN : Math.ceil(q * 2 - 1e-9) / 2 - 0.5));
const validQty = (v) => v !== null && v >= QTY_MIN - 1e-9 && v <= QTY_MAX;

// Controlo das porções: − [valor que se pode escrever] +
function qtyControl(q, scope) {
  return `<span class="qty-ctl" data-qty-ctl="${scope}">
    <button type="button" class="chip mult qty-step" data-qty-step="-1" aria-label="Menos meia porção">−</button>
    <input class="input num qty-input" data-qty-input inputmode="decimal" autocomplete="off" value="${fmtNum(q)}" aria-label="Porções">
    <button type="button" class="chip mult qty-step" data-qty-step="1" aria-label="Mais meia porção">+</button>
  </span>`;
}
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

// Catálogo + alimentos escritos à mão (com nome) já usados. Numa refeição, primeiro o que já comeste
// nessa refeição, depois o que costuma entrar nela; a seguir, o mais usado nos últimos 60 dias.
function catalog(meal = null, includeHidden = false) {
  const from = addDays(todayISO(), -60);
  const count = new Map();
  const inMeal = new Map();
  const custom = new Map();
  for (const h of list('habits')) {
    for (const it of h.foods || []) {
      if (h.date >= from) {
        count.set(it.food, (count.get(it.food) || 0) + 1);
        if (meal && normMeal(it.meal) === meal) inMeal.set(it.food, (inMeal.get(it.food) || 0) + 1);
      }
      if (it.food && it.food.startsWith('c:') && it.qty) {
        const prev = custom.get(it.food);
        if (!prev || (it.at || 0) > prev.at) custom.set(it.food, { id: it.food, name: it.name, portion: 'como da última vez', g: r1(it.g / it.qty), at: it.at || 0, meals: it.meal ? [normMeal(it.meal)] : [] });
      }
    }
  }
  const all = [...FOODS, ...[...custom.values()].sort((a, b) => a.name.localeCompare(b.name, 'pt'))];
  const hidden = new Set(E.S().hiddenFoods || []);
  const deleted = new Set(E.S().deletedFoods || []);
  return all
    .filter((f) => !deleted.has(f.id) && (includeHidden || !hidden.has(f.id)))
    .map((f, i) => ({ ...f, uses: count.get(f.id) || 0, mealUses: inMeal.get(f.id) || 0, hint: meal && (f.meals || []).includes(meal) ? 1 : 0, i }))
    .sort((a, b) => b.mealUses - a.mealUses || b.hint - a.hint || b.uses - a.uses || a.i - b.i);
}

function foodChip(f) {
  return `<button type="button" class="chip food-chip" data-food="${esc(f.id)}" title="${esc(f.portion)}">${esc(f.name)} <span class="fg">${fmtNum(foodG(f))} g</span></button>`;
}

// Alimento registado: carregar no nome muda as porções; o × tira-o
export function entryChip(it) {
  return `<span class="eaten-item"><button type="button" class="eaten-edit" data-food-edit="${esc(it.id)}" title="Mudar as porções" aria-label="Mudar as porções de ${esc(it.name)}">${it.qty && it.qty !== 1 ? `${esc(multLabel(it.qty))} × ` : ''}${esc(it.name)} <span class="fg">${fmtNum(it.g)} g</span></button><button type="button" class="eaten-del" data-food-del="${esc(it.id)}" aria-label="Tirar ${esc(it.name)}">×</button></span>`;
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
  // Só os alimentos desta refeição (nada de bacalhau ao pequeno-almoço) e os que já registaste nela
  const foods = catalog(meal || pickMeal || mealAt()).filter((f) => f.hint || f.mealUses > 0);
  // À vista: os primeiros (o que já comeste nesta refeição primeiro); o resto fica em "Mais alimentos"
  const top = foods.slice(0, TOP_MEAL);
  const topIds = new Set(top.map((f) => f.id));
  const rest = foods.filter((f) => !topIds.has(f.id));
  const cur = pickMeal || mealAt();
  return `<div class="food-pick" ${meal ? `data-meal-scope="${meal}"` : ''}>
    ${meal ? '' : `<div class="mult-row" role="group" aria-label="Refeição">
      <span class="muted small">Refeição</span>
      ${MEAL_SLOTS.map((m) => `<button type="button" class="chip mult meal-pick ${m.id === cur ? 'on' : ''}" data-pick-meal="${m.id}" aria-pressed="${m.id === cur}">${esc(m.short)}</button>`).join('')}
    </div>`}
    <div class="mult-row" role="group" aria-label="Porções">
      <span class="muted small">Porções</span>
      ${qtyControl(mult, 'pick')}
      <span class="muted small">depois carrega no alimento</span>
    </div>
    <div class="chips">${top.map(foodChip).join('')}</div>
    ${rest.length ? `<details class="prot-ref"><summary>Mais alimentos</summary><div class="chips">${rest.map(foodChip).join('')}</div></details>` : ''}
    <button type="button" class="link small food-manage" data-food-manage>Gerir alimentos${(E.S().hiddenFoods || []).length ? ` (${(E.S().hiddenFoods || []).length} ${(E.S().hiddenFoods || []).length === 1 ? 'escondido' : 'escondidos'})` : ''}</button>
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
    `${mealName(entry.meal)}: ${qty !== 1 ? `${multLabel(qty)} × ` : ''}${f.name}, +${fmtNum(g)} g. ${dayTxt(iso)}: ${fmtNum(total)} g`,
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
  save(iso, { protein: total, foods: [...(h.foods || []), ...entries] }, `${label}: +${fmtNum(add)} g. ${dayTxt(iso)}: ${fmtNum(total)} g`,
    (cur) => ({ protein: r1(Math.max(0, (cur.protein || 0) - add)), foods: (cur.foods || []).filter((x) => !ids.has(x.id)) }));
}

// Escolher que alimentos aparecem nos botões. Os da app escondem-se; os criados à mão podem ser apagados.
// Em ambos os casos, o que já registaste não muda (tira um registo errado com o × na refeição).
async function manageFoods() {
  const hidden = new Set(E.S().hiddenFoods || []);
  const deleted = new Set(E.S().deletedFoods || []);
  const foods = catalog(null, true).sort((a, b) => a.name.localeCompare(b.name, 'pt'));
  const row = (f) => `<div class="food-manage-row" data-row="${esc(f.id)}">
      <label class="field-check"><input type="checkbox" data-fid="${esc(f.id)}" ${hidden.has(f.id) ? '' : 'checked'}> ${esc(f.name)} <span class="muted small">${fmtNum(foodG(f))} g</span></label>
      ${f.id.startsWith('c:') ? `<button type="button" class="link small danger" data-del-food="${esc(f.id)}">Apagar</button>` : ''}
    </div>`;
  const ok = await modal({
    title: 'Alimentos nos botões',
    body: `<p class="muted small">Tira o visto para esconder. Os alimentos que criaste em "Outro alimento" também podem ser apagados. Vale para todos os dispositivos e o que já registaste não muda.</p>
      <div class="food-manage-list">${foods.map(row).join('')}</div>`,
    actions: [
      { label: 'Cancelar', value: false, kind: 'ghost' },
      { label: 'Guardar', value: true, kind: 'primary', fn: (wrap) => {
        hidden.clear();
        wrap.querySelectorAll('[data-fid]').forEach((c) => { if (!c.checked && !deleted.has(c.dataset.fid)) hidden.add(c.dataset.fid); });
      } },
    ],
    onMount: (wrap) => {
      wrap.addEventListener('click', (e) => {
        const d = e.target.closest('[data-del-food]');
        if (!d) return;
        const id = d.dataset.delFood;
        const r = wrap.querySelector(`[data-row="${CSS.escape(id)}"]`);
        if (deleted.has(id)) {
          deleted.delete(id);
          r.classList.remove('is-deleted');
          d.textContent = 'Apagar';
        } else {
          deleted.add(id);
          r.classList.add('is-deleted');
          d.textContent = 'Anular';
        }
      });
    },
  });
  if (!ok) return;
  setSettings({ hiddenFoods: [...hidden], deletedFoods: [...deleted] });
  rerender();
  const nd = foods.filter((f) => deleted.has(f.id)).length;
  toast(nd ? `${nd} ${nd === 1 ? 'alimento apagado' : 'alimentos apagados'} das opções` : hidden.size ? `${hidden.size} ${hidden.size === 1 ? 'alimento escondido' : 'alimentos escondidos'}` : 'Todos os alimentos visíveis');
}

function deleteEntry(iso, id) {
  const h = E.habitsFor(iso);
  const it = (h.foods || []).find((x) => x.id === id);
  if (!it) return;
  const total = r1(Math.max(0, (h.protein || 0) - (it.g || 0)));
  save(iso, { protein: total, foods: (h.foods || []).filter((x) => x !== it) }, `Tirado: ${it.name}. ${dayTxt(iso)}: ${fmtNum(total)} g`,
    (cur) => ({ protein: r1((cur.protein || 0) + (it.g || 0)), foods: [...(cur.foods || []), it].sort((a, b) => (a.at || 0) - (b.at || 0)) }));
}

// Mudar as porções de um alimento já registado; a proteína acompanha (mesma proteína por porção)
async function editEntry(iso, id) {
  const h = E.habitsFor(iso);
  const it = (h.foods || []).find((x) => x.id === id);
  if (!it) return;
  const q0 = it.qty || 1;
  const per = (it.g || 0) / q0;
  let q = q0;
  const gTxt = (qq) => `${fmtNum(r1(per * qq))} g de proteína`;
  const res = await modal({
    title: it.name,
    body: `<p class="muted small">${esc(mealName(normMeal(it.meal)))}. ${it.portion ? `1 porção: ${esc(it.portion)}, ` : ''}${fmtNum(r1(per))} g de proteína por porção.</p>
      <div class="mult-row qty-edit"><span class="muted small">Porções</span>${qtyControl(q, 'edit')}</div>
      <p class="qty-result num" data-qty-result>${gTxt(q)}</p>`,
    actions: [
      { label: 'Tirar', value: 'del', kind: 'ghost' },
      { label: 'Cancelar', value: null, kind: 'ghost' },
      { label: 'Guardar', value: 'save', kind: 'primary', fn: (wrap) => {
        const v = parseNum(wrap.querySelector('[data-qty-input]').value);
        if (!validQty(v)) { toast('Escreve as porções, por exemplo 1,5 (de 0,25 a 20).'); return false; }
        q = v;
        return true;
      } },
    ],
    autofocus: false,
    onMount: (wrap) => {
      const inp = wrap.querySelector('[data-qty-input]');
      const out = wrap.querySelector('[data-qty-result]');
      wrap.addEventListener('click', (e) => {
        const st = e.target.closest('[data-qty-step]');
        if (!st) return;
        e.preventDefault();
        q = stepQty(q, Number(st.dataset.qtyStep));
        inp.value = fmtNum(q);
        out.textContent = gTxt(q);
      });
      inp.addEventListener('input', () => {
        const v = parseNum(inp.value);
        if (validQty(v)) { q = v; out.textContent = gTxt(q); }
      });
    },
  });
  if (res === 'del') { deleteEntry(iso, id); return; }
  if (res !== 'save' || q === q0) return;
  const cur = E.habitsFor(iso);
  const entry = (cur.foods || []).find((x) => x.id === id);
  if (!entry) return;
  const g = r1(per * q);
  const diff = r1(g - (entry.g || 0));
  const total = r1(Math.max(0, (cur.protein || 0) + diff));
  const updated = { ...entry, qty: q, g };
  save(iso, { protein: total, foods: cur.foods.map((x) => (x.id === id ? updated : x)) },
    `${entry.name}: ${multLabel(q)} ${q === 1 ? 'porção' : 'porções'}, ${fmtNum(g)} g. ${dayTxt(iso)}: ${fmtNum(total)} g`,
    (c) => ({ protein: r1(Math.max(0, (c.protein || 0) - diff)), foods: (c.foods || []).map((x) => (x.id === id ? entry : x)) }));
}

function setRow(root, attr, value) {
  root.querySelectorAll(`[${attr}]`).forEach((b) => {
    const on = b.getAttribute(attr) === String(value);
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  });
}

// Mostra as porções escolhidas em todos os seletores (há um por refeição)
function syncQty(root) {
  root.querySelectorAll('[data-qty-ctl="pick"] [data-qty-input]').forEach((i) => {
    if (i !== document.activeElement || parseNum(i.value) !== mult) i.value = fmtNum(mult);
  });
}

// Dia do registo: o do painel onde se carregou (data-log-date), senão o dia indicado
const dayOfEl = (el, iso) => (el && el.closest('[data-log-date]') ? el.closest('[data-log-date]').dataset.logDate : iso);
const dayTxt = (iso) => (iso === todayISO() ? 'Hoje' : iso === addDays(todayISO(), -1) ? 'Ontem' : iso.slice(8, 10) + '/' + iso.slice(5, 7));

export function bindProtein(root, isoDefault) {
  root.addEventListener('click', (e) => {
    const iso = dayOfEl(e.target, isoDefault);
    const st = e.target.closest('[data-qty-ctl="pick"] [data-qty-step]');
    if (st) {
      e.preventDefault();
      mult = stepQty(mult, Number(st.dataset.qtyStep));
      syncQty(root);
      return;
    }
    const ed = e.target.closest('[data-food-edit]');
    if (ed) {
      e.preventDefault();
      editEntry(iso, ed.dataset.foodEdit);
      return;
    }
    if (e.target.closest('[data-food-manage]')) { e.preventDefault(); manageFoods(); return; }
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
      deleteEntry(iso, del.dataset.foodDel);
      return;
    }
    const b = e.target.closest('[data-prot]');
    if (b) {
      e.preventDefault();
      const h = E.habitsFor(iso);
      const total = r1((h.protein || 0) + Number(b.dataset.prot));
      save(iso, { protein: total }, `Proteína (${dayTxt(iso).toLowerCase()}): ${fmtNum(total)} g`);
    }
  });
  // Porções escritas à mão no seletor
  root.addEventListener('input', (e) => {
    const inp = e.target.closest('[data-qty-ctl="pick"] [data-qty-input]');
    if (!inp) return;
    const v = parseNum(inp.value);
    if (validQty(v)) mult = v;
  });
  root.addEventListener('change', (e) => {
    if (e.target.closest('[data-qty-ctl="pick"] [data-qty-input]')) syncQty(root);
  });
  root.addEventListener('submit', (e) => {
    const iso = dayOfEl(e.target, isoDefault);
    const fa = e.target.closest('[data-form="food-add"]');
    if (fa) {
      e.preventDefault();
      const g = parseNum(fa.g.value);
      const name = fa.what.value.trim();
      if (!name) { toast('Escreve o nome do alimento.'); fa.what.focus(); return; }
      if (g === null || g < 0 || g > 300) { toast('Escreve os gramas de proteína (0 se não tiver), por exemplo 10.'); fa.g.focus(); return; }
      const scope = fa.closest('[data-meal-scope]');
      const food = { id: `c:${name.toLowerCase().replace(/\s+/g, ' ')}`, name, portion: null };
      // Voltar a criar um alimento apagado ou escondido torna-o a mostrar
      const S = E.S();
      if ((S.deletedFoods || []).includes(food.id) || (S.hiddenFoods || []).includes(food.id)) {
        setSettings({ deletedFoods: (S.deletedFoods || []).filter((x) => x !== food.id), hiddenFoods: (S.hiddenFoods || []).filter((x) => x !== food.id) });
      }
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
    save(iso, { protein: total }, `Proteína (${dayTxt(iso).toLowerCase()}): ${fmtNum(total)} g`);
  });
}
