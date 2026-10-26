"""Tokens of 20,000 messages, one batch call per tool; ns per message (median of 7).
Each tool's output is checked against the Python loop first."""
import json
import re
import sys
import time

import numpy as np
import tok_cy
import tok_mypyc
import tok_numba
import tokrs

from common import per, texts


def py_tokens(text):
    n, inside = 0, False
    for ch in text:
        is_tok = ch.isascii() and ch.isalnum()
        if is_tok and not inside:
            n += 1
        inside = is_tok
    return n


TOK = re.compile(r"[A-Za-z0-9]+")
T = texts(20000)
N = len(T)
want = [py_tokens(t) for t in T]
t0 = time.perf_counter(); prep = tok_numba.prepare(T); prep_ns = (time.perf_counter() - t0) * 1e9 / N
t0 = time.perf_counter(); first = tok_numba.count_many(*prep); jit_ms = (time.perf_counter() - t0) * 1e3
assert list(first) == want
assert tok_cy.count_many(T) == want and tok_mypyc.count_many(T) == want and tokrs.count_many(T) == want
assert [len(TOK.findall(t)) for t in T] == want
g = dict(globals())
r = {"n": N, "numba_first_call_ms": round(jit_ms, 1), "numba_prepare": prep_ns}
r["python"] = per("[py_tokens(t) for t in T]", g, 1, repeat=5, divide=N)
r["regex"] = per("[len(TOK.findall(t)) for t in T]", g, 5, divide=N)
r["mypyc"] = per("tok_mypyc.count_many(T)", g, 5, divide=N)
r["cython"] = per("tok_cy.count_many(T)", g, 20, divide=N)
r["numba"] = per("tok_numba.count_many(*prep)", g, 20, divide=N)
r["numba_with_prepare"] = per("tok_numba.count_many(*tok_numba.prepare(T))", g, 5, divide=N)
r["pyo3"] = per("tokrs.count_many(T)", g, 20, divide=N)
json.dump(r, open(sys.argv[1], "w"), indent=1)
print(f"{N} messages; ns per message, median of 7 (min to max)")
for k, label in [("python", "Python loop"), ("regex", "re.findall"), ("mypyc", "mypyc (same code, compiled)"),
                 ("cython", "Cython, C types"), ("numba", "Numba, arrays ready"),
                 ("numba_with_prepare", "Numba, incl. building arrays"), ("pyo3", "Rust via PyO3")]:
    v = r[k]
    print(f"{label:<30}{v['med']:>9.1f}   ({v['min']:.1f} to {v['max']:.1f})")
print(f"Numba's first call (compiling): {jit_ms:.0f} ms")
