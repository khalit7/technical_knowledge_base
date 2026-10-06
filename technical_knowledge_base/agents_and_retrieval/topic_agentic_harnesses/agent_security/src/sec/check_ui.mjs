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

  // Reading
  await p.click('button[data-t=t-read]'); await sleep(200);
  await anim('hsec-g-ctl');
  await clickSeg('hsec-sb-seg');
  await anim('hsec-eg-ctl');
  // trifecta checkboxes: toggle each
  const cbs = await p.$$('#hsec-tri input[type=checkbox]');
  for (const cb of cbs) { await cb.click(); await sleep(40); }
  for (const cb of cbs) { await cb.click(); await sleep(40); }
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
  await check('t-read', scheme + ' read');
  await (await p.$('#t-read')).screenshot({ path: `${out}/${scheme}_${width}_read.png` }).catch(() => {});

  // Permission gate decisions
  await p.click('button[data-t=t-hsgate]'); await sleep(200);
  await clickSeg('hsgate-fam');
  await check('t-hsgate', scheme + ' gate');
  await (await p.$('#t-hsgate')).screenshot({ path: `${out}/${scheme}_${width}_gate.png` }).catch(() => {});

  // Defence-in-depth simulator
  await p.click('button[data-t=t-hsdef]'); await sleep(200);
  const nDef = await p.$$eval('#hsdef-tog input[type=checkbox]', cs => cs.length);
  for (let i = 0; i < nDef; i++) { await p.$$eval('#hsdef-tog input[type=checkbox]', (cs, i) => cs[i].click(), i); await sleep(50); await check('t-hsdef', scheme + ' def toggle'); }
  for (let i = 0; i < nDef; i++) { await p.$$eval('#hsdef-tog input[type=checkbox]', (cs, i) => cs[i].click(), i); await sleep(50); }
  await check('t-hsdef', scheme + ' def');
  await (await p.$('#t-hsdef')).screenshot({ path: `${out}/${scheme}_${width}_def.png` }).catch(() => {});

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
