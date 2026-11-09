// ---- Scene (section 8, Fig. 7): the same 48-token continuation written by the causal model (one slot per forward, left to right) and by the
// adapted diffusion LM at 12 steps (the recorded trace FOD.diff.trace['12']: which 4 slots each step committed, by confidence). Both read the
// 31-token prompt. Slots are 12 x 4, in reading order; flows stream from the prompt and the committed slots into the slots filled now.
// The last step is the cost in token positions processed, FOD.d (derived as section 8 says). ----
(function () {
  if (!document.getElementById('stg-diff') || !window.FOS) return;
  const { mix, cl } = S3, { la, lab, int } = FOS, D = FOD.diff, TR = D.trace['12'].steps, G = 48, NS = TR.length, PN = D.prompt_tokens;
  const F = [0, 3, 6, 12, 48], CS = .3, XA = -2.4, XB = 2.4, ZP = -1.55;
  const sx = (x0, p) => x0 + ((p % 12) - 5.5) * CS, sz = p => -.75 + Math.floor(p / 12) * CS;
  // the slot each diffusion step committed
  const STEP = new Array(G).fill(99); TR.forEach((s, i) => s.commit.forEach(p => { STEP[p] = i + 1; }));
  const fw = (k, e) => k === 0 ? 0 : F[k - 1] + (F[k] - F[k - 1]) * e;
  function grid(R, x0, done, now, P, fl) {
    for (let p = 0; p < G; p++) { const st = done(p), x = sx(x0, p), z = sz(p);
      if (st === 0) R.box([x, 0, z], [CS * .84, .015, CS * .84], { fill: P.soft, shadow: false, ea: .3, lw: .5 });
      else R.box([x, 0, z], [CS * .84, .16 * Math.min(1, st), CS * .84], { fill: now(p) ? mix(P.paper, P.c5, .8) : mix(P.paper, P.acc, .55), shadow: false, lw: .6 });
      if (fl && now(p)) R.flowArc([x, .05, ZP + .2], [x, .17, z], .35, { c: P.c5, a: .9, r: .045, n: 5, speed: 1.3 }); } }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.8, 4.8, -2.2, 1.6, .5);
    const f = fw(k, e), f0 = F[Math.max(0, k - 1)], arN = Math.min(G, Math.floor(f + 1e-6)), dfN = Math.min(NS, Math.floor(f + 1e-6));
    // the prompt, read by both
    R.box([0, 0, ZP], [8.4, .12, .3], { fill: mix(P.paper, P.mute, .25) });
    lab(R, [0, .12, ZP - .15], 'prompt · ' + PN + ' tokens, read by both', { fs: 12.5, b: 1, c: P.mute, dy: -16 });
    // causal: one slot per forward, left to right; diffusion: the 4 most confident slots per step, anywhere
    const arNow = p => k > 0 && p >= Math.floor(f0) && p < arN, dfNow = p => k > 0 && STEP[p] > f0 && STEP[p] <= dfN;
    grid(R, XA, p => p < arN ? 1 : 0, arNow, P, k > 0 && k < 4 || (k === 4 && e < 1));
    grid(R, XB, p => STEP[p] <= dfN ? 1 : 0, dfNow, P, k > 0 && k < 4);
    const cA = Math.min(G, arN), cD = TR.slice(0, dfN).reduce((s, x) => s + x.commit.length, 0);
    // two short lines per grid, so the two never meet on a phone
    lab(R, [XA, 0, sz(47) + .3], 'causal', { fs: 13, b: 1, c: P.ink, dy: 14 }); lab(R, [XB, 0, sz(47) + .3], 'diffusion, 12 steps', { fs: 13, b: 1, c: P.ink, dy: 14 });
    lab(R, [XA, 0, sz(47) + .3], Math.floor(f) + ' forwards · ' + cA + '/48', { fs: 12, c: P.mute, dy: 31 });
    lab(R, [XB, 0, sz(47) + .3], Math.min(NS, Math.floor(f)) + ' forwards · ' + cD + '/48', { fs: 12, c: P.mute, dy: 31 });
    // the cost: token positions each decoder processed (the causal model reads each new token once after its prefill; every diffusion step reads all)
    const ca = la(st, e, s => s === 4 ? 1 : 0);
    if (ca > .01) { lab(R, [XA, 0, sz(47) + .3], int(FOD.d.ar_positions) + ' positions processed', { fs: 12.5, b: 1, c: P.acc, dy: 48, a: ca });
      lab(R, [XB, 0, sz(47) + .3], int(FOD.d.diff_positions12) + ' positions processed', { fs: 12.5, b: 1, c: P.acc, dy: 48, a: ca }); }
  }
  S3.stage({ id: 'stg-diff', list: 'sx-diff', fig: 'Fig. 7 · 48 tokens, causal against diffusion at 12 steps', cam: [0, .82], bounds: [[-4.3, 0, -1.75], [4.3, .3, .2]], aspect: .48, dur: 2600, hold: 4400, draw,
    margin: w => w < 520 ? [30, 6, 62, 6] : [34, 14, 70, 14] });
})();
