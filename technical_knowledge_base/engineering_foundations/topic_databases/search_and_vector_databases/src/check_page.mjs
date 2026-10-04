// Click every control on every tab at 390 px dark and 920 px light; report page errors, NaN/undefined/Infinity in visible text,
// sideways page scroll; step every Reading animation in every mode to its end; compare the page's BM25, RRF and memory
// arithmetic with recompute_out.json. Screenshots in ../.shots/check/. Run from the repo root:
//   node technical_knowledge_base/engineering_foundations/topic_databases/search_and_vector_databases/src/check_page.mjs
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
const bad = s => /\bNaN\b|\bundefined\b|Infinity|\[object|@@[a-z0-9_]+@@/.test(s);
let problems = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [], probs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.evaluateOnNewDocument(() => { try { localStorage.clear() } catch (e) {} });
  await p.goto('file://' + page); await sleep(300);
  const scan = async tag => { const t = await p.evaluate(() => { const v = [...document.querySelectorAll('.tab')].find(x => !x.hidden); return v ? v.innerText : '' });
    if (bad(t)) probs.push(tag + ': bad text ' + (t.match(/.{0,40}(NaN|undefined|Infinity|\[object|@@[a-z0-9_]+@@).{0,40}/) || [''])[0]);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1); if (sw) probs.push(tag + ': sideways scroll') };
  await scan('read initial');
  for (const [card, ctl, seg] of [['invCard', 'invCtl', 'invSeg'], ['annCard', 'annCtl', 'annSeg'], ['fltCard', 'fltCtl', 'fltSeg']]) {
    const modes = await p.$$eval('#' + seg + ' button', es => es.map(e => e.dataset.m));
    for (const m of modes) {
      await p.evaluate((seg, m) => document.querySelector('#' + seg + ' button[data-m="' + m + '"]').click(), seg, m); await sleep(60);
      await p.evaluate(card => document.getElementById(card).scrollIntoView({ block: 'center' }), card); await sleep(80);
      const n = await p.evaluate(ctl => +document.getElementById(ctl + '-s').max, ctl);
      await p.evaluate(ctl => { const s = document.getElementById(ctl + '-s'); s.value = 0; s.dispatchEvent(new Event('input')) }, ctl);
      for (let i = 0; i < n; i++) { await p.click('#' + ctl + '-f'); if (i % 4 === 0 || i === n - 1) await scan(`${card} ${m} step ${i + 1}`) }
      const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/${card}-${m}-${scheme}-${width}.png` });
    }
    await p.click('#' + ctl + '-b'); await p.click('#' + ctl + '-p'); await sleep(150); await p.click('#' + ctl + '-p'); await p.select('#' + ctl + '-v', '2');
  }
  // sliders
  for (const [id, vals] of [['bmK1', [0, 0.5, 3, 1.2]], ['bmB', [0, 1, 0.75]], ['rrfK', [1, 120, 60]]]) {
    for (const v of vals) { await p.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('input')) }, id, v); await scan(id + '=' + v) } }
  await p.click('#bmReset');
  for (const id of ['bmCard', 'rrfCard', 'measTab', 'quantTab', 'filtTab', 'hybTab']) { const el = await p.$('#' + id); if (el) { await el.scrollIntoView(); await el.screenshot({ path: `${shots}/${id}-${scheme}-${width}.png` }) } }
  // compare arithmetic with recompute_out.json
  const js = await p.evaluate(() => {
    const D = SV.tiny, ql = D.query_lexemes.map(x => x[0]), r = SV.bm25(D.docs.map(d => d.lexemes), ql, 1.2, .75);
    const lex = r.scores.map((s, j) => [s, j + 1]).filter(x => x[0] > 0).sort((a, c) => c[0] - a[0] || a[1] - c[1]).map(x => x[1]);
    const vec = D.docs.map((d, j) => [d.cos, j + 1]).sort((a, c) => c[0] - a[0] || a[1] - c[1]).map(x => x[1]);
    return { bm25: r.scores.map(x => +x.toFixed(6)), idf: ql.map(t => +r.idf[t].toFixed(6)), rrf: SV.rrf([lex, vec], 60).map(x => x[0]), toy: window.SV_TOY_SUMMARY } });
  const close = (a, b) => Math.abs(a - b) < 1e-5;
  if (!js.bm25.every((x, i) => close(x, ref.bm25[i]))) probs.push('bm25 mismatch ' + js.bm25 + ' vs ' + ref.bm25);
  if (!js.idf.every((x, i) => close(x, ref.idf[i]))) probs.push('idf mismatch');
  if (js.rrf.join() !== ref.rrf.join()) probs.push('rrf order mismatch ' + js.rrf + ' vs ' + ref.rrf);
  // tabs
  for (const t of ['t-ann', 't-side', 't-more']) {
    await p.evaluate(t => document.querySelector('#tabs button[data-t="' + t + '"]').click(), t); await sleep(150); await scan(t);
    if (t === 't-ann') {
      const n = await p.$$eval('#annIdx option', o => o.length);
      for (let i = 0; i < n; i++) { await p.select('#annIdx', String(i)); const mx = await p.evaluate(() => +document.getElementById('annKnob').max);
        for (let k = 0; k <= mx; k++) { await p.evaluate(k => { const e = document.getElementById('annKnob'); e.value = k; e.dispatchEvent(new Event('input')) }, k); } await scan('ann idx ' + i) }
      await p.evaluate(() => document.querySelector('#annLat button[data-m="p95_ms"]').click()); await scan('ann p95');
      for (const v of [0, 20, 40]) { await p.evaluate(v => { const e = document.getElementById('memN'); e.value = v; e.dispatchEvent(new Event('input')) }, v);
        for (const d of ['384', '3072']) for (const ty of ['f32', 'f16', 'bit']) { await p.select('#memD', d); await p.select('#memT', ty); await scan(`mem ${v} ${d} ${ty}`) } }
      const mm = await p.evaluate(() => document.getElementById('memOut').innerText); if (!mm.includes('GB') && !mm.includes('MB')) probs.push('memory calc empty');
    }
    if (t === 't-side') {
      for (const c of ['quora', 'scifact']) { await p.evaluate(c => document.querySelector('#sdCorp button[data-m="' + c + '"]').click(), c);
        const n = await p.$$eval('#sdQ option', o => o.length); for (let i = 0; i < n; i++) { await p.select('#sdQ', String(i)); await scan(`side ${c} ${i}`) } }
    }
    await p.screenshot({ path: `${shots}/${t}-${scheme}-${width}.png`, fullPage: false });
  }
  const links = await p.$$eval('a[href^="http"]', as => as.filter(a => a.target !== '_blank' || !/noopener/.test(a.rel)).length); if (links) probs.push(links + ' external links without target/rel');
  console.log(scheme, width, 'errors', errs.length, errs.slice(0, 5), 'problems', probs.length, probs.slice(0, 12));
  problems += errs.length + probs.length; await p.close();
}
await b.close();
console.log(problems ? 'FAIL ' + problems : 'OK');
