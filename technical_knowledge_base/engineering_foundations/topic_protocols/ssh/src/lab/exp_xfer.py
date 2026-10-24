# Experiment 10: copying to a compute node through the bastion with 40 ms of round-trip delay added on the bastion's
# outward link: many small files (scp -r, rsync -a, tar piped through ssh) and one large file, plus resuming an interrupted copy.
import os, time, json, statistics, subprocess
from common import *
D = os.path.join(S, "xfer"); os.makedirs(D + "/small", exist_ok=True)
if not os.path.exists(D + "/small/f0999.bin"):
    for i in range(1000): open(f"{D}/small/f{i:04d}.bin", "wb").write(os.urandom(4096))
if not os.path.exists(D + "/big.bin"): open(D + "/big.bin", "wb").write(os.urandom(64 * 1024 * 1024))
run("docker exec proto-ssh-bastion sh -c 'tc qdisc del dev eth0 root 2>/dev/null; tc qdisc add dev eth0 root netem delay 40ms'")
RS = "rsync -e 'ssh -F laptop.conf'"
def clean(): run(f"{SSH} gpu-node-01 'rm -rf ~/in; mkdir -p ~/in'")
tests = {
 "scp -r (1000 x 4 KiB)": f"scp -F laptop.conf -r xfer/small gpu-node-01:in/",
 "rsync -a (1000 x 4 KiB)": f"{RS} -a xfer/small gpu-node-01:in/",
 "tar | ssh tar -x (1000 x 4 KiB)": f"tar -C xfer -cf - small | {SSH} gpu-node-01 'tar -C in -xf -'",
 "scp (one 64 MiB file)": f"scp -F laptop.conf xfer/big.bin gpu-node-01:in/",
 "rsync -a (one 64 MiB file)": f"{RS} -a xfer/big.bin gpu-node-01:in/",
}
res = {}
for name, cmd in tests.items():
    xs = []
    for rep in range(1 if name.startswith('scp -r') else 3):  # scp -r of 1000 files takes minutes and varies little
        clean(); rc, o, e, ms = run(cmd, timeout=300)
        xs.append(round(ms)); 
        if rc: xs[-1] = f"exit {rc}: {e.strip()[:120]}"
    nums = [x for x in xs if isinstance(x, int)]
    res[name] = {"runs_ms": xs, "median_ms": statistics.median(nums) if nums else None}
    print(name, res[name])
# resume: interrupt a big copy after 1.5 s, then rerun rsync with --partial
clean()
p = subprocess.Popen(f"exec {RS} -a --partial xfer/big.bin gpu-node-01:in/", shell=True, cwd=S, start_new_session=True)
time.sleep(1.5); import signal
try: os.killpg(p.pid, signal.SIGINT)
except OSError: pass
p.wait()
have = run(f"{SSH} gpu-node-01 'ls -l in/ | tail -n +2'")[1]
rc, o, e, ms = run(f"{RS} -a --partial --stats xfer/big.bin gpu-node-01:in/", timeout=300)
stats = "\n".join(l for l in o.splitlines() if any(s in l for s in ("Literal data", "Matched data", "Total bytes sent", "Total file size")))
res["resume"] = {"after_interrupt": have.strip(), "resume_ms": round(ms), "stats": stats}
run("docker exec proto-ssh-bastion tc qdisc del dev eth0 root")
json.dump(res, open(os.path.join(RAW, "xfer.json"), "w"), indent=1); print(json.dumps(res["resume"], indent=1))
