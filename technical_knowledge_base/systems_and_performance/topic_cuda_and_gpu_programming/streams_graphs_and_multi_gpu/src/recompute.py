"""Run from src/. Parses every raw output (cuda/out, m1/out, torch/out), takes medians, derives the
numbers the page quotes, builds the two timeline models (training step; launch overhead) and writes
out/data.json plus parts/22_js_sg_data.js (window.SG). The page's JavaScript re-implements the
step model (parts/24_js_sg_step.js); check/check_page.mjs compares it with SG.step here."""
import json, re, statistics as S, glob, os

med = S.median
D = {}

# ---------- CUDA toolchain outputs (kb-gpu-lab:1) ----------
co = "cuda/out/"
rd = lambda f: open(co + f).read()
D["cuda"] = dict(
    nvcc=rd("nvcc_version.txt").strip().splitlines()[-1],
    builds={k: "compile_exit=0" in rd(k + ".build.txt") for k in
            ("s1_pipeline", "s2_graph", "s3_peer", "s4_nccl_overlap", "s5_default_stream")},
    run_errors={k: rd(k + ".run.txt").splitlines()[-2].split("-> ")[-1] for k in
                ("s1_pipeline", "s2_graph", "s3_peer", "s4_nccl_overlap")},
    s5_run=rd("s5_default_stream.run.txt").strip(),
    nccl_version_code=int(re.search(r"NCCL version code (\d+)", rd("s4_nccl_overlap.run.txt")).group(1)),
    sym_legacy=rd("s5_symbols.legacy.txt").split(),
    sym_ptd=rd("s5_symbols.per-thread.txt").split(),
)
h = rd("headers.txt")
sec = lambda name: h.split("== " + name)[1].split("\n== ")[0]
D["cuda"]["node_types"] = re.findall(r"cudaGraphNodeType(\w+) *= *(0x[0-9a-f]+)", sec("driver_types.h: cudaGraphNodeType"))
D["cuda"]["cond_types"] = re.findall(r"cudaGraphCondType(\w+) *=", sec("driver_types.h: cudaGraphConditionalNodeType"))
D["cuda"]["capture_modes"] = re.findall(r"cudaStreamCaptureMode(\w+) *=", sec("driver_types.h: cudaStreamCaptureMode"))
D["cuda"]["update_results"] = re.findall(r"cudaGraphExecUpdate(\w+) *=", sec("driver_types.h: cudaGraphExecUpdateResult"))
D["cuda"]["instantiate_flags"] = re.findall(r"cudaGraphInstantiateFlag(\w+) *=", sec("driver_types.h: cudaGraphInstantiateFlags"))
D["cuda"]["nccl_version"] = ".".join(re.findall(r"NCCL_(?:MAJOR|MINOR|PATCH) (\d+)", sec("nccl.h version")))
D["cuda"]["nccl_entry_points"] = sec("nccl.h public entry points").split()
D["cuda"]["nccl_device_headers"] = [x for x in sec("nccl_device headers").split() if x.endswith(".h")]
D["cuda"]["nccl_config_fields"] = re.findall(r"(?:int|const char) \*?(\w+);", sec("nccl.h ncclConfig_t fields"))
D["cuda"]["nccl_env_in_lib"] = {l.split()[0]: int(l.split()[1]) > 0 for l in rd("nccl_env_strings.txt").splitlines()}
sass = rd("s2_graph.sm_90a.sass.txt").split("Function : _Z14halve_and_testPfy")[1].split("EXIT")[0] + "EXIT ;"
D["cuda"]["cond_sass"] = [re.sub(r"\s*/\* 0x[0-9a-f]+ \*/", "", l).strip() for l in sass.splitlines() if re.search(r"/\*[0-9a-f]{4}\*/", l)]
D["cuda"]["cond_sass_sm100_call"] = "CALL.ABS.NOINC" in rd("s2_graph.sm_100a.sass.txt")
D["cuda"]["cond_regs"] = int(re.search(r"halve_and_testPfy' for 'sm_90a'\n.*\n.*\nptxas info\s+: Used (\d+) registers", rd("s2_graph.sm_90a.ptxas.txt")).group(1))

# ---------- M1 measurements ----------
def jl(p):
    return [json.loads(l) for l in open(p)]
ml = jl("m1/out/metal_launch.jsonl")
M = dict(runs=len(ml), n=ml[0]["n_kernels"], threads=ml[0]["threads"], device=ml[0]["device"],
         check=sorted(set(round(v, 3) for r in ml for v in r["check"].values())),
         load=[round(min(r["load"][0] for r in ml), 1), round(max(r["load"][0] for r in ml), 1)])
for k in ("wait_each", "queue", "one_cb", "icb_replay"):
    runs = [r[k]["us_per_kernel"] for r in ml]
    M[k] = dict(us=round(med(runs), 1), runs=[round(x, 1) for x in runs])
    if ml[0][k]["gpu_us_per_kernel"] is not None:
        M[k]["gpu_us"] = round(med(r[k]["gpu_us_per_kernel"] for r in ml), 2)
        M[k]["enc_us_total"] = round(med(r[k]["encode_commit_us_total"] for r in ml), 1)
M["icb_record_us_total"] = round(med(r["icb_record_us_total"] for r in ml), 0)
M["ratio_wait_queue"] = round(M["wait_each"]["us"] / M["queue"]["us"], 1)
M["ratio_queue_icb"] = round(M["queue"]["us"] / M["icb_replay"]["us"], 1)
M["enc_per_dispatch_us"] = round(M["one_cb"]["enc_us_total"] / M["n"], 2)
mc = jl("m1/out/metal_concurrency.jsonl")
C = dict(runs=len(mc), k=mc[0]["k"], iters=mc[0]["iters"], single_ms=round(med(r["single_ms"] for r in mc), 2),
         load=[round(min(r["load"][0] for r in mc), 1), round(max(r["load"][0] for r in mc), 1)])
for k in ("one_queue", "k_queues", "concurrent"):
    C[k] = dict(ms=round(med(r[k]["ms"] for r in mc), 2), runs=[round(r[k]["ms"], 2) for r in mc])
mp = jl("torch/out/mps_launch.jsonl")
P = dict(runs=len(mp), torch=mp[0]["torch"], n=mp[0]["n"],
         sync_each=round(med(r["sync_each"]["us_per_iter"] for r in mp), 1),
         sync_once=round(med(r["sync_once"]["us_per_iter"] for r in mp), 1),
         sync_each_runs=[round(r["sync_each"]["us_per_iter"], 1) for r in mp],
         sync_once_runs=[round(r["sync_once"]["us_per_iter"], 1) for r in mp])
P["ratio"] = round(P["sync_each"] / P["sync_once"], 1)
D["m1"] = dict(metal=M, conc=C, mps=P)

# ---------- DDP on CPU (Gloo) ----------
dd = {}
for mode in ("overlap", "serial"):
    rs = [json.load(open(f)) for f in sorted(glob.glob(f"torch/out/ddp_{mode}_run[123].json"))]
    st = lambda r: r["steps"][1:]                      # step 0 is warm-up
    per_run = [dict(compute=med(s["compute_end"] for s in st(r)) * 1e3, end=med(s["end"] for s in st(r)) * 1e3,
                    ar=med(med(b["done"] - b["ready"] for b in s["buckets"]) for s in st(r)) * 1e3) for r in rs]
    dd[mode] = dict(compute_ms=round(med(p["compute"] for p in per_run), 1), end_ms=round(med(p["end"] for p in per_run), 1),
                    ar_ms=round(med(p["ar"] for p in per_run), 1),
                    end_runs=[round(p["end"], 1) for p in per_run], load=[round(r["load"][0], 1) for r in rs])
    # one representative step for the chart: the step whose end is the median of run 2
    r = rs[1]; ss = sorted(st(r), key=lambda s: s["end"]); s = ss[len(ss) // 2]
    dd[mode]["example"] = dict(compute=round(s["compute_end"] * 1e3, 2), end=round(s["end"] * 1e3, 2),
                               buckets=[[b["bucket"], b["mb"], round(b["ready"] * 1e3, 2), round(b["done"] * 1e3, 2)] for b in s["buckets"]])
r0 = json.load(open("torch/out/ddp_overlap_run1.json"))
dd["setup"] = dict(world=r0["world"], layers=r0["layers"], hidden=r0["hidden"], batch=r0["batch"], cap=r0["bucket_cap_mb"],
                   threads=r0["threads_per_rank"], torch=r0["torch"], buckets=len(r0["steps"][1]["buckets"]),
                   bucket_mb=r0["steps"][1]["buckets"][0]["mb"])
dd["saved_pct"] = round(100 * (1 - dd["overlap"]["end_ms"] / dd["serial"]["end_ms"]), 0)
dd["slowdown_pct"] = round(100 * (dd["overlap"]["compute_ms"] / dd["serial"]["compute_ms"] - 1), 0)
dd["exposed_ms"] = round(dd["overlap"]["end_ms"] - dd["overlap"]["compute_ms"], 1)
dd["serial_comm_ms"] = round(dd["serial"]["end_ms"] - dd["serial"]["compute_ms"], 1)
prof = json.load(open("torch/out/ddp_profile.json"))
dd["profile"] = [[("ar" if "all_reduce" in e["name"] else "bw"), e["start_ms"], e["dur_ms"]] for e in prof["events"]]
D["ddp"] = dd
D["torchsrc"] = json.load(open("torch/out/torch_source.json"))

# ---------- launch model fitted to NVIDIA's CUDA Graphs post (Gray, 2019, V100) ----------
B = dict(kernel=2.9, sync_each=9.6, stream=3.8, graph=3.4, n=20, steps=1000, instantiate=400.0)
B["launch_cpu"] = B["stream"]                         # launch-bound: GPU waits for the CPU each kernel
B["sync_cost"] = round(B["sync_each"] - B["stream"] - B["kernel"], 1)   # wait + wake-up per kernel
B["graph_gap"] = round(B["graph"] - B["kernel"], 1)   # per-node gap inside a graph
B["break_even_kernels"] = round(B["instantiate"] / (B["stream"] - B["graph"]))
B["step_us"] = dict(sync_each=round(B["sync_each"] * B["n"], 1), stream=round(B["stream"] * B["n"], 1), graph=round(B["graph"] * B["n"], 1))
D["blog"] = B

# ---------- copy/compute pipeline model (s1_pipeline sizes, H100 SXM + PCIe 5.0 x16) ----------
PCIE = 63e9                                          # each way, interconnects page
HBM = 3.35e12                                        # H100 SXM, FACTS.md
bytes_ = (1 << 26) * 4
pipe = dict(mb=round(bytes_ / 2**20), h2d_ms=round(bytes_ / PCIE * 1e3, 2), d2h_ms=round(bytes_ / PCIE * 1e3, 2),
            k_ms=round(2 * bytes_ / HBM * 1e3, 3))
pipe["serial_ms"] = round(pipe["h2d_ms"] + pipe["k_ms"] + pipe["d2h_ms"], 2)
c = 8
pipe["pipe8_ms"] = round(pipe["h2d_ms"] + pipe["d2h_ms"] / c + pipe["k_ms"] / c, 2)   # H2D and D2H on two engines
pipe["pipe8_one_engine_ms"] = round(pipe["h2d_ms"] + pipe["d2h_ms"] + pipe["k_ms"] / c, 2)
D["pipe"] = pipe

# ---------- the training-step model (GPT-2 small shape, 64 H100 over 400 Gb/s IB) ----------
h, Lr, V, ctx = 768, 12, 50257, 1024
blk = [2 * h, 3 * h * h + 3 * h, h * h + h, 2 * h, 4 * h * h + 4 * h, 4 * h * h + h]  # ln1, attn qkv, attn proj, ln2, fc, proj
params = [("wte", V * h), ("wpe", ctx * h)]
for l in range(Lr):
    params += [(f"b{l}.{i}", n) for i, n in enumerate(blk)]
params += [("lnf", 2 * h)]
N = sum(n for _, n in params)
cfg = dict(N=N, wte=V * h, block=sum(blk), tokens=16 * 1024, gpus=64, peak=989.5e12, mfu=0.40, busbw=0.92 * 50e9,
           grad_bytes=2, cap=25 * 2**20, first_cap=2**20, pcie=PCIE, hbm=HBM, opt_bytes_per_param=32, batch_bytes=16 * 1024 * 8 * 2, alpha=0.0)


def step_model(cfg, overlap, slow=0.0):
    rate = cfg["peak"] * cfg["mfu"]
    fwd = 2 * cfg["N"] * cfg["tokens"] / rate
    bwd = 2 * fwd
    mm_head, mm_blk = cfg["wte"], cfg["block"]
    tot_mm = mm_head + Lr * mm_blk
    # when each parameter's gradient is complete (seconds from the start of backward)
    t_head = bwd * mm_head / tot_mm
    ready = {"lnf": t_head}
    for l in range(Lr - 1, -1, -1):
        t = t_head + bwd * (Lr - l) * mm_blk / tot_mm
        for i in range(len(blk)):
            ready[f"b{l}.{i}"] = t
    ready["wpe"] = ready["wte"] = bwd                 # tied embedding: done only at the very end
    # DDP bucketing: reverse parameter order, first bucket 1 MiB, then 25 MiB
    buckets, cur, cap = [], [], cfg["first_cap"]
    for name, n in reversed(params):
        cur.append((name, n))
        if sum(x[1] for x in cur) * cfg["grad_bytes"] >= cap:
            buckets.append(cur); cur, cap = [], cfg["cap"]
    if cur:
        buckets.append(cur)
    g = cfg["gpus"]
    ar = lambda b: b * 2 * (g - 1) / g / cfg["busbw"] + cfg["alpha"]
    copy = cfg["batch_bytes"] / cfg["pcie"]
    opt = cfg["N"] * cfg["opt_bytes_per_param"] / cfg["hbm"]
    ev = []                                            # [lane, start, end, label]
    t = 0.0
    if not overlap:
        ev.append(["copy", 0, copy, "batch H2D"]); t = copy
    else:
        ev.append(["copy", 0, copy, "batch H2D (prefetched last step)"])
    ev.append(["compute", t, t + fwd, "forward"]); t0 = t + fwd
    bl = []
    for b in buckets:
        nb = sum(x[1] for x in b) * cfg["grad_bytes"]
        bl.append([max(ready[x[0]] for x in b), nb])
    if overlap:
        bwd_s = bwd * (1 + slow)
        ev.append(["compute", t0, t0 + bwd_s, "backward"])
        tc = t0
        for i, (r, nb) in enumerate(bl):
            s = max(t0 + r * (1 + slow), tc); tc = s + ar(nb)
            ev.append(["comm", s, tc, f"bucket {i + 1}"])
        t_end_bwd = t0 + bwd_s
        t_opt = max(t_end_bwd, tc)
    else:
        ev.append(["compute", t0, t0 + bwd, "backward"])
        tc = t0 + bwd
        for i, (r, nb) in enumerate(bl):
            s = tc; tc = s + ar(nb); ev.append(["comm", s, tc, f"bucket {i + 1}"])
        t_opt = tc
    ev.append(["compute", t_opt, t_opt + opt, "optimizer"])
    total = t_opt + opt
    comm = sum(ar(nb) for _, nb in bl)
    return dict(fwd=fwd, bwd=bwd, opt=opt, copy=copy, comm=comm, total=total, exposed=total - fwd - bwd * (1 + (slow if overlap else 0)) - opt - (0 if overlap else copy),
                buckets=[[round(r * 1e3, 3), nb] for r, nb in bl], events=[[a, round(s * 1e3, 4), round(e * 1e3, 4), lab] for a, s, e, lab in ev])


ser, ovl = step_model(cfg, False), step_model(cfg, True)
fmt = lambda m: {k: (round(v * 1e3, 3) if isinstance(v, float) else v) for k, v in m.items()}
D["step"] = dict(cfg={k: v for k, v in cfg.items()}, serial=fmt(ser), overlap=fmt(ovl))
D["step"]["saved_pct"] = round(100 * (1 - ovl["total"] / ser["total"]), 0)
D["step"]["n_buckets"] = len(ser["buckets"])
D["step"]["last_bucket_mb"] = round(ser["buckets"][-1][1] / 2**20, 1)
D["step"]["grad_mb"] = round(N * 2 / 2**20, 1)

os.makedirs("out", exist_ok=True)
json.dump(D, open("out/data.json", "w"), indent=1)
open("parts/22_js_sg_data.js", "w").write("// generated by recompute.py from the raw outputs: do not edit\nwindow.SG=" + json.dumps(D, separators=(",", ":")) + ";\n")
print(json.dumps(dict(metal=M, conc=C, mps=P), indent=0)[:1500])
print("ddp", {k: dd[k] for k in ("saved_pct", "slowdown_pct", "exposed_ms", "serial_comm_ms")}, dd["overlap"]["end_ms"], dd["serial"]["end_ms"])
print("step", {k: D["step"]["serial"][k] for k in ("fwd", "bwd", "opt", "copy", "comm", "total")}, D["step"]["overlap"]["total"], D["step"]["overlap"]["exposed"], D["step"]["saved_pct"], D["step"]["n_buckets"], D["step"]["last_bucket_mb"])
print("blog", B, "pipe", pipe)
