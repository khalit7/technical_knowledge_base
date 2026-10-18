"""Attention lab: locate the code quoted on the page by pattern and save it with file and line numbers to
inputs/code_snippets.json (durable: the transformers clone lives in scratch). The page part 32_js_at_6code.js
renders from that file through make_page_data.py.

Run: LA_SCRATCH=<scratch>/la python3 extract_code.py
transformers is the shallow clone at v5.20.1 (commit 0ea877911a11499053df677befd4b35b172ff502) made by the setup agent.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
TF = os.path.join(os.environ.get("LA_SCRATCH", ""), "src", "transformers", "src", "transformers")


def grab(path, start_pat, n_lines, label, shown_path):
    lines = open(path).read().split("\n")
    i = next(k for k, l in enumerate(lines) if start_pat in l)
    return {"label": label, "file": shown_path, "first": i + 1, "last": i + n_lines, "code": "\n".join(lines[i:i + n_lines])}


def main():
    sn = []
    tg = os.path.join(SRC, "data", "tiny_gpt.py")
    sn.append(grab(tg, "            if cache is not None:                                          # the KV cache: Hk heads, not H", 6,
                   "The tiny GPT's KV cache for MHA, GQA and MQA: append, then let each KV head serve its group of query heads",
                   "src/data/tiny_gpt.py"))
    sn.append(grab(tg, "            if cache is not None:                                          # cache the latent, not K and V", 7,
                   "MLA in the tiny GPT: the cache holds the latent c and the shared RoPE key, and K, V are rebuilt from it",
                   "src/data/tiny_gpt.py"))
    sn.append(grab(tg, "def kv_cache_bytes_per_token", 14, "The cache arithmetic used for every byte count in this tab", "src/data/tiny_gpt.py"))
    if os.path.isdir(TF):
        sn.append(grab(os.path.join(TF, "models", "llama", "modeling_llama.py"), "def repeat_kv(", 10,
                       "transformers v5.20.1: repeat_kv, which the eager path uses to copy each KV head up to the query heads",
                       "transformers/models/llama/modeling_llama.py"))
        sn.append(grab(os.path.join(TF, "models", "llama", "modeling_llama.py"), "        self.num_key_value_groups = config.num_attention_heads", 1,
                       "transformers v5.20.1: the group size comes straight from the config",
                       "transformers/models/llama/modeling_llama.py"))
        sn.append(grab(os.path.join(TF, "integrations", "sdpa_attention.py"), "    if hasattr(module, \"num_key_value_groups\") and module.num_key_value_groups > 1:", 6,
                       "transformers v5.20.1: the SDPA path passes enable_gqa=True where the backend supports it, and copies otherwise",
                       "transformers/integrations/sdpa_attention.py"))
        sn.append(grab(os.path.join(TF, "integrations", "sdpa_attention.py"), "def use_gqa_in_sdpa(", 8,
                       "transformers v5.20.1: when the SDPA path may skip the copy (MPS needs torch 2.13 or later)",
                       "transformers/integrations/sdpa_attention.py"))
    else:
        old = json.load(open(os.path.join(HERE, "inputs", "code_snippets.json")))["snippets"]
        sn += [s for s in old if s["file"].startswith("transformers/")]
    json.dump({"transformers": "v5.20.1 (0ea877911a11499053df677befd4b35b172ff502)", "snippets": sn},
              open(os.path.join(HERE, "inputs", "code_snippets.json"), "w"), indent=1)
    for s in sn:
        print(s["file"], s["first"], s["last"])


if __name__ == "__main__":
    main()
