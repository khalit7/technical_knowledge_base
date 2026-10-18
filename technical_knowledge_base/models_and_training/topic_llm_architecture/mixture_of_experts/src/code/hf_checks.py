"""Small CPU checks behind the page's "common mistakes" (transformers 5.20.1, torch 2.14.1; tiny random models, seconds).
1. Qwen3MoeConfig() defaults: norm_topk_prob, output_router_logits, router_aux_loss_coef.
2. A tiny Qwen3-MoE: aux_loss with output_router_logits False and True.
3. A tiny DeepSeek-V3: one AdamW step; does e_score_correction_bias move? is there an aux loss?
4. The tiny GPT with top_k larger than n_experts: the real error message.
Run: <venv>/bin/python src/code/hf_checks.py  ->  src/code/out/hf_checks.json
"""
import json, os, sys, traceback
import torch
import transformers
from transformers import Qwen3MoeConfig, Qwen3MoeForCausalLM, DeepseekV3Config, DeepseekV3ForCausalLM

torch.manual_seed(0); torch.set_num_threads(4)
out = {"transformers": transformers.__version__, "torch": torch.__version__}
c = Qwen3MoeConfig()
out["qwen3moe_defaults"] = {k: getattr(c, k) for k in ("norm_topk_prob", "output_router_logits", "router_aux_loss_coef",
                                                       "num_experts", "num_experts_per_tok")}
small = dict(vocab_size=128, hidden_size=64, intermediate_size=128, moe_intermediate_size=32, num_hidden_layers=2,
             num_attention_heads=4, num_key_value_heads=2, head_dim=16, num_experts=8, num_experts_per_tok=2)
ids = torch.randint(0, 128, (2, 16))
q = Qwen3MoeForCausalLM(Qwen3MoeConfig(**small)).eval()
with torch.no_grad():
    a = q(ids, labels=ids)
    b = q(ids, labels=ids, output_router_logits=True)
out["qwen3moe_aux"] = {"aux_loss_default": None if a.aux_loss is None else float(a.aux_loss),
                       "aux_loss_with_output_router_logits": float(b.aux_loss),
                       "loss_default": round(float(a.loss), 4), "loss_with_aux": round(float(b.loss), 4)}
ds = DeepseekV3Config(vocab_size=128, hidden_size=64, intermediate_size=128, moe_intermediate_size=32, num_hidden_layers=2,
                      num_attention_heads=4, num_key_value_heads=4, n_routed_experts=8, num_experts_per_tok=2, n_group=2,
                      topk_group=1, n_shared_experts=1, first_k_dense_replace=1, kv_lora_rank=16, q_lora_rank=32,
                      qk_rope_head_dim=8, qk_nope_head_dim=8, v_head_dim=16)
m = DeepseekV3ForCausalLM(ds).train()
gate = m.model.layers[1].mlp.gate
with torch.no_grad():
    gate.e_score_correction_bias.copy_(torch.linspace(-0.1, 0.1, 8))   # a non-zero "pretrained" bias
before = gate.e_score_correction_bias.clone()
opt = torch.optim.AdamW(m.parameters(), lr=1e-2)
for _ in range(3):
    o = m(ids, labels=ids)
    o.loss.backward(); opt.step(); opt.zero_grad()
out["deepseek_v3_train_steps"] = {"steps": 3, "bias_before": [round(v, 4) for v in before.tolist()],
                                  "bias_after": [round(v, 4) for v in gate.e_score_correction_bias.tolist()],
                                  "bias_changed": bool((before != gate.e_score_correction_bias).any()),
                                  "bias_is_parameter": isinstance(gate.e_score_correction_bias, torch.nn.Parameter),
                                  "has_aux_loss_attr": hasattr(o, "aux_loss") and o.aux_loss is not None}
sys.path.insert(0, os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src", "data")))
from tiny_gpt import GPT, GPTConfig  # noqa: E402
try:
    GPT(GPTConfig(n_experts=4, top_k=6))(torch.zeros(1, 8, dtype=torch.long))
    out["tiny_topk_error"] = None
except Exception as e:  # keep the message only (no paths)
    out["tiny_topk_error"] = f"{type(e).__name__}: {e}"
p = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "hf_checks.json")
json.dump(out, open(p, "w"), indent=1)
print(json.dumps(out, indent=1))
