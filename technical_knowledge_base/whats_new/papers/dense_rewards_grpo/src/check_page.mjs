// Exercise every control of the page in both themes and widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen, no NaN/undefined/Infinity in visible text, no errors, no sideways scroll,
// overlapping SVG labels, the 3D stages playing once in view (2026-11-06: autoplay; the simulator widget still waits for Play), every closed block opened, prose numbers against
// inputs/recompute.json and inputs/sim.json, the in-page engine against the node run. Element screenshots go to <page>/.shots/.
// usage (from the repo root, with CHROME_PATH set): node technical_knowledge_base/whats_new/papers/fair_cast/src/check_page.mjs
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = R('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html') + '#t-read';
const shots = path.resolve(here, '../.shots'); fs.mkdirSync(shots, { recursive: true });
const RC = JSON.parse(fs.readFileSync(path.join(here, 'inputs/recompute.json')));
const SIM = JSON.parse(fs.readFileSync(path.join(here, 'inputs/sim.json')));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: process.getuid && process.getuid() === 0 ? ['--no-sandbox'] : [] });
const problems = []; let actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
for (const [scheme, width] of [['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await wait(300);
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
  // the two 3D stages play by themselves once in view (2026-11-06 rule; this replaced the old never-autoplay check); nothing else animates before a click
  for (const t of ['t-sim', 't-tables', 't-more', 't-read']) { await clk(`#tabs button[data-t="${t}"]`); await wait(400) }
  for (const id of ['stg-loop', 'stg-dz']) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    if (!(+(await p.$eval('#' + id, e => e.dataset.frames || 0)))) problems.push(`${scheme} ${width}: ${id} did not play when scrolled into view`) }
  const fr0 = await p.$$eval('[data-frames]', es => es.filter(e => !e.classList.contains('stg')).map(e => e.id + ':' + e.dataset.frames));
  if (fr0.length) problems.push(`${scheme} ${width}: animation frames before any click: ${fr0.join(' ')}`);
  // open every closed block
  await p.$$eval('details', ds => ds.forEach(d => d.open = true)); actions++;
  await audit('read open, details open');
  await shot('hero', 'card');
  for (const m of ['fc', 'rtn']) { await clk(`#fcLoopM button[data-m="${m}"]`); await wait(300); await audit('loop ' + m); await shot('stg-loop', 'loop-' + m) }
  for (const v of ['0', '50', '85', '30']) { await p.$eval('#fcSRx', (e, v) => { e.value = v; e.dispatchEvent(new Event('input')) }, v); actions++; await wait(80); await audit('sr slider ' + v); if (v === '85') await shot('fcSR', 'sr') }
  for (const id of ['fcPr1', 'fcPr2', 'fcPr3']) { const bs = await p.$$(`#${id} .opts button`); await bs[bs.length - 1].evaluate(x => x.click()); await bs[0].evaluate(x => x.click()); actions += 2; await wait(80) }
  await audit('predicts revealed');
  const pr1 = await p.$eval('#fcPr1Out', e => e.innerText);
  if (!pr1.includes('step ' + SIM.steady.first.n)) problems.push('predict 1 does not quote the engine first change ' + SIM.steady.first.n + ': ' + pr1.slice(0, 80));
  for (const m of ['task', 'gain']) { await clk(`#fcPairsM button[data-m="${m}"]`); await audit('pairs ' + m) }
  await shot('fcPairs', 'pairs');
  await clk('#fcPairsAlt'); await audit('pairs alt');
  const altSum = await p.$eval('#fcPairsSum', e => e.innerText);
  if (!altSum.includes('mean +' + RC.pairs.mean_alt.toFixed(1))) problems.push('pairs alt summary lacks mean ' + RC.pairs.mean_alt + ': ' + altSum);
  await clk('#fcPairsAlt');
  const sum = await p.$eval('#fcPairsSum', e => e.innerText);
  for (const w of ['more than one point ' + RC.pairs.ahead, 'within one point ' + RC.pairs.within, 'behind ' + RC.pairs.behind, 'mean +' + RC.pairs.mean.toFixed(1), 'median +' + RC.pairs.median.toFixed(1), 'without zebra +' + RC.pairs.mean_no_zebra.toFixed(1), RC.pairs.small + ' of 25'])
    if (!sum.includes(w)) problems.push('pairs summary lacks ' + w + ': ' + sum);
  if (width === 920) {
    const txt = await p.$eval('#t-read', e => e.innerText);
    const P = RC.pairs;
    for (const w of ['+' + P.mean_no_zebra.toFixed(1), '+' + P.mean_alt.toFixed(1), P.zebra_sum.toFixed(1) + ' of the ' + P.sum.toFixed(1), P.pos + ' pairs positive, ' + P.neg + ' negative', 'p = ' + P.sign_p.toFixed(4), P.small + ' of the 25 differences', '+' + P.median.toFixed(1)])
      if (!txt.includes(w)) problems.push('prose lacks data number ' + w);
  }
  // the simulator tab
  await clk('#tabs button[data-t="t-sim"]'); await wait(300); await audit('sim open');
  const rep = await p.evaluate(() => [document.getElementById('fcRepFirst').textContent, document.getElementById('fcRepSteady').textContent, document.getElementById('fcRepPct').textContent]);
  if (rep[0] !== String(SIM.def.first.n) || rep[1] !== String(SIM.steady.first.n) || rep[2] !== SIM.def.pctN.toFixed(2) + '%') problems.push('sim reproduction box ' + rep.join(',') + ' against sim.json ' + SIM.def.first.n + ',' + SIM.steady.first.n + ',' + SIM.def.pctN.toFixed(2));
  await shot('fcSim', 'sim');
  const fr1 = await p.$eval('#fcSim', e => +(e.dataset.frames || 0));
  if (fr1) problems.push('sim drew animation frames before Play');
  await clk('#fcPlay'); await wait(1200);
  const fr2 = await p.$eval('#fcSim', e => +(e.dataset.frames || 0)); if (!fr2) problems.push('Play drew no frames');
  await audit('sim mid-play'); await shot('fcSim', 'sim-mid'); await clk('#fcPlay');
  for (const m of ['rtn', 'sr', 'ef', 'all']) { await clk(`#fcSimM button[data-m="${m}"]`); await audit('sim mode ' + m) }
  await clk('#fcMean'); await audit('sim mean off'); await clk('#fcMean');
  for (const [sel, vals] of [['#fcW', ['0.005', '0.08', '0.02']], ['#fcEta', ['3e-7', '1e-5', '1e-6']], ['#fcDrift', ['0.25', '1', '0.5']], ['#fcNoise', ['0', '1', '0.5']], ['#fcSeed', ['2', '3', '1']]]) {
    for (const v of vals) { await p.$eval(sel, (e, v) => { e.value = v; e.dispatchEvent(new Event('change')) }, v); actions++; await wait(120); await audit(sel + '=' + v); if (sel === '#fcEta' && v === '1e-5') await shot('fcSim', 'sim-lr1e-5') }
  }
  await p.$eval('#fcStep', e => { e.value = '60'; e.dispatchEvent(new Event('input')) }); actions++; await audit('sim step 60');
  // the tables tab
  await clk('#tabs button[data-t="t-tables"]'); await wait(200); await audit('tables open');
  for (const m of ['delta', 'paper']) { await clk(`#fcT2M button[data-m="${m}"]`); await audit('t2 ' + m) }
  await shot('t-tables', 'tables');
  await clk('#tabs button[data-t="t-more"]'); await wait(200); await audit('more open');
  if (errs.length) problems.push(`${scheme} ${width}: ${errs.join(' | ')}`);
  await p.close();
}
await b.close();
console.log('check_page:', actions, 'actions;', problems.length ? problems.length + ' problems:\n' + problems.join('\n') : '0 problems');
process.exit(problems.length ? 1 : 0);
