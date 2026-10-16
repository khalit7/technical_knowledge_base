"""Fill the <!--CODE:x--> ... <!--/CODE:x--> blocks of the Reading tab from the setup's real files and runs.

Run from anywhere: python3 make_code.py. Reads ../data (specs and scrubbed run logs), writes ../parts/20_read_b.html in place.
Everything shown ran: the specs are the files the setup submitted, the outputs are lines of the recorded runs.
"""
import html, json, os, re

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
PARTS = os.path.join(HERE, "..", "parts")


def rd(*p):
    with open(os.path.join(DATA, *p)) as f:
        return f.read()


def events(system, rank=0):
    out = {}
    for line in rd("runs", system, "rank%d.jsonl" % rank).splitlines():
        e = json.loads(line)
        if e["ev"] in ("start", "end"):
            out[e["ev"]] = e
    return out


def pre(text, cls="rd-code"):
    return '<pre class="%s">%s</pre>' % (cls, html.escape(text.rstrip("\n"), quote=False))


def rank0(system):
    ev = events(system)
    s, e = ev["start"], ev["end"]
    env = json.dumps(s["env"], indent=1)
    return ("rank 0 at start: host %s, world %d, local_rank %d\nenv %s\nrank 0 at the end: step %d, global loss %r"
            % (s["host"], s["world"], s["local_rank"], env, e["step"], e["gloss"]))


def block(system):
    if system == "slurm":
        spec = rd("slurm", "train.sbatch")
        sacct = [l for l in rd("runs", "slurm", "sacct.txt").splitlines() if l.startswith("JobID") or l.startswith("1|")]
        first = rd("runs", "slurm", "job.out").splitlines()[0]
        out = first + "\n\n$ sacct (one line per job)\n" + "\n".join(sacct) + "\n\n" + rank0("slurm")
        cap = ("<code>src/data/slurm/train.sbatch</code>, submitted with <code>sbatch</code> on Slurm 24.11.5 (the Debian 13 package; upstream is at 26.05.5) in containers (3 nodes, fake GPUs counted but not used). "
               "Output: the script's first line, <code>sacct</code>'s record, and what rank 0 logged. torchrun's c10d rendezvous met at port 29500, "
               "then gave the workers a fresh store port, hence <code>master_port</code> 35789.")
        return pre(spec) + pre(out, "rd-code rd-out") + '<p class="rd-codecap">' + cap + "</p>"
    if system == "k8s":
        spec = rd("k8s", "train-jobset.yaml")
        ev = [l for l in rd("runs", "k8s", "events.txt").splitlines()
              if re.search(r"TIME|QuotaReserved|Admitted |Scheduled|AllJobsCompleted", l)]
        ev = [re.sub(r"\s{3,}", "  ", l) for l in ev]
        out = "$ kubectl get events (selected)\n" + "\n".join(ev) + "\n\n" + rank0("k8s")
        cap = ("<code>src/data/k8s/train-jobset.yaml</code>, created with <code>kubectl create -f</code> on kind (Kubernetes v1.37.0) with JobSet v0.13.0 and Kueue v0.20.2. "
               "Kueue reserved quota and admitted the whole JobSet before any pod was scheduled; rank 0's <code>master_addr</code> is pod 0's DNS name through the headless service.")
        return pre(spec) + pre(out, "rd-code rd-out") + '<p class="rd-codecap">' + cap + "</p>"
    if system == "ray":
        lines = rd("ray", "ray_train.py").splitlines()
        i = next(k for k, l in enumerate(lines) if "ray.init(" in l)
        j = next(k for k, l in enumerate(lines) if "result = trainer.fit()" in l)
        spec = "# src/data/ray/ray_train.py, lines %d-%d of %d (the rest parses arguments and calls train.py's train())\n" % (i + 1, j + 1, len(lines))
        spec += "\n".join(lines[i:j + 1])
        drv = [l for l in rd("runs", "ray", "driver.out").splitlines()
               if "Requesting resources" in l or "world_rank=" in l or "Setting up process group" in l]
        seen, d2 = set(), []
        for l in drv:
            if l not in seen:
                seen.add(l)
                d2.append(l)
        out = "driver output (selected)\n" + "\n".join(d2) + "\n\n" + rank0("ray")
        cap = ("Run with <code>python ray_train.py</code> on a Ray 2.59.0 cluster of three containers (head plus 2 workers). "
               "Ray Train placed 4 worker actors, set the environment itself and initialised the gloo process group (<code>env://</code>) before calling the training function.")
        return pre(spec) + pre(out, "rd-code rd-out") + '<p class="rd-codecap">' + cap + "</p>"


p = os.path.join(PARTS, "20_read_b.html")
s = open(p).read()
for system in ("slurm", "k8s", "ray"):
    s, n = re.subn(r"<!--CODE:%s-->.*?<!--/CODE:%s-->" % (system, system),
                   lambda m: "<!--CODE:%s-->%s<!--/CODE:%s-->" % (system, block(system), system), s, flags=re.S)
    assert n == 1, system
open(p, "w").write(s)
cmp = json.loads(rd("runs", "compare.json"))
print("filled; steps compared:", len(cmp["steps"]), "all same:", all(x["same"] for x in cmp["steps"]),
      "step 200:", [x for x in cmp["steps"] if x["step"] == 200][0]["slurm"])
