"""E2: how litellm.Router handles a failing deployment: retries, cooldowns, fallbacks.

Fake providers: A (healthy, 0.2 s), C (scripted to fail). Requests are sequential with a 0.3 s gap.
Every upstream attempt is logged by the fake providers (message text carries case and request number);
this script logs what the caller saw. Output: runs/e2_failures.json
"""
import asyncio, json, sys, time
import litellm
from litellm import Router

OUT = sys.argv[1] if len(sys.argv) > 1 else "runs/e2_failures.json"
A = {"model": "openai/fake-A", "api_base": "http://127.0.0.1:8601/v1", "api_key": "fake"}
C = {"model": "openai/fake-C", "api_base": "http://127.0.0.1:8603/v1", "api_key": "fake"}


def script(port, default, tag):
    import urllib.request
    urllib.request.urlopen(urllib.request.Request(f"http://127.0.0.1:{port}/__script", method="POST",
                           data=json.dumps({"default": default, "tag": tag}).encode())).read()


def two_deps():
    return [{"model_name": "chat", "litellm_params": dict(A), "model_info": {"id": "A"}},
            {"model_name": "chat", "litellm_params": dict(C), "model_info": {"id": "C"}}]


CASES = [
    # key, label, C behaviour, model_list, router kwargs, n requests
    ("c503", "C always 503, default settings", "503", two_deps, {}, 30),
    ("c429", "C always 429 (no Retry-After), default settings", "429", two_deps, {}, 30),
    ("c503af3", "C always 503, allowed_fails: 3 (the default value)", "503", two_deps, {"allowed_fails": 3}, 30),
    ("c503af1", "C always 503, allowed_fails: 1", "503", two_deps, {"allowed_fails": 1}, 30),
    ("single", "only C in the group, 503, fallback to group backup (A)", "503",
     lambda: [{"model_name": "chat", "litellm_params": dict(C), "model_info": {"id": "C"}},
              {"model_name": "backup", "litellm_params": dict(A), "model_info": {"id": "A"}}],
     {"fallbacks": [{"chat": ["backup"]}]}, 6),
    ("ctx_nofb", "C says context too long, only regular fallbacks", "ctx",
     lambda: [{"model_name": "chat", "litellm_params": dict(C), "model_info": {"id": "C"}},
              {"model_name": "long", "litellm_params": dict(A), "model_info": {"id": "A"}}],
     {"fallbacks": [{"chat": ["long"]}]}, 3),
    ("ctx_fb", "C says context too long, context_window_fallbacks to group long (A)", "ctx",
     lambda: [{"model_name": "chat", "litellm_params": dict(C), "model_info": {"id": "C"}},
              {"model_name": "long", "litellm_params": dict(A), "model_info": {"id": "A"}}],
     {"context_window_fallbacks": [{"chat": ["long"]}]}, 3),
    ("ctx_none", "C says context too long, no fallbacks", "ctx",
     lambda: [{"model_name": "chat", "litellm_params": dict(C), "model_info": {"id": "C"}}], {}, 3),
]


async def main():
    # warm-up: the first failing call in a fresh process paid about 10 s of one-off set-up in a trial run
    script(8603, "503", "warmup"); script(8601, "ok", "warmup")
    w = Router(model_list=[{"model_name": "w", "litellm_params": dict(C), "model_info": {"id": "Cw"}},
                           {"model_name": "w2", "litellm_params": dict(A), "model_info": {"id": "Aw"}}],
               num_retries=0, fallbacks=[{"w": ["w2"]}])
    for i in range(2):
        await w.acompletion(model="w", messages=[{"role": "user", "content": f"warmup {i}"}])
    await asyncio.sleep(6)
    out = []
    for key, label, beh, ml, kw, n in CASES:
        script(8603, beh, key)
        script(8601, "ok", key)
        router = Router(model_list=ml(), num_retries=2, **kw)
        rec, t_start = [], time.time()
        for i in range(n):
            t0 = time.time()
            try:
                r = await router.acompletion(model="chat", messages=[{"role": "user", "content": f"{key} req {i}"}])
                res = {"ok": True, "dep": (r._hidden_params or {}).get("model_id")}
            except Exception as e:
                res = {"ok": False, "error": type(e).__name__, "status": getattr(e, "status_code", None)}
            t1 = time.time()
            rec.append({"i": i, "t0": round(t0 - t_start, 3), "t1": round(t1 - t_start, 3), **res})
            await asyncio.sleep(0.3)
        okc = sum(r["ok"] for r in rec)
        print(key, "ok", okc, "of", n, "wall", round(rec[-1]["t1"], 1), flush=True)
        out.append({"key": key, "label": label, "behaviour_C": beh, "router_kwargs": kw, "num_retries": 2,
                    "t_start": t_start, "requests": rec})
        await asyncio.sleep(6)  # let any cooldown expire between cases
    json.dump({"litellm": "1.104.0", "date": time.strftime("%Y-%m-%d"), "cases": out}, open(OUT, "w"), indent=1)


asyncio.run(main())
