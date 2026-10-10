"""Scrape a vLLM /metrics endpoint every second until the stop file appears; write JSON lines.
Keeps gauges and counters, histogram _sum and _count (no buckets); finished-request counters keep their reason."""
import sys, time, json, urllib.request, os
url, out, stop = sys.argv[1], sys.argv[2], sys.argv[3]
f = open(out, "w")
t0 = time.time()
while not os.path.exists(stop):
    try:
        txt = urllib.request.urlopen(url + "/metrics", timeout=5).read().decode()
        row = {"t": round(time.time() - t0, 2)}
        for line in txt.splitlines():
            if line.startswith("#") or not line.startswith("vllm:"):
                continue
            name_lab, _, val = line.rpartition(" ")
            name = name_lab.split("{")[0]
            if name.endswith("_bucket"):
                continue
            if 'finished_reason="' in name_lab:
                name += "[" + name_lab.split('finished_reason="')[1].split('"')[0] + "]"
            try:
                row[name] = row.get(name, 0) + float(val)
            except ValueError:
                pass
        f.write(json.dumps(row) + "\n"); f.flush()
    except Exception as e:
        f.write(json.dumps({"t": round(time.time() - t0, 2), "err": repr(e)[:80]}) + "\n"); f.flush()
    time.sleep(1.0)
