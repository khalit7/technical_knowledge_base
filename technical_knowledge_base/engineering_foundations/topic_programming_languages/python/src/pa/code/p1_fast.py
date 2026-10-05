"""The same result after reading the profile: a dict instead of list scans, and a compiled regex
instead of a Python-level loop over characters."""
import json, re
from collections import Counter
from p1_slow import make_log

TOKEN = re.compile(r"[A-Za-z0-9]+")         # the same token rule, run by the C regex engine

def per_user(lines):
    totals = Counter()
    for line in lines:
        msg = json.loads(line)
        totals[msg["user"]] += len(TOKEN.findall(msg["text"]))
    return sorted(totals.items(), key=lambda p: (-p[1], p[0]))[:5]

if __name__ == "__main__":
    print(per_user(make_log()))
