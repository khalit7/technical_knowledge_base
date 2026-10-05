// Exercise every control of the Protocol atlas tab at 390 px dark and 920 px light.
// Fails on page errors, NaN / undefined / [object Object] in the tab text, sideways page scroll, a visible error box,
// or an element in the tab wider than the viewport. Run: node at_check.mjs [screenshot dir]
import { createRequire } from 'module';
import fs from 'fs';
const require = createRequire('/Users/khalid/technical_knowledge_base/html_utils/package.json');
const puppeteer = require('puppeteer');
const PAGE = 'file:///Users/khalid/technical_knowledge_base/technical_knowledge_base/agents_and_retrieval/topic_protocols/index.html';
const OUT = process.argv[2] || '/private/tmp/claude-502/-Users-khalid-technical-knowledge-base/5f6ecf10-514c-4c28-926f-0ee784ea40bd/scratchpad/proto/atlas/shots';
fs.mkdirSync(OUT, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
const browser = await puppeteer.launch({ headless: 'shell', args: ['--no-sandbox'] });
const problems = [];
let clicks = 0;
for (const [w, scheme] of [[390, 'dark'], [920, 'light']]) {
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await page.setViewport({ width: w, height: 900 });
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.evaluate(() => { try { localStorage.clear() } catch (e) {} });
  await page.reload({ waitUntil: 'load' });
  await page.click('#tabs button[data-t="t-atlas"]');
  await sleep(300);
  const check = async (label) => {
    const r = await page.evaluate(() => {
      const t = document.getElementById('t-atlas');
      const txt = t.innerText;
      const bad = /\bNaN\b|\bundefined\b|\[object Object\]/.exec(txt);
      const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
      const err = document.getElementById('jsErr');
      let wide = null;
      t.querySelectorAll('*').forEach(el => { if (wide) return; if (el.closest('pre,.tw,svg')) return; const r = el.getBoundingClientRect(); if (r.width && r.right > cw + 1) wide = el.tagName + '.' + el.className + ' ' + Math.round(r.right) });
      return { bad: bad ? txt.slice(Math.max(0, bad.index - 60), bad.index + 40) : null, side: sw > cw + 1 ? sw + '>' + cw : null, jserr: err && !err.hidden ? err.textContent : null, wide };
    });
    if (r.bad) problems.push(`${w} ${label}: text "${r.bad}"`);
    if (r.side) problems.push(`${w} ${label}: sideways scroll ${r.side}`);
    if (r.jserr) problems.push(`${w} ${label}: jsErr ${r.jserr}`);
    if (r.wide) problems.push(`${w} ${label}: too wide ${r.wide}`);
  };
  const shot = async (name, sel) => {
    if (sel) { const el = await page.$(sel); if (el) { await el.screenshot({ path: `${OUT}/${w}-${scheme}-${name}.png` }); return } }
    await page.screenshot({ path: `${OUT}/${w}-${scheme}-${name}.png` });
  };
  const view = async v => { await page.click(`#at-views button[data-v="${v}"]`); clicks++; await sleep(150); };
  await check('initial');
  await shot('stack-top', '#at-stackwrap');
  // Stack: every chip, then the walk controls and every path
  const chips = await page.$$eval('#at-stack [data-at-chip]', bs => bs.map(b => b.dataset.atChip));
  for (const c of chips) {
    await page.click(`#at-stack [data-at-chip="${c}"]`); clicks++;
    await sleep(40);
    const lines = await page.$$eval('#at-lines path', ps => ps.length);
    const exp = await page.evaluate(id => { const e = window.AT.E[id]; return (e.runs_on || []).length + (window.AT.UP[id] || []).length }, c);
    if (lines !== exp) problems.push(`${w} stack ${c}: ${lines} lines, expected ${exp}`);
    await check('stack ' + c);
    const paths = await page.$$eval('#at-wpath option', os => os.length);
    for (let i = 0; i < Math.max(1, paths); i++) {
      if (paths) { await page.select('#at-wpath', String(i)); clicks++; }
      for (const b of ['#at-wfwd', '#at-wfwd', '#at-wback', '#at-wplay', '#at-wplay']) { await page.click(b); clicks++; }
      await page.$eval('#at-wscr', s => { s.value = s.max; s.dispatchEvent(new Event('input')) }); clicks++;
      await check(`walk ${c} path ${i}`);
    }
    // relation buttons inside the detail card open other entries
    const rel = await page.$$eval('#at-det [data-at-open]', bs => bs.map(b => b.getAttribute('data-at-open')));
    if (rel.length) { await page.click(`#at-det [data-at-open="${rel[0]}"]`); clicks++; await check(`open ${rel[0]} from ${c}`); }
  }
  await page.select('#at-find', 'grpc'); clicks++; await sleep(80);
  await shot('stack-grpc', '#at-stackwrap'); await shot('detail-grpc', '#at-det');
  await page.select('#at-find', 'sse'); clicks++; await sleep(80);
  await page.select('#at-wspd', '2'); clicks++;
  await shot('walk-sse', '#at-walk');
  // Chooser: every option of every question it shows, then a sweep over all first answers
  await view('choose');
  const whos = await page.$$eval('#at-qs button[data-q="who"]', bs => bs.map(b => b.dataset.a));
  for (const who of whos) {
    await page.click(`#at-qs button[data-q="who"][data-a="${who}"]`); clicks++;
    const others = await page.$$eval('#at-qs button[data-q]:not([data-q="who"])', bs => bs.map(b => [b.dataset.q, b.dataset.a]));
    for (const [q, a] of others) {
      await page.click(`#at-qs button[data-q="${q}"][data-a="${a}"]`); clicks++;
      const rec = await page.$eval('#at-rec', d => d.innerText);
      if (!/Recommendation/.test(rec)) problems.push(`${w} chooser ${who} ${q}=${a}: no recommendation`);
      await check(`choose ${who} ${q}=${a}`);
    }
  }
  await page.click('#at-qs button[data-q="who"][data-a="user"]'); await page.click('#at-qs button[data-q="flow"][data-a="server"]');
  await shot('choose', '#at-v-choose');
  const cmpLink = await page.$('#at-rec [data-at-cmp]');
  if (cmpLink) { await cmpLink.click(); clicks++; await sleep(100); await check('chooser to compare'); }
  // Timeline: ranges and layer filters
  await view('time');
  for (const f of ['1980', '2024', '2010']) { await page.click(`#at-tbar [data-from="${f}"]`); clicks++; await check('time from ' + f); }
  const gs = await page.$$eval('#at-tbar [data-g]', bs => bs.map(b => b.dataset.g));
  for (const g of gs) { await page.click(`#at-tbar [data-g="${g}"]`); clicks++; await check('time only ' + g); await page.click(`#at-tbar [data-g="${g}"]`); clicks++; }
  await shot('time', '#at-v-time');
  const ev = await page.$('#at-tl [data-at-open]'); if (ev) { await ev.click(); clicks++; await check('time open'); }
  // Compare: every common pair, swap, and every protocol in each select
  await view('cmp');
  const pairs = await page.$$eval('#at-pairs [data-pair]', bs => bs.map(b => b.dataset.pair));
  for (const p of pairs) { await page.click(`#at-pairs [data-pair="${p}"]`); clicks++; await check('pair ' + p); }
  await page.click('#at-swap'); clicks++;
  const opts = await page.$$eval('#at-ca option', os => os.map(o => o.value));
  for (const o of opts) { await page.select('#at-ca', o); clicks++; await check('cmp a ' + o); }
  await page.select('#at-ca', 'grpc'); await page.select('#at-cb', 'rest');
  await shot('cmp', '#at-v-cmp');
  await view('corr'); await check('corrections'); await shot('corr', '#at-v-corr');
  const cb = await page.$('#at-corr [data-at-open]'); if (cb) { await cb.click(); clicks++; await check('corr open'); }
  if (errs.length) problems.push(...errs.map(e => `${w}: ${e}`));
  await page.close();
}
// reduced motion: the walk must not autoplay
{
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.setViewport({ width: 920, height: 900 });
  await page.goto(PAGE, { waitUntil: 'load' });
  await page.click('#tabs button[data-t="t-atlas"]'); await sleep(200);
  await page.evaluate(() => document.getElementById('at-walk').scrollIntoView()); await sleep(2500);
  const t = await page.$eval('#at-wplay', b => b.textContent);
  if (t !== 'Play') problems.push('reduced motion: walk is playing');
  await page.close();
}
await browser.close();
console.log(`clicks ${clicks}`);
console.log(problems.length ? 'PROBLEMS\n' + problems.slice(0, 400).join('\n') + (problems.length > 60 ? `\n... ${problems.length} total` : '') : 'OK: no errors, NaN, undefined, sideways scroll or overflow');
process.exit(problems.length ? 1 : 0);
