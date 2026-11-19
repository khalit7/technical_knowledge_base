// ---- Fig. 1, the hero (sq-hero): the recorded delegated call as a 2D sequence (28_js_seq.js; a 3D stage until 2026-11-19, redrawn flat because
// its depth carried nothing: parties and hops read faster as columns and time). Parties: alice, her agent (an MCP client), the authorization server,
// the MCP server, the mail API and, in the last step, a thief. Token A (blue, audience the MCP server) and token B (green, audience the mail API).
// Every value drawn comes from window.AUTHDATA (the lab's recordings of 5 October 2026): lifetimes, scopes, audiences, the refusal text, the claims
// the mail API saw. The thief is the page's what-if (stated in the step list), not a recording. ----
(function () {
  if (!document.getElementById('sq-hero') || !window.SQ || !window.AUTHDATA) return;
  const D = AUTHDATA, R0 = D.flows.R[0].body, life = R0.expires_in + ' s', scA = R0.scope;
  const strict = D.sdk.phases.C_strict.upstream_body.error_description;
  const saw = D.sdk.phases.D.upstream_body.upstream_believes_caller_is;
  const A = 'var(--c1)', B = 'var(--c3)', BAD = 'var(--bad)', OK = 'var(--good)';
  const AL = 0, AG = 1, AS = 2, MS = 3, MA = 4, TH = 5;
  const labA = 'token A: aud MCP server, ' + scA + ', ' + life + ' (+ refresh token)', labB = 'token B: aud mail API, ' + saw.scope + ', act MCP server';
  SQ({ id: 'sq-hero', list: 'sx-hero', fig: 'Fig. 1 · one narrow token per hop', ms: 4800,
    lanes: [{ n: 'alice', c: 'var(--c5)' }, { n: 'agent (MCP client)', s: 'agent', c: 'var(--acc)' }, { n: 'authorization server', s: 'auth server', c: 'var(--c4)' },
      { n: 'MCP server', s: 'MCP server', c: 'var(--c6)' }, { n: 'mail API', s: 'mail API', c: 'var(--c5)' }, { n: 'thief', c: BAD, k: 5 }],
    steps: [
      [{ f: AL, t: AG, l: 'alice approves', c: 'var(--c5)' },
        { f: AG, t: AS, l: 'code + PKCE verifier, resource = MCP server', c: 'var(--c5)' },
        { f: AS, t: AG, l: labA, c: A }],
      [{ f: AG, t: MS, l: 'tool call, Authorization: Bearer A', c: A },
        { at: MS, l: 'checks signature, iss, aud, exp, scope', c: OK }],
      [{ f: MS, t: MA, l: 'the same A, forwarded', c: BAD, x: 1, sub: '401 "' + strict + '"' }],
      [{ f: MS, t: AS, l: 'A + an assertion signed by the MCP server', c: A },
        { f: AS, t: MS, l: labB, c: B }],
      [{ f: MS, t: MA, l: 'Bearer B', c: B },
        { at: MA, l: '200 · sub ' + saw.sub + ', act ' + saw.act.sub, c: OK }],
      [{ f: TH, t: MS, l: 'a stolen copy of A: ' + life + ' of ' + scA + ', one server', c: A, d: 1 },
        { f: TH, t: MA, l: 'A at the mail API', c: BAD, x: 1, sub: 'refused: not its audience' }]
    ] });
})();
