"""E1: the same 40 requests through litellm.Router under each routing strategy.

Two deployments of one model group "chat": fake provider A (answers in 0.2 s) and B (1.0 s).
Requests are sent 4 at a time (asyncio), so in-flight counts matter for least-busy.
Writes runs/e1_routing.json: per strategy, per request: start, end, deployment, latency.
"""
import asyncio, json, os, sys, time, random
import litellm
from litellm import Router

OUT = sys.argv[1] if len(sys.argv) > 1 else "runs/e1_routing.json"
N, CONC = 40, 4


def deps(weights=None, costs=None, costs_params=None):
    out = []
    for name, port in (("A", 8601), ("B", 8602)):
        p = {"model": "openai/fake-" + name, "api_base": f"http://127.0.0.1:{port}/v1", "api_key": "fake"}
        if weights:
            p["weight"] = weights[name]
        if costs_params:
            p.update(input_cost_per_token=costs_params[name], output_cost_per_token=costs_params[name] * 5)
        mi = {"id": name}
        if costs:
            mi.update(input_cost_per_token=costs[name], output_cost_per_token=costs[name] * 5)
        out.append({"model_name": "chat", "litellm_params": p, "model_info": mi})
    return out


CASES = [
    ("simple-shuffle", dict(routing_strategy="simple-shuffle"), {}),
    ("simple-shuffle, weight A 3 : B 1", dict(routing_strategy="simple-shuffle"), {"weights": {"A": 3, "B": 1}}),
    ("least-busy", dict(routing_strategy="least-busy"), {}),
    ("latency-based-routing", dict(routing_strategy="latency-based-routing"), {}),
    ("usage-based-routing-v2", dict(routing_strategy="usage-based-routing-v2"), {}),
    ("cost-based-routing, prices in model_info (B cheaper)", dict(routing_strategy="cost-based-routing"), {"costs": {"A": 2e-6, "B": 1e-6}}),
    ("cost-based-routing, prices in litellm_params (B cheaper)", dict(routing_strategy="cost-based-routing"), {"costs_params": {"A": 2e-6, "B": 1e-6}}),
]


async def one(router, i, t_start, rec):
    t0 = time.time()
    r = await router.acompletion(model="chat", messages=[{"role": "user", "content": f"request {i}"}])
    t1 = time.time()
    dep = (r._hidden_params or {}).get("model_id")
    rec.append({"i": i, "t0": round(t0 - t_start, 3), "t1": round(t1 - t_start, 3), "dep": dep})


async def run_case(label, kw, dk):
    router = Router(model_list=deps(**dk), num_retries=0, **kw)
    rec, t_start = [], time.time()
    sem = asyncio.Semaphore(CONC)

    async def guarded(i):
        async with sem:
            await one(router, i, t_start, rec)

    await asyncio.gather(*(guarded(i) for i in range(N)))
    rec.sort(key=lambda x: x["i"])
    cnt = {d: sum(1 for x in rec if x["dep"] == d) for d in ("A", "B")}
    wall = max(x["t1"] for x in rec)
    print(label, cnt, round(wall, 2), flush=True)
    return {"strategy": label, "config": {**kw, **dk}, "requests": rec, "count": cnt, "wall_s": round(wall, 3)}


async def main():
    random.seed(0)
    w = Router(model_list=deps(), num_retries=0)  # warm-up: first call pays import and client set-up
    for _ in range(2):
        await w.acompletion(model="chat", messages=[{"role": "user", "content": "warm-up"}])
    res = []
    for label, kw, dk in CASES:
        res.append(await run_case(label, kw, dk))
        await asyncio.sleep(1)
    json.dump({"litellm": "1.104.0", "n": N, "concurrency": CONC, "base_latency_s": {"A": 0.2, "B": 1.0},
               "date": time.strftime("%Y-%m-%d"), "cases": res}, open(OUT, "w"), indent=1)


asyncio.run(main())
