// Screenshots of each visual for review, at 390 px dark and 920 px light, into ../.shots/parts/.
// Run from the repo root: node technical_knowledge_base/measurement/topic_benchmarks/knowledge_and_reasoning/src/shots.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../index.html'), out = path.resolve(here, '../.shots/parts');
fs.mkdirSync(out, { recursive: true });
const SHOTS = [
  ['t-read', '#rd-one', null], ['t-read', '#rd-tools-card', null], ['t-read', '#rd-arc3-card', null], ['t-read', '#rd-sqa-card', null], ['t-read', '#rd-gpqa .card', null],
  ['t-key', '#ky-card', p => p.evaluate(() => { document.getElementById('ky-ctl-s').value = 3; document.getElementById('ky-ctl-s').dispatchEvent(new Event('input')) })],
  ['t-key', '#ky-card', p => p.evaluate(() => { document.querySelector('#ky-mode button[data-m=hle]').click(); const s = document.getElementById('ky-ctl-s'); s.value = 3; s.dispatchEvent(new Event('input')) }), 'hle'],
  ['t-key', '#ky-map', null],
  ['t-arc', '#ar-card', p => p.evaluate(() => { document.querySelector('#ar-rule button[data-m=up]').click(); const s = document.getElementById('ar-ctl-s'); s.value = 9; s.dispatchEvent(new Event('input')) })],
  ['t-arc', '#sv-card', null], ['t-arc', '#rh-card', null],
  ['t-grade', '#gr-virology_88', p => p.evaluate(() => document.querySelector('#gr-virology_88 .opts button[data-i="2"]').click())],
  ['t-grade', '#gr-sqa', null],
];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  for (const [tab, sel, act, tag] of SHOTS) {
    const p = await b.newPage();
    await p.setViewport({ width, height: 1000 });
    await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
    await p.goto('file://' + page);
    await p.click(`button[data-t=${tab}]`);
    await new Promise(r => setTimeout(r, 250));
    if (act) { await act(p); await new Promise(r => setTimeout(r, 900)) }
    const el = await p.$(sel); if (!el) { console.log('missing', sel); await p.close(); continue }
    await el.scrollIntoView();
    await el.screenshot({ path: path.join(out, `${tab}-${sel.replace(/[^a-z0-9]+/gi, '_')}${tag ? '-' + tag : ''}-${scheme}-${width}.png`) });
    await p.close();
  }
}
await b.close();
console.log('shots in', out);
