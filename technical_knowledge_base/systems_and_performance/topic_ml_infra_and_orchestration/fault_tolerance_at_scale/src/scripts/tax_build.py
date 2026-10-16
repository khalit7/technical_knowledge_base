#!/usr/bin/env python3
"""Published failure tables, as printed (rows transcribed from the extracts in src/inputs/tax_*.txt and the root's
Llama 3 extract), with this page's mapping of each row to a common scheme (OUR mapping, labelled on the page)
and the arithmetic checks. Writes src/inputs/tax.json (embedded by make_data.py).
usage: python3 scripts/tax_build.py
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
B = {"gpu": "GPU compute and its interconnect", "mem": "GPU memory (HBM, SRAM, ECC)", "net": "network",
     "host": "host and other hardware", "sto": "storage and file systems", "sw": "system software and framework",
     "user": "user code, data and configuration", "unk": "unknown or unattributed"}

S = []

def src(**k):
    S.append(k)

# Llama 3 Table 5 (from the root Failure lab's extract; printed percentages kept, one is a misprint)
fl = json.load(open(os.path.join(SRC, "..", "..", "src", "fail", "fl_data.json")))
l3map = {"Faulty GPU": "gpu", "GPU HBM3 Memory": "mem", "Software Bug": "sw", "Network Switch/Cable": "net",
         "Host Maintenance": "host", "GPU SRAM Memory": "mem", "GPU System Processor": "gpu", "NIC": "net",
         "NCCL Watchdog Timeouts": "unk", "Silent Data Corruption": "gpu", "GPU Thermal Interface + Sensor": "gpu",
         "SSD": "sto", "Power Supply": "host", "Server Chassis": "host", "IO Expansion Board": "host",
         "Dependency": "sw", "CPU": "host", "System Memory": "host"}
rows = []
for n, c, k, p in fl["l3"]["rows"]:
    b = l3map.get(n)
    if b is None:
        raise SystemExit("unmapped Llama 3 row " + n)
    rows.append({"name": n, "group": c, "n": k, "pct": p, "b": b})
src(id="llama3", name="Llama 3 405B pre-training", org="Meta", year=2024, url="https://arxiv.org/html/2407.21783v3#S3.SS3.SSS4",
    cite="Llama 3 report, Table 5 (arXiv 2407.21783v3)", kind="one job", scale="up to 16,384 H100", period="54 days",
    unit="unexpected interruptions of one training job", rows=rows,
    note='Printed "Faulty GPU 148, 30.1%" is a misprint: 148 / 419 = 35.3%. The text\'s 58.7% for GPU issues sums the printed GPU-row percentages; by counts 64.0%.')

src(id="meta32k", name="Recurring 32K-GPU job", org="Meta", year=2026, url="https://arxiv.org/abs/2602.00277",
    cite="Training LLMs with Fault Tolerant HSDP on 100,000 GPUs, Table 1 (arXiv 2602.00277v1, 30 Jan 2026)", kind="one job",
    scale="32K GPUs", period="not stated", unit="unexpected interruptions of one recurring job",
    rows=[{"name": a, "n": b, "pct": c, "b": d} for a, b, c, d in [
        ("GPU HBM3 Memory", 155, 22.9, "mem"), ("PCIe Device", 122, 18.0, "host"), ("NCCL Watchdog Timeouts", 61, 9.0, "unk"),
        ("Faulty GPU Compute", 50, 7.4, "gpu"), ("Software Bug", 48, 7.1, "sw"), ("Host Maintenance", 42, 6.2, "host"),
        ("Kernel Fault", 39, 5.8, "sw"), ("System Reboot", 38, 5.6, "host"), ("Numerics/SDC", 37, 5.5, "gpu"),
        ("Network Switch/Cable", 36, 5.3, "net"), ("SSD", 30, 4.4, "sto"), ("GPU SRAM Memory", 8, 1.2, "mem"),
        ("Unknown", 7, 1.0, "unk"), ("System Memory", 2, 0.3, "host"), ("System Cooling", 2, 0.3, "host"),
        ("GPU Thermal Interface + Sensor", 1, 0.2, "gpu")]],
    note='Every printed percentage matches its count (678 in all). The successor to Llama 3\'s table: "\'Faulty GPU Compute\' used to be the top cause, but is now reduced to the fourth (7.4%) ... HBM issues rose to become the top issue." The paper\'s "a failure every 18 minutes" at 100K GPUs does not follow from its own 2.3 interruptions per 1,000 servers per day (that gives about one every 50 minutes); 18 minutes matches Meta\'s RSC-1 rate.')

src(id="byterobust", name="All LLM training jobs, three months", org="ByteDance", year=2025, url="https://arxiv.org/abs/2509.16293",
    cite="ByteRobust (Wan et al., SOSP 2025), Table 1 (arXiv 2509.16293v4)", kind="cluster", scale="778,135 LLM training jobs",
    period="3 months", unit="incidents (manual restarts included)",
    rows=[{"name": a, "n": b, "pct": c, "b": d, "group": g} for g, a, b, c, d in [
        ("Explicit", "CUDA Error", 19968, 36.1, "gpu"), ("Explicit", "CPU Overload", 6095, 11.0, "user"), ("Explicit", "CPU OOM", 5567, 10.1, "user"),
        ("Explicit", "Insufficient Disk Space", 2755, 5.0, "sto"), ("Explicit", "Infiniband Error", 1599, 2.9, "net"),
        ("Explicit", "Filesystem Mount", 1176, 2.1, "sto"), ("Explicit", "HDFS Error", 1104, 2.0, "sto"),
        ("Explicit", "Container Error", 781, 1.4, "sw"), ("Explicit", "OS Kernel Panic", 203, 0.4, "sw"),
        ("Explicit", "GPU Memory Error", 188, 0.3, "mem"), ("Explicit", "External Service Error", 128, 0.2, "sw"),
        ("Explicit", "GPU Unavailable", 76, 0.1, "gpu"), ("Explicit", "Disk Fault", 47, 0.1, "host"),
        ("Implicit", "Job Hang", 5506, 9.9, "unk"), ("Implicit", "MFU Decline", 442, 0.8, "unk"), ("Implicit", "NaN value", 148, 0.3, "unk"),
        ("Manual", "Code/Data Adjustment", 9582, 17.3, "user")]],
    note="Percentages match counts (55,365). The text says 38,236 explicit and 5,948 implicit failures; the table sums to 39,687 and 6,096 (the implicit gap is exactly the NaN row). CUDA Error is a symptom: it may hide user bugs. CPU OOM and overload are mapped to user code here (our choice; they can be platform limits).")

acme = [("Infrastructure", "NVLink Error", 54, 30.25, "gpu"), ("Infrastructure", "CUDA Error", 21, 15.77, "gpu"), ("Infrastructure", "Node Failure", 16, 14.30, "host"),
        ("Infrastructure", "ECC Error", 12, 11.00, "mem"), ("Infrastructure", "Network Error", 12, 4.53, "net"), ("Infrastructure", "Connection Error", 147, 3.44, "net"),
        ("Infrastructure", "S3 Storage Error", 10, 2.12, "sto"), ("Infrastructure", "NCCL Timeout Error", 6, 0.50, "net"), ("Infrastructure", "NCCL Remote Error", 3, 0.15, "net"),
        ("Framework", "Dataloader Killed", 6, 4.38, "sw"), ("Framework", "Attribute Error", 67, 3.90, "sw"), ("Framework", "Out of Memory Error", 14, 3.28, "sw"),
        ("Framework", "Runtime Error", 65, 1.72, "sw"), ("Framework", "Assertion Error", 105, 1.24, "sw"), ("Framework", "Value Error", 33, 0.16, "sw"),
        ("Framework", "Zero Division Error", 5, 0.03, "sw"), ("Framework", "Model Loading Error", 104, 0.00, "sw"), ("Framework", "Dataset Loading Error", 5, 0.00, "sw"),
        ("Script", "File Not Found Error", 568, 2.83, "user"), ("Script", "OS Error", 266, 0.28, "user"), ("Script", "Type Error", 620, 0.06, "user"),
        ("Script", "Name Error", 18, 0.02, "user"), ("Script", "Permission Error", 7, 0.01, "user"), ("Script", "Import Error", 111, 0.01, "user"),
        ("Script", "Key Error", 260, 0.01, "user"), ("Script", "Syntax Error", 10, 0.00, "user"), ("Script", "Argument Error", 3, 0.00, "user"),
        ("Script", "Called Process Error", 4, 0.00, "user"), ("Script", "Index Error", 23, 0.00, "user")]
src(id="acme", name="Acme LLM development clusters", org="Shanghai AI Lab", year=2024, url="https://arxiv.org/abs/2403.07648",
    cite="Hu et al., Characterization of LLM Development in the Datacenter (NSDI 2024), Table 3 (arXiv 2403.07648v2)", kind="cluster",
    scale="4,704 A100", period="March to August 2023", unit="failed jobs; second column: share of the GPU time those failures cost",
    rows=[{"name": a, "group": g, "n": n, "gpu_pct": p, "b": b} for g, a, n, p, b in acme],
    note='2,575 failed jobs: script errors are 73.4% of failures but 3.2% of the GPU time lost; infrastructure is 10.9% of failures and 82.1% of the GPU time ("over 82% GPU resources ... 11% failed job quantity", reproduced).')

philly = [("CPU OOM", "AE,U", 12076, 8.05, "user"), ("Incorrect inputs", "IF,U", 9690, 24.21, "sto"), ("Semantic error", "IF,U", 2943, 17.06, "user"),
          ("Core dump", "AE,U", 2912, 3.02, "sw"), ("Invalid mem access", "U", 2602, 4.75, "user"), ("Model ckpt error", "IF", 1995, 16.33, "sto"),
          ("CUDA failure", "AE", 1484, 0.72, "gpu"), ("Syntax error", "IF,U", 1132, 0.26, "user"), ("Traceback from crash", "IF,AE,U", 777, 1.74, "sw"),
          ("MPI error", "IF", 634, 1.24, "net"), ("GPU OOM", "AE", 487, 2.10, "user"), ("MPI runtime failure", "IF", 478, 15.34, "net"),
          ("Permission error", "U", 299, 0.03, "user"), ("Import error", "IF,U", 148, 0.02, "user"), ("Job preempted", "IF", 147, 4.73, "sw"),
          ("CUDA init failed", "AE", 141, 0.13, "sw"), ("Model diverged", "U", 84, 0.01, "user"), ("CUDA ver. mismatch", "AE", 49, 0.00, "sw"),
          ("GPU ECC error", "AE", 10, 0.05, "mem"), ("Output node error", "U", 3, 0.00, "user"), ("Cannot load libs", "AE", 1, 0.00, "sw"),
          ("No signature", "", 1684, 0.21, "unk")]
src(id="philly", name="Philly multi-tenant GPU clusters", org="Microsoft", year=2019, url="https://www.usenix.org/system/files/atc19-jeon.pdf",
    cite="Jeon et al., Analysis of Large-Scale Multi-Tenant GPU Clusters for DNN Training Workloads (USENIX ATC 2019), Table 7", kind="cluster",
    scale="thousands of GPUs, 96,260 jobs", period="75 days, Oct to Dec 2017", unit="failure events (trials); second column: share of GPU time to failure",
    rows=[{"name": a, "group": g, "n": n, "gpu_pct": p, "b": b} for a, g, n, p, b in philly],
    note='39,776 failure events. The paper tags each reason Infrastructure (IF), AI engine (AE) or User (U), often several at once; the mapping here picks one (ours). Its "top-8 cover 88.9%" computes to 87.6%. "programming errors dominating failures and occurring early"; infrastructure failures are rare but "have much longer runtime to failure".')

src(id="unicron", name="Top 5% most resource-intensive tasks", org="Alibaba", year=2023, url="https://arxiv.org/abs/2401.00134",
    cite="Unicron (arXiv 2401.00134v1), Figure 1", kind="cluster", scale="not stated", period="not stated",
    unit="share of task terminations (no counts printed)",
    rows=[{"name": a, "pct": p, "b": b} for a, p, b in [
        ("Others", 3.3, "unk"), ("CUDA error", 1.6, "gpu"), ("Illegal memory access", 2.1, "sw"), ("Task hang", 3.1, "unk"),
        ("GPU driver", 0.6, "gpu"), ("NVLink", 4.5, "gpu"), ("Invalid DMA", 2.1, "gpu"), ("ECC", 5.0, "mem"),
        ("Other network", 4.0, "net"), ("Connection reset", 1.0, "net"), ("Link flapping", 3.9, "net"), ("Connection refused", 2.1, "net"),
        ("NCCL timeout", 10.1, "net")]],
    success_pct=56.6, note='56.6% of these tasks succeeded; the 43.4% that did not are shown. Transient faults are "73% of all errors"; a typical 68-minute downtime = 30 min to notice a hang + 9 resubmit + 14 environment + 15 recompute (adds up).')

src(id="c4", name="One 4,096-GPU job, one month", org="Alibaba", year=2024, url="https://arxiv.org/abs/2406.04594",
    cite="C4 (arXiv 2406.04594v2), Table I", kind="one job", scale="4,096 GPUs", period="1 month", unit="job crashes",
    rows=[{"name": a, "n": n, "pct": p, "b": b} for a, n, p, b in [
        ("CUDA error", 5, 12.5, "gpu"), ("ECC / NVLink error", 11, 27.5, "mem"), ("NCCL timeout", 8, 20.0, "net"),
        ("ACK timeout", 11, 27.5, "net"), ("Others", 5, 12.5, "unk")]],
    note="40 crashes in a month (counts reconstructed from the percentages). Its Table III: one 2,400-GPU job lost 31.19% of its time to failures in June 2023 (diagnosis alone 19.65%), 1.16% by December 2023.")

ff = [("NVLink Error (xid 74)", 5521, 42.57, "gpu"), ("xid 13", 45, 0.35, "user"), ("xid 31", 2487, 19.18, "user"), ("xid 43", 4342, 33.48, "user"),
      ("xid 45", 240, 1.85, "sw"), ("xid 63 (ECC)", 245, 1.89, "mem"), ("xid 64 (ECC)", 2, 0.02, "mem"), ("xid 94 (ECC)", 13, 0.10, "mem"),
      ("xid 95 (ECC)", 17, 0.13, "mem"), ("xid 44", 1, 0.01, "gpu"), ("xid 48", 2, 0.02, "mem"), ("xid 61", 13, 0.10, "gpu"),
      ("xid 62", 3, 0.02, "gpu"), ("xid 69", 1, 0.01, "gpu"), ("xid 79 (fell off the bus)", 37, 0.29, "gpu"), ("xid 119 (GSP)", 1, 0.01, "gpu")]
src(id="fireflyer", name="Fire-Flyer 2, one year", org="DeepSeek", year=2024, url="https://arxiv.org/abs/2408.14158",
    cite="Fire-Flyer AI-HPC (arXiv 2408.14158v2), Table VI", kind="cluster", scale="10,000 PCIe A100", period="1 year",
    unit="GPU Xid events (not interruptions)", rows=[{"name": a, "n": n, "pct": p, "b": b} for a, n, p, b in ff],
    note="12,970 Xid events; every percentage reproduces. The paper groups xid 13, 31, 43 and 45 as \"software causes\"; Xid events are driver messages, many per incident, so shares are of messages.")

src(id="minder", name="ByteDance training cluster, seven months", org="ByteDance", year=2025, url="https://arxiv.org/abs/2411.01791",
    cite="Minder (NSDI 2025), Table 1 (arXiv 2411.01791v2)", kind="cluster", scale="not stated", period="7 months", unit="share of faults (no total printed)",
    rows=[{"name": a, "pct": p, "b": b} for a, p, b in [
        ("ECC error", 38.9, "mem"), ("PCIe downgrading", 6.6, "host"), ("NIC dropout", 5.7, "net"), ("GPU card drop", 2.0, "gpu"),
        ("NVLink error", 1.7, "gpu"), ("AOC error", 0.9, "net"), ("CUDA execution error", 14.6, "sw"), ("GPU execution error", 7.7, "sw"),
        ("HDFS error", 5.7, "sto"), ("Machine unreachable", 6.0, "net"), ("Others", 10.3, "unk")]],
    note='Shares add to 100.1. "a training task can encounter two faults per day on average".')

src(id="lablup", name="504 B200, 55 days", org="Lablup", year=2026, url="https://arxiv.org/abs/2605.09370",
    cite="From Detection to Recovery (Lablup technical report, arXiv 2605.09370v5), Table 2", kind="cluster", scale="504 B200 (63 nodes)",
    period="55 days", unit="failure events",
    rows=[{"name": a, "n": n, "pct": p, "b": b} for a, n, p, b in [
        ("NVLink errors (xid 145, 149)", 5, 29.4, "gpu"), ("ECC errors (xid 94)", 2, 11.8, "mem"), ("GPU card dropout (xid 79)", 2, 11.8, "gpu"),
        ("GPU execution errors (xid 119)", 1, 5.9, "gpu"), ("Machine unreachable", 2, 11.8, "net"), ("Others", 5, 29.4, "unk")]],
    note="17 events in 55 days on 63 nodes: 4.9 per 1,000 node-days (our arithmetic), between Meta's two research clusters.")

src(id="rsc1", name="Meta RSC-1 research cluster", org="Meta", year=2025, url="https://arxiv.org/abs/2410.21680",
    cite="Kokolis et al., Revisiting Reliability in Large-Scale ML Research Clusters (HPCA 2025), Figure 3 (arXiv 2410.21680v2)",
    kind="cluster", scale="16k A100", period="11 months", unit="final state of every job (share of jobs; share of GPU runtime)",
    rows=[{"name": a, "pct": p, "gpu_pct": g, "b": b} for a, p, g, b in [
        ("FAILED (job error)", 23.7, 21.1, "user"), ("FAILED (hardware)", 0.1, 6.5, "host"), ("NODE_FAIL (hardware)", 0.1, 12.2, "host"),
        ("OOM", 0.1, 0.0, "user"), ("TIMEOUT", 0.6, 2.4, "user"), ("PREEMPTED", 9.8, 18.0, "sw"), ("REQUEUED", 1.6, 9.9, "sw"),
        ("CANCELLED", 4.2, 14.2, "user")]],
    success_pct=59.8, note='Hardware failures are 0.2% of jobs but 18.7% of GPU runtime: big jobs are the ones hardware kills. 6.50 failures per 1,000 node-days on RSC-1 and 2.34 on RSC-2. Mapping job states to causes is ours and coarse (a FAILED job can also be a software fault). "Many hardware failures are unattributed, and the most common attributed failures are due to the backend network, the filesystem, and GPUs."')

# arithmetic checks
for s in S:
    ns = [r.get("n") for r in s["rows"]]
    s["total"] = sum(ns) if all(isinstance(x, int) for x in ns) else None
    chk = []
    if s["total"]:
        bad = [(r["name"], r["pct"], round(100 * r["n"] / s["total"], 1)) for r in s["rows"] if "pct" in r and abs(round(100 * r["n"] / s["total"], 1) - r["pct"]) > 0.15]
        chk.append({"sum": s["total"], "pct_mismatch": bad})
    else:
        chk.append({"pct_sum": round(sum(r.get("pct", 0) for r in s["rows"]) + s.get("success_pct", 0), 1)})
    if "gpu_pct" in s["rows"][0]:
        chk.append({"gpu_pct_sum": round(sum(r["gpu_pct"] for r in s["rows"]), 2)})
    s["checks"] = chk
    # share per bucket (of failures shown), by count if counts exist else by printed pct
    tot = s["total"] or sum(r["pct"] for r in s["rows"])
    sh = {}
    for r in s["rows"]:
        v = r["n"] if s["total"] else r["pct"]
        sh[r["b"]] = sh.get(r["b"], 0) + v
    s["bucket_share"] = {k: round(100 * v / tot, 1) for k, v in sh.items()}
    if "gpu_pct" in s["rows"][0]:
        g = {}
        for r in s["rows"]:
            g[r["b"]] = g.get(r["b"], 0) + r["gpu_pct"]
        gt = sum(g.values())
        s["bucket_share_gpu"] = {k: round(100 * v / gt, 1) for k, v in g.items()}
out = {"buckets": B, "sources": S,
       "no_table": [{"name": "OPT-175B logbook (Meta, 2022)", "url": "https://github.com/facebookresearch/metaseq/tree/main/projects/OPT/chronicles", "what": 'A free-text on-call diary, no cause table: ECC errors, lost GPUs, CUDA "unspecified launch failure", bad InfiniBand and slow NCCL nodes, hangs, checkpoint downloads that hung, a cloud replacement that returned the same bad machine; "~2 machines go down every day", "40+ restarts" between Nov 17 and Dec 3. The paper: at least 35 manual and an estimated 70+ automatic restarts on 992 A100s in about 2 months.'},
                    {"name": "MegaScale (ByteDance, NSDI 2024)", "url": "https://arxiv.org/abs/2402.15627", "what": 'No cause table: one production run on more than 10,000 GPUs restarted "over 100 times" in several weeks; over 90% of faults detected and recovered automatically; detection plus diagnostics "less than 10 minutes", catch-up "within 15 minutes".'},
                    {"name": "BLOOM 176B (BigScience, 2022)", "url": "https://arxiv.org/abs/2211.05100", "what": '"1-2 GPU failures occurred each week" on 384 A100s; no table.'},
                    {"name": "Gemini 1.0 (Google, 2023)", "url": "https://arxiv.org/abs/2312.11805", "what": 'No table: SDC "every week or two"; goodput 85% to 97% with in-memory replicas.'}]}
json.dump(out, open(os.path.join(SRC, "inputs", "tax.json"), "w"), indent=1)
for s in S:
    print(s["id"], s["total"], s["checks"], s["bucket_share"])
