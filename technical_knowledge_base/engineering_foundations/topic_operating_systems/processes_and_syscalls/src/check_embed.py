"""Check that the page embeds exactly the recorded outputs and that the numbers written in the prose match them.
1. parts/22_js_data.js equals what build_data.py builds from runs/out/ today.
2. Every number the HTML parts state about these runs is recomputed from the data and must appear in the text.
3. No private paths or tokens in src/ or the page.
Run from src/: python3 check_embed.py"""
import glob, os, re, statistics, sys
import build_data

HERE = os.path.dirname(os.path.abspath(__file__))
bad = 0


def fail(msg):
    global bad
    bad += 1
    print("FAIL", msg)


pd = build_data.build()
with open(os.path.join(HERE, "parts", "22_js_data.js")) as f:
    if f.read() != build_data.js(pd):
        fail("parts/22_js_data.js is stale: run python3 build_data.py")
html = ""
for p in sorted(glob.glob(os.path.join(HERE, "parts", "*"))):
    with open(p) as f:
        html += f.read()
text = re.sub(r"\s+", " ", html)

sp = {(r["mib"], r["m"]): r for r in pd["spawn"]}
py = {r["label"]: r for r in pd["pyspawn"]}
torch = py["+ import torch"]; huge = py["+ torch + 1 GiB numpy (huge pages, the default)"]; nohuge = py["+ torch + 1 GiB numpy (NUMPY_MADVISE_HUGEPAGE=0)"]
lat = [r for r in pd["latency"] if "solve" in r["case"]]
sd = {}
for r in pd["shutdown"]:
    sd.setdefault(r["v"], []).append(r)
ck = []
for l in pd["shutdown"]:
    pass
logs_v1 = [r["log"] for r in sd["v1_exec"]]
ckms = []
for lg in logs_v1:
    b = float(re.search(r"\[\s*([\d.]+)s\] phase ckpt_begin", lg).group(1)); e = float(re.search(r"\[\s*([\d.]+)s\] phase ckpt_end", lg).group(1))
    ckms.append(round((e - b) * 1000))
expect = {
    "fork 0 MiB 0.25 ms": "%.2f ms" % (sp[(0, "fork_exit")]["med"] / 1000),
    "fork 1 GiB 17.1 ms": "%.1f ms" % (sp[(1024, "fork_exit")]["med"] / 1000),
    "ratio about 70": "about %d times longer" % (round(sp[(1024, "fork_exit")]["med"] / sp[(0, "fork_exit")]["med"], -1)),
    "VmPTE 2,100": "{:,} KiB".format(sp[(1024, "fork_exit")]["pte_kib"]),
    "ns per page": "about %d ns per 4 KiB page" % round((sp[(1024, "fork_exit")]["med"] - sp[(0, "fork_exit")]["med"]) * 1000 / 262144),
    "posix_spawn 0.38 ms": "about %.2f ms" % (statistics.median(sp[(m, "spawn_exec")]["med"] for m in (0, 64, 256, 1024)) / 1000),
    "getppid 269": "%d ns" % round(pd["sysc"]["plain_ns"]),
    "strace 124 us": "%d µs" % round(pd["sysc"]["strace_ns"] / 1000),
    "strace ratio 460": "about %d times slower" % (round(pd["sysc"]["strace_ns"] / pd["sysc"]["plain_ns"], -1)),
    "python getppid 250": "(%d ns" % round(pd["sysc"]["py_ns"], -1),
    "strace meta": "4 <code>wait4</code>, 4 <code>ptrace</code> and 2 <code>write</code>" if pd["strace_meta"] == {"wait4": 4.0, "ptrace": 4.0, "write": 2.0} else "MISMATCH",
    "torch fork 6 ms": "about %d ms" % round(torch["os_fork"]),
    "no huge pages 22.5": "%.1f ms" % nohuge["os_fork"],
    "AnonHugePages": "{:,} MiB".format(int(huge["anon_huge"])),
    "spawn range": "about %.2f to %.2f s" % (min(torch["mp_forkserver"], huge["mp_forkserver"], torch["mp_spawn"], huge["mp_spawn"]) / 1000, max(torch["mp_spawn"], huge["mp_spawn"]) / 1000),
    "coalesce": "{:,} sent, {} handled".format(pd["sigq"]["sent"], pd["sigq"]["usr1"]) if pd["sigq"]["sent"] == 1000 else "MISMATCH",
    "sigpending": "{:,} here".format(pd["sigq"]["sigpending"]),
    "pipe size": "{:,}-byte buffer".format(pd["pipe"]["size"]),
    "PIPE_BUF": "({:,})".format(pd["pipe"]["pipe_buf"]),
    "cloexec leak 2.0 s": "%.1f s" % pd["cloexec"]["leak_s"],
    "torch handler 1.2 s": "about %.1f s for one <code>torch.linalg.solve</code>" % (min(r["handler_ms"] for r in lat) / 1000),
    "v2 range": "%.1f to %.1f s" % (min(r["stop_s"] for r in sd["v2_sh_c"]), max(r["stop_s"] for r in sd["v2_sh_c"])),
    "v6 range": "%.2f to %.2f s" % (min(r["stop_s"] for r in sd["v6_init_sh"]), max(r["stop_s"] for r in sd["v6_init_sh"])),
}
for k, s in expect.items():
    if s not in text:
        fail("prose number '%s': expected text %r not found" % (k, s))
if not (min(ckms) == 5 and max(ckms) == 9):
    fail("checkpoint 5 to 9 ms: logs give %s" % ckms)
for v, cond in [("v1_exec", lambda r: r["ckpt"] and r["code"] == 0), ("v2_sh_c", lambda r: not r["ckpt"] and r["code"] == 137),
                ("v3_sh_c_two", lambda r: not r["ckpt"] and r["code"] == 137), ("v4_bash_c", lambda r: r["ckpt"]), ("v5_sh_exec", lambda r: r["ckpt"]),
                ("v6_init_sh", lambda r: not r["ckpt"] and r["code"] == 143), ("v7_init_group", lambda r: not r["ckpt"] and r["code"] == 143 and r["got_signal"] == 0),
                ("v8_torchrun", lambda r: not r["ckpt"] and r["worker_killed"] and r["code"] == 1), ("v9_init_exec", lambda r: r["ckpt"]),
                ("v10_torchrun_fixed", lambda r: r["ckpt"] and r["code"] == 1)]:
    if len(sd[v]) != 3 or not all(cond(r) for r in sd[v]):
        fail("shutdown variant %s does not match what the page says" % v)
# privacy
for p in glob.glob(os.path.join(HERE, "**", "*"), recursive=True) + [os.path.join(HERE, "..", "index.html")]:
    if os.path.isfile(p) and not p.endswith(".png") and os.path.basename(p) != "check_embed.py":
        with open(p, errors="ignore") as f:
            t = f.read()
        for pat in ("/" + "Users/", "gl" + "pat", "sk-" + "ant", "kha" + "lid"):
            if pat in t:
                fail("%s contains %r" % (os.path.relpath(p, HERE), pat))
print("check_embed:", "ok" if not bad else "%d problem(s)" % bad, "| %d prose numbers checked, %d shutdown variants" % (len(expect), len(sd)))
sys.exit(1 if bad else 0)
