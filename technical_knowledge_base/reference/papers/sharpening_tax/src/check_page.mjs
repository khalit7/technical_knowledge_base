// Exercise every control of the page in both themes and widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen, no NaN/undefined/Infinity in visible text, no errors, no sideways scroll,
// both animations stepped end to end in every mode, every one of the 42 replayed cells matching Table 7,
// the live toy run matching the ten-seed sweep for every seed, prose numbers matching the data, and reduced motion.
// usage (from the repo root): node technical_knowledge_base/reference/papers/sharpening_tax/src/check_page.mjs [shots dir]
// Chrome: set CHROME_PATH to a Chrome or chrome-headless-shell binary if puppeteer's own is not installed.
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [] });
let problems = [], actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file);
  const tabs = await p.$$eval('#tabs button', bs => bs.map(b => b.dataset.t));
  const audit = async (where) => {
    const r = await p.evaluate(() => {
      const small = [];
      document.querySelectorAll('.tab:not([hidden]) svg text').forEach(t => {
        const svg = t.ownerSVGElement, m = svg && svg.getScreenCTM(); if (!m) return;
        const fs = parseFloat(getComputedStyle(t).fontSize) * m.a;
        if (fs < 10.95 && t.getBoundingClientRect().width > 0) small.push(t.textContent.slice(0, 30) + ' ' + fs.toFixed(1));
      });
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = (vis.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []);
      const box = document.getElementById('jsErr'); const eb = box && !box.hidden ? box.textContent : '';
      return { small: [...new Set(small)].slice(0, 8), bad, sideways: document.documentElement.scrollWidth > innerWidth, eb };
    });
    if (r.small.length) problems.push(`${scheme} ${width} ${where}: text under 11px: ${r.small.join(' | ')}`);
    if (r.bad.length) problems.push(`${scheme} ${width} ${where}: ${r.bad.join(' | ')}`);
    if (r.sideways) problems.push(`${scheme} ${width} ${where}: sideways scroll`);
    if (r.eb) problems.push(`${scheme} ${width} ${where}: error box: ${r.eb}`);
  };
  const clk = sel => p.$eval(sel, e => e.click());
  for (const t of tabs) {
    await p.click(`#tabs button[data-t=${t}]`); await wait(250); await audit(t + ' open');
    // nothing may move before the reader acts (2026-10-26): scroll each animation into view and wait
    for (const id of await p.$$eval(`#${t} .card`, cs => cs.filter(c => c.querySelector('.an-play')).map(c => c.id))) { await p.$eval('#' + id, e => e.scrollIntoView()); await wait(1200);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0); if (fr) problems.push(`${scheme} ${width}: ${id} moved before any click (${fr} frames)`) }
    // closed details hold text too: open them all
    await p.evaluate(t => document.querySelectorAll('#' + t + ' details').forEach(d => d.open = true), t); await wait(300); await audit(t + ' details open');
    for (const pr of await p.$$(`#${t} .pred`)) { const bs = await pr.$$('.opts button'); if (bs.length) { await bs[bs.length - 1].evaluate(b => b.click()); await bs[0].evaluate(b => b.click()); actions += 2 } }
    await audit(t + ' predictions revealed');
    for (const id of await p.$$eval(`#${t} input[type=range]`, xs => xs.map(x => x.id))) {
      for (const f of [0, .5, 1]) { await p.evaluate((id, f) => { const e = document.getElementById(id); e.value = +e.min + (e.max - e.min) * f; e.dispatchEvent(new Event('input', { bubbles: true })) }, id, f); actions++ }
      await audit(t + ' range ' + id);
    }
    for (const id of await p.$$eval(`#${t} select`, xs => xs.map(x => x.id))) {
      const n = await p.$eval('#' + id, e => e.options.length);
      for (let i = 0; i < n; i++) { await p.evaluate((id, i) => { const e = document.getElementById(id); e.selectedIndex = i; e.dispatchEvent(new Event('change', { bubbles: true })) }, id, i); actions++ }
      await audit(t + ' select ' + id);
    }
    for (const id of await p.$$eval(`#${t} input[type=checkbox]`, xs => xs.map(x => x.id))) { await clk('#' + id); await clk('#' + id); actions += 2 }
    const ids = await p.$$eval(`#${t} button`, bs => bs.map((b, i) => { if (!b.id && !b.dataset.m) b.id = 'xb' + i + Math.random().toString(36).slice(2, 6); return b.id || null }).filter(Boolean));
    for (const id of ids) {
      const ok = await p.$('#' + id); if (!ok) continue;
      const info = await p.$eval('#' + id, b => ({ vis: b.offsetParent !== null, pred: !!b.closest('.pred') }));
      if (!info.vis || info.pred) continue;
      await clk('#' + id).catch(() => {}); actions++;
    }
    for (const s of await p.$$(`#${t} .seg button`)) { if (await s.evaluate(b => b.offsetParent !== null)) { await s.evaluate(b => b.click()); actions++; await wait(30) } }
    for (const th of await p.$$(`#${t} th[data-k]`)) { await th.evaluate(e => e.click()).catch(() => {}); actions++ }
    await audit(t + ' after controls');
    // animations: every mode, every step, plus a mid-move frame screenshot
    for (const id of await p.$$eval(`#${t} .an-svg`, xs => xs.map(x => x.id.replace(/Svg$/, '')))) {
      const modes = await p.$$eval(`#${id}M button`, bs => bs.map(b => b.dataset.m));
      for (const m of modes) {
        await p.$eval(`#${id}M button[data-m="${m}"]`, b => b.click()); // a mode switch pauses on step 1 (no autoplay since 2026-10-26)
        const n = await p.$eval(`#${id}Scrub`, e => +e.max / 100);
        for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); actions++ }
        await audit(`${t} anim ${id} ${m} end`);
        // a mid-move frame: halfway through step 3
        await p.evaluate((id) => { const e = document.getElementById(id + 'Scrub'); e.value = 250; e.dispatchEvent(new Event('input')) }, id);
        if (m === modes[0] || id === 'pt') { await p.$eval('#' + id, e => e.scrollIntoView()); await wait(100); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-${m.replace(/[^a-z0-9]/gi, '')}-mid-${scheme}-${width}.png` }) }
      }
    }
    if (t === 't-run') {
      // every cell: the replay must match the printed Table 7 (no "differs")
      let bad = 0;
      for (const bk of ['bfcl', 'webshop', 'acebench']) for (let i = 0; i < 14; i++) {
        const txt = await p.evaluate((bk, i) => { const b = document.getElementById('rpB'), s = document.getElementById('rpP'); b.value = bk; s.selectedIndex = i; s.dispatchEvent(new Event('change')); return document.getElementById('rpOut').innerText }, bk, i);
        if (/differs/.test(txt)) { bad++; problems.push(`replay differs: ${bk} ${i}: ${txt.match(/.{0,60}differs.{0,20}/)[0]}`) } actions++;
      }
      if (width === 920) console.log('replay: 42 cells checked,', bad, 'differ');
      await (await p.$('#rpCard')).screenshot({ path: `${shots}/x-run-${scheme}-${width}.png` });
    }
    if (t === 't-toy') {
      const seeds = width === 920 ? [...Array(10).keys()] : [3];
      for (const s of seeds) {
        await p.select('#tySeed', String(s)); await p.evaluate(() => { const e = document.getElementById('tyTau'); e.value = 1.5; e.dispatchEvent(new Event('input')) });
        await clk('#tyGo'); actions++; const o = await p.$eval('#tyLiveOut', e => e.innerText);
        if (!/Matches the ten-seed sweep for this seed exactly/.test(o)) problems.push(`toy live run seed ${s} does not match the sweep: ${o.slice(-120)}`);
      }
      if (width === 920) console.log('toy: live runs matched the sweep for', seeds.length, 'seeds');
      await (await p.$('#tyLive')).screenshot({ path: `${shots}/x-toylive-${scheme}-${width}.png` });
    }
    await audit(t + ' end');
  }
  // prose numbers against the data the page carries
  if (width === 920) {
    const r = await p.evaluate(() => {
      const P = window.PAPER, rc = P.rc.counts, txt = document.body.textContent.replace(/\s+/g, ' '), out = [];
      const need = [[rc.taxS_pos + ' of the 42 cells', 'TaxS > 0 count'], [rc.taxA_pos + '.', 'TaxA count'], ['higher in ' + rc.dC_pos + ' of the 42 cells', 'dC>0 count'], ['clear of zero in ' + rc.dC_sig_base, 'significant base count'], ['the post-trained model is clearly ahead in ' + rc.dC_sig_post, 'significant post count'],
        ['k = ' + P.rc.agg.largest.cross, 'largest crossover'], ['ρ = ' + P.rc.fig7.rho_mean.toFixed(2), 'fig7 mean']];
      need.forEach(([s, n]) => { if (!txt.includes(s)) out.push('prose missing "' + s + '" (' + n + ')') });
      const T = window.TOYD.snap.batch.find(b => b.x === 65); if (!txt.includes('falls from 78% to 53%') || Math.round(100 * T.p1) !== 78 || Math.round(100 * T.pT) !== 53) out.push('toy prompt 65 numbers changed');
      const S = window.TOYD.summary; if (!(S.ptgs.pK > S.fixed.pK && S.ptgs.pK > S.globalT.pK && S.ptgs.p1 > S.fixed.p1)) out.push('toy ordering changed');
      return out;
    });
    problems.push(...r);
  }
  problems.push(...errs.map(e => `${scheme} ${width}: ${e}`));
  await p.close();
}
// reduced motion: no animation may play on its own
{
  const p = await b.newPage(); await p.setViewport({ width: 920, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  await p.$eval('#bm', e => e.scrollIntoView()); await wait(1500);
  const f = await p.$eval('#bm', e => +(e.dataset.frames || 0)); if (f > 0) problems.push('reduced motion: #bm played ' + f + ' frames');
  await p.close();
}
await b.close();
console.log(actions + ' actions;', problems.length ? problems.length + ' problems:\n' + problems.join('\n') : '0 problems');
process.exit(problems.length ? 1 : 0);
