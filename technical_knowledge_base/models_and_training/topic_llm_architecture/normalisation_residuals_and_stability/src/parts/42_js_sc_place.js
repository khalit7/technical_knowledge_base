// ---- Scene (section 2, Fig. 2): one sub-layer drawn four ways, post-norm, pre-norm, sandwich and output norm, one row each from front to back. In
// each row the stream runs left (input) to right (output) and the branch F runs behind it, adding back at a +. The norm is a blue glass plate,
// on the main path (post-norm) or on the branch (the other three). The last step sends the gradient back down each main path; its thinning
// through post-norm's plate is drawn, not measured (the measured gradient by block is the chart beside section 2's third part). ----
(function () {
  if (!document.getElementById('stg-place') || !window.NSK) return;
  const { mix } = S3, { tw, la, lab, plate } = NSK;
  // one row per placement, front to back; in each row the stream runs left (input) to right (output) along the front, the branch F behind it
  const ROW = [
    { z: 2.7, name: 'post-norm', f: 'x = Norm(x + F(x))', who: '2017 Transformer, BERT', main: [1.75], br: [] },
    { z: .9, name: 'pre-norm', f: 'x = x + F(Norm(x))', who: 'GPT-2 to Llama 4, Qwen3, DeepSeek', main: [], br: [-1.45] },
    { z: -.9, name: 'sandwich', f: 'x = x + Norm(F(Norm(x)))', who: 'Gemma 2, 3 and 4', main: [], br: [-1.45, .35] },
    { z: -2.7, name: 'output norm', f: 'x = x + Norm(F(x))', who: 'OLMo 2 and 3', main: [], br: [.35] }];
  const XI = -3.1, XO = 3.0, XA = -2.1, XP = 1.05, XF = -.55, DZ = .42, YB = .28;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4, 4, -3.6, 3.6, .5);
    ROW.forEach((r, i) => {
      const a = tw(st, e, q => q === 4 || q === i ? 1 : .18), al = la(st, e, q => q === i ? 1 : 0), ZS = r.z + DZ, ZB = r.z - DZ;
      R.box([(XI + XO) / 2, 0, ZS], [XO - XI, .09, .34], { fill: mix(P.paper, P.ink, .14), a: Math.max(a, .3), shadow: false });
      const path = [[XA, .1, ZS], [XA, YB, ZB], [XP, YB, ZB], [XP, .1, ZS]];
      R.line(path, { c: P.mute, w: 1.5, a: a * .8 });
      R.box([XF, 0, ZB], [.9, .6, .55], { fill: mix(P.paper, P.mute, .12), a });
      R.ball([XP, .14, ZS], .12, { c: mix(P.paper, P.ink, .35), a });
      const fw = tw(st, e, q => q === i ? 1 : 0);
      if (fw > .01) { R.flow([[XI, .13, ZS], [XO, .13, ZS]], { c: P.c5, a: fw, r: .06, n: 12, speed: 1 }); R.flow(path, { c: P.c5, a: fw, r: .055, n: 8, speed: 1 }); }
      r.main.forEach(x => plate(R, x, .02, ZS, .55, .62, { c: P.c1, a }));
      r.br.forEach(x => plate(R, x, .02, ZB, .6, .66, { c: P.c1, a }));
      lab(R, [XI, .05, ZS], r.name, { fs: 13, b: 1, c: P.ink, al: 'right', dx: -8, a: Math.max(.4, a), grp: 'rows' });
      lab(R, [XF, .6, ZB], 'F', { fs: 13, b: 1, c: P.ink, dy: -12, a: Math.max(.3, a) });
      lab(R, [-.4, 0, ZS + .17], r.f, { fs: 13, b: 1, mono: true, c: P.c1, dy: 18, a: al });
      lab(R, [-.4, 0, ZS + .17], r.who, { fs: 12, c: P.mute, dy: 36, a: al });
      lab(R, [(r.main[0] || r.br[r.br.length - 1]), .66, r.main.length ? ZS : ZB], 'norm', { fs: 12.5, b: 1, c: P.c1, dy: -12, a: al });
      // backward (step 5): the gradient comes down every main path, right to left; post-norm's passes through its norm
      const g = tw(st, e, q => q === 4 ? 1 : 0);
      if (g > .01) {
        if (r.main.length) { R.flow([[XO, .2, ZS + .05], [r.main[0], .2, ZS + .05]], { c: P.bad, a: g, r: .065, n: 4, speed: .9 }); R.flow([[r.main[0], .2, ZS + .05], [XI, .2, ZS + .05]], { c: P.bad, a: g * .55, r: .035, n: 6, speed: .9 }); }
        else R.flow([[XO, .2, ZS + .05], [XI, .2, ZS + .05]], { c: P.bad, a: g, r: .065, n: 12, speed: .9 });
      }
    });
    const gl = la(st, e, q => q === 4 ? 1 : 0);
    lab(R, [XI + .4, .2, ROW[0].z + DZ], 'rescaled by every norm', { fs: 12.5, b: 1, c: P.bad, al: 'left', dy: 18, a: gl });
    lab(R, [XI + .4, .2, ROW[1].z + DZ], 'identity path', { fs: 12.5, b: 1, c: P.bad, al: 'left', dy: 18, a: gl });
    lab(R, [XO, .2, ROW[0].z + DZ], '\u2190 the gradient', { fs: 12.5, b: 1, c: P.bad, al: 'right', dy: 18, a: gl });
  }
  const full = { cam: [.25, .66], bounds: [[-4.2, 0, -3.3], [3.3, .8, 3.3]] };
  S3.stage({ id: 'stg-place', list: 'sx-place', fig: 'Fig. 2 · where the norm sits in one sub-layer', cam: full.cam, bounds: full.bounds, aspect: .55, dur: 1400, hold: 4600, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 110],
    view: k => k < 4 ? { cam: [.3, .55], bounds: [[-3.6, 0, ROW[k].z - 1.0], [3.3, .8, ROW[k].z + 1.3]] } : full });
})();
