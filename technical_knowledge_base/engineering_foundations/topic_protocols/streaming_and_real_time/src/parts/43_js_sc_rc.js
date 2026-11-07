// ---- Scene: Fig. 5a, a cut stream reconnecting (stg-rc), three server settings as modes. Chrome 148's EventSource against the lab
// server, which closes the connection after three events per connection (SDATA.rc.scenarios: the page's recorded client events and the
// server's log of the Last-Event-ID each reconnect carried). Each connection is a glass slab, newest at the back; the row in front is
// what a chat UI shows by appending every token, repeats in red. A step reveals its recorded events in order; the step text gives
// their times. ----
(function () {
  if (!document.getElementById('stg-rc') || !window.S3 || !window.STK || !window.SDATA) return;
  const { mix } = S3, { party, slab, msg, cross, tile, at, win } = STK;
  const SC = SDATA.rc.scenarios, XC = -4.1, XS = 4.1, ZS = 2.3;
  // the recorded stretches each step covers (seconds on the client's clock)
  const STEPS = { no_ids: [[0, .178], [.178, 3.2], [3.2, 3.357], [3.357, 6.6]], ids: [[0, .174], [.174, 3.29], [3.29, 6.292], [6.292, 9.3]],
    ids_retry_204: [[0, .173], [.173, .779], [.779, 1.283], [1.283, 1.8]] };
  let mode = 'no_ids';
  const zc = i => 1.25 - i * 1.0, TX = e => e[2].replace(/ #\d+$/, '').trim(), ID = e => (e[2].match(/#(\d+)/) || [])[1];
  window.ST_RC = {}; Object.keys(SC).forEach(m => { const s = SC[m]; window.ST_RC[m] = { opens: s.client.filter(e => e[1] === 'open').map(e => e[0]),
    lei: s.server.filter(x => x.work === null).map(x => x.last_event_id), closed: s.client.some(e => e[2] === 'CLOSED') }; });   // read by check_stages.mjs
  function draw(R, k, e, st) {
    const P = R.P, E = st.e, S = SC[mode], W = STEPS[mode], lei = S.server.filter(x => x.work === null).map(x => x.last_event_id);
    R.grid(-6, 6, -3, 3.2, .5);
    party(R, [XC - .45, 0, 0], [.9, .7, 4.4], P.c2, 'browser · EventSource');
    party(R, [XS + .45, 0, 0], [.9, .7, 4.4], P.c1, 'lab server', { fs: 13 });
    // which recorded events are on screen now, and the newest one's progress
    const shown = [];
    W.forEach(([t0, t1], s) => { if (s > k) return; const ev = S.client.filter(x => (s === 0 ? x[0] >= t0 : x[0] > t0) && x[0] <= t1), n = ev.length;
      ev.forEach((x, j) => { const f = (j + 1) / (n + 1); if (s < k || E >= f - 1 / (n + 1)) shown.push({ x, p: s < k ? 1 : win(E, f - 1 / (n + 1), f), cur: s === k }); }); });
    let conn = -1, open = false; const seen = {}, row = []; const cons = [];
    shown.forEach(({ x, p, cur }) => {
      const [t, ty] = x;
      if (ty === 'open') { conn++; open = true; cons[conn] = { t, end: null, done: false, cur }; const z = zc(conn), r = at([XC, .5, z + .15], [XS, .5, z + .15], 0, 1, p);
        if (r && p < 1 && conn > 0) msg(R, r, 200, P.c2, 1, { lab: lei[conn] != null ? 'Last-Event-ID: ' + lei[conn] : 'no Last-Event-ID', mono: 1 }); }
      else if (ty === 'error') { if (conn >= 0) { cons[conn].end = x[2]; cons[conn].endT = t; cons[conn].endP = p; } open = false; }
      else { const z = zc(conn), q = at([XS, .42, z - .1], [XC, .42, z - .1], 0, 1, p), c = ty === 'content_block_delta' ? P.c1 : P.mute;
        if (q && p < 1) { R.glow(q, .3, { c, a: .7 }); R.ball(q, .1, { c }); }
        if (p >= 1) { if (cons[conn]) cons[conn].done = cons[conn].done || ty === 'message_stop';
          if (ty === 'content_block_delta') { const w = TX(x), dup = seen[w]; seen[w] = 1; row.push([w + (ID(x) ? ' #' + ID(x) : ''), dup]); }
          else if (ty === 'message_stop') row.push(['stop' + (ID(x) ? ' #' + ID(x) : ''), 0]); } }
    });
    cons.forEach((c, i) => { const z = zc(i), live = c.end == null, a = live ? 1 : .32;
      slab(R, XC + .05, XS - .05, .26, z, .6, P.c1, a, { lab: 'connection ' + (i + 1) + ' · opened ' + c.t.toFixed(3) + ' s', at: [-1.6, .26, z], al: 'center', dx: 0, dy: -12, wide: 1, mono: 1, lc: live ? P.c1 : P.mute });
      if (!live && c.end !== 'CLOSED') { cross(R, [1.8, .45, z], .9 * (c.endP == null ? 1 : c.endP), c.done ? P.mute : P.bad);
        R.label([1.8, .45, z], c.done ? 'stream ended: EventSource reconnects anyway' : 'cut by the server', { fs: 12, b: 1, c: c.done ? P.mute : P.bad, dy: -16, a: c.cur ? 1 : .6, wide: 1 }); }
      if (c.end === 'CLOSED') { const r = at([XS, .5, z - .15], [XC, .5, z - .15], 0, 1, c.endP); if (r && c.endP < 1) msg(R, r, 200, P.bad, 1, { lab: '204 No Content', mono: 1, dy: 18 });
        if (c.endP >= 1) R.label([XC + .7, .8, z], 'readyState CLOSED: no more reconnects', { fs: 12.5, b: 1, c: P.good, al: 'left', dx: 4, dy: -12 }); } });
    if (open && conn >= 0) R.flow([[XS - .2, .38, zc(conn) - .1], [XC + .2, .38, zc(conn) - .1]], { c: P.c1, r: .055, n: 7, speed: 1.2, a: .6 });
    // what the chat UI shows
    R.label([XC + .1, .02, ZS], 'what the UI shows', { fs: 12, c: P.mute, al: 'right', dx: -8, dy: 4, grp: 'ui' });
    row.slice(0, 12).forEach(([w, dup], i) => tile(R, [XC + .55 + i * .72, .02, ZS], w, dup ? P.bad : P.c1, 1, { w: .66, lc: dup ? P.bad : P.ink, wide: 1 }));
  }
  const full = { cam: [0, .72], bounds: [[-5.2, 0, -2.2], [5.2, 1.0, 2.8]] };
  const st = S3.stage({ id: 'stg-rc', list: 'sx-rc-no_ids', fig: 'Fig. 5 · a cut stream, three server settings', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 3200, hold: 4600, draw,
    margin: w => w < 520 ? [18, 8, 14, 8] : [22, 16, 18, 16] });
  STK.chips(document.getElementById('rc-mode'), 'sx-rc-', st, m => { mode = m; });
})();
