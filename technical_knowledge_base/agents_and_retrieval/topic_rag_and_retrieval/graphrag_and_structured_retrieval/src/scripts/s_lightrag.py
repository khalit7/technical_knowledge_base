"""LightRAG 1.5.7 (pip lightrag-hku, its own env) run on a slice of the multi-hop subset with the local generator served by
llama-server through a small OpenAI-style function (records token counts), and bge-small on the CPU as its embedding
function. Default settings (chunk 1,200 tokens, one gleaning), except storage in a scratch folder and a query budget of
16,000 tokens instead of 30,000 (max_total_tokens) so the 4B model runs with a 24,576-token window (AGT_CTX) on a 16 GB Mac.
  stub  no generator: every LLM call returns "" and is recorded, which counts the calls and prompt tokens LightRAG makes
        per paragraph (deterministic; checks the plumbing)
  run   the real thing: insert the first N paragraphs of the subset as separate documents, then ask the questions whose
        two gold paragraphs are among them in modes naive, local, global, hybrid, mix
usage (LightRAG env): TIKTOKEN_CACHE_DIR=$RAG_SCRATCH/gr/tiktoken $RAG_SCRATCH/gr/lrenv/bin/python -I -B s_lightrag.py stub [N]
                      ... s_lightrag.py run <1.7b|4b> [N]      GENERATOR: bench lock
"""
import asyncio
import json
import os
import shutil
import sys
import time
import urllib.request

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import GEN_PORTS, L, generator, hotpot, normalize_answer, para_text, save, work  # noqa: E402

from lightrag import LightRAG, QueryParam  # noqa: E402
from lightrag.utils import EmbeddingFunc  # noqa: E402

MODE = sys.argv[1]
MODEL = sys.argv[2] if MODE == "run" else None
N = int(sys.argv[-1]) if sys.argv[-1].isdigit() else 60
qs, corpus, by = hotpot()
SUB = list(dict.fromkeys(p for q in qs[:40] for p in q["own_context_pids"]))[:N]
CALLS = []
_tok = None


def ntok(s):
    global _tok
    if _tok is None:
        from tokenizers import Tokenizer
        _tok = Tokenizer.from_file(os.path.join(L.path("models", "Qwen3-Embedding-0.6B"), "tokenizer.json"))
    return len(_tok.encode(s, add_special_tokens=False).ids)


async def llm(prompt, system_prompt=None, history_messages=None, keyword_extraction=False, **kw):
    msgs = ([{"role": "system", "content": system_prompt}] if system_prompt else []) + list(history_messages or []) + [{"role": "user", "content": prompt}]
    if MODE == "stub":
        CALLS.append({"n_in": sum(ntok(m["content"]) for m in msgs), "n_out": 0, "s": 0.0, "kw": keyword_extraction})
        return ""
    body = {"messages": msgs, "temperature": 0, "seed": 0, "max_tokens": 1024, "cache_prompt": True,
            "chat_template_kwargs": {"enable_thinking": False}}
    req = urllib.request.Request("http://127.0.0.1:%d/v1/chat/completions" % GEN_PORTS[MODEL], data=json.dumps(body).encode(),
                                 headers={"Content-Type": "application/json"})
    t0 = time.perf_counter()
    out = await asyncio.to_thread(lambda: json.loads(urllib.request.urlopen(req, timeout=900).read()))
    CALLS.append({"n_in": out["usage"]["prompt_tokens"], "n_out": out["usage"]["completion_tokens"], "s": round(time.perf_counter() - t0, 3), "kw": keyword_extraction})
    return out["choices"][0]["message"]["content"] or ""


_enc = None


async def embed(texts, **kw):
    global _enc
    if _enc is None:
        _enc = L.encoder("bge-small", device="cpu")
    return np.asarray(_enc.encode(list(texts), normalize_embeddings=True, show_progress_bar=False))


async def main():
    if MODE == "run":
        G, _ = generator()
        G.server(MODEL)  # llama-server on this page's port, stopped at exit
    wd = work("lightrag_%s_%d" % (MODEL or "stub", N))
    shutil.rmtree(wd, ignore_errors=True); os.makedirs(wd)
    rag = LightRAG(working_dir=wd, llm_model_func=llm, embedding_func=EmbeddingFunc(embedding_dim=384, max_token_size=512, func=embed))
    await rag.initialize_storages()
    t0 = time.time()
    await rag.ainsert([para_text(by[p]) for p in SUB], ids=SUB)
    ins = {"paragraphs": len(SUB), "calls": len(CALLS), "tok_in": sum(c["n_in"] for c in CALLS), "tok_out": sum(c["n_out"] for c in CALLS),
           "gen_s": round(sum(c["s"] for c in CALLS), 1), "wall_s": round(time.time() - t0, 1)}
    print("insert", ins)
    n_ins = len(CALLS)
    answers = []
    sub = set(SUB)
    if MODE == "run":
        for q in qs[:40]:
            if not all(g in sub for g in q["gold_pids"]):
                continue
            row = {"qid": q["qid"], "question": q["question"], "gold": q["answer"]}
            for mode in ("naive", "local", "global", "hybrid", "mix"):
                c0 = len(CALLS)
                a = await rag.aquery(q["question"] + " Answer in as few words as possible.", param=QueryParam(mode=mode, max_total_tokens=16000))
                row[mode] = {"answer": str(a)[:300], "calls": len(CALLS) - c0, "tok_in": sum(c["n_in"] for c in CALLS[c0:]),
                             "contains_gold": normalize_answer(q["answer"]) in normalize_answer(str(a))}
            answers.append(row)
    G = rag.chunk_entity_relation_graph
    try:
        nodes = len(await G.get_all_labels())
    except Exception:  # noqa: BLE001
        nodes = None
    await rag.finalize_storages()
    save("lightrag_%s.json" % (MODEL or "stub"), {"insert": ins, "insert_calls_kw": sum(1 for c in CALLS[:n_ins] if c["kw"]),
                                                  "per_call_in": [c["n_in"] for c in CALLS[:n_ins]][:20], "nodes": nodes, "answers": answers})


asyncio.run(main())
