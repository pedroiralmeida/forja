// Guia de refeições: uma sugestão para cada refeição do dia, com o que há em casa,
// ajustada ao tipo de dia (treino ao fim do dia ou descanso). "Comi isto" regista a proteína.
import * as E from './engine.js';
import { put, get, list } from './store.js';
import { rerender } from './ui.js';
import { WEEKDAYS } from './data.js';
import { FOODS, foodG, addFoods } from './protein.js';
import { esc, fmtNum, fmtDate, todayISO, addDays, isoToMs } from './util.js';

const MEALS = [
  { id: 'pa', name: 'Pequeno-almoço' },
  { id: 'almoco', name: 'Almoço' },
  { id: 'lanche', name: 'Lanche' },
  { id: 'jantar', name: 'Jantar' },
];

// needs: o que tem de haver em casa. whey/oats/pb vêm do stock; yopro/atum/cavala das compras
// menos o que já registaste como comido.
const OPTIONS = {
  pa: [
    { id: 'pa-papa', text: 'Papa de aveia no shaker: 300 ml de leite, 45 g de aveia e 1 medida de whey. Uma banana à parte.', items: [['leite', 1.2], ['aveia', 1], ['whey', 1], ['banana', 1]], needs: ['oats', 'whey'] },
    { id: 'pa-shake', text: 'Leite com whey no shaker (300 ml de leite e 1 medida) e pão com queijo.', items: [['leite', 1.2], ['whey', 1], ['pao', 1], ['queijo', 1]], needs: ['whey'] },
    { id: 'pa-ovos', text: '2 ovos mexidos, pão e um copo de leite.', items: [['ovo', 2], ['pao', 1], ['leite', 1]] },
    { id: 'pa-sandes', text: 'Pão com queijo e fiambre de peru, um copo de leite e uma banana.', items: [['pao', 1], ['queijo', 1], ['fiambre_peru', 0.5], ['leite', 1], ['banana', 1]] },
  ],
  almoco: [
    { id: 'al-casa', text: 'O que houver em casa: 1 a 2 palmas da mão de carne ou peixe (por exemplo, 2 bifes de peru), um prato de arroz, massa ou batata, legumes e uma peça de fruta.', items: [['carne', 1], ['arroz', 1], ['brocolos', 1], ['pera', 1]], tip: 'Se houver pouca carne ou peixe, junta 2 ovos ou uma lata de atum. Se ficares com sono a seguir, come um pouco menos de arroz agora e reforça o lanche.' },
  ],
  lanche: [
    { id: 'la-atum', text: 'Pão com uma lata de atum e uma banana.', items: [['pao', 1], ['atum', 1], ['banana', 1]], needs: ['atum'] },
    { id: 'la-yopro', text: 'Um YoPro e uma banana.', items: [['yopro', 1], ['banana', 1]], needs: ['yopro'] },
    { id: 'la-cavala', text: 'Pão com uma lata de cavala e uma pera.', items: [['pao', 1], ['cavala', 1], ['pera', 1]], needs: ['cavala'] },
    { id: 'la-sandes', text: 'Sandes de queijo e fiambre de peru e um punhado de amêndoas.', items: [['pao', 1], ['queijo', 1], ['fiambre_peru', 0.5], ['amendoas', 1]] },
    { id: 'la-pb', text: 'Pão com manteiga de amendoim, um copo de leite e uma banana.', items: [['pao', 1], ['manteiga_amendoim', 1], ['leite', 1], ['banana', 1]], needs: ['pb'] },
  ],
  jantar: [
    { id: 'ja-casa', text: 'O que houver em casa: 1 a 2 palmas da mão de carne ou peixe, sopa, legumes e um pouco de pão, arroz ou batata.', items: [['carne', 1], ['sopa', 1], ['pao', 0.5]] },
  ],
};

// Só aparece se o plano do dia ficar abaixo da meta de proteína
const CEIA = [
  { id: 'ce-shake', text: 'Leite com whey no shaker.', items: [['leite', 1.2], ['whey', 1]], needs: ['whey'] },
  { id: 'ce-yopro', text: 'Um YoPro.', items: [['yopro', 1]], needs: ['yopro'] },
  { id: 'ce-leite', text: 'Um copo de leite e um punhado de amêndoas.', items: [['leite', 1], ['amendoas', 1]] },
];

const COUNTED = [['yopro', /yopro/i, 'YoPro'], ['atum', /atum/i, 'latas de atum'], ['cavala', /cavala/i, 'latas de cavala']];

let offset = null; // 0 = hoje, 1 = amanhã (por omissão, amanhã a partir das 20h)

// Unidades em casa: compradas (registos de compras) menos as registadas como comidas desde a 1.ª compra
export function pantryCounts(iso = todayISO()) {
  const out = {};
  for (const [food, re] of COUNTED) {
    let bought = 0;
    let since = null;
    for (const p of E.purchases()) {
      for (const it of p.items || []) {
        if (!re.test(it.name || '')) continue;
        bought += Number(it.qty) || 1;
        if (!since || p.date < since) since = p.date;
      }
    }
    if (!since) { out[food] = null; continue; }
    let eaten = 0;
    for (const h of list('habits')) {
      if (h.date < since || h.date > iso) continue;
      for (const f of h.foods || []) if (f.food === food) eaten += f.qty || 1;
    }
    out[food] = Math.max(0, bought - eaten);
  }
  return out;
}

function hasKind(kind, iso) {
  return E.stockItems().some((it) => it.kind === kind && (it.status === 'uso' || it.status === 'fechado') && E.stockLeft(it, iso) > 0);
}

function available(opt, ctx) {
  return (opt.needs || []).every((n) => (['whey', 'oats', 'pb'].includes(n) ? ctx.kinds[n] : (ctx.pantry[n] || 0) > 0));
}

function optionG(opt) {
  return Math.round(opt.items.reduce((a, [fid, q]) => {
    const f = FOODS.find((x) => x.id === fid);
    return a + (f ? foodG(f) * q : 0);
  }, 0));
}

function dayInfo(iso) {
  const plan = E.planFor(iso);
  const train = plan === 'supera' || plan === 'estadio';
  const wd = WEEKDAYS[new Date(isoToMs(iso)).getDay()];
  const what = plan === 'supera' ? 'dia de Supera, treino a partir das 19h'
    : plan === 'estadio' ? 'dia de Estádio, treino a partir das 19h'
    : plan === 'livre' ? 'dia de reposição (treinas se faltaste a algum treino)'
    : plan === 'corrida' ? 'dia de corrida: come mais hidratos (arroz, massa, pão)'
    : 'dia de descanso';
  return {
    plan, train, label: `${wd}, ${fmtDate(iso)}: ${what}.`,
    times: { pa: 'de manhã', almoco: 'por volta das 13h', lanche: train ? 'por volta das 17h, 2 h antes do treino' : 'a meio da tarde', jantar: train ? 'depois do treino' : 'por volta das 20h', ceia: 'antes de dormir' },
  };
}

// Plano do dia: opção guardada ou, por omissão, uma que roda de dia para dia
function planFor(iso) {
  const ctx = { kinds: { whey: hasKind('whey', iso), oats: hasKind('oats', iso), pb: hasKind('pb', iso) }, pantry: pantryCounts(todayISO()) };
  const saved = (get('mealPlans', iso) || {}).choices || {};
  const dayN = Math.floor(isoToMs(iso) / 86400000);
  const meals = MEALS.map((m, mi) => {
    const opts = OPTIONS[m.id].filter((o) => available(o, ctx));
    const list_ = opts.length ? opts : OPTIONS[m.id].filter((o) => !o.needs);
    const opt = list_.find((o) => o.id === saved[m.id]) || list_[(dayN + mi) % list_.length];
    return { ...m, opt, count: list_.length };
  });
  const wheyUsed = meals.some((m) => m.opt.items.some(([f]) => f === 'whey'));
  const planned = meals.reduce((a, m) => a + optionG(m.opt), 0);
  const target = E.proteinTarget();
  let ceia = null;
  if (planned < target) {
    const opts = CEIA.filter((o) => available(o, ctx) && !(wheyUsed && o.items.some(([f]) => f === 'whey')));
    const opt = opts.find((o) => o.id === saved.ceia) || opts[0];
    if (opt) ceia = { id: 'ceia', name: 'Ceia', opt, count: opts.length, optional: true };
  }
  return { meals: ceia ? [...meals, ceia] : meals, planned, target, ctx };
}

function nextOption(iso, mealId) {
  const p = planFor(iso);
  const m = p.meals.find((x) => x.id === mealId);
  if (!m) return;
  const pool = mealId === 'ceia'
    ? CEIA.filter((o) => available(o, p.ctx))
    : OPTIONS[mealId].filter((o) => available(o, p.ctx));
  if (pool.length < 2) return;
  const i = pool.findIndex((o) => o.id === m.opt.id);
  const next = pool[(i + 1) % pool.length];
  const cur = get('mealPlans', iso) || { date: iso, choices: {} };
  put('mealPlans', iso, { ...cur, date: iso, choices: { ...(cur.choices || {}), [mealId]: next.id } });
}

export function mealsPanel() {
  const today = todayISO();
  const off = offset ?? (new Date().getHours() >= 20 ? 1 : 0);
  const iso = addDays(today, off);
  const info = dayInfo(iso);
  const p = planFor(iso);
  const eaten = off === 0 ? new Set((E.habitsFor(today).foods || []).map((f) => f.meal).filter(Boolean)) : new Set();
  const pc = p.ctx.pantry;
  const pantryLine = COUNTED.filter(([f]) => pc[f] !== null && pc[f] !== undefined).map(([f, , label]) => `${pc[f]} ${label}`).join(', ');
  const total = p.meals.reduce((a, m) => a + optionG(m.opt), 0);
  return `<section class="panel meals-panel">
    <div class="meals-head">
      <h2 class="panel-title">Refeições</h2>
      <div class="seg meals-seg" role="tablist" aria-label="Dia">
        ${['Hoje', 'Amanhã'].map((l, i) => `<button role="tab" class="seg-btn ${i === off ? 'on' : ''}" data-meals-day="${i}" aria-selected="${i === off}">${l}</button>`).join('')}
      </div>
    </div>
    <p class="muted meals-day">${esc(info.label)}</p>
    <ol class="meal-list">${p.meals.map((m) => {
      const done = eaten.has(m.id);
      return `<li class="meal ${done ? 'is-done' : ''}">
        <div class="meal-top"><span class="meal-name">${esc(m.name)}${m.optional ? ' <span class="muted">(se faltar proteína)</span>' : ''}</span><span class="meal-g num">${optionG(m.opt)} g</span></div>
        <p class="meal-when muted small">${esc(info.times[m.id] || '')}</p>
        <p class="meal-text">${esc(m.opt.text)}</p>
        ${m.opt.tip ? `<p class="meal-tip muted small">${esc(m.opt.tip)}</p>` : ''}
        ${m.id === 'pa' && hasKind('creatine', iso) ? '<p class="meal-tip muted small">Toma a creatina aqui, para não te esqueceres.</p>' : ''}
        <div class="meal-actions">
          ${off === 0 ? (done ? '<span class="meal-ok">Registado</span>' : `<button class="btn secondary small" data-meal-eat="${m.id}">Comi isto</button>`) : ''}
          ${m.count > 1 && !done ? `<button class="btn ghost small" data-meal-next="${m.id}">Outra opção</button>` : ''}
        </div>
      </li>`;
    }).join('')}</ol>
    <p class="meal-total">Com este plano: cerca de <strong class="num">${total} g</strong> de proteína, para uma meta de ${p.target} g.</p>
    <p class="muted small">Os valores são aproximados. Depois de "Comi isto" podes acertar cada alimento na lista da proteína.${pantryLine ? ` Em casa, pelas contas da app: ${esc(pantryLine)}.` : ''}</p>
  </section>`;
}

export function bindMeals(root) {
  root.addEventListener('click', (e) => {
    const d = e.target.closest('[data-meals-day]');
    if (d) { offset = Number(d.dataset.mealsDay); rerender(); return; }
    const today = todayISO();
    const off = offset ?? (new Date().getHours() >= 20 ? 1 : 0);
    const iso = addDays(today, off);
    const nx = e.target.closest('[data-meal-next]');
    if (nx) { nextOption(iso, nx.dataset.mealNext); rerender(); return; }
    const eat = e.target.closest('[data-meal-eat]');
    if (eat && off === 0) {
      const m = planFor(today).meals.find((x) => x.id === eat.dataset.mealEat);
      if (m) addFoods(today, m.opt.items, { meal: m.id, option: m.opt.id }, m.name);
    }
  });
}
