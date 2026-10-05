// Exercise every control of the SQL playground tab in headless Chrome.
// Run from this folder: node check_ui.mjs   (puppeteer from html_utils/node_modules)
// 1. live engine, 390 px dark and 920 px light: every lesson and every menu choice; the live SQLite result must agree with
//    the recorded Postgres one exactly where results.json says it does; hints, show-all, the JOIN animation, Free play.
// 2. the page inside <iframe sandbox="allow-scripts"> (as Notion embeds it): the engine must still start.
// 3. a copy with a Content-Security-Policy that forbids WebAssembly: the fallback (recorded results) must work.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs'; import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.join(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const page = path.resolve(here, '../../index.html');
const shots = path.resolve(here, '../../.shots'); fs.mkdirSync(shots, { recursive: true });
const tmp = process.env.TMPDIR_CHECK || path.join(here, '.check'); fs.mkdirSync(tmp, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const fail = m => { fails++; console.log('FAIL', m) };

async function open(url, scheme, width, frame) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(url); let f = p;
  if (frame) { await sleep(500); f = p.frames().find(x => x !== p.mainFrame()) }
  await f.click('button[data-t=t-sql]');
  await f.waitForFunction(() => /Live\.|could not start/.test(document.getElementById('sq-status').textContent), { timeout: 20000 });
  return { p, f, errs };
}
async function lessons(f, live, tag) {
  const n = await f.evaluate(() => SQ_DATA.lessons.length); let runs = 0;
  for (let i = 0; i < n; i++) {
    await f.evaluate(i => document.querySelector('#sq-chips button[data-i="' + i + '"]').click(), i); await sleep(60);
    const info = await f.evaluate(i => { const l = SQ_DATA.lessons[i]; return { id: l.id, params: l.params.map(p => p.options.length), keys: Object.keys(l.variants) } }, i);
    for (const key of info.keys) {
      const idx = key.split('-').map(Number);
      await f.evaluate((idx) => { const ss = [...document.querySelectorAll('#sq-params select')]; ss.forEach((s, j) => { if (+s.value !== idx[j]) { s.value = String(idx[j]); s.dispatchEvent(new Event('change', { bubbles: true })) } }) }, info.params.length ? idx : []);
      await sleep(80);
      const r = await f.evaluate(() => ({ agree: !!document.querySelector('#sq-out .sq-agree'), differ: !!document.querySelector('#sq-out .sq-differ'), txt: document.getElementById('t-sql').innerText, boxes: document.querySelectorAll('#sq-out .sq-st').length }));
      const expDiff = await f.evaluate(k => SQ_DATA.meta.differ.indexOf(k) >= 0, info.id + ':' + key);
      if (r.differ !== expDiff || r.agree === expDiff) fail(`${tag} ${info.id}:${key} banner agree=${r.agree} differ=${r.differ}, recorded differ=${expDiff}`);
      if (/\bNaN\b|\bundefined\b/.test(r.txt)) fail(`${tag} ${info.id}:${key} NaN/undefined in text`);
      if (!r.boxes) fail(`${tag} ${info.id}:${key} no result boxes`);
      runs++;
    }
    // hint toggle and show-all buttons
    await f.evaluate(() => { document.getElementById('sq-hintb').click(); document.querySelectorAll('#sq-out .sq-all').forEach(x => x.click()) });
  }
  return runs;
}
async function joinAnim(f, tag) {
  await f.evaluate(() => document.querySelector('#sq-chips button[data-i="2"]').click()); await sleep(100);
  for (const m of ['inner', 'left']) {
    await f.evaluate(m => document.querySelector('#sq-jmode button[data-m="' + m + '"]').click(), m); await sleep(50);
    for (let s = 0; s < 12; s++) { await f.evaluate(() => document.getElementById('sq-jctl-f').click()); await sleep(30) }
    const cap = await f.evaluate(() => document.getElementById('sq-jcap').innerText);
    const want = m === 'inner' ? 'Done: 5 rows' : 'Done: 6 rows';
    if (cap.indexOf(want) < 0) fail(`${tag} join ${m} final caption: ${cap}`);
  }
  await f.evaluate(() => { document.getElementById('sq-jctl-b').click(); document.getElementById('sq-jctl-p').click(); document.getElementById('sq-jctl-p').click() });
}
async function free(f, tag) {
  const n = await f.evaluate(() => document.querySelectorAll('#sq-starters button').length);
  for (let i = 0; i < n; i++) {
    await f.evaluate(i => document.querySelectorAll('#sq-starters button')[i].click(), i); await sleep(80);
    const t = await f.evaluate(() => document.getElementById('sq-fout').innerText);
    if (!t.trim() || /\bNaN\b|\bundefined\b/.test(t)) fail(`${tag} free starter ${i}: ${t.slice(0, 80)}`);
  }
  // index starter: plan must switch from SCAN to SEARCH; foreign key starter must be refused
  await f.evaluate(() => { document.getElementById('sq-freset').click(); document.querySelectorAll('#sq-starters button')[4].click() }); await sleep(80);
  const plan = await f.evaluate(() => document.getElementById('sq-fout').innerText);
  if (!/SCAN/.test(plan) || !/SEARCH/.test(plan)) fail(`${tag} index starter plan: ${plan.slice(0, 200)}`);
  await f.evaluate(() => { document.getElementById('sq-freset').click(); document.querySelectorAll('#sq-starters button')[5].click() }); await sleep(80);
  const fk = await f.evaluate(() => document.getElementById('sq-fout').innerText);
  if (!/FOREIGN KEY constraint failed/.test(fk)) fail(`${tag} fk starter: ${fk.slice(0, 200)}`);
  // a syntax error in the middle must not stop the statements after it
  await f.evaluate(() => { const e = document.getElementById('sq-fed'); e.value = "SELECT 1 AS a;\nSELEC oops;\nSELECT 2 AS b;"; document.getElementById('sq-fgo').click() }); await sleep(80);
  const se = await f.evaluate(() => document.querySelectorAll('#sq-fout .sq-st').length);
  if (se !== 3) fail(`${tag} syntax error handling: ${se} statement boxes`);
}

// 1. live
for (const [scheme, width] of [['dark', 390], ['light', 920]]) {
  const tag = scheme + ' ' + width;
  const { p, f, errs } = await open('file://' + page, scheme, width);
  const st = await f.evaluate(() => document.getElementById('sq-status').innerText);
  if (!/^Live\./.test(st)) fail(`${tag} engine did not start: ${st}`); else console.log(tag, st.slice(0, 110));
  const runs = await lessons(f, true, tag);
  await joinAnim(f, tag); await free(f, tag);
  // edited query note
  await f.evaluate(() => { document.querySelector('#sq-chips button[data-i="0"]').click() }); await sleep(80);
  await f.evaluate(() => { const e = document.getElementById('sq-ed'); e.value = e.value.replace("ORDER BY id", "ORDER BY name"); e.dispatchEvent(new Event('input')); document.getElementById('sq-go').click() }); await sleep(100);
  const ed = await f.evaluate(() => document.getElementById('sq-out').innerText);
  if (!/SQLite only/.test(ed)) fail(`${tag} edited query note missing`);
  const sw = await p.evaluate(() => document.documentElement.scrollWidth > innerWidth);
  if (sw) fail(`${tag} sideways scroll`);
  for (const [i, name] of [[2, 'join'], [9, 'txn']]) {
    await f.evaluate(i => document.querySelector('#sq-chips button[data-i="' + i + '"]').click(), i);
    if (i === 9) await f.evaluate(() => { const s = document.querySelectorAll('#sq-params select'); s[0].value = '1'; s[1].value = '1'; s[1].dispatchEvent(new Event('change', { bubbles: true })) });
    await sleep(300); const el = await f.$('#sq-lesson'); await el.screenshot({ path: path.join(shots, `sq-${name}-${scheme}-${width}.png`) });
  }
  const box = await f.evaluate(() => { const d = document.getElementById('jsErr'); return d && !d.hidden ? d.textContent : '' });
  if (box) errs.push('error box: ' + box);
  if (errs.length) fail(`${tag} errors ${errs}`);
  console.log(tag, 'variants run', runs, 'errors', errs.length);
  await p.close();
}
// 2. sandboxed iframe, like Notion's HTML block
fs.writeFileSync(path.join(tmp, 'frame.html'), `<!doctype html><iframe sandbox="allow-scripts" src="${path.relative(tmp, page).split(path.sep).join("/")}" style="width:900px;height:900px"></iframe>`);
{ const { p, f, errs } = await open('file://' + path.join(tmp, 'frame.html'), 'light', 920, true);
  const st = await f.evaluate(() => document.getElementById('sq-status').innerText);
  console.log('sandboxed iframe:', st.slice(0, 90)); if (!/^Live\./.test(st)) fail('sandbox: engine did not start');
  if (errs.length) fail('sandbox errors ' + errs); await p.close(); }
// 3. WebAssembly forbidden by CSP: fallback path
const html = fs.readFileSync(page, 'utf8').replace('<head>', `<head><meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'">`);
fs.writeFileSync(path.join(tmp, 'nowasm.html'), html);
{ const { p, f, errs } = await open('file://' + path.join(tmp, 'nowasm.html'), 'dark', 390);
  const st = await f.evaluate(() => document.getElementById('sq-status').innerText);
  console.log('no-wasm:', st.slice(0, 140)); if (!/could not start/.test(st)) fail('no-wasm: fallback not shown');
  const runs = await lessons(f, false, 'fallback');
  await joinAnim(f, 'fallback');
  const real = errs.filter(e => !/Content Security Policy|WebAssembly|wasm/i.test(e));
  if (real.length) fail('fallback errors ' + real);
  const el = await f.$('#sq-lesson'); await el.screenshot({ path: path.join(shots, 'sq-fallback-dark-390.png') });
  console.log('fallback variants run', runs); await p.close(); }
await b.close();
console.log(fails ? `FAILURES ${fails}` : 'all checks passed');
