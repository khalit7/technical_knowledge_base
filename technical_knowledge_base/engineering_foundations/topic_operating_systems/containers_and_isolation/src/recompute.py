"""Recompute every derived number on the page from raw/ data and the cited formulas, and check the Pod to cgroup tab's
JavaScript against a Python port of the Kubernetes v1.34.0 and runc formulas. Writes recompute.txt; exit 1 on mismatch."""
import json, math, pathlib, subprocess, sys
s = pathlib.Path("parts/22_js_data.js").read_text(); D = json.loads(s[s.index("=") + 1:s.rstrip().rindex(";")])
out, bad = [], 0
def line(t): out.append(t); print(t)
def check(name, ok):
    global bad
    if not ok: bad += 1
    line(("ok   " if ok else "FAIL ") + name)

ns = {r["k"]: r["med"] for r in D["nscost"]}
line(f"net / uts namespace creation: {ns['net']:.1f} / {ns['uts']:.1f} = {ns['net'] / ns['uts']:.0f} (page: roughly 500 times)")
check("roughly 500 times", 400 <= ns["net"] / ns["uts"] <= 600)
check("UTS, PID, cgroup, time, user under 10 us", all(ns[k] < 10 for k in ("uts", "pid", "cgroup", "time", "user")))
check("3 to 5 microseconds (UTS, PID, cgroup, time)", all(2.5 <= ns[k] <= 5.5 for k in ("uts", "pid", "cgroup", "time")))
check("network about 2.4 ms", round(ns["net"] / 1000, 1) == 2.4)
cmd = D["cmdcost"]; starts = sorted(D["starts"]); med = starts[len(starts) // 2]
line(f"unshare with net {cmd[2]['med']} ms / docker run median {med} s = {cmd[2]['med'] / (med * 1000):.1%} (page: about 1%)")
check("kernel part about 1% of docker run", 0.005 < cmd[2]["med"] / (med * 1000) < 0.02)
st = {x["id"]: x for x in D["stop"]}
lost = [st[k]["s"] for k in ("A_init_shell", "B_init_group", "D_dumb_init")]; saved = [st[k]["s"] for k in ("E_init_exec", "F_bash_trap", "G_python_pid1")]
line(f"lost: {lost} s, saved: {saved} s")
check("0.24 to 0.27 s, exit 143", min(lost) >= 0.235 and max(lost) <= 0.275 and all(st[k]["code"] == 143 and not st[k]["saved"] for k in ("A_init_shell", "B_init_group", "D_dumb_init")))
check("1.3 to 1.9 s and saved", min(saved) >= 1.25 and max(saved) <= 1.95 and all(st[k]["saved"] and st[k]["code"] == 0 for k in ("E_init_exec", "F_bash_trap", "G_python_pid1")))
check("10.28 s and 137", st["C_shell_pid1"]["s"] == 10.28 and st["C_shell_pid1"]["code"] == 137)
check("no SIGTERM line in the group variants", not st["B_init_group"]["term"] and not st["D_dumb_init"]["term"])
check("dash did not exec: PID 7", D["dash_pid"] == 7)
M = D["mem"]
check("OOM-killed at 190 MiB", M["max"]["pts"][-1][0] == 190 and M["max"]["exit"] == 137 and M["max"]["ev"]["oom_kill"] == 1)
check("memory.high no swap: hung, no OOM", not M["high"]["done"] and M["high"]["ev"]["oom"] == 0 and M["high"]["pts"][-1][1] > 10000)
check("memory.high with swap finished in 0.3 s", M["highswap"]["done"] and round(M["highswap"]["pts"][-1][1] / 1000, 1) == 0.3)
line(f"high no swap: last steps {M['high']['pts'][-2:]}; 60 - {M['high']['pts'][-1][1] / 1000:.1f} = {60 - M['high']['pts'][-1][1] / 1000:.0f} s without progress (chart: 42 s)")
check("no progress for 42 s", round(60 - M["high"]["pts"][-1][1] / 1000) == 42)
og = {o["g"]: o for o in D["oomg"]}
check("oom.group 0: main alive; 1: main killed", not og[0]["main"] and og[1]["main"])
check("io.max about 20 MB/s", D["io"][1]["rate"].startswith("20.") and abs(64 * 2**20 / D["io"][1]["s"] / 1e6 - 20) < 0.5)
sc = D["sc_cost"]
line(f"seccomp: default - none = {sc['default']['0'] - sc['unconfined']['0']:.1f} ns; 8 filters = {sc['default']['8'] - sc['default']['0']:.1f} ns; vs root read 316 ns = {(sc['default']['0'] - sc['unconfined']['0']) / 316:.2f}")
check("about a tenth of a 316 ns read", 0.07 < (sc["default"]["0"] - sc["unconfined"]["0"]) / 316 < 0.15)
u = D["uring"]
line(f"io_uring: 64 KiB / (2 pages x 4 KiB) = {64 // 8} rings; measured {u[0]['rings']}")
check("8 rings in 64 KiB", u[0]["rings"] == 8 and u[2]["rings"] == 0 and u[3]["rings"] == 8 and u[5]["rings"] == 8 and u[6]["rings"] == 0)
cu = D["copyup"]; check("copy-up 626 ms vs 0.1 ms", round(cu[0]) == 626 and cu[1] <= 0.2)
# seccomp probe: how many answers changed under the default profile
P = D["sc_probe"]; diff = [r for r, d in zip(P["none"]["rows"], P["d20"]["rows"]) if r[1] != d[1]]
five = [r for r, d in zip(P["none"]["rows"], P["d20"]["rows"]) if r[1] == "ok" and d[1] != "ok"]
line(f"seccomp probe: {len(diff)} of {len(P['none']['rows'])} changed, {len(five)} of them worked without the filter")
check("7 of the 12 calls, five of which worked", len(diff) == 7 and len(P["none"]["rows"]) == 12 and len(five) == 5)

# Kubernetes and runc formulas (Python port), compared with the page's JavaScript
def shares(m): return 2 if not m else min(262144, max(2, m * 1024 // 1000))
def quota(m): return 0 if not m else max(1000, m * 100000 // 1000)
def w_lin(s): return 0 if s == 0 else 1 + (s - 2) * 9999 // 262142
def w_quad(s):
    if s == 0: return 0
    if s <= 2: return 1
    if s >= 262144: return 10000
    l = math.log2(s); return math.ceil(10 ** ((l * l + 125 * l) / 612 - 7 / 34))
check("1 CPU: weight 39 linear, 100 quadratic", w_lin(shares(1000)) == 39 and w_quad(shares(1000)) == 100)
G = 2**30
def adj(q, mr, cap):
    if q == "Guaranteed": return -997
    if q == "BestEffort": return 1000
    a = 1000 - 1000 * mr // cap
    return 3 if a < 3 else 999 if a == 1000 else a
cases = [("Guaranteed", 8000, 64 * G, 512 * G), ("Burstable", 8000, 64 * G, 512 * G), ("BestEffort", 0, 0, 512 * G), ("Burstable", 2000, 8 * G, 64 * G), ("Burstable", 0, 32 * G, 512 * G)]
py = [[w_lin(shares(c)), w_quad(shares(c)), adj(q, m, cap)] for q, c, m, cap in cases]
js = r"""
global.window={};eval(require('fs').readFileSync('parts/32_js_pod.js','utf8').split('(function(){\n  const P=window.POD')[0]);
const P=window.POD,G=P.GiB;const r=[];
for(const [cs,cap] of [[[{cr:8000,cl:8000,mr:64*G,ml:64*G}],512*G],[[{cr:8000,cl:null,mr:64*G,ml:64*G}],512*G],[[{cr:null,cl:null,mr:null,ml:null}],512*G],[[{cr:2000,cl:4000,mr:8*G,ml:16*G},{cr:100,cl:200,mr:G/4,ml:G/2}],64*G],[[{cr:null,cl:null,mr:32*G,ml:null}],512*G]]){
 const q=P.qos(cs),c=P.container(q,cs[0],cap);r.push([q,c.wl,c.wq,c.adj])}
console.log(JSON.stringify(r));"""
res = json.loads(subprocess.run(["node", "-e", js], capture_output=True, text=True, check=True).stdout)
for (q, *_), p, j in zip(cases, py, res):
    line(f"  {q:10s} python {p}  js {j}")
check("Pod to cgroup JS == Python port (QoS, weights, oom_score_adj)", all(j[0] == c[0] and j[1:] == p for c, p, j in zip(cases, py, res)))
check("Burstable 64 GiB of 512 GiB: oom_score_adj 875", adj("Burstable", 64 * G, 512 * G) == 875)
pathlib.Path("recompute.txt").write_text("\n".join(out) + "\n")
print("recompute:", "PASS" if not bad else f"{bad} FAIL"); sys.exit(1 if bad else 0)
