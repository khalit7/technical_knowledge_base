"""Build parts/30_js_data.js (window.TQ) from the measured outputs in inputs/ and the code in experiments/.
Run: python3 gen_data.py   (stdlib only; the measurements themselves are made by the scripts in experiments/, see README.md)"""
import ast, json, re, os
H = os.path.dirname(os.path.abspath(__file__)); I = os.path.join(H, 'inputs'); E = os.path.join(H, 'experiments')
J = lambda f: json.load(open(os.path.join(I, f)))
T = lambda f: open(os.path.join(I, f), encoding='utf-8', errors='replace').read()

env = {'date': '2026-10-04', 'python': '3.12.11', 'pytest': '9.1.1', 'hypothesis': '6.168.3', 'mutmut': '3.8.0',
       'coverage': '7.16.2', 'pandera': '0.33.1', 'pandas': '3.0.6', 'numpy': '2.5.3', 'pydantic': '2.13.5', 'httpx': '0.28.1',
       'pgserver': '0.1.4', 'postgres': J('timing.json')['postgres'], 'psycopg': '3.3.6', 'pytest_asyncio': '1.4.0',
       'syrupy': '6.1.1', 'vcrpy': '8.3.0', 'pytest_recording': '0.14.0', 'pytest_randomly': '5.0.0', 'pytest_repeat': '0.9.4',
       'machine': 'Apple M1 Pro laptop, macOS'}

# ---- property-based run: the full log for seed 6, and the 20-seed summary
tr = J('trace_6.json')
def esc_text(s):
    return s.encode('unicode_escape').decode('ascii') if any(ord(c) > 126 or ord(c) < 32 for c in s) else s
hyp_log = [{'t': e['text'], 'tv': esc_text(e['text']), 'n': len(e['text']), 's': e['size'], 'o': e['overlap'],
            'g': e['got'], 'f': e['fail']} for e in tr['log']]
seeds = J('trace_seeds.json')
fx = J('trace_6_fixed.json')
hyp_fixed = [{'t': e['text'], 'tv': esc_text(e['text']), 'n': len(e['text']), 's': e['size'], 'o': e['overlap'], 'g': e['got'], 'f': e['fail']} for e in fx['log']]
hyp = {'seed': tr['seed'], 'log': hyp_log, 'fixed': hyp_fixed,
       'seeds': [{'seed': o['seed'], 'tries': o['tries_before_fail'] + 1, 'calls': o['total_calls'],
                  'final': [esc_text(o['final']['text']), o['final']['size'], o['final']['overlap']]} for o in seeds if o['found']],
       'nseeds': len(seeds)}

# ---- mutation testing: mutants, which test functions kill them, failure kind; per-test coverage
km = J('killmatrix.json'); cov = J('coverage_per_test.json')
def tfunc(tid):  # tests/test_strong.py::test_parse_retry_after[-3-0.0] -> test_strong.test_parse_retry_after
    f, n = tid.split('::'); return os.path.basename(f)[:-3] + '.' + n.split('[')[0]
muts = []
for m in km['mutants']:
    by = sorted({tfunc(t) for t in m['killed_by']})
    kinds = set(v[:4] for v in m['kinds'].values())
    muts.append({'id': m['name'].split('x_')[1].replace('__mutmut_', ' #'), 'fn': m['func'], 'orig': m['orig'], 'mut': m['mutant'],
                 'by': by, 'cases': len(m['killed_by']), 'kind': 'crash' if kinds == {'Type'} else ('mixed' if 'Type' in kinds else 'value')})
src = open(os.path.join(E, 'mut/src/retrypolicy.py')).read()
tests = []
for fn in ['test_weak.py', 'test_strong.py']:
    s = open(os.path.join(E, 'mut/tests', fn)).read(); tree = ast.parse(s)
    for node in tree.body:
        if isinstance(node, ast.FunctionDef):
            seg = ast.get_source_segment(s, node)
            deco = [ast.get_source_segment(s, d) for d in node.decorator_list]
            ncases = 1
            for d in node.decorator_list:
                if isinstance(d, ast.Call) and getattr(d.func, 'attr', '') == 'parametrize':
                    ncases = len(d.args[1].elts)
            key = fn[:-3] + '.' + node.name
            tests.append({'id': key, 'suite': 'weak' if 'weak' in fn else 'strong', 'name': node.name,
                          'code': '\n'.join('@' + x for x in deco) + ('\n' if deco else '') + seg,
                          'lines': cov['per_test'].get(key, []), 'cases': ncases})
mut = {'src': src.splitlines(), 'stmts': cov['statements'], 'import_lines': [3, 6, 13, 18], 'mutants': muts, 'tests': tests,
       'cov_weak': T('cov_weak.txt').strip(), 'rate_weak': re.search(r'([\d.]+) mutations/second', T('run_weak_tail.log')).group(1)}

# ---- flaky
fl = J('flaky_seq.json')
batches = [int(x.split()[0]) for x in T('random_batches.txt').strip().splitlines()]
batches = batches + [fl['fails']]    # five --count=2000 batches, then the run recorded run by run in flaky_seq.json
orr = dict(re.findall(r'(test_\w+)\.py: (\d+) of 200', T('order_results.txt')))
flaky = {'seq': fl['seq'], 'runs': fl['runs'], 'fails': fl['fails'], 'flips': fl['flips'], 'batches': batches,
         'order_flaky': int(orr['test_flaky_order']), 'order_fixed': int(orr['test_fixed_order']), 'order_runs': 200}

# ---- integration: SQLite stand-in against real PostgreSQL
tm = J('timing.json')
starts = [round(json.loads(l)['pg_start_s'], 3) for l in T('pg_start_runs.txt').strip().splitlines()]
integ = {'sqlite_ms': tm['sqlite_conn']['median_ms'], 'pg_ms': tm['pg_conn']['median_ms'], 'n': tm['pg_conn']['n'],
         'pg_start_warm_s': starts, 'pg_start_cold_s': 1.796}

data = {'env': env, 'hyp': hyp, 'mut': mut, 'flaky': flaky, 'integ': integ, 'float': J('float_out.json'), 'smoke': J('smoke_out.json')}
out = '// generated by src/gen_data.py from src/inputs/ (do not edit by hand)\nwindow.TQ=' + json.dumps(data, ensure_ascii=True, separators=(',', ':')) + ';\n'
open(os.path.join(H, 'parts/30_js_data.js'), 'w').write(out)
print('30_js_data.js', len(out), 'bytes;', len(muts), 'mutants,', len(tests), 'test functions,', len(hyp_log), 'hypothesis calls')
