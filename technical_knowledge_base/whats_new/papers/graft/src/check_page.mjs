// Exercise every control of the page in both themes and widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen, no NaN/undefined/Infinity in visible text, no errors, no sideways scroll,
// overlapping SVG labels, the live toy run against src/inputs/toy.json (the sweep), prose numbers against the
// data, and reduced motion. Writes element screenshots (light 920, dark 390) to <page>/.shots/.
// usage (from the repo root, after . html_utils/cloud_setup.sh): node technical_knowledge_base/whats_new/papers/graft/src/check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html') + '#t-read';  // the tab script remembers the last tab; start every pass on The paper
const shots = path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const SWEEP = JSON.parse(fs.readFileSync(path.join(here, 'inputs/toy.json')));
const RC = JSON.parse(fs.readFileSync(path.join(here, 'inputs/recompute.json')));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [] });
const problems = []; let actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file);
  const audit = async where => {
    const r = await p.evaluate(() => {
      const small = [], over = [];
      document.querySelectorAll('.tab:not([hidden]) svg').forEach(svg => {
        const ts = [...svg.querySelectorAll('text')].filter(t => t.getBoundingClientRect().width > 0);
        ts.forEach(t => { const m = svg.getScreenCTM(); const fs = parseFloat(getComputedStyle(t).fontSize) * (m ? m.a : 1); if (fs < 10.95) small.push(t.textContent.slice(0, 30) + ' ' + fs.toFixed(1)) });
        for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
          const a = ts[i].getBoundingClientRect(), c = ts[j].getBoundingClientRect();
          const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
          if (ox > 3 && oy > 4) over.push(ts[i].textContent.slice(0, 20) + ' / ' + ts[j].textContent.slice(0, 20));
        }
      });
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = vis.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || [];
      const box = document.getElementById('jsErr');
      return { small: [...new Set(small)].slice(0, 6), over: [...new Set(over)].slice(0, 6), bad, side: document.documentElement.scrollWidth > innerWidth, eb: box && !box.hidden ? box.textContent : '' };
    });
    const tag = `${scheme} ${width} ${where}`;
    if (r.small.length) problems.push(`${tag}: text under 11px: ${r.small.join(' | ')}`);
    if (r.over.length) problems.push(`${tag}: overlapping labels: ${r.over.join(' | ')}`);
    if (r.bad.length) problems.push(`${tag}: ${r.bad.join(' | ')}`);
    if (r.side) problems.push(`${tag}: sideways scroll`);
    if (r.eb) problems.push(`${tag}: error box: ${r.eb}`);
  };
  const clk = async sel => { await p.$eval(sel, e => e.click()); actions++; await wait(60) };
  const shot = async (id, name) => { const el = await p.$('#' + id); if (el) await el.screenshot({ path: path.join(shots, `${name}-${scheme}-${width}.png`) }) };
  // The paper tab
  await audit('read open');
  for (const k of [0, 1, 2, 3]) { await clk(`#gfHeroBtns button[data-k="${k}"]`); await audit('hero ' + k); if (k === 1 || k === 3) await shot('gfHero', 'hero' + k) }
  for (const id of ['gfPr1', 'gfPr2', 'gfPr3']) { const bs = await p.$$(`#${id} .opts button`); await bs[bs.length - 1].evaluate(x => x.click()); await bs[0].evaluate(x => x.click()); actions += 2; await wait(80) }
  await audit('predicts revealed');
  for (const [seg, name] of [['gfCdM', 'cd'], ['gfCurveM', 'curve'], ['gfSftM', 'sft']]) {
    const ms = await p.$$eval(`#${seg} button`, bs => bs.map(x => x.dataset.m));
    for (const m of ms) { await clk(`#${seg} button[data-m="${m}"]`); await audit(name + ' ' + m); await shot(seg.replace(/M$/, ''), name + '-' + m) }
  }
  await shot('gfEnv', 'env');
  // prose numbers against the data (checked once)
  if (width === 920) {
    const txt = await p.$eval('#t-read', e => e.innerText);
    const cd = RC.cd, f1 = v => v.toFixed(1);
    const want = [f1(cd['GRAFT (ours)'].hack) + '%', f1(cd['Reward penalty'].hack) + '%', f1(cd['GRAFT (ours)'].clean) + '%', f1(cd['Reward penalty'].clean) + '%', f1(cd['GRAFT w/o routing'].hack) + '%',
      f1(cd['GRAFT (ours)'].clean - cd['Base model'].clean) + ' points', '27.7%', '38.5%'];
    for (const w of want) if (!txt.includes(w)) problems.push('prose lacks data number ' + w);
    const v = SWEEP.variants.default;
    for (const w of [(100 * v.penalty.undetected).toFixed(1) + '%', (100 * v.graft.hack).toFixed(1) + '%']) if (!txt.includes(w)) problems.push('predict 3 lacks toy number ' + w);
  }
  // The toy tab
  await clk('#tabs button[data-t="t-toy"]'); await wait(900); await audit('toy open');
  const live = await p.evaluate(() => { const r = TOY.run('graft', { seed: 1 }), h = r.hist[r.hist.length - 1].dep; return { hack: h.hack, und: h.undetected } });
  const one = SWEEP.variants.default.graft;
  if (!(live.hack >= one.hack_min - 1e-9 && live.hack <= one.hack_max + 1e-9)) problems.push(`toy seed 1 hack ${live.hack} outside the sweep range ${one.hack_min}-${one.hack_max}`);
  await shot('gfToy', 'toy'); await shot('gfRun', 'run');
  for (const m of ['dev', 'truth']) { await clk(`#gfToyV button[data-m="${m}"]`); await audit('toy view ' + m) }
  for (const [sel, vals] of [['#gfMon', ['2', '3', '1']], ['#gfSeed', ['3', '1']], ['#gfMeth', ['penalty', 'none', 'filter', 'noroute', 'noanchor', 'graft']]]) {
    for (const v of vals) { await p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('change')) }, v); actions++; await wait(sel === '#gfMeth' ? 60 : 700); await audit(sel + '=' + v) }
  }
  for (const [sel, v] of [['#gfRec', '0.25'], ['#gfPen', '3'], ['#gfStep', '12'], ['#gfStep', '60']]) {
    await p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('input')); e.dispatchEvent(new Event('change')) }, v); actions++; await wait(700); await audit(sel + '=' + v);
    if (sel === '#gfStep' && v === '12') await shot('gfRun', 'run-step12');
  }
  await clk('#gfBack'); await clk('#gfFwd'); await clk('#gfReset'); await wait(700); await audit('toy reset');
  // The other tabs
  for (const t of ['t-tables', 't-more']) { await clk(`#tabs button[data-t="${t}"]`); await wait(200); await audit(t + ' open') }
  if (errs.length) problems.push(`${scheme} ${width}: ${errs.join(' | ')}`);
  await p.close();
}
// reduced motion: nothing animates by itself (the page has no autoplaying element)
{ const p = await b.newPage(); await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await wait(500);
  const raf = await p.evaluate(() => new Promise(res => { let n = 0; const t0 = performance.now(); (function f() { n++; if (performance.now() - t0 < 300) requestAnimationFrame(f); else res(n) })() }));
  await p.close(); }
await b.close();
console.log('check_page:', actions, 'actions;', problems.length ? problems.length + ' problems:\n' + problems.join('\n') : '0 problems');
process.exit(problems.length ? 1 : 0);
