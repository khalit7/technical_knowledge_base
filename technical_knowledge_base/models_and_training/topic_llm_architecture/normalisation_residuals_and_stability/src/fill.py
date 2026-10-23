"""Resolve {%key%} placeholders in ../index.html from out/page_numbers.json (written by make_page_data.py), so every
number in the prose comes from the recorded data. A missing key stops the build. Also fills the reading time."""
import json, os, re, sys, html as H

HERE = os.path.dirname(os.path.abspath(__file__))
P = os.path.join(HERE, "..", "index.html")
nums = json.load(open(os.path.join(HERE, "out", "page_numbers.json")))
t = open(P, encoding="utf-8").read()
missing = sorted(set(k for k in re.findall(r"\{%([\w.\-]+)%\}", t) if k not in nums and k not in ("RT_MIN", "RT_DET")))
if missing:
    sys.exit("fill.py: missing keys " + ", ".join(missing))
for _ in range(4):   # values may hold further placeholders
    t2 = re.sub(r"\{%([\w.\-]+)%\}", lambda m: str(nums[m.group(1)]) if m.group(1) in nums else m.group(0), t)
    if t2 == t:
        break
    t = t2


def link(m):  # the same link macros build.sh expands, for links that arrived inside filled values
    txt, u = m.group(1), m.group(2)
    if re.match(r"^#(t-[\w-]+)$", u):
        return f'<a href="#" data-tab="{u[1:]}">{txt}</a>'
    u = re.sub(r"^n:", "https://app.notion.com/p/", u)
    return f'<a href="{u}" target="_blank" rel="noopener noreferrer">{txt}</a>'


t = re.sub(r"\{\{([^|{}]+)\|([^{}]+)\}\}", link, t)
if "{{" in t:
    sys.exit("fill.py: unexpanded link macro after filling")
# reading time: measured on the rendered page by reading_time.mjs (230 words a minute, closed <details> apart, as
# html_utils/audit_pages.mjs counts); after a text change run it, then build.sh again.
RT = os.path.join(HERE, "out", "reading_time.json")
rt = json.load(open(RT)) if os.path.exists(RT) else {"minutes_main": 0, "minutes_details": 0}
rt, rd = rt["minutes_main"], rt["minutes_details"]
t = t.replace("{%RT_MIN%}", str(rt)).replace("{%RT_DET%}", str(rd))
open(P, "w", encoding="utf-8").write(t)
print(f"fill.py: {len(nums)} numbers; Reading about {rt} min plus {rd} min in closed details")
