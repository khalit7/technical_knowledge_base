"""RAGTruth (Niu et al., ACL 2024) statistics recomputed from the released response.jsonl and source_info.jsonl
(github.com/ParticleMedia/RAGTruth, dataset/). Usage: python3 ragtruth_stats.py <dir with the two files>"""
import json, sys, collections
d = sys.argv[1] if len(sys.argv) > 1 else '.'
R = [json.loads(l) for l in open(d + '/response.jsonl')]
S = {}
for l in open(d + '/source_info.jsonl'):
    s = json.loads(l); S[s['source_id']] = s
task = lambda r: S[r['source_id']]['task_type']
out = {}
by = collections.defaultdict(lambda: [0, 0, 0])
for r in R:
    t = task(r); b = by[t]; b[0] += 1; b[1] += bool(r['labels']); b[2] += len(r['labels'])
out['by_task'] = {t: {'responses': v[0], 'hallucinated': v[1], 'spans': v[2]} for t, v in by.items()}
out['overall'] = {'responses': len(R), 'hallucinated': sum(bool(r['labels']) for r in R), 'spans': sum(len(r['labels']) for r in R)}
bm = collections.defaultdict(lambda: collections.defaultdict(lambda: [0, 0, 0]))
for r in R:
    b = bm[r['model']][task(r)]; b[0] += 1; b[1] += bool(r['labels']); b[2] += len(r['labels'])
out['by_model_task'] = {m: {t: {'responses': v[0], 'hallucinated': v[1], 'spans': v[2]} for t, v in x.items()} for m, x in bm.items()}
out['label_types'] = collections.Counter(l['label_type'] for r in R for l in r['labels'])
out['label_types_qa'] = collections.Counter(l['label_type'] for r in R if task(r) == 'QA' for l in r['labels'])
out['implicit_true'] = sum(l.get('implicit_true') is True for r in R for l in r['labels'])
out['implicit_true_qa'] = sum(l.get('implicit_true') is True for r in R if task(r) == 'QA' for l in r['labels'])
out['due_to_null'] = sum(l.get('due_to_null') is True for r in R for l in r['labels'])
qa = [r for r in R if task(r) == 'QA']
unable = [r for r in qa if 'unable to answer' in r['response'].lower()]
out['qa_unable'] = {'n': len(unable), 'labelled': sum(bool(r['labels']) for r in unable),
                    'by_model': collections.Counter(r['model'] for r in unable)}
out['splits'] = collections.Counter(r['split'] for r in R)
out['quality'] = collections.Counter(r['quality'] for r in R)
print(json.dumps(out, indent=1, default=dict))
