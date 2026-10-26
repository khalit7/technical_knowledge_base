"""Check every number this page writes in static text against the recorded outputs (src/pb/out, src/pa/outputs),
and that window.PB in the built page equals the data the outputs give now. Run from anywhere: python3 src/check_numbers.py"""
import html, json, re, subprocess, sys
from pathlib import Path
HERE = Path(__file__).resolve().parent
page = html.unescape(re.sub(r"<[^>]+>", "", (HERE.parent / "index.html").read_text()))
page = re.sub(r"\s+", " ", page)
O = HERE / "pb" / "out"; A = HERE / "pa" / "outputs"
bad = 0
def want(s, why):
    global bad
    if s not in page: print("MISSING", why, repr(s)); bad += 1
la = lambda a: " / ".join(f"{x:.1f}" for x in a)
ts = json.loads((O / "typespeed.json").read_text()); r = {x["name"]: x["median_s"] for x in ts["runs"]}
want(f"medians ty {r['ty']:.3f} s, mypy {r['mypy (no cache)']:.3f} s without its cache and {r['mypy (warm cache)']:.3f} s with it, pyright {r['pyright']:.3f} s; load average {la(ts['loadavg'])}", "type checker speed")
want(f"{ts['files']} files, {ts['lines']:,} lines", "rich size")
for k in ("ty", "mypy", "pyright"): want(ts["summary"][k], "checker summary " + k)
ins = json.loads((O / "install_speed.json").read_text()); R = ins["runs"]; p0, c, w = (x["median_s"] for x in R)
want(f"pip {p0:.2f} s, uv with an empty cache {c:.2f} s ({p0/c:.1f}x faster), uv with a warm cache {w:.2f} s ({p0/w:.0f}x)", "install speed")
want(f"load average {la(ins['loadavg'])}", "install load")
t = json.loads((O / "types.json").read_text())["runs"]
allthree = sum(all(v[k]["rc"] != 0 for k in ("ty", "mypy", "pyright")) for v in t.values())
none = [k for k, v in t.items() if all(v[c]["rc"] == 0 for c in ("ty", "mypy", "pyright"))]
only = [k for k, v in t.items() if [c for c in ("ty", "mypy", "pyright") if v[c]["rc"] != 0] == ["pyright"]]
ok = allthree == 6 and none == ["t4_unannotated"] and only == ["t5_unbound"]
print("types: 6 of 8 by all three, unannotated by none, unbound by pyright only:", ok); bad += not ok
wh = json.loads((O / "wheels.json").read_text())["pkgs"]["numpy"]
want(f"numpy {wh['version']} publishes {wh['wheels']} wheels", "numpy wheels")
# the five-mistakes table against the three outputs
my, ty, py = (A / "t1_mypy.txt").read_text(), (A / "t1_ty.txt").read_text(), (A / "t1_types.txt").read_text()
for code in ("[typeddict-item]", "[assignment]", "[index]", "[list-item]"): ok = code in my; bad += not ok; print("mypy", code, ok)
for code in ("error[invalid-argument-type]", "error[invalid-assignment]", "error[not-subscriptable]"): ok = code in ty; bad += not ok; print("ty", code, ok)
ok = ":46:" not in my and ":46:" not in ty and "TypeError: can only concatenate str (not \"int\") to str" in py and "hello there" in py
print("mistake 4 silent in both checkers, crash and 'hello there' at run time:", ok); bad += not ok
for f in ("t1_types", "t1_mypy", "t1_ty"):
    ok = (A / f"{f}.txt").read_text().rstrip("\n").split("\n")[-1] in page; bad += not ok; print("output shown:", f, ok)
e = subprocess.run([sys.executable, str(HERE / "pb" / "check_embed.py")], capture_output=True, text=True)
print(e.stdout.strip()); bad += e.returncode != 0
print("ALL OK" if not bad else f"{bad} PROBLEMS"); sys.exit(1 if bad else 0)
