// Click every control on every tab at 390 px dark and 920 px light; fail on script errors, NaN/undefined/null text,
// sideways scroll, or a number on screen that disagrees with inputs/recompute.json.
// Run from the repo root: node technical_knowledge_base/measurement/topic_benchmarks/knowledge_and_reasoning/src/check_ui.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../index.html');
const RC = JSON.parse(fs.readFileSync(path.join(here, 'inputs/recompute.json'))).values;
const problems = []; let actions = 0;
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page);
  const bad = async (where) => {
    const r = await p.evaluate(() => {
      const t = document.querySelector('.tab:not([hidden])').innerText;
      return { nan: /\bNaN\b|\bundefined\b|\bnull\b|Infinity/.test(t), side: document.documentElement.scrollWidth > innerWidth, box: !document.getElementById('jsErr').hidden };
    });
    if (r.nan) problems.push(`${scheme} ${where}: NaN/undefined/null text`);
    if (r.side) problems.push(`${scheme} ${where}: sideways scroll`);
    if (r.box) problems.push(`${scheme} ${where}: error box shown`);
  };
  const clickAll = async (sel, where) => {
    const n = await p.$$eval(sel, els => els.length);
    for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); actions++; await new Promise(r => setTimeout(r, 30)); await bad(where + ' ' + sel + '#' + i) }
  };
  const scrub = async (id, n, where) => { for (let i = 0; i < n; i++) { await p.evaluate((id, i) => { const s = document.getElementById(id); s.value = i; s.dispatchEvent(new Event('input')) }, id, i); actions++; await bad(where + ' step ' + i) } };
  // Reading
  await p.click('button[data-t=t-read]'); await bad('read');
  for (const m of await p.$$eval('#rd-sqa-m option', o => o.map(x => x.value))) {
    await p.select('#rd-sqa-m', m); actions++;
    for (const g of [0, 50, 100]) for (const q of [0, 30, 60]) {
      await p.evaluate((g, q) => { const a = document.getElementById('rd-sqa-g'), b = document.getElementById('rd-sqa-p'); a.value = g; b.value = q; a.dispatchEvent(new Event('input')); b.dispatchEvent(new Event('input')) }, g, q); actions++;
    }
    await bad('sqa ' + m);
  }
  // check: SimpleQA F for GPT-4o equals the table
  await p.select('#rd-sqa-m', 'GPT-4o');
  await p.evaluate(() => { const a = document.getElementById('rd-sqa-g'); a.value = 0; a.dispatchEvent(new Event('input')) });
  const f = await p.$eval('#rd-sqa-out .stat .v', e => e.textContent);
  if (f !== '38.4') problems.push('SimpleQA GPT-4o F shown ' + f + ', table 38.4');
  // Grade
  await p.click('button[data-t=t-grade]'); await bad('grade');
  await clickAll('#t-grade .opts button[data-i="0"]', 'grade');
  for (const [i, v] of [[0, 'Michio Sugeno'], [1, 'kvos tv'], [2, '23 October 2018'], [3, '']]) {
    await p.evaluate((i, v) => { const r = document.querySelectorAll('#gr-sqa .row')[i]; r.querySelector('input').value = v; r.querySelectorAll('button')[v ? 0 : 1].click() }, i, v); actions++;
  }
  const sq = await p.$$eval('#gr-sqa-out .stat .v', e => e.map(x => x.textContent));
  if (sq.join('|') !== '3|0|1|85.7') problems.push('SimpleQA toy grader tally ' + sq.join('|') + ', expected 3|0|1|85.7');
  await bad('grade after answers');
  // Fix the key
  await p.click('button[data-t=t-key]'); await bad('key');
  for (const s of [0, 1, 2, 3, 4]) { await p.evaluate(s => document.querySelectorAll('#ky-subj button')[s].click(), s); await scrub('ky-ctl-s', 5, 'mmlu subj ' + s) }
  await p.click('#ky-mode button[data-m=hle]'); await scrub('ky-ctl-s', 5, 'hle');
  const lead = await p.evaluate(() => [...document.querySelectorAll('#ky-cnt .stat')].map(x => x.innerText).join(' / '));
  if (!/Grok 4\.1 fast|GPT-5\.2|Gemini 3 Pro/.test(lead)) problems.push('HLE leader not shown: ' + lead);
  await p.click('#ky-mode button[data-m=mmlu]'); await clickAll('#ky-sort button', 'map'); await clickAll('#ky-n button', 'map'); await clickAll('#ky-map .row', 'map');
  for (const b2 of ['ky-ctl-p', 'ky-ctl-f', 'ky-ctl-b']) { await p.click('#' + b2); actions++ }
  // ARC lab
  await p.click('button[data-t=t-arc]'); await bad('arc');
  for (const r of ['frac', 'up']) {
    await p.click(`#ar-rule button[data-m=${r}]`);
    for (let k = 0; k < 6; k++) {
      await p.evaluate(k => document.querySelectorAll('#ar-pair button')[k].click(), k); await scrub('ar-ctl-s', 10, 'arc ' + r + ' pair ' + k);
      const m = await p.$eval('#ar-cnt', e => e.innerText);
      if (r === 'frac' && !/81 of 81/.test(m)) problems.push('rule A pair ' + k + ' not 81/81: ' + m);
      if (r === 'up' && k === 0 && !/67 of 81/.test(m)) problems.push('rule B demo 1 not 67/81: ' + m);
    }
  }
  const tasks = await p.$$eval('#sv-task button', e => e.length);
  for (let k = 0; k < tasks; k++) {
    await p.evaluate(k => document.querySelectorAll('#sv-task button')[k].click(), k); actions++;
    await p.click('#sv-copy'); await p.click('#sv-sub'); await p.click('#sv-clr'); await p.click('#sv-sub'); actions += 4;
    // paint one cell
    await p.evaluate(() => document.querySelector('#sv-ed svg').scrollIntoView({ block: 'center' }));
    const box = await (await p.$('#sv-ed svg')).boundingBox(); await p.mouse.click(box.x + 4, box.y + 4); actions++;
    await bad('solver task ' + k);
  }
  await p.evaluate(() => { const r = document.getElementById('sv-r'); r.value = 5; r.dispatchEvent(new Event('change')) }); actions++;
  // solve 25ff71a9 for real: copy the right answer in and submit
  await p.evaluate(() => document.querySelectorAll('#sv-task button')[0].click());
  const solved = await p.evaluate(() => {
    const T = window.KR.arc.find(t => t.id === '25ff71a9'), exp = T.test[0].output, s = document.querySelector('#sv-ed svg'), cs = +s.dataset.cs;
    s.scrollIntoView({ block: 'center' });
    return { exp, cs };
  });
  for (let r = 0; r < solved.exp.length; r++) for (let c = 0; c < solved.exp[0].length; c++) {
    const v = solved.exp[r][c];
    await p.evaluate(v => document.querySelectorAll('#sv-pal button')[v].click(), v);
    const bx = await (await p.$('#sv-ed svg')).boundingBox(), sc = bx.width / (solved.exp[0].length * solved.cs + 1);
    await p.mouse.click(bx.x + (c + .5) * solved.cs * sc, bx.y + (r + .5) * solved.cs * sc); actions++;
  }
  await p.click('#sv-sub');
  const res = await p.$eval('#sv-res', e => e.textContent);
  if (!/Solved on attempt 1/.test(res)) problems.push(scheme + ' solver did not accept the right answer: ' + res);
  await clickAll('#rh-pre button', 'rhae');
  const presets = { human: '100.0%', two: '25.0%', ten: '67.0%', stop: '40.0%', fast: '100.0%' };
  for (const [k, v] of Object.entries(presets)) {
    await p.click(`#rh-pre button[data-m=${k}]`);
    const g = await p.$eval('#rh-out .stat .v', e => e.textContent);
    if (g !== v) problems.push(`RHAE preset ${k}: ${g}, expected ${v}`);
  }
  await p.click('button[data-t=t-more]'); await bad('more');
  if (errs.length) problems.push(scheme + ' errors: ' + errs.join(' | '));
  await p.close();
}
await b.close();
console.log(actions, 'actions;', problems.length, 'problems');
problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
