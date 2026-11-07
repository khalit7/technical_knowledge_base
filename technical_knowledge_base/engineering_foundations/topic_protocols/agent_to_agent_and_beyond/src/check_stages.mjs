// The 2026-11-06 rollout checks for "Agent-to-agent and beyond": every 3D stage plays by itself once scrolled into view, steps to its last step in
// every mode with one step-list item per step, stops redrawing off screen and never moves under reduced motion; the raw-message widget (rpw) never
// plays by itself; no errors, NaN, undefined or sideways scroll; the splits are two columns at 1400 px. The numbers written in the step lists of
// Fig. 2 to Fig. 4 are checked against the page's own recordings (window.A2AD) and the stretch grouping the scene draws (window.A2A_JOB_GROUPS).
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_protocols/agent_to_agent_and_beyond/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// [stage, mode chips or null, {mode: step list}]
const STAGES = [['stg-hero', null, { all: 'sx-hero' }],
  ['stg-job', 'jb-mode', { main: 'sx-jb-main', resub: 'sx-jb-resub', push: 'sx-jb-push', cancel: 'sx-jb-cancel' }],
  ['stg-auth', null, { auth: 'sx-au' }], ['stg-mcp', null, { all: 'sx-mcp' }],
  ['stg-ap2', 'ap-mode', { present: 'sx-ap-present', absent: 'sx-ap-absent' }], ['stg-mhs', null, { all: 'sx-mh' }]];
const wait = ms => new Promise(r => setTimeout(r, ms));
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });
const problems = [];
for (const [scheme, width] of [['light', 1400], ['light', 920], ['dark', 390]]) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()) });
  await p.setViewport({ width, height: 900 }); await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }]);
  await p.goto(file); await p.evaluate(() => { try { localStorage.clear() } catch (e) { } }); await p.goto(file); await wait(400);
  const tag = `${scheme} ${width}`;
  const audit = async where => {
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  if (width === 1400) {
    const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
    if (!cols.length || cols.some(c => c !== 'grid')) problems.push(`${tag}: a split is not two columns (${cols})`);
  }
  // autoplay on view
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  // the widget never plays by itself
  await p.$eval('#rpw-det', d => d.open = true); const w0 = await p.$eval('#rpw-ctl-s', e => +e.value);
  await p.$eval('#rpw-card', e => e.scrollIntoView({ block: 'center' })); await wait(2200);
  if (/Pause/.test(await p.$eval('#rpw-ctl-p', e => e.textContent)) || (await p.$eval('#rpw-ctl-s', e => +e.value)) !== w0) problems.push(`${tag}: widget rpw played by itself`);
  await p.$eval('#rpw-det', d => d.open = false);
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s11').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step in every mode; list length; screenshot mid-way
  for (const [id, chips, lists] of STAGES) {
    for (const [m, lid] of Object.entries(lists)) {
      if (chips) { await p.$eval(`#${chips} button[data-m="${m}"]`, e => e.click()); await wait(100) }
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m}-mid-${scheme}-${width}.png` }) }
      }
      await wait(2000);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m} ended on ${sh}`);
      if (width === 1400) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m}-last-${scheme}-${width}.png` }) }
      await audit(`${id} ${m} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    }
  }
  if (width === 1400) { // the step lists' numbers are the recordings'
    const r = await p.evaluate(() => { const out = [], D = A2AD, G = A2A_JOB_GROUPS, f = n => n.toLocaleString('en-GB'), t = x => f(Math.round(x * 100) / 100);
      const li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const body = fr => JSON.parse(fr.raw.slice(fr.raw.indexOf('\n\n') + 2)), first = fr => body(fr).params.message.parts[0].text;
      for (const [m, id] of [['main', 'sx-jb-main'], ['resub', 'sx-jb-resub'], ['push', 'sx-jb-push'], ['cancel', 'sx-jb-cancel'], ['auth', 'sx-au']])
        if (document.getElementById(id).children.length !== G[m].length) out.push(`${id}: ${document.getElementById(id).children.length} items, ${G[m].length} stretches`);
      for (const [m, g] of Object.entries(G)) { const S = D.scen[m].steps; if (g[0][0] !== 0 || g[g.length - 1][1] !== S.length - 1 || g.some((x, i) => i && x[0] !== g[i - 1][1] + 1)) out.push(`${m}: stretches do not cover every frame once`) }
      let S = D.scen.main.steps;
      need('sx-jb-main', [[0, f(S[0].bytes) + ' bytes'], [0, f(S[1].bytes) + '-byte'], [1, f(S[2].bytes) + ' bytes'], [1, t(S[2].t) + ' ms'], [1, t(S[4].t) + ' ms'], [1, first(S[2])], [2, t(S[6].t) + ' ms'],
        [2, D.scen.main.ctx_items[1].call], [2, D.scen.main.ctx_items[2].call], [3, f(S[7].bytes) + ' bytes'], [3, t(S[7].t) + ' ms'], [3, first(S[7])], [4, t(S[10].t) + ' to ' + t(S[12].t) + ' ms'],
        [5, f(S[13].bytes) + ' bytes'], [5, t(S[14].t) + ' ms'], [6, f(S[15].bytes) + ' bytes'], [6, f(S[16].bytes) + ' bytes']]);
      S = D.scen.resub.steps;
      need('sx-jb-resub', [[0, t(S[3].t) + ' ms'], [1, t(S[4].t) + ' and ' + t(S[5].t) + ' ms'], [2, t(S[6].t) + ' ms'], [2, f(S[7].bytes) + ' bytes'], [3, t(S[8].t) + ' ms'], [3, f(S[10].bytes) + ' bytes'], [4, t(S[14].t) + ' ms']]);
      if (Math.max(...S.map(x => x.bytes)) !== S[10].bytes) out.push('resub: the snapshot is not the largest frame');
      if (S.slice(0, 6).filter(x => x.title.indexOf('SSE') === 0).length !== 4) out.push('resub: Team A did not hang up after four events');
      S = D.scen.push.steps;
      need('sx-jb-push', [[0, f(S[1].bytes) + ' bytes'], [1, f(S[2].bytes) + ' bytes'], [1, t(S[3].t) + ' ms'], [2, t(S[4].t) + ' and ' + t(S[5].t) + ' ms'], [3, 'From ' + t(S[6].t) + ' to ' + t(S[9].t) + ' ms'], [4, t(S[10].t) + ' ms']]);
      if (D.scen.push.hooks !== 7 || S.filter(x => x.dir === 'hook').length !== 7) out.push('push: not seven POSTs');
      S = D.scen.cancel.steps;
      need('sx-jb-cancel', [[0, f(S[1].bytes) + ' bytes'], [1, t(S[2].t) + ' ms'], [1, t(S[5].t) + ' ms'], [2, t(S[6].t) + ' and ' + t(S[7].t) + ' ms'], [3, f(S[8].bytes) + ' bytes'], [3, t(S[8].t) + ' ms'], [3, f(S[9].bytes) + ' bytes'], [3, t(S[10].t) + ' ms']]);
      S = D.scen.auth.steps;
      need('sx-au', [[0, f(S[1].bytes) + ' bytes'], [1, t(S[2].t) + ' ms'], [1, t(S[5].t) + ' ms'], [2, t(S[6].t) + ' ms'], [2, f(S[6].bytes) + ' bytes'], [3, t(S[7].t) + ' ms'], [3, f(S[7].bytes) + ' bytes'], [3, t(S[8].t) + ' ms'], [4, t(S[9].t) + ' ms'], [5, t(S[14].t) + ' ms'], [6, f(S[16].bytes) + ' bytes']]);
      if (!/gs:\/\/team-a-private\//.test(S[6].raw) || !/never through this chat/.test(S[6].raw)) out.push('auth: the auth-required message is not the one quoted');
      const M = D.scen.mcp, A = D.scen.main, C = A2A_MCP_CUM;
      need('sx-mcp', [[0, f(M.ctx_items[0].chars) + ' characters'], [1, '(' + M.ctx_items[1].chars + ' characters back)'], [1, '(' + M.ctx_items[2].chars + ')'], [1, '(' + M.ctx_items[3].chars + ')'],
        [2, '(' + M.ctx_items[4].chars + ' characters)'], [2, f(M.ctx) + ' characters after ' + M.requests + ' HTTP requests'], [3, '(' + A.ctx_items[0].chars + ' characters)'], [3, first(A.steps[2])],
        [4, '(' + A.ctx_items[1].chars + ' characters)'], [4, '(' + A.ctx_items[2].chars + ')'], [4, A.ctx_items[2].call], [5, '(' + A.ctx_items[3].chars + ')'], [5, '(' + A.ctx_items[4].chars + ' each)'],
        [5, '(' + A.ctx_items[7].chars + ')'], [5, '(' + A.ctx_items[8].chars + ')'], [5, A.ctx_items[8].call], [5, f(A.ctx) + ' characters after ' + A.requests + ' HTTP requests'],
        [6, M.requests + ' requests, ' + f(M.up) + ' bytes up and ' + f(M.down) + ' down, ' + f(M.ctx)], [6, A.requests + ' requests, ' + f(A.up) + ' up and ' + f(A.down) + ' down, ' + A.ctx]]);
      if (C.mcp[2] !== M.ctx || C.a2a[2] !== A.ctx) out.push('Fig. 4 meters do not end on the recorded totals');
      if ([4, 5, 6].some(i => M.ctx_items[i].chars !== M.ctx_items[4].chars) || [4, 5, 6].some(i => A.ctx_items[i].chars !== A.ctx_items[4].chars) || A.ctx_items[1].chars !== A.ctx_items[3].chars) out.push('Fig. 4: items said to be equal are not');
      if (!/"handle": "h-step-4000"/.test(M.steps[5].raw.replace(/\\n|\\"/g, m => m === '\\n' ? '' : '"').replace(/\s+/g, ' '))) out.push('Fig. 4: load_checkpoint did not return the handle');
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
  for (const [id] of STAGES) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const r = await p.$eval('#' + id, e => [+e.dataset.frames || 0, e.querySelector('.stg-st').textContent]); if (r[0] > 0 || !/^step 1 of/.test(r[1])) problems.push(`reduced motion: ${id} moved by itself (${r})`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
