// Registo da proteína do dia: atalhos, valor personalizado (somar, tirar, definir total) e desfazer
import * as E from './engine.js';
import { put } from './store.js';
import { toast, rerender } from './ui.js';
import { esc, fmtNum, parseNum } from './util.js';

// Valores aproximados, para quem não conta ao grama
export const PROTEIN_REF = [
  ['Carne, frango ou peixe (palma da mão)', 35],
  ['Atum (1 lata escorrida)', 20],
  ['Skyr (1 copo)', 16],
  ['2 ovos', 12],
  ['Fiambre de peru (4 fatias)', 10],
  ['Requeijão (100 g)', 10],
  ['Queijo (2 fatias)', 9],
  ['Leite (1 copo)', 8],
  ['Frutos secos (um punhado)', 6],
  ['Pão (1 carcaça)', 5],
];

export function proteinBlock(h, target) {
  const whey = E.S().wheyProtein || 21;
  const pct = Math.min(100, ((h.protein || 0) / target) * 100);
  return `
    <div class="protein-line"><span class="num big2">${fmtNum(h.protein || 0)}</span><span class="muted"> de ${target} g</span></div>
    <div class="meter thin"><span style="width:${Math.max(1, pct)}%"></span></div>
    <div class="chips">
      <button type="button" class="chip" data-prot="${whey}">+ whey (${whey} g)</button>
      <button type="button" class="chip" data-prot="35">+ refeição (35 g)</button>
    </div>
    <form class="prot-form" data-form="prot">
      <span class="with-unit"><input name="g" inputmode="numeric" autocomplete="off" class="input num" placeholder="30" aria-label="Gramas de proteína"><i>g</i></span>
      <button class="btn secondary small" name="op" value="add">Somar</button>
      <button class="btn ghost small" name="op" value="sub">Tirar</button>
      <button class="btn ghost small" name="op" value="set">Definir total</button>
    </form>
    <details class="prot-ref"><summary>Quanto tem cada coisa (toca para somar)</summary>
      <div class="chips">${PROTEIN_REF.map(([name, g]) => `<button type="button" class="chip ghost" data-prot="${g}">${esc(name)}: ${g} g</button>`).join('')}</div>
    </details>`;
}

function setProtein(iso, value) {
  const h = E.habitsFor(iso);
  const prev = h.protein || 0;
  const v = Math.max(0, Math.round(value));
  put('habits', iso, { ...h, protein: v });
  rerender();
  toast(`Proteína de hoje: ${v} g`, {
    timeout: 5000,
    action: { label: 'Desfazer', fn: () => { put('habits', iso, { ...E.habitsFor(iso), protein: prev }); rerender(); } },
  });
}

export function bindProtein(root, iso) {
  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-prot]');
    if (!b) return;
    e.preventDefault();
    setProtein(iso, (E.habitsFor(iso).protein || 0) + Number(b.dataset.prot));
  });
  root.addEventListener('submit', (e) => {
    const f = e.target.closest('[data-form="prot"]');
    if (!f) return;
    e.preventDefault();
    const g = parseNum(f.g.value);
    if (g === null || g < 0 || g > 500) { toast('Escreve os gramas de proteína, por exemplo 30.'); return; }
    const op = (e.submitter && e.submitter.value) || 'add';
    const cur = E.habitsFor(iso).protein || 0;
    setProtein(iso, op === 'set' ? g : op === 'sub' ? cur - g : cur + g);
  });
}
