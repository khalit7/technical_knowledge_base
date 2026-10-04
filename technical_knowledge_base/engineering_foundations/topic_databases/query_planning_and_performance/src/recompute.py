"""Recompute every derived number on the page from inputs/*.json and check it against the built index.html,
and check the page's JavaScript cost model against PostgreSQL's own EXPLAIN figures and against costfm.py.
Run: python3 recompute.py (needs node for the JavaScript check)."""
import json, os, re, subprocess, sys, random, html
H = os.path.dirname(os.path.abspath(__file__)); sys.path.insert(0, H)
from costfm import selectivity, costs
I = lambda f: json.load(open(os.path.join(H, 'inputs', f)))
cm, st, en, ge, wl, ap, lp = I('cost_model.json'), I('stats.json'), I('engine.json'), I('generic.json'), I('workload.json'), I('app.json'), I('lab_plans.json')
page = html.unescape(re.sub(r'<[^>]+>', ' ', open(os.path.join(H, '..', 'index.html')).read()))
page = re.sub(r'\s+', ' ', page)
fails = 0
def show(label, value, text=None):
    global fails
    found = text is None or text in page
    if not found: fails += 1
    print(('ok   ' if found else 'MISS ') + label + ': ' + str(value) + ('' if text is None else '  [page: "' + text + '"]'))
# 1. cost formulas, Python, against EXPLAIN
c = {k: float(v) for k, v in cm['settings'].items()}; ok = n = 0
for d in cm['presets'].values():
    for r in d['rows']:
        m = costs(d, selectivity(d, d['a'], d['a'] + r['n'] - 1), c)
        for g, w in [(m['rows'], r['seq']['rows']), (m['seq']['total'], r['seq']['total']), (m['index']['total'], r['index']['total']), (m['index']['startup'], r['index']['startup']),
                     (m['bitmap']['total'], r['bitmap']['total']), (m['bitmap']['inner_total'], r['bitmap']['inner']['total'])]:
            n += 1; ok += abs(g - w) <= 0.006 + 1e-9 * w
show('costfm.py against EXPLAIN', f'{ok} of {n}', '150 of 150' if ok == n == 150 else 'IMPOSSIBLE')
if ok != n: fails += 1
# 2. the page's JavaScript against EXPLAIN and against costfm.py at random settings
rnd = random.Random(1); cases = []
for k, d in cm['presets'].items():
    for _ in range(100):
        nn = max(1, int(10 ** rnd.uniform(0, 6.9 if k == 'messages' else 4.9)))
        s = dict(c, random_page_cost=round(rnd.uniform(1, 10), 1), seq_page_cost=round(rnd.uniform(0.1, 2), 1), cpu_tuple_cost=rnd.choice([0.001, 0.005, 0.01, 0.05]),
                 cpu_operator_cost=rnd.choice([0.0005, 0.0025, 0.01]), effective_cache_size=rnd.choice([16384, 131072, 524288, 2097152]), work_mem=rnd.choice([64, 1024, 4096, 65536]))
        corr = round(rnd.uniform(-1, 1), 2); m = costs(d, selectivity(d, d['a'], d['a'] + nn - 1), s, corr)
        cases.append({'k': k, 'n': nn, 's': s, 'corr': corr, 'want': [m['rows'], m['seq']['total'], m['index']['total'], m['bitmap']['total']]})
js = open(os.path.join(H, 'parts', '30_js_cm_model.js')).read()
node = js + '\nconst CM=' + json.dumps(cm) + ';const C=' + json.dumps(cases) + ''';
let e=0,x=0;for(const d of Object.values(CM.presets)){const s={};for(const k in CM.settings)s[k]=+CM.settings[k];
 for(const r of d.rows){const m=QPCM.costs(d,QPCM.selectivity(d,d.a,d.a+r.n-1),s);[[m.rows,r.seq.rows],[m.seq.total,r.seq.total],[m.index.total,r.index.total],[m.bitmap.total,r.bitmap.total],[m.index.startup,r.index.startup],[m.bitmap.innerTotal,r.bitmap.inner.total]].forEach(([g,w])=>{x++;if(Math.abs(g-w)<=0.006+1e-9*w)e++})}}
let a=0;for(const t of C){const d=CM.presets[t.k];const m=QPCM.costs(d,QPCM.selectivity(d,d.a,d.a+t.n-1),t.s,t.corr);const g=[m.rows,m.seq.total,m.index.total,m.bitmap.total];if(g.every((v,i)=>Math.abs(v-t.want[i])<=1e-6*Math.max(1,t.want[i])))a++}
console.log(JSON.stringify({e,x,a,n:C.length}))'''
try:
    out = json.loads(subprocess.run(['node', '-e', node], capture_output=True, text=True, check=True).stdout)
    show('page JavaScript against EXPLAIN', f"{out['e']} of {out['x']}"); show('page JavaScript against costfm.py, random settings', f"{out['a']} of {out['n']}")
    if out['e'] != out['x'] or out['a'] != out['n']: fails += 1
except Exception as ex:
    fails += 1; print('MISS node check failed', ex)
f = lambda x, d=0: f'{x:,.{d}f}'
# 3. numbers quoted in the prose
u = {p['n']: p for p in cm['presets']['users']['rows']}; mm = {p['n']: p for p in cm['presets']['messages']['rows']}
show('seq scan by hand', '1,280 + 1,500', '1,280 + 1,500 = 2,780')
show('users 20,000: costs', (u[20000]['seq']['total'], u[20000]['index']['total'], u[20000]['bitmap']['total']), '5,733')
show('users 20,000: bitmap pages', u[20000]['ms']['bitmap']['pages'], f(u[20000]['ms']['bitmap']['pages']))
show('messages 1M: index ms', u and mm[1000000]['ms']['index']['ms'], '137 ms')
show('messages 1M: seq ms', mm[1000000]['ms']['seq']['ms'], '659 ms')
nd = st['actual']['chats.user_id_distinct']; show('chats.user_id distinct, true', nd, f(nd))
show('chats.user_id n_distinct stored', st['pg_stats']['chats.user_id']['n_distinct'], f(st['pg_stats']['chats.user_id']['n_distinct']))
gb = st['pg_stats']['users.country']; i = gb['mcv'].strip('{}').split(',').index('GB'); fr = float(gb['mcf'].strip('{}').split(',')[i])
show('GB estimate = freq x 100,000', round(fr * 1e5), f(round(fr * 1e5)))
x = st['ext']['none']['and']; show('London estimate and truth', (x['est'], x['act']), f'estimated {x["est"]}, really {f(x["act"])}')
show('GEQO planning at 16 tables', (en['geqo']['rows'][-1]['dp']['plan_ms'], en['geqo']['rows'][-1]['geqo']['plan_ms']), '1,645 ms')
t = en['timing']; ov = 100 * (t['analyze_timing_on_ms'] / t['plain_ms'] - 1); show('timing overhead %', round(ov), f'{round(ov)}%')
b = wl['before']; a = wl['after']; srch = [r for r in b['top'] if 'title LIKE' in r['query']][0]
show('search share of DB time', srch['pct'], f"{srch['pct']}%"); show('throughput before', round(b['tps']), f(b['tps'])); show('throughput after', round(a['tps']), f(a['tps']))
ex_b = float(re.search(r'Execution Time: ([0-9.]+)', wl['explain_before']).group(1)); ex_a = float(re.search(r'Execution Time: ([0-9.]+)', wl['explain_after']).group(1))
show('search speedup in EXPLAIN', round(ex_b / ex_a), 'about 1,170 times')
show('index size MB', round(wl['index_bytes'] / 1e6, 1), f"{wl['index_bytes'] / 1e6:.1f} MB")
n1 = ap['nplus1']; show('N+1 ratio', round(n1['nplus1']['median_ms'] / n1['joined']['median_ms'], 1), f"{n1['nplus1']['median_ms'] / n1['joined']['median_ms']:.1f} times")
bt = ap['batch']['ms']; show('COPY against row by row', round(bt['autocommit_each'] / bt['copy']), f"{round(bt['autocommit_each'] / bt['copy'])} times")
sp = en['spill']; r4 = {k: [r for r in sp[k]['rows'] if r['work_mem'] == '4MB'][0]['ms'] / min(r['ms'] for r in sp[k]['rows']) for k in ['sort', 'hashjoin', 'hashagg']}
show('spill penalty at 4MB (sort, hash join, hash agg)', {k: round(v, 2) for k, v in r4.items()}, '1.1 to 1.7 times')
pr = en['parallel']['rows']; bp = min(pr, key=lambda r: r['ms']); show('parallel speedup', round(pr[0]['ms'] / bp['ms'], 1), f"{pr[0]['ms'] / bp['ms']:.1f} times")
au = ge['auto']; show('generic: custom then generic for the enterprise', (au[5]['ms'], au[6]['ms']), f(au[6]['ms']))
show('generic slowdown', round(au[6]['ms'] / au[5]['ms'], 1), f"{au[6]['ms'] / au[5]['ms']:.1f} times")
avg = (5 * au[0]['cost'] + au[5]['cost']) / 6; show('average custom cost after call 6', round(avg), f(avg))
show('generic estimate off by', round(ge['rows_org1'] / 290), f(ge['rows_org1'] / 290))
fc = ge['force_custom']; hi = ge['hint']; ratio = (sum(r['ms'] for r in hi[:5]) / 5) / (sum(r['ms'] for r in fc[:5]) / 5)
show('pinned plan slowdown for small organisations', round(ratio), 'about 180 times')
cb = lp['corr_before']['text']; show('lab join estimate', '1580 / 22364', 'rows=1580' if 'rows=1580' in cb else 'IMPOSSIBLE')
show('lab lossy pages', 'exact=873 lossy=37598', None if 'lossy=37598' in lp['lossy']['text'] else 'IMPOSSIBLE')
print('\nall checks passed' if not fails else f'\n{fails} check(s) failed')
sys.exit(1 if fails else 0)
