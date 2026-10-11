"""Run llama-server sessions one after another under the shared bench lock.
usage: INF=<scratch inf dir> lrun.py <jobs.json> <out dir>
jobs.json: [{"tag": str, "args": [server args; "<G>/" stands for $INF/models/gguf/], "client": [{"B", "rounds", "np", "prompts"}]}]
Each session: acquire the lock, start llama-server on port 8141, wait for /health, run each client set, stop the
server, release the lock and pause so other waiting agents can take it."""
import json, os, subprocess, sys, time, urllib.request
I = os.environ["INF"]; LOCK = os.path.join(I, "lock.sh"); PY = os.path.dirname(os.path.abspath(__file__))
G = os.path.join(I, "models", "gguf") + "/"
jobs, OUT = json.load(open(sys.argv[1])), sys.argv[2]
os.makedirs(OUT, exist_ok=True)
PORT = 8141
name_ = lambda tag, c: "%s%s_B%d.json" % (tag, "_r%d" % c["rep"] if "rep" in c else "", c["B"])
def load():
    la = subprocess.run(["sysctl", "-n", "vm.loadavg"], capture_output=True, text=True).stdout.strip()
    mp = subprocess.run(["memory_pressure"], capture_output=True, text=True).stdout.strip().splitlines()
    return la + " mem_free " + (mp[-1].split(":")[-1].strip() if mp else "?")
for job in jobs:
    tag = job["tag"]
    if all(os.path.exists(os.path.join(OUT, name_(tag, c))) for c in job["client"]):
        print("skip", tag, flush=True); continue
    if subprocess.run([LOCK, "acquire", "bench", "sd", "21600"]).returncode: sys.exit("lock timeout")
    try:
        args = [a.replace("<G>/", G) for a in job["args"]]
        log = open(os.path.join(OUT, tag + ".server.log"), "w")
        sp = subprocess.Popen(["llama-server"] + args + ["--port", str(PORT), "--host", "127.0.0.1"], stdout=log, stderr=subprocess.STDOUT)
        ok = False
        for _ in range(300):
            try:
                urllib.request.urlopen("http://127.0.0.1:%d/health" % PORT, timeout=2); ok = True; break
            except Exception:
                if sp.poll() is not None: break
                time.sleep(1)
        if not ok:
            print("FAILED to start", tag, flush=True)
        else:
            for c in job["client"]:
                o = os.path.join(OUT, name_(tag, c))
                if os.path.exists(o): continue
                lb = load()
                pf = c["prompts"] if os.path.isabs(c["prompts"]) else os.path.join(PY, c["prompts"])
                subprocess.run([sys.executable, "-I", os.path.join(PY, "xclient.py"), "http://127.0.0.1:%d" % PORT, o, str(c["B"]),
                                str(c["rounds"]), str(c["np"]), pf, tag])
                la = load()
                if os.path.exists(o):
                    d = json.load(open(o)); d["server_args"] = " ".join(["llama-server"] + job["args"]); d["load_before"] = lb; d["load_after"] = la
                    json.dump(d, open(o, "w"))
                subprocess.run([LOCK, "touch", "bench", "sd"], capture_output=True)
        sp.terminate()
        try: sp.wait(30)
        except Exception: sp.kill()
    finally:
        subprocess.run([LOCK, "release", "bench", "sd"])
        time.sleep(12)
