"""Call the API twice in a row and honour 429 Retry-After: python retry_after.py URL"""
import sys, time, requests
url = sys.argv[1]; body = open("../wire/request.json", "rb").read(); t0 = time.perf_counter()
for i in range(3):
    r = requests.post(url, data=body, headers={"content-type": "application/json"}, timeout=10)
    print(f"+{time.perf_counter() - t0:.2f} s  attempt {i + 1}: {r.status_code} {r.reason}  retry-after={r.headers.get('retry-after')}")
    if r.status_code == 200 and i == 0:
        continue  # the first call succeeds; send a second one at once
    if r.status_code == 429:
        time.sleep(float(r.headers["retry-after"])); continue
    break
