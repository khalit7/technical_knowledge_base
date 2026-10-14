"""Time to first token against prompt length, and what a cached prefix saves (bench lock; llm.py).
For each generator (Qwen3-1.7B and Qwen3-4B, Q4_K_M, llama-server, Metal): prompts of SciFact abstracts cut to about
N tokens (N = 256 ... 8192) plus one claim, streamed, 64 output tokens, cache_prompt off, 3 repeats with different
abstracts. Then the prefix case: one 4,096-token block of abstracts followed by 5 different claims with cache_prompt
on (the first call fills the cache; the next four reuse it). Output: data/ttft.json"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import numpy as np
from common import L, loadavg, save
import llm

corpus, queries, qrels = L.beir("scifact")
docs = [L.doc_text(d) for d in corpus.values()]
claims = [queries[q] for q in sorted(qrels["test"], key=int)]
NS = [256, 512, 1024, 2048, 4096, 8192]
SYS = "Answer the question using the documents. Be brief."


def block(start, n_chars):
    out, i = [], start
    while sum(len(x) for x in out) < n_chars:
        out.append("[%d] %s" % (len(out) + 1, docs[i % len(docs)])); i += 1
    return "\n\n".join(out)[:n_chars]


res = {"loadavg_start": loadavg(), "models": {}}
for name in llm.MODELS:
    llm.start(name)
    llm.stream_ttft([{"role": "user", "content": "Hello"}])  # warm-up
    rows = []
    for n in NS:
        for rep in range(3):
            msgs = [{"role": "system", "content": SYS},
                    {"role": "user", "content": "Documents:\n" + block(997 * rep + 31 * n, int(n * 4.2)) + "\n\nQuestion: " + claims[rep]}]
            r = llm.stream_ttft(msgs, 64, cache_prompt=False); r.update({"target": n, "rep": rep, "load": loadavg()})
            rows.append(r); print(name, r, flush=True)
    pre = []
    base = block(4242, int(4096 * 4.2))
    for i in range(5):
        msgs = [{"role": "system", "content": SYS}, {"role": "user", "content": "Documents:\n" + base + "\n\nQuestion: " + claims[10 + i]}]
        r = llm.stream_ttft(msgs, 64, cache_prompt=True); r.update({"call": i, "load": loadavg()})
        pre.append(r); print(name, "prefix", r, flush=True)
    llm.stop()
    res["models"][name] = {"sweep": rows, "prefix": pre}
res["loadavg_end"] = loadavg()
save("ttft.json", res)
