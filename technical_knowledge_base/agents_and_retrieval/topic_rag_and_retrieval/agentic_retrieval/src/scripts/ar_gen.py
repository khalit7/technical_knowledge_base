"""The local generator for this page's pending runs: the root Agentic lab's gen.py (llama-server, Qwen3 GGUF Q4_K_M,
temperature 0, seed 0, thinking off, prompt cache on), re-pointed to this page's ports (8360 for 1.7B, 8361 for 4B) and
to this page's cache ($RAG_SCRATCH/ar/gen/). A call the root already made with identical (model, messages, max_tokens,
stop) is read from the root's cache instead of being generated again, so shared first steps cost nothing.

`chat_lp` adds token log-probabilities (llama-server's OpenAI-compatible `logprobs`), needed by the FLARE-style
strategy; those calls are cached separately because the root's records carry no probabilities.
Hold the bench lock around anything that calls the server (run_pending.sh does)."""
import atexit
import hashlib
import json
import os
import subprocess
import time
import urllib.request

import arlib as A
import gen as G  # the root's harness (read only)
import search as S  # the root's search tool (read only)

# keep the root's search tool from writing its query-vector cache into the root's scratch folder: this page's own file
S.work = lambda *parts: A.work(*parts)

PORTS = {"1.7b": 8360, "4b": 8361}
for m, p in PORTS.items():
    G.MODELS[m]["port"] = p
_proc = {}


def _up(port):
    try:
        with urllib.request.urlopen("http://127.0.0.1:%d/health" % port, timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def server(model):
    m = G.MODELS[model]
    if _up(m["port"]):
        return
    log = open(A.work("logs", "llama-server-%s.log" % model), "a")
    p = subprocess.Popen(["llama-server", "-m", m["file"], "-ngl", "99", "-c", str(G.CTX), "-np", "1", "--port", str(m["port"]),
                          "--host", "127.0.0.1", "--seed", "0", "--jinja", "--temp", "0",
                          # no extra host-RAM prompt cache (default 8 GiB): with 16 GB shared it swapped and stalled the
                          # lim run on 2026-10-15; the slot's own KV cache still reuses the previous prompt's prefix
                          "-cram", "0"], stdout=log, stderr=log)
    _proc[model] = p
    print("started llama-server", model, "pid", p.pid, "port", m["port"], flush=True)
    atexit.register(lambda: p.poll() is None and p.terminate())
    for _ in range(240):
        if _up(m["port"]):
            return
        time.sleep(0.5)
    raise RuntimeError("llama-server did not start")


G.server = server  # every G.chat call (also inside the root's strategies) now starts this page's server


class Cache(G.Cache):
    """This page's cache file, falling back to the root's file of the same name for identical calls."""

    def __init__(self, name, root_name=None):
        self.path = A.work("gen", name + ".jsonl")
        self.d = {}
        rp = A.L.path("agt", "gen", (root_name or name) + ".jsonl")
        for p in (rp, self.path):
            if os.path.exists(p):
                for l in open(p):
                    r = json.loads(l)
                    self.d[r["key"]] = r


def chat_lp(msgs, cache, model="1.7b", max_tokens=48, offline=False, tag=None):
    """Chat completion with per-token log-probabilities: returns the record with `lp` = [[token, logprob], ...]."""
    if isinstance(msgs, str):
        msgs = [{"role": "user", "content": msgs}]
    key = hashlib.sha1(("LP|" + model + "|" + json.dumps(msgs, ensure_ascii=False) + "|%d" % max_tokens).encode()).hexdigest()
    hit = cache.get(key)
    if hit or offline:
        return hit
    server(model)
    body = {"messages": msgs, "max_tokens": max_tokens, "temperature": 0, "seed": 0, "cache_prompt": True, "logprobs": True,
            "top_logprobs": 1, "chat_template_kwargs": {"enable_thinking": False}}
    req = urllib.request.Request("http://127.0.0.1:%d/v1/chat/completions" % G.MODELS[model]["port"], data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=900) as r:
        out = json.loads(r.read())
    ch = out["choices"][0]
    lp = [[t.get("token", ""), round(t.get("logprob", 0.0), 4)] for t in ((ch.get("logprobs") or {}).get("content") or [])]
    tm = out.get("timings", {})
    rec = {"key": key, "tag": tag, "model": model, "text": (ch["message"]["content"] or "").strip(), "lp": lp,
           "n_in": out["usage"]["prompt_tokens"], "n_out": out["usage"]["completion_tokens"], "n_in_new": tm.get("prompt_n"),
           "prompt_ms": round(tm.get("prompt_ms", 0), 1), "gen_ms": round(tm.get("predicted_ms", 0), 1),
           "seconds": round(time.perf_counter() - t0, 3), "t": time.strftime("%Y-%m-%d %H:%M:%S")}
    cache.put(rec)
    return rec
