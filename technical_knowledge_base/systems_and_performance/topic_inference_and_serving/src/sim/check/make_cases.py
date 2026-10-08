"""Traces for the vLLM comparison: small enough to read, varied enough to hit
chunking, prefix hits, eviction, preemption and the max_num_seqs cap."""
import json, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))
from presets import MODELS
M = MODELS['l8_bf16']
HW = {'peak': 989.5e12, 'bw': 3.35e12, 'ec': 0.53, 'em': 0.8, 'ovh': 0.0015, 'ovs': 2.4e-5}
W = {'n': 20, 'rate': 0, 'plo': 20, 'phi': 200, 'olo': 5, 'ohi': 60, 'maxtok': 64, 'sys': 0, 'share': 0, 'groups': 1, 'turns': 1, 'gap': 0, 'seed': 1}
C = {'mode': 'cont', 'kv': 'paged', 'bs': 16, 'nblocks': 400, 'pc': False, 'chunk': True, 'budget': 256, 'maxseq': 8, 'preempt': 'recompute', 'swapbw': 25e9}
cases = []
def add(name, w={}, c={}):
    ww = dict(W); ww.update(w); cc = dict(C); cc.update(c)
    cases.append({'name': name, 'cfg': {'w': ww, 'hw': HW, 'm': M, 'c': cc, 'slo': [0.5, 0.05]}})
add('20 at once, chunked, roomy cache')
add('20 at once, no chunking', c={'chunk': False, 'budget': 512})
add('small cache: preemption by recompute', c={'nblocks': 30, 'maxseq': 16})
add('small cache and chunking off', c={'nblocks': 40, 'maxseq': 16, 'chunk': False, 'budget': 512})
add('shared system prompt, prefix caching', w={'sys': 160, 'share': 0.8, 'groups': 2}, c={'pc': True})
add('shared prompt, prefix caching, tight cache (eviction)', w={'sys': 160, 'share': 0.8, 'groups': 3, 'n': 40}, c={'pc': True, 'nblocks': 60, 'maxseq': 16})
add('multi-turn chats, prefix caching', w={'turns': 3, 'gap': 0.2, 'n': 30, 'rate': 20, 'sys': 64, 'share': 1, 'groups': 1}, c={'pc': True, 'nblocks': 200})
add('Poisson arrivals, 120 requests', w={'n': 120, 'rate': 40, 'seed': 5}, c={'nblocks': 120, 'maxseq': 32, 'budget': 512})
add('Poisson, prefix caching, preemption', w={'n': 120, 'rate': 60, 'seed': 9, 'sys': 96, 'share': 0.6, 'groups': 4}, c={'nblocks': 90, 'maxseq': 32, 'budget': 384, 'pc': True})
add('block size 32, budget 128', w={'n': 60, 'rate': 30, 'seed': 3}, c={'bs': 32, 'nblocks': 50, 'budget': 128, 'maxseq': 24, 'pc': True})
json.dump(cases, open(os.path.join(HERE, 'cases.json'), 'w'), indent=1)
print(len(cases))
