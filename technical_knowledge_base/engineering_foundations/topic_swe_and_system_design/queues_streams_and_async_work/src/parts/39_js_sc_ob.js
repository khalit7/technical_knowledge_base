// ---- Scene: Fig. 6, the dual write against the transactional outbox (stg-ob). Order 42 through three designs: commit then publish, publish then
// commit, and the outbox with a relay and an idempotent consumer. Each step is a snapshot of what every system holds; the crash points are the ones
// the measured lab injects (lab/pg_lab.py); the counts quoted in the step lists are that lab's (LABDATA.outbox, 500 orders, 5% crash chance). ----
(function () {
  if (!document.getElementById('stg-ob') || !window.QS3) return;
  const { mix } = S3, { party, plate, msg, crash, lab, win, arcPts, along } = QS3;
  // snapshot fields: a active system, x crashed system, o orders, ob outbox rows [event, sent], b broker events, p processed_events, m receipts, ar flow [from, to]
  const S = {
    naive: [{ a: 'api', o: [], b: [], m: [] }, { a: 'db', o: ['42'], b: [], m: [], ar: ['api', 'db'] }, { a: 'api', x: 'api', o: ['42'], b: [], m: [] }, { a: 'api', o: ['42'], b: [], m: [] }, { a: 'cons', o: ['42'], b: [], m: [], lost: 1 }],
    first: [{ a: 'api', o: [], b: [], m: [] }, { a: 'broker', o: [], b: ['e42'], m: [], ar: ['api', 'broker'] }, { a: 'api', x: 'api', o: [], b: ['e42'], m: [] }, { a: 'cons', o: [], b: ['e42'], m: ['42'], ar: ['broker', 'cons'] }, { a: 'cons', o: [], b: ['e42'], m: ['42'], phantom: 1 }],
    outbox: [{ a: 'api', o: [], ob: [], b: [], p: [], m: [] }, { a: 'db', o: ['42'], ob: [['e42', 0]], b: [], p: [], m: [], ar: ['api', 'db'] }, { a: 'api', x: 'api', o: ['42'], ob: [['e42', 0]], b: [], p: [], m: [] },
      { a: 'relay', o: ['42'], ob: [['e42', 0]], b: [], p: [], m: [], ar: ['db', 'relay'] }, { a: 'broker', o: ['42'], ob: [['e42', 0]], b: ['e42'], p: [], m: [], ar: ['relay', 'broker'] }, { a: 'relay', x: 'relay', o: ['42'], ob: [['e42', 0]], b: ['e42'], p: [], m: [] },
      { a: 'broker', o: ['42'], ob: [['e42', 1]], b: ['e42', 'e42'], p: [], m: [], ar: ['relay', 'broker'] }, { a: 'cons', o: ['42'], ob: [['e42', 1]], b: ['e42', 'e42'], p: ['e42'], m: ['42'], ar: ['broker', 'cons'] },
      { a: 'cons', o: ['42'], ob: [['e42', 1]], b: ['e42', 'e42'], p: ['e42'], m: ['42'], ar: ['broker', 'cons'], skip: 1 }, { a: 'cons', o: ['42'], ob: [['e42', 1]], b: ['e42', 'e42'], p: ['e42'], m: ['42'] }]
  };
  window.QS_OB = { n: { naive: S.naive.length, first: S.first.length, outbox: S.outbox.length } };
  let mode = 'naive';
  const NM = { api: 'order API', db: 'Postgres', relay: 'outbox relay', broker: 'broker', cons: 'e-mail service' };
  const XS = { naive: { api: -4.6, db: -1.6, broker: 1.6, cons: 4.6 }, first: { api: -4.6, db: -1.6, broker: 1.6, cons: 4.6 }, outbox: { api: -5.2, db: -2.6, relay: 0, broker: 2.6, cons: 5.2 } };
  const CO = P => ({ api: P.c1, db: P.c3, relay: P.c5, broker: P.c4, cons: P.c6 });
  function draw(R, k, e) {
    const P = R.P, st = S[mode][Math.min(k, S[mode].length - 1)], X = XS[mode], C = CO(P);
    R.grid(-6.2, 6.2, -2.6, 2.6, .5);
    Object.keys(X).forEach(nm => { const x = X[nm], on = st.a === nm, dead = st.x === nm;
      party(R, [x, 0, 0], [1.2, .7, 1.0], dead ? P.bad : C[nm], NM[nm], { a: on || dead ? 1 : .45, t: on ? .4 : .25, wide: 1, amin: .55 });
      if (dead) crash(R, [x, 0, 0], .7, win(e, 0, .3), null); });
    // what each system holds: chips on the plates in front of each block (a second row for the outbox and processed_events)
    const row = (x, z, items, col, name, a, f) => { plate(R, [x, 0, z], 1.5, .8, col, .55 * a, { nu: 3, nv: 1 });
      lab(R, z > 2 ? [x, 0, z + .42] : [x - .8, 0, z], name, { fs: 12, c: P.mute, mono: 1, dy: z > 2 ? 12 : 0, al: z > 2 ? 'center' : 'right', dx: z > 2 ? 0 : -4, a: Math.max(.5, a), wide: 1 });
      items.forEach((v, i) => { const t = Array.isArray(v) ? v[0] + (v[1] ? ' sent' : '') : v, c = f ? f(v, i) : col;
        msg(R, [x - .45 + i * .55, .04, z], c, a * (Array.isArray(v) && v[1] ? .55 : 1), { s: [.48, .18, .5], txt: t, b: 1, wide: 1 }); }); };
    row(X.db, 1.3, st.o, P.c3, 'orders', 1);
    if (st.ob) row(X.db, 3.0, st.ob, P.c5, 'outbox', 1);
    row(X.broker, 1.3, st.b, P.c4, 'events', 1, (v, i) => i ? P.bad : P.c4);
    row(X.cons, 1.3, st.m, P.c6, 'receipts', 1, () => st.o.indexOf('42') < 0 ? P.bad : P.c6);
    if (st.p) row(X.cons, 3.0, st.p, P.c3, 'processed_events', 1);
    // the write or delivery of this step, as a stream of dots
    if (st.ar) { const a = X[st.ar[0]], b = X[st.ar[1]], dir = Math.sign(b - a), pts = arcPts(R, [a + dir * .6, .55, 0], [b - dir * .6, .45, 0], .5);
      R.flow(pts, { c: st.skip ? P.bad : C[st.ar[1]], r: .085, n: 7, speed: 1.4, a: Math.min(1, e * 2) });
      if (st.skip) lab(R, [X.cons, .7, 0], 'duplicate: skipped', { b: 1, fs: 12.5, c: P.bad, dy: -48, a: win(e, .3, .6) }); }
    if (st.lost) lab(R, [X.broker, .3, 1.3], 'no event: lost', { b: 1, fs: 13, c: P.bad, dy: -22, a: win(e, .2, .5) });
    if (st.phantom) lab(R, [X.db, .3, 1.3], 'no order: phantom', { b: 1, fs: 13, c: P.bad, dy: -22, a: win(e, .2, .5) });
  }
  const full = { cam: [.22, .78], bounds: [[-6, 0, -.7], [6, .9, 3.5]] };
  const stg = S3.stage({ id: 'stg-ob', list: 'sx-ob-naive', fig: 'Fig. 6 · one order, two writes', cam: full.cam, bounds: full.bounds, aspect: .5, dur: 1300, hold: 4600, draw, margin: QS3.margin });
  const seg = document.getElementById('rd-ob-seg');
  if (seg && stg) RD.seg(seg, m => { mode = m; ['naive', 'first', 'outbox'].forEach(x => { document.getElementById('sx-ob-' + x).hidden = x !== m; }); stg.list('sx-ob-' + m); });
})();
