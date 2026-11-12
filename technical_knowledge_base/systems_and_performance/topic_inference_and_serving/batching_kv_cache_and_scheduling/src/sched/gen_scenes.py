"""Data for the Reading tab's 3D stages (2026-11-12), from this page's own simulator (bksched.py) on the presets
already in out/sched.json (hardware fitted by the parent's Serving simulator, model shapes from config.json).
Writes out/scenes.json, bundled into window.BKD.scn by ../gen_data.py. Seconds to run: about one.

  cb     section 1: the same eight requests under static batching and continuous batching (4 seats), Llama 3.1 8B FP8
         on the H100 preset. Request lengths are illustrative (chosen for the picture); every time is the simulator's.
  pool   section 2: a 40-block pool of 16-token blocks with prefix caching, four requests sharing a 32-token system
         prompt; the fourth is the first request's next turn. Snapshots of every block table at chosen steps.
  pre    section 6: a 30-block pool under optimistic admission and recompute preemption (vLLM's rules), five requests.
  chunk  section 5: the chunk_h100 case of out/sched.json (8 users decoding, a 12,000-token prompt at 0.2 s) at three
         token budgets, every step's start, length and tokens; its TTFT and longest gap are checked against sched.json.
usage: python3 -I gen_scenes.py"""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import bksched as S

D = json.load(open(os.path.join(HERE, 'out', 'sched.json')))
HW, MOD = D['hw'], D['models']
r4 = lambda x: float('%.4g' % x)
r5 = lambda x: round(x, 5)


def snap(self):
    """Replaces Engine.kv_state for these runs only: every running request's block table and computed tokens,
    each block's reference count and whether it still holds a cached (hashed) prefix."""
    p = self.pool
    return {'tab': {str(q['id']): list(q['blocks']) for q in self.running}, 'nc': {str(q['id']): q['ncomp'] for q in self.running},
            'ref': list(p.ref), 'key': [1 if k else 0 for k in p.key], 'wait': [q['id'] for q in self.waiting]}


S.Engine.kv_state = snap
ENG = {'mode': 'cont', 'kv': 'paged', 'bs': 16, 'nblocks': 59375, 'pc': False, 'chunk': True, 'budget': 8192,
       'maxseq': 256, 'preempt': 'recompute', 'swapbw': 25e9, 'admit': 'optimistic', 'policy': 'fcfs'}


def run(reqs, hw, m, c):
    rq, engs, log = S.run({'reqs': reqs, 'w': {}, 'hw': HW[hw], 'm': MOD[m], 'c': dict(ENG, **c), 'slo': [2, 0.1]}, keep_log=True)
    return rq, engs, log, S.metrics(rq, engs, [2, 0.1])


out = {}

# ---- section 1: static against continuous batching -------------------------------------------------------------
P = [420, 300, 560, 250, 380, 480, 330, 270]
O = [120, 360, 60, 240, 300, 90, 180, 150]
cb = {'P': P, 'O': O, 'seats': 4, 'model': MOD['l8_fp8']['name'], 'modes': {}}
for mode in ['static', 'cont']:
    reqs = [{'id': i, 'arr': 0.0, 'P': P[i], 'O': O[i], 'M': 512, 'g': -1, 'S': 0, 'conv': i, 'turn': 0} for i in range(8)]
    rq, engs, log, mt = run(reqs, 'h100_fp8', 'l8_fp8', {'mode': mode, 'maxseq': 4, 'nokv': True})
    start = {}
    for s in log:
        for row in s['rows']:
            start.setdefault(row[0], s['t'])
    # seats: a request takes the lowest seat free when it starts; a seat is free again once its request has left
    seat, busy = {}, [None] * 4
    for q in sorted(rq, key=lambda q: (start[q['id']], q['id'])):
        for k in range(4):
            if busy[k] is None or busy[k] <= start[q['id']] + 1e-12:
                seat[q['id']] = k
                busy[k] = q['done']
                break
    R = [{'id': q['id'], 'seat': seat[q['id']], 'start': r5(start[q['id']]), 'first': r5(q['first']), 'last': r5(q['times'][-1]),
          'left': r5(q['done'])} for q in sorted(rq, key=lambda q: q['id'])]
    held = sum(r['left'] - r['start'] for r in R)
    used = sum(r['last'] - r['start'] for r in R)
    cb['modes'][mode] = {'reqs': R, 'span': r4(mt['span']), 'tps': r4(mt['tps']), 'steps': mt['steps'],
                         'mean_done': r4(sum(q['times'][-1] for q in rq) / len(rq)), 'seat_use': r4(used / (4 * mt['span'])),
                         'idle_share': r4(1 - used / held), 'step0_ms': r4(log[0]['dt'] * 1e3), 'dstep_ms': r4(log[2]['dt'] * 1e3)}
out['cb'] = cb


def snaps(log, picks):
    o = []
    for k in picks:
        s = log[k]
        o.append({'k': k, 't': r5(s['t']), 'dt': r5(s['dt']), 'pre': s['pre'], 'rows': [[r[0], r[1], r[2], r[3]] for r in s['rows'] if r[3] != 'd'],
                  'tab': s['kv']['tab'], 'nc': s['kv']['nc'], 'ref': s['kv']['ref'], 'key': s['kv']['key'], 'wait': s['kv']['wait'], 'used': s['kvu']})
    return o


def first_step(log, f):
    return next(k for k, s in enumerate(log) if f(s))


# ---- section 2: one pool, four block tables, a shared system prompt ---------------------------------------------
SYS = 32
pr = [{'id': 0, 'arr': 0.0, 'P': SYS + 30, 'O': 40}, {'id': 1, 'arr': 0.03, 'P': SYS + 50, 'O': 70}, {'id': 2, 'arr': 0.06, 'P': SYS + 20, 'O': 90}]
reqs = [dict(q, M=128, g=0, S=SYS, conv=q['id'], turn=0) for q in pr]
# request 3 is request 0's next turn: its history (prompt and answer) plus 16 new tokens, so it repeats request 0's blocks
reqs.append({'id': 3, 'arr': 0.3, 'P': SYS + 30 + 40 + 16, 'O': 30, 'M': 128, 'g': 0, 'S': SYS, 'conv': 0, 'turn': 1})
rq, engs, log, mt = run(reqs, 'h100_fp8', 'l8_fp8', {'nblocks': 40, 'pc': True, 'maxseq': 8})
a0 = 0
b0 = first_step(log, lambda s: any(r[0] == 1 for r in s['rows']))
c0 = first_step(log, lambda s: any(r[0] == 2 for r in s['rows']))
grow = first_step(log, lambda s: '0' in s['kv']['tab'] and len(s['kv']['tab']['0']) >= 7)
gone = first_step(log, lambda s: s['t'] > 0.05 and '0' not in s['kv']['tab']) - 1
d0 = first_step(log, lambda s: any(r[0] == 3 for r in s['rows']))
picks = [a0, b0, c0, grow, gone + 1, d0]
out['pool'] = {'n': 40, 'bs': 16, 'sys': SYS, 'reqs': [{k: q[k] for k in ('id', 'arr', 'P', 'O', 'conv', 'turn')} for q in reqs],
               'hit': {str(q['id']): q['hit'] for q in rq}, 'snaps': snaps(log, picks), 'done0': r5([q for q in rq if q['id'] == 0][0]['done'])}

# ---- section 6: admission and preemption as the pool fills -----------------------------------------------------
pr = [(0, 0.0, 90, 150), (1, 0.02, 120, 60), (2, 0.04, 70, 130), (3, 0.1, 100, 80), (4, 0.3, 80, 40)]
reqs = [{'id': i, 'arr': a, 'P': p, 'O': o, 'M': 256, 'g': -1, 'S': 0, 'conv': i, 'turn': 0} for i, a, p, o in pr]
rq, engs, log, mt = run(reqs, 'h100_fp8', 'l8_fp8', {'nblocks': 30, 'pc': True, 'maxseq': 8})
adm = lambda i: first_step(log, lambda s: any(r[0] == i and r[1] == 0 and r[3] != 'd' for r in s['rows']))
pre = [k for k, s in enumerate(log) if s['pre']]
back = [k for k, s in enumerate(log) if any(r[0] == 3 and r[3] != 'd' for r in s['rows'])]
picks = [adm(2), adm(3), pre[0], back[1], pre[1], pre[2], back[2]]
out['pre'] = {'n': 30, 'bs': 16, 'reqs': [{k: q[k] for k in ('id', 'arr', 'P', 'O')} for q in reqs], 'snaps': snaps(log, picks),
              'npre': mt['npre'], 'pre_by': {str(q['id']): q['npre'] for q in rq}, 'hit': {str(q['id']): q['hit'] for q in rq},
              'done': {str(q['id']): r5(q['done']) for q in rq}, 'steps': mt['steps']}

# ---- section 5: chunked prefill, the chunk_h100 case at three budgets ------------------------------------------
ref = {r['budget']: r for r in D['chunk_h100']['rows']}
ch = {'desc': D['chunk_h100']['desc'], 'rows': []}
for b in [0, 2048, 512]:
    dec, long, at = (500, 400, 8), (12000, 20), 0.2
    reqs = [{'id': i, 'arr': 0.0, 'P': dec[0], 'O': dec[1], 'M': dec[1], 'g': -1, 'S': 0, 'conv': i, 'turn': 0} for i in range(dec[2])]
    reqs.append({'id': dec[2], 'arr': at, 'P': long[0], 'O': long[1], 'M': long[1], 'g': -1, 'S': 0, 'conv': 99, 'turn': 0})
    c = {'nblocks': 2000, 'maxseq': 256, 'budget': b if b else max(long[0] + dec[2], 16384), 'chunk': bool(b), 'nokv': True}
    rq, engs, log, mt = run(reqs, 'h100_bf16', 'l8_bf16', c)
    L = [q for q in rq if q['id'] == dec[2]][0]
    g = []
    for q in rq:
        if q is L:
            continue
        t = q['times']
        g += [y - x for x, y in zip(t, t[1:]) if y > L['arr'] and x < L['first']]
    ttft, mg = r4(L['first'] - L['arr']), r4(max(g))
    assert ttft == ref[b]['long_ttft'] and mg == ref[b]['max_gap'], (b, ttft, mg, ref[b])
    steps = [[r5(s['t']), r5(s['dt']), sum(r[2] for r in s['rows'] if r[0] == dec[2]), sum(1 for r in s['rows'] if r[0] != dec[2])]
             for s in log if 0.15 <= s['t'] <= 0.75]
    ch['rows'].append({'budget': b, 'ttft': ttft, 'max_gap': mg, 'first': r5(L['first']), 'steps': steps,
                       'chunks': sum(1 for s in log if any(r[0] == dec[2] and r[3] in 'pP' for r in s['rows']))})
out['chunk'] = ch

json.dump(out, open(os.path.join(HERE, 'out', 'scenes.json'), 'w'), separators=(',', ':'))
print('ok', len(json.dumps(out, separators=(',', ':'))), 'bytes; pool picks', [s['k'] for s in out['pool']['snaps']],
      'pre picks', [s['k'] for s in out['pre']['snaps']])
