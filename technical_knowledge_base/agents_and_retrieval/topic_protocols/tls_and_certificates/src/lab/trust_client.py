"""One HTTPS GET with one Python client library; prints OK <status> or the error. Usage: trust_client.py <lib> <url>
lib: urllib (ssl.create_default_context), requests, httpx, truststore (truststore.SSLContext with urllib)"""
import sys, ssl, urllib.request
lib, url = sys.argv[1], sys.argv[2]
try:
    if lib == "urllib":
        r = urllib.request.urlopen(url, timeout=5, context=ssl.create_default_context()); print("OK", r.status)
    elif lib == "requests":
        import requests; print("OK", requests.get(url, timeout=5).status_code)
    elif lib == "httpx":
        import httpx; print("OK", httpx.get(url, timeout=5).status_code)
    elif lib == "truststore":
        import truststore
        r = urllib.request.urlopen(url, timeout=5, context=truststore.SSLContext(ssl.PROTOCOL_TLS_CLIENT)); print("OK", r.status)
except urllib.error.HTTPError as e:
    print("OK", e.code)
except Exception as e:
    m = str(e); i = m.find("certificate verify failed")
    print("FAIL", type(e).__name__, (m[i:i + 70] if i >= 0 else m[:90]).replace("\n", " "))
