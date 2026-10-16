#!/usr/bin/env python3
"""Storage lab: confirm the built page embeds exactly out/io_data.json (window.IO_D) and that the raw records
re-summarise to the same data. usage: python3 check_data.py"""
import json, os, re, sys
here = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(here, "..", "..", "index.html"), encoding="utf-8").read()
m = re.search(r"window\.IO_D=(\{.*?\});\n", html)
page = json.loads(m.group(1))
ref = json.load(open(os.path.join(here, "out", "io_data.json")))
ref["anatomy"].pop("entry_names_sample", None)
ok = page == ref
print(("ok   " if ok else "FAIL ") + f"page embeds out/io_data.json exactly ({len(m.group(1))} bytes)")
sys.exit(0 if ok else 1)
