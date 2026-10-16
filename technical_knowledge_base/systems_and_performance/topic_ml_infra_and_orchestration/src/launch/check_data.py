#!/usr/bin/env python3
"""Launch lab: confirm the built page embeds exactly the recorded data, and that the numbers in prose match it.
usage: python3 check_data.py   (from anywhere)"""
import json, os, re, statistics

HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.LA=(\{.*?\});\n", page, re.S)
LA = json.loads(m.group(1))
out = lambda n: json.load(open(os.path.join(HERE, "out", n)))
ok = True


def check(cond, msg):
    global ok
    print(("ok   " if cond else "FAIL ") + msg)
    ok &= bool(cond)


T = out("launch_times.json")["systems"]
for s in ("slurm", "k8s", "ray"):
    runs = T[s]["runs"]
    tot = [r["total_s"] for r in runs]
    check(LA["times"][s]["summary"]["total"]["median"] == statistics.median(tot), f"{s}: median total {statistics.median(tot)} s embedded")
    check([r["total_s"] for r in LA["times"][s]["runs"]] == tot, f"{s}: every run's total embedded")
    for r in runs:  # stages sum to the total
        check(abs(sum(x["s"] for x in r["stages"]) - r["total_s"]) < 0.01, f"{s} {r['run']}: stages sum to total")
    med = f'{statistics.median(tot):.1f} s on'
    check(med in LA["tltext"], f"{s}: prose quotes {med}")
check(LA["hangs"] == out("hangs.json"), "hang cards equal out/hangs.json")
check(LA["rz"] == out("rz.json"), "rendezvous events equal out/rz.json")
check(LA["env"] == out("env.json"), "environment dumps equal out/env.json")
for h in LA["hangs"]:
    check(f'{h["t_err"]:.0f} s' in LA["hangsum"], f'summary table has {h["id"]} {h["t_err"]:.0f} s')
tools = out("tools.json")
check(f'stopped at #{tools["fr"]["3"][-1][0]}' in LA["tools"], "flight recorder sentence matches rank 3's dump")
# privacy: nothing of the host in the data
import getpass, socket
for bad in ("/" + "Users/", "Users" + "-", getpass.getuser(), socket.gethostname().split(".")[0], "/tmp/claude", "172.", "10.244."):
    check(bad not in m.group(1), f"no '{bad}' in embedded data")
print("ALL OK" if ok else "FAILURES")
