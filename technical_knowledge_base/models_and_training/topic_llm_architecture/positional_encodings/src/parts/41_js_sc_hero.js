// ---- Scene (top, Fig. 1): RoPE is a bank of clocks. The tiny GPT's 16 pairs (head 32, base 10,000, trained on 256 tokens; PE_DATA.presets.tiny),
// fastest on the left. Steps: one token, the 256-token training window (the shaded part is every angle a pair reached), distance 300 with plain RoPE,
// the same distance with YaRN x8 (the preset's own scaling, ROPE.yarn), and YaRN at 2,048. All angles are computed from the preset. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.PES) return;
  const { mix, lerp } = S3, { tw, la, lab, dial, wedge, hand, pt, arcPts, wl, inv, TAU } = PES;
  const P = PE_DATA.presets.tiny, n = P.dim / 2, plain = inv(P, 'plain'), yarn = inv(P, 'yarn', P.s), seen = ROPE.seenArc(P);
  const DIST = [1, P.L, 300, 300, P.L * P.s], YA = [0, 0, 0, 1, 1];
  const nFast = seen.filter(a => a >= TAU - 1e-9).length, r = .55, SP = 1.4;
  // two rows: the fast pairs in front, the slow pairs behind and raised, so the split the whole page turns on is the split between the rows
  const row = i => i < nFast ? 0 : 1, col = i => row(i) ? i - nFast : i, nr = q => q ? n - nFast : nFast;
  const c = i => { const q = row(i); return [(col(i) - (nr(q) - 1) / 2) * SP, q ? 1.95 : r + .2, q ? -1.3 : 0]; };
  function draw(R, k, e, st) {
    const Pc = R.P; R.grid(-7, 7, -2.2, 1.4, .5);
    // the distance and the method between two steps (a method change morphs the frequencies, a distance change sweeps the hands)
    const d = tw(st, e, q => DIST[q]), y = tw(st, e, q => YA[q]);
    const wA = tw(st, e, q => q === 0 ? 0 : 1), grow = st.k === 1 && st.pk === 0 && e < 1;
    let out = 0;
    for (let i = 0; i < n; i++) {
      const f = lerp(plain[i], yarn[i], y), ang = d * f, C = c(i), full = seen[i] >= TAU - 1e-9;
      const shown = grow ? Math.min(TAU, d * plain[i]) : seen[i];
      const isOut = !full && (ang % TAU) > seen[i] * (1 + 1e-9) && k >= 1; if (isOut) out++;
      const focus = tw(st, e, q => q === 2 || q === 3 ? (full ? .3 : 1) : 1);
      dial(R, C, r, { a: focus });
      wedge(R, C, r, shown, { a: wA * focus, c: full ? Pc.c1 : Pc.c3 });
      hand(R, C, r, ang, { c: isOut ? Pc.bad : full ? Pc.c1 : mix(Pc.ink, Pc.c3, .45), a: focus, w: isOut ? 3.4 : 2.6 });
      // the part of the rim no training example reached, streaming while a hand is in it
      if (isOut && k === 2) R.flow(arcPts(C, r * 1.08, seen[i], ang % TAU, 16), { c: Pc.bad, r: .04, n: 5, speed: .45, a: la(st, e, q => q === 2 ? 1 : 0) });
      const top = row(i) === 1, ly = top ? [C[0], C[1] + r, C[2]] : [C[0], 0, C[2] + .2], dy = top ? -12 : 14;
      const sl = plain[i] / f, deg = x => Math.round(x * 180 / Math.PI) + '°';
      // under a fast dial its wavelength; over a slow one its wavelength, then the angle trained and the angle now
      const t = y > .5 && sl > 1.005 ? '÷' + (sl < 9.95 ? sl.toFixed(sl < 1.995 ? 2 : 1) : Math.round(sl)) : k === 0 || full ? 'λ ' + wl(2 * Math.PI / plain[i]) : k === 1 ? deg(seen[i]) : y > .5 && sl > 1.005 ? '÷' + (sl < 9.95 ? sl.toFixed(sl < 1.995 ? 2 : 1) : Math.round(sl)) : deg(ang % TAU);
      lab(R, ly, t, { fs: 12, c: isOut ? Pc.bad : y > .5 && sl > 1.005 && !full ? Pc.c5 : Pc.mute, b: isOut || (y > .5 && !full), dy, mono: !top, wide: 1, a: focus });
    }
    lab(R, [c(0)[0] - r - .1, r + .2, 0], 'fast pairs 0 to ' + (nFast - 1), { fs: 12.5, b: 1, c: Pc.c1, al: 'right', dx: -8, wide: 1, a: tw(st, e, q => q === 2 || q === 3 ? .35 : 1) });
    lab(R, [c(nFast)[0] - r - .1, 1.95, -1.3], 'slow pairs ' + nFast + ' to ' + (n - 1), { fs: 12.5, b: 1, c: Pc.c3, al: 'right', dx: -8, wide: 1 });
    const head = ['after 1 token', 'distance 0 to 256: training', 'distance 300, plain RoPE: ' + out + ' slow hands outside', 'distance 300, YaRN ×8: none outside', 'distance 2,048, YaRN ×8: none outside'];
    lab(R, [0, 1.95 + r + .5, -1.3], head[k], { fs: 13, b: 1, c: k === 2 ? Pc.bad : Pc.ink, dy: -16, a: la(st, e, q => q === k ? 1 : 0) });
  }
  const full = { cam: [-.12, .26], bounds: [[-6.6, 0, -1.4], [6.6, 2.45, .3]] };
  const slowV = { cam: [-.1, .2], bounds: [[-6.6, .5, -1.4], [6.6, 2.45, -1.1]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · the tiny GPT\'s 16 RoPE pairs', cam: full.cam, bounds: full.bounds, aspect: .38, dur: 1700, hold: 4800, draw,
    margin: w => w < 520 ? [26, 8, 12, 8] : [40, 20, 36, 150], view: k => k === 2 || k === 3 ? slowV : full });
})();
