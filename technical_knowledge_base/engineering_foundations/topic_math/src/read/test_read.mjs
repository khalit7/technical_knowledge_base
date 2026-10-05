// Exercise every Reading-tab control at 390 dark and 920 light; collect the text each animation shows at each step.
// usage (from html_utils, so puppeteer resolves): node ../technical_knowledge_base/engineering_foundations/topic_math/src/read/test_read.mjs <index.html> <outdir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.join(process.cwd(), 'package.json'));
const puppeteer = require('puppeteer');
const [file, outdir] = process.argv.slice(2);
fs.mkdirSync(outdir, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const report = {};
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + path.resolve(file));
  await p.click('button[data-t=t-read]'); await new Promise(r => setTimeout(r, 300));
  const texts = [];
  const grab = async (tag) => { const t = await p.evaluate(() => [...document.querySelectorAll('#t-read .an-cap, #t-read .an-cnt, #t-read .out, #t-read .rd-svg')].map(e => e.textContent).join(' | ')); texts.push(tag + ' :: ' + t); };
  const anims = [['rd-mv', null], ['rd-sm', 'rd-sm-seg'], ['rd-st', 'rd-st-seg'], ['rd-lr', 'rd-lr-seg'], ['rd-ns', 'rd-ns-seg']];
  for (const [id, seg] of anims) {
    const modes = seg ? await p.$$eval('#' + seg + ' button', bs => bs.map(x => x.dataset.m)) : [null];
    for (const m of modes) {
      if (m) await p.click(`#${seg} button[data-m="${m}"]`);
      await new Promise(r => setTimeout(r, 50));
      const n = await p.$eval(`#${id}-ctl-s`, s => +s.max + 1);
      for (let i = 0; i < n; i++) {
        if (i > 0) await p.click(`#${id}-ctl-f`);
        const t = await p.evaluate(id => document.getElementById(id + '-cap').textContent + ' || ' + (document.getElementById(id + '-cnt') || { textContent: '' }).textContent + ' || ' + document.getElementById(id + '-svg').textContent, id);
        texts.push(`${id} mode=${m} step=${i}: ${t}`);
      }
      await p.click(`#${id}-ctl-b`); await p.click(`#${id}-ctl-p`); await new Promise(r => setTimeout(r, 30)); await p.click(`#${id}-ctl-p`);
      await p.$eval(`#${id}-ctl-s`, s => { s.value = 1; s.dispatchEvent(new Event('input')) });
      await p.select(`#${id}-ctl-v`, '2');
    }
  }
  for (const v of ['-3', '0', '2.5', '5']) {
    await p.$eval('#rd-sl-r', (r, v) => { r.value = v; r.dispatchEvent(new Event('input')) }, v);
    texts.push('slope z=' + v + ': ' + await p.$eval('#rd-sl-out', e => e.textContent));
  }
  for (const d of await p.$$('#t-read details summary')) await d.click();
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  const bad = texts.filter(t => /NaN|undefined|Infinity/.test(t));
  await p.screenshot({ path: `${outdir}/read-${scheme}-${width}.png`, fullPage: true });
  await p.click('button[data-t=t-more]'); await new Promise(r => setTimeout(r, 200));
  await (await p.$('#t-more')).screenshot({ path: `${outdir}/more-${scheme}-${width}.png` });
  const sw2 = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  report[`${scheme}-${width}`] = { errs, sideways: sw || sw2, bad };
  fs.writeFileSync(`${outdir}/texts-${scheme}-${width}.txt`, texts.join('\n'));
  await p.close();
}
await b.close();
console.log(JSON.stringify(report, null, 1));
