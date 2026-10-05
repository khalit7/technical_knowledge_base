"""Redact the Debug lab's raw recordings in place: home-directory paths, host names, IPv4 addresses other
than 0.0.0.0 and 127.0.0.1, tokens, and the machine-specific patterns kept outside the repository by the
protocols topic's private_patterns.py. Usage: python3 redact.py raw"""
import os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "../../../../agents_and_retrieval/topic_protocols/src"))
try:
    import private_patterns
    PRIV = private_patterns.alternation()
except Exception:
    PRIV = r"(?!x)x"
RULES = [
    (re.compile(r"/Users/[^/\s\"']+"), "/Users/<user>"),
    (re.compile(r"/home/[^/\s\"']+"), "/home/<user>"),
    (re.compile(r"\b(?!0\.0\.0\.0\b)(?!127\.0\.0\.1\b)(\d{1,3}\.){3}\d{1,3}\b"), "<ip>"),
    (re.compile(PRIV), "<private>"),
    (re.compile(r"(glpat-|sk-ant-)[A-Za-z0-9_\-]+"), "<token>"),
]
folder = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "raw")
n = 0
for name in sorted(os.listdir(folder)):
    p = os.path.join(folder, name)
    if not name.endswith(".txt"):
        continue
    s = open(p, encoding="utf-8", errors="replace").read(); r = s
    for rx, rep in RULES:
        r = rx.sub(rep, r)
    if r != s:
        n += 1
        open(p, "w", encoding="utf-8").write(r)
print(f"redacted {folder}: {n} files changed")
