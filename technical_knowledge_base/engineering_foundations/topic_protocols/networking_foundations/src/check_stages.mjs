// The 2026-11-06 rollout checks for Networking foundations: the five 3D stages and the four 2D animations play by themselves once scrolled into view,
// step to their last step with one step-list item per step (in every mode), stop redrawing off screen and never move under reduced motion; the
// timeline widget never plays by itself and stays on its last event; no errors, NaN, undefined or sideways scroll; the splits are two columns at
// 1400 px and one below 1100 px. The numbers written into the step lists are checked against the page's own data and models (window.NF and the
// values the scenes compute from it: NF_LOSS, NF_PIPE, NF_QUEUE, NF_LIFE, NF_HERO; NFCC; NF.quic.ladder).
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_protocols/networking_foundations/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// [stage id, [mode button selector or null, list id]...]
const STAGES = [['stg-hero', [[null, 'sx-hero']]], ['stg-life', [[null, 'sx-life']]], ['stg-loss', [['#loss-mode [data-m=rto]', 'sx-loss-rto'], ['#loss-mode [data-m=fast]', 'sx-loss-fast']]],
  ['stg-pipe', [[null, 'sx-pipe']]], ['stg-queue', [[null, 'sx-queue']]]];
// [card, controller prefix, [mode selector or null, list id]...]
const ANIMS = [['rd-tr-card', 'rd-tr-ctl', [[null, 'sx-tr']]], ['rd-cc-card', 'rd-cc-ctl', [['#rd-cc-seg [data-m=reno]', 'sx-cc-reno'], ['#rd-cc-seg [data-m=cubic]', 'sx-cc-cubic'], ['#rd-cc-seg [data-m=both]', 'sx-cc-both']]],
  ['rd-nat-card', 'rd-nat-ctl', [['#rd-nat-seg [data-m=off]', 'sx-nat-off'], ['#rd-nat-seg [data-m=on]', 'sx-nat-on']]], ['rd-mig-card', 'rd-mig-ctl', [['#rd-mig-seg [data-m=quic]', 'sx-mig-quic'], ['#rd-mig-seg [data-m=tcp]', 'sx-mig-tcp']]]];
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
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: stages (data-frames rises), 2D animations (their play button reads Pause)
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (!/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  // the timeline widget never plays and stays on its last event
  { await p.$eval('#rd-tc-card', e => e.scrollIntoView({ block: 'center' })); await wait(1800);
    const [v, mx, lab] = await p.$eval('#tc-ctl-s', e => [e.value, e.max, document.getElementById('tc-ctl-p').textContent]);
    if (v !== mx || /Pause/.test(lab)) problems.push(`${tag}: the timeline widget moved by itself (${v} of ${mx}, ${lab})`); }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('rd-dbg').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage, in every mode, to its last step; list length; screenshots mid-way and at the end
  for (const [id, modes] of STAGES) for (const [sel, lid] of modes) {
    if (sel) { await p.$eval(sel, e => e.click()); await wait(200); }
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) {
      await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
      if (k === Math.floor(n / 2) && (width === 1400 || width === 390)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2600); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${lid}-mid-${scheme}-${width}.png` }) }
    }
    await wait(2600);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${lid} ended on ${sh}`);
    if (width === 1400) { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${lid}-last-${scheme}-${width}.png` }) }
    await audit(`${id} ${lid} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  }
  // the 2D animations: every mode to its last step, with its list
  for (const [card, ctl, modes] of ANIMS) for (const [sel, lid] of modes) {
    if (sel) { await p.$eval(sel, e => e.click()); await wait(100); }
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card} has ${n} steps but ${lid} shows ${lis}`);
    for (let k = 1; k < n; k++) { await p.$eval(`#${ctl}-f`, e => e.click()); await wait(30); }
    await wait(2800);
    if (+(await p.$eval(`#${ctl}-s`, e => e.value)) !== n - 1) problems.push(`${tag}: ${card} ${lid} did not reach its last step`);
    if (width === 1400 || width === 390) { const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${lid}-last-${scheme}-${width}.png` }) }
    await audit(`${card} ${lid}`);
  }
  if (width === 1400) { // the step lists' numbers are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const f = (v, d) => Number(v).toLocaleString('en-US', { minimumFractionDigits: d || 0, maximumFractionDigits: d || 0 }), ms = v => f(v, 1) + ' ms';
      const H = NF_HERO; need('sx-hero', [[0, H.TOK + ' bytes'], [1, H.TCPH], [2, H.TOK + ' + ' + H.TCPH + ' + ' + H.IPH + ' = ' + H.total + ' bytes'], [2, Math.round(100 * (H.TCPH + H.IPH) / H.total) + '%'], [5, f(H.MSS) + ' bytes'], [5, f(H.MTU) + '-byte'], [5, f(H.MTU - H.total) + ' bytes']]);
      const txt = document.getElementById('t-read').innerText; if (!txt.includes(f(NF_LIFE.cMin, 1) + ' to ' + f(NF_LIFE.cMax, 1) + ' ms')) out.push('section 3 lacks the measured connect() range');
      for (const m of ['rto', 'fast']) { const D = NF_LOSS[m], T = D.r.tok, id = 'sx-loss-' + m;
        need(id, [[0, ms(T[1].tw)], [0, ms(T[1].td)], [1, ms(T[2].tw)], [2, f(D.dup[0].t0, 1) + ' and ' + ms(D.r.pk.find(p => /data stop/.test(p.lab) && !p.retx).t1)],
          [4, ms(D.land)], [5, ms(D.extra[2])], [5, ms(D.extra[5])]]);
        need(id, [[3, ms(D.fire)]]);
        if (D.dup.length < 3) out.push(m + ': fewer than three duplicate ACKs');
        if (!T.slice(2, 7).every(t => Math.abs(t.td - D.land) < 1e-6)) out.push(m + ': tokens 2 to 5 do not reach the program together'); }
      need('sx-loss-rto', [[3, NF_LOSS.rto.r.R + 200 + ' ms'], [5, ms(NF_LOSS.rto.extra[2] - NF_LOSS.fast.extra[2])], [2, 'ACK ' + NF_LOSS.rto.dup[0].lab.match(/ACK (\d+)/)[1]]]);
      const PI = NF_PIPE, G = PI.G, rg = (a, d, u) => f(a[0], d) + ' to ' + f(a[1], d) + (u || '');
      need('sx-pipe', [[0, PI.rtt + ' ms'], [0, PI.link + ' Mbit/s'], [0, f(PI.bdp / 1000) + ' KB'], [1, rg(G[0].wnd, 0)], [1, rg(G[0].gp, 1)], [1, rg([Math.min(...G[0].pred), Math.max(...G[0].pred)], 1)],
        [2, f(G[1].wnd[1]) + '-byte'], [2, rg(G[1].gp, 1)], [2, rg([Math.min(...G[1].pred), Math.max(...G[1].pred)], 1)], [3, rg(G[2].gp, 1)], [3, rg(G[2].end, 0, ' ms')], [3, f(G[2].q / 1000) + ' KB'],
        [4, rg(G[3].wnd.map(v => v / 1e6), 1, ' MB')], [4, f(G[3].gpm, 1) + ' Mbit/s'], [4, rg(G[3].end, 0, ' ms')], [4, f(G[3].q / 1000) + ' KB']]);
      const Q = NF_QUEUE; if (Q.conn !== 7 || Q.n !== 8 || Q.served.join() !== '0,1' || Q.reset.join() !== '4' || Q.backlog !== 2) out.push('accept-queue recording differs from the step list');
      need('sx-queue', [[0, 'at most ' + Q.backlog], [2, 'client ' + Q.reset[0]]]);
      const ev = a => NFCC[a].ev, F = v => f(v);
      need('sx-cc-reno', [[0, F(ev('reno')[0].before)], [0, F(ev('reno')[0].after)], [3, F(ev('reno')[1].before) + ' halves to ' + F(ev('reno')[1].after)], [4, Math.round(100 * NFCC.reno.util) + '%']]);
      need('sx-cc-cubic', [[0, F(ev('cubic')[0].after)], [0, F(ev('cubic')[1].before) + ' to ' + F(ev('cubic')[1].after)], [1, 'K = ' + f(ev('cubic')[1].K, 1) + ' s'], [1, ev('cubic')[2].t + ' s'], [2, ev('cubic')[3].t + ' s'],
        [3, F(ev('cubic')[4].before) + ' to ' + F(ev('cubic')[4].after)], [4, Math.round(100 * NFCC.cubic.util) + '%'], [4, Math.round(100 * NFCC.reno.util) + '%']]);
      const pt = (a, t) => NFCC[a].pts.find(q => Math.abs(q[0] - t) < 1e-9)[1];
      need('sx-cc-reno', [[1, F(pt('reno', 10))], [2, F(pt('reno', 24))], [4, F(pt('reno', 60))]]);
      const L = NF.quic.ladder, p0 = L[0].port, p1 = L.find(e => e.frm === 'client' && e.port !== p0).port;
      need('sx-mig-quic', [[0, f(L[0].bytes) + ' bytes'], [1, f(L[1].bytes) + '-byte'], [2, L[3].bytes + ' bytes'], [2, L[4].bytes + ' bytes'], [3, p0 + ' becomes ' + p1], [4, L[8].bytes + '-byte'], [5, L[11].bytes + '-byte'], [5, L.length + ' datagrams']]);
      need('sx-mig-tcp', [[0, String(p0)], [2, p0 + ' becomes ' + p1]]);
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
  for (const [card, ctl] of ANIMS) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent)) || (await p.$eval(`#${ctl}-s`, e => e.value)) !== '0') problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
