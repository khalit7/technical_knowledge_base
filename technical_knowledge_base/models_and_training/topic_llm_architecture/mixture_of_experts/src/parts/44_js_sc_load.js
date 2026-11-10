// ---- Scene (section 3, Fig. 4): collapse against balancing, replayed from the training logs. Each plate is one run's expert shares per
// layer (rows layers, columns experts, height the share of that logged batch's assignments; MXD.runs.<run>.log.load.shares_b64, every 10 steps),
// the glass sheet is perfect balance (1/E). 151 logged frames are grouped into five stretches, each played during its step, then the held-out
// loads after training (MXD.runs.<run>.heldout.share). Left: balancing off; right: the scheme the reader picks. ----
(function () {
  if (!document.getElementById('stg-ld') || !window.MXS) return;
  const { D, M, ec, la, lab, cl, lerp } = MXS, $ = id => document.getElementById(id);
  const RIGHT = ['moe8', 'bias', 'sbias', 'cap1', 'moe8_s1', 'moe16s'].filter(k => D.runs[k] && D.runs[k].log.load);
  if (!D.runs.none || !D.runs.none.log.load || !RIGHT.length) return;
  let right = RIGHT[0];
  const cache = {};
  function shares(k) { if (cache[k]) return cache[k]; const ld = D.runs[k].log.load, a = M.unb64(ld.shares_b64), E = ld.E, L = ld.L, n = ld.steps.length, out = [];
    for (let s = 0; s < n; s++) { const st = []; for (let l = 0; l < L; l++) { const r = []; for (let e = 0; e < E; e++) r.push(a[(s * L + l) * E + e] / 255); st.push(r); } out.push(st); }
    return cache[k] = out; }
  // the stretches, as logged-frame indices (a frame every 10 steps): 0, 0 to 100, 100 to 300, 300 to 800, 800 to 1,500; then held-out
  const ST = [[0, 0], [0, 10], [10, 30], [30, 80], [80, 150]], HELD = ST.length;
  const frameAt = (k, e) => k >= HELD ? 150 : lerp(ST[k][0], ST[k][1], e);
  function at(run, f, held, ht) { const S = shares(run), i0 = Math.floor(f), i1 = Math.min(S.length - 1, i0 + 1), t = f - i0;
    let m = S[i0].map((r, l) => r.map((v, e) => lerp(v, S[i1][l][e], t)));
    if (held) { const H = D.runs[run].heldout.share; m = m.map((r, l) => r.map((v, e) => lerp(v, H[l][e], ht))); }
    return m; }
  // MaxVio as logged (mean over layers), interpolated like the shares; held-out from the analysis
  const avg = a => a.reduce((x, y) => x + y, 0) / a.length;
  function mvAt(run, f, held, ht) { const a = D.runs[run].log.load.maxvio, i0 = Math.floor(f), i1 = Math.min(a.length - 1, i0 + 1), v = lerp(avg(a[i0]), avg(a[i1]), f - i0);
    return held ? lerp(v, avg(D.runs[run].heldout.maxvio), ht) : v; }
  const mvOf = m => m.reduce((s, r) => { const mean = 1 / r.length; return s + (Math.max(...r) - mean) / mean; }, 0) / m.length;
  const PW = 3.6, GAP = 1.1, ZL = l => (l - 2.5) * .72, YS = 2.4;
  function plate(R, P, run, x0, m, title, a, mv) {
    const E = m[0].length, bw = PW / E;
    R.glass([x0 - .1, .003, ZL(0) - .35], [PW + .2, 0, 0], [0, 0, ZL(5) - ZL(0) + .7], { c: P.c1, a: .5 * a, nu: E, nv: 6, th: .02 });
    m.forEach((r, l) => r.forEach((v, e) => R.box([x0 + bw * (e + .5), 0, ZL(l)], [bw * .66, Math.max(.012, v * YS), .34], { fill: ec(e), a, shadow: false, lw: .6 })));
    R.glass([x0 - .1, YS / E, ZL(0) - .35], [PW + .2, 0, 0], [0, 0, ZL(5) - ZL(0) + .7], { c: P.ink, a: .35 * a, nu: 1, nv: 1, th: .005 });
    lab(R, [x0 + PW / 2, 0, ZL(0) - .35], title, { fs: 13, b: 1, dy: -40, c: P.ink, a });
    lab(R, [x0 + PW / 2, 0, ZL(0) - .35], 'MaxVio ' + mv.toFixed(2), { mono: true, fs: 12.5, b: 1, dy: -22, c: P.ink, a });
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5, 5, -2.6, 2.6, .5);
    const f = frameAt(k, e), held = k >= HELD, ht = held ? e : 0;
    const xl = -PW - GAP / 2, xr = GAP / 2;
    plate(R, P, 'none', xl, at('none', f, held, ht), D.runs.none.short, 1, mvAt('none', f, held, ht));
    plate(R, P, right, xr, at(right, f, held, ht), D.runs[right].short, 1, mvAt(right, f, held, ht));
    for (let l = 0; l < 6; l++) lab(R, [xl - .15, 0, ZL(l)], 'L' + (l + 1), { al: 'right', dx: -6, fs: 12, c: P.mute, wide: 1 });
    const step = D.runs.none.log.load.steps[Math.round(f)];
    lab(R, [0, 0, ZL(5) + .4], held ? 'after training, 20 held-out batches' : 'training step ' + step.toLocaleString('en-GB'), { mono: true, fs: 13, b: 1, dy: 22, c: P.acc });
    // the batch's assignments streaming into the two plates
    [xl, xr].forEach(x => R.flow([[x + PW / 2, 1.6, ZL(5) + 1.4], [x + PW / 2, .5, ZL(5) + .3]], { c: P.acc, a: .6, r: .05, n: 6, speed: 1.2 }));
  }
  const stg = S3.stage({ id: 'stg-ld', list: 'sx-ld', fig: 'Fig. 4 · expert loads over training, from the logs', cam: [.06, .98], bounds: [[-4.6, 0, -2.2], [4.6, 1.2, 2.7]], aspect: .6, dur: 4200, hold: 2600, draw,
    margin: w => w < 520 ? [44, 8, 30, 8] : [52, 16, 34, 40] });
  M.seg($('ld-right'), RIGHT.map(k => [k, D.runs[k].short]), right, m => { right = m; stg.list('sx-ld'); });
})();
