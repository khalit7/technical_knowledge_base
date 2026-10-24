// Click every control at 390 px dark and 920 px light; fail on errors, NaN, undefined, Infinity or sideways scroll;
// compare the page's calculators and prose numbers with recompute.py; confirm nothing moves before the reader acts;
// save element screenshots to ../.shots/.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/building_a_backend_api/src/check_page.mjs
import { createRequire } from 'module'; import path from 'path'; import fs from 'fs'; import { execSync } from 'child_process';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const base = path.resolve('technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/building_a_backend_api');
const shots = path.join(base, '.shots'); fs.mkdirSync(shots, { recursive: true });
const ref = JSON.parse(execSync('python3 recompute.py', { cwd: path.join(base, 'src') }).toString());
const browser = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = []; let actions = 0;
const sleep = ms => new Promise(r => setTimeout(r, ms));
const eq = (a, b, l) => { if (JSON.stringify(a) !== JSON.stringify(b)) problems.push(l + ': page ' + JSON.stringify(a) + ' vs recompute ' + JSON.stringify(b)) };
for (const [w, scheme, motion] of [[390, 'dark', 'reduce'], [920, 'light', 'no-preference']]) {
  const p = await browser.newPage();
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: motion }]);
  p.on('pageerror', e => problems.push(w + ' pageerror ' + e.message));
  p.on('console', m => { if (m.type() === 'error') problems.push(w + ' console ' + m.text()) });
  await p.goto('file://' + path.join(base, 'index.html'));
  await p.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  const tab = async t => { await p.click('#tabs button[data-t="' + t + '"]'); await sleep(150) };
  const check = async label => {
    actions++;
    const r = await p.evaluate(() => {
      const t = [...document.querySelectorAll('.tab')].map(x => x.innerText).join(' ');
      return { bad: /\bNaN\b|\bundefined\b|\bInfinity\b|excerpt not found/.test(t), side: document.documentElement.scrollWidth > innerWidth, err: document.getElementById('jsErr').hidden === false };
    });
    if (r.bad) problems.push(w + ' ' + label + ': NaN/undefined/missing excerpt in text');
    if (r.side) problems.push(w + ' ' + label + ': sideways scroll');
    if (r.err) problems.push(w + ' ' + label + ': error box shown');
  };
  const shot = async (sel, name) => { const el = await p.$(sel); if (el) { await el.scrollIntoView(); await sleep(120); await el.screenshot({ path: path.join(shots, 'el-' + name + '-' + w + '.png') }) } };
  const clickAll = async sel => { const n = await p.$$eval(sel, a => a.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await sleep(30); await check(sel + ' ' + i) } };
  const steps = async (ctl, label, name) => { const n = await p.$eval('#' + ctl + '-s', e => +e.max + 1); for (let i = 0; i < n; i++) { if (i) await p.evaluate(c => document.getElementById(c + '-f').click(), ctl); await check(label + ' step ' + i); if (name && (i === 0 || i === n - 1 || i === Math.floor(n / 2))) await shot('#' + ctl.replace('-ctl', '-card'), name + '-' + i) } };
  await tab('t-read'); await check('load');
  // nothing moves before the reader acts: every stepper sits on step 0 after scrolling through the page
  for (const c of ['rd-life-card', 'rd-sd-card', 'rd-llm-card', 'rd-sse-card']) { await p.$eval('#' + c, e => e.scrollIntoView()); await sleep(400) }
  await sleep(1500);
  const moved = await p.$$eval('.an-ctl input[type=range][id$="-ctl-s"]', a => a.filter(x => +x.value !== 0).map(x => x.id)); if (moved.length) problems.push(w + ' autoplay: ' + moved.join(','));
  await shot('#rd-hero', 'hero'); await shot('#rd-onion-svg', 'onion');
  // section 2 stepper
  await steps('rd-life-ctl', 'life', 'life');
  // section 5: hold slider and N+1 presets, against recompute.py
  eq(await p.evaluate(() => [DL.held(10), Math.round(DL.released() * 10) / 10]), [ref.hold.held_10s, ref.hold.released], 'hold');
  eq(await p.evaluate(() => Object.fromEntries(DL.RTT.map(r => [String(r[0]), { many: Math.round(DL.n1(r[0]).many * 1000) / 1000, one: DL.n1(r[0]).one }]))), ref.n1, 'n1');
  for (const v of ['0.5', '10', '30']) { await p.$eval('#rd-hold-s', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await check('hold ' + v) }
  await p.$eval('#rd-hold-s', e => { e.value = '10'; e.dispatchEvent(new Event('input')) }); await shot('#rd-hold-card', 'hold');
  for (const v of ['0', '1', '2', '3']) { await p.$eval('#rd-n1-s', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); await check('n1 ' + v) }
  await p.$eval('#rd-n1-s', e => { e.value = '2'; e.dispatchEvent(new Event('input')) }); await shot('#rd-n1-card', 'n1');
  // section 6: four styles
  for (const m of ['async_blocking', 'async_await', 'plain_def', 'async_blocking_4_workers']) { await p.click('#rd-sty-seg button[data-m="' + m + '"]'); await check('styles ' + m); await shot('#rd-sty-card', 'styles-' + m) }
  // sections 7 and 8 figures
  await shot('#rd-cfg-svg', 'cfg'); await shot('#rd-bg-svg', 'bg');
  // section 9: both variants, every step
  for (const m of ['0', '1']) { await p.click('#rd-sd-seg button[data-m="' + m + '"]'); await steps('rd-sd-ctl', 'shutdown ' + m, 'shut' + m) }
  // section 10: handler stepper, then the stream replay to its end
  await steps('rd-llm-ctl', 'llm', 'llm');
  await steps('rd-sse-ctl', 'sse'); eq(await p.$eval('#rd-sse-ui', e => e.textContent.trim()), 'Here is a short reply.', 'sse final text'); await shot('#rd-sse-card', 'sse');
  // play buttons and speed selects, then the exchanges block (open it, every exchange, every line)
  await clickAll('.an-play'); await sleep(300); await clickAll('.an-play');
  await p.$$eval('details', ds => ds.forEach(d => d.open = true)); await check('details open');
  await clickAll('#wl-list button');
  const wl = await p.$$eval('#wl-res .ln', a => a.length); for (let i = 0; i < wl; i++) await p.evaluate(i => document.querySelectorAll('#wl-res .ln')[i].click(), i);
  await check('wire lines'); await shot('#t-wl', 'wire');
  // prose numbers come from the runs
  const text = await p.$eval('#t-read', e => e.innerText.replace(/\s+/g, ' '));
  for (const s of ref.prose) if (!text.includes(s)) problems.push(w + ' prose missing: ' + s);
  await clickAll('#rd-nav a');
  await tab('t-more');
  const bad = await p.$$eval('#t-more a[href^="http"]', a => a.filter(x => x.target !== '_blank' || !/noopener/.test(x.rel)).length); if (bad) problems.push(bad + ' links without target/rel');
  await check('more');
  await p.close();
}
await browser.close();
console.log(JSON.stringify({ actions, problems }, null, 1));
