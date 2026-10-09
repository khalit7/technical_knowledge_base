"""bksched.py with policy 'fcfs' must behave exactly like the root's sim.py (which was checked step by step against
vLLM v0.31.0's scheduler): same step logs and metrics on the root's 10 vLLM cases and its 12 other-mode configurations (22 in all)."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SIM = os.path.normpath(os.path.join(HERE, '..', '..', '..', '..', 'src', 'sim'))
sys.path.insert(0, ROOT_SIM)
import sim
sys.path.insert(0, os.path.dirname(HERE))
import bksched as sched

cases = json.load(open(os.path.join(ROOT_SIM, 'check', 'cases.json')))
# the root's JS-check variants (copied from its check/dump_ref.py): every other mode
import copy
base = cases[0]['cfg']
def var(name, w={}, c={}, top={}):
    cfg = copy.deepcopy(base); cfg['w'].update(w); cfg['c'].update(c); cfg.update(top)
    cases.append({'name': name, 'cfg': cfg})
var('static, paged', c={'mode': 'static'})
var('static, contiguous', c={'mode': 'static', 'kv': 'contig', 'nblocks': 60})
var('continuous, contiguous, tight', c={'kv': 'contig', 'nblocks': 40, 'maxseq': 16})
var('swap preemption', c={'nblocks': 30, 'maxseq': 16, 'preempt': 'swap'})
var('reserve admission', c={'nblocks': 40, 'maxseq': 16, 'admit': 'reserve'})
var('two replicas, Poisson', w={'n': 80, 'rate': 50}, top={'reps': 2})
var('disaggregated 1P+1D', w={'n': 80, 'rate': 50}, top={'disagg': True, 'np': 1, 'nd': 1, 'xbw': 50e9})
var('disaggregated 2P+1D, prefix caching', w={'n': 80, 'rate': 80, 'sys': 128, 'share': 0.7, 'groups': 2}, c={'pc': True}, top={'disagg': True, 'np': 2, 'nd': 1, 'xbw': 25e9})
var('closed loop 6 clients, api latency', w={'n': 40, 'closed': 6}, top={'api': 0.004})
var('light log, larger', w={'n': 400, 'rate': 100, 'plo': 50, 'phi': 900, 'ohi': 300, 'maxtok': 300}, c={'nblocks': 600, 'budget': 1024, 'maxseq': 64, 'lv': 1})
stall = [{'id': i, 'arr': 0.0, 'P': 500, 'O': 400, 'M': 512, 'g': -1, 'S': 0, 'conv': i, 'turn': 0} for i in range(8)]
stall.append({'id': 8, 'arr': 0.2, 'P': 12000, 'O': 20, 'M': 512, 'g': -1, 'S': 0, 'conv': 8, 'turn': 0})
var('explicit requests, chunked 512', c={'nblocks': 2000, 'budget': 512}, top={'reqs': stall})
var('explicit requests, no chunking', c={'nblocks': 2000, 'budget': 16384, 'chunk': False}, top={'reqs': stall})
cfgs = [c['cfg'] for c in cases]
ok = bad = steps = 0
for cfg in cfgs:
    a_r, a_e, a_l = sim.run(json.loads(json.dumps(cfg)), keep_log=True)
    b_r, b_e, b_l = sched.run(json.loads(json.dumps(cfg)), keep_log=True)
    la = [[st['t'], st['dt'], st['pre'], [r[:4] for r in st.get('rows', [])]] for st in a_l]
    lb = [[st['t'], st['dt'], st['pre'], [r[:4] for r in st.get('rows', [])]] for st in b_l]
    ma = sim.metrics(a_r, a_e, cfg['slo'])
    mb = sched.metrics(b_r, b_e, cfg['slo'])
    same = la == lb and ma == mb
    steps += len(la)
    ok += same
    bad += not same
res = {'cases': len(cfgs), 'identical': ok, 'different': bad, 'steps': steps}
json.dump(res, open(os.path.join(os.path.dirname(HERE), 'out', 'regress.json'), 'w'))
print(json.dumps(res))
sys.exit(1 if bad else 0)
