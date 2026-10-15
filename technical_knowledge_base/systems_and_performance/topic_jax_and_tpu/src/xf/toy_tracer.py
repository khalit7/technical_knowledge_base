"""A toy JAX in about 30 lines: a tracer that records a program, then three interpreters over that
program (evaluate, forward-mode derivative, batch). Scalars only, three primitives. Checked against
jax.make_jaxpr, jax.jvp and jax.vmap on the same function. Output: out/toy.json (code and printed output)."""
import contextlib
import inspect
import io
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import xfcommon as X  # noqa: E402

# ---- TOY START
import math


class Tracer:                                    # stands in for a value; records what is done to it
    def __init__(self, eqns, name):
        self.eqns, self.name = eqns, name

    def bind(self, prim, *args):                 # every operation lands here, as in jax's Primitive.bind
        out = Tracer(self.eqns, "v%d" % len(self.eqns))
        self.eqns.append((out.name, prim, [a.name if isinstance(a, Tracer) else a for a in args]))
        return out

    __add__ = __radd__ = lambda s, o: s.bind("add", s, o)
    __mul__ = __rmul__ = lambda s, o: s.bind("mul", s, o)


def tanh(x):
    return x.bind("tanh", x) if isinstance(x, Tracer) else math.tanh(x)


def make_jaxpr(f, n_args):                       # trace once: the program is the record
    eqns = []
    out = f(*[Tracer(eqns, "x%d" % i) for i in range(n_args)])
    return {"in": ["x%d" % i for i in range(n_args)], "eqns": eqns, "out": out.name}


def interpret(jaxpr, rules, *args):              # one interpreter, many meanings
    env = dict(zip(jaxpr["in"], args))
    for out, prim, ins in jaxpr["eqns"]:
        env[out] = rules[prim](*[env.get(a, a) for a in ins])
    return env[jaxpr["out"]]


EVAL = {"add": lambda a, b: a + b, "mul": lambda a, b: a * b, "tanh": math.tanh}
lift = lambda a: a if isinstance(a, tuple) else (a, 0.0)   # a constant has tangent 0
JVP = {"add": lambda a, b: (lift(a)[0] + lift(b)[0], lift(a)[1] + lift(b)[1]),
       "mul": lambda a, b: (lift(a)[0] * lift(b)[0], lift(a)[1] * lift(b)[0] + lift(a)[0] * lift(b)[1]),
       "tanh": lambda a: (math.tanh(a[0]), a[1] * (1 - math.tanh(a[0]) ** 2))}


def batched(f):                                  # vmap rule for an elementwise primitive
    def rule(*args):
        n = max(len(a) for a in args if isinstance(a, list))
        cols = [a if isinstance(a, list) else [a] * n for a in args]   # an unbatched value is broadcast
        return [f(*z) for z in zip(*cols)]
    return rule


VMAP = {p: batched(f) for p, f in EVAL.items()}
# ---- TOY END


def f(x, w):
    return tanh(x * w + 1.0) * x


if __name__ == "__main__":
    import jax
    import jax.numpy as jnp

    src = inspect.getsource(sys.modules[__name__])
    toy = src.split("# ---- TOY START\n")[1].split("# ---- TOY END")[0].strip("\n")
    buf = io.StringIO()
    with contextlib.redirect_stdout(buf):
        jp = make_jaxpr(f, 2)
        for e in jp["eqns"]:
            print("%s = %s %s" % (e[0], e[1], " ".join(map(str, e[2]))))
        print("eval    f(0.5, 2.0)            =", round(interpret(jp, EVAL, 0.5, 2.0), 6))
        print("jvp     d/dx f at (0.5, 2.0)   =", round(interpret(jp, JVP, (0.5, 1.0), (2.0, 0.0))[1], 6))
        print("vmap    f([0.5, 1, 2], 2.0)    =", [round(v, 6) for v in interpret(jp, VMAP, [0.5, 1.0, 2.0], 2.0)])
    toy_out = buf.getvalue()

    def fj(x, w):
        return jnp.tanh(x * w + 1.0) * x

    buf2 = io.StringIO()
    with contextlib.redirect_stdout(buf2):
        print(jax.make_jaxpr(fj)(0.5, 2.0))
        print("jax eval  =", round(float(fj(0.5, 2.0)), 6))
        print("jax.jvp   =", round(float(jax.jvp(fj, (0.5, 2.0), (1.0, 0.0))[1]), 6))
        print("jax.vmap  =", [round(float(v), 6) for v in jax.vmap(fj, in_axes=(0, None))(jnp.array([0.5, 1.0, 2.0]), 2.0)])
    print(toy_out, buf2.getvalue())
    code_lines = [ln for ln in toy.splitlines() if ln.strip() and not ln.strip().startswith("#")]
    X.save("toy", {"toy_code": toy, "f_code": inspect.getsource(f), "toy_out": toy_out, "jax_out": buf2.getvalue(),
                   "code_lines": len(code_lines), "versions": X.versions()})
