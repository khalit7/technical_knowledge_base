"""How new are the test prompts? Regenerate the pretraining stream (the same seeded documents train.py drew,
before cutting) and count test prompts whose fact list appeared in training as a document's facts.
usage: python3 overlap.py   (plain Python; writes model/overlap.json)"""
import json, os, random, re
import grammar as G
HERE = os.path.dirname(os.path.abspath(__file__))
src = open(os.path.join(HERE, 'train.py')).read()
STEPS = int(os.environ.get('STEPS', re.search(r"STEPS = int\(os.environ.get\('STEPS', (\d+)\)\)", src).group(1)))
BATCH, SEED = 128, 7


def fact_key(words):
    out = []; i = 0
    while i + 5 < len(words) and words[i] != 'so':
        out.append(tuple(words[i:i + 6])); i += 6
    return tuple(out)


seen = set(); r = random.Random(SEED)
for _ in range(STEPS * BATCH):
    d = G.document(r); seen.add(fact_key(d))
    if r.random() < 0.3: r.randint(8, len(d) + 2 - 2)  # the cut point draw in train.batch_docs (len counts BOS and EOS)
r = random.Random(999); n = 1000; hit = 0
for _ in range(n):
    p, a, fs = G.generate_example(r); hit += fact_key(p) in seen
space = sum(__import__('math').perm(8, k) * 36 ** k for k in (2, 3))
out = {'training_documents': STEPS * BATCH, 'distinct_fact_lists_seen': len(seen), 'fact_list_space': space, 'test_prompts': n, 'test_fact_lists_seen_in_training': hit,
       'summary': '%d of %d test prompts (%.1f%%) have a fact list that occurred in pretraining; the training stream drew %s documents from about %s possible fact lists.' % (hit, n, 100 * hit / n, format(STEPS * BATCH, ','), format(space, ','))}
json.dump(out, open(os.path.join(HERE, 'model', 'overlap.json'), 'w'), indent=1); print(out['summary'])
