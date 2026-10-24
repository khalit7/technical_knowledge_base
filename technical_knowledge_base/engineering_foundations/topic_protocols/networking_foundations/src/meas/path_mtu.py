"""Find the path MTU to a public anycast resolver with don't-fragment pings (macOS ping / ping6), and record the
ICMP "too big" message the path sends back. IPv6 is tried once: ping6 -D needs root on macOS, so its result is the error. Low volume: one ping per probe, about 25 probes in all.

Local network addresses (the home router, this laptop's IPv6 address) are replaced with labels before anything is
printed: generic patterns for private and global addresses plus the git-ignored private patterns of the root page.
Usage: python path_mtu.py > out/path_mtu.json
"""
import json, os, re, subprocess, sys, time

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src"))
import private_patterns  # noqa: E402

V4, V6 = "1.1.1.1", "2606:4700:4700::1111"


def redact(s):
    s = re.sub(r"\b192\.168\.\d+\.\d+\b", "<home router>", s)
    s = re.sub(r"\b10\.\d+\.\d+\.\d+\b", "<LAN address>", s)
    s = re.sub(r"\b172\.(1[6-9]|2\d|3[01])\.\d+\.\d+\b", "<LAN address>", s)
    s = re.sub(r"\bfe80::[0-9a-f:%a-z0-9]+", "<link-local address>", s, flags=re.I)
    # any global IPv6 that is not the destination: this laptop's or the router's address
    s = re.sub(r"\b(?!2606:4700:4700::1111\b)2[0-9a-f]{3}:[0-9a-f:]+\b", "<this network's IPv6 address>", s, flags=re.I)
    alt = private_patterns.alternation()
    s = re.sub(alt, "<redacted>", s)
    return s


def ping(v6, size):
    cmd = (["ping6", "-D", "-c", "1", "-i", "1", "-s", str(size), V6] if v6 else
           ["ping", "-D", "-c", "1", "-t", "3", "-s", str(size), V4])
    p = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    out = redact((p.stdout + p.stderr).strip())
    ok = (" bytes from " in out) and ("frag needed" not in out) and ("too big" not in out.lower())
    return ok, out, " ".join(cmd)


def search(v6):
    hdr = 48 if v6 else 28          # IPv6 40 + ICMPv6 8, or IPv4 20 + ICMP 8
    lo, hi = (1232, 1452) if v6 else (1172, 1472)
    probes = []
    for size in (lo, hi, hi + 1):
        ok, out, cmd = ping(v6, size); probes.append(dict(cmd=cmd, size=size, packet=size + hdr, ok=ok, out=out)); time.sleep(0.3)
    a, b = lo, hi
    if not probes[1]["ok"]:
        while b - a > 1:
            m = (a + b) // 2
            ok, out, cmd = ping(v6, m); probes.append(dict(cmd=cmd, size=m, packet=m + hdr, ok=ok, out=out)); time.sleep(0.3)
            a, b = (m, b) if ok else (a, m)
        best = a
    else:
        best = hi
    return dict(family="IPv6" if v6 else "IPv4", dest=V6 if v6 else V4, header_bytes=hdr, largest_payload=best,
                path_mtu=best + hdr, probes=probes)


def rtt():
    p = subprocess.run(["ping", "-c", "10", "-i", "0.2", V4], capture_output=True, text=True)
    return redact(p.stdout.strip().splitlines()[-1])


if __name__ == "__main__":
    out = dict(recorded=time.strftime("%Y-%m-%d %H:%M %Z"),
               ifconfig_en0_mtu=subprocess.run("ifconfig en0 | head -1 | sed 's/.*mtu //'", shell=True, capture_output=True, text=True).stdout.strip(),
               v4=search(False), v6_dontfrag=dict(zip(('ok','out','cmd'), ping(True, 1452))), ping_rtt_v4=rtt())
    print(json.dumps(out, indent=1))
