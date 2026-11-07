// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): parties as blocks on the floor, a held connection as a
// horizontal glass slab between them, messages as flat envelopes whose length follows their recorded size, counts as bars on white
// plinths, and the timing helpers that place a recorded event on its path at the moment the run recorded it. ----
window.STK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  const up = (p, y) => [p[0], y, p[2]];
  // a party (client, server, provider): a block with its name above it and an optional second line; o.a fades it
  function party(R, p, s, c, lab, o) { o = o || {}; const P = R.P, a = o.a == null ? 1 : o.a;
    R.box(p, s, { fill: mix(P.paper, c, o.t == null ? .24 : o.t), a, fa: o.fa });
    if (lab) R.label(up(p, s[1]), lab, { b: 1, fs: o.fs || 13, dy: -11, c: o.lc || P.ink, a: Math.max(.35, a) });
    if (o.sub) R.label(up(p, s[1]), o.sub, { fs: 12, dy: -27, c: P.mute, a: Math.max(.35, a), wide: 1, mono: o.mono }); }
  // a held connection: a horizontal glass slab from x0 to x1 at height y, centred on z, depth d
  function slab(R, x0, x1, y, z, d, c, a, o) { o = o || {}; if (a <= .01) return;
    R.glass([x0, y, z - d / 2], [x1 - x0, 0, 0], [0, 0, d], { c, a, nu: o.nu || 10, nv: o.nv || 2, th: o.th == null ? .04 : o.th });
    if (o.lab) R.label(o.at || [x0, y, z + d / 2], o.lab, { fs: o.fs || 12, b: 1, c: o.lc || c, al: o.al || 'left', dx: o.dx == null ? 4 : o.dx, dy: o.dy == null ? 14 : o.dy, a: Math.max(.3, a), grp: o.grp, wide: o.wide, mono: o.mono }); }
  // an upright glass plate standing at p (bottom centre), facing the camera, its label above
  function plate(R, p, c, a, lab, o) { o = o || {}; if (a <= .01) return; const w = o.w || .5, h = o.h || .5;
    R.glass([p[0] - w / 2, p[1], p[2]], [w, 0, 0], [0, h, 0], { c, nu: o.nu || 2, nv: o.nv || 2, a, th: .03 });
    if (o.glow) R.glow([p[0], p[1] + h / 2, p[2]], .45, { c: o.glow, a: a * .7 });
    if (lab) R.label([p[0], p[1] + h, p[2]], lab, { fs: o.fs || 12, b: 1, c: o.lc || c, dy: o.dy == null ? -9 : o.dy, a, grp: o.grp, wide: o.wide, al: o.al, dx: o.dx, mono: o.mono }); }
  // a message in flight: a flat envelope whose length follows its size in bytes (o.k world units a byte, clamped)
  function msg(R, p, bytes, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, k = o.k || .004, L = cl(bytes * k, o.min || .16, o.max || 1.3), d = o.d || .26, h = o.h || .07;
    R.box(p, [L, h, d], { fill: mix(P.paper, c, o.t == null ? .55 : o.t), a, shadow: false, lw: .8 });
    if (o.lab) R.label([p[0], p[1] + h, p[2]], o.lab, { fs: o.fs || 12, b: 1, mono: o.mono, c: o.lc || P.ink, dy: o.dy == null ? -12 : o.dy, a, al: o.al, dx: o.dx, grp: o.grp, wide: o.wide }); }
  // a count or a time as a bar on a white plinth standing on the floor, its value above it
  function bar(R, p, h, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P, w = o.w || .34, d = o.d || .34;
    R.box([p[0], 0, p[2]], [w + .12, .04, d + .12], { a, shadow: false });
    R.box([p[0], .04, p[2]], [w, Math.max(.02, h), d], { fill: mix(P.paper, c, .72), a, shadow: false, lw: .7 });
    if (o.lab) R.label([p[0], .04 + Math.max(.02, h), p[2]], o.lab, { fs: o.fs || 12, b: 1, c: o.lc || P.ink, dy: -9, a, mono: 1, wide: o.wide, grp: o.grp }); }
  // a refusal or a cut: a cross at p
  function cross(R, p, a, c, d) { const P = R.P; d = d || .18; if (a <= .01) return; c = c || P.bad;
    R.line([[p[0] - d, p[1] - d, p[2]], [p[0] + d, p[1] + d, p[2]]], { c, w: 3, a, top: 1 }); R.line([[p[0] - d, p[1] + d, p[2]], [p[0] + d, p[1] - d, p[2]]], { c, w: 3, a, top: 1 }); }
  // a token as a small upright tile with its text on it (what the client has received); bad marks a repeat
  function tile(R, p, text, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P;
    R.box(p, [o.w || .5, .3, .12], { fill: mix(P.paper, c, .35), a, shadow: false, lw: .7 });
    R.label([p[0], p[1] + .15, p[2] + .07], text, { fs: 12, b: 1, mono: 1, c: o.lc || P.ink, a, dy: 4, wide: o.wide }); }
  // timing: where a thing that leaves a at t0 and reaches b at t1 is at time t (null before it leaves or after it lands)
  function at(a, b, t0, t1, t) { if (t < t0 || t > t1) return null; return lerp3(a, b, t1 > t0 ? (t - t0) / (t1 - t0) : 1); }
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const route = (pts, n) => { const o = [pts[0]]; n = n || 10; for (let j = 1; j < pts.length; j++) for (let i = 1; i <= n; i++) o.push(lerp3(pts[j - 1], pts[j], i / n)); return o; };
  // mode chips that swap a stage's step list: el holds <button data-m>, the lists are ids prefix+mode
  function chips(el, prefix, st, onMode) { if (!el || !st) return; el.addEventListener('click', ev => { const b = ev.target.closest('button[data-m]'); if (!b) return;
      el.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
      document.querySelectorAll('ol.sx[id^="' + prefix + '"]').forEach(o => o.hidden = o.id !== prefix + b.dataset.m);
      onMode(b.dataset.m); st.list(prefix + b.dataset.m); }); }
  const ms = s => Math.round(s * 1000);
  const fmt = n => Number(n).toLocaleString('en-GB');
  return { up, party, slab, plate, msg, bar, cross, tile, at, win, route, chips, ms, fmt };
})();
