"""LLM rerankers with a general local generator (Qwen3-4B Q4_K_M in llama-server, build 11146, Metal, temperature 0,
seed 0, thinking off with an empty <think></think> block): pointwise yes/no logits, pairwise (PRP) and listwise
(RankGPT-style sliding window), on a fixed subset of SciFact test claims and BM25 candidates.
Hold the bench lock (GPU work and timing). Resumable: every call is appended to $RAG_SCRATCH/rr/llm/<method>.jsonl.
usage: python -I -B e_llm.py <point|pair|list> [n_claims]
Server (started separately on this page's port):
  llama-server -m <inf models>/gguf/Qwen3-4B-Q4_K_M.gguf -ngl 99 -c 8192 --port 8340 --seed 0 -np 1"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import re
import time
import urllib.request
from rrlib import L, DS, work

URL = "http://127.0.0.1:8340"
DEPTH_POINT, DEPTH_LIST, DEPTH_PAIR = 20, 20, 10
WIN, STEP = 10, 5
WORDS = 80  # passages cut to their first 80 words in the listwise and pairwise prompts (RankGPT cuts to a token budget too)
TASK = L.TASKS[DS]


def subset():
    _, _, qrels = L.beir(DS)
    return sorted(qrels["test"], key=int)[::3]  # 100 claims


def chat(system, user):
    return ("<|im_start|>system\n" + system + "<|im_end|>\n<|im_start|>user\n" + user +
            "<|im_end|>\n<|im_start|>assistant\n<think>\n\n</think>\n\n")


def post(path, body):
    req = urllib.request.Request(URL + path, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    t0 = time.perf_counter()
    with urllib.request.urlopen(req, timeout=600) as r:
        out = json.loads(r.read())
    out["_wall_s"] = time.perf_counter() - t0
    return out


def complete(prompt, n_predict, n_probs=0):
    body = {"prompt": prompt, "n_predict": n_predict, "temperature": 0, "seed": 0, "cache_prompt": True,
            "n_probs": n_probs, "samplers": ["top_k", "temperature"], "top_k": 1}
    return post("/completion", body)


def first_token_logprobs(res):
    """{token: logprob} for the first generated position (llama-server 'completion_probabilities')."""
    cp = res.get("completion_probabilities") or []
    if not cp:
        return {}
    top = cp[0].get("top_logprobs") or cp[0].get("probs") or []
    out = {}
    for t in top:
        tok = t.get("token", t.get("tok_str"))
        lp = t.get("logprob")
        if lp is None and "prob" in t:
            import math
            lp = math.log(max(t["prob"], 1e-12))
        out[tok] = lp
    return out


def short(text, n=WORDS):
    w = text.split()
    return " ".join(w[:n]) + (" ..." if len(w) > n else "")


def done_keys(path):
    if not os.path.exists(path):
        return set()
    return {json.loads(l)["key"] for l in open(path)}


def log(path, rec):
    with open(path, "a") as f:
        f.write(json.dumps(rec) + "\n")


def timings(r):
    t = r.get("timings", {})
    return {"prompt_n": t.get("prompt_n"), "prompt_ms": t.get("prompt_ms"), "predicted_n": t.get("predicted_n"),
            "predicted_ms": t.get("predicted_ms"), "cache_n": t.get("cache_n"), "wall_s": round(r["_wall_s"], 3)}


SYS_POINT = ("Judge whether the Document meets the requirements based on the Query and the Instruct provided. "
             "Note that the answer can only be \"yes\" or \"no\".")


def run_point(claims, corpus, queries, bm, path):
    have = done_keys(path)
    for q in claims:
        for d in list(bm[q])[:DEPTH_POINT]:
            key = q + ":" + d
            if key in have:
                continue
            user = "<Instruct>: " + TASK + "\n<Query>: " + queries[q] + "\n<Document>: " + L.doc_text(corpus[d])
            r = complete(chat(SYS_POINT, user), 1, n_probs=20)
            lp = first_token_logprobs(r)
            if "yes" not in lp and "no" not in lp:
                sys.exit("no yes/no in the first-token logprobs: " + json.dumps(r)[:600])
            log(path, {"key": key, "q": q, "d": d, "lp_yes": lp.get("yes"), "lp_no": lp.get("no"),
                       "top": sorted(lp.items(), key=lambda x: -(x[1] if x[1] is not None else -99))[:5], **timings(r)})
        print("point", q, flush=True)


SYS_LIST = "You are RankGPT, an intelligent assistant that can rank passages based on their relevancy to the query."


def list_prompt(query, passages):
    n = len(passages)
    u = "I will provide you with %d passages, each indicated by number identifier []. Rank the passages based on their relevance to the query: %s\n\n" % (n, query)
    for i, p in enumerate(passages):
        u += "[%d] %s\n" % (i + 1, p)
    u += ("\nSearch Query: %s\nRank the %d passages above based on their relevance to the search query. The passages should be "
          "listed in descending order using identifiers. The most relevant passages should be listed first. The output format "
          "should be [] > [], e.g., [1] > [2]. Only respond with the ranking results, do not say any word or explain.") % (query, n)
    return chat(SYS_LIST, u)


def parse_perm(text, n):
    seen, out = set(), []
    for m in re.findall(r"\[(\d+)\]", text):
        i = int(m) - 1
        if 0 <= i < n and i not in seen:
            seen.add(i)
            out.append(i)
    missing = [i for i in range(n) if i not in seen]
    return out + missing, len(missing)


def run_list(claims, corpus, queries, bm, path):
    have = done_keys(path)
    for q in claims:
        if q in have:
            continue
        order = list(bm[q])[:DEPTH_LIST]
        calls = []
        start = len(order) - WIN
        while True:  # back to front, as RankGPT
            win = order[start:start + WIN]
            r = complete(list_prompt(queries[q], [short(L.doc_text(corpus[d])) for d in win]), 6 * WIN + 10)
            perm, miss = parse_perm(r.get("content", ""), len(win))
            order[start:start + WIN] = [win[i] for i in perm]
            calls.append({"start": start, "text": r.get("content", "")[:400], "missing": miss, **timings(r)})
            if start == 0:
                break
            start = max(0, start - STEP)
        log(path, {"key": q, "q": q, "order": order, "calls": calls})
        print("list", q, sum(c["wall_s"] for c in calls), flush=True)


SYS_PAIR = "You are a helpful assistant that compares passages for a search query."


def pair_prompt(query, a, b):
    u = ('Given a query "%s", which of the following two passages is more relevant to the query?\n\nPassage A: "%s"\n\n'
         'Passage B: "%s"\n\nOutput Passage A or Passage B:') % (query, a, b)
    return chat(SYS_PAIR, u) + "Passage"


def run_pair(claims, corpus, queries, bm, path, passes=2):
    """PRP-Sliding: `passes` bubble passes from the bottom of the top DEPTH_PAIR; each comparison asked in both
    orders; swap only when both orders prefer the lower passage (ties keep the first stage's order)."""
    have = done_keys(path)
    for q in claims:
        if q in have:
            continue
        order = list(bm[q])[:DEPTH_PAIR]
        calls = []
        for p in range(passes):
            for i in range(len(order) - 1, p, -1):
                up, lo = order[i - 1], order[i]
                pa = short(L.doc_text(corpus[up])); pb = short(L.doc_text(corpus[lo]))
                r1 = complete(pair_prompt(queries[q], pa, pb), 1, n_probs=10)
                r2 = complete(pair_prompt(queries[q], pb, pa), 1, n_probs=10)
                l1, l2 = first_token_logprobs(r1), first_token_logprobs(r2)
                if not ({" A", " B"} & set(l1)) or not ({" A", " B"} & set(l2)):
                    sys.exit("no A/B in the first-token logprobs: " + json.dumps(r1)[:600])
                pref1 = l1.get(" B", -99) > l1.get(" A", -99)   # lower passage (B) preferred
                pref2 = l2.get(" A", -99) > l2.get(" B", -99)   # lower passage (now A) preferred
                if pref1 and pref2:
                    order[i - 1], order[i] = lo, up
                calls.append({"i": i, "pref": [pref1, pref2], "tok1": r1.get("content"), "tok2": r2.get("content"),
                              **{k + "1": v for k, v in timings(r1).items()}, **{k + "2": v for k, v in timings(r2).items()}})
        log(path, {"key": q, "q": q, "order": order, "calls": calls})
        print("pair", q, round(sum(c["wall_s1"] + c["wall_s2"] for c in calls), 1), flush=True)


def main():
    method = sys.argv[1]
    n = int(sys.argv[2]) if len(sys.argv) > 2 else None
    corpus, queries, qrels = L.beir(DS)
    bm = L.run(DS, "bm25")
    claims = subset()
    if n:
        claims = claims[:n]
    path = work("llm", method + ".jsonl")
    la0 = os.getloadavg()
    t0 = time.perf_counter()
    {"point": run_point, "list": run_list, "pair": run_pair}[method](claims, corpus, queries, bm, path)
    rec = {"method": method, "claims": len(claims), "seconds": round(time.perf_counter() - t0, 1),
           "loadavg_before": [round(x, 2) for x in la0], "loadavg_after": [round(x, 2) for x in os.getloadavg()],
           "when": time.strftime("%Y-%m-%d %H:%M")}
    print(json.dumps(rec))
    log(work("llm", "runs.jsonl"), rec)


if __name__ == "__main__":
    main()
