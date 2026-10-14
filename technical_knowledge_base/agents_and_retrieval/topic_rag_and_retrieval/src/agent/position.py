"""Lost in the middle, on the local model: the same 20 paragraphs (the 2 gold paragraphs as one block, plus the 18 corpus
paragraphs bge-small ranks highest among the non-gold ones, in a fixed seeded order) with the gold block moved through
5 slots: first, 5th, 10th, 15th, last (paragraphs 19-20). Everything else in the prompt is identical, so any change in
accuracy is the position. Questions are run from the last slot to the first so llama-server's prompt cache reuses the
shared prefix (the distractors before the gold block). Hold the bench lock.
usage: python -I -B position.py <model> [n] [prompt]
Writes $RAG_SCRATCH/agt/runs/position_<model>.jsonl"""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import random
import time

import gen as G
import search as S
import strategies as ST
from common import clean_answer, data, em, f1, jl_write, work

SLOTS = [0, 4, 9, 14, 18]  # index of the first gold paragraph in a 20-paragraph list


def layout(q, slot, n_dist=18):
    dist = [p for p, _ in S.search(q["question"], n_dist, exclude=set(q["gold_pids"]))]
    random.Random("pos-" + q["qid"]).shuffle(dist)
    gold = list(q["gold_pids"])
    return dist[:slot] + gold + dist[slot:]


def main(model, n=None, prompt=None):
    prompt = prompt or ST.CHOICE.get("single", "s2")
    qs = data()[0][:n]
    cache = G.Cache("%s_position" % model)
    rows, t0 = [], time.time()
    for i, q in enumerate(qs):
        for slot in sorted(SLOTS, reverse=True):
            pids = layout(q, slot)
            r = G.chat(ST.PROMPTS_SINGLE[prompt].format(ctx=ST.fmt_paras(pids), q=q["question"]), cache, model, max_tokens=32, tag="pos")
            a = clean_answer(r["text"])
            rows.append({"qid": q["qid"], "type": q["type"], "slot": slot, "answer": a, "em": em(a, q["answer"]),
                         "f1": round(f1(a, q["answer"]), 4), "n_in": r["n_in"], "n_in_new": r["n_in_new"], "seconds": r["seconds"]})
        if (i + 1) % 20 == 0:
            print("position %d/%d %.0fs" % (i + 1, len(qs), time.time() - t0), flush=True)
    jl_write(work("runs", "position_%s.jsonl" % model), rows)
    for s in SLOTS:
        x = [r for r in rows if r["slot"] == s]
        print("slot", s + 1, "EM %.3f F1 %.3f" % (sum(r["em"] for r in x) / len(x), sum(r["f1"] for r in x) / len(x)))


if __name__ == "__main__":
    a = sys.argv[1:]
    main(a[0], int(a[1]) if len(a) > 1 else None, a[2] if len(a) > 2 else None)
