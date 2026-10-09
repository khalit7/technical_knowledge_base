"""Two-client traces for the vLLM priority check (written to prio_cases.json)."""
import copy, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = json.load(open(os.path.join(HERE, '..', '..', '..', '..', 'src', 'sim', 'check', 'cases.json')))
base = ROOT[0]['cfg']
out = []
def case(name, clients, c, seed=3, maxtok=64):
    cfg = copy.deepcopy(base)
    cfg['w'] = {'seed': seed, 'maxtok': maxtok, 'clients': clients}
    cfg['c'].update(c)
    out.append({'name': name, 'cfg': cfg})
A = {'n': 30, 'rate': 60, 'plo': 20, 'phi': 200, 'olo': 5, 'ohi': 60, 'pr': 1}
B = {'n': 15, 'rate': 20, 'plo': 20, 'phi': 120, 'olo': 5, 'ohi': 40, 'pr': 0}
for pol in ('priority', 'fcfs'):
    case(pol + ', roomy cache', [A, B], {'policy': pol, 'nblocks': 400})
    case(pol + ', tight cache (preemption)', [A, B], {'policy': pol, 'nblocks': 40, 'maxseq': 16})
    case(pol + ', tight, no chunking', [A, B], {'policy': pol, 'nblocks': 40, 'maxseq': 16, 'chunk': False, 'budget': 2048})
    case(pol + ', all at once, tight', [dict(A, rate=0), dict(B, rate=0)], {'policy': pol, 'nblocks': 36, 'maxseq': 12})
json.dump(out, open(os.path.join(HERE, 'prio_cases.json'), 'w'), indent=0)
print(len(out))
