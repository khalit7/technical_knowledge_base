"""Predict-the-output drills. Each snippet runs in a fresh namespace; what it prints (or the
exception it ends with) is recorded as the answer. The Predict tab shows these answers."""
import contextlib, io, json, sys, traceback

DRILLS = [
 ("names", "Aliasing", "a = [1, 2]\nb = a\na += [3]\nprint(b)"),
 ("names", "+= on a tuple vs a list", "a = (1, 2)\nb = a\na += (3,)\nprint(a, b)"),
 ("names", "Multiplying a nested list", "grid = [[]] * 3\ngrid[0].append('x')\nprint(grid)"),
 ("names", "Default argument", "def f(x, seen=[]):\n    seen.append(x)\n    return len(seen)\nprint(f('a'), f('b'), f('c', []), f('d'))"),
 ("names", "is with strings", "import sys\na = 'model'\nb = ''.join(['mod', 'el'])\nprint(a == b, a is b, a is sys.intern(b))"),
 ("data model", "== without __eq__", "class P:\n    def __init__(self, x): self.x = x\nprint(P(1) == P(1), len({P(1), P(1)}))"),
 ("data model", "__eq__ without __hash__", "class P:\n    def __init__(self, x): self.x = x\n    def __eq__(self, o): return self.x == o.x\nprint({P(1)})"),
 ("data model", "bool of containers", "print(bool([]), bool([0]), bool(''), bool(' '), bool(0.0), bool(None))"),
 ("data model", "Chained comparison", "print(1 < 2 < 3, 3 > 2 > 1 == 1, (1 < 2) < 3, 1 == 1.0 == True)"),
 ("data model", "Dict keys that are equal", "d = {1: 'int', 1.0: 'float', True: 'bool'}\nprint(d)"),
 ("iterators", "A generator used twice", "g = (x * 2 for x in range(3))\nprint(list(g), list(g))"),
 ("iterators", "zip stops at the shortest", "print(list(zip('abc', [1, 2])))\ntry:\n    print(list(zip('abc', [1, 2], strict=True)))\nexcept ValueError as e:\n    print('ValueError:', e)"),
 ("iterators", "map is lazy", "calls = []\nm = map(calls.append, [1, 2, 3])\nprint(calls)\nlist(m)\nprint(calls)"),
 ("functions", "Late binding", "fs = []\nfor i in range(3):\n    fs.append(lambda: i * 10)\nprint([f() for f in fs])"),
 ("functions", "Closure assignment", "x = 1\ndef f():\n    print(x)\n    x = 2\nf()"),
 ("functions", "Decorator order", "def tag(t):\n    def deco(fn):\n        return lambda: f'<{t}>' + fn() + f'</{t}>'\n    return deco\n@tag('b')\n@tag('i')\ndef hi(): return 'hi'\nprint(hi())"),
 ("classes", "Class attribute vs instance attribute", "class C:\n    n = 0\n    def bump(self): self.n += 1\na, b = C(), C()\na.bump(); a.bump()\nprint(a.n, b.n, C.n)"),
 ("classes", "super() follows the MRO", "class A:\n    def who(self): return 'A'\nclass B(A):\n    def who(self): return 'B' + super().who()\nclass C(A):\n    def who(self): return 'C' + super().who()\nclass D(B, C):\n    def who(self): return 'D' + super().who()\nprint(D().who())"),
 ("classes", "__slots__", "class S:\n    __slots__ = ('x',)\ns = S()\ns.x = 1\ns.y = 2"),
 ("exceptions", "finally and return", "def f():\n    try:\n        return 'try'\n    finally:\n        print('finally runs first')\nprint(f())"),
 ("exceptions", "Catching Exception", "import asyncio\nfor exc in (ValueError, KeyboardInterrupt, asyncio.CancelledError, SystemExit):\n    try:\n        try:\n            raise exc()\n        except Exception:\n            print(exc.__name__, 'caught by except Exception')\n    except BaseException:\n        print(exc.__name__, 'NOT caught by except Exception')"),
 ("exceptions", "else after a loop", "for n in [3, 5, 7]:\n    if n % 2 == 0:\n        print('found even'); break\nelse:\n    print('no break happened')"),
 ("async", "Coroutine never awaited", "import asyncio\nasync def f():\n    print('ran')\n    return 1\nr = f()\nprint(type(r).__name__)\nr.close()"),
 ("async", "gather keeps argument order", "import asyncio\nasync def f(n):\n    await asyncio.sleep(n / 100)\n    print('done', n)\n    return n\nasync def main():\n    print(await asyncio.gather(f(3), f(1), f(2)))\nasyncio.run(main())"),
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
