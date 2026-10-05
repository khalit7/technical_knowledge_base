// Click every control of the page at 390 px dark and 920 px light: tabs, segmented buttons, animation controls,
// sliders, selects, drills, prefix inputs. Fails on script errors, the error box, NaN/undefined/Infinity in visible
// text, or sideways scroll. Screenshots of each card go to <out dir>.
// Run from the repo root: node technical_knowledge_base/agents_and_retrieval/topic_protocols/networking_foundations/src/check_ui.mjs <out dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve('technical_knowledge_base/agents_and_retrieval/topic_protocols/networking_foundations/index.html');
const out = process.argv[2] || 'shots'; fs.mkdirSync(out, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let fails = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width: w, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await p.goto('file://' + page); await sleep(300);
  const bad = async where => {
    const r = await p.evaluate(() => {
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(t => t.innerText).join('\n');
      const m = vis.match(/.{0,40}\b(NaN|undefined|Infinity)\b.{0,40}/);
      const box = document.getElementById('jsErr');
      return { m: m && m[0], sw: document.documentElement.scrollWidth > innerWidth + 1, box: box && !box.hidden ? box.textContent : '' };
    });
    const msg = [r.m && 'bad text: ' + r.m, r.sw && 'sideways scroll', r.box && 'error box: ' + r.box].filter(Boolean);
    if (msg.length) { fails++; console.log(`${w} ${scheme} ${where}: ${msg.join('; ')}`) }
  };
  const clickAll = async sel => { const n = await p.$$eval(sel, es => es.length);
    for (let i = 0; i < n; i++) { await p.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; e.scrollIntoView({ block: 'center' }); e.click() }, sel, i); await sleep(60) } return n };
  const stepAll = async ctl => { // step every animation to its end and back, through the next-step button
    const n = await p.$eval('#' + ctl + '-s', s => +s.max + 1);
    for (let i = 0; i < n; i++) { await p.click('#' + ctl + '-f'); await sleep(15) }
    await p.evaluate(c => { const s = document.getElementById(c + '-s'); s.value = 0; s.dispatchEvent(new Event('input')) }, ctl);
    return n };
  const shot = async (sel, name) => { const e = await p.$(sel); if (e) await e.screenshot({ path: `${out}/${name}-${w}.png` }) };
  // Reading
  await p.click('button[data-t=t-read]'); await sleep(200);
  for (const [seg, ctl, card] of [[null, 'rd-fsm-ctl', 'rd-fsm-card'], ['#rd-cc-seg button', 'rd-cc-ctl', 'rd-cc-card'], ['#rd-nat-seg button', 'rd-nat-ctl', 'rd-nat-card'], ['#rd-mig-seg button', 'rd-mig-ctl', 'rd-mig-card']]) {
    if (seg) { const k = await p.$$eval(seg, es => es.length);
      for (let i = 0; i < k; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), seg, i); await sleep(50); const n = await stepAll(ctl); await bad(card + ' mode ' + i + ' (' + n + ' steps)'); await p.click('#' + ctl + '-f'); await shot('#' + card, card + '-m' + i) } }
    else { const n = await stepAll(ctl); await bad(card + ' (' + n + ' steps)'); await shot('#' + card, card) }
  }
  for (const v of [['10.0.0.0/16', '10.0.128.0/20'], ['100.64.0.0/10', '172.31.0.0/16'], ['bad', ''], ['169.254.169.254', '0.0.0.0/0']]) {
    await p.evaluate(v => { const a = document.getElementById('rd-cidr-a'), b = document.getElementById('rd-cidr-b'); a.value = v[0]; b.value = v[1]; a.dispatchEvent(new Event('input')) }, v); await sleep(30); await bad('cidr ' + v.join(' ')) }
  await shot('#rd-cidr-card', 'cidr');
  const nd = await clickAll('#rd-drills button[data-j]'); await bad('drills (' + nd + ' answers)');
  await clickAll('#t-read details > summary'); await bad('details');
  for (const id of ['rd-nums', 'rd-winbars', 'rd-wintab', 'rd-wndplot', 'rd-loadplot', 'rd-nodelay', 'rd-backlog', 'rd-mtuplot', 'rd-udpdrop', 'rd-drills']) await shot('#' + id, id);
  // TCP timeline
  await p.click('button[data-t=t-tcp]'); await sleep(200);
  for (const seg of ['#tc-scn', '#tc-rec', '#tc-nag', '#tc-dack']) {
    const k = await p.$$eval(seg + ' button', es => es.length);
    for (let i = 0; i < k; i++) { await p.evaluate((s, i) => document.querySelectorAll(s + ' button')[i].click(), seg, i); await sleep(40); const n = await stepAll('tc-ctl'); await bad('tcp ' + seg + ' ' + i + ' (' + n + ' events)') } }
  for (const v of [10, 200, 100]) { await p.evaluate(v => { const s = document.getElementById('tc-rtt'); s.value = v; s.dispatchEvent(new Event('input')) }, v); await sleep(40); await stepAll('tc-ctl'); await bad('tcp rtt ' + v) }
  await p.evaluate(() => { document.querySelector('#tc-scn button[data-m=mid]').click(); document.querySelector('#tc-rec button[data-m=fast]').click() }); await sleep(50);
  const n = await p.$eval('#tc-ctl-s', s => +s.max); for (let i = 0; i < n; i++) await p.click('#tc-ctl-f');
  await shot('#t-tcp', 'tcp-mid-fast');
  // Throughput lab
  await p.click('button[data-t=t-thru]'); await sleep(200);
  await clickAll('#th-pre button'); await bad('presets');
  for (const id of ['th-win', 'th-loss', 'th-cap', 'th-mss', 'th-size']) {
    const k = await p.$eval('#' + id, s => s.options.length);
    for (let i = 0; i < k; i++) { await p.evaluate((id, i) => { const s = document.getElementById(id); s.selectedIndex = i; s.dispatchEvent(new Event('change')) }, id, i); await sleep(20); await bad(id + ' ' + i) } }
  for (const id of ['th-link', 'th-rtt', 'th-n']) for (const f of [0, 0.5, 1]) {
    await p.evaluate((id, f) => { const s = document.getElementById(id); s.value = +s.min + f * (s.max - s.min); s.dispatchEvent(new Event('input')) }, id, f); await sleep(20); await bad(id + ' ' + f) }
  await p.evaluate(() => document.querySelector('#th-pre button[data-p=xr]').click()); await sleep(50);
  await shot('#t-thru', 'thru');
  await p.click('button[data-t=t-more]'); await sleep(100); await bad('more');
  if (errs.length) { fails++; console.log(`${w} ${scheme} errors:`, errs.slice(0, 5)) }
  await p.close();
}
await b.close();
console.log(fails ? 'FAIL ' + fails : 'ui ok: every control at 390 dark and 920 light, no errors, NaN, undefined or sideways scroll');
process.exit(fails ? 1 : 0);
