// ---- Scene (section 4, Fig. 3): what each eviction policy keeps of the same 4,096-token prompt, measured on SmolLM2-135M (EVD.maps, recorded
// by src/kv/run_kv.py map: per cache, the kept share of each 64-token bin in tenths 0..9). Drawn as 30 layers (rows, layer 0 at the back; the 3 KV
// heads of a layer averaged) by 32 columns of 128 tokens; a column's height is the share kept. The planted number (EVD.feat.needle, tokens
// 1,977 to 1,992) is the orange plate; dots stream from it to the answer in proportion to the caches (of 90) that kept it whole (EVD.feat.res). ----
(function () {
  if (!document.getElementById('stg-ev') || !window.LCS || !window.EVD) return;
  const { mix, lerp } = S3, { tw, la, lab, int } = LCS, E = EVD;
  const ORDER = ['full', 'recent', 'sink_recent', 'random', 'h2o', 'snapkv', 'snapkv_doc', 'local_global'];
  const NAME = { full: 'full cache', recent: 'recent only', sink_recent: 'sink + recent', random: 'random (+ sinks)', h2o: 'H2O', snapkv: 'SnapKV', snapkv_doc: 'SnapKV, before the question', local_global: 'local + global' };
  const NL = E.layers, KH = E.kvh, NB = E.bins, NC = NB / 2, TPC = E.length / NC;
  let bud = '0.25';
  const key = p => p === 'full' ? null : E.maps[p + '@' + bud] ? p + '@' + bud : p + '@0.25';
  const cache = {};
  // kept share per layer and column (heads and the two 64-token bins averaged)
  function grid(p) { const k = key(p) || 'full'; if (cache[k]) return cache[k]; const g = [];
    for (let l = 0; l < NL; l++) { const row = []; for (let c = 0; c < NC; c++) { let s = 0;
      if (k === 'full') s = 1; else { const m = E.maps[k]; for (let h = 0; h < KH; h++) for (let b = 0; b < 2; b++) s += +m[(l * KH + h) * NB + 2 * c + b] / 9; s /= KH * 2; }
      row.push(s) } g.push(row) } return cache[k] = g; }
  const res = p => p === 'full' ? { pred: E.feat.full, exact: true, surv: 90 } : E.feat.res[key(p)];
  const CW = .3, X0 = -4.8, x = c => X0 + (c + .5) * CW, Z0 = -2.2, DZ = .15, z = l => Z0 + l * DZ, HM = .7;
  const nc = Math.floor((E.feat.needle[0] + E.feat.needle[1]) / 2 / TPC), XA = X0 + NC * CW + 1.9, ZA = z(NL / 2);
  function draw(R, k, e, st) {
    const P = R.P; R.grid(-5.6, 6.2, -3, 3.2, .5);
    const pa = ORDER[st.pk], pb = ORDER[k], g0 = grid(pa), g1 = grid(pb), kept = mix(P.paper, P.acc, .7);
    R.quad([[X0, .001, Z0 - DZ / 2], [X0 + NC * CW, .001, Z0 - DZ / 2], [X0 + NC * CW, .001, z(NL - 1) + DZ / 2], [X0, .001, z(NL - 1) + DZ / 2]], { fill: P.soft, a: .8, ea: .4 });
    for (let l = 0; l < NL; l++) for (let c = 0; c < NC; c++) {
      const a = g0[l][c], b = g1[l][c], v = e >= 1 ? b : lerp(a, b, e);
      if (v > .01) R.box([x(c), 0, z(l)], [CW * .86, v * HM, DZ * .8], { fill: c === nc ? mix(P.paper, P.c2, .7) : kept, lw: .4, ea: .3, shadow: false });
      // evicted entries lift out and fade during the step
      if (e < 1 && a - b > .05) R.box([x(c), b * HM + .9 * e, z(l)], [CW * .86, (a - b) * HM, DZ * .8], { fill: mix(P.paper, P.mute, .3), a: (1 - e) * .55, edge: false, shadow: false });
    }
    // the planted number and the question
    const r = res(pb), sv = r.surv / 90;
    R.glass([x(nc) - CW / 2 - .02, 0, Z0 - .2], [0, 0, (NL - 1) * DZ + .4], [0, HM + .25, 0], { c: P.c2, a: .25 + .6 * Math.max(sv, .1), nu: 1, nv: 3 });
    lab(R, [x(nc), HM + .25, Z0 - .2], 'the planted number, tokens ' + int(E.feat.needle[0]) + ' to ' + int(E.feat.needle[1]), { fs: 12.5, b: 1, c: P.c2, dy: -12 });
    R.glow([XA, .45, ZA], .4, { c: P.q, a: .4 }); R.ball([XA, .45, ZA], .16, { c: r.exact ? P.good : P.bad });
    if (r.surv > 0) R.flowArc([x(nc), HM * .6, ZA], [XA, .45, ZA], .9, { c: P.c2, a: .9, r: .045 + .05 * sv, n: Math.max(2, Math.round(2 + 14 * sv)), speed: 1.4 });
    const lb = la(st, e, q => 1);
    lab(R, [XA, .45, ZA], 'answer "' + r.pred.trim() + '": ' + (r.exact ? 'right' : 'wrong'), { fs: 12.5, b: 1, c: r.exact ? P.good : P.bad, dy: -26, a: lb });
    lab(R, [XA, .45, ZA], 'number kept whole in ' + r.surv + ' of 90 caches', { fs: 12, c: P.ink, dy: 24, a: lb, wide: 1 });
    lab(R, [X0, 0, z(NL - 1)], 'layer 29', { fs: 12, c: P.mute, al: 'right', dx: -6, wide: 1 }); lab(R, [X0, 0, Z0], 'layer 0', { fs: 12, c: P.mute, al: 'right', dx: -6, wide: 1 });
    lab(R, [X0, 0, z(NL - 1) + .1], 'token 0', { fs: 12, c: P.mute, dy: 14 }); lab(R, [X0 + NC * CW, 0, z(NL - 1) + .1], int(E.length) + ' · question', { fs: 12, c: P.mute, dy: 14 });
    const pct = pb === 'full' ? '100%' : (pb === 'local_global' ? 25 : +bud * 100) + '% kept';
    lab(R, [X0 + NC * CW / 2, 0, z(NL - 1) + .1], NAME[pb] + ' · ' + pct, { fs: 13, b: 1, c: P.acc, dy: 34, a: la(st, e, q => q === k ? 1 : 0) });
  }
  const ser = (p, f) => E.series.find(r => r.pol === p && Math.abs(r.f - f) < 1e-9), pc = v => Math.round(100 * v) + '%', f2 = v => v == null ? 'not run' : v.toFixed(2);
  function now(k) { const p = ORDER[k], f = p === 'full' ? 1 : p === 'local_global' ? .25 : +bud, s = ser(p, f), F = ser('full', 1), el = document.getElementById('ev-now'); if (!el || !s) return;
    el.innerHTML = '<b>Over all ' + E.n_pk + ' prompts at this step</b> (' + (p === 'full' ? 'the full cache' : NAME[p] + ' at ' + f * 100 + '%') + ', ' + (E.length * E.bpt * f / 2 ** 20).toFixed(1).replace(/\.0$/, '') + ' MiB kept): pass-key ' + pc(s.pk) + ' (full ' + pc(F.pk) + '), copy loss ' + f2(s.copy) + ' (full ' + f2(F.copy) + ', lower is better), new-story loss ' + f2(s.new) + ' (full ' + f2(F.new) + ').'; }
  const full = { cam: [.42, .6], bounds: [[-4.9, 0, -2.4], [6.6, 1.0, 2.4]] };
  const stg = S3.stage({ id: 'stg-ev', list: 'sx-ev', fig: 'Fig. 3 · what each policy keeps, SmolLM2-135M', cam: full.cam, bounds: full.bounds, aspect: .45, dur: 1500, hold: 5000, draw,
    margin: w => w < 520 ? [24, 8, 40, 8] : [30, 125, 52, 70], onStep: k => now(k) });
  const bb = document.getElementById('ev-bud');
  if (bb && stg) bb.addEventListener('click', ev => { const b = ev.target.closest('button'); if (!b) return; bb.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); bud = b.dataset.m; stg.list('sx-ev'); });
})();
