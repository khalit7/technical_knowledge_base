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
  const cards = { 't-read': ['fo-mk-card', 'fo-lk-card', 'fo-md-card', 'fo-jt-card'], 't-mask': ['mk-card', 'mk-sw-card', 'mk-at-card'], 't-obj': ['ob-card'],
    't-mtp': ['mt-card', 'mt-calc', 'mt-tr-card'], 't-diff': ['df-card', 'df-q-card', 'df-f-card', 'df-t-card'] };
  for (const [t, ids] of Object.entries(cards)) {
    await p.click(`#tabs button[data-t=${t}]`); await new Promise(r => setTimeout(r, 300));
    for (const id of ids) {
      await p.evaluate(id => { const c = document.getElementById(id); c.scrollIntoView(); const f = c.querySelector('[id$="-f"]'); if (f) for (let k = 0; k < 6; k++) f.click() }, id);
      await new Promise(r => setTimeout(r, 150));
      const el = await p.$('#' + id); await el.screenshot({ path: path.join(out, `card_${id}_${scheme}_${width}.png`) });
    }
  }
} finally { await b.close(); }
