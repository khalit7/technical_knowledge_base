"""Locate every code quote on the page by pattern, so file names and line numbers are checked, not typed.

transformers v5.20.1 (commit 0ea877911a, the topic's pinned clone in scratch, $LA_SCRATCH/src/transformers) and the
topic's tiny GPT (src/data/tiny_gpt.py). Writes ../inputs/code_quotes.json: per quote, file, first line, lines.
Run: LA_SCRATCH=<scratch>/la python3 extract_code.py
"""
import json, os, subprocess

HERE = os.path.dirname(os.path.abspath(__file__))
TF = os.path.join(os.environ["LA_SCRATCH"], "src", "transformers")
TINY = os.path.abspath(os.path.join(HERE, "..", "..", "..", "src", "data", "tiny_gpt.py"))

Q = [  # id, root, path, first-line pattern, number of lines
    ("swa_mask", TF, "src/transformers/masking_utils.py", "def inner_mask(batch_idx: int, head_idx: int, q_idx: int, kv_idx: int) -> bool:\n        return kv_idx > q_idx - sliding_window", 2),
    ("gemma3_pattern", TF, "src/transformers/models/gemma3/configuration_gemma3.py", '"sliding_attention" if bool((i + 1) % self._sliding_window_pattern)', 1),
    ("gptoss_pattern", TF, "src/transformers/models/gpt_oss/configuration_gpt_oss.py", '"sliding_attention" if bool((i + 1) % 2)', 1),
    ("gptoss_sinks", TF, "src/transformers/models/gpt_oss/modeling_gpt_oss.py", "sinks = module.sinks.reshape(1, -1, 1, 1)", 2),
    ("gptoss_sinks_drop", TF, "src/transformers/models/gpt_oss/modeling_gpt_oss.py", "probs = F.softmax(combined_logits", 2),
    ("qwen3next_gate_split", TF, "src/transformers/models/qwen3_next/modeling_qwen3_next.py", "query_states, gate = torch.chunk(", 3),
    ("qwen3next_gate_apply", TF, "src/transformers/models/qwen3_next/modeling_qwen3_next.py", "attn_output = attn_output * torch.sigmoid(gate)", 3),
    ("diff_lambda_init", TF, "src/transformers/models/diffllama/modeling_diffllama.py", "def lambda_init_fn(layer_idx):", 2),
    ("diff_combine", TF, "src/transformers/models/diffllama/modeling_diffllama.py", "lambda_full = lambda_1 - lambda_2 + self.lambda_init", 3),
    ("dsa_relu", TF, "src/transformers/models/deepseek_v32/modeling_deepseek_v32.py", "scores = F.relu(scores)", 1),
    ("dsa_topk", TF, "src/transformers/models/deepseek_v32/modeling_deepseek_v32.py", "topk = min(self.index_topk, index_scores.shape[-1])", 2),
    ("tiny_mla_cache", None, TINY, "if cache is not None:                                          # cache the latent, not K and V", 5),
    ("tiny_window", None, TINY, "if cfg.window and not (cfg.global_every", 2),
    ("tiny_sink", None, TINY, "if cfg.attn_sink:                                              # an extra column", 3),
]


def main():
    out = {"transformers": "v5.20.1 commit " + subprocess.check_output(["git", "-C", TF, "rev-parse", "--short=10", "HEAD"]).decode().strip(),
           "quotes": {}}
    for qid, root, rel, pat, n in Q:
        p = os.path.join(root, rel) if root else rel
        src = open(p).read()
        i = src.index(pat)
        line = src[:i].count("\n") + 1
        lines = src.splitlines()[line - 1: line - 1 + max(n, pat.count("\n") + 1)]
        ind = min(len(l) - len(l.lstrip()) for l in lines if l.strip())
        out["quotes"][qid] = {"file": rel if root else "src/data/tiny_gpt.py", "line": line,
                              "code": "\n".join(l[ind:] for l in lines)}
        print(qid, out["quotes"][qid]["file"], line)
    json.dump(out, open(os.path.join(HERE, "..", "inputs", "code_quotes.json"), "w"), indent=1)


if __name__ == "__main__":
    main()
