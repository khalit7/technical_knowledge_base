"""How many held-out test prompts also occur in a training stream, and how large the prompt space is.
  python3 overlap.py   (stdlib + numpy via train.py's generators; no torch needed beyond import)  -> model/overlap.json"""
import json, math, os, random
import train as T
test = set()
rng = random.Random(99)
for i in range(0, 2000, 500):
    for _ in range(500): p, a = T.task_example(rng); test.add(tuple(p))
# the finetuning stream of seed 0 (3,000 steps x 32 prompts), same generator calls as finetune()
rng = random.Random(0); seen = set()
for _ in range(3000 * 32):
    p, a = T.task_example(rng); seen.add(tuple(p))
# the question-first pretraining stream contains the same (club, list) pairs in the other order
rng = random.Random(0); pre = set(); n_pre = 0
for st in range(12000):
    for b in range(128):
        if b % 2 == 0:
            for f in range(5):
                c = rng.randrange(T.NC); y = rng.random() < 0.5; rng.choice(T.MEMB[c] if y else T.NONM[c])
        else:
            p, a = T.task_example(rng, qfirst=True); pre.add((p[2],) + tuple(p[3:])); n_pre += 1
space = 0
for c in range(T.NC):
    m, n = len(T.MEMB[c]), len(T.NONM[c])
    for k in range(T.KMIN, T.KMAX + 1): space += m * math.perm(n, k - 1) * k
over_ft = sum(1 for t in test if t in seen)
over_pre = sum(1 for t in test if (t[-1],) + t[1:-2] in pre)
out = dict(test_unique=len(test), finetune_stream=3000 * 32, finetune_unique=len(seen), test_in_finetune_stream=over_ft,
           pretrain_qfirst_examples=n_pre, test_list_seen_in_pretraining_qfirst=over_pre, prompt_space=space)
json.dump(out, open(os.path.join(T.MD, 'overlap.json'), 'w'), indent=1); print(out)
