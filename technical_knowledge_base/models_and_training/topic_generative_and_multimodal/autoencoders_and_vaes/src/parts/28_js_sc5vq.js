// ---- Scene (section 8, Fig. 5): vector quantization, a 2-D toy (illustrative, computed in the page; it replaced the 2-D quantizer toy, whose
// engine is kept unchanged below): 600 fixed "encoder outputs" (a seeded mixture of 7 Gaussians, frozen) and four quantizers. VQ with 16 codes
// initialised uniformly in +-1/16 (diffusers' default init), trained by moving each code to the mean of the points assigned to it (what the
// codebook loss does in the limit of a large step; k-means), without or with dead-code restarts every 3 steps; FSQ with levels [4, 4] (the paper's
// bound() at L = 4); LFQ with 2 bits (the sign of each coordinate). The last step is measured, not illustrative: how often each of the 128 codes of
// the section's real tokenizers is used on the 640,000 test tokens (AVD.quant.runs.vq_plain and vq_restart, usage_sorted). ----
(function () {
  if (!document.getElementById('stg-vq') || !window.AVK || !window.AVD) return;
  const { mix, lerp } = S3, { lab, seg, win, arcPts } = AVK;
  let s = 12345; const rnd = () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
  const gauss = () => { const u = Math.max(1e-9, rnd()), v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const centres = [[-2, -1.6], [-1.2, 1.8], [0.3, 0.2], [1.8, 1.5], [2.1, -1.4], [-2.3, 0.6], [0.6, -2.2]];
  const PTS = []; for (let i = 0; i < 600; i++) { const c = centres[i % 7]; PTS.push([c[0] + 0.38 * gauss(), c[1] + 0.38 * gauss()]); }
  const K = 16, STEPS = 25;
  function vqRun(restart) {
    let s2 = 777; const r2 = () => { s2 = (s2 * 1103515245 + 12345) % 2147483648; return s2 / 2147483648; };
    let C = []; for (let k = 0; k < K; k++) C.push([(r2() * 2 - 1) / K, (r2() * 2 - 1) / K]);
    const hist = [];
    for (let t = 0; t <= STEPS; t++) {
      const a = PTS.map(p => { let b = 0, bd = 1e9; C.forEach((c, k) => { const d = (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2; if (d < bd) { bd = d; b = k; } }); return b; });
      const n = new Array(K).fill(0), sx = new Array(K).fill(0), sy = new Array(K).fill(0); let err = 0;
      a.forEach((k, i) => { n[k]++; sx[k] += PTS[i][0]; sy[k] += PTS[i][1]; err += (PTS[i][0] - C[k][0]) ** 2 + (PTS[i][1] - C[k][1]) ** 2; });
      hist.push({ C: C.map(c => c.slice()), a, n, used: n.filter(v => v > 0).length, err: err / PTS.length });
      C = C.map((c, k) => n[k] ? [sx[k] / n[k], sy[k] / n[k]] : c);
      if (restart && t % 3 === 2) { const dead = []; n.forEach((v, k) => { if (!v) dead.push(k); }); dead.forEach(k => { const p = PTS[Math.floor(r2() * PTS.length)]; C[k] = [p[0] + 0.01, p[1]]; }); }
    }
    return hist;
  }
  const hl = 3 * (1 - 1e-3) / 2, off = 0.5, sh = Math.tan(off / hl), bound = z => Math.tanh(z + sh) * hl - off;
  function fsqRun() {
    const a = PTS.map(p => { const q = p.map(z => Math.round(bound(z))); return (q[0] + 2) + 4 * (q[1] + 2); });
    const inv = q => { const lo = Math.max(q - 0.5, -hl - off + 1e-3), hi = Math.min(q + 0.5, hl - off - 1e-3); return Math.atanh(((lo + hi) / 2 + off) / hl) - sh; };
    const C = []; for (let k = 0; k < 16; k++) { const qx = k % 4 - 2, qy = Math.floor(k / 4) - 2; C.push([inv(qx), inv(qy)]); }
    let err = 0; a.forEach((k, i) => { err += (PTS[i][0] - C[k][0]) ** 2 + (PTS[i][1] - C[k][1]) ** 2; });
    const n = new Array(16).fill(0); a.forEach(k => n[k]++);
    return [{ C, a, n, used: new Set(a).size, err: err / PTS.length }];
  }
  function lfqRun() {
    const C = [[-1, -1], [1, -1], [-1, 1], [1, 1]], a = PTS.map(p => (p[0] > 0 ? 1 : 0) + (p[1] > 0 ? 2 : 0));
    let err = 0; a.forEach((k, i) => { err += (PTS[i][0] - C[k][0]) ** 2 + (PTS[i][1] - C[k][1]) ** 2; });
    const n = new Array(4).fill(0); a.forEach(k => n[k]++);
    return [{ C, a, n, used: new Set(a).size, err: err / PTS.length }];
  }
  const RUN = { plain: vqRun(false), restart: vqRun(true), fsq: fsqRun(), lfq: lfqRun() };
  // perplexity: exp of the entropy of code frequencies, the effective number of equally used codes
  const ppl = n => { const t = n.reduce((a, b) => a + b, 0); return Math.exp(-n.filter(v => v).reduce((q, v) => q + v / t * Math.log(v / t), 0)); };
  { const end = m => RUN[m][RUN[m].length - 1], full = RUN.plain.findIndex(f => f.used === K),
      V = { 'plain.0.used': RUN.plain[0].used, 'plain.full': K + ' of ' + K + ' by training step ' + full, 'plain.ppl': ppl(end('plain').n).toFixed(1), 'restart.ppl': ppl(end('restart').n).toFixed(1), 'fsq.used': RUN.fsq[0].used };
    document.querySelectorAll('[data-avq]').forEach(el => { const v = V[el.dataset.avq]; if (v != null) el.textContent = v; }); window.AVQ_TXT = V; }
  const PAL = ['#4e79a7', '#f28e2b', '#e15759', '#76b7b2', '#59a14f', '#edc948', '#b07aa1', '#ff9da7', '#9c755f', '#bab0ac', '#1f77b4', '#d62728', '#2ca02c', '#9467bd', '#8c564b', '#17becf'].map(S3.rgb);
  const SC = .78, W2 = p => [p[0] * SC, 0, -p[1] * SC];        // toy plane (x right, y up) onto the floor, y away from the camera
  const MODE = ['plain', 'plain', 'plain', 'restart', 'fsq', 'lfq'];
  const Q = AVD.quant.runs, US = [['vq_plain', 'VQ, plain'], ['vq_restart', 'VQ + restarts']];
  // the frame a step shows: steps 3 and 4 play the 25 training steps while they run
  const frame = (k, e) => k <= 1 ? { h: RUN.plain[0], f: 0 } : k === 2 || k === 3 ? (() => { const h = RUN[MODE[k]], t = e * STEPS, i = Math.min(STEPS, Math.floor(t)); return { h: h[i], h2: h[Math.min(STEPS, i + 1)], u: t - i, f: i }; })() : { h: RUN[MODE[k]][0], f: 0 };
  function draw(R, k, e) {
    const P = R.P;
    if (k === 6) { R.grid(-5, 5, -2.5, 2.5, .5);
      US.forEach(([key, nm], r) => { const u = Q[key].usage_sorted, mx = Math.max(Q.vq_plain.usage_sorted[0], Q.vq_restart.usage_sorted[0]), z = r ? 1.3 : -1.3, c = r ? P.c4 : P.c1;
        R.box([0, 0, z], [8.3, .04, .42], { shadow: false });
        u.forEach((v, i) => { const x = -4 + i * 8 / 127, h = v > 0 ? Math.max(.012, 1.8 * Math.sqrt(v / mx) * win(e, 0, .7)) : 0;
          if (h > .005) R.box([x, .04, z], [.036, h, .22], { fill: mix(P.paper, c, .7), shadow: false, edge: false });
          else R.box([x, .04, z], [.036, .03, .22], { fill: P.bad, shadow: false, edge: false }); });
        lab(R, [-4.25, .05, z], nm, { fs: 12.5, b: 1, c, al: 'right', dx: -4 });
        lab(R, [4.2, .05, z], Q[key].codes_used_test + ' of 128 used', { fs: 12.5, b: 1, mono: 1, c, al: 'left', dx: 4, a: win(e, .6, 1) }); });
      return; }
    R.grid(-3.4, 3.4, -3.4, 3.4, .5);
    R.glass([-3.5 * SC, .01, -3.5 * SC], [7 * SC, 0, 0], [0, 0, 7 * SC], { c: P.c3, a: .45, nu: 7, nv: 7, th: .01 });
    const F = frame(k, e), h = F.h, h2 = F.h2 || h, u = F.u || 0, colored = k >= 1;
    // the points: grey until assigned, then the colour of their code
    PTS.forEach((p, i) => R.ball([p[0] * SC, .05, -p[1] * SC], .035, { c: colored ? PAL[h.a[i] % 16] : P.mute, a: colored ? .85 : .6 }));
    // the codes: glass markers; a code that wins nothing is dead (red, faint)
    h.C.forEach((c0, j) => { const c1 = h2.C[j], c = [lerp(c0[0], c1[0], u), lerp(c0[1], c1[1], u)], live = h.n[j] > 0, p = W2(c), gr = k === 0 ? win(e, j / 16 * .5, j / 16 * .5 + .4) : 1;
      R.box([p[0], .02, p[2]], [.16, .42 * gr, .16], { fill: live || k === 0 ? mix(P.paper, PAL[j % 16], .8) : mix(P.paper, P.bad, .35), fa: live ? .8 : .45, a: live || k === 0 ? 1 : .8, ec: live ? P.edge : P.bad, lw: 1.1 });
      if (!live && k >= 1) R.glow([p[0], .45, p[2]], .14, { c: P.bad, a: .5 }); });
    // step 2: every point snaps to its nearest code (a sample of the paths)
    if (k === 1) for (let i = 0; i < 600; i += 15) { const p = PTS[i], c = W2(h.C[h.a[i]]); R.flow(seg([p[0] * SC, .08, -p[1] * SC], [c[0], .3, c[2]], 6), { c: PAL[h.a[i] % 16], r: .04, n: 3, speed: .9, a: e }); }
    const used = h.used, nm = { 0: 'VQ, 16 fresh codes', 1: 'VQ, nearest code', 2: 'VQ, plain', 3: 'VQ + restarts', 4: 'FSQ, levels [4, 4]', 5: 'LFQ, 2 bits' }[k];
    lab(R, [0, 0, 3.6 * SC], nm, { fs: 13, b: 1, c: P.ink, dy: 16 });
    lab(R, [0, 0, 3.6 * SC], (k === 2 || k === 3 ? 'step ' + F.f + ': ' : '') + used + ' of ' + h.C.length + ' used · perplexity ' + ppl(h.n).toFixed(1) + ' · error ' + h.err.toFixed(3), { fs: 12.5, mono: 1, b: 1, c: used < h.C.length ? P.bad : P.good, dy: 34 });
  }
  const full = { cam: [.15, .9], bounds: [[-2.9, 0, -2.9], [2.9, .5, 3.6]] };
  S3.stage({ id: 'stg-vq', list: 'sx-vq', fig: 'Fig. 5 · 600 outputs, 16 codes, nearest wins', cam: full.cam, bounds: full.bounds, aspect: .78, dur: 2600, hold: 4800, draw, margin: AVK.margin,
    view: k => k === 6 ? { cam: [.08, .72], bounds: [[-5.6, 0, -1.7], [6, 1.8, 1.7]] } : full });
  window.AVQ_TOY = RUN;
})();
