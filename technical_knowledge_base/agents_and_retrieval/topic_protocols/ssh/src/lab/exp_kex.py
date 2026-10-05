# Experiment 1: the handshake to the bastion as an observer sees it, for four key exchanges,
# plus -vvv of the default one, plus connection-time medians per key exchange.
import subprocess, time, json, statistics, sys
from common import *
KEX = ["mlkem768x25519-sha256", "sntrup761x25519-sha512", "curve25519-sha256", "ecdh-sha2-nistp256"]
res = {}
for k in KEX:
    out = os.path.join(RAW, f"wire_{k}.jsonl")
    r = subprocess.Popen([sys.executable, os.path.join(S, "tools/wire_relay.py"), "30923", "30922", out])
    time.sleep(0.4)
    rc, o, e, ms = run(f"{SSH} -o HostName=127.0.0.1 -o Port=30923 -o KexAlgorithms={k} bastion true")
    r.wait(timeout=10)
    ev = [json.loads(l) for l in open(out)]
    res[k] = {"rc": rc, "events": len(ev)}
    open(out, "w").write(redact("".join(json.dumps(x) + "\n" for x in ev)))
# -vvv of the default
rec("vvv_bastion.txt", f"{SSH} -vvv bastion true", note="default config, client OpenSSH 10.3p1 (macOS), server OpenSSH 10.5p1 (alpine edge)")
# timing: 15 fresh connections per kex, no added delay
tim = {}
for k in KEX:
    xs = []
    for i in range(15):
        rc, o, e, ms = run(f"{SSH} -o KexAlgorithms={k} bastion true")
        xs.append(round(ms, 1))
    tim[k] = {"runs_ms": xs, "median_ms": statistics.median(xs)}
json.dump({"wire": res, "timing": tim}, open(os.path.join(RAW, "kex_summary.json"), "w"), indent=1)
print(json.dumps({k: v["median_ms"] for k, v in tim.items()}))
