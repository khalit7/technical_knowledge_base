"""Check that ../index.html embeds exactly what gen_data.py derives from raw/, that the numbers written into the prose
are present and agree with that data (recompute.py checks the arithmetic), and that nothing private is in the page or
src/. Run after build.sh. Exit 1 on any mismatch."""
import json, re, subprocess, sys, pathlib
html = pathlib.Path("../index.html").read_text()
m = re.search(r"window\.CT_DATA=(\{.*?\});\n", html, re.S); emb = json.loads(m.group(1))
subprocess.run([sys.executable, "gen_data.py"], check=True, capture_output=True)
s = pathlib.Path("parts/22_js_data.js").read_text(); D = json.loads(s[s.index("=") + 1:s.rstrip().rindex(";")])
bad = 0
if emb != D: print("EMBEDDED DATA DIFFERS from gen_data.py output: rebuild"); bad += 1
else: print("embedded data == gen_data.py(raw/)")
text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"<(script|style)\b.*?</\1>", " ", html, flags=re.S)))
# literals written in the prose; each is checked against the data by recompute.py
for lit in ["3 to 5 microseconds", "a network namespace took 2.4 ms", "roughly 500 times more", "about 19 microseconds", "the IPC namespace about 43",
            "(0.24 to 0.27 s, exit 143)", "saved it in 1.3 to 1.9 s", "10.28 s and 137", "Python got PID 7, not 1",
            "OOM-killed at 190 MiB", "it hung for the full 60 s", "finished in 0.3 s", "changed the answer for 7 of the 12 calls probed, five of which worked without it",
            "264 MB", "took 626 ms here", "1 CPU gives 39 under runc 1.1, 100 under newer runc", "64 KiB allows 8", "about a tenth",
            "about 1% of", "23 mounts here", "recorded max 1"]:
    ok = lit in text
    if not ok: bad += 1
    print(("ok   " if ok else "FAIL ") + "literal: " + lit)
# spot checks of the literals against the data
checks = [("19 us mount", round(next(r["med"] for r in D["nscost"] if r["k"] == "mnt")) == 19),
          ("43 us ipc", round(next(r["med"] for r in D["nscost"] if r["k"] == "ipc")) == 43),
          ("23 mounts", D["mini"][0]["kv"]["mounts"] == "23"),
          ("pids.events max 1", "pids.events: max 1" in D["mini"][-1]["out"]),
          ("20.4 MB/s", D["io"][1]["rate"] == "20.4 MB/s"),
          ("264 MB file", "264375472 bytes" in D["image_txt"])]
for name, ok in checks:
    if not ok: bad += 1
    print(("ok   " if ok else "FAIL ") + name)
r = subprocess.run([sys.executable, "recompute.py"], capture_output=True, text=True)
print("recompute.py:", r.stdout.strip().splitlines()[-1]); bad += r.returncode != 0
# privacy
for pat in ["/" + "Users/", "gl" + "pat", "sk-" + "ant", "scratch" + "pad"]:
    hits = [str(p) for p in [pathlib.Path("../index.html"), pathlib.Path("../README.md"), *pathlib.Path(".").rglob("*")] if p.is_file() and p.suffix in (".html", ".txt", ".py", ".sh", ".js", ".md", ".mjs", ".c", ".json", "") and pat in p.read_text(errors="ignore")]
    if hits: bad += 1; print("FAIL private pattern", pat, hits)
print("check_embed:", "PASS" if not bad else f"{bad} FAIL"); sys.exit(1 if bad else 0)
