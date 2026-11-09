// ---- Scene (section 3, Fig. 2): FID against the number of generated images N, as columns. Rows: four of the page's eight sets; columns: the six
// sample counts of the runs (EV.ns), each the mean of the recorded draws (EV.m, three draws below 10,000), always against the full 10,000 test
// images; one linear height scale for the whole field. The glass columns at the far right are each set's FID at infinitely many samples from the
// straight-line fit FID_N = FID_inf + K/N through N = 1,000 to 10,000 (EV.fit). What the scene shows is published in window.EVS.n. ----
(function () {
  if (!document.getElementById('stg-n') || !window.EVK) return;
  const { col, column, lab, fmt, fid, win } = EVK, E = EV, SET = Object.fromEntries(E.sets.map(s => [s.k, s]));
  const ROWS = ['real', 'ddpm', 'ddim', 'flow_g4'], NS = E.ns, XN = i => -3.1 + i * 1.12, XI = 4.15, ZR = r => 1.35 - r * 1.05;
  const HMAX = Math.max(...ROWS.map(k => fid(k, NS[0]))), HS = 2.3 / HMAX, CW = .62, CD = .52;
  const nf = n => n.toLocaleString('en-US');
  const d1 = (a, b, n) => fid(a, n) - fid(b, n);
  window.EVS = window.EVS || {};
  EVS.n = { real250: fmt(fid('real', 250), 1), real10k: fmt(fid('real', 10000), 2), realInf: fmt(E.fit.real.inf, 2), realK: fmt(E.fit.real.K, 0), ddpm1k: fmt(fid('ddpm', 1000), 1),
    ddpm250: fmt(fid('ddpm', 250), 1), ddpm10k: fmt(fid('ddpm', 10000), 1), ddpmInf: fmt(E.fit.ddpm.inf, 1), g4Inf: fmt(E.fit.flow_g4.inf, 1), gap250: fmt(d1('ddim', 'ddpm', 250), 1), gap10k: fmt(d1('ddim', 'ddpm', 10000), 1),
    Kmin: fmt(Math.min(...Object.values(E.fit).map(f => f.K)), 0), Kmax: fmt(Math.max(...Object.values(E.fit).map(f => f.K)), 0), vae250: fmt(fid('vae', 250), 1), vae10k: fmt(fid('vae', 10000), 1) };
  function draw(R, k, e) {
    const P = R.P; R.grid(-4, 5, -2.4, 2.4, .5);
    // axis: the sample counts along the front, the fitted infinity at the far right
    NS.forEach((n, i) => lab(R, [XN(i), 0, ZR(0) + .45], (i ? '' : 'N = ') + nf(n), { mono: 1, fs: 12, dy: 10, c: P.mute }));
    lab(R, [XI, 0, ZR(0) + .45], 'N = ∞ (fit)', { mono: 1, fs: 12, dy: 10, c: P.mute, a: k >= 1 ? 1 : .3 });
    ROWS.forEach((key, r) => {
      const c = col(P, SET[key].color), z = ZR(r), isReal = key === 'real';
      // which rows are shown at full strength in each step
      const show = k <= 1 ? (isReal ? 1 : 0) : k === 2 ? (isReal ? .45 : 1) : k === 3 ? (key === 'real' || key === 'ddpm' ? 1 : .22) : (key === 'ddpm' || key === 'ddim' ? 1 : .22);
      const grow = k === 0 && isReal ? e : k === 2 && !isReal ? e : 1;
      if (show <= .01) return;
      NS.forEach((n, i) => { const v = fid(key, n), t = win(grow, i / 8, i / 8 + .4), hl = k === 3 && ((isReal && n === 250) || (key === 'ddpm' && n === 1000));
        const txt = k === 0 && isReal ? fmt(v, n === 10000 ? 2 : 1) : k === 2 && key === 'ddpm' && (n === 250 || n === 10000) ? fmt(v, 1) : hl ? fmt(v, 1) : null;
        column(R, [XN(i), 0, z], CW, CD, v * HS * t, { fill: isReal ? S3.mix(P.paper, P.mute, .55) : S3.mix(P.paper, c, .72), a: show * (k === 3 && !hl ? .45 : 1), text: txt, b: hl, tc: hl ? P.bad : P.ink, ta: t >= 1 ? show : 0 }); });
      // the fitted value at infinitely many samples: a glass column at the far right
      const fa = k === 0 ? 0 : isReal && k === 1 ? e : !isReal && k === 2 ? e : 1;
      if (fa > 0) { const f = E.fit[key], h = Math.max(.02, f.inf * HS);
        R.glass([XI - CW / 2, 0, z + CD / 2], [CW, 0, 0], [0, h, 0], { c: isReal ? P.ink : c, a: show * fa, nu: 1, nv: 1, th: -CD });
        if ((isReal && k === 1) || (!isReal && k === 2 && key !== 'ddim')) lab(R, [XI, h, z], fmt(f.inf, isReal ? 2 : 1), { mono: 1, fs: 12.5, b: 1, dy: -12, c: isReal ? P.ink : c, a: show * fa }); }
      lab(R, [XN(0) - .45, .1, z], SET[key].short, { al: 'right', dx: -6, fs: 12.5, b: 1, c: isReal ? P.ink : c, a: Math.max(.35, show), grp: 'rows' });
    });
    // step 2: the bias is about K/N: the fitted curve over the real row's columns, drawn over the range it was fitted on
    if (k === 1) { const f = E.fit.real, pts = []; for (let i = 2; i < NS.length; i++) pts.push([XN(i), (f.inf + f.K / NS[i]) * HS, ZR(0)]); pts.push([XI, f.inf * HS, ZR(0)]);
      R.line(pts, { c: P.bad, w: 2.2, dash: [5, 4], a: e, top: 1 }); R.flow(pts, { c: P.bad, r: .05, n: 7, a: e, top: 1 });
      lab(R, [XN(3), (f.inf + f.K / NS[3]) * HS, ZR(0)], 'FID∞ + K/N, K = ' + fmt(f.K, 0), { al: 'left', dx: 14, dy: -22, mono: 1, fs: 12.5, b: 1, c: P.bad, a: win(e, .4, 1) }); }
    // step 5: the gap between DDPM and DDIM shrinks with N
    if (k === 4) [[0, 250], [5, 10000]].forEach(([i, n]) => { const a = fid('ddpm', n) * HS, b = fid('ddim', n) * HS, x = XN(i) + .42;
      R.line([[x, a, ZR(1)], [x, b, ZR(2)]], { c: P.bad, w: 2.4, a: e, top: 1 });
      lab(R, [x, b, ZR(2)], 'gap ' + fmt(d1('ddim', 'ddpm', n), 1), { al: 'left', dx: 8, mono: 1, fs: 12.5, b: 1, c: P.bad, a: win(e, .3, 1) }); });
  }
  const full = { cam: [-.45, .5], bounds: [[-3.6, 0, -1.9], [4.6, 2.3, 2]] };
  const st = S3.stage({ id: 'stg-n', list: 'sx-n', fig: 'Fig. 2 · FID at six sample counts, four sets', cam: full.cam, bounds: full.bounds, aspect: .52, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [14, 10, 14, 10] : [18, 16, 18, 110],
    view: k => k <= 1 ? { cam: [-.25, .38], bounds: [[-3.5, 0, ZR(0) - .4], [4.6, 1.5, ZR(0) + .6]] } : full });
})();
