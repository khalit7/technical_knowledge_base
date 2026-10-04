"""Run every harness's own GSM8K answer-extraction code on this page's real model outputs.

Usage (in the venv that ran the harnesses, with lighteval installed --no-deps plus sympy and latex2sympy2_extended):
  python compute_extract.py <runs dir> data/extract.json
Reads the lm-eval samples file and the Inspect JSON log, and for each of the 20 outputs (10 items x 2 harnesses)
applies, with the harnesses' own code where it is importable and a verbatim copy where it is not:
  lmeval_strict, lmeval_flex  lm-eval RegexFilter + take_first + exact_match (regexes_to_ignore), task gsm8k v3.0
  inspect                     inspect_ai.scorer._common.match_str(location="end", numeric=True)
  lighteval                   lighteval math_scorer() extraction (expressions, then LaTeX, first match)
  helm                        HELM final_number_exact_match (verbatim copy from inputs/helm_final_number.py)
  simple_evals                simple-evals MGSM parse_answer("Answer") + score_mgsm (verbatim copy)
  openai_evals                openai/evals Match: sampled.startswith(ideal)
"""
import json, glob, os, re, sys
RUNS, OUT = sys.argv[1], sys.argv[2]
HERE = os.path.dirname(os.path.abspath(__file__))
INP = os.path.join(HERE, 'inputs')

# ---- lm-eval: its own filter and metric code
from lm_eval.filters.extraction import RegexFilter
from lm_eval.filters.selection import TakeFirstFilter
from lm_eval.api.metrics import exact_match_hf_evaluate
STRICT = RegexFilter(regex_pattern=r"#### (\-?[0-9\.\,]+)")
FLEX = RegexFilter(regex_pattern=r"(-?[$0-9.,]{2,})|(-?[0-9]+)", group_select=-1)
IGN = [",", "\\$", "(?s).*#### ", "\\.$"]
def lm_score(filt, text, full_target):
    out = TakeFirstFilter().apply(filt.apply([[text]], [None]), [None])
    pred = list(out)[0]
    em = exact_match_hf_evaluate(predictions=[pred], references=[full_target], regexes_to_ignore=IGN,
                                 ignore_case=True, ignore_punctuation=False)['exact_match']
    return pred, float(em)

# ---- Inspect: its own match_str
from inspect_ai.scorer._common import match_str
def inspect_score(text, target):
    ans, ok = match_str(value=text, target=target, location='end', ignore_case=True, numeric=True)
    return ans, float(ok)

# ---- lighteval: its own extraction, as in math_scorer()
from lighteval.metrics.utils.extractive_match_utils import (ExprExtractionConfig, LatexExtractionConfig,
    get_extraction_regexes_inspect, extract_target_from_pred)
from lighteval.utils.language import Language
GOLD_RE = get_extraction_regexes_inspect((ExprExtractionConfig(),), Language.ENGLISH, len_choices=1)
PRED_RE = get_extraction_regexes_inspect((ExprExtractionConfig(), LatexExtractionConfig(boxed_match_priority=0)), Language.ENGLISH, len_choices=1)
def lighteval_score(text, target):
    p = extract_target_from_pred(text, PRED_RE, 'first_match', 'first_match', 5)
    g = extract_target_from_pred(target, GOLD_RE, 'first_match', 'first_match', 5)
    return str(p), float(p == g)

# ---- HELM and simple-evals: verbatim copies of the saved extracts
ns = {'re': re}
exec(open(os.path.join(INP, 'helm_exact_match.py')).read(), ns)
exec(open(os.path.join(INP, 'helm_final_number.py')).read(), ns)
def helm_score(text, full_answer):
    gold = full_answer.replace('####', 'The answer is').replace('\n', ' ') + '.'   # gsm_scenario.py line 61
    m = re.findall(r"-?[\d,]+(?:.\d+)?", text)
    pred = m[-1].replace(',', '') if m else ''
    return pred, float(ns['final_number_exact_match'](gold, text))
src = open(os.path.join(INP, 'simple_evals_mgsm.py')).read()
src = src[src.index('def parse_answer'):]
ns2 = {'re': re}
exec(src, ns2)
def simple_score(text, target):
    pred = ns2['parse_answer'](text, 'Answer')
    return pred, float(ns2['score_mgsm'](target, pred))
def oai_score(text, target):
    return text[:len(target) + 12], float(text.startswith(target))

# ---- load the real outputs
lm = glob.glob(os.path.join(RUNS, 'lmeval', '*', 'samples_gsm8k_*.jsonl'))[0]
rows = {}
for line in open(lm):
    r = json.loads(line)
    if r['filter'] != 'strict-match':
        continue
    rows[r['doc_id']] = dict(id=r['doc_id'], question=r['doc']['question'], full_answer=r['doc']['answer'],
                             target=r['doc']['answer'].split('####')[-1].strip(), lm_out=r['resps'][0][0])
ilog = json.load(open(glob.glob(os.path.join(RUNS, 'inspect', '*.json'))[0]))
for i, s in enumerate(sorted(ilog['samples'], key=lambda s: ilog['samples'].index(s))):
    pass
q2i = {v['question']: k for k, v in rows.items()}
for s in ilog['samples']:
    k = q2i[s['input'] if isinstance(s['input'], str) else s['input'][-1]['content']]
    rows[k]['in_out'] = s['output']['choices'][0]['message']['content'] if isinstance(s['output']['choices'][0]['message']['content'], str) else ''.join(c.get('text', '') for c in s['output']['choices'][0]['message']['content'])
    rows[k]['in_score'] = s['scores']['match']['value']
    rows[k]['in_answer'] = s['scores']['match'].get('answer')

res = []
for k in sorted(rows):
    r = rows[k]
    for src_name, text in (('lmeval', r['lm_out']), ('inspect', r.get('in_out', ''))):
        e = {}
        e['lmeval_strict'] = lm_score(STRICT, text, r['full_answer'])
        e['lmeval_flex'] = lm_score(FLEX, text, r['full_answer'])
        e['inspect'] = inspect_score(text, r['target'])
        e['lighteval'] = lighteval_score(text, r['target'])
        e['helm'] = helm_score(text, r['full_answer'])
        e['simple_evals'] = simple_score(text, r['target'])
        e['openai_evals'] = oai_score(text, r['target'])
        res.append(dict(id=k, run=src_name, target=r['target'], text=text,
                        extract={kk: [str(v[0]), v[1]] for kk, v in e.items()}))
# consistency with what the harnesses themselves logged
chk = []
for k in sorted(rows):
    r = rows[k]
    a = [x for x in res if x['id'] == k and x['run'] == 'inspect'][0]
    chk.append(dict(id=k, inspect_logged=r.get('in_score'), inspect_recomputed=a['extract']['inspect'][1]))
json.dump(dict(rows=res, check=chk), open(OUT, 'w'), indent=1)
print(len(res), 'outputs scored')
for x in res:
    print(x['id'], x['run'], x['target'], {k: v[1] for k, v in x['extract'].items()})
