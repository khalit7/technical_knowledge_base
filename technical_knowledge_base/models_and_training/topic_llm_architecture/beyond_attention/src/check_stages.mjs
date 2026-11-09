// The 2026-11-06 rollout checks for Beyond attention (2026-11-09), adapted from Attention variants' check_stages.mjs: the seven 3D stages
// (Fig. 1 recurrence against attention, Fig. 2 linear attention, Fig. 3 write rules, Fig. 4 selective scan, Fig. 5 hybrids, Fig. 6 recall, Fig. 7 the
// tiny GPT runs) play by themselves once scrolled into view, step to their last step with one step-list item per step, stop redrawing off screen and
// never move under reduced motion; the write-rule widget never plays by itself; no errors, NaN, undefined or sideways scroll; the splits are two
// columns at 1400 px and one below 1100 px; every number the step lists write is what the page's data gives (BAD, BA_WR and the scenes' exports).
// Screenshots of every step (mid-tween and settled) at 1400 light, and of the middle step at 390 dark, go to the shots dir.
// usage (from the repo root): node technical_knowledge_base/models_and_training/topic_llm_architecture/beyond_attention/src/check_stages.mjs [shots dir] [--all]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const args = process.argv.slice(2), ALL = args.includes('--all');
const file = 'file://' + path.resolve(here, '../index.html'), shots = args.find(a => !a.startsWith('--')) || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = ['stg-rec', 'stg-lin', 'stg-wr', 'stg-scan', 'stg-hyb', 'stg-recall', 'stg-runs'];
const wait = ms => new Promise(r => setTimeout(r, ms));
const problems = [];
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`, shoot = width === 1400 || width === 390;
  const audit = async (where, tab = 't-read') => {
    const r = await p.evaluate(tab => { const c = document.getElementById(tab).cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } }, tab);
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const outside = await p.$$eval('section', xs => xs.filter(x => !x.closest('.tab')).map(x => x.id)); if (outside.length) problems.push(`${tag}: sections outside a tab ${outside}`);
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) { const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`)) }
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  await p.evaluate(() => window.scrollTo(0, 0)); await wait(800);
  // only the stages that are off screen now (the hero is on screen at scroll 0 and rightly keeps its flows moving)
  const offs = () => p.$$eval('.stg', xs => xs.map(x => { const r = x.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight ? +x.dataset.draws || 0 : -1 }));
  const d0 = await offs(); await wait(1200); const d1 = await offs();
  if (d1.some((v, i) => v >= 0 && v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, sfx) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    if (n > 8) problems.push(`${tag}: ${id} has ${n} steps, more than about 8`);
    if (await p.$eval('#' + lid, e => e.hidden)) problems.push(`${tag}: ${lid} is hidden while it drives ${id}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot && (ALL || width === 1400 || k === Math.floor(n / 2))) {
        await wait(650); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(2700); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${sfx}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(250);
    }
    await wait(1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id}${sfx} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id} list ${lid} does not mark the last step`);
  };
  for (const id of STAGES) await stepAll(id, 'sx-' + id.slice(4), '');
  // the write-rule widget (2D, RD.anim with auto:false): never plays by itself, even in view
  { await p.$eval('#rd-wr', e => { e.closest('details').open = true; e.scrollIntoView({ block: 'center' }) }); await wait(1600);
    if ((await p.$eval('#rd-wr-ctl-p', e => e.getAttribute('aria-label'))) === 'Pause') problems.push(`${tag}: the write-rule widget played by itself`);
    await p.$eval('#rd-wr', e => e.closest('details').open = false); }
  if (width === 1400) { // the numbers the step lists and prose write are what the page's data gives
    const r = await p.evaluate(() => { const out = [], li = (lid, k) => document.getElementById(lid).children[k].textContent.replace(/\s+/g, ' ');
      const need = (lid, k, x) => { if (!li(lid, k).includes(String(x))) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const fmt = v => Math.round(v).toLocaleString('en-GB'), f2 = v => v.toFixed(2), pc = v => Math.round(100 * v) + '%';
      // Fig. 1: Qwen3-Next's shapes from its config
      const c = BAD.mem.models.find(m => m.key === 'qwen3-next-80b-a3b').cfg, per = 2 * c.num_key_value_heads * c.head_dim, stt = c.linear_num_value_heads * c.linear_key_head_dim * c.linear_value_head_dim;
      need('sx-rec', 0, fmt(per)); need('sx-rec', 1, fmt(8 * per)); need('sx-rec', 2, fmt(stt)); need('sx-rec', 3, fmt(stt / per)); need('sx-rec', 3, fmt(stt));
      need('sx-rec', 4, (per * 131072 * 2 / 2 ** 20) + ' MiB'); need('sx-rec', 4, (stt * 2 / 2 ** 20) + ' MiB');
      // Figs. 2 and 3: the write-rule toy
      need('sx-lin', 4, f2(BAD.wr.linear_d8.mean));
      const W = window.BA_WRS, m = i => f2(W[i].mean), cs = (i, w) => f2(W[i].cos[w]);
      need('sx-wr', 0, m(0)); need('sx-wr', 0, cs(0, 'Roxy')); need('sx-wr', 1, m(1)); need('sx-wr', 1, cs(1, 'Roxy')); need('sx-wr', 1, cs(1, 'slide')); need('sx-wr', 1, cs(1, 'climb'));
      need('sx-wr', 3, m(3)); need('sx-wr', 3, cs(3, 'hill')); need('sx-wr', 3, cs(3, 'Roxy')); if (!(W[3].cos.climb < 0 && W[3].cos.tree < 0)) out.push('sx-wr item 4: climb and tree are not negative');
      need('sx-wr', 4, m(4)); need('sx-wr', 4, cs(4, 'Roxy')); need('sx-wr', 4, cs(4, 'hill')); need('sx-wr', 5, m(5)); need('sx-wr', 5, f2(BAD.wr.linear_d16.mean));
      [['linear', 8, 0], ['decay', 8, 1], ['delta', 8, 3], ['gated', 8, 4], ['delta', 16, 5]].forEach(([r, d, i]) => { if (Math.abs(BAD.wr[r + '_d' + d].mean - W[i].mean) > 5e-4) out.push('Fig. 3 ' + r + ' d' + d + ' mean differs from the recorded state_rules output') });
      // Fig. 4: the trained head's decays
      const S = window.BA_SCAN, A = t => f2(S.a[S.tokens.indexOf(t)]), src = S.tokens.indexOf(' R');
      need('sx-scan', 0, f2(S.median)); [1, 2, 3].forEach(n => need('sx-scan', 0, pc(S.keepMed[src + n])));
      need('sx-scan', 1, A(' R')); need('sx-scan', 1, A('os')); need('sx-scan', 1, A('x')); need('sx-scan', 1, A('y')); need('sx-scan', 1, A('.'));
      if (!(S.low.map(x => x[0]).filter(x => x === ' R').length === 2 && S.low.some(x => x[0] === 'os'))) out.push('Fig. 4: the three strongest resets are not both " R" and "os"');
      need('sx-scan', 3, pc(S.keepReal[S.tokens.indexOf('.')])); need('sx-scan', 3, pc(S.keepReal[S.tokens.lastIndexOf(' R')]));
      if (document.getElementById('stg-scan').querySelector('.stg-top span').textContent.indexOf('layer ' + S.layer + ', head ' + S.head) < 0) out.push('Fig. 4 title does not name the head');
      // Fig. 5: hybrids
      const H = window.BA_HYB, gib = b => (b / 2 ** 30).toFixed(2);
      need('sx-hyb', 1, fmt(H.cross)); need('sx-hyb', 1, (H.nhX.state / 2 ** 20).toFixed(1) + ' MiB'); need('sx-hyb', 2, gib(H.nh128.total) + ' GiB'); need('sx-hyb', 2, Math.round(H.ll128.total / 2 ** 30) + ' GiB');
      const rat = s => { const a = [...s].filter(x => x === 'a').length, r = s.length - a; return (r / a).toFixed(r % a ? 1 : 0) + ' : 1' };
      H.rows.forEach(([lab, s]) => { if (!li('sx-hyb', 3).includes(rat(s))) out.push('sx-hyb item 4 lacks ' + lab + ' ' + rat(s)) });
      // Fig. 6: Pythia against Mamba
      const RC = window.BA_RECALL; need('sx-recall', 0, fmt(RC.PER)); need('sx-recall', 0, fmt(RC.STATE));
      RC.steps.forEach((s, i) => { need('sx-recall', i, pc(s.a)); need('sx-recall', i, pc(s.b)) }); need('sx-recall', 3, fmt(RC.steps[3].tok));
      need('sx-recall', 1, String(RC.steps[1].tok / RC.EQ)); need('sx-recall', 2, String(Math.floor(RC.steps[2].tok / RC.EQ))); need('sx-recall', 3, String(Math.round(RC.steps[3].tok / RC.EQ)));
      // Fig. 7: the tiny GPT runs
      const U = window.BA_RUNS, ix = id => U.ids.indexOf(id), f3 = v => v.toFixed(3);
      ['at_mha', 'ba_ssm', 'ba_hybrid', 'ba_hybrid2', 'pe_nope'].forEach(id => need('sx-runs', 2, f3(U.val[ix(id)])));
      ['at_mha', 'ba_ssm', 'ba_hybrid', 'ba_hybrid2'].forEach(id => need('sx-runs', 3, f3(U.rs[ix(id)]))); need('sx-runs', 3, f3(U.rs[ix('ba_ssm')] - U.rs[ix('at_mha')]));
      ['at_mha', 'ba_ssm', 'ba_hybrid'].forEach(id => need('sx-runs', 4, f3(U.rox[ix(id)])));
      BAD.runs.filter(r => U.ids.includes(r.run) && r.run !== 'pe_nope').forEach(r => { if (r.kv_256_bf16) need('sx-runs', 1, fmt(r.kv_256_bf16)); if (r.state_fp32) need('sx-runs', 1, fmt(r.state_fp32)) });
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  for (const t of ['t-mem', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
