// Clicks every control of the simulator tab (both animation toggles and every step, each hardware x traffic
// preset with every Compare button, the stall modes, the sweep, the check toggles) and fails on page errors,
// NaN, undefined, Infinity in visible text, or sideways scroll. Run: node check_ui.mjs <index.html> <light|dark> <width> [--verbose]
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const [file, scheme, width, verbose] = process.argv.slice(2);
const b = await puppeteer.launch({ headless: 'shell' });
const p = await b.newPage();
await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
await p.setViewport({ width: +width, height: 900 });
const errs = [];
p.on('pageerror', e => errs.push(String(e)));
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
await p.goto('file://' + path.resolve(file));
await p.evaluate(() => document.querySelector('#tabs button[data-t="t-sim"]').click());
const sleep = ms => new Promise(r => setTimeout(r, ms));
await sleep(800);
const bad = [];
async function scan(where) {
  const r = await p.evaluate(() => {
    const t = document.getElementById('t-sim').innerText;
    const m = t.match(/.{0,30}(NaN|undefined|Infinity).{0,30}/);
    const side = document.documentElement.scrollWidth > document.documentElement.clientWidth + 1;
    return { m: m ? m[0] : null, side };
  });
  if (r.m) bad.push(where + ': ' + r.m);
  if (r.side) bad.push(where + ': sideways scroll');
}
const click = sel => p.evaluate(s => { const e = document.querySelector(s); if (!e) throw new Error('missing ' + s); e.click(); }, sel);
// section 1
for (const bat of ['static', 'cont']) for (const kv of ['contig', 'paged']) {
  await click(`#sim-a-bat button[data-v="${bat}"]`); await click(`#sim-a-kv button[data-v="${kv}"]`);
  const n = await p.evaluate(() => +document.getElementById('sim-a-ctl-s').max);
  for (let i = 0; i <= n; i += Math.max(1, Math.floor(n / 12))) { await p.evaluate(i => { const s = document.getElementById('sim-a-ctl-s'); s.value = i; s.dispatchEvent(new Event('input')); }, i); }
  await click('#sim-a-ctl-f'); await click('#sim-a-ctl-b'); await click('#sim-a-ctl-p'); await click('#sim-a-ctl-p');
  await scan('anim ' + bat + ' ' + kv);
}
for (const id of ['sim-pr1', 'sim-pr2']) for (const a of [0, 1, 2]) { await click(`#${id} button[data-a="${a}"]`); await scan(id); }
// section 2
const hws = await p.evaluate(() => [...document.querySelectorAll('#sim-hw option')].map(o => o.value));
const scns = await p.evaluate(() => [...document.querySelectorAll('#sim-scn option')].map(o => o.value));
const cmps = ['mode', 'kv', 'pc', 'chunk', 'pre', 'admit', 'dep', 'clear'];
const out = [];
for (const hw of hws) {
  await p.select('#sim-hw', hw); await sleep(50);
  for (const sc of scns) {
    await p.select('#sim-scn', sc); await sleep(50);
    for (const c of cmps) {
      await p.evaluate(() => { document.getElementById('sim-dep').value = '1'; });
      await click(`#sim-labbox button[data-cmp="${c}"]`); await sleep(30);
      await scan(`lab ${hw} ${sc} ${c}`);
      if (verbose) out.push(hw + ' | ' + sc + ' | ' + c + ' | ' + await p.evaluate(() => [...document.querySelectorAll('#sim-cmp tbody tr')].map(r => [...r.cells].map(x => x.innerText.replace(/\n/g, ' ')).join(' ; ')).join('  ||  ')));
    }
  }
}
// change every other input once
await p.select('#sim-hw', 'h100_bf16'); await p.select('#sim-scn', 'chat');
for (const [id, v] of [['sim-mode', 'static'], ['sim-kv', 'contig'], ['sim-bs', '32'], ['sim-pre', 'swap'], ['sim-admit', 'reserve'], ['sim-dep', 'pd'], ['sim-dep', '2']]) { await p.select('#' + id, v); await sleep(150); await scan('input ' + id); }
for (const id of ['sim-chunk', 'sim-pc']) { await click('#' + id); await sleep(150); await scan('input ' + id); }
// sections 3 to 5
for (const v of ['0', '1', '2']) { await click(`#sim-st-mode button[data-v="${v}"]`); await scan('stall ' + v); }
await click('#sim-sw-run'); await sleep(300); await scan('sweep');
for (const v of ['0', '1', '2']) { await click(`#sim-v-met button[data-v="${v}"]`); await scan('val ' + v); }
await sleep(300);
console.log(out.join('\n'));
console.log(`${scheme} ${width}: errors ${JSON.stringify(errs)} problems ${JSON.stringify(bad)}`);
await b.close();
process.exit(errs.length || bad.length ? 1 : 0);
