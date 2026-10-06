"""Edit-format bench: 13 fixed edits on 6 small files, each with a check that the result is right
and that nothing else in the file changed. A check gets the original and the new text (bytes decoded
with newline='' so CRLF survives) and returns (ok, reason)."""
import json, os, re, types

HERE = os.path.dirname(os.path.abspath(__file__))


def read(path):
    with open(os.path.join(HERE, "files", path), newline="") as f:
        return f.read()


def load_module(src, name="m"):
    mod = types.ModuleType(name)
    exec(compile(src, name, "exec"), mod.__dict__)
    return mod


def same_except(orig, new, allowed_old, allowed_new):
    """Every original line not in allowed_old survives in order; every new line not in allowed_new
    was in the original. Catches dropped or invented code around the intended change."""
    o = [l for l in orig.splitlines() if l not in allowed_old]
    n = [l for l in new.splitlines() if l not in allowed_new]
    if o != n:
        for i, (a, b) in enumerate(zip(o, n)):
            if a != b:
                return False, f"unrelated line changed near: {a.strip()[:50]!r}"
        return False, f"{abs(len(o) - len(n))} unrelated line(s) dropped or added"
    return True, "ok"


def outside(orig, new, names, extra_new=()):
    """The file with the named functions cut out must be unchanged (blank lines ignored)."""
    def cut(src, drop=()):
        for n in names:
            src = src.replace(func_src(src, n), "")
        return [l for l in src.splitlines() if l.strip() and l not in drop]
    a, b = cut(orig), cut(new, set(extra_new))
    if a == b:
        return True, "ok"
    for x, y in zip(a, b):
        if x != y:
            return False, f"unrelated line changed near: {x.strip()[:50]!r}"
    return False, f"{abs(len(a) - len(b))} unrelated line(s) dropped or added"


def func_src(src, name):
    m = re.search(rf"^def {name}\(.*?(?=^\S|\Z)", src, re.M | re.S)
    return m.group(0) if m else ""


def tc(fn):
    try:
        return fn()
    except Exception as e:
        return False, f"{type(e).__name__}: {str(e)[:80]}"


# ---------- checks
def c01(orig, new):  # keep apostrophes
    def f():
        m = load_module(new)
        if m.word_count("don't stop") != 2: return False, "apostrophe still split"
        if m.word_count("the cat sat") != 3: return False, "plain words broken"
        if m.top_words("b a b a c", n=2) != sorted(m.top_words("b a b a c", n=2), key=lambda kv: -kv[1]):
            return False, "top_words changed"
        return outside(orig, new, ["tokenize"])
    return tc(f)


def c02(orig, new):  # ties alphabetical
    def f():
        m = load_module(new)
        if m.top_words("b a b a c", n=2) != [("a", 2), ("b", 2)]: return False, "ties not alphabetical"
        if m.top_words("x y x", n=1) != [("x", 2)]: return False, "counts broken"
        return same_except(orig, new, {l for l in orig.splitlines() if "sorted(" in l},
                           {l for l in new.splitlines() if "sorted(" in l or "key=" in l})
    return tc(f)


def c03(orig, new):  # add total_value after restock
    def f():
        m = load_module(new)
        items = [m.Item("a", "A", 2.5, 4), m.Item("b", "B", 1.0, 3)]
        if abs(m.total_value(items) - 13.0) > 1e-9: return False, "total_value wrong"
        if new.index("def total_value") < new.index("def restock") or new.index("def total_value") > new.index("def sell"):
            return False, "total_value not placed after restock"
        return outside(orig, new, ["total_value"])
    return tc(f)


def c04(orig, new):  # apply_discount validates percent
    def f():
        m = load_module(new)
        it = m.Item("a", "A", 10.0, 1)
        if m.apply_discount(it, 25).price != 7.5: return False, "discount math changed"
        for bad in (-1, 101):
            try:
                m.apply_discount(m.Item("a", "A", 10.0, 1), bad); return False, f"percent {bad} accepted"
            except ValueError:
                pass
        if m.apply_discount(m.Item("a", "A", 10.0, 1), 100).price != 0.0: return False, "100 rejected"
        return outside(orig, new, ["apply_discount"])
    return tc(f)


def c05(orig, new):  # monthly separators only
    def f():
        w, mo = func_src(new, "format_weekly"), func_src(new, "format_monthly")
        if w.count('"-" * 40') != 2: return False, "weekly separators changed"
        if mo.count('"=" * 40') != 2 or '"-" * 40' in mo: return False, "monthly separators not both changed"
        return same_except(orig, new, {'    lines.append("-" * 40)'}, {'    lines.append("-" * 40)', '    lines.append("=" * 40)'})
    return tc(f)


def c06(orig, new):  # rename _fmt_money -> format_money
    def f():
        if "_fmt_money" in new: return False, f"{new.count('_fmt_money')} old name(s) left"
        if new.count("format_money") != 7: return False, f"format_money appears {new.count('format_money')} times, expected 7"
        if new.replace("format_money", "_fmt_money") != orig: return False, "other text changed"
        load_module(new)
        return True, "ok"
    return tc(f)


def c07(orig, new):  # Makefile test recipe, tab kept
    def f():
        lines = new.split("\n")
        i = lines.index("test:")
        if lines[i + 1] != "\t$(PYTHON) tests/test_core.py":
            if lines[i + 1].strip() == "$(PYTHON) tests/test_core.py":
                return False, "recipe lost its tab (make would fail: missing separator)"
            return False, f"recipe is {lines[i + 1]!r}"
        return same_except(orig, new, {"\t$(PYTHON) -m pytest -q"}, {"\t$(PYTHON) tests/test_core.py"})
    return tc(f)


def c08(orig, new):  # export_rows default limit 20 (end of a long file)
    def f():
        m = load_module(new)
        import inspect
        if inspect.signature(m.export_rows).parameters["limit"].default != 20: return False, "default not 20"
        return same_except(orig, new, {"def export_rows(sales, limit=10):"}, {"def export_rows(sales, limit=20):"})
    return tc(f)


def c09(orig, new):  # delete legacy_import
    def f():
        m = load_module(new)
        if hasattr(m, "legacy_import"): return False, "legacy_import still there"
        if not hasattr(m, "low_stock") or not hasattr(m, "apply_discount"): return False, "a neighbour was deleted"
        return outside(orig, new, ["legacy_import"])
    return tc(f)


def c10(orig, new):  # database.timeout 60, others stay
    def f():
        d = json.loads(new)
        if d["database"]["timeout"] != 60: return False, "database.timeout not 60"
        if d["http"]["timeout"] != 30 or d["cache"]["timeout"] != 30: return False, "another timeout changed"
        o = json.loads(orig); o["database"]["timeout"] = 60
        if d != o: return False, "other settings changed"
        return True, "ok"
    return tc(f)


def c11(orig, new):  # CRLF file constant
    def f():
        m = load_module(new.replace("\r\n", "\n"))
        if m.INCH_TO_CM != 2.54: return False, "INCH_TO_CM not 2.54"
        if new.count("\n") != new.count("\r\n"): return False, "line endings changed (CRLF lost on some lines)"
        return same_except(orig.replace("\r\n", "\n"), new.replace("\r\n", "\n"), {"INCH_TO_CM = 2.5"}, {"INCH_TO_CM = 2.54"})
    return tc(f)


def c12(orig, new):  # sell rejects zero, restock unchanged
    def f():
        m = load_module(new)
        items = [m.Item("a", "A", 1.0, 5)]
        try:
            m.restock(items, "a", 0)  # restock must still accept 0
        except ValueError:
            return False, "restock now rejects 0 (the edit landed in the wrong function)"
        try:
            m.sell(items, "a", 0); return False, "sell accepted 0"
        except ValueError:
            pass
        if m.sell(items, "a", 2).qty != 3: return False, "sell broken"
        return outside(orig, new, ["sell"])
    return tc(f)


def c13(orig, new):  # logging in two places
    def f():
        if not re.search(r"^import logging$", new, re.M): return False, "no import logging"
        if not re.search(r"^(log|logger|LOG|LOGGER|_log|_logger) = logging\.getLogger\(__name__\)$", new, re.M):
            return False, "no module-level logger"
        body = func_src(new, "restock")
        if not re.search(r"\.(info|warning|debug)\(", body): return False, "restock does not log"
        m = load_module(new)
        items = [m.Item("a", "A", 1.0, 5)]
        if m.restock(items, "a", 2).qty != 7: return False, "restock broken"
        return outside(orig, new, ["restock"], [l for l in new.splitlines() if "logging" in l])
    return tc(f)


TASKS = [
    ("t01", "textstats/core.py", "tokenize drops apostrophes, so \"don't\" becomes two words. Make tokenize keep apostrophes inside words, as its docstring says.", c01),
    ("t02", "textstats/core.py", "top_words must break ties alphabetically, as its docstring says. Fix the sort.", c02),
    ("t03", "shop/inventory.py", "Add a function total_value(items) right after restock that returns the sum of price * qty over all items.", c03),
    ("t04", "shop/inventory.py", "apply_discount must raise ValueError when percent is below 0 or above 100 (0 and 100 are allowed).", c04),
    ("t05", "shop/report.py", "In format_monthly only, draw both separator lines with \"=\" instead of \"-\". format_weekly must not change.", c05),
    ("t06", "shop/report.py", "Rename the helper _fmt_money to format_money everywhere in this file (its definition and every call).", c06),
    ("t07", "Makefile", "Make the test target run $(PYTHON) tests/test_core.py instead of pytest.", c07),
    ("t08", "shop/report.py", "Change the default limit of export_rows from 10 to 20.", c08),
    ("t09", "shop/inventory.py", "Delete the function legacy_import; nothing uses it any more.", c09),
    ("t10", "config/settings.json", "Raise the database timeout from 30 to 60. The other timeouts stay at 30.", c10),
    ("t11", "legacy/units.py", "INCH_TO_CM is wrong: set it to 2.54.", c11),
    ("t12", "shop/inventory.py", "sell must also reject amount == 0 (raise ValueError). restock must keep accepting 0.", c12),
    ("t13", "shop/inventory.py", "Add logging: import logging at the top, create a module-level logger = logging.getLogger(__name__), and make restock log the sku and amount at info level.", c13),
]
