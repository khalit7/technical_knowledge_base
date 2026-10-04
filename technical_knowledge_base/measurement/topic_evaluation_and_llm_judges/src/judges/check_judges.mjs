// Exercise every control of the Judge atlas tab at 390 px dark and 920 px light.
// Run from the repo root: node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/src/judges/check_judges.mjs [shots dir]
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const page_path = path.resolve('technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/index.html');
const shots = process.argv[2] || path.resolve('technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/.shots');
fs.mkdirSync(shots, { recursive: true });
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
let problems = [], actions = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  p.on('pageerror', e => problems.push(w + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push(w + ' console ' + m.text()) });
  await p.goto('file://' + page_path);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await p.click('#tabs button[data-t="t-judges"]');
  const check = async (label) => {
    actions++;
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-judges');
      const txt = t.innerText;
      const err = document.getElementById('jsErr');
      const bad = [];
      if (/\bNaN\b/.test(txt)) bad.push('NaN');
      if (/\bundefined\b/.test(txt)) bad.push('undefined');
      if (/\[object /.test(txt)) bad.push('[object');
      if (err && !err.hidden) bad.push('errbox: ' + err.textContent.slice(0, 200));
      if (document.documentElement.scrollWidth > document.documentElement.clientWidth + 1) bad.push('sideways scroll ' + document.documentElement.scrollWidth);
      // svg inside the plot must fit its box
      const sv = t.querySelector('#ja-plot svg');
      if (sv && sv.getBoundingClientRect().right > t.getBoundingClientRect().right + 1) bad.push('plot overflows');
      return bad;
    });
    if (r.length) problems.push(w + ' ' + label + ': ' + r.join('; '));
  };
  await check('open');
  const clickAll = async (sel, label, twice) => {
    const n = await p.$$eval(sel, a => a.length);
    for (let i = 0; i < n; i++) {
      const els = await p.$$(sel); if (!els[i]) continue;
      await els[i].evaluate(e => e.click()); await check(label + ' ' + i);
      if (twice) { const e2 = (await p.$$(sel))[i]; if (e2) { await e2.evaluate(e => e.click()); await check(label + ' off ' + i) } }
    }
    return n;
  };
  await clickAll('#ja-ctl .chips button', 'filter chip', true);
  await p.type('#ja-q', 'prometheus'); await check('search');
  await p.evaluate(() => { const q = document.getElementById('ja-q'); q.value = 'zzzz'; q.dispatchEvent(new Event('input')) }); await check('search empty');
  await p.click('#ja-reset'); await check('reset');
  await p.click('#ja-ind'); await check('independent only'); await p.click('#ja-ind');
  for (const k of ['n', 'kind', 'mode', 'hl', 'ow', 'cost', 'd', 's', 'st']) {
    for (let t = 0; t < 2; t++) { await p.evaluate(k => document.querySelector('#ja-wrap thead button[data-s="' + k + '"]').click(), k); await check('sort ' + k) }
  }
  // order check: the reading column must never interleave metrics
  const inter = await p.evaluate(() => { document.querySelector('#ja-wrap thead button[data-s="hl"]').click();
    const ids = [...document.querySelectorAll('#ja-wrap tr[data-id]')].map(t => t.dataset.id);
    const A = window.JUDGE_ATLAS, rd = {}; A.readings.forEach(x => rd[x.id] = x);
    const ms = ids.map(id => { const r = A.rows.find(r => r.id === id); const x = rd[r.hl] || rd[r.hl2]; return x ? x.m : null }).filter(Boolean);
    const seen = new Set(); let last = null, bad = 0; ms.forEach(m => { if (m !== last) { if (seen.has(m)) bad++; seen.add(m); last = m } }); return bad });
  if (inter) problems.push(w + ' reading sort interleaves metrics');
  const rows = await p.$$eval('#ja-wrap tr[data-id]', a => a.map(t => t.dataset.id));
  for (const id of rows) {
    await p.evaluate(id => document.querySelector('#ja-wrap tr[data-id="' + id + '"] button.nm').click(), id); await check('row ' + id);
    const more = await p.$$('#ja-det button.more');
    for (let i = 0; i < more.length; i++) { const m = (await p.$$('#ja-det button.more'))[i]; if (m) { await m.evaluate(e => e.click()); await check('more ' + id) } }
    await p.evaluate(id => document.querySelector('#ja-wrap tr[data-id="' + id + '"] td').click(), id); await check('row td ' + id);
  }
  // tick boxes: 4 ticks keep 3
  await p.evaluate(() => { window.JA.sel.length = 0; document.getElementById('ja-reset').click() });
  for (const id of rows.slice(0, 4)) { await p.evaluate(id => document.querySelector('#ja-wrap tr[data-id="' + id + '"] input[type=checkbox]').click(), id); await check('tick ' + id) }
  const nsel = await p.evaluate(() => window.JA.sel.length); if (nsel !== 3) problems.push(w + ' tick limit ' + nsel);
  await clickAll('#ja-cmp-pre button', 'preset');
  await clickAll('#ja-cmp button.jump', 'compare jump');
  await p.evaluate(() => document.getElementById('ja-corr').open = true);
  await clickAll('#ja-corr-b button.jump', 'correction jump');
  const nm = await p.$$eval('#ja-mch button', a => a.length);
  for (let i = 0; i < nm; i++) {
    await p.evaluate(i => document.querySelectorAll('#ja-mch button')[i].click(), i); await check('metric ' + i);
    for (const v of ['date', 'rank']) {
      await p.evaluate(v => document.querySelector('#ja-view button[data-v="' + v + '"]').click(), v); await check('metric ' + i + ' ' + v);
      const c = await p.$$('#ja-plot circle[data-id]');
      if (!c.length) problems.push(w + ' no dots metric ' + i);
      else { await c[c.length - 1].evaluate(e => e.dispatchEvent(new MouseEvent('click', { bubbles: true }))); await check('dot ' + i + ' ' + v) }
    }
  }
  const tj = await p.$('#ja-tip button.jump'); if (tj) { await tj.evaluate(e => e.click()); await check('tip jump') }
  await p.evaluate(() => window.JA.show('gpt4', false));
  const tabOk = await p.evaluate(() => { const a = document.querySelector('#ja-det a[data-tab="t-bias"]'); if (!a) return 'no link'; a.click(); const ok = !document.getElementById('t-bias').hidden; document.querySelector('#tabs button[data-t="t-judges"]').click(); return ok ? '' : 't-bias not shown' });
  if (tabOk) problems.push(w + ' bias lab link: ' + tabOk); actions++;
  // back to the default chart and the top for screenshots
  await p.evaluate(() => { document.querySelector('#ja-mch button[data-m="jb_acc"]').click(); document.querySelector('#ja-view button[data-v="date"]').click() });
  await p.evaluate(() => document.querySelector('#ja-cmp-pre button').click());
  await p.evaluate(() => window.JA.show('judgebench', false));
  const tab = await p.$('#t-judges');
  await tab.screenshot({ path: path.join(shots, 'judges_' + w + '_' + scheme + '.png') });
  for (const id of ['ja-s', 'ja-ch-s']) { const el = await p.$('#' + id); await el.screenshot({ path: path.join(shots, 'judges_' + id + '_' + w + '_' + scheme + '.png') }) }
  await p.close();
}
await browser.close();
console.log(actions + ' actions, ' + problems.length + ' problems');
problems.slice(0, 40).forEach(x => console.log('  ' + x));
process.exit(problems.length ? 1 : 0);
