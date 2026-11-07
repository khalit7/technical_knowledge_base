// The 2026-11-06 rollout checks for Observability: the four 3D stages and the incident animation play by themselves once scrolled into view,
// step to their last step (both incident modes) with one step-list item per step, stop redrawing off screen and never move under reduced
// motion; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px and one below 1100 px. Every number written
// into the step lists is checked against the recorded run (window.DEMO), the calculator's formula (window.OBS_CARD), the collector
// configuration (src/demo/otelcol.yaml) and the incident animation's own captions (window.OBS_IX).
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/observability/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const CFG = fs.readFileSync(path.resolve(here, 'demo/otelcol.yaml'), 'utf8');
const STAGES = { 'stg-hero': 'sx-hero', 'stg-trace': 'sx-trace', 'stg-card': 'sx-card', 'stg-otel': 'sx-otel' };
// 2D animations: card, control id, mode buttons (selector), modes, step list for each mode
const ANIMS = [['ix-card', 'ix-ctl', '#ix-seg', ['a', 'b'], m => 'sx-ix-' + m]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
// the collector settings the step list quotes
for (const [re, what] of [[/decision_wait:\s*10s/, 'decision_wait 10s'], [/threshold_ms:\s*1000/, 'latency threshold 1000 ms'], [/sampling_percentage:\s*5\b/, '5% baseline'], [/limit_percentage:\s*80/, 'memory limit 80%'],
  [/grpc:\s*\{endpoint:\s*[^}]*:4317\}/, 'gRPC 4317'], [/http:\s*\{endpoint:\s*[^}]*:4318\}/, 'HTTP 4318'], [/processors:\s*\[memory_limiter, tail_sampling, batch\]/, 'traces pipeline order'],
  [/metrics:\s*\n\s*receivers: \[otlp\]\s*\n\s*processors: \[memory_limiter, batch\]/, 'metrics pipeline without a sampler'], [/logs:\s*\n\s*receivers: \[otlp\]\s*\n\s*processors: \[memory_limiter, batch\]/, 'logs pipeline without a sampler']])
  if (!re.test(CFG)) problems.push(`otelcol.yaml no longer has ${what}`);
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code,.code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: a stage's data-frames rises; a 2D animation's play button reads Pause
  for (const id of Object.keys(STAGES)) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => { const d = document.getElementById('s-deep'); window.scrollTo(0, d.getBoundingClientRect().top + scrollY) }); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage to its last step; list length; screenshots mid-way (during a transition and settled) and at the end
  for (const [id, lid] of Object.entries(STAGES)) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(300);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click());
      if (k === Math.floor(n / 2)) { await wait(650); let el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-tween${k}-${scheme}-${width}.png` });
        await wait(1400); el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-mid${k}-${scheme}-${width}.png` }) } else await wait(120);
    }
    await wait(2000);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-last-${scheme}-${width}.png` }) }
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  }
  for (const [card, ctl, sel, modes, lidOf] of ANIMS) for (const m of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(100); }
    const lid = lidOf(m), sfx = m == null ? '' : '-' + m;
    await p.$eval(`#${ctl}-b`, e => e.click());
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card}${sfx} has ${n} steps but list ${lid} shows ${lis}`);
    const other = await p.$$eval(`ol.sx[id^="sx-ix-"]:not([hidden])`, xs => xs.map(x => x.id)); if (other.length !== 1 || other[0] !== lid) problems.push(`${tag}: ${card}${sfx} shows lists ${other}`);
    for (let k = 1; k < n; k++) await p.$eval(`#${ctl}-f`, e => e.click());
    const at = await p.$eval(`#${ctl}-s`, e => +e.value); if (at !== n - 1) problems.push(`${tag}: ${card}${sfx} ended on step ${at + 1}`);
    const on = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on'))); if (on !== n - 1) problems.push(`${tag}: ${card}${sfx} list marks item ${on + 1}`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}${sfx}-last-${scheme}-${width}.png` }) }
    await audit(`${card}${sfx} last step`);
  }
  if (width === 1400) { // the step lists' numbers are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const fmt = (v, d) => v.toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 });
      const D = DEMO, tr = id => D.traces.find(t => t.id === id), sp = (t, n) => t.sp.find(s => s[0] === n);
      const S = tr(D.highlight.slow), Y = tr(D.highlight.typical);
      const B = D.buckets_incident, hit = B.findIndex(b => b[0] === 1.5);
      need('sx-hero', [[0, Math.round(sp(S, 'auth check')[4]) + ' ms'], [0, fmt(sp(S, 'load history')[4], 1) + ' ms'], [1, fmt(sp(S, 'vector index lookup')[4]) + ' ms'], [1, sp(S, 'vector index lookup')[6].attrs.replica],
        [2, fmt(sp(S, 'model call (simulated)')[4]) + ' ms'], [2, fmt(S.sp[0][4]) + ' ms'], [2, 'status ' + S.sp[0][6].attrs['http.response.status_code']],
        [3, 'about ' + Math.round(B[hit][1] - B[hit - 1][1]) + " of that minute's " + Math.round(B[B.length - 1][1])], [4, fmt(sp(S, 'GET retrieval /search')[4]) + ' ms'], [4, fmt(sp(S, 'model call (simulated)')[4]) + ' ms'], [4, S.sp.length === 8 ? 'Eight spans' : '?'],
        [5, '"duration_ms":' + JSON.parse(D.xlogs[S.id][0]).duration_ms], [5, JSON.parse(D.xlogs[S.id][0]).ts.slice(11)]]);
      if (Math.abs(D.exact.normal.avg * 1000 - 320) > 10) out.push('sx-hero: a normal request no longer takes about 320 ms');
      const f1 = v => v.toFixed(1) + ' ms';
      need('sx-trace', [[0, Y.id.slice(0, 8)], [0, f1(Y.sp[0][4])], [1, '(' + f1(sp(Y, 'auth check')[4]) + ')'], [1, '(' + f1(sp(Y, 'load history')[4]) + ')'], [1, '(' + f1(sp(Y, 'GET retrieval /search')[4]) + ')'],
        [1, '(' + f1(sp(Y, 'model call (simulated)')[4]) + ')'], [1, '(' + f1(sp(Y, 'save message')[4]) + ')'], [2, '(' + f1(sp(Y, 'GET /search')[4]) + ')'], [2, '(' + f1(sp(Y, 'vector index lookup')[4]) + ', replica ' + sp(Y, 'vector index lookup')[6].attrs.replica],
        [3, S.id.slice(0, 8)], [3, fmt(S.sp[0][4]) + ' ms'], [3, f1(sp(S, 'GET retrieval /search')[4])], [3, '(' + f1(sp(S, 'vector index lookup')[4]) + ')'], [3, f1(sp(S, 'model call (simulated)')[4])],
        [4, String(sp(S, 'GET retrieval /search')[6].attrs['server.port'])], [4, 'status ' + sp(S, 'GET retrieval /search')[6].attrs['http.response.status_code']]]);
      const tpr = JSON.parse(D.xlogs[S.id][1]).traceparent_received.split('-');
      if (tpr[1] !== S.id || tpr[2] !== sp(S, 'GET retrieval /search')[6].id) out.push('sx-trace: the received traceparent does not name the CLIENT span as parent');
      if (sp(S, 'GET retrieval /search')[6].kind !== 'CLIENT' || S.sp[0][6].kind !== 'SERVER') out.push('sx-trace: span kinds differ from the recording');
      const C = OBS_CARD, gb = s => C.gbDay(s);
      need('sx-card', [[0, (C.B + 2) + ' series'], [0, C.B + ' buckets'], [1, fmt((C.B + 2) * C.R) + ' series'], [2, fmt((C.B + 2) * C.R * C.S) + ' series'], [3, fmt(C.series()) + ' series'], [3, fmt(C.sps(C.series())) + ' samples'],
        [3, fmt(gb(C.series()) * 1000, 1) + ' MB'], [3, D.series_exposed_total + ' series'], [4, fmt(C.series(100)) + ' series'], [4, fmt(C.sps(C.series(100))) + ' samples'], [4, fmt(gb(C.series(100)), 2) + ' GB'],
        [5, fmt(C.series(1e4)) + ' series'], [5, fmt(C.sps(C.series(1e4))) + ' samples'], [5, fmt(gb(C.series(1e4)), 1) + ' GB'], [5, (C.series(1e6) / 1e9).toFixed(1) + ' billion']]);
      const SM = D.sampling;
      need('sx-otel', [[2, SM.incident_traces + ' traces'], [2, SM.tail_kept + ' kept'], [2, 'all ' + SM.tail_kept_interesting + ' slow or failed'], [2, (SM.incident_traces - SM.tail_kept) + ' dropped'], [4, SM.head10_kept + ' of the ' + SM.incident_traces],
        [4, SM.head10_kept_interesting + ' of the ' + SM.interesting], [1, '4317'], [1, '4318'], [1, '80%'], [2, '10s'], [2, '1,000 ms'], [2, '5% of the rest']]);
      if (SM.tail_kept_interesting !== SM.interesting) out.push('tail sampling no longer keeps every interesting trace');
      ['a', 'b'].forEach(m => OBS_IX[m].forEach((t, k) => { const n = s => s.replace(/\s+/g, ' ').trim(); if (n(li('sx-ix-' + m, k)) !== n(t)) out.push(`sx-ix-${m} item ${k + 1} differs from the caption: "${n(li('sx-ix-' + m, k))}" vs "${n(t)}"`) }));
      return out });
    r.forEach(x => problems.push(`${tag}: ${x}`));
  }
  await audit('end');
  if (errs.length) problems.push(`${tag}: errors ${errs.join(' | ')}`);
  console.log(tag, 'done'); await p.close();
}
{ // reduced motion: nothing moves by itself
  const p = await b.newPage(); await p.setViewport({ width: 1400, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]); await p.goto(file);
  for (const id of Object.keys(STAGES)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval(`#${ctl}-s`, e => +e.value), t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (r !== 0 || /Pause/.test(t)) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
