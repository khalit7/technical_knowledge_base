// Exercise every control of the page in both themes and three widths, and check what checkpage.sh does not:
// SVG text at least 11 px on screen, no NaN/undefined/Infinity in visible text, no errors, no sideways scroll, overlapping SVG labels;
// splits two columns at 1400 and stacked below 1100, each animation in the right column beside its step list;
// the two step animations (Fig. 4 and Fig. 5, RD.anim) still before they are in view, playing once half in view, pausing off screen,
// stopping on a reader control, not moving under reduced motion, one list item per step; every closed block opened;
// prose and step-list numbers against the figures' data and inputs/recompute.json.
// usage (from the repo root, with CHROME_PATH set): node technical_knowledge_base/whats_new/papers/budget_internalization/src/check_page.mjs <shots dir>
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const R = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = R('puppeteer');
const shots = process.argv[2]; if (!shots) { console.error('usage: node check_page.mjs <shots dir>'); process.exit(2) }
fs.mkdirSync(shots, { recursive: true });
const file = 'file://' + path.resolve(here, '../index.html') + '#t-read';
const RC = JSON.parse(fs.readFileSync(path.join(here, 'inputs/recompute.json')));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined, args: ['--no-sandbox'] });
const problems = []; let actions = 0;
const wait = ms => new Promise(r => setTimeout(r, ms));
const ANIMS = [['biForce', 'sx-force', 4], ['biObj', 'sx-obj', 6]];
const sgn = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(v).toFixed(1);
for (const [scheme, width, rm] of [['light', 1400, false], ['light', 920, false], ['dark', 390, false], ['light', 1400, true]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message));
  // the AI buddy's own fetch of kb_index.json is blocked under file:// (CORS, then net::ERR_FAILED); this page fetches nothing itself
  p.on('console', m => { if (m.type() === 'error' && !/kb_index\.json|net::ERR_FAILED/.test(m.text())) errs.push(m.text()) });
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto(file); await wait(400);
  const tag0 = `${scheme} ${width}${rm ? ' reduced-motion' : ''}`;
  const audit = async where => {
    const r = await p.evaluate(() => {
      const small = [], over = [];
      document.querySelectorAll('.tab:not([hidden]) svg').forEach(svg => {
        const ts = [...svg.querySelectorAll('text')].filter(t => t.getBoundingClientRect().width > 0 && t.getAttribute('opacity') !== '0');
        ts.forEach(t => { const m = svg.getScreenCTM(); const fs = parseFloat(getComputedStyle(t).fontSize) * (m ? m.a : 1); if (fs < 10.95) small.push(t.textContent.slice(0, 30) + ' ' + fs.toFixed(1)) });
        for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) {
          const a = ts[i].getBoundingClientRect(), c = ts[j].getBoundingClientRect();
          const ox = Math.min(a.right, c.right) - Math.max(a.left, c.left), oy = Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top);
          if (ox > 3 && oy > 4) over.push(ts[i].textContent.slice(0, 20) + ' / ' + ts[j].textContent.slice(0, 20));
        }
        const sb = svg.getBoundingClientRect(), host = svg.parentElement.getBoundingClientRect();
        if (sb.right > host.right + 1) over.push('svg wider than its box: ' + (svg.getAttribute('aria-label') || '').slice(0, 30));
      });
      const vis = [...document.querySelectorAll('.tab:not([hidden])')].map(x => x.innerText).join(' ');
      const bad = vis.match(/.{0,30}\b(NaN|undefined|Infinity|null)\b.{0,30}/g) || [];
      const box = document.getElementById('jsErr');
      return { small: [...new Set(small)].slice(0, 6), over: [...new Set(over)].slice(0, 6), bad, side: document.documentElement.scrollWidth > innerWidth, eb: box && !box.hidden ? box.textContent : '' };
    });
    const tag = `${tag0} ${where}`;
    if (r.small.length) problems.push(`${tag}: text under 11px: ${r.small.join(' | ')}`);
    if (r.over.length) problems.push(`${tag}: overlapping labels: ${r.over.join(' | ')}`);
    if (r.bad.length) problems.push(`${tag}: ${r.bad.join(' | ')}`);
    if (r.side) problems.push(`${tag}: sideways scroll`);
    if (r.eb) problems.push(`${tag}: error box: ${r.eb}`);
  };
  const clk = async sel => { await p.$eval(sel, e => e.click()); actions++; await wait(80) };
  const shot = async (id, name) => { const el = await p.$('#' + id); if (el) await el.screenshot({ path: path.join(shots, `${name}-${scheme}-${width}${rm ? '-rm' : ''}.png`) }) };
  const step = id => p.$eval('#' + id + 'Ctl-s', e => +e.value);
  const playTxt = id => p.$eval('#' + id + 'Ctl-p', e => e.textContent);
  // layout
  const lay = await p.evaluate(() => [...document.querySelectorAll('#t-read .s3sp')].map(s => getComputedStyle(s).display));
  if (width === 1400 && lay.some(d => d !== 'grid')) problems.push(`${tag0}: ${lay.filter(d => d !== 'grid').length} splits not two columns`);
  if (width < 1100 && lay.some(d => d === 'grid')) problems.push(`${tag0}: a split is two columns below 1100`);
  // animations
  for (const [id, list, n] of ANIMS) {
    const ok = await p.evaluate((id, list) => { const c = document.getElementById(id), sp = c.closest('.s3sp'); return !!sp && !!c.closest('.s3R') && !!sp.querySelector('.s3L #' + list) }, id, list);
    if (!ok) problems.push(`${tag0}: ${id} is not in the right column of the split that holds ${list}`);
    if (await step(id) !== 0) problems.push(`${tag0}: ${id} moved before it was in view`);
    const items = await p.$eval('#' + list, e => e.children.length);
    if (items !== n) problems.push(`${tag0}: ${id} has ${n} steps but ${items} list items`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await playTxt(id);
    if (rm && /Pause/.test(t)) problems.push(`${tag0}: ${id} plays under reduced motion`);
    if (!rm && !/Pause/.test(t)) problems.push(`${tag0}: ${id} did not start when half in view (button "${t}")`);
    if (!rm) {
      await wait(5200); if (await step(id) < 1) problems.push(`${tag0}: ${id} did not advance`); await shot(id, id + '-auto');
      await p.evaluate(() => window.scrollTo(0, 0)); const s0 = await step(id); await wait(5500);
      if (await step(id) !== s0) problems.push(`${tag0}: ${id} kept stepping off screen`);
      await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(600);
    } else { await wait(5000); if (await step(id) !== 0) problems.push(`${tag0}: ${id} advanced under reduced motion`) }
    await clk('#' + id + 'Ctl-f'); const s1 = await step(id); await wait(5200);
    if (await step(id) !== s1) problems.push(`${tag0}: ${id} kept moving after a reader control`);
    for (let i = 0; i < n; i++) { await p.$eval('#' + list, (e, i) => e.children[i].click(), i); actions++; await wait(rm ? 80 : 700); await audit(`${id} step ${i + 1}`); if (width !== 920 && !rm) await shot(id, `${id}-s${i + 1}`) }
    const cur = await p.$eval('#' + list, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag0}: ${id} list marks item ${cur + 1} at the last step`);
    await clk('#' + id + 'Ctl-b'); await clk('#' + id + 'Ctl-p'); await wait(200); await clk('#' + id + 'Ctl-p');
    await p.$eval('#' + id + 'Ctl-v', e => { e.value = '2'; e.dispatchEvent(new Event('change')) }); actions++;
    await p.$eval('#' + id + 'Ctl-s', e => { e.value = '1'; e.dispatchEvent(new Event('input')) }); actions++;
    await audit(id + ' controls');
  }
  // Fig. 1's buttons: every model with both training sets
  for (const d of [0, 1]) for (const m of [0, 1, 2]) {
    await clk(`#biCrossD button[data-m="${d}"]`); await clk(`#biCrossM button[data-m="${m}"]`); await wait(120);
    await audit(`Fig. 1 model ${m} data ${d}`); if (!rm) await shot('biCross', `biCross-m${m}-d${d}`);
  }
  await clk('#biCrossD button[data-m="0"]'); await clk('#biCrossM button[data-m="0"]');
  for (const id of ['biLen', 'biHm', 'biRft']) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(200); await audit(id); if (!rm) await shot(id, id) }
  await p.$$eval('details', ds => ds.forEach(d => d.open = true)); actions++;
  await audit('read, every block open');
  if (!rm) await shot('hero', 'card');
  if (width === 920) {
    const txt = await p.$eval('#t-read', e => e.innerText);
    // Fig. 1 summary against recompute.json (Qwen, math)
    const sum = await p.$eval('#biCrossSum', e => e.innerText);
    for (const k of ['d21_Qwen_4k_cap', 'd21_Qwen_4k_top', 'd21_Qwen_8k_cap', 'd21_Qwen_8k_top']) { const c = RC.checks.find(x => x.id === k); if (!sum.includes(sgn(c.ours))) problems.push('Fig. 1 summary lacks ' + k + ' ' + sgn(c.ours)) }
    // every section 2 delta the prose quotes is the recomputed one
    for (const c of RC.checks.filter(x => /^(d21_|rg_|tr_|trg_|bf_)/.test(x.id))) { const v = Math.abs(c.ours).toFixed(1); if (!txt.includes(v)) problems.push('prose lacks ' + c.id + ' ' + v) }
    // Fig. 3 cells agree with recompute.json
    const F3 = await p.evaluate(() => window.BI_FIG3);
    const cap = { 'Qwen 4k': 'd21_Qwen_4k', 'Qwen 8k': 'd21_Qwen_8k', 'Gemma 1k': 'd21_Gemma_1k', 'Gemma 2k': 'd21_Gemma_2k', 'Nemotron 1k': 'd21_Nemotron_1k', 'Nemotron 2k': 'd21_Nemotron_2k' };
    for (const r of F3.filter(r => r[0] === 'math')) { for (const [j, suf] of [[2, '_cap'], [3, '_top']]) { const c = RC.checks.find(x => x.id === cap[r[1]] + suf); if (Math.abs(c.ours - r[j]) > 1e-9) problems.push('Fig. 3 ' + r[1] + suf + ' ' + r[j] + ' vs ' + c.ours) }
      const [m, k] = r[1].split(' '); for (const [j, task] of [[4, 'GPQA'], [5, 'LCB-v6']]) { const c = RC.checks.find(x => x.id === 'tr_' + m + '_' + k + '_' + task); if (Math.abs(c.ours - r[j]) > 1e-9) problems.push('Fig. 3 ' + r[1] + ' ' + task) } }
    // Fig. 4's base forcing bars are Table 7's deltas; every bar value is in the step list
    const F4 = await p.evaluate(() => window.BI_FIG4), l4 = await p.$eval('#sx-force', e => e.innerText);
    for (const f of F4) for (const v of [...f.v, ...(f.v2 || [])]) if (v != null && !l4.includes(Math.abs(v).toFixed(1))) problems.push('Fig. 4 list lacks ' + v);
    // Fig. 5's points are within 0.1 of the printed deltas the list quotes
    const F5 = await p.evaluate(() => window.BI_FIG5), l5 = await p.$eval('#sx-obj', e => e.innerText);
    for (const f of F5) { if (Math.abs(f.gain8k - f.paper[0]) > 0.1001 || Math.abs(f.delta64k - f.paper[1]) > 0.1001) problems.push('Fig. 5 point off ' + f.variant); for (const v of f.paper) if (!l5.includes(Math.abs(v).toFixed(1))) problems.push('Fig. 5 list lacks ' + f.variant + ' ' + v) }
    // the "does not reproduce" box quotes the recomputed ranges
    for (const v of [...RC.gain_range, ...RC.fall_range]) if (!txt.includes(Math.abs(v).toFixed(1))) problems.push('box lacks ' + v);
    const sr = RC.checks.find(x => x.id === 'seed_gain_range').ours.concat(RC.checks.find(x => x.id === 'seed_fall_range').ours);
    for (const v of sr) if (!txt.includes(Math.abs(v).toFixed(1))) problems.push('box lacks seed range ' + v);
    for (const k of ['q8_seed_spread_64k']) { const c = RC.checks.find(x => x.id === k); if (!txt.includes(c.ours.toFixed(1) + ' points')) problems.push('prose lacks ' + k) }
    if (!txt.includes(RC.agree + ' of ' + RC.n)) problems.push('prose lacks the recompute count');
  }
  // the tables tab: every table, both views
  await clk('#tabs button[data-t="t-tables"]'); await wait(200); await audit('tables open');
  const nt = await p.$$eval('#biTsel option', o => o.length);
  for (let i = 0; i < nt; i++) for (const d of [false, true]) {
    await p.$eval('#biTdelta', (e, d) => { e.checked = d; e.dispatchEvent(new Event('change')) }, d);
    await p.$eval('#biTsel', (e, i) => { e.selectedIndex = i; e.dispatchEvent(new Event('change')) }, i); actions += 2; await audit('table ' + i + (d ? ' delta' : ''));
  }
  const rcs = await p.$eval('#biRcSum', e => e.innerText); if (!rcs.includes(RC.agree + ' of ' + RC.n)) problems.push('tables summary ' + rcs);
  if (!rm) await shot('t-tables', 'tables');
  await clk('#tabs button[data-t="t-more"]'); await wait(200); await audit('more open');
  await clk('#tabs button[data-t="t-read"]'); await wait(200);
  if (errs.length) problems.push(`${tag0}: ${errs.join(' | ')}`);
  await p.close();
}
await b.close();
console.log('check_page:', actions, 'actions;', problems.length ? problems.length + ' problems:\n' + problems.join('\n') : '0 problems');
process.exit(problems.length ? 1 : 0);
