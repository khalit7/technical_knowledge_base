// Click every control on every tab at 390 px dark and 920 px light; report page errors, NaN/undefined/Infinity in visible text and
// sideways page scroll; step the pruning animation in every mode to its end; compare the page's numbers with recompute_out.json.
// Card screenshots in ../.shots/check/. Run from the repo root:
//   node technical_knowledge_base/engineering_foundations/topic_databases/analytics_columnar_and_lakehouse/src/check_page.mjs
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
  await p.goto('file://' + page); await sleep(400);
  const scan = async tag => { const t = await p.evaluate(() => { const v = [...document.querySelectorAll('.tab')].find(x => !x.hidden); return v ? v.innerText : '' });
    if (bad(t)) probs.push(tag + ': bad text ' + (t.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,40}/) || [''])[0]);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); if (sw) probs.push(tag + ': sideways scroll') };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(60); await el.screenshot({ path: `${shots}/${name}-${scheme}-${width}.png` }) } };
  const clickAll = async (sel, tag) => { const n = await p.$$eval(sel, es => es.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(30); await scan(tag + ' ' + i) } };
  // Reading
  await clickAll('#encCols button', 'enc col'); await clickAll('#encOrder button', 'enc order');
  await p.evaluate(() => document.querySelector('#encCols button[data-c=role]').click()); await p.evaluate(() => document.querySelectorAll('#encOrder button')[1].click());
  await shot('#encCard', 'enc');
  await clickAll('#engMode button', 'eng'); await p.evaluate(() => document.querySelector('#engMode button').click()); await sleep(50); await shot('#engCard', 'eng');
  for (const mode of ['off', 'on']) for (const q of ['day', 'chat']) {
    await p.evaluate((m, q) => { document.querySelector('#prMode button[data-m=' + m + ']').click(); document.querySelector('#prQ button[data-m=' + q + ']').click() }, mode, q);
    await p.evaluate(() => { const s = document.getElementById('prCtl-s'); s.value = 0; s.dispatchEvent(new Event('input')) });
    const n = await p.evaluate(() => +document.getElementById('prCtl-s').max);
    for (let i = 0; i < n; i++) { await p.click('#prCtl-f'); await scan(`prune ${mode} ${q} ${i}`) }
    await shot('#prCard', `prune-${mode}-${q}`);
  }
  await p.click('#prCtl-p'); await sleep(300); await p.click('#prCtl-p'); await p.select('#prCtl-v', '2');
  await shot('#vecCard', 'vec'); await clickAll('#sortQ button', 'sort'); await shot('#sortCard', 'sort');
  for (const r of ['0', '1', '2', '3']) for (const f of ['0', '2', '4']) { await p.evaluate((r, f) => { const a = document.getElementById('whRows'), b = document.getElementById('whRef'); a.value = r; b.value = f; a.dispatchEvent(new Event('input')); b.dispatchEvent(new Event('input')) }, r, f); await scan('wh ' + r + f) }
  await shot('#whCard', 'wh');
  await clickAll('#httpQ button', 'http'); await shot('#httpCard', 'http'); await shot('#sfCard', 'sf'); await shot('#iceMini', 'icemini'); await shot('#s-pq .card', 'layout');
  // numbers against recompute.py
  const js = await p.evaluate(() => ({ sd: CHK.speed(true), s1: CHK.speed(false), sum: CHK.sumRatio, bq: CHK.bq, d_on: CHK.prune('on', 'day'), d_off: CHK.prune('off', 'day'), c_on: CHK.prune('on', 'chat'), c_off: CHK.prune('off', 'chat') }));
  const cmp = [['speed default', js.sd.join(','), ref.speedup_default.join(',')], ['speed one', js.s1.join(','), ref.speedup_one.join(',')], ['sum ratio', js.sum, ref.sum_ratio_pg1_duck1], ['bq bytes', js.bq, ref.bq_bytes_10M],
    ['prune day on', js.d_on.by, ref.prune_day_on], ['prune day off', js.d_off.by, ref.prune_day_off], ['prune chat on', js.c_on.by, ref.prune_chat_on], ['prune chat off', js.c_off.by, ref.prune_chat_off], ['day rgs', js.d_on.rd, ref.prune_day_rgs]];
  for (const [k, a, r] of cmp) if (String(a) !== String(r)) probs.push(`JS ${k}=${a} but recompute ${r}`);
  await scan('read final');
  // Lab
  await p.click('button[data-t=t-lab]'); await sleep(200);
  for (const s of ['time', 'model', 'chat', 'random']) for (const rg of ['10000', '100000', '1000000']) for (const c of ['uncompressed', 'snappy', 'zstd']) {
    await p.evaluate((s, rg, c) => { document.querySelector('#labSort button[data-m=' + s + ']').click(); document.querySelector('#labRg button[data-m="' + rg + '"]').click(); document.querySelector('#labComp button[data-m=' + c + ']').click() }, s, rg, c);
    await scan(`lab ${s} ${rg} ${c}`) }
  await clickAll('#labQ button', 'labQ'); await p.screenshot({ path: `${shots}/lab-${scheme}-${width}.png`, fullPage: true });
  // Bytes
  await p.click('button[data-t=t-bytes]'); await sleep(200);
  const nr = await p.$$eval('#byMap rect[data-i]', es => [...new Set(es.map(e => e.dataset.i))].length);
  for (let i = 0; i < nr; i++) { await p.evaluate(i => { const r = [...document.querySelectorAll('#byMap rect[data-i]')].find(e => +e.dataset.i === i); r.dispatchEvent(new MouseEvent('click', { bubbles: true })) }, i); await scan('bytes region ' + i) }
  await p.screenshot({ path: `${shots}/bytes-${scheme}-${width}.png`, fullPage: true });
  // Iceberg
  await p.click('button[data-t=t-ice]'); await sleep(200);
  for (const f of ['ice', 'delta']) {
    await p.evaluate(f => document.querySelector('#iceFmt button[data-m=' + f + ']').click(), f);
    const ns = await p.$$eval('#iceSteps button', es => es.length);
    for (let i = 0; i < ns; i++) { await p.evaluate(i => document.querySelectorAll('#iceSteps button')[i].click(), i); await scan(`ice ${f} step ${i}`);
      const ng = await p.$$eval('#iceMap g[data-p]', es => es.length);
      for (let j = 0; j < ng; j++) { await p.evaluate(j => document.querySelectorAll('#iceMap g[data-p]')[j].dispatchEvent(new MouseEvent('click', { bubbles: true })), j); await scan(`ice ${f} ${i} file ${j}`) } }
    await p.screenshot({ path: `${shots}/ice-${f}-${scheme}-${width}.png`, fullPage: true });
  }
  await p.click('button[data-t=t-more]'); await sleep(100); await scan('more');
  const links = await p.$$eval('a[href^=http]', es => es.filter(a => a.target !== '_blank' || !/noopener/.test(a.rel)).length); if (links) probs.push(links + ' links without target/rel');
  console.log(scheme, width, 'errors', JSON.stringify(errs), 'problems', probs.length); probs.slice(0, 15).forEach(x => console.log('  ' + x));
  problems += errs.length + probs.length; await p.close();
}
await b.close(); console.log('TOTAL problems', problems);
