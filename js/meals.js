// Refeições do dia: registo do que comeste em cada refeição (o que quiseres) e, ao lado, uma sugestão
// com o que há em casa, ajustada ao tipo de dia. "Comi a sugestão" regista-a de uma vez.
import * as E from './engine.js';
import { put, get, list } from './store.js';
import { rerender, toast } from './ui.js';
import { WEEKDAYS, MEAL_SLOTS } from './data.js';
import { FOODS, foodG, addFoods, foodPicker, entryChip, mealTotals, normMeal } from './protein.js';
import { esc, fmtNum, fmtDate, todayISO, addDays, isoToMs } from './util.js';

const MEALS = MEAL_SLOTS;

// needs: o que tem de haver em casa. whey/oats/pb vêm do stock; yopro/atum/cavala das compras
// menos o que já registaste como comido.
const OPTIONS = {
  pa: [
    { id: 'pa-papa', text: 'Papa de aveia no shaker: 300 ml de leite, 45 g de aveia e 1 medida de whey. Uma banana à parte.', items: [['leite', 1.2], ['aveia', 1], ['whey', 1], ['banana', 1]], needs: ['oats', 'whey'] },
    { id: 'pa-shake', text: 'Leite com whey no shaker (300 ml de leite e 1 medida) e pão com queijo.', items: [['leite', 1.2], ['whey', 1], ['pao', 1], ['queijo', 1]], needs: ['whey'] },
    { id: 'pa-ovos', text: '2 ovos mexidos, pão e um copo de leite.', items: [['ovo', 2], ['pao', 1], ['leite', 1]] },
    { id: 'pa-sandes', text: 'Pão com queijo e fiambre de peru, um copo de leite e uma banana.', items: [['pao', 1], ['queijo', 1], ['fiambre_peru', 0.5], ['leite', 1], ['banana', 1]] },
    { id: 'pa-aveia-pb', text: 'Aveia com leite (300 ml), uma colher de manteiga de amendoim e uma banana.', items: [['leite', 1.2], ['aveia', 1], ['manteiga_amendoim', 1], ['banana', 1]], needs: ['oats', 'pb'] },
    { id: 'pa-paes', text: 'Um pão com fiambre de peru, um pão com queijo, um copo de leite e uma banana.', items: [['pao_fiambre', 1], ['pao_queijo', 1], ['leite', 1], ['banana', 1]] },
  ],
  almoco: [
    { id: 'al-casa', text: 'O que houver em casa: 1 a 2 palmas da mão de carne ou peixe (por exemplo, 2 bifes de peru), um prato de arroz, massa ou batata, legumes e uma peça de fruta.', items: [['carne', 1], ['arroz', 1], ['brocolos', 1], ['pera', 1]], tip: 'Se houver pouca carne ou peixe, junta 2 ovos ou uma lata de atum. Se ficares com sono a seguir, come um pouco menos de arroz agora e reforça o lanche.' },
  ],
  lanche: [
    { id: 'la-atum', text: 'Pão com uma lata de atum e uma banana.', items: [['pao', 1], ['atum', 1], ['banana', 1]], needs: ['atum'] },
    { id: 'la-yopro', text: 'Um YoPro e uma banana.', items: [['yopro', 1], ['banana', 1]], needs: ['yopro'] },
    { id: 'la-cavala', text: 'Pão com uma lata de cavala e uma pera.', items: [['pao', 1], ['cavala', 1], ['pera', 1]], needs: ['cavala'] },
    { id: 'la-sandes', text: 'Sandes de queijo e fiambre de peru e um punhado de amêndoas.', items: [['pao', 1], ['queijo', 1], ['fiambre_peru', 0.5], ['amendoas', 1]] },
    { id: 'la-aveia', text: 'Aveia com leite (300 ml) e uma colher de manteiga de amendoim. Boa 1 a 2 horas antes do treino.', items: [['leite', 1.2], ['aveia', 1], ['manteiga_amendoim', 1]], needs: ['oats', 'pb'] },
    { id: 'la-iogurte', text: 'Iogurte grego, um punhado de nozes ou amêndoas e uma peça de fruta.', items: [['iogurte_grego', 1], ['amendoas', 1], ['maca', 1]] },
    { id: 'la-paes', text: 'Um pão com fiambre de peru, um pão com queijo e uma banana.', items: [['pao_fiambre', 1], ['pao_queijo', 1], ['banana', 1]] },
    { id: 'la-pb', text: 'Pão com manteiga de amendoim, um copo de leite e uma banana.', items: [['pao', 1], ['manteiga_amendoim', 1], ['leite', 1], ['banana', 1]], needs: ['pb'] },
  ],
  jantar: [
    { id: 'ja-casa', text: 'O que houver em casa: 1 a 2 palmas da mão de carne ou peixe, sopa, legumes e um pouco de pão, arroz ou batata.', items: [['carne', 1], ['sopa', 1], ['pao', 0.5]] },
  ],
};

const COUNTED = [['yopro', /yopro/i, 'YoPro'], ['atum', /atum/i, 'latas de atum'], ['cavala', /cavala/i, 'latas de cavala']];

let pickedIso = null; // dia escolhido para os registos e as sugestões (null = hoje, ou amanhã a partir das 23h)
let pickedOn = null; // dia em que a escolha foi feita (se a app ficar aberta e mudar o dia, volta ao normal)
let openAdd = null; // refeição com "Adicionar alimento" aberto

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
  // "Hoje não dá" (ou treino falhado) sem treino registado: dia sem treino
  const note = E.dayNote(iso);
  const skipped = !!note && (note.skip || note.missed) && !E.sessions().some((s) => s.date === iso);
  const train = !skipped && (plan === 'supera' || plan === 'estadio');
  const wd = WEEKDAYS[new Date(isoToMs(iso)).getDay()];
  const what = skipped ? 'dia sem treino'
    : plan === 'supera' ? 'dia de Supera, treino a partir das 19h'
    : plan === 'estadio' ? 'dia de Estádio, treino a partir das 19h'
    : plan === 'livre' || plan === 'repor' ? 'dia de reposição (se faltaste a algum treino, repões hoje ou no outro dia do fim de semana)'
    : plan === 'corrida' ? 'dia de corrida: come mais hidratos (arroz, massa, pão)'
    : 'dia de descanso';
  return {
    plan, train, label: `${wd}, ${fmtDate(iso)}: ${what}.`,
    times: { pa: 'de manhã', almoco: 'por volta das 13h', lanche: train ? 'por volta das 17h, 2 h antes do treino' : 'a meio da tarde', jantar: train ? 'depois do treino' : 'por volta das 20h' },
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
  const planned = meals.reduce((a, m) => a + optionG(m.opt), 0);
  return { meals, planned, target: E.proteinTarget(), ctx };
}

function nextOption(iso, mealId) {
  const p = planFor(iso);
  const m = p.meals.find((x) => x.id === mealId);
  if (!m) return;
  const pool = OPTIONS[mealId].filter((o) => available(o, p.ctx));
  if (pool.length < 2) return;
  const i = pool.findIndex((o) => o.id === m.opt.id);
  const next = pool[(i + 1) % pool.length];
  const cur = get('mealPlans', iso) || { date: iso, choices: {} };
  put('mealPlans', iso, { ...cur, date: iso, choices: { ...(cur.choices || {}), [mealId]: next.id } });
}

const defaultIso = () => addDays(todayISO(), new Date().getHours() >= 23 ? 1 : 0);
// Dia mostrado no painel das refeições (pode ser ontem, outro dia passado, hoje ou amanhã)
export const shownDay = () => (pickedIso && pickedOn === todayISO() ? pickedIso : defaultIso());
// Dia dos registos (peso, sono, creatina, proteína): o dia escolhido, se já passou ou é hoje; senão, hoje
export function logDay() {
  const t = todayISO();
  const d = shownDay();
  return d <= t ? d : t;
}
export function setLogDay(iso) {
  pickedIso = iso || null;
  pickedOn = todayISO();
}
// "hoje", "ontem" ou "sábado, 21/11"
export function dayWord(iso, cap = false) {
  const t = todayISO();
  const w = iso === t ? 'hoje' : iso === addDays(t, -1) ? 'ontem' : iso === addDays(t, 1) ? 'amanhã' : `${WEEKDAYS[new Date(isoToMs(iso)).getDay()]}, ${fmtDate(iso)}`;
  return cap ? w[0].toUpperCase() + w.slice(1) : w;
}
// Botões Ontem / Hoje / (Amanhã) e um campo para outro dia passado
export function daySwitch({ tomorrow = false } = {}) {
  const t = todayISO();
  const cur = shownDay();
  const opts = [[addDays(t, -1), 'Ontem'], [t, 'Hoje'], ...(tomorrow ? [[addDays(t, 1), 'Amanhã']] : [])];
  const other = !opts.some(([iso]) => iso === cur);
  return `<div class="day-switch">
    <div class="seg meals-seg" role="tablist" aria-label="Dia">
      ${opts.map(([iso, l]) => `<button role="tab" class="seg-btn ${iso === cur ? 'on' : ''}" data-log-day="${iso}" aria-selected="${iso === cur}">${l}</button>`).join('')}
    </div>
    <label class="day-other ${other ? 'on' : ''}"><span class="muted small">Outro dia</span><input type="date" class="input small" data-log-pick max="${t}" min="${addDays(t, -60)}" value="${other ? cur : ''}" aria-label="Escolher outro dia"></label>
  </div>`;
}

function suggestionBlock(m, { canEat, eatenThis }) {
  if (!m.opt) return '';
  return `<div class="meal-sug">
    <p class="meal-text"><span class="muted">Sugestão, cerca de ${optionG(m.opt)} g:</span> ${esc(m.opt.text)}</p>
    ${m.opt.tip ? `<p class="meal-tip muted small">${esc(m.opt.tip)}</p>` : ''}
    <div class="meal-actions">
      ${canEat ? (eatenThis ? '<span class="meal-ok">Sugestão registada</span>' : `<button class="btn secondary small" data-meal-eat="${m.id}">Comi a sugestão</button>`) : ''}
      ${m.count > 1 && !eatenThis ? `<button class="btn ghost small" data-meal-next="${m.id}">Outra sugestão</button>` : ''}
    </div>
  </div>`;
}

export function mealsPanel() {
  const today = todayISO();
  const iso = shownDay();
  const canLog = iso <= today; // hoje ou um dia que já passou
  const info = dayInfo(iso);
  const p = planFor(iso);
  const h = E.habitsFor(iso);
  const foods = canLog ? h.foods || [] : [];
  const tot = mealTotals({ foods });
  const pc = p.ctx.pantry;
  const pantryLine = COUNTED.filter(([f]) => pc[f] !== null && pc[f] !== undefined).map(([f, , label]) => `${pc[f]} ${label}`).join(', ');
  const planTotal = p.meals.reduce((a, m) => a + optionG(m.opt), 0);
  const rows = p.meals;
  const noMeal = foods.filter((f) => !f.meal);
  return `<section class="panel meals-panel" id="meals" ${canLog ? `data-log-date="${iso}"` : ''}>
    <div class="meals-head">
      <h2 class="panel-title">Refeições</h2>
      ${daySwitch({ tomorrow: true })}
    </div>
    <p class="muted meals-day">${esc(info.label)}</p>
    <ol class="meal-list">${rows.map((m) => {
      const its = foods.filter((f) => normMeal(f.meal) === m.id);
      const eatenThis = m.opt && its.some((f) => f.option === m.opt.id);
      return `<li class="meal ${its.length ? 'has-food' : ''}">
        <div class="meal-top"><span class="meal-name">${esc(m.name)}</span>${canLog && its.length ? `<span class="meal-g num">${fmtNum(tot[m.id] || 0)} g</span>` : ''}</div>
        <p class="meal-when muted small">${esc(info.times[m.id] || '')}</p>
        ${canLog && its.length ? `<div class="chips meal-eaten">${its.map(entryChip).join('')}</div>` : ''}
        ${suggestionBlock(m, { canEat: canLog, eatenThis })}
        ${m.id === 'pa' && hasKind('creatine', iso) ? '<p class="meal-tip muted small">Toma a creatina aqui, para não te esqueceres.</p>' : ''}
        ${canLog ? `<details class="meal-add" data-meal-add="${m.id}" ${openAdd === m.id ? 'open' : ''}><summary>${its.length ? 'Juntar mais alimentos' : 'Registar o que comi'}</summary>${foodPicker(m.id)}</details>` : ''}
      </li>`;
    }).join('')}</ol>
    ${noMeal.length ? `<div class="meal-none"><p class="muted small">Registado sem refeição (antes de a app separar por refeições):</p><div class="chips">${noMeal.map(entryChip).join('')}</div></div>` : ''}
    <p class="meal-total">${canLog ? `Registado ${esc(dayWord(iso))}: <strong class="num">${fmtNum(h.protein || 0)} g</strong> de ${p.target} g. ` : ''}Seguindo as sugestões: cerca de ${planTotal} g.${planTotal < p.target ? ' Fica abaixo da meta: reforça o lanche ou o jantar, por exemplo com leite e whey.' : ''}</p>
    <p class="muted small">Os valores são aproximados.${pantryLine ? ` Em casa, pelas contas da app: ${esc(pantryLine)}.` : ''}</p>
  </section>`;
}

export function bindMeals(root) {
  root.addEventListener('click', (e) => {
    const go = e.target.closest('[data-goto-meals]');
    if (go) {
      e.preventDefault();
      if (shownDay() > todayISO()) { setLogDay(todayISO()); rerender(); }
      document.getElementById('meals')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
    const d = e.target.closest('[data-log-day]');
    if (d) { setLogDay(d.dataset.logDay); openAdd = null; rerender(); return; }
    const sum = e.target.closest('.meal-add > summary');
    if (sum) {
      const det = sum.parentElement;
      openAdd = det.open ? null : det.dataset.mealAdd; // o clique acontece antes de abrir/fechar
      return;
    }
    const iso = shownDay();
    const nx = e.target.closest('[data-meal-next]');
    if (nx) { nextOption(iso, nx.dataset.mealNext); rerender(); return; }
    const eat = e.target.closest('[data-meal-eat]');
    if (eat && iso <= todayISO()) {
      const m = planFor(iso).meals.find((x) => x.id === eat.dataset.mealEat);
      if (m && m.opt) addFoods(iso, m.opt.items, { meal: m.id, option: m.opt.id }, `${m.name} (sugestão)`);
    }
  });
  root.addEventListener('change', (e) => {
    const pick = e.target.closest('[data-log-pick]');
    if (!pick || !pick.value) return;
    const t = todayISO();
    if (pick.value > t) { toast('Só dá para registar dias que já passaram.'); return; }
    setLogDay(pick.value);
    openAdd = null;
    rerender();
  });
}
