"""The five ways of answering a multi-hop question compared on the Agentic lab, plus the trajectory record each one
leaves. Every strategy returns a dict:
  answer, calls [{role, n_in, n_in_new, n_out, seconds}], searches [{query, pids, ms}], seen (pids in any prompt),
  steps (for the replay: thought / action / observation text), wall_s.
Prompts are chosen on held-out HotpotQA questions (tune.py), never on the 200 test questions."""
import random
import re
import time

import json
import os

import gen as G
import search as S
from common import clean_answer, data, para_text

_CH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out", "tune_choice.json")
CHOICE = json.load(open(_CH)) if os.path.exists(_CH) else {}

ANS_RULE = "Answer with a short phrase only (a name, date, number, or yes/no), no explanation."
ANS_RULE_B = ("Reply with the answer only: the shortest phrase that answers the question (a name, a date, a number, or yes or no). "
              "Do not write a sentence.")


def fmt_paras(pids, start=1):
    _, _, by = data()
    return "\n".join("[%d] %s" % (start + i, para_text(by[p])) for i, p in enumerate(pids))


def _rec(r, role):
    return {"role": role, "n_in": r["n_in"], "n_in_new": r["n_in_new"], "n_out": r["n_out"], "seconds": r["seconds"]}


# ---------------------------------------------------------------- 1. no retrieval (closed book)
ANS_RULE_C = "Give only the answer, in as few words as possible."
PROMPTS_CLOSED = {
    "c3": "Question: {q}\n" + ANS_RULE_C,
    "c1": "Question: {q}\n" + ANS_RULE,
    "c2": "Question: {q}\n" + ANS_RULE_B,
}


def closed(q, cache, model, prompt=None, offline=False):
    t0 = time.perf_counter()
    prompt = prompt or CHOICE.get("closed", "c1")
    r = G.chat(PROMPTS_CLOSED[prompt].format(q=q["question"]), cache, model, max_tokens=32, tag="closed", offline=offline)
    if r is None:
        return None
    return {"answer": clean_answer(r["text"]), "raw": r["text"], "calls": [_rec(r, "answer")], "searches": [], "seen": [],
            "steps": [{"kind": "answer", "text": r["text"]}], "wall_s": time.perf_counter() - t0}


# ---------------------------------------------------------------- 2. single-shot pipeline: top k into the prompt
PROMPTS_SINGLE = {
    "s3": ("Read the paragraphs, then answer the question. The answer may need facts from two paragraphs.\n\n{ctx}\n\n"
           "Question: {q}\n" + ANS_RULE_C),
    "s1": "Use the paragraphs to answer the question.\n\n{ctx}\n\nQuestion: {q}\n" + ANS_RULE,
    "s2": ("Read the paragraphs, then answer the question. The answer may need facts from two paragraphs.\n\n{ctx}\n\n"
           "Question: {q}\n" + ANS_RULE_B),
}


def single(q, cache, model, k=5, prompt=None, offline=False, method="bge"):
    t0 = time.perf_counter()
    prompt = prompt or CHOICE.get("single", "s2")
    hits, ms = S.timed(q["question"], k, method=method)
    pids = [p for p, _ in hits]
    r = G.chat(PROMPTS_SINGLE[prompt].format(ctx=fmt_paras(pids), q=q["question"]), cache, model, max_tokens=32, tag="single", offline=offline)
    if r is None:
        return None
    return {"answer": clean_answer(r["text"]), "raw": r["text"], "calls": [_rec(r, "answer")],
            "searches": [{"query": q["question"], "pids": pids, "ms": round(ms, 2)}], "seen": pids,
            "steps": [{"kind": "search", "query": q["question"], "pids": pids}, {"kind": "answer", "text": r["text"]}],
            "wall_s": time.perf_counter() - t0}


# ---------------------------------------------------------------- 3. agentic loop (ReAct-style, search as a tool)
REACT_SYS = {
    "r1": ("You answer questions by searching a collection of Wikipedia paragraphs. Work in steps. At each step write one line "
           "'Thought: ...' saying what you still need, then one line with exactly one action:\n"
           "Action: search[<a short search query>]  to get the 3 best matching paragraphs, or\n"
           "Action: finish[<answer>]  when you know the answer.\n"
           "Questions usually need two facts from two different paragraphs: search for the first entity, read the result, then "
           "search for the second using what you learned. The final answer is a short phrase (a name, date, number, or yes/no). "
           "You may search at most {budget} times."),
    "r2": ("You answer a question by searching a collection of Wikipedia paragraphs.\n"
           "Reply in exactly this format, one step at a time:\n"
           "Thought: <what you know and what you still need>\n"
           "Action: search[<query>]\n"
           "After each search you will get an Observation with 3 paragraphs. When you know the answer, reply:\n"
           "Thought: <why>\n"
           "Action: finish[<short answer: a name, date, number, or yes/no>]\n"
           "Most questions need two searches: one for the entity named in the question, then one for the entity you found. "
           "For a comparison, search each of the two things. You have at most {budget} searches."),
    "r3": ("You answer a question by searching a collection of Wikipedia paragraphs.\n"
           "Reply in exactly this format, one step at a time:\n"
           "Thought: <what you know and what you still need>\n"
           "Action: search[<query>]\n"
           "After each search you will get an Observation with 3 paragraphs. When you know the answer, reply:\n"
           "Thought: <why>\n"
           "Action: finish[<only the answer, in as few words as possible>]\n"
           "Most questions need two searches: one for the entity named in the question, then one for the entity you found. "
           "For a comparison, search each of the two things. You have at most {budget} searches."),
}
ACT = re.compile(r"Action\s*:\s*(search|finish)\s*\[(.*?)\]", re.I | re.S)


def react(q, cache, model, budget=4, k=3, prompt=None, offline=False, method="bge"):
    t0 = time.perf_counter()
    prompt = prompt or CHOICE.get("react", "r2")
    msgs = [{"role": "system", "content": REACT_SYS[prompt].format(budget=budget)},
            {"role": "user", "content": "Question: " + q["question"]}]
    calls, searches, seen, steps = [], [], [], []
    answer = None
    for step in range(budget + 2):
        forced = len(searches) >= budget
        if forced:
            msgs[-1]["content"] += "\nYou have no searches left. Reply with Thought and Action: finish[<answer>] now."
        r = G.chat(msgs, cache, model, max_tokens=120, stop_s=["Observation:"], tag="react", offline=offline)
        if r is None:
            return None
        calls.append(_rec(r, "step"))
        text = r["text"]
        m = ACT.search(text)
        th = text.split("Action")[0].replace("Thought:", "").strip()
        if not m:
            # no parseable action: treat the text as the answer (counted as a format failure)
            steps.append({"kind": "noaction", "thought": th, "text": text})
            answer = clean_answer(text)
            break
        kind, arg = m.group(1).lower(), m.group(2).strip()
        msgs.append({"role": "assistant", "content": text[:m.end()]})
        if kind == "finish" or forced:
            steps.append({"kind": "finish", "thought": th, "answer": arg})
            answer = clean_answer(arg) if kind == "finish" else clean_answer(arg)
            break
        hits, ms = S.timed(arg, k, exclude=set(seen), method=method)
        pids = [p for p, _ in hits]
        seen += pids
        searches.append({"query": arg, "pids": pids, "ms": round(ms, 2)})
        steps.append({"kind": "search", "thought": th, "query": arg, "pids": pids})
        msgs.append({"role": "user", "content": "Observation:\n" + fmt_paras(pids)})
    if answer is None:
        answer = ""
    return {"answer": answer, "calls": calls, "searches": searches, "seen": seen, "steps": steps,
            "wall_s": time.perf_counter() - t0}


# ---------------------------------------------------------------- 4. iterative retrieval with query decomposition
DECOMP = {
    "d1": ("Break the question into two simpler questions that can each be answered from one Wikipedia paragraph. "
           "If the second question needs the answer to the first, write #1 where that answer goes.\n"
           "Examples:\n"
           "Question: Which country is the director of the film Kids Return from?\n"
           "1. Who directed the film Kids Return?\n2. Which country is #1 from?\n"
           "Question: Are Mount Rainier and Mount Hood in the same state?\n"
           "1. In which state is Mount Rainier?\n2. In which state is Mount Hood?\n"
           "Question: {q}\n"),
}
SUBANS = "Use the paragraphs to answer the question.\n\n{ctx}\n\nQuestion: {q}\n" + ANS_RULE_C
FINAL = ("Read the paragraphs and the notes, then answer the question.\n\n{ctx}\n\nNotes:\n{notes}\n\nQuestion: {q}\n" + ANS_RULE_C)
SUBQ = re.compile(r"^\s*([12])[.)]\s*(.+)$", re.M)


def decompose(q, cache, model, k=3, prompt="d1", offline=False, method="bge"):
    t0 = time.perf_counter()
    calls, searches, seen, steps = [], [], [], []
    r = G.chat(DECOMP[prompt].format(q=q["question"]), cache, model, max_tokens=80, tag="decomp", offline=offline)
    if r is None:
        return None
    calls.append(_rec(r, "decompose"))
    subs = {}
    for m in SUBQ.finditer(r["text"]):
        subs.setdefault(m.group(1), m.group(2).strip())
    sq = [subs[i] for i in ("1", "2") if i in subs] or [q["question"]]
    steps.append({"kind": "decompose", "subs": sq})
    notes, a1 = [], None
    for i, s in enumerate(sq):
        if "#1" in s and a1 is not None:
            s = s.replace("#1", a1)
        hits, ms = S.timed(s, k, exclude=set(seen), method=method)
        pids = [p for p, _ in hits]
        seen += pids
        searches.append({"query": s, "pids": pids, "ms": round(ms, 2)})
        ra = G.chat(SUBANS.format(ctx=fmt_paras(pids), q=s), cache, model, max_tokens=32, tag="subans", offline=offline)
        if ra is None:
            return None
        calls.append(_rec(ra, "sub-answer"))
        a = clean_answer(ra["text"])
        if i == 0:
            a1 = a
        notes.append("%s %s" % (s, a))
        steps.append({"kind": "search", "query": s, "pids": pids, "sub_answer": a})
    rf = G.chat(FINAL.format(ctx=fmt_paras(seen), notes="\n".join(notes), q=q["question"]), cache, model, max_tokens=32, tag="final", offline=offline)
    if rf is None:
        return None
    calls.append(_rec(rf, "answer"))
    steps.append({"kind": "answer", "text": rf["text"]})
    return {"answer": clean_answer(rf["text"]), "calls": calls, "searches": searches, "seen": seen, "steps": steps,
            "wall_s": time.perf_counter() - t0}


# ---------------------------------------------------------------- 5. long context: gold plus distractors in the window
def lc_pids(q, budget_tokens=None, seed=0):
    """budget None: the HotpotQA distractor setting (the question's own 10 paragraphs: 2 gold + 8 distractors chosen by
    the dataset's authors). budget N: the own 10 plus the corpus paragraphs nearest the question (bge-small) until the
    paragraphs fill about N Qwen3 tokens. Order shuffled with a fixed seed, so the gold position is random."""
    _, _, by = data()
    pids = list(q["own_context_pids"])
    if budget_tokens:
        tot = sum(G.ntok(para_text(by[p])) + 4 for p in pids)
        for p, _ in S.search(q["question"], 400, exclude=set(pids)):
            t = G.ntok(para_text(by[p])) + 4
            if tot + t > budget_tokens:
                break
            pids.append(p)
            tot += t
    rng = random.Random("%s-%d" % (q["qid"], seed))
    rng.shuffle(pids)
    return pids


def longctx(q, cache, model, budget_tokens=None, prompt=None, offline=False, pids=None):
    t0 = time.perf_counter()
    prompt = prompt or CHOICE.get("single", "s2")
    pids = pids or lc_pids(q, budget_tokens)
    r = G.chat(PROMPTS_SINGLE[prompt].format(ctx=fmt_paras(pids), q=q["question"]), cache, model, max_tokens=32, tag="longctx", offline=offline)
    if r is None:
        return None
    return {"answer": clean_answer(r["text"]), "raw": r["text"], "calls": [_rec(r, "answer")], "searches": [], "seen": pids,
            "steps": [{"kind": "context", "n": len(pids)}, {"kind": "answer", "text": r["text"]}], "wall_s": time.perf_counter() - t0}
