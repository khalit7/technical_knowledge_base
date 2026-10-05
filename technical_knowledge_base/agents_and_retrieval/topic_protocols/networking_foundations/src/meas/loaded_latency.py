"""Latency under load: ping a public resolver every 100 ms for 9 s; from 2 s to the end of one 25 MB download
(Cloudflare's speed-test endpoint, one TCP connection, CUBIC on the sending side as far as we know) the ping
round trip shows how much queue the download builds in front of the slowest link (bufferbloat).

Prints JSON: each ping's send time and round trip, the download's start and end. Usage: python loaded_latency.py
"""
import json, re, subprocess, threading, time, urllib.request, ssl
import certifi

URL = "https://speed.cloudflare.com/__down?bytes=25000000"


def main():
    t0 = time.perf_counter(); pings = []; dl = {}
    p = subprocess.Popen(["ping", "-i", "0.1", "-c", "90", "1.1.1.1"], stdout=subprocess.PIPE, text=True)
    def reader():
        for line in p.stdout:
            m = re.search(r"icmp_seq=(\d+) .*time=([\d.]+) ms", line)
            if m:
                pings.append([round(time.perf_counter() - t0, 3), int(m.group(1)), float(m.group(2))])
    th = threading.Thread(target=reader); th.start()
    time.sleep(2.0)
    ctx = ssl.create_default_context(cafile=certifi.where())
    dl["start_s"] = round(time.perf_counter() - t0, 3)
    with urllib.request.urlopen(urllib.request.Request(URL, headers={"User-Agent": "kb-networking-foundations"}), context=ctx) as r:
        n = 0
        while True:
            b = r.read(65536)
            if not b: break
            n += len(b)
    dl["end_s"] = round(time.perf_counter() - t0, 3); dl["bytes"] = n
    dl["mbps"] = round(n * 8 / (dl["end_s"] - dl["start_s"]) / 1e6, 1)
    p.wait(); th.join()
    lost = 90 - len(pings)
    idle = [r for t, s, r in pings if t < dl["start_s"]]
    load = [r for t, s, r in pings if dl["start_s"] + 0.5 < t < dl["end_s"]]
    med = lambda xs: sorted(xs)[len(xs) // 2] if xs else None
    print(json.dumps(dict(recorded=time.strftime("%Y-%m-%d %H:%M %Z"), target="1.1.1.1 (ICMP echo every 100 ms)", download=dl,
                          idle_median_ms=med(idle), loaded_median_ms=med(load), pings_lost=lost, pings=pings), indent=1))


if __name__ == "__main__":
    main()
