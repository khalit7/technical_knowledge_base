// ---- Fig. 3, deadlines and cancellation (sq-dl): the recorded chain client -> gateway -> inference service (raw/deadline.json, 5 October 2026),
// four runs, drawn on a time axis (0 to 2.5 s): one row per party, a tick per token generated, forwarded or received, the deadline, the moment
// the client gives up, the RST_STREAM on each hop and when the inference service stopped. A 3D stage until 2026-11-19, redrawn flat because
// its depth carried nothing and a time axis shows what the 3D slots could not: when the deadline expires against when the work stops.
// Counts, end times, headers and RST_STREAM times are window.SA.deadline; where a token sits on the axis follows the configured schedule
// (first after 0.12 s, then every 0.05 s), not individual timings. Uses the card style of 28_js_seq.js (its CSS is injected by the hero,
// 41_js_sc_hero.js, which runs first). ----
(function () {
  const host = document.getElementById('sq-dl');
  if (!host || !window.RD || !window.SA) return;
  const DL = SA.deadline, FIRST = .12, GAP = .05, T = 2.5, tt = i => FIRST + GAP * i,
    made = t => t < FIRST ? 0 : Math.min(40, Math.floor((t - FIRST) / GAP + 1e-9) + 1);
  window.SA_DL = { DL };   // read by src/check_stages.mjs
  let m = 0, ctx = null;
  const esc = RD.esc, FIG = 'Fig. 3 · one abandoned request, on a clock';
  host.classList.add('sq'); if (host.parentElement) host.parentElement.classList.add('sq-wrap');
  host.innerHTML = '<div class="sq-top"><span>' + esc(FIG) + '</span><span id="sq-dl-st"></span></div><div class="sq-svg" id="sq-dl-svg"></div><div class="an-ctl" id="sq-dl-ctl"></div>';
  const box = document.getElementById('sq-dl-svg'), stl = document.getElementById('sq-dl-st');
  function tw(t, fs) { if (!ctx) ctx = document.createElement('canvas').getContext('2d'); ctx.font = fs + 'px ' + (getComputedStyle(document.body).fontFamily || 'sans-serif'); return ctx.measureText(t).width; }
  function wrap(t, w, fs) { const out = []; let cur = ''; t.split(' ').forEach(x => { const n = cur ? cur + ' ' + x : x; if (tw(n, fs) > w && cur) { out.push(cur); cur = x; } else cur = n; }); if (cur) out.push(cur); return out; }
  const txt = (x, y, s, o) => { o = o || {}; return '<text x="' + x + '" y="' + y + '" font-size="' + (o.fs || 12) + '"' + (o.a ? ' text-anchor="' + o.a + '"' : '') + (o.b ? ' font-weight="600"' : '') +
    (o.cls ? ' class="' + o.cls + '"' : '') + ' paint-order="stroke" stroke="var(--card)" stroke-width="3" stroke-linejoin="round" style="fill:' + (o.c || 'var(--ink)') + '">' + esc(s) + '</text>'; };
  function draw(k) {
    const r = DL[m], gone = r.client.gave_up_s, inf = r.inference, gw = r.gateway, rec = r.client.tokens_received;
    stl.textContent = 'step ' + (k + 1) + ' of 5';
    const W = Math.max(280, Math.round((box.clientWidth || RD.width(host)) - 16)), narrow = W < 480, fs = 12, G = narrow ? 86 : 100, x0 = G, x1 = W - 12;
    const X = t => x0 + (x1 - x0) * Math.min(t, T) / T, fwd = host.classList.contains('rd-fwd'), nu = () => fwd ? ' class="rd-new"' : '';
    const t = k === 0 ? 0 : k < 3 ? gone : inf.dur_s;
    const nI = Math.min(inf.tokens_made, made(t)), nC = Math.min(rec, made(Math.min(t, gone))), nG = k >= 3 ? gw.tokens_forwarded : nC;
    const RB = 33, HG = 31, yC = 26, yG = yC + RB + HG, yI = yG + RB + HG, yA = yI + RB + 4;
    let s = '';
    // the time axis
    s += '<line x1="' + x0 + '" y1="' + yA + '" x2="' + x1 + '" y2="' + yA + '" style="stroke:var(--mute)" stroke-width="1"/>';
    [0, .5, 1, 1.5, 2, 2.5].forEach(v => { const x = X(v); s += '<line x1="' + x + '" y1="' + yA + '" x2="' + x + '" y2="' + (yA + 4) + '" style="stroke:var(--mute)"/>' +
      txt(x, yA + 17, v === 2.5 ? '2.5 s' : String(v), { fs: 11.5, a: v === 2.5 ? 'end' : 'middle', c: 'var(--mute)' }); });
    // the deadline (or the planned cancel) and, from step 3, the moment the client gave up
    const dl = r.deadline != null ? r.deadline : r.cancel_at;
    s += '<line x1="' + X(dl) + '" y1="14" x2="' + X(dl) + '" y2="' + yA + '" style="stroke:var(--c6)" stroke-width="1.6" stroke-dasharray="5 4"/>';
    if (k < 2) s += txt(X(dl) + 5, 14, r.deadline != null ? 'deadline ' + r.deadline + ' s' : 'no deadline · cancels at ' + r.cancel_at + ' s', { b: 1, c: 'var(--c6)' });
    else s += '<g' + (k === 2 ? nu() : '') + '><line x1="' + X(gone) + '" y1="14" x2="' + X(gone) + '" y2="' + (yC + RB + HG - 4) + '" style="stroke:var(--bad)" stroke-width="2.2"/>' +
      txt(X(gone) + 5, 14, r.client.code + ' at ' + gone + ' s', { b: 1, c: 'var(--bad)' }) + '</g>';
    // one row per party: 40 faint slots (the full answer on the schedule), a tick per token, the count under it
    const rows = [[yC, 'client', 'var(--c1)', nC, nC + ' received', null],
      [yG, 'gateway', 'var(--c5)', nG, nG + ' forwarded', gw.time_remaining_s != null ? gw.time_remaining_s + ' s left' : 'no deadline'],
      [yI, 'inference', 'var(--c3)', nI, nI + ' made' + (k >= 3 ? (inf.end === 'ok' ? ' · ended at ' : ' · stopped at ') + inf.dur_s + ' s' : ''), inf.time_remaining_s != null ? inf.time_remaining_s + ' s left' : 'no deadline']];
    const tkw = Math.max(2, Math.min(7, (X(GAP) - X(0)) * .62));
    rows.forEach(([y, name, c, n, cnt, left], j) => {
      s += txt(4, y + 12, name, { b: 1, fs: 12.5 });
      if (left) s += txt(4, y + 28, left, { c: 'var(--c6)' });
      else if (j === 0) s += txt(4, y + 28, r.deadline != null ? r.deadline + ' s set' : 'no deadline', { c: 'var(--c6)' });
      for (let i = 0; i < 40; i++) s += '<rect x="' + (X(tt(i)) - tkw / 2) + '" y="' + y + '" width="' + tkw + '" height="14" rx="1.5" style="fill:none;stroke:var(--line)" stroke-width=".8"/>';
      let g = '';
      for (let i = 0; i < n; i++) { const red = j === 2 && k >= 3 && i >= rec; g += '<rect x="' + (X(tt(i)) - tkw / 2) + '" y="' + y + '" width="' + tkw + '" height="14" rx="1.5" style="fill:' + (red ? 'var(--bad)' : c) + '"/>'; }
      s += '<g' + (k === 1 || (k === 3 && j > 0) ? nu() : '') + '>' + g + '</g>';
      if (j === 2 && k >= 3) s += '<line x1="' + X(inf.dur_s) + '" y1="' + (y - 4) + '" x2="' + X(inf.dur_s) + '" y2="' + (y + 18) + '" style="stroke:' + (inf.tokens_made > rec ? 'var(--bad)' : 'var(--good)') + '" stroke-width="2.4"/>';
      if (k >= 1) s += txt(x0, y + 28, cnt, { b: 1, c: j === 2 && k >= 3 ? (inf.tokens_made > rec ? 'var(--bad)' : 'var(--good)') : c });
    });
    // the two hops: what travels with the call (line 1), what ends the stream (line 2)
    const h1 = yC + RB, h2 = yG + RB;
    if (k === 1) s += txt(x0, h1 + 13, 'each token: one length-prefixed message', { c: 'var(--mute)', cls: fwd ? 'rd-new' : '' });
    const hop2 = r.hop2_timeout ? 'grpc-timeout: ' + r.hop2_timeout : r.mode === 'propagate' ? 'cancel hook: ctx.add_callback' : 'no grpc-timeout';
    s += txt(x0, h2 + 13, hop2, { b: 1, c: r.hop2_timeout || r.mode === 'propagate' ? 'var(--c6)' : 'var(--bad)' });
    const xmark = (x, y) => '<path d="M' + (x - 4) + ' ' + (y - 4) + 'L' + (x + 4) + ' ' + (y + 4) + 'M' + (x - 4) + ' ' + (y + 4) + 'L' + (x + 4) + ' ' + (y - 4) + '" style="stroke:var(--bad)" stroke-width="2"/>';
    if (k >= 2) s += '<g' + (k === 2 ? nu() : '') + '>' + xmark(X(gone), h1 + 23) + txt(X(gone) + 9, h1 + 27, 'RST_STREAM (CANCEL)', { b: 1, c: 'var(--bad)' }) + '</g>';
    if (k >= 3) { const e = r.hop2_end[0];
      s += '<g' + (k === 3 ? nu() : '') + '>' + (e.type === 'RSTSTREAM'
        ? xmark(X(e.ms / 1000), h2 + 23) + txt(X(e.ms / 1000) + 9, h2 + 27, (narrow ? 'RST_STREAM at ' : 'RST_STREAM (CANCEL) at ') + e.ms.toFixed(1) + ' ms', { b: 1, c: 'var(--bad)' })
        : txt(x0, h2 + 27, 'the worker thread keeps reading', { b: 1, c: 'var(--bad)' })) + '</g>'; }
    // the step's one-line summary, under the axis
    const waste = inf.tokens_made - rec;
    const note = [FIRST + ' s to the first token, then one every ' + GAP + ' s: a full answer is 40 tokens, about 2.1 s',
      'tokens stream back: ' + nI + ' made, ' + nG + ' forwarded, ' + nC + ' received by ' + gone + ' s',
      r.client.code + ' at ' + gone + ' s, after ' + rec + ' tokens',
      inf.end === 'ok' ? 'the inference service generated all ' + inf.tokens_made + ' tokens and ended at ' + inf.dur_s + ' s' : 'the inference service stopped after ' + inf.tokens_made + ' tokens, ' + inf.dur_s + ' s',
      inf.tokens_made + ' generated · ' + rec + ' delivered · ' + (waste ? waste + ' for nobody' : 'nothing for nobody')][k];
    const nc = k === 4 ? (waste ? 'var(--bad)' : 'var(--good)') : k === 3 && inf.tokens_made > rec ? 'var(--bad)' : 'var(--ink)';
    // on a phone the step list under the card says the same, so the card stays short enough to stay under the nav
    const lines = narrow ? [] : wrap(note, W - 24, 12.5), yN = yA + 28, hN = narrow ? -6 : lines.length * 17 + 10;
    if (!narrow) s += '<g' + nu() + '><rect x="2" y="' + yN + '" width="' + (W - 4) + '" height="' + hN + '" rx="8" style="fill:var(--soft)"/>' +
      lines.map((l, j) => txt(W / 2, yN + 5 + (j + 1) * 17 - 4, l, { fs: 12.5, a: 'middle', b: k === 4 ? 1 : 0, c: nc })).join('') + '</g>';
    const H = yN + hN + 4;
    box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(FIG + ', run ' + r.label + ', step ' + (k + 1) + ' of 5') + '">' + s + '</svg>';
  }
  const A = RD.anim({ card: 'sq-dl', ctl: 'sq-dl-ctl', n: 5, draw, ms: 4800, label: 'Step', list: 'sx-dl-0' });
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (host.offsetParent !== null) A.redraw(); }, 60); });
  // the run chips: swap the step list and replay from step 1
  const chips = document.getElementById('dl-mode');
  if (chips) chips.addEventListener('click', ev => { const b = ev.target.closest('button[data-m]'); if (!b) return;
    chips.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    chips.parentNode.querySelectorAll('ol.sx[id^="sx-dl-"]').forEach(o => o.hidden = o.id !== 'sx-dl-' + b.dataset.m);
    m = +b.dataset.m; A.reset(5, 'sx-dl-' + b.dataset.m); });
})();
