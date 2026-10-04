// Click every control at 390 px dark and 920 px light; check no errors, NaN, undefined or sideways scroll;
// compare the page's derived numbers with recompute.py; save element screenshots to ../.shots/.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/testing_and_quality/src/check_page.mjs
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { execSync } from 'child_process';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const base = path.resolve('technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/testing_and_quality');
const shots = path.join(base, '.shots'); fs.mkdirSync(shots, { recursive: true });
const ref = JSON.parse(execSync('python3 recompute.py', { cwd: path.join(base, 'src') }).toString());
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const problems = []; let actions = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  p.on('pageerror', e => problems.push(w + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push(w + ' console ' + m.text()) });
  await p.goto('file://' + path.join(base, 'index.html'));
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  const tab = async t => { await p.click('#tabs button[data-t="' + t + '"]'); await sleep(150) };
  const check = async label => {
    actions++;
    const r = await p.evaluate(() => {
      const t = [...document.querySelectorAll('.stat, .term:not(.lit), td, #pb-wrap, #ml-why, .mrow, #lay-detail, [data-v]')].map(x => x.innerText).join(' ');
      const all = [...document.querySelectorAll('.tab')].map(x => x.innerText).join(' ');
      const wide = [...document.querySelectorAll('.tab:not([hidden]) *')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > innerWidth + 1 && !e.closest('.cv,.term,.tw,.src,.nav,.tabs,pre') }).map(e => e.tagName + '.' + e.className).slice(0, 3);
      return { bad: /\bNaN\b|Infinity/.test(t) || /undefined/.test(all), q: [...document.querySelectorAll('[data-v]')].filter(e => e.textContent === '?').map(e => e.dataset.v), side: document.documentElement.scrollWidth > innerWidth, wide, err: document.getElementById('jsErr').hidden === false ? document.getElementById('jsErr').textContent : '' };
    });
    if (r.bad) problems.push(w + ' ' + label + ': NaN/undefined in text');
    if (r.q.length) problems.push(w + ' ' + label + ': unfilled data-v ' + r.q.join(','));
    if (r.side) problems.push(w + ' ' + label + ': sideways scroll');
    if (r.wide.length) problems.push(w + ' ' + label + ': overflow ' + r.wide.join(' '));
    if (r.err) problems.push(w + ' ' + label + ': error box ' + r.err);
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(100); await el.screenshot({ path: path.join(shots, 'el-' + name + '-' + w + '.png') }) } };
  const clickAll = async sel => { const n = await p.$$eval(sel, a => a.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(30); await check(sel + ' ' + i) } };
  await tab('t-read'); await check('load');
  const calc = await p.evaluate(() => window.TQ.calc);
  for (const k of Object.keys(ref)) if (String(calc[k]) !== String(ref[k])) problems.push('calc ' + k + ': page ' + calc[k] + ' vs recompute ' + ref[k]);
  // pyramid / trophy
  await clickAll('#lay-card .shape button'); await shot('#lay-card', 'layers');
  // property animation: every mode, every step
  for (const m of ['ex', 'pb', 'fx']) {
    await p.evaluate(m => document.querySelector('#pb-mode button[data-m="' + m + '"]').click(), m); await sleep(50);
    const n = await p.$eval('#pb-ctl-s', s => +s.max + 1);
    for (let i = 0; i < n; i++) { await p.evaluate(i => { const s = document.getElementById('pb-ctl-s'); s.value = i; s.dispatchEvent(new Event('input')) }, i); if (i % 5 === 0 || i === n - 1) await check('pb ' + m + ' ' + i) }
    if (m === 'pb') { const f = await p.$$eval('#pb-strip span.f', a => a.length); if (f !== 14) problems.push(w + ' pb failures at end ' + f) }
    await shot('#pb-card', 'pb-' + m);
  }
  for (const id of ['pb-ctl-b', 'pb-ctl-f', 'pb-ctl-p', 'pb-ctl-p']) { await p.evaluate(i => document.getElementById(i).click(), id); await sleep(40); await check(id) }
  await p.select('#pb-ctl-v', '2'); await check('speed');
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true)); await check('details open');
  await shot('#fl-card', 'flaky'); await shot('#s-mut', 'mut-section');
  await clickAll('#rd-nav a');
  const gl = await p.$$eval('#gloss div', a => a.length); if (gl < 30) problems.push(w + ' glossary has ' + gl);
  // Mutation lab
  await tab('t-mut'); await check('lab');
  for (const pr of ['weak', 'strong', 'all', 'none', 'min']) {
    await p.evaluate(pr => document.querySelector('#ml-pre button[data-m="' + pr + '"]').click(), pr); await sleep(30); await check('preset ' + pr);
    const v = await p.$$eval('#ml-stats .stat .v', a => a.map(x => x.textContent));
    if (pr === 'weak' && (v[1] !== '100%' || v[2] !== Math.round(100 * ref.mutWeak / ref.mutN) + '%')) problems.push('weak preset stats ' + v);
    if (pr === 'strong' && v[2] !== '100%') problems.push('strong preset stats ' + v);
    if (pr === 'min' && (v[2] !== '100%' || !v[0].startsWith(ref.minSet + ' '))) problems.push('min preset stats ' + v);
  }
  await clickAll('#ml-tests input');
  await clickAll('#ml-list .mrow');
  await p.evaluate(() => document.querySelector('#ml-pre button[data-m="weak"]').click()); await p.evaluate(() => document.querySelectorAll('#ml-list .mrow')[8].click());
  await shot('#t-mut', 'lab');
  await tab('t-more'); await check('more');
  const links = await p.$$eval('a[href^="http"]', a => a.filter(x => x.target !== '_blank').length); if (links) problems.push(w + ' links without target ' + links);
  await clickAll('#t-more a[data-tab]');
  await p.close();
}
await browser.close();
console.log(JSON.stringify({ actions, problems: problems.slice(0, 40), nproblems: problems.length }, null, 1));
