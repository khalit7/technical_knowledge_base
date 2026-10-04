"""Turn the raw downloads (fetch_data.py's cache) into the small extracts in inputs/ that the page embeds.

  inputs/audit.json   six MMLU-Redux subjects x 18 open models: per item the original key, the Redux verdict,
                      the suggested correct answer, each model's 5-shot choice and the models' mean probabilities
  inputs/agree.json   MT-Bench expert votes grouped into units (turn 1 and 2); HelpSteer2 coincidence and pair
                      matrices for five attributes (all units, and the paper's retention rule), plus a 370-unit sample
Run: uv run --with pandas --with pyarrow python3 mk_data.py [cache_dir]
"""
import collections, gzip, itertools, json, os, random, re, sys
import numpy as np, pandas as pd

CACHE = sys.argv[1] if len(sys.argv) > 1 else '_cache'
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'inputs')
SUBJECTS = ['virology', 'college_chemistry', 'abstract_algebra', 'global_facts', 'conceptual_physics', 'high_school_biology']
TEXT_SUBJECTS = {'virology', 'college_chemistry'}
runs = json.load(open(os.path.join(CACHE, 'oll_runs.json')))
MODELS = list(runs)
SHORT = {m: m.split('/')[1] for m in MODELS}
CODE = {'ok': 'o', 'wrong_groundtruth': 'w', 'bad_question_clarity': 'q', 'bad_options_clarity': 'p',
        'no_correct_answer': 'n', 'multiple_correct_answers': 'm', 'expert': 'e'}
L = 'ABCD'


def norm(s):
    return re.sub(r'\s+', ' ', s).strip()


def kn(s):  # matching key: letters and digits only (the two sources encode quotes and dashes differently)
    return re.sub(r'[^a-z0-9]', '', s.lower())


def cut(s, n):
    s = norm(str(s))
    return s if len(s) <= n else s[:n - 1].rstrip() + '…'


audit = {'models': [SHORT[m] for m in MODELS], 'hf': MODELS, 'subjects': {}}
for s in SUBJECTS:
    rows = json.load(open(os.path.join(CACHE, 'redux', s + '.json')))
    key = collections.defaultdict(list)
    for i, r in enumerate(rows):
        key[kn(r['question']) + '|' + kn(r['choices'][0])].append(i)
    probs = np.zeros((len(MODELS), len(rows), 4))
    full = {}
    for mi, m in enumerate(MODELS):
        d = pd.read_parquet(os.path.join(CACHE, 'oll', '%s__%s.parquet' % (s, m.replace('/', '__'))))
        seen = set(); acc = []
        for _, r in d.iterrows():
            a = r['acc'] if 'acc' in d.columns else r['metrics']['acc']
            acc.append(float(a))
            ex = r['example']; q = kn(ex.split('\nA. ')[0]) + '|' + kn(ex.split('\nA. ', 1)[1].split('\nB. ')[0])
            if q in key:
                ll = np.array(r['predictions'], dtype=float)
                p = np.exp(ll - ll.max())
                for ix in key[q]:  # MMLU and the Redux sample repeat a few questions verbatim
                    probs[mi, ix] = p / p.sum(); seen.add(ix)
        assert len(seen) == len(rows), (s, m, len(seen))
        full[SHORT[m]] = [len(acc), round(100 * float(np.mean(acc)), 2)]
    items = []
    for i, r in enumerate(rows):
        k = int(r['answer']); ca = r.get('correct_answer')
        c = L.index(ca) if (r['error_type'] in ('wrong_groundtruth', 'no_correct_answer') and ca in list(L)) else -1
        mean = probs[:, i].mean(0)
        it = {'k': k, 't': CODE[r['error_type']], 'c': c,
              'p': ''.join(str(int(np.argmax(probs[mi, i]))) for mi in range(len(MODELS))),
              'mp': [round(float(x), 4) for x in mean]}
        if s in TEXT_SUBJECTS:
            it['q'] = cut(r['question'], 150)
            it['o'] = [cut(x, 70) for x in r['choices']]
        items.append(it)
    audit['subjects'][s] = {'n': len(rows), 'mmlu_test_n': full[SHORT[MODELS[0]]][0], 'full_acc': full, 'items': items}
    print(s, collections.Counter(it['t'] for it in items))
audit['source'] = {'redux': 'https://huggingface.co/datasets/edinburgh-dawg/mmlu-redux-2.0',
                   'oll': 'https://huggingface.co/datasets/open-llm-leaderboard-old/details_<org>__<model> (5-shot, lm-evaluation-harness, run folders in runs)',
                   'runs': runs}
json.dump(audit, open(os.path.join(OUT, 'audit.json'), 'w'), separators=(',', ':'))

# ---- agreement sets
H = pd.read_parquet(os.path.join(CACHE, 'mtb_human.parquet'))
mtb = {}
for turn in (1, 2):
    by = collections.defaultdict(dict)
    for r in H.itertuples():
        if r.turn != turn or not r.judge.startswith('expert'):
            continue
        a, b, w = r.model_a, r.model_b, r.winner
        if a > b:
            a, b = b, a; w = {'model_a': 'model_b', 'model_b': 'model_a'}.get(w, w)
        by[(r.question_id, a, b)][r.judge] = {'model_a': 'A', 'model_b': 'B', 'tie': 'T'}[w]
    units = [''.join(v[j] for j in sorted(v)) for k, v in sorted(by.items()) if len(v) >= 2]
    mtb['t%d' % turn] = units
cats = [0, 1, 2, 3, 4]


def mats(units):
    co = [[0.0] * 5 for _ in cats]; pr = [[0] * 5 for _ in cats]
    for u in units:
        m = len(u)
        for i, j in itertools.permutations(range(m), 2):
            co[u[i]][u[j]] += 1 / (m - 1)
        for i, j in itertools.combinations(range(m), 2):
            pr[u[i]][u[j]] += 1; pr[u[j]][u[i]] += 1
    return {'units': len(units), 'votes': sum(len(u) for u in units),
            'co': [[round(x, 4) for x in row] for row in co], 'pairs': pr}


rows = [json.loads(l) for l in gzip.open(os.path.join(CACHE, 'hs2_disagreements.jsonl.gz'), 'rt')]
hs2 = {'n_rows': len(rows), 'per_unit': dict(collections.Counter(len(r['helpfulness']) for r in rows))}
random.seed(7)
samp = random.sample(range(len(rows)), 370)
for att in ['helpfulness', 'correctness', 'coherence', 'complexity', 'verbosity']:
    allu = [r[att] for r in rows if len(r[att]) >= 2]
    kept = [r[att] for r in rows if len(r[att]) >= 2 and max(r['helpfulness']) - min(r['helpfulness']) <= 2]
    hs2[att] = {'all': mats(allu), 'kept': mats(kept),
                'sample': [''.join(map(str, rows[i][att])) for i in samp if len(rows[i][att]) >= 2]}
json.dump({'mtb': mtb, 'hs2': hs2,
           'source': {'mtb': 'https://huggingface.co/datasets/lmsys/mt_bench_human_judgments (split human, expert_* judges)',
                      'hs2': 'https://huggingface.co/datasets/nvidia/HelpSteer2/tree/main/disagreements'}},
          open(os.path.join(OUT, 'agree.json'), 'w'), separators=(',', ':'))
print('mtb units', {k: len(v) for k, v in mtb.items()}, 'hs2 rows', len(rows))
