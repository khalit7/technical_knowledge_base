"""Locate the lines the Inside tab quotes in transformers v5.20.1 (commit 0ea877911a11499053df677befd4b35b172ff502),
by pattern, so the page's file:line references are reproducible. Prints JSON; saved to src/inside/out/source_lines.json.
Run: python3 src/inside/locate_source.py <path to a transformers clone at that commit>
"""
import json, os, sys

ROOT = sys.argv[1]
PATS = [
    ("models/llama/modeling_llama.py", "def eager_attention_forward("),
    ("models/llama/modeling_llama.py", "attn_weights = torch.matmul(query, key_states.transpose(2, 3)) * scaling"),
    ("models/llama/modeling_llama.py", "attn_weights = attn_weights + attention_mask"),
    ("models/llama/modeling_llama.py", "attn_weights = nn.functional.softmax(attn_weights, dim=-1, dtype=torch.float32)"),
    ("models/llama/modeling_llama.py", "return attn_output, attn_weights"),
    ("models/llama/modeling_llama.py", "self.config._attn_implementation, eager_attention_forward"),
    ("models/llama/modeling_llama.py", '"attentions": LlamaAttention,'),
    ("models/llama/modeling_llama.py", "hidden_states = self.norm(hidden_states)"),
    ("models/qwen3/modeling_qwen3.py", "self.q_norm = Qwen3RMSNorm"),
    ("models/qwen3/modeling_qwen3.py", "query_states = self.q_norm("),
    ("integrations/sdpa_attention.py", "def sdpa_attention_forward("),
    ("integrations/sdpa_attention.py", "return attn_output, None"),
]
out = []
for f, p in PATS:
    path = os.path.join(ROOT, "src", "transformers", f)
    hits = [i + 1 for i, line in enumerate(open(path)) if p in line]
    out.append({"file": "src/transformers/" + f, "pattern": p, "lines": hits})
print(json.dumps(out, indent=1))
