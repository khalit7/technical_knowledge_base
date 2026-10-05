"""The same calls against a version-specific build and an abi3 build (run once in each venv). Prints JSON."""
import json
import os
import sys

import numpy as np
import tokrs

from common import per, texts

T = texts(20000)
N = len(T)
arr = np.arange(1_000_000, dtype=np.float64)
g = dict(tokrs=tokrs, T=T, t0=T[0], arr=arr)
so = os.path.basename(tokrs.tokrs.__file__ if hasattr(tokrs, "tokrs") else tokrs.__file__)
r = {"python": sys.version.split()[0], "module_file": so,
     "noop": per("tokrs.noop()", g, 1_000_000), "count_tokens": per("tokrs.count_tokens(t0)", g, 1_000_000),
     "total_len": per("tokrs.total_len(T)", g, 20, divide=N), "count_many": per("tokrs.count_many(T)", g, 20, divide=N),
     "sum_sq_array": per("tokrs.sum_sq_array(arr)", g, 20, divide=len(arr))}
print(json.dumps(r))
