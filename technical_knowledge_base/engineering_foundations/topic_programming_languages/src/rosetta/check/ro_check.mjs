// Click every Rosetta control at 390 dark and 920 light; report errors, NaN/undefined text, sideways scroll.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_programming_languages/src/rosetta/check/ro_check.mjs <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve('technical_knowledge_base/engineering_foundations/topic_programming_languages/index.html');
const shots = process.argv[2] || '.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  await p.evaluate(() => localStorage.clear());
  await p.reload();
  await p.click('button[data-t=t-rosetta]'); await sleep(200);
  const probe = async (tag) => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-rosetta');
      const txt = t.innerText;
      return { nan: /\bNaN\b(?! *\])/.test(txt.replace(/\[ 0\.5, NaN \]|NaN \(|nan\]|NaN,|NaN\b(?=.*comparator)/g, '')) ? 'NaN?' : '', undef: /\bundefined\b/.test(txt) ? 'undef' : '',
        side: document.documentElement.scrollWidth > innerWidth, box: !document.getElementById('jsErr').hidden };
    });
    if (r.side || r.box) { bad++; console.log('FAIL', scheme, w, tag, JSON.stringify(r)); }
    return r;
  };
  const tasks = await p.$$eval('#ro-tasks button', bs => bs.map(b => b.dataset.id));
  for (const t of tasks) {
    await p.click(`#ro-tasks button[data-id=${t}]`);
    for (const mode of ['ann', 'two']) {
      await p.click(`#ro-mode button[data-m=${mode}]`);
      for (const l of ['python', 'cpp', 'rust', 'ts']) {
        await p.click(`#ro-lang button[data-m=${l}]`);
        if (mode === 'two') { await p.select('#ro-vs', l === 'rust' ? 'ts' : 'rust'); await p.click('#ro-notes'); }
        await probe(`${t}/${mode}/${l}`);
      }
    }
  }
  await p.click('#ro-mode button[data-m=ann]');
  await p.click('#ro-tasks button[data-id=program]');
  await p.click('#ro-lang button[data-m=cpp]');
  const ex = await p.$('#ro-extra details summary'); if (ex) await ex.click();
  await (await p.$('#ro-view')).screenshot({ path: `${shots}/ro-view-${w}.png` });
  for (const m of ['py', 'pyre', 'np', 'cpp', 'rust']) {
    await p.click(`#ro-memmode button[data-m=${m}]`);
    for (let i = 0; i < 18; i++) { await p.click('#ro-memctl-f'); }
    await probe('mem ' + m);
    if (m === 'py' || m === 'cpp') await (await p.$('#ro-memcard')).screenshot({ path: `${shots}/ro-mem-${m}-${w}.png` });
  }
  await p.click('#ro-memctl-p'); await sleep(300); await p.click('#ro-memctl-p');
  const cells = await p.$$('#ro-mx td button');
  for (const c of cells) { await c.click(); }
  await probe('mistakes');
  await p.click('#ro-mx td button[data-r=dangling][data-l=cpp]');
  await (await p.$('#ro-mx')).screenshot({ path: `${shots}/ro-mx-${w}.png` });
  await (await p.$('#ro-det')).screenshot({ path: `${shots}/ro-det-${w}.png` });
  const r = await p.evaluate(() => [...document.querySelectorAll('#t-rosetta pre, #t-rosetta .ro-out')].filter(e => e.getBoundingClientRect().right > innerWidth + 1).length);
  console.log(scheme, w, 'errors', errs, 'overflowing code boxes', r, 'cells', cells.length);
  if (errs.length || r) bad++;
  await p.close();
}
await b.close();
console.log(bad ? 'FAILURES ' + bad : 'all clean');
