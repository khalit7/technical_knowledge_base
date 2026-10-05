// Browser check of the Practice drills tab: every control clicked at 390 px dark and 920 px light, plus a run with storage blocked.
// Usage (from anywhere): node src/drill/check_drill.mjs   (puppeteer from html_utils/node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const PAGE = path.resolve(HERE, '../../index.html');
const UTILS = path.resolve(HERE, '../../../../../html_utils');
const require = createRequire(path.join(UTILS, 'package.json'));
const puppeteer = require('puppeteer');
const ANIM = JSON.parse(fs.readFileSync(path.join(HERE, 'anim_expected.json'), 'utf8'));
const SHOTS = path.join(HERE, '.shots'); fs.mkdirSync(SHOTS, { recursive: true });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const bad = m => { fails++; console.log('FAIL', m); };

async function run(width, scheme, blockStorage) {
  const browser = await puppeteer.launch({ headless: 'shell', args: ['--allow-file-access-from-files'] });
  const page = await browser.newPage();
  await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  const errs = [];
  page.on('pageerror', e => errs.push('pageerror ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errs.push('console ' + m.text()); });
  if (blockStorage) await page.evaluateOnNewDocument(() => {
    Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } });
  });
  await page.goto('file://' + PAGE, { waitUntil: 'load' });
  await page.click('#tabs button[data-t="t-drill"]');
  await sleep(300);
  const tag = `${width}-${scheme}${blockStorage ? '-nostorage' : ''}`;
  // ---- animation: both routes, every step, numbers against recompute.py ----
  await page.evaluate(() => document.getElementById('pd-an').scrollIntoView());
  await sleep(400);
  for (const route of ['lse', 'jac']) {
    await page.click(`#pd-an-route button[data-m="${route}"]`);
    await page.click('#pd-an-ctl-p'); // pause (route change starts playing)
    const texts = [];
    for (let i = 0; i < 6; i++) {
      await page.evaluate(i => { const s = document.getElementById('pd-an-ctl-s'); s.value = i; s.dispatchEvent(new Event('input')); }, i);
      const t = await page.evaluate(() => ({ fig: document.getElementById('pd-an-fig').textContent, cap: document.getElementById('pd-an-cap').textContent, stats: document.getElementById('pd-an-stats').textContent,
        cur: [...document.querySelectorAll('.pd-lines:not([hidden]) .pd-ln.cur')].map(n => n.dataset.s).join(',') }));
      texts.push(t);
      if (t.cur !== String(i)) bad(`${tag} anim ${route} step ${i}: current line ${t.cur}`);
      if (i === 3 && width === 390) await page.screenshot({ path: path.join(SHOTS, `anim-${route}-${tag}.png`), clip: await page.evaluate(() => { const r = document.getElementById('pd-an').getBoundingClientRect(); return { x: 0, y: r.top + scrollY, width: innerWidth, height: r.height }; }) });
    }
    const all = texts.map(t => t.fig + ' ' + t.cap + ' ' + t.stats).join(' ');
    const want = route === 'lse' ? [...ANIM.p, ...ANIM.negy, ...ANIM.g, ANIM.loss] : [...ANIM.p, ...ANIM.dLdp, ...ANIM.J, ...ANIM.g, ANIM.loss];
    for (const w of want) if (!all.includes(w)) bad(`${tag} anim ${route}: ${w} not drawn`);
    if (/NaN|undefined/.test(all)) bad(`${tag} anim ${route}: NaN/undefined`);
  }
  await page.click('#pd-an-ctl-f'); await page.click('#pd-an-ctl-b'); await page.click('#pd-an-ctl-p'); await sleep(200); await page.click('#pd-an-ctl-p');
  await page.select('#pd-an-ctl-v', '2');
  // ---- every card ----
  const ids = await page.$$eval('article.pd-q', a => a.map(x => x.id));
  for (const id of ids) {
    await page.click(`#${id} > h3`);
    const r = await page.evaluate(async id => {
      const c = document.getElementById(id), out = [];
      const btn = t => [...c.querySelectorAll('.pd-ctl button')].find(b => b.textContent.startsWith(t));
      const h = btn('Show hint'); if (h) { h.click(); if (c.querySelector('.pd-hint').classList.contains('pd-hide')) out.push('hint not shown'); }
      const n = c.querySelectorAll('.pd-steps li').length;
      for (let k = 0; k < n; k++) {
        if (!c.querySelector('.pd-ans').classList.contains('pd-hide')) out.push('answer shown before last step');
        const nb = [...c.querySelectorAll('.pd-ctl button')].find(b => /step/i.test(b.textContent)); nb.click();
        const vis = [...c.querySelectorAll('.pd-steps li')].filter(li => !li.classList.contains('pd-hide')).length;
        if (vis !== k + 1) out.push(`after ${k + 1} clicks ${vis} steps visible`);
      }
      if (c.querySelector('.pd-ans').classList.contains('pd-hide')) out.push('answer hidden after last step');
      const inp = c.querySelector('input[type=text]');
      if (inp) {
        const chk = [...c.querySelectorAll('.pd-ctl button')].find(b => b.textContent === 'Check');
        inp.value = '12345.678'; chk.click(); const fbw = c.querySelector('.pd-fb').textContent; if (!/Not yet|Close|Expected/.test(fbw)) out.push('wrong answer accepted: ' + fbw);
        inp.value = c.dataset.ans; chk.click(); const fb = c.querySelector('.pd-fb').textContent; if (!fb.startsWith('Correct')) out.push('own answer rejected: ' + fb);
        if (!c.classList.contains('solved')) out.push('not marked solved');
      }
      c.querySelectorAll('.pd-self input').forEach(b => { b.checked = true; b.dispatchEvent(new Event('change')); });
      if (c.querySelector('.pd-self') && !c.classList.contains('solved')) out.push('self-check did not solve');
      const mb = [...c.querySelectorAll('.pd-ctl button')].find(b => /Mark as/.test(b.textContent)); mb.click(); mb.click();
      const hb = [...c.querySelectorAll('.pd-ctl button')].find(b => b.textContent === 'Hide the solution'); hb.click();
      if (!c.querySelector('.pd-ans').classList.contains('pd-hide')) out.push('hide did not hide answer');
      if (/NaN|undefined/.test(c.textContent)) out.push('NaN/undefined');
      // reveal again for the screenshot pass
      const nb2 = () => [...c.querySelectorAll('.pd-ctl button')].find(b => /step/i.test(b.textContent));
      for (let k = 0; k < n; k++) nb2().click();
      return out;
    }, id);
    r.forEach(m => bad(`${tag} ${id}: ${m}`));
  }
  // number formats accepted
  const fmt = await page.evaluate(() => {
    const t = (id, v) => { const c = document.getElementById(id), i = c.querySelector('input[type=text]'), b = [...c.querySelectorAll('.pd-ctl button')].find(x => x.textContent === 'Check'); i.value = v; b.click(); return c.querySelector('.pd-fb').textContent.startsWith('Correct'); };
    return { lora: t('pd-la8', '65,536'), frac: t('pd-ps1', '3.5, 2.917'), sci: t('pd-co8', '8.4e22'), expr: t('pd-it9', 'ln(3)-0.408, 6.931'), set: t('pd-la4', '5, 2'), minus: t('pd-co6', '−1, 5'), pow: t('pd-ps10', '100*sqrt(0.8*0.2/500)') };
  });
  Object.entries(fmt).forEach(([k, v]) => { if (!v) bad(`${tag} format ${k} rejected`); });
  const fcok = await page.evaluate(() => { const d = document.querySelector('#pd-fcs details'); d.open = true; const cb = d.querySelector('input'); cb.click(); const t = document.getElementById('pd-fccount').textContent; cb.click(); return d.classList.length && /1 of 14/.test(t); });
  if (!fcok) bad(`${tag} flashcard tick failed`);
  // filters, pick, reset
  for (const g of ['pd-ftr', 'pd-flv']) {
    const ms = await page.$$eval(`#${g} button`, b => b.map(x => x.dataset.m));
    for (const m of ms) { await page.click(`#${g} button[data-m="${m}"]`); const n = await page.$eval('#pd-count', e => e.textContent); if (/NaN|undefined/.test(n)) bad(`${tag} count ${n}`); }
    await page.click(`#${g} button[data-m="all"]`);
  }
  await page.click('#pd-fcl'); const ncl = await page.$$eval('article.pd-q:not([hidden])', a => a.length); await page.click('#pd-fcl');
  if (ncl < 20 || ncl > 40) bad(`${tag} classics shown ${ncl}`);
  await page.click('#pd-fhs'); await page.click('#pd-fhs');
  await page.click('#pd-pick'); await sleep(100);
  const prog = await page.$eval('#pd-prog', e => e.textContent);
  if (/NaN|undefined/.test(prog)) bad(`${tag} progress ${prog}`);
  // sideways scroll and clipping check with cards open
  const sw = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  if (sw.sw > sw.cw + 1) bad(`${tag} sideways scroll ${sw.sw} > ${sw.cw}`);
  const wide = await page.evaluate(() => [...document.querySelectorAll('#t-drill *')].filter(e => { const r = e.getBoundingClientRect(); if (!r.width) return false; if (e.closest('math') && e.tagName.toLowerCase() !== 'math') return false; return r.right > innerWidth + 1; }).slice(0, 5).map(e => e.tagName + '.' + e.className + ' ' + (e.textContent || '').slice(0, 40)));
  wide.forEach(w => bad(`${tag} element past right edge: ${w}`));
  await page.screenshot({ path: path.join(SHOTS, `cards-${tag}.png`), fullPage: false });
  // a few card screenshots
  for (const id of ['pd-la7', 'pd-ps11', 'pd-iv2', 'pd-it10', 'pd-co4']) {
    const el = await page.$('#' + id); await el.screenshot({ path: path.join(SHOTS, `${id}-${tag}.png`) });
  }
  const twice = async () => { await page.click('#pd-reset'); await page.click('#pd-reset'); };
  await twice();
  const solved = await page.$$eval('article.pd-q.solved', a => a.length);
  if (solved) bad(`${tag} reset left ${solved} solved`);
  const ptxt = await page.$eval('#pd-prog', e => e.textContent);
  if (!/0 of 59 solved/.test(ptxt)) bad(`${tag} progress after reset ${ptxt.slice(0, 60)}`);
  // persistence: solve one, reload, still solved (only when storage works)
  if (!blockStorage) {
    await page.evaluate(() => { const c = document.getElementById('pd-la1'); const i = c.querySelector('input[type=text]'); i.value = '8'; [...c.querySelectorAll('.pd-ctl button')].find(x => x.textContent === 'Check').click(); });
    await page.reload({ waitUntil: 'load' }); await page.click('#tabs button[data-t="t-drill"]');
    const kept = await page.$eval('#pd-la1', c => c.classList.contains('solved'));
    if (!kept) bad(`${tag} progress not kept across reload`);
    await page.evaluate(() => { try { localStorage.removeItem('pd-progress-v1'); localStorage.removeItem('pd-filter'); localStorage.removeItem('bench-tab'); } catch (e) {} });
  }
  // a Reading link switches tabs
  await page.evaluate(() => { const a = document.querySelector('#t-drill a[data-pd-read="prob"]'); a.closest('article').classList.add('open'); a.click(); });
  await sleep(100);
  const readShown = await page.$eval('#t-read', e => !e.hidden);
  if (!readShown) bad(`${tag} reading link did not open Reading`);
  const jsErr = await page.$eval('#jsErr', e => e.hidden ? '' : e.textContent);
  if (jsErr) bad(`${tag} jsErr: ${jsErr.slice(0, 300)}`);
  errs.forEach(e => bad(`${tag} ${e}`));
  await browser.close();
  console.log(`${tag}: ${ids.length} cards checked`);
}
await run(390, 'dark', false);
await run(920, 'light', false);
await run(390, 'light', true);
console.log(fails ? `FAILURES: ${fails}` : 'all drill checks passed');
process.exit(fails ? 1 : 0);
