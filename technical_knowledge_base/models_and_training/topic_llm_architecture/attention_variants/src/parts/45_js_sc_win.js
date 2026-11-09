// ---- Scene (section 4, Fig. 5): how far back the last token can see, layer by layer. The running sequence (AVK.tokens, 226 tokens) along each
// layer's plate, the 6 layers as a staircase (layer 1 in front, layer 6 at the back, so every plate stays in view); lit: the positions that can
// influence the last token after that layer (reachability, a calculation: l x (W - 1) for l local layers, everything once a global layer has run).
// Steps 1-3 every layer local (Mistral 7B v0.1's design); steps 4-5 layers 3 and 6 global (the tiny GPT's swa64_g3 pattern), the all-local reach
// kept as a dashed edge. W from the chips; not attention weights. ----
(function () {
  if (!document.getElementById('stg-win') || !window.AVS || !window.AVK) return;
  const { mix } = S3, { tw, la, lab } = AVS, n = AVK.tokens.length, q = n - 1, NL = 6;
  let W = 16;
  const X = p => -5 + p * 10 / q, Y = l => .08 + (l - 1) * .3, Z = l => 1.55 - (l - 1) * .62, PD = .46;
  const reach = (l, inter) => { if (inter && l >= 3) return q; return Math.min(q, l * (W - 1)); };
  function plate(R, l, R0, a, P, glob, ghost) {
    if (a <= .01) return; const y = Y(l), z = Z(l);
    R.box([0, y, z], [10.3, .05, PD], { fill: glob ? mix(P.paper, P.acc, .14) : P.paper, a, shadow: false, lw: .7 });
    if (R0 > 0) { const x0 = X(q - R0), x1 = X(q), yt = y + .052; R.quad([[x0, yt, z - PD / 2], [x1, yt, z - PD / 2], [x1, yt, z + PD / 2], [x0, yt, z + PD / 2]], { fill: mix(P.paper, P.acc, .8), a, ec: P.acc, ea: .9 }); }
    if (ghost != null && ghost < q) { const x0 = X(q - ghost), yt = y + .056; R.line([[x0, yt, z - PD / 2], [x0, yt, z + PD / 2]], { c: P.ink, w: 2, a: a * .8, dash: [4, 3] }); }
  }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.8, 6.2, -2.4, 2.4, .5);
    const shown = k === 0 ? 1 : k === 1 ? 2 : NL, it = tw(st, e, s => s >= 3 ? 1 : 0), inter = k >= 3;
    for (let l = 1; l <= NL; l++) { const on = l <= shown, grow = (k === 0 && l === 1) || (k === 1 && l === 2) || (k === 2 && l > 2) ? e : 1;
      const rl = reach(l, false), ri = reach(l, true), r = on ? (inter ? rl + (ri - rl) * (k === 3 ? e : 1) : rl * grow) : 0;
      plate(R, l, Math.round(r), on ? 1 : .18, P, inter && l % 3 === 0 && it > .5, inter ? rl : null); }
    // the last token's query, behind the top layer
    const qp = [X(q) + .35, Y(NL) + .45, Z(NL)];
    R.glow(qp, .42, { c: P.q, a: .5 }); R.ball(qp, .14, { c: P.q });
    lab(R, qp, 'last token', { fs: 12.5, b: 1, c: P.q, dy: -16 });
    // flows: in step 1 the window streams into the query; then information climbs the stack one window per layer
    if (k === 0) R.flowArc([X(q - W / 2), Y(1) + .06, Z(1)], qp, .5, { c: P.acc, a: e, r: .06, n: 9 });
    if (k >= 1 && k <= 2) for (let l = 2; l <= shown; l++) R.flow([[X(q - reach(l, false)), Y(l - 1) + .06, Z(l - 1)], [X(q - reach(l, false) + W - 1), Y(l) + .06, Z(l)]], { c: P.acc, a: .8 * e, r: .05, n: 5 });
    if (k === 4) { // relay: a token at the all-local edge climbs every layer one window at a time; through the global layer 3 any token arrives in one hop
      const R6 = reach(NL, false), pts = []; for (let l = 1; l <= NL; l++) pts.push([X(q - R6 + (l - 1) * (W - 1)), Y(l) + .07, Z(l)]);
      pts.push(qp); R.flow(pts, { c: P.ink, a: .4 + .4 * e, r: .06, n: 14, speed: 1.6 });
      R.flow([[X(8), Y(1) + .07, Z(1)], [X(8), Y(3) + .07, Z(3)], qp], { c: P.c2, a: e, r: .065, n: 12, speed: 1.6 }); }
    // labels: layer numbers on the left, the reach of the top shown layer, the global layers
    for (let l = 1; l <= NL; l++) { const g = inter && l % 3 === 0; lab(R, [X(0) - .2, Y(l), Z(l)], 'layer ' + l + (g ? ' · global' : ''), { fs: 12, b: g ? 1 : 0, c: g ? P.acc : P.mute, al: 'right', dx: -6, grp: 'ly', a: l <= shown ? 1 : .35 }); }
    [...new Set([st.pk, k])].forEach(s => { const al = la(st, e, z => z === s ? 1 : 0); if (al <= .01 || s == null || s > 2) return;
      const top = s === 0 ? 1 : s === 1 ? 2 : NL, r = reach(top, false);
      lab(R, [X(q - r), Y(top) + .06, Z(top)], 'reach ' + top + ' × (W − 1) = ' + r + (r >= q ? ', the whole text' : ' of ' + n), { fs: 12.5, b: 1, c: P.acc, al: 'right', dx: -8, dy: -12, a: al }); });
    const l3 = la(st, e, s => s >= 3 ? 1 : 0);
    if (reach(NL, false) < q) lab(R, [X(q - reach(NL, false)), Y(NL) + .06, Z(NL)], 'all-local edge: ' + reach(NL, false), { fs: 12.5, b: 1, c: P.ink, dy: -14, a: l3 });
    lab(R, [X(q), Y(1), Z(1) + PD / 2], 'W = ' + W + ' · ' + n + '-token running sequence', { fs: 12, c: P.mute, al: 'right', dy: 18, wide: 1 });
  }
  const st = S3.stage({ id: 'stg-win', list: 'sx-win', fig: 'Fig. 5 · how far back the last token can see', cam: [.18, .62], bounds: [[-5.6, 0, -1.9], [5.6, 2.0, 1.9]], aspect: .55, dur: 1500, hold: 4800, draw, margin: w => w < 520 ? [22, 8, 26, 8] : [30, 18, 30, 110] });
  const fill = () => document.querySelectorAll('#sx-win [data-l]').forEach(x => { const l = +x.dataset.l; x.textContent = l ? Math.min(q, l * (W - 1)) : W; });
  AVS.chips(document.getElementById('av-win-w'), v => { W = +v; fill(); st && st.draw(); }); fill();
})();
