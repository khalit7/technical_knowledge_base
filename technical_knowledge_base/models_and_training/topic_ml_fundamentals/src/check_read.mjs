// Exercise every control of the Reading tab at 390 px dark and 920 px light: the step strip (both recipes, every stage,
// every stage button, the script-written tab link), the five-network animation (every network, every comparison, every step,
// the thread buttons that load it), the loss explorer, cross entropy split, update geometry, schedules, weight decay,
// BPTT and ROC/PR controls, and every link to another tab. Fails on console errors, NaN or undefined in the tab text,
// or sideways scroll. Screenshots land in ../.shots/rd-*.png.
// usage: node src/check_read.mjs   (from anywhere)
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
  const clickAll = async sel => { const n = await p.$$eval(sel, a => a.length); for (let i = 0; i < n; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), sel, i); await wait(20); await check(sel + ' ' + i) } return n };
  const setRange = async (id, v) => p.$eval('#' + id, (s, v) => { s.value = v; s.dispatchEvent(new Event('input')) }, v);
  const sweep = async (id, label) => { const [mn, mx] = await p.$eval('#' + id, s => [+s.min, +s.max]); const vals = [mn, mx, Math.round((mn + mx) / 2), mn + 1, mx - 1]; for (let k = 0; k <= 10; k++) vals.push(Math.round(mn + (mx - mn) * k / 10)); for (const v of vals) { await setRange(id, v); await check(label + ' ' + v) } return vals.length };
  const stepAll = async (ctl, label) => {
    const n = await p.$eval(`#${ctl}-s`, s => +s.max + 1);
    for (let i = 0; i < n; i++) { await setRange(ctl + '-s', i); await check(`${label} step ${i}`) }
    const ck = id => p.$eval(id, b => b.click());
    await ck(`#${ctl}-b`); await ck(`#${ctl}-f`);
    await p.select(`#${ctl}-v`, '2'); await ck(`#${ctl}-p`); await wait(400); await ck(`#${ctl}-p`); await p.select(`#${ctl}-v`, '0.5'); await p.select(`#${ctl}-v`, '1');
    await check(label + ' play');
    return n;
  };
  const tabBack = async (label) => {
    const on = await p.evaluate(() => document.querySelector('#tabs button[aria-selected="true"]').dataset.t);
    if (on === 't-read') problems.push(label + ': tab link did not switch tab');
    await p.click('button[data-t=t-read]'); await wait(120);
  };
  // step strip
  let nst = 0;
  for (const r of ['classic', 'modern']) {
    await p.$eval(`#rd-stR button[data-r=${r}]`, b => b.click()); await wait(80);
    nst += await stepAll('rd-stC', 'strip ' + r); await clickAll('#rd-stS button');
    const cap = await p.$eval('#rd-stT', e => e.textContent); if (!cap.startsWith('7')) problems.push('strip last button did not select stage 7: ' + cap);
    for (const i of [0, 3]) { await p.evaluate(i => document.querySelectorAll('#rd-stS button')[i].click(), i); await shot('#rd-st', `strip-${r}-${i + 1}`) }
  }
  await p.evaluate(() => document.querySelectorAll('#rd-stS button')[6].click());
  await p.evaluate(() => document.querySelector('#rd-stP a[data-tab]').click()); await wait(120); await tabBack('strip caption');
  // the five networks
  await p.$eval('#rd-vn', e => e.scrollIntoView()); await wait(300);
  let nvn = 0;
  for (let m = 0; m < 5; m++) {
    await p.evaluate(m => document.querySelectorAll('#rd-vnM button')[m].click(), m); await wait(60);
    for (let g = 0; g < 5; g++) { await p.select('#rd-vnG', String(g)); await check(`vn ${m} vs ${g}`) }
    await p.select('#rd-vnG', m === 4 ? '0' : '4');
    nvn += await stepAll('rd-vnC', 'vn ' + m);
    await setRange('rd-vnC-s', 34); await shot('#rd-vn', 'vn-' + m + '-end');
  }
  await setRange('rd-vnC-s', 9); await shot('#rd-vn', 'vn-4-mid');
  const nld = await clickAll('#rd-t2C button, .rd-ld');
  // loss explorer and cross entropy split
  let nsl = await sweep('rd-lsP', 'loss p') + await sweep('rd-lsG', 'loss gamma');
  await setRange('rd-lsP', 600); await setRange('rd-lsG', 20); await shot('#rd-ls', 'loss');
  const npre = await p.$$eval('#rd-ceB button', a => a.length);
  for (let k = 0; k < npre; k++) { await p.evaluate(k => document.querySelectorAll('#rd-ceB button')[k].click(), k); nsl += await sweep('rd-ceQ', 'ce ' + k); await setRange('rd-ceQ', 40); await shot('#rd-ce', 'ce-' + k) }
  // update geometry, schedules
  await p.$eval('#rd-ug', e => e.scrollIntoView()); await wait(300);
  const nug = await stepAll('rd-ugC', 'geometry');
  for (const i of [0, 5, 6, 7]) { await setRange('rd-ugC-s', i); await shot('#rd-ug', 'ug-' + i) }
  nsl += await sweep('rd-scE', 'schedule'); await setRange('rd-scE', 60); await shot('#rd-sc', 'sched');
  // weight decay, both optimisers
  await p.$eval('#rd-wd', e => e.scrollIntoView()); await wait(300);
  let nwd = 0;
  for (const m of ['l2', 'adamw']) { await p.$eval(`#rd-wdM button[data-m=${m}]`, b => b.click()); await wait(60); nwd += await stepAll('rd-wdC', 'wd ' + m); await setRange('rd-wdC-s', 30); await shot('#rd-wd', 'wd-' + m) }
  // BPTT and ROC/PR
  nsl += await sweep('rd-bpW', 'bptt w') + await sweep('rd-bpF', 'bptt bf');
  for (const [w, f] of [[300, 60], [30, -20], [250, 30], [100, 10]]) { await setRange('rd-bpW', w); await setRange('rd-bpF', f); await check(`bptt ${w} ${f}`) }
  await shot('#rd-bp', 'bptt');
  nsl += await sweep('rd-prP', 'pr prevalence') + await sweep('rd-prD', 'pr dprime') + await sweep('rd-prT', 'pr threshold');
  await setRange('rd-prP', 0); await setRange('rd-prD', 20); await setRange('rd-prT', 150); await shot('#rd-pr', 'pr-50');
  await setRange('rd-prP', 85); await shot('#rd-pr', 'pr-rare');
  // every link from the Reading tab to another tab
  const tabLinks = await p.$$eval('#t-read a[data-tab]', a => a.map(x => x.dataset.tab));
  for (let i = 0; i < tabLinks.length; i++) { await p.evaluate(i => document.querySelectorAll('#t-read a[data-tab]')[i].click(), i); await wait(60); await tabBack('reading link ' + tabLinks[i]) }
  // external links carry target and rel
  const badLinks = await p.$$eval('#t-read a[href^="http"], #t-more a[href^="http"]', a => a.filter(x => x.target !== '_blank' || !/noopener/.test(x.rel)).map(x => x.href));
  if (badLinks.length) problems.push('links without target/rel: ' + badLinks.slice(0, 5).join(' '));
  const inPage = await p.$$eval('#t-read a[href^="#rd-"]', a => a.filter(x => !document.getElementById(x.getAttribute('href').slice(1))).map(x => x.getAttribute('href')));
  if (inPage.length) problems.push('in-page links with no target: ' + inPage.join(' '));
  await shot('#rd-over', 'over');
  if (errs.length) problems.push('errors ' + JSON.stringify(errs.slice(0, 5)));
  console.log(`${scheme} ${width}: strip steps ${nst}, network steps ${nvn}, thread loaders ${nld}, slider positions ${nsl}, geometry steps ${nug}, decay frames ${nwd}, tab links ${tabLinks.length}, checks ${checks}; problems ${problems.length}`);
  problems.slice(0, 12).forEach(x => console.log('  ' + x));
  bad += problems.length;
  await p.close();
}
await b.close();
process.exit(bad ? 1 : 0);
