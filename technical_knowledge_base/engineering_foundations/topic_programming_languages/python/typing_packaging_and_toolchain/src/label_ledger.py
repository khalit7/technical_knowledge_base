"""Label this page's ledger (src/ledger.json, drafted by html_utils/ledger.py init): every unit is core or depth on this
page (depth when its text sits only inside a closed <details> block), the section nav is fat, and each key is a
distinctive slice of the unit's own sentence. Run once after init; hand edits afterwards are kept in OVERRIDES."""
import html, json, re
from pathlib import Path
HERE = Path(__file__).resolve().parent
norm = lambda t: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t))).strip().lower()
page = (HERE.parent / "index.html").read_text()
page = re.sub(r"<script.*?</script>|<style.*?</style>", " ", page, flags=re.S)
full = norm(page)
closed = norm(" ".join(re.findall(r"<details.*?</details>", page, flags=re.S)))
outside = norm(re.sub(r"<details.*?</details>", " ", page, flags=re.S))
FAT = ("the idea hints checkers four layers",)  # the section nav
FIXED = {5: ("core", "Reading: 19 min")}  # the header time, edited after init
units = json.loads((HERE / "ledger.json").read_text())
for u in units:
    t = norm(u["text"])
    if any(t.startswith(f) for f in FAT):
        u["label"], u["key"] = "fat", ""; continue
    w = t.split(" ")
    key = " ".join(w[:9]) if len(w) > 9 else t
    if key not in full:  # fall back to a shorter slice that does appear
        for n in range(8, 3, -1):
            key = next((" ".join(w[i:i + n]) for i in range(len(w) - n + 1) if " ".join(w[i:i + n]) in full), None)
            if key: break
    u["key"] = key or ""
    u["label"] = "core" if key and (key in outside or u["tab"] == "t-more") else "depth"
    if u["id"] in FIXED: u["label"], u["key"] = FIXED[u["id"]]
(HERE / "ledger.json").write_text(json.dumps(units, indent=1, ensure_ascii=False) + "\n")
from collections import Counter
print(Counter(u["label"] for u in units), sum(1 for u in units if not u["key"] and u["label"] != "fat"), "without key")
