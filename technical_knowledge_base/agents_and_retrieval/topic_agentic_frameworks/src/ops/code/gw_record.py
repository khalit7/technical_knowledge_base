"""Record the gateway scenarios: one client request (or a few) per scenario, with the fake upstream's
behaviour scripted, and everything that happened written to OUT (one JSON line per scenario).

Usage: python gw_record.py OUT scenario [scenario ...]
Ports: fake upstream 8095, LiteLLM proxy 4010, logging proxy in front of the local model 8096.
"""
import json, sys, time, urllib.request, urllib.error

OUT = sys.argv[1]
UP, GW = "http://127.0.0.1:8095", "http://127.0.0.1:4010"
MASTER = "sk-local-demo"  # the master key set in config.yaml (local throwaway)
PROMPT = "In one sentence: why would a regex like [a-z]+ split the word don't into two tokens?"


def post(url, body, key=None, timeout=300):
    req = urllib.request.Request(url, data=json.dumps(body).encode(), method="POST",
                                 headers={"Content-Type": "application/json", **({"Authorization": f"Bearer {key}"} if key else {})})
    t0 = time.time()
    try:
        r = urllib.request.urlopen(req, timeout=timeout)
        status, data, hdr = r.status, r.read(), dict(r.headers)
    except urllib.error.HTTPError as e:
        status, data, hdr = e.code, e.read(), dict(e.headers)
    except Exception as e:  # client-side timeout or connection error
        status, data, hdr = "client_error", str(e).encode(), {}
    t1 = time.time()
    try:
        d = json.loads(data)
    except Exception:
        d = data.decode("utf-8", "replace")
    return {"t0": t0, "t1": t1, "status": status, "body": d,
            "headers": {k.lower(): v for k, v in hdr.items() if k.lower().startswith(("x-litellm", "retry-after", "x-ratelimit"))}}


def script(seq, default, tag):
    post(UP + "/__script", {"seq": seq, "default": default, "tag": tag})


def chat(base, model, key=None, client_timeout=300):
    return post(base + "/v1/chat/completions", {"model": model, "max_tokens": 60, "temperature": 0,
                                                "messages": [{"role": "user", "content": PROMPT}]}, key, client_timeout)


def slim(r):
    b = r["body"]
    if isinstance(b, dict) and "choices" in b:
        b = {"model": b.get("model"), "content": b["choices"][0]["message"].get("content"), "usage": b.get("usage")}
    elif isinstance(b, dict) and "error" in b:
        e = b["error"]
        b = {"error": {k: (str(e.get(k))[:600] if e.get(k) is not None else None) for k in ("message", "type", "code")}}
    return {**r, "body": b}


def run(name):
    rec = {"scenario": name, "requests": []}
    if name == "direct_ok":
        script([], "ok", name); rec["requests"].append(slim(chat(UP, "flaky-model")))
    elif name == "direct_429":
        script(["429:2"], "ok", name); rec["requests"].append(slim(chat(UP, "flaky-model")))
    elif name == "direct_503":
        script(["503"], "ok", name); rec["requests"].append(slim(chat(UP, "flaky-model")))
    elif name == "direct_hang":
        script(["hang:20"], "ok", name); rec["requests"].append(slim(chat(UP, "flaky-model")))
    elif name == "gw_ok":
        script([], "ok", name); rec["requests"].append(slim(chat(GW, "primary", MASTER)))
    elif name == "gw_retry":
        script(["429:2", "500"], "ok", name); rec["requests"].append(slim(chat(GW, "primary", MASTER)))
    elif name == "gw_fallback":
        script([], "503", name); rec["requests"].append(slim(chat(GW, "primary", MASTER)))
    elif name == "gw_timeout":
        script([], "hang:20", name); rec["requests"].append(slim(chat(GW, "primary", MASTER)))
    elif name == "gw_cooldown":
        # primary keeps failing: after allowed_fails the deployment is cooled down and skipped
        script([], "503", name)
        for _ in range(4):
            rec["requests"].append(slim(chat(GW, "primary", MASTER)))
    elif name == "keys":
        k = post(GW + "/key/generate", {"models": ["primary", "backup"], "max_budget": 0.0008,
                                       "key_alias": f"afops-budget-{int(time.time())}"}, MASTER)
        kb = post(GW + "/key/generate", {"models": ["backup"], "key_alias": f"afops-backup-only-{int(time.time())}"}, MASTER)
        kr = post(GW + "/key/generate", {"models": ["backup"], "rpm_limit": 2, "key_alias": f"afops-rpm-{int(time.time())}"}, MASTER)
        keys = {"budget": k["body"]["key"], "backup_only": kb["body"]["key"], "rpm": kr["body"]["key"]}
        rec["key_settings"] = {"budget": {"models": ["primary", "backup"], "max_budget": 0.0008},
                               "backup_only": {"models": ["backup"]}, "rpm": {"models": ["backup"], "rpm_limit": 2}}
        script([], "ok", name)
        for i in range(6):
            r = slim(chat(GW, "backup", keys["budget"])); r["key"] = "budget"; rec["requests"].append(r)
            time.sleep(1)
            info = post(GW + "/key/info", {}, keys["budget"])  # GET is the documented verb; fall back below
            if info["status"] != 200:
                req = urllib.request.Request(GW + "/key/info?key=" + keys["budget"], headers={"Authorization": f"Bearer {MASTER}"})
                try:
                    info = {"status": 200, "body": json.loads(urllib.request.urlopen(req).read())}
                except Exception as e:
                    info = {"status": "err", "body": str(e)}
            sp = info["body"].get("info", {}).get("spend") if isinstance(info["body"], dict) else None
            r["spend_after"] = sp
        r = slim(chat(GW, "primary", keys["backup_only"])); r["key"] = "backup_only"; rec["requests"].append(r)
        for i in range(3):
            r = slim(chat(GW, "backup", keys["rpm"])); r["key"] = "rpm"; rec["requests"].append(r)
    with open(OUT, "a") as f:
        f.write(json.dumps(rec) + "\n")
    print(name, [(q["status"], round(q["t1"] - q["t0"], 2)) for q in rec["requests"]])


for n in sys.argv[2:]:
    if n.startswith("wait"):
        time.sleep(float(n[4:]))
        continue
    run(n)
