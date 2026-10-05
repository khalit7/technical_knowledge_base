"""Recompute every derived number the page shows from parts/22_js_data.js, with the formulas the page states.
Writes recompute.txt; the page's JavaScript uses the same formulas (check_embed.py compares)."""
import json
s = open("parts/22_js_data.js").read(); D = json.loads(s[s.index("=") + 1:s.rstrip().rindex(";")])
out = []
def say(k, v): out.append(f"{k} = {v}")
PG = 4096
# 1. oom_score, Linux 5.10 fs/proc/base.c 549-566 and mm/oom_kill.c 201-238
O = D["oom"]; total = O["memtotal_kb"] // 4 + O["swaptotal_kb"] // 4
say("oom.totalpages (MemTotal+SwapTotal in 4 KiB pages)", total)
for p in O["procs"]:
    badness = p["rss_pages"] + p["vmswap_kb"] // 4 + p["vmpte_kb"] * 1024 // PG + p["oom_score_adj"] * (total // 1000)
    pred = (1000 + badness * 1000 // total) * 2 // 3
    say(f"oom_score adj={p['oom_score_adj']} rss={p['rss_pages']}: predicted {pred} measured {p['oom_score']}", "OK" if pred == p["oom_score"] else "MISMATCH")
    assert pred == p["oom_score"]
# 2. CommitLimit = (MemTotal - hugetlb) * overcommit_ratio/100 + SwapTotal  (mm/util.c 805-816), ratio 50, no hugetlb
C = D["commit"]; pred = C["MemTotal_kb"] * 50 // 100 + C["SwapTotal_kb"]
say("CommitLimit_kb predicted", pred); say("CommitLimit_kb measured", C["CommitLimit_kb"]); assert abs(pred - C["CommitLimit_kb"]) <= 4
# 3. page-table memory for 1 GiB touched with 4 KiB pages: one 4 KiB PTE page per 2 MiB
pred = (1 << 30) // (2 << 20) * 4; say("VmPTE for 1 GiB predicted_kb (last level only)", pred); say("VmPTE measured_kb", D["pte"]["4k"])
# 4. per-fault costs
fw = D["first_write"]
say("anon first-touch us per fault (median run)", round(fw["4k"]["ms_median"] * 1000 / fw["4k"]["faults"], 2))
say("thp first-touch us per fault (median run)", round(fw["thp"]["ms_median"] * 1000 / fw["thp"]["faults"], 1))
say("zero-page read us per fault", round(D["zero_page"]["read_ms"] * 1000 / D["zero_page"]["read_faults"], 2))
say("write after zero page us per fault", round(D["zero_page"]["write_ms"] * 1000 / D["zero_page"]["write_faults"], 2))
say("fault ratio 4k/thp", fw["4k"]["faults"] // fw["thp"]["faults"])
say("bloat ratio thp/4k", round(D["bloat"]["thp"] / D["bloat"]["4k"]))
f = {(x["kind"], x["mib"]): x["us"] for x in D["fork"]}
say("fork 1 GiB ratio 4k/thp", round(f[("4k", 1024)] / f[("thp", 1024)], 1))
say("fork 4k us per resident MiB (1 GiB)", round((f[("4k", 1024)] - f[("4k", 0)]) / 1024, 1))
# 5. fault-around on the root's warm dataset read: 2056 pages, 16 pages per fault (fault_around_bytes 65536, mm/memory.c 3875)
say("fault-around predicted faults for 2056 pages", -(-2056 // 16)); say("root measured warm minor faults", 129)
# 6. memory, three ways, for the running job
J = D["job"]
for k in ("rss", "pss", "uss"): say(f"job sum {k} MiB", round(sum(p[k] for p in J) / 1024))
# 7. mmap read amplification
R = D["rows"]; useful = 20000 * 1028 / 2**20
say("useful bytes for 20000 rows MiB", round(useful, 1))
for k in ("pread_cold", "mmap_cold", "mmap_random_cold"): say(f"{k} storage read MiB, amplification", f"{R[k]['read_mib']} x{R[k]['read_mib'] / useful:.1f}")
# 8. TLB reach (root's measured knee at 4096 pages on this M1 with 4 KiB pages)
say("TLB reach 4096 x 4 KiB MiB", 4096 * 4 // 1024); say("TLB reach 4096 x 2 MiB GiB", 4096 * 2 // 1024)
open("recompute.txt", "w").write("\n".join(out) + "\n"); print("\n".join(out))
