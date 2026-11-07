// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): parties as blocks on the floor, stages of the service as glass plates
// the request passes through, counts as bars on white plinths, a clock in milliseconds, and a timed replay helper for the recorded runs. ----
window.BAK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  const fmt = v => Math.round(v).toLocaleString('en-US');
  // a label only when its anchor is on the canvas: the renderer clamps labels inside the canvas, so names of things a close view leaves out
  // would otherwise pile up along its edges
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // a party: a block with its name above it (and an optional second line); o.a fades it when the step is about something else
  function party(R, p, s, c, txt, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .28 : o.t), a, fa: o.fa });
    if (txt) lab(R, up(p, s[1] + (o.ly || 0)), txt, { b: 1, fs: o.fs || 13, dy: -11, c: o.lc || P.ink, a: Math.max(.35, a), wide: o.wide, grp: o.grp });
    if (o.sub) lab(R, up(p, s[1] + (o.ly || 0)), o.sub, { fs: 12, dy: -27, c: o.sc || P.mute, a: Math.max(.35, a), wide: 1 }); }
  // a stage of the pipeline: an upright glass plate across the request's path (in the y-z plane at x), label above it
  function stagePlate(R, x, z, c, a, txt, o) { o = o || {}; if (a <= .01) return; const d = o.d || 1.1, h = o.h || 1.0, y0 = o.y0 == null ? .04 : o.y0;
    R.glass([x, y0, z - d / 2], [0, 0, d], [0, h, 0], { c, nu: o.nu || 3, nv: o.nv || 4, a, th: .03 });
    if (o.glow) R.glow([x, y0 + h / 2, z], .6, { c: o.glow, a: a * o.gl });
    if (txt) lab(R, [x, y0 + h, z], txt, { fs: o.fs || 12.5, b: 1, c: o.lc || c, dy: o.dy == null ? -10 : o.dy, a: Math.max(o.amin == null ? .3 : o.amin, a), grp: o.grp, wide: o.wide, al: o.al, dx: o.dx }); }
  // an upright glass plate facing the camera's side (x-y plane)
  function plate(R, p, c, a, txt, o) { o = o || {}; if (a <= .01) return; const w = o.w || .62, h = o.h || .78;
    R.glass([p[0] - w / 2, p[1], p[2]], [w, 0, 0], [0, h, 0], { c, nu: o.nu || 2, nv: o.nv || 4, a, th: .03 });
    if (txt) lab(R, [p[0], p[1] + h, p[2]], txt, { fs: o.fs || 12, b: 1, c: o.lc || c, dy: -9, a, grp: o.grp, wide: o.wide, al: o.al, dx: o.dx, mono: o.mono }); }
  // a count as a bar on a white plinth, its number above it
  function bar(R, p, n, unit, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, w = o.w || .5, d = o.d || .5, h = Math.max(.02, n * unit);
    R.box([p[0], 0, p[2]], [w + .16, .05, d + .16], { a, shadow: false });
    if (n > 0) R.box([p[0], .05, p[2]], [w, h, d], { fill: mix(P.paper, c, .7), a, shadow: false });
    lab(R, [p[0], .05 + (n > 0 ? h : 0), p[2]], o.lab == null ? String(n) : o.lab, { fs: o.fs || 13, b: 1, c: o.lc || (n ? P.ink : P.mute), dy: -10, a, mono: 1, grp: o.grp, wide: o.wide }); }
  // a refusal or a loss: a cross at p
  function cross(R, p, a, c, d) { const P = R.P; d = d || .2; if (a <= .01) return; c = c || P.bad;
    R.line([[p[0] - d, p[1] - d, p[2]], [p[0] + d, p[1] + d, p[2]]], { c, w: 3, a, top: 1 }); R.line([[p[0] - d, p[1] + d, p[2]], [p[0] + d, p[1] - d, p[2]]], { c, w: 3, a, top: 1 }); }
  // a tick: something finished
  function tick(R, p, a, c) { const P = R.P; if (a <= .01) return; c = c || P.good;
    R.line([[p[0] - .16, p[1], p[2]], [p[0] - .04, p[1] - .12, p[2]], [p[0] + .2, p[1] + .16, p[2]]], { c, w: 3, a, top: 1 }); }
  // a ring on the floor (an event loop), optional flowing dots around it
  function ring(R, c, r, col, a, o) { o = o || {}; const pts = []; for (let i = 0; i <= 48; i++) { const t = i / 48 * Math.PI * 2; pts.push([c[0] + r * Math.cos(t), c[1], c[2] + r * Math.sin(t)]) }
    R.line(pts, { c: col, w: o.w || 2, a, dash: o.dash });
    if (o.flow) R.flow(pts, { c: col, r: .06, n: o.n || 10, speed: o.speed || 1.4, a }); return pts; }
  const path = (pts, t) => { const n = pts.length - 1, s = cl(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(s)); return lerp3(pts[i], pts[i + 1], s - i); };
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  // a polyline through several points (each leg cut into pieces, for flows)
  const poly = (ps, n) => { const o = [ps[0]]; for (let i = 1; i < ps.length; i++) seg(ps[i - 1], ps[i], n || 8).slice(1).forEach(p => o.push(p)); return o; };
  // mode chips that swap a stage's step list: el holds <button data-m>, lists are ids prefix+mode
  function chips(el, prefix, st, onMode) { if (!el) return; el.addEventListener('click', ev => { const b = ev.target.closest('button[data-m]'); if (!b) return;
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      el.parentNode.querySelectorAll('ol.sx[id^="' + prefix + '"]').forEach(o => o.hidden = o.id !== prefix + b.dataset.m);
      onMode(b.dataset.m); st.list(prefix + b.dataset.m); }); }
  // a recorded run replayed in stretches: step k plays the run's clock from W[k][0] to W[k][1] ms while its tween runs (e from 0 to 1)
  const clock = (W, k, e) => W[k][0] + (W[k][1] - W[k][0]) * e;
  // where a thing is at time t, given keyframes [[time, point], ...] sorted by time; it travels to each new point along a low arc over fl ms
  function at(R, kf, t, fl, h) { let j = 0; while (j + 1 < kf.length && kf[j + 1][0] <= t) j++; const k0 = kf[j];
    if (j === 0 || t < k0[0]) return k0[1]; const u = cl((t - k0[0]) / Math.max(1e-6, fl), 0, 1); return u >= 1 ? k0[1] : R.arcPt(kf[j - 1][1], k0[1], h == null ? .5 : h, u); }
  return { up, fmt, lab, party, stagePlate, plate, bar, cross, tick, ring, path, win, arcPts, seg, poly, chips, clock, at };
})();
