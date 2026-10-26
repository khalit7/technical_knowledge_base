"""Predict-the-output drills. Each snippet runs in a fresh namespace; what it prints (or the
exception it ends with) is recorded as the answer. This page shows the two CPython-internals drills as prediction prompts (trimmed from the language page, 2026-10-26)."""
import contextlib, io, json, sys, traceback

DRILLS = [
 ("internals", "Integer caching", "a = 1000\nb = 999 + int('1')\nprint(a == b, a is b, 10 is 5 + 5)"),
 ("internals", "Float arithmetic", "print(0.1 + 0.2 == 0.3, round(2.5), round(3.5), 7 // -2, -7 % 3)"),
]

out = []
for topic, title, code in DRILLS:
    buf = io.StringIO()
    ns = {}
    with contextlib.redirect_stdout(buf), contextlib.redirect_stderr(buf):
        try:
            exec(compile(code, "<drill>", "exec"), ns)   # warnings, if any, are part of the answer
        except BaseException as e:
            print(f"{type(e).__name__}: {e}")
    out.append({"topic": topic, "title": title, "code": code, "out": buf.getvalue().rstrip("\n")})
json.dump(out, sys.stdout, indent=1, ensure_ascii=False)
print()
