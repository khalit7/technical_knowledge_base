// node <page>/src/check_controls.mjs   (paths are resolved from this file; puppeteer from html_utils' node_modules)
// Adapted from the language page's src/ja/check_ui.mjs (2026-10-26). At 390 px dark and 920 px light: steps the V8 stepper to
// its end, presses every preset of the double probe, opens every closed block, runs all 22 playground drills live; fails on
// any page or console error, a visible #jsErr, sideways scroll, or NaN / undefined / Infinity outside code and outputs.
// Checks that every embedded output equals its file in ja/outputs, that the stepper's trace equals n3_deopt.txt, that the probe's
// presets print what the recorded b1_numbers run printed, and that nothing moves before the reader acts.
// SHOTS=<dir> also writes element screenshots there.
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { execSync } from 'node:child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execSync('git rev-parse --show-toplevel', { cwd: HERE }).toString().trim();
const puppeteer = createRequire(path.join(ROOT, 'html_utils/package.json'))('puppeteer');
const PAGE = path.resolve(HERE, '../index.html'), OUT = path.join(HERE, 'ja/outputs'), SHOTS = process.env.SHOTS;
const disk = f => fs.readFileSync(path.join(OUT, f), 'utf8').replace(/\n+$/, '');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let fail = 0; const notes = [];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + PAGE); await p.click('button[data-t=t-read]');
  const report = async label => {
    const r = await p.evaluate(() => { const t = [...document.querySelectorAll('.tab')].find(x => !x.hidden);
      const c = t.cloneNode(true); c.querySelectorAll('pre,code,textarea,dd').forEach(e => e.remove());
      return { bad: (c.textContent.match(/\bNaN\b|\bundefined\b|\bInfinity\b/) || [''])[0], side: document.documentElement.scrollWidth > innerWidth,
        box: document.getElementById('jsErr').hidden === false }; });
    if (r.bad || r.side || r.box || errs.length) { fail++; console.log('PROBLEM', scheme, width, label, JSON.stringify(r), errs.splice(0)); }
  };
  // nothing moves by itself
  await p.$eval('#jl-v8-card', el => el.scrollIntoView()); await sleep(2600);
  if (await p.$eval('#jl-v8-ctl-s', r => +r.value) !== 0) { fail++; console.log('PROBLEM V8 stepper moved without the reader'); }
  // the stepper
  const n = await p.$eval('#jl-v8-ctl-s', s => +s.max + 1);
  for (let i = 1; i < n; i++) { await p.click('#jl-v8-ctl-f'); await report('v8 step ' + i); }
  const trace = await p.$$eval('#jl-v8-trace .ln', ls => ls.map(l => l.textContent).join('\n'));
  if (trace !== disk('n3_deopt.txt')) { fail++; console.log('PROBLEM V8 trace differs from n3_deopt.txt'); }
  if (SHOTS) await (await p.$('#jl-v8-card')).screenshot({ path: `${SHOTS}/v8-${scheme}-${width}.png` });
  await p.click('#jl-v8-ctl-b'); await p.click('#jl-v8-ctl-p'); await p.click('#jl-v8-ctl-p');
  // the double probe: presets agree with the recorded run
  const b1 = disk('b1_numbers.txt').split('\n');
  const want = { '9007199254740991': b1[3], '9007199254740993': b1[4], '1234567890123456789': b1[5] };
  for (const v of await p.$$eval('#jl-dp button[data-v]', bs => bs.map(x => x.dataset.v))) {
    await p.click(`#jl-dp button[data-v="${v}"]`); await report('probe ' + v);
    const shown = await p.$eval('#jl-dp-out dd:nth-of-type(2)', d => d.textContent);
    if (want[v] !== undefined && shown !== want[v]) { fail++; console.log('PROBLEM probe', v, shown, 'recorded', want[v]); }
  }
  for (const v of ['abc', '1e400', '-42', '']) { await p.$eval('#jl-dp-in', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')); }, v); await report('probe typed ' + v); }
  if (SHOTS) { await p.click('#jl-dp button[data-v="1234567890123456789"]'); await (await p.$('#jl-dp')).screenshot({ path: `${SHOTS}/probe-${scheme}-${width}.png` });
    const figs = await p.$$('#t-read .fig'); for (let i = 0; i < figs.length; i++) await figs[i].screenshot({ path: `${SHOTS}/fig${i}-${scheme}-${width}.png` }); }
  await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await report('details open');
  const shown = await p.$$eval('pre[data-jl-src]', ps => ps.filter(x => x.id !== 'jl-pg-node').map(x => [x.dataset.jlSrc, x.textContent]));
  for (const [f, t] of shown) if (disk(f) !== t) { fail++; console.log('PROBLEM output differs from file', f); }
  if (scheme === 'dark') notes.push(`${shown.length} embedded outputs equal their files`);
  // the playground
  await p.click('button[data-t=t-play]'); await sleep(200); await report('play');
  const nd = await p.$$eval('#jl-pg-list button', bs => bs.length); const diffs = [];
  for (let i = 0; i < nd; i++) {
    await p.click(`#jl-pg-list button[data-i="${i}"]`); await p.click('#jl-pg-reveal'); await p.click('#jl-pg-run');
    await p.waitForFunction(() => document.getElementById('jl-pg-live').textContent !== 'running...', { timeout: 8000 });
    const r = await p.evaluate(() => ({ id: document.getElementById('jl-pg-title').textContent.split('.')[0],
      node: document.getElementById('jl-pg-node').textContent, live: document.getElementById('jl-pg-live').textContent }));
    if (disk('q_' + r.id + '.txt') !== r.node) { fail++; console.log('PROBLEM drill recorded output differs', r.id); }
    if (r.live !== r.node) diffs.push(r.id);
    await report('drill ' + r.id);
  }
  if (SHOTS) await (await p.$('#t-play')).screenshot({ path: `${SHOTS}/play-${scheme}-${width}.png` });
  await p.$eval('#jl-pg-ed', e => { e.value = 'while (true) {}'; }); await p.click('#jl-pg-run');
  await p.waitForFunction(() => /stopped/.test(document.getElementById('jl-pg-live').textContent), { timeout: 8000 }).catch(() => { fail++; console.log('PROBLEM infinite loop not stopped'); });
  notes.push(`${scheme} ${width}: ${nd} drills run live; live output differs from Node's for: ${diffs.join(', ') || 'none'}`);
  await p.click('button[data-t=t-more]'); await report('more');
  await p.close();
}
// reduced motion: still nothing moves
{ const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + PAGE); await p.click('button[data-t=t-read]'); await p.$eval('#jl-v8-card', el => el.scrollIntoView()); await sleep(2600);
  if (await p.$eval('#jl-v8-ctl-s', r => +r.value) !== 0) { fail++; console.log('PROBLEM moved under reduced motion'); } await p.close(); }
await b.close();
console.log(notes.join('\n'));
console.log(fail ? `problems: ${fail}` : 'all checks passed');
process.exit(fail ? 1 : 0);
