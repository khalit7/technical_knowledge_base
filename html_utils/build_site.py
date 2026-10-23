"""Build the private reading site from the repo: every page's index.html (and img/), a home page with the whole tree,
links between pages rewritten from Notion URLs to site paths, and a small bar on each page (home, breadcrumb, search).

usage: python3 html_utils/build_site.py [out dir, default site/] [base path, default /]
       the GitHub Pages site lives under /technical_knowledge_base/, so CI passes that as the base path
then:  (cd html_utils && NPM_CONFIG_USERCONFIG= npx -y pagefind@1.3.0 --site ../site)   full-text search index
The site is a build output (gitignored); CI builds and deploys it (.github/workflows/site.yml).
"""
import html, json, re, shutil, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "site"
BASE = sys.argv[2] if len(sys.argv) > 2 else "/"
pages = json.loads((ROOT / "technical_knowledge_base/pages.json").read_text())["pages"]
by_path = {p["path"]: p for p in pages}
by_id = {p["id"].replace("-", ""): p for p in pages}
for _p in pages:
    for _a in _p.get("aliases", []):
        by_id.setdefault(_a.replace("-", ""), _p)
SECTIONS = ["Models & training", "Systems & performance", "Agents & retrieval", "Measurement", "Engineering foundations", "Reference"]


def url(p):
    return BASE + p["path"].removeprefix("technical_knowledge_base/") + "/"


def parent(p):
    path = p["path"]
    while "/" in path:
        path = path.rsplit("/", 1)[0]
        if path in by_path:
            return by_path[path]
    return None


def children(p):
    return [c for c in pages if parent(c) is p]


def section(p):
    while p and not p.get("section"):
        p = parent(p)
    return p.get("section") if p else None


BAR_CSS = """<style id="kb-bar-css">#kb-bar{font:13px/1.5 ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;max-width:920px;margin:0 auto;padding:8px 16px 0;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;color:var(--mute,#787774)}
#kb-bar a{color:inherit;text-decoration:none}#kb-bar a:hover{color:var(--acc,#2f6fb5)}#kb-bar .s{margin-left:auto}</style>"""


def bar(p):
    crumbs, q = [], parent(p)
    while q:
        crumbs.insert(0, q)
        q = parent(q)
    parts = [f'<a href="{BASE}">Knowledge base</a>'] + [f'<a href="{url(c)}">{html.escape(c["title"])}</a>' for c in crumbs]
    return f'<nav id="kb-bar" data-pagefind-ignore>{" / ".join(parts)}<a class="s" href="{BASE}#search">Search</a></nav>'


def relink(s):
    def rep(m):
        pid, frag = m.group(1).replace("-", ""), m.group(2) or ""
        p = by_id.get(pid)
        if not p:
            return m.group(0)
        return f'href="{url(p)}{frag}"'
    s = re.sub(r'href="https://(?:app\.notion\.com|www\.notion\.so)/p/([0-9a-f-]{32,36})(#[^"]*)?"', rep, s)
    # site links open in the same tab; outside links keep target=_blank
    s = re.sub(r'(<a href="' + re.escape(BASE) + r'[^"]*")\s+target="_blank"\s+rel="noopener noreferrer"', r"\1", s)
    # Notion URLs left inside script data or built by concatenation go through /p/<id>/, a redirect page
    for m in re.finditer(r"(?:app\.notion\.com|www\.notion\.so)/p/([0-9a-f]{32})", s):
        REFS.add(m.group(1))
    return re.sub(r"https://(?:app\.notion\.com|www\.notion\.so)/p/", BASE + "p/", s)


REFS = set()


def redirects():
    # a page merged into another keeps working: its old id is listed in the survivor's "aliases"
    alias = {a.replace("-", ""): p for p in pages for a in p.get("aliases", [])}
    for pid in set(by_id) | REFS | set(alias):
        p = by_id.get(pid) or alias.get(pid)
        to = url(p) if p else f"https://app.notion.com/p/{pid}"
        d = OUT / "p" / pid
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(f'<!doctype html><meta charset="utf-8"><title>Redirect</title><meta name="robots" content="noindex">'
                                      f'<script>location.replace({json.dumps(to)}+location.hash)</script><a href="{to}">{html.escape(p["title"]) if p else "Open in Notion"}</a>')


def tree(p, depth=0):
    kids = sorted(children(p), key=lambda c: c["title"]) if "reference/" in p["path"] else children(p)
    li = f'<li><a href="{url(p)}">{html.escape(p["title"])}</a>'
    if kids:
        open_ = " open" if depth == 0 and len(kids) < 20 else ""
        li += f'<details{open_}><summary>{len(kids)} pages</summary><ul>' + "".join(tree(c, depth + 1) for c in kids) + "</ul></details>"
    return li + "</li>"


def home():
    roots = [p for p in pages if parent(p) is None]
    body = ""
    for sec in SECTIONS:
        rs = [p for p in roots if p.get("section") == sec]
        if rs:
            body += f"<h2>{html.escape(sec)}</h2><ul>" + "".join(tree(r) for r in rs) + "</ul>"
    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Technical knowledge base</title><link href="{BASE}pagefind/pagefind-ui.css" rel="stylesheet"><script src="{BASE}pagefind/pagefind-ui.js"></script>
<style>:root{{--bg:#fff;--ink:#2f3437;--mute:#787774;--line:#e9e9e7;--acc:#2f6fb5;--pagefind-ui-scale:.85}}
@media (prefers-color-scheme:dark){{:root{{--bg:#191919;--ink:#e6e5e3;--mute:#9b9a97;--line:#2f2f2f;--acc:#6ea8e6;--pagefind-ui-primary:#e6e5e3;--pagefind-ui-text:#e6e5e3;--pagefind-ui-background:#191919;--pagefind-ui-border:#2f2f2f;--pagefind-ui-tag:#222}}}}
body{{margin:0;background:var(--bg);color:var(--ink);font:15px/1.6 ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif}}
.w{{max-width:920px;margin:0 auto;padding:18px 16px 40px}}h1{{font-size:23px;margin:0 0 12px}}h2{{font-size:18px;margin:28px 0 4px}}
a{{color:var(--acc);text-decoration:none}}a:hover{{text-decoration:underline}}ul{{padding-left:20px;margin:4px 0}}li{{margin:3px 0}}
summary{{color:var(--mute);font-size:12.5px;cursor:pointer}}</style></head>
<body><div class="w"><h1>Technical knowledge base</h1><div id="search"></div>{body}</div>
<script>window.addEventListener('DOMContentLoaded',()=>{{try{{new PagefindUI({{element:'#search',showSubResults:true,showImages:false,baseUrl:'{BASE}',bundlePath:'{BASE}pagefind/'}})}}catch(e){{}}}})</script>
</body></html>"""


def main():
    if OUT.exists():
        shutil.rmtree(OUT)
    OUT.mkdir(parents=True)
    n = 0
    for p in pages:
        src = ROOT / p["path"]
        dst = OUT / p["path"].removeprefix("technical_knowledge_base/")
        dst.mkdir(parents=True, exist_ok=True)
        f = src / "index.html"
        if f.exists():
            s = relink(f.read_text())
            s = s.replace("</head>", BAR_CSS + "</head>", 1)
            s = re.sub(r"(<body[^>]*>)", lambda m: m.group(1) + bar(p), s, count=1)
            (dst / "index.html").write_text(s)
            n += 1
        else:  # a parent with no page of its own (Papers, Tech news): list its children
            kids = "".join(f'<li><a href="{url(c)}">{html.escape(c["title"])}</a></li>' for c in sorted(children(p), key=lambda c: c["title"]))
            (dst / "index.html").write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{html.escape(p["title"])}</title>{BAR_CSS}</head><body style="font:15px/1.6 sans-serif;max-width:920px;margin:0 auto;padding:0 16px">{bar(p)}<h1>{html.escape(p["title"])}</h1><ul>{kids}</ul></body></html>')
        if (src / "img").is_dir():
            shutil.copytree(src / "img", dst / "img")
    redirects()
    (OUT / "index.html").write_text(home())
    print(f"site: {n} pages in {OUT}")


if __name__ == "__main__":
    main()
