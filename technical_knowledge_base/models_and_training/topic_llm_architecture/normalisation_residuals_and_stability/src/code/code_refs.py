"""Locate every code line the page quotes, by pattern, so the line numbers on the page are checked, not typed.

  python3 code_refs.py <transformers checkout at v5.20.1>   ->  ../out/code_refs.json
Each entry: file (relative to the checkout, or to the knowledge-base page folder for the tiny GPT), first line, the
quoted lines. A pattern that is missing or found twice stops the script.
"""
import json, os, sys

TF = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT_SRC = os.path.abspath(os.path.join(HERE, "..", "..", "..", "src"))
M = "src/transformers/models/"
# key: (base, file, unique start pattern, number of lines)
REFS = {
    "llama_rmsnorm": ("tf", M + "llama/modeling_llama.py", "    def forward(self, hidden_states: torch.Tensor) -> torch.Tensor:\n        input_dtype = hidden_states.dtype", 6),
    "qwen3_qknorm": ("tf", M + "qwen3/modeling_qwen3.py", "        query_states = self.q_norm(self.q_proj(hidden_states).view(hidden_shape)).transpose(1, 2)", 2),
    "qwen3_qknorm_def": ("tf", M + "qwen3/modeling_qwen3.py", "        self.q_norm = Qwen3RMSNorm(self.head_dim", 2),
    "olmo2_qknorm_def": ("tf", M + "olmo2/modeling_olmo2.py", "        self.q_norm = Olmo2RMSNorm(config.num_attention_heads * self.head_dim", 2),
    "olmo2_block": ("tf", M + "olmo2/modeling_olmo2.py", "        hidden_states = self.post_attention_layernorm(hidden_states)\n        hidden_states = residual + hidden_states", 2),
    "olmo2_block_ffn": ("tf", M + "olmo2/modeling_olmo2.py", "        hidden_states = self.post_feedforward_layernorm(hidden_states)\n        hidden_states = residual + hidden_states", 2),
    "gemma3_rmsnorm": ("tf", M + "gemma3/modeling_gemma3.py", "        output = output * (1.0 + self.weight.float())", 1),
    "gemma3_block": ("tf", M + "gemma3/modeling_gemma3.py", "        hidden_states = self.post_attention_layernorm(hidden_states)\n        hidden_states = residual + hidden_states\n\n        residual = hidden_states\n        hidden_states = self.pre_feedforward_layernorm(hidden_states)", 5),
    "gemma2_attn_softcap": ("tf", M + "gemma2/modeling_gemma2.py", "    if softcap is not None:\n        attn_weights = attn_weights / softcap", 4),
    "gemma2_final_softcap": ("tf", M + "gemma2/modeling_gemma2.py", "        if self.config.final_logit_softcapping is not None:", 4),
    "gemma2_config_caps": ("tf", M + "gemma2/configuration_gemma2.py", "    final_logit_softcapping: float | None = 30.0", 2),
    "gpt2_scaled_init": ("tf", M + "gpt2/modeling_gpt2.py", "            std = self.config.initializer_range / math.sqrt(2 * self.config.n_layer)", 2),
    "minimax_deepnorm": ("tf", M + "minimax/modeling_minimax.py", "        hidden_states = residual * self.attn_alpha_factor + hidden_states * self.attn_beta_factor", 2),
    "llama4_l2norm": ("tf", M + "llama4/modeling_llama4.py", "        if hasattr(self, \"qk_norm\"):  # the 128E model does not use qk_norm", 3),
    "gemma4_final_softcap": ("tf", M + "gemma4/modeling_gemma4.py", "        if self.config.final_logit_softcapping is not None:", 4),
    "gemma4_qknorm_def": ("tf", M + "gemma4/modeling_gemma4.py", "        self.q_norm = Gemma4RMSNorm(dim=config.head_dim, eps=config.rms_norm_eps)", 2),
    "dsv4_mhc_layer": ("tf", M + "deepseek_v4/modeling_deepseek_v4.py", "        post, comb, collapsed = self.attn_hc(hidden_states)\n        attn_output, _ = self.self_attn(", 5),
    "dsv4_sinkhorn": ("tf", M + "deepseek_v4/modeling_deepseek_v4.py", "        comb = comb / (comb.sum(dim=-2, keepdim=True) + self.hc_eps)\n        for _ in range(", 4),
    "gemma4_rmsnorm": ("tf", M + "gemma4/modeling_gemma4.py", "            normed_output = normed_output * self.weight.float()", 1),
    "qwen3next_rmsnorm": ("tf", M + "qwen3_next/modeling_qwen3_next.py", "        output = output * (1.0 + self.weight.float())", 1),
    "tiny_block": ("root", "data/tiny_gpt.py", "        if p == \"post\":        # original transformer", 17),
    "tiny_init": ("root", "data/tiny_gpt.py", "            if getattr(m, \"is_residual_out\", False):", 2),
    "tiny_qknorm": ("root", "data/tiny_gpt.py", "            if cfg.qk_norm:\n                q, k = self.q_norm(q), self.k_norm(k)", 2),
}

out = {"transformers_commit": None, "refs": {}}
try:
    out["transformers_commit"] = open(os.path.join(TF, ".git", "HEAD")).read().strip()
    import subprocess
    out["transformers_commit"] = subprocess.check_output(["git", "-C", TF, "rev-parse", "--short=10", "HEAD"]).decode().strip()
    out["transformers_version"] = [l.split('"')[1] for l in open(os.path.join(TF, "src/transformers/__init__.py")) if l.startswith("__version__")][0]
except Exception as e:  # noqa
    print("version lookup failed", e)
for key, (base, f, pat, n) in REFS.items():
    path = os.path.join(TF if base == "tf" else ROOT_SRC, f)
    text = open(path).read()
    c = text.count(pat)
    if c != 1:
        sys.exit(f"{key}: pattern found {c} times in {f}")
    line = text[: text.index(pat)].count("\n") + 1
    lines = text.split("\n")[line - 1: line - 1 + n]
    out["refs"][key] = {"file": f if base == "tf" else "src/" + f, "base": "transformers" if base == "tf" else "root",
                        "line": line, "end": line + n - 1, "code": "\n".join(lines)}
    print(key, f, line)
json.dump(out, open(os.path.join(HERE, "..", "out", "code_refs.json"), "w"), indent=1)
