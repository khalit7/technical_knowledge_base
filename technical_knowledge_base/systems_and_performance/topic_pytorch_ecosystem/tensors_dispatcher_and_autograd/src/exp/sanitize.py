"""Strip build-machine and local paths from recorded inputs (privacy): any absolute path under /Users or /private
becomes its file name. Run after every recording script:  python3 sanitize.py ../inputs/*.json"""
import re
import sys

for p in sys.argv[1:]:
    s = open(p).read()
    t = re.sub(r"/(?:Users|private)/[^\s\"'()]*/([^/\s\"'()]+)", r"\1", s)
    if t != s:
        open(p, "w").write(t)
        print("sanitized", p)
