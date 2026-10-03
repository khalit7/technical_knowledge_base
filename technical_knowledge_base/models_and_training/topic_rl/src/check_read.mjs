// Exercise every control of the Reading tab at 390 px dark and 920 px light: the one-episode animation (every
// step, play, pause, speed, every slider at many positions, reset), the decision tree (every path), the
// mistakes table toggle, every link to another tab (Reading and Further reading) and every in-page link; also
// clicks through every other tab and back. Fails on console errors, NaN, undefined or Infinity in the tab text,
// or sideways scroll. Screenshots land in ../.shots/rd-*.png.
// usage: node src/check_read.mjs   (from anywhere)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = path.resolve(here, '../index.html'), shots = path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', args: process.platform === 'linux' ? ['--no-sandbox'] : [] });
let bad = 0;
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto('file://' + file);
  // visit every tab first, then the Reading tab, so hidden-tab redraws are exercised
  for (const t of await p.$$eval('#tabs button', a => a.map(x => x.dataset.t))) { await p.click(`button[data-t=${t}]`); await wait(150); await p.evaluate(() => scrollTo(0, 2000)); }
  await p.click('button[data-t=t-read]'); await wait(200);
  const problems = []; let checks = 0;
  const check = async label => {
    checks++;
    const r = await p.evaluate(() => {
      const t = document.getElementById('t-read').innerText;
      return { nan: /\bNaN\b/.test(t), und: /\bundefined\b/.test(t), inf: /\bInfinity\b/.test(t), side: document.documentElement.scrollWidth > innerWidth };
    });
    if (r.nan || r.und || r.inf || r.side) problems.push(label + ' ' + JSON.stringify(r));
  };
  const shot = async (sel, name) => { const el = await p.$(sel); await el.scrollIntoView(); await wait(150); await el.screenshot({ path: `${shots}/rd-${name}-${scheme}-${width}.png` }) };
  const setRange = async (id, v) => p.$eval('#' + id, (s, v) => { s.value = v; s.dispatchEvent(new Event('input')) }, v);
  const sweep = async (id, label) => { const [mn, mx] = await p.$eval('#' + id, s => [+s.min, +s.max]); let k = 0; for (let j = 0; j <= 10; j++) { await setRange(id, Math.round(mn + (mx - mn) * j / 10)); await check(label + ' ' + j); k++ } return k };
  const tally = {};
  await p.$eval('#rd-one', e => e.scrollIntoView()); await wait(400);
  const n = await p.$eval('#rd-oneC-s', s => +s.max + 1);
  const ids = await p.$$eval('#rd-oneS input', a => a.map(x => x.id));
  tally.sliders = 0;
  for (let i = 0; i < n; i++) { await setRange('rd-oneC-s', i); await check('one step ' + i); for (const id of ids) tally.sliders += await sweep(id, `one ${i} ${id}`); await p.click('#rd-oneR'); await check('reset ' + i) }
  tally.steps = n;
  const ck = id => p.$eval(id, b => b.click());
  await ck('#rd-oneC-b'); await ck('#rd-oneC-f'); await p.select('#rd-oneC-v', '2'); await ck('#rd-oneC-p'); await wait(400); await p.$eval('#rd-oneC-p', b => { if (/Pause/.test(b.textContent)) b.click() }); await p.select('#rd-oneC-v', '1'); await check('one play');
  for (const i of [0, 1, 4, 6, 7]) { await setRange('rd-oneC-s', i); await shot('#rd-one', 'one-' + i) }
  tally.leaves = await p.evaluate(async () => {
    const el = document.getElementById('rd-tree'); let leaves = 0;
    const click = b => b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    async function walk() { const opts = el.querySelectorAll('button[data-k]'); if (!opts.length) { leaves++; if (!document.querySelector(el.querySelector('.leaf a').getAttribute('href'))) leaves = -999; return }
      for (let i = 0; i < opts.length; i++) { click(el.querySelectorAll('button[data-k]')[i]); await walk(); click(el.querySelector('button[data-back]')) } }
    await walk(); return leaves;
  });
  if (tally.leaves < 0) problems.push('a tree leaf links to a missing section');
  await check('tree');
  await p.evaluate(() => { const el = document.getElementById('rd-tree'); el.querySelector('button[data-k="1"]').click(); el.querySelector('button[data-k="0"]').click() }); await shot('#rd-tree', 'tree');
  await p.$eval('#rd-when details', d => d.open = true); await check('table'); await shot('#rd-when', 'when');
  const tabLinks = await p.$$eval('#t-read a[data-tab]', a => a.map(x => x.dataset.tab));
  for (let i = 0; i < tabLinks.length; i++) { await p.evaluate(i => document.querySelectorAll('#t-read a[data-tab]')[i].click(), i); await wait(40);
    const on = await p.evaluate(() => document.querySelector('#tabs button[aria-selected="true"]').dataset.t); if (on === 't-read') problems.push('reading link did not switch: ' + tabLinks[i]);
    await p.click('button[data-t=t-read]'); await wait(60) }
  const moreLinks = await p.$$eval('#t-more a[data-tab]', a => a.map(x => x.dataset.tab));
  for (let i = 0; i < moreLinks.length; i++) { await p.click('button[data-t=t-more]'); await wait(40); await p.evaluate(i => document.querySelectorAll('#t-more a[data-tab]')[i].click(), i); await wait(40);
    const on = await p.evaluate(() => document.querySelector('#tabs button[aria-selected="true"]').dataset.t); if (on === 't-more') problems.push('further reading link did not switch: ' + moreLinks[i]) }
  await p.click('button[data-t=t-read]'); await wait(100);
  const badLinks = await p.$$eval('#t-read a[href^="http"], #t-more a[href^="http"]', a => a.filter(x => x.target !== '_blank' || !/noopener/.test(x.rel)).map(x => x.href));
  if (badLinks.length) problems.push('links without target/rel: ' + badLinks.slice(0, 5).join(' '));
  const inPage = await p.$$eval('#t-read a[href^="#rd-"]', a => a.filter(x => !document.getElementById(x.getAttribute('href').slice(1))).map(x => x.getAttribute('href')));
  if (inPage.length) problems.push('in-page links with no target: ' + inPage.join(' '));
  const lab = await p.evaluate(() => /t-lab/.test(document.getElementById('t-read').innerHTML + document.getElementById('t-more').innerHTML)); if (lab) problems.push('a link to the removed t-lab tab remains');
  await shot('#rd-over', 'over'); await shot('#rd-idea', 'idea'); await shot('#rd-f-pg', 'family');
  await p.click('button[data-t=t-more]'); await wait(150);
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth)) problems.push('further reading sideways scroll');
  await p.screenshot({ path: `${shots}/rd-more-${scheme}-${width}.png` });
  if (errs.length) problems.push('errors ' + JSON.stringify(errs.slice(0, 5)));
  console.log(`${scheme} ${width}: ${JSON.stringify(tally)}, tab links ${tabLinks.length} + ${moreLinks.length}, checks ${checks}; problems ${problems.length}`);
  problems.slice(0, 15).forEach(x => console.log('  ' + x));
  bad += problems.length;
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
