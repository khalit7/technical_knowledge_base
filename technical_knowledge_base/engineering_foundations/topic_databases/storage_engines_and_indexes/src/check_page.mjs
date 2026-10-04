// Click every control on every tab at 390 px dark and 920 px light; report page errors, NaN/undefined/Infinity in visible text,
// sideways page scroll; step every Reading animation in every mode to its end; compare the page's numbers with recompute_out.json.
// Screenshots in ../.shots/check/. Run from the repo root:
//   node technical_knowledge_base/engineering_foundations/topic_databases/storage_engines_and_indexes/src/check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../../../../..');
const require = createRequire(path.join(root, 'html_utils', 'package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../index.html');
const shots = path.resolve(here, '../.shots/check'); fs.mkdirSync(shots, { recursive: true });
const ref = JSON.parse(fs.readFileSync(path.join(here, 'recompute_out.json'), 'utf8'));
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const bad = s => /\bNaN\b|\bundefined\b|Infinity|\[object/.test(s);
let problems = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [], probs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) {} });
  await p.goto('file://' + page); await sleep(300);
  const scan = async tag => { const t = await p.evaluate(() => { const v = [...document.querySelectorAll('.tab')].find(x => !x.hidden); return v ? v.innerText : '' });
    if (bad(t)) probs.push(tag + ': bad text ' + (t.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,40}/) || [''])[0]);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); if (sw) probs.push(tag + ': sideways scroll') };
  // Reading: animations
  const cards = await p.$$eval('#t-read .an-ctl', es => es.map(e => e.id.replace(/-ctl$/, '')));
  for (const c of cards) {
    const modes = await p.$$eval('#' + c + '-mode button', es => es.map(e => e.dataset.m)).catch(() => []);
    for (const m of (modes.length ? modes : [null])) {
      if (m) { await p.evaluate((c, m) => document.querySelector('#' + c + '-mode button[data-m="' + m + '"]').click(), c, m); await sleep(80) }
      await p.evaluate(c => document.getElementById(c + '-card').scrollIntoView({ block: 'center' }), c); await sleep(100);
      const n = await p.evaluate(c => +document.getElementById(c + '-ctl-s').max, c);
      await p.evaluate(c => { const s = document.getElementById(c + '-ctl-s'); s.value = 0; s.dispatchEvent(new Event('input')) }, c);
      for (let i = 0; i < n; i++) { await p.click('#' + c + '-ctl-f'); await scan(`read ${c} ${m} step ${i + 1}`) }
      const card = await p.$('#' + c + '-card'); await card.screenshot({ path: `${shots}/${c}-${m || 'x'}-${scheme}-${width}.png` });
    }
    await p.click('#' + c + '-ctl-b'); await p.click('#' + c + '-ctl-p'); await sleep(200); await p.click('#' + c + '-ctl-p');
    await p.select('#' + c + '-ctl-v', '2');
  }
  // calculators
  for (const v of ['3', '6', '9', '12']) { await p.evaluate(v => { const s = document.getElementById('rd-fo-n'); s.value = v; s.dispatchEvent(new Event('input')) }, v);
    for (const k of ['4', '8', '16', '37', '101']) { await p.select('#rd-fo-k', k); await scan('fanout ' + v + ' ' + k) } }
  for (const v of ['2', '10', '20']) { await p.evaluate(v => { const s = document.getElementById('rd-bf-b'); s.value = v; s.dispatchEvent(new Event('input')) }, v); await scan('bloom ' + v) }
  await p.evaluate(() => { const s = document.getElementById('rd-fo-n'); s.value = 9; s.dispatchEvent(new Event('input')); document.getElementById('rd-fo-k').value = '8'; document.getElementById('rd-fo-k').dispatchEvent(new Event('change')) });
  // compare with recompute
  const js = await p.evaluate(() => ({ leaf: FANOUT(8, 1e6).leaf, lv6: FANOUT(8, 1e6).levels, lv9: FANOUT(8, 1e9).levels, fp: +(100 * LAB.bloomFP(10)).toFixed(2), app: +PGAMP.append.toFixed(1), upd: Math.round(PGAMP.update) }));
  const cmp = [['leaf', ref.bigint_leaf], ['lv9', ref.levels_1e9], ['fp', ref.bloom_fp_pct], ['app', ref.pg_append_amp], ['upd', ref.pg_update_amp]];
  for (const [k, v] of cmp) if (js[k] !== v) probs.push(`JS ${k}=${js[k]} but recompute ${v}`);
  await scan('read final'); await p.screenshot({ path: `${shots}/read-${scheme}-${width}.png`, fullPage: true });
  // Lab
  await p.click('button[data-t=t-lab]'); await sleep(200);
  for (const wl of ['asc', 'rnd', 'ow']) for (const sty of ['leveled', 'tiered']) {
    await p.click(`#lb-wl button[data-m=${wl}]`); await p.click(`#lb-sty button[data-m=${sty}]`);
    for (const id of ['lb-i1', 'lb-i10', 'lb-i100', 'lb-i1000', 'lb-look', 'lb-miss']) { await p.click('#' + id); await scan(`lab ${wl} ${sty} ${id}`) }
    await p.click('#lb-bloom'); await p.click('#lb-look'); await scan('lab bloom off'); await p.click('#lb-bloom');
  }
  for (const [id, v] of [['lb-cap', '4'], ['lb-cap', '16'], ['lb-ck', '20'], ['lb-ck', '500'], ['lb-mem', '4'], ['lb-mem', '16'], ['lb-T', '2'], ['lb-T', '10']]) { await p.select('#' + id, v); await p.click('#lb-i1000'); await scan('lab ' + id + v) }
  await p.click('#lb-reset'); await p.click('#lb-wl button[data-m=rnd]'); await p.click('#lb-i1000');
  await p.screenshot({ path: `${shots}/lab-${scheme}-${width}.png`, fullPage: true });
  // Inside real pages
  await p.click('button[data-t=t-page]'); await sleep(200);
  for (const i of [0, 10, 30, 51]) { await p.evaluate(i => document.querySelectorAll('#pg-slots tr[data-lp]')[i].click(), i); await scan('page slot ' + i) }
  await p.evaluate(() => document.querySelectorAll('#pg-strip [data-lp]')[5].click()); await scan('page strip');
  for (const m of ['hot', 'full']) { await p.click(`#pg-upd button[data-m=${m}]`); await scan('page upd ' + m) }
  const nb = await p.$$eval('#pg-chain button', es => es.length);
  for (let i = 0; i < nb; i++) { await p.evaluate(i => document.querySelectorAll('#pg-chain button')[i].click(), i); await scan('page chain ' + i) }
  await p.screenshot({ path: `${shots}/page-${scheme}-${width}.png`, fullPage: true });
  await p.click('button[data-t=t-more]'); await sleep(100); await scan('more');
  const links = await p.$$eval('#t-more a[href^=http]', es => es.filter(a => a.target !== '_blank').length); if (links) probs.push(links + ' links without target');
  console.log(scheme, width, 'errors', JSON.stringify(errs), 'problems', probs.length); probs.slice(0, 15).forEach(x => console.log('  ' + x));
  problems += errs.length + probs.length; await p.close();
}
await b.close(); console.log('TOTAL problems', problems);
