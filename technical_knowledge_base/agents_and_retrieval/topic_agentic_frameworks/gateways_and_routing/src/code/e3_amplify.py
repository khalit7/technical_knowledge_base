"""E3: retries at two layers multiply. One user request, a provider that hangs for 30 s on every call.

Client: the OpenAI Python SDK (its own timeout and max_retries) -> LiteLLM proxy (model "slow":
per-attempt timeout 5 s, num_retries 2) -> fake provider C (every call "hang:30").
Each case: one call, then watch the provider log until 75 s after the call started.
Output: runs/e3_amplify.json (client view); provider attempts are in runs/prov_C.jsonl (tag = case key).
"""
import json, sys, time, urllib.request, logging
import httpx, openai

OUT = sys.argv[1] if len(sys.argv) > 1 else "runs/e3_amplify.json"
CASES = [
    ("sdk_default_t10", "SDK timeout 10 s, max_retries 2 (the SDK's default retries)", 10, 2),
    ("sdk_noretry_t10", "SDK timeout 10 s, max_retries 0", 10, 0),
    ("sdk_default_t60", "SDK timeout 60 s, max_retries 2", 60, 2),
]


def script(tag):
    urllib.request.urlopen(urllib.request.Request("http://127.0.0.1:8603/__script", method="POST",
                           data=json.dumps({"default": "hang:30", "tag": tag}).encode())).read()


class Hook(httpx.Client):
    pass


out = []
for key, label, tmo, mr in CASES:
    script(key)
    events = []
    t_start = time.time()

    def on_req(req, events=events, t_start=t_start):
        events.append({"ev": "client sends", "t": round(time.time() - t_start, 3)})

    def on_resp(resp, events=events, t_start=t_start):
        events.append({"ev": f"client gets HTTP {resp.status_code}", "t": round(time.time() - t_start, 3)})

    hc = httpx.Client(event_hooks={"request": [on_req], "response": [on_resp]})
    cl = openai.OpenAI(base_url="http://127.0.0.1:8610/v1", api_key="sk-fgw-local-demo", timeout=tmo,
                       max_retries=mr, http_client=hc)
    try:
        r = cl.chat.completions.create(model="slow", messages=[{"role": "user", "content": f"{key} one request"}])
        res = {"ok": True}
    except Exception as e:
        res = {"ok": False, "error": type(e).__name__}
    t_end = time.time() - t_start
    print(key, res, round(t_end, 1), flush=True)
    while time.time() - t_start < 75:
        time.sleep(1)
    out.append({"key": key, "label": label, "client_timeout_s": tmo, "client_max_retries": mr, "t_start": t_start,
                "client_done_s": round(t_end, 3), "result": res, "events": events})
json.dump({"litellm": "1.104.0", "openai_sdk": openai.__version__, "gateway": {"timeout_s": 5, "num_retries": 2},
           "provider": "hang:30 on every call", "date": time.strftime("%Y-%m-%d"), "cases": out}, open(OUT, "w"), indent=1)
