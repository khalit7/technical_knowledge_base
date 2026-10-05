"""Confirm that the numbers written in the page's prose and tables equal out/recompute.json (rounded as printed),
and that the embedded data (window.PMD) is exactly out/recompute.json without the animation steps.
Run from anywhere: python3 check/check_embed.py"""
import json, os, re
here = os.path.dirname(os.path.abspath(__file__))
src = os.path.join(here, "..")
html = open(os.path.join(src, "..", "index.html"), encoding="utf-8").read()
R = json.load(open(os.path.join(src, "out", "recompute.json")))
L = {int(k): v for k, v in R["ledger_l8"].items()}
G = 1e9
f2 = lambda x: f"{x:.2f}"
f1 = lambda x: f"{x:.1f}"
c = lambda x: f"{x:,.0f}"
pc = lambda x, d=1: f"{100 * x:.{d}f}%"
m1 = {r["seq"]: r for r in R["m1"]}
st = R["states"]
need = [
    # section 1
    (f"6N = {L[8192]['six_n'] / G:.1f} GFLOP", "6N"), (f"{L[8192]['traced_total'] / G:.1f} GFLOP at 8,192", "traced 8K, one screen"),
    (f"<b>{L[8192]['traced_total'] / G:.2f}</b>", "ledger total"), (f">{L[8192]['six_n'] / G:.2f}<", "ledger 6N"),
    (f">{L[8192]['proj'] / G:.2f}<", "proj"), (f">{L[8192]['mlp'] / G:.2f}<", "mlp"), (f">{L[8192]['head'] / G:.2f}<", "head"),
    (f">{L[8192]['core_fwd'] / G:.2f}<", "core fwd"), (f">{L[8192]['core_bwd_flash'] / G:.2f}<", "core bwd"),
    (f"(+{pc(L[2048]['traced_over_6n'])} over 6N)", "2K"), (f"at 8,192 attention adds {pc(L[8192]['traced_over_6n'])}", "8K"),
    (f"at 32,768 {round(100 * L[32768]['traced_over_6n'])}%", "32K"),
    (f"attention term is {pc(R['attn_8k_full_over_6n'])} of 6N counted in full, {pc(R['attn_8k_causal_over_matmul'])} of the matmul-only", "conventions"),
    (f"{pc(L[8192]['traced_over_6n'])} above 6N for 8B and {pc(R['l70_traced_over_6n'])} for 70B", "8B and 70B"),
    (f"{R['dsv3_Pact'] / G:.2f}B active, {R['dsv3_dense_equiv_ratio']:.1f} times fewer", "MoE"),
    (f"{L[131072]['traced_total'] / G:.1f} GFLOP per token counted", "128K"), (f"<b>{L[131072]['traced_total'] / L[131072]['six_n']:.1f} times</b>", "128K ratio"),
    (f"alone is {(L[131072]['core_fwd'] + L[131072]['core_bwd_flash']) / G:.0f} GFLOP", "128K core"),
    (f"Its {R['l8_emb'] / 1e6:.0f}M parameters are {pc(R['l8_emb'] / R['l8_P'])} of N", "embedding"),
    # section 2
    (f"{st['l8']['adam16'] / G:.1f} GB</td>", "adam16 8B"), (f"{c(st['l70']['adam16'] / G)} GB", "adam16 70B"),
    (f"{st['l8']['fp32g'] / G:.1f} GB", "fp32g"), (f"{c(st['l70']['fp32g'] / G)} GB", "fp32g 70"), (f"{st['l8']['adam8'] / G:.1f} GB", "adam8"),
    (f"{st['l70']['adam8'] / G:.1f} GB", "adam8 70"), (f"{st['l8']['bf16'] / G:.1f} GB", "bf16"), (f"{st['l70']['bf16'] / G:.1f} GB", "bf16 70"),
    (f"{st['l8']['lora'] / G:.1f} GB", "lora"), (f"{st['l70']['lora'] / G:.1f} GB", "lora 70"), (f"{st['l8']['qlora'] / G:.1f} GB", "qlora"),
    (f"{st['l70']['qlora'] / G:.1f} GB", "qlora 70"),
    (f"{st['l8']['inf_bf16'] / G:.1f} / {st['l8']['inf_fp8'] / G:.1f} / {st['l8']['nvfp4'] / G:.1f} / {st['l8']['mxfp4'] / G:.1f} GB", "inference 8B"),
    (f"{st['l70']['inf_bf16'] / G:.1f} / {st['l70']['inf_fp8'] / G:.1f} / {st['l70']['nvfp4'] / G:.1f} / {st['l70']['mxfp4'] / G:.1f} GB", "inference 70B"),
    (f"LoRA adapters {st['l8']['A'] / 1e6:.1f}M and {st['l70']['A'] / 1e6:.1f}M", "adapters"),
    (f"the 128.5 GB is {R['states_fsdp8_GB']:.1f} GB per GPU", "fsdp8"),
    # section 3
    (f"that is {R['act_layers_flash_GB']:.1f} GB for the 32 layers plus <b>{R['act_post_GB']:.2f} GB for the output</b>", "act layers"),
    (f"Total <b>{R['act_total_flash_GB']:.1f} GB</b>, against the {R['korthikanti_34_GB']:.1f} GB", "act total"),
    (f"{R['act_layer_eager_GB'] - R['act_layer_flash_B'] / G:.1f} GB <i>per layer</i>, {R['act_total_eager_GB']:.0f} GB in all", "eager"),
    (f"6.6 GB, most of it the logits", "ckpt"), (f"{R['act_ckpt_total_GB']:.1f}", "ckpt value"),
    (f"about {round(R['anim_peaks_GB']['eager'], -1):.0f} GB", "anim eager"), (f"about {R['anim_peaks_GB']['flash']:.0f} GB", "anim flash"),
    (f"about {R['anim_peaks_GB']['ckpt']:.0f} GB but", "anim ckpt"),
    (f"{R['act_layer_flash_per_tok_h']:.0f} bytes per token per hidden unit", "49h"),
    # section 4
    (f"<b>{R['hfu_ratio_ckpt']:.2f} times</b>", "hfu ratio"), (f"the recompute is {R['recompute_TF']:.1f} TFLOP, not the layers' full {R['fwd_layers_TF']:.1f} TFLOP forward ({R['down_proj_TF']:.1f} TFLOP", "recompute"),
    (f">{R['palm_tf_tok']:.3f} TFLOP (paper: 3.28)", "palm tf"), (f">{pc(R['palm_mfu'])} (paper: 46.2%)", "palm mfu"),
    (f">{R['palm_hw_tf_tok_ours'] - R['palm_tf_tok']:.3f} TFLOP<", "palm remat"), (f">{pc(R['palm_hfu_ours'])} (paper: 57.8%)", "palm hfu"),
    (f"{R['palm_hw_tf_tok_ours']:.3f} TFLOP, against Table 22", "palm hw"), (f"that is {R['kor_530_ratio']:.3f}", "kor ratio"),
    (f"56.0 &times; 1.017 = {100 * R['kor_530_hfu_from_mfu']:.1f}", "kor hfu"),
    # section 5
    (f">{pc(R['mtnlg_mfu'])}<", "mtnlg"), (f">{pc(R['l3_mfu_430'])}<", "l3"), (f">{pc(R['dsv3_mfu_bf16'])}<", "dsv3"), (f"{pc(R['dsv3_mfu_fp8'])}.", "dsv3 fp8"),
    (f"{c(R['l3_tokens_batch'])} tokens per step", "l3 tokens"), (f"<b>{R['l3_step_s_6n']:.1f} s</b>", "l3 step"), (f"{R['l3_step_s_attn']:.1f} s. Meta", "l3 step attn"),
    (f"({pc(R['l3_attn_share'])} more FLOPs)", "l3 attn"), (f"that is {R['l3_tok_s_gpu']:.0f} tokens per second", "l3 tok/s"),
    (f"an implied {pc(R['card_mfu_l8'])}", "card mfu"),
    # section 7
    (f">{R['ttft_4k_ms']:.1f} ms<", "ttft"), (f"{R['ttft_4k_ms_eff50']:.1f} ms at 50%", "ttft 50"), (f">{R['kv_seq_4k_GB']:.2f} GB<", "kv 4k"),
    (f">{R['tpot_b1_ms']:.2f} ms<", "tpot"), (f"<b>{R['tps_b1']:.0f} tokens/s</b>", "tps b1"), (f">{R['tpot_b64_ms']:.1f} ms<", "tpot 64"),
    (f"{c(R['tps_b64'])} tokens/s in total, {R['tps_b64_seq']:.0f} per user; memory {R['mem_b64_GB']:.1f} GB", "b64"),
    (f">${R['usd_mtok_b1']:.2f} / ${R['usd_mtok_b64']:.2f}<", "usd"), (f"cost {R['usd_mtok_b1'] / R['usd_mtok_b64']:.0f} times less", "usd ratio"),
    (f"{R['ttft_70b_32k_s']:.2f} s before the first token, and attention is {round(100 * R['prefill_70b_32k_attn_share'])}%", "70b prefill"),
    (f"reads {R['dsv3_wread_b1_GB']:.1f} GB of its {R['dsv3_wbytes_GB']:.0f} GB", "dsv3 b1"), (f"touch about {R['dsv3_touched_b64']:.0f} experts", "touched"),
    (f"the step reads {R['dsv3_wread_b64_GB']:.0f} GB", "dsv3 b64"),
    # section 8
    (f">{R['comm_dp8_GB']:.1f} GB; {R['comm_dp8_nvlink_ms']:.1f} ms", "dp"), (f">{R['comm_fsdp8_GB']:.1f} GB (1.5", "fsdp"),
    (f">{R['comm_tp8_layer_mb_GB']:.2f} GB per layer, {R['comm_tp8_step_mb_GB']:.1f} GB", "tp"), (f">{R['comm_pp_mb_MB']:.0f} MB per", "pp"),
    (f"&le; {R['ep_bytes_tok_layer_dsv3'] / 1e3:.0f} KB per token", "ep"),
    # section 9
    (f">{R['gpuh_h100'] / 1e3:.0f}K<", "gpuh h100"), (f">${R['usd_h100'] / 1e6:.2f}M; ${R['usd_h100_good90'] / 1e6:.2f}M with goodput", "usd h100"),
    (f">{R['gpus_30d_h100']:.0f}<", "gpus h100"), (f">{R['gpuh_b200'] / 1e3:.0f}K<", "gpuh b200"),
    (f">${R['usd_b200'] / 1e6:.2f}M; ${R['usd_b200_good90'] / 1e6:.2f}M with goodput", "usd b200"), (f">{R['gpus_30d_b200']:.0f}<", "gpus b200"),
    (f"{R['card_gpuh_l8'] / R['gpuh_h100']:.1f} times our {R['gpuh_h100'] / 1e3:.0f}K: at list price ${R['card_usd_l8'] / 1e6:.1f}M", "card"),
    (f"takes {R['ft_1b_hours']:.1f} hours", "ft hours"), (f"about ${R['ft_1b_usd']:.0f} at list", "ft usd"),
    (f"about {R['serve_capacity_h100']:.0f} H100s at batch 64, or {R['serve_capacity_h100_b1']:.0f} at batch 1", "capacity"),
    # drills
    (f"{L[8192]['six_n'] * 8192 / 1e12:.0f} TFLOP; counted, {R['step_tf_8k']:.0f} TFLOP", "drill 1"), (f"that is {R['anim_time_s']['flash']:.2f} s", "drill 1 time"),
    (f"= {R['act_layer_flash_B'] / G:.2f} GB, &times; 32 layers = {R['act_layers_flash_GB']:.1f} GB", "drill 2"),
    (f"{R['eager_scores_formula_GB']:.1f} GB per layer, {R['eager_scores_per_layer_GB']:.1f} GB counted", "drill 3"),
    (f"= {R['l3_step_s_6n']:.1f} s ({R['l3_step_s_attn']:.1f} s", "drill 5"), (f"= {R['gpus_30d_h100']:.0f} GPUs, about ${R['usd_h100_good90'] / 1e6:.2f}M", "drill 6"),
    (f"{R['dsv3_wread_b64_GB']:.0f} GB, {pc(R['dsv3_wread_b64_GB'] / R['dsv3_wbytes_GB'], 0)} of the weights, against {R['dsv3_wread_b1_GB']:.1f} GB ({pc(R['dsv3_wread_b1_GB'] / R['dsv3_wbytes_GB'])})", "drill 8"),
    # section 6 (M1)
    (f"({R['m1_meta']['params'] / 1e6:.0f}M parameters", "m1 params"),
    (f"{round(100 * min(r['mfu'] for r in R['m1']))} to {round(100 * max(r['mfu'] for r in R['m1']))}% MFU on one GPU", "m1 mfu range"),
    (f"The measurement takes {round(100 * (min(r['pred_ratio'] for r in R['m1']) - 1))} to {round(100 * (max(r['pred_ratio'] for r in R['m1']) - 1))}% longer than the prediction", "m1 pred"),
    (f"first run hit memory swapping ({m1[2048]['run_medians'][0]:.1f} s)", "m1 swap"),
]
bad = 0
for s, what in need:
    if s not in html:
        bad += 1; print("MISSING", what, repr(s))
# the embedded data equal the recompute output
m = re.search(r"window\.PMD=(\{.*?\});\n", html)
R2 = dict(R); R2.pop("anim", None)
emb_ok = m is not None and json.loads(m.group(1)) == json.loads(json.dumps(R2))
if not emb_ok:
    bad += 1; print("MISMATCH window.PMD differs from out/recompute.json")
print(f"check_embed: {len(need) - (bad - (0 if emb_ok else 1))} of {len(need)} prose numbers found; window.PMD {'equals' if emb_ok else 'DIFFERS from'} out/recompute.json")
raise SystemExit(1 if bad else 0)
