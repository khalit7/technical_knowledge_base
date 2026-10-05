"""E5 to E7 and E14: a Kubernetes-style pod resolver, for real, with glibc (Debian 13, glibc 2.41) and musl (Alpine,
musl 1.2.6). Each pod gets the /etc/resolv.conf kubelet writes for dnsPolicy ClusterFirst; a real CoreDNS stands in
for the cluster DNS (cluster.local from a zone file, everything else forwarded to Unbound and the lab's root).
tcpdump runs inside the pod's own network namespace and records every DNS packet the pod sends and receives.
Output: out/pod.json"""
import json, os, shutil, time
from common import *

K8S = "search default.svc.cluster.local svc.cluster.local cluster.local\nnameserver {ns}\noptions ndots:{nd}{more}\n"
K8S4 = "search default.svc.cluster.local svc.cluster.local cluster.local us-east-1.compute.internal\nnameserver {ns}\noptions ndots:{nd}{more}\n"
IMG = {"glibc": GLIBC, "musl": TOOLS}


def cluster_up():
    live = os.path.join(WORK, "live"); os.makedirs(live, exist_ok=True)
    shutil.copy(os.path.join(HERE, "cluster.local.zone"), os.path.join(live, "cluster.local.zone"))
    coredns("proto-dns-cluster", "10.53.0.20",
            "cluster.local:53 {\n  file /zones/cluster.local.zone cluster.local\n  log\n  errors\n}\n"
            ".:53 {\n  forward . 10.53.0.53\n  cache 30\n  loop\n  log\n  errors\n}\n")
    run_bg("proto-dns-api", "10.53.0.80", GLIBC, ["python3", "-m", "http.server", "8080"])


def lossy(rule):
    run_bg("proto-dns-lossy", "10.53.0.21", TOOLS, ["python3", "-u", "/lab/lossy.py", "10.53.0.20", rule], mounts=[(HERE, "/lab:ro")])
    time.sleep(1.5)


def pod(libc, resolv, cmd, capname):
    """Start a pod that idles, attach tcpdump to its namespace, run cmd, return (stdout, packet lines)."""
    name = "proto-dns-pod"
    d = os.path.join(WORK, "conf", name); os.makedirs(d, exist_ok=True)
    rc = os.path.join(d, "resolv.conf"); open(rc, "w").write(resolv)
    run_bg(name, "10.53.0.100", IMG[libc], ["sleep", "900"], mounts=[(rc, "/etc/resolv.conf:ro"), (HERE, "/lab:ro")])
    capture_start(name, "proto-dns-cap", capname); time.sleep(1.5)
    p = sh(["docker", "exec", name, "sh", "-c", cmd], timeout=120)
    time.sleep(1.0)
    stop("proto-dns-cap", name)
    pk = open(os.path.join(WORK, "cap", capname)).read().splitlines()
    return p.stdout + p.stderr, pk


def scenario(label, libc, resolv, names, rule=None):
    if rule is not None:
        lossy(rule)
    out, pk = pod(libc, resolv, "python3 /lab/resolve.py " + " ".join(names), label + ".txt")
    r = {"label": label, "libc": libc, "resolv": resolv, "rule": rule, "calls": [json.loads(l) for l in out.splitlines() if l.startswith("{")],
         "stderr": [l for l in out.splitlines() if not l.startswith("{")], "packets": pk}
    if rule is not None:
        r["relay_log"] = [l.split(" ", 1)[1] for l in logs("proto-dns-lossy", "2000-01-01T00:00:00Z") if "forwarded" in l or "DROPPED" in l]
        stop("proto-dns-lossy")
    print(label, [(c["name"], c["ms"], c.get("ok")) for c in r["calls"]], len(pk), flush=True)
    return r


def api_server(keepalive):
    """The stand-in API: Python's http.server, answering HTTP/1.0 (closes after each response, its default) or HTTP/1.1."""
    v = "HTTP/1.1" if keepalive else "HTTP/1.0"
    run_bg("proto-dns-api", "10.53.0.80", GLIBC, ["python3", "-c",
           "import http.server as h; h.test(HandlerClass=h.SimpleHTTPRequestHandler, protocol='%s', port=8080, bind='0.0.0.0')" % v])
    time.sleep(1.5)


def http_runs(res):
    """E7: clients without a DNS cache, from inside the ndots:5 pod; the server first closes every connection, then keeps them."""
    res["http"] = {}
    for keep in (False, True):
        api_server(keep)
        out, pk = pod("glibc", K8S.format(ns="10.53.0.20", nd=5, more=""), "python3 /lab/http_clients.py", "http.txt")
        res["http"]["keepalive" if keep else "close"] = {"out": [json.loads(l) for l in out.splitlines() if l.startswith("{")], "packets": pk}


def main():
    hierarchy_up("unsigned"); unbound("proto-dns-unbound", "10.53.0.53", ""); cluster_up(); time.sleep(3)
    res = {"when": now_iso(), "versions": {"glibc": "Debian 13 glibc 2.41", "musl": "Alpine musl 1.2.6", "coredns": "1.12.4", "unbound": "1.25.2", "kernel": "5.10 (Docker Desktop VM)"}, "scenarios": []}
    S = res["scenarios"]
    names = ["api.llm.test", "api.llm.test.", "kubernetes.default", "myjob-headless", "nope.llm.test"]
    for libc in ["glibc", "musl"]:
        S.append(scenario(f"{libc}_ndots5", libc, K8S.format(ns="10.53.0.20", nd=5, more=""), names))
        S.append(scenario(f"{libc}_ndots1", libc, K8S.format(ns="10.53.0.20", nd=1, more=""), names))
        S.append(scenario(f"{libc}_ndots5_4dom", libc, K8S4.format(ns="10.53.0.20", nd=5, more=""), ["api.llm.test"]))
    # a lost packet: the relay drops the first AAAA query for each name
    S.append(scenario("glibc_drop_aaaa", "glibc", K8S.format(ns="10.53.0.21", nd=5, more=""), ["api.llm.test."], "first-aaaa"))
    S.append(scenario("glibc_drop_aaaa_t1", "glibc", K8S.format(ns="10.53.0.21", nd=5, more="\noptions timeout:1 attempts:2"), ["api.llm.test."], "first-aaaa"))
    S.append(scenario("glibc_drop_aaaa_sr", "glibc", K8S.format(ns="10.53.0.21", nd=5, more="\noptions single-request-reopen"), ["api.llm.test."], "first-aaaa"))
    S.append(scenario("musl_drop_aaaa", "musl", K8S.format(ns="10.53.0.21", nd=5, more=""), ["api.llm.test."], "first-aaaa"))
    # two nameservers, the first one dead (the relay at 10.53.0.21 drops everything)
    two = "nameserver 10.53.0.21\nnameserver 10.53.0.20\n"
    S.append(scenario("glibc_dead_first", "glibc", two, ["api.llm.test."], "all"))
    S.append(scenario("musl_dead_first", "musl", two, ["api.llm.test."], "all"))
    # what each failure looks like to the application (E14)
    fails = ["nope.llm.test.", "x.lame.test."]  # NXDOMAIN; SERVFAIL (lame.test. is delegated to a server that refuses it)
    S.append(scenario("glibc_errors", "glibc", "nameserver 10.53.0.53\n", fails))
    S.append(scenario("musl_errors", "musl", "nameserver 10.53.0.53\n", fails))
    S.append(scenario("glibc_no_server", "glibc", "nameserver 10.53.0.21\n", ["api.llm.test."], "all"))
    S.append(scenario("musl_no_server", "musl", "nameserver 10.53.0.21\n", ["api.llm.test."], "all"))
    # a 40-address answer (about 670 bytes): over the 512-byte limit of a query without EDNS
    S.append(scenario("glibc_big", "glibc", "nameserver 10.53.0.53\n", ["pool.llm.test."]))
    S.append(scenario("musl_big", "musl", "nameserver 10.53.0.53\n", ["pool.llm.test."]))
    http_runs(res)
    res["cluster_log"] = logs("proto-dns-cluster", "2000-01-01T00:00:00Z")[-40:]
    save("pod", res)


if __name__ == "__main__":
    import sys
    if sys.argv[1:] == ["http"]:  # rerun only E7 and merge it into out/pod.json
        hierarchy_up("unsigned"); unbound("proto-dns-unbound", "10.53.0.53", ""); cluster_up(); time.sleep(3)
        res = json.load(open(os.path.join(OUT, "pod.json"))); http_runs(res); save("pod", res)
    else:
        main()
