"""Cross-check: which versions the topic's labs actually run, against the Tool map's latest releases. Light and read-only:
pip metadata in the shared venv, `sinfo -V` inside the Slurm controller container, `kubectl version` and controller image
tags in the kind cluster. Writes out/versions.json with versions only (no hostnames, paths or addresses).
Run: python3 -B src/map/check_versions.py <shared venv python> [slurm controller container] [kubectl context]"""
import json, os, re, subprocess, sys
HERE = os.path.dirname(os.path.abspath(__file__))
py = sys.argv[1]; ctl = sys.argv[2] if len(sys.argv) > 2 else ""; ctx = sys.argv[3] if len(sys.argv) > 3 else ""


def run(cmd):
    try:
        return subprocess.run(cmd, capture_output=True, text=True, timeout=60).stdout.strip()
    except Exception:
        return ""


def norm(v):
    return re.sub(r"^v", "", v or "")


latest = {}
dj = open(os.path.join(HERE, "..", "parts", "36_js_tm_0data.js")).read().split("\n", 1)[1]
for t in json.loads(dj[len("window.TM_DATA="):].rstrip().rstrip(";"))["tools"]:
    latest[t["id"]] = t["m"].get("ver", "")
rows = []


def add(id, name, how, lab, note=""):
    if not lab:
        return
    l = norm(latest.get(id)); same = norm(lab) == l
    gap = "" if same else ("older than latest " + l if l else "no release to compare")
    if not same and l and norm(lab).split(".")[:2] == l.split(".")[:2]:
        gap = "same release series (" + ".".join(l.split(".")[:2]) + "), older patch"
    rows.append({"id": id, "name": name, "how": how, "lab": lab, "same": same, "gap": gap, "note": note})


pk = json.loads(run([py, "-I", "-c", "import json,importlib.metadata as m\nout={}\nfor p in ['ray','torch','kubernetes','skypilot']:\n  try: out[p]=m.version(p)\n  except Exception: pass\nprint(json.dumps(out))"]) or "{}")
add("ray", "Ray", "pip, shared venv", pk.get("ray")); add("torchrun", "PyTorch (torchrun)", "pip, shared venv", pk.get("torch"))
if ctl:
    m = re.search(r"slurm(?:-wlm)? (\d\S*)", run(["docker", "exec", ctl, "sinfo", "-V"]))
    if m: add("slurm", "Slurm", "sinfo -V in the controller container (Debian package)", m.group(1),
              "Debian 13 packages Slurm 24.11; SchedMD's September 2026 patch releases (2026-09-02) were for 26.05, 25.11 and 25.05, not 24.11. Fine for teaching sbatch, srun, backfill and fairshare.")
if ctx:
    kv = json.loads(run(["kubectl", "--context", ctx, "version", "-o", "json"]) or "{}")
    sv = (kv.get("serverVersion") or {}).get("gitVersion", "")
    add("k8s", "Kubernetes (kind)", "kubectl version, server", sv.split("+")[0], "kind node image")
    dep = json.loads(run(["kubectl", "--context", ctx, "get", "deploy", "-A", "-o", "json"]) or "{}")
    seen = set()
    for d in dep.get("items", []):
        for c in d["spec"]["template"]["spec"]["containers"]:
            img = c["image"]; tag = img.rsplit(":", 1)[-1].split("@")[0]
            for id, name, pat in [("kueue", "Kueue", "kueue"), ("jobset", "JobSet", "jobset"), ("trainer", "Kubeflow Trainer", "trainer-controller"),
                                  ("kuberay", "KubeRay", "kuberay")]:
                if pat in img and id not in seen:
                    seen.add(id); add(id, name, "controller image tag", tag)
out = {"note": "Read on 2026-10-16 from the topic's shared lab environment (Apple M1 Pro, Docker Desktop): pip metadata, sinfo -V, kubectl version and controller image tags. 'Latest release' is this map's column.",
       "rows": rows}
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump(out, open(os.path.join(HERE, "out", "versions.json"), "w"), indent=1)
for r in rows: print(r)
