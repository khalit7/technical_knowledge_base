"""Two checks on the GSM8K test split, run in the harness venv:
1. lm-eval loaded openai/gsm8k at the Hub's current revision, inspect_evals at its pinned revision cc7b047: are the test sets identical?
2. Inspect's numeric match compares numbers at 5 significant digits ('.5g'): how many GSM8K test answers have more than 5?
Usage: python gsm8k_checks.py data/gsm8k_checks.json
"""
import glob, json, os, sys, re
from datasets import Dataset
base = os.path.expanduser('~/.cache/huggingface/datasets/openai___gsm8k')
files = sorted(glob.glob(base + '/*/0.0.0/*/gsm8k-test.arrow'))
sets = {}
for f in files:
    rev = f.split('/')[-2]
    d = Dataset.from_file(f)
    sets[rev] = [(r['question'], r['answer']) for r in d]
revs = list(sets)
same = len(revs) == 2 and sets[revs[0]] == sets[revs[1]]
golds = [a.split('####')[-1].strip().replace(',', '') for _, a in sets[revs[0]]]
def sig(s):
    s = s.lstrip('-').replace('.', '').lstrip('0').rstrip('0') if '.' not in s else s.lstrip('-').replace('.', '').lstrip('0')
    return len(s)
big = [g for g in golds if len(g.lstrip('-').split('.')[0].lstrip('0')) > 5]
out = dict(revisions=revs, n=[len(sets[r]) for r in revs], identical=same, answers_over_5_digits=len(big), examples=big[:8])
json.dump(out, open(sys.argv[1], 'w'), indent=1); print(out)
