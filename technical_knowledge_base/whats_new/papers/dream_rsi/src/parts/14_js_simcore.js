// ---- The replay simulator of §3, run on illustrative recorded worlds (no browser code here, so Node can check it) ----
// A world is a frozen branch × attempt grid (the shape the paper's own policy prompt describes, Appendix D.2):
// branch b is the b-th child of the root, attempt j its j-th refinement; s[b][j] is a score or null (a failed attempt).
// Replay follows §3: a selected leaf reveals its one recorded child, a selected root opens the earliest unopened branch,
// nothing beyond the recorded grid is ever generated. Two replay scores: v2's Eq. 1 as the released code computes it
// (google-research/dream-rsi, dream_rsi/learning/heuristic_search/eval.py, _trace_auc and _pareto_summary, ported
// line by line below) and v1's Eq. 1 (best score, a charge per attempt, a bonus per average batch).
const SIM = (function () {
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296 } }
  function gauss(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v) }
  // Illustrative generator (every constant here is invented for the toy, none comes from the paper):
  // most directions are mediocre, about a third are good; some gain early, some only after several refinements;
  // about one attempt in six fails (compile or correctness error) and scores nothing.
  const BASE = 0.1;
  function world(seed, o) {
    o = o || {}; const B = o.B || 10, D = o.D || 11, late = o.later ? 0.75 : 0.3, r = rng(seed * 2654435761 >>> 0);
    const s = [], kind = [];
    for (let b = 0; b < B; b++) {
      const good = r() < 0.3, q = good ? 0.55 + 0.4 * r() : 0.15 + 0.35 * r();
      const isLate = r() < late, tau = 1 + 1.5 * r(), mid = (o.later ? 6 : 4.5) + 3 * r();
      const row = [];
      for (let j = 0; j < D; j++) {
        const g = isLate ? 1 / (1 + Math.exp(-(j - mid) / 0.9)) : 1 - Math.exp(-(j + 1) / tau);
        const fail = r() < 0.17, e = 0.025 * gauss(r);
        row.push(fail ? null : Math.max(0, Math.min(1, BASE + (q - BASE) * g + e)));
      }
      s.push(row); kind.push((good ? 'good' : 'weak') + (isLate ? ', late' : ', early'));
    }
    let best = 0; s.forEach(row => row.forEach(v => { if (v != null && v > best) best = v }));
    return { B, D, s, kind, best, seed };
  }
  // A policy is prefix-only, like the paper's: it sees only what it has revealed.
  //   w: branches kept open at once (opened in round 1, refilled if refill), p: close a branch after p attempts in a row
  //   that do not beat its own best (failures count), k: close a branch whose best is under k × the best seen anywhere
  //   (after 2 valid attempts), refill: open the next unopened branch when one closes.
  // FIXED is the paper's starting policy: W parallel workspaces, each refined to the end (Section 4). Like the released
  // baseline.py it has no budget knob (blind), so every budget preference replays the same 110 cells.
  const FIXED = { w: 10, p: Infinity, k: 0, refill: false, blind: true, name: 'fixed parallel refine' };
  const RHO = [0, 0.25, 0.5, 0.75, 1];
  // The toy's budget-preference schedule (invented for the toy; it follows the rule of the released policy template and
  // prompt, "high beta means more width, deeper patience, and weaker pruning"): rho = 1 is the policy's own setting.
  function sched(pol, rho) {
    if (pol.blind) return pol;
    return { w: Math.max(1, Math.floor(pol.w * (0.4 + 0.6 * rho) + 0.5)),
      p: pol.p === Infinity ? Infinity : Math.max(1, Math.floor(pol.p * (0.5 + 0.5 * rho) + 0.5)),
      k: pol.k > 0 ? Math.min(0.99, pol.k + 0.1 * (1 - rho)) : 0, refill: pol.refill };
  }
  function replay(wd, pol, W) {
    W = W || 10; const B = wd.B, D = wd.D, w = Math.min(pol.w, W, B);
    const nxt = new Array(B).fill(0), open = [], closed = new Array(B).fill(false), bb = new Array(B).fill(-1), stale = new Array(B).fill(0), nv = new Array(B).fill(0);
    let nextRoot = 0, best = 0, N = 0; const rounds = [];
    for (let k = 0; k < 1000; k++) {
      const batch = [], opened = [];
      open.forEach(b => { if (!closed[b] && nxt[b] < D) batch.push([b, nxt[b]]) });
      const active = batch.length;
      const want = k === 0 ? w : (pol.refill ? w : 0);
      for (let a = active; a < want && nextRoot < B && batch.length < W; a++) { const b = nextRoot++; open.push(b); opened.push(b); batch.push([b, 0]) }
      if (!batch.length) break;
      const closedNow = [], improved = [];
      batch.forEach(([b, j]) => { nxt[b] = j + 1; N++; const v = wd.s[b][j];
        if (v != null) { nv[b]++; if (v > bb[b] + 1e-12) { bb[b] = v; stale[b] = 0; improved.push(b) } else stale[b]++; if (v > best) best = v } else stale[b]++ });
      batch.forEach(([b]) => { if (closed[b]) return;
        let why = '';
        if (stale[b] >= pol.p) why = 'stale';
        else if (pol.k > 0 && nv[b] >= 2 && bb[b] < pol.k * best) why = 'weak';
        if (why) { closed[b] = true; closedNow.push([b, why]) } });
      rounds.push({ batch, opened, closedNow, N, best });
    }
    return { rounds, N, k: rounds.length, best, closed, nxt };
  }
  // v1's Eq. 1: best score reached, minus beta1 per generation-evaluation request, plus beta2 per average batch size.
  const V = (t, b1, b2) => t.best - b1 * t.N + b2 * t.N / Math.max(1, t.k);
  // v2's Eq. 1 as the released code computes it. One replay per budget preference rho gives a point
  // (calls n, attainment a = best / recorded best, clipped to [0, 1]); the score is the normalised area those points
  // dominate against the exhaustive budget B (n_evaluated: here all 110 cells), minus lambda times the mean of
  // effective sequential rounds per call (a batch of size c costs ceil(c / W) rounds; every toy batch has c <= W).
  function sweep(wd, pol, W) {
    return RHO.map(rho => { const t = replay(wd, sched(pol, rho), W);
      return { rho, N: t.N, k: t.k, best: t.best, a: wd.best > 0 ? Math.max(0, Math.min(1, t.best / wd.best)) : 0 } });
  }
  function front(pts, B) { // _trace_auc: cheapest budget per attainment level, strictly rising attainment, staircase area
    const byB = new Map();
    pts.slice().sort((p, q) => p.N - q.N || q.a - p.a).forEach(p => { const c = byB.get(p.N); if (!c || p.a > c.a) byB.set(p.N, p) });
    const fr = []; let amax = -1;
    [...byB.keys()].sort((x, y) => x - y).forEach(n => { const p = byB.get(n); if (p.a > amax) { fr.push(p); amax = p.a } });
    let hv = 0, prev = 0; fr.forEach(p => { hv += (p.a - prev) * Math.max(0, B - p.N); prev = p.a });
    return { hv: B > 0 ? hv / B : 0, front: fr };
  }
  function Vhv(wd, pol, lam, W) { // one trace of _pareto_summary
    const pts = sweep(wd, pol, W), B = wd.B * wd.D, F = front(pts, B);
    const r = pts.filter(p => p.N > 0).map(p => p.k / p.N), pen = r.length ? r.reduce((a, b) => a + b, 0) / r.length : 1;
    return { V: F.hv - lam * pen, hv: F.hv, pen, pts, front: F.front, B };
  }
  // The candidate pool the toy "dreams" over (the paper's development agent writes M = 4 versions of policy code instead).
  function pool() {
    const out = [FIXED];
    for (const w of [1, 2, 3, 4, 6, 8, 10]) for (const p of [1, 2, 3, 4, 6, Infinity]) for (const k of [0, 0.5, 0.7, 0.8, 0.9, 0.95]) for (const refill of [false, true])
      out.push({ w, p, k, refill });
    return out;
  }
  // Average replay score of every candidate over the history; the winner is the argmax (the current policy is in the pool).
  // cfg: {v: 2, lam} scores by v2's Eq. 1 (the released mean AUC minus lambda times the mean penalty);
  //      {v: 1, b1, b2} by v1's Eq. 1, each policy at its own setting (rho = 1).
  function dream(worlds, cfg, W) {
    return pool().map(pol => {
      let v = 0, n = 0, sh = 0, kk = 0, hv = 0, pen = 0;
      worlds.forEach(wd => {
        if (cfg.v === 2) { const s = Vhv(wd, pol, cfg.lam, W); v += s.V; hv += s.hv; pen += s.pen;
          s.pts.forEach(p => { n += p.N / RHO.length; kk += p.k / RHO.length; sh += p.a / RHO.length }) }
        else { const t = replay(wd, sched(pol, 1), W); v += V(t, cfg.b1, cfg.b2); n += t.N; kk += t.k; sh += wd.best > 0 ? t.best / wd.best : 0 }
      });
      const m = worlds.length; return { pol, V: v / m, N: n / m, k: kk / m, share: sh / m, hv: hv / m, pen: pen / m };
    });
  }
  const same = (a, b) => a.w === b.w && a.p === b.p && a.k === b.k && a.refill === b.refill && !!a.blind === !!b.blind;
  function pick(res) { let i = 0; res.forEach((r, j) => { if (r.V > res[i].V + 1e-12) i = j }); return res[i] }
  const label = pol => pol.blind ? 'the fixed starting policy (10 open at once, each refined to the end, no budget knob)' : (pol.w + ' open at once, ' + (pol.p === Infinity ? 'never closes for staleness' : 'closes after ' + pol.p + ' without gain') + ', ' + (pol.k ? 'drops branches under ' + Math.round(pol.k * 100) + '% of the best' : 'never drops for weakness') + ', ' + (pol.refill ? 'refills' : 'no refill') + ' (at ρ = 1; lower ρ narrows, shortens patience and prunes harder)');
  return { rng, world, replay, V, sched, sweep, front, Vhv, RHO, pool, dream, pick, same, FIXED, label, BASE };
})();
if (typeof module !== 'undefined') module.exports = SIM;
