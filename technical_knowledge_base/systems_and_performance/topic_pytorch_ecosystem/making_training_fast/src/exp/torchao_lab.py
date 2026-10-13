"""torchao 0.18.0 on the running example, CPU (deterministic parts; speed is in time_torchao.py under the bench lock).
1. Post-training weight quantization of the larger variant after 150 training steps: which configs run on this CPU,
   bytes of the linear weights before and after, the tensor subclass that replaces each weight, eval loss change.
2. float8 training with emulate=True (casts and scales exactly as on a GPU, matmuls emulated in float32): losses.
3. QAT: fine-tune with fake int4 weights, then convert, against quantizing the same model after training (PTQ).
    python torchao_lab.py -> inputs/torchao_lab.json
"""
import copy, io, sys, warnings
import torch
import torch.nn as nn
import common
warnings.filterwarnings("ignore")
torch.set_num_threads(4)

from torchao.quantization import (quantize_, Int8WeightOnlyConfig, Int4WeightOnlyConfig, IntxWeightOnlyConfig,
                                  Int8DynamicActivationInt8WeightConfig, Int8DynamicActivationIntxWeightConfig,
                                  Float8WeightOnlyConfig, Float8DynamicActivationFloat8WeightConfig)
from torchao.quantization.granularity import PerGroup, PerAxis


def train(model, cfg, steps, start=0):
    opt = common.make_optimizer(model); losses = []
    for s in range(start, start + steps):
        x, y = common.get_batch(cfg, s); losses.append(float(common.train_step(model, opt, x, y)))
    return losses


@torch.no_grad()
def eval_loss(model, cfg, n=8):
    model.eval(); tot = 0.0
    for s in range(10000, 10000 + n):
        x, y = common.get_batch(cfg, s); tot += float(model(x, y)[1])
    model.train(); return tot / n


def linear_bytes(model):
    """Bytes held by the Linear weights (all inner tensors of a tensor subclass, unique storages)."""
    seen, tot = set(), 0
    def walk(t):
        nonlocal tot
        if hasattr(t, "__tensor_flatten__"):
            names, _ = t.__tensor_flatten__()
            for n in names: walk(getattr(t, n))
            return
        s = t.untyped_storage(); p = s.data_ptr()
        if p not in seen: seen.add(p); tot += s.nbytes()
    for m in model.modules():
        if isinstance(m, nn.Linear): walk(m.weight)
    return tot


def saved_size(model):
    b = io.BytesIO(); torch.save(model.state_dict(), b); return b.tell()


def not_head(m, fqn):
    return isinstance(m, nn.Linear) and fqn != "head"


def ptq(base, cfg):
    x, y = common.get_batch(cfg, 10000)
    with torch.no_grad():
        base.eval(); ref_logits = base(x)[0]; base.train()
    out = [{"config": "float32 (none)", "ok": True, "linear_bytes": linear_bytes(base), "state_dict_bytes": saved_size(base),
            "eval_loss": round(eval_loss(base, cfg), 5), "weight_type": "Parameter"}]
    configs = [("Int8WeightOnlyConfig()", lambda: Int8WeightOnlyConfig()),
               ("Int4WeightOnlyConfig() (tinygemm, plain)", lambda: Int4WeightOnlyConfig()),
               ("IntxWeightOnlyConfig(int4, PerGroup(32))", lambda: IntxWeightOnlyConfig(weight_dtype=torch.int4, granularity=PerGroup(32))),
               ("Int8DynamicActivationInt8WeightConfig()", lambda: Int8DynamicActivationInt8WeightConfig()),
               ("Int8DynamicActivationIntxWeightConfig(int4, PerGroup(32))", lambda: Int8DynamicActivationIntxWeightConfig(weight_dtype=torch.int4, weight_granularity=PerGroup(32))),
               ("Float8WeightOnlyConfig()", lambda: Float8WeightOnlyConfig()),
               ("Float8DynamicActivationFloat8WeightConfig()", lambda: Float8DynamicActivationFloat8WeightConfig())]
    for name, mk in configs:
        m = copy.deepcopy(base); r = {"config": name}
        try:
            quantize_(m, mk(), filter_fn=not_head)
            r["weight_type"] = type(m.blocks[0].mlp.fc.weight).__name__
            with torch.no_grad():
                m.eval(); lg = m(x)[0]
            r["max_abs_logit_diff"] = float((lg - ref_logits).abs().max())
            r["eval_loss"] = round(eval_loss(m, cfg), 5)
            r["linear_bytes"] = linear_bytes(m); r["state_dict_bytes"] = saved_size(m); r["ok"] = True
        except Exception as e:
            r["ok"] = False; r["error"] = f"{type(e).__name__}: {str(e).splitlines()[0][:220]}"
        print(r, file=sys.stderr); out.append(r)
    return out


def float8_emulated(cfg, steps=60):
    from torchao.float8 import convert_to_float8_training, Float8LinearConfig
    res = {}
    m32 = common.make_model(cfg); res["float32"] = train(m32, cfg, steps)
    m8 = common.make_model(cfg)
    # float8 matmuls need both dimensions divisible by 16: the head (256 x 43) is left in float32
    convert_to_float8_training(m8, config=Float8LinearConfig(emulate=True),
                               module_filter_fn=lambda mod, fqn: fqn != "head")
    res["linear_type"] = type(m8.blocks[0].mlp.fc).__name__
    res["float8_emulated"] = train(m8, cfg, steps)
    return res


def qat_vs_ptq(cfg, pre=300, ft=100):
    from torchao.quantization.qat import QATConfig, IntxFakeQuantizeConfig
    base = common.make_model(cfg); pre_losses = train(base, cfg, pre)
    qcfg = IntxWeightOnlyConfig(weight_dtype=torch.int4, granularity=PerGroup(32))
    # A: keep training in float32, then quantize (PTQ)
    a = copy.deepcopy(base); a_l = train(a, cfg, ft, start=pre); a_fp = eval_loss(a, cfg)
    quantize_(a, qcfg, filter_fn=not_head); a_q = eval_loss(a, cfg)
    # B: train the same steps with fake-quantized int4 weights (QAT), then convert
    b = copy.deepcopy(base)
    # QATConfig(base_config) derives the fake-quantize settings from the PTQ config it will convert to
    quantize_(b, QATConfig(qcfg, step="prepare"), filter_fn=not_head)
    fq_type = type(b.blocks[0].mlp.fc).__name__
    b_l = train(b, cfg, ft, start=pre); b_fake = eval_loss(b, cfg)
    quantize_(b, QATConfig(qcfg, step="convert"), filter_fn=not_head); b_q = eval_loss(b, cfg)
    q_type = type(b.blocks[0].mlp.fc.weight).__name__
    return {"pretrain_steps": pre, "finetune_steps": ft, "pretrain_final_loss": round(pre_losses[-1], 5),
            "ptq": {"eval_loss_float32": round(a_fp, 5), "eval_loss_int4": round(a_q, 5), "train_losses_tail": [round(v, 4) for v in a_l[-5:]]},
            "qat": {"fake_quant_module": fq_type, "eval_loss_fake_quant": round(b_fake, 5), "eval_loss_int4": round(b_q, 5), "converted_weight_type": q_type,
                    "train_losses_tail": [round(v, 4) for v in b_l[-5:]]}}


if __name__ == "__main__":
    import json, os
    part = sys.argv[1] if len(sys.argv) > 1 else "all"
    p = os.path.join(common.INPUTS, "torchao_lab.json")
    out = json.load(open(p)) if part != "all" and os.path.exists(p) else {}
    out["env"] = common.env()
    import torchao; out["torchao"] = torchao.__version__
    small = common.cfg("small")
    if part in ("all", "ptq"):
        big = common.cfg("big"); base = common.make_model(big); train(base, big, 150)
        out["ptq_big_after_150_steps"] = ptq(base, big)
    if part in ("all", "f8"):
      try:
        out["float8_emulated_small"] = float8_emulated(small)
      except Exception as e:
        out["float8_emulated_small"] = {"error": f"{type(e).__name__}: {str(e).splitlines()[0][:220]}"}
    if part in ("all", "qat"):
      try:
        out["qat_small"] = qat_vs_ptq(small)
      except Exception as e:
        import traceback; traceback.print_exc()
        out["qat_small"] = {"error": f"{type(e).__name__}: {str(e).splitlines()[0][:220]}"}
      print(out["qat_small"], file=sys.stderr)
    common.dump("torchao_lab.json", out)
