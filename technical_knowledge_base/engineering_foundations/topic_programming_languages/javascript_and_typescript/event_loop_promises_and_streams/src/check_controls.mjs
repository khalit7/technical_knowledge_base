// node <page>/src/check_controls.mjs   (paths are resolved from this file; puppeteer from html_utils' node_modules)
// Adapted from the language page's src/ja/check_ui.mjs and the Python concurrency child's check_controls.mjs (2026-10-26).
// At 390 px dark and 920 px light: clicks every mode of the three animations and steps each to its end; fails on any page
// or console error, a visible #jsErr, sideways scroll, or NaN / undefined / Infinity outside code. Checks that every embedded
// output equals its file in ja/outputs, that the stepper's printed lines equal the recorded Node output for all six programs,
// and that the SSE replay's live parsers reproduce the recorded run. Under reduced motion and with no reduced motion,
// scrolling each animation into view must leave it on step 1 (nothing moves before the reader acts).
import { createRequire } from 'node:module'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url'; import { execSync } from 'node:child_process';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execSync('git rev-parse --show-toplevel', { cwd: HERE }).toString().trim();
const puppeteer = createRequire(path.join(ROOT, 'html_utils/package.json'))('puppeteer');
const PAGE = path.resolve(HERE, '../index.html'), OUT = path.join(HERE, 'ja/outputs');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let fail = 0; const notes = [];
const ANIMS = [['el-lp', 'el-lp-mode'], ['el-tl', 'el-tl-mode'], ['el-sse', 'el-sse-mode']];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + PAGE); await p.click('button[data-t=t-read]');   // the tab bar remembers the last tab
  // nothing plays by itself
  for (const [a] of ANIMS) { await p.$eval('#' + a + '-card', el => el.scrollIntoView()); await sleep(1900);
    const v = await p.$eval('#' + a + '-ctl-s', r => +r.value); if (v !== 0) errs.push(a + ' moved without the reader'); }
  const report = async label => {
    const r = await p.evaluate(() => { const t = [...document.querySelectorAll('.tab')].find(x => !x.hidden);
      const c = t.cloneNode(true); c.querySelectorAll('pre,code,.el-q').forEach(e => e.remove());
      return { bad: (c.textContent.match(/\bNaN\b|\bundefined\b|\bInfinity\b/) || [''])[0], side: document.documentElement.scrollWidth > innerWidth,
        box: document.getElementById('jsErr').hidden === false }; });
    if (r.bad || r.side || r.box) errs.push(`${label}: ${JSON.stringify(r)}`);
  };
  for (const [a, seg] of ANIMS) {
    for (const m of await p.$$eval(`#${seg} button`, bs => bs.map(x => x.dataset.m))) {
      await p.click(`#${seg} button[data-m="${m}"]`);
      const n = await p.$eval(`#${a}-ctl-s`, s => +s.max + 1);
      for (let i = 1; i < n; i++) await p.click(`#${a}-ctl-f`);
      await report(`${a} ${m}`);
      const cnt = await p.$eval(`#${a}-cnt`, e => e.textContent);
      if (a === 'el-lp' && !/recorded output: yes/.test(cnt)) errs.push('stepper output differs ' + m);
      if (a === 'el-sse' && !/recorded run: yes/.test(cnt)) errs.push('sse differs ' + m);
      await p.click(`#${a}-ctl-b`); await p.click(`#${a}-ctl-p`); await p.click(`#${a}-ctl-p`); await p.select(`#${a}-ctl-v`, '2');
    }
  }
  const lc = await p.evaluate(() => window.EL_LOOP_CHECK()); lc.forEach(([k, ok]) => { if (!ok) errs.push('loop check ' + k) });
  for (const [k, v] of Object.entries(await p.evaluate(() => EL.loops))) {
    const disk = fs.readFileSync(path.join(OUT, 'loop_' + k + '.txt'), 'utf8').replace(/\n+$/, '').split('\n');
    if (JSON.stringify(disk) !== JSON.stringify(v.out)) errs.push('loop data differs from file ' + k);
  }
  const shown = await p.$$eval('pre[data-el-src]', ps => ps.map(x => [x.dataset.elSrc, x.textContent]));
  for (const [f, t] of shown) if (fs.readFileSync(path.join(OUT, f), 'utf8').replace(/\n+$/, '') !== t) errs.push('output differs from file ' + f);
  if (scheme === 'dark') notes.push(`${shown.length} embedded outputs compared with ja/outputs`);
  await p.$$eval('details', ds => ds.forEach(d => d.open = true)); await report('details open');
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) { await p.click(`button[data-t=${t}]`); await report(t); }
  console.log(scheme, width, errs.length ? errs : 'clean'); fail += errs.length; await p.close();
}
await b.close(); console.log(notes.join('\n')); process.exit(fail ? 1 : 0);
