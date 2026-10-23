"""Reading time per tab from the built page: words outside scripts, styles, SVG and controls at 200 a minute (the audit, html_utils/audit_pages.py, uses 230); words
inside <details> counted apart. Prose filled by scripts (captions, lab texts) is not counted. python3 reading_time.py"""
import re, os, html
H = os.path.dirname(os.path.abspath(__file__))
t = open(os.path.join(H, "../index.html"), encoding="utf-8").read()
t = re.sub(r"<(script|style|svg|select|nav)\b.*?</\1>", " ", t, flags=re.S)
for tab in ["t-read", "t-kv", "t-more"]:
    i = t.index('id="%s"' % tab); j = t.find('<div class="tab" id=', i + 10); s = t[i:j if j > 0 else len(t)]
    det = " ".join(re.findall(r"<details\b.*?</details>", s, flags=re.S)); main = re.sub(r"<details\b.*?</details>", " ", s, flags=re.S)
    w = lambda x: len(html.unescape(re.sub(r"<[^>]+>", " ", x)).split())
    print(tab, "main %d words %.0f min; details %d words %.0f min" % (w(main), w(main) / 200, w(det), w(det) / 200))
