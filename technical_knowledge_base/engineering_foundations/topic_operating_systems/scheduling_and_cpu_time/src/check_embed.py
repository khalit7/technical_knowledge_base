"""Check that ../index.html embeds exactly the data gen_data.py derives from raw/ (recorded outputs verbatim), that the
numbers written into the prose agree with recompute.txt and the data, and that nothing private is embedded.
Run after build.sh. Exit 1 on any mismatch."""
import json, re, subprocess, sys, pathlib
html = pathlib.Path("../index.html").read_text()
m = re.search(r"window\.SC_DATA=(\{.*?\});\n", html, re.S); emb = json.loads(m.group(1))
subprocess.run([sys.executable, "gen_data.py"], check=True, capture_output=True)
subprocess.run([sys.executable, "recompute.py"], check=True, capture_output=True)
s = pathlib.Path("parts/22_js_data.js").read_text(); D = json.loads(s[s.index("=") + 1:s.rstrip().rindex(";")])
bad = 0
def ok(name, cond):
    global bad; bad += not cond; print(("ok   " if cond else "FAIL ") + name)
ok("embedded data == gen_data.py(raw/)", emb == D)
for k, v in D["RAW"].items():
    src = "".join(p.read_text() for p in pathlib.Path("raw").glob("*.txt"))
    ok(f"RAW[{k}] is a verbatim slice of raw/", v in src)
rc = pathlib.Path("recompute.txt").read_text()
text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", html))
def has(lit): return lit in text
checks = [  # (literal in the page prose, the recompute.txt line it must agree with)
  ("3.06 times the CPU, weights say 3.057", "exec ratio nice0/nice5 measured = 3.06" in rc and "weight ratio nice0/nice5 = 3.057" in rc),
  ("1.30 to 1.56 us per switch", "process switch us min, median, max = 1.30, 1.50, 1.56" in rc),
  ("29 times longer", "cross-CPU idle wake vs process switch (x, medians) = 29" in rc),
  ("stalls of 77 to 83 ms", "measured max gap per thread (ms) = 77.1, 79.2, 83.1, 79.4, 83.2" in rc),
  ("weight 39, not 100", "shares 1024 -> weight (runc 1.1 linear, cgroups v0.0.3+ quadratic) = 39, 100" in rc),
  ("from 24.2 to 34.2 ms", "step alone, with weight-39 neighbour, with weight-5 neighbour (ms) = 24.18, 34.2, 26.14" in rc),
  ("2.0 ms wake-up delay, against 44 us", "SCHED_BATCH p50/p99/max us = 1999.1" in rc and "wake 4 busy loops (nice 0) p50/p99/max us = 44.4" in rc),
  ("1024 / (1024 + 1024 + 335) = 42.97%", "share nice0 among nice 0,0,5 (each nice0) = 0.4297" in rc),
  ("9 ms each for two tasks", "CFS slice each, 2 tasks (ms) = 9.0" in rc),
  ("2.25 ms on this VM's 5 CPUs, 3 ms on machines with 8 or more", "eevdf base slice on 8+ CPUs (us) = 3000" in rc),
  ("would add 1.9 (3 × (1 - 1/e))", "1-min load from 3 constant tasks after 60 s (12 updates) = 1.9" in rc),
  ("predicted 39 / 59 = 66.1%", "weight split expected 39/(39+20) = 0.661" in rc),
  ("exactly its 2 ms per 10 ms, 20% of a CPU", "SCHED_DEADLINE measured ms in 3 s = 600" in rc),
  ("3.8 s of throttling in a 1.1 s run", "(threads 5)] nr_periods, nr_throttled, throttled_ms = 11, 11, 3822" in rc),
  ("15 / 1039 = 1.4%", round(15 / 1039 * 100, 1) == 1.4),
  ("about 6 ms of each 100 ms period", round(400 / 64) == 6),
  ("finished the same matmuls in 1.46 s instead of 2.39 s", "real 1.46 s" in D["RAW"]["acct_time"] and "real 2.39 s" in D["RAW"]["acct_time"]),
  ("ran 2.7 to 3.3 s and waited 0.11 to 0.31 s", "3330356959 309520450" in D["RAW"]["acct_schedstat"] and "2822474146 108267598" in D["RAW"]["acct_schedstat"]),
  ("3,571 involuntary switches", True), ("75.38%", True),  # quoted from the root page's Debug lab and OS simulators
]
for lit, cond in checks:
    p = has(lit); bad += not (p and cond)
    print(("ok   " if p and cond else "FAIL ") + lit + ("" if p else "  (literal not found in page)"))
for pat in ["/" + "Users/", "gl" + "pat", "sk" + "-ant"]:
    ok(f"no '{pat}' in the page or src", pat not in html and not any(pat in p.read_text(errors="ignore") for p in pathlib.Path(".").rglob("*") if p.is_file()))
print("check_embed:", "PASS" if not bad else f"{bad} FAIL"); sys.exit(1 if bad else 0)
