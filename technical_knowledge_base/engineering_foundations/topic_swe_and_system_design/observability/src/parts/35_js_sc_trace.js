// ---- Scene: Fig. 2, a trace as nested spans across two processes (stg-trace). The waterfall lifted into depth: time along x, one lane per
// service (chat-api in front, retrieval behind), a child stacked on its parent. Steps 1 to 3 build the normal phase's typical trace
// (DEMO.highlight.typical), step 4 rescales to the incident's slow trace (DEMO.highlight.slow), step 5 moves in on its CLIENT span. Every start,
// duration, kind, ID and attribute is the recorded span; the traceparent value is the one retrieval logged on receipt (DEMO.xlogs). ----
(function () {
  if (!document.getElementById('stg-trace') || !window.OBS3) return;
  const { mix, lerp } = S3, { lab, win, arcPts, trace, span, depths, fmt } = OBS3;
  // height = nesting depth within the span's own service (retrieval's SERVER span stands on its lane; the arc shows its parent in chat-api)
  const lane = T => { const d = depths(T), m = {}; T.sp.forEach((s, i) => m[s[1]] = Math.min(m[s[1]] == null ? 99 : m[s[1]], d[i])); return d.map((v, i) => v - m[T.sp[i][1]]); };
  const TY = trace(DEMO.highlight.typical), SL = trace(DEMO.highlight.slow), DY = lane(TY), DS = lane(SL);
  const X0 = -4.6, XW = 9.2, ZL = { 'chat-api': 1.1, retrieval: -1.1 }, H = .34, GAP = .06;
  const showAt = n => n === 'POST /v1/chat' ? 0 : n === 'GET /search' || n === 'vector index lookup' ? 2 : 1;
  const TPR = JSON.parse(DEMO.xlogs[SL.id].find(l => l.indexOf('"retrieval"') > 0)).traceparent_received;
  const ms = v => v >= 100 ? fmt(v) + ' ms' : v >= 10 ? v.toFixed(1) + ' ms' : v.toFixed(1) + ' ms';
  function draw(R, k, e) {
    const P = R.P, slowT = k >= 3, t = k === 3 ? e : slowT ? 1 : 0;
    const END = lerp(TY.sp[0][4], SL.sp[0][4], t), xs = v => X0 + v / END * XW;
    R.grid(-5.4, 5.4, -2.4, 2.6, .5);
    // the lanes
    Object.entries(ZL).forEach(([nm, z]) => { R.quad([[X0 - .2, .005, z - .6], [X0 + XW + .2, .005, z - .6], [X0 + XW + .2, .005, z + .6], [X0 - .2, .005, z + .6]], { fill: mix(P.paper, nm === 'retrieval' ? P.c3 : P.c1, .1), fa: .7, ea: .35, a: k === 4 ? .4 : 1 });
      lab(R, [X0 + XW + .2, .02, z], nm, { b: 1, fs: 13, al: 'left', dx: 8, c: nm === 'retrieval' ? P.c3 : P.c1, grp: 'lane', a: k === 4 ? .5 : 1 }); });
    // the time ruler along the front edge
    const tick = END > 800 ? 500 : 100;
    for (let v = 0; v <= END + 1; v += tick) { const x = xs(v); R.line([[x, .01, 1.72], [x, .01, 1.88]], { c: P.mute, w: 1.2 }); if (k !== 4) lab(R, [x, 0, 1.9], v + (v ? '' : ' ms'), { mono: 1, fs: 12, c: P.mute, dy: 12 }); }
    R.line([[X0, .01, 1.8], [X0 + XW, .01, 1.8]], { c: P.mute, w: 1.2, a: k === 4 ? .4 : 1 });
    // the spans: the typical trace fades out as the slow one fades in during step 4
    [[TY, DY, 1 - t], [SL, DS, t]].forEach(([T, D, ta]) => { if (ta <= .01) return;
      T.sp.forEach((s, i) => { const from = showAt(s[0]), arr = k < 3 ? (k > from ? 1 : k === from ? win(e, .1 + .12 * (i % 6), .45 + .12 * (i % 6)) : 0) : 1;
        const a = ta * arr; if (a <= .01) return; const focus = k === 4 ? s[0] === 'GET retrieval /search' : k === 1 ? from === 1 : k === 2 ? from === 2 : true;
        const x0 = xs(s[3]), w = Math.max(.05, xs(s[3] + s[4]) - x0), y = D[i] * (H + GAP), z = ZL[s[1]], hot = T === SL && (s[0] === 'vector index lookup' || s[0] === 'GET /search' || s[0] === 'GET retrieval /search');
        const c = hot ? P.bad : s[1] === 'retrieval' ? P.c3 : P.c1;
        R.box([x0 + w / 2, y, z], [w, H, .8], { fill: mix(P.paper, c, focus ? .55 : .3), a: a * (focus ? 1 : .35), shadow: y < .05, lw: .7 });
        const show = k === 4 ? s[0] === 'GET retrieval /search' : (k === from || (k === 3 && (hot || s[0] === 'model call (simulated)' || i === 0)));
        if (show && ta > .5) lab(R, [x0 + Math.min(w / 2, .5), y + H, z], s[0] + ' · ' + ms(s[4]), { fs: 12, b: focus ? 1 : 0, c: hot ? P.bad : P.ink, dy: -9, a, grp: 'sp', mono: 0 }); }); });
    // 3. the traceparent crosses from the CLIENT span to retrieval's SERVER span
    if (k === 2) { const c = span(TY, 'GET retrieval /search'), sv = span(TY, 'GET /search'), a = [xs(c[3]) + .05, DY[3] * (H + GAP) + H, ZL['chat-api'] - .2], b = [xs(sv[3]) + .05, DY[4] * (H + GAP) + H, ZL.retrieval + .2];
      R.flowArc(a, b, .9, { c: P.acc, r: .09, n: 5, speed: 1.4, top: 1 });
      lab(R, R.arcPt(a, b, .9, .5), 'traceparent', { mono: 1, b: 1, fs: 12.5, c: P.acc, dy: -14, a: win(e, .2, .6), grp: 'sp' }); }
    // 5. the CLIENT span's own fields, up close
    if (k === 4) { const c = span(SL, 'GET retrieval /search'), x = c[6], p = [xs(c[3] + c[4]) + .15, DS[3] * (H + GAP) + H / 2, ZL['chat-api']];
      const rows = [x.kind + ' span ' + x.id, 'parent ' + SL.sp[0][6].id + ' (the root)', 'server.port ' + x.attrs['server.port'] + ' · status ' + x.attrs['http.response.status_code'], 'traceparent received:', TPR.slice(0, 35), TPR.slice(35)];
      const q = [X0 + .1, 0, 2.35]; rows.forEach((r, i) => lab(R, q, r, { mono: 1, fs: 12.5, al: 'left', dx: 0, dy: 10 + i * 18, c: i >= 3 ? P.acc : P.ink, a: win(e, .15 + i * .08, .4 + i * .08) }));
      const sv = span(SL, 'GET /search'), b = [xs(sv[3]) + .05, DS[4] * (H + GAP) + H, ZL.retrieval + .2];
      R.flowArc([xs(c[3]) + .05, p[1] + H / 2, p[2] - .2], b, .7, { c: P.acc, r: .08, n: 5, speed: 1.2, top: 1, a: .8 }); }
  }
  const full = { cam: [.1, .7], bounds: [[-5.2, 0, -1.7], [4.8, .8, 1.9]] };
  S3.stage({ id: 'stg-trace', list: 'sx-trace', fig: 'Fig. 2 · one trace, two processes', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1500, hold: 4600, draw,
    margin: w => w < 520 ? [20, 8, 14, 8] : [30, 90, 18, 16],
    // on a phone (under 520 px) the camera looks along the time axis, as Fig. 1 does, so the long band fills the tall card (the close views keep their angle)
    view: k => { const v = k === 2 ? { cam: [.5, .42], bounds: [[-4.9, 0, -1.6], [-3.7, 1.7, 1.6]] } : k === 4 ? { cam: [.15, .5], bounds: [[-4.8, 0, -1.2], [2.4, .9, 4.0]] } : null;
      return innerWidth < 520 && !v ? { cam: [1.5708, .78], bounds: full.bounds } : v; } });
})();
