"""The local generator, set up exactly as the root Pipeline lab's gen.py (same model file, same server flags, greedy,
thinking off), on this page's own port and cache: Qwen3-1.7B GGUF Q4_K_M in llama.cpp's llama-server (Homebrew build,
Metal, all layers on the GPU), temperature 0, seed 0, one slot. Every answer is cached on disk by its exact prompt,
so reruns cost nothing and the outputs are fixed. Hold the bench lock while it runs.
Port: RP_PORT (default 8300). Cache: $RAG_SCRATCH/rp/gen/<name>.jsonl."""
import atexit
import hashlib
import json
import os
import subprocess
import time
import urllib.request

import rp

L = rp.L
GGUF = os.path.join(L.scratch(), "..", "inf", "models", "gguf", "Qwen3-1.7B-Q4_K_M.gguf")
MODEL_NAME = "Qwen3-1.7B Q4_K_M (llama.cpp)"
PORT = int(os.environ.get("RP_PORT", "8300"))
URL = "http://127.0.0.1:%d" % PORT
_proc = None


def _up():
    try:
        with urllib.request.urlopen(URL + "/health", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def server(ctx=16384):
    global _proc
    if _up():
        return
    log = open(rp.work("logs", "llama-server.log"), "a")
    _proc = subprocess.Popen(["llama-server", "-m", GGUF, "-ngl", "99", "-c", str(ctx), "-np", "1", "--port", str(PORT),
                              "--host", "127.0.0.1", "--seed", "0", "--jinja", "--temp", "0"], stdout=log, stderr=log)
    atexit.register(stop)
    for _ in range(240):
        if _up():
            return
        time.sleep(0.5)
    raise RuntimeError("llama-server did not start")


def stop():
    global _proc
    if _proc is not None and _proc.poll() is None:
        _proc.terminate()
        _proc.wait(timeout=30)
    _proc = None


class Cache:
    def __init__(self, name, seed_from=None):
        """seed_from: a root Pipeline lab cache name (read only): identical prompts reuse its recorded answers
        (same model, server flags and key rule as the root's gen.py)."""
        self.path = rp.work("gen", name + ".jsonl")
        self.d = {}
        if seed_from and os.path.exists(L.path("pipe", "gen", seed_from + ".jsonl")):
            for l in open(L.path("pipe", "gen", seed_from + ".jsonl")):
                r = json.loads(l)
                r["from_root"] = True
                self.d[r["key"]] = r
        if os.path.exists(self.path):
            for l in open(self.path):
                r = json.loads(l)
                self.d[r["key"]] = r

    def put(self, r):
        self.d[r["key"]] = r
        with open(self.path, "a") as f:
            f.write(json.dumps(r) + "\n")


def chat(user, cache, max_tokens=200, tag=None, system=None):
    msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": user}]
    key = hashlib.sha1((json.dumps(msgs) + "|%d" % max_tokens).encode()).hexdigest()
    if key in cache.d:
        return cache.d[key]
    server()
    body = {"messages": msgs, "max_tokens": max_tokens, "temperature": 0, "seed": 0, "cache_prompt": True,
            "chat_template_kwargs": {"enable_thinking": False}}
    req = urllib.request.Request(URL + "/v1/chat/completions", data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=600) as r:
        out = json.loads(r.read())
    dt = time.perf_counter() - t0
    tm = out.get("timings", {})
    text = out["choices"][0]["message"]["content"] or ""
    if "</think>" in text:
        text = text.split("</think>", 1)[1]
    rec = {"key": key, "tag": tag, "text": text.strip(), "n_in": out["usage"]["prompt_tokens"], "n_out": out["usage"]["completion_tokens"],
           "n_in_new": tm.get("prompt_n"), "seconds": round(dt, 3)}
    cache.put(rec)
    return rec
