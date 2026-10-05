"""Every derived number on the interconnects page (stdlib only). Writes out/expected.json and parts/22_js_ic_data.js (window.IC).

Parts:
  meas    : the laptop collectives (meas/out/run_*.json): medians and spread over 3 runs, alpha and beta fitted per rank count,
            model against measurement at every size, the ring / recursive-doubling crossover predicted and observed.
  links   : link presets (alpha, beta) with sources; ladder numbers (per direction).
  pub     : published nccl-tests points and the two-level model's prediction for each (residuals).
  simcases: cases the page's JS simulator must reproduce (closed forms = step simulation, from collsim.py).
  fabcases: cases for the fabric model (fabric.py).
  par     : parallelism against the link (TP ratio from the parent's calculator model, DP and FSDP break-even tokens, EP).
Run: python3 recompute.py
"""
import json, math, os, statistics as st, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import collsim, fabric  # noqa: E402

sys.path.insert(0, os.path.join(HERE, "..", "..", "src", "calc"))
import model as root  # the parent's Performance calculator model (Topic: hardware, src/calc/model.py)  # noqa: E402

OUT = {}


def r(x, d=3):
    return float(f"{x:.{d}g}") if isinstance(x, float) else x


# ---------------- 1. laptop measurements ----------------
def meas():
    runs = [json.load(open(os.path.join(HERE, "meas", "out", f"run_{i}.json"))) for i in (1, 2, 3)]
    sizes = runs[0]["sizes_bytes"]
    loads = []
    for i in (1, 2, 3):
        for line in open(os.path.join(HERE, "meas", "out", f"load_{i}.txt")):
            loads.append(float(line.split(":")[1].split()[0]))
    M = {"sizes": sizes, "torch": runs[0]["torch"], "load_min": min(loads), "load_max": max(loads), "ns": {}}
    for n in (2, 4, 8):
        D = {}
        for alg in ("pingpong_hop", "ring", "rd", "gloo"):
            med, lo, hi = [], [], []
            for j, s in enumerate(sizes):
                v = [ru["runs"][str(n)][j].get(alg) for ru in runs]
                v = [x for x in v if x is not None]
                if v:
                    med.append(st.median(v)); lo.append(min(v)); hi.append(max(v))
                else:
                    med.append(None); lo.append(None); hi.append(None)
            if any(x is not None for x in med):
                D[alg] = dict(med=med, lo=lo, hi=hi)
        ok = all(row.get(k) for ru in runs for row in ru["runs"][str(n)] for k in row if k.endswith("_ok"))
        # alpha per step: small sizes (<= 16 KiB), ring and recursive doubling pooled, time / number of steps
        L = collsim.log2i(n)
        per_step = []
        for j, s in enumerate(sizes):
            if s <= 16384:
                if D.get("ring") and D["ring"]["med"][j] is not None:
                    per_step.append(D["ring"]["med"][j] / (2 * (n - 1)))
                if D.get("rd") and D["rd"]["med"][j] is not None:
                    per_step.append(D["rd"]["med"][j] / L)
        alpha = st.median(per_step)
        ring_small = st.median([D["ring"]["med"][j] for j, s in enumerate(sizes) if s <= 16384 and D["ring"]["med"][j] is not None])
        rd_small = st.median([D["rd"]["med"][j] for j, s in enumerate(sizes) if s <= 16384])
        # beta: ring at the largest size, after removing the latency term
        S = sizes[-1]
        t = D["ring"]["med"][-1]
        beta = (2 * (n - 1) / n * S) / (t - 2 * (n - 1) * alpha)
        model = {alg: [collsim.closed("ar", alg, n, s, alpha, beta) for s in sizes] for alg in ("ring", "rd")}
        resid = {alg: [(D[alg]["med"][j] / model[alg][j] - 1) if D[alg]["med"][j] else None for j in range(len(sizes))] for alg in ("ring", "rd")}
        # crossover: smallest measured size where ring beats recursive doubling; model crossover in closed form
        xo_meas = next((sizes[j] for j in range(len(sizes)) if D["ring"]["med"][j] and D["ring"]["med"][j] < D["rd"]["med"][j]), None)
        denom = (L - 2 * (n - 1) / n) / beta
        xo_model = (2 * (n - 1) - L) * alpha / denom if denom > 0 else None
        M["ns"][str(n)] = dict(data=D, ok=ok, alpha=alpha, beta=beta, agg=beta * n, model=model, resid=resid,
                               ring_small=ring_small, rd_small=rd_small, step_ratio=ring_small / rd_small,
                               step_ratio_model=2 * (n - 1) / L, xo_meas=xo_meas, xo_model=xo_model)
    pp = M["ns"]["2"]["data"]["pingpong_hop"]["med"]
    M["pp_alpha"] = st.median([pp[j] for j, s in enumerate(sizes) if s <= 16384])
    M["pp_beta"] = sizes[-1] / (pp[-1] - M["pp_alpha"])
    return M


OUT["meas"] = meas()


# ---------------- 2. links: bandwidth per direction (GB/s) and start-up latency alpha (microseconds) ----------------
LINKS = [
    dict(id="nvl4", nm="NVLink 4 (H100 server, 8 GPUs)", beta=450, alpha=3.33, maxN=8,
         src="900 GB/s total per H100 (Hopper in depth); alpha: 64 B end-to-end NVLink latency measured by DeepSeek on H800 (Zhao et al. 2025, Table 5)"),
    dict(id="nvl5", nm="NVLink 5 (B200 server or NVL72 rack)", beta=900, alpha=3.33, maxN=72,
         src="1.8 TB/s total per Blackwell GPU (NVLink page, GB200 NVL72 page); alpha assumed equal to NVLink 4's (no published figure found)"),
    dict(id="pcie5", nm="PCIe 5.0 x16 (two RTX 5090s, no NVLink)", beta=63, alpha=5.0, maxN=8,
         src="32 GT/s x 16 lanes, 128b/130b: 63 GB/s each way (PCI-SIG figures via Wikipedia); alpha 5 us assumed (illustrative)"),
    dict(id="ib", nm="InfiniBand NDR 400 Gb/s, one NIC per GPU", beta=50, alpha=2.8, maxN=None,
         src="400 Gb/s = 50 GB/s each way (ConnectX-7); alpha: 2.8 us same leaf, 3.7 us across leaves (DeepSeek, Table 5)"),
    dict(id="roce", nm="RoCE 400 Gb/s, one NIC per GPU", beta=50, alpha=3.6, maxN=None,
         src="400 Gb/s = 50 GB/s each way; alpha: 3.6 us same leaf, 5.6 us across leaves (DeepSeek, Table 5)"),
    dict(id="eth100", nm="100 Gb/s Ethernet", beta=12.5, alpha=10.0, maxN=None,
         src="100 Gb/s = 12.5 GB/s each way; alpha 10 us assumed (illustrative)"),
]
M = OUT["meas"]
for n in ("2", "4", "8"):
    pass
LINKS.append(dict(id="laptop", nm="This laptop: Gloo over loopback TCP (measured)", beta=None, alpha=None, maxN=8,
                  per_n={n: dict(alpha=M["ns"][n]["alpha"] * 1e6, beta=M["ns"][n]["beta"] / 1e9) for n in ("2", "4", "8")},
                  src="fitted per rank count from the measurements in section 7 (alpha from sizes up to 16 KiB, beta from 16 MiB)"))
OUT["links"] = LINKS

# half-bandwidth message size n_half = alpha x beta: below it, latency dominates
OUT["nhalf"] = {l["id"]: l["alpha"] * 1e-6 * l["beta"] * 1e9 for l in LINKS if l.get("alpha")}
OUT["nhalf"]["laptop_pp"] = M["pp_alpha"] * M["pp_beta"]

# ---------------- 3. the running example ----------------
P8 = root.MODELS["l8"]["P"]
G8 = 2 * P8  # bf16 gradients, bytes
OUT["ex"] = dict(P8=P8, grad8=G8,
                 ar8_nvl=collsim.closed("ar", "ring", 8, G8, 0, 450e9),
                 ar8_ib=collsim.closed("ar", "ring", 8, G8, 0, 50e9),
                 ar2_pcie=collsim.closed("ar", "ring", 2, G8, 0, 63e9),
                 ar8_nvls=collsim.closed("ar", "switch", 8, G8, 0, 450e9),
                 ar8_rd=collsim.closed("ar", "rd", 8, G8, 0, 450e9),
                 old_ib=2 * 16 / 50, old_nvl=2 * 16 / 450)


# ---------------- 4. parallelism against the link ----------------
MFU = 0.40
H100 = root.CHIPS["h100"]
F = H100["peak"]["bf16"] * 1e12 * MFU  # FLOP/s sustained at 40% of dense BF16 peak


def par_for(Fs, B):
    """Thresholds for one GPU sustaining Fs FLOP/s with B bytes/s per direction on the link its traffic crosses."""
    I = Fs / B  # link intensity: FLOPs done in the time one byte crosses
    return dict(I=I,
                dp_tokens=2 * I / 3,  # DP: 2 x 2P bytes vs 6 P T flops  (large d)
                fsdp_tokens=I,        # FSDP/ZeRO-3: 3 x 2P bytes vs 6 P T flops (large d)
                )


l70 = root.MODELS["l70"]
tp = {k: root.tp_ratio(dict(model="l70", chip="h100", tp=8, tokens=8192, mfu=MFU, link=bw)) for k, bw in (("nvl", 450), ("ib", 50), ("pcie", 63))}
# simple closed form with layer params ~ 12 h^2: ratio = 2 (t-1) F / (9 h B)
tp_simple = {k: 2 * 7 * F / (9 * l70["h"] * bw * 1e9) for k, bw in (("nvl", 450), ("ib", 50))}
l405 = root.MODELS["l405"]
pp_bytes = 2 * 8192 * l405["h"] * 2  # forward activation + backward gradient, one boundary, one 8,192-token micro-batch, bf16
pp_comp = 6 * (l405["L"] / 16) * l405["layer_params"] * 8192 / (8 * F)  # one stage (126/16 layers), TP 8 inside the server
pp_comm = pp_bytes / 8 / 50e9  # with sequence parallelism each of the 8 GPUs sends 1/8 over its own NIC
dsv3 = root.MODELS["dsv3"]
ep_bytes_fwd = 4 * (dsv3["h"] * 1 + dsv3["h"] * 2)  # up to 4 nodes: FP8 dispatch (1 B) + BF16 combine (2 B) per token
ep_flops_fwd = 9 * 3 * dsv3["h"] * 2048 * 2       # 8 routed + 1 shared expert, 3 matrices of h x 2048, 2 FLOPs per MAC
ep_t = ep_bytes_fwd / 50e9
OUT["par"] = dict(
    mfu=MFU, F=F,
    nvl=par_for(F, 450e9), ib=par_for(F, 50e9), pcie=par_for(F, 63e9),
    tp70=dict(nvl=tp["nvl"]["ratio"], ib=tp["ib"]["ratio"], pcie=tp["pcie"]["ratio"],
              comm_nvl_ms=tp["nvl"]["comm_ms"], comm_ib_ms=tp["ib"]["comm_ms"], comp_ms=tp["nvl"]["comp_ms"],
              wait_ib=tp["ib"]["ratio"] / (1 + tp["ib"]["ratio"])),
    tp_simple=tp_simple, h70=l70["h"], lp70=l70["layer_params"],
    pp405=dict(bytes=pp_bytes, comm_ms=pp_comm * 1e3, comp_ms=pp_comp * 1e3, ratio=pp_comm / pp_comp, layers=l405["L"]),
    ep=dict(bytes=ep_bytes_fwd, flops=ep_flops_fwd, t_us=ep_t * 1e6, need_tflops=ep_flops_fwd / ep_t / 1e12,
            need_frac_fp8=ep_flops_fwd / ep_t / 1979e12, need_frac_bf16=ep_flops_fwd / ep_t / 989.5e12, h=dsv3["h"]),
)


# ---------------- 5. simulator and fabric cases (the page's JS must reproduce these) ----------------
SIMCASES = []
for coll, algs in (("ar", ["ring", "rd", "rab", "switch"]), ("ag", ["ring", "rd"]), ("a2a", ["pair"])):
    for alg in algs:
        for n in (2, 4, 8, 16):
            for S, a, b in ((16060522496, 3.33e-6, 450e9), (1048576, 2.8e-6, 50e9), (8, 238e-6, 0.78e9)):
                res = collsim.run(coll, alg, n, S, a, b)
                assert res["ok"], (coll, alg, n)
                assert abs(res["time"] - collsim.closed(coll, alg, n, S, a, b)) <= 1e-12 * res["time"]
                SIMCASES.append(dict(coll=coll, alg=alg, n=n, S=S, a=a, b=b, time=res["time"], steps=res["steps"], sent=res["sent"]))
OUT["simcases"] = SIMCASES

FABCASES = []
for fab in ("rail", "tor", "railonly"):
    for pat in ("dp_ring", "a2a", "pp"):
        for srv in (2, 4, 16, 64):
            for over in (1, 3, 7):
                for pxn in (False, True):
                    res = fabric.loads(fab, pat, srv, 1e9, over=over, pxn=pxn)
                    FABCASES.append(dict(fab=fab, pat=pat, srv=srv, over=over, pxn=pxn, total=res["total"], worst=res["worst"],
                                         ports=res["ports"], time=res["time"]))
OUT["fabcases"] = FABCASES
# headline fabric numbers used in the prose: 16 servers (128 GPUs), all-to-all of 1 GB per GPU
f_rail = fabric.loads("rail", "a2a", 16, 1e9)
f_tor7 = fabric.loads("tor", "a2a", 16, 1e9, over=7)
f_rail_o3 = fabric.loads("rail", "a2a", 16, 1e9, over=3)
f_pxn = fabric.loads("rail", "a2a", 16, 1e9, over=3, pxn=True)
f_ro = fabric.loads("railonly", "a2a", 16, 1e9)
OUT["fab"] = dict(rail=f_rail["total"], tor7=f_tor7["total"], rail_o3=f_rail_o3["total"], pxn_o3=f_pxn["total"], railonly=f_ro["total"],
                  ports_rail=f_rail["ports"], ports_ro=f_ro["ports"], cross_frac=7 / 8 * (15 / 16) / (127 / 128))


# ---------------- 6. published nccl-tests figures against the model ----------------
def two_level(S, M, G, b_in, b_out, a_in=0.0, a_out=0.0):
    """All-reduce over M servers of G GPUs: ring inside each server over NVLink (reduce-scatter, then all-gather),
    and between servers each GPU all-reduces its 1/G share over its own NIC (a ring per rail); phases pipelined,
    so the slower one sets the time. M = 1 is a plain ring."""
    t_in = 2 * (G - 1) / G * S / b_in
    t_out = 2 * (M - 1) / M * (S / G) / b_out if M > 1 else 0.0
    return 2 * (G - 1) * a_in + 2 * (M - 1) * a_out + max(t_in, t_out)


def busbw(S, t, n):
    return S / t * 2 * (n - 1) / n


GiB = 2 ** 30
BEK = "https://github.com/stas00/ml-engineering/blob/master/network/benchmarks/README.md"
AWS = "https://github.com/aws-samples/awsome-distributed-training/tree/main/micro-benchmarks/nccl-tests"
PUB = [
    dict(id="h200_ring", sys="8 x H200, one server, ring (NVLS off)", n=8, M=1, G=8, b_in=450, b_out=None, S=8 * GiB, meas=365.6, alg="ring", src=BEK, who="Bekman, ML Engineering", lab="i"),
    dict(id="h200_nvls", sys="8 x H200, one server, NVLS (in-switch)", n=8, M=1, G=8, b_in=450, b_out=None, S=8 * GiB, meas=473.1, alg="switch", src=BEK, who="Bekman, ML Engineering", lab="i"),
    dict(id="b200_ring", sys="8 x B200 (AWS p6-b200), ring", n=8, M=1, G=8, b_in=900, b_out=None, S=8 * GiB, meas=682.2, alg="ring", src=BEK, who="Bekman, ML Engineering (2026-08-09)", lab="i"),
    dict(id="b200_nvls", sys="8 x B200 (AWS p6-b200), NVLS", n=8, M=1, G=8, b_in=900, b_out=None, S=8 * GiB, meas=838.0, alg="switch", src=BEK, who="Bekman, ML Engineering (2026-08-09)", lab="i"),
    dict(id="p5x2", sys="2 x 8 H100 (AWS p5, EFA 3,200 Gb/s per server)", n=16, M=2, G=8, b_in=450, b_out=50, S=16 * GiB, meas=487.09, alg="two", src=AWS, who="AWS awsome-distributed-training README", lab="v"),
    dict(id="p4dex2", sys="2 x 8 A100 (AWS p4de, EFA 400 Gb/s per server)", n=16, M=2, G=8, b_in=300, b_out=6.25, S=2 * GiB, meas=78.33, alg="two", src=AWS, who="AWS awsome-distributed-training README", lab="v"),
    dict(id="b200x4", sys="4 x 8 B200 (AWS p6-b200, EFA 8 x 400 Gb/s per server)", n=32, M=4, G=8, b_in=900, b_out=50, S=16 * GiB, meas=376.71, alg="two", src=BEK, who="Bekman, ML Engineering", lab="i"),
]
for p in PUB:
    if p["alg"] == "ring":
        t = collsim.closed("ar", "ring", p["n"], p["S"], 0, p["b_in"] * 1e9)
    elif p["alg"] == "switch":
        t = collsim.closed("ar", "switch", p["n"], p["S"], 0, p["b_in"] * 1e9)
    else:
        t = two_level(p["S"], p["M"], p["G"], p["b_in"] * 1e9, p["b_out"] * 1e9)
    p["model"] = busbw(p["S"], t, p["n"]) / 1e9
    p["frac"] = p["meas"] / p["model"]
OUT["pub"] = PUB
# one server of 8 H200s, all-reduce busbw by size (nccl-tests column, Bekman): for the curve on the simulator tab
OUT["sweep_h200"] = dict(src=BEK, sizes=[32 * 1024, 2 ** 20, 16 * 2 ** 20, 256 * 2 ** 20, 16 * GiB], busbw=[3.20, 72.45, 242.45, 442.27, 480.70])
OUT["sweep_h200"]["t_us"] = [s / (b * 1e9 / 1.75) * 1e6 for s, b in zip(OUT["sweep_h200"]["sizes"], OUT["sweep_h200"]["busbw"])]
# AWS 2 x p5 (16 H100 over EFA): all-reduce time by size, verbatim rows
OUT["sweep_p5"] = dict(src=AWS, sizes=[8, 2 ** 20, 16 * 2 ** 20, 128 * 2 ** 20, GiB, 16 * GiB], t_us=[69.12, 123.2, 298.1, 870.3, 4607.6, 66132])


# ---------------- 7. the ladder (per GPU, each direction, GB/s) ----------------
OUT["ladder"] = [
    dict(nm="HBM3 (H100 memory)", sub="one chip", bw=3350),
    dict(nm="NVLink 5 (Blackwell)", sub="server or NVL72 rack", bw=900),
    dict(nm="NVLink 4 (H100)", sub="server, 8 GPUs", bw=450),
    dict(nm="800 Gb/s NIC", sub="between servers", bw=100),
    dict(nm="PCIe 5.0 x16", sub="host link; consumer GPU pairs", bw=63),
    dict(nm="400 Gb/s NIC", sub="between servers", bw=50),
    dict(nm="100 Gb/s Ethernet", sub="front-end networks", bw=12.5),
]


def clean(o):
    if isinstance(o, float):
        return float(f"{o:.6g}")
    if isinstance(o, dict):
        return {k: clean(v) for k, v in o.items()}
    if isinstance(o, list):
        return [clean(v) for v in o]
    return o


if __name__ == "__main__":
    data = clean(OUT)
    os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
    json.dump(data, open(os.path.join(HERE, "out", "expected.json"), "w"), indent=1, sort_keys=True)
    with open(os.path.join(HERE, "parts", "22_js_ic_data.js"), "w") as f:
        f.write("// ---- Data: written by src/recompute.py from out/expected.json; do not edit ----\n")
        page = {k: v for k, v in data.items() if k not in ("simcases", "fabcases")}  # cases stay in expected.json for the checks
        f.write("window.IC=" + json.dumps(page, sort_keys=True, separators=(",", ":")) + ";\n")
    print("wrote out/expected.json and parts/22_js_ic_data.js;", os.path.getsize(os.path.join(HERE, "parts", "22_js_ic_data.js")) // 1024, "KB on the page")
