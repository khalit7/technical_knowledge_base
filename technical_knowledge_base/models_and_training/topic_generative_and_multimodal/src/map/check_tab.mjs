// Exercise every control of the Model map tab at 390 dark and 920 light; report errors, NaN/undefined text and
// sideways scroll; save section screenshots. Usage: node check_tab.mjs <index.html> <shots dir>
import { createRequire } from 'module';
import path from 'path';
const require = createRequire(path.resolve(process.cwd(), '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, shots] = process.argv.slice(2);
const browser = await puppeteer.launch({ headless: 'shell' });
let bad = 0;
try {
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const page = await browser.newPage(); const errs = [];
  page.on('pageerror', e => errs.push(e.message)); page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await page.setViewport({ width: w, height: 900 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.goto('file://' + path.resolve(file));
  await page.click('#tabs button[data-t="t-map"]');
  await new Promise(r => setTimeout(r, 400));
  const clickAll = async sel => { const n = await page.$$eval(sel, e => e.length); for (let i = 0; i < n; i++) { await page.$$eval(sel, (e, i) => e[i] && e[i].dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true })), i); } return n };
  const c = {};
  c.legend = await clickAll('#mm-leg button'); c.legend2 = await clickAll('#mm-leg button');
  c.dots = await clickAll('#mm-tl .mm-pt');
  for (const id of ['mm-tl-ctl', 'mm-st-ctl']) { for (const s of ['b', 'f', 'f', 'p', 'p', 'b']) await page.$eval('#' + id + '-' + s, e => e.click()); await page.$eval('#' + id + '-v', e => { e.value = '2'; e.dispatchEvent(new Event('change')) }); }
  await page.$eval('#mm-tl-ctl-s', e => { e.value = 2; e.dispatchEvent(new Event('input')) });
  c.modes = await clickAll('#mm-stack-mode button');
  for (let k = 0; k < 6; k++) await page.$eval('#mm-st-ctl-f', e => e.click());
  await page.$eval('#mm-stack-mode button[data-m="t2i"]', e => e.click());
  for (let k = 0; k < 6; k++) await page.$eval('#mm-st-ctl-f', e => e.click());
  for (const f of ['mm-f-cat', 'mm-f-acc', 'mm-f-st']) c[f] = await clickAll('#' + f + ' button');
  for (const f of ['mm-f-cat', 'mm-f-acc', 'mm-f-st']) await page.$eval('#' + f + ' button[data-v="all"]', e => e.click());
  c.sort = await clickAll('#mm-tab th[data-k]'); await clickAll('#mm-tab th[data-k]');
  await page.type('#mm-q', 'flux'); await page.$eval('#mm-q', e => { e.value = ''; e.dispatchEvent(new Event('input')) });
  c.rows = await clickAll('#mm-tab tbody tr[data-id]');
  let combos = 0;
  for (const job of await page.$$eval('#mm-p-job option', o => o.map(x => x.value)))
    for (const lic of ['any', 'small', 'osi']) for (const hw of ['16', '24', '80', 'api']) for (const q of ['2', '1', '0.5']) {
      await page.evaluate((j, l, h, q) => { for (const [id, v] of [['mm-p-job', j], ['mm-p-lic', l], ['mm-p-hw', h], ['mm-p-q', q]]) { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('change')) } }, job, lic, hw, q);
      combos++;
      const t = await page.$eval('#mm-p-out', e => e.innerText); if (/NaN|undefined/.test(t)) { errs.push('picker ' + job + lic + hw + q + ': ' + t.slice(0, 80)) }
    }
  c.combos = combos;
  c.rowLinks = await clickAll('#mm-p-out a[data-row]');
  const txt = await page.$eval('#t-map', e => e.innerText);
  const nan = (txt.match(/\bNaN\b|\bundefined\b|\bnull\b/g) || []).length;
  const side = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
  for (const id of ['mm-time-card', 'mm-stack-card', 'mm-s-table', 'mm-s-pick']) { const el = await page.$('#' + id); await el.screenshot({ path: path.join(shots, 'mm-' + id + '-' + scheme + '-' + w + '.png') }) }
  console.log(scheme, w, JSON.stringify(c), 'errors', JSON.stringify(errs), 'nan', nan, 'sideways', side);
  if (errs.length || nan || side) bad = 1;
  await page.close();
}
} finally { await browser.close(); }
process.exit(bad);
