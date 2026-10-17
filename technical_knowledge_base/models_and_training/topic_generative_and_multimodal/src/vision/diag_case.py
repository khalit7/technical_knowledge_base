"""Why do SigLIP 2's official Fashion-MNIST names score so low? Separate capitalisation from wording.

Usage: python -I diag_case.py clip|siglip   (CPU; uses GM_SCRATCH/vision/fmnist_<which>.npz)
Template "a photo of a {}." with four class lists: official, official lowercased, plain, plain capitalised.
Writes out/diag_case_<which>.json.
"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from vs_env import *
import numpy as np

cap_threads(4)
which = sys.argv[1]
model, proc = load(which, "cpu")
plain = ["t-shirt", "trousers", "pullover", "dress", "coat", "sandal", "shirt", "sneaker", "bag", "ankle boot"]
L = {"official": CLASSES, "official_lower": [c.lower() for c in CLASSES], "plain": plain,
     "plain_capitalised": [c[0].upper() + c[1:] for c in plain]}
E = np.load(big(f"fmnist_{which}.npz")); et = E["e_test"].astype(np.float32); yt = E["y_test"]
r = {"which": which, "template": "a photo of a {}.", "lists": L, "acc": {}, "tokens": {}}
for k, names in L.items():
    T = embed_text(model, proc, which, ["a photo of a {}.".format(n) for n in names])
    r["acc"][k] = round(float(((et @ T.T).argmax(1) == yt).mean()), 4)
    r["tokens"][k] = [proc.tokenizer.tokenize(n) for n in names[:3]]
dump(f"diag_case_{which}.json", r)
print(r["acc"])
