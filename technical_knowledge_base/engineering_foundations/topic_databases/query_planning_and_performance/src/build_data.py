"""Write parts/22_js_data.js (window.QPD) from the measured inputs/*.json. Run: python3 build_data.py"""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); I = lambda f: json.load(open(os.path.join(H, 'inputs', f)))
cm, st, en, ge, wl, ap, lp = I('cost_model.json'), I('stats.json'), I('engine.json'), I('generic.json'), I('workload.json'), I('app.json'), I('lab_plans.json')
d = {}
d['cm'] = {'settings': {k: float(v) for k, v in cm['settings'].items()}, 'presets': {}}
for k, p in cm['presets'].items():
    q = {x: p[x] for x in ['table', 'index', 'col', 'a', 'relpages', 'reltuples', 'idxpages', 'idxtuples', 'fastlevel', 'null_frac', 'n_distinct', 'correlation', 'hist']}
    q['rows'] = [{'n': r['n'], 'chosen': r['chosen'], 'seq': r['seq']['total'], 'index': r['index']['total'], 'bitmap': r['bitmap']['total'], 'est': r['seq']['rows'],
                  'ms': {m: r['ms'][m]['ms'] for m in r['ms']} if 'ms' in r else None, 'pages': {m: r['ms'][m]['pages'] for m in r['ms']} if 'ms' in r else None} for r in p['rows']]
    d['cm']['presets'][k] = q
ps = st['pg_stats']
def arr(s): return [x.strip('"') for x in s.strip('{}').split(',')] if s else None
d['stats'] = {
  'country': {'mcv': arr(ps['users.country']['mcv']), 'mcf': [float(x) for x in arr(ps['users.country']['mcf'])], 'n_distinct': ps['users.country']['n_distinct'], 'corr': ps['users.country']['correlation'],
              'actual': json.loads(st['actual']['users.country'])},
  'plan': {'mcv': arr(ps['users.plan']['mcv']), 'mcf': [float(x) for x in arr(ps['users.plan']['mcf'])], 'actual': json.loads(st['actual']['users.plan'])},
  'tokens_hist': [int(x) for x in arr(ps['messages.tokens']['hist'])], 'tokens_mcv_n': len(arr(ps['messages.tokens']['mcv'])), 'tokens_nd': ps['messages.tokens']['n_distinct'],
  'corr': {k: ps[k]['correlation'] for k in ['messages.created_at', 'users.id', 'chats.user_id', 'messages.chat_id']},
  'nd': {'chats.user_id': [ps['chats.user_id']['n_distinct'], st['actual']['chats.user_id_distinct']], 'messages.chat_id': [ps['messages.chat_id']['n_distinct'], st['actual']['messages.chat_id_distinct']]},
  'target': st['target'], 'stale': {k: st['stale'][k] for k in ['before_load', 'after_load', 'after_analyze']},
  'stale_plans': [st['stale']['after_load_plan'], st['stale']['after_analyze_plan']],
  'ext': {k: v for k, v in st['ext'].items() if k != 'dep_values'}, 'ext_values': st['ext']['dep_values']}
d['spill'] = {k: en['spill'][k]['rows'] for k in ['sort', 'hashjoin', 'hashagg']}
d['spill_sql'] = {k: en['spill'][k]['sql'] for k in ['sort', 'hashjoin', 'hashagg']}
d['spill_text'] = {k: [en['spill'][k]['text_small'], en['spill'][k]['text_big']] for k in ['sort', 'hashjoin', 'hashagg']}
d['parallel'] = en['parallel']['rows']; d['parallel_sql'] = en['parallel']['sql']; d['parallel_settings'] = json.loads(en['parallel']['settings'])
d['timing'] = {k: en['timing'][k] for k in ['sql', 'plain_ms', 'analyze_timing_on_ms', 'analyze_timing_off_ms', 'sql2', 'plain2_ms', 'on2_ms']}
import re
d['timing']['clock_ns'] = float(re.search(r'Per loop time including overhead: ([0-9.]+) ns', en['timing']['pg_test_timing']).group(1))
d['geqo'] = en['geqo']['rows']; d['geqo_seeds'] = en['geqo']['seeds']
d['generic'] = {'sql': ge['sql'], 'hint_sql': ge['hint_sql'], 'rows_org1': ge['rows_org1'], 'rows_small': ge['rows_org77'], 'stats': ge['stats'],
  'seq': [77, 1234, 5555, 9001, 15000, 1, 1, 42]}
for k in ['auto', 'force_custom', 'hint']:
    d['generic'][k] = [{'ms': r['ms'], 'runs': r['ms_runs'], 'generic': r['generic'], 'cost': r['cost'], 'top': [n.strip() for n in r['nodes'][:6]]} for r in ge[k]]
d['generic']['text'] = {'generic': ge['generic_text'], 'custom': ge['custom_text'], 'custom_small': ge['custom_small_text']}
def topq(rows): return [{k: r[k] for k in ['query', 'calls', 'total_ms', 'mean_ms', 'max_ms', 'rows', 'hit', 'read', 'pct']} for r in rows]
d['workload'] = {'weights': wl['weights'], 'scripts': wl['scripts'], 'before': {'tps': wl['before']['tps'], 'lat': wl['before']['latency_avg_ms'], 'wall': wl['before']['wall_s'], 'top': topq(wl['before']['top'])},
  'after': {'tps': wl['after']['tps'], 'lat': wl['after']['latency_avg_ms'], 'wall': wl['after']['wall_s'], 'top': topq(wl['after']['top'])},
  'explain_before': wl['explain_before'], 'explain_after': wl['explain_after'], 'index_s': wl['index_build_s'], 'index_bytes': wl['index_bytes'],
  'log_duration': wl['log_sample']['duration'], 'log_plan': wl['log_sample']['auto_explain'], 'n_logged': wl['log_sample']['n_logged']}
d['app'] = ap
d['lab'] = {k: v for k, v in lp.items()}
d['lab']['limit_trap'] = {'sql': "SELECT id, title FROM chats WHERE title LIKE 'Chat 123456%' ORDER BY id LIMIT 10", 'text': wl['explain_before']}
d['lab']['generic'] = {'sql': ge['sql'].replace('$1', '$1  -- executed with $1 = 1, the enterprise organisation'), 'text': ge['generic_text']}
d['lab']['spill'] = {'sql': en['spill']['sort']['sql'], 'text': en['spill']['sort']['text_small']}
d['meta'] = {'version': cm['version'].split(' on ')[0], 'date': '2026-10-04'}
js = 'window.QPD=' + json.dumps(d, separators=(',', ':')) + ';\n'
js = js.replace('—', '-')
open(os.path.join(H, 'parts', '22_js_data.js'), 'w').write(js)
print(len(js), 'bytes')
