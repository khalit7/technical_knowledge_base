// ---- Scene (section 2, Fig. 3): the median token's stream norm after the embedding and after each of the 12 sub-layers, for the four placements,
// one row each, at initialisation and after training. Every height is a recorded number (window.NSD.resid: a CPU forward of the running sequence
// through the recorded checkpoints, src/analysis/inspect_runs.py). Heights are on a log scale; the dashed line is norm 16, RMS 1 over 256 channels.
// Flat init (pre-norm without the 1/sqrt(2L) shrink) is drawn as outlines in step 2. ----
(function () {
  if (!document.getElementById('stg-rs') || !window.NSK || !window.NSD) return;
  const { mix } = S3, { tw, la, lab, fmt, frame } = NSK, M = NSD.resid.models, N = NSD.resid.points.length;
  const ROWS = [{ id: 'post', z: 2.0, name: 'post-norm', c: 'c2', from: 0 }, { id: 'pre', z: .67, name: 'pre-norm', c: 'c1', from: 1 },
    { id: 'sandwich', z: -.67, name: 'sandwich', c: 'c3', from: 2 }, { id: 'output', z: -2.0, name: 'output norm', c: 'c4', from: 2 }];
  const DXp = .62, X = j => (j - (N - 1) / 2) * DXp, H = v => Math.max(.03, (Math.log10(v) + .5) * .95), BW = .36;
  const trained = (r, q) => q >= 4 || (q === 3 && r.id === 'pre');
  const val = (r, q, j) => M[r.id][trained(r, q) ? 'trained' : 'init'].median_norm[j];
  // the end-of-row label: the value, plus what it is on the step that explains it
  const note = (r, q) => q === 0 && r.id === 'post' ? ' = √256: RMS 1' : q === 2 && r.id === 'sandwich' ? ' (16 √12 = 55.4)' : '';
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.6, 4.8, -2.6, 2.8, .5);
    ROWS.forEach(r => {
      const C = P[r.c], on = q => q >= r.from ? 1 : 0, foc = q => q === r.from || (q === 3 && r.id === 'pre') || q === 4 ? 1 : q === 3 ? .14 : .28;
      const a = tw(st, e, foc), shown = tw(st, e, on);
      // the row's floor strip and its empty slots, so the layout is there from the first step
      R.box([0, 0, r.z], [(N - 1) * DXp + .6, .02, .6], { fill: mix(P.paper, C, .12), a: .7, shadow: false });
      for (let j = 0; j < N; j++) {
        const first = k === r.from && st.pk < r.from, vis = j === 0 ? 1 : shown * (first && e < 1 ? (j <= e * (N - 1) + .5 ? 1 : 0) : 1);
        if (vis < .01) { frame(R, [X(j), 0, r.z], [BW, .08, BW], { c: P.mute, w: 1, a: .45, dash: [3, 3] }); continue; }
        const h = H(e >= 1 ? val(r, k, j) : S3.lerp(val(r, st.pk, j), val(r, k, j), e));
        R.box([X(j), 0, r.z], [BW, h, BW], { fill: mix(P.paper, C, .58), a: j === 0 && !shown ? Math.max(a, .8) : a * vis, shadow: false, lw: .7 });
      }
      if (shown > .5 && a > .9) R.flow([[X(0), .05, r.z + .3], [X(N - 1), .05, r.z + .3]], { c: C, a: a * .8, r: .045, n: 10, speed: 1.2 });
      lab(R, [X(0) - .3, .05, r.z], r.name, { fs: 12.5, b: 1, c: C, al: 'right', dx: -6, a: Math.max(.4, a), grp: 'rows' });
      const end = val(r, k, N - 1), endA = la(st, e, q => (q >= r.from && foc(q) === 1) ? 1 : 0);
      lab(R, [X(N - 1) + .2, H(end), r.z], fmt(end) + note(r, k), { fs: 12.5, b: 1, c: C, al: 'left', dx: 6, a: endA, grp: 'ends' });
    });
    // norm 16 = RMS 1, where post-norm pins the stream; 16 sqrt(12) = 55.4, what 12 unit-RMS branches sum to
    const l16 = la(st, e, q => q === 0 ? 1 : 0), y16 = H(16);
    if (l16 > .01) R.line([[X(0) - .2, y16, ROWS[0].z], [X(N - 1) + .2, y16, ROWS[0].z]], { c: P.c2, w: 1.4, dash: [5, 4], a: l16, top: 1 });
    const l55 = la(st, e, q => q === 2 ? 1 : 0);
    if (l55 > .01) { const y = H(55.4); [ROWS[2], ROWS[3]].forEach(r => R.line([[X(0) - .2, y, r.z], [X(N - 1) + .2, y, r.z]], { c: P.c3, w: 1.3, dash: [5, 4], a: l55, top: 1 })); }
    // the starting point, on every row (step 1)
    lab(R, [X(0), H(M.post.init.median_norm[0]), ROWS[3].z], 'all start at ' + fmt(M.post.init.median_norm[0]), { fs: 12, b: 1, c: P.ink, al: 'left', dx: 12, dy: -10, a: la(st, e, q => q === 0 ? 1 : 0) });
    // flat init (step 2): outlines at the flat-init norms in the pre-norm row
    const fl = la(st, e, q => q === 1 ? 1 : 0);
    if (fl > .01) { const F = M.pre_flat.init.median_norm; for (let j = 1; j < N; j++) frame(R, [X(j), 0, ROWS[1].z], [BW + .06, H(F[j]), BW + .06], { c: P.c1, w: 1.1, a: fl * .9, dash: [3, 3] });
      lab(R, [X(N - 1) + .2, H(F[N - 1]), ROWS[1].z], 'flat init ' + fmt(F[N - 1]), { fs: 12, c: P.c1, al: 'left', dx: 6, dy: -16, a: fl, wide: 1 }); }
    // trained pre-norm (step 4): most of the growth is block 1's FFN
    const b1 = la(st, e, q => q === 3 ? 1 : 0);
    if (b1 > .01) lab(R, [X(2), H(M.pre.trained.median_norm[2]), ROWS[1].z], 'block 1 FFN: ' + fmt(M.pre.trained.median_norm[1]) + ' → ' + fmt(M.pre.trained.median_norm[2]), { fs: 12.5, b: 1, c: P.c1, al: 'left', dx: 10, dy: -14, a: b1 });
    // the axis along the front
    const zf = ROWS[0].z + .55;
    lab(R, [X(0), 0, zf], 'embedding', { fs: 12, c: P.mute, dy: 12 });
    lab(R, [X(N - 1), 0, zf], 'sub-layer 12', { fs: 12, c: P.mute, dy: 12 });
    lab(R, [0, 0, zf], k >= 3 ? (k === 3 ? 'pre-norm trained (1,500 steps)' : 'all trained (1,500 steps)') : 'at initialisation', { fs: 12.5, b: 1, c: P.ink, dy: 14 });
  }
  const full = { cam: [.28, .72], bounds: [[-4.4, 0, -2.4], [4.4, 2.2, 2.7]] };
  S3.stage({ id: 'stg-rs', list: 'sx-rs', fig: 'Fig. 3 · the stream’s size through 12 sub-layers (log scale)', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 1600, hold: 4800, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [28, 70, 20, 96] });
})();
