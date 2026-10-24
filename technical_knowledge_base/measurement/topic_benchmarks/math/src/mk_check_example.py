"""Real data for the Reading tab's "one answer, three checkers" stepper: HMMT February 2026, problem 7.
usage: uv run --with pyarrow --with sympy python3 mk_check_example.py <cache dir>
Reads hmmt_feb_2026_outputs.parquet from the cache dir (the same MathArena dataset mk_data.py downloads; CC BY-NC-SA 4.0)
and writes inputs/hmmt26_p7_checks.json (and its page copy parts/22_js_ckdata.js, window.CKD): every parsed answer to problem 7 with MathArena's grade, three real answer
endings, the count of HMMT February 2026 keys that are not plain integers, and a sympy check of the equivalence."""
import sys, os, re, json, collections
import pyarrow.parquet as pq
C = sys.argv[1] if len(sys.argv) > 1 else 'cache'
T = pq.read_table(os.path.join(C, 'hmmt_feb_2026_outputs.parquet'),
                  columns=['problem_idx', 'model_name', 'idx_answer', 'gold_answer', 'parsed_answer', 'correct', 'answer']).to_pylist()
gold = {int(r['problem_idx']): str(r['gold_answer']) for r in T}
P7 = [r for r in T if int(r['problem_idx']) == 7]
cnt = collections.Counter((str(r['parsed_answer']), bool(r['correct'])) for r in P7)

def ending(model, run):
    r = next(r for r in P7 if r['model_name'] == model and int(r['idx_answer']) == run)
    a = str(r['answer']); i = a.rfind('\\boxed')
    j = a.find('\n', i)
    return {'model': model, 'run': run, 'boxed': a[i:j if j > 0 else None].strip(), 'parsed': str(r['parsed_answer']), 'correct': bool(r['correct'])}

def boxed(a):
    i = a.rfind('\\boxed{')
    if i < 0: return None
    i += 7; d = 1; j = i
    while j < len(a) and d:
        d += {'{': 1, '}': -1}.get(a[j], 0); j += 1
    return a[i:j - 1]
def light(x):  # whitespace, \left/\right, \dfrac, \sqrt6 -> \sqrt{6}: the kind of string normalisation MATH-style checkers do
    x = re.sub(r'\s+', '', x).replace('\\left', '').replace('\\right', '').replace('\\dfrac', '\\frac')
    return re.sub(r'\\sqrt(\d)', r'\\sqrt{\1}', x)
g7 = gold[7]
right7 = [r for r in P7 if r['correct']]
out = {
    'source': 'MathArena/hmmt_feb_2026_outputs on Hugging Face (CC BY-NC-SA 4.0), downloaded 2026-10-24',
    'problems': len(gold), 'answers': len(T),
    'non_integer_keys': sorted(p for p, g in gold.items() if not re.fullmatch(r'-?\d+', g)),
    'p7_gold': gold[7], 'p7_answers': len(P7), 'p7_right': sum(1 for r in P7 if r['correct']),
    'p7_by_parse': [{'parsed': a, 'correct': ok, 'n': n} for (a, ok), n in cnt.most_common()],
    'p7_right_boxed_identical_to_key': sum(1 for r in right7 if (boxed(str(r['answer'])) or '').replace(' ', '') == g7.replace(' ', '')),
    'p7_right_boxed_equal_after_light_normalisation': sum(1 for r in right7 if light(boxed(str(r['answer'])) or '') == light(g7)),
    'endings': [ending('Kimi K3 (Think)', 0), ending('Kimi K3 (Think)', 1), ending('GPT-5.2 (high)', 2)],
}
try:
    import sympy as sp
    s6 = sp.sqrt(6)
    key = (3 + s6) ** sp.Rational(-1, 3)
    out['sympy'] = {
        'key_value': float(key),
        '(1 - sqrt(6)/3)**(1/3) equals key': bool(sp.simplify((1 - s6 / 3) ** sp.Rational(1, 3) - key) == 0 or abs(float((1 - s6 / 3) ** sp.Rational(1, 3) - key)) < 1e-12),
        '1/(3+sqrt6) = (3-sqrt6)/3': bool(sp.simplify(1 / (3 + s6) - (3 - s6) / 3) == 0),
        'value of 1/3': 1 / 3,
    }
except ImportError:
    pass
json.dump(out, open('inputs/hmmt26_p7_checks.json', 'w'), indent=1, ensure_ascii=False)
js = ('// HMMT February 2026 problem 7: parsed answers and grades from MathArena (CC BY-NC-SA 4.0), written by src/mk_check_example.py; do not edit.\n'
      'window.CKD=' + json.dumps({k: out[k] for k in ('problems', 'non_integer_keys', 'p7_gold', 'p7_answers', 'p7_right', 'p7_by_parse',
      'p7_right_boxed_identical_to_key', 'p7_right_boxed_equal_after_light_normalisation', 'endings')}, ensure_ascii=False, separators=(',', ':')) + ';\n')
open('parts/22_js_ckdata.js', 'w').write(js)
print(json.dumps({k: v for k, v in out.items() if k not in ('p7_by_parse',)}, ensure_ascii=False, indent=1)[:3000])
