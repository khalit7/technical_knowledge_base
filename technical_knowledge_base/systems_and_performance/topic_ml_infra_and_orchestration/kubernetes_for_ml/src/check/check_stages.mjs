// The 2026-11-06 rollout checks for Kubernetes for ML (2026-11-12), adapted from Cluster anatomy's check_stages.mjs:
// the four 3D stages (the control loop, filter-score-bind, preemption, gangs) and the two 2D animations with step lists (device plugin against
// DRA, Kueue admission) play by themselves once scrolled into view, step to their last step with one step-list item per step, and never move
// under reduced motion; stages stop redrawing off screen; mode chips swap the step list and replay; the two widgets (the failure timeline and
// the scheduling cycle in its closed block) never play by themselves, and the failure timeline opens on its last moment; no errors, NaN,
// undefined or sideways scroll in any tab; splits are two columns at 1400 px and one below 1100 px; scene labels do not overlap or leave the
// card at 1400 px; the numbers in the step lists equal the page's recorded data (window.KM).
// usage (from the repo root): node technical_knowledge_base/systems_and_performance/topic_ml_infra_and_orchestration/kubernetes_for_ml/src/check/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../../index.html'), shots = process.argv[2] || path.resolve(here, '../../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-loop', 'sx-loop-job', ['km-loop-mode', [['jobset', 'sx-loop-jobset'], ['trainjob', 'sx-loop-trainjob'], ['job', 'sx-loop-job']]]],
  ['stg-pack', 'sx-pack-e6spread', ['km-pack-mode', [['e6pack', 'sx-pack-e6pack'], ['e6spread', 'sx-pack-e6spread']]]],
  ['stg-pre', 'sx-pre'], ['stg-gang', 'sx-gang-nogang', ['km-gang-mode', [['gang', 'sx-gang-gang'], ['nogang', 'sx-gang-nogang']]]]];
// 2D animations with a step list: [card, controls, list, [mode buttons, [[mode, list]]]]
const ANIMS = [['km-dev-card', 'km-dev-ctl', 'sx-dev-dp', ['km-dev-mode', [['dra', 'sx-dev-dra'], ['dp', 'sx-dev-dp']]]],
  ['km-q-card', 'km-q-ctl', 'sx-q-flavors', ['km-q-mode', [['tas', 'sx-q-tas'], ['flavors', 'sx-q-flavors']]]]];
const SPLITS = 12;
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
  // labels drawn in the canvas: boxes from the renderer's own label list, measured with the same font, must not overlap or leave the card
  const overlaps = async (id, where) => {
    if (width !== 1400) return;
    const r = await p.evaluate(id => { const st = (window.KMSTG || {})[id]; if (!st) return null; const cv = st.host.querySelector('canvas'), cx = cv.getContext('2d'), W = cv.clientWidth, H = cv.clientHeight;
      const boxes = [], out = [];
      (st.R.lab || []).forEach(L => { if (L.a < .35) return; const o = L.o, fs = Math.max(12, o.fs || 12.5); cx.font = (o.b ? '600 ' : '') + fs + 'px ' + (o.mono ? 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace' : 'ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif');
        const w = cx.measureText(L.text).width, x0 = o.al === 'right' ? L.x - w : o.al === 'left' ? L.x : L.x - w / 2; boxes.push([x0, L.y - fs / 2, x0 + w, L.y + fs / 2, L.text]);
        if (x0 < 3 || x0 + w > W - 3 || L.y - fs / 2 < 2 || L.y + fs / 2 > H - 2) out.push('outside or touching the card: ' + L.text) });
      for (let i = 0; i < boxes.length; i++)for (let j = i + 1; j < boxes.length; j++) { const A = boxes[i], B = boxes[j], ox = Math.min(A[2], B[2]) - Math.max(A[0], B[0]), oy = Math.min(A[3], B[3]) - Math.max(A[1], B[1]);
        if (ox > 2 && oy > 2) out.push(A[4] + ' / ' + B[4]) }
      return out }, id);
    if (r === null) { problems.push(`${tag}: ${id} is not registered in window.KMSTG`); return }
    r.forEach(x => problems.push(`${tag}: ${id} ${where}: labels overlap or leave the card: ${x}`));
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (cols.length !== SPLITS || cols.some(c => c !== 'grid'))) problems.push(`${tag}: splits are not ${SPLITS} two-column grids (${cols.length}: ${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  if (width === 1400) {
    const over = await p.$$eval('#t-read .s3R', xs => xs.map(x => { const r = x.getBoundingClientRect(), k = x.firstElementChild && x.firstElementChild.getBoundingClientRect(); return k && r.width && (k.right > r.right + 1 || k.left < r.left - 1) ? x.innerHTML.slice(0, 40) : '' }).filter(Boolean));
    over.forEach(o => problems.push(`${tag}: right-column content wider than its column: ${o}`));
    // the step lists against the recorded data, recomputed here from window.KM
    const r = await p.evaluate(() => { const out = [], txt = el => el.textContent.replace(/\s+/g, ' ').trim(), K = window.KM;
      const need = (lid, k, x) => { const li = document.getElementById(lid).children[k]; if (!li || !txt(li).includes(x)) out.push(`${lid} item ${k + 1} lacks "${x}"`) };
      const NM = { 'mi-kind-worker': 'worker', 'mi-kind-worker2': 'worker2', 'mi-kind-worker3': 'worker3' }, f2 = x => x.toFixed(2), f1 = x => x.toFixed(1);
      // the control loop: times of each stretch from the watch streams
      const L = m => K.life[m], ts = (m, w, re) => L(m).filter(e => e.what === w && (!re || re.test(e.note))).map(e => e.t);
      const two = a => f2(a[0]) + ' and ' + f2(a[1]) + ' s', nodes = m => L(m).filter(e => e.what === 'binds pod').map(e => NM[/spec\.nodeName = (\S+)/.exec(e.note)[1]]);
      const lastT = m => L(m)[L(m).length - 1].t;
      need('sx-loop-job', 1, two(ts('job', 'creates pod'))); need('sx-loop-job', 2, two(ts('job', 'binds pod'))); need('sx-loop-job', 2, 'pod 0 to ' + nodes('job')[0] + ', pod 1 to ' + nodes('job')[1]);
      need('sx-loop-job', 3, f2(Math.max(...ts('job', 'Started'))) + ' s'); need('sx-loop-job', 3, 'Pulled at ' + f2(Math.max(...ts('job', 'Pulled'))) + ' s');
      need('sx-loop-job', 4, 'succeeded at ' + two(ts('job', 'pod status', /^Succeeded/))); need('sx-loop-job', 4, f2(lastT('job')) + ' s');
      need('sx-loop-jobset', 1, f2(ts('jobset', 'creates Job')[0]) + ' s'); need('sx-loop-jobset', 2, two(ts('jobset', 'creates pod'))); need('sx-loop-jobset', 3, two(ts('jobset', 'binds pod')));
      need('sx-loop-jobset', 3, 'Pod 0 to ' + nodes('jobset')[0] + ', pod 1 to ' + nodes('jobset')[1]); need('sx-loop-jobset', 4, f2(Math.max(...ts('jobset', 'Started'))) + ' s');
      need('sx-loop-jobset', 5, 'succeeded at ' + two(ts('jobset', 'pod status', /^Succeeded/))); need('sx-loop-jobset', 5, f2(ts('jobset', 'Completed')[0]) + ' s'); need('sx-loop-jobset', 5, f2(lastT('jobset')) + ' s');
      need('sx-loop-trainjob', 1, 't = ' + (ts('trainjob', 'creates JobSet')[0] === 0 ? '0' : 'x')); need('sx-loop-trainjob', 2, f2(ts('trainjob', 'creates Job')[0]) + ' s');
      need('sx-loop-trainjob', 3, two(ts('trainjob', 'creates pod'))); need('sx-loop-trainjob', 4, two(ts('trainjob', 'binds pod'))); need('sx-loop-trainjob', 4, 'pod 0 went to ' + nodes('trainjob')[0] + ' and pod 1 to ' + nodes('trainjob')[1]);
      need('sx-loop-trainjob', 5, f2(Math.max(...ts('trainjob', 'Started'))) + ' s'); need('sx-loop-trainjob', 6, 'succeeded at ' + f2(ts('trainjob', 'pod status', /^Succeeded/)[0]) + ' s');
      need('sx-loop-trainjob', 6, f2(ts('trainjob', 'Completed')[0]) + ' s'); need('sx-loop-trainjob', 6, f2(lastT('trainjob')) + ' s'); need('sx-loop-trainjob', 6, String(K.trainjob.gloss[0]));
      // filter, score, bind: every pod's GPUs, node and the scores the list quotes
      for (const m of ['e6spread', 'e6pack']) K.scores[m].steps.forEach((s, k) => need('sx-pack-' + m, k, 'p' + (k + 1) + ', ' + s.gpus + ' GPU' + (s.gpus > 1 ? 's' : '') + ': ' + (s.bound ? NM[s.bound] : 'Pending')));
      const S = K.scores.e6spread.steps, B = K.scores.e6pack.steps, fit = (s, n) => s.rows.find(r => NM[r.node] === n).fit, R0 = S[0].rows[0];
      need('sx-pack-e6spread', 0, 'each ' + R0.fit + ' (CPU ' + R0.fitParts.cpu + ', memory ' + R0.fitParts.memory); need('sx-pack-e6spread', 0, 'every total is ' + R0.total);
      need('sx-pack-e6spread', 1, 'worker now scores ' + fit(S[1], 'worker')); need('sx-pack-e6spread', 1, 'tie at ' + fit(S[1], 'worker2')); need('sx-pack-e6spread', 2, 'worker2 alone scores ' + fit(S[2], 'worker2'));
      need('sx-pack-e6spread', 3, 'tie at ' + fit(S[3], 'worker')); need('sx-pack-e6spread', 4, 'tie at ' + fit(S[4], 'worker2'));
      need('sx-pack-e6spread', 5, S[5].rows.map(r => r.gpuFree).join(', ').replace(/, (\d+)$/, ' and $1') + ' GPUs free');
      const P0 = B[0].rows[0];
      need('sx-pack-e6pack', 0, 'every worker scores ' + P0.fit + ' (GPU part ' + P0.fitParts['example.com/gpu'] + ', CPU ' + P0.fitParts.cpu + ', memory ' + P0.fitParts.memory + ')');
      need('sx-pack-e6pack', 1, 'worker scores ' + fit(B[1], 'worker')); need('sx-pack-e6pack', 1, 'the empty workers ' + fit(B[1], 'worker2'));
      need('sx-pack-e6pack', 2, fit(B[2], 'worker') + ' against ' + fit(B[2], 'worker2')); need('sx-pack-e6pack', 3, 'tie at ' + fit(B[3], 'worker2'));
      need('sx-pack-e6pack', 4, fit(B[4], 'worker2') + ' against ' + fit(B[4], 'worker3'));
      if (B[5].feasible !== 1 || B[5].scored) out.push('pack p6: expected one feasible node and no scoring');
      const ck = Object.values(K.scores).reduce((a, r) => [a[0] + r.checks.matched, a[1] + r.checks.compared], [0, 0]);
      if (document.getElementById('km-pack-match').textContent !== ck[0] + ' of ' + ck[1]) out.push('pack caption: recompute count is not ' + ck[0] + ' of ' + ck[1]);
      // preemption: the four moments against the pod timeline
      const Pr = window.KM_PRE, tl = Pr.tl;
      ['1.2', '6.5', '12.65', '15.3'].forEach((t, k) => { need('sx-pre', k, 't = ' + t + ' s'); if (String(Pr.T[k]) !== t) out.push('preempt stage time ' + k + ' differs from the list') });
      if (!(Pr.T[0] > Math.max(tl['km-low-1'].start, tl['km-low-2'].start, tl['km-low-3'].start) && Pr.T[1] >= tl['km-high-nopreempt'].created && Pr.T[1] < tl['km-high'].created &&
        Pr.T[2] >= tl['km-low-3'].disrupted && Pr.T[2] < tl['km-low-3'].end && Pr.T[3] >= tl['km-high'].start)) out.push('preempt: a moment does not fall in its stretch of the timeline');
      if (tl['km-low-3'].exit !== 137 || tl['km-low-3'].dreason !== 'PreemptionByScheduler' || NM[tl['km-high'].node] !== 'worker3') out.push('preempt: victim or target differs from the list');
      // gangs
      const G = window.KM_GANG, n0 = G.nogang;
      need('sx-gang-nogang', 1, 'a0 on ' + NM[n0['a-0'].node] + ', b0 on ' + NM[n0['b-0'].node] + ', c0 on ' + NM[n0['c-0'].node]);
      need('sx-gang-nogang', 3, K.gang.nogang[2].label.replace(/^\S+\s+/, ''));
      const g = G.gang, ends = j => [g[j + '-0'].end, g[j + '-1'].end].sort((a, b) => a - b).map(f1).join(' and ');
      need('sx-gang-gang', 2, '(' + f1(g['a-0'].start) + ' s)'); need('sx-gang-gang', 2, 'a0 on ' + NM[g['a-0'].node] + ', a1 on ' + NM[g['a-1'].node]);
      need('sx-gang-gang', 4, '(' + f1(g['b-0'].start) + ' s)'); need('sx-gang-gang', 4, 'ended at ' + ends('a') + ' s');
      need('sx-gang-gang', 5, '(' + f1(g['c-0'].start) + ' s)'); need('sx-gang-gang', 5, 'ended at ' + ends('b') + ' s');
      K.gang.log.filter(l => /Quorum is met|cannot be satisfied|appear in scheduling queue/.test(l)).forEach(l => { const m = /status="([^"]+)"|"(Quorum is met[^"]+)"|err="(minCount \(2\) cannot be satisfied: 1 scheduled, 0 remaining)/.exec(l); const x = m && (m[1] || m[2] || m[3]);
        if (x && !txt(document.getElementById('sx-gang-gang')).includes(x)) out.push('gang list lacks the log line "' + x + '"') });
      // Kueue: one item per workload, the flavor or the message
      const ord = a => a.slice().sort((x, y) => x.name < y.name ? -1 : 1);
      ord(K.kueue.flavors).forEach((w, k) => w.admitted ? need('sx-q-flavors', k, w.flavors['example.com/gpu']) : need('sx-q-flavors', k, w.msg.replace(/^couldn't assign flavors to pod set main: /, '')));
      ord(K.kueue.tas).forEach((w, k) => { if (!w.admitted) need('sx-q-tas', k, w.msg.replace(/^couldn't assign flavors to pod set main: /, '')); else need('sx-q-tas', k, 'admitted') });
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  // every stage and 2D animation plays once scrolled into view; the widgets do not
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
    if (shoot) { await wait(300); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}-autoplay-${scheme}-${width}.png` }) }
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1600);
    if (await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  for (const [card, ctl, last] of [['km-fail-card', 'km-fail-ctl', true], ['km-cyc-card', 'km-cyc-ctl', false]]) {
    await p.evaluate(() => { document.getElementById('km-cyc-det').open = true });
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1600);
    const r = await p.evaluate(ctl => [document.getElementById(ctl + '-p').getAttribute('aria-label'), +document.getElementById(ctl + '-s').value, +document.getElementById(ctl + '-s').max], ctl);
    if (r[0] !== 'Play' || (last && r[1] !== r[2])) problems.push(`${tag}: widget ${card} played by itself or did not open on its last moment (${r})`);
    if (shoot) await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}-widget-${scheme}-${width}.png` });
    await p.evaluate(() => { document.getElementById('km-cyc-det').open = false });
  }
  // off screen: the end of the Reading tab, far from every stage
  await p.evaluate(() => window.scrollTo(0, document.getElementById('t-read').getBoundingClientRect().bottom + scrollY - innerHeight)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  const stepAll = async (id, lid, label) => {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.children.length), vis = await p.$eval('#' + lid, e => !e.hidden);
    if (lis !== n || !vis) problems.push(`${tag}: ${id}${label} has ${n} steps but list ${lid} shows ${lis}${vis ? '' : ' (hidden)'}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (shoot) {
        await wait(900); await overlaps(id, `${label} step ${k + 1} mid-tween`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-midtween-${scheme}-${width}.png` });
        await wait(1900); await overlaps(id, `${label} step ${k + 1}`); await (await p.$('#' + id)).screenshot({ path: `${shots}/x-${id}${label}-s${k + 1}-${scheme}-${width}.png` })
      } else await wait(200);
    }
    await wait(2800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id}${label} ended on ${sh}`);
    await audit(`${id}${label} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${id}${label} list does not mark the last step`);
  };
  for (const [id, lid, modes] of STAGES) {
    await stepAll(id, lid, '');
    if (modes) for (const [m, ml] of modes[1]) {
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(1600);
      const r = await p.evaluate((id, ml) => [document.querySelector('#' + id + ' .stg-st').textContent, document.getElementById(id + '-p').getAttribute('aria-label'), document.getElementById(ml).hidden], id, ml);
      if (r[1] !== 'Pause' || r[2]) problems.push(`${tag}: ${id} mode ${m} did not swap its list and replay (${r})`);
      await stepAll(id, ml, '-' + m);
    }
  }
  // the 2D animations: step to the end, one list item per step, the list marks the step, modes swap the list and replay
  const step2d = async (card, ctl, lid, label) => {
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card}${label} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval(`#${ctl}-b`, e => e.click()); for (let k = 0; k < n; k++) await p.$eval(`#${ctl}-f`, e => e.click());
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card}${label} list does not mark the last step`);
    await p.evaluate(lid => document.getElementById(lid).children[1].click(), lid);
    if (+(await p.$eval(`#${ctl}-s`, e => e.value)) !== 1) problems.push(`${tag}: ${card}${label} list click does not move the animation`);
    if (shoot) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(300); await (await p.$('#' + card)).screenshot({ path: `${shots}/x-${card}${label}-s2-${scheme}-${width}.png` }) }
    await audit(`${card}${label}`);
  };
  for (const [card, ctl, lid, modes] of ANIMS) {
    await step2d(card, ctl, lid, '');
    for (const [m, ml] of modes[1]) {
      await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(300);
      await p.$eval(`#${modes[0]} button[data-m="${m}"]`, e => e.click()); await wait(400);
      if (await p.$eval(`#${ctl}-p`, e => e.getAttribute('aria-label')) !== 'Pause') problems.push(`${tag}: ${card} mode ${m} did not replay`);
      await step2d(card, ctl, ml, '-' + m);
    }
  }
  await audit('end');
  for (const t of ['t-kmb', 't-more']) { await p.click(`#tabs button[data-t="${t}"]`); await wait(300); await audit(t, t) }
  await p.click('#tabs button[data-t="t-read"]');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file);
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1400);
    const r = await p.evaluate(ctl => [document.getElementById(ctl + '-p').getAttribute('aria-label'), +document.getElementById(ctl + '-s').value], ctl); if (r[0] !== 'Play' || r[1] !== 0) problems.push(`reduced motion: ${card} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
