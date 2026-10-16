"""Expand {{text|L:<id>}} to {{text|<url>}} using out/lines.json (source lines located by ld_lines.py).
Reads HTML on stdin, writes it on stdout; an unknown id stops the build."""
import json, os, re, sys
L = json.load(open(os.path.join(os.path.dirname(__file__), "..", "out", "lines.json")))
def rep(m):
    if m.group(2) not in L:
        sys.exit("unknown source id " + m.group(2))
    return "{{" + m.group(1) + "|" + L[m.group(2)]["url"] + "}}"
sys.stdout.write(re.sub(r"\{\{([^|{}]+)\|L:([\w]+)\}\}", rep, sys.stdin.read()))
