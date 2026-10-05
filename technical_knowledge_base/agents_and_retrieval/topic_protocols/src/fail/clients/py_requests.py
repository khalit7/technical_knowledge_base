"""requests client: python py_requests.py URL [--ca CA] [--json FILE] [--timeout S] [--cert C --key K].
Prints the status line, or the exception exactly as the last line of its traceback would read."""
import argparse, sys, requests
a = argparse.ArgumentParser(); a.add_argument("url"); a.add_argument("--ca"); a.add_argument("--json"); a.add_argument("--timeout", type=float, default=10); a.add_argument("--cert"); a.add_argument("--key")
o = a.parse_args()
try:
    kw = dict(timeout=o.timeout, verify=o.ca or True, stream=True, cert=(o.cert, o.key) if o.cert else None)
    r = requests.post(o.url, data=open(o.json, "rb").read(), headers={"content-type": "application/json"}, **kw) if o.json else requests.get(o.url, **kw)
    print(r.status_code, r.reason)
    for line in r.iter_lines():
        print(line.decode())
except Exception as e:
    print(f"{type(e).__module__}.{type(e).__qualname__}: {e}")
