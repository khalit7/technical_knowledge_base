// ---- Scene: Fig. 1, the hero (stg-hero): the recorded delegated call. Parties: alice, her agent (an MCP client), the authorization server, the MCP
// server and the mail API; token A (blue, audience the MCP server) and token B (green, audience the mail API) travel between them as glass plates.
// Renderer v2. Every value drawn comes from window.AUTHDATA (the lab's recordings of 5 October 2026): lifetimes, scopes, audiences, the refusal text,
// the claims the mail API saw. The thief in the last step is the page's what-if (stated in the step list), not a recording. ----
(function () {
  if (!document.getElementById('stg-hero') || !window.S3 || !window.AUK || !window.AUTHDATA) return;
  const D = AUTHDATA, { mix } = S3, { up, party, person, tok, refuse, arcAt } = AUK;
  const R0 = D.flows.R[0].body, life = R0.expires_in + ' s', scA = R0.scope;
  const strict = D.sdk.phases.C_strict.upstream_body.error_description;
  const saw = D.sdk.phases.D.upstream_body.upstream_believes_caller_is;
  const AL = [-4.7, 0, 1.5], AG = [-3.4, 0, .3], AS = [-.3, 0, -2.1], MS = [0, 0, .7], MA = [3.6, 0, .2], TH = [-1.7, 0, 2.9];
  function draw(R, k, e) {
    const P = R.P, A = P.c1, B = P.c3, BAD = P.bad, on = (...ks) => ks.indexOf(k) >= 0 || k === 5 ? 1 : .3;
    R.grid(-5.4, 4.6, -3.0, 3.6, .5);
    person(R, AL, P.c5, 'alice', { a: on(0) });
    party(R, AG, [1.1, .7, .9], P.acc, 'agent (MCP client)', { a: on(0, 1) });
    party(R, AS, [1.4, .9, 1.0], P.c4, 'authorization server', { a: on(0, 3) });
    party(R, MS, [1.3, .8, 1.0], P.c6 || P.c1, 'MCP server', { a: on(1, 2, 3, 4) });
    party(R, MA, [1.3, .75, 1.0], P.c5, 'mail API', { a: on(2, 4) });
    const ag = [AG[0] + .45, .75, AG[2]], as = [AS[0], .9, AS[2] + .4], ms = [MS[0] - .55, .8, MS[2]], ms2 = [MS[0] + .55, .8, MS[2]], ma = [MA[0] - .55, .75, MA[2]];
    const labA = 'A · aud MCP server · ' + scA + ' · ' + life, labB = 'B · aud mail API · ' + saw.scope + ' · act MCP server';
    if (k === 0) {
      R.flowArc([AL[0] + .2, .9, AL[2] - .2], [ag[0] - .9, .6, ag[2] + .2], .3, { c: P.c5, r: .06, n: 6, speed: 1.2, a: .8 });
      R.flowArc(ag, as, .6, { c: P.c5, r: .065, n: 9, speed: 1.5 });
      R.flowArc([as[0] - .3, .7, as[2]], [ag[0], .55, ag[2] - .3], .45, { c: A, r: .075, n: 9, speed: 1.3 });
      R.label(arcAt(R, ag, as, .6, .45), 'code + PKCE verifier, resource = MCP server', { fs: 12, c: P.c5, b: 1, dy: -22, al: 'right', dx: 10, wide: 1 });
      const p = arcAt(R, [as[0] - .3, .1, as[2]], [AG[0] + .95, 0, AG[2] + .55], .5, e); tok(R, p, A, 1, labA, { al: 'left', dx: 26 });
    }
    // token A rests beside the agent once issued
    if (k >= 1 && k !== 5) tok(R, [AG[0] + .95, 0, AG[2] + .55], A, k === 1 ? .35 : .25);
    if (k === 1) {
      R.flowArc(ag, ms, .5, { c: A, r: .075, n: 10, speed: 1.6 });
      tok(R, arcAt(R, [AG[0] + .9, 0, AG[2] + .55], [MS[0] - .95, 0, MS[2] + .4], .5, e), A, 1, labA);
      R.glow(up(MS, .9), .7, { c: P.good, a: .7 * e });
      R.label(up(MS, 0), 'checks signature, iss, aud, exp, scope', { fs: 12, b: 1, c: P.good, dy: 22, a: e });
    }
    if (k === 2) {
      const tip = [MA[0] - 1.1, .75, MA[2]];
      R.flow([ms2, tip], { c: BAD, r: .07, n: 7, speed: 1.4 });
      tok(R, arcAt(R, [MS[0] + .95, 0, MS[2] + .3], [MA[0] - 1.15, 0, MA[2] + .4], .3, e), A, 1, 'the same A, forwarded');
      refuse(R, [MA[0] - .9, .45, MA[2] + .5], e);
      R.label(up(MA, 0), '401 "' + strict + '"', { fs: 12.5, b: 1, c: BAD, dy: 22, a: e });
    }
    if (k === 3) {
      R.flowArc([ms[0] + .2, .8, ms[2] - .4], [as[0] + .3, .8, as[2]], .5, { c: A, r: .07, n: 8, speed: 1.4 });
      R.flowArc([as[0] + .55, .6, as[2]], [ms2[0] - .2, .7, ms2[2] - .4], .5, { c: B, r: .075, n: 9, speed: 1.3 });
      tok(R, arcAt(R, [MS[0] - .6, .05, MS[2] - .4], [AS[0] - .45, .05, AS[2] + .65], .5, e * .9), A, 1, 'A', { w: .4, h: .5, grp: 'x' });
      tok(R, arcAt(R, [MS[0] - .1, .05, MS[2] - .4], [AS[0] + .05, .05, AS[2] + .65], .5, e * .9), P.c4, 1, 'signed by the MCP server', { w: .3, h: .4, grp: 'x', wide: 1 });
      tok(R, arcAt(R, [AS[0] + .6, .05, AS[2] + .6], [MS[0] + .95, 0, MS[2] - .35], .5, e), B, e, labB);
    }
    if (k === 4) {
      R.flowArc(ms2, ma, .45, { c: B, r: .075, n: 10, speed: 1.6 });
      tok(R, arcAt(R, [MS[0] + .95, 0, MS[2] + .35], [MA[0] - 1.05, 0, MA[2] + .45], .45, e), B, 1, labB);
      R.glow(up(MA, .85), .7, { c: P.good, a: .7 * e });
      R.label(up(MA, 0), '200 · sub ' + saw.sub + ', act ' + saw.act.sub, { fs: 12.5, b: 1, c: P.good, dy: 22, a: e });
    }
    if (k === 5) {
      person(R, TH, BAD, 'a thief with a copy of A', { lc: BAD });
      tok(R, [TH[0] + .65, 0, TH[2] - .1], A, 1, null, { w: .4, h: .5 });
      R.flowArc([TH[0] + .3, .7, TH[2] - .2], [MS[0] - .2, .6, MS[2] + .5], .5, { c: A, r: .065, n: 8, speed: 1.3, a: .85 });
      R.label([(TH[0] + MS[0]) / 2 + .2, .9, (TH[2] + MS[2]) / 2 + .3], life + ' of ' + scA + ', one server', { fs: 12.5, b: 1, c: A, dy: -6 });
      const tip = [MA[0] - .9, .4, MA[2] + .6]; R.line([[TH[0] + .5, .4, TH[2] - .1], tip], { c: BAD, w: 1.6, dash: [5, 5], a: .9 }); refuse(R, tip, 1);
      R.label(up(MA, 0), 'refused: not its audience', { fs: 12.5, b: 1, c: BAD, dy: 22 });
      tok(R, [MS[0] + .95, 0, MS[2] - .35], B, .3);
    }
  }
  const full = { cam: [.22, .78], bounds: [[-5.0, 0, -2.6], [4.3, 1.1, 3.3]] };
  S3.stage({ id: 'stg-hero', list: 'sx-hero', fig: 'Fig. 1 · one narrow token per hop', cam: full.cam, bounds: full.bounds, aspect: .66, dur: 1500, hold: 4800, draw,
    margin: w => w < 520 ? [18, 8, 18, 8] : [24, 16, 22, 16],
    view: k => k === 0 ? { cam: [.3, .72], bounds: [[-5.0, 0, -2.6], [.6, 1.1, 2.0]] }
      : k === 1 ? { cam: [.15, .72], bounds: [[-4.0, 0, -.6], [1.0, 1.1, 1.8]] }
      : k === 2 || k === 4 ? { cam: [.1, .72], bounds: [[-.9, 0, -.7], [4.4, 1.1, 1.7]] }
      : k === 3 ? { cam: [.35, .7], bounds: [[-1.6, 0, -2.6], [1.6, 1.1, 1.6]] } : null });
})();
