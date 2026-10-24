"""Inside a lab pod: call getaddrinfo (the C library's stub resolver, exactly what requests, httpx, urllib and curl
call) for each name and print one JSON line per call: name, milliseconds, addresses or the error.
Usage: python3 resolve.py NAME [NAME ...]"""
import json, socket, sys, time

for name in sys.argv[1:]:
    t0 = time.time(); t = time.perf_counter()
    try:
        ai = socket.getaddrinfo(name, 443, type=socket.SOCK_STREAM)
        r = {"name": name, "ok": True, "addrs": sorted({a[4][0] for a in ai})}
    except socket.gaierror as e:
        r = {"name": name, "ok": False, "errno": e.errno, "error": f"socket.gaierror: {e}"}
    r["ms"] = round((time.perf_counter() - t) * 1000, 1); r["t0"] = round(t0, 4)
    print(json.dumps(r), flush=True)
