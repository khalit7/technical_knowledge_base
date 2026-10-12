"""Merge the curated atlas (atlas_a/b/c.py) with the recorded inputs into ../parts/34_js_map_0data.js.
Run: python3 src/map/gen_data.py   (plain Python 3, no third-party packages)."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from atlas_a import A
from atlas_b import B
from atlas_c import REL, EV, REPL
I = os.path.join(HERE, "inputs")
L = lambda f: json.load(open(os.path.join(I, f)))
pypi, gh, scan, deps = L("pypi.json"), L("github_repos.json"), L("source_scan.json"), L("source_deps.json")
chk = {f[:-5]: json.load(open(os.path.join(I, "checks", f))) for f in os.listdir(os.path.join(I, "checks")) if f.endswith(".json")}

SCAN_ID = {"accelerate": "accelerate", "axolotl": "axolotl", "colossalai": "colossalai", "datasets": "datasets", "deepspeed": "deepspeed",
  "executorch": "executorch", "helion": "helion", "kernels": "kernels", "liger_kernel": "liger", "lightning": "lightning",
  "megatron_core": "megatron", "mosaicml": "composer", "nemo_toolkit": "nemo", "peft": "peft", "torchao": "torchao", "torchft": "torchft",
  "torchrec": "torchrec", "torchtitan": "torchtitan", "torchtune": "torchtune", "transformers": "transformers", "trl": "trl",
  "unsloth": "unsloth", "verl": "verl"}
API = [("ddp", "DDP"), ("fsdp1", "FSDP1"), ("fsdp2", "FSDP2 fully_shard"), ("dtensor", "DTensor"), ("mesh", "DeviceMesh"), ("tp", "TP plans"),
  ("pp", "pipelining"), ("cp", "context parallel"), ("dcp", "DCP"), ("compile", "torch.compile"), ("export", "torch.export"),
  ("ckpt", "activation ckpt"), ("sdpa", "SDPA"), ("flex", "FlexAttention"), ("library", "torch.library"), ("afunc", "autograd.Function"),
  ("subclass", "__torch_dispatch__")]
DEPS = ["transformers", "accelerate", "peft", "trl", "datasets", "deepspeed", "megatron", "vllm", "sglang", "torchao", "lightning", "torchtitan",
  "triton", "liger_kernel", "flash_attn", "transformer_engine", "kernels", "bitsandbytes", "ray", "torchdata", "safetensors", "composer", "apex"]

ver_of = {}
atlas = []
for e in A + B:
    e = dict(e)
    p = pypi.get(e.get("pypi") or "", {})
    if p:
        e["ver"], e["date"] = p["version"], (p["date"] or "")[:10]
        e["first"] = (p.get("history") or [[None, None]])[0]
        e["torchreq"] = [r for r in (p.get("torchreq") or []) if "extra ==" not in r][:2]
    g = gh.get(e.get("repo") or "", {}) or next((v for k, v in gh.items() if k.lower().endswith("/" + (e.get("repo") or "x").split("/")[-1].lower())), {})
    if g:
        e["archived"], e["pushed"] = g["archived"], g["pushed"]
    atlas.append(e)

# scan evidence per atlas id: {api: [files, hits, example]}
ev = {}
for lib, rows in scan.items():
    aid = SCAN_ID.get(lib)
    if not aid: continue
    d = {}
    for k, _ in API:
        r = rows.get(k)
        if r and r["files"]:
            ex = (r["ex"] or "")
            ex = re.sub(r"^[^/]*-\d[^/]*/", "", ex)[:150]
            d[k] = [r["files"], r["hits"], ex]
    ev[aid] = d
dp = {SCAN_ID[l]: {k: v for k, v in deps[l].items() if k in DEPS} for l in deps if l in SCAN_ID}

# trim checks to what the page shows
def stack(fr):
    return [[f["file"], f["line"], f["fn"]] for f in fr]
S = chk["stacks"]; SD = chk["stacks_ddp"]["accelerate_ddp_2proc"]
doors = {
  "plain": {"losses": S["plain"]["losses"], "fwd": stack(S["plain"]["forward"]), "step": stack(S["plain"]["step"])},
  "lightning": {"losses": S["lightning"]["losses"], "fwd": stack(S["lightning"]["forward"]), "step": stack(S["lightning"]["step"])},
  "hf": {"losses": S["hf_trainer"]["losses"], "fwd": stack(S["hf_trainer"]["forward"]), "step": stack(S["hf_trainer"]["step"])},
  "acc": {"losses": S["accelerate_1proc"]["losses"], "fwd": stack(S["accelerate_1proc"]["forward"]), "step": stack(S["accelerate_1proc"]["step"])},
  "ddp": {"losses": SD["losses_rank0"], "fwd": stack(SD["forward"]), "step": stack(SD["step"]), "type": SD["prepared_type"], "same": SD["weights_identical_across_ranks_after_3_steps"]},
}
H = chk["hf_lightning"]; T = chk["torchao"]; X = chk["executorch"]; D = chk["dist_wrappers"]
checks = {
  "env": S["env"],
  "torchao": {k: T[k] for k in ["torchao", "config", "after_type", "after_type_mro", "inner", "loss_fp32", "loss_int8wo", "max_abs_logit_diff", "n_linear", "before_bytes_linear"]},
  "peft": H["peft_lora"], "gpt2": H["transformers_gpt2"], "llama_tp": H["transformers_llama_tp_plan"], "trainer": H["trainer"], "trl": H["trl_mro"],
  "lightning": H["lightning"], "versions": H["versions"],
  "executorch": {"export_nodes": X["export"]["call_function_nodes"], "export_ops": X["export"]["first_ops"], "pte_bytes": X["pte_bytes"],
                 "delegates": X["lowered_delegate_calls"], "non_delegated": X["non_delegated_ops"], "runtime": X["runtime"]},
  "dist": D,
  "defaults": {k: v for k, v in chk["defaults"].items() if k in ("hf_trainer", "lightning")},
}
releases = REL
out = {"asof": "2026-10-12", "atlas": atlas, "api": API, "ev": ev, "deps": dp, "depcols": DEPS, "doors": doors, "checks": checks,
       "rel": releases, "events": [list(x) for x in EV], "repl": [list(x) for x in REPL],
       "torchhist": pypi["torch"]["history"]}
js = "/* generated by src/map/gen_data.py from src/map/inputs and atlas_*.py; do not edit by hand */\nwindow.MAPD=" + json.dumps(out, separators=(",", ":"), ensure_ascii=False) + ";\n"
assert ("/" + "Users/") not in js and ("Users" + "-") not in js, "private path leaked"
open(os.path.join(HERE, "..", "parts", "34_js_map_0data.js"), "w").write(js)
print("atlas", len(atlas), "bytes", len(js))
