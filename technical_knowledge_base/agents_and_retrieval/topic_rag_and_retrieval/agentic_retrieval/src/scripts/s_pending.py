"""This page's generator runs (all PENDING until a GPU slot: run them through run_pending.sh, which holds the bench lock).
Same 200 HotpotQA questions, same bge-small tool, same Qwen3 GGUF generators and answer metrics as the root's Agentic
lab; prompts chosen on held-out dev questions first (`tune`), never on the 200.

usage: python -I -B s_pending.py <job> <model> [n] [opt=value ...]
jobs:
  ircot      IRCoT-style: retrieve with the question, then alternate one reasoning sentence and a retrieval with that
             sentence as the query (k 3 per step, at most 4 steps), stop when the sentence says "answer is"
  selfask    Self-Ask with search: "Follow up:" questions are searched (k 3) and answered ("Intermediate answer:")
             until "So the final answer is:"
  flare      FLARE-style active retrieval: retrieve with the question (k 3), draft the answer with token
             probabilities; if any draft token has probability < theta (0.8, FLARE's 2WikiMultihopQA setting), retrieve
             again with the question plus the draft with tokens below beta (0.4) removed (k 3 more), answer again
  crag       CRAG-style: top 5; the cross-encoder evaluator (best logit ce1 of the top 5) decides: >= hi keep,
             < lo discard and search with a rewritten keyword query written by the model, between: keep and add the
             rewritten search; then answer
  selfcheck  Self-RAG-style critique without training: answer from the top 5, then ask the model whether the paragraphs
             support that answer (yes/no); "no" falls back to the agent loop (recorded react run, so no new loop call)
  react_b    the root's ReAct agent with another search budget (opt budget=1|2|3|6) or results per search (opt k=1|5)
  memory     final answer of the root's ReAct trajectories from curated memory: all paragraphs read, the last
             observation only, or the top 3 read paragraphs by similarity to question + last thought
  lim        lost in the middle at several lengths: the 2 gold paragraphs as one block among N - 2 on-topic
             distractors (N = 5, 10, 40, 80; the root ran N = 20), block at 5 relative positions; first n questions
  router     Adaptive-RAG-style 3-way LLM router: NONE / ONE / MANY searches, few-shot, on the 200 and on the root's
             constructed one-hop set when it exists
Writes $RAG_SCRATCH/ar/runs/<job>_<model><opts>.jsonl; s_post.py turns them into ../data/pending_results.json."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import json
import random
import re
import time

import arlib as A
import ar_gen as AG
import gen as G
import search as S
import strategies as ST
from common import clean_answer, em, f1, heldout, para_text

qs_all, corpus, by = A.mh()


def fmt(pids, start=1):
    return "\n".join("[%d] %s" % (start + i, para_text(by[p])) for i, p in enumerate(pids))


def rec(r, role):
    return {"role": role, "n_in": r["n_in"], "n_in_new": r["n_in_new"], "n_out": r["n_out"], "seconds": r["seconds"]}


# ---------------------------------------------------------------- IRCoT
IRCOT = {
    "i1": ("Answer the question by reasoning one sentence at a time, using the paragraphs.\n\n{ctx}\n\nQuestion: {q}\n"
           "Reasoning so far: {cot}\nWrite the next single sentence of reasoning. When you know the answer, write a sentence that "
           "ends with: So the answer is: <short answer>."),
    "i2": ("Answer the question by reasoning one sentence at a time, using the paragraphs.\n\n{ctx}\n\nQuestion: {q}\n"
           "Reasoning so far: {cot}\nWrite the next single sentence of reasoning: state ONE fact from the paragraphs that the question "
           "needs, naming the person, place or thing it is about. Do not give the answer until the reasoning so far states every "
           "fact the question needs. Then write only: So the answer is: <a name, date, number, or yes/no>."),
}


def ircot(q, cache, model, k=3, steps=4, prompt="i1", offline=False):  # i1 chosen on 60 held-out questions (F1 0.541 vs 0.459)
    t0 = time.perf_counter()
    seen, calls, searches, cot, out = [], [], [], [], []
    query = q["question"]
    answer = None
    for i in range(steps):
        hits, ms = S.timed(query, k, exclude=set(seen))
        pids = [p for p, _ in hits]
        seen += pids
        searches.append({"query": query, "pids": pids, "ms": round(ms, 2)})
        r = G.chat(IRCOT[prompt].format(ctx=fmt(seen), q=q["question"], cot=" ".join(cot) or "(none)"), cache, model, max_tokens=64,
                   stop_s=["\n"], tag="ircot", offline=offline)
        if r is None:
            return None
        calls.append(rec(r, "step"))
        sent = r["text"].strip().split("\n")[0]
        cot.append(sent)
        out.append({"kind": "search", "query": query, "pids": pids, "thought": sent})
        if re.search(r"(?i)answer is", sent):
            break
        query = sent  # IRCoT: the latest reasoning sentence is the next query
    # IRCoT separates retrieval from reading: a reader answers from every collected paragraph (with the reasoning as notes)
    if True:
        rf = G.chat(ST.FINAL.format(ctx=fmt(seen), notes=" ".join(cot), q=q["question"]), cache, model, max_tokens=32, tag="final", offline=offline)
        if rf is None:
            return None
        calls.append(rec(rf, "answer"))
        answer = clean_answer(rf["text"])
    return {"answer": answer, "calls": calls, "searches": searches, "seen": seen, "steps": out, "wall_s": time.perf_counter() - t0}


# ---------------------------------------------------------------- Self-Ask
SELFASK = ("Answer the question. If it needs facts you do not have, ask follow-up questions; each follow-up is searched "
           "and you will be given paragraphs and must write the intermediate answer. Use exactly this format:\n"
           "Question: Who lived longer, Muhammad Ali or Alan Turing?\nAre follow up questions needed here: Yes.\n"
           "Follow up: How old was Muhammad Ali when he died?\nIntermediate answer: Muhammad Ali was 74 years old when he died.\n"
           "Follow up: How old was Alan Turing when he died?\nIntermediate answer: Alan Turing was 41 years old when he died.\n"
           "So the final answer is: Muhammad Ali\n\nQuestion: {q}\nAre follow up questions needed here: Yes.\n{trace}")


SELFASK_NEXT = ("Answer the question by asking follow-up questions; each follow-up is searched and answered for you. Example:\n"
                "Question: Who lived longer, Muhammad Ali or Alan Turing?\nFollow up: How old was Muhammad Ali when he died?\n"
                "Intermediate answer: 74\nFollow up: How old was Alan Turing when he died?\nIntermediate answer: 41\n"
                "So the final answer is: Muhammad Ali\n\nNow:\nQuestion: {q}\n{trace}\n"
                "Write only the next line. If another fact is needed, write: Follow up: <one short question naming the person, place "
                "or thing>. If the intermediate answers are enough, write: So the final answer is: <a name, date, number, or yes/no>.")


def selfask(q, cache, model, k=3, steps=4, offline=False):
    """Self-Ask with search, as a chat model: each call writes the next line (a follow-up or the final answer); the
    follow-up is searched (k 3) and answered by the model from those paragraphs; at the step limit a reader answers
    from every paragraph with the trace as notes."""
    t0 = time.perf_counter()
    seen, calls, searches, out, trace = [], [], [], [], ""
    answer = None
    for i in range(steps + 1):
        r = G.chat(SELFASK_NEXT.format(q=q["question"], trace=trace.strip()), cache, model, max_tokens=48, stop_s=["\n"],
                   tag="selfask2", offline=offline)
        if r is None:
            return None
        calls.append(rec(r, "step"))
        line = r["text"].strip().split("\n")[0]
        m = re.search(r"(?i)final answer is\s*:?\s*(.+)", line)
        fu = re.search(r"(?i)follow[ -]?up\s*:\s*(.+)", line)
        if m:
            answer = clean_answer(m.group(1))
            out.append({"kind": "finish", "answer": answer})
            break
        if not fu or i == steps:
            break
        follow = fu.group(1).strip()
        hits, ms = S.timed(follow, k, exclude=set(seen))
        pids = [p for p, _ in hits]
        seen += pids
        searches.append({"query": follow, "pids": pids, "ms": round(ms, 2)})
        ra = G.chat(ST.SUBANS.format(ctx=fmt(pids), q=follow), cache, model, max_tokens=32, tag="subans", offline=offline)
        if ra is None:
            return None
        calls.append(rec(ra, "sub-answer"))
        ia = clean_answer(ra["text"])
        out.append({"kind": "search", "query": follow, "pids": pids, "sub_answer": ia})
        trace += "Follow up: %s\nIntermediate answer: %s\n" % (follow, ia)
    if answer is None:
        rf = G.chat(ST.FINAL.format(ctx=fmt(seen), notes=trace or "(none)", q=q["question"]), cache, model, max_tokens=32, tag="final",
                    offline=offline)
        if rf is None:
            return None
        calls.append(rec(rf, "answer"))
        answer = clean_answer(rf["text"])
        out.append({"kind": "answer", "text": rf["text"]})
    return {"answer": answer, "calls": calls, "searches": searches, "seen": seen, "steps": out, "wall_s": time.perf_counter() - t0}


# ---------------------------------------------------------------- FLARE-style
def flare(q, cache, model, k=3, theta=0.8, beta=0.4, offline=False):
    import math
    t0 = time.perf_counter()
    hits, ms = S.timed(q["question"], k)
    seen = [p for p, _ in hits]
    searches = [{"query": q["question"], "pids": list(seen), "ms": round(ms, 2)}]
    prompt = ST.PROMPTS_SINGLE[ST.CHOICE.get("single", "s2")]
    r = AG.chat_lp(prompt.format(ctx=fmt(seen), q=q["question"]), cache, model, offline=offline, tag="flare_draft")
    if r is None:
        return None
    calls = [rec(r, "draft")]
    low = [t for t, lp in r["lp"] if math.exp(lp) < theta]
    steps = [{"kind": "search", "query": q["question"], "pids": list(seen)}, {"kind": "draft", "text": r["text"], "unsure": low}]
    answer = clean_answer(r["text"])
    if low:
        kept = "".join(t for t, lp in r["lp"] if math.exp(lp) >= beta).strip()
        query = (q["question"] + " " + kept).strip()
        hits, ms = S.timed(query, k, exclude=set(seen))
        pids = [p for p, _ in hits]
        seen += pids
        searches.append({"query": query, "pids": pids, "ms": round(ms, 2)})
        r2 = G.chat(prompt.format(ctx=fmt(seen), q=q["question"]), cache, model, max_tokens=32, tag="flare_final", offline=offline)
        if r2 is None:
            return None
        calls.append(rec(r2, "answer"))
        answer = clean_answer(r2["text"])
        steps += [{"kind": "search", "query": query, "pids": pids}, {"kind": "answer", "text": r2["text"]}]
    return {"answer": answer, "calls": calls, "searches": searches, "seen": seen, "steps": steps, "wall_s": time.perf_counter() - t0}


# ---------------------------------------------------------------- CRAG-style
REWRITE = ("Rewrite the question as a short keyword search query (at most 8 words) that would find the missing fact. "
           "Reply with the query only.\nQuestion: {q}")
_CE = {}


def ce_scores(question, pids):
    if "m" not in _CE:
        from sentence_transformers import CrossEncoder
        _CE["m"] = CrossEncoder(A.L.model_dir("ce-minilm-l6"), device="cpu")
    return [float(x) for x in _CE["m"].predict([(question, para_text(by[p])) for p in pids], show_progress_bar=False)]


def crag(q, cache, model, lo=None, hi=None, offline=False):
    t0 = time.perf_counter()
    O = A.load_data("outcomes.json")
    import numpy as np
    lo = lo if lo is not None else float(np.percentile(O["ce1"], 33))
    hi = hi if hi is not None else float(np.percentile(O["ce1"], 67))
    hits, ms = S.timed(q["question"], 5)
    pids = [p for p, _ in hits]
    ce1 = max(ce_scores(q["question"], pids))
    searches = [{"query": q["question"], "pids": list(pids), "ms": round(ms, 2)}]
    calls, steps = [], [{"kind": "search", "query": q["question"], "pids": list(pids), "ce1": round(ce1, 2)}]
    verdict = "correct" if ce1 >= hi else "incorrect" if ce1 < lo else "ambiguous"
    ctx = list(pids)
    if verdict != "correct":
        rw = G.chat(REWRITE.format(q=q["question"]), cache, model, max_tokens=24, tag="rewrite", offline=offline)
        if rw is None:
            return None
        calls.append(rec(rw, "rewrite"))
        query = rw["text"].strip().split("\n")[0].strip('"')
        hits2, ms2 = S.timed(query, 5, exclude=set(pids))
        p2 = [p for p, _ in hits2]
        searches.append({"query": query, "pids": p2, "ms": round(ms2, 2)})
        steps.append({"kind": "search", "query": query, "pids": p2})
        ctx = p2 if verdict == "incorrect" else pids + p2
    r = G.chat(ST.PROMPTS_SINGLE[ST.CHOICE.get("single", "s2")].format(ctx=fmt(ctx), q=q["question"]), cache, model, max_tokens=32,
               tag="crag_answer", offline=offline)
    if r is None:
        return None
    calls.append(rec(r, "answer"))
    steps.append({"kind": "answer", "text": r["text"], "verdict": verdict})
    return {"answer": clean_answer(r["text"]), "calls": calls, "searches": searches, "seen": ctx, "steps": steps,
            "verdict": verdict, "wall_s": time.perf_counter() - t0}


# ---------------------------------------------------------------- Self-RAG-style critique
CHECK = ("Paragraphs:\n{ctx}\n\nQuestion: {q}\nProposed answer: {a}\n"
         "Do the paragraphs contain the facts needed to support this answer? Reply yes or no.")


def selfcheck(q, cache, model, offline=False):
    t0 = time.perf_counter()
    single = A.root_run("test_%s_single_k5" % model).get(q["qid"])
    if single is None:
        return None
    pids = single["seen"]
    r = G.chat(CHECK.format(ctx=fmt(pids), q=q["question"], a=single["answer"]), cache, model, max_tokens=4, tag="check", offline=offline)
    if r is None:
        return None
    ok = r["text"].strip().lower().startswith("yes")
    return {"answer": single["answer"], "calls": single["calls"] + [rec(r, "critique")], "searches": single["searches"],
            "seen": pids, "steps": [{"kind": "critique", "text": r["text"], "supported": ok}], "supported": ok,
            "wall_s": time.perf_counter() - t0}


# ---------------------------------------------------------------- memory: final answer from curated history
def memory(q, cache, model, how="top3", offline=False):
    rr = A.root_run("test_%s_react" % model).get(q["qid"])
    if rr is None or len(rr["searches"]) < 2:
        return None
    seen = list(dict.fromkeys(rr["seen"]))
    if how == "all":
        keep = seen
    elif how == "last":
        keep = rr["searches"][-1]["pids"]
    else:
        thought = rr["steps"][-1].get("thought", "") if rr["steps"] else ""
        v = A.qvecs([q["question"] + " " + thought])[0]
        keep = sorted(seen, key=lambda p: -float(A.doc_vec(p) @ v))[:int(how[3:])]
    r = G.chat(ST.PROMPTS_SINGLE[ST.CHOICE.get("single", "s2")].format(ctx=fmt(keep), q=q["question"]), cache, model, max_tokens=32,
               tag="memory_" + how, offline=offline)
    if r is None:
        return None
    return {"answer": clean_answer(r["text"]), "calls": [rec(r, "answer")], "searches": [], "seen": keep, "steps": [], "wall_s": r["seconds"]}


# ---------------------------------------------------------------- lost in the middle at several lengths
def lim_rows(qs, cache, model, sizes=(5, 10, 40, 80), offline=False):
    rows = []
    prompt = ST.PROMPTS_SINGLE[ST.CHOICE.get("single", "s2")]
    for q in qs:
        dist_all = [p for p, _ in S.search(q["question"], 78, exclude=set(q["gold_pids"]))]
        random.Random("lim-" + q["qid"]).shuffle(dist_all)
        for N in sizes:
            dist = dist_all[:N - 2]
            for rel in (1.0, 0.75, 0.5, 0.25, 0.0):  # last to first, so the shared prefix stays cached
                slot = round(rel * (N - 2))
                pids = dist[:slot] + list(q["gold_pids"]) + dist[slot:]
                r = G.chat(prompt.format(ctx=fmt(pids), q=q["question"]), cache, model, max_tokens=32, tag="lim", offline=offline)
                if r is None:
                    continue
                a = clean_answer(r["text"])
                rows.append({"qid": q["qid"], "type": q["type"], "N": N, "rel": rel, "slot": slot, "answer": a,
                             "em": em(a, q["answer"]), "f1": round(f1(a, q["answer"]), 4), "n_in": r["n_in"],
                             "n_in_new": r["n_in_new"], "prompt_ms": r.get("prompt_ms"), "seconds": r["seconds"]})
    return rows


# ---------------------------------------------------------------- Adaptive-RAG-style LLM router
ROUTE = ("How much searching does this question need?\nNONE: common knowledge you can answer without looking anything up.\n"
         "ONE: one fact about one named thing, found with one search.\nMANY: a chain (find one thing, then a fact about it) or a "
         "comparison of two things.\nExamples:\nWhat is the capital of France? -> NONE\nWhen was the Eiffel Tower completed? -> ONE\n"
         "Which country is the director of the film Kids Return from? -> MANY\nAre Mount Rainier and Mount Hood in the same state? -> MANY\n"
         "{q} ->")


def route(q, cache, model, offline=False):
    r = G.chat(ROUTE.format(q=q["question"]), cache, model, max_tokens=4, tag="route", offline=offline)
    if r is None:
        return None
    t = r["text"].upper()
    lab = "NONE" if "NONE" in t else "ONE" if "ONE" in t else "MANY"
    return {"answer": lab, "calls": [rec(r, "route")], "searches": [], "seen": [], "steps": [], "wall_s": r["seconds"]}


JOBS = {"ircot": ircot, "selfask": selfask, "flare": flare, "crag": crag, "selfcheck": selfcheck, "memory": memory, "router": route}


def main(argv):
    job, model = argv[0], argv[1]
    n = int(argv[2]) if len(argv) > 2 and "=" not in argv[2] else None
    opts = dict(a.split("=", 1) for a in argv[2:] if "=" in a)
    offline = opts.pop("offline", "0") == "1"
    split = opts.pop("set", "test")
    qs = heldout()[:60] if split == "heldout" else qs_all
    qs = qs[:n]
    suffix = "".join("_%s%s" % kv for kv in sorted(opts.items())) + ("_heldout" if split == "heldout" else "")
    name = "%s_%s%s" % (job, model, suffix)
    if job == "lim":
        cache = AG.Cache("%s_lim" % model)
        rows = lim_rows(qs, cache, model, offline=offline)
        open(A.work("runs", name + ".jsonl"), "w").write("".join(json.dumps(r) + "\n" for r in rows))
        print("DONE", name, len(rows))
        return
    if job == "react_b":
        cache = AG.Cache("%s_react_b" % model, root_name="%s_react" % model)
        kw = {k: int(v) for k, v in opts.items() if k in ("budget", "k")}
        fn = lambda q, c, m, offline=False: ST.react(q, c, m, offline=offline, **kw)  # noqa: E731
    else:
        cache = AG.Cache("%s_%s" % (model, job))
        base = JOBS[job]
        kw = {k: (float(v) if "." in v else int(v)) if k not in ("how", "prompt") else v for k, v in opts.items()}
        fn = lambda q, c, m, offline=False: base(q, c, m, offline=offline, **kw)  # noqa: E731
    rows, t0 = [], time.time()
    for i, q in enumerate(qs):
        r = fn(q, cache, model, offline=offline)
        if r is None:
            continue
        gold = set(q.get("gold_pids", []))
        row = {"qid": q["qid"], "type": q.get("type"), "answer": r["answer"], "gold": q["answer"],
               "em": em(r["answer"], q["answer"]), "f1": round(f1(r["answer"], q["answer"]), 4),
               "n_search": len(r["searches"]), "n_calls": len(r["calls"]),
               "gold_seen": sum(p in set(r["seen"]) for p in gold), "tok_in": sum(c["n_in"] for c in r["calls"]),
               "tok_in_new": sum(c["n_in_new"] or 0 for c in r["calls"]), "tok_out": sum(c["n_out"] for c in r["calls"]),
               "wall_s": round(r["wall_s"], 3), "calls": r["calls"], "searches": r["searches"], "steps": r["steps"], "seen": r["seen"]}
        for extra in ("verdict", "supported"):
            if extra in r:
                row[extra] = r[extra]
        rows.append(row)
        if (i + 1) % 20 == 0:
            m = len(rows)
            print("%s %d/%d F1 %.3f %.0fs" % (name, i + 1, len(qs), sum(x["f1"] for x in rows) / m, time.time() - t0), flush=True)
    with open(A.work("runs", name + ".jsonl"), "w") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    m = max(1, len(rows))
    print("DONE %s n=%d F1 %.3f EM %.3f tok %.0f" % (name, len(rows), sum(x["f1"] for x in rows) / m,
                                                     sum(x["em"] for x in rows) / m, sum(x["tok_in"] for x in rows) / m), flush=True)


if __name__ == "__main__":
    main(sys.argv[1:])
