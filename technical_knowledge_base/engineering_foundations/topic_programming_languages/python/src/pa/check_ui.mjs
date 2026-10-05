// Part 1 UI check: every control of the four pa tabs at 390 dark and 920 light; no errors, NaN, undefined
// or sideways scroll; and every displayed output equals the recorded file in outputs/.
// usage: node src/pa/check_ui.mjs   (from the page folder; puppeteer from html_utils' node_modules)
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.resolve(HERE, '../../index.html');
const require = createRequire(path.resolve(HERE, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const SHOTS = process.env.SHOTS || '/tmp/pa_shots';
fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
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
      const txt = t ? t.innerText : '';
      return { nan: /\bNaN\b/.test(txt), undef: /\bundefined\b/.test(txt), side: document.documentElement.scrollWidth > innerWidth,
        box: (document.getElementById('jsErr') || {}).hidden === false };
    });
    const bad = r.nan || r.undef || r.side || r.box || errs.length;
    if (bad) { problems++; console.log('PROBLEM', scheme, width, label, JSON.stringify(r), errs.splice(0)); }
    return r;
  };
  // step an RD.anim controller to the end, checking each step
  const stepAll = async (ctl, label) => {
    const n = await p.$eval('#' + ctl + '-s', s => +s.max + 1);
    await p.click('#' + ctl + '-b'); // pause
    await p.$eval('#' + ctl + '-s', s => { s.value = 0; s.dispatchEvent(new Event('input')) });
    for (let i = 1; i < n; i++) { await p.click('#' + ctl + '-f'); await report(label + ' step ' + i); }
    return n;
  };
  // Reading
  await p.evaluate(() => window.SHOW_TAB('t-pa-read')); await sleep(300); await report('read');
  for (const m of ['shallow', 'deep']) {
    await p.click(`#pa-names-mode button[data-m=${m}]`); const n = await stepAll('pa-names-ctl', 'names ' + m);
    const el = await p.$('#pa-names-card'); await el.screenshot({ path: `${SHOTS}/names-${m}-${scheme}-${width}.png` });
  }
  for (const m of ['eager', 'lazy']) {
    await p.click(`#pa-lazy-mode button[data-m=${m}]`); await stepAll('pa-lazy-ctl', 'lazy ' + m);
    const el = await p.$('#pa-lazy-card'); await el.screenshot({ path: `${SHOTS}/lazy-${m}-${scheme}-${width}.png` });
  }
  await stepAll('pa-dis-ctl', 'dis');
  await (await p.$('#pa-dis-card')).screenshot({ path: `${SHOTS}/dis-${scheme}-${width}.png` });
  await (await p.$('#pa-gil-bars')).screenshot({ path: `${SHOTS}/gil-${scheme}-${width}.png` });
  await (await p.$('#pa-np-bars')).screenshot({ path: `${SHOTS}/np-${scheme}-${width}.png` });
  // open every Predict details
  await p.$$eval('#t-pa-read .pa-pred details', ds => ds.forEach(d => d.open = true)); await report('read predicts open');
  // nav links
  const nav = await p.$$('#pa-nav a'); for (const a of nav) { await a.click(); } await report('nav');
  // Event loop
  await p.evaluate(() => window.SHOW_TAB('t-pa-loop')); await sleep(200); await report('loop');
  for (const m of ['sequential', 'gathered', 'gathered_blocking', 'gathered_thread']) {
    await p.click(`#pa-loop-mode button[data-m=${m}]`); await stepAll('pa-loop-ctl', 'loop ' + m);
    await (await p.$('#pa-loop-card')).screenshot({ path: `${SHOTS}/loop-${m}-${scheme}-${width}.png` });
  }
  // Data model
  await p.evaluate(() => window.SHOW_TAB('t-pa-dm')); await sleep(200); await report('dm');
  const keys = await p.$$eval('#pa-dm-pick button[data-k]', bs => bs.map(b => b.dataset.k));
  for (const k of keys) {
    await p.click(`#pa-dm-pick button[data-k=${k}]`); await stepAll('pa-dm-ctl', 'dm ' + k);
    const ok = await p.$$eval('#pa-dm-steps li code.l', cs => cs.every(c => c.textContent.trim().length > 0));
    if (!ok) { problems++; console.log('PROBLEM empty trace line', k); }
    if (k === 'add_subclass' || k === 'attr_instance') await (await p.$('#pa-dm-card')).screenshot({ path: `${SHOTS}/dm-${k}-${scheme}-${width}.png` });
  }
  // the scenarios must use every trace line exactly once
  const cover = await p.evaluate(() => Object.keys(PA.dm).map(k => k + ':' + PA.dm[k].length));
  // Drills
  await p.evaluate(() => window.SHOW_TAB('t-pa-drill')); await sleep(200);
  const topics = await p.$$eval('#pa-dr-topics button', bs => bs.map(b => b.dataset.t));
  for (const t of topics) { await p.click(`#pa-dr-topics button[data-t="${t}"]`); await report('drill ' + t); }
  await p.click('#pa-dr-topics button[data-t="all"]');
  const cards = await p.$$('#pa-dr-list .pa-dr');
  for (const c of cards) { await (await c.$('.rv')).click(); await (await c.$('.ok')).click(); await (await c.$('.miss')).click(); }
  await p.click('#pa-dr-all'); await report('drill all'); await p.click('#pa-dr-hide'); await p.click('#pa-dr-reset'); await report('drill reset');
  await (await p.$('#pa-dr-list .pa-dr')).screenshot({ path: `${SHOTS}/drill-${scheme}-${width}.png` });
  const sec = await p.$('#pa-dr-list a[data-sec]'); await sec.click(); await sleep(200);
  const onRead = await p.evaluate(() => !document.getElementById('t-pa-read').hidden); if (!onRead) { problems++; console.log('PROBLEM drill section link'); }
  // outputs embedded exactly
  if (scheme === 'dark') {
    const outs = await p.$$eval('pre.pa-out[data-src]', ps => ps.map(x => [x.dataset.src, x.textContent]));
    let n = 0;
    for (const [src, txt] of outs) {
      const want = fs.readFileSync(path.join(HERE, 'outputs', src), 'utf8').replace(/\n+$/, '');
      if (txt !== want) { problems++; console.log('PROBLEM output differs', src); } else n++;
    }
    const drills = JSON.parse(fs.readFileSync(path.join(HERE, 'outputs', 'q_drills.json'), 'utf8'));
    const shown = await p.$$eval('#pa-dr-list .pa-dr pre.pa-out', ps => ps.map(x => x.textContent));
    const dOk = drills.every((d, i) => shown[i] === d.out);
    if (!dOk) { problems++; console.log('PROBLEM drill outputs differ'); }
    const trace = JSON.parse(fs.readFileSync(path.join(HERE, 'outputs', 'a2_trace.json'), 'utf8'));
    const same = await p.evaluate(t => JSON.stringify(PA.loop) === JSON.stringify(t), trace);
    if (!same) { problems++; console.log('PROBLEM loop trace differs'); }
    console.log('outputs checked', n, 'of', outs.length, '| drills', drills.length, dOk ? 'match' : 'DIFFER', '| loop trace', same ? 'match' : 'DIFFER', '| dm traces', cover.length);
  }
  await p.close();
}
await b.close();
console.log('problems', problems);
