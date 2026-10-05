// Part 1 checks: click every control of Part 1's tabs at 390 dark and 920 light; report script errors, NaN/undefined,
// sideways scroll; confirm each drill question has exactly one right choice; confirm the page embeds exactly the recorded outputs.
// usage: node src/ca/check.mjs [shots dir]   (puppeteer from html_utils/node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(repo, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = process.argv[2] || '/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/pl/ca/shots';
fs.mkdirSync(shots, { recursive: true });
const TABS = ['t-ca-read', 't-ca-build', 't-ca-life', 't-ca-ub', 't-ca-drill'];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page);
  for (const t of TABS) {
    await p.evaluate(t => window.SHOW_TAB(t), t);
    await sleep(200);
    // every segmented control / chip in this tab, then step every animation to its end and back
    const n = await p.evaluate(async t => {
      const tab = document.getElementById(t), wait = ms => new Promise(r => setTimeout(r, ms));
      let clicks = 0;
      const stepAll = async () => {
        for (const f of tab.querySelectorAll('button[id$="-f"]')) { const s = document.getElementById(f.id.replace(/-f$/, '-s')); for (let i = 0; i < +s.max + 1; i++) { f.click(); clicks++ } }
        for (const bk of tab.querySelectorAll('button[id$="-b"]')) { bk.click(); clicks++ }
        for (const s of tab.querySelectorAll('input[type=range]')) { s.value = Math.floor(s.max / 2); s.dispatchEvent(new Event('input')); clicks++ }
        for (const v of tab.querySelectorAll('select')) { v.value = '2'; v.dispatchEvent(new Event('change')); clicks++ }
      };
      await stepAll();
      for (const g of tab.querySelectorAll('.seg,.chips')) for (const bt of g.querySelectorAll('button')) { bt.click(); clicks++; await wait(20); await stepAll() }
      for (const d of tab.querySelectorAll('details')) { d.open = true; clicks++ }
      return clicks;
    }, t);
    const bad = await p.evaluate(t => { const s = document.getElementById(t).innerText; return (s.match(/\bNaN\b|(?<!=)\bundefined\b(?![ -](behaviou?r|here|symbol))/g) || []).length }, t);
    const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    await (await p.$('#' + t)).screenshot({ path: `${shots}/${t}-${scheme}-${width}.png` });
    if (bad || sw) { problems++; console.log(`PROBLEM ${t} ${scheme} ${width}: NaN/undefined ${bad}, sideways ${sw}`) }
    console.log(`${t} ${scheme} ${width}: ${n} interactions, NaN/undefined ${bad}, sideways ${sw}`);
  }
  // drill answers in the 920 pass
  if (width === 920) {
    await p.evaluate(() => window.SHOW_TAB('t-ca-drill'));
    const d = await p.evaluate(() => [...document.querySelectorAll('#t-ca-drill .ca-q')].map(q => q.querySelectorAll('.ca-ch button[data-ok="1"]').length));
    console.log('right choices per question', d.join(','));
    const off = d.filter(x => x !== 1).length;
    console.log('drill questions', d.length, 'with exactly one right choice:', d.length - off);
    if (off) problems++;
    // embedded outputs equal the recorded files (the "$ command" line included)
    const emb = await p.evaluate(() => { const r = {}; document.querySelectorAll('pre[data-ca-out]').forEach(e => { const n = e.dataset.caOut; const rest = e.nextElementSibling && e.nextElementSibling.querySelector('[data-ca-rest]'); (r[n] = r[n] || []).push(e.textContent + (rest ? '\n' + rest.textContent : '')) }); return r });
    let ok = 0, bad = 0;
    for (const [n, list] of Object.entries(emb)) {
      const want = fs.readFileSync(path.join(here, 'out', n + '.txt'), 'utf8').replace(/\n+$/, '');
      for (const got of list) { if (got === want) ok++; else { bad++; console.log('MISMATCH', n) } }
    }
    // the JS data (lifetime, gallery, pipeline) is generated from the same files: compare a sample of each
    const data = await p.evaluate(() => ({ lt: window.CA_DATA.lifetime.growth_nx.log.join('\n'), ub: window.CA_DATA.ub.race.O2, bd: window.CA_DATA.build.out.b_odr }));
    const f = n => fs.readFileSync(path.join(here, 'out', n + '.txt'), 'utf8');
    const dataOk = f('lt_growth_nx').split('\n').slice(1).join('\n').replace(/\n+$/, '') === data.lt && f('ub_race_O2') === data.ub && f('b_odr') === data.bd;
    console.log(`embedded outputs: ${ok} match, ${bad} differ; JS data matches files: ${dataOk}`);
    if (bad || !dataOk) problems++;
  }
  if (errs.length) { problems++; console.log('ERRORS', scheme, width, errs) }
  await p.close();
}
await b.close();
console.log(problems ? `FAILED (${problems})` : 'all Part 1 checks passed');
