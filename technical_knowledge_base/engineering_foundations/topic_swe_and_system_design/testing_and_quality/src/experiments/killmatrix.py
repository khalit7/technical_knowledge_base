"""For every mutant mutmut generated, run both suites and record which individual tests fail (kill it)."""
import ast, difflib, json, os, re, subprocess, sys
M = 'mut/mutants'
src = open(f'{M}/src/retrypolicy.py').read()
tree = ast.parse(src)
funcs = {n.name: ast.get_source_segment(src, n) for n in tree.body if isinstance(n, ast.FunctionDef)}
orig_src = open('mut/src/retrypolicy.py').read().splitlines()
res = subprocess.run(['../.venv/bin/mutmut', 'results', '--all', 'true'], cwd='mut', capture_output=True, text=True).stdout
names = [l.split(':')[0].strip() for l in res.splitlines() if 'mutmut_' in l]
def run(mutant):
    env = dict(os.environ, MUTANT_UNDER_TEST=mutant)
    r = subprocess.run([sys.executable, '-m', 'pytest', '-p', 'no:randomly', '-p', 'no:cacheprovider', '-q', '-rf', '--tb=short',
                        'tests/test_weak.py', 'tests/test_strong.py'], cwd=M, env=env, capture_output=True, text=True)
    failed = sorted(set(re.findall(r'^FAILED (\S+)', r.stdout, re.M)))
    kinds = dict(re.findall(r'^FAILED (\S+) - (\w+)', r.stdout, re.M))
    total = re.search(r'(\d+) (passed|failed)', r.stdout)
    return failed, kinds, r.stdout.strip().splitlines()[-1]
base_failed, _, base_line = run('')
assert not base_failed, base_line
out = []
for n in names:
    fn = n.split('.')[1]                      # x_should_retry__mutmut_2
    orig = funcs[fn.split('__mutmut_')[0] + '__mutmut_orig'].splitlines()
    mut = funcs[fn].splitlines()
    mut[0] = mut[0].replace(fn, fn.split('__mutmut_')[0] + '__mutmut_orig')
    diff = [(a, b) for a, b in zip(orig, mut) if a != b]
    failed, kinds, line = run(n)
    out.append({'name': n, 'func': fn.split('__mutmut_')[0][2:], 'orig': diff[0][0].strip().replace('x_' + fn.split('__mutmut_')[0][2:] + '__mutmut_orig', fn.split('__mutmut_')[0][2:]),
                'mutant': diff[0][1].strip().replace('x_' + fn.split('__mutmut_')[0][2:] + '__mutmut_orig', fn.split('__mutmut_')[0][2:]),
                'killed_by': failed, 'kinds': kinds, 'summary': line})
    print(n, '|', out[-1]['orig'], '=>', out[-1]['mutant'], '|', len(failed), [f.split('::')[0][-10:] + '::' + f.split('::')[1] for f in failed][:3])
json.dump({'baseline': base_line, 'mutants': out}, open('killmatrix.json', 'w'), indent=1)
