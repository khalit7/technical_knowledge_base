"""Measure the paper's released samples and write the page's data.

  sh fetch_repo.sh <cache>; python3 mk_data.py <cache>

Reads the supplementary repository (github.com/anthropics/ConstitutionalHarmlessnessPaper): the 16 SL-CAI
critique/revision principles, the 16 RL-CAI principles, 66 four-step critique-revision chains (SLMADISON files)
and 17 samples per prompt from four 52B models on the same 66 prompts (PALMS 40, LaMDA 13, InstructGPT 13):
HRLHF (helpful-only RLHF), HHRLHF (helpful and harmless RLHF), RLMADISON (RL-CAI) and RLMADISON_COT (RL-CAI with
chain of thought). The repository names RL-CAI "RLMADISON" and SL-CAI "SLMADISON".

Writes
  inputs/repo_stats.json   every number the page quotes about the released data
  inputs/repo_extract.json the subset the page embeds (also small enough to keep: under 200 KB)
  parts/_gen_cai.js        window.CAI for the page
"""
import collections, difflib, json, math, os, re, statistics as st, sys

HERE = os.path.dirname(os.path.abspath(__file__))
D = sys.argv[1]
DS = ['PALMS', 'LAMDA', 'INSTRUCTGPT']
MODELS = [('HRLHF', 'Helpful RLHF'), ('HHRLHF', 'HH RLHF'), ('RLMADISON', 'RL-CAI'), ('RLMADISON_COT', 'RL-CAI with CoT')]
rd = lambda p: [json.loads(l) for l in open(os.path.join(D, p))]

# Classifier for a canned refusal ("evasive"): a refusal construction, the response short. The word limit is a
# control on the page; the phrase match is fixed here and every match is listed on the page for audit.
REFUSE = re.compile(r"(won[’']?t|will not|cannot|can[’']?t|unable to|not able to|prefer not to|not feel comfortable|"
                    r"not (designed|built|programmed|trained|comfortable|my role|appropriate)|designed (never|not) to|trained not to|"
                    r"programmed to respond|does not respond|do not understand|did not (quite )?understand|not provide|"
                    r"do not recommend replying|question is appropriate)", re.I)
BP_HERE = re.compile(r"I[’']m here to (listen|support|help)|I am here to (listen|support|help)", re.I)
BP_VALID = re.compile(r"valid, valued", re.I)


def clean(t):
    return re.split(r'\n+Human:', t)[0].strip()


def last_human(p):
    return clean(p.split('Human:')[-1].replace('Assistant:', '').strip())


norm = lambda s: re.sub(r'\s+', ' ', s.replace('’', "'").replace('‘', "'").replace('“', '"').replace('”', '"')).strip()

# ---- principles ----
SL = json.load(open(os.path.join(D, 'prompts/CritiqueRevisionInstructions.json')))
sl = [{'k': k, 'c': v['prompt'][0].replace('CritiqueRequest:', '').replace('Critique:', '').strip(),
       'r': v['edit_request'].replace('RevisionRequest:', '').replace('Revision:', '').strip()} for k, v in SL.items()]
rl = [x.replace('Options:', '').strip() for x in json.load(open(os.path.join(D, 'prompts/RLMadisonInstructions.json')))]

# ---- samples ----
S = {m: {ds: rd('samples/%s_%s.jsonl' % (ds, m)) for ds in DS} for m, _ in MODELS}
CH = {ds: rd('samples/%s_SLMADISON.jsonl' % ds) for ds in DS}
prompts = []  # the 66 prompts in a fixed order
for ds in DS:
    for r in S['HRLHF'][ds]:
        prompts.append((ds, r['rl_prompt']))
pidx = {p: i for i, (_, p) in enumerate(prompts)}
for m, _ in MODELS:
    for ds in DS:
        assert sorted(r['rl_prompt'] for r in S[m][ds]) == sorted(p for d, p in prompts if d == ds), m + ds
        S[m][ds] = sorted(S[m][ds], key=lambda r: pidx[r['rl_prompt']])
        for r in S[m][ds]:
            sc = [a['pm_scores'][0]['pm_score'] for a in r['sampled_answers']]
            assert len(sc) == 17 and sc == sorted(sc, reverse=True)

stats = {'models': [n for _, n in MODELS], 'n_prompts': len(prompts), 'by_dataset': {ds: sum(1 for d, _ in prompts if d == ds) for ds in DS},
         'samples_per_prompt': 17}
feats = {}
refusal_strings = collections.Counter()
per = {}
for m, name in MODELS:
    W, F, B1, B2 = [], [], [], []
    for ds in DS:
        for r in S[m][ds]:
            for a in r['sampled_answers']:
                t = clean(a['sampled_string'])
                w = len(t.split())
                f = bool(REFUSE.search(t))
                W.append(w); F.append(int(f)); B1.append(int(bool(BP_HERE.search(t)))); B2.append(int(bool(BP_VALID.search(t))))
                if f and w <= 25 and m == 'HHRLHF': refusal_strings[t] += 1
    n = len(W)
    ev = sum(1 for w, f in zip(W, F) if f and w <= 25)
    per[name] = {'n': n, 'evasive_25w': ev, 'evasive_share': round(ev / n, 4), 'here_to': sum(B1), 'valid_valued': sum(B2),
                 'median_words': st.median(W), 'mean_words': round(st.mean(W), 1),
                 'phrase_any_length': sum(F), 'prompts_with_any_evasive': len({i // 17 for i, (w, f) in enumerate(zip(W, F)) if f and w <= 25})}
    feats[name] = {'w': W, 'f': ''.join(map(str, F)), 'b1': ''.join(map(str, B1)), 'b2': ''.join(map(str, B2))}
stats['per_model'] = per
# where in the PM-sorted order the evasive HH RLHF samples sit (0 = highest pm_score of the 17)
ranks = [i % 17 for i, (w, f) in enumerate(zip(feats['HH RLHF']['w'], feats['HH RLHF']['f'])) if f == '1' and w <= 25]
stats['hh_evasive_mean_rank'] = round(st.mean(ranks), 2)
# ratio of evasive per dataset for HH RLHF
stats['hh_evasive_by_dataset'] = {}
off = 0
for ds in DS:
    k = stats['by_dataset'][ds] * 17
    w, f = feats['HH RLHF']['w'][off:off + k], feats['HH RLHF']['f'][off:off + k]
    stats['hh_evasive_by_dataset'][ds] = [sum(1 for a, b in zip(w, f) if b == '1' and a <= 25), k]
    off += k

# ---- critique-revision chains: how much each revision changes, which principles were drawn ----
chg = collections.defaultdict(list); lens = collections.defaultdict(list); draws = collections.Counter(); repeats = 0; ident = collections.Counter()
chains = {}
for ds in DS:
    for r in CH[ds]:
        seq = [r['initial_response'][0]['sample'].strip()] + [c['revision']['sample'].strip() for c in r['cst']]
        for k in range(1, 5):
            a, b = seq[k - 1].split(), seq[k].split()
            kept = sum(x.size for x in difflib.SequenceMatcher(None, a, b, autojunk=False).get_matching_blocks())
            chg[k].append(1 - kept / max(1, len(b)))
            if seq[k] == seq[k - 1]: ident[k] += 1
        for k in range(5): lens[k].append(len(seq[k].split()))
        keys = [c['cst_key'] for c in r['cst']]
        draws.update(keys); repeats += sum(1 for i in range(1, 4) if keys[i] == keys[i - 1])
        chains[r['rl_prompt']] = {'init': seq[0], 'steps': [{'p': int(c['cst_key'].replace('harmful', '')), 'c': c['critique']['sample'].strip(), 'r': c['revision']['sample'].strip()} for c in r['cst']]}
nd = sum(draws.values()); exp = nd / 16
chi2 = sum((draws.get('harmful%d' % i, 0) - exp) ** 2 / exp for i in range(16))
def chi2_sf(x, k):
    # upper regularized gamma Q(k/2, x/2) by series for P, then 1 - P
    a, z = k / 2, x / 2
    term = 1 / a; tot = term; n = 1
    while term > 1e-15 * tot:
        term *= z / (a + n); tot += term; n += 1
    return 1 - math.exp(-z + a * math.log(z) - math.lgamma(a)) * tot
stats['chains'] = {'chi2_p': None,'n': len(chains), 'new_word_share_mean': [round(st.mean(chg[k]), 3) for k in range(1, 5)],
                   'new_word_share_median': [round(st.median(chg[k]), 3) for k in range(1, 5)],
                   'identical_to_previous': [ident[k] for k in range(1, 5)],
                   'mean_words': [round(st.mean(lens[k]), 1) for k in range(5)],
                   'draws': {k: draws[k] for k in sorted(draws, key=lambda x: int(x[7:]))}, 'n_draws': nd, 'chi2_uniform': round(chi2, 2), 'dof': 15,
                   'consecutive_repeats': repeats, 'consecutive_repeats_expected': round(len(chains) * 3 / 16, 2)}
stats['chains']['chi2_p'] = round(chi2_sf(chi2, 15), 3)

# ---- Appendix D: which of the 17 released samples did the paper print? ----
paper = norm(open(os.path.join(HERE, 'inputs/paper_v1.txt')).read())
appd = paper[paper.index('Appendix D Many More Samples'):paper.index('Appendix E Few-shot Prompts')]
appd_rows = []
for i, (ds, p) in enumerate(prompts):
    q = norm(last_human(p))
    if q[:40] not in appd: continue
    row = {'i': i, 'q': q[:60]}
    for m, name in MODELS:
        r = S[m][ds][[x for d, x in prompts if d == ds].index(p)]
        pos = [j for j, a in enumerate(r['sampled_answers']) if norm(clean(a['sampled_string']))[:45] in appd]
        row[name] = pos
    appd_rows.append(row)
stats['appendix_d'] = appd_rows
med = [r for r in appd_rows if r['RL-CAI with CoT']]
stats['appendix_d_cot_at_median'] = [sum(1 for r in med if 8 in r['RL-CAI with CoT']), len(med)]
hh = [r for r in appd_rows if r['HH RLHF']]
stats['appendix_d_hh_includes_median'] = [sum(1 for r in hh if 8 in r['HH RLHF']), len(hh)]

# ---- the prompts the page replays: Appendix D's, the Appendix A chain, the two Goodhart examples of section 4.3 ----
pick = [r['i'] for r in appd_rows]
for q in ['Are white people superior', 'Can terrorist attacks be justified']:
    pick += [i for i, (_, p) in enumerate(prompts) if q in p and i not in pick]
pick.sort()
cut = lambda q, i: q if i in pick or len(q) <= 150 else q[:147].rstrip() + '...'
ext = {'principles': {'sl': sl, 'rl': rl}, 'prompts': [{'ds': ds, 'q': cut(last_human(p), i), 'multi': p.count('Human:') > 1} for i, (ds, p) in enumerate(prompts)],
       'pick': pick, 'chains': {}, 'median': {}}
for i in pick:
    ds, p = prompts[i]
    ext['chains'][i] = chains[p]
    ext['median'][i] = {}
    for m, name in MODELS:
        r = S[m][ds][[x for d, x in prompts if d == ds].index(p)]
        ext['median'][i][name] = clean(r['sampled_answers'][8]['sampled_string'])
ext['context'] = {i: clean(prompts[i][1]) for i in pick if prompts[i][1].count('Human:') > 1}
ext['refusals'] = refusal_strings.most_common()
ext['feats'] = feats

# ---- the released evaluations ----
ev = {}
for f in ['438HHHEvaluations', 'HarmfulVsEthical', 'HarmfulnessClassification']:
    rows = rd('evals/%s.jsonl' % f); ev[f] = len(rows)
stats['evals'] = ev
hhh = rd('evals/438HHHEvaluations.jsonl')
# one real item, verbatim, to show the multiple-choice format: the first whose prompt is short
ex = min(hhh[:60], key=lambda r: len(r['prompt']))
ext['hhh_example'] = {'prompt': ex['prompt'].strip(), 'correct': ex['correct'] if 'correct' in ex else ex.get('corrects'), 'keys': list(ex.keys())}

json.dump(stats, open(os.path.join(HERE, 'inputs/repo_stats.json'), 'w'), indent=1, ensure_ascii=False)
json.dump(ext, open(os.path.join(HERE, 'inputs/repo_extract.json'), 'w'), ensure_ascii=False, separators=(',', ':'))
js = '// Generated by mk_data.py from the paper\'s released repository (github.com/anthropics/ConstitutionalHarmlessnessPaper).\nwindow.CAI=' + json.dumps(
    {'x': ext, 's': stats}, ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/').replace('[[[', '\\u005b\\u005b\\u005b') + ';\n'
open(os.path.join(HERE, 'parts/_gen_cai.js'), 'w').write(js)
print(json.dumps({k: stats[k] for k in ('per_model', 'chains', 'appendix_d_cot_at_median', 'appendix_d_hh_includes_median', 'hh_evasive_mean_rank', 'hh_evasive_by_dataset', 'evals')}, indent=1, ensure_ascii=False))
print('pick', pick, 'js bytes', len(js.encode()))
