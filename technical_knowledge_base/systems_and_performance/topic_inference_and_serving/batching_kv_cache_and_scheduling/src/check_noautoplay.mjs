// node src/check_noautoplay.mjs <index.html> (from the repo root): scrolls the Reading tab under normal motion and
// fails if any step animation has left step 0 or shows Pause without the reader acting.
import { createRequire } from 'node:module'; import path from 'node:path';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const b = await puppeteer.launch({ headless: 'shell' });
try { const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.goto('file://' + path.resolve(process.argv[2])); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.reload();
  const h = await p.evaluate(() => document.body.scrollHeight);
  for (let y = 0; y < h; y += 400) { await p.evaluate(y => scrollTo(0, y), y); await new Promise(r => setTimeout(r, 120)); }
  await new Promise(r => setTimeout(r, 3000));
  const moved = await p.evaluate(() => [...document.querySelectorAll('.an-ctl')].filter(c => { const s = c.querySelector('input[type=range]'), pl = c.querySelector('.an-play'); return (s && +s.value !== 0) || (pl && /Pause/.test(pl.textContent)) }).map(c => c.id));
  console.log(moved.length ? 'AUTOPLAY ' + moved.join(' ') : 'no animation moved by itself (' + await p.evaluate(() => document.querySelectorAll('.an-ctl').length) + ' checked)');
  process.exitCode = moved.length ? 1 : 0;
} finally { await b.close(); }
