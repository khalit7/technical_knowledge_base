#!/usr/bin/env python3
"""Inputs of the Recovery designs tab: failure rates and, per design, the pause per checkpoint and the recovery time
split into components. Every value names its source (extracts in src/inputs/rec_*.txt, the root Failure lab's runs);
values no source gives are marked illustrative. Writes src/inputs/rec.json.
usage: python3 scripts/rec_build.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
fl = json.load(open(os.path.join(SRC, "..", "..", "src", "fail", "fl_data.json")))
sc = {s["id"]: s for s in fl["scen"]}
DAY = 86400.0
rates = [
    {"k": "l3", "label": "Llama 3 (419 in 54 days on 16,384 GPUs)", "per_gpu_s": 419 / (16384 * 54 * DAY),
     "src": "https://arxiv.org/html/2407.21783v3#S3.SS3.SSS4"},
    {"k": "rsc1", "label": "Meta RSC-1 (6.50 per 1,000 node-days)", "per_gpu_s": 6.50e-3 / 8 / DAY, "src": "https://arxiv.org/abs/2410.21680"},
    {"k": "m32k", "label": "Meta 32K job, 2026 (2.3 per 1,000 servers per day)", "per_gpu_s": 2.3e-3 / 8 / DAY, "src": "https://arxiv.org/abs/2602.00277"},
    {"k": "rsc2", "label": "Meta RSC-2 (2.34 per 1,000 node-days)", "per_gpu_s": 2.34e-3 / 8 / DAY, "src": "https://arxiv.org/abs/2410.21680"}]
components = [
    {"k": "detect", "label": "detect the failure", "col": "var(--c5)"},
    {"k": "wait", "label": "wait for the scheduler (requeue, queue)", "col": "var(--c3)"},
    {"k": "replace", "label": "get a healthy machine", "col": "var(--c2)"},
    {"k": "start", "label": "start processes, rendezvous, initialise communication", "col": "var(--c4)"},
    {"k": "load", "label": "load the checkpoint", "col": "var(--c1)"}]
# published values reused below (vendor figures unless said)
P = {
    "nccl": (600, "NCCL watchdog default, 10 min (ProcessGroupNCCL.hpp lines 159-160 @ v2.14.1), for a failure that leaves sockets open"),
    "br_detect": (10, "ByteRobust: GPU driver hang or lost GPU detected in 10 s with inspection (Wan et al., SOSP 2025, Table 3)"),
    "requeue": (121, "Slurm requeue hold, measured on the lab cluster (BeginTime = now + credential lifetime + 1, job_mgr.c @ slurm-24-11-5-1)"),
    "asg": (330, "Gemini (SOSP 2023): 4 to 7 min to obtain a replacement p4d instance (midpoint used)"),
    "warm": (240, "Gemini (SOSP 2023): restart warm-up \"more than four minutes\" (4 min used)"),
    "ser": (162, "Gemini (SOSP 2023): 162 s to serialise two checkpoint replicas with torch.save, used as the load time (illustrative)"),
    "w5": (300, "Meta's research clusters: checkpoint write w_cp about 5 min (Kokolis et al., HPCA 2025)"),
    "spare": (10, "illustrative: the spare is already up; Gemini 1.0's optical switches reconfigure TPU cubes in about 10 s"),
    "ms_init": (30, "MegaScale: initialisation under 30 s on more than 10,000 GPUs after its optimisations (NSDI 2024)"),
    "dcp": (0.78, "PyTorch DCP async_save: training blocked 0.78 s, Llama3-70B on 1,856 H200 (PyTorch blog, Apr 2025)"),
    "gem_ck": (3, "Gemini (SOSP 2023): in-memory checkpoint under 3 s (GPT-2 100B, 16 p4d)"),
    "gem_det": (15, "Gemini (SOSP 2023): 15 s for the root agent to detect the failure"),
    "gem_ld": (3, "Gemini (SOSP 2023): checkpoint retrieval from peer CPU memory under 3 s"),
    "ft_det": (5, "torchft demo: Gloo timeout set to 5 s on all cross-group operations (PyTorch blog, Jun 2025)"),
    "ft_start": (60, "illustrative: restart of one replica group; not published"),
    "ft_load": (30, "illustrative: weights and optimiser state copied from a healthy peer; not published"),
}
def comp(**k):
    R, notes = {}, {}
    for key, ref in k.items():
        v, n = P[ref] if isinstance(ref, str) else ref
        R[key] = v; notes[key] = n
    return R, notes
designs = []
def d(id, name, col, C, Rn, evidence, what, **kw):
    R, notes = Rn
    Cv, Cn = P[C] if isinstance(C, str) else C
    designs.append({"id": id, "name": name, "col": col, "C_s": Cv, "C_note": Cn, "R": R, "notes": notes, "evidence": evidence, "what": what, **kw})

d("base", "Defaults: requeue, restart from remote storage", "var(--bad)", "w5",
  comp(detect="nccl", wait="requeue", replace="asg", start="warm", load="ser"), "published inputs from several sources, combined (illustrative)",
  "Nothing tuned: a hang is noticed by the NCCL watchdog, the job is requeued, a new machine is provisioned, everything restarts and reloads from storage, checkpoints block training for minutes.")
d("det", "+ fast detection", "var(--c5)", "w5",
  comp(detect="br_detect", wait="requeue", replace="asg", start="warm", load="ser"), "published inputs, combined (illustrative)",
  "The same, with health inspections that notice a hung GPU in seconds instead of the 10-minute watchdog.")
d("spare", "+ hot spares, fast init", "var(--c3)", "w5",
  comp(detect="br_detect", replace="spare", start="ms_init", load="ser"), "published inputs, combined (illustrative)",
  "A spare machine already in the job replaces the bad one: no requeue, no provisioning, and an initialisation optimised to seconds.")
d("async", "+ asynchronous checkpoints", "var(--c4)", "dcp",
  comp(detect="br_detect", replace="spare", start="ms_init", load="ser"), "published inputs, combined (illustrative)",
  "Checkpoints copy to host memory (the only pause) and write to storage in the background, so they can be frequent and the rework shrinks.")
d("mem", "+ in-memory peer checkpoints", "var(--c1)", "gem_ck",
  comp(detect="gem_det", replace="spare", start="ms_init", load="gem_ld"), "published (Gemini SOSP 2023, measured on 128 A100) plus a spare (illustrative)",
  "Every checkpoint also lands in the CPU memory of peer machines; recovery reads it from there in seconds instead of from remote storage.")
d("ft", "Replica groups (torchft-style)", "var(--c6)", (0, "torchft: no checkpoint needed while one replica group is healthy"),
  comp(detect="ft_det", start="ft_start", load="ft_load"), "mechanism published (torchft, demonstrated on 300 L40S); times illustrative",
  "Only the failed replica group restarts; the other groups keep training with a smaller batch and the step in flight is discarded.",
  keep=15 / 16, tau_s=10, keep_note="illustrative: 16 replica groups, 15 keep training during the recovery; the failure costs the step in flight (10 s step, illustrative)")
d("lab_rq", "This topic's Slurm requeue (tiny job)", "var(--mute)", (0.00425, "measured: median checkpoint write of the running example on the lab Slurm cluster, 4.25 ms (root Storage lab)"),
  comp(detect=(sc["s-node"]["detect_s"], "measured: node set DOWN after SlurmdTimeout=30 (root Failure lab, fl-node)"),
       wait=(162 - sc["s-node"]["detect_s"], "measured: requeued job held until eligible, then started 162 s after the kill"),
       start=(sc["s-node"]["resume_s"] - 162, "measured: start-up and checkpoint load of the tiny job, to the first resumed step")),
  "measured on Apple M1 Pro, Docker Desktop VM, shared machine (tiny job)",
  "The root Failure lab's node kill on Slurm: heartbeat timeout, automatic requeue, restart on the spare node.")
d("lab_tr", "This topic's torchrun in-job restart (tiny job)", "var(--ink)", (0.00425, "measured: as above"),
  comp(detect=(sc["s-maxr"]["detect_s"], "measured: the crash seen by torchrun (root Failure lab, fl-maxr)"),
       start=(sc["s-maxr2"]["resume_s"] - sc["s-maxr"]["detect_s"], "measured: torchrun restarted the group inside the allocation and resumed (fl-maxr2, with TORCH_DISABLE_SHARE_RDZV_TCP_STORE=1)")),
  "measured on Apple M1 Pro, Docker Desktop VM, shared machine (tiny job)",
  "The root Failure lab's crashed rank restarted by torchrun --max-restarts inside the Slurm allocation.")
json.dump({"rates": rates, "components": components, "designs": designs}, open(os.path.join(SRC, "inputs", "rec.json"), "w"), indent=1)
for x in designs:
    print(x["id"], x["C_s"], {k: round(v, 2) for k, v in x["R"].items()}, round(sum(x["R"].values()), 1))
