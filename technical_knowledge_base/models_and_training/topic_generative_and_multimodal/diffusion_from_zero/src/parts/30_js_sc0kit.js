// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js), all on the two-moons toy of section 5's closed block:
// its data (DZM.moons), its trained noise-prediction network (DZM.net, run live in the browser for arrows) and the recorded sampler
// runs of window.DZSC (src/runs/make_scene_data.mjs, the same sampler code, asserted equal to moons/sampler_ref.json).
// A point (x, y) of the toy lies on a floor plate as world (cx + x s, h, cz - y s): "up" in the data is away from the camera. ----
window.DZK = (function () {
  if (!window.S3 || !window.DZM || !window.DZSC) return null;
  const S = .4;                                         // world units per data unit: a plate of side 2.6 holds |x|, |y| up to 3.25
  const de = b64 => { const s = atob(b64), a = new Float32Array(s.length); for (let i = 0; i < s.length; i++) a[i] = (s.charCodeAt(i) - 128) * DZSC.q; return a; };
  const cache = {}, dec = (k, b) => cache[k] || (cache[k] = de(b));
  const D = DZM.moons(300, 21);                         // the data set the closed block's animation uses
  const at = (c, x, y, h) => [c[0] + cl(x, -3.2, 3.2) * S, h == null ? .05 : h, c[2] - cl(y, -3.2, 3.2) * S];
  function cl(v, a, b) { return Math.max(a, Math.min(b, v)) }
  // a glass plate lying on the floor, centred at c, side w, with a title under it
  function plate(R, c, w, col, a, ttl, sub, o) {
    o = o || {}; if (a <= .01) return; const P = R.P;
    R.glass([c[0] - w / 2, (c[1] || 0) + .02, c[2] + w / 2], [w, 0, 0], [0, 0, -w], { c: col || P.c6, a: a * .75, nu: 8, nv: 8, th: .02 });
    const an = R.p([c[0], c[1] || 0, c[2] + w / 2 + .05]); if (an[0] < 30 || an[0] > R.W - 30 || an[1] < 0 || an[1] > R.H - 40) return;   // a plate whose title would sit off the canvas keeps no title
    if (ttl) R.label([c[0], c[1] || 0, c[2] + w / 2 + .05], ttl, { fs: 12.5, b: 1, dy: 13, c: o.tc || P.ink, a: Math.max(o.minA == null ? .4 : o.minA, a) });
    if (sub) R.label([c[0], c[1] || 0, c[2] + w / 2 + .05], sub, { fs: 12, mono: 1, dy: 30, c: P.mute, a: Math.max(o.minA == null ? .4 : o.minA, a) });
  }
  // a cloud of points X (flat x, y pairs) on a plate centred at c; col(i) gives each point's colour; every: draw one in every n
  function cloud(R, c, X, col, a, o) {
    o = o || {}; if (a <= .01) return; const n = X.length / 2, ev = o.every || 1, r = o.r || .045, grow = o.grow == null ? 1 : o.grow;
    for (let i = 0; i < n; i += ev) { const t = grow >= 1 ? 1 : Math.max(0, Math.min(1, (grow - i / n * .6) / .4)); if (t <= 0) continue;
      R.ball(at(c, X[2 * i], X[2 * i + 1], o.h), r, { c: typeof col === 'function' ? col(i) : col, a: a * t }); }
  }
  // closed-form noising: x_t = sqrt(abar) x0 + sqrt(1 - abar) eps, one fixed eps per point (the same eps at every t)
  const E = (() => { const r = DZM.rng(41), e = new Float64Array(600); for (let i = 0; i < 600; i++) e[i] = r.g(); return e })();
  const ab = t => t <= 0 ? 1 : DZM.abar('linear', t);
  function noised(t) { const k = 'n' + t; if (cache[k]) return cache[k]; const a = ab(t), X = new Float64Array(600);
    for (let i = 0; i < 600; i++) X[i] = Math.sqrt(a) * D.X[i] + Math.sqrt(1 - a) * E[i]; return cache[k] = X; }
  // the trained network's noise guess at points X (flat pairs) for timestep t (1..1000), class c (2: no label), guidance w
  function epsAt(X, t, c, w) { const N = DZM.nets(), n = X.length / 2, out = new Float64Array(2 * n), tmp = new Float64Array(2 * n), a = DZM.abar('linear', t);
    DZM.guided(N.eps, X, n, Math.log(a / (1 - a)) / 12, c, w || 0, out, tmp); return out; }
  const seg = (a, b, n) => { const p = []; for (let i = 0; i <= n; i++) p.push(S3.lerp3(a, b, i / n)); return p; };
  const arcPts = (R, a, b, h, n) => { const p = []; for (let i = 0; i <= (n || 20); i++) p.push(R.arcPt(a, b, h, i / (n || 20))); return p; };
  // labels on a phone: the stage text names what an unlabelled thing is
  const margin = w => w < 520 ? [12, 8, 30, 8] : [16, 14, 34, 14];   // room at the bottom for plate titles above the stage's hint
  const f2 = v => (v < 0 ? '−' : '') + Math.abs(v).toFixed(2), pc = v => (Math.round(v * 1000) / 10).toFixed(1) + '%';
  return { S, de, dec, D, at, plate, cloud, noised, ab, epsAt, seg, arcPts, margin, f2, pc, E };
})();
