"""Join RAGTruth's QA items (MS MARCO questions, three passages each) to MS MARCO v1.1 (train, validation, test parquet
from huggingface.co/datasets/microsoft/ms_marco) by question text, then match each of the three passages RAGTruth fed
the models to MS MARCO's passages to read their is_selected flag (the MS MARCO annotator used that passage to write the answer).
This gives each response two independent human labels: did retrieval deliver an answer-bearing passage (MS MARCO),
and is the response faithful to the passages (RAGTruth spans).
Usage: uv run --with pyarrow python ragtruth_marco.py <ragtruth dir> <marco dir> <out json>"""
import json, sys, re, collections
import pyarrow.parquet as pq
rt, md, out = sys.argv[1:4]
S = {}
for l in open(rt + '/source_info.jsonl'):
    s = json.loads(l)
    if s['task_type'] == 'QA': S[s['source_id']] = s
byq = {s['source_info']['question'].strip().lower(): s for s in S.values()}
M = {}
for f in ['v11_train', 'v11_validation', 'v11_test']:
    for r in pq.read_table(f'{md}/{f}.parquet').to_pylist():
        k = r['query'].strip().lower()
        if k in byq and k not in M: r['_split'] = f; M[k] = r
norm = lambda t: re.sub(r'\s+', ' ', t).strip().lower()
def split_passages(p):
    parts = re.split(r'passage \d+:', p)
    return [norm(x) for x in parts if x.strip()]
items = {}
nomatch = 0
for k, r in M.items():
    s = byq[k]; ps = split_passages(s['source_info']['passages'])
    mp = [norm(x) for x in r['passages']['passage_text']]
    sel = []
    for p in ps:
        # passages were lightly edited (prefixes such as "Instructions." dropped), so match on word-set overlap
        pw = set(re.findall(r'\w+', p))
        sc = [len(pw & set(re.findall(r'\w+', x))) / max(1, len(pw | set(re.findall(r'\w+', x)))) for x in mp]
        j = max(range(len(mp)), key=lambda i: sc[i]) if mp else None
        sel.append(None if j is None or sc[j] < 0.5 else r['passages']['is_selected'][j])
    if None in sel: nomatch += 1; continue
    items[s['source_id']] = {'q': r['query'], 'split': r['_split'], 'type': r['query_type'], 'sel': sel,
                             'marco_has_selected': any(r['passages']['is_selected']),
                             'answers': r['answers'], 'wf': r['wellFormedAnswers']}
R = [json.loads(l) for l in open(rt + '/response.jsonl')]
tab = collections.Counter(); tabm = collections.defaultdict(collections.Counter)
for x in R:
    it = items.get(x['source_id'])
    if not it: continue
    ctx = 'answer_in_context' if any(it['sel']) else 'answer_not_in_context'
    abst = 'unable to answer' in x['response'].lower()
    # hallucinated (any RAGTruth span) first; then a bare refusal (under 150 characters); then an answer that also
    # carries the refusal sentence ("answered, then disclaimed"); else faithful
    out_ = 'hallucinated' if x['labels'] else ('abstained' if abst and len(x['response']) < 150 else ('disclaimed' if abst else 'faithful'))
    tab[(ctx, out_)] += 1; tabm[x['model']][(ctx, out_)] += 1
res = {'joined_questions': len(M), 'passage_match_failures': nomatch, 'items': len(items),
       'items_answer_in_context': sum(any(v['sel']) for v in items.values()),
       'items_no_answer_in_marco': sum(v['answers'] == ['No Answer Present.'] for v in items.values()),
       'crosstab': {f'{a}|{b}': n for (a, b), n in sorted(tab.items())},
       'crosstab_by_model': {m: {f'{a}|{b}': n for (a, b), n in sorted(c.items())} for m, c in tabm.items()},
       'items_detail': items}
json.dump(res, open(out, 'w'), indent=1)
print(json.dumps({k: v for k, v in res.items() if k not in ('items_detail', 'crosstab_by_model')}, indent=1))
