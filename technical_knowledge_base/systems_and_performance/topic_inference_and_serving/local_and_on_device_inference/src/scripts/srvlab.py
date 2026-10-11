"""llama-server experiments for the local inference page (prefix lo, ports 8170-8179).

usage: python3 -I srvlab.py <INF dir> <experiment> [args]
Starts llama-server itself (own PID), waits for /health, runs the experiment, stops the server.
Caller holds the bench lock. Results: <INF>/lo/runs/srv/<experiment>*.json and server logs.
Standard library only.
"""
import json, os, subprocess, sys, time, http.client, random

INF = sys.argv[1]
EXP = sys.argv[2]
OUT = os.path.join(INF, "lo", "runs", "srv")
os.makedirs(OUT, exist_ok=True)
G = os.path.join(INF, "models", "gguf")
M17 = os.path.join(G, "Qwen3-1.7B-Q4_K_M.gguf")
PORT = 8170
WIKI = os.path.join(INF, "data", "wiki.test.raw")


def load():
    la = subprocess.run(["sysctl", "-n", "vm.loadavg"], capture_output=True, text=True).stdout.strip("{} \n").split()
    return [float(x) for x in la[:3]]


def req(method, path, body=None, timeout=900):
    c = http.client.HTTPConnection("127.0.0.1", PORT, timeout=timeout)
    c.request(method, path, body=json.dumps(body) if body is not None else None,
              headers={"Content-Type": "application/json"})
    r = c.getresponse()
    data = r.read()
    try:
        return r.status, json.loads(data)
    except Exception:
        return r.status, data.decode("utf-8", "replace")


class Server:
    def __init__(self, name, args, model=M17):
        self.name = name
        self.cmd = ["llama-server", "-m", model, "--port", str(PORT), "--host", "127.0.0.1", "--metrics"] + args
        if model is None:
            self.cmd = ["llama-server", "--port", str(PORT), "--host", "127.0.0.1", "--metrics"] + args

    def __enter__(self):
        self.log = open(os.path.join(OUT, self.name + ".server.log"), "w")
        t0 = time.time()
        self.p = subprocess.Popen(self.cmd, stdout=self.log, stderr=subprocess.STDOUT)
        while True:
            if self.p.poll() is not None:
                raise RuntimeError("server exited")
            try:
                s, _ = req("GET", "/health", timeout=2)
                if s == 200:
                    break
            except Exception:
                pass
            if time.time() - t0 > 300:
                raise RuntimeError("server not healthy")
            time.sleep(0.1)
        self.ready_s = time.time() - t0
        return self

    def __exit__(self, *a):
        self.p.terminate()
        try:
            self.p.wait(20)
        except Exception:
            self.p.kill()
        self.log.close()


def save(name, obj):
    obj["load_after"] = load()
    json.dump(obj, open(os.path.join(OUT, name + ".json"), "w"), indent=1)
    print(name, "saved", flush=True)


def wiki_text(start_chars, n_chars):
    t = open(WIKI, encoding="utf-8").read()
    return t[start_chars:start_chars + n_chars]


def complete(prompt, n, extra=None):
    body = {"prompt": prompt, "n_predict": n, "temperature": 0, "cache_prompt": True}
    body.update(extra or {})
    t0 = time.time()
    s, r = req("POST", "/completion", body)
    r = r if isinstance(r, dict) else {"raw": r}
    r["_status"] = s
    r["_wall"] = time.time() - t0
    return r


def slim(r):
    keep = {k: r.get(k) for k in ("_status", "_wall", "tokens_predicted", "tokens_evaluated", "truncated",
                                  "stop_type", "timings", "error", "id_slot", "tokens_cached")}
    if "content" in r:
        keep["content_head"] = r["content"][:160]
    if "completion_probabilities" in r:
        keep["probs"] = r["completion_probabilities"][:8]
    return keep


def exp_defaults():
    lb = load()
    with Server("defaults", []) as s:
        out = {"cmd": s.cmd[1:], "ready_s": s.ready_s, "load_before": lb}
        out["props"] = req("GET", "/props")[1]
        out["slots_before"] = req("GET", "/slots")[1]
        out["req"] = slim(complete(wiki_text(0, 2000), 64))
        out["slots_after"] = req("GET", "/slots")[1]
        out["metrics"] = req("GET", "/metrics")[1]
    save("defaults", out)


def exp_slots(nps, seeds):
    """8 closed-loop users against -np N slots, fixed total context 16384."""
    lg = os.path.join(INF, "ibench", "loadgen.py")
    for npar in nps:
        lb = load()
        with Server(f"slots_np{npar}", ["-np", str(npar), "-c", "16384", "-ngl", "99"]) as s:
            res = {"np": npar, "cmd": s.cmd[1:], "load_before": lb, "runs": []}
            for seed in seeds:
                f = os.path.join(OUT, f"slots_np{npar}_s{seed}.lg.json")
                subprocess.run(["python3", "-I", lg, "--url", f"http://127.0.0.1:{PORT}", "--mode", "closed", "--conc", "8",
                                "--n", "32", "--prompt-words", "400", "--max-tokens", "128", "--seed", str(seed),
                                "--out", f], check=True)
                res["runs"].append(json.load(open(f))["summary"])
            res["metrics"] = req("GET", "/metrics")[1]
        save(f"slots_np{npar}", res)


def exp_unified():
    """A 3,000-token prompt with 4 slots and -c 8192: split KV (2,048 per slot) against unified KV."""
    text = wiki_text(10000, 13000)
    out = {}
    for name, args in (("split", ["-np", "4", "-c", "8192", "-ngl", "99"]),
                       ("unified", ["-np", "4", "-c", "8192", "-ngl", "99", "-kvu"])):
        lb = load()
        with Server(f"unified_{name}", args) as s:
            r = complete(text, 16)
            out[name] = {"cmd": s.cmd[1:], "load_before": lb, "req": slim(r),
                         "slots": [{k: x.get(k) for k in ("id", "n_ctx")} for x in req("GET", "/slots")[1]]}
    save("unified", out)


def exp_ctxshift():
    """-c 512, one slot, ask for 1,500 tokens ignoring EOS: context shift off against on."""
    out = {}
    prompt = wiki_text(30000, 800)
    for name, args in (("off", ["-np", "1", "-c", "512", "-ngl", "99"]),
                       ("on", ["-np", "1", "-c", "512", "-ngl", "99", "--context-shift"])):
        lb = load()
        with Server(f"ctxshift_{name}", args) as s:
            r = complete(prompt, 1500, {"ignore_eos": True})
            out[name] = {"cmd": s.cmd[1:], "load_before": lb, "req": slim(r)}
        log = open(os.path.join(OUT, f"ctxshift_{name}.server.log")).read()
        out[name]["shift_lines"] = [l for l in log.splitlines() if "context shift" in l][:6]
        out[name]["n_shift_lines"] = sum(1 for l in log.splitlines() if "context shift" in l)
    save("ctxshift", out)


def exp_reuse():
    """Second request drops one document from the middle of the prompt.
    Common prefix = system part only; with --cache-reuse 256 the later document is shifted, not recomputed."""
    sysp = "You are a careful research assistant. Answer from the documents.\n\n" + wiki_text(50000, 1800)
    docA = "\n\nDocument A:\n" + wiki_text(60000, 3200)
    docB = "\n\nDocument B:\n" + wiki_text(70000, 3200)
    q = "\n\nQuestion: In one sentence, what is Document B about?\nAnswer:"
    p1 = sysp + docA + docB + q
    p2 = sysp + docB + q
    out = {}
    for name, args in (("off", ["-np", "1", "-c", "8192", "-ngl", "99"]),
                       ("reuse256", ["-np", "1", "-c", "8192", "-ngl", "99", "--cache-reuse", "256"]),
                       ("fresh", ["-np", "1", "-c", "8192", "-ngl", "99"])):
        lb = load()
        with Server(f"reuse_{name}", args) as s:
            runs = []
            for rep in range(3):
                if name == "fresh":
                    r2 = complete(p2, 24, {"n_probs": 5, "cache_prompt": False})
                    runs.append({"second": slim(r2)})
                    continue
                complete("warm " + str(rep), 1, {"cache_prompt": False})
                r1 = complete(p1, 8)
                r2 = complete(p2, 24, {"n_probs": 5})
                runs.append({"first": slim(r1), "second": slim(r2)})
            out[name] = {"cmd": s.cmd[1:], "load_before": lb, "runs": runs}
        log = open(os.path.join(OUT, f"reuse_{name}.server.log")).read()
        out[name]["reuse_lines"] = [l for l in log.splitlines() if "reus" in l.lower()][:6]
    save("reuse", out)


def exp_router():
    """Router mode: --models-dir with three models, --models-max 1: every switch unloads and loads."""
    d = os.path.join(INF, "lo", "router_models")
    os.makedirs(d, exist_ok=True)
    for f in ("Qwen3-0.6B-Q4_K_M.gguf", "Qwen3-1.7B-Q4_K_M.gguf", "Qwen3-4B-Q4_K_M.gguf"):
        dst = os.path.join(d, f)
        if not os.path.exists(dst):
            os.symlink(os.path.join(G, f), dst)
    lb = load()
    out = {"load_before": lb}
    with Server("router", ["--models-dir", d, "--models-max", "1", "-ngl", "99", "-c", "4096"], model=None) as s:
        out["cmd"] = s.cmd[1:]
        out["ready_s"] = s.ready_s
        out["models"] = req("GET", "/v1/models")[1]
        seq = []
        order = ["Qwen3-0.6B-Q4_K_M", "Qwen3-1.7B-Q4_K_M", "Qwen3-0.6B-Q4_K_M", "Qwen3-4B-Q4_K_M",
                 "Qwen3-4B-Q4_K_M", "Qwen3-1.7B-Q4_K_M"]
        for m in order:
            t0 = time.time()
            st, r = req("POST", "/v1/chat/completions", {"model": m, "messages": [{"role": "user", "content": "Say hi."}],
                                                         "max_tokens": 8, "temperature": 0})
            seq.append({"model": m, "status": st, "wall_s": time.time() - t0,
                        "usage": r.get("usage") if isinstance(r, dict) else None,
                        "err": None if st == 200 else str(r)[:300]})
        out["seq"] = seq
        out["models_after"] = req("GET", "/v1/models")[1]
    save("router", out)


if __name__ == "__main__":
    if EXP == "defaults":
        exp_defaults()
    elif EXP == "slots":
        exp_slots([int(x) for x in sys.argv[3].split(",")], [int(x) for x in sys.argv[4].split(",")])
    elif EXP == "unified":
        exp_unified()
    elif EXP == "ctxshift":
        exp_ctxshift()
    elif EXP == "reuse":
        exp_reuse()
    elif EXP == "router":
        exp_router()
