"""Check that the page's JavaScript stream replay (parts/20_js_stream.js) matches stream_sim.py exactly:
same orderings, same coin flips, same retrievals and the same statistics, for several seeds and p.
usage: python3 check_sim.py   (needs node)"""
import json, subprocess, os
HERE = os.path.dirname(os.path.abspath(__file__)); os.chdir(HERE)
import stream_sim as S
G = S.G
import re, tempfile
js = re.search(r'^function mulberry32.*$', open('parts/10_js_common.js').read(), re.M).group(0) + '\n' + open('parts/20_js_stream.js').read()
TMP = os.environ.get('SCRATCH', tempfile.gettempdir())
cases = [(1, 0.774), (7, 0.774), (23, 0.6), (50, 1.0), (99, 0.45)]
prog = js + '\nconst G=' + json.dumps([g['goal'] for g in G]) + ',TY=' + json.dumps([g['type'] for g in G]) + ';\nconst out=' + json.dumps(cases) + '.map(([s,p])=>{const r=JS_STREAM.run(G,s,p);const st=JS_STREAM.stats(TY,r);delete st.first;delete st.uses;return {order:r.order,ok:r.ok,ret:r.ret,st}});\nconsole.log(JSON.stringify(out));'
open(TMP + '/_jitm_check.js', 'w').write(prog)
res = json.loads(subprocess.run(['node', TMP + '/_jitm_check.js'], capture_output=True, text=True, check=True).stdout)
bad = 0; maxd = 0
for (seed, p), j in zip(cases, res):
    o, ok, ret = S.run(seed, p); st = S.stats(o, ok, ret)
    if o != j['order'] or [bool(x) for x in ok] != j['ok'] or ret != j['ret']: bad += 1; print('MISMATCH run', seed, p)
    for k, v in st.items():
        d = abs(v - j['st'][k]); maxd = max(maxd, d)
        if d > 1e-9: bad += 1; print('MISMATCH stat', seed, p, k, v, j['st'][k])
r = {'cases': cases, 'identical_runs': len(cases) - bad if bad == 0 else None, 'max_stat_diff': maxd, 'ok': bad == 0}
json.dump(r, open('inputs/check_sim.json', 'w'), indent=1)
print('JS against Python:', 'identical' if bad == 0 else '%d mismatches' % bad, 'on', len(cases), 'runs; max stat difference', maxd)
