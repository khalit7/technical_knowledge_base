// ---- Shared pieces for this page's 3D scenes (renderer v2, 25_js_s3.js): a module drawn as Ousterhout draws it (a block whose top face is
// its interface, tinted red, and whose height is what it hides), labels shown only while their anchor is on the canvas, and small path helpers. ----
window.CDK = (function () {
  if (!window.S3) return null;
  const { mix, lerp3, cl } = S3;
  // a label only when its anchor is on the canvas: a close view would otherwise pile the names of things it leaves out along its edges
  function lab(R, p, text, o) { if (text == null) return; const q = R.p(p); if (q[2] <= 0 || q[0] < -4 || q[0] > R.W + 4 || q[1] < -4 || q[1] > R.H + 4) return; R.label(p, text, o); }
  // a module: centre of its bottom face p, top face w by d (w from the parameters it takes), height h (from the lines it hides);
  // the top face is a thin red plate, the interface every caller must learn
  function module(R, p, w, h, d, c, a, o) { o = o || {}; if (a <= .01) return; const P = R.P;
    R.box(p, [w, Math.max(.02, h), d], { fill: mix(P.paper, c, o.t == null ? .42 : o.t), a, fa: o.fa, shadow: o.shadow });
    R.box([p[0], p[1] + Math.max(.02, h), p[2]], [w + .04, .05, d + .04], { fill: mix(P.paper, P.bad, .78), a, shadow: false, lw: .7 }); }
  const win = (e, a, b) => cl((e - a) / (b - a), 0, 1);
  const seg = (a, b, n) => { const o = []; n = n || 12; for (let i = 0; i <= n; i++) o.push(lerp3(a, b, i / n)); return o; };
  const poly = (ps, n) => { const o = [ps[0]]; for (let i = 1; i < ps.length; i++) seg(ps[i - 1], ps[i], n || 8).slice(1).forEach(p => o.push(p)); return o; };
  const arcPts = (R, a, b, h, n) => { const o = []; n = n || 20; for (let i = 0; i <= n; i++) o.push(R.arcPt(a, b, h, i / n)); return o; };
  // an arrow along the floor (an import or an "implements" edge): a line with a head
  function arrow(R, a, b, c, al, o) { o = o || {}; if (al <= .01) return; R.line([a, b], { c, w: o.w || 2, a: al, head: o.head == null ? 7 : o.head, dash: o.dash }); }
  // the page's concern colours (RD.CON holds CSS variable names) as palette keys
  const ccol = (P, v) => P[String(v).replace(/^--/, '')] || P.mute;
  return { lab, module, win, seg, poly, arcPts, arrow, ccol };
})();
