"""Predict-the-output drills. Each snippet runs in a fresh namespace; what it prints (or the
exception it ends with) is recorded as the answer. This page shows the two asyncio drills as prediction prompts (copied from the language page, trimmed to them)."""
import contextlib, io, json, sys, traceback

DRILLS = [
 ("async", "Coroutine never awaited", "import asyncio\nasync def f():\n    print('ran')\n    return 1\nr = f()\nprint(type(r).__name__)\nr.close()"),
 ("async", "gather keeps argument order", "import asyncio\nasync def f(n):\n    await asyncio.sleep(n / 100)\n    print('done', n)\n    return n\nasync def main():\n    print(await asyncio.gather(f(3), f(1), f(2)))\nasyncio.run(main())"),
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
