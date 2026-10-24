"""Two requests on one keep-alive connection (a requests.Session reuses its pooled connection): python two_requests.py URL"""
import sys, requests
s = requests.Session()
for i in (1, 2):
    try:
        r = s.post(sys.argv[1], data=b"{}", headers={"content-type": "application/json"}, timeout=5)
        print(f"request {i}: {r.status_code} {r.text.strip()}")
    except Exception as e:
        print(f"request {i}: {type(e).__module__}.{type(e).__qualname__}: {e}")
