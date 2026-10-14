"""Check that the numbers written in the tab's prose match the measured data, and that the page embeds exactly the
data make_data.py writes. usage: python -I -B check_numbers.py  (exit 1 on any mismatch)"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import glob, json, re
from common import OUT, HERE

J = {os.path.basename(p)[:-5]: json.load(open(p)) for p in glob.glob(os.path.join(OUT, "*.json"))}
html = "".join(open(p).read() for p in sorted(glob.glob(os.path.join(HERE, "..", "parts", "31_tab_pip_*.html"))))
F, FT, FI, C, R, Q, E, LA = J["fusion"], J["fusion_tuned"], J["filter"], J["chunking"], J["rerank"], J["qtrans"], J["e2e"], J["latency"]
f3 = lambda x: "%.3f" % x
pc = lambda x: "%.1f%%" % (100 * x)
A = E["agg"]
S = lambda n: F["scifact"]["single"][n]["ndcg10"]
checks = [
    # hybrid
    (f3(S("minilm-l6")) + " to " + f3(F["scifact"]["rrf"]["minilm-l6"]["60"]["ndcg10"]), "MiniLM RRF"),
    (f3(S("qwen3-emb-0.6b")) + " to " + f3(F["scifact"]["rrf"]["qwen3-emb-0.6b"]["60"]["ndcg10"]), "Qwen3 RRF"),
    ("better on %d claims, worse on %d" % (F["scifact"]["wins"]["qwen3-emb-0.6b"]["vs_dense_up"], F["scifact"]["wins"]["qwen3-emb-0.6b"]["vs_dense_down"]), "wins"),
    ("(%s) drops to %s" % (f3(S("gte-modernbert")), f3(F["scifact"]["rrf"]["gte-modernbert"]["60"]["ndcg10"])), "gte"),
    ("(%s) to %s" % (f3(S("colbert-small")), f3(F["scifact"]["rrf"]["colbert-small"]["60"]["ndcg10"])), "colbert"),
    ("scores %s for Qwen3" % f3(FT["scifact"]["models"]["qwen3-emb-0.6b"]["zscore"]["test_ndcg10"]), "z tuned"),
    ("would claim %s" % f3(max(v["ndcg10"] for v in F["scifact"]["zscore"]["qwen3-emb-0.6b"].values())), "z best on test"),
    ("(%s to %s)" % (f3(F["nfcorpus"]["single"]["qwen3-emb-0.6b"]["ndcg10"]), f3(F["nfcorpus"]["rrf"]["qwen3-emb-0.6b"]["60"]["ndcg10"])), "nf rrf"),
    ("dev split gives %s" % f3(FT["nfcorpus"]["models"]["qwen3-emb-0.6b"]["zscore"]["test_ndcg10"]), "nf z"),
    # filter
    ("returns <b>%.2f</b> results" % FI["groups"]["10"]["post"]["10"]["returned_mean"], "filter returned"),
    ("<b>%d</b> of 300 claims" % FI["groups"]["10"]["post"]["10"]["empty"], "filter empty"),
    ("for %d claims, against %d" % (FI["groups"]["10"]["post"]["10"]["hit10"], FI["groups"]["10"]["pre"]["hit10"]), "filter hits"),
    ("but %d claims still" % FI["groups"]["10"]["post"]["100"]["short"], "filter short"),
    ("leaves %d claims short" % FI["groups"]["100"]["post"]["1000"]["short"], "filter 1%"),
    # chunking
    ("keep an evidence paragraph whole for %d of 892" % C["fixed-256-32"]["intact"], "intact fixed"),
    ("keeps %d (%s)" % (C["recursive-256"]["intact"], pc(C["recursive-256"]["intact"] / 892)), "intact rec"),
    ("%s of questions found for fixed windows" % pc(C["fixed-256-32"]["bge-small"]["budget"]["1024"]), "bge fixed budget"),
    ("against %s (recursive)" % pc(C["recursive-256"]["bge-small"]["budget"]["1024"]), "bge rec budget"),
    ("(%s against %s)" % (pc(C["fixed-256-32"]["qwen3-emb-0.6b"]["budget"]["1024"]), pc(C["structure-256"]["qwen3-emb-0.6b"]["budget"]["1024"])), "qwen budget"),
    ("BM25 (%s)" % pc(C["semantic-p95"]["bm25"]["k"]["3"]), "semantic top3"),
    ("budget (%s)" % pc(C["semantic-p95"]["bm25"]["budget"]["1024"]), "semantic budget"),
    ("(%d intact)" % C["semantic-p80"]["intact"], "semantic p80"),
    ("(%d intact)" % C["sentence-256"]["intact"], "sentence"),
    ("BM25 (%s of questions against %s)" % (pc(C["fixed-512-64"]["bm25"]["k"]["3"]), pc(C["structure-256"]["bm25"]["k"]["3"])), "predict 1"),
    ("%s for 512-token chunks against %s" % (pc(C["fixed-512-64"]["bm25"]["budget"]["1024"]), pc(C["structure-256"]["bm25"]["budget"]["1024"])), "predict 2"),
    ("bge-small top 3 %s to %s" % (pc(C["fixed-256-32@sub"]["bge-small"]["k"]["3"]), pc(C["fixed-256-32+ctx"]["bge-small"]["k"]["3"])), "ctx top3"),
    # query rewriting
    ("from 0.700 to %s" % f3(Q["qwen3-emb-0.6b"]["hyde"]["ndcg10"]), "hyde qwen"),
    ("(%s, from %s)" % (f3(Q["bge-small"]["hyde+claim"]["ndcg10"]), f3(Q["bge-small"]["original"]["ndcg10"])), "hyde bge"),
    ("better on %d claims and worse on %d" % (Q["qwen3-emb-0.6b"]["multi-query"]["up"], Q["qwen3-emb-0.6b"]["multi-query"]["down"]), "mq"),
    # rerank
    ("from %s to %s and recall@10" % (f3(R["first"]["hybrid"]["ndcg10"]), f3(R["sweep"]["hybrid"]["qwen3-reranker-0.6b"]["20"]["ndcg10"])), "qwen rr"),
    ("%s at K 30, %s at K 100" % (f3(R["sweep"]["hybrid"]["ce-minilm-l6"]["30"]["ndcg10"]), f3(R["sweep"]["hybrid"]["ce-minilm-l6"]["100"]["ndcg10"])), "ce hurts"),
    # end to end
    ("for %d of 188 claims (r = %s)" % (A["rr30@3"]["in_K"], f3(A["rr30@3"]["r_K"])), "r"),
    ("for %d of those (p = %s)" % (A["rr30@3"]["in_k"], f3(A["rr30@3"]["p_k_given_K"])), "p"),
    ("answers %d correctly (g = %s), so A = %s" % (A["rr30@3"]["correct_strict"], f3(A["rr30@3"]["g"]), f3(A["rr30@3"]["A"])), "g"),
    ("it gets %d of 188" % A["oracle"]["strict"], "oracle"),
    ("for %d claims instead of %d, and %d claims" % (A["first@3"]["in_k"], A["rr30@3"]["in_k"], A["first@3"]["correct_strict"]), "no rerank"),
    ("from %s at k 1 to %s at k 3 and %s at k 5" % (f3(A["rr30@1"]["g"]), f3(A["rr30@3"]["g"]), f3(A["rr30@5"]["g"])), "g by k"),
    ("on %d of 188 claims and can cite" % A["closed"]["lenient"], "closed"),
    ("%d claims get the right label without evidence" % A["rr30@3"]["lenient_without_evidence"], "lucky"),
    ("right on %d of the 188 test claims" % J["e2e_p1"]["agg"]["oracle"]["strict"], "p1 oracle"),
    # latency
    ("BM25 %.2f ms" % LA["stages"]["bm25"]["p50_ms"], "lat bm25"),
    ("costs %d ms" % round(LA["stages"]["embed"]["p50_ms"]), "lat embed"),
    ("%.2f / %.2f s for K 10 / 30; Qwen3-Reranker-0.6B %.2f / %.2f s" % tuple(LA["stages"][k]["p50_ms"] / 1000 for k in ("rerank-bge-reranker-v2-m3-10", "rerank-bge-reranker-v2-m3-30", "rerank-qwen3-reranker-0.6b-10", "rerank-qwen3-reranker-0.6b-30")), "lat rerank"),
    ("takes %.2f s" % E["gen_cost"]["median_s"], "lat gen"),
]
bad = 0
for s, name in checks:
    if s not in html:
        print("MISMATCH", name, "| expected text:", s)
        bad = 1
# the page embeds exactly what make_data.py writes
part = open(os.path.join(HERE, "..", "parts", "31_js_pip_0data.js")).read()
idx = open(os.path.join(HERE, "..", "..", "index.html")).read()
if part.split("window.PIPD=", 1)[1].strip() not in idx:
    print("MISMATCH page does not embed parts/31_js_pip_0data.js"); bad = 1
emb = json.loads(part.split("window.PIPD=", 1)[1].rstrip().rstrip(";"))
for k, v in J.items():
    if k in emb and json.dumps(emb[k], sort_keys=True).replace("—", ": ") != json.dumps(v, sort_keys=True).replace("—", ": "):
        print("MISMATCH embedded", k); bad = 1
print("checks", len(checks), "bad", bad)
sys.exit(bad)
