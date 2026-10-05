"""Stream the running example and stamp each SSE event with its arrival time: python sse_times.py URL [--timeout S]
Prints "+0.123 s  event: ... text" per event; a broken stream ends with the exception as the client raises it."""
import argparse, json, time, httpx
a = argparse.ArgumentParser(); a.add_argument("url"); a.add_argument("--timeout", type=float, default=30); a.add_argument("--gzip", action="store_true")
o = a.parse_args()
body = open("../wire/request.json", "rb").read()
t0 = time.perf_counter(); ev = None
hdr = {"content-type": "application/json", "accept-encoding": "gzip" if o.gzip else "identity"}
try:
    with httpx.stream("POST", o.url, content=body, headers=hdr, timeout=o.timeout) as r:
        print(f"+{time.perf_counter() - t0:.3f} s  HTTP {r.status_code}  content-encoding: {r.headers.get('content-encoding', '-')}")
        for line in r.iter_lines():
            if line.startswith("event:"):
                ev = line[7:]
            elif line.startswith("data:"):
                d = json.loads(line[5:]); txt = d.get("delta", {}).get("text", "")
                print(f"+{time.perf_counter() - t0:.3f} s  {ev:20s} {txt!r}" if txt else f"+{time.perf_counter() - t0:.3f} s  {ev}")
except Exception as e:
    print(f"+{time.perf_counter() - t0:.3f} s  {type(e).__module__}.{type(e).__qualname__}: {e}")
