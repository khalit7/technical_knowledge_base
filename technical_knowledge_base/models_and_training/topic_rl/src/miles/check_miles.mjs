// Exercise every control of the Milestones and benchmarks tab (t-miles) at 390 px dark and 920 px light.
// Reports page errors, NaN/undefined text, sideways scroll and elements wider than the viewport; screenshots each section.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_rl/src/miles/check_miles.mjs [outdir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const here = path.dirname(new URL(import.meta.url).pathname);
const root = path.resolve(here, '../../../../..');
const require = createRequire(path.join(root, 'html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve(here, '../../index.html');
const out = process.argv[2] || path.resolve(here, '../../.shots/miles');
fs.mkdirSync(out, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
const problems = []; let actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width, motion] of [['dark', 390, 'reduce'], ['light', 920, 'no-preference']]) {
  const p = await b.newPage();
  p.on('pageerror', e => problems.push(scheme + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push(scheme + ' console ' + m.text() + ' @' + JSON.stringify(m.stackTrace().slice(0,2))) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
  await p.goto('file://' + file);
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} document.querySelector('button[data-t=t-miles]').click() });
  await wait(200);
  const bad = async where => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-miles').innerText; const m = t.match(/.{0,40}(NaN|undefined|Infinity|\[object).{0,40}/);
      const vw = document.documentElement.clientWidth; const side = document.documentElement.scrollWidth > vw + 1;
      const wide = [...document.querySelectorAll('#t-miles *')].filter(e => { const b = e.getBoundingClientRect(); return b.width && (b.right > vw + 1 || b.left < -1) && !e.closest('.tw') }).slice(0, 3).map(e => e.tagName + '#' + e.id + '.' + e.className);
      return { m: m && m[0], side, wide };
    });
    if (r.m) problems.push(scheme + ' ' + where + ': ' + r.m);
    if (r.side) problems.push(scheme + ' ' + where + ': sideways scroll');
    if (r.wide.length) problems.push(scheme + ' ' + where + ': wider than viewport ' + r.wide.join(' '));
  };
  const click = async (sel, where) => { const els = await p.$$(sel); if (!els.length) problems.push(scheme + ' missing ' + sel); for (const e of els) { await e.evaluate(x => { x.scrollIntoView({ block: 'center' }); x.click() }); actions++; await wait(40); await bad(where + ' ' + sel) } };
  const shot = async (sel, name) => { const e = await p.$(sel); if (!e) { problems.push(scheme + ' no ' + sel); return } await e.evaluate(x => x.scrollIntoView({ block: 'start' })); await wait(150); await e.screenshot({ path: path.join(out, name + '-' + scheme + '-' + width + '.png') }) };
  const shotRange = async (fromSel, toSel, name) => {
    const r = await p.evaluate((a, b) => { const A = document.querySelector(a).getBoundingClientRect(), B = document.querySelector(b).getBoundingClientRect(); return { y: A.top + scrollY, h: B.bottom - A.top } }, fromSel, toSel);
    await p.screenshot({ path: path.join(out, name + '-' + scheme + '-' + width + '.png'), clip: { x: 0, y: r.y, width, height: Math.min(r.h, 4000) }, captureBeyondViewport: true });
  };
  await bad('open');
  await shotRange('#s-miles', '#ms-list', 'top');
  // timeline: every domain, the correction filter, every dot, every card
  for (const v of ['games', 'control', 'robotics', 'language', 'all']) await click(`#ms-dom button[data-v=${v}]`, 'dom');
  await click('#ms-onlyfix', 'onlyfix'); await click('#ms-onlyfix', 'onlyfix');
  const nd = await p.$$eval('#ms-tl circle[data-i]', es => es.length);
  if (nd !== 29) problems.push(scheme + ' timeline dots ' + nd);
  for (let i = 0; i < nd; i++) { await p.$$eval('#ms-tl circle[data-i]', (es, i) => es[i].dispatchEvent(new MouseEvent('click', { bubbles: true })), i); actions++; await bad('dot ' + i) }
  const nc = await p.$$eval('#ms-list details', es => es.length);
  for (let i = 0; i < nc; i++) { await p.$$eval('#ms-list details', (es, i) => { es[i].open = true }, i); actions++ }
  await wait(100); await bad('cards open');
  await shot('#ms-det', 'detail');
  // Atari-57: every source, protocol, statistic, order
  const srcs = await p.$$eval('#ms-src option', os => os.map(o => o.value));
  for (const s of srcs) {
    await p.select('#ms-src', s); actions++; await bad('src ' + s);
    for (const ord of ['tab', 'val']) {
      await click(`#ms-ord button[data-v=${ord}]`, 'ord');
      const ps = await p.$$eval('#ms-proto button:not([disabled])', bs => bs.map(b => b.dataset.v));
      for (const pr of ps) { await click(`#ms-proto button[data-v=${pr}]`, 'proto ' + s);
        for (const m of ['med', 'mean']) { const dis = await p.$eval(`#ms-met button[data-v=${m}]`, b => b.disabled); if (!dis) await click(`#ms-met button[data-v=${m}]`, 'met ' + s + ' ' + pr);
          const n = await p.$$eval('#ms-bars .ms-row', r => r.length); if (!n && !dis) problems.push(scheme + ' empty bars ' + s + ' ' + pr + ' ' + m) } }
    }
  }
  await p.select('#ms-src', 'a57'); await click('#ms-met button[data-v=med]', 'reset');
  await shotRange('#ms-h-a57', '#ms-bars', 'a57-agent57');
  await p.select('#ms-src', 'first'); actions++;
  await shot('#ms-bars', 'a57-first');
  // animation: both modes, every step, back, scrub, speed, play
  for (const mode of ['climb', 'games']) {
    await click(`#ms-mode button[data-v=${mode}]`, 'mode');
    const max = await p.$eval('#ms-scrub', e => +e.max);
    for (let i = 0; i < max; i++) { await click('#ms-fwd', 'fwd ' + mode); await wait(motion === 'reduce' ? 20 : 750) }
    problems.push('INFO ' + scheme + ' ' + mode + ' last: ' + (await p.$eval('#ms-cap', e => e.innerText)).replace(/\n/g, ' | ').slice(0, 300));
    problems.push('INFO ' + scheme + ' ' + mode + ' counters: ' + (await p.$eval('#ms-acnt', e => e.innerText)).replace(/\n/g, ' | ').slice(0, 300));
    await shotRange('#ms-h-an', '#ms-annote', 'anim-' + mode + '-end');
    await click('#ms-back', 'back'); await wait(motion === 'reduce' ? 20 : 750);
    for (const v of [0, Math.floor(max / 2), max]) { await p.$eval('#ms-scrub', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, String(v)); actions++; await bad('scrub ' + v) }
    await p.$eval('#ms-scrub', e => { e.value = 0; e.dispatchEvent(new Event('input')) });
    await shotRange('#ms-h-an', '#ms-annote', 'anim-' + mode + '-start');
    for (const sp of ['2', '0.5', '1']) { await p.select('#ms-speed', sp); actions++ }
    await click('#ms-play', 'play'); await wait(motion === 'reduce' ? 300 : 3000); await bad('playing ' + mode); await click('#ms-play', 'pause');
  }
  // Atari 100k
  for (const s of ['spr', 'ez', 'bbf']) { await click(`#ms-ksrc button[data-v=${s}]`, 'ksrc');
    for (const m of ['med', 'mean', 'iqm']) { const dis = await p.$eval(`#ms-kmet button[data-v=${m}]`, b => b.disabled); if (!dis) await click(`#ms-kmet button[data-v=${m}]`, 'kmet ' + s) } }
  await shotRange('#ms-h-100k', '#ms-kbars', '100k');
  await shotRange('#ms-h-rec', '#ms-fixes', 'rec-fixes');
  // the corrections list jumps back to the timeline
  await click('#ms-fixes a[data-id]', 'fix link');
  await click('.ms-nav a', 'nav');
  await bad('end');
  await p.close();
}
await b.close();
const real = problems.filter(x => !x.startsWith('INFO'));
problems.filter(x => x.startsWith('INFO')).forEach(x => console.log(x));
real.forEach(x => console.log('PROBLEM ' + x));
console.log('actions ' + actions + ', problems ' + real.length);
process.exit(real.length ? 1 : 0);
