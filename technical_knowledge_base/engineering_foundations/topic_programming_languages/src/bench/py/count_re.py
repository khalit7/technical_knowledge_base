"""Idiomatic Python: the reference program with the token loop replaced by one compiled regex
(the loop runs inside the re module's C code instead of the bytecode interpreter)."""
import re
import sys
from collections import Counter

from common import parse, report

TOKEN = re.compile(r"[A-Za-z0-9]+")


def main(path):
    per_user = Counter()
    lines = ok = bad = first_bad = 0
    with open(path, encoding="utf-8") as f:
        for lineno, line in enumerate(f, start=1):
            lines += 1
            rec = parse(line)
            if rec is None:
                bad += 1
                first_bad = first_bad or lineno
                continue
            ok += 1
            per_user[rec[0]] += len(TOKEN.findall(rec[1]))
    report(lines, ok, bad, first_bad, per_user)


if __name__ == "__main__":
    main(sys.argv[1])
