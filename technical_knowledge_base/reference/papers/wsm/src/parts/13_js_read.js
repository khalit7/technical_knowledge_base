// ---- The paper tab: schedules (Figure 1), the merge-weight calculator (Theorem 3.1, Figure 2), the river-valley
// animation (§4.4), Figure 3 and Figure 5(a) rebuilt from the paper's vector figures, the duration chart ----
const P_ = window.PAPER, RC = P_.rc, FG = P_.figs;
const COL = { wsd: 'var(--c2)', wsm: 'var(--c1)', raw: 'var(--mute)', m8: 'var(--c6)', m12: 'var(--c1)', m16: 'var(--c4)', m20: 'var(--c3)' };
// linear frame: returns svg so far and scales
function frame(o) {
  const { W, H, pl, pr, pt, pb } = o, X = v => pl + (W - pl - pr) * (v - o.x[0]) / (o.x[1] - o.x[0]), Y = v => pt + (H - pt - pb) * (1 - (v - o.y[0]) / (o.y[1] - o.y[0]));
  let s = '';
  (o.yt || []).forEach(v => { s += ln2(pl, Y(v), W - pr, Y(v), 'var(--line)') + tx(pl - 5, Y(v) + 4, o.yf ? o.yf(v) : v, { fs: 11, a: 'end', c: 'var(--mute)' }) });
  (o.xt || []).forEach(v => { s += ln2(X(v), H - pb, X(v), H - pb + 4, 'var(--mute)') + tx(X(v), H - pb + 16, o.xf ? o.xf(v) : v, { fs: 11, a: 'middle', c: 'var(--mute)' }) });
  s += ln2(pl, H - pb, W - pr, H - pb, 'var(--mute)');
  if (o.xl) s += tx((pl + W - pr) / 2, H - 3, o.xl, { fs: 11, a: 'middle', c: 'var(--mute)' });
  if (o.yl) s += '<text x="11" y="' + ((pt + H - pb) / 2) + '" font-size="11" text-anchor="middle" fill="var(--mute)" transform="rotate(-90 11 ' + ((pt + H - pb) / 2) + ')">' + o.yl + '</text>';
  return { s, X, Y };
}
const poly = (pts, c, o) => { o = o || {}; return '<polyline fill="none" stroke="' + c + '" stroke-width="' + (o.sw || 1.8) + '"' + (o.da ? ' stroke-dasharray="' + o.da + '"' : '') + (o.op != null ? ' opacity="' + o.op + '"' : '') + ' points="' + pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ') + '"/>' };
const dot = (x, y, r, c, o) => { o = o || {}; return '<circle cx="' + x.toFixed(1) + '" cy="' + y.toFixed(1) + '" r="' + r + '" fill="' + c + '"' + (o.s ? ' stroke="' + o.s + '" stroke-width="1.5"' : '') + (o.op != null ? ' opacity="' + o.op + '"' : '') + '>' + (o.t ? '<title>' + o.t + '</title>' : '') + '</circle>' };
const star = (x, y, r, c, t) => { let p = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * .45 : r; p.push((x + rr * Math.cos(a)).toFixed(1) + ',' + (y + rr * Math.sin(a)).toFixed(1)) } return '<polygon points="' + p.join(' ') + '" fill="' + c + '" stroke="var(--bg)" stroke-width="1">' + (t ? '<title>' + t + '</title>' : '') + '</polygon>' };

// ---- 1. Schedules (Figure 1 redrawn), planned run against "train 50% longer" ----
(function () {
  const host = $('schSvg'); if (!host) return; let mode = 'plan';
  const cosF = (t, T) => t < .05 ? t / .05 : .1 + .9 * (1 + Math.cos(Math.PI * Math.min(1, (t - .05) / (T - .05)))) / 2;
  const wsdF = (t, ds, de) => t < .05 ? t / .05 : t < ds ? 1 : t < de ? 1 - Math.sqrt((t - ds) / (de - ds)) : 0;
  const CAP = { plan: 'Planned run of length 1. Cosine fixes its whole curve from T<sub>max</sub>; WSD holds the LR flat and decays over the last 20% (1-sqrt shape here); WSM holds it flat to the end and gets its anneal from merging the checkpoints in the shaded window.',
    ext: 'Decide at the end to train to 1.5. Cosine: the LR is already at its floor, so the curve must be re-planned and the run restarted (solid; the old run faded). WSD: roll back to the pre-decay checkpoint at 0.8, continue flat, decay again at the new end. WSM: just keep going; the merge window slides to the new end.' };
  function draw(w) {
    const narrow = w < 560, pw = narrow ? w : Math.floor((w - 16) / 3), ph = 150, n = 3;
    let s = '', H = narrow ? n * (ph + 8) : ph;
    const panels = [['Cosine', 'c'], ['WSD', 'w'], ['WSM (this paper)', 'm']];
    panels.forEach(([name, k], i) => {
      const ox = narrow ? 0 : i * (pw + 8), oy = narrow ? i * (ph + 8) : 0, T = mode === 'ext' ? 1.5 : 1;
      const X = t => ox + 30 + (pw - 40) * t / 1.5, Y = v => oy + 24 + (ph - 52) * (1 - v);
      s += rc(ox, oy, pw, ph, 'var(--soft)', { r: 8 }) + tx(ox + 10, oy + 16, name, { fs: 12, w: 600 });
      s += ln2(X(0), Y(0), X(1.5), Y(0), 'var(--mute)') + ln2(X(1), Y(0) - 3, X(1), Y(0) + 3, 'var(--mute)') + tx(X(1), Y(0) + 15, '1', { fs: 11, a: 'middle', c: 'var(--mute)' }) + tx(X(1.5), Y(0) + 15, '1.5', { fs: 11, a: 'end', c: 'var(--mute)' });
      const curve = (f, a, b) => { const p = []; for (let t = a; t <= b + 1e-9; t += .01) p.push([X(t), Y(f(t))]); return p };
      if (k === 'c') {
        if (mode === 'plan') s += poly(curve(t => cosF(t, 1), 0, 1), 'var(--c2)', { sw: 2.2 });
        else { s += poly(curve(t => cosF(t, 1), 0, 1), 'var(--c2)', { sw: 2, op: .3 }) + poly(curve(t => cosF(t, 1.5), 0, 1.5), 'var(--c2)', { sw: 2.2 }) + tx(X(.75), Y(.92), 'restart from step 0', { fs: 11, a: 'middle', c: 'var(--c2)' }) }
      } else if (k === 'w') {
        if (mode === 'plan') s += poly(curve(t => wsdF(t, .8, 1), 0, 1), 'var(--c2)', { sw: 2.2 }) + tx(X(.9), Y(1.08), 'decay', { fs: 11, a: 'middle', c: 'var(--mute)' });
        else { s += poly(curve(t => wsdF(t, .8, 1), .8, 1), 'var(--c2)', { sw: 2, op: .3 }) + poly(curve(t => wsdF(t, 1.3, 1.5), 0, 1.5), 'var(--c2)', { sw: 2.2 }) + tx(X(.8), Y(.55), 'roll back', { fs: 11, a: 'middle', c: 'var(--c2)' }) + ln2(X(.98), Y(.4), X(.82), Y(.4), 'var(--c2)', { sw: 1.2, da: '3 2' }) }
      } else {
        const end = mode === 'plan' ? 1 : 1.5;
        s += rc(X(end - .3), Y(1) - 6, X(end) - X(end - .3), Y(0) - Y(1) + 6, 'var(--c1)', { op: .14, r: 2 });
        for (let t = .1; t <= end + 1e-9; t += .1) s += dot(X(t), Y(1), 2.4, t > end - .3 - 1e-9 ? 'var(--c1)' : 'var(--mute)');
        s += poly(curve(t => t < .05 ? t / .05 : 1, 0, end), 'var(--c1)', { sw: 2.2 }) + tx(X(end - .15), Y(.45), 'merge', { fs: 11, a: 'middle', c: 'var(--c1)' }) + tx(X(end - .15), Y(.45) + 13, 'window', { fs: 11, a: 'middle', c: 'var(--c1)' });
      }
    });
    host.innerHTML = svgW(w, H, s, 'Learning-rate schedules: cosine, WSD and WSM');
    $('schCap').innerHTML = CAP[mode];
  }
  fit(host, draw);
  segBind('schM', m => { mode = m; $('schM').querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', b.dataset.m === m ? 'true' : 'false')); refit(host) });
})();

// ---- 2. Merge-weight calculator: Theorem 3.1 (Eq. 5) for any shape and number of checkpoints ----
const WSH = { mean: t => 1 - t, '1-sqrt': t => 1 - Math.sqrt(t), cosine: t => (1 + Math.cos(Math.PI * t)) / 2, ema: t => 1 - Math.pow(0.1, 1 - t) };
function thm31(shape, n) { const k = n - 1, w = []; for (let i = 1; i <= k; i++) w.push(WSH[shape](i / n)); const c = new Array(n).fill(0);
  c[k] = w[k - 1]; for (let j = 1; j < k; j++) c[j] = w[j - 1] - w[j]; c[0] = 1 - w[0]; return { w, c } }
const WC = { set: null };
(function () {
  const host = $('wcSvg'); if (!host) return;
  const key = { mean: 'Linear', '1-sqrt': '1-sqrt', cosine: 'Cosine', ema: 'EMA' };
  function draw(w) {
    const sh = $('wcShape').value, n = +$('wcN').value; $('wcNv').textContent = n;
    const { w: ws, c } = thm31(sh, n), H1 = 150, H2 = 150, pl = 40, pr = 10;
    let s = '';
    const cmax = Math.max(.35, ...c) * 1.1;
    const f1 = frame({ W: w, H: H1, pl, pr, pt: 18, pb: 28, x: [-.5, n - .5], y: [0, cmax], yt: [0, .1, .2, .3], yf: v => v.toFixed(1), xl: 'checkpoint index (larger = newer)' });
    s += tx(pl, 12, 'Merge weights c<tspan dy="3" font-size="11">j</tspan>', { fs: 12, w: 600 }) + f1.s;
    const bw = Math.max(3, (f1.X(1) - f1.X(0)) * .7);
    c.forEach((v, j) => { s += rc(f1.X(j) - bw / 2, f1.Y(v), bw, f1.Y(0) - f1.Y(v), 'var(--c1)', { r: 2 }); if (n <= 12) s += tx(f1.X(j), f1.Y(v) - 4, v.toFixed(3), { fs: 11, a: 'middle' }); if (n <= 20 && (n <= 12 || j % 2 === 0)) s += tx(f1.X(j), H1 - 13, j, { fs: 11, a: 'middle', c: 'var(--mute)' }) });
    const f2 = frame({ W: w, H: H2, pl, pr: 20, pt: 18, pb: 28, x: [0, 1], y: [0, 1], yt: [0, .5, 1], yf: v => Math.round(v * 100) + '%', xt: [0, .25, .5, .75, 1], xf: v => Math.round(v * 100) + '%', xl: 'progress through the merge window' });
    let s2 = tx(pl, 12, 'Equivalent decay w<tspan dy="3" font-size="11">i</tspan> (fraction of the peak LR)', { fs: 12, w: 600 }) + f2.s;
    const k = n - 1, st = [];
    for (let i = 1; i <= k; i++) { const a = (i - 1) / k, b = i / k; st.push([f2.X(a), f2.Y(ws[i - 1])], [f2.X(b), f2.Y(ws[i - 1])]) }
    const sm = []; for (let t = 0; t <= 1.0001; t += .01) sm.push([f2.X(t), f2.Y(WSH[sh](Math.min(1, (t * k + 1) / n)))]); // the curve through each step's left corner, reaching 0 at the window's end
    s2 += poly(sm, 'var(--mute)', { da: '4 3', sw: 1.4 }) + poly(st, 'var(--c2)', { sw: 2.4 });
    host.innerHTML = svgW(w, H1, s, 'Merge weights') + svgW(w, H2, s2, 'Equivalent decay schedule');
    const pr10 = RC.fig2[key[sh]];
    let chk = '';
    if (n === 10) { const m = c.filter((v, j) => Math.abs(Math.round(v * 1000) / 1000 - pr10.printed[j]) < .0011).length; chk = ' <b>Figure 2 check:</b> ' + m + ' of 10 weights match the printed ' + pr10.printed.map(v => v.toFixed(3)).join(', ') + '.' }
    else chk = ' Set 10 checkpoints to compare with the paper\'s Figure 2.';
    $('wcOut').innerHTML = 'The weights sum to ' + c.reduce((a, b) => a + b, 0).toFixed(3) + '. The oldest checkpoint gets c<sub>0</sub> = 1 − w<sub>1</sub> = ' + c[0].toFixed(3) + '; the first update after it keeps ' + Math.round(ws[0] * 100) + '% of its LR and the last ' + Math.round(ws[k - 1] * 100) + '%. In a real run each step of the staircase is one checkpoint interval (25B tokens in the paper), so finer checkpoints follow the curve more closely.' + chk;
  }
  fit(host, draw); ['wcShape', 'wcN'].forEach(id => $(id).addEventListener(id === 'wcN' ? 'input' : 'change', () => refit(host)));
  WC.set = (sh, n) => { $('wcShape').value = sh; $('wcN').value = n; refit(host); $('wc').scrollIntoView({ block: 'nearest' }) };
  PRED_REVEAL.pq1 = () => WC.set('mean', 10);
  PRED_REVEAL.pq2 = () => WC.set('ema', 10);
})();

// ---- 3. River valley: the same noise through a WSD branch and a WSM branch (illustrative SGD toy) ----
(function () {
  const A = 1, B = .02, XS = 4, ETA = .3, SX = .1, SY = 2, N1 = 60, N2 = 80, CK = 10, NM = 8;
  const L = (x, y) => .5 * (A * y * y + B * (x - XS) * (x - XS));
  let noise;
  function draws(seed) { const r = mulberry32(seed), gs = () => { let u = 0; while (!u) u = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * r()) };
    noise = []; for (let i = 0; i < N1 + N2; i++) noise.push([gs() * SX, gs() * SY]) }
  function sim(mode) { let x = -4, y = 1.5; const path = [[x, y]], lr = [];
    for (let s = 0; s < N1 + N2; s++) { const e = s < N1 ? ETA : mode === 'wsd' ? ETA * (1 - Math.sqrt((s - N1 + 1) / N2)) : ETA; lr.push(e);
      x -= e * (B * (x - XS) + noise[s][0]); y -= e * (A * y + noise[s][1]); path.push([x, y]) }
    const ck = []; for (let b = CK; b <= N2; b += CK) ck.push(path[N1 + b]);
    return { path, lr, ck } }
  // 200 noise draws for the averages quoted in the last step, then the draw shown (seed 170, a typical one)
  const avg = [0, 0, 0]; let mWins = 0;
  for (let sd = 1; sd <= 200; sd++) { draws(sd); const a = sim('wsd'), b = sim('wsm'), cs = b.ck.slice(-NM), m = [cs.reduce((x, p) => x + p[0], 0) / cs.length, cs.reduce((x, p) => x + p[1], 0) / cs.length], v = [L(...a.path[N1 + N2]), L(...m), L(...b.path[N1 + N2])]; v.forEach((x, i) => avg[i] += x / 200); if (v[1] < v[0]) mWins++ }
  draws(170);
  const S = { wsd: sim('wsd'), wsm: sim('wsm') };
  const merged = upto => { const cs = S.wsm.ck.slice(0, Math.floor(upto / CK)).slice(-NM); if (!cs.length) return null; return [cs.reduce((a, p) => a + p[0], 0) / cs.length, cs.reduce((a, p) => a + p[1], 0) / cs.length, cs.length] };
  const fin = { wsd: S.wsd.path[N1 + N2], wsm: merged(N2) };
  // steps: [title, caption, from step, to step]
  const ST = m => [
    ['Stable phase: constant LR', 'Sixty steps at a constant LR of 0.3. The run drifts down the long valley (the river) while bouncing between its steep walls (the canyon): the noise keeps it off the floor.', 0, N1],
    ['Branch point', 'Both branches start here, from the same weights, and will see the same noise. ' + (m === 'wsd' ? 'WSD now decays the LR to zero over 80 steps (1-sqrt).' : 'WSM keeps the LR at 0.3 and saves a checkpoint every 10 steps.'), N1, N1],
    ['Branch, steps 1 to 20', m === 'wsd' ? 'The LR is falling fast (1-sqrt drops early): the bounce shrinks, and so does the progress down the river.' : 'Still bouncing. The star is the mean of the checkpoints saved so far: it already sits near the floor.', N1, N1 + 20],
    ['Steps 21 to 40', m === 'wsd' ? 'Smaller steps settle toward the floor of the canyon.' : 'Four checkpoints: the star averages out the bounce but lags the live run along the river.', N1 + 20, N1 + 40],
    ['Steps 41 to 60', m === 'wsd' ? 'Close to the floor; progress along the valley has nearly stopped.' : 'Six checkpoints. The live weights are as noisy as ever; nothing in training changed.', N1 + 40, N1 + 60],
    ['Steps 61 to 80', m === 'wsd' ? 'The LR reaches zero: the decayed model is the last point.' : 'Eight checkpoints, the merge window is full: the star is the model you would ship.', N1 + 60, N1 + N2],
    ['Compare', 'Both end products, same noise: the decayed point (red) and the merged point (blue star). Loss ' + L(...fin.wsd).toFixed(3) + ' against ' + L(fin.wsm[0], fin.wsm[1]).toFixed(3) + ' in this noise draw; the live WSM weights end at ' + L(...S.wsm.path[N1 + N2]).toFixed(3) + '. Over 200 draws: decayed ' + avg[0].toFixed(3) + ', merged ' + avg[1].toFixed(3) + ' (lower in ' + mWins + ' of 200), live constant-LR weights ' + avg[2].toFixed(3) + '.', N1 + N2, N1 + N2]];
  const MODES = { wsd: ST('wsd').map(([t, c]) => ({ t, c })), wsm: ST('wsm').map(([t, c]) => ({ t, c })) };
  const at = (m, k, e) => { const s = ST(m)[k]; return Math.round(s[2] + (s[3] - s[2]) * e) };
  makeAnim({ id: 'rv', modes: MODES, mode: 'wsd', dur: 2600,
    draw(m, k, e, w) {
      const H = Math.max(220, Math.min(320, Math.round(w * .5))), X = v => 10 + (w - 20) * (v + 4.6) / 9.4, Y = v => H / 2 - (H - 30) / 2 * v / 3;
      let s = '';
      [.05, .2, .5, 1, 2].forEach(lv => { const ry = Math.sqrt(2 * lv / A), rx = Math.sqrt(2 * lv / B); s += '<ellipse cx="' + X(XS).toFixed(1) + '" cy="' + Y(0).toFixed(1) + '" rx="' + (X(XS + rx) - X(XS)).toFixed(1) + '" ry="' + (Y(0) - Y(ry)).toFixed(1) + '" fill="none" stroke="var(--line)" stroke-width="1.2"/>' });
      s += ln2(X(-4.6), Y(0), X(4.6), Y(0), 'var(--c3)', { sw: 1, da: '5 4', op: .7 }) + tx(X(4.5), Y(0) - 6, 'river (floor)', { fs: 11, a: 'end', c: 'var(--c3)' }) + tx(X(4), Y(0) + 16, 'minimum', { fs: 11, a: 'middle', c: 'var(--mute)' }) + dot(X(4), Y(0), 3, 'var(--c3)');
      const t = at(m, k, e), P = S[m].path, upto = Math.min(t, N1), pre = P.slice(0, upto + 1).map(p => [X(p[0]), Y(p[1])]);
      s += poly(pre, 'var(--mute)', { sw: 1.3 });
      if (t > N1) s += poly(P.slice(N1, t + 1).map(p => [X(p[0]), Y(p[1])]), m === 'wsd' ? 'var(--c2)' : 'var(--c1)', { sw: 1.6 });
      s += dot(X(P[N1][0]), Y(P[N1][1]), 4, 'var(--ink)', { t: 'branch point' });
      if (m === 'wsm') { S.wsm.ck.forEach((p, i) => { if ((i + 1) * CK <= t - N1) s += dot(X(p[0]), Y(p[1]), 3.5, 'var(--bg)', { s: 'var(--c1)' }) });
        const mg = merged(t - N1); if (mg) s += star(X(mg[0]), Y(mg[1]), 11, 'var(--c1)', 'merged model') }
      s += dot(X(P[t][0]), Y(P[t][1]), 5, m === 'wsd' ? 'var(--c2)' : 'var(--c1)', { s: 'var(--bg)' });
      if (k === 6) { s += dot(X(fin.wsd[0]), Y(fin.wsd[1]), 6, 'var(--c2)', { s: 'var(--bg)' }) + star(X(fin.wsm[0]), Y(fin.wsm[1]), 10, 'var(--c1)');
        s += tx(X(fin.wsd[0]), Y(fin.wsd[1]) - 10, 'decayed', { fs: 11, a: 'middle', c: 'var(--c2)' }) + tx(X(fin.wsm[0]), Y(fin.wsm[1]) + 20, 'merged', { fs: 11, a: 'middle', c: 'var(--c1)' }) }
      return svgW(w, H, s, 'River valley: constant LR, then decay or merge');
    },
    counters(m, k, e) { const t = at(m, k, e), P = S[m].path, lr = t === 0 ? ETA : S[m].lr[Math.max(0, t - 1)], mg = m === 'wsm' ? merged(t - N1) : null;
      const out = m === 'wsd' ? L(...P[t]) : mg ? L(mg[0], mg[1]) : L(...P[t]);
      return stat('step', t + ' of ' + (N1 + N2)) + stat('learning rate', lr.toFixed(2)) + stat('loss, live weights', L(...P[t]).toFixed(3)) + stat(m === 'wsd' ? 'loss, model you ship' : 'loss, merged model', out.toFixed(3), m === 'wsm' ? (mg ? mg[2] + ' checkpoints merged' : 'no checkpoint yet') : 'the live weights') }
  });
})();

// ---- 4. Figure 3 rebuilt ----
(function () {
  const host = $('f3Svg'); if (!host) return;
  const SER = [['WSM (before merge)', 'var(--mute)', 'WSM before merge'], ['WSD', 'var(--c2)', 'WSD'], ['WSM (Merge 8)', 'var(--c6)', 'Merge 8'], ['WSM (Merge 12)', 'var(--c1)', 'Merge 12'], ['WSM (Merge 16)', 'var(--c4)', 'Merge 16'], ['WSM (Merge 20)', 'var(--c3)', 'Merge 20']];
  function draw(w) {
    const cat = $('f3Cat').value, cut = $('f3Cut').checked, D = FG.fig3_main[cat], H = 300;
    let lo = 1e9, hi = -1e9; SER.forEach(([k]) => (D[k] || []).forEach(p => { lo = Math.min(lo, p[1]); hi = Math.max(hi, p[1]) }));
    lo = Math.floor(lo - .3); hi = Math.ceil(hi + .3); const yt = []; for (let v = lo; v <= hi; v += (hi - lo > 6 ? 2 : 1)) yt.push(v);
    const f = frame({ W: w, H, pl: 40, pr: 10, pt: 34, pb: 32, x: [0, 510], y: [lo, hi], yt, xt: [0, 100, 200, 300, 400, 500], xl: 'tokens since the branch (B)', yl: 'accuracy (%)' });
    let s = rc(f.X(400), f.Y(hi), f.X(500) - f.X(400), f.Y(lo) - f.Y(hi), 'var(--dim)', { op: .35, r: 0 }) + tx(f.X(450), f.Y(hi) + 13, 'after WSD ends', { fs: 11, a: 'middle', c: 'var(--mute)' }) + f.s;
    const lg = legend(SER.map(x => [x[2], x[1]]), 40, 14, w - 50); s += lg.s;
    SER.forEach(([k, c]) => { const a = D[k] || []; if (!a.length) return; s += poly(a.map(p => [f.X(p[0]), f.Y(p[1])]), c, { sw: 1.8, op: cut ? .55 : 1 }); a.forEach(p => s += dot(f.X(p[0]), f.Y(p[1]), 2.6, c, { t: k + ': ' + p[1].toFixed(2) + ' at ' + p[0] + 'B', op: cut && p[0] > 401 ? .3 : 1 })) });
    const bestW = D.WSD.reduce((b, p) => p[1] > b[1] ? p : b), cand = [];
    SER.slice(2).forEach(([k]) => (D[k] || []).forEach(p => cand.push([p[0], p[1], k])));
    const pool = cut ? cand.filter(p => p[0] <= 401) : cand, bestM = pool.reduce((b, p) => p[1] > b[1] ? p : b);
    s += '<circle cx="' + f.X(bestW[0]) + '" cy="' + f.Y(bestW[1]) + '" r="7" fill="none" stroke="var(--c2)" stroke-width="2"/><circle cx="' + f.X(bestM[0]) + '" cy="' + f.Y(bestM[1]) + '" r="7" fill="none" stroke="var(--ink)" stroke-width="2"/>';
    host.innerHTML = svgW(w, H + (lg.h > 16 ? lg.h - 16 : 0), s.replace('<g', '<g'), 'Figure 3 rebuilt');
    const n = cand.length, nw = D.WSD.length;
    $('f3Out').innerHTML = '<b>' + cat + ':</b> best WSD ' + bestW[1].toFixed(2) + ' at ' + bestW[0] + 'B; best merged ' + bestM[1].toFixed(2) + ' (' + bestM[2].replace('WSM (', '').replace(')', '') + ' at ' + bestM[0] + 'B), a lead of <b>' + (bestM[1] - bestW[1] >= 0 ? '+' : '') + (bestM[1] - bestW[1]).toFixed(2) + '</b> points' + (cut ? ' with both stopped at 400B.' : ' as Table 1 compares them.') + ' Picked from ' + nw + ' WSD points and ' + (cut ? pool.length : n) + ' merged points, all scored on the reported benchmarks. ' + (cat === 'Overall Average' ? 'Values read from the vector figure reproduce Table 1 exactly (62.67, 63.95).' : 'Table 1 reports categories at the checkpoint with the best overall average, so its category figures can differ from these per-category maxima.');
  }
  fit(host, draw); $('f3Cat').addEventListener('change', () => refit(host)); $('f3Cut').addEventListener('change', () => refit(host));
})();

// ---- 5. Duration against granularity (in the third prediction's reveal) ----
PRED_REVEAL.pq3 = function () {
  const host = $('durSvg');
  fit(host, w => {
    const mw = RC.fig4.mean_by_window, win = [2, 8, 12, 16, 20].map(n => [n, mw['Mean, Merge ' + n][0]]);
    const t4 = Object.entries(P_.tables.t4.rows).map(([k, v]) => [k, +v[5]]), narrow = w < 560, pw = narrow ? w : (w - 12) / 2, H = 210;
    const bars = (ox, oy, data, title, lab, base) => { const f = frame({ W: pw, H, pl: 36, pr: 6, pt: 30, pb: 34, x: [-.5, data.length - .5], y: [59, 64.5], yt: [59, 60, 61, 62, 63, 64] }); let s = '<g transform="translate(' + ox + ',' + oy + ')">' + tx(36, 14, title, { fs: 12, w: 600 }) + f.s;
      const bw = (f.X(1) - f.X(0)) * .62; data.forEach((d, i) => { s += rc(f.X(i) - bw / 2, f.Y(d[1]), bw, f.Y(59) - f.Y(d[1]), 'var(--c1)', { r: 2, op: .85 }) + tx(f.X(i), f.Y(d[1]) - 4, d[1].toFixed(2), { fs: 11, a: 'middle' }) + tx(f.X(i), H - 18, lab(d[0]), { fs: 11, a: 'middle', c: 'var(--mute)' }) });
      s += ln2(36, f.Y(base), pw - 6, f.Y(base), 'var(--c2)', { da: '4 3', sw: 1.4 }) + tx(pw - 8, f.Y(base) - 4, 'WSD 62.67', { fs: 11, a: 'end', c: 'var(--c2)' }) + tx((36 + pw) / 2, H - 3, title.startsWith('Figure') ? 'checkpoints merged (25B each)' : '(interval, count), 80B span', { fs: 11, a: 'middle', c: 'var(--mute)' }); return s + '</g>' };
    host.innerHTML = svgW(w, narrow ? 2 * H + 10 : H, bars(0, 0, win, 'Figure 4, mean merge: best by window', n => n, 62.67) + bars(narrow ? 0 : pw + 12, narrow ? H + 10 : 0, t4, 'Table 4: same span, finer or coarser', k => k.replace('(', '').replace(')', '').replace('B,', '/'), 62.67), 'Merge duration against granularity');
  });
};

// ---- 6. Figure 5(a) rebuilt ----
(function () {
  const host = $('f5Svg'); if (!host) return; const D = FG.fig5a_constant['Overall Average Performance'];
  const rows = RC.fig5a; let sel = -1;
  function draw(w) {
    const H = 260, f = frame({ W: w, H, pl: 36, pr: 10, pt: 12, pb: 32, x: [0, 10300], y: [27, 62], yt: [30, 35, 40, 45, 50, 55, 60], xt: [0, 2000, 4000, 6000, 8000, 10000], xf: v => (v / 1000) + 'T', xl: 'training tokens', yl: 'accuracy (%)' });
    let s = f.s + poly(D.constant.map(p => [f.X(p[0]), f.Y(p[1])]), 'var(--mute)', { sw: 1.2, op: .8 });
    const groups = []; D.Decay.forEach(p => { const g = groups.find(g => Math.abs(g[g.length - 1][0] - p[0]) < 30); if (g) g.push(p); else groups.push([p]) });
    groups.forEach(g => { s += poly(g.map(p => [f.X(p[0]), f.Y(p[1])]), 'var(--c2)', { sw: 2 }); g.forEach(p => s += dot(f.X(p[0]), f.Y(p[1]), 2.4, 'var(--c2)')) });
    D.Merge.forEach(p => { s += star(f.X(p[0]), f.Y(p[1]), 6, 'var(--c1)', 'merge at ' + p[0] + 'B: ' + p[1].toFixed(2)) });
    rows.forEach((r, i) => { s += '<rect x="' + (f.X(r.tokens) - 14) + '" y="12" width="28" height="' + (H - 44) + '" fill="var(--acc)" opacity="' + (i === sel ? .12 : 0) + '" data-i="' + i + '" style="cursor:pointer"><title>' + (r.tokens / 1000).toFixed(1) + 'T: merge ' + r.merge.toFixed(2) + ', decay ' + r.decay.toFixed(2) + '</title></rect>' });
    host.innerHTML = svgW(w, H, s, 'Figure 5(a) rebuilt');
    host.querySelectorAll('rect[data-i]').forEach(el => { const go = () => { sel = +el.dataset.i; refit(host) }; el.addEventListener('click', go); el.addEventListener('mouseenter', go) });
    $('f5Out').innerHTML = rows.map((r, i) => '<span' + (i === sel ? ' style="font-weight:600"' : '') + '>' + (r.tokens / 1000).toFixed(1) + 'T: merge ' + r.merge.toFixed(2) + ', decay ' + r.decay.toFixed(2) + ' (' + (r.diff >= 0 ? '+' : '') + r.diff.toFixed(2) + ')</span>').join(' · ') + '. Mean absolute gap ' + RC.fig5a_mad.toFixed(2) + ' points; the constant-LR checkpoint at the same points scores ' + Object.values(RC.fig5a_constant_at).map(v => v.toFixed(1)).join(', ') + '.';
  }
  fit(host, draw);
})();
