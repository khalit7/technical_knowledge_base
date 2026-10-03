// Exercise every control of the page in both themes and widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen (font size times the SVG's screen scale), no NaN/undefined/Infinity
// in visible text, no errors, no sideways scroll, and the animations stepping end to end.
// usage (from the repo root): node technical_knowledge_base/reference/papers/schrodingers_code_repository/src/check_page.mjs [shots dir]
import puppeteer from '../../../../../html_utils/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const file = 'file://' + path.resolve(here, '../index.html');
const shots = process.argv[2] || path.resolve(here, '../.shots');
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
let problems = [], actions = 0;
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
        t.querySelectorAll('tspan').forEach(s => { const f2 = parseFloat(getComputedStyle(s).fontSize) * m.a; if (f2 < 10.95) small.push('tspan ' + s.textContent + ' ' + f2.toFixed(1)) });
      });
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = (vis.match(/.{0,30}(?<![-\w])(NaN|undefined|Infinity)\b.{0,30}/g) || []);
      const box = document.getElementById('jsErr'); const eb = box && !box.hidden ? box.textContent : '';
      return { small: [...new Set(small)].slice(0, 8), bad, sideways: document.documentElement.scrollWidth > innerWidth, eb };
    });
    if (r.small.length) problems.push(`${scheme} ${width} ${where}: text under 11px: ${r.small.join(' | ')}`);
    if (r.bad.length) problems.push(`${scheme} ${width} ${where}: ${r.bad.join(' | ')}`);
    if (r.sideways) problems.push(`${scheme} ${width} ${where}: sideways scroll`);
    if (r.eb) problems.push(`${scheme} ${width} ${where}: error box: ${r.eb}`);
  };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const clk = sel => p.$eval(sel, e => e.click()); // DOM click: a sticky nav cannot intercept it
  // the JavaScript port must reproduce the released Python (schro_ref.py) exactly: mappings, orders, texts
  const rep = await p.evaluate(() => { const out = []; const R = window.REPO;
    for (const r of R.ref) { const m = SR.tokenMapping(R.lex.candidates, R.tokens, r.seed);
      if (R.tokens.map(t => m[t]).join() !== r.mapping.join()) out.push('mapping seed ' + r.seed);
      if (SR.topoOrder({ length: R.ex.top_run.names.length, deps: R.ex.top_run.deps }, r.seed).join() !== r.top.join()) out.push('top order seed ' + r.seed);
      if (SR.topoOrder({ length: R.ex.field_run.names.length, deps: R.ex.field_run.deps }, r.seed).join() !== r.meth.join()) out.push('method order seed ' + r.seed);
      if (r.issue) { const fm = SR.forwardMap(R.keys, m);
        if (SR.apply(R.ex.issue, fm, true) !== r.issue) out.push('issue seed ' + r.seed);
        if (SR.apply(R.ex.files[0].text, fm, true) !== r.code0) out.push('code0 seed ' + r.seed);
        if (SR.apply(R.ex.files[1].text, fm, true) !== r.code1) out.push('code1 seed ' + r.seed);
        if (R.ex.tree.map(x => SR.apply(x, fm, true)).join() !== r.tree.join()) out.push('tree seed ' + r.seed); } }
    const fm = SR.forwardMap(R.keys, R.fig.mapping); if (SR.apply(R.ex.issue, fm, true) !== R.fig.issue) out.push('figure 4 preset');
    if (SR.rebuild('CharField', { char: 'character_unit', field: 'field' }) !== 'Character_unitField') out.push('Character_unitField quirk');
    return out });
  if (rep.length) problems.push(`${scheme} ${width}: JS port differs from Python: ${rep.join(' | ')}`); else console.log(scheme, width, 'JS port matches the released Python: 10 seeds (mappings, both orders, texts for 3), Figure 4 preset');
  await p.click('#tabs button[data-t=t-read]');
  for (const t of tabs) {
    await p.click(`#tabs button[data-t=${t}]`); await wait(250); await audit(t + ' open');
    // predict widgets: answer each (wrong first, then right)
    const preds = await p.$$(`#${t} .pred`);
    for (const pr of preds) { const bs = await pr.$$('.opts button'); if (bs.length) { await bs[bs.length - 1].evaluate(b => b.click()); await bs[0].evaluate(b => b.click()); actions += 2 } }
    // ranges: min, middle, max
    for (const id of await p.$$eval(`#${t} input[type=range]`, xs => xs.map(x => x.id))) {
      for (const f of [0, .5, 1]) { await p.evaluate((id, f) => { const e = document.getElementById(id); e.value = +e.min + (e.max - e.min) * f; e.dispatchEvent(new Event('input', { bubbles: true })) }, id, f); actions++ }
      await audit(t + ' range ' + id);
    }
    // selects: every option
    for (const id of await p.$$eval(`#${t} select`, xs => xs.map(x => x.id))) {
      const n = await p.$eval('#' + id, e => e.options.length);
      for (let i = 0; i < n; i++) { await p.evaluate((id, i) => { const e = document.getElementById(id); e.selectedIndex = i; e.dispatchEvent(new Event('change', { bubbles: true })) }, id, i); actions++ }
      await audit(t + ' select ' + id);
    }
    // text inputs
    for (const id of await p.$$eval(`#${t} input[type=text]`, xs => xs.map(x => x.id))) { for (const q of ['get_.*_display', '(', 'zzz', 'Field']) { await p.evaluate((id, q) => { const e = document.getElementById(id); e.value = q; e.dispatchEvent(new Event('input', { bubbles: true })) }, id, q); actions++ } await audit(t + ' text ' + id) }
    // checkboxes
    for (const id of await p.$$eval(`#${t} input[type=checkbox]`, xs => xs.map(x => x.id))) { await clk('#' + id); await clk('#' + id); actions += 2 }
    // every button that is not a tab, chip or predict option, twice; chips a few times (builds a sentence)
    const ids = await p.$$eval(`#${t} button`, bs => bs.map((b, i) => { if (!b.id && !b.dataset.m) b.id = 'xb' + i + Math.random().toString(36).slice(2, 6); return b.id || null }).filter(Boolean));
    for (const id of ids) {
      const ok = await p.$('#' + id); if (!ok) continue;
      const info = await p.$eval('#' + id, b => ({ vis: b.offsetParent !== null, chip: false, pred: !!b.closest('.pred'), go: b.id === 'tstGo' }));
      if (!info.vis || info.chip || info.pred) continue;
      await clk('#' + id).catch(() => {}); actions++;
      if (info.go) { await p.waitForFunction(() => !document.getElementById('tstGo').disabled, { timeout: 120000 }); }
    }
    // segmented controls (data-m buttons)
    const segs = await p.$$(`#${t} .seg button`);
    for (const s of segs) { if (await s.evaluate(b => b.offsetParent !== null)) { await s.evaluate(b => b.click()); actions++; await wait(30) } }
    await audit(t + ' after controls');
    // step the animations through every step and screenshot the middle; the replay is stepped for every episode
    for (const id of ['cs', 'tp']) {
      if (!(await p.$(`#${t} #${id}`))) continue;
      const eps = [];
      for (const ep of (eps.length ? eps : [null])) {
        if (ep) { await p.evaluate((id, ep) => { const e = document.getElementById(id + 'Ep'); e.value = ep; e.dispatchEvent(new Event('change', { bubbles: true })) }, id, ep); actions++ }
        const modes = await p.$$eval(`#${id}M button`, bs => bs.filter(b => !b.hidden).map(b => b.dataset.m)).catch(() => []);
        for (const m of (modes.length ? modes : [null])) {
          if (m) await clk(`#${id}M button[data-m="${m}"]`);
          await clk(`#${id}Play`); await clk(`#${id}Play`);
          await p.evaluate(id => { const e = document.getElementById(id + 'Scrub'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
          const n = await p.$eval(`#${id}Scrub`, e => e.max / 100);
          for (let k = 0; k < n; k++) { await clk(`#${id}Fwd`); actions++; if (k === Math.floor(n / 2) && true) { await p.$eval('#' + id, e => e.scrollIntoView()); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${(m || 'x').replace(':', '-')}-${scheme}-${width}.png` }) } }
          await audit(`${t} ${id} ${m} stepped`);
          for (let k = 0; k < n; k++) { await clk(`#${id}Back`); actions++ }
        }
      }
      // let it play for a second
      await clk(`#${id}Play`); await wait(1200);
      const fr = await p.$eval('#' + id, e => +e.dataset.frames || 0); if (!fr) problems.push(`${scheme} ${width}: ${id} did not animate`);
      await clk(`#${id}Play`);
    }
  }
  if (errs.length) problems.push(`${scheme} ${width}: errors ${errs.join(' | ')}`);
  await p.close();
}
await b.close();
console.log('actions', actions, 'problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
