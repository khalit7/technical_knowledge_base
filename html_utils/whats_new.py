"""What's new: the tech-news issues and the papers, the first block on the site's home page (above the learning map),
and the two index pages under it (Tech news, Papers). Called by build_site.py; reads pages.json, each issue's
src/issue.md (or live.md for the older issues) and each paper's src/paper.json.

usage: python3 html_utils/whats_new.py    prints the latest issue, its top stories and the newest papers it would show
"""
import datetime as dt, html, json, re
from pathlib import Path

import learning_map

ROOT = Path(__file__).resolve().parent.parent
NEWS, PAPERS = "/whats_new/tech_news/", "/whats_new/papers/"
MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
HOME_PAPERS = 6


def plain(s):
    """markdown to plain text: links to their words, no emphasis"""
    s = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", s)
    return re.sub(r"\\([\\`*_$\[\]#])", r"\1", re.sub(r"\*\*|__|`", "", s)).strip()


def top_stories(path):
    """the bold lead sentence of each top story, and the issue's one-line intro (issue.md only)"""
    src = ROOT / path / "src"
    f = src / "issue.md" if (src / "issue.md").exists() else src / "live.md"
    if not f.exists():
        return [], ""
    lines = f.read_text(errors="replace").splitlines()
    intro = plain(lines[0]) if f.name == "issue.md" and lines and not lines[0].startswith("#") else ""
    out, on = [], False
    for ln in lines:
        if ln.startswith("#"):
            on = ln.strip("# ").lower() == "top stories"
            continue
        m = on and re.match(r"\*\*(.+?)\*\*", ln.strip())
        if m:
            out.append(plain(m.group(1)))
    return out, intro


def day(d, year=True):
    return f"{d.day} {MON[d.month - 1][:3]}" + (f" {d.year}" if year else "")


def issues(pages, url):
    """every issue, newest first, with the window it covers (from the issue before it)"""
    rows = sorted((p for p in pages if NEWS in "/" + p["path"] + "/" and (ROOT / p["path"] / "index.html").exists()),
                  key=lambda p: p["path"], reverse=True)
    out = []
    for i, p in enumerate(rows):
        d = dt.date.fromisoformat(p["path"].rsplit("/", 1)[1][:10].replace("_", "-"))
        prev = dt.date.fromisoformat(rows[i + 1]["path"].rsplit("/", 1)[1][:10].replace("_", "-")) if i + 1 < len(rows) else None
        if prev and prev.year == d.year:
            win = f"{prev.day} {MON[prev.month - 1]} to {d.day} {MON[d.month - 1]}" if prev.month != d.month else f"{prev.day} to {d.day} {MON[d.month - 1]}"
        else:
            win = f"week to {d.day} {MON[d.month - 1]}"
        weeks = round((d - prev).days / 7) if prev else 1
        stories, intro = top_stories(p["path"])
        if intro:  # "One week, 2026-10-19 to 2026-10-26: the plumbing ..." keeps only what follows the window
            intro = re.sub(r"^[^:]*\d{4}-\d\d-\d\d[^:]*:\s*", "", intro)
            intro = "" if intro.startswith("Covering ") else intro[:1].upper() + intro[1:]
        out.append({"p": p, "u": url(p), "d": d, "win": win, "weeks": weeks, "top": stories, "intro": intro})
    return out


def _when(j):
    """a sort key and a label for when a paper came out: its arXiv id (YYMM), else the latest "Month YYYY" in it"""
    a = str(j.get("arxiv") or "")
    m = re.match(r"(\d\d)(\d\d)\.(\d+)", a)
    if m:
        y, mo = 2000 + int(m.group(1)), int(m.group(2))
        return (y, mo, int(m.group(3))), f"{MON[mo - 1][:3]} {y}"
    found = [(int(y), MON.index(mo) + 1) for mo, y in re.findall(r"(" + "|".join(MON) + r")\s+(?:\d{1,2}\s+)?(\d{4})", json.dumps(j))]
    if found:
        y, mo = max(found)
        return (y, mo, 0), f"{MON[mo - 1][:3]} {y}"
    return (0, 0, 0), ""


def papers(pages, url, by_id, latest=None):
    """every paper page, newest first by publication; in_issue marks the papers the latest issue links"""
    sec = {s: k for k, s in enumerate(learning_map.SECTIONS)}
    issue_src = (ROOT / latest["p"]["path"] / "index.html").read_text(errors="replace") if latest else ""
    out = []
    for p in pages:
        f = ROOT / p["path"] / "src/paper.json"
        if PAPERS not in "/" + p["path"] + "/" or not f.exists():
            continue
        j = json.loads(f.read_text())
        key, when = _when(j)
        tops = []
        for t in j.get("topics", []):
            q = by_id.get(t.get("id", "").replace("-", ""))
            if q:
                r = q
                while r and not r.get("section"):  # the topic root carries the section
                    r = next((x for x in pages if x["path"] == r["path"].rsplit("/", 1)[0]), None)
                tops.append((learning_map.topic_name(q["title"]).split(":")[0], sec.get(r.get("section")) if r else None, url(q)))
        out.append({"p": p, "u": url(p), "key": key, "when": when, "title": j.get("title") or p["title"],
                    "take": j.get("takeaway", ""), "lab": j.get("lab", ""), "tops": tops,
                    "new": p["id"].replace("-", "") in issue_src})
    out.sort(key=lambda r: r["key"], reverse=True)
    return out


def _paper_card(r, tag="li"):
    k = next((s for _, s, _ in r["tops"] if s is not None), None)
    chips = "".join(f'<span class="wn-chip{f" s{s}" if s is not None else ""}"><i></i>{html.escape(n)}</span>' for n, s, _ in r["tops"][:2])
    badge = '<span class="wn-new">In the latest issue</span>' if r["new"] else ""
    lab = html.escape(r["lab"].split(",")[0].split(" (")[0]) if r["lab"] else ""
    meta = " · ".join(x for x in (html.escape(r["when"]), lab) if x)
    return (f'<{tag} class="wn-pc{f" s{k}" if k is not None else ""}"><a href="{r["u"]}">'
            f'{badge}<span class="wn-pm">{meta}</span><b>{html.escape(r["title"])}</b>'
            f'<span class="wn-pt">{html.escape(r["take"])}</span><span class="wn-chips">{chips}</span></a></{tag}>')


def _issue_list(rows):
    return "".join(f'<li><a href="{r["u"]}"><time datetime="{r["d"]}">{day(r["d"], r["d"].year != dt.date.today().year)}</time>'
                   f'<span>{html.escape(r["top"][0]) if r["top"] else html.escape(r["p"]["title"])}</span></a></li>' for r in rows)


def home(pages, url, by_id, news_page, papers_page):
    """the What's new block for the home page"""
    iss = issues(pages, url)
    if not iss:
        return ""
    L = iss[0]
    ps = papers(pages, url, by_id, L)
    nnew = sum(r["new"] for r in ps)
    top = "".join(f"<li>{html.escape(s)}</li>" for s in L["top"][:5])
    span = f'{L["weeks"]} weeks' if L["weeks"] > 1 else "1 week"
    lead = (f'<a class="wn-lead" href="{L["u"]}"><span class="wn-k"><span class="wn-badge">Latest issue</span>'
            f'<time datetime="{L["d"]}">{day(L["d"])}</time><span>{span}</span></span>'
            f'<h3>Tech news, {html.escape(L["win"])}</h3>'
            + (f'<p class="wn-intro">{html.escape(L["intro"])}</p>' if L["intro"] else "")
            + f'<ol class="wn-top">{top}</ol><span class="wn-go">Read the issue<i aria-hidden="true"></i></span></a>')
    past = (f'<nav class="wn-past" aria-label="Earlier issues"><h4>Earlier issues</h4><ul>{_issue_list(iss[1:7])}</ul>'
            f'<a class="wn-all" href="{url(news_page)}">All {len(iss)} issues<i aria-hidden="true"></i></a></nav>')
    cards = "".join(_paper_card(r) for r in ps[:HOME_PAPERS])
    sub = f"{nnew} from the latest issue, " if nnew else ""
    return f"""<section id="new" class="wn" data-pagefind-ignore>
<div class="wn-h"><h2>What's new</h2><p>The weekly tech news, and the papers worth a page of their own.</p></div>
<div class="wn-grid">{lead}{past}</div>
<div class="wn-ph"><h3>Newest papers</h3><span>{sub}newest first by publication</span><a class="wn-all" href="{url(papers_page)}">All {len(ps)} papers<i aria-hidden="true"></i></a></div>
<ul class="wn-papers">{cards}</ul>
</section>"""


def news_index(pages, url):
    """the Tech news page: every issue as a card, newest first"""
    rows = issues(pages, url)
    body = "".join(f'<li class="wn-ic"><a href="{r["u"]}"><span class="wn-k">'
                   + ('<span class="wn-badge">Latest</span>' if i == 0 else "")
                   + f'<time datetime="{r["d"]}">{day(r["d"])}</time><span>{r["weeks"]} week{"s" if r["weeks"] > 1 else ""}</span></span><h3>{html.escape(r["win"])}</h3>'
                   + (f'<p class="wn-intro">{html.escape(r["intro"])}</p>' if r["intro"] else "")
                   + '<ol class="wn-top">' + "".join(f"<li>{html.escape(s)}</li>" for s in r["top"][:5]) + "</ol></a></li>"
                   for i, r in enumerate(rows))
    return (f'<header class="wn-ph1"><h1>Tech news</h1><p>One issue per weekly window: the releases, papers, results and industry moves, '
            f'each item linked to the page it feeds. {len(rows)} issues, newest first.</p></header><ol class="wn-issues">{body}</ol>')


def papers_index(pages, url, by_id):
    """the Papers page: every paper as a card, grouped by year of publication, newest first"""
    iss = issues(pages, url)
    rows = papers(pages, url, by_id, iss[0] if iss else None)
    years, body = [], ""
    for r in rows:
        y = r["key"][0] or "Undated"
        if y not in years:
            years.append(y)
            body += ("</ul>" if len(years) > 1 else "") + f'<h2 class="wn-y" id="y{y}">{y}<span>{sum(1 for x in rows if (x["key"][0] or "Undated") == y)}</span></h2><ul class="wn-papers wn-all-p">'
        body += _paper_card(r)
    jump = "".join(f'<a href="#y{y}">{y}</a>' for y in years)
    return (f'<header class="wn-ph1"><h1>Papers</h1><p>{len(rows)} papers, each with its own page: the method, the evidence, and a takeaway '
            f'scoped to what the paper shows. Newest first by publication.</p><nav class="wn-jump" aria-label="Years">{jump}</nav></header>{body}</ul>')


# tokens for the two index pages (the home page has its own); the section colours are learning_map's
PAGE_CSS = """:root{--bg:#fff;--ink:#2f3437;--mute:#6f6e69;--line:#e9e9e7;--acc:#2f6fb5;--card:#fff;--cardln:rgba(31,35,40,.10);
 --s0:#3072c1;--s1:#b0540e;--s2:#1c8742;--s3:#8559b2;--s4:#ae4976}
@media (prefers-color-scheme:dark){:root{--bg:#191919;--ink:#e6e5e3;--mute:#9b9a97;--line:#2f2f2f;--acc:#6ea8e6;--card:#212123;--cardln:rgba(255,255,255,.08);color-scheme:dark;
 --s0:#7cb4fc;--s1:#ee9a69;--s2:#76c788;--s3:#c39dee;--s4:#ed90b5}}
html{background:var(--bg)}body{margin:0;color:var(--ink);background:var(--bg);font:15px/1.6 ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.w{max-width:1120px;margin:0 auto;padding:0 16px 56px;box-sizing:border-box}@media (min-width:1000px){.w{padding:0 24px 64px}}
a{color:var(--acc);text-decoration:none}
.wn-ph1{padding:28px 0 6px}.wn-ph1 h1{font-size:30px;font-weight:650;letter-spacing:-.02em;margin:0}.wn-ph1 p{color:var(--mute);margin:8px 0 0;max-width:70ch}
.wn-jump{display:flex;flex-wrap:wrap;gap:6px;margin:14px 0 0}.wn-jump a{font-size:13px;padding:3px 11px;border:1px solid var(--cardln);border-radius:999px;color:var(--mute);font-variant-numeric:tabular-nums}
.wn-jump a:hover{color:var(--ink);border-color:var(--mute)}
.wn-y{display:flex;align-items:baseline;gap:10px;font-size:20px;margin:30px 0 12px;scroll-margin-top:12px;font-variant-numeric:tabular-nums}.wn-y span{font-size:13px;font-weight:400;color:var(--mute)}
.wn-issues{list-style:none;padding:0;margin:20px 0 0;display:grid;gap:14px}@media (min-width:900px){.wn-issues{grid-template-columns:1fr 1fr}}
.wn-ic>a{height:100%;box-sizing:border-box}
body #kb-bar{max-width:1120px}@media (min-width:1000px){body #kb-bar{padding:8px 24px 0}}"""

CSS = """.wn{margin:28px 0 8px}
.wn-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 14px;margin:0 0 14px}.wn-h h2{margin:0;font-size:22px;letter-spacing:-.015em}.wn-h p{margin:0;color:var(--mute);font-size:14.5px}
.wn-grid{display:grid;gap:14px}@media (min-width:900px){.wn-grid{grid-template-columns:minmax(0,1.75fr) minmax(0,1fr)}}
.wn-lead,.wn-ic>a,.wn-past,.wn-pc>a{display:block;border:1px solid var(--cardln);border-radius:14px;background:var(--card);color:var(--ink);
 box-shadow:0 1px 1px rgba(31,35,40,.04),0 2px 6px rgba(31,35,40,.05)}
.wn-lead,.wn-ic>a{position:relative;overflow:hidden;padding:20px 22px 18px;text-decoration:none!important;
 transition:transform 220ms cubic-bezier(.2,0,0,1),box-shadow 220ms cubic-bezier(.2,0,0,1),border-color 220ms cubic-bezier(.2,0,0,1)}
.wn-lead::before,.wn-ic>a::before{content:"";position:absolute;inset:0 0 auto;height:3px;background:linear-gradient(90deg,var(--s0),var(--s3) 40%,var(--s4) 70%,var(--s1))}
.wn-lead::after{content:"";position:absolute;inset:0;z-index:0;pointer-events:none;
 background:radial-gradient(60% 80% at 100% 0%,color-mix(in oklab,var(--s3) 9%,transparent),transparent 70%),radial-gradient(50% 70% at 0% 100%,color-mix(in oklab,var(--s0) 7%,transparent),transparent 70%)}
.wn-lead>*{position:relative;z-index:1}
.wn-lead:hover,.wn-ic>a:hover,.wn-pc>a:hover{transform:translateY(-2px);border-color:color-mix(in oklab,var(--acc) 35%,var(--cardln));box-shadow:0 2px 4px rgba(31,35,40,.05),0 10px 26px rgba(31,35,40,.09)}
.wn-lead:active,.wn-ic>a:active,.wn-pc>a:active{transform:translateY(0) scale(.995)}
.wn-lead:focus-visible,.wn-ic>a:focus-visible,.wn-pc>a:focus-visible,.wn-past a:focus-visible{outline:2px solid var(--acc);outline-offset:2px}
.wn-k{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:13px;color:var(--mute);font-variant-numeric:tabular-nums}.wn-k time{color:var(--ink);font-weight:600}
.wn-badge{font-size:11px;font-weight:650;text-transform:uppercase;letter-spacing:.06em;padding:2px 8px;border-radius:999px;color:var(--acc);background:color-mix(in oklab,var(--acc) 12%,transparent)}
.wn-lead h3,.wn-ic h3{margin:8px 0 4px;font-size:21px;line-height:1.25;letter-spacing:-.012em}.wn-ic h3{font-size:18px}
.wn-intro{margin:0 0 6px;color:var(--mute);font-size:14.5px}
.wn-top{margin:10px 0 0;padding:0;list-style:none;counter-reset:t;display:grid;gap:8px}
.wn-top li{counter-increment:t;display:grid;grid-template-columns:22px 1fr;gap:8px;font-size:14.5px;line-height:1.45}
.wn-top li::before{content:counter(t);font:600 12px/22px ui-sans-serif,-apple-system,sans-serif;text-align:center;width:22px;height:22px;border-radius:50%;
 color:var(--acc);background:color-mix(in oklab,var(--acc) 11%,transparent);font-variant-numeric:tabular-nums}
.wn-go,.wn-all{display:inline-flex;align-items:center;gap:6px;font-size:14px;font-weight:600;color:var(--acc)}.wn-go{margin-top:14px}
.wn-go i,.wn-all i{width:6px;height:6px;border-right:2px solid currentColor;border-top:2px solid currentColor;transform:rotate(45deg);transition:transform 220ms cubic-bezier(.2,0,0,1)}
.wn-lead:hover .wn-go i,.wn-all:hover i{transform:translateX(3px) rotate(45deg)}
.wn-past{padding:16px 18px 14px}.wn-past h4{margin:0 0 6px;font-size:12px;font-weight:650;text-transform:uppercase;letter-spacing:.06em;color:var(--mute)}
.wn-past ul{list-style:none;margin:0 0 10px;padding:0}.wn-past li+li{border-top:1px solid var(--line)}
.wn-past li a{display:grid;grid-template-columns:58px 1fr;gap:10px;padding:9px 6px;margin:0 -6px;border-radius:8px;color:var(--ink);font-size:13.5px;line-height:1.4;text-decoration:none;transition:background-color 150ms}
.wn-past li a:hover{background:color-mix(in oklab,var(--acc) 7%,transparent)}.wn-past time{color:var(--mute);font-variant-numeric:tabular-nums;white-space:nowrap}
.wn-past li span{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wn-ph{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 12px;margin:26px 0 12px}.wn-ph h3{margin:0;font-size:17px}.wn-ph span{color:var(--mute);font-size:13.5px}.wn-ph .wn-all{margin-left:auto}
.wn-papers{list-style:none;margin:0;padding:0;display:grid;gap:12px;grid-template-columns:repeat(auto-fill,minmax(300px,1fr))}
.wn-pc>a{position:relative;height:100%;box-sizing:border-box;padding:14px 16px 14px 18px;display:flex;flex-direction:column;gap:6px;text-decoration:none!important;
 transition:transform 220ms cubic-bezier(.2,0,0,1),box-shadow 220ms cubic-bezier(.2,0,0,1),border-color 220ms cubic-bezier(.2,0,0,1)}
.wn-pc>a::before{content:"";position:absolute;left:0;top:12px;bottom:12px;width:3px;border-radius:0 3px 3px 0;background:var(--sc,var(--line))}
.wn-pm{display:flex;flex-wrap:wrap;align-items:center;gap:4px 8px;font-size:12.5px;color:var(--mute);font-variant-numeric:tabular-nums}
.wn-new{align-self:flex-start;font-size:11px;font-weight:600;padding:1px 7px;border-radius:999px;color:var(--acc);background:color-mix(in oklab,var(--acc) 11%,transparent)}
.wn-pc b{font-size:15px;line-height:1.35;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.wn-pt{font-size:13.5px;line-height:1.5;color:var(--mute);display:-webkit-box;-webkit-line-clamp:4;-webkit-box-orient:vertical;overflow:hidden}
.wn-chips{display:flex;flex-wrap:wrap;gap:4px 6px;margin-top:auto;padding-top:4px}
.wn-chip{display:inline-flex;align-items:center;gap:5px;font-size:12px;padding:1px 8px;border-radius:999px;background:color-mix(in oklab,var(--sc,var(--mute)) 10%,transparent);color:var(--ink)}
.wn-chip i{width:6px;height:6px;border-radius:50%;background:var(--sc,var(--mute))}
.wn .s0,.wn-ph1~* .s0,.wn-papers .s0{--sc:var(--s0)}.wn-papers .s1{--sc:var(--s1)}.wn-papers .s2{--sc:var(--s2)}.wn-papers .s3{--sc:var(--s3)}.wn-papers .s4{--sc:var(--s4)}
@media (max-width:640px){.wn-papers:not(.wn-all-p){grid-auto-flow:column;grid-template-columns:none;grid-auto-columns:84%;overflow-x:auto;scroll-snap-type:x mandatory;
 padding:2px 16px 8px;margin:0 -16px;scrollbar-width:none}.wn-papers:not(.wn-all-p)>li{scroll-snap-align:center}
 .wn-lead{padding:18px 16px 16px}.wn-lead h3{font-size:19px}.wn-ph .wn-all{margin-left:0}}
@keyframes wn-in{from{opacity:0;transform:translateY(8px)}}
.wn-lead,.wn-past,.wn .wn-pc{animation:wn-in 520ms cubic-bezier(.2,0,0,1) backwards}.wn-past{animation-delay:70ms}
.wn .wn-pc:nth-child(1){animation-delay:140ms}.wn .wn-pc:nth-child(2){animation-delay:190ms}.wn .wn-pc:nth-child(3){animation-delay:240ms}
.wn .wn-pc:nth-child(4){animation-delay:290ms}.wn .wn-pc:nth-child(5){animation-delay:340ms}.wn .wn-pc:nth-child(6){animation-delay:390ms}
@media (prefers-reduced-motion:reduce){.wn-lead,.wn-past,.wn .wn-pc{animation:none}.wn *,.wn-papers *,.wn-issues *{transition:none!important}.wn-lead:hover,.wn-ic>a:hover,.wn-pc>a:hover{transform:none}}"""


if __name__ == "__main__":
    import sys
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    pages = json.loads((ROOT / "technical_knowledge_base/pages.json").read_text())["pages"]
    by_id = {p["id"].replace("-", ""): p for p in pages}
    u = lambda p: "/" + p["path"].removeprefix("technical_knowledge_base/") + "/"
    iss = issues(pages, u)
    for r in iss:
        print(r["d"], r["win"], r["weeks"], len(r["top"]), "|", r["intro"][:80])
    print(*[f'  {s[:110]}' for s in iss[0]["top"]], sep="\n")
    for r in papers(pages, u, by_id, iss[0])[:10]:
        print(r["when"], r["new"], r["title"][:60], [t[0] for t in r["tops"]][:2], [t[1] for t in r["tops"]][:2])
