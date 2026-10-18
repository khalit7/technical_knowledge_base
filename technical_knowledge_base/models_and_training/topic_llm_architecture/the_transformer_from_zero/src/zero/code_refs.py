"""code_refs.py: locate each step of gpt_zero.py in two reference implementations by pattern, so the page's
file:line citations are checked, not typed. nanoGPT (karpathy/nanoGPT, model.py) and transformers v5.20.1
(modeling_llama.py, loss/loss_utils.py), shallow clones in the topic scratch. Writes out/code_refs.json.
Run: python code_refs.py <nanoGPT checkout> <transformers checkout>
"""
import json, os, subprocess, sys

NANO, TF = sys.argv[1], sys.argv[2]
REFS = [  # key, repo root, file, pattern (first line), lines shown
    ("nano_split", NANO, "model.py", "k = k.view(B, T, self.n_head, C // self.n_head).transpose(1, 2)", 3),
    ("nano_scores", NANO, "model.py", "att = (q @ k.transpose(-2, -1)) * (1.0 / math.sqrt(k.size(-1)))", 1),
    ("nano_mask", NANO, "model.py", "att = att.masked_fill(self.bias[:,:,:T,:T] == 0, float('-inf'))", 1),
    ("nano_merge", NANO, "model.py", "y = y.transpose(1, 2).contiguous().view(B, T, C)", 1),
    ("nano_mlp", NANO, "model.py", "self.c_fc    = nn.Linear(config.n_embd, 4 * config.n_embd, bias=config.bias)", 1),
    ("nano_block", NANO, "model.py", "x = x + self.attn(self.ln_1(x))", 2),
    ("nano_tie", NANO, "model.py", "self.transformer.wte.weight = self.lm_head.weight", 1),
    ("nano_init", NANO, "model.py", "torch.nn.init.normal_(p, mean=0.0, std=0.02/math.sqrt(2 * config.n_layer))", 1),
    ("nano_loss", NANO, "model.py", "loss = F.cross_entropy(logits.view(-1, logits.size(-1)), targets.view(-1), ignore_index=-1)", 1),
    ("nano_nonemb", NANO, "model.py", "n_params -= self.transformer.wpe.weight.numel()", 1),
    ("nano_mfu", NANO, "model.py", "flops_per_token = 6*N + 12*L*H*Q*T", 1),
    ("nano_crop", NANO, "model.py", "idx_cond = idx if idx.size(1) <= self.config.block_size else idx[:, -self.config.block_size:]", 1),
    ("hf_scaling", TF, "src/transformers/models/llama/modeling_llama.py", "self.scaling = self.head_dim**-0.5", 1),
    ("hf_softmax", TF, "src/transformers/models/llama/modeling_llama.py", "attn_weights = nn.functional.softmax(attn_weights, dim=-1, dtype=torch.float32)", 1),
    ("hf_mlp", TF, "src/transformers/models/llama/modeling_llama.py", "down_proj = self.down_proj(self.act_fn(self.gate_proj(x)) * self.up_proj(x))", 1),
    ("hf_resid", TF, "src/transformers/models/llama/modeling_llama.py", "hidden_states = residual + hidden_states", 1),
    ("hf_tied", TF, "src/transformers/models/llama/modeling_llama.py", '_tied_weights_keys = {"lm_head.weight": "model.embed_tokens.weight"}', 1),
    ("hf_shift", TF, "src/transformers/loss/loss_utils.py", "shift_labels = labels[..., 1:].contiguous()", 1),
]
out = {"repos": {}, "refs": {}}
for name, root in (("nanoGPT", NANO), ("transformers", TF)):
    sha = subprocess.check_output(["git", "-C", root, "rev-parse", "HEAD"], text=True).strip()
    tag = subprocess.run(["git", "-C", root, "describe", "--tags"], capture_output=True, text=True).stdout.strip()
    out["repos"][name] = {"commit": sha, "tag": tag}
for key, root, f, pat, n in REFS:
    lines = open(os.path.join(root, f)).read().split("\n")
    hits = [i for i, l in enumerate(lines) if pat in l]
    assert len(hits) >= 1, (key, pat)
    i = hits[0]
    out["refs"][key] = {"file": f, "line": i + 1, "end": i + n, "n_hits": len(hits),
                        "repo": "nanoGPT" if root == NANO else "transformers",
                        "text": "\n".join(l.rstrip() for l in lines[i:i + n])}
    print(key, f, i + 1, len(hits))
json.dump(out, open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "code_refs.json"), "w"), indent=1)
