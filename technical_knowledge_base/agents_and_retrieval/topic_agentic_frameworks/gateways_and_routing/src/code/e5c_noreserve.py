"""E5c: the same two waves with general_settings.disable_budget_reservation: true (spend checked at admission only). Key max_budget $0.0004, model "slow"
(fake C, sleep:2, $0.00008 per call). Two waves of 20 simultaneous calls, 4 s apart, per key.
Case "no_max_tokens": the gateway reserves 16,384 output tokens per call; case "max_tokens_16": it reserves 16.
Output runs/e5b_budget.json"""
import asyncio, json, sys, time, urllib.request
import httpx
BASE = "http://127.0.0.1:8610"; MASTER = {"Authorization": "Bearer sk-fgw-local-demo"}
urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8603/__script", method="POST",
                       data=json.dumps({"default": "sleep:2", "tag": "e5b"}).encode())).read()
async def main():
    out = {}
    async with httpx.AsyncClient(timeout=60) as c:
        for case, extra in (("noreserve_no_max_tokens", {}),):
            k = (await c.post(BASE + "/key/generate", headers=MASTER, json={"max_budget": 0.0004, "key_alias": "fgw-" + case})).json()["key"]
            log, t_start = [], time.time()
            async def call(w, j):
                t0 = time.time()
                r = await c.post(BASE + "/v1/chat/completions", headers={"Authorization": "Bearer " + k},
                                 json={"model": "slow", "messages": [{"role": "user", "content": f"{case} w{w} {j}"}], **extra})
                b = r.json(); e = b.get("error") or {}
                log.append({"wave": w, "j": j, "t0": round(t0 - t_start, 3), "t1": round(time.time() - t_start, 3), "status": r.status_code,
                            "err_msg": (e.get("message") or "")[:200], "cost": r.headers.get("x-litellm-response-cost")})
            for w in (1, 2):
                await asyncio.gather(*(call(w, j) for j in range(20)))
                await asyncio.sleep(2)
            await asyncio.sleep(3)
            info = (await c.get(BASE + "/key/info", headers=MASTER, params={"key": k})).json().get("info", {})
            out[case] = {"extra": extra, "requests": sorted(log, key=lambda x: (x["wave"], x["j"])), "spend_after": info.get("spend")}
            print(case, [sum(1 for x in log if x["wave"] == w and x["status"] == 200) for w in (1, 2)], info.get("spend"), flush=True)
    json.dump({"litellm": "1.104.0", "max_budget": 0.0004, "price_per_call_usd": 0.00008, "date": time.strftime("%Y-%m-%d"), "cases": out},
              open(sys.argv[1], "w"), indent=1)
asyncio.run(main())
