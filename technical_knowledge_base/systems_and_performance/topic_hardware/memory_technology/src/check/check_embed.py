"""The built page embeds exactly out/data.json, and the numbers written by hand in the prose agree with it.
Run from anywhere: python3 check_embed.py"""
import json, os, re, statistics as st

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
html = open(os.path.join(os.path.dirname(SRC), "index.html"), encoding="utf-8").read()
data = json.load(open(os.path.join(SRC, "out", "data.json")))
m = re.search(r"window\.MEMD=(\{.*?\});\n", html, re.S)
assert m, "MEMD not found"
emb = json.loads(m.group(1))
assert emb == data, "embedded data differs from out/data.json"
print("embedded data == out/data.json")

N = data["nums"]; M = data["meas"]
g = {p["x"]: p["y"] for p in M["gather"]}
kv = {(k["attn"], k["L"]): k["us"] for k in M["kv"]}
mod = {x["id"]: x for x in data["models"]}
gen = {x["id"]: x for x in data["gens"]}
f0 = lambda v: f"{v:,.0f}"
f1 = lambda v: f"{v:,.1f}"
f2 = lambda v: f"{v:,.2f}"
checks = [  # (text in the page, value, formatter)
    ("bandwidth falls from 1,239 GB/s to 127.5 GB/s", (N["m1_l1_gbs"], N["m1_dram_ws_gbs"]), lambda v: f"bandwidth falls from {f0(v[0])} GB/s to {f1(v[1])} GB/s"),
    ("119 MB of SRAM is 0.149%", (N["h100_onchip_mb"], N["h100_onchip_share_pct"]), lambda v: f"{f0(v[0])} MB of SRAM is {v[1]:.3f}%"),
    ("173 times more", N["horowitz_dram_over_fmul"], lambda v: f"{f0(v)} times more"),
    ("arithmetic grew 12.8&times; and HBM bandwidth 10.8&times;", (N["gen_bf16_x"], N["gen_bw_x"]), lambda v: f"arithmetic grew {f1(v[0])}&times; and HBM bandwidth {f1(v[1])}&times;"),
    ("Capacity grew only 3.6&times;", N["gen_gb_x"], lambda v: f"Capacity grew only {f1(v)}&times;"),
    ("whole 288 GB about 76 times", gen["rubin"]["reads"], lambda v: f"whole 288 GB about {f0(v)} times"),
    ("Blocks of 16 bytes delivered 5.5 GB/s", g[16], lambda v: f"Blocks of 16 bytes delivered {f1(v)} GB/s"),
    ("128-byte blocks 40.7 GB/s, 4 KB blocks 142.9 GB/s", (g[128], g[4096]), lambda v: f"128-byte blocks {f1(v[0])} GB/s, 4 KB blocks {f1(v[1])} GB/s"),
    ("= <b>105 W</b>", N["h100_hbm_w"], lambda v: f"= <b>{f0(v)} W</b>"),
    ("would spend <b>690 W</b>", N["rubin_hbm_w"], lambda v: f"would spend <b>{f0(v)} W</b>"),
    ("about <b>0.50 J</b>", N["l8_token_j"], lambda v: f"about <b>{f2(v)} J</b>"),
    ("50 = <b>119 MB</b>, 0.149%", (N["h100_onchip_mb"], N["h100_onchip_share_pct"]), lambda v: f"50 = <b>{f0(v[0])} MB</b>, {v[1]:.3f}%"),
    ("<b>256 KB to 2 MB</b>579 GB/s at 1 MB", N["m1_l2_gbs"], lambda v: f"<b>256 KB to 2 MB</b>{f0(v)} GB/s at 1 MB"),
    ("<b>4 MB to 32 MB</b>318 GB/s", N["m1_slc_gbs"], lambda v: f"<b>4 MB to 32 MB</b>{f0(v)} GB/s"),
    ("127.5 GB/s; about 467 ns per read (433 to 571 across runs)", (N["m1_dram_ws_gbs"], M["dram_lat"]), lambda v: f"{f1(v[0])} GB/s; about {f0(v[1]['y'])} ns per read ({f0(v[1]['lo'])} to {f0(v[1]['hi'])} across runs)"),
    ("127.5 &times; 467 = <b>60 KB</b>", (N["m1_dram_ws_gbs"], N["m1_dram_lat_ns"], N["m1_inflight_kb"]), lambda v: f"{f1(v[0])} &times; {f0(v[1])} = <b>{f0(v[2])} KB</b>"),
    ("load average 6.1 to 7.5", M["meta"]["load"], lambda v: f"load average {v[0]} to {v[1]}"),
    ("<b>5.23 Gb/s per pin</b>", N["h100_pin_gbps"], lambda v: f"<b>{f2(v)} Gb/s per pin</b>"),
    ("5.3 TB/s = 5.18 Gb/s", N["mi300x_pin_gbps"], lambda v: f"5.3 TB/s = {f2(v)} Gb/s"),
    ("would need 10.7 HBM4 stacks", N["rubin_stacks_at_jedec"], lambda v: f"would need {f1(v)} HBM4 stacks"),
    ("conversation holds 4.29 GB", mod["l8"]["kv"]["32768"] / 1e9, lambda v: f"conversation holds {f2(v)} GB"),
    ("512 KiB per token: 17.18 GB", (mod["l2"]["kv_tok_bf16"] / 1024, mod["l2"]["kv"]["32768"] / 1e9), lambda v: f"{f0(v[0])} KiB per token: {f2(v[1])} GB"),
    ("DeepSeek-V3: 68.6 KiB per token", mod["ds3"]["kv_tok_bf16"] / 1024, lambda v: f"DeepSeek-V3: {f1(v)} KiB per token"),
    ("in FP16) took 4.11 ms", kv[("GQA", 131072)] / 1000, lambda v: f"in FP16) took {f2(v)} ms"),
    ("gives 141 GB/s plus a fixed 0.30 ms", M["kvfit"]["GQA"], lambda v: f"gives {f0(v['gbs'])} GB/s plus a fixed {v['us0']/1000:.2f} ms"),
    ("took 5.9&times; as long (13.0 against 2.2 ms)", (kv[("MHA", 65536)], kv[("GQA", 65536)]), lambda v: f"took {v[0]/v[1]:.1f}&times; as long ({v[0]/1000:.1f} against {v[1]/1000:.1f} ms)"),
    ("at only about 81 GB/s", M["kvfit"]["MHA"]["gbs"], lambda v: f"at only about {f0(v)} GB/s"),
    ("still took 3.66 ms at 128K", kv[("MQA", 131072)] / 1000, lambda v: f"still took {f2(v)} ms at 128K"),
    ('<td class="num" rowspan="3">96.4 GB</td>', N["opt_l8_gb"], lambda v: f'<td class="num" rowspan="3">{f1(v)} GB</td>'),
    ('each way</td><td class="num">1.51 s</td>', N["opt_pcie_s"], lambda v: f'each way</td><td class="num">{f2(v)} s</td>'),
    ('<td class="num">0.21 s</td>', N["opt_c2c_s"], lambda v: f'<td class="num">{f2(v)} s</td>'),
    ('5.76 GB/s measured</td><td class="num">16.7 s</td>', (M["ssd"]["seq_GBs"], N["opt_ssd_s"]), lambda v: f'{f2(v[0])} GB/s measured</td><td class="num">{f1(v[1])} s</td>'),
    ('<td class="num" rowspan="2">10.7 GB</td>', N["l70_kv32k_gb"], lambda v: f'<td class="num" rowspan="2">{f1(v)} GB</td>'),
    ('back into HBM</td><td class="num">168 ms</td>', N["l70_kv32k_pcie_ms"], lambda v: f'back into HBM</td><td class="num">{f0(v)} ms</td>'),
    ('989.5 TFLOP/s)</td><td class="num">9.3 s</td>', N["l70_prefill32k_s"], lambda v: f'989.5 TFLOP/s)</td><td class="num">{f1(v)} s</td>'),
    ("this laptop: 5.8 GB/s sequential", M["ssd"]["seq_GBs"], lambda v: f"this laptop: {f1(v)} GB/s sequential"),
    ("64 &times; 4.29 = 275 GB", mod["l8"]["kv"]["32768"] / 1e9, lambda v: f"64 &times; {f2(v)} = {f0(64*v)} GB"),
    ("room for at most 46 such sequences", (mod["l70"]["wbytes"], mod["l70"]["kv"]["32768"]), lambda v: f"room for at most {int((640e9 - v[0]) // v[1])} such sequences"),
    ("&times; 32,768 = 10.7 GB per sequence", mod["l70"]["kv"]["32768"] / 1e9, lambda v: f"&times; 32,768 = {f1(v)} GB per sequence"),
]
bad = 0
for text, v, fmt in checks:
    want = fmt(v)
    if text not in html:
        print("MISSING in page:", text); bad += 1
    elif want != text:
        print("MISMATCH:", text, "!= data", want); bad += 1
print(len(checks), "prose checks,", bad, "problems")
raise SystemExit(1 if bad else 0)
