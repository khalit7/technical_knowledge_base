// Part 1 UI check: every control of the three ja tabs at 390 dark and 920 light; no errors, NaN, undefined (outside code
// and outputs) or sideways scroll; every displayed output equals its recorded file; drills run live and are compared with Node.
// usage: node src/ja/check_ui.mjs   (from the page folder; puppeteer from html_utils' node_modules)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.resolve(HERE, '../../index.html');
const require = createRequire(path.resolve(HERE, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const SHOTS = process.env.SHOTS || '/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl/ja/shots';
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0; const notes = [];
const bad = (...a) => { problems++; console.log('PROBLEM', ...a); };
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + PAGE);
  const report = async (label) => {
    const r = await p.evaluate(() => {
      const t = [...document.querySelectorAll('.tab')].find(x => !x.hidden);
      const c = t.cloneNode(true); c.querySelectorAll('pre,code,textarea,.ja-q,details.mist').forEach(e => e.remove());
      const txt = c.textContent;
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), side: document.documentElement.scrollWidth > innerWidth,
        box: (document.getElementById('jsErr') || {}).hidden === false, wide: [...t.querySelectorAll('*')].filter(e => e.getBoundingClientRect().right > innerWidth + 1 && !e.closest('pre,.tw,.nav,#ja-lp-code,svg')).slice(0, 3).map(e => e.tagName + '.' + e.className) };
    });
    if (r.nan || r.undef || r.side || r.box || r.wide.length || errs.length) bad(scheme, width, label, JSON.stringify(r), errs.splice(0));
  };
  const stepAll = async (ctl, label) => {
    const n = await p.$eval('#' + ctl + '-s', s => +s.max + 1);
    await p.$eval('#' + ctl + '-s', s => { s.value = 0; s.dispatchEvent(new Event('input')) });
    for (let i = 1; i < n; i++) { await p.click('#' + ctl + '-f'); await report(label + ' step ' + i); }
    await p.click('#' + ctl + '-b'); await p.click('#' + ctl + '-p'); await p.click('#' + ctl + '-p');   // back, play, pause
    await p.select('#' + ctl + '-v', '2'); await p.select('#' + ctl + '-v', '1');
    await p.$eval('#' + ctl + '-s', s => { s.value = s.max; s.dispatchEvent(new Event('input')) });   // end on the last step
    return n;
  };
  // ---- Reading
  await p.evaluate(() => window.SHOW_TAB('t-ja-read')); await sleep(300); await report('read');
  for (const m of ['sequential', 'all', 'all_blocking', 'all_worker']) {
    await p.click(`#ja-tl-mode button[data-m=${m}]`); await stepAll('ja-tl-ctl', 'tl ' + m);
    await (await p.$('#ja-tl-card')).screenshot({ path: `${SHOTS}/tl-${m}-${scheme}-${width}.png` });
  }
  for (const m of ['naive', 'good']) {
    await p.click(`#ja-sse-mode button[data-m=${m}]`); await stepAll('ja-sse-ctl', 'sse ' + m);
    const t = await p.$eval('#ja-sse-cnt', e => e.textContent); if (!/recorded run: yes/.test(t)) bad('sse does not match recorded', m, t);
    await (await p.$('#ja-sse-card')).screenshot({ path: `${SHOTS}/sse-${m}-${scheme}-${width}.png` });
  }
  await (await p.$('#ja-start-bars')).screenshot({ path: `${SHOTS}/start-${scheme}-${width}.png` });
  await p.$$eval('#t-ja-read details', ds => ds.forEach(d => d.open = true)); await report('read details open');
  for (const a of await p.$$('#ja-nav a')) { await a.click(); } await report('nav');
  // embedded outputs equal the files on disk
  const shown = await p.$$eval('[id^="t-ja-"] pre[data-ja-src]', ps => ps.filter(x => x.id !== 'ja-pg-node').map(x => [x.dataset.jaSrc, x.textContent]));
  for (const [f, t] of shown) { const disk = fs.readFileSync(path.join(HERE, 'outputs', f), 'utf8').replace(/\n+$/, ''); if (disk !== t) bad('output differs from file', f); }
  if (scheme === 'dark') notes.push(`${shown.length} embedded outputs compared with outputs/`);
  // ---- Event-loop stepper
  await p.evaluate(() => window.SHOW_TAB('t-ja-loop')); await sleep(200); await report('loop');
  const modes = await p.$$eval('#ja-lp-mode button', bs => bs.map(b => b.dataset.m));
  for (const m of modes) {
    await p.click(`#ja-lp-mode button[data-m="${m}"]`); await stepAll('ja-lp-ctl', 'loop ' + m);
    const t = await p.$eval('#ja-lp-cnt', e => e.textContent); if (!/recorded output: yes/.test(t)) bad('stepper output differs', m, t);
    await (await p.$('#ja-lp-card')).screenshot({ path: `${SHOTS}/loop-${m}-${scheme}-${width}.png` });
  }
  const lc = await p.evaluate(() => window.JA_LOOP_CHECK()); lc.forEach(([k, ok]) => { if (!ok) bad('loop check', k) });
  for (const [k, v] of Object.entries(await p.evaluate(() => JA.loops))) {
    const disk = fs.readFileSync(path.join(HERE, 'outputs', 'loop_' + k + '.txt'), 'utf8').replace(/\n+$/, '').split('\n');
    if (JSON.stringify(disk) !== JSON.stringify(v.out)) bad('loop data differs from file', k);
  }
  // ---- Playground
  await p.evaluate(() => window.SHOW_TAB('t-ja-play')); await sleep(200); await report('play');
  const n = await p.$$eval('#ja-pg-list button', bs => bs.length);
  const diffs = [];
  for (let i = 0; i < n; i++) {
    await p.click(`#ja-pg-list button[data-i="${i}"]`);
    await p.type('#ja-pg-guess', 'x');
    await p.click('#ja-pg-reveal'); await p.click('#ja-pg-run');
    await p.waitForFunction(() => document.getElementById('ja-pg-live').textContent !== 'running...', { timeout: 8000 });
    const r = await p.evaluate(() => ({ id: document.getElementById('ja-pg-title').textContent.split('.')[0], node: document.getElementById('ja-pg-node').textContent,
      live: document.getElementById('ja-pg-live').textContent, v: document.getElementById('ja-pg-verdict').textContent }));
    const disk = fs.readFileSync(path.join(HERE, 'outputs', 'q_' + r.id + '.txt'), 'utf8').replace(/\n+$/, '');
    if (disk !== r.node) bad('drill recorded output differs from file', r.id);
    if (r.live !== r.node) diffs.push(r.id);
    await report('drill ' + r.id);
    if (i === 5) await (await p.$('#t-ja-play')).screenshot({ path: `${SHOTS}/play-${scheme}-${width}.png` });
  }
  await p.click('#ja-pg-next'); await p.click('#ja-pg-reset');
  await p.$eval('#ja-pg-ed', e => { e.value = 'while (true) {}'; }); await p.click('#ja-pg-run');
  await p.waitForFunction(() => /stopped/.test(document.getElementById('ja-pg-live').textContent), { timeout: 8000 }).catch(() => bad('infinite loop not stopped'));
  await p.$eval('#ja-pg-ed', e => { e.value = 'const xs = [1, 2'; }); await p.click('#ja-pg-run');
  await p.waitForFunction(() => /SyntaxError/.test(document.getElementById('ja-pg-live').textContent), { timeout: 8000 }).catch(() => bad('syntax error not shown'));
  await p.$eval('#ja-pg-ed', e => { e.value = 'await new Promise(r => setTimeout(r, 30));\nconsole.log(new Map([["a", { b: [1, "x"] }]]), new Set([1]), -0, 10n, [ , 1])'; }); await p.click('#ja-pg-run');
  await p.waitForFunction(() => /Map/.test(document.getElementById('ja-pg-live').textContent), { timeout: 8000 });
  notes.push(`${scheme}: live sample prints ${JSON.stringify(await p.$eval('#ja-pg-live', e => e.textContent))}`);
  await report('play extras');
  notes.push(`${scheme} ${width}: ${n} drills; live output differs from Node's for: ${diffs.join(', ') || 'none'}`);
  await p.close();
}
await b.close();
console.log(notes.join('\n'));
console.log(problems ? `problems: ${problems}` : 'all checks passed');
