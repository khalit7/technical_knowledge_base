// Exercise every control of the Reading tab at 390 px dark and 920 px light: the spine table, discount slider,
// Monte Carlo sampler, student diagram (every object, every node, the gamma slider), bandit (every strategy, seed
// and step), gridworld (both methods, every step), one-episode targets (every step, every slider), the dial, the
// deadly triad, maximisation bias, the policy-gradient and PPO animations, the GRPO group (every preset, kind, step
// and response), the decision tree (every path), every link to another tab and every in-page link.
// Fails on console errors, NaN, undefined or Infinity in the tab text, or sideways scroll. Screenshots: ../.shots/rd-*.png
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
  const clickAll = async sel => { const n = await p.$$eval(sel, a => a.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].dispatchEvent(new MouseEvent('click', { bubbles: true })), sel, i); await wait(15); await check(sel + ' ' + i) } return n };
  const setRange = async (id, v) => p.$eval('#' + id, (s, v) => { s.value = v; s.dispatchEvent(new Event('input')) }, v);
  const sweep = async (id, label) => { const [mn, mx] = await p.$eval('#' + id, s => [+s.min, +s.max]); const vals = [mn, mx, Math.round((mn + mx) / 2)]; for (let k = 0; k <= 8; k++) vals.push(Math.round(mn + (mx - mn) * k / 8)); for (const v of vals) { await setRange(id, v); await check(label + ' ' + v) } return vals.length };
  const stepAll = async (ctl, label, stride = 1) => {
    const n = await p.$eval(`#${ctl}-s`, s => +s.max + 1);
    for (let i = 0; i < n; i += stride) { await setRange(ctl + '-s', i); await check(`${label} step ${i}`) }
    await setRange(ctl + '-s', n - 1); await check(`${label} last`);
    const ck = id => p.$eval(id, b => b.click());
    await ck(`#${ctl}-b`); await ck(`#${ctl}-f`);
    await p.select(`#${ctl}-v`, '2'); await ck(`#${ctl}-p`); await wait(350); await ck(`#${ctl}-p`); await p.select(`#${ctl}-v`, '1');
    await p.$eval(`#${ctl}-p`, b => { if (/Pause/.test(b.textContent)) b.click() });
    await check(label + ' play');
    return n;
  };
  const seg = async (sel, attr, val) => { await p.$eval(`${sel} button[${attr}="${val}"]`, b => b.click()); await wait(40) };
  const tabBack = async label => {
    const on = await p.evaluate(() => document.querySelector('#tabs button[aria-selected="true"]').dataset.t);
    if (on === 't-read') problems.push(label + ': tab link did not switch tab');
    await p.click('button[data-t=t-read]'); await wait(100);
  };
  // scroll every card into view once, so each animation's first-view autoplay has happened before it is driven
  for (const id of await p.$$eval('#t-read .card[id]', a => a.map(x => x.id))) { await p.$eval('#' + id, e => e.scrollIntoView()); await wait(60) }
  await wait(300);
  const tally = {};
  // overview and section 3 to 5
  tally.spine = await clickAll('#rd-spine tr[data-go]');
  tally.sliders = await sweep('rd-discS', 'discount'); await setRange('rd-discS', 90); await shot('#rd-disc', 'disc');
  for (const g of ['0.5', '0.9', '1']) { await p.select('#rd-mcG', g); for (const id of ['rd-mc1', 'rd-mc10', 'rd-mc100']) { await p.click('#' + id); await check('mc ' + g + ' ' + id) } }
  await p.select('#rd-mcG', '0.5'); await p.click('#rd-mc10'); await shot('#rd-mc', 'mc'); await p.click('#rd-mcR'); await check('mc reset');
  tally.nodes = 0;
  for (const m of ['mrp', 'unif', 'opt']) { await seg('#rd-smM', 'data-m', m); tally.sliders += await sweep('rd-smG', 'student ' + m); await setRange('rd-smG', 100);
    const nn = await p.$$eval('#rd-smP .rd-smN', a => a.length); for (let i = 0; i < nn; i++) { await p.evaluate(i => document.querySelectorAll('#rd-smP .rd-smN')[i].dispatchEvent(new MouseEvent('click', { bubbles: true })), i); await check('student ' + m + ' node ' + i); tally.nodes++ }
    await p.evaluate(() => document.querySelector('#rd-smP .rd-smN[data-i="2"]').dispatchEvent(new MouseEvent('click', { bubbles: true }))); await shot('#rd-sm', 'student-' + m) }
  // bandit
  tally.bandit = 0;
  for (const k of ['greedy', 'eps', 'opt', 'ucb']) { await seg('#rd-bdM', 'data-k', k); for (const s of ['1', '3', '5']) { await p.select('#rd-bdS', s); tally.bandit += await stepAll('rd-bdC', `bandit ${k} ${s}`, k === 'eps' && s === '3' ? 1 : 25) } await shot('#rd-bd', 'bandit-' + k) }
  // gridworld
  tally.grid = 0;
  for (const m of ['vi', 'ql']) { await seg('#rd-gwM', 'data-m', m); tally.grid += await stepAll('rd-gwC', 'grid ' + m); await setRange('rd-gwC-s', 2); await shot('#rd-gw', 'grid-' + m + '-early'); const n = await p.$eval('#rd-gwC-s', s => +s.max); await setRange('rd-gwC-s', n); await shot('#rd-gw', 'grid-' + m + '-end') }
  // one episode, every target
  tally.one = await stepAll('rd-oneC', 'one');
  const oneSl = await p.$$eval('#rd-oneS input', a => a.map(x => x.id));
  for (const id of oneSl) { await setRange('rd-oneC-s', 4); tally.sliders += await sweep(id, 'one ' + id) }
  await p.click('#rd-oneR'); await check('one reset');
  for (const i of [0, 4, 5, 8]) { await setRange('rd-oneC-s', i); await shot('#rd-one', 'one-' + i) }
  // dial
  await p.click('#rd-dlB'); await check('dial reveal');
  tally.sliders += await sweep('rd-dlE', 'dial error') + await sweep('rd-dlL', 'dial lambda');
  await setRange('rd-dlE', 30); await setRange('rd-dlL', 50); await shot('#rd-dl', 'dial');
  // triad and max bias
  tally.triad = 0;
  for (const m of ['off', 'on']) { await seg('#rd-trM', 'data-m', m); tally.triad += await stepAll('rd-trC', 'triad ' + m); tally.sliders += await sweep('rd-trG', 'triad g ' + m) + await sweep('rd-trA', 'triad a ' + m); await setRange('rd-trG', 90); await setRange('rd-trA', 10); await setRange('rd-trC-s', 30); await shot('#rd-tr', 'triad-' + m) }
  tally.sliders += await sweep('rd-mxN', 'maxbias n') + await sweep('rd-mxS', 'maxbias s'); await setRange('rd-mxN', 10); await setRange('rd-mxS', 10); await shot('#rd-mx', 'maxbias');
  // policy gradient
  tally.pg = 0;
  for (const s of ['5', '6', '7', '8']) { await p.select('#rd-pgS', s); tally.pg += await stepAll('rd-pgC', 'pg seed ' + s, s === '5' ? 1 : 6) }
  await p.select('#rd-pgS', '5'); tally.sliders += await sweep('rd-pgO', 'pg offset');
  for (const o of [0, 10]) { await setRange('rd-pgO', o); await setRange('rd-pgC-s', 8); await shot('#rd-pgc', 'pg-off' + o + '-8'); await setRange('rd-pgC-s', 60); await shot('#rd-pgc', 'pg-off' + o + '-end') }
  await setRange('rd-pgO', 0);
  // PPO
  tally.ppo = 0;
  for (const a of ['1', '-1']) { await seg('#rd-ppM', 'data-a', a); tally.ppo += await stepAll('rd-ppC', 'ppo ' + a); tally.sliders += await sweep('rd-ppE', 'ppo eps ' + a) + await sweep('rd-ppH', 'ppo eta ' + a); await setRange('rd-ppE', 20); await setRange('rd-ppH', 20); await setRange('rd-ppC-s', 10); await shot('#rd-pp', 'ppo-' + a) }
  await setRange('rd-ppH', 50); await setRange('rd-ppC-s', 3); await shot('#rd-pp', 'ppo-overshoot'); await setRange('rd-ppH', 20);
  // GRPO
  tally.grpo = 0;
  for (const pr of ['a', 'b', 'c', 'd']) { await seg('#rd-grG', 'data-p', pr); for (const k of ['grpo', 'drgrpo', 'rloo']) { await seg('#rd-grK', 'data-k', k); tally.grpo += await stepAll('rd-grC', `grpo ${pr} ${k}`) } await seg('#rd-grK', 'data-k', 'grpo'); await setRange('rd-grC-s', 4); await shot('#rd-gr', 'grpo-' + pr) }
  await seg('#rd-grG', 'data-p', 'a'); await setRange('rd-grC-s', 4);
  tally.grpoClicks = await clickAll('#rd-grP .rd-grR');
  // decision tree: every path, depth first
  tally.leaves = await p.evaluate(async () => {
    const el = document.getElementById('rd-tree'); let leaves = 0;
    const click = b => b.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    async function walk(depth) {
      const opts = [...el.querySelectorAll('button[data-k]')];
      if (!opts.length) { leaves++; return }
      for (let i = 0; i < opts.length; i++) { click(el.querySelectorAll('button[data-k]')[i]); await walk(depth + 1); click(el.querySelector('button[data-back]')) }
    }
    await walk(0); return leaves;
  });
  await check('tree');
  await p.evaluate(() => { const el = document.getElementById('rd-tree'); el.querySelector('button[data-k="1"]').click(); el.querySelector('button[data-k="0"]').click() }); await shot('#rd-tree', 'tree');
  // every link from the Reading tab to another tab
  const tabLinks = await p.$$eval('#t-read a[data-tab]', a => a.map(x => x.dataset.tab));
  for (let i = 0; i < tabLinks.length; i++) { await p.evaluate(i => document.querySelectorAll('#t-read a[data-tab]')[i].click(), i); await wait(40); await tabBack('reading link ' + tabLinks[i]) }
  const moreLinks = await p.$$eval('#t-more a[data-tab]', a => a.map(x => x.dataset.tab));
  for (let i = 0; i < moreLinks.length; i++) { await p.click('button[data-t=t-more]'); await wait(40); await p.evaluate(i => document.querySelectorAll('#t-more a[data-tab]')[i].click(), i); await wait(40);
    const on = await p.evaluate(() => document.querySelector('#tabs button[aria-selected="true"]').dataset.t); if (on === 't-more') problems.push('further reading link did not switch: ' + moreLinks[i]) }
  await p.click('button[data-t=t-read]'); await wait(100);
  const badLinks = await p.$$eval('#t-read a[href^="http"], #t-more a[href^="http"]', a => a.filter(x => x.target !== '_blank' || !/noopener/.test(x.rel)).map(x => x.href));
  if (badLinks.length) problems.push('links without target/rel: ' + badLinks.slice(0, 5).join(' '));
  const inPage = await p.$$eval('#t-read a[href^="#rd-"]', a => a.filter(x => !document.getElementById(x.getAttribute('href').slice(1))).map(x => x.getAttribute('href')));
  if (inPage.length) problems.push('in-page links with no target: ' + inPage.join(' '));
  await shot('#rd-over', 'over');
  await p.click('button[data-t=t-more]'); await wait(150); await check('more');
  const sideMore = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth); if (sideMore) problems.push('further reading sideways scroll');
  await p.screenshot({ path: `${shots}/rd-more-${scheme}-${width}.png` });
  if (errs.length) problems.push('errors ' + JSON.stringify(errs.slice(0, 5)));
  console.log(`${scheme} ${width}: ${JSON.stringify(tally)}, tab links ${tabLinks.length} + ${moreLinks.length}, checks ${checks}; problems ${problems.length}`);
  problems.slice(0, 15).forEach(x => console.log('  ' + x));
  bad += problems.length;
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
