"""Check that the page embeds exactly the planner's recorded data and that the numbers written in prose match it.
Run after gen_data.py: python3 check_embed.py"""
import json, os, re
from plan import *

H = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(H, "..", "parts")
CAL = json.load(open(os.path.join(H, "out", "calib.json")))
M1 = json.load(open(os.path.join(H, "inputs", "m1_bench.json")))
fails = 0

# 1. the embedded data object is what gen_data.py writes from the reference files
js = open(os.path.join(P, "33_js_plan_0data.js")).read()
D = json.loads(js[js.index("window.PLND=") + len("window.PLND="):].rstrip().rstrip(";"))
for k, m in D["models"].items():
    for f in ("P", "Pact", "Pexp", "kv_el", "kv_full", "kv_slide", "ffa", "emb"):
        if m[f] != MODELS[k][f]:
            print("MODEL MISMATCH", k, f); fails += 1
for k, c in D["chips"].items():
    for f in ("mem", "bw", "price", "util", "lat"):
        if c[f] != CHIPS[k][f]:
            print("CHIP MISMATCH", k, f); fails += 1
if D["calib"] != CAL:
    print("CALIB MISMATCH"); fails += 1
if D["m1"] != M1:
    print("M1 MISMATCH"); fails += 1
for k in ("vllm", "trt", "vllm_l40s"):
    src = {"vllm": "h100", "trt": "h200", "vllm_l40s": "l40s"}[k]
    if D["engines"][k]["eff_c"] != CAL["fits"][src]["eff_c"] or D["engines"][k]["tovh"] != CAL["fits"][src]["tovh"]:
        print("ENGINE MISMATCH", k); fails += 1

# 2. numbers in prose (HTML and the worked-example notes) against data
text = open(os.path.join(P, "33_tab_plan.html")).read() + open(os.path.join(P, "33_js_plan_2ui.js")).read() + open(os.path.join(P, "33_js_plan_4tables.js")).read()
l8 = MODELS["l8"]
wn, we = weight_split(l8, "fp8")
dsv3 = MODELS["dsv3"]
o_ds = dict(DEFAULT, model="dsv3", chip="h100", fmt="native", tp=72, ep=1, kvb=2, P=2000, O=1000, share=0.0, tb=16384, seqs=256)
s_ds = setup(o_ds)
s_chat = setup(DEFAULT)
pub = CAL["pub"]
CLAIMS = [
    ("9.08 GB", (wn + we) / 1e9, 9.08, 0.006),
    ("1.05B BF16", l8["emb"] / 1e9, 1.05, 0.01),
    ("6.98B FP8", (l8["P"] - l8["emb"]) / 1e9, 6.98, 0.01),
    ("3.33 &micro;s", SRC["nvlink_latency"]["value_us"], 3.33, 0),
    ("4.16 bits", INT4_BITS, 4.16, 0.005),
    ("5.25 bits", Q4KM_BITS, 5.25, 0.006),
    ("5,777.08 tokens/s / 45.13 samples/s", 5777.08 / 45.1334, 128.0, 0.0005),
    ("about 28 GB", s_ds["w_gpu"] / 1e9, 28, 0.03),
    ("70 KB per token", HW.kv_per_token(dsv3, 2) / 1e3, 70, 0.01),
    ("2,785 per GPU", 22282 / 8, 2785, 0.0005),
    ("141 GB no longer fits", weight_split(MODELS["l70"], "bf16")[0] / 1e9, 141, 0.002),
    ("about 600 sequences per GPU", pub["h200_srv_qps"] * (pub["h200_ttft_p50"] / 1e3 + 128 * pub["h200_tpot_mean"] / 1e3), 600, 0.05),
    ("mean TPOT of 75 ms", pub["h200_tpot_mean"], 75, 0.01),
    ("20 times the bandwidth", CHIPS["h100"]["bw"] / CHIPS["m1pro"]["bw"], 20, 0.03),
    ("about 200 times the FP16 compute", CHIPS["h100"]["peak"]["bf16"] / CHIPS["m1pro"]["peak"]["bf16"], 200, 0.02),
    ("5.7B of them active", MODELS["oss120"]["Pact"] / 1e9, 5.7, 0.01),
    ("117B parameters", MODELS["oss120"]["P"] / 1e9, 117, 0.005),
    ("405B in FP8 is 406 GB", sum(weight_split(MODELS["l405"], "fp8")) / 1e9, 406, 0.01),
    ("first 1,000 (the system prompt)", DEFAULT["P"] * DEFAULT["share"], 1000, 0),
]
for phrase, val, stated, tol in CLAIMS:
    key = phrase.split(" (")[0]
    present = key.replace("&micro;", "&micro;") in text or key in text
    ok = abs(val - stated) <= tol * max(1, abs(stated)) if tol else abs(val - stated) < 1e-9
    if not ok or not present:
        fails += 1
        print("CLAIM", "missing" if not present else "", phrase, "computed", val, "stated", stated)
print("embed check: data", "ok" if fails == 0 else "FAIL", "; prose claims", len(CLAIMS), "; failures", fails)
