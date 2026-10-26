// Every control of the page at 390 px dark and 920 px light, plus data and prose checks.
// Usage (from the repository root): node <page>/src/check_controls.mjs [shots dir]
// Fails on page errors, a visible #jsErr, sideways scroll, NaN/undefined/Infinity in the text,
// autoplay under reduced motion, an embedded output that differs from its out/ file, or a prose number
// that differs from src/ca/summary.json.
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = execSync('git rev-parse --show-toplevel', { cwd: HERE }).toString().trim();
const R = createRequire(path.join(ROOT, 'html_utils/package.json'));
const puppeteer = R('puppeteer');
const PAGE = path.resolve(HERE, '../index.html');
const SHOTS = process.argv[2];
const errs = [];
const html = fs.readFileSync(PAGE, 'utf8');

// 1. embedded outputs equal their files
const unesc = s => s.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#123;/g, '{').replace(/&#125;/g, '}').replace(/&amp;/g, '&');
let nOut = 0;
for (const m of html.matchAll(/<pre class="ca-out[^"]*" data-ca-out="([^"]+)">([\s\S]*?)<\/pre>(?:<details class="ca-more">[\s\S]*?data-ca-rest="[^"]+">([\s\S]*?)<\/pre>)?/g)) {
  const name = m[1], file = path.join(HERE, 'ca', name.includes('/') ? name + '.txt' : 'out/' + name + '.txt');
  const want = fs.readFileSync(file, 'utf8').replace(/\n+$/, '');
  const got = unesc(m[2]) + (m[3] !== undefined ? '\n' + unesc(m[3]) : '');
  if (got !== want) errs.push('embedded output differs: ' + name);
  nOut++;
}
// 2. every summary number the templates quote appears in the built page
const S = JSON.parse(fs.readFileSync(path.join(HERE, 'ca/summary.json'), 'utf8'));
const tpl = fs.readdirSync(path.join(HERE, 'ca/tpl')).map(f => fs.readFileSync(path.join(HERE, 'ca/tpl', f), 'utf8')).join('');
let nNum = 0;
for (const m of tpl.matchAll(/\[\[m:([^\]]+)\]\]/g)) { if (!(m[1] in S)) errs.push('missing summary key ' + m[1]); else if (!html.includes(S[m[1]])) errs.push('number not on page: ' + m[1]); nNum++; }

const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
// 3. no autoplay under reduced motion
{
  const p = await b.newPage();
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + PAGE);
  await new Promise(r => setTimeout(r, 2500));
  const step = await p.$eval('#ct-rng-ctl-s', s => s.value);
  if (step !== '0') errs.push('ranges stepper moved on its own');
  await p.close();
}
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  p.on('pageerror', e => errs.push(scheme + ' ' + e.message));
  p.on('console', m => m.type() === 'error' && errs.push(scheme + ' console ' + m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + PAGE);
  const tabs = await p.$$eval('button[data-t]', bs => bs.map(x => x.dataset.t));
  for (const t of tabs) {
    await p.click(`button[data-t=${t}]`);
    if (t === 't-read') {
      await p.$$eval('#t-read details', ds => ds.forEach(d => d.open = true));
      for (const m of ['s', 'o']) await p.click(`#ct-disp-seg button[data-m=${m}]`);
      for (let i = 0; i < 12; i++) await p.click('#ct-rng-ctl-f');
      const last = await p.$eval('#ct-rng-cap', e => e.textContent);
      if (!/filtered 4 counts, squared 2, never touched 3/.test(last)) errs.push('ranges stepper end state: ' + last);
      await p.click('#ct-rng-ctl-b');
      await p.select('#ct-rng-ctl-v', '2');
      await p.$eval('#ct-rng-ctl-s', s => { s.value = '3'; s.dispatchEvent(new Event('input')); });
      for (let v = 0; v <= 5; v++) await p.$eval('#ct-exc-r', (s, v) => { s.value = String(v); s.dispatchEvent(new Event('input')); }, v);
      if (SHOTS) {
        fs.mkdirSync(SHOTS, { recursive: true });
        for (const id of ['ct-hero', 'ct-disp-card', 'ct-grow', 'ct-rng-card', 'ct-exc-card', 'ct-depth', 'ct-s0']) {
          const el = await p.$('#' + id); if (el) await el.screenshot({ path: path.join(SHOTS, `${id}-${scheme}-${width}.png`) });
        }
      }
    }
    const bad = await p.$eval('#' + t, el => /\bNaN\b|\bundefined\b(?! behaviour)|\bInfinity\b/.test(el.innerText));
    const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    if (bad || side) errs.push(`${t} ${scheme} ${width}: ${bad ? 'NaN/undefined' : ''} ${side ? 'sideways' : ''}`);
  }
  const box = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (box) errs.push(box);
  await p.close();
}
await b.close();
console.log(`embedded outputs ${nOut}, prose numbers ${nNum}`);
if (errs.length) { console.log('PROBLEMS\n' + errs.join('\n')); process.exit(1); }
console.log('all checks passed');
