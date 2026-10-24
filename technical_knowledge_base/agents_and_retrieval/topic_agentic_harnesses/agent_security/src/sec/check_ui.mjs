// Click every control of the Agent security page at 390 dark and 920 light; report page errors,
// NaN/undefined text, sideways scroll, and the error box; screenshot each tab. Run from the repo root:
//   node technical_knowledge_base/agents_and_retrieval/topic_agentic_harnesses/agent_security/src/sec/check_ui.mjs <outdir>
import { createRequire } from 'node:module';
import path from 'node:path';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const pageFile = path.resolve('technical_knowledge_base/agents_and_retrieval/topic_agentic_harnesses/agent_security/index.html');
const out = process.argv[2] || '.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + pageFile);
  await sleep(300);
  const check = async (tab, label) => {
    const t = await p.$eval('#' + tab, e => e.innerText);
    for (const w of ['NaN', 'undefined', 'Infinity', '[object'])
      if (t.includes(w)) errs.push(label + ': text contains ' + w + ' near "' + t.slice(Math.max(0, t.indexOf(w) - 60), t.indexOf(w) + 20).replace(/\n/g, ' ') + '"');
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errs.push(label + ': sideways scroll');
    const jsErr = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
    if (jsErr) errs.push(label + ': error box: ' + jsErr.slice(0, 200));
  };
  const anim = async c => {
    if (!(await p.$('#' + c + '-f'))) return;
    for (let k = 0; k < 20; k++) await p.$eval('#' + c + '-f', e => e.click());
    await p.$eval('#' + c + '-b', e => e.click());
    await p.$eval('#' + c + '-s', e => { e.value = 0; e.dispatchEvent(new Event('input')); });
    await p.$eval('#' + c + '-s', e => { e.value = e.max; e.dispatchEvent(new Event('input')); });
    await p.$eval('#' + c + '-v', e => { e.value = '2'; e.dispatchEvent(new Event('change')); });
    await p.$eval('#' + c + '-p', e => e.click()); await sleep(120); await p.$eval('#' + c + '-p', e => e.click());
  };
  const clickSeg = async (segId, after) => {
    const n = await p.$$eval('#' + segId + ' button', bs => bs.length);
    for (let i = 0; i < n; i++) { await p.$$eval('#' + segId + ' button', (bs, i) => bs[i].click(), i); await sleep(80); if (after) await after(); }
  };

  // Reading: nothing may move before the reader acts
  await p.click('button[data-t=t-read]'); await sleep(200);
  const playing = await p.$$eval('#t-read .an-play', bs => bs.filter(b => /Pause/.test(b.textContent)).length);
  if (playing) errs.push(scheme + ': an animation is playing before any input');
  for (const c of ['hsec-pin-ctl', 'hsec-g-ctl', 'hsec-eg-ctl']) { await anim(c); await check('t-read', scheme + ' ' + c); }
  await clickSeg('hsec-sb-seg', () => check('t-read', scheme + ' sandbox seg'));
  const cbs = await p.$$('#hsec-tri-tog input[type=checkbox]');
  for (const cb of cbs) { await cb.click(); await sleep(40); await check('t-read', scheme + ' trifecta'); }
  for (const cb of cbs) { await cb.click(); await sleep(40); }
  const outTxt = await p.$eval('#hsec-tri-out', e => e.textContent);
  if (!/possible/.test(outTxt)) errs.push(scheme + ': trifecta verdict after toggling back should be "possible"');
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
  const rows = await p.$$eval('#hsec-gt tbody tr', r => r.length);
  if (rows !== 11) errs.push(scheme + ': gate table has ' + rows + ' rows, expected 11');
  await check('t-read', scheme + ' read');
  await (await p.$('#t-read')).screenshot({ path: `${out}/${scheme}_${width}_read.png` }).catch(() => {});

  // Further reading
  await p.click('button[data-t=t-more]'); await sleep(150);
  await check('t-more', scheme + ' more');

  if (errs.length) { bad += errs.length; console.log('\n[' + scheme + ' ' + width + '] problems:'); errs.forEach(e => console.log('  - ' + e)); }
  else console.log('[' + scheme + ' ' + width + '] clean');
  await p.close();
}
await b.close();
console.log(bad ? ('FAIL: ' + bad + ' problems') : 'PASS: no problems');
process.exit(bad ? 1 : 0);
