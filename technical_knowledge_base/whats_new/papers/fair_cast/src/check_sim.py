"""Compare the page's round-to-nearest bf16 cast (parts/20_js_sim.js, cases written by check_sim.mjs) with ml_dtypes' bfloat16,
which rounds like torch's .to(torch.bfloat16) (round half to even).

  node check_sim.mjs && uv run --no-project --with ml_dtypes --with numpy python check_sim.py
"""
import json, os, sys
import numpy as np
import ml_dtypes

HERE = os.path.dirname(os.path.abspath(__file__))
cases = json.load(open(os.path.join(HERE, 'inputs', 'sim_rtn_cases.json')))
x = np.array([c[0] for c in cases], dtype=np.float32)
js = np.array([c[1] for c in cases], dtype=np.float32)
ref = x.astype(ml_dtypes.bfloat16).astype(np.float32)
same = (js.view(np.uint32) == ref.view(np.uint32))
print('check_sim.py: %d of %d round-to-nearest casts identical to ml_dtypes bfloat16' % (same.sum(), len(x)))
if not same.all():
    i = int(np.argmin(same)); print('first difference', x[i], js[i], ref[i]); sys.exit(1)
