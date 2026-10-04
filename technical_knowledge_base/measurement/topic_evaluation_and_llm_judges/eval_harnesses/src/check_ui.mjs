// Click every control on every tab at 390 dark and 920 light; fail on script errors, NaN/undefined text, sideways scroll.
// Run from the repo root: node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/eval_harnesses/src/check_ui.mjs [shotdir]
import { createRequire } from 'module';
import fs from 'fs'; import path from 'path'; import os from 'os';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const dir = path.resolve('technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/eval_harnesses');
const shots = process.argv[2] || path.join(os.tmpdir(), 'hx_shots'); fs.mkdirSync(shots, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const problems = []; let actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const pg = await browser.newPage();
  await pg.setViewport({ width: w, height: 900 });
  await pg.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await pg.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) { } });
  await pg.goto('file://' + path.join(dir, 'index.html'));
  const scan = async (label) => {
    const r = await pg.evaluate(() => {
      const t = [...document.querySelectorAll('.tab')].filter(x => !x.hidden).map(x => x.innerText).join(' ');
      const m = t.match(/.{0,40}\b(NaN|undefined|Infinity|null)\b.{0,40}/);
      return { bad: m ? m[0] : null, sx: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
        err: (document.getElementById('jsErr') || {}).hidden === false };
    });
    if (r.bad && !/"null"|: null|null because|null when|is null|Null here/.test(r.bad)) problems.push(`${w} ${label}: text ${r.bad}`);
    if (r.sx) problems.push(`${w} ${label}: sideways scroll`);
    if (r.err) problems.push(`${w} ${label}: error box shown`);
    actions++;
  };
  const clickAll = async (sel, label, after) => {
    const n = await pg.$$eval(sel, a => a.length);
    for (let i = 0; i < n; i++) {
      await pg.evaluate((s, i) => { const b = document.querySelectorAll(s)[i]; if (b) b.click() }, sel, i);
      await wait(40); if (after) await after(i); await scan(label + ' ' + i);
    }
    return n;
  };
  const shot = async (sel, name) => { const el = await pg.$(sel); if (el) { await el.scrollIntoView(); await wait(150); await el.screenshot({ path: path.join(shots, `${name}-${w}.png`) }) } };
  // Reading
  await pg.click('#tabs button[data-t="t-read"]'); await wait(200); await scan('read');
  await pg.click('#an-play'); await wait(100); await pg.click('#an-play');
  for (const m of ['lm', 'in']) {
    await pg.click(`#an-mode button[data-m="${m}"]`);
    await clickAll('#an-items button', 'anim item ' + m, async () => {
      for (let s = 0; s < 7; s++) { await pg.click('#an-next'); await wait(15); }
    });
    await pg.$eval('#an-scrub', e => { e.value = 3; e.dispatchEvent(new Event('input')) }); await scan('scrub');
    await pg.click('#an-prev'); await scan('prev');
    await pg.select('#an-speed', '2');
    for (let s = 0; s < 4; s++) await pg.click('#an-next');
    await shot('#an', 'anim-' + m);
  }
  // decision tree: every root-to-answer path, clicked in order
  const paths = await pg.evaluate(() => { const T = window.DT_TREE, out = [];
    const go = (id, p) => { const n = T[id]; if (!n.q) { out.push(p); return } n.o.forEach(o => go(o[1], p.concat([o[1]]))) }; go('q0', []); return out });
  for (const p of paths) {
    await pg.evaluate(() => { const r = document.querySelector('#dt-root [data-reset]'); if (r) r.click(); else { const b = document.querySelector('#dt-root .dt-q button'); } });
    // reset by clicking the first question's chosen option chain from scratch
    for (let i = 0; i < p.length; i++) { await pg.evaluate((i, to) => { const b = document.querySelector('#dt-root button[data-from="' + i + '"][data-to="' + to + '"]'); b.click() }, i, p[i]); }
    await scan('tree ' + p.join('>'));
    const ok = await pg.$('#dt-root .dt-ans'); if (!ok) problems.push(w + ' tree path without answer ' + p.join('>'));
  }
  await pg.evaluate(() => { document.querySelectorAll('#t-read details').forEach(d => d.open = true) }); await scan('details');
  await shot('#rd-one', 'one'); await shot('#rd-choose', 'choose');
  // One task, every harness
  await pg.click('#tabs button[data-t="t-same"]'); await wait(200); await scan('same');
  await clickAll('#sx-field button', 'field');
  const opts = await pg.$$eval('#sx-a option', o => o.map(x => x.value));
  for (const v of opts) { await pg.select('#sx-a', v); await pg.select('#sx-b', v); await scan('panel ' + v); }
  await pg.select('#sx-a', 'lmeval_gsm8k'); await pg.select('#sx-b', 'inspect_evals_gsm8k');
  await pg.evaluate(() => document.querySelector('#sx-field button[data-f="extract"]').click());
  await shot('#sx-files', 'files');
  await clickAll('#ex-pick button', 'bench');
  await pg.evaluate(() => { const t = document.getElementById('ex-in'); t.value = 'So the answer is **1,234**.\nANSWER: $1,234'; t.dispatchEvent(new Event('input')); const g = document.getElementById('ex-gold'); g.value = '1234'; g.dispatchEvent(new Event('input')) });
  await scan('live');
  await shot('#sx-ex', 'bench'); await shot('#sx-fields', 'fields');
  // Inside a run log
  await pg.click('#tabs button[data-t="t-logs"]'); await wait(200); await scan('logs');
  for (const m of ['lmres', 'lmsmp', 'inhdr', 'insmp']) {
    await pg.click(`#lg-mode button[data-m="${m}"]`); await wait(50);
    const n = await pg.$$eval('#lg-tree .k', a => a.length);
    for (let i = 0; i < Math.min(n, 40); i++) { await pg.evaluate((i) => { const k = document.querySelectorAll('#lg-tree .k')[i]; if (k) k.click() }, i); await scan('log ' + m + ' ' + i); }
    if (m === 'insmp') await clickAll('#lg-ev .ev', 'event');
    await shot('#t-logs', 'logs-' + m);
  }
  await pg.click('#tabs button[data-t="t-more"]'); await wait(100); await scan('more');
  // links to tabs inside the page
  await pg.click('#tabs button[data-t="t-read"]');
  const nlinks = await pg.$$eval('#t-read a[data-tab]', a => a.length);
  for (let i = 0; i < nlinks; i++) { await pg.evaluate(i => document.querySelectorAll('#t-read a[data-tab]')[i].click(), i); await wait(30); await scan('tablink ' + i); await pg.click('#tabs button[data-t="t-read"]'); }
  if (errs.length) problems.push(`${w}: errors ${errs.join(' | ')}`);
  await pg.close();
}
await browser.close();
console.log('actions', actions, 'problems', problems.length); problems.slice(0, 40).forEach(p => console.log(' ', p));
