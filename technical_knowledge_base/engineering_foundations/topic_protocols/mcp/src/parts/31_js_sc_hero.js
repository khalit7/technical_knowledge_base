// ---- Fig. 1, the hero (sq-hero): the roles and one tool call around the agent loop, as a 2D sequence (28_js_seq.js). A 3D stage until
// 2026-11-19, redrawn flat because its depth carried nothing: the parties and the messages between them read faster as columns with time down
// the card. Parties: the model API, the host (its policy and consent), the host's two clients (one per server), a local stdio server, the remote
// ckpt-tools server and its authorization server. Data from window.MCPD: the size of ckpt-tools' tools/list answer and the tools/call it answered
// (the stdio recording of 5 October 2026); the rest is the structure the specification defines. ----
(function () {
  if (!document.getElementById('sq-hero') || !window.SQ || !window.MCPD) return;
  const pin = MCPD.tr.find(r => r.name.indexOf('stdio, 2026-07-28') === 0).coldmsgs;
  const listB = pin[3].n - 1;   // the tools/list answer: JSON bytes without the newline
  const fmt = n => n.toLocaleString('en-US');
  window.MCP_HERO = { listB };   // read by src/check_stages.mjs
  const M = 'var(--c4)', A = 'var(--acc)', OK = 'var(--good)', LO = 'var(--c5)', CK = 'var(--c6)', AU = 'var(--c3)';
  const MO = 0, HO = 1, C1 = 2, C2 = 3, LS = 4, RS = 5, AS = 6;
  SQ({ id: 'sq-hero', list: 'sx-hero', fig: 'Fig. 1 · the host translates and decides', ms: 4800,
    lanes: [{ n: 'model API', s: 'model', c: M }, { n: 'host', c: 'var(--mute)' }, { n: 'client 1', c: A }, { n: 'client 2', c: A },
      { n: 'local server', s: 'local', c: LO }, { n: 'ckpt-tools', s: 'ckpt', c: CK }, { n: 'authorization server', s: 'auth', c: AU }],
    steps: [
      [{ at: MO, l: 'its own tool format; never MCP', c: M },
        { at: [HO, C2], l: 'host: Claude Code, an IDE, your own agent', c: 'var(--mute)' },
        { f: C1, t: LS, l: 'MCP · child process, stdio', c: A, d: 1 },
        { f: C2, t: RS, l: 'MCP · remote, Streamable HTTP', c: A, d: 1 }],
      [{ f: C1, t: LS, l: 'tools/list', c: A }, { f: C2, t: RS, l: 'tools/list', c: A },
        { f: RS, t: C2, l: '3 tools · ' + fmt(listB) + ' bytes', c: CK },
        { f: HO, t: MO, l: 'tool list: name, description, inputSchema', c: M }],
      [{ f: MO, t: HO, l: 'tool_use · list_checkpoints({"run": "llama-7b-sft"})', c: M }],
      [{ at: HO, l: 'policy and consent: allowed?', c: OK },
        { f: C2, t: RS, l: 'tools/call · list_checkpoints', c: A, sub: 'ckpt-tools sees only this request' }],
      [{ f: RS, t: C2, l: 'result · three checkpoints', c: CK },
        { f: HO, t: MO, l: 'tool result → the model continues', c: M }],
      [{ at: LS, l: "the user's rights, credentials from the environment", c: LO },
        { f: AS, t: RS, l: 'token · aud = this server', c: AU, sub: 'ckpt-tools: an OAuth resource server' }]
    ] });
})();
