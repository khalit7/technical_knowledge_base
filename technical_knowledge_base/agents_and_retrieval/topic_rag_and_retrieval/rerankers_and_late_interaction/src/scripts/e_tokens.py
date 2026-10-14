"""What one (claim, abstract) pair costs each reranker: tokens per pair and parameters, for the FLOPs model
FLOPs per pair ~ 2 x (non-embedding parameters) x tokens (the attention term is small at a few hundred tokens and is
computed separately). Deterministic, CPU, tokenizers only (no model weights loaded).
Pairs: the 15,076 (claim, abstract) pairs the setup scored with all three rerankers (BM25 top 30 + Qwen3 top 30).
Qwen3-Reranker's input is its chat template (models/Qwen3-Reranker-0.6B/chat_template.jinja) with the SciFact
instruction, as the setup passed it; the BERT-style models see [CLS] claim [SEP] abstract [SEP], cut at 512.
Parameters: counted from each model.safetensors header (exact), embedding matrices separated.
Output: data/tokens.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import struct
import numpy as np
from rrlib import L, DS, r3, save

TEMPLATE = ("<|im_start|>system\nJudge whether the Document meets the requirements based on the Query and the Instruct provided. "
            "Note that the answer can only be \"yes\" or \"no\".<|im_end|>\n<|im_start|>user\n<Instruct>: {i}\n<Query>: {q}\n"
            "<Document>: {d}<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n")


def params(model_dir):
    f = open(os.path.join(model_dir, "model.safetensors"), "rb")
    n = struct.unpack("<Q", f.read(8))[0]
    h = json.loads(f.read(n))
    tot, emb = 0, 0
    for k, v in h.items():
        if k == "__metadata__":
            continue
        c = int(np.prod(v["shape"]))
        tot += c
        if "embed" in k and ("word" in k or "embed_tokens" in k):
            emb += c
    return tot, emb


def main():
    from tokenizers import Tokenizer
    from transformers import AutoTokenizer
    corpus, queries, qrels = L.beir(DS)
    S = L.rerank_scores(DS, "qwen3-reranker-0.6b_top30")
    pairs = [(q, d) for q in S for d in S[q]]
    out = {"n_pairs": len(pairs), "models": {}}
    tmpl = open(os.path.join(L.model_dir("qwen3-reranker-0.6b"), "chat_template.jinja")).read()
    assert "Judge whether the Document meets the requirements" in tmpl
    for key, maxlen in (("ce-minilm-l6", 512), ("bge-reranker-v2-m3", 512), ("qwen3-reranker-0.6b", 1024)):
        tk = AutoTokenizer.from_pretrained(L.model_dir(key))
        if key == "qwen3-reranker-0.6b":
            texts = [TEMPLATE.format(i=L.TASKS[DS], q=queries[q], d=L.doc_text(corpus[d])) for q, d in pairs]
            n = [min(maxlen, len(x)) for x in tk(texts, add_special_tokens=False)["input_ids"]]
            n_claim = [len(x) for x in tk([queries[q] for q, _ in pairs[:2000]], add_special_tokens=False)["input_ids"]]
        else:
            enc = tk([queries[q] for q, _ in pairs], [L.doc_text(corpus[d]) for _, d in pairs], truncation="only_second", max_length=maxlen)
            n = [len(x) for x in enc["input_ids"]]
            n_claim = [len(x) for x in tk([queries[q] for q, _ in pairs[:2000]], add_special_tokens=False)["input_ids"]]
        tot, emb = params(L.model_dir(key))
        cfg = json.load(open(os.path.join(L.model_dir(key), "config.json")))
        layers, hidden = cfg.get("num_hidden_layers"), cfg.get("hidden_size")
        mean_t = float(np.mean(n))
        lin = 2 * (tot - emb) * mean_t
        qdim = cfg.get("num_attention_heads", 0) * cfg.get("head_dim", hidden // max(1, cfg.get("num_attention_heads", 1)))
        att = 4 * layers * qdim * mean_t * mean_t  # QK^T and AV: 2 x 2 x T^2 x (heads x head_dim) per layer
        out["models"][key] = {"tokens_mean": r3(mean_t), "tokens_p50": int(np.median(n)), "tokens_p90": int(np.percentile(n, 90)),
                              "truncated_share": r3(np.mean(np.asarray(n) >= maxlen)), "max_length": maxlen,
                              "claim_tokens_mean": r3(np.mean(n_claim)), "params_total": tot, "params_embedding": emb,
                              "params_non_embedding": tot - emb, "layers": layers, "hidden": hidden, "attn_dim": qdim,
                              "gflop_per_pair_linear": r3(lin / 1e9), "gflop_per_pair_attention": r3(att / 1e9),
                              "gflop_per_pair": r3((lin + att) / 1e9)}
        print(key, out["models"][key])
    # achieved throughput from the setup's measured pairs/s (setup/rerank_timings.jsonl)
    meas = {"ce-minilm-l6": 236.8, "bge-reranker-v2-m3": 14.5, "qwen3-reranker-0.6b": 5.0}
    for k, v in meas.items():
        out["models"][k]["pairs_per_s_measured"] = v
        out["models"][k]["achieved_tflops"] = r3(v * out["models"][k]["gflop_per_pair"] / 1000)
    save("tokens.json", out)


if __name__ == "__main__":
    main()
