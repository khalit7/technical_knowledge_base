// Exercise every control of the page in headless Chrome, scan for NaN/undefined, and screenshot every Reading figure into ../.shots/ (x-<id>-<scheme>.png).
// Since 2026-11-10 the animations are 3D stages that play once in view (Khalid, 2026-11-06); check_stages.mjs checks their autoplay, steps and stillness under reduced motion.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_training_and_post_training/quantization_and_precision/src/check_page.mjs [outdir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../index.html');
const out = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const bad = [];
const FIGS = ['rd-hero', 'rd-fr', 'bx', 'stg-sc', 'rd-lyS', 'stg-gq', 'rd-lyF', 'stg-out', 'rd-mg', 'rd-lyW', 'rd-rt', 'rd-qt', 'stg-tr'];
for (const [scheme, width, motion] of [['light', 920, 'no-preference'], ['dark', 390, 'reduce']]) {
  const p = await b.newPage();
  p.on('pageerror', e => bad.push(scheme + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') bad.push(scheme + ' console ' + m.text()) });
  await p.setViewport({ width, height: 1000 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
  await p.goto('file://' + file);
  await p.$eval('button[data-t=t-read]', e => e.click());
  const clk = sel => p.$eval(sel, e => e.click());
  const setv = (sel, v) => p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v);
  const scan = async (sel, what) => { const t = await p.$eval(sel, e => e.innerText); const m = t.match(/.{0,40}\b(NaN|undefined|Infinity%|null)\b.{0,20}/); if (m) bad.push(`${scheme} ${what}: ${m[0]}`) };
  // the four stages: every step of each, through its step list
  for (const id of ['sx-sc', 'sx-gq', 'sx-out', 'sx-tr']) { const n = await p.$eval('#' + id, e => e.children.length);
    for (let k = 0; k < n; k++) { await p.evaluate((id, k) => document.getElementById(id).children[k].click(), id, k); await scan('#t-read', `${id} step ${k + 1}`) } }
  // the migration explorer: every method and α
  for (let m = 0; m < 4; m++) { await clk(`#rd-mgM button[data-i="${m}"]`); for (const a of [0, 0.25, 0.5, 0.75, 1]) { await setv('#rd-mgA', a); await scan('#rd-mg', `mig m${m} a${a}`) } }
  await clk('#rd-mgM button[data-i="1"]'); await setv('#rd-mgA', 0.5);
  // whole-layer scatter bands
  for (const bd of ['8', 'all', '4']) { await clk(`#rd-lyB button[data-m="${bd}"]`); await scan('#rd-lyS', 'scatter ' + bd) }
  // rotation: both modes, every token
  for (const m of ['hadamard', 'plain']) { await clk(`#rd-rtM button[data-m="${m}"]`); for (let t = 0; t < 16; t++) { await setv('#rd-rtTk', t); await scan('#rd-rt', `rot ${m} ${t}`) } }
  await setv('#rd-rtTk', 12);
  // training recipes (Fig. 10)
  for (const k of ['fp16', 'te', 'ds', 'nv', 'bf16']) { await clk(`#rd-trM button[data-m="${k}"]`); await scan('#rd-trC', 'train ' + k);
    const vis = await p.$$eval('#rd-trC .rd-trx', ds => ds.filter(d => !d.hidden).map(d => d.dataset.k)); if (vis.join() !== k) bad.push(`${scheme} train caption ${k}: ${vis}`) }
  // bit explorer and the block calculator (open its details first)
  const pres = await p.$$eval('#bxP button', o => o.map(x => x.dataset.v));
  for (const v of pres.concat(['-3', '0', '1e30', '1e-45', 'abc'])) { await setv('#bxV', v); await scan('#bx', 'bits ' + v) }
  await p.$$eval('#t-read details.dp', ds => ds.forEach(d => { d.open = true }));
  await new Promise(r => setTimeout(r, 200));
  for (const a of ['0.001', '6', '448', '1e-6']) { await setv('#bxA', a); await scan('#bxB', 'block A ' + a) }
  await setv('#bxV', '0.1'); await setv('#bxA', '1'); await setv('#bxS', -10); await scan('#bx', 'slider'); await setv('#bxV', '0.1');
  for (const id of ['rd-lyT', 'rd-lyAW', 'bxL']) await scan('#' + id, id);
  const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (side) bad.push(scheme + ' sideways scroll');
  for (const id of FIGS) { const el = await p.$('#' + id); await el.scrollIntoView(); await el.screenshot({ path: `${out}/x-${id}-${scheme}.png` }) }
  await (await p.$('#rd-lyAW')).screenshot({ path: `${out}/x-rd-lyAW-${scheme}.png` });
  await clk('button[data-t=t-more]'); await scan('#t-more', 'further reading');
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) bad.push(scheme + ' errbox ' + box);
  await p.close();
}
await b.close();
console.log(bad.length ? bad.join('\n') : 'all controls OK');
process.exit(bad.length ? 1 : 0);
