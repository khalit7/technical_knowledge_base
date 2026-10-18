"""What transformers' load_balancing_loss_func (v5.20.1, models/qwen3_moe/modeling_qwen3_moe.py) actually returns, on
hand-made router logits, against the per-layer Switch formula the tiny GPT uses (E * sum_i f_i * P_i with f_i over the
T*k assignments, averaged over layers). CPU, a few milliseconds.

Run: <venv>/bin/python src/code/hf_aux_check.py  ->  src/code/out/hf_aux_check.json
"""
import json, os
import torch
from transformers.models.qwen3_moe.modeling_qwen3_moe import load_balancing_loss_func
import transformers

E, K, T = 8, 2, 4096


def switch_per_layer(logits, k):
    p = logits.softmax(-1)
    top = p.topk(k, -1).indices
    f = torch.bincount(top.flatten(), minlength=logits.shape[-1]).float() / (logits.shape[0] * k)
    return float(logits.shape[-1] * (f * p.mean(0)).sum())


def case(name, layers):
    hf = float(load_balancing_loss_func(tuple(layers), E, K))
    per = [switch_per_layer(l, K) for l in layers]
    return {"case": name, "hf": round(hf, 4), "switch_per_layer": [round(v, 4) for v in per],
            "switch_mean": round(sum(per) / len(per), 4)}


g = torch.Generator().manual_seed(0)
uniform = torch.zeros(T, E) + 1e-3 * torch.randn(T, E, generator=g)          # nearly equal logits: balanced routing
to0 = torch.zeros(T, E); to0[:, 0] = 6.0; to0[:, 1] = 5.0                    # every token picks experts 0 and 1
to1 = torch.zeros(T, E); to1[:, 6] = 6.0; to1[:, 7] = 5.0                    # every token picks experts 6 and 7
res = {"transformers": transformers.__version__, "E": E, "top_k": K, "tokens_per_layer": T, "cases": [
    case("one layer, balanced", [uniform]),
    case("one layer, collapsed onto 2 experts", [to0]),
    case("two layers, both balanced", [uniform, uniform]),
    case("two layers, each collapsed, onto different experts", [to0, to1]),
    case("two layers, each collapsed, onto the same experts", [to0, to0]),
]}
os.makedirs(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out"), exist_ok=True)
json.dump(res, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "hf_aux_check.json"), "w"), indent=1)
for c in res["cases"]:
    print(f'{c["case"]:52s} hf {c["hf"]:7.4f}   switch per layer {c["switch_per_layer"]}  mean {c["switch_mean"]}')
