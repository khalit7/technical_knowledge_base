"""Write from_master.json: every unit of the language page's master ledger (../../src/ledger.json) that this page covers,
labelled owned:<this page> with a key found verbatim on this page, or fat. Keys are the longest slice of the master
sentence (9 words down to 4) present on this page; MANUAL gives the units whose sentence was rewritten here."""
import html, json, re
from pathlib import Path
HERE = Path(__file__).resolve().parent
ME = "engineering_foundations/topic_programming_languages/python/data_model_and_protocols"
norm = lambda t: re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", t))).strip().lower()
page = re.sub(r"<script.*?</script>|<style.*?</style>", " ", (HERE.parent / "index.html").read_text(), flags=re.S)
full = norm(page)
master = {u["id"]: u for u in json.loads((HERE.parent.parent / "src" / "ledger.json").read_text())}
R = lambda a, b: list(range(a, b + 1))
OWN = [37, 38, 40, 41, 42] + R(61, 74) + R(75, 94) + R(95, 118) + R(119, 138) + R(139, 161) + R(187, 196) + R(197, 203) \
    + [304, 305, 312, 315, 316, 317, 320, 321] + R(340, 345) + [346]
FAT = [39, 43, 347, 348, 349, 350]
MANUAL = {
    41: "1.1 kib", 38: "your class behaves like a built-in", 342: "differ in one detail", 340: "data model explorer",
    343: "group \"attribute lookup\"", 90: "replays 19 such lookups", 92: "pure-python arithmetic is slow",
    104: "count tokens per user", 105: "step its real printed trace", 312: "about 2 h", 346: "q_drills.json",
    315: "fluent python", 316: "python distilled", 317: "effective python", 320: "transforming code into beautiful", 321: "beyond pep 8",
    40: "freezes the function's local variables", 42: "a class statement runs its body", 76: "double-underscore (\"dunder\") method", 119: "def is a statement that runs", 120: "closures, decorators and caches all follow", 145: "writes __init__ , __repr__ and __eq__",
    146: "refuses the mistake outright", 63: "labelled by id() as the program ran", 102: "items flow through the whole chain one at a time",
    103: "each finishes before the next begins", 100: "calling a generator function", 101: "is the one-line form",
}
def key_for(t):
    w = norm(t).split(" ")
    for n in range(9, 3, -1):
        for i in range(len(w) - n + 1):
            k = " ".join(w[i:i + n])
            if k in full and not k.startswith(("the ", "a ", "and ")) or (n == 4 and k in full):
                return k
    return None
out, missing = [], []
for i in OWN:
    k = MANUAL.get(i) or key_for(master[i]["text"])
    if not k or norm(k) not in full:
        missing.append((i, master[i]["text"][:110])); continue
    out.append({"id": i, "label": "owned:" + ME, "key": k})
out += [{"id": i, "label": "fat"} for i in FAT]
out.sort(key=lambda x: x["id"])
(HERE / "from_master.json").write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n")
print(len(out), "units written;", len(missing), "missing")
for m in missing: print("MISSING", *m)
