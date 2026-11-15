// Compras e stock: o que tens, quanto dura, o que repor e quanto gastaste
import * as E from './engine.js';
import { put, get, remove } from './store.js';
import { icons, rerender, toast, header, modal, confirmDialog } from './ui.js';
import { esc, fmtNum, fmtDate, todayISO, parseNum, uid, addDays } from './util.js';

const STATUS = {
  uso: 'Em uso',
  fechado: 'Em casa, por abrir',
  encomendado: 'A caminho',
  acabou: 'Acabou',
};

const money = (n) => new Intl.NumberFormat('pt-PT', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0) + ' €';

function fmtG(g) {
  if (g >= 1000) return `${fmtNum(Math.round(g / 100) / 10)} kg`;
  return `${fmtNum(Math.round(g))} g`;
}

function itemRow(it, iso) {
  const left = E.stockLeft(it, iso);
  const daily = E.dailyUse(it);
  const days = daily ? Math.floor(left / daily) : null;
  const pct = it.sizeG ? Math.max(0, Math.min(100, (left / it.sizeG) * 100)) : 0;
  const dose = it.servingG ? `${fmtNum(it.servingG)} g por dose${it.perDay && it.perDay !== 1 ? `, ${fmtNum(it.perDay)} por dia` : ', 1 por dia'}` : '';
  let line = '';
  if (it.status === 'uso') line = days !== null ? `Restam cerca de ${fmtG(left)}: dá para ${days} ${days === 1 ? 'dia' : 'dias'}, até ${fmtDate(addDays(iso, days))}.` : `Restam cerca de ${fmtG(left)}.`;
  else if (it.status === 'fechado') line = `${fmtG(it.sizeG)} por abrir${days !== null ? `, dá para ${days} dias` : ''}.`;
  else if (it.status === 'encomendado') line = `${fmtG(it.sizeG)} a caminho.`;
  else line = 'Acabou.';
  const actions = {
    uso: `<button class="btn ghost small" data-act="adjust">Ajustar</button><button class="btn ghost small" data-act="finish">Acabou</button>`,
    fechado: `<button class="btn secondary small" data-act="open">Abrir</button>`,
    encomendado: `<button class="btn secondary small" data-act="arrived">Chegou</button>`,
    acabou: '',
  }[it.status] || '';
  return `<li class="stock-item s-${it.status}" data-id="${esc(it.id)}">
    <div class="stock-main">
      <div class="stock-name"><b>${esc(it.name || E.stockLabel(it.kind))}</b><span class="tag">${esc(E.stockLabel(it.kind))}</span></div>
      <p class="stock-line">${esc(line)}</p>
      ${it.status === 'uso' ? `<div class="meter thin"><span style="width:${pct}%"></span></div>` : ''}
      ${dose || it.note ? `<p class="muted small">${esc([dose, it.note].filter(Boolean).join('. '))}</p>` : ''}
    </div>
    <div class="stock-actions">${actions}<button class="icon-btn small" data-act="del-item" aria-label="Apagar artigo">${icons.trash}</button></div>
  </li>`;
}

function purchaseRow(p) {
  const cat = E.PURCHASE_CATEGORIES[p.category] || 'Compra';
  return `<li class="purchase" data-pid="${esc(p.id)}">
    <div class="purchase-head">
      <span class="purchase-date">${esc(fmtDate(p.date))}</span>
      <b>${esc(p.store)}</b>
      <span class="tag">${esc(cat)}</span>
      <span class="num purchase-total">${money(p.total)}</span>
    </div>
    <ul class="purchase-items">${(p.items || []).map((i) => `<li><span>${esc(i.name)}</span><span class="num muted">${i.price !== undefined ? money(i.price) : ''}</span></li>`).join('')}</ul>
    ${p.discount ? `<p class="muted small">Desconto de ${money(p.discount)}${p.note ? `. ${esc(p.note)}` : ''}</p>` : p.note ? `<p class="muted small">${esc(p.note)}</p>` : ''}
    <div class="purchase-foot">
      <span class="muted small">${p.status === 'a caminho' ? `A caminho${p.expected ? `, prevista para ${esc(fmtDate(p.expected))}` : ''}${p.carrier ? ` (${esc(p.carrier)})` : ''}` : 'Recebida'}</span>
      ${p.status === 'a caminho' ? '<button class="btn secondary small" data-act="received">Chegou</button>' : ''}
      <button class="icon-btn small" data-act="del-purchase" aria-label="Apagar compra">${icons.trash}</button>
    </div>
  </li>`;
}

function itemForm(it = {}) {
  const kinds = Object.entries(E.STOCK_KINDS);
  return `
    <label class="field"><span>Tipo</span><select class="input" name="kind">${kinds.map(([k, v]) => `<option value="${k}" ${it.kind === k ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>
    <label class="field"><span>Nome</span><input class="input" name="name" value="${esc(it.name || '')}" placeholder="Ex.: Whey Zumub chocolate"></label>
    <div class="field-row">
      <label class="field"><span>Tamanho</span><span class="with-unit"><input class="input num" name="sizeG" inputmode="decimal" value="${it.sizeG ?? 1000}"><i>g</i></span></label>
      <label class="field"><span>Dose</span><span class="with-unit"><input class="input num" name="servingG" inputmode="decimal" value="${it.servingG ?? 30}"><i>g</i></span></label>
      <label class="field"><span>Doses por dia</span><input class="input num" name="perDay" inputmode="decimal" value="${it.perDay ?? 1}"></label>
    </div>
    <label class="field"><span>Estado</span><select class="input" name="status">${Object.entries(STATUS).map(([k, v]) => `<option value="${k}" ${(it.status || 'fechado') === k ? 'selected' : ''}>${v}</option>`).join('')}</select></label>`;
}

export function renderStock(root) {
  const iso = todayISO();
  const sugg = E.stockSuggestions(iso);
  const items = E.stockItems();
  const active = items.filter((i) => i.status !== 'acabou');
  const done = items.filter((i) => i.status === 'acabou');
  const buys = E.purchases();
  const m = E.monthSpend(iso);
  const pct = Math.min(100, (m.food / m.budget) * 100);

  root.innerHTML = `
    ${header('Compras e stock', { back: '#/mais' })}
    ${sugg.length ? `<section class="panel"><h2 class="panel-title">Sugestões</h2>${sugg.map((s) => `<p class="status status-${s.level}">${esc(s.text)}</p>`).join('')}</section>` : ''}
    <div class="two-col">
      <section class="panel">
        <h2 class="panel-title">O que tens</h2>
        ${active.length ? `<ul class="stock-list">${active.map((i) => itemRow(i, iso)).join('')}</ul>` : '<p class="muted">Ainda sem artigos. Acrescenta a whey, a creatina e o resto para a app te avisar quando estiverem a acabar.</p>'}
        <button class="btn secondary" data-act="add-item">${icons.plus} Acrescentar artigo</button>
        ${done.length ? `<details class="done-list"><summary>Acabados (${done.length})</summary><ul class="stock-list">${done.map((i) => itemRow(i, iso)).join('')}</ul></details>` : ''}
        <p class="muted small">As estimativas assumem as doses indicadas em cada artigo. A creatina conta os dias que marcas na app. Se a conta se afastar da realidade, usa "Ajustar".</p>
      </section>
      <section class="panel">
        <h2 class="panel-title">Compras</h2>
        <div class="stats-row">
          <div class="stat"><span class="num big2">${money(m.food)}</span><span class="muted">comida e suplementos este mês, de ${money(m.budget)}</span></div>
          ${m.gear ? `<div class="stat"><span class="num big2">${money(m.gear)}</span><span class="muted">material este mês</span></div>` : ''}
        </div>
        <div class="meter thin"><span style="width:${Math.max(1, pct)}%"></span></div>
        ${buys.length ? `<ul class="purchase-list">${buys.map(purchaseRow).join('')}</ul>` : '<p class="muted">Sem compras registadas.</p>'}
        <p class="muted small">O Claude pode registar aqui as tuas compras por ti: basta mandares-lhe a confirmação da encomenda.</p>
      </section>
    </div>`;

  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-act]');
    if (!btn) return;
    const act = btn.dataset.act;
    const li = btn.closest('[data-id]');
    const it = li ? get('stock', li.dataset.id) : null;
    const pli = btn.closest('[data-pid]');
    const p = pli ? get('purchases', pli.dataset.pid) : null;

    if (act === 'open' && it) {
      // Se houver outro do mesmo tipo em uso, dá-o como acabado
      for (const o of E.stockItems()) if (o.kind === it.kind && o.status === 'uso' && o.id !== it.id) put('stock', o.id, { ...o, status: 'acabou', finishedOn: iso });
      put('stock', it.id, { ...it, status: 'uso', openedOn: iso, leftG: null, leftOn: null });
      toast(`${it.name || E.stockLabel(it.kind)} em uso`);
      rerender();
    } else if (act === 'arrived' && it) {
      put('stock', it.id, { ...it, status: 'fechado', receivedOn: iso });
      rerender();
    } else if (act === 'finish' && it) {
      put('stock', it.id, { ...it, status: 'acabou', finishedOn: iso });
      rerender();
    } else if (act === 'adjust' && it) {
      const left = Math.round(E.stockLeft(it, iso));
      await modal({
        title: 'Ajustar',
        body: `<p class="muted">Pesa o que resta ou faz uma estimativa. A partir de hoje a app conta a partir daqui.</p>
          <label class="field"><span>Quanto resta</span><span class="with-unit"><input class="input num" name="left" inputmode="decimal" value="${left}"><i>g</i></span></label>
          <div class="field-row">
            <label class="field"><span>Dose</span><span class="with-unit"><input class="input num" name="servingG" inputmode="decimal" value="${it.servingG ?? 0}"><i>g</i></span></label>
            <label class="field"><span>Doses por dia</span><input class="input num" name="perDay" inputmode="decimal" value="${it.perDay ?? 1}"></label>
          </div>`,
        actions: [
          { label: 'Cancelar', value: null },
          {
            label: 'Guardar', kind: 'primary', value: true,
            fn: (wrap) => {
              const v = parseNum(wrap.querySelector('[name="left"]').value);
              if (v === null || v < 0) { toast('Escreve quantos gramas restam.'); return false; }
              put('stock', it.id, {
                ...it, leftG: v, leftOn: iso,
                servingG: parseNum(wrap.querySelector('[name="servingG"]').value) ?? it.servingG,
                perDay: parseNum(wrap.querySelector('[name="perDay"]').value) ?? it.perDay,
              });
              setTimeout(rerender, 0);
            },
          },
        ],
      });
    } else if (act === 'del-item' && it) {
      if (await confirmDialog(`Apagar "${it.name || E.stockLabel(it.kind)}"?`, { ok: 'Apagar', danger: true })) {
        remove('stock', it.id);
        rerender();
      }
    } else if (act === 'received' && p) {
      put('purchases', p.id, { ...p, status: 'recebida', receivedOn: iso });
      for (const s of E.stockItems()) if (s.purchaseId === p.id && s.status === 'encomendado') put('stock', s.id, { ...s, status: 'fechado', receivedOn: iso });
      toast(`Encomenda da ${p.store} recebida`);
      rerender();
    } else if (act === 'del-purchase' && p) {
      if (await confirmDialog(`Apagar a compra da ${p.store} de ${fmtDate(p.date)}?`, { ok: 'Apagar', danger: true })) {
        remove('purchases', p.id);
        rerender();
      }
    } else if (act === 'add-item') {
      await modal({
        title: 'Acrescentar artigo',
        body: itemForm(),
        actions: [
          { label: 'Cancelar', value: null },
          {
            label: 'Acrescentar', kind: 'primary', value: true,
            fn: (wrap) => {
              const g = (n) => wrap.querySelector(`[name="${n}"]`).value;
              const kind = g('kind');
              const sizeG = parseNum(g('sizeG'));
              if (!sizeG) { toast('Escreve o tamanho em gramas.'); return false; }
              const id = uid();
              const status = g('status');
              put('stock', id, {
                id, kind, name: g('name').trim() || E.stockLabel(kind), sizeG,
                servingG: parseNum(g('servingG')) ?? 0, perDay: parseNum(g('perDay')) ?? 1,
                status, openedOn: status === 'uso' ? iso : null,
              });
              setTimeout(rerender, 0);
            },
          },
        ],
        onMount: (wrap) => {
          wrap.querySelector('[name="kind"]').addEventListener('change', (ev) => {
            const d = E.STOCK_KINDS[ev.target.value];
            if (d && d.servingG) wrap.querySelector('[name="servingG"]').value = d.servingG;
          });
        },
      });
    }
  });
}
