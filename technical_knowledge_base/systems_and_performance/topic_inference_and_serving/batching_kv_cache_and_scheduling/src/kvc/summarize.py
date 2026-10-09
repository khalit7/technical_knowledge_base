"""Summarise the KV compression runs (kvc.py taskA and taskB outputs) into out/kvc_summary.json.
usage: python3 -I summarize.py <taskA.json> <taskB.json>"""
import json, math, os, statistics, sys
HERE = os.path.dirname(os.path.abspath(__file__))
A = json.load(open(sys.argv[1]))
B = json.load(open(sys.argv[2]))
mA, mB = A['meta'], B['meta']
out = {'meta': {'model': 'Qwen/Qwen3-0.6B @ c1899de2 (BF16 weights loaded as float32)', 'torch': mA['torch'], 'transformers': mA['transformers'],
                'threads': mA['threads'], 'nA': mA['n'], 'nB': mB['n'], 'ratios': mA['ratios'], 'policies': mA['policies'],
                'wallA_s': round(mA['wall_s']), 'wallB_s': round(mB['wall_s'])}}
pols = mA['policies']
ra = A['rows']
out['A'] = {'full_acc': sum(r['out']['full']['ok'] for r in ra) / len(ra), 'C_mean': statistics.fmean(r['C'] for r in ra), 'rows': []}
for p in pols:
    for r in mA['ratios']:
        seeds = sorted({k.split('|')[2] for k in ra[0]['out'] if k.startswith(p + '|')})
        accs = [sum(x['out']['%s|%g|%s' % (p, r, s)]['ok'] for x in ra) / len(ra) for s in seeds]
        free = statistics.fmean(x['out']['%s|%g|%s' % (p, r, s)]['free'] for x in ra for s in seeds)
        needle = statistics.fmean(x['out']['%s|%g|%s' % (p, r, s)].get('needle', 0) for x in ra for s in seeds)
        out['A']['rows'].append({'policy': p, 'ratio': r, 'acc': statistics.fmean(accs), 'acc_min': min(accs), 'acc_max': max(accs),
                                 'seeds': len(seeds), 'free': free, 'needle': needle})
rb = B['rows']
full_nll = statistics.fmean(x['out']['full']['nll'] for x in rb)
out['B'] = {'full_ppl': math.exp(full_nll), 'C': rb[0]['C'], 'rows': []}
for p in pols:
    for r in mB['ratios']:
        seeds = sorted({k.split('|')[2] for k in rb[0]['out'] if k.startswith(p + '|')})
        ppls = [math.exp(statistics.fmean(x['out']['%s|%g|%s' % (p, r, s)]['nll'] for x in rb)) for s in seeds]
        free = statistics.fmean(x['out']['%s|%g|%s' % (p, r, s)]['free'] for x in rb for s in seeds)
        out['B']['rows'].append({'policy': p, 'ratio': r, 'ppl': statistics.fmean(ppls), 'ppl_min': min(ppls), 'ppl_max': max(ppls),
                                 'seeds': len(seeds), 'free': free})
ex = ra[0]
out['example'] = {'C': ex['C'], 'needle': ex.get('needle'), 'pos': ex['pos'], 'masks': ex.get('masks', {}),
                  'ok': {p: ex['out']['%s|0.25|0' % p]['ok'] for p in pols}}
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(out, open(os.path.join(HERE, 'out', 'kvc_summary.json'), 'w'))
print(json.dumps({k: v for k, v in out.items() if k != 'example'}, indent=0)[:4000])
