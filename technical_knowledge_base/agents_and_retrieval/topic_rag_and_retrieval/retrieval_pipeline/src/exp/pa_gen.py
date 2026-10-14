"""Prompt assembly, measured with the root Pipeline lab's end-to-end task (hold the bench lock).
Task and check are the root's (src/pipe/e2e_gen.py, e2e_eval.py): given a SciFact claim and k abstracts, Qwen3-1.7B
answers SUPPORT / CONTRADICT / NOT ENOUGH INFO and cites one abstract; strict = right label and the cited abstract
is annotated evidence. The answer prompt is the root's chosen prompt (p2, chosen on SciFact train). The 188 test claims
with evidence. Candidates: hybrid RRF -> Qwen3-Reranker-0.6B top 30 (the root's pipeline()).
Experiments
  pos:    the claim's first gold abstract placed at position 1, middle or last among k-1 hard distractors (the
          reranker's highest non-evidence abstracts), k = 5 and 10;
  order:  the real reranked top 5, best first (the root's prompt) vs best last;
  budget: the real reranked top k for k = 1, 3, 5 (the root's runs, reused) and 10;
  cite:   three citation formats on the real top 5: numbered [n] (root), the corpus id [doc 12345], and number plus
          a verbatim quote of the supporting sentence (checked by string match).
usage: python -I -B pa_gen.py [pos|order|budget|cite ...]  (default all). Answers cached; $RAG_SCRATCH/rp/pa_answers.json"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, time
import rp
import rpgen as G

L = rp.L
sys.path.insert(0, os.path.join(rp.ROOT_SRC, "pipe"))
import e2e_gen as E  # noqa: E402  (root: gold(), pipeline(), abstracts(), PROMPT = chosen p2)

CITE_ID = ("Claim: {claim}\n\nAbstracts:\n{abstracts}\n\nDoes the evidence in these abstracts SUPPORT the claim or CONTRADICT it? "
           "Answer NOT ENOUGH INFO only if no abstract addresses the claim. Reply with exactly one line: the label (SUPPORT, CONTRADICT "
           "or NOT ENOUGH INFO) followed by the id of the abstract you relied on in brackets, for example \"SUPPORT [doc 12345]\". Use [doc 0] with NOT ENOUGH INFO.")
CITE_QUOTE = ("Claim: {claim}\n\nAbstracts:\n{abstracts}\n\nDoes the evidence in these abstracts SUPPORT the claim or CONTRADICT it? "
              "Answer NOT ENOUGH INFO only if no abstract addresses the claim. Reply with two lines. Line 1: the label (SUPPORT, CONTRADICT "
              "or NOT ENOUGH INFO) followed by the number of the abstract you relied on in brackets, for example \"SUPPORT [2]\" ([0] with NOT ENOUGH INFO). "
              "Line 2: copy, word for word, the one sentence from that abstract that best supports your answer.")


def abstracts_id(corpus, docs):
    return "\n".join("[doc %s] %s" % (d, L.doc_text(corpus[d]).replace("\n", " ")) for d in docs)


def build():
    G0 = E.gold()
    corpus, queries, qt, hy, rr = E.pipeline()
    claims = [q for q in qt if G0[q]["evidence"]]
    P = {}  # (exp, qid, variant) -> (prompt, docs)
    for q in claims:
        ev = set(G0[q]["evidence"])
        gold = next((d for d in rr[30][q] if d in ev), G0[q]["evidence"][0])
        dis = [d for d in rr[30][q] if d not in ev]
        for k in (5, 10):
            for pos in ("first", "middle", "last"):
                i = {"first": 0, "middle": (k - 1) // 2, "last": k - 1}[pos]
                docs = dis[:k - 1]
                docs = docs[:i] + [gold] + docs[i:]
                P[("pos", q, "k%d-%s" % (k, pos))] = (E.PROMPT.format(claim=queries[q], abstracts=E.abstracts(corpus, docs)), docs)
        top5 = rr[30][q][:5]
        P[("order", q, "best-first")] = (E.PROMPT.format(claim=queries[q], abstracts=E.abstracts(corpus, top5)), top5)
        P[("order", q, "best-last")] = (E.PROMPT.format(claim=queries[q], abstracts=E.abstracts(corpus, top5[::-1])), top5[::-1])
        for k in (1, 3, 5, 10):
            d = rr[30][q][:k]
            P[("budget", q, "k%d" % k)] = (E.PROMPT.format(claim=queries[q], abstracts=E.abstracts(corpus, d)), d)
        P[("cite", q, "number")] = P[("order", q, "best-first")]
        P[("cite", q, "doc-id")] = (CITE_ID.format(claim=queries[q], abstracts=abstracts_id(corpus, top5)), top5)
        P[("cite", q, "number+quote")] = (CITE_QUOTE.format(claim=queries[q], abstracts=E.abstracts(corpus, top5)), top5)
    return G0, corpus, queries, claims, P


def main():
    exps = sys.argv[1:] or ["budget", "order", "cite", "pos"]
    G0, corpus, queries, claims, P = build()
    cache = G.Cache("pa", seed_from="e2e")
    outp = rp.work("pa_answers.json")
    out = json.load(open(outp)) if os.path.exists(outp) else {"answers": {}, "runs": []}
    la0 = os.getloadavg(); t0 = time.perf_counter(); new = 0; secs = 0.0; tin = 0
    for ex in exps:
        keys = sorted([k for k in P if k[0] == ex], key=lambda k: (k[1], k[2]))
        for i, k in enumerate(keys):
            prompt, docs = P[k]
            mx = 120 if k[2] == "number+quote" else 16
            n0 = len(cache.d)
            r = G.chat(prompt, cache, max_tokens=mx, tag="|".join(k))
            if len(cache.d) > n0:
                new += 1; secs += r["seconds"]; tin += r["n_in"]
            out["answers"]["|".join(k)] = {"text": r["text"], "docs": docs, "n_in": r["n_in"], "root_cache": bool(r.get("from_root"))}
            if i % 100 == 0:
                print(ex, i, "/", len(keys), round(time.perf_counter() - t0), "s", flush=True)
                json.dump(out, open(outp, "w"))
    out["runs"].append({"exps": exps, "new_answers": new, "gen_seconds": round(secs, 1), "tokens_in_new": tin, "wall_s": round(time.perf_counter() - t0, 1),
                        "loadavg_before": [round(x, 2) for x in la0], "loadavg_after": [round(x, 2) for x in os.getloadavg()],
                        "when": time.strftime("%Y-%m-%d %H:%M"), "model": G.MODEL_NAME})
    json.dump(out, open(outp, "w"))
    G.stop()
    print(out["runs"][-1])


if __name__ == "__main__":
    main()
