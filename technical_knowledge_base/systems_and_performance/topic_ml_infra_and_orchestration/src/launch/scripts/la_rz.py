#!/usr/bin/env python3
"""Launch lab: the rendezvous animation's events (out/rz.json) from two real Slurm runs: la-t1 (all arrive) and
la-miss (node 1 never starts torchrun). Times are seconds from the first node's task starting.
usage: python3 la_rz.py <evidence root>
"""
import glob, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "..", "out")


def jl(p):
    with open(p) as f:
        return json.load(f)


def main():
    root = sys.argv[1]
    d = os.path.join(root, "slurm", "la-t1")
    ag = {a["host"]: a for a in (jl(p) for p in glob.glob(os.path.join(d, "agent_*.json")))}
    a0, a1 = ag["c1"], ag["c2"]
    pr = {p["rank"]: p for p in (jl(x) for x in glob.glob(os.path.join(d, "probe_rank*.json")))}
    T0 = min(a0["task_ts"], a1["task_ts"])
    port = pr[0]["env"]["MASTER_PORT"]
    s1 = max(json.loads(l)["ts"] for p in glob.glob(os.path.join(d, "rank*.jsonl")) for l in open(p) if '"step"' in l and '"step": 1,' in l)
    r = lambda t: round(t - T0, 3)
    ev = [
        {"t": r(a0["task_ts"]), "a": "n0", "s": "up", "cap": "srun starts one task per node. On node 0 (c1) the task execs torchrun, which starts by importing torch."},
        {"t": r(a1["task_ts"]), "a": "n1", "s": "up", "cap": "Node 1 (c2) starts its torchrun too, at almost the same moment."},
        {"t": r(a0["rdzv"][0]["t0"]), "a": "s0", "s": "up", "cap": "Node 0's agent has imported torch. Its host name matches the endpoint <code>c1:29500</code>, so it starts the rendezvous store there and adds itself to the participant list: 1 of 2."},
        {"t": r(a0["rdzv"][0]["t0"]) + 0.001, "a": "n0", "s": "wait", "cap": "Node 0 waits, re-reading the shared state about once a second (the rendezvous polls with a 1 s delay)."},
        {"t": r(a1["rdzv"][0]["t0"]), "a": "n1", "s": "join", "cap": f"Node 1's agent connects to <code>c1:29500</code> as a client and joins: 2 of 2 = <code>--nnodes</code>, so the round is complete ({a1['rdzv'][0]['t1'] - a1['rdzv'][0]['t0']:.2f} s after node 1 asked)."},
        {"t": r(max(a0["rdzv"][0]["t1"], a1["rdzv"][0]["t1"])), "a": "n0", "s": "ok", "cap": f"Both agents know the result: node ranks 0 and 1, world size 4. The agent that is node rank 0 starts a second store, for the workers, on a free port (here <code>{port}</code>) and publishes it as MASTER_ADDR/MASTER_PORT."},
        {"t": r(max(a0["rdzv"][0]["t1"], a1["rdzv"][0]["t1"])) + 0.001, "a": "w0", "s": "up", "cap": "The workers' store is up on node 0."},
        {"t": r(max(a0["rdzv"][0]["t1"], a1["rdzv"][0]["t1"])) + 0.002, "a": "n1", "s": "ok", "cap": "Rendezvous done on both nodes."},
    ]
    ks = sorted(pr)
    t_up = [pr[k]["t0"] for k in ks]; t_j = [pr[k]["t_pg0"] for k in ks]; t_ok = [pr[k]["t_pg1"] for k in ks]
    ev.append({"t": r(min(t_up)), "a": [f"r{k}" for k in ks], "s": "up", "cap": f"Each agent spawns its 2 workers; all 4 processes start within {(max(t_up) - min(t_up)) * 1000:.0f} ms and import torch and train.py."})
    ev.append({"t": r(min(t_j)), "a": [f"r{k}" for k in ks], "s": "join", "cap": f"{(min(t_j) - min(t_up)):.2f} s later the imports are done and each rank calls init_process_group: it connects to the workers' store as a client (TORCHELASTIC_USE_AGENT_STORE=True) and posts its gloo address. All 4 within {(max(t_j) - min(t_j)) * 1000:.0f} ms."})
    ev.append({"t": r(min(t_ok)), "a": [f"r{k}" for k in ks], "s": "ok", "cap": f"Each rank reads the other three addresses and connects to them (gloo's full mesh): process group ready. Slowest rank: {max(pr[k]['t_pg1'] - pr[k]['t_pg0'] for k in ks) * 1000:.0f} ms inside init_process_group."})
    ev.sort(key=lambda e: e["t"])
    ev.append({"t": r(s1), "a": "r0", "s": "ok", "cap": f"Data, model and the DDP wrapper (which broadcasts rank 0's weights), then the first step: done at {s1 - T0:.2f} s after the first task started."})
    ok = {"events": ev, "port0": ":29500", "port1": ":" + port, "hosts": ["c1", "c2"],
          "note": "Slurm run 1 of section 3, every time from the probes. The rendezvous store and the workers' store both live inside node 0's torchrun process."}
    # missing node
    d = os.path.join(root, "slurm", "la-miss")
    a0 = jl(os.path.join(d, "agent_c1.json"))
    T0 = a0["task_ts"]
    r = lambda t: round(t - T0, 3)
    miss = {"events": [
        {"t": 0.0, "a": "n0", "s": "up", "cap": "srun starts the task on both nodes. Node 0's task execs torchrun; node 1's task runs <code>sleep 100000</code> instead (the knob <code>LA_POD1</code>): its torchrun never starts."},
        {"t": r(a0["rdzv"][0]["t0"]), "a": "s0", "s": "up", "cap": "Node 0's agent starts the rendezvous store on <code>c1:29500</code> and joins: 1 of 2."},
        {"t": r(a0["rdzv"][0]["t0"]) + 0.001, "a": "n0", "s": "wait", "cap": "Node 0 waits. Nothing is printed: no warning, no progress line. The job looks RUNNING in <code>squeue</code>, holding 2 nodes and 4 GPUs."},
        {"t": 300.0, "a": "n0", "s": "wait", "cap": "Five minutes in: still waiting, still silent. The only clue is what is missing: node 1 never logged anything."},
        {"t": r(a0["rdzv"][0]["t1"]), "a": "n0", "s": "err", "cap": "The 600 s join deadline passes. torchrun raises <code>RendezvousTimeoutError</code> (with an empty message) and exits 1; srun kills node 1's task."},
    ], "port0": ":29500", "port1": "", "hosts": ["c1", "c2"],
        "note": "Slurm missing-node run of section 7: node 0's real timestamps; node 1 never starts torchrun."}
    json.dump({"ok": ok, "miss": miss}, open(os.path.join(OUT, "rz.json"), "w"), indent=1)
    print("rz events", len(ev), len(miss["events"]))


if __name__ == "__main__":
    main()
