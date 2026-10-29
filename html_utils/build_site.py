"""Build the public reading site from the repo: every page's index.html (and img/), a home page with the whole tree,
links between pages rewritten from Notion URLs to site paths, and a small bar on each page (home, breadcrumb, search).
The home page opens with What's new (the tech-news issues and papers, html_utils/whats_new.py), then the learning map
(html_utils/learning_map.py): the build fails when the prerequisite graph has an error, or when an issue or paper lacks
the data its What's new card needs (whats_new.check).

usage: python3 html_utils/build_site.py [out dir, default site/] [base path, default /]
       the GitHub Pages site lives under /technical_knowledge_base/, so CI passes that as the base path
then:  (cd html_utils && NPM_CONFIG_USERCONFIG= npx -y pagefind@1.3.0 --site ../site)   full-text search index
The site is a build output (gitignored); CI builds and deploys it (.github/workflows/site.yml).
"""
import html, json, re, shutil, sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import learning_map
import whats_new

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / "site"
BASE = sys.argv[2] if len(sys.argv) > 2 else "/"
pages = json.loads((ROOT / "technical_knowledge_base/pages.json").read_text())["pages"]
by_path = {p["path"]: p for p in pages}
by_id = {p["id"].replace("-", ""): p for p in pages}
for _p in pages:
    for _a in _p.get("aliases", []):
        by_id.setdefault(_a.replace("-", ""), _p)
NEWS, PAPERS = "technical_knowledge_base/whats_new/tech_news", "technical_knowledge_base/whats_new/papers"
SECTIONS = ["Models & training", "Systems & performance", "Agents & retrieval", "Measurement", "Engineering foundations"]  # What's new sits above them


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


def title(p):
    """the title readers see: topic pages by their name ("Topic: llm-architecture" -> "LLM architecture")"""
    return learning_map.topic_name(p["title"])


# the section colours, the same as the home page's learning map (html_utils/learning_map.py); index = SECTIONS
SEC_LIGHT = ["#3072c1", "#b0540e", "#1c8742", "#8559b2", "#ae4976"]
SEC_DARK = ["#7cb4fc", "#ee9a69", "#76c788", "#c39dee", "#ed90b5"]
BAR_CSS = ("""<style id="kb-bar-css">#kb-bar{font:13px/1.5 ui-sans-serif,-apple-system,"Segoe UI",Helvetica,Arial,sans-serif;max-width:920px;margin:0 auto;padding:8px 16px 0;display:flex;flex-wrap:wrap;gap:4px 10px;align-items:center;color:var(--mute,#787774)}
#kb-bar a{color:inherit;text-decoration:none}#kb-bar a:hover{color:var(--acc,#2f6fb5)}#kb-bar .s{margin-left:auto}
#kb-bar .d{display:inline-block;width:7px;height:7px;border-radius:50%;margin:0 6px 1px 0;vertical-align:middle;background:var(--kb-sc)}"""
           + "".join(f"#kb-bar.k{i}{{--kb-sc:{c}}}" for i, c in enumerate(SEC_LIGHT))
           + "@media (prefers-color-scheme:dark){" + "".join(f"#kb-bar.k{i}{{--kb-sc:{c}}}" for i, c in enumerate(SEC_DARK)) + "}</style>")


def bar(p):
    crumbs, q = [], parent(p)
    while q:
        crumbs.insert(0, q)
        q = parent(q)
    sec = section(p)
    k = SECTIONS.index(sec) if sec in SECTIONS else None
    parts = [f'<a href="{BASE}">Knowledge base</a>'] + [f'<a href="{url(c)}">' + ('<i class="d"></i>' if k is not None and i == 0 else "")
                                                      + f'{html.escape(title(c))}</a>' for i, c in enumerate(crumbs)]
    cls = f' class="k{k}"' if k is not None else ""
    return f'<nav id="kb-bar"{cls} data-pagefind-ignore>{" / ".join(parts)}<a class="s" href="{BASE}#search">Search</a></nav>'


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
    kids = sorted(children(p), key=lambda c: c["title"]) if "whats_new/" in p["path"] else children(p)
    li = f'<li><a href="{url(p)}">{html.escape(title(p))}</a>'
    if kids:
        open_ = " open" if depth == 0 and len(kids) < 20 else ""
        li += f'<details{open_}><summary>{len(kids)} pages</summary><ul>' + "".join(tree(c, depth + 1) for c in kids) + "</ul></details>"
    return li + "</li>"


def stats():
    """the count line under the title: built pages, topics, hours of core reading (the first number of each page's
    "Reading: N min" line)"""
    built = [p for p in pages if (ROOT / p["path"] / "index.html").exists()]
    mins = sum(learning_map.reading(p["path"])[0] or 0 for p in built)
    topics = sum(1 for p in built if p["title"].startswith("Topic: "))
    return len(built), topics, round(mins / 60)


def home():
    roots = [p for p in pages if parent(p) is None]
    body, nsec = "", 0
    for k, sec in enumerate(SECTIONS):
        rs = [p for p in roots if p.get("section") == sec]
        if rs:
            n = sum(1 + len(desc(r)) for r in rs)
            nsec += n
            body += (f'<div class="sec s{k}"><h3><i></i>{html.escape(sec)}<span>{n} pages</span></h3><ul>'
                     + "".join(tree(r) for r in rs) + "</ul></div>")
    npages, ntopics, hours = stats()
    body = (whats_new.home(pages, url, by_id, by_path[NEWS], by_path[PAPERS]) + learning_map.section(url, KB)
            + f'<details class="all"><summary>All pages by section<span>{nsec} pages</span></summary><div class="secs">{body}</div></details>')

    return f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Technical knowledge base</title><meta name="description" content="Khalid's technical knowledge base: {npages} pages in {ntopics} topics, with a learning map of the order to study them in.">
<link href="{BASE}pagefind/pagefind-ui.css" rel="stylesheet"><script src="{BASE}pagefind/pagefind-ui.js"></script>
<style>:root{{--bg:#fff;--ink:#2f3437;--mute:#6f6e69;--line:#e9e9e7;--acc:#2f6fb5;--card:#fff;--cardln:rgba(31,35,40,.10);
 --pagefind-ui-scale:.78;--pagefind-ui-primary:#2f6fb5;--pagefind-ui-border:rgba(31,35,40,.16);--pagefind-ui-border-width:1px;--pagefind-ui-border-radius:12px;--pagefind-ui-font:inherit}}
@media (prefers-color-scheme:dark){{:root{{--bg:#191919;--ink:#e6e5e3;--mute:#9b9a97;--line:#2f2f2f;--acc:#6ea8e6;--card:#212123;--cardln:rgba(255,255,255,.08);color-scheme:dark;
 --pagefind-ui-primary:#e6e5e3;--pagefind-ui-text:#e6e5e3;--pagefind-ui-background:#212123;--pagefind-ui-border:rgba(255,255,255,.14);--pagefind-ui-tag:#2a2a2c}}}}
html{{background:var(--bg)}}
body{{margin:0;color:var(--ink);font:15px/1.6 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}}
.w{{max-width:1120px;margin:0 auto;padding:0 16px 56px;box-sizing:border-box}}@media (min-width:1000px){{.w{{padding:0 24px 64px}}}}
a{{color:var(--acc);text-decoration:none}}a:hover{{text-decoration:underline;text-underline-offset:3px}}
.glow{{position:relative;isolation:isolate;overflow:hidden}}.hero{{padding-top:44px;padding-bottom:4px}}
.glow::before{{content:"";position:absolute;inset:-40px 0 auto;height:440px;z-index:-1;pointer-events:none;
 background:radial-gradient(38% 60% at 18% 32%,color-mix(in oklab,var(--s0) 15%,transparent),transparent 70%),
  radial-gradient(34% 56% at 78% 18%,color-mix(in oklab,var(--s3) 12%,transparent),transparent 70%),
  radial-gradient(30% 50% at 52% 0%,color-mix(in oklab,var(--s2) 7%,transparent),transparent 70%)}}
@media (prefers-color-scheme:dark){{.glow::before{{background:radial-gradient(38% 60% at 18% 32%,color-mix(in oklab,var(--s0) 16%,transparent),transparent 70%),
  radial-gradient(34% 56% at 78% 18%,color-mix(in oklab,var(--s3) 13%,transparent),transparent 70%),
  radial-gradient(30% 50% at 52% 0%,color-mix(in oklab,var(--s2) 7%,transparent),transparent 70%)}}}}
h1{{font-size:34px;font-weight:650;letter-spacing:-.022em;line-height:1.1;margin:0}}
.tag{{font-size:16.5px;color:var(--mute);margin:10px 0 0;max-width:68ch}}
.stats{{display:flex;flex-wrap:wrap;gap:6px 8px;margin:16px 0 22px;padding:0;list-style:none;font-size:13px;color:var(--mute);font-variant-numeric:tabular-nums}}
.stats li{{padding:3px 11px;border:1px solid var(--cardln);border-radius:999px;background:color-mix(in oklab,var(--card) 70%,transparent)}}.stats b{{color:var(--ink);font-weight:600}}
#search{{position:relative;max-width:760px}}
#search .pagefind-ui__search-input{{font-weight:400;box-shadow:0 1px 2px rgba(31,35,40,.05),0 4px 14px rgba(31,35,40,.06);transition:border-color 150ms cubic-bezier(.2,0,0,1),box-shadow 150ms cubic-bezier(.2,0,0,1)}}
#search .pagefind-ui__search-input::placeholder{{color:var(--mute);opacity:1}}
#search .pagefind-ui__search-input:focus{{outline:none;border-color:var(--acc);box-shadow:0 0 0 4px color-mix(in oklab,var(--acc) 22%,transparent)}}
#search .pagefind-ui__form::before{{opacity:.6}}
.kbd{{position:absolute;right:12px;top:12px;font:12px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:var(--mute);padding:5px 7px;border:1px solid var(--cardln);border-radius:6px;background:var(--bg);pointer-events:none}}
#search:has(.pagefind-ui__search-input:focus) .kbd,#search:has(.pagefind-ui__search-input:not(:placeholder-shown)) .kbd,#search:not(:has(.pagefind-ui__search-input)) .kbd{{display:none}}
details.all{{margin:48px 0 0;border-top:1px solid var(--line);padding-top:16px}}
details.all>summary{{font-size:18px;font-weight:600;color:var(--ink);cursor:pointer;list-style:none;width:max-content}}details.all>summary::-webkit-details-marker{{display:none}}
details.all>summary::before{{content:"";display:inline-block;width:7px;height:7px;margin:0 12px 3px 2px;border-right:2px solid var(--mute);border-bottom:2px solid var(--mute);transform:rotate(-45deg);transition:transform 200ms cubic-bezier(.2,0,0,1)}}
details.all[open]>summary::before{{transform:rotate(45deg)}}details.all>summary span{{font-size:13px;font-weight:400;color:var(--mute);margin-left:10px;font-variant-numeric:tabular-nums}}
.secs{{margin-top:16px;column-gap:14px}}@media (min-width:900px){{.secs{{columns:2}}}}
.sec{{break-inside:avoid;margin:0 0 14px;display:block;padding:14px 18px 12px;border:1px solid var(--cardln);border-radius:12px;background:var(--card);box-shadow:0 1px 1px rgba(31,35,40,.04),0 2px 4px rgba(31,35,40,.04);font-size:14.5px;line-height:1.5;min-width:0}}
.sec h3{{display:flex;align-items:center;gap:8px;margin:0 0 6px;font-size:12px;font-weight:650;text-transform:uppercase;letter-spacing:.06em;color:var(--ink)}}
.sec h3 i{{width:8px;height:8px;border-radius:50%;background:var(--sc,var(--mute))}}.sec h3 span{{margin-left:auto;font-weight:400;text-transform:none;letter-spacing:0;color:var(--mute);font-variant-numeric:tabular-nums}}
.sec ul{{padding-left:18px;margin:2px 0}}.sec>ul{{padding-left:0;list-style:none}}.sec>ul>li{{margin:6px 0}}.sec>ul>li>a{{font-weight:600}}.sec li{{margin:2px 0}}
.sec summary{{color:var(--mute);font-size:12.5px;cursor:pointer;width:max-content}}.sec summary:hover{{color:var(--ink)}}
@media (prefers-color-scheme:dark){{body::before{{content:"";position:fixed;inset:0;z-index:-1;pointer-events:none;opacity:.035;
 background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.8' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 1 0 0 0 0 1 0 0 0 0 1 0 0 0 .9 0'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E")}}}}
@media (max-width:640px){{.hero{{padding-top:30px}}h1{{font-size:26px}}.tag{{font-size:15px}}}}
@media (prefers-reduced-motion:reduce){{*{{transition:none!important}}}}
{learning_map.CSS}
{whats_new.CSS}</style></head>
<body><div class="glow"><header class="hero w"><h1>Technical knowledge base</h1>
<p class="tag">Deep, visual explanations of how modern AI systems work: what's new each week, and a map of the order to learn it all in.</p>
<ul class="stats" aria-label="Size of the knowledge base"><li><b>{npages}</b> pages</li><li><b>{ntopics}</b> topics</li><li><b>{len(SECTIONS)}</b> sections</li><li><b>{hours}</b> h of core reading</li></ul>
<div id="search"><span class="kbd" aria-hidden="true">/</span></div></header></div><div class="w">{body}</div>
<script>window.addEventListener('DOMContentLoaded',()=>{{try{{new PagefindUI({{element:'#search',showSubResults:true,showImages:false,baseUrl:'{BASE}',bundlePath:'{BASE}pagefind/',translations:{{placeholder:'Search all {npages} pages'}}}})}}catch(e){{}}}});
document.addEventListener('keydown',e=>{{if(e.key!=='/'||e.metaKey||e.ctrlKey||e.altKey||e.target.closest('input,textarea,select,[contenteditable]'))return;const i=document.querySelector('#search input');if(i){{e.preventDefault();i.focus()}}}})</script>
</body></html>"""


def desc(p):
    return [c for k in children(p) for c in [k] + desc(k)]


KB = learning_map.KB(pages)


def main():
    err, _, _ = learning_map.check(KB)
    if err:
        sys.exit(f"build stopped: {len(err)} learning map error(s) in technical_knowledge_base/pages.json (see above)")
    wn = whats_new.check(pages)
    if wn:
        print(*wn, sep="\n")
        sys.exit(f"build stopped: {len(wn)} What's new data problem(s) (see above; python3 html_utils/whats_new.py check)")
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
        else:  # a parent with no page of its own (Papers, Tech news): its children as cards (html_utils/whats_new.py)
            main_ = (whats_new.papers_index(pages, url, by_id) if p["path"] == PAPERS else whats_new.news_index(pages, url) if p["path"] == NEWS
                     else "<h1>" + html.escape(p["title"]) + "</h1><ul>" + "".join(f'<li><a href="{url(c)}">{html.escape(c["title"])}</a></li>' for c in children(p)) + "</ul>")
            (dst / "index.html").write_text(f'<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
                                            f'<title>{html.escape(p["title"])}</title><style>{whats_new.PAGE_CSS}\n{whats_new.CSS}</style>{BAR_CSS}</head>'
                                            f'<body>{bar(p)}<main class="w">{main_}</main></body></html>')
        if (src / "img").is_dir():
            shutil.copytree(src / "img", dst / "img")
    redirects()
    # the section was "Reference" (folder reference/) until 2026-10-27: old links land on the moved page; the bare
    # section folders (no page of their own) land on the home page's What's new block
    for d in (OUT / "reference", OUT / "whats_new"):
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(f'<!doctype html><meta charset="utf-8"><title>Redirect</title><meta name="robots" content="noindex">'
                                      f'<script>location.replace({json.dumps(BASE + "#new")})</script><a href="{BASE}#new">What\'s new</a>')
    for p in pages:
        if p["path"].startswith("technical_knowledge_base/whats_new/"):
            d = OUT / ("reference" + p["path"].removeprefix("technical_knowledge_base/whats_new"))
            d.mkdir(parents=True, exist_ok=True)
            (d / "index.html").write_text(f'<!doctype html><meta charset="utf-8"><title>Redirect</title><meta name="robots" content="noindex">'
                                          f'<script>location.replace({json.dumps(url(p))}+location.hash)</script><a href="{url(p)}">{html.escape(p["title"])}</a>')
    (OUT / "index.html").write_text(home())
    print(f"site: {n} pages in {OUT}")


if __name__ == "__main__":
    main()
