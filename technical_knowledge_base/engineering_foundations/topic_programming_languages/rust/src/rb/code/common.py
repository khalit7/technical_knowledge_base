"""Shared helpers for the Part 2 scripts: the benchmark input and a timeit wrapper."""
import json
import os
import statistics
import timeit

CHAT = os.environ.get("CHAT", "chat200k.jsonl")   # rosetta/data/gen_chat.py --lines 200000 --seed 7


def texts(n=20000):
    """The first n ok messages of the 200k-line log, as Python str objects."""
    out = []
    with open(CHAT, encoding="utf-8") as f:
        for line in f:
            try:
                rec = json.loads(line)
                if isinstance(rec.get("user"), str) and isinstance(rec.get("text"), str):
                    out.append(rec["text"])
            except (ValueError, AttributeError):
                pass
            if len(out) == n:
                break
    return out


def per(stmt, glb, number, repeat=7, divide=1):
    """Median, min and max of `repeat` runs of `number` executions, in ns per unit (divide units per execution)."""
    ts = timeit.repeat(stmt, globals=glb, number=number, repeat=repeat)
    k = 1e9 / number / divide
    return {"med": statistics.median(ts) * k, "min": min(ts) * k, "max": max(ts) * k}
