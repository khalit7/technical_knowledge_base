// ---- Fig. 1, the hero (sq-hero): the running request through three API styles, as a 2D sequence (28_js_seq.js). A 3D stage until 2026-11-19,
// redrawn flat because its depth carried nothing: parties and hops read faster as columns with time running down. Parties: your app, the front
// door, an L7 router and the three inference replicas (one column; the 10 / 10 / 10 split by replica is a note), and in the last step the other
// callers (browsers, agents). Data from window.SA: the request's JSON and protobuf sizes (pb.json), the gRPC frame (49 + 5 bytes), the L7
// balancer's 30-call counts (lb.json). The rest is the structure the sections teach. ----
(function () {
  if (!document.getElementById('sq-hero') || !window.SQ || !window.SA) return;
  const RQ = SA.pb.request, jsonB = RQ.json_bytes, frameB = RQ.grpc_frame_bytes, pbB = RQ.pb_bytes;
  const l7 = SA.lb.counts.find(c => /^L7/.test(c.setup)).answers, L7C = ['backend-1', 'backend-2', 'backend-3'].map(b => l7[b] || 0);
  window.SA_HERO = { jsonB, pbB, frameB, L7C };   // read by src/check_stages.mjs
  const OT = 0, AP = 1, FD = 2, RT = 3, RP = 4, C1 = 'var(--c1)', C2 = 'var(--c2)', C4 = 'var(--c4)', C5 = 'var(--c5)', C6 = 'var(--c6)';
  SQ({ id: 'sq-hero', list: 'sx-hero', fig: 'Fig. 1 · one request, three API styles', ms: 4800,
    lanes: [{ n: 'browsers, agents', s: 'others', c: C6, k: 5 }, { n: 'your app', s: 'app', c: C1 }, { n: 'front door', s: 'front door', c: C2 },
      { n: 'router (L7)', s: 'router', c: C5 }, { n: 'inference replicas (3)', s: 'replicas', c: 'var(--c3)' }],
    steps: [
      [{ f: AP, t: FD, l: 'REST + SSE', c: C1, d: 1 }, { f: FD, t: RT, l: 'gRPC', c: C2, d: 1 }, { f: RT, t: RP, l: 'one replica', c: C5, d: 1 }],
      [{ f: AP, t: FD, l: 'POST /v1/messages · ' + jsonB + ' B of JSON', c: C1 }, { f: FD, t: AP, l: 'SSE events stream back', c: C4 }],
      [{ f: FD, t: RT, l: frameB + ' B: protobuf (' + pbB + ') + 5-byte prefix', sub: 'grpc-timeout: what is left', c: C2 },
        { f: RT, t: FD, l: 'tokens back · the status last, in trailers', c: C4 }],
      [{ f: RT, t: RP, l: 'a choice per call', c: C5 }, { at: RP, l: '30 calls, by replica: ' + L7C.join(' / '), c: C5 }],
      [{ f: FD, t: AP, l: 'signed event · webhook-id', sub: 'to a URL your app registered', c: C5 }],
      [{ f: OT, t: FD, l: 'browsers: gRPC-Web, Connect, GraphQL', c: C6 }, { f: OT, t: FD, l: 'an agent: JSON-RPC (MCP, A2A)', c: C4 }]
    ] });
})();
