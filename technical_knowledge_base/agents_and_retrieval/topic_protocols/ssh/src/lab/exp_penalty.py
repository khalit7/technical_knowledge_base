# Experiment 9: PerSourcePenalties (OpenSSH 9.8+, on by default) on gpu-node-01: repeated failed logins from one
# address (the bastion) get that address refused for a while, with no log-parsing daemon.
import time
from common import *
run("docker exec proto-ssh-node1 sh -c 'mkdir -p /etc/ssh/sshd_config.d; echo PerSourcePenalties yes > /etc/ssh/sshd_config.d/pen.conf; : > /var/log/sshd.log; kill -HUP $(pgrep -o sshd)'")
time.sleep(1.5)
lines = []
for i in range(6):
    rc, o, e, ms = run(f"{SSH} -o IdentityFile=keys/junk0 alice@gpu-node-01 true")
    lines.append(f"attempt {i+1} (t={i*1.0:.0f} s): exit {rc}, {ms:.0f} ms: " + " / ".join(l for l in e.strip().splitlines() if l)[:200])
    time.sleep(1)
log = run("docker exec proto-ssh-node1 cat /var/log/sshd.log")[1]
keep = [l for l in log.splitlines() if any(s in l for s in ("penalt", "Penalt", "drop", "Failed", "Invalid", "invalid user", "Connection from"))]
cfg = run("docker exec proto-ssh-node1 sshd -T")[1]
pen = [l for l in cfg.splitlines() if l.lower().startswith("persourcepenalt") or l.lower().startswith("persourcenetblock") or l.lower().startswith("persourcemaxstartups")]
save("penalties.txt", "# six logins as alice with a key she has not authorised, one second apart, all from the bastion's address\n" + "\n".join(lines) +
     "\n--- gpu-node-01 sshd log (selected) ---\n" + "\n".join(keep[:30]) + "\n--- sshd -T with PerSourcePenalties on (defaults) ---\n" + "\n".join(pen) + "\n")
run("docker exec proto-ssh-node1 sh -c 'rm /etc/ssh/sshd_config.d/pen.conf; kill -HUP $(pgrep -o sshd)'")
print(open(os.path.join(RAW, "penalties.txt")).read())
