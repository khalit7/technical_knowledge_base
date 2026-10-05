"""Inside a lab pod: 10 requests to the stand-in API, first with a new connection each time (urllib.request.urlopen,
the shape of code that builds a fresh client or Session per call), then over one kept-alive connection
(http.client.HTTPConnection, the shape of a pooled Session). Prints phase markers with times, so the DNS packets the
pod sent can be counted per phase. Python adds no DNS cache of its own: every new connection calls getaddrinfo."""
import http.client, json, time, urllib.request

URL_HOST, PORT, N = "api.llm.test", 8080, 10
print(json.dumps({"mark": "fresh_start", "t": time.time()}), flush=True)
t = time.perf_counter()
for _ in range(N):
    urllib.request.urlopen(f"http://{URL_HOST}:{PORT}/", timeout=10).read()
print(json.dumps({"mark": "fresh_end", "t": time.time(), "ms": round((time.perf_counter() - t) * 1000, 1)}), flush=True)
time.sleep(1)
print(json.dumps({"mark": "pooled_start", "t": time.time()}), flush=True)
t = time.perf_counter()
c = http.client.HTTPConnection(URL_HOST, PORT, timeout=10)
for _ in range(N):
    c.request("GET", "/"); c.getresponse().read()
print(json.dumps({"mark": "pooled_end", "t": time.time(), "ms": round((time.perf_counter() - t) * 1000, 1)}), flush=True)
