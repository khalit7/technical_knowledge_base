"""The reference program split over N Python threads (one chunk of lines each).
With the GIL (python3.14) only one thread runs bytecode at a time; on the free-threaded
build (python3.14t) the threads run in parallel. usage: count_threads.py path N"""
import sys
from collections import Counter
from concurrent.futures import ThreadPoolExecutor

from common import parse, report


def tokens(text):
    n, inside = 0, False
    for ch in text:
        is_tok = ch.isascii() and ch.isalnum()
        if is_tok and not inside:
            n += 1
        inside = is_tok
    return n


def work(chunk, start):
    per_user = Counter()
    ok = bad = first_bad = 0
    for i, line in enumerate(chunk, start=start):
        rec = parse(line)
        if rec is None:
            bad += 1
            first_bad = first_bad or i
            continue
        ok += 1
        per_user[rec[0]] += tokens(rec[1])
    return ok, bad, first_bad, per_user


def main(path, n):
    with open(path, encoding="utf-8") as f:
        all_lines = f.readlines()
    size = -(-len(all_lines) // n)
    starts = range(0, len(all_lines), size)
    with ThreadPoolExecutor(n) as ex:
        parts = list(ex.map(lambda s: work(all_lines[s:s + size], s + 1), starts))
    per_user = Counter()
    ok = bad = first_bad = 0
    for o, b, fb, pu in parts:
        ok += o
        bad += b
        first_bad = first_bad or fb
        per_user.update(pu)
    report(len(all_lines), ok, bad, first_bad, per_user)


if __name__ == "__main__":
    main(sys.argv[1], int(sys.argv[2]))
