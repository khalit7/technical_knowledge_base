"""Contextual chunk prefixes written by the local generator (Anthropic's "contextual retrieval" recipe, prompt quoted
verbatim from https://www.anthropic.com/news/contextual-retrieval, 2024-09-19), on a subset: every 4th QASPER paper
by id, default chunks (fixed-256-32). llama-server keeps the paper's KV cache between the chunks of one paper
(cache_prompt: the local stand-in for prompt caching), so the paper is prefilled about once per paper. Hold the bench lock (llama-server on the GPU).
usage: python -I -B contextual.py [max_papers]
Writes $RAG_SCRATCH/pipe/chunks/ctx_subset.txt, ctx_fixed-256-32.json and ctx_cost.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json, time
from common import L, work
import gen as G
from chunk_eval import read_chunks

PRE = "<document>\n{doc}\n</document>\n"
SUF = ("Here is the chunk we want to situate within the whole document\n<chunk>\n{chunk}\n</chunk>\n"
       "Please give a short succinct context to situate this chunk within the overall document for the purposes of "
       "improving search retrieval of the chunk. Answer only with the succinct context and nothing else.")
docs, qs = L.longdoc()
papers = sorted(d["paper_id"] for d in docs)[::4]
if len(sys.argv) > 1:
    papers = papers[:int(sys.argv[1])]
open(work("chunks", "ctx_subset.txt"), "w").write("\n".join(papers))
text = {d["paper_id"]: d["text"] for d in docs}
_, by = read_chunks("fixed-256-32")
cache = G.Cache("contextual")
outp = work("chunks", "ctx_fixed-256-32.json")
ctx = json.load(open(outp)) if os.path.exists(outp) else {}
cost = {"papers": len(papers), "chunks": 0, "new_tokens_chunks": 0, "out_tokens": 0,
        "chunk_s": 0.0, "would_be_input_tokens_without_cache": 0}
la0 = os.getloadavg(); t0 = time.perf_counter()
for n, p in enumerate(papers):
    st = {}
    for c in by[p]:
        r = G.chat_prefixed(PRE.format(doc=text[p]), SUF.format(chunk=text[p][c["start"]:c["end"]]), cache, st, max_tokens=100, tag=c["cid"])
        ctx[c["cid"]] = r["text"]
        cost["chunks"] += 1; cost["out_tokens"] += r["n_out"]; cost["new_tokens_chunks"] += r.get("n_in_new") or 0
        cost["chunk_s"] += r["seconds"]; cost["would_be_input_tokens_without_cache"] += r["n_in"]
    json.dump(ctx, open(outp, "w"))
    print(n + 1, "/", len(papers), p, len(by[p]), "chunks", round(time.perf_counter() - t0), "s", flush=True)
cost.update(wall_s=round(time.perf_counter() - t0, 1), loadavg_before=[round(x, 2) for x in la0],
            loadavg_after=[round(x, 2) for x in os.getloadavg()], when=time.strftime("%Y-%m-%d %H:%M"), model=G.MODEL_NAME)
json.dump(cost, open(work("chunks", "ctx_cost.json"), "w"), indent=1)
print(json.dumps(cost))
