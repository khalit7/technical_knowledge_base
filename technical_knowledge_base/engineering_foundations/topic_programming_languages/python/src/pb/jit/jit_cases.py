"""Five small workloads for the JIT on/off measurement. Usage: python jit_cases.py CASE DATA.jsonl
Prints JSON: median seconds of 7 timed repeats after 3 warm-up repeats, and whether the JIT is on."""
import json, statistics, sys, time, os
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "ft"))
from tokwork import tokens, count_slice

case, data = sys.argv[1], sys.argv[2]
lines = open(data, encoding="utf-8").read().splitlines(keepends=True)[:20000]
texts = [l for l in lines]


def char_loop():  # the root program's inner loop: one Python-level step per character
    return sum(tokens(t) for t in texts)


def float_loop():  # numeric loop: a Leibniz series, floats only
    s, sign = 0.0, 1.0
    for k in range(3_000_000):
        s += sign / (2 * k + 1)
        sign = -sign
    return s


class Vec:
    __slots__ = ("x", "y")
    def __init__(self, x, y):
        self.x, self.y = x, y
    def add(self, o):
        return Vec(self.x + o.x, self.y + o.y)


def objects():  # small-object creation and method calls
    v, d = Vec(0, 0), Vec(1, 2)
    for _ in range(1_000_000):
        v = v.add(d)
    return v.x


def gen_pipeline():  # generators feeding generators
    def words(ts):
        for t in ts:
            yield from t.split()
    def longw(ws):
        for w in ws:
            if len(w) > 4:
                yield w
    return sum(1 for _ in longw(words(texts)))


def json_count():  # mostly C code (json.loads) with Python glue: little for a JIT to win
    return sum(count_slice(lines).values())


f = {"char_loop": char_loop, "float_loop": float_loop, "objects": objects,
     "gen_pipeline": gen_pipeline, "json_count": json_count}[case]
for _ in range(3):
    f()
xs = []
for _ in range(7):
    t = time.perf_counter(); f(); xs.append(time.perf_counter() - t)
j = getattr(sys, "_jit", None)
print(json.dumps({"case": case, "median_s": statistics.median(xs), "jit_enabled": (j.is_enabled() if j else None),
                  "python": sys.version.split()[0]}))
