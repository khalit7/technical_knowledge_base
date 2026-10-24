"""httpx client: python py_httpx.py URL [--ca CA] [--json FILE] [--timeout S] [--http2].
Prints status and streamed lines, or the exception exactly as the last line of its traceback would read."""
import argparse, httpx
a = argparse.ArgumentParser(); a.add_argument("url"); a.add_argument("--ca"); a.add_argument("--json"); a.add_argument("--timeout", type=float, default=10)
o = a.parse_args()
try:
    with httpx.Client(verify=o.ca or True, timeout=o.timeout) as c:
        req = c.build_request("POST", o.url, content=open(o.json, "rb").read(), headers={"content-type": "application/json"}) if o.json else c.build_request("GET", o.url)
        r = c.send(req, stream=True)
        print(r.http_version, r.status_code, r.reason_phrase)
        for line in r.iter_lines():
            print(line)
        r.raise_for_status()
except Exception as e:
    print(f"{type(e).__module__}.{type(e).__qualname__}: {e}")
