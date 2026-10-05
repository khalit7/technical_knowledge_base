// Roofline lab check: (1) the page's JavaScript model reproduces every test vector from code/recompute.py;
// (2) the page embeds exactly the recorded measurements (out/data.json); (3) every control clicked at 390 px dark
// and 920 px light with no errors, NaN, undefined, Infinity, or sideways scroll. Screenshots go to argv[2].
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '../../../../../..');
const require = createRequire(path.join(repo, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const fs = require('fs');
const pageFile = 'file://' + path.resolve(here, '../../../index.html');
const out = process.argv[2] || path.resolve(here, '../../../.shots_roof');
fs.mkdirSync(out, { recursive: true });
const expected = JSON.parse(fs.readFileSync(path.resolve(here, '../out/expected.json')));
const data = JSON.parse(fs.readFileSync(path.resolve(here, '../out/data.json')));
const browser = await puppeteer.launch({ headless: 'shell' });
let problems = 0;
const bad = m => { problems++; console.log('PROBLEM', m); };
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push('pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: w === 390 ? 'reduce' : 'no-preference' }]);
  await p.setViewport({ width: w, height: 900 });
  await p.goto(pageFile, { waitUntil: 'load' });
  await p.evaluate(() => document.querySelector('#tabs button[data-t="t-roof"]').click());
  await new Promise(r => setTimeout(r, 400));
  if (w === 390) {
    // (1) model against Python
    const res = await p.evaluate(tests => {
      let n = 0, worst = 0, fails = [];
      for (const t of tests) {
        const e = window.ROOFX.evalCase(t.chip, t.prec, t.op, t.p);
        for (const k of ['flops', 'bytes', 'ai', 'att', 'ridge', 't_s']) {
          const d = Math.abs(e[k] - t[k]) / Math.max(1e-30, Math.abs(t[k])); worst = Math.max(worst, d);
          if (d > 1e-9) fails.push(t.chip + ' ' + t.prec + ' ' + t.op + ' ' + k + ' ' + e[k] + ' vs ' + t[k]);
        }
        if (e.bound !== t.bound) fails.push(t.chip + ' ' + t.op + ' bound');
        n++;
      }
      return { n, worst, fails: fails.slice(0, 5) };
    }, expected.tests);
    console.log('model vectors', res.n, 'worst rel diff', res.worst);
    res.fails.forEach(bad);
    // (2) embedded data equals recorded data
    const emb = await p.evaluate(() => JSON.stringify(window.ROOFD));
    if (emb !== JSON.stringify(data)) bad('embedded ROOFD differs from out/data.json');
    else console.log('embedded data identical to out/data.json (' + data.cases.length + ' cases)');
  }
  // (3) every control
  const n = await p.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const fire = (el, ev) => el.dispatchEvent(new Event(ev, { bubbles: true }));
    let k = 0;
    const chip = document.getElementById('roof-chip'), prec = document.getElementById('roof-prec'), op = document.getElementById('roof-op'), sh = document.getElementById('roof-sh'), kn = document.getElementById('roof-kn');
    for (const all of [false, true]) {
      document.getElementById('roof-all').checked = all; fire(document.getElementById('roof-all'), 'change');
      for (const c of [...chip.options].map(o => o.value)) {
        chip.value = c; fire(chip, 'change');
        for (const pr of [...prec.options].map(o => o.value)) {
          prec.value = pr; fire(prec, 'change');
          for (const o of [...op.options].map(o => o.value)) {
            op.value = o; fire(op, 'change');
            for (const v of [0, +sh.max, Math.floor(+sh.max / 2)]) { sh.value = v; fire(sh, 'input'); k++; }
            if (!document.getElementById('roof-gl').hidden) for (const x of [...kn.options].map(o => o.value)) { kn.value = x; fire(kn, 'change'); k++; }
          }
        }
      }
    }
    const meas = document.getElementById('roof-meas'); meas.checked = false; fire(meas, 'change'); meas.checked = true; fire(meas, 'change');
    chip.value = 'm1g'; fire(chip, 'change'); op.value = 'linear'; fire(op, 'change'); prec.value = 'fp16'; fire(prec, 'change');
    kn.value = '8192'; fire(kn, 'change'); sh.value = 6; fire(sh, 'input');
    for (const b of document.querySelectorAll('#roof-anmode button')) { b.click(); await sleep(50); for (let i = 0; i < 13; i++) { document.getElementById('roof-an-f').click(); k++; } document.getElementById('roof-an-b').click(); }
    document.querySelector('#roof-anmode button').click(); document.getElementById('roof-an-p').click();
    const s = document.getElementById('roof-an-s'); s.value = 3; fire(s, 'input'); document.getElementById('roof-an-v').value = '2'; fire(document.getElementById('roof-an-v'), 'change');
    for (const b of document.querySelectorAll('#t-roof .roof-pr .opts button')) { b.click(); k++; }
    for (const id of ['roof-mp', 'roof-mt']) { const r = document.getElementById(id); for (const v of [r.min, r.max, r.value]) { r.value = v; fire(r, 'input'); k++; } }
    const mc = document.getElementById('roof-mchip'); for (const o of [...mc.options]) { mc.value = o.value; fire(mc, 'change'); k++; }
    mc.value = 'h100|bf16'; fire(mc, 'change'); document.getElementById('roof-mp').value = 7; fire(document.getElementById('roof-mp'), 'input'); document.getElementById('roof-mt').value = 177; fire(document.getElementById('roof-mt'), 'input');
    for (const d of document.querySelectorAll('#t-roof details')) d.open = true;
    return k;
  });
  const txt = await p.evaluate(() => document.getElementById('t-roof').innerText);
  for (const bw of ['NaN', 'undefined', 'Infinity', 'null']) if (txt.includes(bw)) bad(w + ' text contains ' + bw + ': ' + txt.slice(Math.max(0, txt.indexOf(bw) - 60), txt.indexOf(bw) + 20));
  const sc = await p.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
  if (sc[0] > sc[1]) bad(w + ' sideways scroll ' + sc);
  const je = await p.evaluate(() => { const e = document.getElementById('jsErr'); return e && !e.hidden ? e.textContent : ''; });
  if (je) bad('jsErr: ' + je);
  errs.forEach(e => bad(w + ' ' + e));
  console.log(w, scheme, 'controls exercised', n);
  // screenshots: chosen state (M1 GPU linear batch 64 with measured dots), and each section
  await p.evaluate(() => { const c = document.getElementById('roof-chip'); c.value = 'm1g'; c.dispatchEvent(new Event('change')); document.getElementById('roof-all').checked = true; document.getElementById('roof-all').dispatchEvent(new Event('change')); });
  for (const id of ['roof-s-what', 'roof-s-lab', 'roof-s-anim', 'roof-s-meas', 'roof-s-mfu', 'roof-s-transfer', 'roof-s-drill']) {
    const el = await p.$('#' + id);
    await el.scrollIntoView(); await new Promise(r => setTimeout(r, 150));
    await el.screenshot({ path: path.join(out, `roof_${w}_${scheme}_${id}.png`) });
  }
  await p.close();
}
await browser.close();
console.log(problems ? 'FAIL problems=' + problems : 'OK');
process.exit(problems ? 1 : 0);
