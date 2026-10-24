"""An agent's "fetch this URL" tool, written two ways, run against a rebinding name.
naive:  resolve the host, refuse if any address is internal, then hand the URL to urllib (which resolves AGAIN).
pinned: resolve once, refuse if internal, then connect to that exact address and send the name in the Host header.
The denylist holds 10.53.0.99, standing in for the cloud metadata address 169.254.169.254, and loopback.
Usage: python3 fetch_tool.py naive|pinned URL"""
import http.client, ipaddress, json, socket, sys, time, urllib.parse, urllib.request

DENY = [ipaddress.ip_network("10.53.0.99/32"), ipaddress.ip_network("169.254.0.0/16"), ipaddress.ip_network("127.0.0.0/8")]
mode, url = sys.argv[1], sys.argv[2]
u = urllib.parse.urlsplit(url); host, port = u.hostname, u.port or 80
steps = []


def resolve():
    addrs = sorted({a[4][0] for a in socket.getaddrinfo(host, port, socket.AF_INET, socket.SOCK_STREAM)})
    steps.append({"t": round(time.time(), 4), "step": "check: getaddrinfo", "addrs": addrs})
    return addrs


addrs = resolve()
if any(ipaddress.ip_address(a) in n for a in addrs for n in DENY):
    steps.append({"step": "refused: internal address"}); print(json.dumps({"mode": mode, "steps": steps})); sys.exit()
steps.append({"step": "allowed"})
if mode == "naive":
    body = urllib.request.urlopen(url, timeout=5).read().decode()  # resolves the name again, inside urllib
else:
    c = http.client.HTTPConnection(addrs[0], port, timeout=5)  # connect to the address that was checked
    c.request("GET", u.path or "/", headers={"Host": host}); body = c.getresponse().read().decode()
steps.append({"t": round(time.time(), 4), "step": "fetched", "body": body.strip()[:120]})
print(json.dumps({"mode": mode, "steps": steps}))
