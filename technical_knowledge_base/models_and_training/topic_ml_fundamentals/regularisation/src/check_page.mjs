// Screenshots of each visual for review, and a scripted pass over every control and animation step (script errors, NaN, undefined, Infinity).
// Run from the repo root: node technical_knowledge_base/models_and_training/topic_ml_fundamentals/regularisation/src/check_page.mjs [outdir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), page = path.join(here, '..', 'index.html');
const out = process.argv[2] || path.join(here, '..', '.shots'); fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell' }); const errs = []; let bad = 0, scans = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 1000 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page); await wait(300); await p.click('button[data-t="t-read"]'); await wait(200);
  const scan = async (sel, what) => { scans++; const t = await p.$eval(sel, e => e.innerText + ' ' + [...e.querySelectorAll('svg text')].map(x => x.textContent).join(' ') + ' ' + [...e.querySelectorAll('[style]')].map(x => x.getAttribute('style')).join(' ') + ' ' + [...e.querySelectorAll('path,line,circle,rect')].map(x => [...x.attributes].map(a => a.value).join(' ')).join(' '));
    if (/NaN|undefined|Infinity/.test(t)) { bad++; const m = t.match(/.{0,60}(NaN|undefined|Infinity).{0,60}/); console.log('BAD', what, m && m[0]) } };
  const shot = async (sel, name) => { const el = await p.$(sel); await el.scrollIntoView(); await wait(150); await el.screenshot({ path: path.join(out, name + '-' + scheme + '-' + width + '.png') }) };
  const slide = async (sel, v) => p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v);
  const stepAll = async (card, ctl, groups) => {
    const combos = [[]]; for (const g of groups) { const bs = await p.$$(g + ' button'); const nx = []; for (const c of combos) for (let i = 0; i < bs.length; i++) nx.push(c.concat([[g, i]])); combos.splice(0, combos.length, ...nx) }
    for (const c of combos) { for (const [g, i] of c) { const bs = await p.$$(g + ' button'); await bs[i].click(); await wait(20) }
      const n = await p.$eval('#' + ctl + '-s', e => +e.max + 1);
      for (let k = 0; k < n; k++) { await slide('#' + ctl + '-s', k); await scan('#' + card, card + ' ' + JSON.stringify(c) + ' s' + k) } }
  };
  // nothing may move before the reader acts: every step slider still at 0 after load
  const moved = await p.$$eval('.an-ctl input[type=range]', es => es.filter(e => +e.value !== 0).map(e => e.id)); if (moved.length) { bad++; console.log('BAD autoplay', moved) }
  // hero: both runs
  for (const v of ['none', 'drop']) { await p.click('#hr-m button[data-v="' + v + '"]'); await scan('#hr-card', 'hero ' + v); await shot('#hr-card', 'hr-' + v) }
  // held-out error (moved from the Coefficient paths tab)
  for (const v of [20, 40, 100, 400]) { await slide('#ho-m', v); await wait(400); await scan('#ho-card', 'ho ' + v) }
  await slide('#ho-m', 40); await wait(400); await shot('#ho-card', 'ho-40');
  // weight decay: both optimisers, every step
  await stepAll('wd-card', 'wd-c', ['#wd-m']);
  for (const [m, k] of [['l2', 20], ['adamw', 30]]) { await p.click('#wd-m button[data-v="' + m + '"]'); await slide('#wd-c-s', k); await shot('#wd-card', 'wd-' + m) }
  // geometry animation: every method x pair x step
  await stepAll('ge-card', 'ge-ctl', ['#ge-p', '#ge-m']);
  for (const [pr, m, k] of [['bp', 'lasso', 5], ['bp', 'ridge', 5], ['s12', 'lasso', 3], ['s12', 'gd', 4], ['bp', 'gd', 6], ['bp', 'enet', 6]]) {
    await p.click('#ge-p button[data-v="' + pr + '"]'); await p.click('#ge-m button[data-v="' + m + '"]'); await slide('#ge-ctl-s', k); await shot('#ge-card', 'ge-' + pr + '-' + m) }
  await stepAll('da-card', 'da-ctl', ['#da-m']);
  for (const [m, k] of [['inv', 3], ['orig', 7], ['bug', 7]]) { await p.click('#da-m button[data-v="' + m + '"]'); await slide('#da-ctl-s', k); await shot('#da-card', 'da-' + m) }
  for (const v of ['shift', 'rot', 'noise', 'cut', 'flip', 'mix', 'cutmix']) { await p.click('#au-t button[data-v="' + v + '"]'); await p.click('#au-draw'); await scan('#au-card', 'aug ' + v) }
  await slide('#au-l', 0.35); await scan('#au-card', 'aug lam'); await shot('#au-card', 'au-cutmix'); await p.click('#au-t button[data-v="mix"]'); await shot('#au-card', 'au-mix');
  for (const id of ['mnist', 'zhang', 'imnet', 'c100', 'noise']) { await p.click('#ef-s button[data-v="' + id + '"]'); await scan('#ef-card', 'ef ' + id); if (id === 'c100' || id === 'noise') await shot('#ef-card', 'ef-' + id) }
  for (const m of ['mse', 'err']) { await p.click('#dd-m button[data-v="' + m + '"]'); await scan('#dd-card', 'dd ' + m); await shot('#dd-card', 'dd-' + m) }
  // weak-features double descent (moved from Statistics 2026-10-26): every signal, ridge strength and a sweep of p; numbers equal check/weak_features_dd.json
  { const E = JSON.parse(fs.readFileSync(path.join(here, 'check', 'weak_features_dd.json'), 'utf8'));
    for (const k of ['even', 'decay05', 'decay1']) { await p.click('#wf-beta button[data-m="' + k + '"]');
      for (const l of ['0', '0.01', '0.1', '1']) { await p.click('#wf-lam button[data-m="' + l + '"]');
        for (const v of [1, 39, 40, 41, 100]) { await slide('#wf-p', v); await scan('#wf-card', 'wf ' + k + l + v) } }
      await p.click('#wf-lam button[data-m="0"]'); await slide('#wf-p', 10);
      const t = await p.$eval('#wf-cnt', e => e.innerText);
      if (!(t.includes(E['dd_' + k + '_theory_p10'].toFixed(3)) && t.includes(E['dd_' + k + '_sim_p10'].toFixed(3)))) { bad++; console.log('BAD wf p10', k, t) } }
    await p.click('#wf-beta button[data-m="even"]'); await slide('#wf-p', 40); await shot('#wf-card', 'wf-40');
    const html = fs.readFileSync(page, 'utf8').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<annotation[^>]*>[\s\S]*?<\/annotation>/g, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const f = (v, d) => (+v).toFixed(d);
    for (const s of [f(Math.max(E.dd_even_maxgap, E.dd_decay05_maxgap, E.dd_decay1_maxgap) * 100, 1), f(E.ens_rho05, 2), f(E.dd_even_best_over[0], 3), f(E.dd_even_best_under[0], 3), f(E.dd_decay1_best_under[0], 3), f(E.dd_decay1_best_over[0], 3), String(E.dd_decay1_best_under[1]),
      f(E.dd_samplewise_n30, 3), f(E.dd_samplewise_n55, 2), f(E.dd_samplewise_n80, 2), f(E.dd_samplewise_n200, 2), f(E.dd_smin['40'], 3), f(E.dd_smin['10'], 2), f(E.dd_smin['100'], 2), f(E.dd_even_ridge01_p40, 1)])
      if (!html.includes(s)) { bad++; console.log('BAD wf text number', s) } }
  // coefficient paths tab
  await p.click('button[data-t="t-path"]'); await wait(300);
  for (const m of ['lasso', 'ridge', 'enet']) for (const x of ['lam', 't']) { await p.click('#pa-m button[data-v="' + m + '"]'); await p.click('#pa-x button[data-v="' + x + '"]');
    for (const v of [0, 250, 560, 800, 1000]) { await slide('#pa-l', v); await scan('#pa-card', 'path ' + m + x + v) } }
  await slide('#pa-r', 0.2); await scan('#pa-card', 'path rho');
  await p.click('#pa-m button[data-v="lasso"]'); await p.click('#pa-x button[data-v="t"]'); await slide('#pa-l', 560); await shot('#pa-card', 'pa-lasso-t');
  await p.click('#pa-m button[data-v="ridge"]'); await p.click('#pa-x button[data-v="lam"]'); await shot('#pa-card', 'pa-ridge');
  // dropout ensemble (moved from the Dropout tab into Reading, section 4)
  await p.click('button[data-t="t-read"]'); await wait(300);
  const picks = await p.$$('#dr-pick button');
  for (let i = 0; i < picks.length; i++) { await picks[i].click(); await wait(30); for (const k of [0, 4, 15, 29]) { await slide('#dr-ctl-s', k); await scan('#dr-card', 'drop pick ' + i + ' s' + k) } }
  await (await p.$$('#dr-pick button'))[0].click(); await slide('#dr-ctl-s', 29); await shot('#dr-card', 'dr-amb');
  await p.$eval('#mc-dp', d => { d.open = true }); await wait(300); await scan('#mc-card', 'mc'); await shot('#mc-card', 'mc');
  if (scheme === 'light') { await p.click('#mc-run'); await wait(9000); await scan('#mc-card', 'mc live'); await shot('#mc-card', 'mc-live'); console.log('live run:', await p.$eval('#mc-st', e => e.textContent)) }
  await p.click('button[data-t="t-more"]'); await wait(200); await scan('#t-more', 'more');
  const errbox = await p.$eval('#jsErr', e => e.hidden ? '' : e.textContent); if (errbox) { errs.push('errbox: ' + errbox) }
  await p.close();
}
// normal motion: scroll every animation card into view and wait; nothing may start by itself
{ const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 }); await p.goto('file://' + page); await wait(300);
  for (const id of ['ge-card', 'wd-card', 'dr-card', 'da-card']) { await p.$eval('#' + id, e => e.scrollIntoView()); await wait(1800) }
  const moved = await p.$$eval('.an-ctl input[type=range]', es => es.filter(e => +e.value !== 0).map(e => e.id));
  if (moved.length) { bad++; console.log('BAD autoplay (normal motion)', moved) } else console.log('normal motion: nothing autoplays');
  await p.close() }
await b.close();
console.log('scans', scans, 'bad', bad, 'errors', JSON.stringify(errs));
process.exit(bad || errs.length ? 1 : 0);
