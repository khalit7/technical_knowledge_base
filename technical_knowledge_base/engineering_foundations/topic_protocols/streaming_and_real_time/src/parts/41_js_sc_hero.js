// ---- Fig. 1, the hero (sq-hero): one answer, four ways, then the webhook, as a flat 2D timing figure driven by RD.anim (list sx-hero).
// A 3D stage (stg-hero) until 2026-11-19, redrawn flat because its depth carried nothing: it was a lane per mechanism placed in depth,
// and what the reader needs is when each message travels and which way, which reads faster on a shared time axis. One row per mechanism,
// each a small time-sequence diagram: the server line on top, the client line below, time left to right on one axis (0 to 600 ms).
// Requests up (orange, from the client), answers and events down (blue, from the server), a held long-polling request as a gold box on
// the server line, the open SSE response or WebSocket connection as a band between the lines. Every request, response and event is placed
// at the moment the 100 ms round-trip run recorded it (SDATA.fw['100'], the median of 7 runs through the relay of section 1; a one-way trip
// drawn as half the round trip), and plays slowed about seven times when its step is shown. The webhook row replays the first two deliveries
// of the careful receiver's recorded run (SDATA.hooks), not to scale (hours later). Step 6 draws each row's last token as a bar. ----
(function () {
  const host = document.getElementById('sq-hero');
  if (!host || !window.RD || !window.SDATA) return;
  const D = SDATA.fw['100'], M = ['short polling', 'long polling', 'SSE', 'WebSocket'], NM = ['Polling', 'Long polling', 'SSE', 'WebSocket'];
  const OW = .05, TMAX = .6, SLOW = 7, TOK = ['The', 'sky', 'is', 'blue', '.'];
  const ms = s => Math.round(s * 1000), last = m => D[m].arr[D[m].arr.length - 1][1];
  const CL = SDATA.hooks.delivery.careful.log.filter(r => r.sender && r.event === 'job.running');   // attempt 1: HTTP 503, attempt 2: HTTP 200
  window.ST_HERO = { last: M.map(m => ms(last(m))), req: M.map(m => D[m].requests), down: M.map(m => D[m].down), hook: CL.map(r => r.what) };   // read by check_stages.mjs
  const esc = RD.esc, RM = RD.RM;
  const css = '.sq{background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);overflow:hidden;margin:6px 0 16px}' +
    '.sq-top{display:flex;justify-content:space-between;gap:10px;padding:8px 12px 2px;font:11.5px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}' +
    '.sq-top span:first-child{min-width:0}.sq-top span:last-child{white-space:nowrap}' +
    '.sq-svg{padding:2px 8px 4px}.sq-svg svg{display:block;width:100%;height:auto;overflow:visible}' +
    '.sq .an-ctl{display:flex;align-items:center;gap:6px;flex-wrap:nowrap;padding:6px 10px 8px;border-top:1px solid var(--line);margin:0}' +
    '.sq .an-ctl button{padding:4px 11px;font-size:13px;white-space:nowrap}.sq .an-ctl input[type=range]{flex:1 1 40px;min-width:30px}.sq .an-ctl select{font-size:12.5px;padding:3px 6px}' +
    '@media (max-width:1099px){.sq-wrap{position:sticky;top:50px;z-index:3}}@media (min-width:1100px){.sq{margin-top:20px}}' +
    '@media (max-width:520px){.sq{border-radius:12px}.sq .an-ctl{gap:4px;padding:5px 6px 6px}.sq .an-ctl button{padding:4px 9px}.sq .an-ctl select{padding:3px 4px}}' +
    '@keyframes hzA{from{opacity:0}to{opacity:1}}@keyframes hzD{from{stroke-dashoffset:1;opacity:.2}to{stroke-dashoffset:0;opacity:1}}@keyframes hzX{from{transform:scaleX(0)}to{transform:scaleX(1)}}' +
    '.hz-play .hz-a{animation:hzA .35s ease-out both}.hz-play .hz-d{animation:hzD .35s linear both}.hz-play .hz-x{transform-box:fill-box;transform-origin:left center;animation:hzX .6s linear both}' +
    '@media (prefers-reduced-motion:reduce){.hz-play .hz-a,.hz-play .hz-d,.hz-play .hz-x{animation:none}}';
  if (!document.getElementById('hz-css')) { const s = document.createElement('style'); s.id = 'hz-css'; s.textContent = css; document.head.appendChild(s); }
  host.classList.add('sq');
  host.innerHTML = '<div class="sq-top"><span>Fig. 1 · one answer, four ways, then a webhook</span><span id="sq-hero-st"></span></div><div class="sq-svg" id="sq-hero-svg"></div><div class="an-ctl" id="sq-hero-ctl"></div>';
  if (host.parentElement) host.parentElement.classList.add('sq-wrap');
  const box = document.getElementById('sq-hero-svg'), stl = document.getElementById('sq-hero-st');
  let ctx = null;
  const tw = (t, fs, b, mono) => { if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    ctx.font = (b ? '600 ' : '') + fs + 'px ' + (mono ? 'ui-monospace,Menlo,Consolas,monospace' : (getComputedStyle(document.body).fontFamily || 'sans-serif')); return ctx.measureText(t).width; };
  const MONO = ' font-family="ui-monospace,SFMono-Regular,Menlo,Consolas,monospace"';
  // an element that appears at the run's time t (seconds), slowed SLOW times, when the step plays
  const dl = (t, dur) => ' style="animation-delay:' + (t * SLOW).toFixed(2) + 's' + (dur ? ';animation-duration:' + dur.toFixed(2) + 's' : '') + '"';
  const txt = (x, y, t, o) => { o = o || {}; return '<text x="' + x + '" y="' + y + '" text-anchor="' + (o.al || 'middle') + '" font-size="' + (o.fs || 12) + '"' + (o.b ? ' font-weight="600"' : '') + (o.mono ? MONO : '') +
    (o.cls ? ' class="' + o.cls + '"' : '') + (o.st || '') + (o.halo ? ' paint-order="stroke" stroke="var(--card)" stroke-width="4" stroke-linejoin="round"' : '') + ' fill="' + (o.c || 'var(--ink)') + '">' + esc(t) + '</text>'; };
  const arrow = (x1, y1, x2, y2, c, t0, dur, w) => '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" stroke="' + c + '" stroke-width="' + (w || 1.8) + '" pathLength="1" stroke-dasharray="1" marker-end="url(#hz-ar)" class="hz-d"' + dl(t0, dur) + '/>';
  // one row: a two-line time-sequence diagram for mechanism i at the top y; a is its opacity; the row's run is animated when anim
  function row(L, i, y, a) {
    const m = M[i], r = D[m], X = L.X, yS = y + 40, yC = y + 74, fs = L.fs, cS = 'var(--c2)', cE = 'var(--c1)';
    let s = '<g opacity="' + a + '">';
    s += txt(L.G0, y + 14, NM[i], { al: 'start', b: 1, fs: 13, halo: 1 });
    s += line(L, yS, yC, 'server', 'client');
    const lt = last(m), lab = 'last token ' + ms(lt) + ' ms · ' + r.requests + (r.requests === 1 ? ' request' : ' requests');
    s += txt(L.W - 2, y + 14, lab, { al: 'end', mono: 1, b: 1, fs: L.compact ? 11.5 : 12, cls: 'hz-a', st: dl(lt), halo: 1 });
    if (m === 'short polling' || m === 'long polling') {
      r.req.forEach((q, n) => {
        if (m === 'long polling' && q[1] - q[0] > 2 * OW) { const x0 = X(q[0] + OW), x1 = Math.max(X(q[1] - OW), x0 + 5);
          s += '<rect x="' + x0 + '" y="' + (yS - 6) + '" width="' + (x1 - x0) + '" height="12" rx="3" fill="var(--c5)" fill-opacity=".55" stroke="var(--c5)" class="hz-x"' + dl(q[0] + OW, Math.max(.05, (q[1] - q[0] - 2 * OW) * SLOW)) + '/>'; }
        s += arrow(X(q[0]), yC, X(q[0] + OW), yS + 2, cS, q[0], OW * SLOW);
        s += arrow(X(q[1] - OW), yS, X(q[1]), yC - 2, cE, q[1] - OW, OW * SLOW);
        s += txt(X(q[1] - OW), yS - 9, L.compact ? String(q[2]) : q[2] + (q[2] === 1 ? ' event' : ' events'), { fs: L.compact ? 12 : 11.5, c: 'var(--c1)', b: 1, cls: 'hz-a', st: dl(q[1] - OW) });
        if (!n) s += txt(X(0), yC + 16, 'GET', { al: 'start', mono: 1, c: cS, fs: 12, cls: 'hz-a', st: dl(0) });
      });
    } else {
      const ws = m === 'WebSocket', cb = ws ? 'var(--c4)' : 'var(--c1)';
      s += '<rect x="' + X(OW) + '" y="' + (yS + 3) + '" width="' + (X(TMAX) - X(OW)) + '" height="' + (yC - yS - 6) + '" fill="' + cb + '" fill-opacity=".13" class="hz-x"' + dl(OW, (TMAX - OW) * SLOW) + '/>';
      s += arrow(X(0), yC, X(OW), yS + 2, cS, 0, OW * SLOW);
      if (ws) s += arrow(X(OW), yS, X(2 * OW), yC - 2, 'var(--mute)', OW, OW * SLOW);
      s += txt(X(OW) + 4, yS - 9, ws ? (L.compact ? '101 · one connection' : '101 · one connection, both ways') : (L.compact ? 'one response, open' : 'one response, held open'), { al: 'start', fs: 11.5, c: cb, b: 1, cls: 'hz-a', st: dl(OW) });
      s += txt(X(0), yC + 16, ws ? 'GET Upgrade' : 'POST', { al: 'start', mono: 1, c: cS, fs: 12, cls: 'hz-a', st: dl(0) });
      r.arr.forEach(([ev, ta]) => { const tok = ev === 'content_block_delta';
        s += arrow(X(ta - OW), yS, X(ta), yC - 2, tok ? cE : 'var(--mute)', ta - OW, OW * SLOW, tok ? 1.8 : 1.2); });
    }
    // tokens at the client, grouped by arrival time (polling delivers them in clumps)
    const G = []; let k = 0;
    r.arr.forEach(([ev, ta]) => { if (ev !== 'content_block_delta') return; const g = G.find(g => Math.abs(g.t - ta) < .002); if (g) g.w.push(TOK[k++]); else G.push({ t: ta, w: [TOK[k++]] }); });
    const ws = m === 'WebSocket' || m === 'SSE';
    G.forEach(g => { if (L.compact && ws) { s += '<circle cx="' + X(g.t) + '" cy="' + (yC + 11) + '" r="3.2" fill="var(--c1)" class="hz-a"' + dl(g.t) + '/>'; return; }
      s += txt(X(g.t), yC + 16, g.w.join(' '), { fs: 12, mono: 1, c: 'var(--c1)', b: 1, cls: 'hz-a', st: dl(g.t) }); });
    s += '<line x1="' + X(lt) + '" y1="' + (yC - 5) + '" x2="' + X(lt) + '" y2="' + (yC + 5) + '" stroke="var(--ink)" stroke-width="2" class="hz-a"' + dl(lt) + '/>';
    return s + '</g>';
  }
  function line(L, yS, yC, a, b) {
    return '<line x1="' + L.X(0) + '" y1="' + yS + '" x2="' + L.X(TMAX) + '" y2="' + yS + '" stroke="var(--mute)" stroke-width="1.3"/>' +
      '<line x1="' + L.X(0) + '" y1="' + yC + '" x2="' + L.X(TMAX) + '" y2="' + yC + '" stroke="var(--mute)" stroke-width="1.3"/>' +
      txt(L.G0, yS + 4, a, { al: 'start', fs: 12, c: 'var(--mute)' }) + txt(L.G0, yC + 4, b, { al: 'start', fs: 12, c: 'var(--mute)' });
  }
  // the webhook row: the provider on top, your public URL below; the order of the careful run's first deliveries, not to scale
  function hook(L, y, a) {
    const x0 = L.X(0), x1 = L.X(TMAX), F = f => x0 + f * (x1 - x0), yS = y + 40, yC = y + 74, T = f => f * .6;   // T: a fraction of the row as the animation's clock
    let s = '<g opacity="' + a + '">';
    s += txt(L.G0, y + 14, 'Webhook', { al: 'start', b: 1, fs: 13, halo: 1 }) + txt(L.W - 2, y + 14, L.compact ? 'hours later, not to scale' : 'hours later: job.running · not to scale', { al: 'end', fs: 12, c: 'var(--mute)', halo: 1 });
    s += line(L, yS, yC, 'provider', L.compact ? 'you' : 'your URL');
    const r1 = CL[0].what.replace(/^attempt 1: /, ''), r2 = CL[1].what.replace(/^attempt 2: /, '');
    s += arrow(F(.02), yS, F(.12), yC - 2, 'var(--c1)', T(.02), .5, 2.2) + txt(F(.02), yS - 9, 'POST, signed', { al: 'start', mono: 1, fs: 12, c: 'var(--c1)', cls: 'hz-a', st: dl(T(.02)) });
    s += arrow(F(.17), yC, F(.27), yS + 2, 'var(--bad)', T(.2), .5, 2.2) + txt(F(.2), yC + 16, r1, { mono: 1, fs: 12, c: 'var(--bad)', b: 1, cls: 'hz-a', st: dl(T(.25)) });
    s += '<g class="hz-a"' + dl(T(.3)) + '><circle cx="' + F(.27) + '" cy="' + yS + '" r="8" fill="var(--card)" stroke="var(--bad)" stroke-width="1.6"/><path d="M' + (F(.27) - 4) + ' ' + (yS - 4) + 'l8 8m0 -8l-8 8" stroke="var(--bad)" stroke-width="2"/></g>';
    s += arrow(F(.46), yS, F(.56), yC - 2, 'var(--c1)', T(.5), .5, 2.2) + txt(F(.46), yS - 9, 'retry', { al: 'start', mono: 1, fs: 12, c: 'var(--c1)', cls: 'hz-a', st: dl(T(.5)) });
    s += arrow(F(.62), yC, F(.72), yS + 2, 'var(--good)', T(.75), .5, 2.2) + txt(F(.66), yC + 16, r2, { mono: 1, fs: 12, c: 'var(--good)', b: 1, cls: 'hz-a', st: dl(T(.8)) });
    const cw = tw('signature checked', 12, 1) + 14, cx = Math.min(F(.78), L.W - cw - 2), cy = L.compact ? yC + 36 : (yS + yC) / 2;   // narrow: under the row, clear of the labels
    s += '<g class="hz-a"' + dl(T(.68)) + '><rect x="' + cx + '" y="' + (cy - 11) + '" width="' + cw + '" height="22" rx="6" fill="color-mix(in srgb,var(--good) 14%,var(--card))" stroke="var(--good)"/>' + txt(cx + cw / 2, cy + 4, 'signature checked', { fs: 12, b: 1 }) + '</g>';
    return s + '</g>';
  }
  // step 6 on a narrow screen: the four last tokens as bars on the same axis
  function bars(L, y) {
    let s = '';
    M.forEach((m, i) => { const yy = y + i * 34, lt = last(m), x = L.X(lt), c = i < 2 ? 'var(--c5)' : 'var(--c1)';
      s += txt(L.G0, yy + 12, NM[i], { al: 'start', fs: 12, b: 1 });
      s += '<rect x="' + L.X(0) + '" y="' + (yy + 17) + '" width="' + (x - L.X(0)) + '" height="10" rx="3" fill="' + c + '" class="hz-x"' + dl(0, 1) + '/>';
      s += txt(x + 5, yy + 26, ms(lt) + ' ms', { al: 'start', mono: 1, b: 1, fs: 12, cls: 'hz-a', st: dl(.14) }); });
    return s;
  }
  function axis(L, y, h) {
    let s = '';
    for (let j = 0; j <= 6; j++) { const t = j / 10, x = L.X(t), lab = !L.compact || j % 2 === 0;
      s += '<line x1="' + x + '" y1="' + (y + 6) + '" x2="' + x + '" y2="' + (y + h) + '" stroke="var(--line)" stroke-width="1"/>';
      if (lab) s += txt(x, y, t === 0 ? '0' : t > TMAX - .01 ? ms(t) + ' ms' : String(ms(t)), { fs: 11.5, mono: 1, c: 'var(--mute)', al: t > TMAX - .01 ? 'end' : 'middle' }); }
    return s;
  }
  const RH = 114, AX = 22;
  function render(i, play) {
    const n = 6; stl.textContent = 'step ' + (i + 1) + ' of ' + n;
    const compact = innerWidth < 1100, W = Math.max(280, Math.round((box.clientWidth || RD.width(host)) - 16));
    const G0 = 0, G = compact ? 56 : 66, X1 = W - (compact ? 44 : 58), X = t => G + (X1 - G) * t / TMAX, L = { W, G0, G, X, compact, fs: 12 };
    let s = '<defs><marker id="hz-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>', H;
    const cur = k => '<rect x="0" y="' + k + '" width="' + W + '" height="' + (RH - 4) + '" rx="8" fill="var(--soft)"/>';
    if (compact) {
      // the current row only (or the bars), at one fixed height so the sticky card does not jump
      H = AX + 4 * 34 + 8;
      const y = AX + 6;
      if (i <= 3) s += axis(L, 12, y + 84) + row(L, i, y, 1);
      else if (i === 4) s += hook(L, y, 1);
      else s += axis(L, 12, H - 4) + bars(L, y);
    } else {
      H = AX + 5 * RH + 6;
      s += axis(L, 12, AX + 4 * RH - 6);
      const y = k => AX + 4 + k * RH;
      if (i <= 4) s += cur(y(i) - 2);
      M.forEach((_, k) => { const a = i === 5 ? 1 : k === i ? 1 : k < i ? .6 : .14; s += row(L, k, y(k), a); });
      s += hook(L, y(4), i === 4 ? 1 : i === 5 ? .35 : .14);
      if (i === 5) M.forEach((m, k) => { const lt = last(m), yy = y(k) + 74 + 31, x = X(lt), c = k < 2 ? 'var(--c5)' : 'var(--c1)';
        s += '<rect x="' + X(0) + '" y="' + (yy - 5) + '" width="' + (x - X(0)) + '" height="8" rx="3" fill="' + c + '" fill-opacity=".85" class="hz-x"' + dl(0, 1) + '/>';
        s += txt(x + 5, yy + 3, ms(lt) + ' ms', { al: 'start', mono: 1, b: 1, fs: 12, cls: 'hz-a', st: dl(.14) }); });
    }
    box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="Fig. 1, step ' + (i + 1) + ' of ' + n + '"' + (play ? ' class="hz-play"' : '') + '>' + s + '</svg>';
  }
  // the current step's run plays once when the step is shown in view; a resize redraws it at rest
  let lastI = -1, vis = false, pend = false, A = null;
  function draw(i) { const fresh = i !== lastI; lastI = i; if (fresh && !vis) pend = true; render(i, fresh && vis && !RM); }
  if ('IntersectionObserver' in window) new IntersectionObserver(es => { const e = es[es.length - 1];
    vis = e.isIntersecting && (e.intersectionRatio >= .5 || e.intersectionRect.height >= innerHeight * .5);
    if (vis && pend && lastI >= 0) { pend = false; render(lastI, !RM); } }, { threshold: [0, .25, .5, .75] }).observe(host); else vis = true;
  // each step holds long enough for the slowed run (about 4.2 s) and a look
  A = RD.anim({ card: 'sq-hero', ctl: 'sq-hero-ctl', n: 6, draw, ms: 6400, label: 'Step', list: 'sx-hero' });
  let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (host.offsetParent !== null) render(lastI, false); }, 60); });
})();
