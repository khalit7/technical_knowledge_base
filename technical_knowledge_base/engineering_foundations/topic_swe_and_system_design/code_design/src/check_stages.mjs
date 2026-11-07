// The 2026-11-06 rollout checks for Code design: every 3D stage and 2D animation plays by itself once scrolled into view, steps to its last step
// (in every mode) with one step-list item per step, stops redrawing off screen and never moves under reduced motion; no errors, NaN, undefined or
// sideways scroll; the splits are two columns at 1400 px and one below 1100 px. Every measured value written into the step lists is checked
// against window.CD (the recordings, built by gen_data.py) and the scenes' own counts.
// usage (from the repo root): node technical_knowledge_base/engineering_foundations/topic_swe_and_system_design/code_design/src/check_stages.mjs [shots dir]
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
const STAGES = [['stg-hero', 'sx-hero'], ['stg-deep', 'sx-deep'], ['stg-dir', 'sx-dir'], ['stg-fcis', 'sx-fcis']];
// 2D animations (RD.anim): card, control prefix, mode chips (selector or null), modes, list id per mode
const ANIMS = [['wa-card', 'wa-ctl', null, [null], () => 'sx-wa'], ['rf-card', 'rf-ctl', '#rf-seg', ['steps', 'bang'], m => 'sx-rf-' + m]];
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
    const r = await p.evaluate(() => { const c = document.getElementById('t-read').cloneNode(true); c.querySelectorAll('pre,code,.code,.cv,.raw').forEach(x => x.remove());
      return { bad: (c.innerText.match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) } });
    if (r.bad.length) problems.push(`${tag} ${where}: ${r.bad.join(' | ')}`); if (r.side) problems.push(`${tag} ${where}: sideways scroll`); if (r.box) problems.push(`${tag} ${where}: error box ${r.box}`);
  };
  const cols = await p.$$eval('#t-read .s3sp', xs => xs.map(x => getComputedStyle(x).display));
  if (width === 1400 && (!cols.length || cols.some(c => c !== 'grid'))) problems.push(`${tag}: a split is not two columns (${cols})`);
  if (width < 1100 && cols.some(c => c === 'grid')) problems.push(`${tag}: a split is two columns below 1100 px`);
  // autoplay on view: a stage's data-frames rises; an RD.anim's play button reads Pause
  for (const [id] of STAGES) {
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(2400);
    if (!((await p.$eval('#' + id, e => +e.dataset.frames || 0)) > 0)) problems.push(`${tag}: ${id} did not play when scrolled into view`);
  }
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    if (!/Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`${tag}: ${card} did not play when scrolled into view`);
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s-rev').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // every stage to its last step; list length; screenshots at every step at 1400 and 390 (mid step named -mid-)
  for (const [id, lid] of STAGES) {
    await p.$eval(`#${id}-b`, e => e.click());
    await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
    const n = await p.$eval(`#${id}-r`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${id} has ${n} steps but list ${lid} shows ${lis}`);
    await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' }));
    for (let k = 0; k < n; k++) {
      if (k) await p.$eval(`#${id}-f`, e => e.click());
      if (width === 1400 || width === 390) { await wait(1900); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-s${k + 1}${k === Math.floor(n / 2) ? '-mid' : ''}-${scheme}-${width}.png` }) }
    }
    await wait(1800);
    const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ended on ${sh}`);
    await audit(`${id} last step`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
  }
  for (const [card, ctl, sel, modes, lidOf] of ANIMS) for (const m of modes) {
    if (sel) { await p.$eval(`${sel} [data-m="${m}"]`, e => e.click()); await wait(100); }
    const lid = lidOf(m), sfx = m == null ? '' : '-' + m;
    const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1), lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
    if (lis !== n) problems.push(`${tag}: ${card}${sfx} has ${n} steps but list ${lid} shows ${lis}`);
    for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    if (await p.$eval(`#${ctl}-s`, e => +e.value) !== n - 1) problems.push(`${tag}: ${card}${sfx} did not reach its last step from the list`);
    const cur = await p.$eval('#' + lid, e => [...e.children].findIndex(li => li.classList.contains('on')));
    if (cur !== n - 1) problems.push(`${tag}: ${card}${sfx} list does not mark the last step`);
    if (width === 1400 || width === 390) { await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(300); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}${sfx}-last-${scheme}-${width}.png` }) }
    await audit(`${card}${sfx} last step`);
  }
  if (width === 1400) { // the step lists' measured values are the page's data
    const r = await p.evaluate(() => { const out = [], li = (id, k) => document.getElementById(id).children[k].textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(([k, x]) => { if (!li(id, k).includes(String(x))) out.push(`${id} item ${k + 1} lacks "${x}"`) });
      const st = k => CD.steps.find(s => s.step === k), S0 = st(0), S7 = st(7), S10 = st(10), BG = st('bigbang'), H = CD_HERO.hidden;
      need('sx-hero', [[0, S0.handler_lines + ' lines, McCabe complexity ' + S0.cc_handler], [1, 'split into ' + CD_HERO.runs + ' separate runs'], [2, S10.handler_lines + ' lines, complexity ' + S10.cc_handler],
        [3, 'idempotency ' + H.idem], [3, 'rate limit ' + H.rate], [3, 'database ' + H.store], [3, 'auth ' + H.auth], [3, 'the model call ' + H.model]]);
      const D = Object.fromEntries(CD.depth.map(d => [d.name, d])), D9 = Object.fromEntries(CD.depth9.map(d => [d.name, d]));
      const hb = (n, w) => n + ' hides ' + D[n].body + ' lines behind ' + D[n].params + (w ? ' parameters' : '');
      need('sx-deep', [[1, hb('claim_key', 1)], [1, 'take_token ' + D.take_token.body + ' lines behind ' + D.take_token.params], [1, 'save_reply ' + D.save_reply.body + ' behind ' + D.save_reply.params],
        [3, 'release_key on ' + CD.release_calls['9'] + ' separate paths'], [4, 'idempotency_claim (' + D.idempotency_claim.params + ' parameters, ' + D.idempotency_claim.body + ' lines)'], [4, CD.release_calls['10'] + ' release calls and ' + D.send_message.body + ' lines']]);
      ['chat_exists', 'request_fingerprint', 'make_reply'].forEach(n => { if (D[n].body !== 1) out.push(n + ' no longer hides one line') });
      if (D9.release_key.params !== 2) out.push('release_key params changed');
      need('sx-dir', [[5, CD.llm.unit]]);
      const F = Object.fromEntries(CD.fcis.after.map(f => [f.name, f])), B = CD.fcis.before, NJ = CD_FCIS.refusal;
      const sumL = (...ns) => ns.reduce((s, n) => s + F[n].sloc, 0);
      need('sx-fcis', [[0, B.sloc + ' lines, McCabe complexity ' + B.cc], [1, 'render_transcript (' + F.render_transcript.sloc + ' lines)'], [1, 'parse_summary (' + F.parse_summary.sloc + ' lines)'], [1, 'summarize_chat (' + F.summarize_chat.sloc + ' lines)'],
        [1, 'SqliteChatStore (' + sumL('SqliteChatStore.__init__', 'SqliteChatStore.messages', 'SqliteChatStore.save_summary') + ' lines)'], [1, 'HttpChatModel (' + sumL('HttpChatModel.__init__', 'HttpChatModel.complete') + ' lines)'],
        [6, 'makes ' + NJ.before.calls + ' calls, sleeps ' + NJ.before.slept_s + ' s'], [6, 'makes ' + NJ.after.calls + ' call']]);
      if (NJ.before.result !== 'returns None' || NJ.after.result !== 'raises ModelOutputError') out.push('the refusal is not the one described');
      need('sx-rf-steps', [[0, S0.handler_lines + ' lines'], [0, 'complexity ' + S0.cc_handler], [1, S0.total + ' characterization tests'], [7, 'Complexity falls from ' + S0.cc_handler + ' to ' + S7.cc_handler + ' and the handler from ' + S0.handler_lines + ' to ' + S7.handler_lines + ' lines']]);
      for (let k = 1; k <= 7; k++) if (st(k).passed !== st(k).total) out.push('step ' + k + ' is not green');
      if (st(8).passed !== st(8).total - 1) out.push('step 8 does not have exactly one red test');
      need('sx-rf-bang', [[1, 'shrinks to ' + BG.handler_lines + ' lines with complexity ' + BG.cc_handler], [1, (BG.total - BG.passed) + ' of ' + BG.total + ' tests fail']]);
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
  for (const [card, ctl] of ANIMS) { const v0 = await p.$eval(`#${ctl}-s`, e => e.value);
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const v1 = await p.$eval(`#${ctl}-s`, e => e.value); if (v1 !== v0 || /Pause/.test(await p.$eval(`#${ctl}-p`, e => e.textContent))) problems.push(`reduced motion: ${card} moved by itself`) }
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200); const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`reduced motion: flows kept redrawing (${d0} -> ${d1})`);
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
