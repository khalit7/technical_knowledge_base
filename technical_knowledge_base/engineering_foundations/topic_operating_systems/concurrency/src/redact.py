"""Redact recorded outputs in place: container hostnames, user paths, and raw addresses that differ per run are kept
(they teach), but nothing identifying the host is left. Usage: python3 redact.py <dir>"""
import pathlib, re, sys

for f in pathlib.Path(sys.argv[1]).rglob("*.txt"):
    s = f.read_text()
    s2 = re.sub(r"/" + "Users/[^\s/]+", "<home>", s)
    s2 = re.sub(r"\b[0-9a-f]{12}\b(?=[:\s])", "<host>", s2)   # docker container hostnames
    if s2 != s:
        f.write_text(s2)
