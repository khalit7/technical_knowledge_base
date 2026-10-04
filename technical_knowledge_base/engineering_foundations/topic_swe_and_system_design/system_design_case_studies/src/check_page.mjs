// Click every control at 390 px dark and 920 px light; fail on script errors, NaN, undefined or sideways scroll.
// Also compares the page's estimate engine with recompute.py (EST.evaluate at the defaults against EST_EXPECT).
// usage (from the repo root): node technical_knowledge_base/.../system_design_case_studies/src/check_page.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file); await sleep(300);
  const tag = scheme + width;
  const problems = [];
  const scan = async (sel, what) => { const t = await p.$eval(sel, e => e.innerText); if (/NaN|undefined|Infinity/.test(t)) problems.push(what + ': ' + (t.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/) || [''])[0]);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (sw) problems.push(what + ': sideways scroll') };
  // estimates against recompute.py
  const diff = await p.evaluate(() => { const out = []; for (const d of Object.keys(EST_SPEC.designs)) { const v = EST.evaluate(d, EST.defaults(d)), e = EST_EXPECT[d];
    for (const k of Object.keys(e)) if (Math.abs(v[k] - e[k]) > 1e-9 * Math.max(1, Math.abs(e[k]))) out.push(d + '.' + k + ' ' + v[k] + ' vs ' + e[k]) } return out });
  if (diff.length) problems.push('JS vs Python: ' + diff.join('; ')); else if (width === 390) console.log('estimates: JS equals recompute.py for every row');
  await p.click('button[data-t=t-read]'); await sleep(200);
  for (const d of ['url', 'rl', 'chat', 'feed', 'gw', 'rag', 'job']) {
    const id = '#dia-' + d;
    await p.$eval(id, e => e.scrollIntoView()); await sleep(100);
    const n = await p.$eval(id + '-ctl-s', e => +e.max + 1);
    await p.$eval(id + '-ctl-s', e => { e.value = 0; e.dispatchEvent(new Event('input')) });
    for (let i = 0; i < n; i++) { await scan(id, d + ' step ' + (i + 1)); if (i === 1 || i === n - 1) { const el = await p.$(id); await el.screenshot({ path: `${shots}/dia-${d}-${i + 1}-${tag}.png` }) } await p.click(id + '-ctl-f'); await sleep(40) }
    await p.click(id + '-ctl-b'); await p.click(id + '-ctl-p'); await sleep(100); await p.click(id + '-ctl-p');
    await p.select(id + '-ctl-v', '2');
    // estimate table: each scale button, then edit the first input
    const eid = '#est-' + d;
    for (const m of ['10', '100', '1']) { await p.click(`${eid}-seg button[data-m="${m}"]`); await sleep(30); await scan(eid, d + ' estimate x' + m) }
    await p.$eval(eid + ' details', e => e.open = true);
    await p.$eval(eid + '-in input', e => { e.value = String(+e.value * 3); e.dispatchEvent(new Event('input', { bubbles: true })) });
    await scan(eid, d + ' estimate edited');
    if (d === 'url' || d === 'chat') { const el = await p.$(eid); await el.screenshot({ path: `${shots}/est-${d}-${tag}.png` }) }
    await p.click(`${eid}-seg button[data-m="1"]`);
  }
  for (const s of ['#s-rl-race', '#s-feed-meas']) { await scan(s, s); const el = await p.$(s); await el.screenshot({ path: `${shots}/meas${s.slice(2)}-${tag}.png` }) }
  // drill
  await p.click('button[data-t=t-drill]'); await sleep(200);
  const np = await p.$$eval('#dr-prompts button', x => x.length);
  await p.click('#dr-start'); await sleep(600); await p.click('#dr-start'); await p.click('#dr-reset');
  for (let i = 0; i < np; i++) {
    await p.click(`#dr-prompts button[data-m="${i}"]`); await sleep(30);
    for (let s = 0; s < 7; s++) { await p.click(`button[data-rev="${s}"]`); await sleep(20) }
    const boxes = await p.$$('#dr-steps input[type=checkbox]'); for (const c of boxes.slice(0, 3)) await c.click();
    await scan('#t-drill', 'drill ' + i);
    if (i === 7) { const el = await p.$('#t-drill'); await el.screenshot({ path: `${shots}/drill-${tag}.png` }) }
    await p.click('#dr-clear');
  }
  await p.click('button[data-t=t-more]'); await sleep(100); await scan('#t-more', 'more');
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) problems.push('error box: ' + box);
  if (errs.length) problems.push('errors: ' + errs.join(' | '));
  console.log(tag, problems.length ? 'PROBLEMS\n  ' + problems.join('\n  ') : 'ok');
  bad += problems.length; await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
