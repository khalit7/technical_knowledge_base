// node src/check_controls.mjs <index.html>  (run from the repo root; puppeteer from html_utils)
// Clicks every control of every tab at 390 px dark and 920 px light; fails on page or console errors, a visible
// #jsErr, sideways scroll, or NaN / undefined / Infinity in a tab's text. Then: each 2D animation plays once in view, none under reduced motion.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(process.argv[2]);
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let bad = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
async function sweep(p, t) {
  await p.click(`button[data-t=${t}]`); await sleep(150);
  await p.evaluate(async (t) => {
    const tab = document.getElementById(t), wait = ms => new Promise(r => setTimeout(r, ms));
    const fire = (el, ev) => el.dispatchEvent(new Event(ev, { bubbles: true }));
    for (const btn of [...tab.querySelectorAll('button')]) { if (btn.closest('.an-ctl') && /Play|Pause/.test(btn.textContent)) continue; btn.click(); await wait(5); }
    for (const r of [...tab.querySelectorAll('input[type=range]')]) { for (const v of [r.min, r.max, (+r.min + +r.max) / 2]) { r.value = v; fire(r, 'input'); await wait(5); } }
    for (const s of [...tab.querySelectorAll('select')]) { for (const o of [...s.options]) { s.value = o.value; fire(s, 'change'); await wait(5);
      for (const btn of [...tab.querySelectorAll('.tzd-opts button')].slice(0, 1)) btn.click(); } }
    for (let i = 0; i < 12; i++) { const n = document.getElementById('tzd-next'); if (t === 't-drill' && n) { n.click(); tab.querySelector('.tzd-opts button')?.click(); } }
    for (const btn of [...tab.querySelectorAll('.an-ctl button')]) if (/Play/.test(btn.textContent)) { btn.click(); await wait(30); btn.click(); }
  }, t);
  await sleep(200);
}
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await sleep(300);
  for (const t of await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t))) {
    await sweep(p, t);
    const txt = await p.$eval('#' + t, el => el.innerText);
    const m = txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b/);
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    if (m || side) errs.push(`${t} ${scheme} ${width}: ${m ? 'found ' + m[0] : ''} ${side ? 'sideways scroll' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); bad += errs.length; await p.close();
}
// motion (2026-11-06 rule, inverted from the old never-autoplay check): every 2D animation scrolled into view plays by itself
// (its play button reads Pause), and under reduced motion none moves (all paused, every scrubber on step 0). The 3D stages: check_stages.mjs
for (const rm of ['reduce', 'no-preference']) {
  const p = await b.newPage();
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: rm }]);
  await p.setViewport({ width: 920, height: 900 }); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await sleep(300);
  const ids = await p.$$eval('#t-read .an-ctl:not(.stg-bar)', cs => cs.map(c => c.id)), notPlaying = [];
  for (const id of ids) {
    await p.evaluate(id => document.getElementById(id).scrollIntoView({ block: 'center' }), id); await sleep(1600);
    const on = await p.$eval('#' + id + '-p', b => /Pause/.test(b.textContent)); if (!on) notPlaying.push(id);
  }
  if (rm === 'reduce') {
    const playing = await p.$$eval('.an-play', bs => bs.filter(x => /Pause/.test(x.textContent)).length);
    const moved = await p.$$eval('#t-read .an-ctl:not(.stg-bar) input[type=range]', rs => rs.filter(r => +r.value !== 0).length);
    console.log('reduced motion: animations playing =', playing, ', scrubbers off step 0 =', moved); if (playing || moved) bad++;
  } else { console.log('motion: ' + ids.length + ' animations, not playing when in view:', notPlaying.length ? notPlaying : 'none'); if (notPlaying.length) bad++; }
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
