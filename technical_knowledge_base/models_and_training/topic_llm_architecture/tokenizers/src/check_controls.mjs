// Every control on every tab at 390 px dark and 920 px light, then reduced motion: no page errors, no visible #jsErr,
// no NaN/undefined/Infinity in tab text, no sideways scroll, every new card rendered. One browser, closed at the end.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_architecture/tokenizers/src/check_controls.mjs
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page_ = path.resolve('technical_knowledge_base/models_and_training/topic_llm_architecture/tokenizers/index.html');
const shots = path.join(path.dirname(page_), '.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const MUST = ['tk-overStats', 'tk-pipeView', 'tk-snEncode', 'tk-mergeList', 'tk-sweepTab', 'tk-vocCalcTab', 'tk-nowTab', 'tk-chView', 'tk-arRows', 'tk-codeRows', 'tk-spView', 'tk-ltRows', 'tk-glPlot', 'tk-growText', 'tk-costPlot', 'tk-inspOut', 'tk-veBars', 'tk-granRows', 'tk-trnWords', 'tk-failRows'];
let total = 0, bad = 0;
for (const [scheme, width, rm] of [['dark', 390, false], ['light', 920, false], ['light', 920, true]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + page_); await new Promise(r => setTimeout(r, 400));
  const tabs = await p.$$eval('#tabs button[data-t]', bs => bs.map(x => x.dataset.t));
  for (const t of tabs) {
    await p.click(`#tabs button[data-t=${t}]`); await new Promise(r => setTimeout(r, 200));
    const n = await p.evaluate(async (t) => {
      const root = document.getElementById(t); let n = 0; const sleep = ms => new Promise(r => setTimeout(r, ms));
      for (const el of root.querySelectorAll('button')) { if (el.offsetParent === null) continue; el.click(); n++; if (n % 25 === 0) await sleep(10); }
      for (const el of root.querySelectorAll('input[type=range]')) { for (const v of [el.min, el.max, (+el.min + +el.max) / 2 | 0]) { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); n++; } }
      for (const el of root.querySelectorAll('select')) { for (const o of el.options) { el.value = o.value; el.dispatchEvent(new Event('change', { bubbles: true })); n++; } }
      for (const el of root.querySelectorAll('input[type=text],input[type=number],textarea')) { const v = el.value; el.value = el.type === 'number' ? '50' : (el.id === 'tk-chA' ? '99999' : 'Héllo 12345, 東京 '); el.dispatchEvent(new Event('input', { bubbles: true })); el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })); n += 2; }
      for (const el of root.querySelectorAll('details')) { el.open = true; n++; }
      return n;
    }, t);
    total += n; await new Promise(r => setTimeout(r, 300));
    const txt = await p.$eval('#' + t, el => el.innerText);
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(txt)) errs.push(`${t}: NaN/undefined/Infinity in text`);
    if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) errs.push(`${t}: sideways scroll`);
    if (!rm) await p.screenshot({ path: path.join(shots, `ctl-${t}-${scheme}-${width}.png`), fullPage: false });
  }
  for (const id of MUST) { const ok = await p.evaluate(id => { const e = document.getElementById(id); return !!e && e.innerHTML.trim().length > 20; }, id); if (!ok) errs.push('empty card ' + id); }
  if (rm) { await p.click('#tabs button[data-t=t-read]'); await p.evaluate(() => document.getElementById('tk-pipe').scrollIntoView()); await new Promise(r => setTimeout(r, 1500));
    const playing = await p.$eval('#tk-pipeCtl-p', x => x.textContent.includes('Pause')); if (playing) errs.push('animation autoplays under reduced motion'); }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr ' + box);
  bad += errs.length; console.log(scheme, width, rm ? 'reduced-motion' : '', errs.length ? errs : 'clean'); await p.close();
}
await b.close(); console.log('check_controls:', total, 'actions,', bad, 'problems'); process.exit(bad ? 1 : 0);
