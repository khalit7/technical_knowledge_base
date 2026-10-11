"""Copy srvlab/ollamalab/cpu results into the repo's results/ with local paths removed and server-log facts extracted.
usage: python3 -I slim_srv.py <INF/lo/runs> <repo src/results>
"""
import json, os, re, sys

runs, out = sys.argv[1:3]
os.makedirs(os.path.join(out, "srv"), exist_ok=True)


def scrub(o):
    if isinstance(o, dict):
        return {k: scrub(v) for k, v in o.items() if k not in ("chat_template", "media_marker")}
    if isinstance(o, list):
        return [scrub(v) for v in o]
    if isinstance(o, str):
        o = re.sub(r"(/private)?/(tmp|Users)/[^\s\"',]*/([^/\s\"',]+)", r"<scratch>/\3", o)
        return o
    return o


def log(name):
    p = os.path.join(runs, "srv", name + ".server.log")
    return open(p, errors="replace").read() if os.path.exists(p) else ""


for f in sorted(os.listdir(os.path.join(runs, "srv"))):
    if not f.endswith(".json") or f.endswith(".lg.json"):
        continue
    d = json.load(open(os.path.join(runs, "srv", f)))
    name = f[:-5]
    if name == "defaults":
        L = log("defaults")
        m = re.search(r"n_ctx_seq \((\d+)\)", L)
        d["pool_tokens"] = int(m.group(1)) if m else None
        m = re.search(r"initializing, (n_slots = \d+, n_ctx_slot = \d+, kv_unified = '\w+')", L)
        d["log_ctx"] = m.group(1) if m else ""
    if name.startswith("slots_np"):
        for r in d.get("runs", []):
            pass
        d.pop("metrics", None) if False else None
    if name == "router":
        L = log("router")
        sh = d.get("show") or {}
        d["show"] = {"modelfile_template": "TEMPLATE {{ .Prompt }}" if "TEMPLATE {{ .Prompt }}" in sh.get("modelfile", "") else None, "details": sh.get("details")}
        m = re.search(r'cmd="(/Applications/Ollama.app/Contents/Resources/llama-server[^"]*)"', L)
        d["runner_cmd"] = m.group(1) if m else None
        m = re.search(r'vram-based default context" total_vram="([^"]+)" default_num_ctx=(\d+)', L)
        d["vram_ctx"] = [m.group(1), int(m.group(2))] if m else None
        t = re.findall(r'time=\S+T\d\d:(\d\d):([\d.]+)\+\S+ level=INFO source=llama_server.go:\d+ msg="(starting llama-server|waiting for llama-server to start responding)"', L)
        d["load_marks"] = t[:4]
        d["log_lines"] = [l for l in L.splitlines() if re.search(r"spawning|unload|stopp|loaded|evict", l, re.I)][:40]
    json.dump(scrub(d), open(os.path.join(out, "srv", f), "w"), indent=0)
    print("wrote", f)
for sub, fname in (("ollama", "ollama.json"),):
    p = os.path.join(runs, sub, fname)
    if os.path.exists(p):
        d = json.load(open(p))
        L = open(os.path.join(runs, sub, "ollama.server.log"), errors="replace").read()
        sh = d.get("show") or {}
        d["show"] = {"modelfile_template": "TEMPLATE {{ .Prompt }}" if "TEMPLATE {{ .Prompt }}" in sh.get("modelfile", "") else None, "details": sh.get("details")}
        m = re.search(r'cmd="(/Applications/Ollama.app/Contents/Resources/llama-server[^"]*)"', L)
        d["runner_cmd"] = m.group(1) if m else None
        m = re.search(r'vram-based default context" total_vram="([^"]+)" default_num_ctx=(\d+)', L)
        d["vram_ctx"] = [m.group(1), int(m.group(2))] if m else None
        t = re.findall(r'time=\S+T\d\d:(\d\d):([\d.]+)\+\S+ level=INFO source=llama_server.go:\d+ msg="(starting llama-server|waiting for llama-server to start responding)"', L)
        d["load_marks"] = t[:4]
        d["log_lines"] = [l for l in L.splitlines() if re.search(r"llama-server|runner|starting|num_ctx|ctx|parallel|offload|loaded|load_duration|mlx", l, re.I)][:60]
        json.dump(scrub(d), open(os.path.join(out, fname), "w"), indent=0)
        print("wrote", fname)
p = os.path.join(runs, "cpu", "cpu_gpu.json")
if os.path.exists(p):
    rows = json.load(open(p))
    ld = json.load(open(os.path.join(runs, "cpu", "cpu_gpu.load")))
    keep = [{k: r[k] for k in ("n_gpu_layers", "n_threads", "n_prompt", "n_gen", "avg_ts", "stddev_ts", "samples_ts", "model_size", "model_type", "build_commit")} for r in rows]
    json.dump({"rows": keep, "load": ld}, open(os.path.join(out, "cpu.json"), "w"), indent=0)
    print("wrote cpu.json")
