"""Parse raw/*.txt into parts/22_js_data.js (window.VM_DATA). Every number the page shows comes from here."""
import json, re, statistics as st, pathlib
R = pathlib.Path("raw")
def kv(line):
    toks = line.split(); d = {}
    for i in range(len(toks) - 1):
        if re.fullmatch(r"-?[0-9.]+", toks[i + 1]) and not re.fullmatch(r"-?[0-9.]+", toks[i]):
            d[toks[i]] = float(toks[i + 1])
    return d
D = {}
v = (R / "vmlab.txt").read_text().splitlines()
med = lambda xs: round(st.median(xs), 2)
fw = {k: [kv(l) for l in v if l.startswith(f"first_write {k} ")] for k in ("4k", "thp")}
D["first_write"] = {k: {"faults": int(fw[k][-1]["faults"]), "ms_runs": [x["ms"] for x in fw[k]], "ms_median": med([x["ms"] for x in fw[k]]),
                        "rss_kb": int(fw[k][-1]["rss_delta_kb"])} for k in fw}
rw = [kv(l) for l in v if l.startswith("read_then_write")]
D["zero_page"] = {"read_faults": int(rw[0]["read_faults"]), "read_ms": med([x["read_ms"] for x in rw]), "rss_after_read_kb": int(rw[0]["rss_after_read_kb"]),
                  "write_faults": int(rw[0]["write_faults"]), "write_ms": med([x["write_ms"] for x in rw])}
po = [kv(l) for l in v if l.startswith("populate")]
D["populate"] = {"mmap_ms": med([x["mmap_ms"] for x in po]), "faults_during_mmap": int(po[0]["faults_during_mmap"]), "write_ms": med([x["write_ms"] for x in po])}
D["bloat"] = {k: int(kv(l)["rss_delta_kb"]) for l in v if l.startswith("bloat") for k in [l.split()[1]]}
D["pte"] = {l.split()[1]: int(kv(l)["vmpte_delta_kb"]) for l in v if l.startswith("pte ")}
D["fork"] = [{"kind": l.split()[1], "mib": int(kv(l)["resident_mib"]), "us": kv(l)["fork_exit_wait_us"]} for l in v if l.startswith("fork ")]
D["cow_write"] = {l.split()[1]: {"faults": int(kv(l)["faults"]), "ms": kv(l)["ms"], "ns_per_page": kv(l)["ns_per_page"]} for l in v if l.startswith("cow_write")}
D["shoot"] = [{"threads": int(kv(l)["other_threads_running"]), "ns": kv(l)["ns_per_mprotect"]} for l in v if "other_threads_running" in l]
D["shoot_untouched_ns"] = [kv(l)["ns_per_mprotect"] for l in v if "page_never_touched" in l][0]
D["mlock_txt"] = "\n".join(l for l in v if l.startswith(("rlimit_memlock", "mlock")))
D["commit_txt"] = "\n".join(l for l in v[v.index("### commit") + 1:])
c = kv([l for l in v if l.startswith("before Committed_AS")][0]); D["commit"] = {k: int(c[k]) for k in ("Committed_AS_kb", "CommitLimit_kb", "MemTotal_kb", "SwapTotal_kb")}
D["commit"]["after_kb"] = int(kv([l for l in v if l.startswith("mmap 64GiB private")][0])["Committed_AS_kb"])
D["env_txt"] = "\n".join(v[v.index("### env") + 1:v.index("### faults")])
D["cow_gc"] = {l.split()[2]: int(kv(l)["pages"]) for l in (R / "cow_gc.txt").read_text().splitlines() if l.startswith("cow_gc")}
m = (R / "mmapread.txt").read_text().splitlines()
rows = {}
for l in m:
    if l.startswith("rows "):
        t = l.split(); d = kv(l); rows.setdefault(t[1] + "_" + t[2], []).append(d)
D["rows"] = {k: {"us": med([x["us_per_row"] for x in xs]), "majflt": int(xs[0]["majflt"]), "minflt": int(xs[0]["minflt"]), "read_mib": xs[0]["storage_read_mib"]} for k, xs in rows.items()}
D["load"] = []
for l in m:
    if l.startswith("load "):
        name = l[5:l.index(" return_ms")].strip(); d = kv(l[l.index(" return_ms"):])
        D["load"].append({"name": name, "return_ms": d["return_ms"], "rss_return": d["rss_after_return_mib"], "read_ms": d["first_full_read_ms"], "rss_all": d["rss_after_reading_all_mib"]})
# the job: first complete snapshot (main + 2 workers), one line per pid
snaps = [l for l in (R / "job_mem.txt").read_text().splitlines() if l.startswith("snap ")]
t0 = snaps[0].split()[1]; seen = set(); job = []
for l in snaps:
    t = l.split()
    if t[1] != t0 or t[3] in seen: continue
    seen.add(t[3]); d = kv(l); job.append({"role": t[2], "rss": int(d["rss_kb"]), "pss": int(d["pss_kb"]), "uss": int(d["uss_kb"]),
        "sc": int(d["shared_clean_kb"]), "sd": int(d["shared_dirty_kb"]), "pc": int(d["private_clean_kb"]), "pd": int(d["private_dirty_kb"]), "vmas": int(d["vmas"]), "vmpte": int(d["vmpte_kb"])})
D["job"] = job
cg = {}
for s in ("pagecache", "anon_oom", "swap", "shm"):
    L = (R / f"cg_{s}.txt").read_text().splitlines()
    smp = [list(map(int, l.split()[1:])) for l in L if l.startswith("s ")]
    step = max(1, len(smp) // 160); smp = smp[::step] + ([smp[-1]] if smp[-1] not in smp[::step] else [])
    cg[s] = {"cmd": L[0].replace("### host: ", ""), "samples": smp,
             "marks": [[int(l.split()[1]), l.split(None, 2)[2]] for l in L if l.startswith("m ")],
             "events": {l.split()[1]: int(l.split()[2]) for l in L if l.startswith("events ")},
             "log": [l for l in L if l.startswith(("grow:", "grow exit"))]}
D["cg"] = cg
o = (R / "oomscore.txt").read_text().splitlines()
D["oom"] = {"memtotal_kb": int([l for l in o if "MemTotal" in l][0].split()[2]), "swaptotal_kb": int([l for l in o if "SwapTotal" in l][0].split()[2]),
            "procs": [{k: int(kv(l)[k]) for k in ("rss_pages", "vmswap_kb", "vmpte_kb", "oom_score_adj", "oom_score")} for l in o if l.startswith("proc ")],
            "refused": any("refused" in l for l in o)}
# the root page's recording of the job's main process maps (Topic: operating-systems, src/parts/22_js_rd_data.js)
rs = pathlib.Path("../../src/parts/22_js_rd_data.js").read_text(); RD = json.loads(rs[rs.index("{"):rs.rstrip().rindex("}") + 1])
D["root_maps"] = {"totals": RD["maps"]["after_fork_main"]["totals"], "n": RD["maps"]["after_fork_main"]["n"], "sample": RD["maps"]["after_fork_main"]["sample"]}
D["root_tlb"] = RD["tlb"]; D["root_faults"] = RD["faults"]
D["env"] = {l.split(": ", 1)[0].split("/")[-1].strip(): l.split(": ", 1)[1].strip() for l in (R / "env.txt").read_text().splitlines() if ": " in l and l.startswith("/")}
D["env_lines"] = (R / "env.txt").read_text()
# the root Debug lab's swap case (src/debug/raw/swap.txt): seconds and major faults per pass
D["root_swap"] = [{"mib": int(m.group(1)), "s": float(m.group(2)), "majflt": int(m.group(3))} for m in re.finditer(r"(\d+) MiB working set, pass \d+: +([0-9.]+) s, major faults (\d+)", pathlib.Path("../../src/debug/raw/swap.txt").read_text())]
D["macos_pagesize"] = int((R / "macos_pagesize.txt").read_text().strip())
pathlib.Path("parts/22_js_data.js").write_text("/* generated by src/gen_data.py from src/raw/; do not edit */\nwindow.VM_DATA=" + json.dumps(D, separators=(",", ":")) + ";\n")
print("wrote parts/22_js_data.js", len(json.dumps(D)))
