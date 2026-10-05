"""Every derived number on the Performance math page, from the traces, the M1 measurements, the papers' own figures
and the parent root's calculator model (imported, so the two pages cannot disagree). Writes out/recompute.json.
Pure Python, no packages. Run from anywhere: python3 recompute.py
"""
import json, os, sys, glob, statistics, math

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, "out")
sys.path.insert(0, os.path.join(HERE, "..", "..", "src", "calc"))
from model import MODELS, CHIPS, decode, prefill, train, act_bytes, allreduce  # the root's Performance calculator

L8, L70, L405, DS = MODELS["l8"], MODELS["l70"], MODELS["l405"], MODELS["dsv3"]
H100, B200 = CHIPS["h100"], CHIPS["b200"]
R = {}


def tr(name):
    return json.load(open(os.path.join(OUT, name)))


# ---------------- 1. the FLOP ledger: formula against the traced step ----------------
def ledger(m, T):
    """Training FLOPs per token by component, from the config (batch 1, sequence T). Full score square, as PyTorch's
    counter and PaLM's 12LHQT count it; causal kernels do about half of the attention-core term."""
    h, L, nh, nkv, hd, V = m["h"], m["L"], m["nh"], m["nkv"], m["hd"], m["V"]
    f = (m["layer_params"] - 2 * h - (h * nh * hd + 2 * h * nkv * hd + nh * hd * h)) // (3 * h)
    proj = L * (2 * h * nh * hd + 2 * h * nkv * hd)          # q, o and k, v weights
    mlp = L * 3 * h * f
    head = h * V
    core_f = L * 4 * T * nh * hd                             # QK^T and AV forward, per token, full square
    return dict(f=f, proj=6 * proj, mlp=6 * mlp, head=6 * head, core_fwd=core_f, core_bwd_std=2 * core_f,
                core_bwd_flash=2.5 * core_f, six_n=6 * m["P"], six_n_matmul=6 * (proj + mlp + head))


led = {}
for T in (2048, 8192, 32768, 131072):
    t = tr(f"trace_l8_{T}_flash.json")
    lg = ledger(L8, T)
    by = t["by_cat"]
    traced = dict(proj=by["fwd"]["attn_proj"]["flops"] + by["bwd"]["attn_proj"]["flops"],
                  mlp=by["fwd"]["mlp"]["flops"] + by["bwd"]["mlp"]["flops"],
                  head=by["fwd"]["lm_head"]["flops"] + by["bwd"]["lm_head"]["flops"],
                  core_fwd=by["fwd"]["attn_core"]["flops"], core_bwd=by["bwd"]["attn_core"]["flops"])
    traced = {k: v / T for k, v in traced.items()}
    total_tr = (t["flops_fwd"] + t["flops_bwd"]) / T
    total_f = lg["proj"] + lg["mlp"] + lg["head"] + lg["core_fwd"] + lg["core_bwd_flash"]
    assert abs(total_tr - total_f - 2 * L8["hd"] // 2) < 1, (T, total_tr, total_f)  # + the RoPE frequency outer product, 128 FLOPs per token
    for k in ("proj", "mlp", "head", "core_fwd"):
        assert abs(traced[k] - lg[k]) < 200, (k, traced[k], lg[k])
    attn_full = lg["core_fwd"] * 3                            # PaLM's 12 L H Q T (forward + 2x backward)
    led[T] = dict(traced_total=total_tr, formula_total=total_f, six_n=lg["six_n"], six_n_matmul=lg["six_n_matmul"],
                  proj=lg["proj"], mlp=lg["mlp"], head=lg["head"], core_fwd=lg["core_fwd"], core_bwd_flash=lg["core_bwd_flash"],
                  attn_full=attn_full, attn_causal=attn_full / 2,
                  over_6n_full=(lg["six_n_matmul"] + attn_full) / lg["six_n"] - 1,
                  over_6n_causal=(lg["six_n_matmul"] + attn_full / 2) / lg["six_n"] - 1,
                  traced_over_6n=total_tr / lg["six_n"] - 1, flash_bwd_ratio=traced["core_bwd"] / traced["core_fwd"])
R["ledger_l8"] = led
R["l8_f"] = ledger(L8, 1)["f"]
R["l8_P"], R["l8_emb"] = L8["P"], L8["h"] * L8["V"]
R["l8_matmulN"] = R["l8_P"] - R["l8_emb"]
t70 = tr("trace_l70_8192_flash.json")
lg70 = ledger(L70, 8192)
R["l70_traced_over_6n"] = (t70["flops_fwd"] + t70["flops_bwd"]) / 8192 / lg70["six_n"] - 1
assert abs((t70["flops_fwd"] + t70["flops_bwd"]) / 8192 - (lg70["proj"] + lg70["mlp"] + lg70["head"] + lg70["core_fwd"] + lg70["core_bwd_flash"]) - 128) < 1
# attention share at 8,192 under the two conventions the root uses (calc: full square over 6N; reading: causal half over matmul-only 6N)
R["attn_8k_full_over_6n"] = led[8192]["attn_full"] / led[8192]["six_n"]
R["attn_8k_causal_over_matmul"] = led[8192]["attn_causal"] / led[8192]["six_n_matmul"]
R["ledger_formula_points"] = 8  # 4 sequence lengths x (total + 4 parts) checked by assert above

# ---------------- 2. activation memory: what autograd keeps ----------------
t8 = tr("trace_l8_8192_flash.json"); te = tr("trace_l8_8192_eager.json"); tc = tr("trace_l8_8192_flash_ckpt.json")
h, T = L8["h"], 8192
lay = [int(v) for k, v in t8["saved_per_layer"].items() if k.isdigit()]
lay_e = [int(v) for k, v in te["saved_per_layer"].items() if k.isdigit()]
R["act_layer_flash_B"] = lay[1]                     # a middle layer (layer 0 also carries the shared RoPE tables)
R["act_layer_flash_per_tok_h"] = lay[1] / T / h
R["act_layer0_flash_B"] = lay[0]
R["act_layers_flash_GB"] = sum(lay) / 1e9
R["act_post_GB"] = int(t8["saved_per_layer"]["post"]) / 1e9   # final norm, logits, loss
R["act_total_flash_GB"] = (sum(lay) + int(t8["saved_per_layer"]["post"]) + int(t8["saved_per_layer"].get("pre", 0))) / 1e9
R["act_layer_eager_GB"] = lay_e[1] / 1e9
R["act_total_eager_GB"] = (sum(lay_e) + int(te["saved_per_layer"]["post"])) / 1e9
R["eager_scores_per_layer_GB"] = (lay_e[1] - lay[1]) / 1e9
R["eager_scores_formula_GB"] = 6 * L8["nh"] * T * T / 1e9        # fp32 softmax output (4 B) + bf16 probabilities (2 B)
ck_total = sum(int(v) for v in tc["saved_per_layer"].values())
R["act_ckpt_total_GB"] = ck_total / 1e9
R["act_ckpt_layers_GB"] = (ck_total - int(tc["saved_per_layer"]["post"])) / 1e9
R["act_ckpt_per_layer_h"] = (ck_total - int(tc["saved_per_layer"]["post"])) / L8["L"] / T / h
R["korthikanti_34_GB"] = act_bytes(L8, T, 1, "flash", 1) / 1e9      # the root calculator's estimate
R["korthikanti_full_GB"] = act_bytes(L8, T, 1, "full", 1) / 1e9
R["saved_tensors_l0"] = [[s[0], s[1], s[2] / T / h, s[3]] for s in t8["saved_layer0_tensors"]]
# grouped, in units of h bytes per token (bf16 = 2)
g = {"mlp": 0, "norm": 0, "attn": 0, "small": 0}
for shp, dt, per, where in R["saved_tensors_l0"]:
    if per < 0.2: g["small"] += per
    elif "down_proj" in where and shp[-1] != h: g["mlp"] += per
    elif "variance" in where or "self.weight" in where or (dt == "torch.float32" and shp[-1] == h): g["norm"] += per
    elif "down_proj" in where: g["norm"] += per          # the normalised input to the MLP
    elif "q_proj" in where: g["norm"] += per             # the normalised input to the attention projections
    else: g["attn"] += per
R["saved_groups_h"] = g
# the same count as a formula of the config (mirrored in the page's JavaScript): bytes per token
def act_layer_tok(m, T, mode):
    h, nh, nkv, hd = m["h"], m["nh"], m["nkv"], m["hd"]
    f = (m["layer_params"] - 2 * h - (h * nh * hd + 2 * h * nkv * hd + nh * hd * h)) // (3 * h)
    if mode == "ckpt":
        return 2 * h
    flash = 16 * h + 4 * nh * hd + 4 * nkv * hd + 8 * f + 4 * nh + 8
    if mode == "flash":
        return flash
    return flash - 4 * nh + 6 * nh * T + 4 * (nh - nkv) * hd   # eager: fp32 + bf16 score matrices, K and V repeated to every head


def act_post_tok(m):
    return 8 * m["h"] + 4 * m["V"] + 8                         # final norm, fp32 logits for the loss


def act_total(m, T, mode):
    return (m["L"] * act_layer_tok(m, T, mode) + act_post_tok(m) + 8) * T


for TT in (2048, 8192, 32768, 131072):
    t = tr(f"trace_l8_{TT}_flash.json")
    assert abs(int(t["saved_per_layer"]["1"]) / TT - act_layer_tok(L8, TT, "flash")) < 0.05
    assert abs(int(t["saved_per_layer"]["post"]) / TT - act_post_tok(L8)) < 5
assert abs(lay_e[1] / 8192 - act_layer_tok(L8, 8192, "eager")) < 0.05
assert abs(int(t70["saved_per_layer"]["1"]) / 8192 - act_layer_tok(L70, 8192, "flash")) < 0.05
assert abs(ck_total / 8192 - (L8["L"] * 2 * h + act_post_tok(L8) + 8)) < 8
R["act_formula_checks"] = 11
R["act_total_formula_flash_GB"] = act_total(L8, 8192, "flash") / 1e9
R["act_post_tok"] = act_post_tok(L8)
R["act_layer_tok_l8"] = act_layer_tok(L8, 8192, "flash")
R["act_layer_tok_l70"] = act_layer_tok(L70, 8192, "flash")
R["act_kor_tok_l8"] = 34 * h
# full recompute FLOPs: what the hardware does against what the model needs
R["hfu_ratio_ckpt"] = (tc["flops_fwd"] + tc["flops_bwd"]) / (t8["flops_fwd"] + t8["flops_bwd"])
R["recompute_TF"] = (tc["flops_bwd"] - t8["flops_bwd"]) / 1e12
R["fwd_layers_TF"] = (t8["by_cat"]["fwd"]["attn_proj"]["flops"] + t8["by_cat"]["fwd"]["mlp"]["flops"] + t8["by_cat"]["fwd"]["attn_core"]["flops"]) / 1e12
R["down_proj_TF"] = 2 * h * R["l8_f"] * T * L8["L"] / 1e12
assert abs(R["recompute_TF"] - (R["fwd_layers_TF"] - R["down_proj_TF"])) < 0.01
R["states_fsdp8_GB"] = 16 * L8["P"] / 8 / 1e9
R["step_tf_8k"] = (t8["flops_fwd"] + t8["flops_bwd"]) / 1e12

# ---------------- the Reading animation: one step's memory and FLOPs (mirrored in parts/25_js_rd_mem.js) ----------------
def mem_anim(mode, T=8192):
    m = L8; h, V, L = m["h"], m["V"], m["L"]
    lg = ledger(m, T)
    f = lg["f"]
    S = 16 * m["P"] / 8
    fwd_l = (lg["proj"] + lg["mlp"]) / 3 / L * T + lg["core_fwd"] / L * T
    bwd_l = 2 * (lg["proj"] + lg["mlp"]) / 3 / L * T + (lg["core_bwd_flash"] if mode != "eager" else 2 * lg["core_fwd"]) / L * T
    rec_l = fwd_l - 2 * h * f * T
    keep = (act_layer_tok(m, T, "ckpt" if mode == "ckpt" else mode)) * T
    work = act_layer_tok(m, T, "flash") * T
    post = act_post_tok(m) * T
    steps = [dict(kind="start", mem=S, act=0, post=0, rec=0, fl=0, flr=0)]
    act = 0; fl = 0; flr = 0
    for i in range(L):
        act += keep; fl += fwd_l
        steps.append(dict(kind="fwd", layer=i + 1, mem=S + act, act=act, post=0, rec=0, fl=fl, flr=flr))
    fl += 2 * h * V * T
    steps.append(dict(kind="loss", mem=S + act + post, act=act, post=post, rec=0, fl=fl, flr=flr))
    fl += 4 * h * V * T
    steps.append(dict(kind="headbwd", mem=S + act + post, act=act, post=post, rec=0, fl=fl, flr=flr))
    for i in range(L, 0, -1):
        rec = work if mode == "ckpt" else 0
        if mode == "ckpt":
            flr += rec_l
        fl += bwd_l
        steps.append(dict(kind="bwd", layer=i, mem=S + act + rec, act=act, post=0, rec=rec, fl=fl, flr=flr))
        act -= keep
    return dict(steps=steps, peak=max(x["mem"] for x in steps), total_fl=fl + flr, states=S)


R["anim"] = {k: mem_anim(k) for k in ("eager", "flash", "ckpt")}
R["anim_peaks_GB"] = {k: v["peak"] / 1e9 for k, v in R["anim"].items()}
assert abs(R["anim"]["flash"]["total_fl"] - R["step_tf_8k"] * 1e12) / R["anim"]["flash"]["total_fl"] < 1e-6
assert abs(R["anim"]["ckpt"]["total_fl"] / R["anim"]["flash"]["total_fl"] - R["hfu_ratio_ckpt"]) < 1e-6
R["anim_time_s"] = {k: v["total_fl"] / (989.5e12 * 0.4) for k, v in R["anim"].items()}
# model state table (section 2)
from model import lora_params
R["states"] = {k: dict(P=MODELS[k]["P"], adam16=16 * MODELS[k]["P"], fp32g=18 * MODELS[k]["P"], adam8=10 * MODELS[k]["P"], bf16=8 * MODELS[k]["P"],
                       lora=2 * MODELS[k]["P"] + 16 * lora_params(MODELS[k]), qlora=0.516 * MODELS[k]["P"] + 16 * lora_params(MODELS[k]),
                       inf_bf16=2 * MODELS[k]["P"], inf_fp8=MODELS[k]["P"], nvfp4=MODELS[k]["P"] * 4.5 / 8, mxfp4=MODELS[k]["P"] * 4.25 / 8,
                       A=lora_params(MODELS[k])) for k in ("l8", "l70")}

# ---------------- 3. MFU and HFU on published runs ----------------
pal = dict(N=540e9, L=118, H=48, Q=256, T=2048, chips=6144, peak=275e12, tps=238.3e3)
pal_attn = 12 * pal["L"] * pal["H"] * pal["Q"] * pal["T"]
R["palm_mfu_noattn"] = pal["tps"] * 6 * pal["N"] / (pal["chips"] * pal["peak"])
R["palm_mfu"] = pal["tps"] * (6 * pal["N"] + pal_attn) / (pal["chips"] * pal["peak"])
R["palm_tf_tok"] = (6 * pal["N"] + pal_attn) / 1e12
R["palm_hfu_from_t22"] = 0.462 * 4.10 / 3.28
remat = 0.75 * 2 * pal["N"] + pal_attn / 3                      # 75% of non-attention forward + all attention forward
R["palm_hw_tf_tok_ours"] = (6 * pal["N"] + pal_attn + remat) / 1e12
R["palm_hfu_ours"] = pal["tps"] * (6 * pal["N"] + pal_attn + remat) / (pal["chips"] * pal["peak"])
R["mtnlg_mfu"] = 65.43e3 * 6 * 530e9 / (312e12 * 2240)
R["kor_530_ratio"] = 1 + 2048 / (6 * 20480)
R["kor_530_hfu_from_mfu"] = 0.560 * R["kor_530_ratio"]
# Llama 3 Table 4: step time implied by TFLOPs/GPU (Meta does not state its FLOP formula: both readings shown)
tok_batch = 64 * 32 * 8192
f6 = 6 * L405["P"]; fattn = 12 * L405["L"] * L405["nh"] * L405["dqk"] * 8192
R["l3_tokens_batch"] = tok_batch
R["l3_step_s_6n"] = tok_batch * f6 / (8192 * 430e12)
R["l3_step_s_attn"] = tok_batch * (f6 + fattn) / (8192 * 430e12)
R["l3_mfu_430"] = 430 / 989.5
R["l3_attn_share"] = fattn / f6
R["l3_tok_s_gpu"] = tok_batch / R["l3_step_s_6n"] / 8192
# DeepSeek-V3: 180K H800 GPU hours per trillion tokens
R["dsv3_mfu_bf16"] = 6 * DS["Pact"] * 1e12 / (180e3 * 3600 * 989.5e12)
R["dsv3_mfu_fp8"] = 6 * DS["Pact"] * 1e12 / (180e3 * 3600 * 1979e12)
R["dsv3_dense_equiv_ratio"] = DS["P"] / DS["Pact"]
R["dsv3_Pact"], R["dsv3_P"] = DS["Pact"], DS["P"]

# ---------------- 4. measured on the M1 Pro GPU, and the bottom-up prediction ----------------
runs = sorted(glob.glob(os.path.join(OUT, "m1_run_*.json")))
M1 = dict(peak=5.06e12, bw=165e9)   # the root's Roofline lab, measured: fp16 FMA peak and stream copy
m1 = []
if runs:
    rs = [json.load(open(p)) for p in runs]
    R["m1_meta"] = dict(torch=rs[0]["torch"], transformers=rs[0]["transformers"], macos=rs[0]["macos"], params=rs[0]["params"], runs=len(rs))
    for i, c0 in enumerate(rs[0]["cases"]):
        T = c0["seq"]
        meds = [r["cases"][i]["median_s"] for r in rs]
        loads = [r["cases"][i]["loadavg"] for r in rs]
        med = statistics.median(meds)
        fl = c0["flops"]; P2 = rs[0]["params"]
        model_fl = 6 * P2 * T + 3 * 2 * 4 * T * T * L8["nh"] * L8["hd"]   # 6N T plus full-square attention for 2 layers
        calls = next((r["cases"][i]["calls"] for r in rs if "calls" in r["cases"][i]), None)
        rt = lambda pk, bw: sum(max(c[1] / pk, c[2] / bw) for c in calls)
        pred = rt(M1["peak"], M1["bw"])
        mm = sum(o[1] for o in c0["ops"].values()) / M1["peak"]
        h100 = rt(H100["peak"]["bf16"] * 1e12, H100["bw"] * 1e9)
        h100_mm = sum(o[1] for o in c0["ops"].values()) / (H100["peak"]["bf16"] * 1e12)
        m1.append(dict(seq=T, median_s=med, run_medians=meds, spread=(max(meds) - min(meds)) / med, loads=loads,
                       flops=fl, bytes=c0["bytes"], achieved_tf=fl / med / 1e12, mfu=model_fl / med / M1["peak"],
                       hfu=fl / med / M1["peak"], pred_s=pred, pred_ratio=med / pred, compute_only_s=mm,
                       h100_pred_s=h100, h100_mm_s=h100_mm, h100_ceiling=h100_mm / h100))
R["m1"] = m1
R["m1_peak_tf"], R["m1_bw_gbs"] = M1["peak"] / 1e12, M1["bw"] / 1e9

# ---------------- 5. inference: prefill and decode on the root's model ----------------
base = dict(model="l8", chip="h100", chips=1, fmt="bf16", prec="bf16", kvb=2, eff=1.0)
R["ttft_4k_ms"] = prefill(dict(base, prompt=4096))["t_ms"]
R["ttft_4k_ms_eff50"] = prefill(dict(base, prompt=4096, eff=0.5))["t_ms"]
d1 = decode(dict(base, batch=1, ctx=4096)); d64 = decode(dict(base, batch=64, ctx=4096))
R["tpot_b1_ms"], R["tps_b1"] = d1["t_ms"], d1["tps"]
R["tpot_b64_ms"], R["tps_b64"], R["tps_b64_seq"] = d64["t_ms"], d64["tps"], d64["tps_seq"]
R["usd_mtok_b1"] = H100["price"] / (d1["tps"] * 3600) * 1e6
R["usd_mtok_b64"] = H100["price"] / (d64["tps"] * 3600) * 1e6
R["kv_seq_4k_GB"] = d1["kv_seq"]
R["mem_b64_GB"] = d64["mem_need"]
p70 = prefill(dict(base, model="l70", chips=8, prompt=32768, eff=0.5))
R["ttft_70b_32k_s"] = p70["t_ms"] / 1e3
R["prefill_70b_32k_attn_share"] = (p70["flops"] - 2 * L70["P"] * 32768) / p70["flops"]

# ---------------- 6. costing a run ----------------
D15 = 15e12
C8 = 6 * L8["P"] * D15
R["c8_15t"] = C8
for k, ch in (("h100", H100), ("b200", B200)):
    gh = C8 / (ch["peak"]["bf16"] * 1e12 * 0.40) / 3600
    R[f"gpuh_{k}"] = gh
    R[f"usd_{k}"] = gh * ch["price"]
    R[f"usd_{k}_good90"] = gh / 0.9 * ch["price"]
    R[f"gpus_30d_{k}"] = gh / 0.9 / (30 * 24)
R["card_gpuh_l8"] = 1.46e6
R["card_mfu_l8"] = C8 / (1.46e6 * 3600 * H100["peak"]["bf16"] * 1e12)
R["card_usd_l8"] = 1.46e6 * H100["price"]
ft = train(dict(model="l8", chip="h100", recipe="adam16", gpus=8, zero=3, seq=8192, mb=1, ckpt="flash", tokens=1e9, mfu=0.4))
R["ft_1b_hours"] = ft["days"] * 24
R["ft_1b_usd"] = ft["cost"]
# communication per step (bytes each GPU sends), Llama 3.1 8B, bf16
P = L8["P"]
R["comm_dp8_GB"] = 2 * 7 / 8 * 2 * P / 1e9
R["comm_fsdp8_GB"] = 3 * 7 / 8 * 2 * P / 1e9
R["comm_dp8_nvlink_ms"] = allreduce(2 * P, 8, H100["up"]) * 1e3
R["comm_tp8_layer_mb_GB"] = 4 * 2 * 7 / 8 * 8192 * h * 2 / 1e9
R["comm_pp_mb_MB"] = 8192 * h * 2 / 1e6

# MoE decode: experts touched per layer, DeepSeek-V3 (uniform routing, the root's model)
from model import experts_touched
R["dsv3_touched_b1"] = experts_touched(DS, 1)
R["dsv3_touched_b64"] = experts_touched(DS, 64)
R["dsv3_E"], R["dsv3_k"], R["dsv3_h"] = DS["E"], DS["k"], DS["h"]
dd1 = decode(dict(base, model="dsv3", chip="h200", chips=8, fmt="native", prec="fp8", batch=1, ctx=4096, kvb=1))
dd64 = decode(dict(base, model="dsv3", chip="h200", chips=8, fmt="native", prec="fp8", batch=64, ctx=4096, kvb=1))
R["dsv3_wread_b1_GB"], R["dsv3_wread_b64_GB"], R["dsv3_wbytes_GB"] = dd1["wread"], dd64["wread"], dd1["wbytes"]
R["ep_bytes_tok_layer_dsv3"] = 2 * DS["k"] * DS["h"] * 2         # dispatch + combine, BF16, upper bound
R["comm_tp8_step_mb_GB"] = R["comm_tp8_layer_mb_GB"] * L8["L"]
R["serve_capacity_h100"] = (1e6 / 60) / R["tps_b64"]
R["serve_capacity_h100_b1"] = (1e6 / 60) / R["tps_b1"]
json.dump(R, open(os.path.join(OUT, "recompute.json"), "w"), indent=1)
if __name__ == "__main__":
    for k in ("attn_8k_full_over_6n", "attn_8k_causal_over_matmul", "act_layer_flash_per_tok_h", "act_total_flash_GB", "act_total_eager_GB",
              "act_ckpt_total_GB", "korthikanti_34_GB", "hfu_ratio_ckpt", "palm_mfu", "palm_hfu_from_t22", "palm_hfu_ours", "l3_step_s_6n",
              "dsv3_mfu_bf16", "anim_peaks_GB", "anim_time_s", "usd_h100", "usd_b200", "gpus_30d_h100", "usd_mtok_b1", "usd_mtok_b64", "ttft_4k_ms"):
        print(k, R[k])
    print("groups", R["saved_groups_h"])
    for T, v in led.items():
        print(T, round(v["traced_total"] / 1e9, 2), "GF/token; over 6N", round(v["traced_over_6n"], 4), "full", round(v["over_6n_full"], 4), "causal", round(v["over_6n_causal"], 4))
    for x in m1:
        print("m1", x["seq"], round(x["median_s"], 3), "mfu", round(x["mfu"], 3), "pred", round(x["pred_s"], 3), "ratio", round(x["pred_ratio"], 3), "h100 ceiling", round(x["h100_ceiling"], 3), x["loads"])
