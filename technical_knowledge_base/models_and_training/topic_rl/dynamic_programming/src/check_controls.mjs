// Exercise every control on the page in headless Chrome and look for NaN, undefined, Infinity or script errors.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_rl/dynamic_programming/src/check_controls.mjs
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../index.html');
const shots = path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0, checks = 0;
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  await p.$eval('button[data-t=t-read]', e => e.click());
  const scan = async (sel, tag) => {
    checks++;
    const t = await p.$eval(sel, e => e.innerText + ' ' + e.innerHTML);
    const m = t.match(/NaN|undefined|Infinity/);
    if (m) { bad++; console.log('BAD', scheme, tag, m[0], t.slice(Math.max(0, t.indexOf(m[0]) - 80), t.indexOf(m[0]) + 40)) }
  };
  const scrub = async (ctl, card, tag) => {
    const n = await p.$eval('#' + ctl + '-s', e => +e.max + 1);
    for (let i = 0; i < n; i += Math.max(1, Math.floor(n / 40))) { await p.$eval('#' + ctl + '-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, i); await scan('#' + card, tag + ' ' + i) }
    await p.$eval('#' + ctl + '-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, n - 1); await scan('#' + card, tag + ' last');
    for (const k of ['p', 'p', 'f', 'b']) await p.$eval('#' + ctl + '-' + k, e => e.click());
    await p.select('#' + ctl + '-v', '2');
    return n;
  };
  // Reading: student widgets
  for (const m of ['mrp', 'unif', 'opt']) {
    await p.$eval('#rd-smM button[data-m="' + m + '"]', e => e.click());
    for (const g of [0, 50, 90, 100]) { await p.$eval('#rd-smG', (e, g) => { e.value = g; e.dispatchEvent(new Event('input')) }, g);
      for (let i = 0; i < 7; i++) { await p.$$eval('#rd-smP .rd-smN', (gs, i) => { const x = gs.find(n => +n.dataset.i === i); if (x) x.dispatchEvent(new MouseEvent('click', { bubbles: true })) }, i); await scan('#rd-sm', 'student ' + m + ' ' + g + ' ' + i) } }
  }
  for (const g of ['0.5', '0.9', '1']) { await p.select('#rd-mcG', g); for (const id of ['rd-mc1', 'rd-mc10', 'rd-mc100']) await p.$eval('#' + id, e => e.click()); await scan('#rd-mc', 'mc ' + g) }
  await p.$eval('#rd-mcR', e => e.click()); await scan('#rd-mc', 'mc reset');
  // corridor, every mode
  for (const m of ['sync', 'cba', 'abc', 'pe']) { await p.$eval('#dp-coM button[data-m="' + m + '"]', e => e.click()); await scrub('dp-coC', 'dp-co', 'corridor ' + m);
    if (width === 920) { await p.$eval('#dp-coC-s', e => { e.value = 3; e.dispatchEvent(new Event('input')) }); const el = await p.$('#dp-co'); await el.screenshot({ path: path.join(shots, `corr-${m}-${scheme}-${width}.png`) }) } }
  // contraction and curse
  for (const g of [50, 75, 90, 95, 99, 100]) { await p.$eval('#dp-ctG', (e, g) => { e.value = g; e.dispatchEvent(new Event('input')) }, g); await scan('#dp-ct', 'contraction ' + g) }
  if (true) { const el = await p.$('#dp-ct'); await el.screenshot({ path: path.join(shots, `contr-${scheme}-${width}.png`) }) }
  for (const [d, v, m] of [[1, 2, 2], [10, 10, 4], [20, 20, 20], [3, 5, 2]]) { for (const [k, x] of [['D', d], ['V', v], ['M', m]]) await p.$eval('#dp-cu' + k, (e, x) => { e.value = x; e.dispatchEvent(new Event('input')) }, x); await scan('#dp-cu', 'curse ' + d + ' ' + v + ' ' + m) }
  // VI against Q-learning
  for (const m of ['vi', 'ql']) { await p.$eval('#rd-gwM button[data-m="' + m + '"]', e => e.click()); await scrub('rd-gwC', 'rd-gw', 'gw ' + m) }
  // mistakes
  await p.$$eval('#dp-wrong details', ds => ds.forEach(d => d.open = true)); await scan('#dp-wrong', 'mistakes');
  // Sweep lab
  await p.$eval('button[data-t=t-lab]', e => e.click());
  const meths = await p.$$eval('#sw-ma option', os => os.map(o => o.value));
  for (const w of ['sb44', 'silver', 'aima', 'maze']) {
    await p.select('#sw-w', w);
    const pairs = width === 920 ? meths.map((m, i) => [m, meths[(i + 1) % meths.length]]) : [['pi', 'vi'], ['ps', 'vi_rev'], ['pe', 'mpi3']];
    for (const [a, c] of pairs) { await p.select('#sw-ma', a); await p.select('#sw-mb', c); await scrub('sw-ctl', 't-lab', `lab ${w} ${a}/${c}`) }
    for (const th of ['0.01', '0.000001']) { await p.select('#sw-th', th); await scrub('sw-ctl', 't-lab', `lab ${w} th ${th}`) }
    await p.select('#sw-th', '0.0001');
    for (const g of [50, 90, 100]) { await p.$eval('#sw-g', (e, g) => { e.value = g; e.dispatchEvent(new Event('change')) }, g); await p.$eval('#sw-ctl-s', e => { e.value = 2; e.dispatchEvent(new Event('input')) }); await scan('#t-lab', `lab ${w} g ${g}`) }
    await p.$eval('#sw-ga .cell', e => e.dispatchEvent(new MouseEvent('click', { bubbles: true })));
    const cells = await p.$$('#sw-ga .cell'); if (cells.length > 5) await cells[5].click(); await scan('#sw-bk', 'backup ' + w);
    await p.select('#sw-ma', 'pi'); await p.select('#sw-mb', 'vi'); await p.$eval('#sw-ctl-s', e => { e.value = 3; e.dispatchEvent(new Event('input')) });
    const el = await p.$('#sw-cards'); await el.screenshot({ path: path.join(shots, `lab-${w}-${scheme}-${width}.png`) });
  }
  for (const ph of ['0.25', '0.4', '0.45', '0.5', '0.55']) { await p.select('#sw-ph', ph); await scan('#sw-gam', 'gambler ' + ph) }
  await p.$eval('button[data-t=t-more]', e => e.click()); await scan('#t-more', 'more');
  const err = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
  if (err || errs.length) { bad++; console.log('ERRORS', scheme, err, errs) }
  const side = await p.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
  if (side) { bad++; console.log('SIDEWAYS SCROLL', scheme, width) }
  await p.close();
}
await b.close();
console.log(`controls check: ${checks} scans, ${bad} problems`);
process.exit(bad ? 1 : 0);
