"""Redact recorded outputs in out/ in place, then fail if anything secret-looking remains.
Redactions: the name of the device-management DNS filter on the recording machine (it intercepts DoH
and serves its own certificate) is replaced by a neutral label. No credentials were ever sent."""
import glob, re, sys, os
import sys as _s, os as _o; _s.path.insert(0, _o.path.join(_o.path.dirname(_o.path.abspath(__file__)), "../..")); from private_patterns import alternation as _priv
HERE = os.path.dirname(os.path.abspath(__file__))
SUBS = [(re.compile(r"L=[^,\n]*, O=[^,\n]*, CN=[^\n]*DNS - Block Page[^\n]*"),
         "[redacted: the issuing CA of this machine's device-management DNS filter]")]
BAD = re.compile(r"glpat-|sk-ant-|Bearer [A-Za-z0-9._-]{12,}|AKIA[0-9A-Z]{16}|" + _priv())
bad = 0
for f in sorted(glob.glob(os.path.join(HERE, "out", "*.txt"))):
    s = open(f).read(); t = s
    for rx, rep in SUBS: t = rx.sub(rep, t)
    if t != s: open(f, "w").write(t); print("redacted", os.path.basename(f))
    for m in BAD.finditer(t):
        if "AKIDEXAMPLE" in t[max(0, m.start()-5):m.end()+5]: continue
        print("SECRET-LOOKING:", os.path.basename(f), m.group(0)); bad += 1
sys.exit(1 if bad else 0)
