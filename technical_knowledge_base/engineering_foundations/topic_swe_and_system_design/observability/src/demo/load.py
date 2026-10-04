"""Load generator: 4 concurrent clients, phases normal 90 s, incident 90 s, recovery 45 s."""
import json, os, threading, time, urllib.request, urllib.error, random
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
PH = [("normal", 90), ("incident", 90), ("recovery", 45)]
res = []; lk = threading.Lock(); stop = False; T0 = time.time()
def worker(i):
    r = random.Random(i); n = 0
    while not stop:
        n += 1
        body = json.dumps({"conv": "c%d" % r.randint(1, 50), "text": "hello",
                           "user": "user%d@example.com" % r.randint(1, 50)}).encode()
        req = urllib.request.Request("http://127.0.0.1:8701/v1/chat", data=body, method="POST",
              headers={"Content-Type": "application/json", "Authorization": "Bearer sk-demo-%08d" % r.randint(0, 10**8)})
        t = time.time(); s = 0
        try:
            s = urllib.request.urlopen(req, timeout=5).status
        except urllib.error.HTTPError as e:
            s = e.code
        except Exception:
            s = -1
        with lk:
            res.append({"t": round(t - T0, 3), "d": round(time.time() - t, 4), "s": s})
        time.sleep(r.uniform(0, 0.1))
ths = [threading.Thread(target=worker, args=(i,)) for i in range(4)]
[t.start() for t in ths]
marks = {}
for name, dur in PH:
    marks[name] = round(time.time() - T0, 2)
    f = os.path.join(OUT, "incident")
    if name == "incident": open(f, "w").close()
    elif os.path.exists(f): os.remove(f)
    time.sleep(dur)
stop = True; [t.join() for t in ths]
json.dump({"t0_unix": T0, "phases": marks, "requests": res}, open(os.path.join(OUT, "client.json"), "w"))
print("requests", len(res))
