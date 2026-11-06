// Drive every control of the built page in headless Chrome: no script errors, no NaN or undefined in any text; element screenshots in ../../.shots/.
// usage (from the page folder): node src/checks/check_page.mjs [light|dark] [width]   (needs html_utils' node_modules)
// Also checks that every animation plays by itself once scrolled into view (normal motion, 2026-11-06 rule) and that the page never scrolls sideways.
// The 3D stages and step lists have their own check: check_stages.mjs.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [scheme = 'light', width = '920'] = process.argv.slice(2);
const out = path.resolve(here, '../../.shots'), file = path.resolve(here, '../../index.html');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const p = await b.newPage(); const errs = [];
p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
await p.setViewport({ width: +width, height: 1000 });
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
await p.goto('file://' + file);
const wait = ms => new Promise(r => setTimeout(r, ms));
const bad = async (where) => { const t = await p.evaluate(() => document.body.innerText); const m = t.match(/.{0,40}(NaN|undefined|Infinity).{0,40}/g); if (m) errs.push(where + ': ' + m.slice(0, 3).join(' | ')) };
const shot = async (sel, name) => { const el = await p.$(sel); if (el) await el.screenshot({ path: path.join(out, name + '-' + scheme + '-' + width + '.png') }) };
const scrub = async (id, v) => p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v);
const slide = scrub;
const click = sel => p.evaluate(s => document.querySelector(s).click(), sel);
const txt = async id => p.evaluate(id => document.getElementById(id).innerText.replace(/\n+/g, ' / '), id);
const res = {};
// (the triad widget moved to Model-free prediction and control on 2026-10-24)
// target network
await p.evaluate(() => document.getElementById('vb-tn').scrollIntoView()); await wait(200);
for (const m of ['on', 'tn']) { await click(`#vb-tnM button[data-m=${m}]`);
  for (const c of [0, 1, 3, 6, 7]) { await slide('vb-tnC', c); for (const v of [0, 1, 2, 3, 4, 5]) { await scrub('vb-tnK-s', v); await bad(`tn ${m} C${c} ${v}`) } }
  await slide('vb-tnC', 3); await scrub('vb-tnK-s', 5); await wait(100); await shot('#vb-tn', 'tn-' + m); res['tn ' + m] = await txt('sx-tn') }
for (const d of [20, 50, 90]) { await slide('vb-tnD', d); await bad('tn d ' + d) } for (const a of [5, 50]) { await slide('vb-tnA', a); await bad('tn a ' + a) }
await slide('vb-tnD', 67); await slide('vb-tnA', 30);
await click('#vb-edM button[data-m=raw]'); await bad('ed raw'); await shot('#vb-ed', 'ed-raw'); await click('#vb-edM button[data-m=rel]'); await shot('#vb-ed', 'ed-rel');
// overestimation
await p.evaluate(() => document.getElementById('vb-ov').scrollIntoView()); await wait(200);
for (const f of ['sin|6', 'bump|6', 'bump|9']) { await click(`#vb-ovF button[data-f="${f}"]`); for (const v of [0, 1, 2, 3, 4, 5]) { await scrub('vb-ovC-s', v); await bad('ov ' + f + ' ' + v) }
  await shot('#vb-ov', 'ov-' + f.replace('|', '')); res['ov ' + f] = await txt('vb-ovN') }
for (const d of [3, 5, 8]) { await slide('vb-ovD', d); await bad('ov deg ' + d) }
// PER
for (const v of ['prop', 'rank']) { await click(`#vb-prV button[data-v=${v}]`); for (const [a, bb] of [[0, 0], [100, 100], [60, 40]]) { await slide('vb-prA', a); await slide('vb-prB', bb); await bad(`pr ${v} ${a} ${bb}`) } }
await slide('vb-prA', 60); await slide('vb-prB', 40); await click('#vb-prV button[data-v=prop]'); await shot('#vb-pr', 'pr'); res.pr = await txt('vb-prT');
// C51
await p.evaluate(() => document.getElementById('vb-c5').scrollIntoView()); await wait(200);
for (const m of ['eq7', 'alg1']) { await click(`#vb-c5M button[data-m=${m}]`); for (const n of ['11', '21', '51']) { await p.select('#vb-c5N', n); for (const v of [0, 2, 3, 4, 5]) { await scrub('vb-c5C-s', v); await bad(`c5 ${m} ${n} ${v}`) } } }
await p.select('#vb-c5N', '11'); await click('#vb-c5M button[data-m=alg1]'); await scrub('vb-c5C-s', 4); await shot('#vb-c5', 'c5-alg1'); res.c5alg1 = await txt('vb-c5K');
await click('#vb-c5Z'); await bad('c5 zero'); res.c5zero = await txt('vb-c5K'); await shot('#vb-c5', 'c5-zero');
await click('#vb-c5M button[data-m=eq7]'); await slide('vb-c5R', 10); await slide('vb-c5G', 90); await scrub('vb-c5C-s', 5); await shot('#vb-c5', 'c5-eq7'); res.c5eq7 = await txt('vb-c5K');
await shot('#vb-ev', 'ev'); await shot('#vb-abS', 'abS'); await shot('#vb-sd', 'sd');
// ablation (inline in Reading section 10 since 2026-10-24)
await p.evaluate(() => document.getElementById('vb-abl').scrollIntoView()); await wait(200); await bad('abl');
await p.evaluate(() => document.querySelectorAll('#rd-rainbow details').forEach(d => d.open = true));
for (const k of ['no double', 'no priority']) { await click(`#ab-k button[data-k="${k}"]`); await bad('abl ' + k) }
await click('#ab-s button[data-s=n]'); await bad('abl sort');
for (const c of ['hurt', 'k', 'clip']) { await click(`#ab-sum th[data-c=${c}]`); await bad('abl th ' + c) }
await p.select('#ab-g', '30'); await click('#ab-q button[data-g="30"]'); await bad('abl q'); res.ablq = await txt('ab-qA');
await shot('#vb-abl', 'abl');
// the 3D stages (hero, dueling, NoisyNet) and the n-step slider
await shot('#stg-hero', 'hero');
res.du = await txt('sx-du');
for (const n of [1, 3, 5, 12]) { await slide('vb-nsN', n); await bad('ns ' + n); res['ns ' + n] = await txt('vb-nsT') } await slide('vb-nsN', 3); await shot('#vb-ns', 'ns');
await click('#vb-nzR'); await bad('nz'); res.nz = await txt('sx-nz');
const side = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (side) errs.push('sideways scroll');
await click('button[data-t=t-more]'); await bad('more');
const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) errs.push('errbox: ' + box);
// autoplay on view under normal motion (Khalid, 2026-11-06): scroll every animation into view, wait, and check each has started playing
const q = await b.newPage(); await q.setViewport({ width: +width, height: 1000 }); await q.goto('file://' + file); await q.evaluate(() => document.querySelector('button[data-t=t-read]').click()); // the first pass left Further reading open (remembered)
const still = [];
for (const [id, c] of [['vb-tn', 'vb-tnK'], ['vb-ov', 'vb-ovC'], ['vb-c5', 'vb-c5C']]) { await q.evaluate(id => document.getElementById(id).scrollIntoView({ block: 'center' }), id); await wait(1500);
  if (await q.evaluate(c => document.getElementById(c + '-p').getAttribute('aria-label') !== 'Pause' && +document.getElementById(c + '-s').value === 0, c)) still.push(id) }
if (still.length) errs.push('did not play in view: ' + still.join(' ')); res.autoplay = still.length ? still : 'all play in view';
console.log(JSON.stringify({ errs, res }, null, 1));
await b.close();
