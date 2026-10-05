"""Cost of crossing from Python into native code, per call, measured in-process with timeit.
Prints JSON. Each figure is the median of 7 repeats of a loop of N calls, divided by N."""
import json
import platform
import statistics
import sys
import timeit

import ct_nb
import ct_pb
import ct_rs

from common import parse

N = 1_000_000


def py_noop():
    pass


def py_tokens(text):
    n, inside = 0, False
    for ch in text:
        is_tok = ch.isascii() and ch.isalnum()
        if is_tok and not inside:
            n += 1
        inside = is_tok
    return n


def per_call(stmt, glb, n=N, rep=7):
    ts = timeit.repeat(stmt, globals=glb, number=n, repeat=rep)
    return {"median_ns": statistics.median(ts) / n * 1e9, "min_ns": min(ts) / n * 1e9, "max_ns": max(ts) / n * 1e9}


def main(path):
    texts = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            rec = parse(line)
            if rec:
                texts.append(rec[1])
    texts = texts[:20000]
    avg_chars = sum(map(len, texts)) / len(texts)
    g = dict(globals(), texts=texts, t0=texts[0])
    out = {"python": sys.version.split()[0], "machine": platform.machine(), "n_calls": N,
           "avg_message_chars": round(avg_chars, 1), "n_messages": len(texts)}
    out["noop"] = {
        "python_function": per_call("py_noop()", g),
        "builtin_len": per_call("len(t0)", g),
        "pyo3": per_call("ct_rs.noop()", g),
        "pybind11": per_call("ct_pb.noop()", g),
        "nanobind": per_call("ct_nb.noop()", g),
        "empty_loop": per_call("pass", g),
    }
    # tokens of one message, per message: Python loop, then each binding called once per message,
    # then each binding called once for all 20,000 messages (cost per message)
    m = len(texts)
    out["per_message"] = {
        "python_loop": per_call("for t in texts: py_tokens(t)", g, n=1, rep=5),
        "pyo3_percall": per_call("for t in texts: ct_rs.count_tokens(t)", g, n=10, rep=7),
        "pybind11_percall": per_call("for t in texts: ct_pb.count_tokens(t)", g, n=10, rep=7),
        "nanobind_percall": per_call("for t in texts: ct_nb.count_tokens(t)", g, n=10, rep=7),
        "pyo3_batch": per_call("ct_rs.count_many(texts)", g, n=10, rep=7),
        "pybind11_batch": per_call("ct_pb.count_many(texts)", g, n=10, rep=7),
        "nanobind_batch": per_call("ct_nb.count_many(texts)", g, n=10, rep=7),
    }
    for v in out["per_message"].values():
        for k in v:
            v[k] /= m
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main(sys.argv[1])
