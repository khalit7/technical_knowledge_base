// Exercise every control of the page in headless Chrome (light 920, dark 390), scan for NaN, undefined, Infinity or errors,
// check a few numbers the text quotes, and screenshot the visuals.
// usage: node src/check_page.mjs [outdir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.resolve(here, '../index.html');
const out = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' });
const bad = []; let actions = 0;
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  p.on('pageerror', e => bad.push(scheme + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') bad.push(scheme + ' console ' + m.text()) });
  await p.setViewport({ width, height: 1000, deviceScaleFactor: 1 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + file);
  const clk = async sel => { await p.$eval(sel, e => e.click()); actions++ };
  const clkAll = async (sel, after) => { const n = await p.$$eval(sel, es => es.length); for (let i = 0; i < n; i++) { await p.$$eval(sel, (es, i) => es[i].dispatchEvent(new MouseEvent("click", { bubbles: true })), i); actions++; if (after) await after(i) } };
  const setv = async (sel, v) => { await p.$eval(sel, (e, v) => { if (e.type === 'checkbox') e.checked = v; else e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); e.dispatchEvent(new Event('change', { bubbles: true })) }, v); actions++ };
  const scan = async (sel, what) => { const t = await p.$eval(sel, e => e.innerText); const m = t.match(/.{0,40}(NaN|undefined|Infinity|\bnull\b).{0,20}/); if (m) bad.push(`${scheme} ${what}: ${m[0]}`) };
  const step = async (ctl, card, what) => { const n = await p.$eval(`#${ctl}-s`, e => +e.max); for (let i = 0; i <= n; i++) { await setv(`#${ctl}-s`, i); await scan('#' + card, `${what} step ${i}`) } return n };
  await clk('button[data-t=t-read]');
  await clkAll('#granLang button', async i => { await scan('#gran', 'gran ' + i) });
  await clkAll('#granRows .trow', async i => { await scan('#gran', 'gran row ' + i) });
  // trainer: every mode, every step
  const counts = {};
  for (const m of ['bpe', 'wp', 'ug']) { await clk(`#trnMode button[data-m=${m}]`); counts[m] = await step('trnCtl', 'trn', 'train ' + m) }
  if (counts.bpe !== 25 || counts.wp !== 25 || counts.ug !== 11) bad.push(`${scheme} trainer steps ${JSON.stringify(counts)} (want 25, 25, 11)`);
  // WordPiece first merge is ('a','##b') as in the course
  await clk('#trnMode button[data-m=wp]'); await setv('#trnCtl-s', 1);
  const cap = await p.$eval('#trnCap', e => e.innerText); if (!/a \+ ##b → ab/.test(cap)) bad.push(scheme + ' wp first merge caption: ' + cap.slice(0, 80));
  await setv('#encIn', 'unhuggable naïve façade 🙂 12,345'); await scan('#encBox', 'encode');
  // retrain on a custom corpus, then reset
  await p.$eval('details:has(#trnText)', e => e.open = true);
  await p.$eval('#trnText', e => { e.value = 'low lower lowest newer newest wider widest\nCafé naïve façade déjà vu 🙂🙂\nПривет мир привет всем\n日本語のテキスト'; });
  await setv('#trnBpeN', 40); await setv('#trnWpN', 90); await setv('#trnUgN', 60); await clk('#trnGo');
  for (const m of ['bpe', 'wp', 'ug']) { await clk(`#trnMode button[data-m=${m}]`); await step('trnCtl', 'trn', 'custom ' + m) }
  await scan('#encBox', 'encode custom');
  await clk('#trnReset');
  await clkAll('#failCase button', async i => { await scan('#fail', 'fail ' + i) });
  await step('patchCtl', 'patch', 'patch');
  await scan('#taxMini', 'tax');
  if (scheme === 'light') { for (const id of ['gran', 'trn', 'encBox', 'taxMini', 'fail', 'patch']) { const el = await p.$('#' + id); await el.screenshot({ path: `${out}/el-${id}-${scheme}.png` }) } }
  // tab: languages
  await clk('button[data-t=t-lang]');
  await clkAll('#lsPick button', async i => { await scan('#lsCard', 'ls ' + i) });
  const opts = await p.$$eval('#lfA option', es => es.map(e => e.value));
  for (const a of opts) { await setv('#lfA', a); await scan('#lfCard', 'lf ' + a) }
  for (const s of ['a', 'd', 'n']) { await setv('#lfS', s); await scan('#lfCard', 'lf sort ' + s) }
  await setv('#lfQ', 'arab'); await scan('#lfCard', 'lf search'); await setv('#lfQ', 'zzzz'); await scan('#lfCard', 'lf none'); await setv('#lfQ', '');
  await setv('#lfA', 'cl100k'); await setv('#lfB', 'o200k');
  const g4 = await p.$eval('#g4Note', e => e.innerText); if (!/^18 of 20/.test(g4)) bad.push(scheme + ' g4o: ' + g4.slice(0, 40));
  if (scheme === 'light') { await clk('#lsPick button[data-c=tam_Taml]'); for (const id of ['lsCard', 'lfCard', 'g4Card']) { const el = await p.$('#' + id); await el.screenshot({ path: `${out}/el-${id}-${scheme}.png` }) } }
  // tab: vocabulary
  await clk('button[data-t=t-voc]');
  await clkAll('#vtPlot circle', async i => { if (i % 5 === 0) await scan('#vtCard', 'vt ' + i) });
  await p.$eval('details:has(#vtTab)', e => e.open = true);
  await clkAll('#vtTab tr[data-i] td:first-child', null); await scan('#vtCard', 'vt rows');
  const gem = await p.$eval('#vcOut', e => e.innerText); if (!/167\.8M/.test(gem) || !/62\.6%/.test(gem)) bad.push(scheme + ' calc default: ' + gem.replace(/\s+/g, ' ').slice(0, 120));
  for (const v of [0, 25, 50, 100]) { await setv('#vcV', v); await scan('#vcCard', 'calc ' + v) }
  for (const d of ['576', '4096', '7168']) { await setv('#vcD', d); await setv('#vcT', false); await scan('#vcCard', 'calc d ' + d) }
  await setv('#vcR', ''); await scan('#vcCard', 'calc empty');
  const ls = await p.$$eval('#vsL option', es => es.map(e => e.value));
  for (const l of ls.slice(0, 6).concat(['eng_Latn', 'shn_Mymr'])) { await setv('#vsL', l); await scan('#vsCard', 'vs ' + l) }
  await setv('#vsL', 'all');
  if (scheme === 'light') { for (const id of ['vtCard', 'veCard', 'vcCard', 'vsCard']) { const el = await p.$('#' + id); await el.screenshot({ path: `${out}/el-${id}-${scheme}.png` }) } }
  else { for (const id of ['vtCard', 'vsCard']) { const el = await p.$('#' + id); await el.screenshot({ path: `${out}/el-${id}-${scheme}.png` }) } await clk('button[data-t=t-read]'); for (const id of ['trn', 'fail', 'patch']) { const el = await p.$('#' + id); await el.screenshot({ path: `${out}/el-${id}-${scheme}.png` }) } }
  const err = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent); if (err) bad.push(scheme + ' jsErr ' + err);
  await p.close();
}
await b.close();
console.log(`check_page: ${actions} actions, ${bad.length} problems`); bad.slice(0, 40).forEach(x => console.log('  ' + x));
process.exit(bad.length ? 1 : 0);
