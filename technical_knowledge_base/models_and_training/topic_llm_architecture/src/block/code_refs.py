"""Block lab: locate each step of a decoder block in transformers' modeling_llama.py at the pinned version, by pattern,
so the page quotes file and line numbers that a script found rather than typed by hand.

Run: python3 src/block/code_refs.py <path to a transformers checkout at v5.20.1>
Writes src/block/out/code_refs.json (path relative to the checkout, line numbers, the quoted lines).
"""
import json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REL = "src/transformers/models/llama/modeling_llama.py"

# (key, what it is, first-line pattern, number of lines to quote)
STEPS = [
    ("embed", "token ids to vectors: the embedding table", "self.embed_tokens = nn.Embedding(", 1),
    ("embed_call", "the lookup in forward", "inputs_embeds: torch.Tensor = self.embed_tokens(input_ids)", 1),
    ("rmsnorm", "RMSNorm: divide by the root mean square, then a learned gain", "variance = hidden_states.pow(2).mean(-1, keepdim=True)", 3),
    ("mask", "the causal mask, built once per forward and shared by every layer", "causal_mask = create_causal_mask(", 1),
    ("qkv_init", "Q, K and V projections (K and V have num_key_value_heads heads: GQA)", "self.q_proj = nn.Linear(", 9),
    ("scaling", "the 1/sqrt(head_dim) scale", "self.scaling = self.head_dim**-0.5", 1),
    ("split_heads", "project, split into heads, move heads before the sequence", "query_states = self.q_proj(hidden_states).view(hidden_shape).transpose(1, 2)", 3),
    ("rope", "rotate q and k by position (RoPE)", "query_states, key_states = apply_rotary_pos_emb(query_states, key_states, cos, sin)", 1),
    ("kv_cache", "append this step's K and V to the cache", "key_states, value_states = past_key_values.update(", 1),
    ("repeat_kv", "GQA: each KV head serves num_key_value_groups query heads", "key_states = repeat_kv(key, module.num_key_value_groups)", 2),
    ("scores", "scores, causal mask (added as -inf), softmax in float32, weighted sum of V", "attn_weights = torch.matmul(query, key_states.transpose(2, 3)) * scaling", 7),
    ("merge_o", "merge heads and the output projection", "attn_output = attn_output.reshape(*input_shape, -1).contiguous()", 2),
    ("layer_pre_attn", "pre-norm block: norm, attention, residual add", "residual = hidden_states", 13),
    ("layer_ffn", "pre-norm block: norm, MLP, residual add", "# Fully Connected", 5),
    ("mlp_init", "SwiGLU MLP: gate, up and down projections", "self.gate_proj = nn.Linear(", 4),
    ("mlp_forward", "down(act(gate(x)) * up(x))", "down_proj = self.down_proj(self.act_fn(self.gate_proj(x)) * self.up_proj(x))", 1),
    ("final_norm", "final norm after the last block", "hidden_states = self.norm(hidden_states)", 1),
    ("lm_head", "the unembedding (LM head), tied to the embedding when tie_word_embeddings is true", "self.lm_head = nn.Linear(config.hidden_size, config.vocab_size, bias=False)", 1),
    ("tied", "the tie", '_tied_weights_keys = {"lm_head.weight": "model.embed_tokens.weight"}', 1),
    ("logits", "logits for the last positions only", "logits = self.lm_head(hidden_states[:, slice_indices, :])", 1),
]


def main():
    root = sys.argv[1]
    lines = open(os.path.join(root, REL)).read().split("\n")
    sha = subprocess.run(["git", "-C", root, "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    tag = subprocess.run(["git", "-C", root, "describe", "--tags", "--always"], capture_output=True, text=True).stdout.strip()
    out = {"repo": "huggingface/transformers", "version": "v5.20.1", "describe": tag, "commit": sha, "file": REL, "refs": []}
    for key, what, pat, n in STEPS:
        hits = [i for i, l in enumerate(lines) if pat in l]
        assert len(hits) >= 1, (key, pat)
        i = hits[0]
        out["refs"].append({"key": key, "what": what, "line": i + 1, "end": i + n, "text": "\n".join(lines[i:i + n]),
                            "n_hits": len(hits)})
        print(f"{key:15s} {REL}:{i + 1}" + (f"-{i + n}" if n > 1 else "") + ("" if len(hits) == 1 else f"  ({len(hits)} hits, first used)"))
    json.dump(out, open(os.path.join(HERE, "out", "code_refs.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
