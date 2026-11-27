"""A tech-news issue page (the design of 2026-11-27: one Monday-morning tab, then Further reading).

usage: python3 html_utils/issue_page.py <issue folder>          writes <issue folder>/index.html from src/issue.md
       python3 html_utils/issue_page.py --check <issue folder>  only parses and reports problems

src/issue.md, the issue's own words (page-kinds/tech-news.md has the rules):

    One week, 2026-11-16 to 2026-11-23: <one sentence: what the week was about>

    # The week in brief
    <one paragraph, about 100 words>

    # Top stories
    **<Headline sentence.>** <Two or three sentences: what happened, with the key number.>
    - kind: Model            (Model, Paper, Article, Research, Industry, Chips, Tools, Security, Policy)
    - date: 17 November
    - why: <one sentence: why it matters to someone who builds with LLMs>
    - links: [Source](https://...) (5 min) · [Our page](n:<notion id>)

    **<Next headline.>** ...                         (5 to 7 stories)

    # New in the knowledge base
    ## Papers
    - [Title](n:<id>): <the paper page's takeaway, short>
    ## Articles
    - [Title](n:<id>), Author: <one line>
    ## Updated
    - [Page](n:<id>): <what changed>

    # Further reading
    ## <Group, e.g. Models>
    - <one line per item, with its link and time>
    ## Hacker News
    - ...

Links are Markdown; a target "n:<id>" is a knowledge-base page (https://app.notion.com/p/<id>, which the site build rewrites to
the site page). "(N min)" after a link becomes its time estimate. The page's look is the template's 01_head.html; the previous
and next issues and the Tech news page are added to Further reading from pages.json.
"""
import html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEAD = ROOT / ".claude/skills/explainer-page/build/templates/01_head.html"
ERRBOX = ROOT / ".claude/skills/explainer-page/build/templates/05z_errbox.js.html"
TECH_NEWS_ID = "3c65c17b0d0d817297b0f28491701516"
KINDS = {"model": 1, "paper": 4, "article": 6, "research": 4, "industry": 5, "chips": 2, "tools": 3, "security": 7, "policy": 5}
MON = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]


def inline(s):
    """Markdown inline to HTML: links (n:<id> to the knowledge base), (N min) after a link, bold, italics, code"""
    out, last = [], 0
    for m in re.finditer(r"\[([^\]]+)\]\(([^)\s]+)\)(\s*\((\d+h(?: \d+ ?m(?:in)?)?|\d+ ?min)\))?", s):
        out.append(_em(html.escape(s[last:m.start()], quote=False)))
        t, u, tm = m.group(1), m.group(2), m.group(4)
        if u.startswith("n:"):
            u = "https://app.notion.com/p/" + u[2:]
        elif not re.match(r"https?://", u):
            raise SystemExit(f"bad link target {u!r} in: {s[:120]}")
        out.append(f'<a href="{html.escape(u)}" target="_blank" rel="noopener noreferrer">{_em(html.escape(t, quote=False))}</a>'
                   + (f' <span class="rt">({tm})</span>' if tm else ""))
        last = m.end()
    out.append(_em(html.escape(s[last:], quote=False)))
    return "".join(out)


def _em(s):
    s = re.sub(r"\*\*(.+?)\*\*", r"<b>\1</b>", s)
    s = re.sub(r"(?<![\w*])\*(?!\s)(.+?)(?<!\s)\*(?![\w*])", r"<i>\1</i>", s)
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", s)


def parse(md):
    lines = md.splitlines()
    intro = lines[0].strip() if lines and not lines[0].startswith("#") else ""
    sec, sub, I = None, None, {"intro": intro, "brief": [], "stories": [], "new": {}, "more": {}}
    for ln in lines[1:]:
        s = ln.rstrip()
        if s.startswith("# "):
            sec, sub = s[2:].strip().lower(), None
            continue
        if s.startswith("## "):
            sub = s[3:].strip()
            if sec == "new in the knowledge base":
                I["new"].setdefault(sub, [])
            elif sec == "further reading":
                I["more"].setdefault(sub, [])
            continue
        if not s.strip():
            continue
        if sec == "the week in brief":
            I["brief"].append(s.strip())
        elif sec == "top stories":
            m = re.match(r"\*\*(.+?)\*\*\s*(.*)", s.strip())
            if m:
                I["stories"].append({"head": m.group(1).strip(), "body": m.group(2).strip()})
                continue
            f = re.match(r"-\s*(kind|date|why|links)\s*:\s*(.*)", s.strip(), re.I)
            if f and I["stories"]:
                I["stories"][-1][f.group(1).lower()] = f.group(2).strip()
            elif I["stories"]:
                I["stories"][-1]["body"] += " " + s.strip()
        elif sec in ("new in the knowledge base", "further reading") and sub is not None:
            key = "new" if sec.startswith("new") else "more"
            if s.lstrip().startswith("- "):
                I[key][sub].append(s.lstrip()[2:].strip())
            elif I[key][sub]:
                I[key][sub][-1] += " " + s.strip()
    return I


def problems(I):
    bad = []
    if not re.match(r"(One week|\w+ weeks), \d{4}-\d\d-\d\d to \d{4}-\d\d-\d\d: .{20,}", I["intro"]):
        bad.append('first line: "One week, YYYY-MM-DD to YYYY-MM-DD: <what the week was about>"')
    if not I["brief"]:
        bad.append('no "# The week in brief" paragraph')
    elif len(" ".join(I["brief"]).split()) > 170:
        bad.append(f'the week in brief has {len(" ".join(I["brief"]).split())} words (about 100, at most 170)')
    n = len(I["stories"])
    if not 3 <= n <= 7:
        bad.append(f"{n} top stories (5 to 7; at least 3 in a quiet week)")
    for k, st in enumerate(I["stories"], 1):
        miss = [f for f in ("kind", "why", "links") if not st.get(f)]
        if st.get("kind") and st["kind"].lower() not in KINDS:
            miss.append(f'kind "{st["kind"]}" (one of {", ".join(k.title() for k in KINDS)})')
        if len(st["body"].split()) > 110:
            miss.append(f'body {len(st["body"].split())} words (two or three sentences, at most about 90)')
        if miss:
            bad.append(f'story {k} "{st["head"][:50]}": ' + ", ".join(miss))
    if not any(I["new"].values()):
        bad.append('"# New in the knowledge base" is empty (at least the pages this run changed)')
    return bad


def neighbours(folder):
    pages = json.loads((ROOT / "technical_knowledge_base/pages.json").read_text())["pages"]
    rel = str(folder.resolve().relative_to(ROOT))
    iss = sorted((p for p in pages if p.get("parent") == "Tech news"), key=lambda p: p["path"])
    me = next((i for i, p in enumerate(iss) if p["path"] == rel), None)
    if me is None:
        return None, None, None
    return iss[me], (iss[me - 1] if me > 0 else None), (iss[me + 1] if me + 1 < len(iss) else None)


CSS = """<style id="tn-css">
/* the tech-news issue (html_utils/issue_page.py): one reading column, a card per story */
.tn{max-width:760px}
.tn-k{display:flex;flex-wrap:wrap;gap:6px 14px;align-items:center;color:var(--mute);font-size:14px;margin:6px 0 0}
.tn-k b{color:var(--ink);font-weight:600}
.tn-brief{font-size:17.5px;line-height:1.7;margin:22px 0 8px;max-width:none}
.tn h2{margin-top:40px}
.st{position:relative;background:var(--card);border:1px solid var(--line);border-radius:14px;box-shadow:var(--shadow);padding:18px 22px 16px 22px;margin:16px 0;
 border-left:4px solid var(--sc,var(--acc))}
.st-h{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;font-size:13px;color:var(--mute);font-variant-numeric:tabular-nums}
.st-n{font:600 12px/22px ui-sans-serif,-apple-system,sans-serif;width:22px;height:22px;border-radius:50%;text-align:center;color:var(--sc);background:color-mix(in oklab,var(--sc) 13%,transparent)}
.st-c{font-size:11.5px;font-weight:650;letter-spacing:.05em;text-transform:uppercase;color:var(--sc)}
.st h3{font-family:var(--serif);font-size:20.5px;line-height:1.3;margin:8px 0 6px;font-weight:700}
.st p{margin:0 0 10px}
.st-why{background:var(--soft);border-radius:10px;padding:9px 12px;font-size:15px}
.st-why b{color:var(--sc)}
.st-l{font-size:14.5px;display:flex;flex-wrap:wrap;gap:4px 14px}
.k1{--sc:var(--c1)}.k2{--sc:var(--c2)}.k3{--sc:var(--c3)}.k4{--sc:var(--c4)}.k5{--sc:var(--c5)}.k6{--sc:var(--c6)}.k7{--sc:var(--bad)}
.kbn{display:grid;gap:14px;margin:14px 0}
.kbn section{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 18px 6px}
.kbn h3{margin:2px 0 6px;font-size:12.5px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
.kbn ul,.fr ul{list-style:none;padding:0;margin:0}
.kbn li{padding:8px 0;border-top:1px solid var(--line);font-size:15px;line-height:1.5}.kbn li:first-child{border-top:0}
.fr li{padding:7px 0;border-top:1px solid var(--line);font-size:15px;line-height:1.55}.fr li:first-child{border-top:0}
.fr h3{margin:28px 0 6px;font-size:13px;font-weight:650;letter-spacing:.06em;text-transform:uppercase;color:var(--mute)}
.rt{color:var(--mute);font-size:.9em;white-space:nowrap}
.tn-nav{display:flex;flex-wrap:wrap;gap:10px;margin:28px 0 0}
.tn-nav a{border:1px solid var(--line);background:var(--card);border-radius:999px;padding:6px 14px;font-size:14px}
@media (max-width:520px){.st{padding:15px 15px 13px}.st h3{font-size:18.5px}.tn-brief{font-size:16.5px}}
</style>"""

JS = """(function(){
  // two tabs; an issue always opens on This week (a link may name #t-more)
  const bar=document.getElementById('tabs'),btns=[...bar.querySelectorAll('button')];
  function show(id){btns.forEach(b=>b.setAttribute('aria-selected',b.dataset.t===id?'true':'false'));document.querySelectorAll('.tab').forEach(t=>{t.hidden=t.id!==id})}
  btns.forEach(b=>b.addEventListener('click',()=>show(b.dataset.t)));
  bar.addEventListener('keydown',e=>{const i=btns.findIndex(b=>b.getAttribute('aria-selected')==='true');
    if(e.key==='ArrowRight'||e.key==='ArrowLeft'){const n=btns[(i+(e.key==='ArrowRight'?1:btns.length-1))%btns.length];n.focus();show(n.dataset.t)}});
  document.querySelectorAll('a[data-tab]').forEach(a=>a.addEventListener('click',e=>{e.preventDefault();show(a.dataset.tab);bar.scrollIntoView({block:'start'})}));
  let start='t-read';try{const h=decodeURIComponent(location.hash.slice(1));if(h.startsWith('t-')&&document.getElementById(h))start=h}catch(e){}
  show(start);
})();"""


def render(folder):
    src = folder / "src/issue.md"
    I = parse(src.read_text())
    bad = problems(I)
    if bad:
        raise SystemExit(f"{src}:\n  " + "\n  ".join(bad))
    me, prev, nxt = neighbours(folder)
    title = me["title"] if me else folder.name
    m = re.match(r"(?:One week|(\w+) weeks), (\d{4})-(\d\d)-(\d\d) to (\d{4})-(\d\d)-(\d\d): (.*)", I["intro"])
    a = (int(m.group(2)), int(m.group(3)), int(m.group(4)))
    b = (int(m.group(5)), int(m.group(6)), int(m.group(7)))
    win = (f"{a[2]} to {b[2]} {MON[b[1] - 1]} {b[0]}" if a[:2] == b[:2] else
           f"{a[2]} {MON[a[1] - 1]} to {b[2]} {MON[b[1] - 1]} {b[0]}" if a[0] == b[0] else
           f"{a[2]} {MON[a[1] - 1]} {a[0]} to {b[2]} {MON[b[1] - 1]} {b[0]}")
    span = f"{m.group(1).lower()} weeks" if m.group(1) else "one week"

    cards = []
    for k, st in enumerate(I["stories"], 1):
        kc = KINDS[st["kind"].lower()]
        cards.append(f'<article class="st k{kc}" id="s{k}"><div class="st-h"><span class="st-n">{k}</span><span class="st-c">{html.escape(st["kind"].title())}</span>'
                     + (f'<span>{html.escape(st["date"])}</span>' if st.get("date") else "")
                     + f'</div><h3>{inline(st["head"])}</h3><p>{inline(st["body"])}</p>'
                     f'<p class="st-why"><b>Why it matters:</b> {inline(st["why"])}</p><div class="st-l">{inline(st["links"])}</div></article>')
    new = "".join(f'<section><h3>{html.escape(g)}</h3><ul>' + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul></section>"
                  for g, items in I["new"].items() if items)
    brief = "".join(f'<p class="tn-brief">{inline(p)}</p>' for p in I["brief"])
    read = (f'<div class="tab" id="t-read" role="tabpanel"><div class="tn">{brief}'
            f'<h2>Top stories</h2>{"".join(cards)}'
            f'<h2>New in the knowledge base</h2><div class="kbn">{new}</div>'
            f'<p class="tn-more">Everything else from the week, one line each: <a href="#" data-tab="t-more">Further reading</a>.</p></div></div>')

    groups = "".join(f'<h3>{html.escape(g)}</h3><ul>' + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>"
                     for g, items in I["more"].items() if items)
    nav = "".join(x for x in (
        f'<a href="https://app.notion.com/p/{prev["id"]}" target="_blank" rel="noopener noreferrer">&larr; Previous issue ({html.escape(prev["title"].split(":")[0])})</a>' if prev else "",
        f'<a href="https://app.notion.com/p/{TECH_NEWS_ID}" target="_blank" rel="noopener noreferrer">All issues</a>',
        f'<a href="https://app.notion.com/p/{nxt["id"]}" target="_blank" rel="noopener noreferrer">Next issue ({html.escape(nxt["title"].split(":")[0])}) &rarr;</a>' if nxt else ""))
    more = (f'<div class="tab" id="t-more" role="tabpanel" hidden><div class="tn fr"><h2>Further reading</h2>'
            f'<p>Everything else the week held, one line each, grouped by kind, with its source and a time estimate.</p>{groups}'
            f'<nav class="tn-nav" aria-label="Other issues">{nav}</nav></div></div>')

    words = len(re.sub(r"<[^>]+>", " ", read).split())
    mins = max(1, round(words / 230))
    head = HEAD.read_text().replace("PAGE_TITLE", html.escape(title))
    header = (f'<h1>Tech news, {html.escape(win)}</h1>'
              f'<div class="tn-k"><span><b>{span.capitalize()}</b>, to Monday {b[2]} {MON[b[1] - 1]}</span><span>{len(I["stories"])} stories</span>'
              f'<span id="rt">Reading: {mins} min</span></div>'
              '<div class="tabs" role="tablist" id="tabs"><button role="tab" data-t="t-read" aria-selected="true">This week</button>'
              '<button role="tab" data-t="t-more" aria-selected="false">Further reading</button></div>')
    out = (head.replace("</head>", CSS + "</head>", 1) + header + read + more
           + '<div id="jsErr" hidden style="margin:12px 0;padding:10px 12px;border:1px solid #c2703a;border-radius:8px;font:13px/1.5 ui-monospace,Menlo,monospace;white-space:pre-wrap"></div>\n'
           + ERRBOX.read_text() + f"<script>/* tabs */\n{JS}\n</script>\n</div></body></html>\n")
    if "—" in out:
        raise SystemExit("EM DASH FOUND: " + out[out.index("—") - 80:out.index("—") + 80])
    (folder / "index.html").write_text(out)
    print(f"{folder.name}: {len(I['stories'])} stories, reading {mins} min ({words} words), {len(out.encode())} bytes")


if __name__ == "__main__":
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    if a[0] == "--check":
        bad = problems(parse((Path(a[1]) / "src/issue.md").read_text()))
        print(*bad, sep="\n") if bad else print("issue: 0 problems")
        sys.exit(1 if bad else 0)
    render(Path(a[0]))
