// ---- Scene (section 9, Fig. 7): the topic's tiny GPT with its mixers switched, measured (BAD.runs from src/runs/out/runs.json; per-token losses
// BAD.rs_tokens from the root's eval.py). One row per run, six layers each (layer_types: a attention, s SSM); what each run keeps at 256 tokens
// (kv_256_bf16, state_fp32); then each run's loss minus the attention baseline's (at_mha) as a signed bar: up is worse, down is better. ----
(function () {
  if (!document.getElementById('stg-runs') || !window.BAS || !window.BAD || !BAD.runs) return;
  const { mix } = S3, { tw, la, lab, brick, comb, int, win } = BAS;
  const IDS = ['at_mha', 'ba_ssm', 'ba_hybrid', 'ba_hybrid2', 'pe_nope'], RUN = IDS.map(id => BAD.runs.find(r => r.run === id));
  const NAME = { at_mha: 'attention, RoPE', ba_ssm: 'SSM only', ba_hybrid: 'hybrid, 1 in 6', ba_hybrid2: 'hybrid, 2 in 6', pe_nope: 'attention, no positions' };
  // the mean loss on the later pieces of " Roxy" ("o", "x", "y"), from the recorded per-token losses
  const P0 = BAD.rs_pieces, roxy = new Set(); for (let i = 0; i + 3 < P0.length; i++) if (P0[i] === ' R' && P0[i + 1] === 'o' && P0[i + 2] === 'x' && P0[i + 3] === 'y') [i, i + 1, i + 2, i + 3].forEach(x => roxy.add(x));
  const rox = id => { const a = BAD.rs_tokens[id]; if (!a) return null; let s = 0, n = 0; for (let t = 1; t < P0.length; t++) if (roxy.has(t) && P0[t] !== ' R') { s += a[t - 1]; n++ } return s / n; };
  const MET = [r => r.val, r => r.rs, r => rox(r.run)], base = MET.map(f => f(RUN[0]));
  window.BA_RUNS = { ids: IDS, val: RUN.map(r => r.val), rs: RUN.map(r => r.rs), rox: RUN.map(r => rox(r.run)) };
  const DX = .62, x = i => -2.6 + i * DX, zr = i => 1.7 - i * .85, XB = 1.55, BMX = MET.map((f, j) => Math.max(...RUN.map(r => Math.abs(f(r) - base[j])))), BH = .7;
  const MB = Math.max(...RUN.map(r => r.kv_256_bf16 + r.state_fp32)), MH = 1.1;
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-4.4, 4.4, -2.6, 2.6, .5);
    const ma = tw(st, e, q => q === 1 ? 1 : 0), ba = tw(st, e, q => q >= 2 ? 1 : 0), m = k >= 2 ? k - 2 : 0;
    RUN.forEach((r, i) => { const z = zr(i), lt = r.layer_types, na = [...lt].filter(c => c === 'a').length, ns = 6 - na;
      // six layers: an attention layer is a white block with its cache on top, an SSM layer a blue plate with its state under it
      for (let l = 0; l < 6; l++) { const xx = x(l);
        if (lt[l] === 'a') { R.box([xx, 0, z], [.42, .08, .42], { shadow: false, lw: .6 }); const h = ma * MH * (r.kv_256_bf16 / na) / MB * 6; if (h > .005) brick(R, [xx, .08, z], [.32, h, .32], 1, { shadow: false }); }
        else { const h = ma * MH * (r.state_fp32 / ns) / MB * 6; if (h > .005) R.box([xx, 0, z], [.32, h, .32], { fill: mix(P.paper, P.c1, .55), shadow: false }); R.glass([xx - .21, .08 + h, z - .21], [.42, 0, 0], [0, 0, .42], { c: P.c1, a: .85, nu: 2, nv: 2, th: .025 }); } }
      lab(R, [x(0) - .7, .05, z], r.run + ' · ' + NAME[r.run], { fs: 12, mono: true, al: 'right', dx: -4, c: P.ink, grp: 'rows' });
      // what it keeps at 256 tokens
      const kv = r.kv_256_bf16, s = r.state_fp32;
      lab(R, [x(5) + .3, .1, z], (kv ? int(kv) + ' B KV' : '') + (kv && s ? ' + ' : '') + (s ? int(s) + ' B state' : ''), { fs: 12, mono: true, al: 'left', dx: 4, c: P.ink, a: la(st, e, q => q === 1 ? 1 : 0), grp: 'mem' });
      // the loss against attention: one signed bar on a plinth, then the value
      if (ba > .01) { const f = MET[m], pk = st.pk >= 2 ? st.pk - 2 : m, v = (f(r) - base[m]) / BMX[m], v0 = (MET[pk](r) - base[pk]) / BMX[pk];
        const hv = st.pk === st.k || e >= 1 ? v : v0 + (v - v0) * e, hh = Math.max(.012, Math.abs(hv) * BH);
        R.box([XB + .55, .5 - .03, z], [.6, .03, .4], { a: ba, shadow: false });
        R.box([XB + .55, hv >= 0 ? .5 : .47 - hh, z], [.34, hh, .26], { fill: i === 0 ? P.paper : hv > 0 ? mix(P.paper, P.bad, .7) : mix(P.paper, P.good, .7), a: ba, shadow: false });
        const cur = st.pk !== st.k && e < .5 && st.pk >= 2 ? pk : m;
        lab(R, [XB + .9, .5, z], MET[cur](r).toFixed(3) + (i ? ' (' + (MET[cur](r) - base[cur] >= 0 ? '+' : '−') + Math.abs(MET[cur](r) - base[cur]).toFixed(3) + ')' : ''), { fs: 12, mono: true, al: 'left', dx: 8, c: P.ink, a: ba * (st.pk !== st.k && st.pk >= 2 ? Math.abs(1 - 2 * e) : 1) }); } });
    const L = j => la(st, e, q => q === j ? 1 : 0);
    lab(R, [x(2.5), 0, zr(0) + .5], 'same 6-layer GPT, same data and budget; only the mixers differ', { fs: 12.5, b: 1, c: P.ink, dy: 22, a: L(0) });
    lab(R, [x(2.5), 0, zr(0) + .5], 'kept at 256 tokens: KV in bf16, SSM state in fp32', { fs: 12.5, b: 1, c: P.ink, dy: 22, a: L(1) });
    ['held-out loss, against at_mha', 'running-sequence loss, against at_mha', 'loss on the repeated name\'s pieces, against at_mha'].forEach((t, j) => lab(R, [XB + .55, 1.25, zr(RUN.length - 1)], t + ' (largest gap = full bar)', { fs: 12.5, b: 1, c: P.ink, dy: -16, a: L(j + 2) }));
  }
  const full = { cam: [.35, .62], bounds: [[-5.0, 0, -2.0], [4.4, 1.4, 2.4]] };
  S3.stage({ id: 'stg-runs', list: 'sx-runs', fig: 'Fig. 7 · the tiny GPT, five mixers, measured', cam: full.cam, bounds: full.bounds, aspect: .6, dur: 1500, hold: 5000, draw, margin: w => w < 520 ? [22, 8, 14, 8] : [30, 18, 20, 18],
    view: k => k >= 2 ? { cam: [.25, .58], bounds: [[-3.4, 0, -2.0], [4.6, 1.4, 2.3]] } : k === 0 ? { cam: [.35, .85], bounds: [[-5.0, 0, -2.0], [4.4, .45, 2.4]] } : full }); // step 1 holds only flat tiles: a steeper look fills the card
})();
