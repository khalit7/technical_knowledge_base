"""LLM graph extraction with graphrag 3.3.0's own prompt and parser, run by the local generator: one call per text unit
with GRAPH_EXTRACTION_PROMPT (entity types organization, person, geo, event: config/defaults.py) and one gleaning round
(CONTINUE_PROMPT; max_gleanings default 1, so no LOOP call), exactly as GraphExtractor._process_document builds the
messages; the output is parsed by graphrag's GraphExtractor._process_result (names upper-cased, "##" and "<|>").
Text units: the root Agentic lab's subset (own paragraphs of the first 40 test questions, 394 paragraphs), one unit per
paragraph ("<title>: <text>"). The Agentic lab extracts the same paragraphs with a short one-call prompt and Qwen3-1.7B,
so the two are compared on the same input.
usage (graphrag env):  $RAG_SCRATCH/gr/grenv/bin/python -I -B s_extract.py run <1.7b|4b> [n paragraphs]   GENERATOR: bench lock
                       $RAG_SCRATCH/gr/grenv/bin/python -I -B s_extract.py dry                           prompt tokens only
                       $RAG_SCRATCH/gr/grenv/bin/python -I -B s_extract.py summary <1.7b|4b> [n]         from the cache
"""
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from grlib import generator, hotpot, para_text, save, work  # noqa: E402

from graphrag.index.operations.extract_graph.graph_extractor import GraphExtractor  # noqa: E402
from graphrag.prompts.index.extract_graph import CONTINUE_PROMPT, GRAPH_EXTRACTION_PROMPT  # noqa: E402

TYPES = ["organization", "person", "geo", "event"]
qs, corpus, by = hotpot()
SUB = list(dict.fromkeys(p for q in qs[:40] for p in q["own_context_pids"]))
PARSER = GraphExtractor(model=None, prompt=GRAPH_EXTRACTION_PROMPT, max_gleanings=1)


def messages(p):
    return [{"role": "user", "content": GRAPH_EXTRACTION_PROMPT.format(input_text=para_text(by[p]), entity_types=",".join(TYPES))}]


def extract(p, G, cache, model, offline):
    m = messages(p)
    r1 = G.chat(m, cache, model, max_tokens=1024, tag="extract", offline=offline)
    if r1 is None:
        return None
    m2 = m + [{"role": "assistant", "content": r1["text"]}, {"role": "user", "content": CONTINUE_PROMPT}]
    r2 = G.chat(m2, cache, model, max_tokens=512, tag="glean", offline=offline)
    if r2 is None:
        return None
    ents1, rels1 = PARSER._process_result(r1["text"], p, "<|>", "##")
    ents, rels = PARSER._process_result(r1["text"] + r2["text"], p, "<|>", "##")
    return {"pid": p, "calls": [{k: r[k] for k in ("n_in", "n_out", "n_in_new", "prompt_ms", "gen_ms", "seconds")} for r in (r1, r2)],
            "entities": ents[["title", "type", "description"]].values.tolist(), "relations": rels[["source", "target", "description", "weight"]].values.tolist(),
            "n_ent_first": len(ents1), "n_rel_first": len(rels1), "raw_chars": len(r1["text"]) + len(r2["text"])}


def main():
    a = sys.argv[1:]
    if a[0] == "dry":
        from tokenizers import Tokenizer
        from grlib import L
        tok = Tokenizer.from_file(os.path.join(L.path("models", "Qwen3-Embedding-0.6B"), "tokenizer.json"))
        n = [len(tok.encode(messages(p)[0]["content"], add_special_tokens=False).ids) for p in SUB]
        para = [len(tok.encode(para_text(by[p]), add_special_tokens=False).ids) for p in SUB]
        print("paragraphs", len(SUB), "prompt tokens per first call: median", sorted(n)[len(n) // 2], "total", sum(n))
        save("extract_dry.json", {"paragraphs": len(SUB), "first_call_median": sorted(n)[len(n) // 2], "first_call_total": sum(n),
                                  "paragraph_tokens_median": sorted(para)[len(para) // 2], "paragraph_tokens_total": sum(para)})
        return
    model = a[1]
    n = int(a[2]) if len(a) > 2 else len(SUB)
    G, mkcache = generator()
    cache = mkcache("extract_" + model)
    offline = a[0] == "summary"
    out, t0 = [], time.time()
    for i, p in enumerate(SUB[:n]):
        r = extract(p, G, cache, model, offline)
        if r is None:
            print("not cached", p); return
        out.append(r)
        if (i + 1) % 20 == 0 and not offline:
            print(i + 1, "paragraphs", round(time.time() - t0), "s", flush=True)
    json.dump(out, open(work("extract_%s_%d.json" % (model, n)), "w"))
    tin = sum(c["n_in"] for r in out for c in r["calls"]); tout = sum(c["n_out"] for r in out for c in r["calls"])
    secs = sum(c["seconds"] for r in out for c in r["calls"])
    meta = {"model": model, "paragraphs": len(out), "tok_in": tin, "tok_out": tout, "gen_seconds": round(secs, 1),
            "entities": sum(len(r["entities"]) for r in out), "relations": sum(len(r["relations"]) for r in out),
            "entities_first_call": sum(r["n_ent_first"] for r in out), "relations_first_call": sum(r["n_rel_first"] for r in out),
            "empty": sum(1 for r in out if not r["entities"]),
            "tok_in_new": sum((c["n_in_new"] or 0) for r in out for c in r["calls"])}
    sample = [{"pid": r["pid"], "title": by[r["pid"]]["title"], "entities": r["entities"][:12], "relations": r["relations"][:12]} for r in out[:12]]
    save("extract_%s.json" % model, {"meta": meta, "sample": sample})
    print(json.dumps(meta))


if __name__ == "__main__":
    main()
