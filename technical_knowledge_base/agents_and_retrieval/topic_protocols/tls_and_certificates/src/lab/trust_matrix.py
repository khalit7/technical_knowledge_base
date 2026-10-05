"""Which trust-store environment variable does each client read? A local server presents a certificate from a private
root (the lab's "TLS Lab Root CA"); each client is run with no variable, then with exactly one variable pointing at
that root. Then SSL_CERT_FILE is checked against a public host to show it REPLACES the bundle rather than adding to it.
Usage: OPENSSL=... python trust_matrix.py <pki dir> <port> <out.json>"""
import json, os, socket, ssl, subprocess, sys, threading, time
PKI, PORT, OUT = sys.argv[1], int(sys.argv[2]), sys.argv[3]
PY, HERE = sys.executable, os.path.dirname(os.path.abspath(__file__))
OPENSSL = os.environ["OPENSSL"]
URL = "https://localhost:%d/" % PORT
sctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER); sctx.load_cert_chain(PKI + "/fullchain.pem", PKI + "/leaf.key")
ls = socket.socket(); ls.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1); ls.bind(("127.0.0.1", PORT)); ls.listen(16)


def serve():
    while True:
        try:
            c, _ = ls.accept()
        except OSError:
            return
        try:
            s = sctx.wrap_socket(c, server_side=True); s.recv(4096)
            s.sendall(b"HTTP/1.1 200 OK\r\ncontent-length: 2\r\nconnection: close\r\n\r\nok"); s.close()
        except Exception:
            c.close()


threading.Thread(target=serve, daemon=True).start()
CLIENTS = {
    "curl (macOS, LibreSSL)": ["curl", "-sS", "-o", "/dev/null", "-w", "OK %{http_code}", URL],
    "Python urllib / ssl default": [PY, HERE + "/trust_client.py", "urllib", URL],
    "requests": [PY, HERE + "/trust_client.py", "requests", URL],
    "httpx": [PY, HERE + "/trust_client.py", "httpx", URL],
    "truststore": [PY, HERE + "/trust_client.py", "truststore", URL],
    "Node fetch": ["node", "-e", "fetch(process.argv[1]).then(r=>console.log('OK',r.status)).catch(e=>console.log('FAIL',(e.cause&&e.cause.code)||e.message))", URL],
    "openssl s_client 3.6": ["sh", "-c", OPENSSL + " s_client -connect localhost:%d -servername localhost </dev/null 2>/dev/null | grep 'Verify return code'" % PORT],
}
VARS = [None, "SSL_CERT_FILE", "REQUESTS_CA_BUNDLE", "CURL_CA_BUNDLE", "NODE_EXTRA_CA_CERTS"]
base = {k: v for k, v in os.environ.items() if k not in VARS}
rows = []
for name, cmd in CLIENTS.items():
    row = {"client": name, "cells": {}}
    for v in VARS:
        env = dict(base)
        if v:
            env[v] = PKI + "/root.pem"
        p = subprocess.run(cmd, env=env, capture_output=True, text=True, timeout=30)
        o = p.stdout.strip()
        if not o or o == "OK 000":  # curl prints its error on stderr and http_code 000
            o = "FAIL " + p.stderr.strip()
        o = o.splitlines()
        o = o[-1] if o else ""
        ok = o.startswith("OK") or "return code: 0 " in o
        row["cells"][v or "none"] = {"ok": ok, "out": o[:140]}
    rows.append(row)
    print(name, {k: c["ok"] for k, c in row["cells"].items()})
# SSL_CERT_FILE replaces the default bundle: a public host now fails for the clients that read it
pub = "https://api.anthropic.com/"
repl = []
for name in ("Python urllib / ssl default", "httpx", "requests"):
    lib = {"Python urllib / ssl default": "urllib", "httpx": "httpx", "requests": "requests"}[name]
    for v in (None, "SSL_CERT_FILE"):
        env = dict(base)
        if v:
            env[v] = PKI + "/root.pem"
        o = subprocess.run([PY, HERE + "/trust_client.py", lib, pub], env=env, capture_output=True, text=True, timeout=30).stdout.strip()
        repl.append({"client": name, "var": v or "none", "out": o})
        print("public", name, v, o)
ls.close()
import certifi
json.dump({"recorded": time.strftime("%Y-%m-%d"), "python": sys.version.split()[0], "certifi": certifi.__version__,
           "node": subprocess.run(["node", "--version"], capture_output=True, text=True).stdout.strip(),
           "curl": subprocess.run(["curl", "-V"], capture_output=True, text=True).stdout.splitlines()[0],
           "vars": [v or "none" for v in VARS], "rows": rows, "public_host": pub, "replace_check": repl}, open(OUT, "w"), indent=1)
