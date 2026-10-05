"""Redact every recorded output in place (recursively): home paths, IPv4 addresses other than 0.0.0.0 and
127.0.0.1, tokens, and the machine-specific patterns of the protocols topic's private_patterns.py.
Usage: python3 redact.py <out folder>"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../../../../../agents_and_retrieval/topic_protocols/src"))
try:
    import private_patterns
    PRIV = private_patterns.alternation()
except Exception:
    PRIV = r"(?!x)x"
RULES = [(re.compile(r"/Users/[^/\s\"']+"), "/Users/<user>"), (re.compile(r"/home/[^/\s\"']+"), "/home/<user>"),
         (re.compile(r"\b(?!0\.0\.0\.0\b)(?!127\.0\.0\.1\b)(\d{1,3}\.){3}\d{1,3}\b"), "<ip>"),
         (re.compile(PRIV), "<private>"), (re.compile(r"(glpat-|sk-ant-)[A-Za-z0-9_\-]+"), "<token>")]
n = 0
for root, _, files in os.walk(sys.argv[1]):
    for name in files:
        p = os.path.join(root, name)
        s = open(p, encoding="utf-8", errors="replace").read()
        r = s
        for rx, rep in RULES:
            r = rx.sub(rep, r)
        if r != s:
            open(p, "w", encoding="utf-8").write(r)
            n += 1
print(f"redacted {sys.argv[1]}: {n} files changed")
