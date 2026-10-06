"""E4 and E5: virtual-key rate limits and budgets on the LiteLLM proxy, recorded request by request.

E4 rate limit (rpm_limit 10 per key, model "chat" = fake A, 0.2 s):
  steady: one request per second for 130 s on key K1
  burst:  on key K2: 1 request at t=0, 9 at t=50..54.5, 10 at t=60.5..65, 3 at t=66..67
E5 budgets (model "slow" = fake C, scripted sleep:2; price 40 in x $1/M + 8 out x $5/M = $0.00008 per call):
  seq:  key K3 max_budget 0.0004, 10 calls one after another
  conc: key K4 max_budget 0.0004, 20 calls at the same moment
E4 and E5 run concurrently (different keys, different upstreams). Output runs/e4_limits.json.
"""
import asyncio, json, sys, time, urllib.request
import httpx

OUT = sys.argv[1] if len(sys.argv) > 1 else "runs/e4_limits.json"
BASE = "http://127.0.0.1:8610"
MASTER = {"Authorization": "Bearer sk-fgw-local-demo"}


def script(port, default, tag):
    urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{port}/__script", method="POST",
                           data=json.dumps({"default": default, "tag": tag}).encode())).read()


async def keygen(c, **kw):
    r = await c.post(BASE + "/key/generate", headers=MASTER, json=kw)
    r.raise_for_status()
    return r.json()["key"]


async def call(c, key, model, msg, t_start, log, label):
    t0 = time.time()
    r = await c.post(BASE + "/v1/chat/completions", headers={"Authorization": "Bearer " + key},
                     json={"model": model, "messages": [{"role": "user", "content": msg}]})
    t1 = time.time()
    body = r.json() if r.headers.get("content-type", "").startswith("application/json") else {}
    err = body.get("error") or {}
    log.append({"case": label, "msg": msg, "t0": round(t0 - t_start, 3), "t1": round(t1 - t_start, 3), "status": r.status_code,
                "err_type": err.get("type"), "err_msg": (err.get("message") or "")[:160],
                "retry_after": r.headers.get("retry-after"),
                "rl_remaining": r.headers.get("x-ratelimit-remaining-requests"),
                "rl_limit": r.headers.get("x-ratelimit-limit-requests")})


async def at(t_start, t, coro):
    await asyncio.sleep(max(0, t_start + t - time.time()))
    await coro


async def main():
    script(8601, "ok", "e4")
    script(8603, "sleep:2", "e5")
    log = []
    async with httpx.AsyncClient(timeout=60) as c:
        k1 = await keygen(c, rpm_limit=10, key_alias="fgw-steady")
        k2 = await keygen(c, rpm_limit=10, key_alias="fgw-burst")
        k3 = await keygen(c, max_budget=0.0004, key_alias="fgw-budget-seq")
        k4 = await keygen(c, max_budget=0.0004, key_alias="fgw-budget-conc")
        t_start = time.time()
        tasks = []
        for i in range(130):
            tasks.append(at(t_start, i, call(c, k1, "chat", f"steady {i}", t_start, log, "steady")))
        times = [0] + [50 + 0.5 * j for j in range(9)] + [60.5 + 0.5 * j for j in range(10)] + [66, 66.5, 67]
        for j, t in enumerate(times):
            tasks.append(at(t_start, t, call(c, k2, "chat", f"burst {j}", t_start, log, "burst")))

        async def seq():
            for j in range(10):
                await call(c, k3, "slow", f"budget seq {j}", t_start, log, "budget_seq")

        tasks.append(seq())
        for j in range(20):
            tasks.append(call(c, k4, "slow", f"budget conc {j}", t_start, log, "budget_conc"))
        await asyncio.gather(*tasks)
        spend = {}
        for wait in (0, 15):
            await asyncio.sleep(wait)
            for name, k in (("budget_seq", k3), ("budget_conc", k4)):
                r = await c.get(BASE + "/key/info", headers=MASTER, params={"key": k})
                spend[f"{name}_after_{wait}s"] = r.json().get("info", {}).get("spend")
    log.sort(key=lambda x: (x["case"], x["t0"]))
    json.dump({"litellm": "1.104.0", "date": time.strftime("%Y-%m-%d"), "rpm_limit": 10, "max_budget": 0.0004,
               "price_per_call_usd": 0.00008, "requests": log, "spend": spend}, open(OUT, "w"), indent=1)
    for case in ("steady", "burst", "budget_seq", "budget_conc"):
        rs = [x for x in log if x["case"] == case]
        print(case, len(rs), "ok", sum(x["status"] == 200 for x in rs), flush=True)
    print(spend)


asyncio.run(main())
