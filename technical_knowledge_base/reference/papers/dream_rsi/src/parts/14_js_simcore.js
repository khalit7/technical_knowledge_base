// ---- The replay simulator of §3, run on illustrative recorded worlds (no browser code here, so Node can check it) ----
// A world is a frozen branch × attempt grid (the shape the paper's own policy prompt describes, Appendix B.2):
// branch b is the b-th child of the root, attempt j its j-th refinement; s[b][j] is a score or null (a failed attempt).
// Replay follows §3: a selected leaf reveals its one recorded child, a selected root opens the earliest unopened branch,
// nothing beyond the recorded grid is ever generated, and Eq. 1 scores the trajectory.
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
  // FIXED is the paper's starting policy: W parallel workspaces, each refined to the end (Section 4).
  const FIXED = { w: 10, p: Infinity, k: 0, refill: false, name: 'fixed parallel refine' };
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
  // Eq. 1: best score reached, minus beta1 per generation-evaluation request, plus beta2 per average batch size.
  const V = (t, b1, b2) => t.best - b1 * t.N + b2 * t.N / Math.max(1, t.k);
  // The candidate pool the toy "dreams" over (the paper's development agent writes M revisions of policy code instead).
  function pool() {
    const out = [];
    for (const w of [1, 2, 3, 4, 6, 8, 10]) for (const p of [1, 2, 3, 4, 6, Infinity]) for (const k of [0, 0.5, 0.7, 0.8, 0.9, 0.95]) for (const refill of [false, true])
      out.push({ w, p, k, refill });
    return out;
  }
  // Average replay score of every candidate over the history; the winner is the argmax (the current policy is in the pool).
  function dream(worlds, b1, b2, W) {
    return pool().map(pol => {
      let v = 0, n = 0, sh = 0, kk = 0;
      worlds.forEach(wd => { const t = replay(wd, pol, W); v += V(t, b1, b2); n += t.N; kk += t.k; sh += wd.best > 0 ? t.best / wd.best : 0 });
      const m = worlds.length; return { pol, V: v / m, N: n / m, k: kk / m, share: sh / m };
    });
  }
  const same = (a, b) => a.w === b.w && a.p === b.p && a.k === b.k && a.refill === b.refill;
  function pick(res) { let i = 0; res.forEach((r, j) => { if (r.V > res[i].V + 1e-12) i = j }); return res[i] }
  const label = pol => (pol.w + ' open at once, ' + (pol.p === Infinity ? 'never closes for staleness' : 'closes after ' + pol.p + ' without gain') + ', ' + (pol.k ? 'drops branches under ' + Math.round(pol.k * 100) + '% of the best' : 'never drops for weakness') + ', ' + (pol.refill ? 'refills' : 'no refill'));
  return { rng, world, replay, V, pool, dream, pick, same, FIXED, label, BASE };
})();
if (typeof module !== 'undefined') module.exports = SIM;
