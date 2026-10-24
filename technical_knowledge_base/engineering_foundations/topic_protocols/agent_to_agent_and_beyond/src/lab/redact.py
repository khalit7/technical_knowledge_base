"""Replace scratch and home paths in out/*, then fail if anything secret-like or machine-private remains.
The lab's bearer tokens are fixed lab strings (lab-token-team-a, hook-secret-lab) and stay readable on purpose."""
import os, re, sys
sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "src"))
import private_patterns as pp
O, S = sys.argv[1], sys.argv[2]
home = os.path.expanduser("~")
bad = re.compile(r"glpat-|sk-ant-|BEGIN [A-Z ]*PRIVATE KEY|" + pp.alternation())
for f in os.listdir(O):
    p = os.path.join(O, f); t = open(p, encoding="utf-8", errors="replace").read()
    t = t.replace(os.path.realpath(S), "<scratch>").replace(S, "<scratch>").replace(home, "~")
    t = re.sub(r"/private/tmp/[^\s\"']*", "<scratch>", t)
    open(p, "w", encoding="utf-8").write(t)
    if bad.search(t):
        sys.exit(f"private or secret-like text in {f}")
print("redacted, clean")
