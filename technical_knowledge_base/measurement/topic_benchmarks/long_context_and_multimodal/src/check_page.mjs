// Exercise every control at 390 dark and 920 light; compare JS numbers with recompute_out.json; screenshot cards.
// usage: node src/check_page.mjs   (from the page folder or anywhere)
import { createRequire } from 'node:module';
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../index.html'), shots = path.resolve(here, '../.shots');
const R = JSON.parse(fs.readFileSync(path.resolve(here, 'recompute_out.json'), 'utf8'));
const b = await puppeteer.launch({ headless: 'shell' });
let problems = [];
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page);
  await p.click('button[data-t=t-read]');
  const bad = async (where) => { const t = await p.evaluate(() => document.body.innerText); for (const w of ['NaN', 'undefined', 'Infinity']) if (t.includes(w)) problems.push(`${scheme}${width} ${where}: text contains ${w}`) };
  // NoLiMa animation: every mode, mc on/off, every step
  for (const m of ['direct', 'one', 'two']) for (const mc of [false, true]) {
    await p.click(`#nb-mode button[data-m=${m}]`);
    const cur = await p.$eval('#nb-mc', e => e.checked); if (cur !== mc) await p.click('#nb-mc');
    for (let i = 0; i < 7; i++) { await p.$eval('#nb-ctl-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, i) }
    await bad('nolima ' + m + mc);
    const acc = await p.$eval('#nb-out', e => e.innerText);
    if (width === 920 && m === 'one' && !mc) { const el = await p.$('#nb-card'); await el.screenshot({ path: shots + `/c-nolima-one-${scheme}-${width}.png` }) }
    if (width === 390 && m === 'two' && mc) { const el = await p.$('#nb-card'); await el.screenshot({ path: shots + `/c-nolima-two-mc-${scheme}-${width}.png` }) }
  }
  // overlap function vs recompute
  const ov = await p.evaluate(() => Object.fromEntries(Object.entries(LD.pairs).map(([k, v]) => [k, LC_overlap(v.q, v.needle)])));
  for (const k in ov) if (ov[k].hits.length !== R.overlap[k].content_hits.length || ov[k].qc.length !== R.overlap[k].q_content.length) problems.push('overlap mismatch ' + k);
  // MMMU animation
  for (const m of ['blind', 'pro']) {
    await p.click(`#mm-mode button[data-m=${m}]`);
    const opts = await p.$$eval('#mm-model option', o => o.map(x => x.value));
    for (const o of opts) { await p.select('#mm-model', o); const n = await p.$eval('#mm-ctl-s', e => +e.max); for (let i = 0; i <= n; i++) await p.$eval('#mm-ctl-s', (e, i) => { e.value = i; e.dispatchEvent(new Event('input')) }, i); await bad('mm ' + m + o) }
    await p.select('#mm-model', opts[0]); await p.$eval('#mm-ctl-s', e => { e.value = e.max; e.dispatchEvent(new Event('input')) });
    const el = await p.$('#mm-card'); await el.screenshot({ path: shots + `/c-mm-${m}-${scheme}-${width}.png` });
  }
  // lost in the middle
  const lo = await p.$$eval('#litm-m option', o => o.map(x => x.value));
  for (const o of lo) { await p.select('#litm-m', o); await bad('litm ' + o) }
  await p.select('#litm-m', '0'); { const el = await p.$('#litm-card'); await el.screenshot({ path: shots + `/c-litm-${scheme}-${width}.png` }) }
  { const el = await p.$('#niah-pair'); await el.screenshot({ path: shots + `/c-niah-${scheme}-${width}.png` }) }
  // effective length: JS rule vs recompute
  await p.click('button[data-t=t-eff]');
  const js = await p.evaluate(() => ({ r: LC_eff.eff('ruler', 'abs', 85.6), n: LC_eff.eff('nolima', 'rel', 85) }));
  const lab = (e, ge, lo) => e == null ? lo : (ge ? '≥' : '') + (e >= 1024 ? e / 1024 + 'M' : e + 'K');
  js.r.forEach(([m, e, ge], i) => { const want = R.ruler_eff[i].last.replace('>', '≥'); if (lab(e, ge, '<4K') !== want) problems.push('ruler eff ' + m + ' ' + lab(e, ge, '<4K') + ' vs ' + want) });
  js.n.forEach(([m, e, ge], i) => { const want = R.nolima_eff[i].last; const got = lab(e, false, '<1K'); if (got !== want) problems.push('nolima eff ' + m + ' ' + got + ' vs ' + want) });
  for (const bm of ['ruler', 'nolima']) for (const rule of ['abs', 'rel']) {
    await p.click(`#ef-b button[data-m=${bm}]`); await p.click(`#ef-r button[data-m=${rule}]`);
    for (const v of [50, 70, 85, 99]) { await p.$eval('#ef-t', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await bad('eff ' + bm + rule + v) }
    await p.click('#ef-reset');
    for (const k of [-1, 3]) { const rows = await p.$$('#ef-dumb g.effrow'); await rows[k < 0 ? rows.length - 1 : k].click() }
    await bad('eff click ' + bm);
  }
  await p.click('#ef-b button[data-m=nolima]'); await p.click('#ef-reset');
  { const el = await p.$('#t-eff'); await el.screenshot({ path: shots + `/c-eff-nolima-${scheme}-${width}.png` }) }
  // MRCR: presets vs Python
  await p.click('button[data-t=t-mrcr]');
  const btns = await p.$$('#mr-cands button');
  const keys = ['correct', 'other_needle', 'no_prefix', 'same_format_other_topic', 'first_half', 'with_preamble'];
  for (let k = 0; k < btns.length; k++) { await btns[k].click(); const s = await p.evaluate(() => MRCRgrade(document.getElementById('mr-resp').value, LD.mrcr.prefix + LD.mrcr.texts.target, LD.mrcr.prefix).score);
    if (Math.abs(s - R.mrcr_grades[keys[k]]) > 1e-6) problems.push('mrcr ' + keys[k] + ' ' + s + ' vs ' + R.mrcr_grades[keys[k]]) }
  await p.$eval('#mr-resp', e => { e.value = e.value.slice(0, 300); e.dispatchEvent(new Event('input')) }); await bad('mrcr edit');
  for (const i of [0, 1, 2, 3, 14, 56, 73]) { await p.click(`#mr-map span[data-i="${i}"]`); await bad('mrcr map ' + i) }
  await p.click('#mr-cands button'); { const el = await p.$('#t-mrcr'); await el.screenshot({ path: shots + `/c-mrcr-${scheme}-${width}.png` }) }
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (sw) problems.push(scheme + width + ' sideways scroll');
  const box = await p.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' }); if (box) problems.push('errbox: ' + box);
  if (errs.length) problems.push(scheme + width + ' errors ' + errs.join(' | '));
  await p.close();
}
await b.close();
console.log(problems.length ? problems.join('\n') : 'all controls ok, JS matches recompute_out.json');
