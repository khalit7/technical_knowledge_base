// ---- Scene: Fig. 1, the hero (stg-hero): the test layers as glass nets stacked cheapest first, a change rising through them, and every bug
// found on this page caught at the lowest layer that can catch it. Plate widths are the pyramid's proportions (illustrative, as the step text says);
// the bugs, their numbers and the 23 mutants (16 killed by the weak suite, 7 surviving at 100% coverage) are the page's recorded runs (window.TQ). ----
(function () {
  if (!document.getElementById('stg-hero') || !window.TQK || !window.TQ) return;
  const { mix, lerp } = S3, { lab, block, plate, win, seg, along } = TQK;
  const TQ = window.TQ, C = TQ.calc, M = TQ.mut;
  const weak = M.tests.filter(t => t.suite === 'weak').map(t => t.id);
  const killed = M.mutants.map(m => m.by.some(b => weak.indexOf(b) >= 0));
  TQN.hero = { mutN: M.mutants.length, killed: killed.filter(x => x).length, survived: killed.filter(x => !x).length };
  // bottom (cheapest, every change) to top (dearest, merge or nightly)
  const L = [['Static checks', 3.8], ['Unit and property', 3.25], ['Contract and fakes', 2.7], ['Integration', 2.15], ['End-to-end', 1.6], ['Evals: model quality', 1.05]];
  const Y = i => .7 + i * .62, D = w => w * .5;
  const SRC = [0, .32, 0];
  // the three bugs: the layer that caught each and where it rises
  const BUG = [[1, -1.15, .25, 'chunker: short documents vanish'], [2, -.1, -.2, 'model output: one repair, then a clean failure'], [3, .75, .15, 'search: [2] on PostgreSQL, [1, 2] wanted']];
  const path = (x, z, y) => seg(SRC, [x, y, z], 14);
  function draw(R, k, e) {
    const P = R.P; R.grid(-3.5, 3.5, -2, 2, .5);
    const caught = i => (k === 1 && i === 1) || (k === 2 && i === 2) || (k === 3 && i === 3) || (k === 4 && i >= 4) || (k === 5 && i === 1);
    // the change on the floor, and the nets above it
    block(R, [0, 0, 0], [.8, .32, .55], P.c2, 'a change', { t: .45, dy: 14, ph: 1, amin: .6 });
    L.forEach(([nm, w], i) => {
      const hot = caught(i), a = k === 0 ? Math.min(1, e * 1.6 + .2) : hot ? 1 : k === 5 ? (i > 1 ? .14 : .3) : k === 4 ? .28 : .5;
      const col = hot ? (i >= 4 ? P.c4 : P.acc) : P.c1;
      plate(R, 0, Y(i), 0, w, D(w), col, a, { nu: Math.max(2, Math.round(w * 1.6)), nv: 3 });
      lab(R, [w / 2 + .05, Y(i), 0], nm, { al: 'left', dx: 8, fs: hot ? 13 : 12.5, b: hot, c: hot ? col : P.ink, a: Math.max(.5, a), ph: 1 });
    });
    // 1. a change meets the cheapest check first: dots rise through every net
    if (k === 0) R.flow(seg(SRC, [0, Y(5) + .05, 0], 20), { c: P.c2, r: .07, n: 18, speed: 1.2, a: Math.min(1, e * 2) });
    // 2 to 4. each bug rises until the first net that can catch it
    BUG.forEach(([li, x, z, txt], j) => {
      const s = j + 1; if (k < s || k === 5) return;
      const pts = path(x, z, Y(li) - .12), t = k === s ? win(e, 0, .8) : 1, p = along(pts, t), now = k === s;
      if (now) R.flow(pts.slice(0, Math.max(2, Math.round(t * pts.length))), { c: P.bad, r: .06, n: 10, speed: 1.3, a: .8 });
      R.glow(p, .26, { c: P.bad, a: now ? .9 : .35 }); R.ball(p, .11, { c: P.bad, a: now ? 1 : .45 });
      if (now || k === 4) lab(R, [-L[li][1] / 2 - .1, p[1], 0], txt, { al: 'right', dx: -8, fs: 12, b: now, c: now ? P.bad : P.mute, a: now ? win(e, .5, 1) : .7, wide: 1 });
    });
    // 6. testing the nets: the 23 planted bugs against the weak suite's unit net (100% coverage)
    if (k === 5) {
      const n = M.mutants.length, yU = Y(1);
      M.mutants.forEach((m, i) => {
        const x = -1.45 + 2.9 * i / (n - 1), z = (i % 2 ? .35 : -.35), ok = killed[i];
        const end = ok ? yU - .12 : yU + .42, pts = seg([x * .3, .32, z * .3], [x, end, z], 10), t = win(e, (i % 6) * .05, .7 + (i % 6) * .05), p = along(pts, t);
        if (!ok) R.flow(pts.slice(0, Math.max(2, Math.round(t * pts.length))), { c: P.bad, r: .045, n: 6, speed: 1.2, a: .7 });
        R.ball(p, ok ? .08 : .09, { c: ok ? P.mute : P.bad, a: ok ? .85 : 1 });
        if (!ok) R.glow(p, .2, { c: P.bad, a: .6 });
      });
      lab(R, [-1.5, Y(1) + .42, 0], TQN.hero.survived + ' slip through: wrong values', { al: 'right', dx: -6, fs: 12.5, b: 1, c: P.bad, a: win(e, .6, 1), ph: 1 });
      lab(R, [-1.5, Y(1) - .14, 0], TQN.hero.killed + ' caught', { al: 'right', dx: -6, fs: 12.5, b: 1, c: P.mute, a: win(e, .6, 1), ph: 1 });
    }
  }
  const full = { cam: [.42, .36], bounds: [[-2.6, 0, -1.1], [3.8, Y(5) + .2, 1.1]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · every bug on this page, at the lowest net that caught it', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 1700, hold: 4600, draw,
    margin: TQK.margin,
    view: k => k === 1 || k === 5 ? { cam: [.42, .36], bounds: [[-3.0, 0, -1.1], [3.2, Y(2) + .1, 1.1]] } : k === 2 || k === 3 ? { cam: [.42, .36], bounds: [[k === 3 ? -4.0 : -3.2, 0, -1.1], [3.4, Y(4), 1.1]] } : null });   // step 4 leaves room on the left for the long search label
})();
