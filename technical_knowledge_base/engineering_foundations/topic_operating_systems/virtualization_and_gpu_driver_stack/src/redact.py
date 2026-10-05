"""Redact recorded outputs in place: home paths and container hostnames (12-hex docker ids) become placeholders."""
import pathlib, re, sys
for p in pathlib.Path(sys.argv[1] if len(sys.argv) > 1 else "raw").glob("*.txt"):
    s = p.read_text()
    t = re.sub("/" + r"Users/[^/\s]+", "<home>", s)
    t = re.sub(r"\b[0-9a-f]{12}\b", "<host>", t)
    t = re.sub(r"vpnkit\.connect=\S+", "vpnkit.connect=<removed>", t)
    if t != s:
        p.write_text(t); print("redacted", p)
