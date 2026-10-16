"""Recompute every sprio row of the gallery run from the job's request and Slurm 24.11.5's multifactor formula
(priority_multifactor.c: set_priority_factors and _get_priority_internal), to check the page's calculator.
usage: python3 scripts/recompute.py   (from src/; reads sl_data.json, writes recompute.json)"""
import json, math, re
d = json.load(open('sl_data.json'))
W = d['weights']; NODES, CPUS, GPUS = 3, 12, 12
PART = {'batch': 2 / 2, 'sllow': 1 / 2, 'urgent': 1 / 2}      # PriorityJobFactor / max (batch 2, sllow 1, urgent 1)
QOS = {'normal': 0, 'sl-small': 20 / 100, 'sl-high': 100 / 100}  # QOS priority / max QOS priority
def inputs(snap, jid):
    j = d['jobs'][jid]; n = d['snaps'][snap]['norm'][jid]; s = d['snaps'][snap]['sprio'][jid]
    t = dict(x.split('=') for x in j['ReqTRES'].split(','))
    return {'age_s': round(n['age'] * W['maxage'], 3), 'fs': n['fs'], 'nodes': int(t['node']), 'cpus': int(t['cpu']), 'gpus': int(t.get('gres/gpu', 0)),
            'part': j['Partition'], 'qos': j['QOS'], 'nice': int(j['Nice'])}
def prio(x):
    age = min(1.0, x['age_s'] / W['maxage'])
    js = (x['nodes'] / NODES + x['cpus'] / CPUS) / 2           # favour large (the default)
    tres = x['gpus'] / GPUS
    # the same order of double additions as _get_priority_internal (assoc and site are 0 here), then truncation
    p = W['age'] * age
    p += 0.0
    p += W['fs'] * x['fs']
    p += W['js'] * js
    p += W['part'] * PART[x['part']]
    p += W['qos'] * QOS[x['qos']]
    p += W['gpu'] * tres
    p += 0
    p -= x['nice']
    return max(1, int(p)), {'age': W['age'] * age, 'fs': W['fs'] * x['fs'], 'js': W['js'] * js, 'part': W['part'] * PART[x['part']], 'qos': W['qos'] * QOS[x['qos']], 'tres': W['gpu'] * tres}
out = []
for k, snap in enumerate(d['snaps']):
    for jid, s in snap['sprio'].items():
        x = inputs(k, jid); p, parts = prio(x)
        out.append({'snap': snap['at'], 'job': jid, 'inputs': x, 'calc': p, 'sprio': s['prio'], 'diff': p - s['prio']})
json.dump(out, open('recompute.json', 'w'), indent=1)
bad = [o for o in out if o['diff']]
print(len(out), 'rows;', len(bad), 'differ', [(o['job'], o['snap'], o['calc'], o['sprio']) for o in bad])
