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
  function anim(opts) {
    const st = { i: 0, playing: false, speed: 1, timer: null, onScreen: false };
    const root = opts.root, n = () => opts.count();
    const play = root.querySelector('[data-a=play]'), scrub = root.querySelector('[data-a=scrub]'), spd = root.querySelector('[data-a=speed]');
    function render() { if (scrub) { scrub.max = n() - 1; scrub.value = st.i; } if (play) play.textContent = st.playing ? 'Pause' : 'Play'; opts.draw(st.i); }
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
      if (a === 'play') b.addEventListener('click', () => { if (!st.playing && st.i >= n() - 1) st.i = 0; st.playing = !st.playing; render(); tick(); });
      if (a === 'prev') b.addEventListener('click', () => { st.playing = false; st.i = Math.max(0, st.i - 1); render(); });
      if (a === 'next') b.addEventListener('click', () => { st.playing = false; st.i = Math.min(n() - 1, st.i + 1); render(); });
      if (a === 'reset') b.addEventListener('click', () => { st.playing = false; st.i = 0; render(); });
    });
    if (scrub) scrub.addEventListener('input', () => { st.playing = false; st.i = +scrub.value; render(); });
    if (spd) spd.addEventListener('change', () => { st.speed = +spd.value; tick(); });
    try { new IntersectionObserver(es => { st.onScreen = es[0].isIntersecting; }).observe(root); } catch (e) { st.onScreen = true; }
    if (opts.autoplay && !reduced()) { st.playing = true; tick(); }
    render();
    return { go(i) { st.playing = false; st.i = i; render(); }, redraw: render, state: st };
  }
  const ctrlHTML = '<div class="ctrl"><button data-a="play">Play</button><button data-a="prev" aria-label="previous step">&#8592;</button><button data-a="next" aria-label="next step">&#8594;</button><input type="range" data-a="scrub" min="0" max="1" value="0" aria-label="scrub"><select data-a="speed" aria-label="speed"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select><button data-a="reset">Reset</button></div>';
  return { sha256, hmac, hex, b64u, b64uDec, utf8, esc, anim, ctrlHTML, reduced };
})();
