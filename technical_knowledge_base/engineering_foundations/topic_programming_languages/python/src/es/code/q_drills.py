"""Predict-the-output drills kept on "Python: the essentials" (the three "names" drills of the language page's
Predict tab, 2026-10-05; the other drills live on the child that teaches each). Each snippet runs in a fresh
namespace; what it prints (or the exception it ends with) is recorded as the answer."""
import contextlib, io, json, sys

DRILLS = [
 ("names", "Aliasing", "a = [1, 2]\nb = a\na += [3]\nprint(b)"),
 ("names", "Default argument", "def f(x, seen=[]):\n    seen.append(x)\n    return len(seen)\nprint(f('a'), f('b'), f('c', []), f('d'))"),
 ("names", "is with strings", "import sys\na = 'model'\nb = ''.join(['mod', 'el'])\nprint(a == b, a is b, a is sys.intern(b))"),
]

out = []
for topic, title, code in DRILLS:
    buf = io.StringIO()
    ns = {}
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        try:
            exec(compile(code, "<drill>", "exec"), ns)
        except BaseException as e:
            print(f"{type(e).__name__}: {e}")
    out.append({"topic": topic, "title": title, "code": code, "out": buf.getvalue().rstrip("\n")})
json.dump(out, sys.stdout, indent=1, ensure_ascii=False)
print()
