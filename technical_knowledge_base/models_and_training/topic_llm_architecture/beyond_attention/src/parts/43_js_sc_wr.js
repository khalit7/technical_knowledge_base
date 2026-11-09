// ---- Scene (section 3, Fig. 3): forget or overwrite. The same 12 writes as Fig. 2 (BA_WR, fixed random unit keys and values, seed 1, illustrative,
// exact arithmetic equal to src/state/state_rules.py) under linear attention, decay a = 0.9, the delta rule (beta = 1) and gated delta, then the delta
// rule with room (d_k = 16). The state is a glass plate with one bar per entry, on one scale for every rule; after each run every key is read back
// and its cosine with the value last stored under it stands on the right. Step 3 moves in close on the delta rule's 11th write ("Roxy" again). ----
(function () {
  if (!document.getElementById('stg-wr') || !window.BAS || !window.BA_WR) return;
  const { mix } = S3, { tw, la, lab, field, win } = BAS;
  const W = BAD.wr_writes, N = W.length;
  const RUN = [['linear', 8], ['decay', 8], ['delta', 8], ['delta', 8], ['gated', 8], ['delta', 16]].map(([r, d]) => Object.assign(BA_WR(d, r), { rule: r, d }));
  const NAME = { linear: 'linear: S += v kᵀ', decay: 'decay: S = 0.9 S + v kᵀ', delta: 'delta: S += (v − S k) kᵀ', gated: 'gated delta: decay, then a delta write' };
  const SM = Math.max(...RUN[0].steps.flatMap(s => s.S.flat()).map(Math.abs));
  const mean = r => { const c = r.steps[N - 1].cos, v = Object.values(c); return v.reduce((a, b) => a + b, 0) / v.length; };
  window.BA_WRS = RUN.map(r => ({ rule: r.rule, d: r.d, mean: mean(r), cos: r.steps[N - 1].cos }));
  const matv = (S, q) => S.map(row => row.reduce((s, x, j) => s + x * q[j], 0));
  const lerpM = (A, B, t) => A.map((r, i) => r.map((x, j) => x + (B[i][j] - x) * t));
  const zero = d => Array.from({ length: d }, () => Array(d).fill(0));
  // the run's state during its step: writes 1 to 12 in turn (step 3 holds write 10 and then adds write 11)
  function state(k, e) { const r = RUN[k];
    if (k === 2) { const t = win(e, .5, .95); return lerpM(r.steps[9].S, r.steps[10].S, t); }
    const u = N * win(e, .22, .85), i = Math.min(N - 1, Math.floor(u)), t = u >= N ? 1 : u - i; return lerpM(i ? r.steps[i - 1].S : zero(r.d), r.steps[i].S, t); }
  const CS = k => RUN[k].d === 16 ? .17 : .27;
  function combZ(R, x, y, vals, m, col, a, PW) { if (a <= .01) return; const cs = PW / vals.length; R.box([x, y - .045, 0], [.3, .045, PW + .12], { a, shadow: false });
    vals.forEach((v, i) => { const h = Math.max(.012, Math.abs(v) / m * .5), z = -PW / 2 + cs * (i + .5); R.box([x, v >= 0 ? y : y - .045 - h, z], [.1, h, cs * .7], { fill: col, a, shadow: false, lw: .6 }); }); }
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.2, 4.6, -2.6, 2.8, .5);
    const r = RUN[k], cs = CS(k), PW = r.d * cs, XR = 2.05;
    // a step that changes the rule fades the old state out fully before the new run grows in from empty
    if (st.pk !== st.k && e < .2) field(R, 0, .62, 0, RUN[st.pk].steps[st.pk === 2 ? 10 : N - 1].S, SM, { a: 1 - e / .2, cs: CS(st.pk), hmax: .55 });
    else field(R, 0, .62, 0, state(k, e), SM, { a: k === 2 && st.pk !== st.k ? win(e, .2, .4) : 1, cs, hmax: .55 });
    // step 3: the delta write in close-up: what the key returns now, the new value, the difference written
    const da = tw(st, e, q => q === 2 ? 1 : 0);
    if (da > .01) { const S10 = RUN[2].steps[9].S, kk = RUN[2].keys.Roxy, v = RUN[2].vals[10], sk = matv(S10, kk), d = v.map((x, i) => x - sk[i]), mm = Math.max(...v.map(Math.abs), ...sk.map(Math.abs), ...d.map(Math.abs));
      combZ(R, -PW / 2 - .75, .3, sk, mm, mix(P.paper, P.c1, .7), da, PW); combZ(R, -PW / 2 - 1.35, .3, v, mm, mix(P.paper, P.v, .7), da, PW); combZ(R, PW / 2 + .75, .3, d, mm, mix(P.paper, P.c5, .8), da, PW);
      for (let j = 0; j < 8; j += 2) { const z = -PW / 2 + cs * (j + .5); R.flow([[0, .7, z], [-PW / 2 - .75, .45, z]], { c: P.c1, a: da * .8, r: .045, n: 4, speed: .9 }); R.flow([[PW / 2 + .75, .45, z], [PW / 2 - .1, .72, z]], { c: P.c5, a: da * win(e, .4, .6) * .9, r: .05, n: 4, speed: .9 }); }
      const L2 = la(st, e, q => q === 2 ? 1 : 0);
      lab(R, [-PW / 2 - .75, .3, PW / 2], 'S k: what "Roxy" returns now', { fs: 12, b: 1, c: P.c1, dy: 18, al: 'center', a: L2 });
      lab(R, [-PW / 2 - 1.35, .3, -PW / 2], 'new value', { fs: 12, b: 1, c: P.v, dy: -16, a: L2 });
      lab(R, [PW / 2 + .75, .3, PW / 2], 'written: v − S k', { fs: 12, b: 1, c: P.c5, dy: 18, a: L2 }); }
    // read every key back after the run: one bar per word, its cosine with the value last stored under it
    const ca = (k === 2 ? 0 : 1) * (st.pk === st.k || e >= 1 ? 1 : win(e, .82, 1)) * tw(st, e, q => q === 2 ? 0 : 1);
    if (ca > .01) { const c = r.steps[N - 1].cos, ws = Object.keys(c);
      ws.forEach((u, i) => { const v = c[u], z = -1.25 + 2.5 * i / (ws.length - 1), h = Math.max(.012, Math.abs(v) * .5);
        R.box([XR, v >= 0 ? .02 : .02 - h, z], [.22, h, .16], { fill: v >= .9 ? P.good : v >= .5 ? mix(P.paper, P.c1, .7) : P.bad, a: ca, shadow: false });
        lab(R, [XR + .15, Math.max(0, v) * .5 + .02, z], u + ' ' + v.toFixed(2), { fs: 12, mono: true, al: 'left', dx: 12, c: P.ink, a: ca, grp: 'cos' }); });
      lab(R, [XR, .6, -1.35], 'mean ' + mean(r).toFixed(2), { fs: 12.5, b: 1, c: P.ink, dy: -12, a: ca, al: 'left' }); }
    const L = j => la(st, e, q => q === j ? 1 : 0);
    for (let j = 0; j < RUN.length; j++) lab(R, [0, .62, -PW / 2], NAME[RUN[j].rule] + (RUN[j].d === 16 ? ', d = 16' : ', d = 8'), { fs: 12.5, b: 1, c: P.c1, dy: -60, a: L(j) });
  }
  const full = { cam: [.45, .62], bounds: [[-1.6, 0, -1.5], [3.1, 1.2, 1.6]] };
  S3.stage({ id: 'stg-wr', list: 'sx-wr', fig: 'Fig. 3 · the same 12 writes under four rules', cam: full.cam, bounds: full.bounds, aspect: .62, dur: 2600, hold: 5200, draw, margin: BAS.margin,
    view: k => k === 2 ? { cam: [.15, .55], bounds: [[-2.9, 0, -1.3], [2.3, 1.0, 1.4]] } : full });
})();
