// ---- Scene: Fig. 4, the OpenTelemetry path (stg-otel), drawn from the collector configuration this page validated (src/demo/otelcol.yaml):
// the otlp receiver, then per pipeline memory_limiter, tail_sampling (traces only) and batch, then one exporter per store. The sampling counts
// are the replay of both policies on the incident phase's 657 trace IDs (DEMO.sampling, section 10). Dot counts are proportional to those
// counts; the layout is a schematic. ----
(function () {
  if (!document.getElementById('stg-otel') || !window.OBS3) return;
  const { mix } = S3, { party, gate, bar, lab, win, seg, poly, arcPts, fmt } = OBS3, SM = DEMO.sampling;
  const SV = [['chat-api', -.9], ['retrieval', .9]], XS = -5.3, XSDK = -4.4, XREC = -2.5, XML = -1.2, XTS = .3, XBA = 1.7, XST = 4.5;
  const LN = [['traces', -1.4, 'c3', 'Tempo', 'otlp/tempo'], ['metrics', 0, 'c1', 'Prometheus', 'remote write'], ['logs', 1.4, 'c5', 'Loki', 'otlphttp/loki']];
  const boring = SM.incident_traces - SM.interesting, keptBoring = SM.tail_kept - SM.tail_kept_interesting;
  function draw(R, k, e) {
    const P = R.P, C = n => P[n];
    R.grid(-6.4, 5.6, -3.8, 3.2, .5);
    // the collector: a dashed outline on the floor
    R.quad([[XREC - .4, 0, -2.3], [XBA + .7, 0, -2.3], [XBA + .7, 0, 2.3], [XREC - .4, 0, 2.3]], { fill: mix(P.paper, P.c2, .05), fa: .5, ea: .55, dash: [5, 4], a: k >= 1 && k <= 3 ? 1 : .5 });
    lab(R, [XBA + .7, 0, 2.3], 'OpenTelemetry Collector', { b: 1, fs: 13, c: P.c2, dy: 16, al: 'right', a: k >= 1 && k <= 3 ? 1 : .5 });
    // 1. services with their SDK
    const sa = k === 0 || k === 4 ? 1 : .35;
    SV.forEach(([nm, z]) => { party(R, [XS, 0, z], [1.0, .7, 1.0], P.c1, nm, { a: sa, grp: 'svc' });
      lab(R, [XSDK, 0, z + .5], 'SDK', { b: 1, fs: 12.5, c: P.c4, dy: 14, a: Math.max(.35, sa) });
      gate(R, XSDK, z, P.c4, sa, null, { d: 1.0, h: .8, glow: k === 4 ? P.c4 : null, gl: .6 * win(e, 0, .4) }); });
    // OTLP from the SDKs to the receiver, three signals
    if (k <= 1 || k === 4) SV.forEach(([, z]) => LN.forEach(([, lz, c], j) => { if (k === 4 && j) return;
      R.flow(seg([XSDK + .1, .3 + j * .15, z], [XREC - .1, .3 + j * .15, z * .6 + lz * .4], 14), { c: C(c), r: .06, n: 5, speed: 1.4, a: k === 4 ? .5 : 1 }); }));
    lab(R, [XREC, 0, 2.0], 'otlp receiver', { b: 1, fs: 12.5, c: P.c2, dy: 14, a: k === 1 ? 1 : .45 });
    gate(R, XREC, 0, P.c2, k === 1 ? .8 : .3, null, { d: 4.0, h: .6, nu: 6, glow: k === 1 ? P.c2 : null, gl: .5 });
    if (k === 1) lab(R, [XREC, 0, 2.0], ':4317 gRPC · :4318 HTTP', { mono: 1, fs: 12, c: P.mute, dy: 31, wide: 1 });
    // 2. memory_limiter first, on every pipeline
    if (k !== 2) lab(R, [XML, .6, -2.0], 'memory_limiter', { b: 1, fs: 12.5, c: P.bad, dy: -10, a: k === 1 ? 1 : .45 });
    gate(R, XML, 0, P.bad, k === 1 ? .8 : .3, null, { d: 4.0, h: .6, nu: 6, glow: k === 1 ? P.bad : null, gl: .4 * win(e, .3, .7) });
    if (k === 1) lab(R, [XML, .6, -2.0], 'refuse above 80%', { mono: 1, fs: 12, c: P.bad, dy: -27, wide: 1, a: win(e, .3, .7) });
    // the three pipelines through the collector
    LN.forEach(([nm, z, c], j) => { const a = k === 1 || k === 3 ? 1 : k === 2 ? (j ? .25 : 1) : .35;
      R.line([[XREC, .02, z], [XST - .7, .02, z]], { c: C(c), w: 2, a: a * .6 });
      lab(R, [XBA + .2, .02, z], nm, { fs: 12, b: 1, c: C(c), al: 'left', dx: 4, dy: -8, a: Math.max(.35, a), wide: 1 });
      if (k === 1 || k === 3) R.flow(seg([XREC + .1, .25, z], [k === 3 ? XST - .7 : XBA + .6, .25, z], 24), { c: C(c), r: .06, n: 9, speed: 1.4, a: k === 3 ? 1 : win(e, .2, .5) }); });
    // 3. tail_sampling, traces only: every slow or failed trace kept, 5% of the rest
    const tz = LN[0][1], ta = k === 2 ? 1 : .4;
    gate(R, XTS, tz, P.acc, ta, 'tail_sampling', { d: 1.1, h: .8, glow: k === 2 ? P.acc : null, gl: .5 });
    if (k === 2) { const pre = seg([XML + .1, .35, tz], [XTS - .1, .35, tz], 12), post = seg([XTS + .1, .35, tz], [XBA + .6, .35, tz], 12), sc = 1 / 36;
      R.flow(pre, { c: P.mute, r: .055, n: Math.round(boring * sc), speed: 1.3 }); R.flow(pre, { c: P.bad, r: .075, n: Math.max(2, Math.round(SM.interesting * sc)), speed: 1.3 });
      R.flow(post, { c: P.bad, r: .075, n: Math.max(2, Math.round(SM.tail_kept_interesting * sc)), speed: 1.3, a: win(e, .2, .5) }); R.flow(post, { c: P.mute, r: .055, n: Math.max(1, Math.round(keptBoring * sc)), speed: 1.3, a: win(e, .2, .5) });
      R.flow(arcPts(R, [XTS, .4, tz - .2], [XTS + .5, .02, -2.0], .15, 14), { c: P.mute, r: .05, n: 6, speed: .9, a: win(e, .1, .4) });
      lab(R, [XTS + .5, 0, -2.0], 'dropped ' + fmt(SM.incident_traces - SM.tail_kept), { fs: 12, c: P.mute, dy: 14, wide: 1, a: win(e, .3, .6) });
      const u = .0022, z = -3.2, a = win(e, .3, .7);
      bar(R, [1.3, 0, z], SM.incident_traces, u, P.mute, a, { name: 'traces in' });
      bar(R, [2.2, 0, z], SM.tail_kept, u, P.acc, a, { name: 'kept' });
      bar(R, [3.1, 0, z], SM.tail_kept_interesting, u, P.bad, a, { name: 'slow or failed', lab: SM.tail_kept_interesting + ' of ' + SM.interesting }); }
    // batch, then one exporter per store
    if (k !== 2) lab(R, [XBA, .6, -2.0], 'batch', { b: 1, fs: 12.5, c: P.c6, dy: -10, a: k === 1 || k === 3 ? 1 : .45 });
    gate(R, XBA, 0, P.c6, k === 1 || k === 3 ? .8 : .3, null, { d: 4.0, h: .6, nu: 6, glow: k === 3 ? P.c6 : null, gl: .4 });
    LN.forEach(([nm, z, c, st, ex]) => { party(R, [XST, 0, z], [1.2, .55, .9], C(c), st, { a: k === 3 ? 1 : .35, grp: 'st' });
      if (k === 3) lab(R, [XST - .9, .02, z], ex, { mono: 1, fs: 12, c: P.mute, al: 'right', dx: -4, dy: 14, wide: 1 }); });
    // 5. head sampling instead: decided in the SDK at the start, from the trace ID
    if (k === 4) { const u = .0022, z = 2.5, a = win(e, .3, .7);
      bar(R, [-5.6, 0, z], SM.incident_traces, u, P.mute, a, { name: 'traces in' });
      bar(R, [-4.7, 0, z], SM.head10_kept, u, P.c4, a, { name: 'kept (10%)' });
      bar(R, [-3.8, 0, z], SM.head10_kept_interesting, u, P.bad, a, { name: 'slow or failed', lab: SM.head10_kept_interesting + ' of ' + SM.interesting }); }
  }
  const full = { cam: [.2, .7], bounds: [[-6, 0, -3.0], [5.3, .8, 2.8]] };
  S3.stage({ id: 'stg-otel', list: 'sx-otel', fig: 'Fig. 4 · the OpenTelemetry path', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1500, hold: 4600, draw,
    margin: w => w < 520 ? [22, 8, 14, 8] : [30, 16, 22, 16],
    // on a phone (under 520 px) the camera looks along the pipeline, as Fig. 1 does, so the long band fills the tall card (the close views keep their angle)
    view: k => { const v = desk(k); return innerWidth < 520 && !v ? { cam: [1.5708, .78], bounds: full.bounds } : v; } });
  function desk(k) { return k === 2 ? { cam: [.25, .62], bounds: [[-1.6, 0, -3.8], [3.6, 1.5, -.6]] }
      : k === 4 ? { cam: [.3, .62], bounds: [[-6.2, 0, -1.6], [-2.0, 1.5, 3.2]] } : null; }
})();
