"""Checks: (1) the page embeds exactly the recorded inputs; (2) every number written in the static prose is in the
recorded data or in the short list of constants below (each with its reason). Run after build.sh."""
import json
import os
import re
import sys

H = os.path.dirname(os.path.abspath(__file__))
fail = 0
js = open(os.path.join(H, "parts", "22_tda_data.js")).read()
D = json.loads(js[len("window.TDA="):].rstrip().rstrip(";"))
inp = lambda n: json.load(open(os.path.join(H, "inputs", n)))  # noqa: E731
for key, f in [("ten", "tensors.json"), ("dsp", "dispatch.json"), ("ag", "autograd.json"), ("mod", "module.json"), ("dl", "dataloader.json"),
               ("src", "sources.json"), ("how", "howto.json")] + ([("tim", "timing.json")] if os.path.exists(os.path.join(H, "inputs", "timing.json")) else []):
    if D[key] != inp(f):
        print("EMBED MISMATCH", key, f)
        fail = 1
eng = inp("engine.json")
for v in ["plain", "checkpoint"]:
    if D["eng"]["cpu_" + v]["nodes"] != eng["cpu"][v]["nodes"] or D["eng"]["cpu_" + v]["order"] != eng["cpu"][v]["order"]:
        print("EMBED MISMATCH engine", v)
        fail = 1
for v in ["plain", "offload"]:
    if D["eng"]["mps_" + v]["nodes"] != eng["mps"][v]["nodes"] or D["eng"]["mps_" + v]["dev"] != eng["mps"][v]["mps_bytes_after_forward"]:
        print("EMBED MISMATCH engine mps", v)
        fail = 1
print("embedding: " + ("ok" if not fail else "MISMATCH"))

# every number in the data, as strings in a few formats
nums = set()


def walk(x):
    if x is None or isinstance(x, bool):
        return
    if isinstance(x, (int, float)):
        for s in {str(x), f"{x:,}" if isinstance(x, int) else str(x), f"{x:.2f}", f"{x:.1f}", f"{x:.4f}", f"{x:.6f}", f"{x/1e6:.2f}", f"{x/1e6:.1f}"}:
            nums.add(s)
        return
    if isinstance(x, str):
        for m in re.findall(r"-?\d[\d,]*\.?\d*", x):
            nums.add(m.rstrip(".,"))
        return
    for v in (x.values() if isinstance(x, dict) else x):
        walk(v)


walk(D)
walk(eng)
# root facts quoted here (FACTS.md, stp key) and constants with a stated reason
ROOT = {"3,186,944": "params", "12,747,776": "param bytes", "923": "root step calls", "34.85": "root ckpt", "3.33": "root ckpt", "22.5": "root step",
        "31.6": "root step", "524,288": "MPS contiguous copy per layer (root)", "52": "params", "53": "state_dict", "12.75": "MB params"}
CONST = {"8,192": "8x256x4 bytes", "256": "d_model", "768": "3x256", "64": "T/head dim", "43": "vocab", "11,008": "43x256", "65,504": "fp16 max",
         "65,536": "2^16", "6e-8": "2^-24 approx", "0.0078125": "bf16 eps", "2,000": "growth_interval", "12,791,808": "3,197,952 x 4", "25,495,552": "wrong option, 2x params",
         "1,600": "rounded option", "400,000": "rounded option", "3.19": "params in millions", "1,000": "example", "5": "small", "1.0": "fill", "2.0": "fill",
         "2.14": "version", "2.14.1": "version", "2.9": "version", "2.6": "version", "2026": "year", "2019": "year", "2020": "year", "2026-10-13": "date", "0.5": "fill",
         "6.1e-5": "fp16 normal", "1,329": "data bytes", "301": "300 + 1", "302": "300 + 2", "133": "bf16 subnormal exponent", "149": "fp32 subnormal exponent",
         "1074": "fp64 subnormal exponent", "289": "DispatchKey.h line", "334": "DispatchKey.h line", "645": "checkpoint.py line", "0.7978845608": "sqrt(2/pi), GELU tanh",
         "0.044715": "GELU tanh constant", "6e-4": "running example lr", "0.95": "AdamW beta2 of the running example"}
fails = []
for fn in sorted(os.listdir(os.path.join(H, "parts"))):
    if not fn.endswith(".html") or fn.startswith("01_"):
        continue
    txt = re.sub(r"<style>.*?</style>", " ", open(os.path.join(H, "parts", fn)).read(), flags=re.S)
    txt = re.sub(r"<[^>]+>", " ", txt)
    txt = re.sub(r"\{\{[^}]*\}\}", " ", txt)
    txt = re.sub(r"https?://\S+", " ", txt)
    for m in re.findall(r"(?<![\w.#-])\d[\d,]*(?:\.\d+)?(?:e-?\d+)?", txt):
        m = m.rstrip(",")
        if len(m.replace(",", "").replace(".", "")) < 3 and m not in ("52", "53"):
            continue  # small integers (section numbers, list counts) are not checked
        if m in nums or m in ROOT or m in CONST:
            continue
        fails.append((fn, m))
for f in fails:
    print("NUMBER NOT IN DATA", f)
print("prose numbers: checked, %d not found" % len(fails))
sys.exit(1 if fail or fails else 0)
