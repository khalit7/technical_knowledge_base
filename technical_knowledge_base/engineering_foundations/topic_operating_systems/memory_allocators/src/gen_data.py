"""Embed the raw outputs (raw/) and the check results in the page as parts/22_js_data.js.
Also writes K, the numbers the prose quotes (span data-k), which check_embed.py compares with the page."""
import json, re, statistics as S, subprocess, os
H = os.path.dirname(os.path.abspath(__file__)); R = os.path.join(H, "raw")
rd = lambda f: open(os.path.join(R, f)).read()
D, K = {}, {}
short = lambda a: {"glibc": "glibc"}.get(a, re.sub(r".*/lib(\w+?)(_minimal)?\.so.*", r"\1", a))

# sizes
D["sizes"] = [list(map(int, l.split())) for l in rd("sizes.txt").splitlines()[1:]]
# threshold strace: two traces
t = rd("threshold.txt").split("## MALLOC_MMAP_THRESHOLD_=131072")
def clean(s):
    out = []
    for l in s.replace("## default", "").splitlines():
        if not l.strip() or l.startswith("+++") or l.startswith(")"):
            continue
        m = re.match(r'write\(2, "(.*?)\\n", (\d+)', l)
        out.append(f'write(2, "{m[1]}\\n", {m[2]}) = {m[2]}' if m else l)
    return out
D["thr"] = [clean(t[0]), clean(t[1])]
# kernel
kt = rd("kernel.txt")
D["buddy"] = "\n".join(l.rstrip() for l in kt.splitlines() if l.startswith("Node"))
D["slab"] = "\n".join(l.rstrip() for l in kt.splitlines() if l.startswith(("#", "slabinfo")) or re.match(r"^(kmalloc|task_struct|dentry|inode_cache|mm_struct|vm_area_struct)", l))
# frag
def frag(txt):
    out = {}
    for blk in txt.strip().split("\n\n"):
        lines = blk.strip().splitlines(); a = short(re.search(r"allocator=(\S+)", lines[0]).group(1))
        out[a] = {re.split(r"\s+rss_kib", l)[0].strip(): int(re.search(r"rss_kib=\s*(\d+)", l).group(1)) for l in lines[1:]}
    return out
F = frag(rd("frag.txt")); FP = frag(rd("frag_purge.txt"))
D["frag"] = F; D["frag_purge"] = FP
g = F["glibc"]
K["frag.glibc.freed"] = f"{g['freed all but every 64th']:,}"; K["frag.live"] = "1,562"
K["frag.glibc.trim"] = f"{g['malloc_trim(0) returned 1']:,}"; K["frag.glibc.all"] = f"{g['freed everything']:,}"
K["frag.je_purge.after"] = f"{FP['jemalloc']['3 s later, after one malloc/free']:,}"
K["frag.mi_purge.all"] = f"{FP['mimalloc']['freed everything']:,}"
# arenas
A = {}
for l in rd("arenas.txt").splitlines():
    m = re.search(r"allocator=(\S+) arena_max=(\S+) seconds=([\d.]+) peak_rss_mib=([\d.]+) end_rss_mib=([\d.]+)", l)
    if m:
        k = short(m[1]) + ("" if m[2] == "default" else " MALLOC_ARENA_MAX=" + m[2])
        A.setdefault(k, []).append([float(m[3]), float(m[4]), float(m[5])])
narena = sorted(set(int(x) for x in re.findall(r"^(\d+) arena$", rd("arenas.txt"), re.M)))
D["arenas"] = A; D["arenas_n"] = narena
med = lambda xs: S.median(xs)
K["arenas.n"] = str(narena[0])
K["arenas.g.peak"] = f"{med([r[1] for r in A['glibc']]):.1f}"; K["arenas.g.sec"] = f"{med([r[0] for r in A['glibc']]):.2f}"
K["arenas.g.end"] = f"{med([r[2] for r in A['glibc']]):.1f}"
K["arenas.am1.peak"] = f"{med([r[1] for r in A['glibc MALLOC_ARENA_MAX=1']]):.1f}"; K["arenas.am1.sec"] = f"{med([r[0] for r in A['glibc MALLOC_ARENA_MAX=1']]):.2f}"
# bench
B = {}
for l in rd("bench.txt").splitlines():
    m = re.search(r"allocator=(\S+) threads=(\d) pattern=(\S+) size=(\d+) ns_per_pair=([\d.]+)", l)
    if m: B.setdefault(short(m[1]), {})[f"{m[2]}/{m[3]}/{m[4]}"] = float(m[5])
BT = {}
for l in rd("bench_trim.txt").splitlines()[:5]:
    m = re.search(r"size=(\d+) ns_per_pair=([\d.]+)", l); BT[m[1]] = float(m[2])
D["bench"] = B; D["bench_trim"] = BT
f1 = lambda v: f"{v:,.1f}"
K["bench.g.16"] = f1(B["glibc"]["1/pairs/16"]); K["bench.gb.256"] = f1(B["glibc"]["1/batch1000/256"])
K["bench.gb.4096"] = f1(B["glibc"]["1/batch1000/4096"]); K["bench.gb.1m"] = f1(B["glibc"]["1/batch1000/1048576"])
K["bench.trim.4096"] = f1(BT["4096"]); K["bench.trim.1m"] = f1(BT["1048576"])
K["bench.m.1m"] = f1(B["mimalloc"]["1/pairs/1048576"]); K["bench.t.16"] = f1(B["tcmalloc"]["1/pairs/16"])
# loader
L, runs, cur = {}, {}, None
for l in rd("loader.txt").splitlines():
    m = re.match(r"allocator=(\S+) samples=\d+ seconds=([\d.]+) rss_mib_window_dropped=([\d.]+) kept_mib=([\d.]+)", l)
    if m:
        cur = m[1]; runs.setdefault(cur, []).append([float(m[2]), float(m[3])]); K["loader.kept"] = m[4]; continue
    m = re.match(r"sample=(\d+) rss_mib=([\d.]+) live_mib=([\d.]+)", l)
    if m and len(runs[cur]) == 1: L.setdefault(cur, []).append([int(m[1]), float(m[2]), float(m[3])])
D["loader_series"] = {k: v[::2] for k, v in L.items()}; D["loader_runs"] = runs
K["loader.g.rss"] = f"{med([r[1] for r in runs['glibc']]):.1f}"; K["loader.g.sec"] = f"{med([r[0] for r in runs['glibc']]):.2f}"
K["loader.fix.rss"] = f"{med([r[1] for r in runs['fixed_threshold']]):.1f}"; K["loader.fix.sec"] = f"{med([r[0] for r in runs['fixed_threshold']]):.2f}"
K["loader.je.rss"] = f"{med([r[1] for r in runs['jemalloc']]):.1f}"
# pymalloc
P = rd("pymalloc.txt"); D["pym"] = P.strip()
pm = P.split("\n\n")
K["pym.arenas"] = re.search(r"kept every.*arenas_now=(\d+)", pm[0]).group(1)
K["pym.kept"] = re.search(r"kept every.*rss_mib=\s*([\d.]+)", pm[0]).group(1)
K["pym.all"] = re.search(r"dropped them all\s+rss_mib=\s*([\d.]+)", pm[0]).group(1)
K["pym.malloc_all"] = re.search(r"dropped them all\s+rss_mib=\s*([\d.]+)", pm[1]).group(1)
K["pym.malloc_trim"] = re.search(r"malloc_trim.*rss_mib=\s*([\d.]+)", pm[1]).group(1)
# torch
T = rd("torch_cpu.txt"); D["torch"] = T.strip()
K["torch.before64"] = re.search(r"torch.empty\(67108864 bytes\) and fill \(rss ([\d.]+)", T).group(1)
K["torch.after64"] = re.search(r"del tensor \(rss ([\d.]+) MiB\)\\n\", 31\) = 31\nwrite\(2, \"--- np.empty\(67108864", T).group(1) if False else re.search(r"np.empty\(67108864 bytes\) and fill \(rss ([\d.]+)", T).group(1)
# job
J = {}
for l in rd("job.txt").splitlines():
    m = re.search(r"allocator=(\S+) seconds=([\d.]+) main_VmHWM_kib=(\d+) main_VmRSS_kib=(\d+)", l)
    if m: J.setdefault(m[1], []).append([float(m[2]), int(m[3]), int(m[4])])
D["job"] = J
# checks
D["fl_check"] = subprocess.run(["node", "check_freelist.mjs"], cwd=os.path.join(H, "sim"), capture_output=True, text=True).stdout.strip().splitlines()[-1]
D["cache_check"] = subprocess.run(["node", "check_js.mjs"], cwd=os.path.join(H, "sim"), capture_output=True, text=True).stdout.strip().splitlines()[-1]
open(os.path.join(H, "sim", "check_results.txt"), "w").write(D["fl_check"] + "\n" + D["cache_check"] + "\n")
scen = json.load(open(os.path.join(H, "sim", "scenarios.json")))
js = ("// ---- Data: generated by src/gen_data.py from src/raw/ (measured 2026-10-05) and src/sim/ (scenarios, checks). Do not edit.\n"
      "window.AD=" + json.dumps(D, separators=(",", ":")) + ";\nwindow.AK=" + json.dumps(K, separators=(",", ":")) + ";\n"
      "window.CACHE_SCEN=" + json.dumps(scen, separators=(",", ":")) + ";\n"
      "window.FL_CHECK=" + json.dumps(D["fl_check"]) + ";window.CACHE_CHECK=" + json.dumps(D["cache_check"]) + ";\n")
open(os.path.join(H, "parts", "22_js_data.js"), "w").write(js)
json.dump(K, open(os.path.join(H, "sim", "prose_numbers.json"), "w"), indent=1)
print(len(js), "bytes;", K)
