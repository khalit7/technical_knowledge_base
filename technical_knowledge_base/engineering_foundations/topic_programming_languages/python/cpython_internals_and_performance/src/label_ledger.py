"""Label this page's src/ledger.json after `ledger.py init`: units inside a closed <details> are depth, the nav line and the
reading-time line are fat, everything else is core; each key is the shortest leading run of the unit's words (6 to 12) that
is found in the built page. Written 2026-10-26; rerun only on a fresh init (it overwrites labels)."""
import html, json, re, subprocess
from pathlib import Path
HERE = Path(__file__).resolve().parent
ROOT = Path(subprocess.run(["git", "rev-parse", "--show-toplevel"], cwd=HERE, capture_output=True, text=True).stdout.strip())
page = (HERE.parent / "index.html").read_text()
page = re.sub(r"<script.*?</script>|<style.*?</style>", " ", page, flags=re.S)
norm = lambda t: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t))).strip().lower()
full = norm(page)
closed = " | ".join(norm(d) for d in re.findall(r"<details.*?</details>", page, flags=re.S))
L = json.loads((HERE / "ledger.json").read_text())
for u in L:
    w = norm(u["text"]).split(" ")
    key = None
    for n in range(6, 13):
        k = " ".join(w[:n])
        if k in full and full.count(k) == 1: key = k; break
    key = key or " ".join(w[:12])
    u["key"] = key
    if u["text"].startswith("Reading:") or u["text"].startswith("The idea Bytecode Objects"):
        u["label"] = "fat"
    elif key in closed and key not in full.replace(closed, ""):
        u["label"] = "depth"
    else:
        u["label"] = "depth" if key in closed else "core"
(HERE / "ledger.json").write_text(json.dumps(L, indent=1, ensure_ascii=False) + "\n")
from collections import Counter
print(Counter(u["label"] for u in L))
