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
# reading time: words of the Reading tab outside closed <details>, at 200 words per minute; details apart
i, j = t.find('id="t-read"'), t.find('<div class="tab" id="t-', t.find('id="t-read"') + 10)
body = re.sub(r"<(script|style)\b.*?</\1>", " ", t[i:j], flags=re.S)
det = " ".join(re.findall(r"<details\b.*?</details>", body, flags=re.S))
main = re.sub(r"<details\b.*?</details>", " ", body, flags=re.S)
words = lambda s: len(re.findall(r"[A-Za-z0-9][\w'.,%-]*", H.unescape(re.sub(r"<[^>]+>", " ", s))))
rt, rd = round(words(main) / 200), round(words(det) / 200)
t = t.replace("{%RT_MIN%}", str(rt)).replace("{%RT_DET%}", str(rd))
open(P, "w", encoding="utf-8").write(t)
print(f"fill.py: {len(nums)} numbers; Reading about {rt} min plus {rd} min in closed details")
