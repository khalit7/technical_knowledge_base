// ---- Scene: Fig. 3, a property-based test finds and shrinks a bug (stg-prop). Every one of the 25 calls Hypothesis made to
// test_round_trip_loses_nothing (seed 6, experiments/hyp/trace_one.py, inputs/trace_6.json) lands on the input space: text length across,
// window size (log scale) in depth; green passed, red failed; repeated inputs stack. The red floor is where the buggy chunk() fails with overlap 0,
// computed by the port below for every cell (with the fixed code it is empty). In front, the current call's characters as cubes with its windows as glass
// plates over them: a red cube is a character the round trip lost. "Fixed code" replays the first 100 calls on the corrected chunk()
// (inputs/trace_6_fixed.json). The port is checked against every recorded call. ----
(function () {
  if (!document.getElementById('stg-prop') || !window.TQK || !window.TQ) return;
  const { mix } = S3, { lab, block, win, plate } = TQK;
  const H = window.TQ.hyp;
  // Python's chunk()/unchunk() on code points (as Python strings are), buggy and fixed
  const cps = s => Array.from(s);
  function starts(n, size, ov, fixed) { const step = size - ov, out = [];
    if (fixed) { if (n === 0) return out; for (let i = 0; i < Math.max(n - ov, 1); i += step) out.push(i) }
    else for (let i = 0; i < n - size + 1; i += step) out.push(i); return out }
  function run(text, size, ov, fixed) { const c = cps(text), st = starts(c.length, size, ov, fixed), ch = st.map(i => c.slice(i, i + size).join(''));
    const back = ch.length ? ch[0] + ch.slice(1).map(x => cps(x).slice(ov).join('')).join('') : '';
    const cov = new Array(c.length).fill(false); st.forEach(i => { for (let q = i; q < Math.min(i + size, c.length); q++) cov[q] = true });
    return { c, st, back, cov } }
  [[H.log, false], [H.fixed, true]].forEach(([log, fx]) => log.forEach((e, i) => { if (run(e.t, e.s, e.o, fx).back !== e.g && window.__jsErr) window.__jsErr('chunk port disagrees with recorded call ' + i) }));
  // the buggy run in seven explained stretches (first and last call of each, 0-based), the fixed run in two
  const BUG = [[0, 1], [2, 2], [3, 9], [10, 14], [15, 19], [20, 23], [24, 24]], FIX = [[0, -1], [0, 49], [50, 99]];
  const key = e => [e.n, e.s, e.o], less = (a, b) => { for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] < b[i]; return false };
  const best = []; { let bi = -1; H.log.forEach((e, i) => { if (e.f && (bi < 0 || less(key(e), key(H.log[bi])))) bi = i; best.push(bi) }) }
  const firstFail = H.log.findIndex(e => e.f), last = H.log[H.log.length - 1];
  TQN.prop = { calls: H.log.length, first: firstFail + 1, fails: H.log.filter(e => e.f).length, min: last.t + '|' + last.s + '|' + last.o, fixed: H.fixed.length, fixedFails: H.fixed.filter(e => e.f).length,
    stretches: BUG.map(([a, b]) => (a + 1) + '-' + (b + 1)), firstCall: H.log[firstFail] };
  let mode = 'bug';
  // the input space: x text length 0..14, z window size on a log scale (1 in front, 48 at the back)
  const NX = 13, X = n => -2.3 + n * .42, Z = s => 1.0 - Math.log2(s) * .48, CW = .38;
  const ROWS = [1, 2, 3, 4, 6, 8, 12, 16, 24, 32, 48];
  // the floor, computed by the port: does the round trip of an n-character text with this size and overlap 0 fail? (buggy: unless the windows fit exactly)
  const FLOOR = [false, true].map(fx => { const o = []; for (let n = 0; n <= NX; n++) o.push(ROWS.map(s => { const t = 'a'.repeat(n); return run(t, s, 0, fx).back !== t })); return o });
  TQN.prop.floorBad = FLOOR.map(F => F.flat().filter(x => x).length); TQN.prop.floorCells = (NX + 1) * ROWS.length;
  const GEN = [-3.6, 0, -1.5];
  function draw(R, k, e) {
    const P = R.P; R.grid(-5, 3.5, -2.5, 3.6, .5);
    const fx = mode === 'fix', log = fx ? H.fixed : H.log, S = fx ? FIX : BUG, [a0, a1] = S[k], cnt = a1 - a0 + 1;
    // how far into its stretch the step has played: calls appear one after another
    const shown = cnt <= 0 ? a0 - 1 : a0 - 1 + Math.min(cnt, Math.ceil(e * cnt));
    const upto = Math.max(shown, a0 - 1), cur = Math.max(0, Math.min(upto, log.length - 1));
    // the floor: red where the code fails (overlap 0), a pale tile where it passes
    const ta = fx && k === 0 ? 1 - e : fx ? 0 : 1;   // the buggy floor fades into the fixed one
    const zf = j => j === 0 ? Z(1) + .25 : (Z(ROWS[j - 1]) + Z(ROWS[j])) / 2, zb = j => j === ROWS.length - 1 ? Z(ROWS[j]) - .2 : (Z(ROWS[j]) + Z(ROWS[j + 1])) / 2;
    for (let n = 0; n <= NX; n++) ROWS.forEach((s, j) => {
      const z0 = zb(j) + .015, z1 = zf(j) - .015, x0 = X(n) - CW / 2, x1 = X(n) + CW / 2, bB = FLOOR[0][n][j], bF = FLOOR[1][n][j], t = fx ? (bF ? 1 : bB ? ta : 0) : (bB ? 1 : 0);
      R.quad([[x0, .005, z0], [x1, .005, z0], [x1, .005, z1], [x0, .005, z1]], { fill: mix(mix(P.card, P.good, .16), mix(P.card, P.bad, .4), t), a: 1, edge: false, dz: 50 });
    });
    [0, 5, 10].forEach(n => lab(R, [X(n), 0, Z(1) + .3], n ? String(n) : 'text length 0', { fs: 12, c: P.mute, dy: 10, ph: 1, al: n ? 'center' : 'right', dx: n ? 0 : 8 }));
    [1, 4, 16, 48].forEach(s => lab(R, [X(NX) + .25, 0, Z(s) + (s === 1 ? .25 : 0)], 'size ' + s, { al: 'left', dx: 6, fs: 12, c: P.mute, mono: 1 }));
    if (!fx || k === 0) lab(R, [X(9), 0, Z(32)], fx ? 'fixed: no failing inputs' : 'red floor: fails with overlap 0', { fs: 12, c: fx ? P.good : P.bad, b: 1, a: fx ? e : 1, ph: 1 });
    // the generator
    block(R, GEN, [.9, .55, .7], P.c4, 'Hypothesis', { ph: 1, amin: .7, dy: -11 });
    lab(R, [GEN[0], .55, GEN[2]], 'st.text(), chunk_args()', { mono: 1, fs: 12, c: P.mute, dy: -27 });
    // every call so far, stacked where its (length, size) repeats
    const seen = {};
    for (let i = 0; i <= upto && i < log.length; i++) {
      const c = log[i], kk = c.n + ',' + c.s, h = seen[kk] = (seen[kk] || 0) + 1, p = [X(Math.min(c.n, NX)), .1 + (h - 1) * .19, Z(c.s) - .0];
      const isNew = i >= a0 && i <= a1, isBest = !fx && best[upto] === i;
      R.ball(p, .085, { c: c.f ? P.bad : P.good, a: isNew || i === cur ? 1 : .55 });
      if (isBest) R.glow(p, .3, { c: P.acc, a: .9 });
    }
    // data flowing: the newest input travels from the generator to where it lands
    if (cnt > 0 && cur >= a0) { const c = log[cur]; R.flowArc([GEN[0] + .45, .5, GEN[2]], [X(Math.min(c.n, NX)), .15, Z(c.s)], 1.0, { c: c.f ? P.bad : P.good, r: .07, n: 12, speed: 1.6, a: .85 }) }
    // in front: the current call's characters, and its windows as glass plates over them
    if (cur >= 0 && (cnt > 0 || k > 0)) {
      const c = log[cur], r = run(c.t, c.s, c.o, fx), n = r.c.length, cw = .42, x0 = .3 - n * cw / 2, zf = 2.75;
      r.c.forEach((ch, i) => R.box([x0 + (i + .5) * cw, 0, zf], [cw * .86, .34, .36], { fill: r.cov[i] ? mix(P.paper, P.good, .55) : mix(P.paper, P.bad, .7), a: 1, lw: .6 }));
      if (!n) R.box([.3, 0, zf], [.5, .03, .3], { fill: P.soft, a: .8, shadow: false });
      r.st.forEach((st, j) => { const w = Math.min(c.s, n - st) * cw; R.glass([x0 + st * cw + .02, .38 + (j % 2) * .14, zf - .2], [w - .04, 0, 0], [0, .38, 0], { c: P.acc, a: .75, nu: Math.max(1, Math.min(c.s, n - st)), nv: 1, th: .02 }) });
      const verdict = (cur + 1) + ': ' + n + ' char' + (n === 1 ? '' : 's') + ', size ' + c.s + ', overlap ' + c.o + (c.f ? ', lost ' + r.cov.filter(x => !x).length : ', passes');
      lab(R, [.3, 0, zf + .2], 'call ' + verdict, { fs: 12.5, b: 1, mono: 1, c: c.f ? P.bad : P.good, dy: 16, ph: 1 });
      if (r.st.length === 0 && n > 0) lab(R, [.3, .36, zf], 'no windows', { fs: 12, c: P.bad, dy: -14, ph: 1 });
    }
  }
  const full = { cam: [.22, .78], bounds: [[-4.2, 0, -1.9], [3.6, .9, 3.15]] };
  const st = S3.stage({ id: 'stg-prop', list: 'sx-prop', fig: 'Fig. 3 · the recorded Hypothesis run, seed ' + H.seed, cam: full.cam, bounds: full.bounds, aspect: .64, dur: 3000, hold: 3800, draw,
    margin: w => w < 520 ? [16, 8, 14, 8] : [22, 18, 18, 18] });
  // the mode chips swap the step list (and the run it replays)
  const seg = document.getElementById('prop-mode');
  if (seg && st) seg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    mode = b.dataset.m; seg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    document.getElementById('sx-prop').hidden = mode !== 'bug'; document.getElementById('sx-prop-fix').hidden = mode !== 'fix';
    st.list(mode === 'bug' ? 'sx-prop' : 'sx-prop-fix') }));
})();
