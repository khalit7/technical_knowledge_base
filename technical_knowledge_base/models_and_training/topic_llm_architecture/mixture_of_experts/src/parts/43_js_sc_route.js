// ---- Scene (section 2, Fig. 3): eight real tokens through one router. The bar field is the recorded router scores of tokens 1 to 8 of the
// running sequence (rows experts, columns tokens; MXD.runs.<run>.seq.scores64_b64, softmax or sigmoid as the run used), the chosen pairs are
// the recorded top 2 (with the bias run's bias already applied), the stacks the resulting load per expert, and the combine labels the recorded gates. ----
(function () {
  if (!document.getElementById('stg-rt') || !window.MXS) return;
  const { D, M, ec, la, lab, routing } = MXS, { mix } = S3, $ = id => document.getElementById(id);
  const R8 = ['moe8', 'none', 'bias', 'sbias'].filter(k => D.runs[k] && D.runs[k].seq && D.runs[k].seq.E === 8);
  const st0 = { run: R8[0], lay: 0 }, NT = 8, E = 8;
  let T = null;
  function data() { const tk = routing(st0.run, st0.lay, NT), load = Array(E).fill(0), slot = [];
    tk.forEach((t, j) => t.top.forEach(e => { slot.push({ j, e, n: load[e] }); load[e]++; }));
    return T = { tk, load, slot, busy: Math.max(...load), idle: load.filter(v => !v).length }; }
  // experts are columns (x), tokens are rows (z); each expert's stack stands behind its column
  const X = e => (e - (E - 1) / 2) * .78, Z = j => (j - (NT - 1) / 2) * .56 + .55, XT = -3.9, XR = -3.25, ZS = -2.95, C = .24;
  function draw(R, k, e, st) {
    const P = R.P, d = T || data(); R.grid(-4.6, 3.8, -3, 3.2, .5);
    const L = f => la(st, e, f);
    // tokens and the router plate
    d.tk.forEach((t, j) => { R.ball([XT, .25, Z(j)], .14, { c: P.acc });
      lab(R, [XT, .25, Z(j)], MXS.tok(t.piece), { al: 'right', fs: 12.5, b: 1, dx: -12, c: P.acc, grp: 'tok' });
      lab(R, [X(E - 1) + .35, .1, Z(j)], t.w1.toFixed(2) + ' + ' + (1 - t.w1).toFixed(2), { al: 'left', mono: true, fs: 12, dx: 8, c: P.ink, a: L(kk => kk === 5 ? 1 : 0), wide: 1 }); });
    const ga = L(kk => kk <= 1 ? 1 : .25);
    R.glass([XR, .06, Z(0) - .3], [0, 0, Z(NT - 1) - Z(0) + .6], [0, .5, 0], { c: P.c1, a: ga, nu: 8, nv: 3 });
    lab(R, [XR, .56, Z(0) - .3], 'router 256 × 8', { fs: 12.5, b: 1, dy: -12, c: P.c1, a: L(kk => kk <= 1 ? 1 : 0) });
    // the score field: one bar per token and expert
    if (k >= 1) d.tk.forEach((t, j) => t.sc.forEach((v, ex) => {
      const chosen = t.top.includes(ex), a = k === 1 ? 1 : chosen ? 1 : .12, hh = Math.max(.015, v * 1.1 * (k === 1 ? e : 1));
      R.box([X(ex), 0, Z(j)], [.42, hh, .36], { fill: k === 1 ? mix(P.paper, ec(ex), .35 + .65 * v) : chosen ? ec(ex) : P.paper, a, shadow: false, lw: .6 }); }));
    if (k === 1) d.tk.forEach((t, j) => R.flow([[XT, .25, Z(j)], [XR, .3, Z(j)], [X(E - 1), .3, Z(j)]], { c: P.c1, a: e, r: .04, n: 9, speed: 1.4 }));
    // the experts: a label at the front of each column, a stack behind it, one cube per assignment
    for (let ex = 0; ex < E; ex++) {
      R.quad([[X(ex) - .2, .002, ZS - .2], [X(ex) + .2, .002, ZS - .2], [X(ex) + .2, .002, ZS + .2], [X(ex) - .2, .002, ZS + .2]], { fill: P.soft, ec: ec(ex), lw: 1.2, a: .9 });
      lab(R, [X(ex), 0, Z(NT - 1) + .4], 'E' + ex, { fs: 12.5, b: 1, dy: 12, c: ec(ex) });
    }
    if (k >= 3) d.slot.forEach(s => { const ap = k === 3 ? Math.min(1, e * 2.2 - s.n * .2) : 1;
      if (ap > 0) R.box([X(s.e), s.n * C, ZS], [.38, C * .9, .36], { fill: ec(s.e), a: ap, shadow: s.n === 0, lw: .7 }); });
    if (k === 3) d.slot.forEach(s => { const sc = d.tk[s.j].sc[s.e]; R.flow([[X(s.e), sc * 1.1, Z(s.j)], [X(s.e), s.n * C + .3, ZS]], { c: ec(s.e), a: .9, r: .045, n: 6, speed: 1.6 }); });
    if (k >= 3) for (let ex = 0; ex < E; ex++) lab(R, [X(ex), d.load[ex] * C, ZS], String(d.load[ex]), { mono: true, fs: 12.5, b: d.load[ex] === d.busy, dy: -11, c: d.load[ex] === d.busy ? P.ink : P.mute, a: L(kk => kk >= 3 ? 1 : 0) });
    // the mean load as a glass sheet over the stacks
    const ma = L(kk => kk === 4 ? 1 : kk === 5 ? .3 : 0);
    if (ma > .01) { R.glass([X(0) - .3, 2 * C, ZS - .25], [X(E - 1) - X(0) + .6, 0, 0], [0, 0, .5], { c: P.ink, a: ma * .7, nu: 8, nv: 1, th: .01 });
      lab(R, [X(E - 1) + .3, 2 * C, ZS], 'mean 2 · busiest ' + d.busy + ' · idle ' + d.idle, { al: 'left', fs: 12.5, b: 1, dx: 10, c: P.ink, a: L(kk => kk === 4 ? 1 : 0), wide: 1 }); }
    // combine: each token's two experts send their outputs home
    if (k === 5) d.slot.forEach(s => { const t = d.tk[s.j], g = s.e === t.top[0] ? t.w1 : 1 - t.w1;
      R.flowArc([X(s.e), s.n * C + .2, ZS], [XT, .3, Z(s.j)], .8, { c: ec(s.e), a: .3 + .6 * g, r: .03 + .04 * g, n: Math.round(3 + 8 * g), speed: 1.3 }); });
  }
  const st = S3.stage({ id: 'stg-rt', list: 'sx-rt', fig: 'Fig. 3 · eight recorded tokens through one router', cam: [.18, .84], bounds: [[-4.4, 0, -3.3], [4.1, 1.2, 3.1]], aspect: .66, dur: 1500, hold: 4800, draw,
    
    margin: w => w < 520 ? [14, 10, 24, 10] : [20, 110, 30, 80], onStep: () => live() });
  function live() { const d = T || data(), el = $('rt-live'); if (el) el.innerHTML = '<b>' + M.esc(D.runs[st0.run].short) + ', layer ' + (st0.lay + 1) + '</b>: loads ' + d.load.join(', ') + ' (E0 to E7); busiest expert ' + d.busy + ' of 16 assignments, max / mean ' + (d.busy / 2).toFixed(1) + ', ' + d.idle + ' idle.'; }
  const re = () => { T = null; data(); st.list('sx-rt'); live(); };
  M.seg($('rt-run'), R8.map(k => [k, D.runs[k].short]), st0.run, m => { st0.run = m; re(); });
  M.seg($('rt-lay'), Array.from({ length: D.runs[R8[0]].seq.top.length }, (_, i) => [String(i), 'layer ' + (i + 1)]), '0', m => { st0.lay = +m; re(); });
  live();
})();
