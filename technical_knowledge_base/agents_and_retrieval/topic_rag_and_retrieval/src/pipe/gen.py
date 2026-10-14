"""The local generator for the Pipeline lab: Qwen3-1.7B, GGUF Q4_K_M (unsloth/Qwen3-1.7B-GGUF, sha256 b139949c...,
from the inference topic's model store), served by llama.cpp's llama-server (Homebrew build 11146, Metal, all layers
on the GPU), greedy decoding (temperature 0, seed 0), thinking switched off through the chat template
(chat_template_kwargs enable_thinking false). One server, one slot, on this tab's port 8200.

The brief named the MLX 4-bit build of the same model; its weights were no longer in the model store on
2026-10-14 (the folder was emptied at 00:00 along with other files), so the GGUF build is used.

Every call returns the text plus token counts and llama-server's own timings, and every result is cached on disk
by prompt, so a rerun of a script costs nothing and the outputs are fixed. llama-server keeps the previous prompt's
KV cache (cache_prompt), so many questions about one long prefix (a whole paper) prefill the prefix once."""
import atexit
import hashlib
import json
import os
import subprocess
import time
import urllib.request

from common import L, work

GGUF = os.path.join(os.environ.get("INF_MODELS", os.path.join(L.scratch(), "..", "inf", "models")), "gguf", "Qwen3-1.7B-Q4_K_M.gguf")
MODEL_NAME = "Qwen3-1.7B Q4_K_M (llama.cpp)"
PORT = int(os.environ.get("PIP_PORT", "8200"))
URL = "http://127.0.0.1:%d" % PORT
_proc = None


def _up():
    try:
        with urllib.request.urlopen(URL + "/health", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def server(ctx=20480):
    global _proc
    if _up():
        return
    log = open(work("logs", "llama-server.log"), "a")
    _proc = subprocess.Popen(["llama-server", "-m", GGUF, "-ngl", "99", "-c", str(ctx), "-np", "1", "--port", str(PORT),
                              "--host", "127.0.0.1", "--seed", "0", "--jinja", "--temp", "0"], stdout=log, stderr=log)
    atexit.register(lambda: _proc and _proc.poll() is None and _proc.terminate())
    for _ in range(240):
        if _up():
            return
        time.sleep(0.5)
    raise RuntimeError("llama-server did not start")


class Cache:
    """jsonl cache: key = sha1 of the exact messages and max_tokens"""

    def __init__(self, name):
        self.path = work("gen", name + ".jsonl")
        self.d = {}
        if os.path.exists(self.path):
            for l in open(self.path):
                r = json.loads(l)
                self.d[r["key"]] = r

    def get(self, key):
        return self.d.get(key)

    def put(self, r):
        self.d[r["key"]] = r
        with open(self.path, "a") as f:
            f.write(json.dumps(r) + "\n")


def chat(user, cache, system=None, max_tokens=200, tag=None, think=False):
    msgs = ([{"role": "system", "content": system}] if system else []) + [{"role": "user", "content": user}]
    key = hashlib.sha1((json.dumps(msgs) + "|%d" % max_tokens + ("|think" if think else "")).encode()).hexdigest()
    hit = cache.get(key)
    if hit:
        return hit
    server()
    body = {"messages": msgs, "max_tokens": max_tokens, "temperature": 0, "seed": 0, "cache_prompt": True,
            "chat_template_kwargs": {"enable_thinking": bool(think)}}
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
           "n_in_new": tm.get("prompt_n"), "prompt_tps": round(tm.get("prompt_per_second", 0), 1), "gen_tps": round(tm.get("predicted_per_second", 0), 1),
           "seconds": round(dt, 3)}
    cache.put(rec)
    return rec


def chat_prefixed(prefix_user, suffix_user, cache, state, max_tokens=120, tag=None):
    """Same as chat(prefix + suffix); llama-server reuses the cached prefix of the previous prompt."""
    return chat(prefix_user + suffix_user, cache, max_tokens=max_tokens, tag=tag)
