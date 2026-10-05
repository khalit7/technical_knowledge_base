"""E11 to E13: DNSSEC on the lab's own signed tree (valid, expired signatures, a root key roll against a stale trust
anchor), DNS rebinding against an agent's fetch tool, and CoreDNS's loop plugin. Output: out/sec.json"""
import json, os, re, time
from common import *

Q = "proto-dns-q"


def q(cmd):
    p = sh(["docker", "exec", Q, "sh", "-c", cmd], timeout=60)
    return (p.stdout + p.stderr).strip()


def delv_anchor(which):
    ds = open(os.path.join(WORK, "zones", "anchors", which + ".ds")).read().split()
    # ". 86400 IN DS tag alg dt digest"
    txt = 'trust-anchors {\n  . static-ds %s %s %s "%s";\n};\n' % (ds[4], ds[5], ds[6], "".join(ds[7:]))
    open(os.path.join(WORK, "zones", "anchors", which + ".delv"), "w").write(txt)


def val_unbound(anchor):
    unbound("proto-dns-unbound", "10.53.0.53", f'  trust-anchor-file: "/zones/anchors/{anchor}.ds"\n')
    time.sleep(3)


def dnssec(res):
    delv_anchor("old"); delv_anchor("new")
    D = "dig @10.53.0.53 {} +dnssec +multi +noall +comments +answer +authority | grep -v '^$'"
    hierarchy_up("signed"); time.sleep(2); val_unbound("old")
    r = {"anchor_old": open(os.path.join(WORK, "zones", "anchors", "old.ds")).read().strip(),
         "anchor_new": open(os.path.join(WORK, "zones", "anchors", "new.ds")).read().strip()}
    r["valid"] = q(D.format("api.llm.test A"))
    r["chain"] = {k: q(f"dig @10.53.0.53 {k} +dnssec +noall +answer | grep -v RRSIG | cut -c1-150")
                  for k in [". DNSKEY", "test. DS", "test. DNSKEY", "llm.test. DS", "llm.test. DNSKEY"]}
    r["delv"] = q("delv @10.53.0.53 -a /zones/anchors/old.delv +vtrace api.llm.test A 2>&1 | head -60")
    r["nxdomain_proof"] = q(D.format("nope.llm.test A"))
    hierarchy_up("expired"); val_unbound("old")
    r["expired"] = q(D.format("api.llm.test A"))
    r["expired_cd"] = q("dig @10.53.0.53 api.llm.test A +cd +noall +comments +answer | grep -E 'status|flags|IN'")
    r["expired_log"] = [l.split("] ", 1)[-1] for l in logs("proto-dns-unbound", "2000-01-01T00:00:00Z") if "validation failure" in l or "SERVFAIL" in l][:4]
    hierarchy_up("rolled"); val_unbound("old")
    r["rolled_old_anchor"] = q("dig @10.53.0.53 api.llm.test A +noall +comments | grep -E 'status|flags'") + "\n" + \
        q("dig @10.53.0.53 test. NS +noall +comments | grep -E 'status'")
    r["rolled_old_log"] = [l.split("] ", 1)[-1] for l in logs("proto-dns-unbound", "2000-01-01T00:00:00Z") if "validation failure" in l][:3]
    val_unbound("new")
    r["rolled_new_anchor"] = q("dig @10.53.0.53 api.llm.test A +noall +comments +answer | grep -E 'status|flags|IN'")
    hierarchy_up("unsigned"); val_unbound("old")
    r["unsigned_with_anchor"] = q("dig @10.53.0.53 api.llm.test A +noall +comments | grep -E 'status|flags'")
    res["dnssec"] = r


def rebinding(res):
    hierarchy_up("unsigned"); unbound("proto-dns-unbound", "10.53.0.53", "")
    for name, ip, body in [("proto-dns-attweb", "10.53.0.66", "attacker page"),
                           ("proto-dns-meta", "10.53.0.99", '{"AccessKeyId":"LAB-FAKE-KEY","Note":"stand-in for instance credentials"}')]:
        d = os.path.join(WORK, "www", name); os.makedirs(d, exist_ok=True); open(os.path.join(d, "index.html"), "w").write(body + "\n")
        run_bg(name, ip, GLIBC, ["python3", "-m", "http.server", "80", "-d", "/www"], mounts=[(d, "/www:ro")])
    run_bg("proto-dns-evil", "10.53.0.13", TOOLS, ["python3", "-u", "/lab/evil.py"], mounts=[(HERE, "/lab:ro")])
    time.sleep(3)
    runs = []
    for mode in ["naive", "pinned"]:
        run_bg("proto-dns-evil", "10.53.0.13", TOOLS, ["python3", "-u", "/lab/evil.py"], mounts=[(HERE, "/lab:ro")]); time.sleep(1.5)
        out = client(f"python3 /lab/fetch_tool.py {mode} http://rebind.attacker.test/", image=GLIBC)
        runs.append({"mode": mode, "out": json.loads(out.strip().splitlines()[-1]),
                     "evil_log": [l.split(" ", 1)[1] for l in logs("proto-dns-evil", "2000-01-01T00:00:00Z") if "->" in l]})
    res["rebinding"] = runs
    stop("proto-dns-evil", "proto-dns-attweb", "proto-dns-meta")


def loop(res):
    d = os.path.join(WORK, "conf", "proto-dns-loop"); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "Corefile"), "w").write(".:53 {\n  forward . 127.0.0.1:53\n  loop\n  log\n}\n")
    stop("proto-dns-loop")
    p = sh(["docker", "run", *CAP, "--name", "proto-dns-loop", "--network", NET, "--ip", "10.53.0.30", "-v", f"{d}:/conf:ro",
            COREDNS, "-conf", "/conf/Corefile"], timeout=60)
    res["loop"] = {"corefile": open(os.path.join(d, "Corefile")).read(), "exit": p.returncode, "out": (p.stdout + p.stderr).strip().splitlines()[-6:]}


def main():
    hierarchy_up("unsigned")
    run_bg(Q, "10.53.0.101", TOOLS, ["sleep", "1800"], mounts=[(os.path.join(WORK, "zones"), "/zones:ro")])
    res = {"when": now_iso()}
    dnssec(res); rebinding(res); loop(res)
    stop(Q)
    save("sec", res)


if __name__ == "__main__":
    main()
