// Click every control of the Reading tab in 390 px dark and 920 px light: drills, case and wheel chips; open every closed block.
// Fails on page or console errors, a visible #jsErr, NaN/undefined/Infinity, sideways scroll or an empty terminal.
// (2026-11-07: the uv stepper became the 3D stage of Fig. 2, which now plays when scrolled into view; check_stages.mjs checks its motion.)
// Run from the repo root: node <page>/src/check_controls.mjs <page>/index.html
import { createRequire } from 'node:module'; import path from 'node:path'; import { execSync } from 'node:child_process';
const root = execSync('git rev-parse --show-toplevel').toString().trim();
const R = createRequire(path.join(root, 'html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fails = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  const res = await p.evaluate(async () => {
    const out = []; const wait = ms => new Promise(r => setTimeout(r, ms));
    document.querySelectorAll('#t-read details').forEach(d => d.open = true);
    for (const id of ['tk-drill-t1', 'pb-drill-ruff', 'pb-drill-pt']) {
      const bs = [...document.querySelectorAll('#' + id + ' .opts button')]; if (!bs.length) out.push('no options in ' + id);
      for (const x of bs) { x.click(); await wait(10); }
      if (document.querySelector('#' + id + ' .ans').hidden) out.push('answer hidden in ' + id);
    }
    const chips = [...document.querySelectorAll('#pb-tc-chips button')]; if (chips.length !== 8) out.push('case chips ' + chips.length);
    for (const c of chips) { c.click(); await wait(10); document.querySelector('#pb-tc-drill .opts button').click(); await wait(10);
      if (!document.querySelector('#pb-tc-out .pb-term')) out.push('no checker output for ' + c.textContent); }
    const wc = [...document.querySelectorAll('#pb-wh-chips button')]; if (wc.length < 5) out.push('wheel chips ' + wc.length);
    for (const c of wc) { c.click(); await wait(10); if (!document.querySelector('#pb-wh-parts .kv')) out.push('no wheel parts'); }
    const f = document.getElementById('stg-uv-f'); for (let i = 0; i < 12; i++) { f.click(); await wait(5); }
    if (!/uv sync && uv run/.test(document.getElementById('pb-sync-term').textContent)) out.push('the uv terminal does not follow Fig. 2 to its last step');
    document.querySelectorAll('#t-read .pb-term').forEach((t, i) => { if (!t.textContent.trim() || /output missing/.test(t.textContent)) out.push('empty terminal ' + i); });
    if (/\bNaN\b|\bundefined\b|\bInfinity\b/.test(document.getElementById('t-read').innerText.replace(/possibly-undefined/g, ''))) out.push('NaN/undefined in text');
    if (document.documentElement.scrollWidth > innerWidth) out.push('sideways scroll');
    return out;
  });
  errs.push(...res);
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  console.log(scheme, width, errs.length ? errs : 'clean'); fails += errs.length; await p.close();
}
await b.close(); process.exit(fails ? 1 : 0);
