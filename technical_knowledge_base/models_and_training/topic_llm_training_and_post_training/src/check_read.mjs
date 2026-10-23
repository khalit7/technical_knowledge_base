// Exercise every control of the Reading tab at 390 px dark and 920 px light: grid cells, the two animations
// (every mode, every step, play, pause, speed; neither moves before the reader acts), the path chips and script-written tab links.
// Fails on console errors, NaN or undefined in the tab text, or sideways scroll. Screenshots land in ../.shots/rd-*.png.
// usage: node src/check_read.mjs   (from the page folder or anywhere)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve(here, '../index.html'), shots = path.resolve(here, '../.shots');
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + file);
  await p.click('button[data-t=t-read]'); await wait(200);
  const problems = [];
  const check = async label => {
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-read').innerText;
      return { nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), side: document.documentElement.scrollWidth > innerWidth };
    });
    if (r.nan || r.und || r.side) problems.push(label + ' ' + JSON.stringify(r));
  };
  const shot = async (sel, name) => { const el = await p.$(sel); await el.scrollIntoView(); await wait(150); await el.screenshot({ path: `${shots}/rd-${name}-${scheme}-${width}.png` }) };
  const clickAll = async sel => { const n = await p.$$eval(sel, a => a.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await wait(20) } return n };
  // grid
  const cells = await clickAll('#rd-grid td button'); await check('grid');
  await p.evaluate(() => document.querySelector('#rd-grid td button[data-r="1"][data-c="2"]').click());
  await shot('#rd-over', 'grid');
  // a script-written tab link (Scaling calculator) switches tabs, then come back
  await p.evaluate(() => document.querySelector('#rd-gdet a[data-tab]').click()); await wait(150);
  const onTab = await p.evaluate(() => document.querySelector('#tabs button[aria-selected="true"]').dataset.t);
  if (onTab === 't-read') problems.push('grid detail tab link did not switch tab');
  await p.click('button[data-t=t-read]'); await wait(150);
  // step-through helper for an animation controller
  const stepAll = async (ctl, label) => {
    const n = await p.$eval(`#${ctl}-s`, s => +s.max + 1);
    for (let i = 0; i < n; i++) { await p.$eval(`#${ctl}-s`, (s, i) => { s.value = i; s.dispatchEvent(new Event('input')) }, i); await check(`${label} step ${i}`) }
    const ck = id => p.$eval(id, b => b.click());
    await ck(`#${ctl}-b`); await ck(`#${ctl}-f`);
    await p.select(`#${ctl}-v`, '2'); await ck(`#${ctl}-p`); await wait(500); await ck(`#${ctl}-p`); await p.select(`#${ctl}-v`, '1');
    await check(label + ' play');
    return n;
  };
  const scrub = (ctl, i) => p.$eval(`#${ctl}-s`, (s, i) => { s.value = i; s.dispatchEvent(new Event('input')) }, i);
  // hero and nothing moves before the reader acts: scroll past both animations, wait, the scrubbers must not have moved
  await shot('#rd-hero', 'hero');
  const pos0 = await p.evaluate(() => ['rd-dtC-s', 'rd-rlC-s'].map(i => document.getElementById(i).value));
  for (const id of ['#rd-dt', '#rd-rl']) { await p.$eval(id, e => e.scrollIntoView()); await wait(1600) }
  const pos1 = await p.evaluate(() => ['rd-dtC-s', 'rd-rlC-s'].map(i => document.getElementById(i).value));
  if (JSON.stringify(pos0) !== JSON.stringify(pos1)) problems.push('an animation moved before the reader acted ' + pos0 + ' -> ' + pos1);
  await p.$eval('#rd-rlM button[data-m=grpo]', b => b.click()); await wait(1600);
  if (await p.$eval('#rd-rlC-s', s => s.value) !== '0') problems.push('rl mode switch started playback');
  await p.$eval('#rd-rlM button[data-m=ppo]', b => b.click());
  // Axis 2: data
  await p.$eval('#rd-dt', e => e.scrollIntoView()); await wait(300);
  const ndt = await stepAll('rd-dtC', 'data'); await scrub('rd-dtC', 1); await shot('#rd-dt', 'data-mid'); await scrub('rd-dtC', ndt - 1); await shot('#rd-dt', 'data-end');
  // Axis 3: PPO, GRPO, DPO
  await p.$eval('#rd-rl', e => e.scrollIntoView()); await wait(300);
  let nrl = 0;
  for (const m of ['ppo', 'grpo', 'dpo']) {
    await p.$eval(`#rd-rlM button[data-m=${m}]`, b => b.click()); await wait(100);
    const hd = await p.$eval('#rd-rlRH', e => e.textContent); if (!hd.includes({ ppo: '1 per', grpo: '8 per', dpo: 'Fixed' }[m])) problems.push('rl mode ' + m + ' not shown: ' + hd);
    nrl += await stepAll('rd-rlC', 'rl ' + m); await scrub('rd-rlC', 3); await shot('#rd-rl', 'rl-' + m);
  }
  // Choosing
  const nch = await clickAll('#rd-chF button'); await check('choose'); await shot('#rd-choose', 'choose');
  const det = await clickAll('#t-read details.mist summary'); await check('mistakes');
  if (errs.length) problems.push('errors ' + JSON.stringify(errs));
  console.log(`${scheme} ${width}: grid cells ${cells}, data steps ${ndt}, rl steps ${nrl}, paths ${nch}, mistakes ${det}; problems ${problems.length}`);
  problems.slice(0, 10).forEach(x => console.log('  ' + x));
  bad += problems.length;
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
