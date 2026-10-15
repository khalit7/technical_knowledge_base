"""Draw a uniform random sample of run0 final documents to hand-label (seed 1, 200 docs, excluding the root Quality lab's
100 stratified labels). A uniform sample gives unbiased estimates of precision and recall for every classifier.
Writes $DC_SCRATCH/qc/sample_for_labels_*.txt (text to read, outside the repo) and ../labels/sample_ids.json."""
import json
import os
import random

import qc_common as C

root_labels = {json.loads(x)["id"] for x in open(os.path.join(C.ROOT_SRC, "qual", "labels.jsonl"))}
docs = C.run0_final()
pool = sorted([d for d in docs if d["id"] not in root_labels], key=lambda d: d["id"])
rng = random.Random(1)
pick = rng.sample(pool, 200)
for part in range(4):
    with open(C.sdir(f"sample_for_labels_{part}.txt"), "w") as f:
        for n in range(part * 50, part * 50 + 50):
            d = pick[n]
            t = d["text"]
            f.write(f"=== {n} {d['id']} words={d['words']} host={C.host(d['url'])}\n")
            f.write(t[:1000].replace("\n", " / ") + ("" if len(t) <= 1000 else " ...") + "\n")
os.makedirs(os.path.join(C.HERE, "..", "labels"), exist_ok=True)
json.dump({"seed": 1, "n": 200, "pool": len(pool), "ids": [d["id"] for d in pick]},
          open(os.path.join(C.HERE, "..", "labels", "sample_ids.json"), "w"), indent=0)
print(len(pool), len(pick))
