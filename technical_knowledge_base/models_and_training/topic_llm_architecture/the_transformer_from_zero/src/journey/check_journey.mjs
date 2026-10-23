// node src/journey/check_journey.mjs <page index.html>   (run from the repo root; puppeteer from html_utils)
// Plays the Token's journey tab end to end at 390 px dark and 920 px light, driving the character with key presses
// (arrows, Space) and taps (tap-to-walk and tap-on-object), and asserts:
//  - window.TJD equals journey/out/journey.json plus the recorded runs, field by field;
//  - every number the game shows (backpack cells, messages, door labels) equals the extract, formatted as shown;
//  - nothing animates before the player acts (no animation frame pending, the drawing unchanged), in every room;
//  - the future doors stay locked (walking or tapping into them never passes, and they stay solid);
//  - under prefers-reduced-motion nothing tweens (a tap-walk lands at once);
//  - no page or console error, no visible #jsErr, no NaN / undefined / Infinity, no sideways scroll, text >= 11 px.
import { createRequire } from 'node:module'; import path from 'node:path'; import fs from 'node:fs';
const R = createRequire(path.resolve('html_utils/package.json')); const puppeteer = R('puppeteer');
const page = path.resolve(process.argv[2]); const SRC = path.join(path.dirname(page), 'src');
const J = JSON.parse(fs.readFileSync(path.join(SRC, 'journey/out/journey.json'), 'utf8'));
const run = n => JSON.parse(fs.readFileSync(path.join(SRC, 'train/out/runs', n + '.json'), 'utf8'));
const ABL = { base: 'tz_base', nopos: 'tz_nopos', noresid: 'tz_noresid', nonorm: 'tz_nonorm', noffn: 'tz_noffn', noattn: 'tz_noattn', onehead: 'tz_1head' };
const f3 = x => (+x).toFixed(3), pct = w => (100 * w).toFixed(1) + '%';
const sleep = ms => new Promise(r => setTimeout(r, ms));
let fails = 0; const fail = m => { fails++; console.log('  FAIL', m) };
const b = await puppeteer.launch({ headless: 'shell', executablePath: process.env.CHROME_PATH || undefined });

async function open(scheme, width, rm) {
  const p = await b.newPage(); const errs = [];
  p.on('pageerror', e => errs.push(e.message)); p.on('console', m => m.type() === 'error' && errs.push(m.text()));
  await p.setViewport({ width, height: 900 });
  await p.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: scheme }, { name: 'prefers-reduced-motion', value: rm ? 'reduce' : 'no-preference' }]);
  await p.goto('file://' + page); await p.evaluate(() => { try { localStorage.clear() } catch (e) {} }); await p.reload();
  await p.click('button[data-t=t-journey]'); await sleep(250);
  return { p, errs };
}
async function idle(p) { for (let i = 0; i < 160; i++) { if (!await p.evaluate(() => TJ.busy())) return; await sleep(40) } fail('still busy after 6 s') }
async function box(p) { return p.evaluate(() => { const r = document.querySelector('#tj-stage svg').getBoundingClientRect(); return { x: r.left, y: r.top } }) }
async function obj(p, id) { return p.evaluate(id => TJ.objs().find(o => o.id === id) || null, id) }
async function tap(p, id, at) {      // tap an object (the character walks there and uses it) or a point near it
  const o = await obj(p, id); if (!o) { fail('no object ' + id); return }
  const r = await box(p); const x = at ? at[0] : o.x + o.w / 2, y = at ? at[1] : o.y + o.h / 2;
  await p.mouse.click(r.x + x, r.y + y); await sleep(60); await idle(p); await sleep(60);
}
async function key(p, k, ms) { await p.focus('#tj-stage'); await p.keyboard.down(k); await sleep(ms); await p.keyboard.up(k); await sleep(60); await idle(p) }
async function press(p, k) { await p.focus('#tj-stage'); await p.keyboard.press(k); await sleep(60); await idle(p) }
const st = p => p.evaluate(() => TJ.state());
const msg = p => p.evaluate(() => document.getElementById('tj-msg').textContent + ' || ' + document.getElementById('tj-ev').textContent);
async function has(p, what, ...parts) { const m = await msg(p); for (const s of parts) if (!m.includes(s)) fail(`${what}: expected "${s}" in "${m}"`) }
async function cells(p, sel) { return p.$$eval(sel + ' span', ss => ss.map(s => s.dataset.v === undefined ? null : +s.dataset.v)) }
async function bag(p, what, want, sel = '#tj-bag') {
  const got = await cells(p, sel); if (JSON.stringify(got) !== JSON.stringify(want)) fail(`${what}: cells ${JSON.stringify(got)} != ${JSON.stringify(want)}`);
  const txt = await p.$$eval(sel + ' span', ss => ss.map(s => s.textContent));
  if (JSON.stringify(txt) !== JSON.stringify(want.map(v => v.toFixed(4)))) fail(`${what}: shown ${txt} != extract`);
}
async function still(p, what) {      // nothing animates before the player acts
  if (await p.evaluate(() => TJ.busy())) fail(what + ': an animation frame is pending before any input');
  const a = await p.$eval('#tj-stage', e => e.innerHTML); await sleep(700); const c = await p.$eval('#tj-stage', e => e.innerHTML);
  if (a !== c) fail(what + ': the room changed without input');
}
async function room(p, i) { await p.evaluate(i => document.querySelectorAll('#tj-map button')[i].click(), i); await sleep(150); await still(p, 'room ' + (i + 1)) }
function probs(T) { const l = J.top.map(t => t.logit / T), m = Math.max(...l), e = l.map(v => Math.exp(v - m)), s = e.reduce((a, b) => a + b, 0); return e.map(v => v / s) }

async function play(scheme, width) {
  const { p, errs } = await open(scheme, width, false);
  // the data part equals the recorded files
  const TJD = await p.evaluate(() => window.TJD);
  for (const k of Object.keys(J)) if (JSON.stringify(TJD[k]) !== JSON.stringify(J[k])) fail('TJD.' + k + ' differs from journey.json');
  for (const [k, n] of Object.entries(ABL)) { const r = run(n); if (TJD.abl[k].val !== r.final_val || TJD.abl[k].greedy !== r.samples[0].greedy.slice(0, 60)) fail('TJD.abl.' + k) }
  await still(p, 'tab opened');
  await p.click('#tj-num'); await sleep(50);
  const hd = J.heads[J.main_head], q = s => '"' + s + '"';
  // ---- room 1: walk next to the shelf (tap the floor), press Space; the wrong row first
  let r0 = await obj(p, 'row' + (J.tid - 1)); await tap(p, 'row' + (J.tid - 1), [r0.ax, r0.ay]); await press(p, 'Space');
  await has(p, 'wrong row', 'Row ' + (J.tid - 1), String(J.tid)); if ((await st(p)).bag !== 'empty') fail('wrong row filled the bag');
  r0 = await obj(p, 'row' + J.tid); await tap(p, 'row' + J.tid, [r0.ax, r0.ay]); await press(p, 'Enter'); await idle(p);
  await bag(p, 'lookup', J.tok);
  await tap(p, 'stamp'); await bag(p, 'stamp', J.x0); await has(p, 'stamp', f3(J.rms.tok), f3(J.rms.x0));
  await tap(p, 'twin'); await has(p, 'twin', J.twin.cos.toFixed(3), J.twin.tok_diff.toFixed(1), f3(run('tz_nopos').final_val), f3(run('tz_base').final_val));
  await tap(p, 'door'); if ((await st(p)).room !== 1) fail('walking into the open door did not enter the hall');
  await still(p, 'hall entered');
  // ---- room 2: walk right with the arrow key through the norm gate
  await key(p, 'ArrowRight', 450); let s = await st(p);
  if (!s.flags[1] || !s.flags[1].gate) fail('arrow key did not carry the player through the norm gate'); else {
    await has(p, 'norm gate', f3(J.rms.x0), f3(J.rms.n1), f3(run('tz_nonorm').final_val)); await bag(p, 'norm copy', J.n1, '#tj-sat'); await bag(p, 'backpack unchanged', J.x0) }
  // the future stays locked: tap it, then push into it with the keys
  const fut = await obj(p, 'fut0'); await tap(p, 'fut0'); await has(p, 'future door', 'Locked', q(J.pieces[J.P + 1].trim()), 'minus infinity');
  for (const k of ['ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowDown']) { await key(p, k, 250); s = await st(p);
    if (s.x > fut.x - 9 + 0.5 && s.x < fut.x + fut.w + 9 - 0.5 && s.y > fut.y - 9 + 0.5 && s.y < fut.y + fut.h + 9 - 0.5) fail('player entered a future door') }
  const lovedJ = J.pieces.lastIndexOf(' loved', J.P);
  await tap(p, 't' + lovedJ); await has(p, 'guess', 'Your guess', hd.score[lovedJ].toFixed(2));
  await tap(p, 'lever'); const best = hd.w.indexOf(Math.max(...hd.w));
  await has(p, 'softmax', pct(hd.w[best]), q(J.pieces[best]), pct(hd.w[J.P])); await bag(p, 'head output', hd.y8, '#tj-sat');
  await tap(p, 'heads');
  for (let h = 0; h < J.H; h++) { const w = J.heads[h].w, j = w.indexOf(Math.max(...w)); await has(p, 'head ' + (h + 1), 'h' + (h + 1) + ' ' + q(J.pieces[j].trim() || J.pieces[j]) + ' ' + pct(w[j])) }
  await tap(p, 'heads'); await bag(p, 'merge', J.a, '#tj-sat'); await has(p, 'merge', f3(run('tz_1head').final_val), f3(run('tz_noattn').final_val));
  if (!(await obj(p, 'fut0')).solid) fail('future door not solid after the hall');
  // ---- room 3: replace, then add
  await room(p, 2); await tap(p, 'rep'); await has(p, 'replace', J.cos_rep.toFixed(3), f3(run('tz_noresid').final_val), run('tz_noresid').samples[0].greedy.slice(0, 24));
  await tap(p, 'add'); await bag(p, 'add', J.x1); await has(p, 'add', J.cos_add.toFixed(3), f3(J.rms.x0), f3(J.rms.x1));
  // ---- room 4: the workshop
  await room(p, 3); await tap(p, 'm0'); s = await st(p); if (!s.flags[3].alone || !s.flags[3].gate) fail('workshop door or norm gate not passed');
  await has(p, 'up', pct(J.ffn.neg_share)); await tap(p, 'm1'); await has(p, 'gelu', pct(J.ffn.small_post));
  await tap(p, 'm2'); await bag(p, 'ffn add', J.x2); await has(p, 'ffn', f3(J.rms.x1), f3(J.rms.x2), f3(run('tz_noffn').final_val));
  // ---- room 5: walk through five blocks with the arrow key
  await room(p, 4); for (let i = 0; i < 40 && (await st(p)).flags[4]?.b !== J.L; i++) await key(p, 'ArrowRight', 200);
  s = await st(p); if (s.flags[4]?.b !== J.L) fail('did not walk through all blocks'); await bag(p, 'block 6', J.layers[J.L].x8); await has(p, 'block 6', f3(J.layers[J.L].rms));
  // ---- room 6: the exit hall
  await room(p, 5); await key(p, 'ArrowRight', 350); await has(p, 'final norm', f3(J.layers[J.L].rms), f3(J.rms.hf)); await bag(p, 'final norm', J.hf);
  await tap(p, 'table'); await has(p, 'table', pct(J.next_true_p), 'rank ' + J.next_true_rank);
  async function doorLabels(T) { const P = probs(T), want = P.slice(0, 6).map((v, i) => q(J.top[i].t.trim()) + ' ' + pct(v)).concat([(J.top.length - 6) + ' more ' + pct(P.slice(6).reduce((a, b) => a + b, 0))]);
    const got = await p.$$eval('#tj-stage svg text', ts => ts.map(t => t.textContent)); for (const w of want) if (!got.includes(w)) fail(`door label "${w}" missing at T ${T}`) }
  await doorLabels(1); await tap(p, 'dial'); await doorLabels(1.5); await tap(p, 'dial'); await doorLabels(0.5); await tap(p, 'dial'); await doorLabels(1);
  await tap(p, 'x0'); await has(p, 'pick', q(J.top[0].t), 'id ' + J.top[0].id, pct(probs(1)[0]));
  if (await p.$eval('#tj-end', e => e.hidden)) fail('end card not shown');
  // ---- the next token: back at the lookup desk
  await p.click('#tj-next'); await sleep(150); await still(p, 'next token');
  const nr = await obj(p, 'row' + J.top[0].id); if (!nr) fail('next token row missing'); else { await tap(p, 'row' + J.top[0].id); await bag(p, 'next lookup', J.top[0].row) }
  await tap(p, 'stamp'); await bag(p, 'next stamp', J.top[0].row.map((v, i) => v + J.pos_next[i]));
  // ---- the page itself
  const txt = await p.$eval('#t-journey', e => e.innerText); const m = txt.match(/\bNaN\b|\bundefined\b|\bInfinity\b/); if (m) fail('found ' + m[0]);
  if (await p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1)) fail('sideways scroll');
  const small = await p.$$eval('#t-journey text, #t-journey p, #t-journey button, #t-journey span, #t-journey label', es => es.filter(e => e.getClientRects().length && e.textContent.trim() && parseFloat(getComputedStyle(e).fontSize) < 11).map(e => e.textContent.slice(0, 20)));
  if (small.length) fail('text under 11 px: ' + small.slice(0, 5).join(' | '));
  const jsErr = await p.$eval('#jsErr', d => d.hidden ? '' : d.textContent); if (jsErr) fail(jsErr);
  for (const e of errs) fail(e);
  await p.close();
}
async function reduced() {
  const { p, errs } = await open('light', 920, true);
  await still(p, 'reduced motion: tab opened');
  const r0 = await obj(p, 'row' + J.tid); const r = await box(p); await p.mouse.click(r.x + r0.x + r0.w / 2, r.y + r0.y + r0.h / 2);
  if (await p.evaluate(() => TJ.busy())) fail('reduced motion: tap-walk tweened');
  const s = await st(p); if (!s.flags[0].row) fail('reduced motion: tap-walk did not arrive and act at once');
  await key(p, 'ArrowUp', 50); if (await p.evaluate(() => TJ.busy())) fail('reduced motion: a key press tweened');
  for (const e of errs) fail(e); await p.close();
}
for (const [scheme, width] of [['dark', 390], ['light', 920]]) { const f0 = fails; await play(scheme, width); console.log(scheme, width, fails === f0 ? 'clean' : 'FAILED') }
{ const f0 = fails; await reduced(); console.log('reduced motion', fails === f0 ? 'clean' : 'FAILED') }
await b.close();
process.exit(fails ? 1 : 0);
