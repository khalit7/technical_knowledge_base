// shoot_cards.mjs: element screenshots of every card, for looking at the visuals. node shoot_cards.mjs <index.html> [width] [scheme]
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const [file, width = 920, scheme = 'light'] = process.argv.slice(2);
const out = path.resolve(path.dirname(file), '.shots'); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
try {
  const p = await b.newPage(); await p.setViewport({ width: +width, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(file));
  // every visual now sits in the Reading tab (2026-10-23); cards inside closed details are opened first
  const cards = { 't-read': ['fo-hero', 'fo-mk-card', 'mk-sw-card', 'mk-card', 'ob-card', 'fo-lk-card', 'mk-at-card', 'df-f-card', 'fo-md-card', 'fo-jt-card', 'mt-card', 'mt-calc', 'mt-tr-card', 'df-card', 'df-q-card', 'df-t-card'] };
  for (const [t, ids] of Object.entries(cards)) {
    await p.click(`#tabs button[data-t=${t}]`); await new Promise(r => setTimeout(r, 300));
    for (const id of ids) {
      await p.evaluate(id => { const c = document.getElementById(id); const d = c.closest('details'); if (d) d.open = true; c.scrollIntoView(); const f = c.querySelector('[id$="-f"]'); if (f) for (let k = 0; k < 6; k++) f.click() }, id);
      await new Promise(r => setTimeout(r, 150));
      const el = await p.$('#' + id); await el.screenshot({ path: path.join(out, `card_${id}_${scheme}_${width}.png`) });
    }
  }
} finally { await b.close(); }
