// Click every control of the page at 390 px dark and 920 px light: tabs, segmented buttons, every animation step,
// byte fields, presets, both pane selects, sliders, calculators, drills, details; then, at normal motion, that the rebinding animation plays once in view
// and the two widgets (resolver lab, change planner) never play by themselves (2026-11-06 rule; the 3D stages are checked by check_stages.mjs). Fails on script errors, the error box,
// NaN/undefined/Infinity in visible text, or sideways scroll. Screenshots of each card go to <out dir>.
// Run from the repo root: node technical_knowledge_base/engineering_foundations/topic_protocols/dns/src/check_ui.mjs <out dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(path.resolve('html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve('technical_knowledge_base/engineering_foundations/topic_protocols/dns/index.html');
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
    for (let i = 0; i < n; i++) { await p.evaluate((s, i) => { const e = document.querySelectorAll(s)[i]; e.scrollIntoView({ block: 'center' }); e.click() }, sel, i); await sleep(40) } return n };
  const stepAll = async ctl => {
    const n = await p.$eval('#' + ctl + '-s', s => +s.max + 1);
    await p.evaluate(c => { const s = document.getElementById(c + '-s'); s.value = 0; s.dispatchEvent(new Event('input')) }, ctl);
    for (let i = 0; i < n; i++) { await p.click('#' + ctl + '-f'); await sleep(12) }
    return n };
  const shot = async (sel, name) => { const e = await p.$(sel); if (e) await e.screenshot({ path: `${out}/${name}-${w}.png` }) };
  // Reading
  await p.click('button[data-t=t-read]'); await sleep(200);
  for (const [seg, ctl, card] of [['#rb-mode button', 'rb-ctl', 'rb-card']]) {
    const k = await p.$$eval(seg, es => es.length);
    for (let i = 0; i < k; i++) { await p.evaluate((s, i) => document.querySelectorAll(s)[i].click(), seg, i); await sleep(50); const n = await stepAll(ctl); await bad(card + ' mode ' + i + ' (' + n + ' steps)'); await shot('#' + card, card + '-m' + i) } }
  for (let i = 0; i < 3; i++) { await p.evaluate(i => document.querySelectorAll('#wa-pick button')[i].click(), i); await sleep(30);
    const nb = await p.$$eval('#wa-hex span', es => es.length);
    for (let j = 0; j < nb; j += 3) { await p.evaluate(j => document.querySelectorAll('#wa-hex span')[j].click(), j) } await bad('wire ' + i + ' (' + nb + ' bytes)'); await shot('#wa-card', 'wire-' + i) }
  await p.evaluate(() => document.querySelectorAll('#t-read details').forEach(d => d.open = true));
  const nd = await clickAll('#rd-drills button[data-j]'); await bad('drills (' + nd + ' answers)');
  await bad('details');
  for (const id of ['tr-card', 'dp-card', 'sh-card', 'tt-chart', 'nx-chart', 'st-stale', 'rr-rows', 'st-dead', 'st-err', 'st-http', 'k8-tab', 'k8-loop', 'ds-root', 'wa-trunc', 'rd-drills']) await shot('#' + id, id);
  // The resolver lab (Reading section 7, moved from its own tab on 2026-10-24)
  const np = await p.$$eval('#pd-pre button', es => es.length);
  for (let i = 0; i < np; i++) { await p.evaluate(i => document.querySelectorAll('#pd-pre button')[i].click(), i); await sleep(30); const n = await stepAll('pd-ctl'); await bad('pod preset ' + i + ' (' + n + ' steps)'); await shot('#pd-card', 'pod-' + i) }
  for (const pane of ['pd-a', 'pd-b']) {
    const k = await p.$eval('#' + pane + ' select', s => s.options.length);
    for (let i = 0; i < k; i++) { await p.evaluate((pn, i) => { const s = document.querySelector('#' + pn + ' select'); s.selectedIndex = i; s.dispatchEvent(new Event('change')) }, pane, i); await sleep(15); await bad(pane + ' option ' + i) } }
  await p.evaluate(() => [...document.querySelectorAll('#pd-card details > summary')].forEach(s => s.click())); await bad('pod details');
  // Planning a change (Reading section 5, moved from the Cache timeline tab)
  for (const id of ['cc-old', 'cc-new', 'cc-lead', 'cc-jvm', 'cc-pin']) for (const f of [0, 0.5, 1]) {
    await p.evaluate((id, f) => { const s = document.getElementById(id); s.value = Math.round(+s.min + f * (s.max - s.min)); s.dispatchEvent(new Event('input')) }, id, f); await sleep(20); await stepAll('cc-ctl'); await bad(id + ' ' + f) }
  for (const id of ['cc-old', 'cc-new', 'cc-lead', 'cc-jvm', 'cc-pin']) await p.evaluate(id => { const s = document.getElementById(id); s.value = { 'cc-old': 3, 'cc-new': 1, 'cc-lead': 4, 'cc-jvm': 20, 'cc-pin': 5 }[id]; s.dispatchEvent(new Event('input')) }, id);
  for (const [id, v] of [['nc-min', '0'], ['fo-thr', '1'], ['ns-ttl', '0'], ['nc-ttl', '']]) { await p.evaluate((id, v) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('input')) }, id, v); await sleep(20); await bad('calc ' + id) }
  await p.evaluate(() => { const s = document.getElementById('cc-ctl-s'); s.value = 20; s.dispatchEvent(new Event('input')) }); await sleep(50);
  await shot('#cc-card', 'cache');
  await p.click('button[data-t=t-more]'); await sleep(100); await bad('more');
  if (errs.length) { fails++; console.log(`${w} ${scheme} errors:`, errs.slice(0, 5)) }
  await p.close();
}
{ const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 }); await p.goto('file://' + page); await sleep(200);
  await p.click('button[data-t=t-read]'); await sleep(200); // the earlier passes left Further reading as the remembered tab
  const st = {};
  for (const id of ['pd-ctl', 'cc-ctl']) { await p.evaluate(id => document.getElementById(id).scrollIntoView({ block: 'center' }), id); await sleep(1800); st[id] = /Pause/.test(await p.$eval('#' + id, c => c.textContent)) }
  await p.evaluate(() => document.getElementById('rb-card').scrollIntoView({ block: 'center' })); await sleep(2200); const rb = /Pause/.test(await p.$eval('#rb-ctl', c => c.textContent));
  if (st['pd-ctl'] || st['cc-ctl'] || !rb) { fails++; console.log('motion:', JSON.stringify(st), 'rebinding playing:', rb) } else console.log('the rebinding animation played once in view; the two widgets stayed still (normal motion)');
  await p.close(); }
await b.close();
console.log(fails ? 'FAIL ' + fails : 'ui ok: every control at 390 dark and 920 light, no errors, NaN, undefined or sideways scroll');
process.exit(fails ? 1 : 0);
