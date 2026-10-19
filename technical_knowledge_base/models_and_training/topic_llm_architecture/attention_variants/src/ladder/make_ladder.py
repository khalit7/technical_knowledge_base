"""Cache ladder data: one rung per attention design, each read from a real config.json (one what-if rung, labelled).

Each rung is a list of layer groups; each group says what one layer stores per token and what a decoded token reads:
  kind attn: n_kv heads x head_dim keys + values per token; window W (0 = full); n_q query heads (for FLOPs)
  kind mla:  latent d_c + RoPE key d_r per token (absorbed decode: every query head dots with the whole entry);
             optional DSA indexer key (idx_dim) and top-k (topk): all entries stored, only top-k read by attention
  kind comp: DeepSeek-V4 compressed entries: one 512-number entry per `ratio` tokens, plus a 128-token window;
             CSA layers (ratio 4) read the indexer's top-k entries, HCA layers (ratio 128) read all entries
  kind gdn:  Gated DeltaNet linear-attention layer: a fixed state per sequence (fp32 as in the Config calculator)
Bytes use bf16 (2 bytes per number) for every cache entry, windows credited, like the root's Config calculator and
Attention lab. FLOPs are the attention core of one decoded token (scores and weighted sum), 2 per multiply-add.
The page's JavaScript (parts/32_js_ld_1core.js) computes stored and read bytes from these groups; check_ladder.mjs
checks it against the root calculator's CC.cache on the same configs and against the gallery's V4-Pro figure.
Writes ../out/ladder.json and ../parts/32_js_ld_0data.js.
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "src"))
D, M = os.path.join(ROOT, "data", "configs"), os.path.join(ROOT, "map", "inputs", "configs")


def cfg(path):
    c = json.load(open(path))
    return c.get("text_config", c)


def lt_count(c, kind):
    return sum(1 for t in c["layer_types"] if t == kind)


R = []
c = cfg(os.path.join(D, "llama-2-7b.json"))
R.append({"id": "llama2", "name": "Llama 2 7B", "date": "2023-07", "design": "MHA", "src": "src/data/configs/llama-2-7b.json",
          "groups": [{"n": c["num_hidden_layers"], "kind": "attn", "nq": c["num_attention_heads"], "nkv": c["num_key_value_heads"], "hd": 128, "win": 0}]})
c = cfg(os.path.join(D, "llama-3.1-8b.json"))
R.append({"id": "llama31", "name": "Llama 3.1 8B", "date": "2024-07", "design": "GQA-8", "src": "src/data/configs/llama-3.1-8b.json",
          "groups": [{"n": 32, "kind": "attn", "nq": c["num_attention_heads"], "nkv": c["num_key_value_heads"], "hd": c["head_dim"], "win": 0}]})
R.append({"id": "llama31_mqa", "name": "Llama 3.1 8B as MQA (what-if)", "date": "", "design": "MQA", "whatif": True,
          "src": "src/data/configs/llama-3.1-8b.json with num_key_value_heads 1",
          "groups": [{"n": 32, "kind": "attn", "nq": 32, "nkv": 1, "hd": 128, "win": 0}]})
c = cfg(os.path.join(D, "mistral-7b-v0.1.json"))
R.append({"id": "mistral", "name": "Mistral 7B v0.1", "date": "2023-09", "design": "GQA-8, window 4,096 in every layer", "src": "src/data/configs/mistral-7b-v0.1.json",
          "groups": [{"n": 32, "kind": "attn", "nq": 32, "nkv": c["num_key_value_heads"], "hd": 128, "win": c["sliding_window"]}]})
c = cfg(os.path.join(D, "gemma-3-27b.json"))
p, L = c["sliding_window_pattern"], c["num_hidden_layers"]
nglob = sum(1 for i in range(L) if (i + 1) % p == 0)
R.append({"id": "gemma3", "name": "Gemma 3 27B", "date": "2025-03", "design": "GQA-16, 5 local (1,024) : 1 global", "src": "src/data/configs/gemma-3-27b.json",
          "groups": [{"n": L - nglob, "kind": "attn", "nq": 32, "nkv": 16, "hd": 128, "win": c["sliding_window"]},
                     {"n": nglob, "kind": "attn", "nq": 32, "nkv": 16, "hd": 128, "win": 0}]})
c = cfg(os.path.join(D, "gpt-oss-120b.json"))
R.append({"id": "gptoss", "name": "gpt-oss-120b", "date": "2025-08", "design": "GQA-8, 1 local (128) : 1 global, learned sinks", "src": "src/data/configs/gpt-oss-120b.json",
          "groups": [{"n": lt_count(c, "sliding_attention"), "kind": "attn", "nq": 64, "nkv": 8, "hd": 64, "win": c["sliding_window"]},
                     {"n": lt_count(c, "full_attention"), "kind": "attn", "nq": 64, "nkv": 8, "hd": 64, "win": 0}]})
c = cfg(os.path.join(D, "deepseek-v3.json"))
R.append({"id": "dsv3", "name": "DeepSeek-V3", "date": "2024-12", "design": "MLA (latent 512 + RoPE key 64)", "src": "src/data/configs/deepseek-v3.json",
          "groups": [{"n": c["num_hidden_layers"], "kind": "mla", "nq": c["num_attention_heads"], "dc": c["kv_lora_rank"], "dr": c["qk_rope_head_dim"], "idx_dim": 0, "topk": 0}]})
c = cfg(os.path.join(D, "deepseek-v3.2.json"))
R.append({"id": "dsv32", "name": "DeepSeek-V3.2", "date": "2025-12", "design": "MLA + DSA (indexer key 128, top 2,048)", "src": "src/data/configs/deepseek-v3.2.json",
          "groups": [{"n": 61, "kind": "mla", "nq": 128, "dc": 512, "dr": 64, "idx_dim": c["index_head_dim"], "idx_heads": c["index_n_heads"], "topk": c["index_topk"]}]})
c = cfg(os.path.join(M, "zai-org__GLM-5.json"))
R.append({"id": "glm5", "name": "GLM-5", "date": "2026-02", "design": "MLA + DSA (top 2,048)", "src": "src/map/inputs/configs/zai-org__GLM-5.json",
          "groups": [{"n": c["num_hidden_layers"], "kind": "mla", "nq": c["num_attention_heads"], "dc": c["kv_lora_rank"], "dr": c["qk_rope_head_dim"],
                      "idx_dim": c["index_head_dim"], "idx_heads": c["index_n_heads"], "topk": c["index_topk"]}]})
c = cfg(os.path.join(M, "deepseek-ai__DeepSeek-V4-Pro.json"))
cr = c["compress_ratios"] if isinstance(c["compress_ratios"], list) else json.loads(c["compress_ratios"])
cr = cr[: c["num_hidden_layers"]]          # the 62nd entry (0) is the MTP layer
R.append({"id": "dsv4", "name": "DeepSeek-V4-Pro", "date": "2026-04", "design": "compressed: CSA (4 tokens per entry, top 1,024) and HCA (128 per entry), window 128",
          "src": "src/map/inputs/configs/deepseek-ai__DeepSeek-V4-Pro.json",
          "groups": [{"n": cr.count(4), "kind": "comp", "nq": c["num_attention_heads"], "entry": 512, "ratio": 4, "win": c["sliding_window"],
                      "idx_dim": c["index_head_dim"], "idx_heads": c["index_n_heads"], "topk": c["index_topk"]},
                     {"n": cr.count(128), "kind": "comp", "nq": c["num_attention_heads"], "entry": 512, "ratio": 128, "win": c["sliding_window"],
                      "idx_dim": 0, "topk": 0}]})
c = cfg(os.path.join(D, "qwen3-next-80b-a3b.json"))
L, k = c["num_hidden_layers"], c["full_attention_interval"]
R.append({"id": "qwen3next", "name": "Qwen3-Next-80B-A3B", "date": "2025-09", "design": "3 Gated DeltaNet : 1 gated full attention (GQA-2, head 256)",
          "src": "src/data/configs/qwen3-next-80b-a3b.json",
          "groups": [{"n": L - L // k, "kind": "gdn", "state_bytes_layer": None},
                     {"n": L // k, "kind": "attn", "nq": c["num_attention_heads"], "nkv": c["num_key_value_heads"], "hd": c["head_dim"], "win": 0}]})
# Gated DeltaNet state per layer (fp32, 4 bytes) as the Config calculator counts it: state + conv cache
nv, dk, dv, nk, kc = c["linear_num_value_heads"], c["linear_key_head_dim"], c["linear_value_head_dim"], c["linear_num_key_heads"], c["linear_conv_kernel_dim"]
R[-1]["groups"][0]["state_bytes_layer"] = (nv * dk * dv + (2 * nk * dk + nv * dv) * (kc - 1)) * 4

out = {"note": "written by src/ladder/make_ladder.py; do not edit by hand", "bytes_per_number": 2,
       "gpu": {"name": "H100 SXM", "bf16_dense_tflops": 989, "hbm_tb_s": 3.35,
               "src": "NVIDIA H100 datasheet (989 TFLOPS dense BF16 is the sparsity figure 1,979 halved; 3.35 TB/s HBM3), as used across the knowledge base"},
       "rungs": R}
json.dump(out, open(os.path.join(HERE, "..", "out", "ladder.json"), "w"), indent=1)
open(os.path.join(HERE, "..", "parts", "32_js_ld_0data.js"), "w").write(
    "// written by src/ladder/make_ladder.py from real config.json files; do not edit by hand\nwindow.AVL=" + json.dumps(out, separators=(",", ":")) + ";\n")
print(len(R), "rungs")
