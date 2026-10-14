"""Helper for hand-labelling boundary pairs: prints a stratified, seeded sample of pairs per Jaccard bin with the
two documents' starts and the words only one of them has. Labels are written by hand into labels_boundary.json.
usage: dd_label_view.py [per_bin]
"""
import os
import random
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dd_common as C  # noqa: E402

per = int(sys.argv[1]) if len(sys.argv) > 1 else 8
Z = np.load(C.work("pairs.npz"))
pi, pj, jac = Z["i"], Z["j"], Z["jac"]
docs = [C.clean_doc(d) for d in C.L.run0("filtered")]
rng = random.Random(0)
used = set()  # each document at most once in the whole sample, so one big cluster cannot fill it
for lo in (0.4, 0.5, 0.6, 0.7, 0.8, 0.9):
    idx = [k for k in range(len(jac)) if lo <= jac[k] < lo + 0.1 and jac[k] < 0.999]
    rng.shuffle(idx)
    pick = []
    for k in idx:
        if len(pick) < per and pi[k] not in used and pj[k] not in used:
            pick.append(k); used.update((pi[k], pj[k]))
    for k in sorted(pick):
        a, b = docs[pi[k]], docs[pj[k]]
        wa, wb = set(a["text"].split()), set(b["text"].split())
        print(f"== pair {pi[k]}-{pj[k]} J={jac[k]:.3f} | {a['url'][:70]} | {b['url'][:70]} | len {len(a['text'])} {len(b['text'])}")
        print("   A:", a["text"][:160].replace("\n", " / "))
        print("   B:", b["text"][:160].replace("\n", " / "))
        print("   only A:", " ".join(sorted(wa - wb))[:150])
        print("   only B:", " ".join(sorted(wb - wa))[:150])
