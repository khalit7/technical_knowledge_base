// ---- Core maths (pure functions, no DOM). Loaded by the page and by src/check_js.mjs, which compares it with src/expected.json (from src/recompute.py). ----
window.MC = (function () {
  const sum = a => a.reduce((s, v) => s + v, 0);
  const zeros = (r, c) => Array.from({ length: r }, () => new Array(c).fill(0));
  const T = A => A[0].map((_, j) => A.map(r => r[j]));
  const mm = (A, B) => A.map(r => B[0].map((_, j) => r.reduce((s, v, k) => s + v * B[k][j], 0)));
  const mv = (A, x) => A.map(r => r.reduce((s, v, k) => s + v * x[k], 0));
  const outer = (u, v) => u.map(a => v.map(b => a * b));
  const clone = x => JSON.parse(JSON.stringify(x));

  // erf to about 1e-15: Taylor series for |x| < 3, continued fraction for erfc beyond
  function erf(x) {
    const s = x < 0 ? -1 : 1; x = Math.abs(x);
    if (x < 3) {
      let term = x, tot = x;
      for (let n = 1; n < 80; n++) { term *= -x * x / n; const add = term / (2 * n + 1); tot += add; if (Math.abs(add) < 1e-17) break; }
      return s * 2 / Math.sqrt(Math.PI) * tot;
    }
    // erfc continued fraction (Lentz)
    let f = x, C = x, D = 0, tiny = 1e-300;
    for (let k = 1; k < 200; k++) {
      const a = k / 2; D = x + a * D; if (D === 0) D = tiny; C = x + a / C; if (C === 0) C = tiny; D = 1 / D; const del = C * D; f *= del; if (Math.abs(del - 1) < 1e-16) break;
    }
    return s * (1 - Math.exp(-x * x) / Math.sqrt(Math.PI) / f);
  }
  const Phi = x => 0.5 * (1 + erf(x / Math.SQRT2));
  const phi = x => Math.exp(-x * x / 2) / Math.sqrt(2 * Math.PI);
  const ACT = {
    relu: { f: x => Math.max(0, x), d: x => (x > 0 ? 1 : 0) },
    tanh: { f: x => Math.tanh(x), d: x => 1 - Math.tanh(x) ** 2 },
    sigmoid: { f: x => 1 / (1 + Math.exp(-x)), d: x => { const s = 1 / (1 + Math.exp(-x)); return s * (1 - s); } },
    gelu: { f: x => x * Phi(x), d: x => Phi(x) + x * phi(x) }
  };

  function softmax(z) { const m = Math.max(...z); const e = z.map(v => Math.exp(v - m)); const s = sum(e); return e.map(v => v / s); }
  const softmaxJac = p => p.map((pi, i) => p.map((pj, j) => (i === j ? pi : 0) - pi * pj));
  function softmaxVjp(p, v) { const d = sum(p.map((pi, i) => pi * v[i])); return p.map((pi, i) => pi * (v[i] - d)); }

  // ---- the layers of the workbench: forward, and the hand-derived backward (vector-Jacobian product) ----
  const L = {};
  L.linear = {
    inputs: ['W', 'x', 'b'],
    fwd: P => mv(P.W, P.x).map((v, i) => v + P.b[i]),
    bwd: (P, g) => ({ W: outer(g, P.x), x: mv(T(P.W), g), b: g.slice() }),
    jac: P => ({ x: clone(P.W) })
  };
  L.act = {
    inputs: ['x'],
    fwd: P => P.x.map(v => ACT[P.fn].f(v)),
    bwd: (P, g) => ({ x: P.x.map((v, i) => g[i] * ACT[P.fn].d(v)) }),
    jac: P => ({ x: P.x.map((v, i) => P.x.map((_, j) => (i === j ? ACT[P.fn].d(v) : 0))) })
  };
  L.softmax = {
    inputs: ['z'],
    fwd: P => softmax(P.z),
    bwd: (P, g) => ({ z: softmaxVjp(softmax(P.z), g) }),
    jac: P => ({ z: softmaxJac(softmax(P.z)) })
  };
  L.sce = {
    inputs: ['z'],
    fwd: P => { const m = Math.max(...P.z); const lse = m + Math.log(sum(P.z.map(v => Math.exp(v - m)))); return [lse - P.z[P.y]]; },
    bwd: (P, g) => { const p = softmax(P.z); return { z: p.map((v, i) => g[0] * (v - (i === P.y ? 1 : 0))) }; },
    jac: P => { const p = softmax(P.z); return { z: [p.map((v, i) => v - (i === P.y ? 1 : 0))] }; }
  };
  function lnStats(x, eps) { const n = x.length, mu = sum(x) / n, v = sum(x.map(a => (a - mu) ** 2)) / n, r = 1 / Math.sqrt(v + eps); return { n, mu, v, r, xh: x.map(a => (a - mu) * r) }; }
  L.layernorm = {
    inputs: ['x', 'gamma', 'beta'],
    fwd: P => { const s = lnStats(P.x, P.eps); return s.xh.map((h, i) => P.gamma[i] * h + P.beta[i]); },
    bwd: (P, g) => {
      const s = lnStats(P.x, P.eps), gh = g.map((v, i) => v * P.gamma[i]);
      const m1 = sum(gh) / s.n, m2 = sum(gh.map((v, i) => v * s.xh[i])) / s.n;
      return { x: gh.map((v, i) => s.r * (v - m1 - s.xh[i] * m2)), gamma: g.map((v, i) => v * s.xh[i]), beta: g.slice() };
    },
    // the same dx in the form PyTorch's CPU kernel computes it: dx = a*dy*gamma + b*x + c
    kernel: (P, g) => {
      const s = lnStats(P.x, P.eps), N = s.n, scale = 1 / N;
      const ds = sum(g.map((v, i) => v * P.x[i] * P.gamma[i])), db = sum(g.map((v, i) => v * P.gamma[i]));
      const a = s.r, b = (db * s.mu - ds) * a * a * a * scale, c = -b * s.mu - db * a * scale;
      return { a, b, c, ds, db, x: g.map((v, i) => a * v * P.gamma[i] + b * P.x[i] + c) };
    },
    stats: P => lnStats(P.x, P.eps)
  };
  function attnFwd(P) {
    const d = P.Q[0].length, sc = 1 / Math.sqrt(d);
    const S = mm(P.Q, T(P.K)).map(r => r.map(v => v * sc));
    const A = S.map(r => softmax(r));
    return { S, A, O: mm(A, P.V), sc };
  }
  L.attn = {
    inputs: ['Q', 'K', 'V'],
    fwd: P => attnFwd(P).O,
    bwd: (P, dO) => {
      const f = attnFwd(P);
      const dV = mm(T(f.A), dO);
      const dA = mm(dO, T(P.V));
      const D = f.O.map((r, i) => sum(r.map((v, j) => v * dO[i][j])));          // rowsum(dO * O) = rowsum(dA * A)
      const dS = f.A.map((r, i) => r.map((a, j) => a * (dA[i][j] - D[i])));
      return { Q: mm(dS, P.K).map(r => r.map(v => v * f.sc)), K: mm(T(dS), P.Q).map(r => r.map(v => v * f.sc)), V: dV, dS, dA, D };
    },
    parts: attnFwd
  };

  // ---- numerical check: probe loss L = sum(gbar * f(inputs)); its gradient is exactly the VJP ----
  function flat(v) { return Array.isArray(v[0]) ? v.flat() : v.slice(); }
  function setFlat(P, key, k, val) { if (Array.isArray(P[key][0])) { const c = P[key][0].length; P[key][Math.floor(k / c)][k % c] = val; } else P[key][k] = val; }
  function probe(layer, P, g) { const y = layer.fwd(P); return sum(flat(y).map((v, i) => v * flat(g)[i])); }
  function fdCheck(name, P, g, h) {
    h = h || 1e-5; const layer = L[name], an = layer.bwd(P, g), out = {}; let worst = 0;
    for (const key of layer.inputs) {
      const base = flat(P[key]), num = [];
      for (let k = 0; k < base.length; k++) {
        const Pp = clone(P), Pm = clone(P);
        setFlat(Pp, key, k, base[k] + h); setFlat(Pm, key, k, base[k] - h);
        num.push((probe(layer, Pp, g) - probe(layer, Pm, g)) / (2 * h));
      }
      const a = flat(an[key]);
      const err = Math.max(...num.map((v, i) => Math.abs(v - a[i]) / Math.max(1, Math.abs(v), Math.abs(a[i]))));
      worst = Math.max(worst, err); out[key] = { analytic: a, numeric: num, relerr: err };
    }
    return { per: out, worst };
  }

  // ---- the tiny model of the root page: x = (2, 1), W rows cat (1, 0), dog (0, 1), sat (1, -2), target sat ----
  const tiny = { W: [[1, 0], [0, 1], [1, -2]], x: [2, 1], y: 2 };
  function tinyAll() {
    const z = mv(tiny.W, tiny.x), p = softmax(z), loss = -Math.log(p[tiny.y]);
    const gz = p.map((v, i) => v - (i === tiny.y ? 1 : 0));
    return { z, p, loss, gz, gW: outer(gz, tiny.x), gx: mv(T(tiny.W), gz), J: softmaxJac(p) };
  }
  // forward mode on the tiny model: one tangent sweep per weight (dW = e_ij), carrying dz, dp, dL
  function tinyJvps() {
    const t = tinyAll(), J = t.J, res = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      const dz = [0, 0, 0]; dz[i] = tiny.x[j];
      const dp = mv(J, dz), dL = -dp[tiny.y] / t.p[tiny.y];
      res.push({ i, j, dz, dp, dL });
    }
    return res;
  }

  // ---- the chain used by the memory animation: h_k = tanh(w_k h_{k-1}), loss = (h_n - t)^2 / 2 (illustrative) ----
  const CHAIN = { w: [1.5, -1.2, 0.9, 1.1, -0.8, 1.3, 0.7, -1.4, 1.0, 1.2, -0.9, 0.8, 1.1, -1.3, 0.9, 1.0], h0: 0.5, t: 0.2 };
  function chainVals(n) {
    const h = [CHAIN.h0];
    for (let k = 1; k <= n; k++) h.push(Math.tanh(CHAIN.w[k - 1] * h[k - 1]));
    const loss = 0.5 * (h[n] - CHAIN.t) ** 2, gh = new Array(n + 1).fill(0), gw = new Array(n).fill(0);
    gh[n] = h[n] - CHAIN.t;
    for (let k = n; k >= 1; k--) { const a = gh[k] * (1 - h[k] * h[k]); gw[k - 1] = a * h[k - 1]; gh[k - 1] = a * CHAIN.w[k - 1]; }
    return { h, loss, gh, gw };
  }
  // A schedule is a list of events: {t:'f'|'r'|'b', k} = forward-evaluate h_k (first time), recompute h_k, backward through layer k.
  // Memory counts held activations h_0..h_n (h_0 is the input, always held).
  function chainSchedule(n, mode, seg) {
    const ev = [], held = new Set([0]); let peak = 1, fw = 0, rc = 0, bw = 0;
    const snap = e => { peak = Math.max(peak, held.size); ev.push(Object.assign({ held: [...held].sort((a, b) => a - b), now: held.size, peak, fw, rc, bw }, e)); };
    const stored = k => k === 0 || mode === 'all' || (mode === 'ckpt' && k % seg === 0);
    const keep = mode !== 'none';
    function ensure(k) {
      if (held.has(k)) return;
      let j = k - 1; while (!held.has(j)) j--;
      for (let i = j + 1; i <= k; i++) { held.add(i); rc++; snap({ t: 'r', k: i }); if (!keep && i - 1 > j) held.delete(i - 1); }
    }
    for (let k = 1; k <= n; k++) { held.add(k); fw++; snap({ t: 'f', k }); if (!stored(k - 1)) held.delete(k - 1); }
    if (mode === 'infer') return { ev, peak, fw, rc, bw };
    for (let k = n; k >= 1; k--) { ensure(k); ensure(k - 1); bw++; snap({ t: 'b', k }); held.delete(k); }
    return { ev, peak, fw, rc, bw };
  }

  // einsum cost: one multiply-add per combination of all distinct indices; FLOPs = 2 x that
  function einsumCost(spec, sizes) {
    const [lhs, out] = spec.split('->'); const idx = [...new Set(lhs.replace(/,/g, '').split(''))];
    const macs = idx.reduce((p, c) => p * (sizes[c] || 1), 1);
    const summed = idx.filter(c => !out.includes(c));
    return { idx, summed, macs, flops: 2 * macs, outShape: out.split('').map(c => sizes[c] || 1) };
  }

  return { sum, T, mm, mv, outer, erf, Phi, phi, ACT, softmax, softmaxJac, softmaxVjp, L, fdCheck, flat, tiny, tinyAll, tinyJvps, CHAIN, chainVals, chainSchedule, einsumCost, clone };
})();
