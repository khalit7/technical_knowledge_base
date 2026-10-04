// Clicks every control of the page at 390 px dark and 920 px light, and checks the page's maths (window.MC) against recompute_out.json.
// usage: node check_ui.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path'; import fs from 'node:fs';
const require = createRequire(path.resolve('../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const SHOTS = process.argv[2] || '.';
const R = JSON.parse(fs.readFileSync('recompute_out.json', 'utf8'));
const file = 'file://' + path.resolve('../index.html');
const b = await puppeteer.launch({ headless: 'shell' });
let problems = [];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file);
  await p.click('button[data-t=t-read]'); await new Promise(r => setTimeout(r, 200));
  let actions = 0;
  const bad = async (where) => { const t = await p.evaluate(() => document.body.innerText); if (/NaN|undefined|\bnull\b|Infinity/.test(t)) problems.push(where + ': NaN/undefined/null in text: ' + (t.match(/.{30}(NaN|undefined|\bnull\b|Infinity).{30}/) || [''])[0]);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (sw) problems.push(where + ': sideways scroll') };
  // maths check (once)
  if (width === 390) {
    const res = await p.evaluate(() => MA.comps.map(c => ({ k: c.k, rows: c.models.map(m => { const s = MC.stats(m, c.n); return { m: m.n, p1: s.p1, ciAns: s.ciAns, ciClu: s.ciClu, ciProb: s.ciProb, maj: s.maj, pk: s.pk } }) })));
    let n = 0, worst = 0;
    for (const c of res) for (const r of c.rows) { const e = R.matharena[c.k].find(x => x.m === r.m); if (!e) { problems.push('no recompute row ' + r.m); continue }
      const pairs = [[r.p1, e.pass1], [r.ciAns, e.ci_answers], [r.ciClu, e.ci_cluster], [r.ciProb, e.ci_problems]].concat(r.maj.map((v, i) => [v, e.maj[i]]), r.pk.map((v, i) => [v, e.passk[i]]));
      for (const [a, x] of pairs) { n++; worst = Math.max(worst, Math.abs(a - x)); if (Math.abs(a - x) > 0.006) problems.push('maths ' + c.k + ' ' + r.m + ' ' + a + ' vs ' + x) } }
    console.log('maths: compared', n, 'values, worst difference', worst.toFixed(4));
    const pt = await p.evaluate(() => [MC.permTest([1, 1, 0.5, 0], [0, 1, 0, 0]).p, MC.permTest([1, 1, 1, 1, 1, 1], [0, 0, 0, 0, 0, 0]).p]);
    // exact: diffs [1,0.5] -> sums |±1±0.5| >= 1.5 in 2 of 4 -> 0.5; six diffs of 1 -> 2/64
    if (Math.abs(pt[0] - 0.5) > 1e-9 || Math.abs(pt[1] - 2 / 64) > 1e-9) problems.push('permTest ' + pt);
  }
  // Reading animations: step through every step of each, in every mode
  for (const [ctl, modes] of [['gs-ctl', null], ['ai-ctl', 'ai-mode'], ['fm-ctl', null]]) {
    const n = await p.$eval('#' + ctl + '-s', e => +e.max + 1);
    const ms = modes ? await p.$$eval('#' + modes + ' button', bs => bs.length) : 1;
    for (let m = 0; m < ms; m++) {
      if (modes) { await p.click('#' + modes + ' button:nth-child(' + (m + 1) + ')'); actions++ }
      await p.click('#' + ctl + '-b'); for (let i = 0; i < n + 1; i++) { await p.click('#' + ctl + '-b'); actions++ }
      for (let i = 0; i < n; i++) { await p.click('#' + ctl + '-f'); actions++ } await bad(ctl + ' mode ' + m);
    }
  }
  const models = await p.$$eval('#gs-model option', o => o.map(x => x.value));
  for (const v of models) { await p.select('#gs-model', v); actions++ } await bad('gs models');
  for (let k = 1; k <= 4; k++) { await p.click('#fm-lad button.rung:nth-child(' + k + ')'); actions++ }
  for (const k of [1, 2]) { await p.click('#eb-mode button:nth-child(' + k + ')'); actions++ } await bad('eb');
  for (const c of ['gs-ctl', 'ai-ctl', 'fm-ctl']) { for (let i = 0; i < 30; i++) await p.click('#' + c + '-f') }
  await p.click('#ai-mode button:nth-child(2)');
  // screenshots of the cards at their last step
  for (const id of ['gs-card', 'ai-card', 'fm-card', 'eb-card']) { const el = await p.$('#' + id); await el.screenshot({ path: path.join(SHOTS, 'math-' + id + '-' + scheme + '-' + width + '.png') }) }
  for (const c of ['gs-ctl', 'ai-ctl', 'fm-ctl']) { for (let i = 0; i < 30; i++) await p.click('#' + c + '-f') }
  await p.click('#ai-mode button:nth-child(2)');
  // play buttons
  for (const c of ['gs-ctl', 'ai-ctl', 'fm-ctl']) { await p.click('#' + c + '-p'); await new Promise(r => setTimeout(r, 400)); await p.click('#' + c + '-p'); actions++ }
  // Sample lab
  await p.click('button[data-t=t-lab]'); await new Promise(r => setTimeout(r, 300));
  const comps = await p.$$eval('#lb-comp button', bs => bs.length);
  for (let c = 0; c < comps; c++) {
    await p.click('#lb-comp button:nth-child(' + (c + 1) + ')'); actions++;
    const opts = await p.$$eval('#lb-a option', o => o.map(x => x.value));
    for (const v of opts) { await p.select('#lb-a', v); actions++ }
    await p.select('#lb-a', opts[Math.floor(opts.length / 2)]);
    for (const v of ['', opts[0], opts[opts.length - 1]]) { await p.select('#lb-b', v); actions++ }
    for (const k of [1, 2, 3]) { await p.click('#lb-ci button:nth-child(' + k + ')'); actions++ }
    const cols = await p.$$eval('#lb-grid .ph', e => e.length);
    for (let j = 0; j < cols; j++) { await p.click('#lb-grid .ph:nth-of-type(' + (j + 2) + ')').catch(() => {}); actions++ }
    const rows = await p.$$('#lb-board .lbrow'); if (rows.length) { await rows[rows.length - 1].click(); actions++ }
    await bad('lab comp ' + c);
  }
  await p.click('#lb-comp button:nth-child(1)'); await p.select('#lb-a', 'o1 (medium)'); await p.select('#lb-b', 'o3-mini (high)');
  const el = await p.$('#t-lab'); await el.screenshot({ path: path.join(SHOTS, 'math-lab-' + scheme + '-' + width + '.png') });
  await p.click('button[data-t=t-more]'); await bad('more');
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) problems.push('error box: ' + box);
  if (errs.length) problems.push(scheme + ' errors: ' + errs.join(' | '));
  console.log(scheme, width, 'actions', actions);
  await p.close();
}
await b.close();
console.log(problems.length ? 'PROBLEMS\n' + problems.join('\n') : '0 problems');
