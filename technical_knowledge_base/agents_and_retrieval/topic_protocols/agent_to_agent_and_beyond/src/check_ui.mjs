// Click every control on every tab at 390 px dark and 920 px light. Fails on page errors, a visible #jsErr,
// NaN/undefined/Infinity in visible text outside <pre> and <code>, and sideways page scroll.
// Run from the repo root: node technical_knowledge_base/agents_and_retrieval/topic_protocols/agent_to_agent_and_beyond/src/check_ui.mjs [shots dir]
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
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
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
  for (const tab of ['t-read', 't-run', 't-ucp', 't-more']) {
    await p.click(`button[data-t=${tab}]`); await sleep(250);
    await checkTab(tab, 'open');
    if (tab === 't-read') {
      await clickAll('#t-read .pr .opts button', tab);
      await clickAll('#t-read .seg button', tab);
      await clickAll('#rd-st-svg button', tab);
      await clickAll('#rd-co-svg button', tab);
      await clickAll('#rd-err-t tr[data-i]', tab);
      await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
      await checkTab(tab, 'details open');
      for (const id of ['rd-card', 'rd-st', 'rd-resub', 'rd-err', 'rd-co']) {
        const el = await p.$('#' + id); await el.scrollIntoView(); await sleep(100);
        await el.screenshot({ path: path.join(shots, `${id}_${width}_${scheme}.png`) });
      }
    }
    if (tab === 't-run') {
      const modes = await p.$$eval('#rn-seg button', es => es.map(e => e.dataset.m));
      for (const m of modes) {
        await p.click(`#rn-seg button[data-m="${m}"]`); clicks++; await sleep(60);
        await p.click('#rn-ctl-p'); await p.click('#rn-ctl-p'); clicks += 2;
        const n = await p.$eval('#rn-ctl-s', e => +e.max);
        for (let i = 0; i <= n; i++) {
          await p.$eval('#rn-ctl-s', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, i);
          await checkTab(tab, m + ' step ' + i);
        }
        await p.click('#rn-ctl-b'); await p.click('#rn-ctl-f'); clicks += 2;
        await p.select('#rn-ctl-v', '2');
        const el = await p.$('#rn-card'); await el.scrollIntoView(); await sleep(100);
        await el.screenshot({ path: path.join(shots, `run_${m}_${width}_${scheme}.png`) });
      }
    }
    if (tab === 't-ucp') {
      await clickAll('#uc-pre button', tab);
      const sels = await p.$$eval('#uc-t select', es => es.map(e => e.dataset.k));
      for (const k of sels) {
        for (const v of ['', '2026-04-08', '2026-08-25']) {
          await p.select(`#uc-t select[data-k="${k}"]`, v); clicks++; await sleep(20);
        }
        await checkTab(tab, 'select ' + k);
      }
      await p.select('#uc-t select[data-k="dev.ucp.shopping.checkout"]', ''); await p.select('#uc-t select[data-k="dev.ucp.shopping.cart"]', '');
      const pr = await p.$eval('#uc-t', t => t.innerText.includes('pruned'));
      if (!pr) report(scheme, 'expected pruning after removing checkout and cart');
      await clickAll('#uh-msgs input', tab); await clickAll('#uh-msgs input', tab);
      for (const id of ['uc-card', 'uh-card']) {
        const el = await p.$('#' + id); await el.scrollIntoView(); await sleep(100);
        await el.screenshot({ path: path.join(shots, `${id}_${width}_${scheme}.png`) });
      }
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
