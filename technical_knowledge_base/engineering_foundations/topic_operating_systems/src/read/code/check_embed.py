"""Check that the built page carries exactly the recorded outputs of src/read/code/out/ (redacted), and that
every number written into the Reading tab's prose agrees with them.
1. Rebuilds RD_DATA from out/ (make_data.py's logic) and compares it with the RD_DATA embedded in ../../../index.html.
2. Recomputes each number quoted in the prose and checks the exact string is in the page.
3. Greps the page and out/ for private patterns.
Usage: python3 check_embed.py   (exit 1 on any mismatch)"""
import json, os, re, statistics, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(HERE, "../../../index.html")
OUT = os.path.join(HERE, "out")
bad = 0


def fail(msg):
    global bad
    bad = 1
    print("FAIL", msg)


html = open(PAGE, encoding="utf-8").read()
m = re.search(r"window\.RD_DATA=(\{.*?\});\n", html)
embedded = json.loads(m.group(1))
subprocess.run([sys.executable, os.path.join(HERE, "make_data.py")], check=True, capture_output=True)
gen = open(os.path.join(HERE, "../../parts/22_js_rd_data.js")).read()
fresh = json.loads(re.search(r"window\.RD_DATA=(\{.*?\});\n", gen).group(1))
if embedded != fresh:
    fail("RD_DATA in index.html differs from out/: rebuild with sh build.sh")
else:
    print("ok RD_DATA matches out/ (%d keys)" % len(fresh))

D = fresh
txt = re.sub(r"<[^>]+>", "", html)
checks = []
roll = {k: D["maps"][k]["rollup"] for k in ("after_fork_main", "after_fork_worker0", "after_fork_worker1")}
rss = sum(r["Rss"] for r in roll.values()) / 1024
pss = sum(r["Pss"] for r in roll.values()) / 1024
checks += ["%d MiB of RSS against %d MiB of PSS" % (round(rss), round(pss))]
F = D["faults"]
medc = sorted(F["cold"], key=lambda r: r["ms"])[1]
medw = sorted(F["warm"], key=lambda r: r["ms"])[1]
checks += ["%d major faults to touch a cold 8 MiB file" % medc["major"], "%d minor ones once warm" % medw["minor"]]
c = D["ctx"]
checks += ["%.1f ms for 512 MiB here, against %d &micro;s" % (c["fork_exit_wait_512MiB_us"] / 1000, round(c["fork_exit_wait_0MiB_us"]))]
fx = re.search(r"\n\s*[\d.]+\s+[\d.]+\s+\d+\s+(\d+)\s+\d+\s+futex", D["futex"]).group(1)
checks += ["made {:,} futex calls".format(int(fx))]
# first-batch medians come from the Syscall tracer's raw file
tf = {}
for line in open(os.path.join(HERE, "../../trace/raw/timing_first_batch.txt")):
    mm = re.search(r"([\d.]+)s \(start method (\w+)", line)
    if mm:
        tf.setdefault(mm.group(2), []).append(float(mm.group(1)))
checks += ["was %.3f s with fork against %.3f s with spawn and %.3f s with forkserver (medians of %d runs" % (
    statistics.median(tf["fork"]), statistics.median(tf["spawn"]), statistics.median(tf["forkserver"]), len(tf["fork"]))]

# arenas: pairs of 132 KiB rw-p + 65,404 KiB ---p anonymous mappings new in the main process after the fork
def arenas(tag):
    L = [l.split() for l in open(os.path.join(OUT, "maps", tag + ".maps"))]
    n = 0
    for a, b in zip(L, L[1:]):
        sz = lambda r: (int(r[0].split("-")[1], 16) - int(r[0].split("-")[0], 16)) >> 10
        if len(a) == 5 and len(b) == 5 and a[1] == "rw-p" and b[1] == "---p" and sz(a) == 132 and sz(b) == 65404:
            n += 1
    return n
new_arenas = arenas("after_fork_main") - arenas("before_fork_main")
words = {1: "one", 2: "two", 3: "three", 4: "four"}
checks += ["%s new pairs appeared in the main process, each 132 KiB" % words.get(new_arenas, new_arenas)]
caps = re.search(r"=(cap_[a-z_,]+)", D["container"]).group(1).count(",") + 1
checks += ["%d capabilities remain" % caps]
cpumax = re.search(r"cpu\.max: (\d+) (\d+)", D["container"]).groups()
checks += ["%d ms of CPU time per %d ms period" % (int(cpumax[0]) // 1000, int(cpumax[1]) // 1000)]
for s in checks:
    if s.replace("&micro;", "µ") in html or s in html:
        print("ok", s)
    else:
        fail("prose number not found: " + s)
# Docker's default /dev/shm, said in the maps animation, is the measured df output of the probe
if "Docker's default is 64 MB" in html and not re.search(r"^shm\s+64M", open(os.path.join(OUT, "vm_settings.txt")).read(), re.M):
    fail("/dev/shm size")
for pat in ["/Users/", "glpat", "sk-ant"]:
    hits = [f for f in [PAGE] if pat in open(f, encoding="utf-8").read()]
    for root, _, files in os.walk(OUT):
        hits += [os.path.join(root, f) for f in files if pat in open(os.path.join(root, f), errors="replace").read()]
    if hits:
        fail("private pattern %s in %s" % (pat, hits[:3]))
print("check_embed:", "FAIL" if bad else "ok")
sys.exit(bad)
