"""Build inputs/excerpt.json: the small piece of Django the page transforms (the code behind
django__django-11999 at its SWE-bench base commit, 84633905), the issue text, a slice of the directory
tree, and the Level 3 run specs of the whole fields/__init__.py computed with the released code.
usage: python3 mk_excerpt.py"""
import ast, json
from schro_ref import build_run_specs

SRC = open('inputs/django_fields_init_84633905.py').read()
L = SRC.split('\n')
BASE = open('inputs/django_base_excerpt_84633905.py').read().split('\n')[1:]
inst = json.load(open('inputs/swebench_django__django-11999.json'))

fields_txt = L[84] + '\n    ...\n' + '\n'.join(L[741:786]) + '\n    ...'   # class Field header, lines 742-786
base_txt = BASE[0] + '\n    ...\n' + '\n'.join(BASE[1:5]) + '\n    ...'
tree = ['django/', 'django/db/', 'django/db/models/', 'django/db/models/__init__.py', 'django/db/models/base.py',
        'django/db/models/enums.py', 'django/db/models/manager.py', 'django/db/models/options.py', 'django/db/models/query.py',
        'django/db/models/query_utils.py', 'django/db/models/fields/', 'django/db/models/fields/__init__.py',
        'django/db/models/fields/related.py', 'django/db/models/fields/mixins.py', 'django/utils/', 'django/utils/encoding.py',
        'tests/', 'tests/model_fields/', 'tests/model_fields/models.py', 'tests/model_fields/tests.py']

t = ast.parse(SRC)
top = [n for n in t.body]
def units(body, pred):
    out, cur = [], []
    for n in body:
        if pred(n): cur.append(n)
        elif cur: out.append(cur); cur = []
    if cur: out.append(cur)
    return out
isdef = lambda n: isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef))
runs = units(t.body, isdef)
specs = build_run_specs(t.body, isdef)
field = next(n for n in t.body if isinstance(n, ast.ClassDef) and n.name == 'Field')
mruns = units(field.body, lambda n: isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)))
mspecs = build_run_specs(field.body, lambda n: isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)))
def desc(run, spec):
    return {'names': [n.name for n in run], 'lines': [n.end_lineno - min([n.lineno] + [d.lineno for d in getattr(n, 'decorator_list', [])]) + 1 for n in run],
            'start': [min([n.lineno] + [d.lineno for d in getattr(n, 'decorator_list', [])]) for n in run],
            'bases': [[ast.unparse(b) for b in getattr(n, 'bases', [])] for n in run], 'deps': spec['deps']}
big = max(range(len(runs)), key=lambda i: len(runs[i]))
mi = next(i for i, r in enumerate(mruns) if any(n.name == 'contribute_to_class' for n in r))
out = {'_doc': 'Excerpt of Django at 84633905 (BSD-3-Clause) used by the page; run specs from schro_ref.build_run_specs (a copy of the released intra_file_reorder._build_run_specs).',
       'commit': '84633905273fc916e3d17883810d9969c03f73c2', 'instance': inst['instance_id'], 'issue': inst['problem_statement'].strip(),
       'issue_created': inst['created_at'], 'gold_patch': inst['patch'], 'f2p': inst['FAIL_TO_PASS'],
       'files': [{'path': 'django/db/models/fields/__init__.py', 'text': fields_txt, 'from': 'lines 85 and 742-786'},
                 {'path': 'django/db/models/base.py', 'text': base_txt, 'from': 'lines 403 and 941-944'}],
       'tree': tree,
       'top_runs': [len(r) for r in runs], 'top_run': desc(runs[big], specs[big]), 'top_run_index': big,
       'field_runs': [len(r) for r in mruns], 'field_run': desc(mruns[mi], mspecs[mi]), 'field_run_index': mi,
       'file_lines': len(L) - 1}
json.dump(out, open('inputs/excerpt.json', 'w'), indent=1)
print('top runs', out['top_runs'], 'big', big, len(runs[big]), 'field runs', out['field_runs'], 'mi', mi, len(mruns[mi]))
print('deps', [(n, d) for n, d in zip(out['top_run']['names'], out['top_run']['deps']) if d])
print('field deps', [(n, d) for n, d in zip(out['field_run']['names'], out['field_run']['deps']) if d])
