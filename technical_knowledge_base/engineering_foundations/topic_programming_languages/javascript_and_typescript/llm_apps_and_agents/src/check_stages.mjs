// The 2026-11-06 rollout checks for "TypeScript: LLM apps and agents": both 3D stages and the cancellation animation play by themselves once
// scrolled into view, step to their last step in every mode, have one step-list item per step and never move under reduced motion; the stream
// inspector is a widget that never plays by itself; no errors, NaN, undefined or sideways scroll; splits are two columns at 1400 px.
// The numbers written in the step lists are checked against the page's own data (window.TL: the recorded frames, agent runs and cancellation runs).
// usage (from the repo root or src/): node src/check_stages.mjs [shots dir]   (needs html_utils' node_modules)
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(path.resolve(here, '../../../../../../html_utils/package.json'));
const puppeteer = require('puppeteer');
const file = 'file://' + path.resolve(here, '../index.html'), shots = process.argv[2] || path.resolve(here, '../.shots');
fs.mkdirSync(shots, { recursive: true });
// [stage, mode chips, {mode: step list}]
const STAGES = [['stg-stream', 'tl-st-mode', { anthropic: 'sx-st-anthropic', openai: 'sx-st-openai', tool: 'sx-st-tool' }],
  ['stg-loop', 'tl-lp-mode', { happy: 'sx-lp-happy', typo: 'sx-lp-typo', timeout: 'sx-lp-timeout', runaway: 'sx-lp-runaway' }]];
// [card, controls, {mode: step list}, mode buttons]
const ANIMS = [['tl-cx-card', 'tl-cx-ctl', { with: 'sx-cx-with', without: 'sx-cx-without' }, 'tl-cx-mode']];
const WIDGETS = [['tl-sx-card', 'tl-sx-ctl']];
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
    const r = await p.evaluate(() => ({ bad: (document.getElementById('t-read').innerText.replace(/received undefined/g, '').match(/.{0,30}\b(NaN|undefined|Infinity)\b.{0,30}/g) || []), side: document.documentElement.scrollWidth > innerWidth, box: (b => b && !b.hidden ? b.textContent : '')(document.getElementById('jsErr')) }));
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
  for (const [card, ctl] of ANIMS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(1500);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (!/Pause/.test(t)) problems.push(`${tag}: ${card} did not play when scrolled into view (${t})`);
  }
  // widgets never play by themselves
  for (const [card, ctl] of WIDGETS) {
    await p.$eval('#' + card, e => e.scrollIntoView({ block: 'center' })); await wait(2000);
    const t = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(t)) problems.push(`${tag}: widget ${card} played by itself`);
    const s = await p.$eval(`#${ctl}-s`, e => +e.value); if (s === 0) problems.push(`${tag}: widget ${card} opens on frame 1, not on the first text piece`);
    // every frame of every mode
    for (const m of ['anthropic', 'openai', 'tool']) {
      await p.$eval(`#tl-sx-mode button[data-m="${m}"]`, e => e.click()); await wait(60);
      await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 0; e.dispatchEvent(new Event('input')) }, ctl);
      const n = await p.$eval(`#${ctl}-s`, e => +e.max + 1);
      for (let k = 1; k < n; k++) await p.$eval(`#${ctl}-f`, e => e.click());
      await audit(`widget ${m}`);
      if (m === 'tool') { await p.evaluate(ctl => { const e = document.getElementById(ctl + '-s'); e.value = 13; e.dispatchEvent(new Event('input')) }, ctl); const el = await p.$('#' + card); await el.screenshot({ path: `${shots}/x-${card}-${scheme}-${width}.png` }) }
    }
  }
  // flows stop off screen: draws do not rise while every stage is out of view
  await p.evaluate(() => window.scrollTo(0, document.getElementById('s10').getBoundingClientRect().top + scrollY)); await wait(800);
  const d0 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0)); await wait(1200);
  const d1 = await p.$$eval('.stg', xs => xs.map(x => +x.dataset.draws || 0));
  if (d1.some((v, i) => v !== d0[i])) problems.push(`${tag}: a stage redrew while off screen (${d0} -> ${d1})`);
  // step every stage to its last step in every mode; list length; screenshot mid-way
  for (const [id, chips, lists] of STAGES) {
    for (const [m, lid] of Object.entries(lists)) {
      await p.$eval(`#${chips} button[data-m="${m}"]`, e => e.click()); await wait(100);
      await p.$eval(`#${id}-b`, e => e.click());
      await p.evaluate(id => { const e = document.getElementById(id + '-r'); e.value = 0; e.dispatchEvent(new Event('input')) }, id);
      const n = await p.$eval(`#${id}-r`, e => +e.max + 1);
      const lis = await p.$eval('#' + lid, e => e.hidden ? -1 : e.children.length);
      if (lis !== n) problems.push(`${tag}: ${id} ${m} has ${n} steps but list ${lid} shows ${lis}`);
      for (let k = 1; k < n; k++) {
        await p.$eval(`#${id}-f`, e => e.click()); await wait(80);
        if (k === Math.floor(n / 2)) { await p.$eval('#' + id, e => e.scrollIntoView({ block: 'center' })); await wait(3000); const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m}-${scheme}-${width}.png` }) }
      }
      await wait(3000);
      const sh = await p.$eval(`#${id} .stg-st`, e => e.textContent); if (sh !== `step ${n} of ${n}`) problems.push(`${tag}: ${id} ${m} ended on ${sh}`);
      if (width === 1400 && scheme === 'light') { const el = await p.$('#' + id); await el.screenshot({ path: `${shots}/x-${id}-${m}-last-${scheme}-${width}.png` }) }
      await audit(`${id} ${m} last step`);
      for (let k = 0; k < n; k++) await p.evaluate((lid, k) => document.getElementById(lid).children[k].click(), lid, k);
    }
  }
  for (const [card, ctl, lists, seg] of ANIMS) {
    for (const [m, lid] of Object.entries(lists)) {
      await p.$eval(`#${seg} button[data-m="${m}"]`, e => e.click()); await wait(100);
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
  if (width === 1400) { // the numbers in the step lists and the stream paragraph are the page's own data
    const r = await p.evaluate(() => { const out = [], D = TL, f = n => n.toLocaleString('en-GB');
      const txt = id => document.getElementById(id).textContent.replace(/\s+/g, ' ');
      const need = (id, xs) => xs.forEach(x => { if (!txt(id).includes(String(x))) out.push(id + ' lacks "' + x + '"') });
      // stream: step counts from the grouping, sizes and counts from the frames
      for (const m of ['anthropic', 'openai', 'tool']) { const n = TL_STREAM_GROUPS(m).length, l = document.getElementById('sx-st-' + m).children.length; if (n !== l) out.push(`sx-st-${m}: ${l} items, ${n} groups`) }
      const S = D.stream, len = fr => fr.raw.length, isT = fr => (fr.ev === 'content_block_delta' && fr.data.delta.type === 'text_delta') || fr.ev === 'response.output_text.delta';
      for (const m of ['anthropic', 'openai', 'tool']) if (S[m].some(fr => /[^\x00-\x7f]/.test(fr.raw))) out.push(m + ' frames are not ASCII: characters are not bytes');
      const tot = m => S[m].reduce((s, fr) => s + len(fr) + 2, 0), mm = m => { const t = S[m].filter(isT).map(len); return Math.min(...t) + ' to ' + Math.max(...t) + ' bytes' };
      need('s3', [f(tot('anthropic')) + ' bytes as Anthropic', f(tot('openai')) + ' as OpenAI']);
      const A = S.anthropic, ms = A.find(fr => fr.ev === 'message_start'), md = A.find(fr => fr.ev === 'message_delta');
      if (Math.max(...A.map(len)) !== len(ms)) out.push('message_start is not the largest Anthropic frame');
      need('sx-st-anthropic', [len(ms) + ' bytes', '(' + ms.data.message.usage.input_tokens + ')', A.filter(fr => fr.ev !== 'ping').length + ' events where the wire carried ' + A.length + ' frames',
        A.filter(isT).length + ' text_delta', mm('anthropic'), '"' + md.data.delta.stop_reason + '"', '(' + md.data.usage.output_tokens + ')']);
      const O = S.openai, oc = O.find(fr => fr.ev === 'response.completed');
      if (Math.max(...O.map(len)) !== len(oc)) out.push('response.completed is not the largest OpenAI frame');
      need('sx-st-openai', ['The same ' + O.filter(isT).length + ' pieces', mm('openai'), '(' + len(oc) + ' bytes)']);
      const T = S.tool, tj = T.filter(fr => fr.ev === 'content_block_delta' && fr.data.delta.type === 'input_json_delta').map(fr => fr.data.delta.partial_json), tmd = T.find(fr => fr.ev === 'message_delta');
      const pre = T.filter(isT).map(fr => fr.data.delta.text).join('');
      need('sx-st-tool', ['input_tokens ' + T[0].data.message.usage.input_tokens + ')', ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight'][T.filter(isT).length] + ' text_delta', pre, ...tj, '"' + tmd.data.delta.stop_reason + '"', '(output tokens ' + tmd.data.usage.output_tokens + ')',
        T.find(fr => fr.ev === 'content_block_start' && fr.data.content_block.type === 'tool_use').data.content_block.name]);
      // the loop: one item per model call, each step's numbers from the run
      const run = s => D.agent.runs.find(r => r.scenario === s);
      for (const s of ['happy', 'typo', 'timeout', 'runaway']) { const r = run(s), l = document.getElementById('sx-lp-' + s); if (l.children.length !== r.steps.length) out.push(`sx-lp-${s}: ${l.children.length} items, ${r.steps.length} calls`) }
      let r = run('happy'); need('sx-lp-happy', [r.steps[0].usage.in + ' input tokens', '(' + r.steps[0].results[0].ms + ' ms)', r.steps[1].results.map(x => x.ms)[0] + ' ms each', r.steps[1].wall + ' ms for the step', r.steps[2].sent + ' messages',
        f(r.tot.in) + ' tokens in and ' + r.tot.out + ' out', 'US$' + r.tot.usd.toFixed(5), (r.steps[2].sent + 1) + ' messages']);
      if (new Set(r.steps[1].results.map(x => x.ms)).size !== 1) out.push('happy step 2: the two lookups did not take the same time');
      r = run('typo'); need('sx-lp-typo', [r.steps[0].results[0].content, 'runs in ' + r.steps[1].results[0].ms + ' ms', f(r.tot.in) + ' tokens in, ' + r.tot.out + ' out', r.steps[1].content.find(c => c.type === 'text').text]);
      r = run('timeout'); const to = r.steps[1].results;
      need('sx-lp-timeout', ['(' + r.steps[0].results[0].ms + ' ms)', to[0].content, 'at ' + to[0].ms + ' ms', r.steps[1].wall + ' ms, not ' + f(to.reduce((s, x) => s + x.ms, 0)), r.answer.split('. ').pop()]);
      if (!to.every(x => x.is_error && x.ms === to[0].ms)) out.push('timeout step 2: lookups differ');
      r = run('runaway'); r.steps.forEach((s, i) => need('sx-lp-runaway', [s.usage.in + ' tokens in', 'top: ' + (i + 1)]));
      r.steps.slice(1).forEach(s => need('sx-lp-runaway', [s.sent + ' messages sent']));
      need('sx-lp-runaway', [r.outcome, f(r.tot.in) + ' tokens in, ' + r.tot.out + ' out', 'US$' + r.tot.usd.toFixed(5), (r.steps[r.steps.length - 1].sent + 2) + ' messages']);
      // cancellation: the times and counts of h1_serve.ts
      const C = D.cancel, ev = (m, re) => { const e = C[m].events, t0 = e.find(x => /closing/.test(x.text)).ms; return e.find(x => re.test(x.text)).ms - t0 };
      need('sx-cx-with', ['(+' + ev('with', /went away/) + ' ms)', '(+' + ev('with', /aborted/) + ' ms)', 'after ' + C.with.sent + ' of ' + C.with.total + ' events']);
      need('sx-cx-without', ['(+' + ev('without', /went away/) + ' ms)', 'All ' + C.without.total + ' events (+' + f(ev('without', /upstream finished/)) + ' ms)']);
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
    const r = await p.$eval(`#${ctl}-p`, e => e.textContent); if (/Pause/.test(r)) problems.push(`reduced motion: ${card} moved by itself`) }
  await p.close();
}
await b.close();
console.log('problems', problems.length); problems.forEach(x => console.log(' -', x));
process.exit(problems.length ? 1 : 0);
