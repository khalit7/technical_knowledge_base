// ---- Scene: Fig. 1 (stg-hero): one server under rising load. Steps 1 to 4 are the M/M/1 model at 50, 80, 90 and 95% busy (mean number waiting
// Lq = rho^2 / (1 - rho), mean time in the system W = S / (1 - rho)); step 5 is Experiment 1's measured run at 95% busy (CPD.hockey[6]): the number
// inside by Little's law (achieved rate x mean latency) and the mean split into the measured service time and the rest. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.CPK) return;
  const { mix, lerp } = S3, { lab, party, req, seg, win } = CPK;
  const RHO = [.5, .8, .9, .95];
  const H = CPD.hockey[6];   // the run aimed at 85%, measured at 94.7% busy
  const meas = { util: H.util, inside: H.achieved_rate == null ? H.rate * H.mean / 1000 : H.achieved_rate * H.mean / 1000, mean: H.mean, p50: H.p50, S: H.mean_service_ms };
  meas.lq = meas.inside - meas.util; meas.ws = meas.mean / meas.S;
  const lq = k => k < 4 ? RHO[k] * RHO[k] / (1 - RHO[k]) : meas.lq, ws = k => k < 4 ? 1 / (1 - RHO[k]) : meas.ws, rho = k => k < 4 ? RHO[k] : meas.util;
  window.CAP_HERO = { RHO, lq: [0, 1, 2, 3, 4].map(lq), ws: [0, 1, 2, 3, 4].map(ws), meas };   // read by src/check_stages.mjs
  const SRV = [0, 0, 0], SRC = [-4.5, 0, 0], OUT = [1.9, 0, 0], BAR = [2.9, 0, 0], U = .068, SLOTS = 20;
  const slot = i => [-1.05 - (i % 10) * .27, 0, (i < 10 ? -.17 : .17)];
  function draw(R, k, e) {
    const P = R.P; R.grid(-5.4, 4.4, -2.2, 2.2, .5);
    const pk = k === 0 ? 0 : k - 1, q = lerp(k === 0 ? 0 : lq(pk), lq(k), e), w = lerp(k === 0 ? 1 : ws(pk), ws(k), e), r = rho(k);
    // users and the arrival stream: dot density follows the load
    party(R, SRC, [.8, .6, 1.0], P.c5, 'users', { sub: 'random arrivals', t: .25 });
    R.flow(seg([SRC[0] + .4, .12, 0], [slot(Math.min(SLOTS - 1, Math.max(0, Math.round(q) - 1)))[0] - .2, .12, 0], 14), { c: P.c2, r: .065, n: 1 + 2.6 * r, speed: 1.1 });
    // the queue: empty slots dashed-faint so the frame is full from the first step; filled slots are the mean number waiting
    for (let i = 0; i < SLOTS; i++) { const full = i < Math.floor(q), part = !full && i < q ? q - Math.floor(q) : 0;
      req(R, slot(i), full || part ? mix(P.paper, P.bad, .7) : P.paper, full ? 1 : part ? .35 + .6 * part : .12, .22); }
    lab(R, [slot(6)[0], 0, .3], (k < 4 ? 'Lq = ' : 'measured: ') + q.toFixed(1) + ' waiting', { fs: 12.5, b: 1, c: P.bad, dy: 16 });
    // the server, one request in service
    party(R, SRV, [1.4, 1.1, 1.3], P.c1, 'one server', { sub: k < 4 ? Math.round(r * 100) + '% busy' : (r * 100).toFixed(1) + '% busy (measured)', t: .3 });
    R.glow([SRV[0], .55, SRV[2]], .7, { c: P.c1, a: .25 + .5 * r });
    // answers leaving
    R.flow(seg([SRV[0] + .75, .2, 0], [OUT[0], .2, 0], 8), { c: P.c1, r: .06, n: 1 + 2.6 * r, speed: 1.1 });
    // W as a bar: the work S (blue) and the waiting (orange); a faint outline for 20 S so the scale is fixed from the start
    R.box([BAR[0], 0, BAR[2]], [.96, .05, .96], { shadow: false });
    R.box([BAR[0], .05, BAR[2]], [.8, 20 * U, .8], { fill: P.paper, a: .1, shadow: false });
    R.box([BAR[0], .05, BAR[2]], [.8, U, .8], { fill: mix(P.paper, P.c1, .8), shadow: false });
    R.box([BAR[0], .05 + U, BAR[2]], [.8, Math.max(.001, (w - 1) * U), .8], { fill: mix(P.paper, P.bad, .75), shadow: false });
    lab(R, [BAR[0], .05 + w * U, BAR[2]], 'W = ' + (Math.abs(w - Math.round(w)) < .05 ? Math.round(w) : w.toFixed(1)) + 'S', { fs: 13, b: 1, mono: 1, c: P.bad, dy: -20 });
    lab(R, [BAR[0] - .45, .05, BAR[2] + .4], 'work S', { fs: 12, c: P.c1, b: 1, al: 'right', dx: -6, dy: 2, wide: 1 });
    if (k === 4) lab(R, [BAR[0], .05 + w * U, BAR[2]], 'mean ' + Math.round(meas.mean) + ' ms for ' + meas.S.toFixed(1) + ' ms of work', { fs: 12, c: P.mute, dy: -37, a: win(e, .3, .7), wide: 1 });
  }
const narrow = () => (document.getElementById('stg-hero').clientWidth || 999) < 520;   // a phone: turn the long axis into depth and look down, so the scene fills the tall card
  const phone = { cam: [1.05, .95], bounds: [[-5.0, 0, -1.0], [3.5, 1.5, 1.0]] };
  const full = { cam: [.42, .6], bounds: [[-5.0, 0, -1.0], [3.5, 1.5, 1.0]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · the same work, more and more waiting', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1500, hold: 4400, draw,
    margin: w => w < 520 ? [24, 8, 12, 8] : [36, 16, 16, 16],
    view: k => narrow() ? phone : k === 4 ? { cam: [.5, .55], bounds: [[-4.0, 0, -1.0], [3.6, 1.6, 1.0]] } : full });
})();
