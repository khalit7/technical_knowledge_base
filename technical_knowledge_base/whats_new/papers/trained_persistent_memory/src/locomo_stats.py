"""Measure LoCoMo (locomo10.json, the public release) to check the paper's protocol numbers:
conversations, sessions, turns, QA pairs, and the evidence-lag distribution in the paper's buckets
(lag = T - min(E_q), T = turns in the conversation, Eq. 33/37).
usage: curl -sL https://raw.githubusercontent.com/snap-research/locomo/main/data/locomo10.json -o /tmp/locomo10.json
       python3 locomo_stats.py /tmp/locomo10.json   (writes inputs/locomo_stats.json)"""
import json, sys, re
d = json.load(open(sys.argv[1]))
out = {'source': 'https://github.com/snap-research/locomo/blob/main/data/locomo10.json', 'conversations': len(d)}
edges = [0, 32, 64, 128, 256, 10**9]
names = ['0-31', '32-63', '64-127', '128-255', '256+']
sess, turns, qa_all, qa_ev, bad = [], [], 0, 0, 0
buckets = {n: 0 for n in names}; buckets_nonadv = {n: 0 for n in names}
cats = {}
def norm(e):
    m = re.fullmatch(r'D(\d+):(\d+)', e.strip())
    return 'D%d:%d' % (int(m.group(1)), int(m.group(2))) if m else e.strip()
per_conv = []
for conv in d:
    c = conv['conversation']
    ks = sorted([k for k in c if re.fullmatch(r'session_\d+', k)], key=lambda k: int(k.split('_')[1]))
    sess.append(len(ks))
    idx = {}; i = 0
    for k in ks:
        for t in c[k]:
            idx[t['dia_id']] = i; i += 1
    T = i; turns.append(T)
    pc = [0]*5
    for q in conv['qa']:
        qa_all += 1
        cats[q['category']] = cats.get(q['category'], 0) + 1
        ev = [idx[norm(e)] for x in q.get('evidence', []) for e in re.split(r'[\s;,]+', x) if norm(e) in idx]
        if not ev: bad += 1; continue
        qa_ev += 1
        lag = T - min(ev)
        for j, n in enumerate(names):
            if edges[j] <= lag < edges[j+1]:
                buckets[n] += 1; pc[j] += 1
                if q['category'] != 5: buckets_nonadv[n] += 1
    per_conv.append({'sample_id': conv['sample_id'], 'sessions': len(ks), 'turns': T, 'qa': len(conv['qa']), 'buckets': pc})
last3 = [sum(p['buckets'][j] for p in per_conv[7:]) for j in range(5)]
out['last_three_conversations'] = {'ids': [p['sample_id'] for p in per_conv[7:]], 'qa': sum(p['qa'] for p in per_conv[7:]), 'buckets': dict(zip(names, last3))}
out['per_conversation'] = per_conv
out.update(sessions_min=min(sess), sessions_max=max(sess), sessions_total=sum(sess),
           turns_min=min(turns), turns_max=max(turns), turns_mean=round(sum(turns)/len(turns), 1),
           qa_total=qa_all, qa_with_parsable_evidence=qa_ev, qa_without=bad, categories=cats,
           lag_buckets_all=buckets, lag_buckets_excluding_category5=buckets_nonadv,
           paper_bucket_n={'0-31': 28, '32-63': 24, '64-127': 62, '128-255': 130, '256+': 395})
# How often a gold answer shares a content word with the last 20 turns of its conversation (the window 1/(1-gamma)
# of the paper's write decay), for the answerable questions of the last three conversations (the inferred test set).
STOP = set('a an the and or of to in on at for with is was are were be been it its i you he she they we my your his her their our me him them this that these those as by from not no yes did do does what when where who how why which'.split())
def words(s):
    s = re.sub(r'[^a-z0-9 ]', ' ', str(s).lower())
    return set(w for w in s.split() if w not in STOP)
ov = {'all': [0, 0], 'lag256': [0, 0]}
for conv in d[7:]:
    c = conv['conversation']
    ks = sorted([k for k in c if re.fullmatch(r'session_\d+', k)], key=lambda k: int(k.split('_')[1]))
    turns = [t for k in ks for t in c[k]]; idx = {t['dia_id']: i for i, t in enumerate(turns)}; T = len(turns)
    last = set().union(*[words(t['text']) for t in turns[-20:]])
    for q in conv['qa']:
        if 'answer' not in q: continue
        ev = [idx[norm(e)] for x in q['evidence'] for e in re.split(r'[\s;,]+', x) if norm(e) in idx]
        a = words(q['answer'])
        if not ev or not a: continue
        hit = bool(a & last)
        ov['all'][0] += 1; ov['all'][1] += hit
        if T - min(ev) >= 256: ov['lag256'][0] += 1; ov['lag256'][1] += hit
out['overlap_last20'] = {k: {'questions': v[0], 'share_answer_word_in_last_20_turns': round(v[1] / v[0], 3)} for k, v in ov.items()}
out['adversarial_in_last_three'] = sum(1 for conv in d[7:] for q in conv['qa'] if q['category'] == 5)
tot = sum(buckets.values())
out['share_all'] = {k: round(v/tot, 3) for k, v in buckets.items()}
out['share_paper'] = {k: round(v/639, 3) for k, v in out['paper_bucket_n'].items()}
json.dump(out, open('inputs/locomo_stats.json', 'w'), indent=1)
print(json.dumps(out, indent=1))
