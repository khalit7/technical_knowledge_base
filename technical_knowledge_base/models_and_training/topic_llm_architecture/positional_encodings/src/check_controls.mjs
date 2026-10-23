// Click every control of the page at 390 px dark and 920 px light; fail on page errors, a visible error box, sideways scroll,
// or NaN / undefined / Infinity in a tab's text. One browser, closed at the end. Screenshots of each tab in ../.shots/.
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_llm_architecture/positional_encodings/src/check_controls.mjs
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import url from 'node:url';
const here = path.dirname(url.fileURLToPath(import.meta.url));
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page_ = path.join(here, '..', 'index.html'), shots = path.join(here, '..', '.shots'); fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let problems = 0, actions = 0;
const bad = async (p, t) => p.$eval('#' + t, el => { const m = el.innerText.match(/\bNaN\b|\bundefined\b|\bInfinity\b/); return m ? m[0] + ' near: ' + el.innerText.slice(Math.max(0, m.index - 60), m.index + 30) : '' });
const side = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
try {
  for (const [scheme, width, rm] of [['dark', 390, false], ['light', 920, false], ['light', 920, true]]) {
    const p = await b.newPage(); const errs = [];
    p.on('pageerror', e => errs.push('pageerror ' + e.message)); p.on('console', m => m.type() === 'error' && errs.push('console ' + m.text()));
    await p.setViewport({ width, height: 900 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
    await p.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) { } });
    await p.goto('file://' + page_, { waitUntil: 'load' });
    if (rm) { // nothing may autoplay under reduced motion: scroll the animations into view and check the step stays at 0
      for (const id of ['pe-br', 'pe-pa']) {
        await p.click('button[data-t=t-read]');
        await p.$eval('#' + id, el => el.scrollIntoView()); await new Promise(r => setTimeout(r, 3500));
        const v = await p.$eval('#' + id + ' .an-ctl input[type=range]', e => e.value); if (v !== '0') { errs.push(id + ' autoplayed under reduced motion (step ' + v + ')') }
      }
      console.log('reduced motion', errs.length ? errs : 'no autoplay'); problems += errs.length; await p.close(); continue;
    }
    const tabs = await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t));
    for (const t of tabs) {
      await p.click(`button[data-t=${t}]`); await new Promise(r => setTimeout(r, 150));
      // buttons (skip tab buttons and links), then selects, then ranges, then checkboxes, inside the tab
      const nb = await p.$$eval(`#${t} button`, bs => bs.length);
      for (let i = 0; i < nb; i++) {
        const ok = await p.evaluate((t, i) => { const x = document.querySelectorAll('#' + t + ' button')[i]; if (!x || x.disabled || x.offsetParent === null) return false; x.click(); return true }, t, i);
        if (ok) actions++;
      }
      // open all details so their content renders and is scanned
      await p.$$eval(`#${t} details`, ds => ds.forEach(d => d.open = true));
      const sels = await p.$$eval(`#${t} select`, ss => ss.map(s => [s.id, [...s.options].map(o => o.value)]));
      for (const [id, vals] of sels) {
        if (!id) continue;
        for (const v of vals) {
          await p.select('#' + id, v); actions++;
          // after each choice, click the mode buttons next to it (methods) and step the animation to its end
          await p.evaluate((t) => { document.querySelectorAll('#' + t + ' .pe-modes button').forEach(x => { if (!x.disabled) x.click() }); document.querySelectorAll('#' + t + ' .an-ctl').forEach(c => { const f = c.querySelector('button[aria-label="Next step"]'); for (let k = 0; k < 9; k++) f && f.click() }) }, t);
          const m = await bad(p, t); if (m) errs.push(`${t} ${scheme} ${width} select ${id}=${v}: ${m}`);
        }
      }
      const ranges = await p.$$eval(`#${t} input[type=range]`, rs => rs.map(r => [r.id, r.min, r.max]));
      for (const [id, mn, mx] of ranges) {
        if (!id) continue;
        for (const v of [mn, mx, String(Math.round((+mn + +mx) / 2))]) {
          await p.$eval('#' + id, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })) }, v); actions++;
          const m = await bad(p, t); if (m) errs.push(`${t} ${scheme} ${width} range ${id}=${v}: ${m}`);
        }
      }
      const nums = await p.$$eval(`#${t} input[type=number]`, rs => rs.map(r => r.id));
      for (const id of nums) for (const v of ['3', '100000', '0']) { await p.$eval('#' + id, (el, v) => { el.value = v; el.dispatchEvent(new Event('input', { bubbles: true })) }, v); actions++ }
      const nc = await p.$$eval(`#${t} input[type=checkbox]`, cs => cs.length);
      for (let i = 0; i < nc; i++) { await p.evaluate((t, i) => { const x = document.querySelectorAll('#' + t + ' input[type=checkbox]')[i]; if (x) x.click() }, t, i); actions++ }
      for (let i = 0; i < nc; i++) { await p.evaluate((t, i) => { const x = document.querySelectorAll('#' + t + ' input[type=checkbox]')[i]; if (x) x.click() }, t, i) }
      const m = await bad(p, t); if (m) errs.push(`${t} ${scheme} ${width}: ${m}`);
      if (await side(p)) errs.push(`${t} ${scheme} ${width}: sideways scroll ${await p.evaluate(() => document.documentElement.scrollWidth)}`);
      await p.screenshot({ path: path.join(shots, `c-${t}-${scheme}-${width}.png`), fullPage: true });
    }
    const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push('jsErr: ' + box);
    console.log(scheme, width, errs.length ? errs : 'clean'); problems += errs.length; await p.close();
  }
} finally { await b.close() }
console.log('actions', actions, 'problems', problems); process.exit(problems ? 1 : 0);
