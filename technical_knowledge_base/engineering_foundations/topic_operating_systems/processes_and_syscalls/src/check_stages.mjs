// The 2026-11-06 rollout checks: every 3D stage and every 2D animation plays by itself once scrolled into view, steps to its last step,
// has one step-list item per step, never moves under reduced motion; no errors, NaN, undefined or sideways scroll; split layout at 1400 px.
// usage (from the repo root or src/): node src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
// (Processes and syscalls: adapted from Memory allocators; six stages, three of them with modes (Fig. 2 ok/err/trace, Fig. 7 tables/leak/fix), one autoplaying
//  2D animation with three modes (Fig. 6, one SIGTERM), two widgets that never play by themselves (the tree simulator, the descriptor tool); the numbers in
//  the step lists are checked against the page's data (window.PD) and descriptor model (window.FDSIM))
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
const STAGES = ['stg-hero', 'stg-sc', 'stg-fork', 'stg-exec', 'stg-sig', 'stg-fd'];
// [card, controls, {mode: step list}, mode buttons, data attribute]
const ANIMS = [['rd-term-card', 'rd-term-ctl', { ok: 'sx-term-ok', busy: 'sx-term-busy', pid1: 'sx-term-pid1' }, 'rd-term-mode', 'm']];
const MODES = { 'stg-sc': ['rd-sc-mode', 'm', ['ok', 'err', 'trace']], 'stg-fd': ['rd-fdx-mode', 'm', ['tables', 'leak', 'fix']] };
const WIDGETS = [['rd-tree-card', 'rd-tree-ctl', 't-read'], ['rd-fd-card', 'rd-fd-ctl', 't-read']];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell' });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) { // two columns where a section has a visual
    const cols = await p.$$eval('.s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns`);
  }
  // autoplay on view
  for (const id of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2200);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // widgets never play by itself
  for (const [card, ctl, tab] of WIDGETS) {
    await p.click(`#tabs button[data-t="${tab}"]`); await wait(300);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(t)) problems.push(`${tag}: widget ${card} played by itself`);
    if (width === 1400) { const c = await p.$$eval(`#${tab} .s3sp`, xs => xs.map(x => getComputedStyle(x).display)); if (c.some(d => d !== 'grid')) problems.push(`${tag}: ${tab} split not two columns`); }
    await p.screenshot({ path: `${shots}/x-tab-${tab}-${scheme}-${width}.png` });
  }
  await p.click('#tabs button[data-t="t-read"]'); await wait(300);
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-s8').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step, in every mode; list length; screenshot mid-way
  for (const id of STAGES) {
    const md = MODES[id], modes = md ? md[2] : [null];
    for (const m of modes) {
      if (m) await p.$eval(`#${md[0]} button[data-${md[1]}="${m}"]`, e => e.click());
      await p.$eval(`#${id}-b`, e => e.click()); // a control: stops autoplay
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + id, h => { const l = h.closest('.s3sp').querySelector('ol.sx:not([hidden])'); return l ? l.children.length : 0 });
      if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but ${lis} items`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2) && (!m || m === modes[modes.length - 1])) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2800); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${scheme}-${width}.png` }) }
      }
      await wait(2800);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m || ''} ended on ${sh}`);
      await audit(`${id} ${m || ''} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((id, k) => document.getElementById(id).closest('.s3sp').querySelector('ol.sx:not([hidden])').children[k].click(), id, k);
    }
  }
  for (const [card, ctl, lists, seg, at] of ANIMS) {
    for (const [m, lid] of Object.entries(lists)) {
      if (seg) { await p.$eval(`#${seg} button[data-${at}="${m}"]`, e => e.click()); await wait(100); }
      await p.$eval(`#${ctl}-b`, e => e.click());
      await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${card} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(60);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${m}-${scheme}-${width}.png` }) } }
      const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card} ${m} list marks ${on}, not the last step`);
      await audit(`${card} ${m}`);
    }
  }
  { // the numbers written into the step lists are the page's data (PD) and descriptor model (FDSIM)
    const r = await p.evaluate(() => { const out = [];
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      const f2 = x => x.toFixed(2), st = v => { const r = PD.shutdown.filter(x => x.v === v).map(x => x.stop_s); return [Math.min(...r), Math.max(...r)] };
      const v1 = st('v1_exec'), v2 = st('v2_sh_c'), lat = PD.latency.filter(x => /solve/.test(x.case)).map(x => x.handler_ms / 1000);
      need('sx-term-ok', [f2(v1[0]) + ' to ' + f2(v1[1]) + ' s']); need('sx-term-pid1', [f2(v2[0]) + ' to ' + f2(v2[1]) + ' s']);
      need('sx-term-busy', [f2(Math.min(...lat)) + ' to ' + f2(Math.max(...lat)) + ' s', 'about ' + (Math.min(...lat) + v1[0]).toFixed(1) + ' s']);
      need('sx-sc-ok', [Math.round(PD.sysc.plain_ns) + ' ns']); need('sx-sc-trace', [Math.round(PD.sysc.strace_ns / 1000) + ' µs', PD.strace_meta.wait4 + ' wait4', PD.strace_meta.ptrace + ' ptrace', PD.strace_meta.write + ' write']);
      need('sx-fd-leak', [PD.cloexec.leak_s.toFixed(3) + ' s']); need('sx-fd-fix', [PD.cloexec.cloexec_s.toFixed(3) + ' s', PD.cloexec.leak_s.toFixed(3) + ' s']);
      const q = PD.sigq; need('sx-sig', [q.sigpending.toLocaleString('en-US')]); need('dr-coalesce', [q.sent.toLocaleString('en-US')]);
      if (q.usr1 !== 1 || q.rt !== q.sent) out.push('sigq: the run no longer shows 1 and ' + q.sent);
      const T = PD.execkeep; need('sx-exec', ['PID ' + T.match(/before exec: pid (\d+)/)[1], 'open fds: ' + T.match(/open fds: ([\d ]+)/)[1].trim()]);
      const sp = PD.spawn.find(r => r.mib === 1024 && r.m === 'fork_exit'), s0 = PD.spawn.find(r => r.mib === 0 && r.m === 'fork_exit');
      need('sx-fork', [sp.pte_kib.toLocaleString('en-US') + ' KiB', s0.pte_kib + ' KiB']);
      const rows = PD.proc.split('== MAIN')[0].split('\n').filter(l => /^\s*\d+\s+\d+/.test(l)).map(l => l.trim().split(/\s+/)), py = rows.find(r => r[7] === 'python'), wk = rows.filter(r => r[1] === py[0]);
      need('sx-hero', ['(PID ' + py[0] + ')', py[6] + ' threads', 'PIDs ' + wk[0][0] + ' and ' + wk[1][0], 'Each worker has ' + wk[0][6]]);
      // the descriptor stage's last frames are the model's own: offsets and EOF
      const t = FDSIM.run(FDSCRIPTS.tables.steps), z = t[t.length - 1];
      if (Object.values(z.desc).map(d => d.off).sort().join() !== '0,0,7') out.push('fd tables: offsets are not 0, 0 and 7');
      const L = FDSIM.run(FDSCRIPTS.leak.steps); if (!/blocks/.test(L[11].res) || !/end of file/.test(L[13].res)) out.push('fd leak: frame 12 does not block or frame 14 is not EOF');
      const C = FDSIM.run(FDSCRIPTS.cloexec.steps); if (!/end of file/.test(C[11].res)) out.push('fd fix: last frame is not EOF');
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`)); }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || r[1] !== 'step 1 of ' + r[1].split(' of ')[1]) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
