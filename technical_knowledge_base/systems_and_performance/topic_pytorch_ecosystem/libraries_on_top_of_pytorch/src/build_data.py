"""Write parts/22_lib_data.js (window.LIB) from inputs/*.json. Plain Python 3. Run after the experiments."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
I = os.path.join(HERE, "inputs")


def J(n):
    return json.load(open(os.path.join(I, n + ".json")))


out = {}

# ---- defaults lab ----
d = J("defaults_lab")
keep = ["plain", "hf_matched", "hf_clip", "hf_sched", "hf_shuffle", "hf_optim", "hf_all", "hf_all_lr", "pl_default", "pl_clip", "acc_default"]
out["dl"] = {"steps": d["steps"], "runs": {k: {"loss": d[k]["loss"], "probe": d[k]["probe"], "lr": d[k]["lr"],
                                               "gn": d[k]["grad_norm_seen_by_step"]} for k in keep},
             "opt": {k: d[k].get("optimizer") for k in keep if d[k].get("optimizer")},
             "sampler": {k: d[k].get("sampler") for k in keep if d[k].get("sampler")},
             "diff": d["diff_vs_plain"], "clip_active": d["clip_active_steps_plain"]}

# ---- accumulation lab ----
a = J("accum_lab")
out["acc"] = {k: a[k] for k in ["lengths", "micro_batch", "accum_steps", "tokens_per_row", "tokens_per_micro", "tokens_total",
                                "loss_ref", "loss_naive", "loss_weighted", "rel_err", "token_weight", "libraries", "curve"]}
out["acc"]["libraries"]["hf_no_kwargs"]["accepts"] = a["hf_no_kwargs"]["model_accepts_loss_kwargs"]
out["acc"]["libraries"]["hf_kwargs"]["accepts"] = a["hf_kwargs"]["model_accepts_loss_kwargs"]

# ---- traces ----
CATS = [
    ("dist", r"torch\.distributed|torch\.nn\.parallel|_c10d"),
    ("optim", r"torch\.optim|clip_grad|foreach_norm"),
    ("data", r"torch\.utils\.data"),
    ("ckpt", r"torch\.utils\.checkpoint"),
    ("amp", r"autocast|torch\.amp|get_autocast"),
    ("compile", r"torch\._dynamo|torch\.compiler|_compile\.|torch\.fx|torch\._library|torch\._ops|torch\.compile"),
    ("autograd", r"Tensor\.backward|torch\.autograd|requires_grad|no_grad|enable_grad|set_grad_enabled"),
    ("module", r"torch\.nn\.modules\.module\.Module\.|torch\.nn\.parameter"),
]
KEY = re.compile(r"DistributedDataParallel\.__init__|\.fully_shard\b|init_device_mesh|init_process_group|clip_grad_norm_|"
                 r"\.(AdamW|Adam|Optimizer)\.step|Optimizer\.zero_grad|Module\.zero_grad|LRScheduler\.step\b|DataLoader\.__init__|"
                 r"autocast\.__init__|create_selective_checkpoint_contexts|checkpoint_wrapper|Tensor\.backward|"
                 r"\.(all_reduce|broadcast|barrier|all_gather\w*|reduce_scatter\w*|allgather\w*)\b|full_tensor|distribute_tensor|"
                 r"set_requires_gradient_sync|set_gradient_divide_factor|torch\.save|torch\.load|manual_seed|MixedPrecisionPolicy|"
                 r"DeviceMesh\.__init__|new_group|_functional_collectives\.\w+|Tensor\.item$|DistributedSampler")


def cat(name):
    for c, rx in CATS:
        if re.search(rx, name):
            return c
    return "maths"


def short(callee):
    s = callee.split("  [via")[0]
    s = s.replace("torch.distributed.distributed_c10d.", "dist.").replace("torch.distributed.fsdp._fully_shard._fully_shard.", "fsdp.")
    s = s.replace("torch.nn.modules.module.", "nn.").replace("torch.utils.data.dataloader.", "data.").replace("torch.optim.", "optim.")
    s = s.replace("torch.distributed.", "dist.").replace("torch.utils.checkpoint.", "checkpoint.").replace("torch.nn.utils.clip_grad.", "nn.utils.")
    return s


def caller_short(c):
    lib, rest = c.split("/", 1)
    rest = re.sub(r"^torchtitan/", "", rest)
    return lib + "/" + rest


def trace(edges):
    tot = {}
    keys = []
    for ph, caller, line, callee, n, first in edges:
        c = cat(callee)
        tot.setdefault(ph, {}).setdefault(c, 0)
        tot[ph][c] += n
        if KEY.search(callee):
            keys.append([ph, caller_short(caller), line, short(callee), n, first])
    keys.sort(key=lambda k: k[5])
    return {"tot": tot, "key": keys[:90], "edges": len(edges)}


T = {}
single = J("calls_single")
for k in ["plain", "hf", "hf_defaults", "accelerate", "lightning"]:
    T[k] = {"losses": single[k]["losses"], **trace(single[k]["edges"]), "procs": 1}
for k in ["acc_ddp", "pl_ddp", "pl_fsdp2", "hf_ddp", "ds_z0", "ds_z1", "ds_z2", "ds_z3", "ds_z3_noclip", "ds_z0_noclip"]:
    x = J("calls_" + k)
    T[k] = {"losses": x["losses"], **trace(x["edges"]), "procs": 2,
            **{e: x[e] for e in ["wrapped", "strategy", "param_types", "engine", "optimizer_wrapper", "gradient_clipping",
                                 "optimizer_state_bytes_rank", "param_bytes_held_rank", "persistent_params", "partitioned_params"] if e in x}}
tt = J("titan")
for k, f in [("titan_1p", "calls_titan_1p"), ("titan_fsdp", "calls_titan_fsdp")]:
    x = J(f)
    run = tt["runs"]["titan_cpu" if k == "titan_1p" else "titan_cpu_fsdp"]
    T[k] = {"losses": run["loss"][:3], **trace(x["edges"]), "procs": 1 if k == "titan_1p" else 2, "steps": len(run["loss"])}
for v in T.values():
    v.setdefault("steps", 3)
out["tr"] = T
out["titan"] = tt
out["hf"] = J("hf_checks")
out["hf"].pop("env", None)
s = "window.LIB=" + json.dumps(out, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "parts", "22_lib_data.js"), "w").write(s)
print("22_lib_data.js", len(s), "bytes")
for k, v in T.items():
    print(k, v["losses"], v["edges"], {p: sum(c.values()) for p, c in v["tot"].items()}, len(v["key"]))
