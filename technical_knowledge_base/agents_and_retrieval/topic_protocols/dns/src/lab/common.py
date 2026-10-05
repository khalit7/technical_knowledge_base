"""Helpers for the DNS lab: one private Docker network (internal, no route out), real DNS software in containers.

Every container is named proto-dns-*, capped at --cpus 1 --memory 1g and started with --rm. Nothing here stops,
prunes or touches any other container. Host side: plain Python 3 (stdlib only) driving the docker CLI.

Addresses (all on the internal network 10.53.0.0/16; none is reachable from outside the lab):
  10.53.0.10 root     CoreDNS 1.12.4 serving the lab's root zone "."
  10.53.0.11 tld      CoreDNS serving "test."
  10.53.0.12 auth     CoreDNS serving "llm.test." (the running example's API name lives here)
  10.53.0.13 evil     dnspython authoritative server for "attacker.test." (rebinding run)
  10.53.0.20 cluster  CoreDNS standing in for a Kubernetes cluster's DNS: cluster.local plus forward to unbound
  10.53.0.21 lossy    a UDP relay in front of 10.53.0.20 that drops chosen packets
  10.53.0.53 unbound  Unbound 1.25.2, a validating recursive resolver whose root hints point at 10.53.0.10
  10.53.0.54 unbound2 a second Unbound with serve-expired on (RFC 8767)
  10.53.0.80 api      a tiny HTTP server standing in for the LLM API; 10.53.0.99 meta, a stand-in for 169.254.169.254
"""
import json, os, subprocess, time

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
WORK = os.environ.get("DNS_WORK") or os.path.join(os.environ.get("TMPDIR", "/tmp"), "proto-dns-work")
NET = "proto-dns-net"
TOOLS, GLIBC, COREDNS = "proto-dns-tools:1", "proto-dns-glibc:1", "coredns/coredns:1.12.4"
CAP = ["--cpus", "1", "--memory", "1g", "--rm"]


def sh(cmd, check=False, timeout=180):
    p = subprocess.run(cmd, shell=isinstance(cmd, str), capture_output=True, text=True, timeout=timeout)
    if check and p.returncode:
        raise RuntimeError(f"{cmd}: {p.stderr}")
    return p


def net_up():
    if sh(["docker", "network", "inspect", NET]).returncode:
        sh(["docker", "network", "create", "--internal", "--subnet", "10.53.0.0/16", NET], check=True)


def stop(*names):
    for n in names:
        assert n.startswith("proto-dns-")
        sh(["docker", "rm", "-f", n])


def run_bg(name, ip, image, args, mounts=(), extra=()):
    """Start a detached lab container (replacing a previous one of the same name)."""
    stop(name)
    m = []
    for src, dst in mounts:
        m += ["-v", f"{src}:{dst}"]
    sh(["docker", "run", "-d", *CAP, "--name", name, "--network", NET, "--ip", ip, *m, *extra, image, *args], check=True)


def coredns(name, ip, corefile):
    d = os.path.join(WORK, "conf", name); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "Corefile"), "w").write(corefile)
    run_bg(name, ip, COREDNS, ["-conf", "/conf/Corefile"], mounts=[(d, "/conf:ro"), (os.path.join(WORK, "live"), "/zones:ro")])


def auth_corefile(zone, fname, reload="1s"):
    return f"{zone}:53 {{\n  file /zones/{fname} {zone} {{\n    reload {reload}\n  }}\n  log\n  errors\n}}\n"


def unbound(name, ip, extra=""):
    d = os.path.join(WORK, "conf", name); os.makedirs(d, exist_ok=True)
    open(os.path.join(d, "root.hints"), "w").write(". 3600000 NS a.root-servers.test.\na.root-servers.test. 3600000 A 10.53.0.10\n")
    conf = f"""server:
  interface: 0.0.0.0
  access-control: 10.53.0.0/16 allow
  do-ip6: no
  chroot: ""
  username: ""
  directory: "/conf"
  pidfile: ""
  use-syslog: no
  logfile: ""
  verbosity: 1
  log-queries: yes
  log-replies: yes
  log-servfail: yes
  val-log-level: 2
  root-hints: "/conf/root.hints"
  local-zone: "test." nodefault
  local-zone: "10.in-addr.arpa." nodefault
  do-not-query-localhost: yes
  so-sndbuf: 0
{extra}"""
    open(os.path.join(d, "unbound.conf"), "w").write(conf)
    run_bg(name, ip, TOOLS, ["unbound", "-d", "-c", "/conf/unbound.conf"], mounts=[(d, "/conf"), (os.path.join(WORK, "zones"), "/zones:ro")])


def install_zones(zset, names=("root", "test", "llm.test")):
    """Copy one generated set into the live directory the authoritative servers read (reload 1s)."""
    live = os.path.join(WORK, "live"); os.makedirs(live, exist_ok=True)
    for n in names:
        src = open(os.path.join(WORK, "zones", zset, n + ".zone")).read()
        tmp = os.path.join(live, n + ".zone.tmp"); open(tmp, "w").write(src); os.replace(tmp, os.path.join(live, n + ".zone"))


def hierarchy_up(zset="unsigned"):
    net_up(); install_zones(zset)
    coredns("proto-dns-root", "10.53.0.10", auth_corefile(".", "root.zone"))
    coredns("proto-dns-tld", "10.53.0.11", auth_corefile("test.", "test.zone"))
    coredns("proto-dns-auth", "10.53.0.12", auth_corefile("llm.test.", "llm.test.zone"))


def client(cmd, image=TOOLS, resolv="nameserver 10.53.0.53\n", name="proto-dns-pod", ip="10.53.0.100", timeout=180, extra=()):
    """Run a one-shot client with exactly this /etc/resolv.conf (bind-mounted, so Docker's own DNS is not involved)."""
    d = os.path.join(WORK, "conf", name); os.makedirs(d, exist_ok=True)
    rc = os.path.join(d, "resolv.conf"); open(rc, "w").write(resolv)
    stop(name)
    p = sh(["docker", "run", *CAP, "--name", name, "--network", NET, "--ip", ip, "-v", f"{rc}:/etc/resolv.conf:ro",
            "-v", f"{HERE}:/lab:ro", *extra, image, "sh", "-c", cmd], timeout=timeout)
    return p.stdout + p.stderr


def capture_start(target="proto-dns-pod", name="proto-dns-cap", fname="cap.txt"):
    """tcpdump inside the target container's own network namespace (no host privileges involved)."""
    stop(name)
    d = os.path.join(WORK, "cap"); os.makedirs(d, exist_ok=True)
    sh(["docker", "run", "-d", *CAP, "--name", name, "--network", f"container:{target}", "--cap-add", "NET_RAW",
        "--cap-add", "NET_ADMIN", "-v", f"{d}:/cap", TOOLS, "sh", "-c",
        f"tcpdump -i eth0 -n -tt -vv -l port 53 > /cap/{fname} 2>/cap/{fname}.err"], check=True)


def logs(name, since):
    p = sh(["docker", "logs", "-t", "--since", since, name])
    return (p.stdout + p.stderr).splitlines()


def redact(s):
    """Remove the recording machine's private strings (patterns from the root's git-ignored file) and paths."""
    import re, sys
    sys.path.insert(0, os.path.normpath(os.path.join(HERE, "..", "..", "..", "src")))
    import private_patterns as pp
    s = re.sub(pp.alternation(), "[redacted]", s, flags=re.I)
    s = s.replace(WORK, "$WORK").replace(os.path.expanduser("~"), "~")
    return s


def now_iso():
    return time.strftime("%Y-%m-%dT%H:%M:%S", time.gmtime()) + "Z"


def save(name, obj):
    os.makedirs(OUT, exist_ok=True)
    s = json.dumps(obj, indent=1, ensure_ascii=False)
    s = redact(s)
    open(os.path.join(OUT, name + ".json"), "w").write(s)
    return obj
