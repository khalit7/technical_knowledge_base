"""End to end on SciFact: the pipeline retrieves, the local generator answers, and the answer is checked.
Task: given a claim and the top k abstracts, say SUPPORT, CONTRADICT or NOT ENOUGH INFO and cite the abstract relied
on. Gold labels come from the original SciFact release (claims_dev.jsonl = BEIR's test split; downloaded to
$RAG_SCRATCH/pipe/scifact_orig, sha256 in src/pipe/README.md): 124 SUPPORT, 64 CONTRADICT, 112 with no evidence (NEI).
Check (deterministic, no judge): lenient = the label matches; strict = the label matches and, for SUPPORT or
CONTRADICT, the cited abstract is one of the claim's annotated evidence abstracts.
Pipeline: BM25 and Qwen3-Embedding-0.6B top 100 -> RRF (k 60) -> Qwen3-Reranker-0.6B on the top K -> top k.
Conditions: first-stage order (no rerank) and reranked K in KS, k in {1, 3, 5}; closed book (no abstracts);
oracle (only the gold evidence abstracts). Generator: Qwen3-1.7B Q4_K_M in llama-server, greedy (gen.py). Hold the bench lock.
usage: python -I -B e2e_gen.py [--count]   (--count: distinct prompts and tokens, no model)
Writes $RAG_SCRATCH/pipe/e2e_answers.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, re, time
from common import L, work
import fusion as F

KS = [10, 20, 30]
SMALLK = [1, 3, 5]
PROMPT = ("Claim: {claim}\n\nAbstracts:\n{abstracts}\n\nBased only on these abstracts, does the evidence SUPPORT the claim, "
          "CONTRADICT it, or is there NOT ENOUGH INFO? Reply with exactly one line: the label (SUPPORT, CONTRADICT or "
          "NOT ENOUGH INFO) followed by the number of the abstract you relied on in brackets, for example \"SUPPORT [2]\". "
          "Use [0] with NOT ENOUGH INFO.")
P2 = ("Claim: {claim}\n\nAbstracts:\n{abstracts}\n\nDoes the evidence in these abstracts SUPPORT the claim or CONTRADICT it? "
      "Answer NOT ENOUGH INFO only if no abstract addresses the claim. Reply with exactly one line: the label (SUPPORT, CONTRADICT "
      "or NOT ENOUGH INFO) followed by the number of the abstract you relied on in brackets, for example \"SUPPORT [2]\". Use [0] with NOT ENOUGH INFO.")
P3 = ("You are checking a scientific claim against research abstracts.\n\nClaim: {claim}\n\nAbstracts:\n{abstracts}\n\n"
      "If an abstract reports findings that agree with the claim, answer SUPPORT. If an abstract reports findings that disagree with it, "
      "answer CONTRADICT. Only if none of the abstracts is about the claim's subject, answer NOT ENOUGH INFO. Reply with exactly one line: "
      "the label followed by the number of the abstract you relied on in brackets, for example \"CONTRADICT [1]\". Use [0] with NOT ENOUGH INFO.")
PROMPTS = {"p1": PROMPT, "p2": P2, "p3": P3}
# the answer prompt is chosen on SciFact train claims by prompt_tune.py (p1, the first prompt, made the 1.7 B model
# answer NOT ENOUGH INFO even with the gold abstracts in front of it); "-think" variants turn Qwen3's thinking on
_pt = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "prompt_tune.json")
CHOSEN = json.load(open(_pt))["chosen"] if os.path.exists(_pt) else "p1"
THINK = CHOSEN.endswith("-think")
PROMPT = PROMPTS[CHOSEN.replace("-think", "")]
CLOSED = ("Claim: {claim}\n\nFrom what you know, is this claim true (SUPPORT), false (CONTRADICT), or can you not tell "
          "(NOT ENOUGH INFO)? Reply with exactly one of: SUPPORT, CONTRADICT, NOT ENOUGH INFO.")


def gold():
    out = {}
    for l in open(work("scifact_orig", "data", "claims_dev.jsonl")):
        x = json.loads(l)
        labs = {e["label"] for v in x["evidence"].values() for e in v}
        out[str(x["id"])] = {"label": labs.pop() if labs else "NOT ENOUGH INFO", "evidence": sorted(x["evidence"]),
                             "cited": [str(c) for c in x["cited_doc_ids"]]}
    return out


def pipeline():
    corpus, queries, qrels = L.beir("scifact")
    qt = sorted(qrels["test"])
    bm = L.run("scifact", "bm25"); de = L.run("scifact", "qwen3-emb-0.6b")
    hy = {q: list(F.top(F.rrf([list(bm[q]), list(de[q])], 60))) for q in qt}
    from rerank import load_scores
    S = load_scores("qwen3-reranker-0.6b_top30")
    miss = sum(d not in S.get(q, {}) for q in qt for d in hy[q][:max(KS)])
    if miss and "--count" not in sys.argv:
        raise SystemExit("%d hybrid pairs have no reranker score: run rerank_extra.py qwen3-reranker-0.6b hybrid 30" % miss)
    rr = {}
    for K in KS:
        rr[K] = {q: sorted(hy[q][:K], key=lambda d: -S[q].get(d, -1e9)) for q in qt}
    return corpus, queries, qt, hy, rr


def abstracts(corpus, docs):
    return "\n".join("[%d] %s" % (i + 1, L.doc_text(corpus[d]).replace("\n", " ")) for i, d in enumerate(docs))


def parse(t):
    m = re.search(r"NOT ENOUGH INFO|SUPPORT|CONTRADICT", t.upper())
    c = re.search(r"\[(\d+)\]", t)
    return (m.group(0) if m else "UNPARSED"), (int(c.group(1)) if c else None)


def conditions(qt, hy, rr):
    """yield (condition name, qid, list of doc ids or None for closed book)"""
    for q in qt:
        yield "closed", q, None
        for k in SMALLK:
            yield "first@%d" % k, q, hy[q][:k]
            for K in KS:
                yield "rr%d@%d" % (K, k), q, rr[K][q][:k]


if __name__ == "__main__":
    G0 = gold()
    corpus, queries, qt, hy, rr = pipeline()
    conds = list(conditions(qt, hy, rr))
    for q in qt:  # oracle: the gold evidence abstracts only (labelled claims)
        if G0[q]["evidence"]:
            conds.append(("oracle", q, G0[q]["evidence"]))
    distinct = {(q, tuple(d) if d is not None else None) for _, q, d in conds}
    if "--count" in sys.argv:
        from transformers import AutoTokenizer
        import gen
        tok = AutoTokenizer.from_pretrained(L.path("models", "Qwen3-Embedding-0.6B"))  # same vocabulary as the generator
        n = sum(len(tok(PROMPT.format(claim=queries[q], abstracts=abstracts(corpus, d)) if d is not None else CLOSED.format(claim=queries[q]))["input_ids"]) for q, d in distinct)
        print("conditions", len(conds), "distinct prompts", len(distinct), "prompt tokens", n)
        sys.exit(0)
    import gen as G
    cache = G.Cache("e2e")
    out = {"answers": {}, "cost": {}, "prompt": CHOSEN}
    la0 = os.getloadavg(); t0 = time.perf_counter(); tin = tout = 0; secs = 0.0; nnew = 0
    for i, (q, d) in enumerate(sorted(distinct, key=lambda x: (x[0], len(x[1] or ())))):
        p = PROMPT.format(claim=queries[q], abstracts=abstracts(corpus, d)) if d is not None else CLOSED.format(claim=queries[q])
        n0 = len(cache.d)
        r = G.chat(p, cache, max_tokens=700 if THINK else 16, tag=q, think=THINK and d is not None)
        if len(cache.d) > n0:
            nnew += 1; tin += r["n_in"]; tout += r["n_out"]; secs += r["seconds"]
        out["answers"]["%s|%s" % (q, ",".join(d) if d is not None else "closed")] = r["text"]
        if i % 200 == 0:
            print(i, "/", len(distinct), round(time.perf_counter() - t0), "s", flush=True)
    out["conditions"] = [[c, q, d] for c, q, d in conds]
    out["cost"] = {"model": G.MODEL_NAME, "new_prompts": nnew, "tokens_in": tin, "tokens_out": tout, "gen_seconds": round(secs, 1),
                   "wall_s": round(time.perf_counter() - t0, 1), "loadavg_before": [round(x, 2) for x in la0],
                   "loadavg_after": [round(x, 2) for x in os.getloadavg()], "when": time.strftime("%Y-%m-%d %H:%M")}
    json.dump(out, open(work("e2e_answers.json"), "w"))
    print(json.dumps(out["cost"]))
