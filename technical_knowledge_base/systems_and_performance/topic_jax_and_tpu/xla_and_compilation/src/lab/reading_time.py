"""Reading time of the Reading tab: words outside code, tables, folded answers, scripts and SVG, at 200 words a minute
(and the folded mistakes/answers plus tables separately). Writes lab/out/reading_time.json; run after build.sh, then
make_data.py and build.sh again (the number is shown on the page)."""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(HERE, "..", "..", "index.html"), encoding="utf-8").read()
read = html.split('id="t-read"', 1)[1].split('id="t-xppass"', 1)[0]
for tag in ("script", "style", "svg", "nav"):
    read = re.sub(r"<%s\b.*?</%s>" % (tag, tag), " ", read, flags=re.S)
extra = ""
for tag in ("pre", "table", "details"):
    extra += " ".join(re.findall(r"<%s\b.*?</%s>" % (tag, tag), read, flags=re.S))
    read = re.sub(r"<%s\b.*?</%s>" % (tag, tag), " ", read, flags=re.S)
words = lambda s: len(re.sub(r"<[^>]+>", " ", s).split())  # noqa: E731
w, we = words(read), words(extra)
out = {"words": w, "extra_words": we, "minutes": round(w / 200), "extra_minutes": round(we / 200)}
json.dump(out, open(os.path.join(HERE, "out", "reading_time.json"), "w"))
print(out)
