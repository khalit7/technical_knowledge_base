"""After check_equiv.py: where do the final PyTorch and JAX weights differ, and does it matter?
Reads $JX_SCRATCH/data/final_{torch,jax}_500.npz and adds a "final" section to equiv.json.
The key biases (attn.wk.bias) differ most, yet cannot change any output: adding the same vector b to every
key adds q.b to every score of a row, and softmax ignores a constant added to a whole row. So their true
gradient is 0, the computed one is float noise (about 1e-11), and Adam divides that noise by its own
running RMS, turning it into steps of up to the learning rate in a random direction, different in each framework.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np  # noqa: E402
import torch  # noqa: E402

import common as C  # noqa: E402
import model_torch as MT  # noqa: E402

torch.set_num_threads(4)
cfg = C.CFG
a = dict(np.load(C.path("data", "final_torch_500.npz")))
b = dict(np.load(C.path("data", "final_jax_500.npz")))
diff = {k: float(np.abs(a[k] - b[k]).max()) for k in a}


def logits(sd, x):
    m = MT.make_model(cfg)
    m.load_state_dict({k: torch.from_numpy(v) for k, v in sd.items()})
    with torch.no_grad():
        return m(torch.from_numpy(x).long()).numpy()


x, _ = C.batch(0, "val", n_steps=8)
la, lb = logits(a, x), logits(b, x)
swapped = dict(a); swapped.update({k: b[k] for k in a if ".wk.bias" in k})
ls = logits(swapped, x)
zeroed = dict(a); zeroed.update({k: np.zeros_like(a[k]) for k in a if ".wk.bias" in k})
lz = logits(zeroed, x)
res = {"weight_diff_top": sorted(diff.items(), key=lambda kv: -kv[1])[:6],
       "weight_diff_max_excluding_key_bias": max(v for k, v in diff.items() if ".wk.bias" not in k),
       "logits_torch_vs_jax_final": float(np.abs(la - lb).max()),
       "logits_torch_vs_torch_with_jax_key_bias": float(np.abs(la - ls).max()),
       "logits_torch_vs_torch_with_zero_key_bias": float(np.abs(la - lz).max()),
       "max_abs_logit": float(np.abs(la).max())}
print(json.dumps(res, indent=1))
p = os.path.join(C.HERE, "equiv.json")
e = json.load(open(p)); e["final"] = res
json.dump(e, open(p, "w"), indent=1)
