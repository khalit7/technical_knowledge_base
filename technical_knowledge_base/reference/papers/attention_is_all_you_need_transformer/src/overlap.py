"""How big is the toy task, and how often does a random sentence appear in the training stream?
usage: python3 overlap.py          (sizes and overlaps; writes model/overlap.json)
       uv run --with torch --with numpy python overlap.py acc   (also each shipped model's accuracy on
       2,000 uniformly drawn sentences that are not in the training stream)"""
import json, os, random, sys
import grammar as G
HERE = os.path.dirname(os.path.abspath(__file__))
np_ = lambda nouns: len(G.DET) * (1 + len(G.ADJ) + len(G.ADJ) * (len(G.ADJ) - 1)) * nouns
total = np_(len(G.NOUN)) ** 2 * len(G.VERB) * (1 + len(G.PREP) * np_(len(G.PLACE)))
r = random.Random(7); seen = set()
for _ in range(16000 * 128): seen.add(tuple(G.sample(r)))   # train.py's stream: seed 7, 16,000 steps of 128
n = 100000
r2 = random.Random(2026); hit = sum(tuple(G.sample(r2)) in seen for _ in range(n))
r3 = random.Random(2027); hit_u = sum(tuple(G.sample_uniform(r3)) in seen for _ in range(n))
out = dict(distinct_sentences=total, training_draws=16000 * 128, training_unique=len(seen),
           random_sentence_in_training=hit / n, uniform_sentence_in_training=hit_u / n)
if sys.argv[1:] == ['acc']:
    import torch, train as T
    r4 = random.Random(99); test = []
    while len(test) < 2000:
        x = G.sample_uniform(r4)
        if tuple(x) not in seen: test.append(x)
    for v in T.VARIANTS:
        q = torch.load(os.path.join(HERE, 'model', v + '_q.pt'), weights_only=False)
        m = T.Transformer(q['cfg']); m.load_state_dict(q['state'])
        out['uniform_acc_' + v] = T.accuracy(m, test)
print(out)
json.dump(out, open(os.path.join(HERE, 'model', 'overlap.json'), 'w'), indent=1)
