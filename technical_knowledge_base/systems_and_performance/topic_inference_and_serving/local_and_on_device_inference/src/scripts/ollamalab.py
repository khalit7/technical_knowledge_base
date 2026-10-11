"""Ollama 0.40.1 against llama-server on the same GGUF file (Qwen3-1.7B Q4_K_M).
Runs its own `ollama serve` on 127.0.0.1:8172 with a scratch model store (never the user's app on 11434),
and llama-server on 8170. Caller holds the bench lock. Standard library only.
usage: python3 -I ollamalab.py <INF>
"""
import json, os, subprocess, sys, time, http.client, threading

INF = sys.argv[1]
OUT = os.path.join(INF, "lo", "runs", "ollama"); os.makedirs(OUT, exist_ok=True)
GGUF = os.path.join(INF, "models", "gguf", "Qwen3-1.7B-Q4_K_M.gguf")
OBIN = "/Applications/Ollama.app/Contents/Resources/ollama"
OPORT, LPORT = 8172, 8170
WIKI = open(os.path.join(INF, "data", "wiki.test.raw"), encoding="utf-8").read()
PROMPT = WIKI[90000:92000]


def load():
    return [float(x) for x in subprocess.run(["sysctl", "-n", "vm.loadavg"], capture_output=True, text=True).stdout.strip("{} \n").split()[:3]]


def req(port, method, path, body=None, timeout=900):
    c = http.client.HTTPConnection("127.0.0.1", port, timeout=timeout)
    c.request(method, path, body=json.dumps(body) if body is not None else None, headers={"Content-Type": "application/json"})
    r = c.getresponse(); d = r.read()
    try:
        return r.status, json.loads(d)
    except Exception:
        return r.status, d.decode("utf-8", "replace")[:2000]


def wait(port, path, p, limit=120):
    t0 = time.time()
    while time.time() - t0 < limit:
        if p.poll() is not None:
            raise RuntimeError("exited")
        try:
            if req(port, "GET", path, timeout=2)[0] == 200:
                return time.time() - t0
        except Exception:
            pass
        time.sleep(0.1)
    raise RuntimeError("not ready")


res = {"load_before": load()}
env = dict(os.environ, OLLAMA_HOST=f"127.0.0.1:{OPORT}", OLLAMA_MODELS=os.path.join(INF, "lo", "ollama", "models"))
os.makedirs(env["OLLAMA_MODELS"], exist_ok=True)
olog = open(os.path.join(OUT, "ollama.server.log"), "w")
op = subprocess.Popen([OBIN, "serve"], env=env, stdout=olog, stderr=subprocess.STDOUT)
try:
    res["ollama_ready_s"] = wait(OPORT, "/api/version", op)
    res["version"] = req(OPORT, "GET", "/api/version")[1]
    mf = os.path.join(OUT, "Modelfile"); open(mf, "w").write(f"FROM {GGUF}\n")
    t0 = time.time()
    cp = subprocess.run([OBIN, "create", "lo-qwen3-1.7b", "-f", mf], env=env, capture_output=True, text=True)
    res["create"] = {"rc": cp.returncode, "secs": time.time() - t0, "out": (cp.stdout + cp.stderr)[-600:]}
    st, show = req(OPORT, "POST", "/api/show", {"model": "lo-qwen3-1.7b"})
    if isinstance(show, dict):
        show.pop("license", None)
        mi = show.get("model_info") or {}
        show["model_info"] = {k: v for k, v in mi.items() if not isinstance(v, list)}
    res["show"] = show
    # cold load (empty prompt loads the model)
    st, r = req(OPORT, "POST", "/api/generate", {"model": "lo-qwen3-1.7b", "prompt": ""})
    res["cold_load"] = r
    res["ps"] = req(OPORT, "GET", "/api/ps")[1]
    gens = []
    for rep in range(4):
        st, r = req(OPORT, "POST", "/api/generate", {"model": "lo-qwen3-1.7b", "prompt": PROMPT, "raw": True, "stream": False,
                                                     "options": {"temperature": 0, "num_predict": 128, "seed": 1}})
        if isinstance(r, dict):
            r.pop("context", None); r["response"] = r.get("response", "")[:120]
        gens.append(r)
    res["gen"] = gens
    # four requests at once: does Ollama overlap them?
    spans = []
    def one(i):
        t0 = time.time()
        st, r = req(OPORT, "POST", "/api/generate", {"model": "lo-qwen3-1.7b", "prompt": PROMPT[i * 50:] , "raw": True, "stream": False,
                                                     "options": {"temperature": 0, "num_predict": 128}})
        spans.append({"i": i, "start": t0, "end": time.time(), "eval_count": r.get("eval_count") if isinstance(r, dict) else None,
                      "eval_duration": r.get("eval_duration") if isinstance(r, dict) else None})
    th = [threading.Thread(target=one, args=(i,)) for i in range(4)]
    t00 = time.time(); [t.start() for t in th]; [t.join() for t in th]
    for s in spans:
        s["start"] -= t00; s["end"] -= t00
    res["parallel4"] = sorted(spans, key=lambda s: s["i"])
    st, r = req(OPORT, "POST", "/v1/chat/completions", {"model": "lo-qwen3-1.7b", "messages": [{"role": "user", "content": "Say hi in three words. /no_think"}], "max_tokens": 32})
    res["openai_compat"] = {"status": st, "body": r if isinstance(r, dict) else str(r)[:300]}
    res["ps_after"] = req(OPORT, "GET", "/api/ps")[1]
finally:
    op.terminate()
    try:
        op.wait(20)
    except Exception:
        op.kill()
    olog.close()

# llama-server, same file, same prompt
llog = open(os.path.join(OUT, "llama.server.log"), "w")
lp = subprocess.Popen(["llama-server", "-m", GGUF, "--port", str(LPORT), "--host", "127.0.0.1", "-ngl", "99"], stdout=llog, stderr=subprocess.STDOUT)
try:
    res["llama_ready_s"] = wait(LPORT, "/health", lp)
    lg = []
    for rep in range(4):
        st, r = req(LPORT, "POST", "/completion", {"prompt": PROMPT, "n_predict": 128, "temperature": 0, "cache_prompt": False, "seed": 1})
        lg.append({"timings": r.get("timings"), "content_head": r.get("content", "")[:120]})
    res["llama"] = lg
    res["llama_props"] = {k: v for k, v in req(LPORT, "GET", "/props")[1].items() if k in ("total_slots", "default_generation_settings", "build_info")}
finally:
    lp.terminate()
    try:
        lp.wait(20)
    except Exception:
        lp.kill()
    llog.close()
res["load_after"] = load()
json.dump(res, open(os.path.join(OUT, "ollama.json"), "w"), indent=1, default=str)
print("done")
