// Screenshot each visual of the Reading tab at 390 dark and 920 light, mid-animation, into ../.shots/card-*.png
import { createRequire } from 'node:module'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const cards = (process.argv[2] || 'rd-schema-card,rd-join-card,rd-win-card,rd-btree-card,rd-keys-card,rd-norm-card,rd-q-card,rd-n1-card,rd-inj-card').split(',');
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.join(here, '..', 'index.html')); await p.waitForFunction(() => window.SM && SM.S.SQL, { timeout: 20000 });
  for (const c of cards) {
    const el = await p.$('#' + c); if (!el) { console.log('missing', c); continue }
    await el.scrollIntoView(); await sleep(300);
    await p.evaluate(c => { const card = document.getElementById(c); const ctl = card.querySelector('.an-ctl'); if (ctl) { const r = document.getElementById(ctl.id + '-s'); r.value = Math.round(r.max * 0.6); r.dispatchEvent(new Event('input')) } }, c);
    await sleep(150); await el.screenshot({ path: path.join(here, '..', '.shots', `card-${c}-${scheme}-${width}.png`) });
  }
  // two runnable boxes
  for (const ex of (process.argv[3] || 'j_notin_null,js_ops').split(',')) { const el = await p.$(`.rq[data-ex="${ex}"]`); if (!el) continue; await el.scrollIntoView(); await sleep(400); await el.screenshot({ path: path.join(here, '..', '.shots', `box-${ex}-${scheme}-${width}.png`) }) }
  await p.close();
}
await b.close(); console.log('done');
