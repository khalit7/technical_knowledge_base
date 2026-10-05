"""Check the Python references against OSTEP's own homework simulators on the same inputs.

Usage: python3 check_ostep.py /path/to/ostep-homework   (a clone of github.com/remzi-arpacidusseau/ostep-homework)
Writes check_ostep.txt. Compared: scheduler.py (FIFO, SJF, RR; all jobs arrive at 0), mlfq.py (arrivals, I/O,
boost), paging-linear-translate.py, paging-multilevel-translate.py, paging-policy.py (FIFO, LRU, OPT) and
x86.py (the race without a lock and with test-and-set, fixed interrupt interval).
"""
import os, re, subprocess, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from ref_common import mulberry32, rand_jobs, rand_refs
from ref_sched import schedule, mlfq
from ref_vm import translate_linear, walk_two_level, replace
from ref_conc import run_x86, NOLOCK, TAS

H = sys.argv[1]
out, tally = [], {}


def sh(d, args):
    return subprocess.run([sys.executable] + args, cwd=os.path.join(H, d), capture_output=True, text=True).stdout


def ok(name, good, detail=""):
    t = tally.setdefault(name, [0, 0])
    t[0] += good
    t[1] += 1
    if not good:
        out.append(f"MISMATCH {name}: {detail}")


# 1. scheduler.py: FIFO, SJF, RR (quantum 1..5), 30 seeded job lists each
for seed in range(30):
    lens = [j["run"] for j in rand_jobs(seed, n=2 + seed % 4, max_run=60)]
    jobs = [{"id": i, "arrive": 0, "run": L} for i, L in enumerate(lens)]
    for pol, q in [("FIFO", 1), ("SJF", 1)] + [("RR", q) for q in range(1, 6)]:
        txt = sh("cpu-sched", ["scheduler.py", "-p", pol, "-q", str(q), "-l", ",".join(map(str, lens)), "-c"])
        theirs = [(float(a), float(b), float(c)) for a, b, c in re.findall(r"Job\s+\d+ -- Response: ([\d.]+)\s+Turnaround ([\d.]+)\s+Wait ([\d.]+)", txt)]
        mine = schedule(jobs, pol, q=q)["jobs"]
        mine = [(float(r["response"]), float(r["turnaround"]), float(r["wait"])) for r in mine]
        if pol == "SJF":  # scheduler.py sorts the jobs by length and reports them in that order
            theirs, mine = sorted(theirs), sorted(mine)
        ok("scheduler.py " + pol, theirs == mine, f"seed {seed} q {q} {lens}: {theirs} vs {mine}")

# 2. mlfq.py: random arrivals, I/O, boost, quanta and allotments
for seed in range(40):
    jobs = rand_jobs(seed, n=2 + seed % 3, max_run=50, max_arrive=30, io=True)
    r = mulberry32(seed + 1000)
    nq = 2 + int(r() * 2)
    quanta = [2 + int(r() * 9) for _ in range(nq)]
    allot = [1 + int(r() * 3) for _ in range(nq)]
    boost = [0, 0, 50, 100][int(r() * 4)]
    iot = 1 + int(r() * 6)
    jl = ":".join(f"{j['arrive']},{j['run']},{j['io']}" for j in jobs)
    txt = sh("cpu-sched-mlfq", ["mlfq.py", "-l", jl, "-Q", ",".join(map(str, quanta)), "-A", ",".join(map(str, allot)),
                                "-B", str(boost), "-i", str(iot), "-c"])
    theirs = [(int(a), int(b)) for a, b in re.findall(r"Job\s+\d+: startTime\s+\d+ - response\s+(\d+) - turnaround\s+(\d+)", txt)]
    m = mlfq(jobs, quanta=quanta, allot=allot, boost=boost, io_time=iot)
    mine = [(r_["response"], r_["turnaround"]) for r_ in m["jobs"]]
    ok("mlfq.py", theirs == mine, f"seed {seed} -l {jl} -Q {quanta} -A {allot} -B {boost} -i {iot}: {theirs} vs {mine}")

# 3. paging-linear-translate.py
for seed in range(30):
    asz, psz = ["16k", "32k", "64k"][seed % 3], ["1k", "2k", "4k"][(seed // 3) % 3]
    txt = sh("vm-paging", ["paging-linear-translate.py", "-s", str(seed), "-n", "8", "-a", asz, "-p", "512k", "-P", psz, "-u", "60", "-c"])
    pt = [int(x, 16) for x in re.findall(r"^\s+(?:\[\s*\d+\]\s+)?(0x[0-9a-f]{8})\s*$", txt, re.M)]
    page = int(psz[:-1]) * 1024
    for va, rest in re.findall(r"VA 0x([0-9a-f]+) \(decimal:\s+\d+\) -->\s+(.*)", txt):
        res = translate_linear(int(va, 16), page, pt)
        m2 = re.match(r"([0-9a-f]+) \(decimal", rest)
        good = (not res["valid"] and rest.startswith("Invalid")) or (res["valid"] and m2 and int(m2.group(1), 16) == res["pa"])
        ok("paging-linear-translate.py", bool(good), f"seed {seed} VA {va}: {rest} vs {res}")

# 4. paging-multilevel-translate.py
for seed in range(30):
    txt = sh("vm-smalltables", ["paging-multilevel-translate.py", "-s", str(seed), "-n", "10", "-c"])
    mem = [[int(h[i:i + 2], 16) for i in range(0, 64, 2)] for h in re.findall(r"^page\s+\d+:([0-9a-f]{64})", txt, re.M)]
    pdbr = int(re.search(r"PDBR: (\d+)", txt).group(1))
    for va, body in re.findall(r"Virtual Address 0x([0-9a-f]+):\n(.*?)(?=\nVirtual Address|\Z)", txt, re.S):
        w = walk_two_level(int(va, 16), pdbr, mem)
        m2 = re.search(r"Translates to Physical Address 0x([0-9a-f]+) --> Value: 0x([0-9a-f]+)", body)
        if m2:
            good = "pa" in w and w["pa"] == int(m2.group(1), 16) and w["value"] == int(m2.group(2), 16)
        else:
            good = "fault" in w
        ok("paging-multilevel-translate.py", good, f"seed {seed} VA {va}: {body.strip()[-80:]} vs {w}")

# 5. paging-policy.py FIFO, LRU, OPT
for seed in range(40):
    refs = rand_refs(seed, n=12 + seed % 20, maxpage=3 + seed % 8)
    frames = 2 + seed % 4
    for pol in ("FIFO", "LRU", "OPT"):
        txt = sh("vm-beyondphys-policy", ["paging-policy.py", "-a", ",".join(map(str, refs)), "-p", pol, "-C", str(frames), "-c"])
        m2 = re.search(r"hits (\d+)\s+misses (\d+)", txt)
        hm = (int(m2.group(1)), int(m2.group(2)))
        mine = replace(refs, frames, pol)
        ok("paging-policy.py " + pol, hm == (mine["hits"], mine["misses"]), f"seed {seed} {refs} C={frames}: {hm} vs {mine['hits'], mine['misses']}")

# 6. x86.py: final counter for the race, without and with a test-and-set lock
for loops in (1, 2, 3, 5, 8):
    for interval in range(1, 13):
        txt = sh("threads-intro", ["x86.py", "-p", "looping-race-nolock.s", "-t", "2", "-a", f"bx={loops}", "-i", str(interval), "-M", "2000", "-c"])
        last = [l for l in txt.splitlines() if re.match(r"^\s+\d+\s", l)][-1]
        ok("x86.py looping-race-nolock.s", int(last.split()[0]) == run_x86(NOLOCK, loops, interval)["count"], f"bx={loops} i={interval}")
        txt = sh("threads-locks", ["x86.py", "-p", "test-and-set.s", "-t", "2", "-a", f"bx={loops}", "-i", str(interval), "-M", "count", "-c"])
        last = [l for l in txt.splitlines() if re.match(r"^\s+\d+\s", l)][-1]
        ok("x86.py test-and-set.s", int(last.split()[0]) == run_x86(TAS, loops, interval)["count"], f"bx={loops} i={interval}")

commit = subprocess.run(["git", "-C", H, "log", "-1", "--format=%H %cs"], capture_output=True, text=True).stdout.strip()
lines = [f"OSTEP homework at commit {commit}", ""]
for k, (g, n) in tally.items():
    lines.append(f"{k}: {g}/{n} identical")
lines += [""] + out[:40]
open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "check_ostep.txt"), "w").write("\n".join(lines) + "\n")
print("\n".join(lines))
