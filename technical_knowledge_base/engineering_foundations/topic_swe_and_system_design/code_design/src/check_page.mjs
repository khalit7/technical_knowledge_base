// Click every control at 390 px dark and 920 px light; check no errors, NaN, undefined or sideways scroll;
// compare the page's numbers with recompute.py; save element screenshots to ../.shots/.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/code_design/src/check_page.mjs
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { execSync } from 'child_process';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const base = path.resolve('technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/code_design');
const shots = path.join(base, '.shots'); fs.mkdirSync(shots, { recursive: true });
const ref = JSON.parse(execSync('python3 recompute.py', { cwd: path.join(base, 'src') }).toString());
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const problems = []; let actions = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const eq = (a, b, l) => { if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(l + ': page ' + JSON.stringify(a) + ' vs recompute ' + JSON.stringify(b)) };
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
      const t = [...document.querySelectorAll('.tab')].map(x => x.innerText).join(' ');
      const wide = [...document.querySelectorAll('.tab:not([hidden]) *')].filter(e => { const b = e.getBoundingClientRect(); return b.width > 0 && b.right > innerWidth + 1 && !e.closest('.cv,.df,.tw,.hmwrap,.nav,.tabs,.fm') }).map(e => e.tagName + '.' + e.className).slice(0, 3);
      return { bad: /\bNaN\b|undefined|Infinity/.test(t), q: [...document.querySelectorAll('[data-v]')].filter(e => e.textContent === '?').map(e => e.dataset.v), side: document.documentElement.scrollWidth > innerWidth, wide, err: document.getElementById('jsErr').hidden === false };
    });
    if (r.bad) problems.push(w + ' ' + label + ': NaN/undefined in text');
    if (r.q.length) problems.push(w + ' ' + label + ': unfilled data-v ' + r.q.join(','));
    if (r.side) problems.push(w + ' ' + label + ': sideways scroll');
    if (r.wide.length) problems.push(w + ' ' + label + ': overflow ' + r.wide.join(' '));
    if (r.err) problems.push(w + ' ' + label + ': error box shown');
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(100); await el.screenshot({ path: path.join(shots, 'el-' + name + '-' + w + '.png') }) } };
  const clickAll = async sel => { const n = await p.$$eval(sel, a => a.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(30); await check(sel + ' ' + i) } };
  await tab('t-read'); await check('load');
  eq(await p.$eval('[data-v="calc.pdRatio"]', e => e.textContent), ref.pdRatio, 'pydantic/dataclass ratio');
  // concerns toggle
  await clickAll('#cnc-seg button'); await p.click('#cnc-seg button[data-m="0"]'); await shot('#cnc-card', 'concerns');
  // LLM call scenarios
  await clickAll('#llm-seg button');
  const nones = await p.$$eval('#llm-tab tbody tr', rs => rs.filter(r => r.children[1].textContent === 'returns None').length); eq(nones, ref.before_none, 'before returns None');
  await p.click('#llm-seg button[data-m="2"]'); await shot('#llm-card', 'llm');
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true)); await check('details open');
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = false));
  await shot('#dep-card', 'depth'); await shot('#bench-bars', 'bench'); await shot('#lay', 'layers');
  // refactor animation: step through every step in both modes and compare counters
  const counters = async () => p.$$eval('#rf-cnt .stat .v', a => a.map(x => x.textContent));
  await p.evaluate(() => document.querySelector('#rf-seg button[data-m="steps"]').click()); await sleep(50);
  await p.evaluate(() => { const s = document.getElementById('rf-ctl-s'); s.value = 0; s.dispatchEvent(new Event('input')) });
  const cc = [], lines = [], passed = [];
  for (let i = 0; i < ref.cc.length; i++) {
    if (i) await p.evaluate(() => document.getElementById('rf-ctl-f').click());
    const c = await counters(); lines.push(+c[0]); cc.push(+c[1]); passed.push(+c[2].split('/')[0]); await check('refactor step ' + i);
    if (i === 0 || i === 8 || i === 10) await shot('#rf-card', 'refactor-' + i);
  }
  eq(cc, ref.cc, 'refactor cc'); eq(lines, ref.lines, 'refactor lines'); eq(passed, ref.passed, 'refactor passed');
  await p.evaluate(() => document.querySelector('#rf-seg button[data-m="bang"]').click()); await sleep(50);
  await p.evaluate(() => document.getElementById('rf-ctl-f').click()); await check('bang');
  const cb = await counters(); eq({ cc: +cb[1], lines: +cb[0], passed: +cb[2].split('/')[0] }, { cc: ref.bang.cc, lines: ref.bang.lines, passed: ref.bang.passed }, 'rewrite');
  await shot('#rf-card', 'refactor-bang');
  for (const id of ['rf-ctl-b', 'rf-ctl-p', 'rf-ctl-p']) { await p.evaluate(i => document.getElementById(i).click(), id); await sleep(40); await check(id) }
  await p.select('#rf-ctl-v', '2'); await check('speed');
  // glossary links and nav
  const gl = await p.$$eval('#gloss div', a => a.filter(d => d.textContent.trim().endsWith(':')).length); if (gl) problems.push(w + ' ' + gl + ' glossary terms without definition');
  await clickAll('#rd-nav a');
  // Review lab
  await tab('t-review'); await check('review');
  const n = await p.$$eval('#rv-list button', a => a.length);
  for (let i = 0; i < n; i++) {
    await p.evaluate(i => document.querySelectorAll('#rv-list button')[i].click(), i); await check('rv ' + i);
    await p.click('#rv-show'); await sleep(30); await check('rv reveal ' + i);
    const ev = await p.$eval('#rv-body', e => e.innerText); if (!/Evidence/.test(ev) || !/Verdict/.test(ev)) problems.push(w + ' rv ' + i + ' reveal incomplete');
    if (i === 0 || i === 5 || i === 10) await shot('#t-review', 'review-' + i);
  }
  await p.click('#rv-all'); await clickAll('#rv-next'); await p.click('#rv-prev'); await check('rv prev');
  await tab('t-more'); await check('more');
  const links = await p.$$eval('#t-more a[href^="http"]', a => a.filter(x => x.target !== '_blank').length); if (links) problems.push(w + ' links without target');
  await shot('#t-more', 'more');
  await p.close();
}
await browser.close();
console.log(JSON.stringify({ actions, problems }, null, 1));
