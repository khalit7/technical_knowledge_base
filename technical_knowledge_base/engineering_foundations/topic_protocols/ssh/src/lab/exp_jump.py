# Experiment 2: ProxyJump, seen from the laptop (-vvv), from an observer on the laptop's path
# (only the bastion handshake is readable), and from the bastion's sshd log.
import subprocess, time, json, sys
from common import *
def blog(name):  # bastion sshd log since the marker
    rc, o, e, ms = run("docker exec proto-ssh-bastion cat /var/log/sshd.log")
    return o
def mark():
    run("docker exec proto-ssh-bastion sh -c ': > /var/log/sshd.log'")
mark()
rec("vvv_jump.txt", f"{SSH} -vvv gpu-node-01 'hostname; echo ok'", note="ProxyJump bastion -> gpu-node-01 (OpenSSH 10.5p1 both)")
save("bastion_log_jump.txt", blog(""))
# observer on the laptop's path to the bastion, during a ProxyJump session
out = os.path.join(RAW, "wire_jump.jsonl")
r = subprocess.Popen([sys.executable, os.path.join(S, "tools/wire_relay.py"), "30923", "30922", out]); time.sleep(0.4)
rc, o, e, ms = run(f"{SSH} -o ProxyJump=bastion-obs gpu-node-01 'head -c 20000 /dev/zero | base64 | wc -c'")
r.wait(timeout=10)
ev = [json.loads(l) for l in open(out)]
open(out, "w").write(redact("".join(json.dumps(x) + "\n" for x in ev)))
print("jump via observer rc", rc, o.strip(), "events", len(ev))
# timing: direct to bastion vs one jump vs via jump to the legacy node
import statistics
t = {}
for name, cmd in [("bastion", f"{SSH} bastion true"), ("gpu-node-01 via bastion", f"{SSH} gpu-node-01 true")]:
    xs = [round(run(cmd)[3], 1) for _ in range(10)]
    t[name] = {"runs_ms": xs, "median_ms": statistics.median(xs)}
json.dump(t, open(os.path.join(RAW, "jump_timing.json"), "w"), indent=1); print(t)
