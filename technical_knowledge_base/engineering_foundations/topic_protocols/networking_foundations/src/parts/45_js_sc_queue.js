// ---- Fig. 5, the accept queue (sq-queue, section 8), a flat 2D figure on RD.anim (card from 28_js_seq.js). Steps 1 to 5 replay the recorded
// experiment (window.NF.local.backlog: listen(2), eight clients 50 ms apart, the server calling accept() only after all have written); step 6 is
// Linux's documented behaviour (not measured here) and step 7 an illustrative SO_REUSEPORT layout with four workers. A 3D stage until 2026-11-19,
// redrawn flat because its depth carried nothing: eight clients, a two-place queue and a server read as rows and columns. ----
(function () {
  if (!document.getElementById('sq-queue') || !window.SQ || !window.NF) return;
  const BL = NF.local.backlog, CL = BL.clients, N = CL.length, QN = BL.listen_backlog;
  const conn = CL.filter(c => c.connect === 'ok'), served = CL.filter(c => c.reply === 'ok');
  window.NF_QUEUE = { conn: conn.length, n: N, served: served.map(c => c.client), reset: CL.filter(c => c.connect !== 'ok').map(c => c.client), backlog: QN };   // read by src/check_stages.mjs
  const cd = SQ.card('sq-queue', 'Fig. 5 · listen(' + QN + ') and eight clients'); if (!cd) return;
  const { box, stl, host } = cd, esc = SQ.esc, NS = 7;
  const OK = 'var(--good)', BAD = 'var(--bad)', A = 'var(--acc)', MUTE = 'var(--mute)', SRV = 'var(--c6)';
  const T = (x, y, s, o) => { o = o || {}; return '<text x="' + x + '" y="' + y + '" font-size="' + (o.fs || 12.5) + '"' + (o.a ? ' text-anchor="' + o.a + '"' : '') + (o.b ? ' font-weight="600"' : '') + (o.mono ? ' font-family="ui-monospace,Menlo,Consolas,monospace"' : '') + ' style="fill:' + (o.c || 'var(--ink)') + '">' + esc(s) + '</text>'; };
  const box2 = (x, y, w, h, c, o) => { o = o || {}; return '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (o.rx || 6) + '" style="fill:' + (o.fill || 'color-mix(in srgb,' + c + ' ' + (o.t || 16) + '%,var(--card))') + ';stroke:' + c + '"' + (o.dash ? ' stroke-dasharray="4 3"' : '') + ' stroke-width="1.3"/>'; };
  const arrow = (x1, y1, x2, y2, c, o) => { o = o || {}; return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" style="stroke:' + c + '" stroke-width="' + (o.w || 1.8) + '"' + (o.dash ? ' stroke-dasharray="5 4"' : '') + ' marker-end="url(#sq-queue-ar)"' + (o.cls ? ' class="' + o.cls + '"' : '') + '/>'; };
  const cross = (x, y) => '<circle cx="' + x + '" cy="' + y + '" r="8" style="fill:var(--card);stroke:var(--bad)" stroke-width="1.5"/><path d="M' + (x - 3.6) + ' ' + (y - 3.6) + 'L' + (x + 3.6) + ' ' + (y + 3.6) + 'M' + (x - 3.6) + ' ' + (y + 3.6) + 'L' + (x + 3.6) + ' ' + (y - 3.6) + '" style="stroke:var(--bad)" stroke-width="1.8"/>';
  // what each client shows at step k: its colour and its status text
  function status(c, k) {
    if (k === 6) return [A, ''];
    const i = c.client, started = k >= 2 || (k === 1 && i < 2), refused = c.connect !== 'ok';
    if (!started) return [MUTE, ''];
    if (refused) return [BAD, k === 2 ? 'connect reset' : 'reset at connect'];
    if (k >= 4) return c.reply === 'ok' ? [OK, 'reply "ok"'] : [BAD, 'connection reset'];
    if (k >= 3) return c.send === 'ok' ? [A, 'sent'] : [BAD, 'BrokenPipeError'];
    return [A, 'connected, ' + c.connect_ms + ' ms'];
  }
  function draw(k) {
    stl.textContent = 'step ' + (k + 1) + ' of ' + NS;
    const W = Math.max(300, Math.round((box.clientWidth || RD.width(host)) - 16)), nar = W < 520, fs = nar ? 12 : 12.5;
    const fwd = host.classList.contains('rd-fwd'), nw = cls => fwd ? ' class="' + cls + '"' : '';
    const top = 34, rh = nar ? 24 : 30, cw = nar ? 40 : 84, stW = nar ? 122 : 150, xS = W - (nar ? 70 : 150), sw = W - xS - 4;
    const qw = nar ? 36 : 60, xQ = Math.round((cw + stW + xS) / 2 - qw), noteW = W - cw - 6, NL = nar ? 2 : 1, H = top + N * rh + 14 + NL * 16;
    const note = (t, o) => SQ.wrap(t, noteW - 4, 12, o && o.b).map((l, j) => T(cw + 2, top + N * rh + 22 + j * 16, l, Object.assign({ fs: 12 }, o))).join('');
    const yR = i => top + i * rh + rh / 2, yMid = top + N * rh / 2;
    const wk = k === 6, WZ = [0, 1, 2, 3].map(j => top + (j + .5) * N * rh / 4);
    let s = '<defs><marker id="sq-queue-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.6" markerHeight="4.6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';
    // column heads
    s += T(4, 18, 'clients', { b: 1, c: MUTE, fs }) + T(wk ? xQ : xQ + qw, 18, wk ? 'one queue per worker' : 'accept queue · ' + QN + ' places', { b: 1, c: OK, fs, a: wk ? 'start' : 'middle' });
    // the server (or four workers sharing the port)
    if (!wk) {
      const sub = k <= 3 ? 'busy: no accept() yet' : k === 4 ? 'calls accept()' : 'Linux, queue full';
      s += box2(xS, top, sw, N * rh, SRV, { t: 14, rx: 10 }) + T(xS + sw / 2, yMid - 8, 'server', { b: 1, a: 'middle', fs });
      SQ.wrap(sub, sw - 10, fs).forEach((t, j) => { s += T(xS + sw / 2, yMid + 10 + j * 15, t, { a: 'middle', c: k === 4 ? OK : MUTE, fs }); });
      // the two places in the queue: the queued connections 0 and 1 wait there until accept()
      for (let q = 0; q < QN; q++) {
        const y = yMid - QN * 26 / 2 + q * 26 + 2, full = (k >= 1 && k <= 3) || k === 5;
        s += box2(xQ, y, qw * 2, 22, OK, { dash: !full, t: full ? 22 : 4 });
        if (full) s += T(xQ + qw, y + 15.5, k === 5 ? 'full' : 'client ' + q, { a: 'middle', fs: 12, c: 'var(--ink)' });
      }
    } else {
      WZ.forEach((y, j) => {
        s += box2(xS, y - 18, sw, 36, SRV, { t: 14 }) + T(xS + sw / 2, y + 4.5, 'worker ' + (j + 1), { b: 1, a: 'middle', fs });
        s += box2(xQ, y - 11, qw * 2, 22, OK, { t: 18 }) + T(xQ + qw, y + 4.5, 'clients ' + j + ', ' + (j + 4), { a: 'middle', fs: 12 });
        s += arrow(xQ + qw * 2 + 2, y, xS - 3, y, OK, { w: 1.4 });
      });
    }
    // the eight clients, each coloured by what has happened to it so far
    CL.forEach((c, i) => {
      const y = yR(i), [col, st] = status(c, k), on = col !== MUTE;
      s += box2(2, y - 10, cw - 6, 20, col, { t: on ? 20 : 5 }) + T(2 + (cw - 6) / 2, y + 4.5, (nar ? 'c' : 'client ') + c.client, { a: 'middle', fs: 12, mono: 1 });
      if (st) s += '<g' + nw('rd-new') + '>' + T(cw + 2, y + 4.5, st, { c: col === A ? 'var(--ink)' : col, fs: 12, b: col !== A }) + '</g>';
    });
    // the moves of this step; a request that goes nowhere is a short dashed stub ending in a cross beside its row
    let m = '';
    const qx = xQ - 4, qy = q => yMid - QN * 26 / 2 + q * 26 + 13, x0 = cw + stW - 4;
    const stub = y => arrow(x0, y, x0 + (nar ? 10 : 22), y, BAD, { dash: 1 }) + cross(x0 + (nar ? 18 : 30), y);
    if (k === 1 || k === 2) CL.forEach((c, i) => {
      if (k === 1 ? i >= 2 : i < 2) return; const y = yR(i);
      if (c.connect !== 'ok') { m += stub(y); return; }
      m += arrow(x0, y, qx, i < 2 ? qy(i) : yMid, A, { w: 1.4, dash: i >= 2 });
    });
    if (k === 3) CL.forEach((c, i) => { if (c.connect !== 'ok') return; m += c.send === 'ok' ? arrow(x0, yR(i), qx, qy(i), A) : stub(yR(i)); });
    if (k === 4) {
      m += arrow(xQ + qw * 2 + 2, yMid, xS - 3, yMid, OK, { w: 2.2 });
      served.forEach(c => { m += arrow(xS - 3, yMid + 30 + c.client * 6, x0, yR(c.client), OK, { w: 1.6 }); });
      m += T(xQ + qw, qy(QN - 1) + 30, 'accept() × ' + served.length, { a: 'middle', fs: 12, c: OK, b: 1 });
    }
    if (k === 5) {
      const y = yR(3), xe = xQ + qw;
      m += arrow(x0, y, xe - 8, qy(QN - 1) + 26, BAD, { dash: 1 }) + cross(xe, qy(QN - 1) + 30) + T(xe, qy(QN - 1) + 54, 'SYN dropped', { a: 'middle', c: BAD, b: 1, fs });
      m += note('client resends after 1 s, then 2 s more: connects of 1 s or 3 s', { c: 'var(--c5)', b: 1 });
    }
    if (k === 6) CL.forEach((c, i) => { const j = i % 4; m += arrow(cw - 2, yR(i), xQ - 3, WZ[j] + (i < 4 ? -5 : 5), A, { w: 1.2 }); });
    if (k === 0) m += note('listen(' + QN + '): the kernel completes handshakes; at most ' + QN + ' wait for accept()', { c: MUTE });
    if (k === 2) m += note('connect() returned ok for ' + conn.length + ' of ' + N, { c: A, b: 1 });
    if (k === 1) m += note('handshakes completed by the kernel', { c: A, b: 1 });
    if (k === 6) m += note('SO_REUSEPORT: four workers, one port (illustrative)', { c: MUTE });
    s += '<g' + nw('rd-new') + '>' + m + '</g>';
    box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Fig. 5, listen(' + QN + ') and eight clients, step ' + (k + 1) + ' of ' + NS + '">' + s + '</svg>';
  }
  const an = RD.anim({ card: 'sq-queue', ctl: cd.ctl, n: NS, draw, ms: 4600, label: 'Step', list: 'sx-queue' });
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (host.offsetParent !== null) an.redraw(); }, 60); });
})();
