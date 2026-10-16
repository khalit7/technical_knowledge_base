#!/usr/bin/env python3
"""Launch lab: copy the evidence the page needs from the scratch evidence folder into src/launch/out/ (scrubbed).

usage: python3 la_collect.py <evidence root>
Writes out/launch_times.json (via la_analyze), env.json, rankpic.json, code.json, and raw_scrubbed/<system>/<run>/...
copies of the logs the hang cards quote. Scrubbing: container addresses become <ip-N>, the user's paths and the
host name are removed (same rules as src/data/scrub.py).
"""
import glob, json, os, re, shutil, socket, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")
RAW = os.path.join(HERE, "..", "raw_scrubbed")
IPS = {}


def scrub(text):
    text = re.sub(r"\x1b\[[0-9;]*m", "", text)

    def ip(m):
        IPS.setdefault(m.group(0), f"<ip-{len(IPS) + 1}>")
        return IPS[m.group(0)]
    text = re.sub(r"\b(?:\d{1,3}\.){3}\d{1,3}\b", ip, text)
    for s in {socket.gethostname(), socket.gethostname().split(".")[0], os.path.expanduser("~"), os.environ.get("USER", "")}:
        if s and len(s) > 2:
            text = text.replace(s, "<redacted>")
    text = re.sub(r"/(private/)?tmp/claude-[^\s\"']*", "<scratch>", text)
    return text


def jl(p):
    with open(p) as f:
        return json.load(f)


def env_torchrun(d):
    res = []
    for p in sorted(glob.glob(os.path.join(d, "probe_rank*.json")), key=lambda x: int(re.findall(r"\d+", os.path.basename(x))[0])):
        r = jl(p)
        v = {k: scrub(x) for k, x in r["env"].items() if not k.startswith("LA_")}
        res.append({"rank": r["rank"], "host": r["host"], "n_env": r["n_env"], "vars": v})
    return res


def env_ray(d):
    res = []
    for p in sorted(glob.glob(os.path.join(d, "loop_rank*.json"))):
        r = jl(p)
        host = None
        rk = os.path.join(d, f"rank{r['rank']}.jsonl")
        if os.path.exists(rk):
            host = json.loads(open(rk).readline())["host"]
        v = {k: scrub(x) for k, x in r["env"].items() if not k.startswith("LA_")}
        res.append({"rank": r["rank"], "host": host or "?", "n_env": None, "vars": v})
    return sorted(res, key=lambda x: x["rank"])


def main():
    root = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    subprocess.run([sys.executable, os.path.join(HERE, "la_analyze.py"), root, os.path.join(OUT, "launch_times.json")], check=True)
    env = {}
    if os.path.isdir(os.path.join(root, "slurm", "la-t1")):
        env["slurm"] = env_torchrun(os.path.join(root, "slurm", "la-t1"))
    if os.path.isdir(os.path.join(root, "k8s_runs", "la-t1")):
        env["k8s"] = env_torchrun(os.path.join(root, "k8s_runs", "la-t1"))
    if os.path.isdir(os.path.join(root, "ray", "la-t1")):
        env["ray"] = env_ray(os.path.join(root, "ray", "la-t1"))
    # the ray loop env does not hold the full count of variables; take it from the probe-less dump size
    json.dump(env, open(os.path.join(OUT, "env.json"), "w"), indent=1)
    # rank picture from Kubernetes run 1
    k = env.get("k8s")
    if k:
        nodes = {}
        for r in k:
            g = int(r["vars"]["GROUP_RANK"])
            pr = jl(os.path.join(root, "k8s_runs", "la-t1", f"probe_rank{r['rank']}.json"))
            nodes.setdefault(g, {"group_rank": g, "host": r["host"], "ranks": []})["ranks"].append(
                {"rank": r["rank"], "local_rank": int(r["vars"]["LOCAL_RANK"]), "world": int(r["vars"]["WORLD_SIZE"]), "pid": pr["pid"]})
        pic = {"master": k[0]["vars"]["MASTER_ADDR"] + ":" + k[0]["vars"]["MASTER_PORT"],
               "nodes": [nodes[g] for g in sorted(nodes)]}
        json.dump(pic, open(os.path.join(OUT, "rankpic.json"), "w"), indent=1)
    # code shown on the page: the real scripts
    sb = open(os.path.join(HERE, "la.sbatch")).read()
    sb = "\n".join(l for l in sb.splitlines() if not l.startswith("# ") or l.startswith("#SBATCH"))
    js = open(os.path.join(HERE, "la-jobset.yaml")).read()
    m = js[js.index("command:"):js.index("resources:")]
    json.dump({"sbatch": sb.strip(), "jobset": "# container of each pod (template; __NAME__ is the JobSet's name)\n" + m.rstrip()},
              open(os.path.join(OUT, "code.json"), "w"), indent=1)
    print("collected; ip map size", len(IPS))


if __name__ == "__main__":
    main()
