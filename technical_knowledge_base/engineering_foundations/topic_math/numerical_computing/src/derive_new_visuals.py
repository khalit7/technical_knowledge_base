"""Numbers for the visuals added in the 2026-10-24 rebuild (pure Python, seconds; no NumPy needed).

usage: python3 src/derive_new_visuals.py   writes src/new_visuals.json

1. Cancellation: (fl32(1.0001) - 1) in float32, the digits that survive, and kappa * u.
2. Reduction trees: Thinking Machines' eight numbers (+-1e-10, +-1e-5, +-1e-2, +-1, exact sum 0) in one fixed
   order, summed in float64 the way 1, 2 and 4 threads would (left to right; two chunks of 4; four chunks of 2
   then a tree). The first order (in itertools order) where all three answers differ is used.
"""
import itertools, json, struct
from fractions import Fraction
from pathlib import Path


def f32(x):
    return struct.unpack(">f", struct.pack(">f", x))[0]


out = {}
# 1. cancellation in float32
a = f32(1.0001)
d = f32(a - 1.0)  # exact by Sterbenz, so rounding it changes nothing
out["canc"] = {
    "a_stored": repr(a),
    "a_bits": struct.pack(">f", a).hex(),
    "diff": repr(d),
    "true": "0.0001",
    "rel_err": float(abs(Fraction(d) - Fraction(1, 10000)) / Fraction(1, 10000)),
    "rel_err_input": float(abs(Fraction(a) - Fraction(10001, 10000)) / Fraction(10001, 10000)),
    "kappa": 10001,
    "u32": 2.0 ** -24,
    "kappa_u": 10001 * 2.0 ** -24,
    "ulp_at_1": 2.0 ** -23,
}

# 2. reduction trees in float64
vals = [1e-10, 1e-5, 1e-2, 1.0]
vals = vals + [-v for v in vals]


def left(xs):
    s = 0.0
    for x in xs:
        s += x
    return s


def two_chunks(xs):
    return left(xs[:4]) + left(xs[4:])


def four_chunks(xs):
    p = [xs[0] + xs[1], xs[2] + xs[3], xs[4] + xs[5], xs[6] + xs[7]]
    return (p[0] + p[1]) + (p[2] + p[3])


pick = None
for perm in itertools.permutations(vals):
    r = (left(perm), two_chunks(perm), four_chunks(perm))
    if len(set(r)) == 3 and all(v != 0 for v in r):
        pick = perm
        break
xs = list(pick)
s4 = [xs[0] + xs[1], xs[2] + xs[3], xs[4] + xs[5], xs[6] + xs[7]]
out["trees"] = {
    "order": xs,
    "one_thread": left(xs),
    "one_thread_partials": list(itertools.accumulate(xs)),
    "two_chunks": [left(xs[:4]), left(xs[4:])],
    "two_threads": two_chunks(xs),
    "four_pairs": s4,
    "four_mid": [s4[0] + s4[1], s4[2] + s4[3]],
    "four_threads": four_chunks(xs),
    "exact": float(sum(Fraction(v) for v in xs)),
}
p = Path(__file__).with_name("new_visuals.json")
p.write_text(json.dumps(out, indent=1) + "\n")
print(json.dumps(out, indent=1))
