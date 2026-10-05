// Clicks every control of the page at 390 px dark and 920 px light and reports script errors, NaN or
// undefined in visible text, and sideways scroll; writes a few screenshots to the folder given as argv[2].
// Run from the repository's html_utils/ folder: node ../technical_knowledge_base/.../memory_allocators/src/check_ui.mjs <shots dir>
import {createRequire} from 'module'; import path from 'path'; import {fileURLToPath} from 'url';
const require = createRequire(path.resolve('package.json')); const puppeteer = require('puppeteer');
const page = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../index.html'), out = process.argv[2] || '.';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({headless: 'shell'});
let bad = 0;
for (const [scheme, w] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({width: w, height: 900}); await p.emulateMediaFeatures([{name: 'prefers-color-scheme', value: scheme}]);
  await p.goto('file://' + page); await sleep(300);
  const tab = async t => { await p.click(`button[data-t=${t}]`); await sleep(250) };
  const check = async label => {
    const r = await p.evaluate(() => { const t = document.querySelector('.tab:not([hidden])').innerText;
      return {nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), sw: document.documentElement.scrollWidth > innerWidth,
        box: !document.getElementById('jsErr').hidden} });
    if (r.nan || r.und || r.sw || r.box || errs.length) { bad++; console.log('PROBLEM', scheme, w, label, JSON.stringify(r), errs.splice(0)) } };
  const clickAll = async sel => { const n = await p.$$eval(sel, e => e.length); for (let i = 0; i < n; i++) {
    await p.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; if (e && !e.disabled) e.click() }, sel, i); await sleep(40) } };
  // Reading
  await tab('t-read');
  await clickAll('#t-read .drill .opts button:first-child');
  await clickAll('#rd-loader-seg button'); await clickAll('#rd-loader-seg button:first-child');
  for (const c of ['rd-thr-ctl', 'cv-read']) {
    const ctl = c === 'cv-read' ? 'cv-readctl' : c;
    for (let k = 0; k < 8; k++) await p.evaluate(id => document.getElementById(id + '-f').click(), ctl);
    await p.evaluate(id => { const s = document.getElementById(id + '-s'); s.value = s.max; s.dispatchEvent(new Event('input')) }, ctl);
    await p.evaluate(id => document.getElementById(id + '-b').click(), ctl);
    await p.evaluate(id => { const v = document.getElementById(id + '-v'); v.value = '2'; v.dispatchEvent(new Event('change')) }, ctl);
  }
  await clickAll('#cv-read .jump button');
  await check('read');
  if (w === 920) { const e = await p.$('#rd-thr-card'); await e.screenshot({path: out + '/thr.png'});
    const l = await p.$('#rd-loader'); await l.screenshot({path: out + '/loader.png'});
    const f = await p.$('#rd-frag'); await f.screenshot({path: out + '/frag.png'});
    const c = await p.$('#cv-read'); await c.screenshot({path: out + '/cvread-' + w + '.png'}) }
  // Free-list lab
  await tab('t-fl');
  const presets = await p.$$eval('#fl-pre button', e => e.length);
  for (let i = 0; i < presets; i++) {
    await p.evaluate(i => document.querySelectorAll('#fl-pre button')[i].click(), i); await sleep(60);
    for (let k = 0; k < 5; k++) await p.evaluate(() => document.getElementById('fl-ctl-f').click());
    await p.evaluate(() => { const s = document.getElementById('fl-ctl-s'); s.value = s.max; s.dispatchEvent(new Event('input')) });
    await check('fl preset ' + i);
  }
  for (const [id, v] of [['fl-pol', 'WORST'], ['fl-ord', 'SIZESORT+'], ['fl-H', '4'], ['fl-a', '4'], ['fl-s', '7'], ['fl-n', '50'], ['fl-P', '70'], ['fl-r', '25'], ['fl-S', '300'], ['fl-A', '+10,+20,-0,+5,-1,+50']]) {
    await p.evaluate((id, v) => { const e = document.getElementById(id); e.value = v; e.dispatchEvent(new Event('change')) }, id, v); await sleep(40);
    await p.evaluate(() => { const s = document.getElementById('fl-ctl-s'); s.value = Math.floor(s.max / 2); s.dispatchEvent(new Event('input')) }); }
  for (const id of ['fl-C', 'fl-cmp', 'fl-hide', 'fl-cmp']) { await p.evaluate(id => document.getElementById(id).click(), id); await sleep(40) }
  await p.evaluate(() => document.querySelector('#t-fl details').open = true);
  await p.evaluate(() => document.querySelectorAll('#fl-pre button')[4].click()); await sleep(60);
  await p.evaluate(() => { const s = document.getElementById('fl-ctl-s'); s.value = 600; s.dispatchEvent(new Event('input')) });
  await check('fl controls');
  await (await p.$('#t-fl')).screenshot({path: out + '/fl-' + w + '.png'});
  // Caching allocator
  await tab('t-cache');
  for (const sc of ['batch', 'seqlen', 'small']) for (const [a, bb] of [['default', 'expandable_segments:True'], ['max_split_size_mb:200', 'roundup_power2_divisions:4'], ['max_split_size_mb:200,roundup_power2_divisions:4', 'default']]) {
    await p.evaluate((sc, a, bb) => { const s = document.getElementById('cv-tabsc'); s.value = sc; s.dispatchEvent(new Event('change'));
      const x = document.getElementById('cv-tabca'); x.value = a; x.dispatchEvent(new Event('change'));
      const y = document.getElementById('cv-tabcb'); y.value = bb; y.dispatchEvent(new Event('change')) }, sc, a, bb); await sleep(80);
    await clickAll('#cv-tab .jump button'); await check('cache ' + sc + ' ' + a + ' | ' + bb) }
  await p.evaluate(() => { const c = document.getElementById('cv-tabcap'); c.value = '1024'; c.dispatchEvent(new Event('change'));
    const o = document.getElementById('cv-tabown'); o.value = '+a 300, +b 30, -a, +c 310, +d 2, +e 0.4'; o.dispatchEvent(new Event('change')) }); await sleep(80);
  await clickAll('#cv-tab .jump button'); await check('cache own');
  await p.evaluate(() => { const o = document.getElementById('cv-tabown'); o.value = ''; o.dispatchEvent(new Event('change'));
    const s = document.getElementById('cv-tabsc'); s.value = 'batch'; s.dispatchEvent(new Event('change'));
    const x = document.getElementById('cv-tabca'); x.value = 'default'; x.dispatchEvent(new Event('change'));
    const y = document.getElementById('cv-tabcb'); y.value = 'expandable_segments:True'; y.dispatchEvent(new Event('change')) }); await sleep(80);
  await p.evaluate(() => document.querySelector('#cv-tab .jump button[data-j=oom]').click()); await sleep(80);
  await (await p.$('#t-cache')).screenshot({path: out + '/cache-' + w + '.png'});
  await tab('t-more'); await check('more');
  await p.close();
}
console.log(bad ? 'problems ' + bad : 'ui ok: no errors, NaN, undefined or sideways scroll at 390 dark and 920 light');
await b.close();
