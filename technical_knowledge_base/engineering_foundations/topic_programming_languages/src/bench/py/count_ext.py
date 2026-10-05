"""Python calling native code, three ways of crossing the boundary.
usage: count_ext.py {rs,pb,nb} {percall,batch,file} path [threads]
  percall: Python parses each line, native counts its tokens: one crossing per message
  batch:   Python parses every line, one native call counts all messages
  file:    one native call does everything (Rust only: serde_json inside the extension)"""
import importlib
import sys
from collections import Counter

from common import parse, report


def main(impl, mode, path, threads=1):
    m = importlib.import_module({"rs": "ct_rs", "pb": "ct_pb", "nb": "ct_nb"}[impl])
    if mode == "file":
        lines, ok, bad, first_bad, per_user = m.count_file(path, threads)
        report(lines, ok, bad, first_bad, per_user)
        return
    per_user = Counter()
    lines = ok = bad = first_bad = 0
    users, texts = [], []
    with open(path, encoding="utf-8") as f:
        for lineno, line in enumerate(f, start=1):
            lines += 1
            rec = parse(line)
            if rec is None:
                bad += 1
                first_bad = first_bad or lineno
                continue
            ok += 1
            if mode == "percall":
                per_user[rec[0]] += m.count_tokens(rec[1])
            else:
                users.append(rec[0])
                texts.append(rec[1])
    if mode == "batch":
        for u, n in zip(users, m.count_many(texts)):
            per_user[u] += n
    report(lines, ok, bad, first_bad, per_user)


if __name__ == "__main__":
    a = sys.argv
    main(a[1], a[2], a[3], int(a[4]) if len(a) > 4 else 1)
