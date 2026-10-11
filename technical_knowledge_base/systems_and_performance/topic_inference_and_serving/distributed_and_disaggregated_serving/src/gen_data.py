"""Write parts/20_js_dd_data.js: the page's data, exactly as the scripts recorded it.
window.DDC  out/calc.json            (recompute.py: planner numbers)
window.DDP  pd/out/pd_grid.json      (pd/pd_sim.py: disaggregation grid), compacted to arrays
window.DDE  ep/out/balance.json      (ep/balance.py) plus the JS-port check result (ep/out/port_check.json)
window.DDM  exp/out/measured.json    (exp/summarise.py: runs on the M1 Pro and in vLLM's CPU image)
Run: python3 -I gen_data.py
"""
import json, os
H = os.path.dirname(os.path.abspath(__file__))
J = lambda *p: json.load(open(os.path.join(H, *p)))
r = lambda x: float('%.5g' % x)
parts = ['// ---- Data for every tab, written by src/gen_data.py from the scripts\' outputs; do not edit by hand ----']
C = J('out', 'calc.json')
parts.append('window.DDC=' + json.dumps(C, separators=(',', ':')) + ';')
G = J('pd', 'out', 'pd_grid.json')
wl = {}
for k, w in G['workloads'].items():
    res = {}
    for key, rows in w['res'].items():
        res[key] = [[x for a in q['att'] for x in a] + [q['ttft'][0], q['ttft'][1], q['tpot'][0], q['tpot'][1], q['tps']] for q in rows]
    wl[k] = dict(name=w['name'], rates=w['rates'], res=res)
DP = dict(gpus=G['gpus'], n=G['n'], ttfts=G['ttfts'], tpots=G['tpots'], xbws=G['xbws'], wbytes=r(G['wbytes']), nblocks=G['eng']['nblocks'],
          kvtok=G['kvtok'], model=G['model'], hw=G['hw'], workloads=wl)
parts.append('window.DDP=' + json.dumps(DP, separators=(',', ':')) + ';')
bp = os.path.join(H, 'ep', 'out', 'balance.json')
if os.path.exists(bp):
    B = json.load(open(bp))
    pc = os.path.join(H, 'ep', 'out', 'port_check.json')
    B['port_check'] = json.load(open(pc))['say'] if os.path.exists(pc) else 'port check not run'
    B.pop('plans', None)
    B['worst_layer'] = max(range(B['L']), key=lambda l: B['top_share'][l])
    parts.append('window.DDE=' + json.dumps(B, separators=(',', ':')) + ';')
mp = os.path.join(H, 'exp', 'out', 'measured.json')
if os.path.exists(mp):
    parts.append('window.DDM=' + json.dumps(json.load(open(mp)), separators=(',', ':')) + ';')
s = '\n'.join(parts) + '\n'
open(os.path.join(H, 'parts', '20_js_dd_data.js'), 'w').write(s)
print(len(s), 'bytes')
