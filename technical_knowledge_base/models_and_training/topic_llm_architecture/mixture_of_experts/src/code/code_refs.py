"""Locate the router, balancing and dispatch lines quoted on the MoE page, by pattern, so the line numbers are checked
against the pinned sources: transformers v5.20.1 (commit 0ea877911a11499053df677befd4b35b172ff502, shallow clone in
$LA_SCRATCH/src/transformers) and the topic's tiny GPT (root src/data/tiny_gpt.py).

Run: LA_SCRATCH=<scratch>/la python3 src/code/code_refs.py   ->  src/code/out/code_refs.json
Each entry: key, file (repo-relative), line, text. Fails loudly if a pattern is missing or matches twice.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TF = os.path.join(os.environ["LA_SCRATCH"], "src", "transformers")
TINY = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data", "tiny_gpt.py"))
M = "src/transformers/models/"
REFS = [
    # (key, file, pattern, nth occurrence (default first and only))
    ("q3_router_class", M + "qwen3_moe/modeling_qwen3_moe.py", "class Qwen3MoeTopKRouter"),
    ("q3_softmax", M + "qwen3_moe/modeling_qwen3_moe.py", "router_probs = torch.nn.functional.softmax(router_logits"),
    ("q3_topk", M + "qwen3_moe/modeling_qwen3_moe.py", "router_top_value, router_indices = torch.topk(router_probs"),
    ("q3_norm", M + "qwen3_moe/modeling_qwen3_moe.py", "router_top_value /= router_top_value.sum"),
    ("q3_onehot", M + "qwen3_moe/modeling_qwen3_moe.py", "expert_mask = torch.nn.functional.one_hot(top_k_index"),
    ("q3_loop", M + "qwen3_moe/modeling_qwen3_moe.py", "for expert_idx in expert_hit:"),
    ("q3_index_add", M + "qwen3_moe/modeling_qwen3_moe.py", "final_hidden_states.index_add_(0, token_idx"),
    ("q3_lbl_def", M + "qwen3_moe/modeling_qwen3_moe.py", "def load_balancing_loss_func("),
    ("q3_lbl_count", M + "qwen3_moe/modeling_qwen3_moe.py", "tokens_per_expert_sum + torch.bincount(selected_experts"),
    ("q3_lbl_norm", M + "qwen3_moe/modeling_qwen3_moe.py", "tokens_per_expert = tokens_per_expert_sum / total_rows"),
    ("q3_lbl_out", M + "qwen3_moe/modeling_qwen3_moe.py", "return overall_loss * num_experts"),
    ("q3_aux_gate", M + "qwen3_moe/modeling_qwen3_moe.py", "if output_router_logits:\n            aux_loss = load_balancing_loss_func("),
    ("q3_aux_add", M + "qwen3_moe/modeling_qwen3_moe.py", "loss += self.router_aux_loss_coef * aux_loss"),
    ("q3_cfg_orl", M + "qwen3_moe/configuration_qwen3_moe.py", "output_router_logits: bool = False"),
    ("q3_cfg_norm", M + "qwen3_moe/configuration_qwen3_moe.py", "norm_topk_prob: bool = False"),
    ("ds_router_class", M + "deepseek_v3/modeling_deepseek_v3.py", "class DeepseekV3TopkRouter"),
    ("ds_bias_buf", M + "deepseek_v3/modeling_deepseek_v3.py", "self.e_score_correction_bias = nn.Buffer"),
    ("ds_fp32", M + "deepseek_v3/modeling_deepseek_v3.py", "router_logits = F.linear(hidden_states.type(torch.float32)"),
    ("ds_sigmoid", M + "deepseek_v3/modeling_deepseek_v3.py", "scores = router_logits.sigmoid()"),
    ("ds_choice", M + "deepseek_v3/modeling_deepseek_v3.py", "scores_for_choice = scores + self.e_score_correction_bias"),
    ("ds_group", M + "deepseek_v3/modeling_deepseek_v3.py", ".topk(2, dim=-1)[0]"),
    ("ds_group_idx", M + "deepseek_v3/modeling_deepseek_v3.py", "group_idx = torch.topk(group_scores, k=self.topk_group"),
    ("ds_mask", M + "deepseek_v3/modeling_deepseek_v3.py", 'scores_for_choice = scores_for_choice.masked_fill(~score_mask.bool(), float("-inf"))'),
    ("ds_topk", M + "deepseek_v3/modeling_deepseek_v3.py", "topk_indices = torch.topk(scores_for_choice, k=self.top_k"),
    ("ds_gather", M + "deepseek_v3/modeling_deepseek_v3.py", "topk_weights = scores.gather(1, topk_indices)"),
    ("ds_scale", M + "deepseek_v3/modeling_deepseek_v3.py", "topk_weights = topk_weights * self.routed_scaling_factor"),
    ("ds_shared", M + "deepseek_v3/modeling_deepseek_v3.py", "hidden_states = hidden_states + self.shared_experts(residuals)"),
    ("ds_keep32", M + "deepseek_v3/modeling_deepseek_v3.py", '_keep_in_fp32_modules_strict = ["e_score_correction_bias"]'),
    ("mx_softmax", M + "mixtral/modeling_mixtral.py", "router_probs = torch.nn.functional.softmax(router_logits.float(), dim=-1)"),
    ("mx_jitter", M + "mixtral/modeling_mixtral.py", "if self.training and self.jitter_noise > 0:"),
    ("go_router_bias", M + "gpt_oss/modeling_gpt_oss.py", "router_logits = F.linear(hidden_states, self.weight, self.bias)"),
    ("go_topk", M + "gpt_oss/modeling_gpt_oss.py", "router_top_value, router_indices = torch.topk(router_logits, self.top_k"),
    ("go_softmax", M + "gpt_oss/modeling_gpt_oss.py", "router_scores = torch.nn.functional.softmax(router_top_value, dim=1"),
    ("l4_topk", M + "llama4/modeling_llama4.py", "router_top_value, router_indices = torch.topk(router_logits, self.top_k, dim=1)"),
    ("l4_sigmoid", M + "llama4/modeling_llama4.py", "router_scores = torch.nn.functional.sigmoid(router_scores.float())"),
    ("v4_hash_doc", M + "deepseek_v4/modeling_deepseek_v4.py", "Hash routing for the first `mlp_layer_types == \"hash_moe\"` MoE layers"),
    ("v4_tid2eid", M + "deepseek_v4/modeling_deepseek_v4.py", "indices = self.tid2eid[input_ids.reshape(-1)].long()"),
    ("v4_scorefn", M + "deepseek_v4/modeling_deepseek_v4.py", "self.score_fn = ACT2FN[config.scoring_func]\n        self.routed_scaling_factor = config.routed_scaling_factor\n        self.e_score_correction_bias"),
    ("v4_topk", M + "deepseek_v4/modeling_deepseek_v4.py", "indices = torch.topk(scores + self.e_score_correction_bias, self.top_k"),
    ("glm_sigmoid", M + "glm4_moe/modeling_glm4_moe.py", "scores = router_logits.sigmoid()"),
    ("nh_sigmoid", M + "nemotron_h/modeling_nemotron_h.py", "scores = router_logits.sigmoid()"),
    ("tg_moe_class", "TINY", "class MoE(nn.Module):"),
    ("tg_router", "TINY", "self.router = nn.Linear(cfg.d_model, E, bias=False)"),
    ("tg_scores", "TINY", 'scores = logits.sigmoid() if cfg.router == "sigmoid" else logits.softmax(-1)'),
    ("tg_sel", "TINY", 'sel = scores + self.e_bias if cfg.balance == "bias" else scores'),
    ("tg_topk", "TINY", "top_i = sel.topk(k, -1).indices"),
    ("tg_renorm", "TINY", "top_w = top_w / top_w.sum(-1, keepdim=True)"),
    ("tg_cap", "TINY", "cap = math.ceil(cfg.capacity_factor * n * k / E)"),
    ("tg_drop", "TINY", "if cap is not None and tok.numel() > cap:"),
    ("tg_aux", "TINY", "aux = E * (f * scores.mean(0)).sum()"),
    ("tg_bias", "TINY", "self.e_bias += cfg.bias_rate * torch.sign(load.float().mean() - load.float())"),
    ("tg_aux_add", "TRAIN", "(loss + cfg.aux_coef * aux if cfg.n_experts and cfg.balance == \"aux\" else loss).backward()"),
]


def find(path, pat):
    s = open(path).read()
    i = s.find(pat)
    if i < 0:
        sys.exit(f"pattern not found in {path}: {pat}")
    if s.find(pat, i + 1) >= 0:
        sys.exit(f"pattern matches twice in {path}: {pat}")
    line = s.count("\n", 0, i) + 1
    return line, s.splitlines()[line - 1].strip()


out = []
for key, f, pat in REFS:
    if f == "TINY":
        path, shown = TINY, "topic_llm_architecture/src/data/tiny_gpt.py"
    elif f == "TRAIN":
        path, shown = os.path.join(os.path.dirname(TINY), "train.py"), "topic_llm_architecture/src/data/train.py"
    else:
        path, shown = os.path.join(TF, f), "transformers/" + f
    line, text = find(path, pat)
    out.append({"key": key, "file": shown, "line": line, "text": text})
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
json.dump({"transformers": "v5.20.1 (0ea877911a11499053df677befd4b35b172ff502)", "refs": out},
          open(os.path.join(HERE, "out", "code_refs.json"), "w"), indent=1)
for r in out:
    print(f'{r["key"]:16s} {r["file"].split("/")[-1]}:{r["line"]}  {r["text"][:90]}')
