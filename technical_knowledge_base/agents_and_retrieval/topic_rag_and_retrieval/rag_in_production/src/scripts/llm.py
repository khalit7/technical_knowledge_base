"""The local generator for this page: llama.cpp's llama-server (Homebrew build, Metal, all layers on the GPU) with the
inference topic's Qwen3 GGUF files, greedy (temperature 0, seed 0), thinking off through the chat template, on this
page's port 8382. Same server settings as the root's Pipeline lab (src/pipe/gen.py). Hold the bench lock."""
import atexit
import json
import os
import subprocess
import time
import urllib.request

from common import L, work

MODELS = {"qwen3-1.7b": "Qwen3-1.7B-Q4_K_M.gguf", "qwen3-4b": "Qwen3-4B-Q4_K_M.gguf"}
PORT = 8382
URL = "http://127.0.0.1:%d" % PORT
_proc = None


def gguf(name):
    return os.path.join(L.scratch(), "..", "inf", "models", "gguf", MODELS[name])


def up():
    try:
        with urllib.request.urlopen(URL + "/health", timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def start(name, ctx=16384):
    global _proc
    stop()
    log = open(work("logs", "llama-server-%s.log" % name), "a")
    _proc = subprocess.Popen(["llama-server", "-m", gguf(name), "-ngl", "99", "-c", str(ctx), "-np", "1", "--port", str(PORT),
                              "--host", "127.0.0.1", "--seed", "0", "--jinja", "--temp", "0"], stdout=log, stderr=log)
    atexit.register(stop)
    for _ in range(240):
        if up():
            return
        time.sleep(0.5)
    raise RuntimeError("llama-server did not start")


def stop():
    global _proc
    if _proc is not None and _proc.poll() is None:
        _proc.terminate(); _proc.wait(timeout=30)
    _proc = None


def chat(messages, max_tokens=200, cache_prompt=True):
    body = {"messages": messages, "max_tokens": max_tokens, "temperature": 0, "seed": 0, "cache_prompt": cache_prompt,
            "chat_template_kwargs": {"enable_thinking": False}}
    req = urllib.request.Request(URL + "/v1/chat/completions", json.dumps(body).encode(), {"Content-Type": "application/json"})
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=600) as r:
        out = json.loads(r.read())
    wall = time.perf_counter() - t0
    tm = out.get("timings", {})
    return {"text": out["choices"][0]["message"]["content"], "n_in": out["usage"]["prompt_tokens"], "n_out": out["usage"]["completion_tokens"],
            "prompt_ms": tm.get("prompt_ms"), "prompt_n": tm.get("prompt_n"), "gen_tps": tm.get("predicted_per_second"), "wall_s": round(wall, 3)}


def stream_ttft(messages, max_tokens=64, cache_prompt=False):
    """Wall-clock time to the first streamed content token, and to the end."""
    body = {"messages": messages, "max_tokens": max_tokens, "temperature": 0, "seed": 0, "cache_prompt": cache_prompt, "stream": True,
            "chat_template_kwargs": {"enable_thinking": False}}
    req = urllib.request.Request(URL + "/v1/chat/completions", json.dumps(body).encode(), {"Content-Type": "application/json"})
    t0 = time.perf_counter(); first = None; n = 0; timings = {}
    with urllib.request.urlopen(req, timeout=600) as r:
        for line in r:
            line = line.decode().strip()
            if not line.startswith("data:") or line == "data: [DONE]":
                continue
            d = json.loads(line[5:])
            if d.get("timings"):
                timings = d["timings"]
            ch = d.get("choices") or [{}]
            if ch[0].get("delta", {}).get("content"):
                n += 1
                if first is None:
                    first = time.perf_counter() - t0
    return {"ttft_ms": round(1000 * first, 1) if first else None, "total_ms": round(1000 * (time.perf_counter() - t0), 1), "chunks": n,
            "prompt_n": timings.get("prompt_n"), "prompt_ms": timings.get("prompt_ms"), "gen_tps": timings.get("predicted_per_second")}
