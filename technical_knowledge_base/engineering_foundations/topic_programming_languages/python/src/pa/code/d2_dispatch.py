"""Run each data-model scenario and record which special methods Python called, in order.
The Data model tab replays these traces; everything in them is printed by real calls."""
import json, sys

LOG = []
def log(msg):
    LOG.append(msg)

def scenario(fn):
    LOG.clear()
    try:
        r = fn()
        LOG.append(f"result: {r!r}")
    except Exception as e:
        LOG.append(f"raises {type(e).__name__}: {e}")
    return list(LOG)

out = {}

# 1. a + b, both A, A.__add__ handles it
class A:
    def __init__(self, n): self.n = n
    def __repr__(self): return f"{type(self).__name__}({self.n})"
    def __add__(self, o):
        log(f"call {type(self).__name__}.__add__({self!r}, {o!r})")
        if not isinstance(o, A): log("  -> NotImplemented"); return NotImplemented
        return A(self.n + o.n)
    def __radd__(self, o):
        log(f"call {type(self).__name__}.__radd__({self!r}, {o!r})")
        if isinstance(o, int): return type(self)(self.n + o)
        log("  -> NotImplemented"); return NotImplemented
out["add_same"] = scenario(lambda: A(1) + A(2))
# 2. left side gives up: int + A
out["add_reflected"] = scenario(lambda: 5 + A(2))
# 3. subclass on the right that overrides __radd__ goes FIRST
class B(A):
    def __radd__(self, o):
        log(f"call B.__radd__({self!r}, {o!r})")
        return B(self.n + o.n + 100)
out["add_subclass"] = scenario(lambda: A(1) + B(2))
# 4. nobody handles it
class C:
    def __repr__(self): return "C()"
out["add_fail"] = scenario(lambda: A(1) + C())

# 5. == with NotImplemented on both sides falls back to identity
class E:
    def __init__(self, n): self.n = n
    def __repr__(self): return f"E({self.n})"
    def __eq__(self, o):
        log(f"call E.__eq__({self!r}, {o!r})")
        if not isinstance(o, E): log("  -> NotImplemented"); return NotImplemented
        return self.n == o.n
out["eq_fallback"] = scenario(lambda: E(1) == "1")
out["eq_same"] = scenario(lambda: E(1) == E(1))

# 6. defining __eq__ without __hash__ makes instances unhashable
out["hash_none"] = scenario(lambda: (log(f"# E.__dict__['__hash__'] is {E.__dict__['__hash__']!r}"), hash(E(1)))[1])

# 7. len() looks __len__ up on the TYPE, never on the instance
class L:
    def __len__(self):
        log("call L.__len__"); return 3
x = L()
x.__len__ = lambda: 99
out["len_type"] = scenario(lambda: (log("# x.__len__ = lambda: 99 was set on the instance"), len(x))[1])
class Neg:
    def __len__(self):
        log("call Neg.__len__ -> -1"); return -1
out["len_negative"] = scenario(lambda: len(Neg()))

# 8. bool() falls back to __len__, then to True
class OnlyLen:
    def __len__(self):
        log("call OnlyLen.__len__ -> 0"); return 0
class Nothing: pass
out["bool_len"] = scenario(lambda: bool(OnlyLen()))
out["bool_default"] = scenario(lambda: (log("# class Nothing has no __bool__ and no __len__"), bool(Nothing()))[1])

# 9. iteration falls back to the old __getitem__ protocol
class Old:
    def __getitem__(self, i):
        log(f"call Old.__getitem__({i})")
        if i >= 3: log("  -> raises IndexError: iteration stops"); raise IndexError(i)
        return i * 10
out["iter_getitem"] = scenario(lambda: list(Old()))

# 10. `in` without __contains__ scans __iter__
class It:
    def __iter__(self):
        log("call It.__iter__")
        for v in (1, 2, 3):
            log(f"  yields {v}"); yield v
out["contains_iter"] = scenario(lambda: 2 in It())

# 11. with: __enter__, body, __exit__ (a true return value swallows the exception)
class Ctx:
    def __init__(self, swallow): self.swallow = swallow
    def __enter__(self):
        log("call Ctx.__enter__"); return "resource"
    def __exit__(self, et, ev, tb):
        log(f"call Ctx.__exit__({et.__name__ if et else None}, {ev!r}, tb) -> {self.swallow}")
        return self.swallow
def body(swallow):
    with Ctx(swallow) as r:
        log(f"body: r = {r!r}; raise ValueError('boom')")
        raise ValueError("boom")
    return "after the with"
out["with_propagate"] = scenario(lambda: body(False))
out["with_swallow"] = scenario(lambda: body(True))

# 12. attribute lookup order: data descriptor > instance __dict__ > non-data descriptor/class attr > __getattr__
class Data:
    def __get__(self, obj, owner): log(f"call Data.__get__(o, {owner.__name__})"); return "from data descriptor"
    def __set__(self, obj, v): log("Data.__set__")
class NonData:
    def __get__(self, obj, owner): log(f"call NonData.__get__(o, {owner.__name__})"); return "from non-data descriptor"
class K:
    d = Data()
    nd = NonData()
    plain = "class attribute"
    def __getattr__(self, name):
        log(f"normal lookup failed: call K.__getattr__({name!r})"); return f"made up for {name}"
o = K()
o.__dict__.update(d="instance dict d", nd="instance dict nd")
out["attr_data"] = scenario(lambda: o.d)
out["attr_instance"] = scenario(lambda: (log("# o.__dict__ has 'nd'; NonData has no __set__"), o.nd)[1])
out["attr_class"] = scenario(lambda: (log("# 'plain' is a str on the class, not in o.__dict__"), o.plain)[1])
out["attr_getattr"] = scenario(lambda: o.missing)

json.dump(out, sys.stdout, indent=1)
print()
