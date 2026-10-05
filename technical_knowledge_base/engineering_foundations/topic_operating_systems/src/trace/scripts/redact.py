"""Redact raw recordings in place, then gzip the big ones.

Removed: home-directory paths, the container's host name (strace prints it inside uname()),
IPv4 addresses other than 0.0.0.0 and 127.0.0.1, and the machine-specific patterns kept outside the
repo by the protocols topic's private_patterns.py. Files over 1 MB are gzipped (name.txt -> name.txt.gz)
so no committed file is large; parse.py reads either form.
Usage: python3 redact.py <raw folder>
"""
import gzip
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../../../../../agents_and_retrieval/topic_protocols/src"))
try:
    import private_patterns  # noqa: E402

    PRIV = private_patterns.alternation()
except Exception:  # helper missing: only the generic rules apply
    PRIV = r"(?!x)x"

RULES = [
    (re.compile(r"/Users/[^/\s\"']+"), "/Users/<user>"),
    (re.compile(r"/home/[^/\s\"']+"), "/home/<user>"),
    (re.compile(r'nodename="[^"]*"'), 'nodename="<host>"'),
    (re.compile(r"\b(?!0\.0\.0\.0\b)(?!127\.0\.0\.1\b)(\d{1,3}\.){3}\d{1,3}\b"), "<ip>"),
    (re.compile(PRIV), "<private>"),
    (re.compile(r"(glpat-|sk-ant-)[A-Za-z0-9_\-]+"), "<token>"),
]


def redact_text(s):
    for rx, rep in RULES:
        s = rx.sub(rep, s)
    return s


def main(folder):
    n_changed = 0
    for name in sorted(os.listdir(folder)):
        p = os.path.join(folder, name)
        if not name.endswith(".txt") or not os.path.isfile(p):
            continue
        with open(p, encoding="utf-8", errors="replace") as f:
            s = f.read()
        r = redact_text(s)
        if r != s:
            n_changed += 1
        if len(r.encode()) > 1_000_000:
            with gzip.open(p + ".gz", "wt", encoding="utf-8", compresslevel=9) as g:
                g.write(r)
            os.remove(p)
        else:
            with open(p, "w", encoding="utf-8") as f:
                f.write(r)
    print(f"redacted {folder}: {n_changed} files changed")


if __name__ == "__main__":
    main(sys.argv[1])
