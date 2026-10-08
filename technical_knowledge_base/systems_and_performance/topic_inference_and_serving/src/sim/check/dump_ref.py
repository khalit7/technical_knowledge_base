"""Run: python3 dump_ref.py <out.json>. Reference outputs of sim.py for check_core.mjs: the vLLM cases plus every other
mode (static, contiguous, swap, reserve admission, replicas, disaggregation, closed loop)."""
import json, os, sys, copy
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
import sim
cases = json.load(open(os.path.join(HERE, 'cases.json')))
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
out = []
for case in cases:
    reqs, engs, log = sim.run(case['cfg'], keep_log=True)
    mt = sim.metrics(reqs, engs, case['cfg']['slo'])
    out.append({'name': case['name'], 'cfg': case['cfg'], 'metrics': mt, 'log': log,
                'reqs': [[q['id'], q['arr'], q['P'], q['O'], q['first'], q['done'], q['npre'], q['hit']] for q in reqs]})
json.dump(out, open(sys.argv[1], 'w'))  # large: write it outside the repo
print(len(out), 'cases')
