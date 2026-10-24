// ---- Shared utilities: SHA-256, HMAC, base64url, HTML escaping, an animation controller ----
window.TAB_RENDER = window.TAB_RENDER || {};
window.AU = (function () {
  const K = new Uint32Array([0x428a2f98,0x71374491,0xb5c0fbcf,0xe9b5dba5,0x3956c25b,0x59f111f1,0x923f82a4,0xab1c5ed5,0xd807aa98,0x12835b01,0x243185be,0x550c7dc3,0x72be5d74,0x80deb1fe,0x9bdc06a7,0xc19bf174,0xe49b69c1,0xefbe4786,0x0fc19dc6,0x240ca1cc,0x2de92c6f,0x4a7484aa,0x5cb0a9dc,0x76f988da,0x983e5152,0xa831c66d,0xb00327c8,0xbf597fc7,0xc6e00bf3,0xd5a79147,0x06ca6351,0x14292967,0x27b70a85,0x2e1b2138,0x4d2c6dfc,0x53380d13,0x650a7354,0x766a0abb,0x81c2c92e,0x92722c85,0xa2bfe8a1,0xa81a664b,0xc24b8b70,0xc76c51a3,0xd192e819,0xd6990624,0xf40e3585,0x106aa070,0x19a4c116,0x1e376c08,0x2748774c,0x34b0bcb5,0x391c0cb3,0x4ed8aa4a,0x5b9cca4f,0x682e6ff3,0x748f82ee,0x78a5636f,0x84c87814,0x8cc70208,0x90befffa,0xa4506ceb,0xbef9a3f7,0xc67178f2]);
  function utf8(s) { return new TextEncoder().encode(s); }
  function sha256(bytes) {
    if (typeof bytes === 'string') bytes = utf8(bytes);
    const l = bytes.length, nb = ((l + 9 + 63) >> 6) << 6, m = new Uint8Array(nb);
    m.set(bytes); m[l] = 0x80;
    const bits = l * 8, dv = new DataView(m.buffer);
    dv.setUint32(nb - 4, bits >>> 0); dv.setUint32(nb - 8, Math.floor(bits / 4294967296));
    const H = new Uint32Array([0x6a09e667,0xbb67ae85,0x3c6ef372,0xa54ff53a,0x510e527f,0x9b05688c,0x1f83d9ab,0x5be0cd19]);
    const W = new Uint32Array(64);
    for (let o = 0; o < nb; o += 64) {
      for (let i = 0; i < 16; i++) W[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) {
        const a = W[i - 15], b = W[i - 2];
        const s0 = ((a >>> 7) | (a << 25)) ^ ((a >>> 18) | (a << 14)) ^ (a >>> 3);
        const s1 = ((b >>> 17) | (b << 15)) ^ ((b >>> 19) | (b << 13)) ^ (b >>> 10);
        W[i] = (W[i - 16] + s0 + W[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const S1 = ((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7));
        const ch = (e & f) ^ (~e & g);
        const t1 = (h + S1 + ch + K[i] + W[i]) >>> 0;
        const S0 = ((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10));
        const mj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + mj) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] += a; H[1] += b; H[2] += c; H[3] += d; H[4] += e; H[5] += f; H[6] += g; H[7] += h;
    }
    const out = new Uint8Array(32), ov = new DataView(out.buffer);
    for (let i = 0; i < 8; i++) ov.setUint32(i * 4, H[i]);
    return out;
  }
  function hmac(key, msg) {
    if (typeof key === 'string') key = utf8(key);
    if (typeof msg === 'string') msg = utf8(msg);
    if (key.length > 64) key = sha256(key);
    const k = new Uint8Array(64); k.set(key);
    const ip = new Uint8Array(64 + msg.length), op = new Uint8Array(96);
    for (let i = 0; i < 64; i++) { ip[i] = k[i] ^ 0x36; op[i] = k[i] ^ 0x5c; }
    ip.set(msg, 64); op.set(sha256(ip), 64);
    return sha256(op);
  }
  const hex = b => Array.from(b, x => x.toString(16).padStart(2, '0')).join('');
  function b64u(bytes) {
    if (typeof bytes === 'string') bytes = utf8(bytes);
    let s = ''; for (const x of bytes) s += String.fromCharCode(x);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }
  function b64uDec(s) {
    s = s.replace(/-/g, '+').replace(/_/g, '/'); while (s.length % 4) s += '=';
    const bin = atob(s), u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return new TextDecoder().decode(u);
  }
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const reduced = () => { try { return matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { return false; } };
  // Animation controller: steps 0..n-1, play/pause/step/scrub/speed; advances only when the element is on screen and its tab visible.
  // It never autoplays (2026-10-23): it waits on step 0 until the reader presses play or steps. draw(i, touched) gets touched=false until then.
  function anim(opts) {
    const st = { i: 0, playing: false, speed: 1, timer: null, onScreen: false, touched: false };
    const root = opts.root, n = () => opts.count();
    const play = root.querySelector('[data-a=play]'), scrub = root.querySelector('[data-a=scrub]'), spd = root.querySelector('[data-a=speed]');
    function render() { if (scrub) { scrub.max = n() - 1; scrub.value = st.i; } if (play) play.textContent = st.playing ? 'Pause' : 'Play'; opts.draw(st.i, st.touched); }
    function visible() { const t = root.closest('.tab'); return st.onScreen && (!t || !t.hidden); }
    function tick() {
      clearTimeout(st.timer);
      if (!st.playing) return;
      st.timer = setTimeout(() => {
        if (visible()) { if (st.i < n() - 1) { st.i++; render(); } else { st.playing = false; render(); return; } }
        tick();
      }, (opts.dwell || 1700) / st.speed);
    }
    root.querySelectorAll('[data-a]').forEach(b => {
      const a = b.dataset.a;
      b.addEventListener('click', () => { st.touched = true; }, true);
      if (a === 'play') b.addEventListener('click', () => { if (!st.playing && st.i >= n() - 1) st.i = 0; st.playing = !st.playing; render(); tick(); });
      if (a === 'prev') b.addEventListener('click', () => { st.playing = false; st.i = Math.max(0, st.i - 1); render(); });
      if (a === 'next') b.addEventListener('click', () => { st.playing = false; st.i = Math.min(n() - 1, st.i + 1); render(); });
      if (a === 'reset') b.addEventListener('click', () => { st.playing = false; st.i = 0; render(); });
    });
    if (scrub) scrub.addEventListener('input', () => { st.touched = true; st.playing = false; st.i = +scrub.value; render(); });
    if (spd) spd.addEventListener('change', () => { st.speed = +spd.value; tick(); });
    try { new IntersectionObserver(es => { st.onScreen = es[0].isIntersecting; }).observe(root); } catch (e) { st.onScreen = true; }
    render();
    return { go(i, touched) { st.playing = false; st.i = i; if (touched) st.touched = true; render(); }, redraw: render, state: st };
  }
  const ctrlHTML = '<div class="ctrl"><button data-a="play">Play</button><button data-a="prev" aria-label="previous step">&#8592;</button><button data-a="next" aria-label="next step">&#8594;</button><input type="range" data-a="scrub" min="0" max="1" value="0" aria-label="scrub"><select data-a="speed" aria-label="speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select><button data-a="reset">Reset</button></div>';
  // Sequence lanes: steps [{from,to,label,kind,back,backKind,chip,chipColor,dash}]; from===to draws a note at that lane.
  // i = last step shown (earlier steps faded unless all is true). Labels wrap to the width; text is 11 px or more.
  // The layout is computed for every step, so stepping never moves what is already drawn.
  function lanes(svg, names, steps, i, W, all) {
    const fs = W < 480 ? 11 : 11.5, lh = fs + 2.5, cw = fs * 0.56;
    const wrap = (t, maxW) => { t = String(t); const words = t.split(' '), out = []; let cur = '';
      words.forEach(w => { const n = cur ? cur + ' ' + w : w; if (n.length * cw > maxW && cur) { out.push(cur); cur = w; } else cur = n; }); if (cur) out.push(cur); return out; };
    const xs = names.map((_, k) => (0.5 + k) / names.length * W);
    const nameLines = Math.max(...names.map(l => l.split('\n').length));
    const top = 10 + nameLines * 13 + 8;
    const col = { ok: 'var(--c1)', bad: 'var(--bad)', good: 'var(--good)', note: 'var(--mute)', xc: 'var(--c4)' };
    const clampX = (x, lines) => { const hw = Math.min(W / 2 - 2, Math.max(...lines.map(l => l.length)) * cw / 2 + 4); return Math.max(hw + 2, Math.min(W - hw - 2, x)); };
    const halo = ' paint-order="stroke" stroke="var(--bg)" stroke-width="3"';
    // layout pass
    let y = top; const L = steps.map(s => {
      const r = { y0: y }; const maxW = W - 8;
      if (s.from === s.to) { r.lab = wrap(s.label, maxW - 14); r.ya = y; r.h = r.lab.length * lh + 8; y += r.h + 10; return r; }
      r.lab = wrap(s.label, maxW); r.ya = y + r.lab.length * lh + 3;
      r.bk = s.back !== undefined && s.back !== '' ? wrap(s.back, maxW) : null;
      r.yb = r.bk ? r.ya + r.bk.length * lh + 6 : r.ya;
      r.yc = r.yb + 6; y = r.yb + 10 + (s.chip ? 22 : 0); return r; });
    const H = y + 4;
    let o = '<defs><marker id="' + svg.id + 'Ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L8,4 L0,8 z" fill="context-stroke"/></marker></defs>';
    names.forEach((l, k) => {
      o += `<line x1="${xs[k]}" y1="${top - 6}" x2="${xs[k]}" y2="${H - 2}" stroke="var(--line)" stroke-width="2"/>`;
      l.split('\n').forEach((part, j) => { o += `<text x="${xs[k]}" y="${14 + j * 13}" text-anchor="middle" font-size="${fs}" font-weight="600" fill="var(--ink)">${esc(part)}</text>`; });
    });
    steps.forEach((s, k) => {
      if (k > i) return;
      const r = L[k], op = all || k === i ? 1 : 0.42, c = col[s.kind || 'ok'];
      const x1 = xs[s.from], x2 = xs[s.to], mid = (x1 + x2) / 2;
      const tc = s.kind === 'bad' ? 'var(--bad)' : 'var(--ink)';
      o += `<g opacity="${op}">`;
      if (s.from === s.to) {
        const tw = Math.min(W - 6, Math.max(...r.lab.map(l => l.length)) * cw + 14), x0 = Math.max(3, Math.min(W - tw - 3, x1 - tw / 2));
        o += `<rect x="${x0}" y="${r.y0}" width="${tw}" height="${r.h}" rx="5" fill="var(--soft)" stroke="${c}"/>`;
        r.lab.forEach((t, j) => { o += `<text x="${x0 + tw / 2}" y="${r.y0 + 4 + (j + 1) * lh - 2}" text-anchor="middle" font-size="${fs}" fill="${tc}">${esc(t)}</text>`; });
      } else {
        const cx = clampX(mid, r.lab);
        r.lab.forEach((t, j) => { o += `<text x="${cx}" y="${r.y0 + (j + 1) * lh - 2}" text-anchor="middle" font-size="${fs}"${halo} fill="${tc}">${esc(t)}</text>`; });
        o += `<line x1="${x1}" y1="${r.ya}" x2="${x2}" y2="${r.ya}" stroke="${c}" stroke-width="${k === i || all ? 2.2 : 1.5}"${s.dash ? ' stroke-dasharray="5 4"' : ''} marker-end="url(#${svg.id}Ar)"/>`;
        if (r.bk) {
          const cb = col[s.backKind || 'ok'], bx = clampX(mid, r.bk), bc = s.backKind === 'bad' ? 'var(--bad)' : s.backKind === 'good' ? 'var(--good)' : 'var(--mute)';
          r.bk.forEach((t, j) => { o += `<text x="${bx}" y="${r.ya + (j + 1) * lh}" text-anchor="middle" font-size="${fs}"${halo} fill="${bc}">${esc(t)}</text>`; });
          o += `<line x1="${x2}" y1="${r.yb}" x2="${x1}" y2="${r.yb}" stroke="${cb}" stroke-width="1.4" stroke-dasharray="4 3" marker-end="url(#${svg.id}Ar)"/>`;
        }
        if (s.chip && (k === i || all)) {
          const t = s.chip, tw = Math.min(W - 4, t.length * cw + 12), cx2 = Math.max(tw / 2 + 2, Math.min(W - tw / 2 - 2, mid));
          o += `<rect x="${cx2 - tw / 2}" y="${r.yc}" width="${tw}" height="17" rx="8" fill="${s.chipColor || 'var(--acc2)'}" stroke="${c}"/><text x="${cx2}" y="${r.yc + 12.5}" text-anchor="middle" font-size="${fs}" fill="var(--ink)">${esc(t)}</text>`;
        }
      }
      o += '</g>';
    });
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('width', W); svg.setAttribute('height', H);
    svg.innerHTML = o;
  }
  const width = el => { const w = el && el.clientWidth; return w && w > 60 ? w : Math.max(300, Math.min(880, (document.documentElement.clientWidth || 900) - 60)); };
  return { lanes, width, sha256, hmac, hex, b64u, b64uDec, utf8, esc, anim, ctrlHTML, reduced };
})();
