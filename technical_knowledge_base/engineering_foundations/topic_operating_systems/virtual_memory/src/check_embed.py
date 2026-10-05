"""Check that ../index.html embeds exactly the data gen_data.py derives from raw/, and that every number written
into the prose agrees with that data. Run after build.sh. Exit 1 on any mismatch."""
import json, re, subprocess, sys, pathlib
html = pathlib.Path("../index.html").read_text()
m = re.search(r"window\.VM_DATA=(\{.*?\});\n", html, re.S); emb = json.loads(m.group(1))
subprocess.run([sys.executable, "gen_data.py"], check=True, capture_output=True)
s = pathlib.Path("parts/22_js_data.js").read_text(); D = json.loads(s[s.index("=") + 1:s.rstrip().rindex(";")])
bad = 0
if emb != D: print("EMBEDDED DATA DIFFERS from gen_data.py output: rebuild"); bad += 1
else: print("embedded data == gen_data.py(raw/)")
text = re.sub(r"<[^>]+>", " ", html)
fk = {(x["kind"], x["mib"]): x["us"] for x in D["fork"]}
J = D["job"]; mib = lambda k: round(sum(p[k] for p in J) / 1024)
useful = 20000 * 1028 / 2**20
C = D["commit"]
checks = [
  ("2,052 KiB of tables per GiB", f"{D['pte']['4k']:,}" == "2,052"),
  ("fork of 1 GiB: 19.8 ms", f"{fk[('4k',1024)]/1000:.1f}" == "19.8"),
  ("one copy about 3.3 us", f"{D['cow_write']['4k']['ns_per_page']/1000:.1f}" == "3.3"),
  ("512x fewer faults", D["first_write"]["4k"]["faults"] // D["first_write"]["thp"]["faults"] == 512),
  ("298x more memory", round(D["bloat"]["thp"] / D["bloat"]["4k"]) == 298),
  ("815 MiB of RSS", mib("rss") == 815), ("345 MiB of PSS", mib("pss") == 345), ("104 MiB of USS", mib("uss") == 104),
  ("13x read amplification", round(D["rows"]["mmap_cold"]["read_mib"] / useful) == 13),
  ("3.4x amplification", f"{D['rows']['mmap_random_cold']['read_mib']/useful:.1f}" == "3.4"),
  ("15,732 pages copied by reading", D["cow_gc"]["touch"] == 15732), ("16,817 by gc.collect", D["cow_gc"]["collect"] == 16817),
  ("30 pages after gc.freeze", D["cow_gc"]["collect_frozen"] == 30), ("63 pages numpy", D["cow_gc"]["numpy"] == 63),
  ("CommitLimit formula 6,143,562", C["MemTotal_kb"] * 50 // 100 + C["SwapTotal_kb"] == 6143562),
  ("11.6 times CommitLimit", f"{C['after_kb']/C['CommitLimit_kb']:.1f}" == "11.6"),
  ("about 1 us per fault", round(D["first_write"]["4k"]["ms_median"] * 1000 / D["first_write"]["4k"]["faults"]) == 1),
  ("129 minor faults (root warm)", D["root_faults"]["warm"][0]["minor"] == 129),
  ("about 19 us per resident MiB", round((fk[('4k',1024)] - fk[('4k',0)]) / 1024) == 19),
  ("30x cheaper at 1 GiB", round(fk[('4k',1024)] / fk[('thp',1024)]) == 30),
  ("65,538 faults THP CoW", D["cow_write"]["thp"]["faults"] == 65538),
  ("about 260 MiB in swap", 250 <= sorted(x[5] for x in D["cg"]["swap"]["samples"] if x[2] > 300 * 1024)[len([x for x in D["cg"]["swap"]["samples"] if x[2] > 300 * 1024]) // 2] / 1024 <= 270),
  ("passes of 4 to 5 s", all(4 <= float(l.split("took ")[1].split()[0]) < 5 for l in D["cg"]["swap"]["log"] if "took" in l)),
  ("ulimit 64 KiB", "soft 64 hard 64" in D["mlock_txt"]),
  ("max_map_count 262,144", D["env"]["max_map_count"] == "262144"),
  ("456 VMAs", J[0]["vmas"] == 456),
  ("worker USS under 9 MiB", all(p["uss"] < 9 * 1024 for p in J if p["role"] == "worker")),
  ("swappiness 60, page-cluster 3", D["env"]["swappiness"] == "60" and D["env"]["page-cluster"] == "3"),
]
for lit, ok in checks:
    key = re.sub(r"^(about |one copy |fork of 1 GiB: )", "", lit).split(" ")[0]
    present = key.rstrip("x") in text
    if not ok or not present: bad += 1
    print(("ok   " if ok and present else "FAIL ") + lit + ("" if present else "  (literal not found in page)"))
for oom in D["oom"]["procs"]:
    tot = D["oom"]["memtotal_kb"] // 4 + D["oom"]["swaptotal_kb"] // 4
    b = oom["rss_pages"] + oom["vmswap_kb"] // 4 + oom["vmpte_kb"] // 4 + oom["oom_score_adj"] * (tot // 1000)
    ok = (1000 + b * 1000 // tot) * 2 // 3 == oom["oom_score"]; bad += not ok
    print(("ok   " if ok else "FAIL ") + f"oom_score {oom['oom_score']} reproduced by the formula")
print("check_embed:", "PASS" if not bad else f"{bad} FAIL"); sys.exit(1 if bad else 0)
