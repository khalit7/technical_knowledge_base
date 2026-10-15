"""Code with tests: how strong are the tests of a public code-RL set? Mutation testing on the gold solutions.

Set: open-r1/verifiable-coding-problems-python_decontaminated-tested, file 1 of 3 (5,023 problems from APPS and
CodeContests; every gold solution passes its own tests, test_reward = 1). A seeded sample of problems; for each,
the gold solution and up to four mutants (one small change each, made with Python's ast: flip a comparison,
add 1 to an integer constant, swap + and -, swap min and max). A mutant that still passes every test shows the tests
cannot tell that program from the gold one: either the tests are weak or the change does not alter behaviour
(an "equivalent mutant"); survivors are read by hand to tell which (src/notes/code_survivors.md).
Untrusted code runs under macOS sandbox-exec (no network, no file writes), one process per test, 4 s timeout.
Output: data/out/code.json.  usage: DC_SCRATCH=... python -I -B pd_code.py [n_problems] [max_tests]
"""
import ast
import json
import os
import random
import subprocess
import sys
import tempfile
from collections import Counter
from multiprocessing import get_context

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pd_common as C  # noqa: E402

PROFILE = '(version 1)(allow default)(deny network*)(deny file-write*)(allow file-write-data (literal "/dev/null"))'
PY = None
TIMEOUT = 4


class Mut(ast.NodeTransformer):
    def __init__(self, kind, target):
        self.kind, self.target, self.k, self.done = kind, target, 0, False

    def _hit(self):
        hit = self.k == self.target
        self.k += 1
        return hit

    def visit_Compare(self, node):
        self.generic_visit(node)
        if self.kind == "cmp":
            sw = {ast.Lt: ast.LtE, ast.LtE: ast.Lt, ast.Gt: ast.GtE, ast.GtE: ast.Gt, ast.Eq: ast.NotEq, ast.NotEq: ast.Eq}
            op = type(node.ops[0])
            if op in sw and self._hit():
                node.ops[0] = sw[op]()
                self.done = True
        return node

    def visit_Constant(self, node):
        if self.kind == "const" and type(node.value) is int and self._hit():
            self.done = True
            return ast.copy_location(ast.Constant(node.value + 1), node)
        return node

    def visit_BinOp(self, node):
        self.generic_visit(node)
        if self.kind == "arith" and isinstance(node.op, (ast.Add, ast.Sub)) and self._hit():
            node.op = ast.Sub() if isinstance(node.op, ast.Add) else ast.Add()
            self.done = True
        return node

    def visit_Call(self, node):
        self.generic_visit(node)
        if self.kind == "minmax" and isinstance(node.func, ast.Name) and node.func.id in ("min", "max") and self._hit():
            node.func = ast.Name(id="max" if node.func.id == "min" else "min", ctx=ast.Load())
            self.done = True
        return node


def count_sites(tree, kind):
    m = Mut(kind, -1)
    m.visit(ast.parse(ast.unparse(tree)))
    return m.k


def mutants(src, rng):
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return []
    out = []
    for kind in ("cmp", "const", "arith", "minmax"):
        n = count_sites(tree, kind)
        if not n:
            continue
        t = rng.randrange(n)
        m = Mut(kind, t)
        new = m.visit(ast.parse(src))
        if m.done:
            code = ast.unparse(new)
            if code != ast.unparse(ast.parse(src)):
                out.append((kind, code))
    return out


def run_one(code, inp):
    with tempfile.NamedTemporaryFile("w", suffix=".py", delete=False, dir=C.scratch("code_tmp")) as f:
        f.write(code)
        p = f.name
    try:
        r = subprocess.run(["sandbox-exec", "-p", PROFILE, PY, "-I", "-B", p], input=inp, capture_output=True,
                           text=True, timeout=TIMEOUT)
        return r.returncode, r.stdout
    except subprocess.TimeoutExpired:
        return "timeout", ""
    finally:
        os.unlink(p)


FENCE = __import__("re").compile(r"```(?:python|py)?\s*\n(.*?)```", __import__("re").S)


def unfence(src):
    """Gold solutions are stored as a markdown code block; the program is the first fenced block."""
    m = FENCE.search(src or "")
    return m.group(1) if m else (src or "")


def same(out, exp):
    a = [x.rstrip() for x in (out or "").strip().splitlines()]
    b = [x.rstrip() for x in (exp or "").strip().splitlines()]
    return a == b


def passes(code, tests):
    for k, t in enumerate(tests):
        rc, out = run_one(code, t["input"])
        if rc != 0 or not same(out, t["output"]):
            return False, k, rc
    return True, len(tests), 0


def job(x):
    pid, gold, tests, muts = x
    g = passes(gold, tests)
    res = {"p": pid, "gold": g[0], "gold_fail_at": g[1], "n_tests": len(tests), "mut": []}
    for kind, code in muts:
        ok, at, rc = passes(code, tests)
        res["mut"].append({"kind": kind, "survived": ok, "killed_at": at, "rc": str(rc)})
    return res


def main():
    global PY
    PY = os.path.join(C.L.scratch(), "venv", "bin", "python")
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 300
    mt = int(sys.argv[2]) if len(sys.argv) > 2 else 25
    d = C.frame("code_tested")
    ntests = [len(v["test_cases"]) for v in d.verification_info]
    rng = random.Random(0)
    idx = sorted(rng.sample(range(len(d)), n))
    jobs, info = [], {}
    for i in idx:
        r = d.iloc[i]
        tests = [dict(input=t["input"], output=t["output"]) for t in list(r.verification_info["test_cases"])]
        tests = tests[:mt]
        gold = unfence(r.gold_standard_solution)
        ms = mutants(gold, rng)
        jobs.append((int(i), gold, tests, ms))
        info[int(i)] = dict(source=r.source, n_tests_all=len(r.verification_info["test_cases"]),
                            muts={k: c for k, c in ms}, gold=gold,
                            problem=r.problem[:1500], url=(r.metadata or {}).get("problem_url"))
    out = []
    with get_context("fork").Pool(int(os.environ.get("PD_WORKERS", "2"))) as pool:
        for k, o in enumerate(pool.imap_unordered(job, jobs)):
            out.append(o)
            if k % 25 == 0:
                print(k, flush=True)
    surv = [(o, m) for o in out for m in o["mut"] if m["survived"] and o["gold"]]
    by_kind = {}
    for o in out:
        if not o["gold"]:
            continue
        for m in o["mut"]:
            b = by_kind.setdefault(m["kind"], [0, 0])
            b[0] += 1
            b[1] += m["survived"]
    by_ntests = {}
    for o in out:
        if not o["gold"] or not o["mut"]:
            continue
        nt = info[o["p"]]["n_tests_all"]
        key = "1" if nt == 1 else "2-5" if nt <= 5 else "6-20" if nt <= 20 else "21+"
        b = by_ntests.setdefault(key, [0, 0, 0])
        b[0] += 1
        b[1] += any(m["survived"] for m in o["mut"])
        b[2] += len(o["mut"])
    res = dict(n=n, max_tests=mt, file_rows=len(d), tests_hist=Counter(min(x, 200) // 1 if x <= 5 else (10 if x <= 10 else 20 if x <= 20 else 50 if x <= 50 else 100 if x <= 100 else 200) for x in ntests).most_common(),
               tests_q=C.quantiles(ntests), one_test=sum(x == 1 for x in ntests), gold_pass=sum(o["gold"] for o in out),
               mutants=sum(len(o["mut"]) for o in out if o["gold"]), survived=len(surv), by_kind=by_kind,
               by_ntests=by_ntests, problems_with_survivor=sum(1 for o in out if o["gold"] and any(m["survived"] for m in o["mut"])),
               survivors=[dict(p=o["p"], kind=m["kind"], n_tests=o["n_tests"], n_tests_all=info[o["p"]]["n_tests_all"],
                               source=info[o["p"]]["source"], url=info[o["p"]]["url"]) for o, m in surv])
    json.dump(dict(res=res, info={str(k): v for k, v in info.items()}, out=out),
              open(os.path.join(C.scratch(), "code_full.json"), "w"))
    C.save_out("code.json", res)
    print(json.dumps({k: res[k] for k in ("gold_pass", "mutants", "survived", "problems_with_survivor")}))


if __name__ == "__main__":
    main()
