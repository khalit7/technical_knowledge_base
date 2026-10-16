// Screenshot every card (.rd-card, .card) of one tab: node cards.mjs <index.html> <tab> <dark|light> <width> <outdir> [step]
// [step]: press each card's "next step" button that many times first. One browser, closed at the end.
import { createRequire } from 'module';
const require = createRequire(new URL('../../../../../../html_utils/package.json', import.meta.url));
const puppeteer = require('puppeteer');
const [f, tab, scheme, width, out, step] = process.argv.slice(2);
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
try {
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: +width, height: 900 });
  const errs = []; page.on('pageerror', e => errs.push(e.message));
  await page.goto('file://' + f);
  await page.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), tab);
  const ids = await page.evaluate(t => [...document.querySelectorAll('#' + t + ' .rd-card[id], #' + t + ' .card[id]')].map(e => e.id), tab);
  for (const id of ids) {
    if (step) await page.evaluate((id, n) => { const b = document.querySelector('#' + id + ' button[aria-label="Next step"]'); for (let i = 0; i < n && b; i++) b.click(); }, id, +step);
    const el = await page.$('#' + id); await el.scrollIntoView(); await new Promise(r => setTimeout(r, 150));
    await el.screenshot({ path: out + '/' + id + '-' + scheme + '-' + width + (step ? '-s' + step : '') + '.png' });
  }
  console.log('cards', ids.length, 'errors', JSON.stringify(errs));
} finally { await browser.close(); }
