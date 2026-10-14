"""The search tool the agents on this page call, runnable on its own (CPU, no generator). Prints what the model reads."""
import os, sys; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import arlib as A

qs, corpus, by = A.mh()


def search(query, k=3, exclude=()):
    """bge-small exact search over the 9,760 paragraphs; already-seen paragraphs are skipped"""
    return A.ranking(query, exclude)[:k]


def observation(pids):
    return "Observation:\n" + "\n".join("[%d] %s: %s" % (i + 1, by[p]["title"], by[p]["text"][:160] + "...") for i, p in enumerate(pids))


q = qs[0]
print("Question:", q["question"])
first = search(q["question"])
print(observation(first))
second = search("Russian Civil War end date", exclude=first)
print(observation(second))
print("gold:", [by[p]["title"] for p in q["gold_pids"]])
