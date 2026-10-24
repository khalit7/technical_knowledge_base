// Normal motion: scroll through Reading, wait, and confirm no animation moved before the reader acted.
// usage (repo root): node <this> <index.html>
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell' });
try { const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'no-preference' }]);
  await p.goto('file://' + path.resolve(process.argv[2]));
  const H = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < H; y += 600) { await p.evaluate(y => scrollTo(0, y), y); await new Promise(r => setTimeout(r, 150)); }
  await new Promise(r => setTimeout(r, 2500));
  const r = await p.evaluate(() => [...document.querySelectorAll('input[type=range][id$="-s"]')].map(s => [s.id, s.value, s.parentElement.querySelector('button[aria-label="Pause"]') ? 'playing' : 'paused']));
  const moved = r.filter(x => x[2] === 'playing');
  console.log(JSON.stringify(r)); console.log(moved.length ? 'AUTOPLAY ' + moved.length : 'no autoplay');
} finally { await b.close() }
