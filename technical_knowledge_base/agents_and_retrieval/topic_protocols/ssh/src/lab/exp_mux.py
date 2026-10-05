# Experiment 4: connection multiplexing (ControlMaster) with 40 ms of round-trip delay added between
# the laptop and the bastion (tc netem on the bastion's outward interface). Run after: tc qdisc add dev eth0 root netem delay 40ms
import subprocess, time, json, statistics, sys
from common import *
MUX = f"{SSH} -o ControlMaster=auto -o ControlPath=cm/%C -o ControlPersist=120"
res = {}
def series(name, cmd, n=10):
    xs = [round(run(cmd)[3], 1) for _ in range(n)]
    res[name] = {"runs_ms": xs, "median_ms": statistics.median(xs)}
series("bastion, fresh connection each time", f"{SSH} bastion true")
series("gpu-node-01 via bastion, fresh each time", f"{SSH} gpu-node-01 true")
run(f"{MUX} -O exit gpu-node-01"); run(f"{MUX} -O exit bastion")
rc, o, e, ms = run(f"{MUX} gpu-node-01 true"); res["gpu-node-01 first (creates master)"] = {"ms": round(ms, 1)}
series("gpu-node-01 via existing master", f"{MUX} gpu-node-01 true")
rec("mux_vvv_reuse.txt", f"{MUX} -vvv gpu-node-01 true", note="a second ssh to the same host rides the master: no TCP, no key exchange, no authentication")
rec("mux_check.txt", f"{MUX} -O check gpu-node-01", note="is a master running?")
rec("mux_conninfo.txt", f"{MUX} -O conninfo gpu-node-01", note="-O conninfo (new in OpenSSH 10.3)")
# a forward plus a session open at once, then list channels
p = subprocess.Popen(f"{MUX} gpu-node-01 'sleep 3'", shell=True, cwd=S)
time.sleep(1)
rec("mux_channels.txt", f"{MUX} -O channels gpu-node-01", note="-O channels (new in OpenSSH 10.3) while another session is open")
p.wait()
# kill the master: every session on it dies with it
p = subprocess.Popen(f"{MUX} gpu-node-01 'sleep 20; echo survived'", shell=True, cwd=S, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
time.sleep(1.5); t = time.perf_counter()
rc, o, e, ms = run(f"{MUX} -O exit gpu-node-01")
so, se = p.communicate(timeout=30)
save("mux_exit.txt", f"# a session riding the master while the master is told to exit\n$ {MUX} -O exit gpu-node-01\n{o}{e}\n--- the other session ---\nexit {p.returncode} after {round((time.perf_counter()-t)*1000)} ms\nstdout: {so}\nstderr: {se}")
json.dump(res, open(os.path.join(RAW, "mux_timing.json"), "w"), indent=1); print(json.dumps(res))
# round trips of a fresh login, read from an observer's timestamps
out = os.path.join(RAW, "wire_delay40.jsonl")
r = subprocess.Popen([sys.executable, os.path.join(S, "tools/wire_relay.py"), "30923", "30922", out]); time.sleep(0.4)
run(f"{SSH} bastion-obs true"); r.wait(timeout=10)
