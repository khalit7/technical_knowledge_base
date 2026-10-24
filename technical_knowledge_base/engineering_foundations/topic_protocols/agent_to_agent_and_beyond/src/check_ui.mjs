// Click every control on every tab at 390 px dark and 920 px light, then once with reduced motion.
// Fails on page errors, a visible #jsErr, NaN/undefined/Infinity in visible text outside <pre> and <code>,
// sideways page scroll, and any animation that moves before the reader acts.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_protocols/agent_to_agent_and_beyond/src/check_ui.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots/ui');
fs.mkdirSync(shots, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let problems = 0, clicks = 0;
const report = (...a) => { console.log(...a); problems++; };
const REPLAYERS = ['rpd', 'rpa', 'rpm'];
for (const [scheme, width, motion] of [['dark', 390, 'no-preference'], ['light', 920, 'no-preference'], ['light', 920, 'reduce']]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
  await p.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) {} });
  await p.goto('file://' + page);
  const visibleText = sel => p.$eval(sel, el => { const c = el.cloneNode(true); c.querySelectorAll('pre,code,script,style').forEach(x => x.remove()); return c.innerText; });
  const bad = s => /\bNaN\b|\bundefined\b|Infinity|\[object/.test(s);
  const sideways = () => p.evaluate(() => document.scrollingElement.scrollWidth > document.documentElement.clientWidth + 1);
  async function checkTab(tab, what) {
    const t = await visibleText('#' + tab);
    if (bad(t)) report(scheme, width, tab, what, 'BAD TEXT', t.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,40}/)[0]);
    if (await sideways()) report(scheme, width, tab, what, 'SIDEWAYS SCROLL');
  }
  async function clickAll(sel, tab) {
    const n = (await p.$$(sel)).length;
    for (let i = 0; i < n; i++) {
      const els = await p.$$(sel); if (!els[i]) continue;
      await els[i].evaluate(e => e.scrollIntoView({ block: 'center' })); await els[i].click(); clicks++; await sleep(40);
      await checkTab(tab, sel + '#' + i);
    }
    return n;
  }
  // nothing moves before the reader acts: scroll every replayer into view and wait
  for (const r of REPLAYERS) {
    await p.$eval('#' + r + '-card', e => e.scrollIntoView({ block: 'center' })); await sleep(2200);
    const i = await p.$eval('#' + r + '-ctl-s', e => +e.value);
    if (i !== 0) report(scheme, width, motion, r, 'MOVED BY ITSELF to step', i);
  }
  if (motion === 'reduce') { await p.close(); continue; }
  for (const tab of ['t-read', 't-more']) {
    await p.click(`button[data-t=${tab}]`); await sleep(250);
    await checkTab(tab, 'open');
    if (tab !== 't-read') continue;
    await clickAll('#t-read .pr .opts button', tab);
    await clickAll('#rd-card-seg button, #rd-anat-seg button, #rd-ap2-seg button', tab);
    await clickAll('#rd-st-svg .gnode', tab);
    await clickAll('#rd-co-svg .gnode', tab);
    await clickAll('#rd-err-t tr[data-i]', tab);
    await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true)); await sleep(100);
    await clickAll('#rd-bind-seg button', tab);
    await clickAll('#uc-pre button', tab);
    const sels = await p.$$eval('#uc-t select', es => es.map(e => e.dataset.k));
    for (const k of sels) {
      for (const v of ['', '2026-04-08', '2026-08-25']) { await p.select(`#uc-t select[data-k="${k}"]`, v); clicks++; await sleep(20); }
      await checkTab(tab, 'select ' + k);
    }
    await p.select('#uc-t select[data-k="dev.ucp.shopping.checkout"]', ''); await p.select('#uc-t select[data-k="dev.ucp.shopping.cart"]', '');
    if (!(await p.$eval('#uc-t', t => t.innerText.includes('pruned')))) report(scheme, 'expected pruning after removing checkout and cart');
    await p.click('#uc-pre button[data-m="full"]');
    await clickAll('#uh-msgs input', tab); await clickAll('#uh-msgs input', tab);
    await checkTab(tab, 'details open');
    for (const r of REPLAYERS) {
      const modes = await p.$$eval('#' + r + '-seg button', es => es.map(e => e.dataset.m));
      for (const m of modes) {
        await p.click(`#${r}-seg button[data-m="${m}"]`); clicks++; await sleep(60);
        await p.click('#' + r + '-ctl-p'); await p.click('#' + r + '-ctl-p'); clicks += 2;
        const n = await p.$eval('#' + r + '-ctl-s', e => +e.max);
        for (let i = 0; i <= n; i++) {
          await p.$eval('#' + r + '-ctl-s', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, i);
          await checkTab(tab, r + ' ' + m + ' step ' + i);
        }
        await p.click('#' + r + '-ctl-b'); await p.click('#' + r + '-ctl-f'); clicks += 2;
        await p.select('#' + r + '-ctl-v', '2');
        const el = await p.$('#' + r + '-card'); await el.scrollIntoView(); await sleep(80);
        await el.screenshot({ path: path.join(shots, `${r}_${m}_${width}_${scheme}.png`) });
      }
    }
    for (const id of ['rd-hero-card', 'rd-nest-card', 'rd-card', 'rd-st', 'rd-resub', 'rd-err', 'uc-card', 'rd-co', 'uh-card', 'rd-ap2-card', 'rd-x402-card']) {
      const el = await p.$('#' + id); await el.scrollIntoView(); await sleep(80);
      await el.screenshot({ path: path.join(shots, `${id}_${width}_${scheme}.png`) });
    }
  }
  const jsErr = await p.$eval('#jsErr', e => !e.hidden);
  if (jsErr) report(scheme, 'jsErr visible', await p.$eval('#jsErr', e => e.textContent));
  if (errs.length) report(scheme, 'page errors', errs);
  await p.close();
}
await b.close();
console.log(`clicks ${clicks}, problems ${problems}`);
process.exit(problems ? 1 : 0);
