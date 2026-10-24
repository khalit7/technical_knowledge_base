// Screenshot every Reading figure card at 390 px dark and 920 px light into ../.shots/fig_*.png (run from anywhere).
import { createRequire } from 'module';
import path from 'path'; import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = path.resolve(here, '../.shots');
const ids = ['pe-hero', 'pe-ea', 'pe-gs', 'ga', 'fr', 'pe-smp', 'pe-exp', 'pe-drift'];
const b = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await b.newPage(); await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file, { waitUntil: 'load' }); await new Promise(r => setTimeout(r, 300));
  for (const id of ids) { const el = await p.$('#' + id); if (!el) { console.log('missing', id); continue }
    await el.scrollIntoView(); await new Promise(r => setTimeout(r, 150)); await el.screenshot({ path: `${shots}/fig_${w}_${id}.png` }) }
  // the stepper at its third step
  await p.click('#pe-ea-ctl-f'); await p.click('#pe-ea-ctl-f');
  await (await p.$('#pe-ea')).screenshot({ path: `${shots}/fig_${w}_pe-ea_s3.png` });
  const img = await p.$('.pe-img'); await img.scrollIntoView(); await new Promise(r => setTimeout(r, 300)); await img.screenshot({ path: `${shots}/fig_${w}_img.png` });
  await p.close();
}
await b.close();
