// ---- Fig. 9, webhooks: the provider calls you (sq-wh), a 2D sequence (28_js_seq.js). A 3D stage (stg-wh) until 2026-11-19 with the two
// runs side by side in depth; redrawn flat because the depth carried nothing: three parties and their messages in time order read faster
// as columns, the naive receiver on the left, the provider in the middle, the careful receiver on the right. Two recorded runs of
// src/lab/webhooks.py (SDATA.hooks.delivery: the sender's attempts with the result it got, the receivers' answers, and every finished piece
// of work with the status it stored), merged by their recorded times; the schedule is Standard Webhooks' first four delays scaled down 60
// times, and each step shows one stretch of the run. Step 1 shows the recorded signature checks (SDATA.hooks.signatures). ----
(function () {
  if (!document.getElementById('sq-wh') || !window.SQ || !window.SDATA) return;
  const H = SDATA.hooks, L = { naive: H.delivery.naive.log, careful: H.delivery.careful.log }, sg = H.signatures.standard_webhooks;
  const WIN = [[0, .15], [.15, 3.1], [3.1, 9], [9, 40]], NV = 0, PR = 1, CF = 2, LANE = { naive: NV, careful: CF };
  const done = m => L[m].filter(r => r.what === 'work done');
  window.ST_WH = { naive: done('naive').length, careful: done('careful').length, naiveFinal: done('naive').slice(-1)[0].status_stored, carefulFinal: done('careful').slice(-1)[0].status_stored,
    sig: sg, attempts: L.naive.filter(r => r.sender).length };   // read by check_stages.mjs
  const short = ev => ev.replace(/^job\./, ''), err = s => s.replace(/^WebhookVerificationError: /, '');
  const ran = { naive: 0, careful: 0 };
  // one stretch of both runs: the sender's attempts as arrows (consecutive timeouts at one receiver merged), the finished work as a note
  function stretch(w) {
    const ev = [];
    ['naive', 'careful'].forEach(m => L[m].forEach(r => { if (r.t > w[0] && r.t <= w[1]) ev.push(Object.assign({ m }, r)); }));
    ev.sort((a, b) => a.t - b.t);
    const rows = [], work = { naive: [], careful: [] };
    ev.forEach(r => {
      if (r.sender) {
        const n = r.what.match(/^attempt (\d+)/)[1], res = r.what.replace(/^attempt \d+: /, ''), to = /timeout/.test(res);
        const prev = rows[rows.length - 1];
        if (to && prev && prev.to && prev.m === r.m && prev.n === n) { prev.l = prev.ev.concat(short(r.event)).join(' + ') + ', attempt ' + n + ': no answer in 1 s'; prev.ev.push(short(r.event)); return; }
        const q = L[r.m].find(x => !x.sender && x.event === r.event && x.t >= r.t - .01 && /answered/.test(x.what));
        rows.push({ f: PR, t: LANE[r.m], m: r.m, n, to, ev: [short(r.event)], l: short(r.event) + ', attempt ' + n + ': ' + (to ? 'no answer in 1 s' : res + (q && /queued/.test(q.what) ? ', queued' : '')),
          c: to ? 'var(--mute)' : /503/.test(res) ? 'var(--bad)' : 'var(--good)', d: to ? 1 : 0, x: /503/.test(res) ? 1 : 0,
        });
      } else if (r.what === 'work done') work[r.m].push(r.status_stored);
    });
    ['naive', 'careful'].forEach(m => { const k = work[m].length; ran[m] += k;
      if (!k) return;
      const flip = work[m].includes('running');
      rows.push({ at: LANE[m], c: flip ? 'var(--bad)' : 'var(--good)',
        l: 'work ran ' + ran[m] + (ran[m] === 1 ? ' time' : ' times') + ' · stored: ' + work[m].join(', ') }); });
    return rows.map(r => { const o = {}; ['f', 't', 'l', 'c', 'd', 'x', 'sub', 'at'].forEach(k => { if (r[k] != null && !((k === 'd' || k === 'x') && !r[k])) o[k] = r[k]; }); return o; });
  }
  const steps = [[
    { f: PR, t: CF, l: 'POST · webhook-signature: v1,...', c: 'var(--c1)', sub: 'HMAC over the raw body: ' + sg.raw_body },
    { at: [NV, CF], l: 're-serialised JSON: ' + err(sg.reserialised) + ' · signed 10 minutes ago: ' + err(sg.ten_minutes_old), c: 'var(--bad)' }
  ]].concat(WIN.map(stretch));
  SQ({ id: 'sq-wh', list: 'sx-wh', fig: 'Fig. 9 · two receivers, one recorded delivery run each', ms: 5200,
    lanes: [{ n: 'naive receiver', s: 'naive', c: 'var(--c5)' }, { n: 'provider (sender)', s: 'provider', c: 'var(--c1)' }, { n: 'careful receiver', s: 'careful', c: 'var(--c3)' }],
    steps });
})();
