// Exercise every control at 390 dark and 920 light: no errors, no NaN/undefined/Infinity in visible text, no sideways scroll;
// compare the Reading table and calculator with src/recompute.py's values; save element screenshots to ../.shots/.
// usage (from the repo root): node technical_knowledge_base/measurement/topic_evaluation_and_llm_judges/rag_and_retrieval_evaluation/src/check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html');
const shots = path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const problems = []; let actions = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto(file, { waitUntil: 'load' });
  const audit = async (where) => {
    const r = await p.evaluate(() => {
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = (vis.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []);
      const err = document.getElementById('jsErr');
      return { bad, side: document.documentElement.scrollWidth > document.documentElement.clientWidth + 1, err: err && !err.hidden ? err.textContent : '' };
    });
    if (r.bad.length) problems.push(`${scheme}${width} ${where}: ${r.bad.slice(0, 3).join(' | ')}`);
    if (r.side) problems.push(`${scheme}${width} ${where}: sideways scroll`);
    if (r.err) problems.push(`${scheme}${width} ${where}: jsErr ${r.err}`);
    actions++;
  };
  const click = async (sel) => { await p.$eval(sel, e => e.click()); await audit(sel); };
  const select = async (sel, v) => { await p.select(sel, v); await audit(sel + '=' + v); };
  const tag = `${scheme}-${width}`;
  // Reading: animation, every case, mode, model and step
  for (const cs of ['carry', 'ampk']) {
    await select('#an-case', cs);
    for (const mode of ['before', 'after']) {
      await click(`#an-mode button[data-m="${mode}"]`);
      const models = cs === 'carry' ? await p.$$eval('#an-model option', o => o.map(x => x.value)) : [null];
      for (const m of models) {
        if (m) await select('#an-model', m);
        const n = await p.$eval('#an-ctl-s', e => +e.max + 1);
        for (let i = 0; i < n; i++) {
          await p.$eval('#an-ctl-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, i); await audit(`anim ${cs} ${mode} ${m} step ${i}`);
          if (mode === 'after' && i === n - 1 && (m === 'mistral-7B-instruct' || cs === 'ampk')) { const el = await p.$('#an-card'); await el.screenshot({ path: `${shots}/anim-${cs}-${tag}.png` }); }
          if (mode === 'after' && i === 5 && m === 'llama-2-13b-chat') { const el = await p.$('#an-card'); await el.screenshot({ path: `${shots}/anim-carry-gh-${tag}.png` }); }
        }
      }
    }
  }
  await click('#an-ctl-b'); await click('#an-ctl-f'); await click('#an-ctl-p'); await click('#an-ctl-p'); await select('#an-ctl-v', '2');
  // calculator
  for (const pr of ['first', 'rerank', 'pad']) {
    await click(`#mc-preset button[data-m="${pr}"]`);
    for (const k of ['3', '5', '10']) for (const g of ['lin', 'exp']) { await select('#mc-k', k); await select('#mc-gain', g); }
  }
  await click('#mc-preset button[data-m="first"]'); await select('#mc-k', '5'); await select('#mc-gain', 'lin');
  const calc = await p.$eval('#mc-out', e => e.innerText);
  if (!/0\.355/.test(calc)) problems.push(`${tag} calculator first-stage nDCG@5 not 0.355: ${calc.replace(/\s+/g, ' ')}`);
  await click('#mc-preset button[data-m="rerank"]');
  const calc2 = await p.$eval('#mc-out', e => e.innerText);
  if (!/0\.985/.test(calc2) || !/0\.917/.test(calc2)) problems.push(`${tag} calculator reranked values: ${calc2.replace(/\s+/g, ' ')}`);
  await click('#mc-list button[data-i="2"]'); await click('#mc-list button[data-i="2"]');
  { const el = await p.$('#mc-card'); await el.screenshot({ path: `${shots}/calc-${tag}.png` }); }
  { const el = await p.$('#rd-xtab'); await el.screenshot({ path: `${shots}/xtab-${tag}.png` }); }
  { const el = await p.$('#rd-real'); await el.screenshot({ path: `${shots}/real-${tag}.png` }); }
  const real = await p.$eval('#rd-real-tab', e => e.innerText);
  if (!/0\.676/.test(real) || !/0\.369/.test(real)) problems.push(`${tag} real table missing 0.676 / 0.369`);
  // mistakes
  for (const d of await p.$$('#rd-mist details summary')) { await d.click(); }
  await audit('mistakes open');
  // run tab
  await click('#tabs button[data-t="t-run"]');
  for (const s of ['scifact', 'nfcorpus', 'fiqa']) {
    await click(`#rn-set button[data-m="${s}"]`);
    for (const k of ['1', '3', '5', '10', '20', '100']) await select('#rn-k', k);
    await select('#rn-gain', 'exp'); await select('#rn-gain', 'lin'); await select('#rn-k', '10');
    const n = await p.$$eval('#rn-q option', o => o.length);
    for (let i = 0; i < n; i++) await select('#rn-q', String(i));
    await click('#rn-next'); await click('#rn-prev');
  }
  await click('#rn-set button[data-m="scifact"]');
  await p.screenshot({ path: `${shots}/run-${tag}.png`, fullPage: false });
  // spans tab
  await click('#tabs button[data-t="t-spans"]');
  const ni = await p.$$eval('#sp-item option', o => o.length);
  for (let i = 0; i < ni; i++) { await select('#sp-item', String(i)); await click('#sp-view button[data-m="resp"]'); await click('#sp-view button[data-m="span"]'); }
  await select('#sp-item', '0');
  { const el = await p.$('#sp-resp'); await el.screenshot({ path: `${shots}/spans-${tag}.png` }); }
  // more tab and links
  await click('#tabs button[data-t="t-more"]');
  const badLinks = await p.$$eval('a[href^="http"]', as => as.filter(a => a.target !== '_blank' || !/noopener/.test(a.rel)).map(a => a.href));
  if (badLinks.length) problems.push(`${tag} links without target/rel: ${badLinks.slice(0, 3).join(' ')}`);
  for (const a of await p.$$('a[data-tab]')) { await a.evaluate(x => x.click()); }
  await audit('tab links');
  if (errs.length) problems.push(`${tag} errors: ${errs.slice(0, 3).join(' | ')}`);
  await p.close();
}
await b.close();
console.log(`actions ${actions}, problems ${problems.length}`);
problems.slice(0, 40).forEach(x => console.log(x));
