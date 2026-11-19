// ---- 2D sequence figures (2026-11-19): parties as columns, time down the card, one band of messages per step, driven by RD.anim with the
// step list on the left (list:'sx-...'). Used where a 3D stage's depth carried nothing (parties, hops, a request's path). In the split
// (1100 px and wider) the whole ladder is drawn: earlier steps in full, the current one highlighted, later ones faint, so the layout is visible
// from the first step. Narrower, the card shows the lanes and the current step only, at a fixed height, and stays under the section nav.
// SQ({id, list, fig, lanes:[{n, s (short name under 520 px), c (colour), k (first step it takes part in)}], steps:[[row, ...], ...], ms})
// A row is an arrow {f, t, l (label above), c, d (dashed), x (refused at the target), sub (a muted line under the arrow)}
// or a note {at: lane or [first, last] lanes, l, c}. o.onStep(i), if given, runs after each draw (for example to fill a block on the left).
// SQ.card(id, fig) builds the same card for a bespoke 2D figure and returns {host, box, stl, ctl}; SQ.wrap(text, maxW, fs, bold) and SQ.tw measure text. ----
window.SQ = (function () {
  const css = '.sq{background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);overflow:hidden;margin:6px 0 16px}' +
    '.sq-top{display:flex;justify-content:space-between;gap:10px;padding:8px 12px 2px;font:11.5px/1.3 ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}' +
    '.sq-top span:first-child{min-width:0}.sq-top span:last-child{white-space:nowrap}' +
    '.sq-svg{padding:2px 8px 4px}.sq-svg svg{display:block;width:100%;height:auto;overflow:visible}' +
    '.sq .an-ctl{display:flex;align-items:center;gap:6px;flex-wrap:nowrap!important;padding:6px 10px 8px;border-top:1px solid var(--line);margin:0}' +
    '.sq .an-ctl label{white-space:nowrap;font-size:13px}.sq .an-ctl button{padding:4px 11px;font-size:13px;white-space:nowrap}.sq .an-ctl input[type=range]{flex:1 1 40px;min-width:30px}.sq .an-ctl select{font-size:12.5px;padding:3px 6px}' +
    '.sq .sq-band{cursor:pointer}' +
    '@keyframes sqIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}' +
    '.sq.rd-fwd .rd-new{animation:sqIn .55s cubic-bezier(.2,.7,.2,1) both}' +
    '@media (prefers-reduced-motion:reduce){.sq.rd-fwd .rd-new{animation:none}}' +
    '@media (max-width:1099px){.sq-wrap{position:sticky;top:50px;z-index:3}}' +
    '@media (min-width:1100px){.sq{margin-top:20px}}' +
    '@media (max-width:520px){.sq{border-radius:12px}.sq .an-ctl{gap:4px;padding:5px 6px 6px}.sq .an-ctl button{padding:4px 9px}.sq .an-ctl select{padding:3px 4px}}';
  let ctx = null;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  function tw(t, fs, b) {
    if (!ctx) ctx = document.createElement('canvas').getContext('2d');
    ctx.font = (b ? '600 ' : '') + fs + 'px ' + (getComputedStyle(document.body).fontFamily || 'sans-serif');
    return ctx.measureText(t).width;
  }
  function wrap(t, maxW, fs, b) {
    const out = []; let cur = '';
    String(t).split(' ').forEach(w => { const n = cur ? cur + ' ' + w : w; if (tw(n, fs, b) > maxW && cur) { out.push(cur); cur = w; } else cur = n; });
    if (cur) out.push(cur); return out;
  }
  // the card: title bar (figure name, step k of n), the drawing, the controls; also used by bespoke 2D figures (SQ.card)
  function card(id, fig) {
    const host = document.getElementById(id); if (!host || !window.RD) return null;
    if (!document.getElementById('sq-css')) { const s = document.createElement('style'); s.id = 'sq-css'; s.textContent = css; document.head.appendChild(s); }
    host.classList.add('sq');
    host.innerHTML = '<div class="sq-top"><span>' + esc(fig) + '</span><span id="' + id + '-st"></span></div><div class="sq-svg" id="' + id + '-svg"></div><div class="an-ctl" id="' + id + '-ctl"></div>';
    // under 1100 px the card stays under the section nav while its list is read, but only while it takes at most half the window
    const fit = () => { if (host.parentElement) host.parentElement.classList.toggle('sq-wrap', host.offsetHeight <= innerHeight * .5); };
    if ('ResizeObserver' in window) new ResizeObserver(fit).observe(host); addEventListener('resize', fit);
    return { host, box: document.getElementById(id + '-svg'), stl: document.getElementById(id + '-st'), ctl: id + '-ctl' };
  }
  function make(o) {
    const cd = card(o.id, o.fig); if (!cd) return null;
    const { host, box, stl } = cd;
    let A = null;
    function layout(W, compact) {
      const fs = compact ? 12 : 12.5, lh = Math.round(fs * 1.32), G = compact ? 0 : 30, nl = o.lanes.length, lw = (W - G) / nl;
      const xs = o.lanes.map((_, k) => G + (k + .5) * lw);
      const names = o.lanes.map(l => wrap(compact && l.s ? l.s : l.n, lw - 10, fs, 1));
      const hh = Math.max(...names.map(a => a.length)) * lh + 12, top = hh + 14;
      const bands = o.steps.map(rows => {
        const R = rows.map(r => {
          if (r.at != null) {
            const a = Array.isArray(r.at) ? r.at : [r.at, r.at], x0 = xs[a[0]] - lw / 2 + 4, x1 = xs[a[1]] + lw / 2 - 4;
            const mw = Math.max(x1 - x0, Math.min(W - G - 8, 200)), lines = wrap(r.l, mw - 14, fs);
            const w = Math.min(mw, Math.max(...lines.map(t => tw(t, fs))) + 16), cx = Math.max(G + w / 2 + 2, Math.min(W - w / 2 - 2, (x0 + x1) / 2));
            return { r, note: 1, lines, w, cx, h: lines.length * lh + 10 };
          }
          const x1 = xs[r.f], x2 = xs[r.t], span = Math.abs(x2 - x1), mw = compact ? W - 8 : Math.max(span - 10, Math.min(W - G - 8, 220));
          const lines = wrap(r.l, mw, fs), sub = r.sub ? wrap(r.sub, mw, fs) : [];
          const w = Math.max(...lines.concat(sub).map(t => tw(t, fs))), cx = Math.max(G + w / 2 + 3, Math.min(W - w / 2 - 3, (x1 + x2) / 2));
          return { r, lines, sub, cx, h: lines.length * lh + 8 + sub.length * lh + (sub.length ? 2 : 0) };
        });
        return { R, h: R.reduce((s, q) => s + q.h + 8, 0) + 10 };
      });
      return { fs, lh, G, xs, lw, names, hh, top, bands };
    }
    function rowSvg(L, q, y, cls) {
      const P = L, r = q.r, c = r.c || 'var(--ink)', fs = P.fs, lh = P.lh, halo = ' paint-order="stroke" stroke="var(--card)" stroke-width="3.5" stroke-linejoin="round"';
      let s = '<g' + (cls ? ' class="' + cls + '"' : '') + '>';
      if (q.note) {
        s += '<rect x="' + (q.cx - q.w / 2) + '" y="' + y + '" width="' + q.w + '" height="' + q.h + '" rx="7" style="fill:color-mix(in srgb,' + c + ' 12%,var(--card));stroke:' + c + '" stroke-width="1.2"/>';
        q.lines.forEach((t, j) => { s += '<text x="' + q.cx + '" y="' + (y + 5 + (j + 1) * lh - 3) + '" text-anchor="middle" font-size="' + fs + '" style="fill:var(--ink)">' + esc(t) + '</text>'; });
        return s + '</g>';
      }
      const x1 = P.xs[r.f], x2 = P.xs[r.t], dir = x2 > x1 ? 1 : -1, ya = y + q.lines.length * lh + 4;
      q.lines.forEach((t, j) => { s += '<text x="' + q.cx + '" y="' + (y + (j + 1) * lh - 3) + '" text-anchor="middle" font-size="' + fs + '"' + halo + ' style="fill:' + (r.x ? 'var(--bad)' : 'var(--ink)') + '">' + esc(t) + '</text>'; });
      const xe = r.x ? x2 - dir * 9 : x2 - dir * 2;
      s += '<line x1="' + (x1 + dir * 2) + '" y1="' + ya + '" x2="' + xe + '" y2="' + ya + '" style="stroke:' + c + '" stroke-width="2.2"' + (r.d ? ' stroke-dasharray="6 4"' : '') + ' marker-end="url(#' + o.id + '-ar)"/>';
      if (r.x) { const d = 6, cx = x2; s += '<circle cx="' + cx + '" cy="' + ya + '" r="9" style="fill:var(--card);stroke:var(--bad)" stroke-width="1.6"/><path d="M' + (cx - d / 1.6) + ' ' + (ya - d / 1.6) + 'L' + (cx + d / 1.6) + ' ' + (ya + d / 1.6) + 'M' + (cx - d / 1.6) + ' ' + (ya + d / 1.6) + 'L' + (cx + d / 1.6) + ' ' + (ya - d / 1.6) + '" style="stroke:var(--bad)" stroke-width="2"/>'; }
      else s += '<circle cx="' + x1 + '" cy="' + ya + '" r="3" style="fill:' + c + '"/>';
      q.sub.forEach((t, j) => { s += '<text x="' + q.cx + '" y="' + (ya + 4 + (j + 1) * lh - 2) + '" text-anchor="middle" font-size="' + fs + '"' + halo + ' style="fill:var(--mute)">' + esc(t) + '</text>'; });
      return s + '</g>';
    }
    function draw(i) {
      const n = o.steps.length; if (stl) stl.textContent = 'step ' + (i + 1) + ' of ' + n;
      const compact = innerWidth < 1100, W = Math.max(280, Math.round((box.clientWidth || RD.width(host)) - 16)), L = layout(W, compact);
      const fwd = host.classList.contains('rd-fwd');
      let s = '<defs><marker id="' + o.id + '-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="4.6" markerHeight="4.6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="context-stroke"/></marker></defs>';
      const shown = compact ? [i] : o.steps.map((_, k) => k);
      const H = compact ? L.top + Math.max(...L.bands.map(b => b.h)) + 4 : L.top + L.bands.reduce((a, b) => a + b.h, 0) + 6;
      // bands first (under the lifelines), then lanes, then rows
      let y = L.top, ys = [];
      shown.forEach(k => { ys[k] = y; y += L.bands[k].h; });
      shown.forEach(k => {
        const on = k === i, b = L.bands[k];
        s += '<g class="sq-band" data-k="' + k + '"><rect x="' + (compact ? 0 : 2) + '" y="' + (ys[k] + 1) + '" width="' + (W - (compact ? 0 : 2)) + '" height="' + (b.h - 2) + '" rx="8" style="fill:' + (on ? 'var(--soft)' : 'transparent') + '"/>';
        if (!compact) s += '<circle cx="13" cy="' + (ys[k] + 15) + '" r="10" style="fill:' + (on ? 'var(--acc)' : 'var(--card)') + ';stroke:' + (on ? 'var(--acc)' : 'var(--line)') + '"/><text x="13" y="' + (ys[k] + 19.5) + '" text-anchor="middle" font-size="12" font-weight="600" style="fill:' + (on ? 'var(--bg)' : 'var(--mute)') + '">' + (k + 1) + '</text>';
        s += '</g>';
      });
      o.lanes.forEach((l, k) => {
        const x = L.xs[k], a = (l.k || 0) > i ? .3 : 1, c = l.c || 'var(--mute)', w = L.lw - 8;
        s += '<g opacity="' + a + '"><line x1="' + x + '" y1="' + (L.hh + 6) + '" x2="' + x + '" y2="' + (H - 2) + '" style="stroke:' + c + '" stroke-opacity=".55" stroke-width="1.6" stroke-dasharray="3 4"/>';
        s += '<rect x="' + (x - w / 2) + '" y="4" width="' + w + '" height="' + L.hh + '" rx="8" style="fill:color-mix(in srgb,' + c + ' 18%,var(--card));stroke:' + c + '" stroke-width="1.3"/>';
        const n0 = L.names[k], y0 = 4 + (L.hh - n0.length * L.lh) / 2;
        n0.forEach((t, j) => { s += '<text x="' + x + '" y="' + (y0 + (j + 1) * L.lh - 3) + '" text-anchor="middle" font-size="' + L.fs + '" font-weight="600" style="fill:var(--ink)">' + esc(t) + '</text>'; });
        s += '</g>';
      });
      shown.forEach(k => {
        const op = k === i ? 1 : k < i ? .6 : .14; let yy = ys[k] + 9;
        s += '<g opacity="' + op + '">';
        L.bands[k].R.forEach(q => { s += rowSvg(L, q, yy, k === i && fwd ? 'rd-new' : ''); yy += q.h + 8; });
        s += '</g>';
      });
      box.innerHTML = '<svg viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img" aria-label="' + esc(o.fig + ', step ' + (i + 1) + ' of ' + n) + '">' + s + '</svg>';
      box.querySelectorAll('.sq-band').forEach(g => g.addEventListener('click', () => A && A.go(+g.dataset.k)));
      if (o.onStep) o.onStep(i);
    }
    A = RD.anim({ card: o.id, ctl: o.id + '-ctl', n: o.steps.length, draw, ms: o.ms || 4800, label: 'Step', list: o.list });
    let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(() => { if (host.offsetParent !== null) A.redraw(); }, 60); });
    // a mode toggle: new steps and a new step list, replayed from step 1
    A.mode = (steps, list) => { o.steps = steps; A.reset(steps.length, list); };
    return A;
  }
  make.card = card; make.esc = esc; make.wrap = wrap; make.tw = tw;
  return make;
})();
