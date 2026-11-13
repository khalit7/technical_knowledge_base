// ---- Scene: Fig. 4, the path as a pipe (stg-pipe, section 5). Data: the page's twelve recorded downloads (window.NF.path.runs, three per receive
// buffer). The pipe's length is the round trip and its width the bottleneck rate, so its volume is the bandwidth-delay product; the bytes in flight
// fill the share of it that the measured goodput fills of the link; the queue at the bottleneck holds rate x (round trip at the end - smoothed
// round trip), derived from each run's own two RTT readings. ----
(function () {
  if (!document.getElementById('stg-pipe') || !window.S3 || !window.NF || !window.NFK) return;
  const { mix } = S3, { node, win, fmt } = NFK;
  const runs = NF.path.runs.filter(r => !r.error), B = [16384, 65536, 262144, 'auto'];
  // the pipe as the step text states it: the fastest run's goodput and the mean smoothed RTT, each rounded, then multiplied
  const link = Math.round(Math.max(...runs.map(r => r.goodput_mbps))), rtt = Math.round(runs.reduce((s, r) => s + r.srtt_ms, 0) / runs.length), bdp = link * 1e6 / 8 * rtt / 1000;
  const G = B.map(b => { const rs = runs.filter(r => r.rcvbuf === b), m = a => a.reduce((s, v) => s + v, 0) / a.length;
    return { b, n: rs.length, wnd: [Math.min(...rs.map(r => r.rcv_wnd)), Math.max(...rs.map(r => r.rcv_wnd))], gp: [Math.min(...rs.map(r => r.goodput_mbps)), Math.max(...rs.map(r => r.goodput_mbps))], gpm: m(rs.map(r => r.goodput_mbps)),
      pred: rs.map(r => r.rcv_wnd * 8 / (r.srtt_ms / 1000) / 1e6), end: [Math.min(...rs.map(r => r.rttcur_ms)), Math.max(...rs.map(r => r.rttcur_ms))],
      q: m(rs.map(r => Math.max(0, r.goodput_mbps * 1e6 / 8 * (r.rttcur_ms - r.srtt_ms) / 1000))) }; });
  window.NF_PIPE = { link, rtt, bdp, G };   // read by src/check_stages.mjs
  const XR = -4.25, XS = 4.0, X0 = -2.4, X1 = 2.8, L = X1 - X0, H = .62, D = .62, Y0 = .3, NC = 10;
  function draw(R, k, e) {
    const P = R.P, C = P.c1, Q = P.bad;
    R.grid(-5, 5, -1.6, 1.6, .5);
    node(R, [XR, 0, 0], [1.0, .9, 1.2], P.acc, 'client'); node(R, [XS, 0, 0], [1.1, .9, 1.2], P.c6, 'server');
    // the pipe: ten glass cells, each a tenth of the BDP
    for (let i = 0; i < NC; i++) { const x = X0 + L * (i + .5) / NC; R.box([x, Y0, 0], [L / NC - .03, H, D], { fill: P.paper, fa: .12, a: .8, shadow: false, lw: .6 }); }
    R.box([0, 0, 0], [L, Y0 - .02, .25], { a: .5 });
    if (k === 0) { R.label([0, Y0 + H, 0], 'length: one round trip, about ' + fmt(rtt) + ' ms', { fs: 12.5, b: 1, dy: -12, a: win(e, .1, .4), wide: 1 });
      R.label([0, Y0, D / 2], 'width: the bottleneck, about ' + fmt(link) + ' Mbit/s', { fs: 12.5, b: 1, dy: 22, a: win(e, .3, .6), wide: 1 });
      R.label([0, Y0 + H, 0], 'volume: BDP ≈ ' + fmt(bdp / 1000) + ' KB', { fs: 13, b: 1, c: C, dy: -32, a: win(e, .55, .9) });
      R.flow([[X1, Y0 + H / 2, 0], [X0, Y0 + H / 2, 0]], { c: C, r: .06, n: 22, speed: 1.6, a: win(e, .5, .8) }); return; }
    const g = G[k - 1], frac = Math.min(1, g.gpm / Math.max(...runs.map(r => r.goodput_mbps))), f = frac * win(e, 0, .6);
    // the bytes in flight: a tinted block from the sender's end, as long as goodput / link of the pipe
    if (f > .005) R.box([X1 - L * f / 2, Y0 + .04, 0], [L * f - .04, H - .08, D - .08], { fill: mix(P.paper, C, .55), fa: .55, shadow: false, lw: .6 });
    R.flow([[X1, Y0 + H / 2, 0], [X0, Y0 + H / 2, 0]], { c: C, r: .06, n: Math.max(3, Math.round(24 * frac)), speed: 1.6 });
    R.flow([[X0, Y0 - .12, .5], [X1, Y0 - .12, .5]], { c: P.good, r: .045, n: Math.max(2, Math.round(10 * frac)), speed: 1.6, a: .7 });
    const wl = g.b === 'auto' ? 'autotuned: window ' + fmt(g.wnd[0] / 1e6, 1) + ' to ' + fmt(g.wnd[1] / 1e6, 1) + ' MB' : fmt(g.b / 1024) + ' KB buffer: window ' + (g.wnd[0] === g.wnd[1] ? fmt(g.wnd[0]) : fmt(g.wnd[0]) + ' to ' + fmt(g.wnd[1])) + ' B';
    R.label([0, Y0 + H, 0], R.W < 520 ? (g.b === 'auto' ? 'autotuned window' : fmt(g.b / 1024) + ' KB buffer') : wl, { fs: 12.5, b: 1, c: C, dy: -12 });
    R.label([0, Y0, D / 2], R.W < 520 ? fmt(100 * frac) + '% of the pipe' : 'measured ' + fmt(g.gp[0], 1) + ' to ' + fmt(g.gp[1], 1) + ' Mbit/s · ' + fmt(100 * frac) + '% of the pipe', { fs: 12.5, b: 1, dy: 22, a: win(e, .4, .8) });
    if (frac < .98) R.label([X0 + L * (1 - frac) / 2, Y0 + H / 2, 0], 'idle', { fs: 12.5, c: P.mute, a: win(e, .5, .9) });
    // the queue at the bottleneck (the home line, next to the client): rate x extra round trip, in the pipe's own volume (footprint 4 x the pipe's)
    if (frac > .95) { const hq = g.q / bdp * L / 4 * win(e, .5, 1);
      R.box([X0 - .72, 0, 0], [1.0, .02, 1.0], { a: .5, shadow: false });
      R.box([X0 - .72, .02, 0], [.96, Math.max(.01, hq), .96], { fill: mix(P.paper, Q, .55), fa: .6, shadow: false, lw: .7 });
      R.label([X0 - .72, .02 + hq, 0], 'queue ≈ ' + fmt(g.q / 1000) + ' KB', { fs: 12.5, b: 1, c: Q, dy: R.W < 520 ? -30 : -12, a: win(e, .7, 1) });
      R.label([X0 - .72, 0, .5], 'round trip at the end: ' + fmt(g.end[0]) + ' to ' + fmt(g.end[1]) + ' ms', { fs: 12, c: Q, dy: 30, a: win(e, .75, 1), wide: 1 }); }
  }
  S3.stage({ id: 'stg-pipe', list: 'sx-pipe', fig: 'Fig. 4 · the window fills the pipe, or the queue', cam: [.14, .5], bounds: [[-4.7, 0, -.8], [4.7, 2.0, .9]], aspect: .42, dur: 1700, hold: 4800, draw,
    margin: w => w < 520 ? [26, 8, 22, 8] : [34, 16, 34, 16],
    view: () => innerWidth < 520 ? { cam: [.45, .72] } : null });   // phone: the path turned into depth, so the parts are larger
})();
