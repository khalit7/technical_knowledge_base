// ---- Scene (section 5, Fig. 6): one synthetic clip (a red dot moving left to right; 16 frames of 320 x 240, 4 seconds at 4 fps) becoming
// Qwen3.5's video tokens. The frames are redrawn here exactly as runs/make_inputs.py made them (centre 160 + (t / 15 - 0.5) x 240, radius 18).
// Which 8 frames the processor keeps is inferred from the four timestamps it wrote (frames 0, 2, 4, 6, 9, 11, 13, 15, pair means 0.25, 1.25,
// 2.5, 3.5 s, printed 0.2, 1.2, 2.5, 3.5); grid_thw [4, 16, 20], 80 tokens per pair, the prompt and both answers are recorded
// (VM_DATA.runs.qwen.video). ----
(function () {
  if (!document.getElementById('stg-vid') || !window.VMK) return;
  const K = VMK, { tw, la, lab, seg, img, wall, mix, lerp } = K, D = K.D, V = D.runs.qwen && D.runs.qwen.video; if (!V) return;
  const KEY = 'vid_red_left_to_right', rv = V.rows.find(r => r.key === KEY && r.mode === 'video'), rf = V.rows.find(r => r.key === KEY && r.mode !== 'video');
  const thw = rv.grid_thw, per = thw[1] * thw[2] / 4, stamps = (V.prompt_example.match(/<[\d.]+ seconds>/g) || []);
  const KEEP = [0, 2, 4, 6, 9, 11, 13, 15];
  // the 16 frames, as make_inputs.py drew them
  const FR = []; for (let t = 0; t < 16; t++) { const c = document.createElement('canvas'); c.width = 320; c.height = 240; const g = c.getContext('2d');
    g.fillStyle = 'rgb(245,245,240)'; g.fillRect(0, 0, 320, 240); g.fillStyle = 'rgb(220,40,40)'; g.beginPath(); g.arc(160 + (t / 15 - .5) * 240, 120, 18, 0, 7); g.fill(); FR.push(c); }
  const FW = 1.2, FH = .9, Y0 = .2;
  // where frame t sits at each step: a fanned stack of 16; then the kept 8; then pairs pushed together into 4 tubes
  function pos(t, s) { const i = KEEP.indexOf(t), p = Math.floor(i / 2), m = i % 2;
    if (s <= 1 || i < 0) return [-4.6 + t * .42, Y0, -t * .12];
    return [-4.4 + p * 1.75 + m * .3, Y0, -p * .1 - m * .3]; }
  function draw(R, k, e, st) {
    const P = R.P, cV = P.c4; R.grid(-5.4, 4.6, -2.4, 2.2, .5);
    for (let t = 15; t >= 0; t--) { const kept = KEEP.includes(t), a0 = s => s === 0 ? 1 : kept ? (s >= 5 ? .35 : 1) : 0, a = tw(st, e, a0);
      if (a <= .01) continue; const p0 = pos(t, st.pk), p1 = pos(t, k), u = e >= 1 ? 1 : e, p = [lerp(p0[0], p1[0], u), lerp(p0[1], p1[1], u) + (!kept && k === 1 ? .6 * e : 0), lerp(p0[2], p1[2], u)];
      img(R, FR[t], p, [FW, 0, 0], [0, FH, 0], { a, sub: 1, rim: .025, grid: k >= 2 && kept ? [thw[2] / (k >= 3 ? 2 : 1), thw[1] / (k >= 3 ? 2 : 1), cV, tw(st, e, s => s >= 2 && s <= 3 ? .45 : 0)] : null, gw: .5 }); }
    const l = s => la(st, e, q => q === s ? 1 : 0);
    lab(R, [-4.6, Y0 + FH, 0], '16 frames, 0 to 3.75 s (4 per second)', { fs: 12.5, b: 1, al: 'left', dy: -14, a: l(0) });
    lab(R, [-4.6, Y0 + FH, 0], 'sampled at 2 per second: 8 of 16 kept', { fs: 12.5, b: 1, al: 'left', dy: -14, a: l(1) });
    // pairs of frames become tubes (a 3-D patch of depth 2), each cut into 16 x 20 patches, then 2 x 2 merged: 80 tokens per pair
    const ta = tw(st, e, s => s === 2 || s === 3 ? 1 : 0);
    for (let p = 0; p < 4; p++) { const x = -4.4 + p * 1.75, z = -p * .1;
      if (ta > .01) R.box([x + .75, Y0 - .05, z - .15], [FW + .5, FH + .1, .5], { fill: mix(P.paper, cV, .25), a: ta * .55, fa: .25, shadow: false }); }
    lab(R, [-1.8, Y0 + FH + .1, -.2], 'pairs merged: ' + thw[0] + ' tubes of ' + thw[1] + ' × ' + thw[2] + ' patches', { fs: 12.5, b: 1, c: cV, dy: -14, a: l(2) });
    lab(R, [-1.8, Y0 + FH + .1, -.2], '2 × 2 merged: ' + per + ' tokens per tube', { fs: 12.5, b: 1, c: cV, dy: -14, a: l(3) });
    // the sequence: a timestamp in text before each tube's 80 tokens
    const wa = tw(st, e, s => s >= 3 ? 1 : 0), WZ = 1.4, TS = .062;
    for (let p = 0; p < 4; p++) { const x = -4.9 + p * 2.3;
      R.box([x + .1, 0, WZ], [.62, .18, .3], { fill: mix(P.paper, P.c5, .55), a: tw(st, e, s => s >= 4 ? 1 : 0), shadow: false });
      lab(R, [x + .1, .18, WZ], stamps[p] || '', { mono: 1, fs: 12, b: 1, c: P.c5, dy: -10, a: la(st, e, s => s >= 4 ? 1 : 0) });
      wall(R, x + .85, .1, WZ, per, 10, TS, cV, wa);
      if (k === 3) R.flow(seg([-4.4 + p * 1.75 + .75, Y0, -p * .1], [x + 1.15, .3, WZ], 8), { c: cV, a: e * .9, r: .06, n: 5 }); }
    lab(R, [0, 0, WZ + .2], thw[0] + ' × ' + per + ' = ' + rv.video_tokens + ' video tokens, ' + rv.prompt_tokens + ' in the prompt', { fs: 12.5, b: 1, c: cV, dy: 18, a: la(st, e, s => s === 3 || s === 4 ? 1 : 0) });
    lab(R, [0, 0, WZ + .2], 'timestamps are text tokens between the tubes', { fs: 12, c: P.c5, dy: 36, a: l(4), wide: 1 });
    // the answers
    lab(R, [0, 0, WZ + .2], 'video: "' + rv.answer + '" (truth: ' + rv.truth + ')', { mono: 1, fs: 13, b: 1, c: P.bad, dy: 18, a: l(5) });
    lab(R, [0, 0, WZ + .2], 'first frame only: "' + rf.answer + '"', { mono: 1, fs: 12.5, c: P.good, dy: 38, a: l(5) });
  }
  const full = { cam: [.18, .45], bounds: [[-5.3, 0, -1.2], [3.6, 1.3, 1.8]] };
  S3.stage({ id: 'stg-vid', list: 'sx-vid', fig: 'Fig. 6 · a 4-second clip to 320 video tokens', cam: full.cam, bounds: full.bounds, aspect: .47, dur: 1500, hold: 4800, draw, margin: K.margin,
    view: k => k <= 2 ? { cam: [.22, .4], bounds: [[-5, 0, -1.9], [3, 1.2, .3]] } : full });
})();
