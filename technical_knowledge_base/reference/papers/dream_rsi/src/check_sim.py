"""Check the page's replay simulator (parts/14_js_simcore.js) against an independent Python implementation of §3.

  python3 check_sim.py        (needs node; writes inputs/check_sim.json)

Node generates the illustrative worlds and replays every candidate policy; this script re-implements the replay
rules (a leaf reveals its recorded child, the root opens the earliest unopened branch, batches of at most W,
stop on an empty batch) and Eq. 1 from the paper's text, and compares N, k, best and V for every (policy, world).
It also checks the invariants the page states: replay never exceeds the recorded best, the fixed policy reveals
the whole 10 x 11 grid in 11 rounds, and the winner's average replay score is at least the current policy's (§3).
"""
import json, math, subprocess
JS = r'''
const SIM=require('./parts/14_js_simcore.js');
const worlds=[1,2,3].map(s=>SIM.world(s)); const out={worlds:worlds.map(w=>({s:w.s,best:w.best})),runs:[]};
const pool=SIM.pool();
pool.forEach((pol,i)=>worlds.forEach((w,j)=>{const t=SIM.replay(w,pol,10);out.runs.push({i,j,pol:{w:pol.w,p:pol.p===Infinity?null:pol.p,k:pol.k,refill:pol.refill},N:t.N,k:t.k,best:t.best,V:SIM.V(t,0.002,0.01)})}));
const res=SIM.dream(worlds,0.002,0.01,10);const win=SIM.pick(res);const fx=res.find(r=>SIM.same(r.pol,SIM.FIXED));
out.win={V:win.V,pol:{w:win.pol.w,p:win.pol.p===Infinity?null:win.pol.p,k:win.pol.k,refill:win.pol.refill}};out.fixedV=fx.V;
console.log(JSON.stringify(out));
'''
d = json.loads(subprocess.run(['node', '-e', JS], capture_output=True, text=True, check=True).stdout)

def replay(s, pol, W=10):
    B, D = len(s), len(s[0]); w = min(pol['w'], W, B); p = pol['p'] if pol['p'] is not None else math.inf
    nxt = [0] * B; opened = []; closed = [False] * B; bb = [-1.0] * B; stale = [0] * B; nv = [0] * B
    nroot = 0; best = 0.0; N = 0; k = 0
    while True:
        batch = [(b, nxt[b]) for b in opened if not closed[b] and nxt[b] < D]
        want = w if k == 0 else (w if pol['refill'] else 0)
        a = len(batch)
        while a < want and nroot < B and len(batch) < W:
            opened.append(nroot); batch.append((nroot, 0)); nroot += 1; a += 1
        if not batch: break
        assert len(batch) <= W and len(set(batch)) == len(batch)
        for b, j in batch:
            assert j == nxt[b]  # each branch is revealed in its recorded parent-child order
            nxt[b] = j + 1; N += 1; v = s[b][j]
            if v is not None:
                nv[b] += 1
                if v > bb[b] + 1e-12: bb[b] = v; stale[b] = 0
                else: stale[b] += 1
                best = max(best, v)
            else: stale[b] += 1
        for b, _ in batch:
            if closed[b]: continue
            if stale[b] >= p or (pol['k'] > 0 and nv[b] >= 2 and bb[b] < pol['k'] * best): closed[b] = True
        k += 1
    return N, k, best

bad, maxdv = 0, 0.0
for r in d['runs']:
    s = d['worlds'][r['j']]['s']
    N, k, best = replay(s, r['pol'])
    V = best - 0.002 * N + 0.01 * N / max(1, k)
    if (N, k) != (r['N'], r['k']) or abs(best - r['best']) > 1e-12: bad += 1
    maxdv = max(maxdv, abs(V - r['V']))
    assert best <= d['worlds'][r['j']]['best'] + 1e-12
fixed = [r for r in d['runs'] if r['pol'] == {'w': 10, 'p': None, 'k': 0, 'refill': False}]
assert all(r['N'] == 110 and r['k'] == 11 for r in fixed)
assert d['win']['V'] >= d['fixedV'] - 1e-12
out = {'pairs': len(d['runs']), 'mismatches': bad, 'max_abs_V_diff': maxdv, 'fixed_reveals_110_in_11': True, 'winner': d['win'], 'fixed_V': d['fixedV']}
json.dump(out, open('inputs/check_sim.json', 'w'), indent=1)
print(out)
assert bad == 0 and maxdv < 1e-12
print('PASS')
