"""The local generator for the Agentic lab: Qwen3 GGUF Q4_K_M (1.7B: unsloth/Qwen3-1.7B-GGUF, the Pipeline lab's file;
4B: Qwen/Qwen3-4B-GGUF), from the inference topic's model store, served by llama.cpp's llama-server (Homebrew build
11146, Metal, all layers on the GPU), greedy decoding (temperature 0, seed 0), thinking switched off through the chat
template (enable_thinking false). One server, one slot; this tab's ports are 8220 (1.7B) and 8221 (4B).

Every call returns the text plus token counts and llama-server's own timings, and is cached on disk by
(model, messages, max_tokens, stop), so a rerun costs nothing and the outputs are fixed. llama-server keeps the previous
prompt's KV cache (cache_prompt), so an agent's next step only prefills the tokens it added: `n_in_new` records that,
`n_in` is what an API would bill."""
import atexit
import hashlib
import json
import os
import subprocess
import time
import urllib.request

from common import L, work

STORE = os.environ.get("INF_MODELS", os.path.join(L.scratch(), "..", "inf", "models"))
MODELS = {
    "1.7b": dict(file=os.path.join(STORE, "gguf", "Qwen3-1.7B-Q4_K_M.gguf"), port=8220, name="Qwen3-1.7B Q4_K_M"),
    "4b": dict(file=os.path.join(STORE, "gguf", "Qwen3-4B-Q4_K_M.gguf"), port=8221, name="Qwen3-4B Q4_K_M"),
}
CTX = int(os.environ.get("AGT_CTX", "20480"))
_proc = {}


def _up(port):
    try:
        with urllib.request.urlopen("http://127.0.0.1:%d/health" % port, timeout=2) as r:
            return r.status == 200
    except Exception:
        return False


def server(model):
    m = MODELS[model]
    if _up(m["port"]):
        return
    log = open(work("logs", "llama-server-%s.log" % model), "a")
    p = subprocess.Popen(["llama-server", "-m", m["file"], "-ngl", "99", "-c", str(CTX), "-np", "1", "--port", str(m["port"]),
                          "--host", "127.0.0.1", "--seed", "0", "--jinja", "--temp", "0"], stdout=log, stderr=log)
    _proc[model] = p
    print("started llama-server", model, "pid", p.pid, flush=True)
    atexit.register(lambda: p.poll() is None and p.terminate())
    for _ in range(240):
        if _up(m["port"]):
            return
        time.sleep(0.5)
    raise RuntimeError("llama-server did not start")


def stop(model):
    p = _proc.pop(model, None)
    if p and p.poll() is None:
        p.terminate()
        p.wait(30)


class Cache:
    """jsonl cache: key = sha1 of model, exact messages, max_tokens and stop strings"""

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
            f.write(json.dumps(r, ensure_ascii=False) + "\n")


def key_of(model, msgs, max_tokens, stop_s):
    return hashlib.sha1((model + "|" + json.dumps(msgs, ensure_ascii=False) + "|%d|" % max_tokens + json.dumps(stop_s or [])).encode()).hexdigest()


def chat(msgs, cache, model="1.7b", max_tokens=64, stop_s=None, tag=None, offline=False):
    """msgs: list of {role, content}. Returns the cached record if present. offline=True never calls the server."""
    if isinstance(msgs, str):
        msgs = [{"role": "user", "content": msgs}]
    key = key_of(model, msgs, max_tokens, stop_s)
    hit = cache.get(key)
    if hit:
        return hit
    if offline:
        return None
    server(model)
    body = {"messages": msgs, "max_tokens": max_tokens, "temperature": 0, "seed": 0, "cache_prompt": True,
            "chat_template_kwargs": {"enable_thinking": False}}
    if stop_s:
        body["stop"] = stop_s
    req = urllib.request.Request("http://127.0.0.1:%d/v1/chat/completions" % MODELS[model]["port"], data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=900) as r:
        out = json.loads(r.read())
    dt = time.perf_counter() - t0
    tm = out.get("timings", {})
    text = out["choices"][0]["message"]["content"] or ""
    if "</think>" in text:
        text = text.split("</think>", 1)[1]
    rec = {"key": key, "tag": tag, "model": model, "text": text.strip(), "n_in": out["usage"]["prompt_tokens"],
           "n_out": out["usage"]["completion_tokens"], "n_in_new": tm.get("prompt_n"),
           "prompt_ms": round(tm.get("prompt_ms", 0), 1), "gen_ms": round(tm.get("predicted_ms", 0), 1),
           "seconds": round(dt, 3), "t": time.strftime("%Y-%m-%d %H:%M:%S")}
    cache.put(rec)
    return rec


def ntok(text):
    """Qwen3 token count (tokenizer of the Qwen3-Embedding folder: same vocabulary as the generators)."""
    global _tok
    try:
        _tok
    except NameError:
        from tokenizers import Tokenizer
        _tok = Tokenizer.from_file(os.path.join(L.path("models", "Qwen3-Embedding-0.6B"), "tokenizer.json"))
    return len(_tok.encode(text, add_special_tokens=False).ids)
