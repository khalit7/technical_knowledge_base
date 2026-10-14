"""A cross-encoder by hand (CPU, float32, deterministic): score real (claim, abstract) pairs with
cross-encoder/ms-marco-MiniLM-L6-v2 four ways and check they agree:
  1 sentence-transformers CrossEncoder.predict (the library call the setup used)
  2 transformers AutoModelForSequenceClassification: logits = classifier(pooler([CLS]))
  3 the same written out: BertModel last hidden state [CLS] -> dense -> tanh -> classifier
  4 the score the setup recorded on MPS (data/rerank/scifact/ce-minilm-l6.tsv)
Also records, for the page's cross-encoder animation, what the model sees for claim 1180 and its abstract: the token
sequence with segment ids, and the last layer's attention (mean over heads) from each claim token to the abstract (top 6 abstract tokens and the total share).
Bi-encoder side of the same pair: the Qwen3-Embedding cosine from the stored vectors.
Output: data/ce_manual.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
import torch
from rrlib import L, DS, r3, r4, save



def main():
    torch.set_num_threads(2)
    from sentence_transformers import CrossEncoder
    from transformers import AutoTokenizer, AutoModelForSequenceClassification
    corpus, queries, qrels = L.beir(DS)
    S = L.rerank_scores(DS, "ce-minilm-l6")
    de = L.run(DS, "qwen3-emb-0.6b")
    md = L.model_dir("ce-minilm-l6")
    ce = CrossEncoder(md, device="cpu", max_length=512)
    tok = AutoTokenizer.from_pretrained(md)
    m = AutoModelForSequenceClassification.from_pretrained(md, attn_implementation="eager").eval()
    q0 = "1180"
    cands = list(de[q0])[:10]
    pairs = [(q0, d) for d in cands]
    out = {"model": "cross-encoder/ms-marco-MiniLM-L6-v2", "checks": []}
    for q, d in pairs:
        a, b = queries[q], L.doc_text(corpus[d])
        s1 = float(ce.predict([(a, b)])[0])
        enc = tok(a, b, truncation="only_second", max_length=512, return_tensors="pt")
        with torch.no_grad():
            o = m(**enc, output_attentions=True)
            s2 = float(o.logits[0, 0])
            h = m.bert(**enc).last_hidden_state[:, 0]
            s3 = float(m.classifier(torch.tanh(m.bert.pooler.dense(h)))[0, 0])
        out["checks"].append({"qid": q, "doc": d, "rel": d in qrels["test"][q], "predict": r4(s1), "by_model": r4(s2),
                              "by_hand": r4(s3), "recorded_mps": r4(S[q][d]), "n_tokens": int(enc["input_ids"].shape[1])})
        if d == "31272411":
            ids = enc["input_ids"][0].tolist()
            seg = enc["token_type_ids"][0].tolist()
            att = o.attentions[-1][0].mean(0).numpy()  # [T, T], last layer, mean over heads
            qpos = [i for i, s in enumerate(seg) if s == 0]
            dpos = [i for i, s in enumerate(seg) if s == 1]
            tops = []
            for i in qpos:
                row = att[i, dpos]
                j = np.argsort(-row)[:6]
                tops.append([[int(dpos[k]), r3(row[k])] for k in j] + [r3(row.sum())])
            out["view"] = {"tokens": tok.convert_ids_to_tokens(ids), "segment": seg, "claim_to_doc_top6": tops,
                           "share_to_doc_mean": r3(np.mean([t[-1] for t in tops])), "layers": m.config.num_hidden_layers,
                           "heads": m.config.num_attention_heads}
    ids_, X = L.embeddings(DS, "qwen3-emb-0.6b")
    qi, Q = L.embeddings(DS, "qwen3-emb-0.6b", "queries")
    qv = np.asarray(Q[qi.index(q0)])
    out["bi"] = [{"doc": d, "cos": r4(float(np.asarray(X[ids_.index(d)]) @ qv)), "rel": d in qrels["test"][q0]} for d in cands]
    for c in out["checks"]:
        print(c)
    print("max |predict - by_hand|", max(abs(c["predict"] - c["by_hand"]) for c in out["checks"]),
          "max |predict - recorded|", max(abs(c["predict"] - c["recorded_mps"]) for c in out["checks"]))
    save("ce_manual.json", out)


if __name__ == "__main__":
    main()
