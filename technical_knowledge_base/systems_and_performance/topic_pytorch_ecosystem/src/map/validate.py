"""Check that the built page embeds exactly the recorded data and that numbers written in prose match it.
Run after build.sh: python3 src/map/validate.py"""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
data = open(os.path.join(HERE, "..", "parts", "34_js_map_0data.js"), encoding="utf-8").read()
assert data.strip().rstrip(";").split("window.MAPD=", 1)[1] in html, "page does not embed the generated data"
D = json.loads(data.split("window.MAPD=", 1)[1].rstrip().rstrip(";"))
I = os.path.join(HERE, "inputs")
scan = json.load(open(os.path.join(I, "source_scan.json"))); deps = json.load(open(os.path.join(I, "source_deps.json")))
st = json.load(open(os.path.join(I, "checks", "stacks.json")))
fails = []
def eq(name, a, b):
    if a != b: fails.append(f"{name}: page says {a}, data says {b}")
# doors prose
d = D["doors"]
eq("plain frames to forward", 5, len(d["plain"]["fwd"]))
eq("lightning frames to forward", 31, len(d["lightning"]["fwd"]))
eq("HF frames added", 5, len(d["hf"]["fwd"]) - 4)
eq("accelerate 1-proc frames", len(d["plain"]["fwd"]) - 1, len(d["acc"]["fwd"]))
for k in ("lightning", "hf", "acc"): eq("losses " + k, d["plain"]["losses"], d[k]["losses"])
eq("losses equal recorded", d["plain"]["losses"], st["plain"]["losses"])
# prose counts in atlas text
F = lambda lib, k: scan[lib][k]["files"]
P = lambda lib, k: deps[lib].get(k, 0)
claims = [("axolotl transformers", 191, P("axolotl", "transformers")), ("axolotl peft", 42, P("axolotl", "peft")), ("axolotl accelerate", 28, P("axolotl", "accelerate")),
  ("axolotl trl", 26, P("axolotl", "trl")), ("axolotl fully_shard", 7, F("axolotl", "fsdp2")), ("unsloth transformers", 85, P("unsloth", "transformers")),
  ("unsloth triton", 37, P("unsloth", "triton")), ("unsloth compile", 13, F("unsloth", "compile")), ("unsloth library", 17, F("unsloth", "library")), ("unsloth torchao", 19, P("unsloth", "torchao")),
  ("verl megatron", 31, P("verl", "megatron")), ("verl vllm", 18, P("verl", "vllm")), ("verl sglang", 4, P("verl", "sglang")), ("verl ray", 51, P("verl", "ray")),
  ("trl vllm", 5, P("trl", "vllm")), ("transformers kernels", 5, P("transformers", "kernels")), ("nemo lightning", 74, P("nemo_toolkit", "lightning")),
  ("megatron TE", 37, P("megatron_core", "transformer_engine")), ("executorch export", 95, F("executorch", "export")), ("composer fsdp1", 9, F("mosaicml", "fsdp1")),
  ("composer fsdp2", 4, F("mosaicml", "fsdp2")), ("liger afunc", 108, F("liger_kernel", "afunc")), ("deepspeed compile", 4, F("deepspeed", "compile")),
  ("deepspeed fsdp", 0, F("deepspeed", "fsdp1") + F("deepspeed", "fsdp2")), ("datasets any core api", 0, sum(v["files"] for v in scan["datasets"].values()))]
for n, a, b in claims: eq(n, a, b)
c = D["checks"]
eq("peft trainable", c["peft"]["trainable_params"], c["peft"]["trainable_expected"])
eq("gpt2 params", c["gpt2"]["params"], 3186944)
eq("torchao quantized linears", 16, c["torchao"]["n_linear"] - 1)
eq("pte bytes vs 4 x params (MB, 2 dp)", "12.81", f"{c['executorch']['pte_bytes']/1e6:.2f}")
# no leftover markers, no em dash, no private paths
tab = html[html.index('id="t-map"'):]
import getpass
for bad in ["/" + "Users/", "Users" + "-", getpass.getuser(), chr(0x2014), "NaN"]:
    if bad in tab: fails.append("found " + repr(bad))
print("FAIL\n" + "\n".join(fails) if fails else f"ok: {len(claims)+12} checks")
