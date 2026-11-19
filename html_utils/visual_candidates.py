"""Per-page candidate lists of visuals and text that could be trimmed, for Khalid to approve page by page.

usage: python3 html_utils/visual_candidates.py [--out audit/<date>_visual_candidates.md] [--json out.json] [page folder ...]
With no page folders it reads every technical_knowledge_base/**/index.html. It only reads; it never edits a page.
Standard library only; it parses the built index.html statically (no browser), plus src/parts, src/viz_ideas.md,
technical_knowledge_base/OWNERS.md and audit/2026-11-06_layout_rollout.md.

The criteria (agreed 2026-11-19; the build-time viz_ideas score only sorts, it never decides):
 1 step   a step list (ol.sx, ol.steps, ol.*-steps) shown by default, against the paragraphs beside it (its section or its
          split's left column, whichever is smaller). A sentence is "restated" when 70% of its content words (stop words
          dropped, light stemming), weighted by how rare each word is on the page, occur on the other side. Flagged when
          one side's restated sentences hold at least 40 words and make up half the paragraphs or 35% of the list.
          The cut is that side (paragraph sentences, or step sentences shortened to their titles); minutes = its words / 230.
 2 table  a static table made mostly of numbers (60% of its cells after the first column) whose distinctive numbers
          (decimals, or integers of 3+ digits that are not years or round) are drawn by a figure on the same tab: 60%
          and at least 4 in the same section, or 80% and at least 6 anywhere. Labs and predict figures are skipped.
          The table is the candidate (figures with data are never flagged); numbers only in the table are listed.
 3 dup    two pages' figures share distinctive numbers that occur in figures on at most 8 pages: 4 or more and 60% of
          the smaller set (with captions at least 10% alike, or 6 shared), or 2 with captions 30% alike, or 3 with 15%.
          The owner (the OWNERS.md row whose words best match) keeps its copy; the other copy is the candidate.
 4 echo   a static, non-stage figure whose label words are 90% in the text beside it with at most 2 numbers missing,
          and whose caption has no chart words (scale, axis, median, %, runs, samples), no "counted", "measured" or
          "recorded" and no number of 3+ digits: a schematic that restates its text. Hero, data, controls, predict,
          reproduced and owner visuals are never flagged.
 5 fix    a figure the layout-rollout record calls faded, faint, pale, busy, crowded, cluttered or dense (Polish
          leftovers, and Polish notes, which the cosmetic pass may already have fixed). Fixes, never removals.
 6 closed a closed <details> block over 10 minutes (2,300 words); none reaches that in 2026-11, so also a page whose
          closed blocks add up to over 20 minutes, naming its largest blocks. Depth minutes, kept apart from core.
 7 nums   for every figure or table candidate, numbers that appear only inside it (SVG, JS label strings, table
          cells) and not in the caption or text: they must move into the caption before anything is removed.
 8 flat3d a 3D stage whose depth carries nothing (Khalid, 2026-11-19): its scene header, caption or viz_ideas row
          speaks of lanes, parties, a sequence or timeline, a pipeline, a request's path, a map, or calls it
          schematic or illustrative, and names no structure that depth carries (tensors, matrices, shapes, heads,
          layers, stacks, surfaces, heights or bars, GPUs, chips, racks, topology, memory, grids, planes, points);
          scenes with gridded glass plates (matrices) are skipped. The replacement offered is a 2D swimlane or flow
          diagram, or the step list alone when it already names 90% of the stage's label words. Not a removal.
Never flagged for removal: visuals with real or recorded data (a page data object such as PD.x read by its JS,
numeric data arrays, measured, recorded, published or paper numbers named in the caption or the viz_ideas row),
reproduced or contradicted published figures, labs with more than one control, predict-then-reveal, the page hero
(Fig. 1 or the first visual), an owner's visual.

Minutes use 230 words per minute (audit_pages.py). Page minutes here are a static estimate of the Reading tab's
core words (outside closed details; hidden alternative-mode step lists left out), close to audit_pages.mjs.
"""
import json, math, re, sys
from collections import Counter, defaultdict
from html.parser import HTMLParser
from pathlib import Path

WPM = 230
ROOT = Path(__file__).resolve().parent.parent
KB = ROOT / "technical_knowledge_base"
ROLLOUT = ROOT / "audit" / "2026-11-06_layout_rollout.md"

# ---------------------------------------------------------------- a small DOM
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr",
        "path", "circle", "rect", "line", "polyline", "polygon", "ellipse", "stop", "use"}
BLOCK = {"div", "p", "ol", "ul", "table", "section", "h1", "h2", "h3", "h4", "h5", "h6", "details", "pre", "figure",
         "blockquote", "dl", "form", "header", "footer", "nav", "aside"}


class N:
    __slots__ = ("tag", "a", "kids", "up")

    def __init__(self, tag, a, up):
        self.tag, self.a, self.kids, self.up = tag, a, [], up

    def cls(self):
        return set(self.a.get("class", "").split())

    def walk(self):
        yield self
        for k in self.kids:
            if isinstance(k, N):
                yield from k.walk()

    def anc(self, pred):
        n = self.up
        while n is not None:
            if pred(n):
                return n
            n = n.up
        return None


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = N("#root", {}, None)
        self.cur = self.root
        self.scripts = []

    def _close(self, tag, stop=()):
        n = self.cur
        while n is not None and n.tag != tag:
            if n.tag in stop:
                return
            n = n.up
        if n is not None and n.up is not None:
            self.cur = n.up

    def handle_starttag(self, tag, attrs, end=False):
        a = {k: (v if v is not None else "") for k, v in attrs}
        if tag in BLOCK and self.cur.tag == "p":
            self._close("p")
        if tag == "li":
            self._close("li", stop=("ol", "ul"))
        if tag in ("td", "th"):
            self._close("td", stop=("tr", "table"))
            self._close("th", stop=("tr", "table"))
        if tag == "tr":
            self._close("tr", stop=("table",))
        n = N(tag, a, self.cur)
        self.cur.kids.append(n)
        if tag not in VOID and not end:
            self.cur = n

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs, end=True)

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        n = self.cur
        while n is not None and n.tag != tag:
            n = n.up
        if n is not None and n.up is not None:
            self.cur = n.up

    def handle_data(self, d):
        if self.cur.tag == "script":
            self.scripts.append(d)
        self.cur.kids.append(d)


SKIPTAG = {"script", "style", "button", "nav", "annotation", "annotation-xml", "noscript", "template"}
PANEL = re.compile(r"^kb(Ask|Buddy|Bar|Notes|Toast|Marks|Psel|Nib|AskPop)")


def texts(n, svg=False, skip=None):
    """Yield (text, in_math) for visible text under n (svg text only when svg=True)."""
    for k in n.kids:
        if isinstance(k, str):
            yield k, False
            continue
        if k.tag in SKIPTAG or (k.tag == "svg" and not svg) or PANEL.match(k.a.get("id", "")) \
                or k.a.get("role") == "tablist" or (skip and skip(k)):
            continue
        if k.tag == "math":
            s = "".join(t for t, _ in texts(k, svg, skip))
            yield s, True
            continue
        yield from texts(k, svg, skip)


def text(n, **kw):
    return re.sub(r"\s+", " ", " ".join(t for t, _ in texts(n, **kw))).strip()


def nwords(n, **kw):
    c = 0.0
    for t, m in texts(n, **kw):
        c += len(re.sub(r"\s+", "", t)) / 6 if m else len(t.split())
    return c


def is_closed_details(n):
    return n.tag == "details" and "open" not in n.a


def is_step_list(n):
    if n.tag != "ol":
        return False
    c = n.cls()
    return "sx" in c or "steps" in c or any(x.endswith("-steps") for x in c)


# ---------------------------------------------------------------- words, stems, numbers
STOP = set("""a an the and or but if then else of to in on at by for with from into onto over under as is are was were be
been being it its this that these those there here which who whom whose what when where why how not no nor so than too very
can could may might must shall should will would do does did done has have had having i you he she we they them their our
your his her him us me my also only just each every all any both either neither more most less least much many some such
own same other another one two three four five six seven eight nine ten first second third per via about after before
again against between through during above below up down out off once while until because whether yet still even now
s t don doesn isn aren wasn weren won wouldn shouldn couldn let lets get gets got make makes made take takes took see seen
use uses used using way ways like""".split())


def stem(w):
    w = w.lower().strip("'")
    if w.endswith("'s"):
        w = w[:-2]
    if len(w) > 4 and w.endswith("ies"):
        return w[:-3] + "y"
    if len(w) > 5 and w.endswith("ing"):
        return w[:-3]
    if len(w) > 4 and w.endswith("ed"):
        return w[:-2]
    if len(w) > 4 and w.endswith("es") and w[-3] in "sxzh":
        return w[:-2]
    if len(w) > 3 and w.endswith("s") and not w.endswith("ss"):
        return w[:-1]
    return w


TOK = re.compile(r"[A-Za-z][A-Za-z0-9_'+-]*|\d[\d,]*(?:\.\d+)?")


def toks(s):
    out = []
    for m in TOK.finditer(s):
        w = m.group(0)
        if w[0].isdigit():
            out.append(normnum(w))
        else:
            w = w.strip("'-+")
            if len(w) < 2 or w.lower() in STOP:
                continue
            out.append(stem(w))
    return out


def normnum(w):
    w = w.replace(",", "")
    if "." in w:
        w = w.rstrip("0").rstrip(".")
    return w


NUM = re.compile(r"(?<![\w.#])\d{1,3}(?:,\d{3})+(?:\.\d+)?(?![\w])|(?<![\w.#])\d+(?:\.\d+)?(?![\w])")


def nums(s):
    return [normnum(m.group(0)) for m in NUM.finditer(s)]


def distinctive(x):
    """A number worth matching across a table and a figure: decimals, or integers of 3+ digits that are not years or round."""
    if "." in x:
        return len(x.replace(".", "").lstrip("0")) >= 2
    if len(x) < 3:
        return False
    v = int(x)
    if 1900 <= v <= 2099:
        return False
    return v % 10 != 0


def sentences(s):
    return [x.strip() for x in re.split(r"(?<=[.!?])\s+(?=[A-Z0-9(\"'`])", s) if x.strip()]


def bigrams(t):
    return set(zip(t, t[1:]))


def snip(s, n=150):
    s = re.sub(r"\s+", " ", s).strip()
    return s if len(s) <= n else s[:n].rsplit(" ", 1)[0] + " ..."


# ---------------------------------------------------------------- JS around a figure
STR = re.compile(r"'((?:[^'\\\n]|\\.)*)'|\"((?:[^\"\\\n]|\\.)*)\"|`((?:[^`\\]|\\.)*)`")
CSSY = re.compile(r"rgba?\(|hsla?\(|#[0-9a-f]{3,8}\b|\bpx\b|translate|rotate\(|scale\(|font|stroke|fill|var\(--|^[MLHVCQZmlhvcqz0-9 ,.\-]+$|\bem\b|%;|data:|\\u|=>|function|return|\.js|<[a-z/]", re.I)


def label_strings(js):
    out = []
    for m in STR.finditer(js):
        s = next(g for g in m.groups() if g is not None)
        s = re.sub(r"\$\{[^}]*\}", " ", s)
        s = re.sub(r"<[^>]+>", " ", s)
        if len(s) < 2 or len(s) > 160 or CSSY.search(s) or not re.search(r"[A-Za-z]{2}|\d", s):
            continue
        if re.fullmatch(r"[\w.-]+", s) and not re.search(r"\d", s) and "_" in s:
            continue  # identifiers
        if re.fullmatch(r"[a-z]+(-[a-z0-9]+)+|[a-z]{1,3}\d*|[a-z]+[A-Z]\w*", s):
            continue  # ids, short keys, camelCase
        out.append(s)
    return out


NUMARR = re.compile(r"\[\s*-?\d*\.\d+(?:\s*,\s*-?\d*\.?\d+){5,}|(?::\s*-?\d+\.\d+\s*[,}]\s*\w*\s*){6,}")
DATAREF = re.compile(r"\b(?!(?:RD|S3|JSON|Math|Number|Object|Array|String|Date|URL|DOM|CSS|SVG)\.)[A-Z][A-Z0-9_]{1,11}\.[a-z_]\w*|\bfetch\(|JSON\.parse|window\.[A-Z]{2,}")
CHARTY = re.compile(r"\bscales?\b|\baxis\b|\baxes\b|\bmedian\b|\bshare of\b|%|\bper (?:second|token|call|request|step)\b|\bTable [IVX\d]|"
                    r"\bon the M\d|\bruns?\b|\btrials?\b|\bsamples?\b|\bp\d\d\b", re.I)


# ---------------------------------------------------------------- side files
def owners():
    rows = []
    if not (KB / "OWNERS.md").exists():
        return rows
    for line in (KB / "OWNERS.md").read_text().splitlines():
        if not line.startswith("| ") or line.startswith("| Concept") or line.startswith("|---"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cells) < 2:
            continue
        m = re.search(r"`([^`]+)`", cells[1])
        if not m:
            continue
        rows.append({"concept": cells[0], "owner": m.group(1).replace(".../", "").strip("/"),
                     "figs": set(re.findall(r"Fig\. ?(\d+[a-z]?)", cells[0]))})
    return rows


def owner_rows_for(page, rows):
    return [r for r in rows if page == r["owner"] or page.endswith("/" + r["owner"])]


FIXWORDS = re.compile(r"\b(fad\w*|faint\w*|pale|busy|crowd\w*|clutter\w*|dense)\b", re.I)


def rollout_fix_notes():
    """page suffix -> [(source, note)] from the rollout record's polish notes and leftovers that say faded or cluttered."""
    out = defaultdict(list)
    if not ROLLOUT.exists():
        return out
    sec = None
    for line in ROLLOUT.read_text().splitlines():
        if line.startswith("## "):
            sec = line[3:]
            continue
        if not sec or not sec.startswith("Polish") or not line.startswith("- "):
            continue
        src = "leftovers" if "leftovers" in sec else "polish notes"
        if src == "polish notes":
            m = re.match(r"- `([^`]+)`:\s*(.*)", line)
            if not m:
                continue
            for part in re.split(r";\s+", m.group(2)):
                if FIXWORDS.search(part) and not re.search(r"\b(fixed|accepted)\b", part, re.I):
                    out[m.group(1)].append((src, part.strip().rstrip(".")))
        else:
            body = re.sub(r"^- Batch \d+:\s*", "", line)
            for part in re.split(r"[;.]\s+", body):
                if not FIXWORDS.search(part) or re.search(r"\bnot cosmetic\b", part, re.I):
                    continue
                part = re.sub(r"^(Seen outside the notes|Partly fixed|Skipped[^:]*|skipped[^:]*|Not fixed):\s*", "", part.strip())
                out["?" + part] .append((src, part.rstrip(".")))
    return out


def viz_rows(page_dir):
    f = page_dir / "src" / "viz_ideas.md"
    rows = []
    if not f.exists():
        return rows
    for line in f.read_text(errors="ignore").splitlines():
        if not line.startswith("|") or line.startswith("|---") or line.startswith("| #") or line.startswith("| Idea"):
            continue
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        figs = set(re.findall(r"Fig\.? ?(\d+[a-z]?)\b", line))
        score = None
        for c in reversed(cells):
            m = re.search(r"(?:=\s*)?(-?\d+(?:\.\d+)?)\s*$", c)
            if m and len(c) < 40:
                score = float(m.group(1))
                break
        rows.append({"line": line, "figs": figs, "score": score,
                     "schematic": bool(re.search(r"schematic|illustrative|static diagram|static annotated", line, re.I)),
                     "data": bool(re.search(r"runs/|\.py\b|\.c\b|\.sh\b|\.json\b|\.csv\b|measured|recorded|"
                                            r"real run|PD\.|from the paper|Table \d|Figure \d|reproduc|published|"
                                            r"benchmark|leaderboard|reported", line, re.I))})
    return rows


# ---------------------------------------------------------------- one page
class Page:
    def __init__(self, d):
        self.dir = d
        self.rel = str(d.relative_to(KB))
        html = (d / "index.html").read_text(errors="ignore")
        t = Tree()
        t.feed(html)
        self.root = t.root
        self.byid = {}
        for n in self.root.walk():
            if "id" in n.a:
                self.byid.setdefault(n.a["id"], n)
        tabs = []
        for n in self.root.walk():
            if n.tag == "button" and n.a.get("data-t") and n.a["data-t"] not in tabs:
                tabs.append(n.a["data-t"])
        self.tabs = [x for x in tabs if x in self.byid]
        self.read = self.byid.get("t-read") or (self.byid[self.tabs[0]] if self.tabs else self.root)
        tt = next((n for n in self.root.walk() if n.tag == "title"), None)
        self.title = text(tt) if tt else self.rel
        self.parts = {}
        pdir = d / "src" / "parts"
        if pdir.is_dir():
            for f in sorted(pdir.iterdir()):
                if f.is_file():
                    self.parts[f.name] = f.read_text(errors="ignore")
        self.js = {k: v for k, v in self.parts.items() if k.endswith(".js") or k.endswith(".js.html")}
        if not self.js:
            self.js = {"index.html <script>": "\n".join(t.scripts)}
        self.viz = viz_rows(d)
        self.off = self._off_lists()
        self.core = self._core_words(self.read)

    def tab_of(self, n):
        x = n
        while x is not None:
            if x.a.get("id") in self.tabs:
                return x.a["id"]
            x = x.up
        return "page"

    def _off_lists(self):
        off = set()
        lists = [n for n in self.root.walk() if is_step_list(n)]
        for ol in lists:
            if not ("hidden" in ol.a or "display:none" in ol.a.get("style", "").replace(" ", "")):
                continue
            f = ol.up
            while f is not None:
                sib = [o for o in f.walk() if is_step_list(o) and o is not ol]
                if sib:
                    if any(not ("hidden" in o.a) for o in sib):
                        off.add(id(ol))
                    break
                f = f.up
        return off

    def _core_words(self, root):
        return nwords(root, skip=lambda k: is_closed_details(k) or id(k) in self.off)

    def where(self, *needles):
        """The src/parts file that holds an id or a phrase."""
        for nd in needles:
            if not nd:
                continue
            for name, body in self.parts.items():
                if name.endswith(".js"):
                    continue
                if (f'id="{nd}"' in body) or (len(nd) > 25 and nd in re.sub(r"<[^>]+>", "", body)):
                    return "src/parts/" + name
        return "index.html"

    def section_of(self, n):
        """(section id, heading text) for a node: the nearest section, or the heading that precedes it."""
        s = n if n.tag == "section" else n.anc(lambda x: x.tag == "section")
        if s is not None:
            h = next((x for x in s.walk() if x.tag in ("h2", "h3")), None)
            return s.a.get("id", ""), (text(h) if h else "")
        return "", ""

    def js_for(self, ids, others=()):
        """JS that draws a figure: a window around each place a part file names one of its ids, cut where another
        figure's id is named, so two figures drawn in one file keep their own labels."""
        chunks = []
        ids = [i for i in ids if len(i) >= 3]
        if not ids:
            return ""
        pat = re.compile("|".join(r"(?<![\w-])" + re.escape(i) + r"(?![\w-])" for i in ids))
        oth = [i for i in others if len(i) >= 3 and i not in ids]
        opat = re.compile("|".join(r"(?<![\w-])" + re.escape(i) + r"(?![\w-])" for i in oth)) if oth else None
        for name, body in self.js.items():
            if "25_js_s3" in name or "21_js_rd_common" in name or "99_js_tabs" in name:
                continue
            hits = [m.start() for m in pat.finditer(body)]
            if not hits:
                continue
            ohits = [m.start() for m in opat.finditer(body)] if opat else []
            spans = []
            for h in hits:
                a, b = max(0, h - 1500), min(len(body), h + 5000)
                a = max([a] + [o + 1 for o in ohits if a <= o < h])
                b = min([b] + [o for o in ohits if h < o <= b])
                if spans and a <= spans[-1][1]:
                    spans[-1][1] = max(b, spans[-1][1])
                else:
                    spans.append([a, b])
            chunks.extend(body[a:b] for a, b in spans)
        return "\n".join(chunks)


# ---------------------------------------------------------------- figures
class Fig:
    pass


def figures(pg):
    units = []
    seen = set()
    for n in pg.root.walk():
        c = n.cls()
        unit = None
        if "s3R" in c:
            unit = n
        elif (n.tag == "figure" or c & {"card", "viz", "rd-card"}) and not n.anc(
                lambda x: "s3R" in x.cls() or x.tag == "figure" or x.cls() & {"card", "viz", "rd-card"}):
            if any(k.tag in ("svg", "canvas", "img") or (k.tag == "div" and k.a.get("id") and not k.kids)
                   for k in n.walk() if k is not n):
                unit = n
        if unit is None or id(unit) in seen:
            continue
        seen.add(id(unit))
        units.append(unit)
    allids = [[k.a["id"] for k in u.walk() if k.a.get("id")] for u in units]
    flat = [i for ids in allids for i in ids]
    out = []
    order = 0
    for unit in units:
        f = Fig()
        f.node, f.page, f.tab = unit, pg, pg.tab_of(unit)
        f.order = order
        order += 1
        f.ids = [k.a["id"] for k in unit.walk() if k.a.get("id")]
        sp = unit.up if unit.up is not None and "s3sp" in unit.up.cls() else None
        f.left = next((k for k in sp.kids if isinstance(k, N) and "s3L" in k.cls()), None) if sp else None
        anchor = f.left or unit
        sec = next((x for x in anchor.walk() if x.tag == "section"), None) if f.left else None
        f.sec_id, f.heading = pg.section_of(sec or anchor)
        if not f.heading and f.left is not None:
            h = next((x for x in f.left.walk() if x.tag in ("h2", "h3")), None)
            f.heading = text(h) if h else ""
        f.static = text(unit, svg=True)
        cap = []
        for k in unit.walk():
            kc = k.cls()
            if k.tag in ("h3", "h4", "figcaption") or kc & {"t", "ft", "cap", "small", "el-figcap", "fig-cap"}:
                cap.append(text(k))
        if f.left is not None:
            for k in f.left.walk():
                if "sxh" in k.cls():
                    cap.append(text(k))
        f.caption = " ".join(x for x in cap if x)
        f.js = pg.js_for(f.ids, flat)
        f.labels = label_strings(f.js)
        m = re.search(r"Fig\.? ?(\d+[a-z]?)\b", f.caption) or re.search(r"Fig\.? ?(\d+[a-z]?)\b", f.static[:300])
        f.fig = m.group(1) if m else ""
        f.stage = any(i.startswith("stg") for i in f.ids) or bool(re.search(r"S3\.stage\(|\.stage\(\{", f.js))
        f.imgs = sum(1 for k in unit.walk() if k.tag == "img")
        ctl = 0
        for k in unit.walk():
            if k.tag == "select" or (k.tag == "input" and k.a.get("type") in ("range", "number", "checkbox", "radio", "text")):
                ctl += 1
            elif k.tag == "button" and not k.a.get("data-t") and not k.anc(lambda x: "seg" in x.cls() or x.a.get("role") == "group"):
                ctl += 1
            elif ("seg" in k.cls() or k.a.get("role") == "group") and any(x.tag == "button" for x in k.walk()):
                ctl += 1
        f.controls = ctl
        f.predict = any(k.cls() & {"drill", "el-pred", "pred", "predict"} for k in unit.walk()) or "Predict" in f.static[:400]
        f.hero = f.fig == "1" or "hero" in " ".join(f.ids).lower() or (f.tab == "t-read" and not any(
            o.tab == "t-read" for o in out))
        vr = [r for r in pg.viz if f.fig and f.fig in r["figs"]]
        f.vrow = vr[-1] if vr else None
        f.score = f.vrow["score"] if f.vrow else None
        blob = f.caption + " " + f.static[:2000]
        f.reproduced = bool(re.search(r"\b(Figure|Table) \d|reproduc|contradict|the paper's|as published|paper reports", blob, re.I)) \
            or bool(f.vrow and re.search(r"reproduc|contradict|corrects? the paper", f.vrow["line"], re.I))
        f.data = bool(DATAREF.search(f.js)) or bool(re.search(r"\bmeasured\b|\brecorded\b|\breal (run|data|trace)|"
                                                              r"\bruns?/|\bfrom the paper\b|\breported\b|\bpublished\b", blob, re.I)) \
            or bool(f.vrow and f.vrow["data"]) or f.imgs > 0 or bool(NUMARR.search(f.js))
        own = owner_rows_for(pg.rel, OWN)
        f.owner_visual = bool(f.fig and any(f.fig in r["figs"] for r in own))
        if not f.owner_visual and own and f.heading:
            ht = set(toks(f.heading + " " + f.caption))
            for r in own:
                ct = set(toks(r["concept"]))
                if len(ht & ct) >= 3:
                    f.owner_visual = True
        out.append(f)
    return out


def fig_name(f):
    bits = []
    if f.fig:
        bits.append(f"Fig. {f.fig}")
    t = snip(f.caption, 80) if f.caption else ""
    if t and not t.startswith("Fig"):
        bits.append(f'"{t}"')
    elif t:
        bits = [f'"{t}"']
    if not bits:
        bits.append("figure #" + (f.ids[0] if f.ids else "?"))
    return " ".join(bits)


def loc(pg, node, sec_id="", heading=""):
    if not sec_id:
        sec_id, heading = pg.section_of(node)
    nid = node.a.get("id", "")
    return pg.where(nid, sec_id) + (f', section "{snip(heading, 70)}"' if heading else "") + (f" (#{nid})" if nid else "")


# ---------------------------------------------------------------- criterion 1
def scope_paragraphs(pg, ol):
    """The paragraphs beside a step list: its split's left column or its section, whichever is smaller."""
    sec = ol.anc(lambda x: x.tag == "section")
    col = ol.anc(lambda x: "s3L" in x.cls())
    if sec is not None and col is not None:
        scope = col if sec.anc(lambda x: x is col) is None else sec
    else:
        scope = sec or col or ol.up
    out = []
    for p in scope.walk():
        if p.tag != "p" or p.anc(lambda x: x is ol) or "sxh" in p.cls():
            continue
        if p.anc(lambda x: is_closed_details(x) or x.cls() & {"drill", "s3R", "card", "ans", "co"} or x.tag in ("td", "li", "figure")):
            continue
        t = text(p)
        if len(t.split()) >= 8:
            out.append(t)
    return scope, out


def repeated(sents, other_text, idf):
    """Sentences whose content words, weighted by how rare each word is on the page, are 70% or more in other_text."""
    ou = set(toks(other_text))
    rep, best = [], (0, "")
    for s in sents:
        t = set(toks(s))
        if len(t) < 5:
            continue
        w = sum(idf(x) for x in t & ou) / sum(idf(x) for x in t)
        if w >= REP:
            rep.append(s)
        if w > best[0]:
            best = (w, s)
    return rep, best


REP = .7


def page_idf(pg):
    blocks = [text(n) for n in pg.root.walk() if n.tag in ("p", "li", "td", "h2", "h3")]
    df = Counter()
    for b in blocks:
        df.update(set(toks(b)))
    n = len(blocks)
    return lambda t: math.log((n + 1) / (df[t] + 1)) + .5


def best_match(s, cands):
    t = toks(s)
    best, bs = "", -1
    for c in cands:
        ct = toks(c)
        sc = len(bigrams(t) & bigrams(ct)) + .3 * len(set(t) & set(ct))
        if sc > bs:
            best, bs = c, sc
    return best


MINREP = 40


def step_candidates(pg, figs):
    out = []
    idf = page_idf(pg)
    for ol in pg.root.walk():
        if not is_step_list(ol) or id(ol) in pg.off or ol.anc(is_closed_details):
            continue
        items = [text(li) for li in ol.kids if isinstance(li, N) and li.tag == "li"]
        lt = " ".join(items)
        lw = len(lt.split())
        if lw < 40:
            continue
        scope, paras = scope_paragraphs(pg, ol)
        if not paras:
            continue
        pt = " ".join(paras)
        pw = len(pt.split())
        psent = [s for p in paras for s in sentences(p)]
        lsent = [s for it in items for s in sentences(it)]
        prep, pbest = repeated(psent, lt, idf)
        lrep, lbest = repeated(lsent, pt, idf)
        prw = sum(len(s.split()) for s in prep)
        lrw = sum(len(s.split()) for s in lrep)
        save = max(prw, lrw)
        if save < MINREP or (prw / max(pw, 1) < .5 and lrw / max(lw, 1) < .35):
            continue
        fig = next((f for f in figs if f.left is not None and ol.anc(lambda x: x is f.left)), None)
        sec_id, heading = pg.section_of(ol)
        if prw >= lrw:
            act = f"cut the {len(prep)} paragraph sentence(s) the list repeats ({prw} words); the step list stays" + (
                f" (it explains {fig_name(fig)})" if fig is not None else "")
            cut, keep = " ".join(prep), lt
        else:
            act = f"shorten the {len(lrep)} step sentence(s) that repeat the paragraphs ({lrw} words); keep each step's title" + (
                f" so {fig_name(fig)} is still explained" if fig is not None else "")
            cut, keep = " ".join(lrep), pt
        only = [x for x in dict.fromkeys(nums(cut)) if x not in set(nums(keep)) and (len(x) > 1)]
        if prw >= lrw:
            ex_p = max(prep, key=len)
            ex_l = best_match(ex_p, lsent)
        else:
            ex_l = max(lrep, key=len)
            ex_p = best_match(ex_l, psent)
        out.append({
            "kind": 1, "label": "Step list repeats the paragraph beside it",
            "where": loc(pg, ol, sec_id, heading), "tab": pg.tab_of(ol),
            "why": f"{round(100 * prw / max(pw, 1))}% of the section's paragraph words ({prw} of {pw}) are in sentences the list restates; "
                   f"{round(100 * lrw / max(lw, 1))}% of the list's words ({lrw} of {lw}) restate the paragraphs. "
                   f'Paragraph: "{snip(ex_p)}" / Step: "{snip(ex_l)}"',
            "act": act, "move": ("numbers only in the part to cut: " + ", ".join(only[:10])) if only else "nothing found only in the part to cut",
            "words": save, "core": pg.tab_of(ol) == "t-read" or pg.tab_of(ol) == "page"})
    return out


# ---------------------------------------------------------------- criterion 2 and 7
def fig_numbers(f):
    s = f.static + " " + " ".join(f.labels)
    out = set(x for x in nums(s) if distinctive(x))
    for m in re.finditer(r"(?<![\w.$#])-?\d+\.\d+|(?<![\w.$#])\d{3,}(?![\w])", f.js):
        x = normnum(m.group(0).lstrip("-"))
        if distinctive(x):
            out.add(x)
    return out


def side_text(f):
    """The text a figure's reader has beside it: the left column (or the section), without closed details."""
    base = f.left if f.left is not None else (f.node.anc(lambda x: x.tag == "section") or f.node.up)
    skip = lambda k: is_closed_details(k) or k is f.node
    return text(base, skip=skip) + " " + f.caption


def only_in_figure(f, extra=""):
    shown = set(nums(side_text(f) + " " + extra))
    fn = []
    for s in [f.static] + f.labels:
        for x in nums(s):
            if (distinctive(x) or ("." in x)) and x not in shown and x not in fn:
                fn.append(x)
    return fn


def table_candidates(pg, figs):
    out = []
    page_text = text(pg.root, skip=lambda k: k.tag == "table")
    pnums = set(nums(page_text))
    for tb in pg.root.walk():
        if tb.tag != "table" or tb.anc(lambda x: x.tag == "table"):
            continue
        tt = text(tb)
        tn = set(x for x in nums(tt) if distinctive(x))
        if len(tn) < 4:
            continue
        cells = [text(td) for tr in tb.walk() if tr.tag == "tr"
                 for td in [k for k in tr.kids if isinstance(k, N) and k.tag in ("td", "th")][1:]]
        cells = [c for c in cells if c]
        numeric = [c for c in cells if nums(c) and len(c.split()) <= 5]
        if not cells or len(numeric) / len(cells) < .6:
            continue  # the table says more than numbers (words, reasons): not a copy of a chart
        best = None
        tsec = pg.section_of(tb)[0]
        for f in figs:
            if f.node is tb or tb.anc(lambda x: x is f.node) or f.tab != pg.tab_of(tb) or f.controls > 1 or f.predict:
                continue
            hit = tn & fig_numbers(f)
            r = len(hit) / len(tn)
            near = tsec and tsec == f.sec_id or (f.left is not None and tb.anc(lambda x: x is f.left) is not None)
            if (r >= .6 and len(hit) >= 4 and near) or (r >= .8 and len(hit) >= 6):
                if best is None or (near, r) > (best[3], best[0]):
                    best = (r, f, hit, near)
        if best is None:
            continue
        r, f, hit, near = best
        rest = sorted(tn - fig_numbers(f), key=lambda x: (len(x), x))
        only = [x for x in rest if x not in pnums]
        words = len(tt.split())
        sec_id, heading = pg.section_of(tb)
        out.append({
            "kind": 2, "label": "Table repeats a figure's data",
            "where": loc(pg, tb, sec_id, heading), "tab": pg.tab_of(tb),
            "why": f"{len(hit)} of the table's {len(tn)} distinctive numbers ({round(100 * r)}%) are drawn by {fig_name(f)}"
                   f" (in {pg.where(f.ids[0] if f.ids else '', f.sec_id)}); e.g. {', '.join(sorted(hit, key=len)[:6])}",
            "act": "keep the figure (it carries the data); drop the table or fold it into a closed block",
            "move": ("numbers only in the table, to move into the figure's caption first: " + ", ".join(only[:12])) if only
            else "every table number is drawn or stated elsewhere" + (f" (not drawn but in the text: {', '.join(rest[:6])})" if rest else ""),
            "words": words, "core": pg.tab_of(tb) in ("t-read", "page") and not tb.anc(is_closed_details)})
    return out


# ---------------------------------------------------------------- criterion 4
def echo_candidates(pg, figs):
    out = []
    for f in figs:
        if f.hero or f.stage or f.data or f.reproduced or f.predict or f.controls > 1 or f.owner_visual or f.imgs:
            continue
        if CHARTY.search(f.caption + " " + f.heading) or re.search(r"\bcount|\bmeasur|\brecord", f.caption + " " + f.heading, re.I) or any(distinctive(x) or len(x) >= 3 for x in nums(f.caption + " " + f.static[:400])):
            continue  # a chart of numbers, not a schematic
        lab = f.static + " " + " ".join(f.labels)
        lt = [x for x in toks(lab) if not x[0].isdigit()]
        if len(set(lt)) < 8:
            continue
        side = side_text(f)
        st = set(toks(side))
        cov = sum(1 for x in set(lt) if x in st) / len(set(lt))
        missing = only_in_figure(f)
        if cov < .9 or len(missing) > 2:
            continue
        sx = [k for k in (f.left.walk() if f.left is not None else []) if is_step_list(k) and id(k) not in pg.off]
        look = 0.5
        sch = f.vrow and f.vrow["schematic"]
        out.append({
            "kind": 4, "label": "Figure states nothing the text beside it does not",
            "where": pg.where(f.ids[0] if f.ids else "", f.sec_id) + (f', section "{snip(f.heading, 70)}"' if f.heading else "") + f" ({fig_name(f)})",
            "tab": f.tab,
            "why": f"{round(100 * cov)}% of the {len(set(lt))} distinct words in its labels are in the text beside it"
                   + ("; its step list carries the same steps" if sx else "")
                   + (f"; viz_ideas calls it schematic or illustrative" if sch else "")
                   + (f"; viz_ideas score {f.score:g}" if f.score is not None else "; no viz_ideas score"),
            "act": "remove the figure, or keep it if seeing the shape is the point (Khalid's call)",
            "move": ("numbers only in the figure, to move into the text first: " + ", ".join(missing)) if missing else "no number lives only in the figure",
            "words": look * WPM, "score": f.score, "core": f.tab in ("t-read", "page")})
    return out


# ---------------------------------------------------------------- criterion 6
CLOSED_PAGE = 20 * WPM


def details_candidates(pg):
    """One block over 2,300 words, or (no single block is that long on any page in 2026-11) a page whose closed blocks
    add up to more than 20 minutes: then the largest blocks are named."""
    out, blocks = [], []
    for d in pg.root.walk():
        if not is_closed_details(d) or d.anc(is_closed_details):
            continue
        sm = next((k for k in d.kids if isinstance(k, N) and k.tag == "summary"), None)
        blocks.append((nwords(d), d, text(sm) if sm else ""))
    total = sum(b[0] for b in blocks)
    big = [b for b in blocks if b[0] >= 2300]
    if not big and total < CLOSED_PAGE:
        return out
    blocks.sort(key=lambda b: -b[0])
    if big:
        for w, d, st in big:
            sec_id, heading = pg.section_of(d)
            out.append({"kind": 6, "label": "Closed block over 10 minutes",
                        "where": pg.where(d.a.get("id", ""), sec_id) + (f', section "{snip(heading, 70)}"' if heading else "") + f' (summary "{snip(st, 90)}")',
                        "tab": pg.tab_of(d), "why": f"{round(w)} words, about {w / WPM:.0f} min, closed by default",
                        "act": "condense with the ledger, or move to a child page or tab that owns it",
                        "move": "ledger-check the facts it holds (html_utils/ledger.py) before condensing", "words": w, "core": False})
        return out
    top = [b for b in blocks if b[0] >= 2 * WPM][:5] or blocks[:3]
    desc = "; ".join(f'"{snip(st, 60)}" {w / WPM:.0f} min ({pg.where(d.a.get("id", ""), pg.section_of(d)[0])})' for w, d, st in top)
    out.append({"kind": 6, "label": "Closed blocks add up to over 20 minutes",
                "where": f"{len(blocks)} closed blocks; largest: {desc}", "tab": "t-read",
                "why": f"closed blocks hold {round(total)} words, about {total / WPM:.0f} min; no single block reaches 10 min, so the page total is what crosses the line",
                "act": "condense the largest blocks with the ledger, or move them to the page or tab that owns them",
                "move": "ledger-check the facts they hold (html_utils/ledger.py) before condensing",
                "words": sum(b[0] for b in top), "total": total, "core": False})
    return out


# ---------------------------------------------------------------- criterion 3
def dup_candidates(pages_figs):
    idx = defaultdict(list)
    sig = {}
    for pg, figs in pages_figs:
        for f in figs:
            s = set(x for x in nums(f.static + " " + f.caption + " " + " ".join(f.labels)) if distinctive(x))
            if len(s) >= 2:
                sig[id(f)] = (f, s)
                for x in s:
                    idx[x].append(id(f))
    pages_with = {x: len({sig[i][0].page.rel for i in ids}) for x, ids in idx.items()}
    for k in list(sig):
        f, s = sig[k]
        sig[k] = (f, {x for x in s if pages_with[x] <= 8})
    pair = Counter()
    for x, ids in idx.items():
        if pages_with[x] > 8:
            continue
        for i in range(len(ids)):
            for j in range(i + 1, len(ids)):
                a, b = ids[i], ids[j]
                if sig[a][0].page is not sig[b][0].page:
                    pair[(min(a, b), max(a, b))] += 1
    out = defaultdict(list)
    done, flagged = set(), set()
    for (a, b), n in pair.most_common():
        fa, sa = sig[a]
        fb, sb = sig[b]
        ta, tb = set(toks(fa.caption)), set(toks(fb.caption))
        jac = len(ta & tb) / max(1, len(ta | tb)) if len(ta) >= 5 and len(tb) >= 5 else 0
        if not ((n >= 4 and n / max(1, min(len(sa), len(sb))) >= .6 and (jac >= .1 or n >= 6))
                or (jac >= .3 and n >= 2) or (jac >= .15 and n >= 3)):
            continue
        key = (fa.page.rel, fa.fig or fa.ids[:1].__str__(), fb.page.rel, fb.fig or fb.ids[:1].__str__())
        if key in done:
            continue
        done.add(key)
        shared = sorted(sa & sb, key=lambda x: (len(x), x))
        words = set(toks(fa.caption + " " + fa.heading + " " + fb.caption + " " + fb.heading))
        best, bs = None, 0
        for r in OWN:
            if r["owner"] and (fa.page.rel.endswith(r["owner"]) or fb.page.rel.endswith(r["owner"])):
                s = len(words & set(toks(r["concept"])))
                if s > bs:
                    best, bs = r, s
        if best is not None and bs >= 2:
            own, other = (fa, fb) if fa.page.rel.endswith(best["owner"]) else (fb, fa)
            ownnote = f'owner per OWNERS.md: {own.page.rel} ("{snip(best["concept"], 90)}")'
            cands = [(other, own)]
        else:
            ownnote = "no OWNERS.md row covers it: Khalid picks the owner"
            cands = [(fb, fa)] if (fa.page.rel.count("/") < fb.page.rel.count("/")) else [(fa, fb)]
        for cand, keep in cands:
            if cand.controls > 1 or cand.predict or id(cand) in flagged:
                continue
            flagged.add(id(cand))
            sx = [k for k in (cand.left.walk() if cand.left is not None else []) if is_step_list(k) and id(k) not in cand.page.off]
            w = sum(nwords(k) for k in sx) + 0.5 * WPM
            out[cand.page.rel].append({
                "kind": 3, "label": "Figure drawn on two pages",
                "where": cand.page.where(cand.ids[0] if cand.ids else "", cand.sec_id) + (f', section "{snip(cand.heading, 70)}"' if cand.heading else "") + f" ({fig_name(cand)})",
                "tab": cand.tab,
                "why": f"{n} distinctive numbers shared with {fig_name(keep)} on {keep.page.rel} ({', '.join(shared[:8])})"
                       + (f", captions {round(100 * jac)}% alike" if jac else "") + f"; {ownnote}",
                "act": f"replace with one sentence and a link to the copy on {keep.page.rel.split('/')[-1]}" if best else "decide which page owns it; the other links",
                "move": ("numbers only in this copy, to state in the linking sentence: " + ", ".join(sorted((set(x for x in nums(cand.static + ' ' + ' '.join(cand.labels)) if distinctive(x)) - (sa & sb)) - set(nums(side_text(cand))))[:10]))
                if (set(x for x in nums(cand.static + ' ' + ' '.join(cand.labels)) if distinctive(x)) - (sa & sb)) - set(nums(side_text(cand))) else "none beyond the shared ones",
                "words": w, "core": cand.tab in ("t-read", "page"), "owned": bool(best)})
    return out


# ---------------------------------------------------------------- criterion 5
def fix_candidates(pg, notes):
    out = []
    keys = [k for k in notes if not k.startswith("?") and (pg.rel == k or pg.rel.endswith("/" + k) or k.endswith(pg.rel))]
    for k in keys:
        for src, note in notes[k]:
            out.append({"kind": 5, "label": "3D step to fix (faded or cluttered)", "where": "index.html (" + snip(note, 40) + ")",
                        "tab": "t-read", "why": f"rollout {src}: {snip(note, 220)}" + ("; check first whether the cosmetic pass already fixed it" if src == "polish notes" else ""), "act": "fix the step's camera or fading; not a removal",
                        "move": "", "words": 0, "core": False})
    last = pg.rel.split("/")[-1]
    for k in notes:
        if not k.startswith("?"):
            continue
        body = k[1:]
        m = re.match(r"\s*([a-z0-9_]+)\b", body)
        if not m:
            continue
        name = m.group(1)
        if name == last or (len(name) >= 6 and last.startswith(name) and not any(
                p.split("/")[-1] != last and p.split("/")[-1].startswith(name) for p in ALLNAMES)):
            for src, note in notes[k]:
                out.append({"kind": 5, "label": "3D step to fix (faded or cluttered)", "where": "index.html",
                            "tab": "t-read", "why": f"rollout {src}: {snip(note, 220)}" + ("; check first whether the cosmetic pass already fixed it" if src == "polish notes" else ""), "act": "fix the step's camera or fading; not a removal",
                            "move": "", "words": 0, "core": False})
    return out


# ---------------------------------------------------------------- criterion 8 (Khalid, 2026-11-19)
# A 3D stage whose third dimension carries nothing the reader needs. Read from the scene file's header comment, the
# figure's caption and its viz_ideas row. Signs that depth only lays out lanes or a flow: parties or lanes in depth,
# time along the floor, a sequence, a pipeline or a request's path, a map, "schematic", "illustrative".
# Never flagged when the same text names structure that depth carries: tensors, matrices, shapes, heads, layers,
# stacks, surfaces and losses, heights or bars (data as heights), GPUs, chips, racks, topology, memory, pools,
# grids and tiles, planes, fields, points and embeddings; nor when the scene draws gridded glass plates (matrices).
POS3 = re.compile(r"\blanes?\b|\bparties\b|\bin depth\b|front to back|back to front|time runs|\btimeline\b|\bsequence\b|"
                  r"\bpipeline\b|\bmap\b|\bjourney\b|\bpath of\b|\bround trip\b|\bhops?\b|\bschematic\b|\billustrative\b|"
                  r"through (?:every|each|the) (?:stage|component|hop|step)s?", re.I)
NEG3 = re.compile(r"tensor|matri|shape|dimension|\bheads?\b|\blayers?\b|stack|surface|loss|landscape|bowl|height|tall|\bbars?\b|"
                  r"to scale|log scale|\bGPUs?\b|HBM|\bSMs?\b|\bdie\b|chip|rack|topolog|hierarch|cube|volume|grid|tiles?\b|"
                  r"page tables?|plane|field|cloud|embedding|vector|points?\b|scatter|spatial|geometr|torus|mesh|warps?\b|"
                  r"weights|memory|\bpool\b|arena|\bring\b", re.I)


def flat3d_candidates(pg, figs, notes):
    out = []
    for f in figs:
        if not f.stage:
            continue
        sid = next((i for i in f.ids if i.startswith("stg")), None)
        if not sid:
            continue
        rx = re.compile(r"['\"]" + re.escape(sid) + r"['\"]")
        sc = sorted((n for n, b in pg.js.items() if rx.search(b)), key=lambda n: ("_js_sc_" not in n, n))
        if not sc:
            continue
        body = pg.js[sc[0]]
        head = " ".join(l.strip()[2:].strip(" -") for l in body.splitlines()[:8] if l.strip().startswith("//"))
        blob = head + " " + f.caption + " " + (f.vrow["line"] if f.vrow else "")
        pos = sorted({m.group(0).lower() for m in POS3.finditer(blob)})
        if not pos or NEG3.search(blob) or "nu:" in body or "R.map(" in body:
            continue
        side = set(toks(side_text(f)))
        lt = set(x for x in toks(" ".join(f.labels)) if not x[0].isdigit())
        cov = len(lt & side) / len(lt) if len(lt) >= 8 else 0
        if any(w in pos for w in ("lanes", "lane", "parties", "time runs", "timeline", "sequence", "round trip")):
            repl = "a flat 2D sequence (swimlane) diagram with the same steps: parties as columns, time down the page"
        elif any(w in pos for w in ("pipeline", "path of", "journey", "hop", "hops", "map")) or pos[0].startswith("through"):
            repl = "a flat 2D flow diagram of the same boxes and arrows"
        else:
            repl = "a flat 2D diagram"
        if cov >= .9:
            repl += ", or the step list alone (it already names " + f"{round(100 * cov)}% of the stage's label words)"
        fx = [n for k, v in notes.items() if not k.startswith("?") and (pg.rel.endswith(k) or k.endswith(pg.rel)) for n in v]
        fnote = [n for _, n in fx if f.fig and re.search(r"Fig\.? ?" + re.escape(f.fig) + r"\b", n)]
        strong = [p for p in pos if p not in ("schematic", "illustrative")]
        out.append({
            "kind": 8, "label": "3D not needed (convert to 2D or drop)",
            "where": f"src/parts/{sc[0]}" + (f', section "{snip(f.heading, 60)}"' if f.heading else "") + f" ({fig_name(f)}, #{sid})",
            "tab": f.tab,
            "why": ("strong sign: " if strong else "weaker sign (only called schematic or illustrative): ")
                   + "the scene's description says " + ", ".join(f'"{p}"' for p in pos[:5]) + " and names no structure that depth carries "
                   "(no tensors, layers, surfaces, heights, hardware or matrices in its header, caption or viz row)"
                   + (f'; scene header: "{snip(head, 160)}"' if head else "")
                   + (f"; rollout notes: {snip('; '.join(fnote), 140)}" if fnote else "")
                   + ("; it is the page hero" if f.hero else ""),
            "act": "replace the stage with " + repl + "; the step list stays",
            "move": "", "words": 0, "core": False})
    return out


# ---------------------------------------------------------------- report
KINDS = {1: "step list repeats prose", 2: "table repeats a figure", 3: "figure on two pages", 4: "figure echoes its text",
         5: "3D step to fix", 6: "closed blocks over 20 min a page", 8: "3D not needed"}


def report(results, out):
    tot = Counter()
    for r in results:
        for c in r["cands"]:
            tot[c["kind"]] += 1
    L = []
    L.append("# Visual and text trim candidates, 2026-11-19")
    L.append("")
    L.append("**Nothing here is removed or changed until Khalid approves that page's list.** Each line is a candidate, not a decision; "
             "approve, strike or edit lines page by page, then a build session acts only on the approved lines (ledger-checked, so no "
             "knowledge is lost).")
    L.append("")
    L.append("## Method")
    L.append("")
    L.append("Generated by `python3 html_utils/visual_candidates.py --out audit/2026-11-19_visual_candidates.md` "
             "(rerunnable; the criteria and thresholds are documented at the top of the script). It parses each page's built "
             "`index.html` statically, the JS in `src/parts` that draws each figure, `src/viz_ideas.md`, `OWNERS.md` and the layout "
             "rollout record. Kinds:")
    L.append("")
    L.append("1. **Step list repeats prose**: a default step list against the paragraphs beside it (its section or its split's left column, whichever is smaller). "
             "A sentence counts as restated when 70% of its content words, weighted by how rare each word is on the page, occur on the other side. "
             "Flagged when one side's restated sentences hold 40 words or more and make up half the paragraphs or 35% of the list. Saved minutes are that side's restated words / 230; "
             "the action cuts the restated paragraph sentences, or shortens restated steps to their titles (the split layout needs a list that explains the figure).")
    L.append("2. **Table repeats a figure**: a table made mostly of numbers whose distinctive numbers (decimals, or 3+ digit integers that are not years or round) are drawn by a figure on the same tab "
             "(60% and at least 4 in the same section, or 80% and at least 6 anywhere). The table is the candidate; the figure keeps the data.")
    L.append("3. **Figure on two pages**: two pages' figures share rare distinctive numbers (seen in figures on at most 8 pages) and, mostly, alike captions. "
             "The copy on the page that does not own the concept (OWNERS.md) is the candidate; without an owner row Khalid picks.")
    L.append("4. **Figure echoes its text**: a static, non-stage schematic whose label words are 90% in the text beside it, with at most 2 numbers missing and no chart, measurement or 3+ digit number in its caption.")
    L.append("5. **3D step to fix**: steps the rollout record calls faded, faint, pale, busy, crowded, cluttered or dense. Fixes, not removals; no minutes. Polish-notes items may already be fixed by the cosmetic pass: check first.")
    L.append("6. **Closed blocks**: no single closed `<details>` reaches 10 minutes (the largest is about 8), so pages whose closed blocks add up to over 20 minutes are listed with their largest blocks. "
             "These are depth minutes (only readers who open them pay), kept apart from core minutes.")
    L.append("7. **Numbers only in the figure or table** are on each candidate's \"Move first\" line: they go into the caption or text before anything is removed.")
    L.append("8. **3D not needed (convert to 2D or drop)** (Khalid's addition): a stage whose scene header, caption or viz_ideas row speaks of lanes, parties, a sequence or timeline, a pipeline, a request's path or a map, "
             "or calls it schematic or illustrative, and names no structure that depth carries (tensors, matrices, shapes, heads, layers, stacks, surfaces, heights or bars, GPUs, chips, racks, topology, memory, grids, planes, points; "
             "scenes with gridded glass plates are skipped). \"Strong sign\" means lanes, parties, a sequence or a path; \"weaker sign\" means only the word schematic or illustrative. Not a removal; no minutes.")
    L.append("")
    L.append("Never flagged: visuals with real, recorded or published data, reproduced or contradicted published figures, labs with more than one control, "
             "predict-then-reveal, the page hero, a concept owner's visual. The build-time viz_ideas score is shown only to sort; it decides nothing. "
             "Looking at a figure is assumed to take 0.5 min (figure text is not counted in reading time). Page minutes are a static estimate of the Reading tab's core text.")
    L.append("")
    L.append("Limits: tables and step lists that JavaScript builds at run time are not seen (static parse); a figure's numbers come from its static text and the JS around its ids, so a figure fed from a data file is missed by kinds 2 and 3 (they undercount); the word matching is lexical, so a close paraphrase is not counted as a repeat; kind 8 reads descriptions, not geometry, so a stage whose header does not describe its layout is not judged.")
    L.append("")
    L.append("What the numbers say: the candidates found here are modest (a minute or two per page at most). The 2026-11-16 measure already leaves hidden alternative-mode step lists out, and most of the growth since October was in those lists; what remains is sentence-level restating between a section's paragraphs and its step list, listed under kind 1.")
    L.append("")
    L.append("## Totals")
    L.append("")
    L.append(f"Pages read: {len(results)}. Pages with at least one candidate: {sum(1 for r in results if r['cands'])}. "
             f"Core minutes that the removal candidates could save in all: {sum(r['save_core'] for r in results) / WPM:.0f}; "
             f"depth minutes in the largest closed blocks of pages with over 20 closed minutes: {sum(r['save_depth'] for r in results) / WPM:.0f}.")
    L.append("")
    L.append("| Kind | Candidates |")
    L.append("|---|---|")
    for k, name in KINDS.items():
        L.append(f"| {k}. {name} | {tot[k]} |")
    L.append("")
    L.append("| Page | Core min (est.) | Could save, core | Closed-block min | Candidates |")
    L.append("|---|---|---|---|---|")
    ranked = [r for r in results if r["cands"]]
    ranked.sort(key=lambda r: (-r["save_core"], -r["core_min"], -r["save_depth"]))
    for r in ranked:
        L.append(f"| [{r['title']}](#{anchor(r)}) | {r['core_min']:.0f} | {r['save_core'] / WPM:.1f} | {r['save_depth'] / WPM:.0f} | "
                 + ", ".join(f"{KINDS[k].split()[0]} {n}" if False else f"{n} x k{k}" for k, n in sorted(Counter(c['kind'] for c in r['cands']).items())) + " |")
    L.append("")
    L.append("## Pages, by core minutes the candidates could save")
    L.append("")
    for r in ranked:
        L.append(f"### {r['title']}")
        L.append(f"<a id=\"{anchor(r)}\"></a>`{r['rel']}`; Reading core about {r['core_min']:.0f} min; candidates could save about "
                 f"{r['save_core'] / WPM:.1f} min core" + (f" and {r['save_depth'] / WPM:.0f} min in closed blocks" if r['save_depth'] else "") + ".")
        L.append("")
        for c in sorted(r["cands"], key=lambda c: (c["kind"] in (5, 6), -c["words"])):
            mins = "fix, no minutes" if c["kind"] == 5 else (f"{c['words'] / WPM:.1f} min" + ("" if c["core"] else " (depth or other tab)"))
            L.append(f"- [ ] **{c['label']}** (kind {c['kind']}). {c['where']}" + (f", tab `{c['tab']}`" if c["tab"] not in ("t-read", "page") else "") + ".")
            L.append(f"  Why: {c['why']}.")
            if c["kind"] not in (5, 8):
                L.append(f"  Saves: about {mins}. Action: {c['act']}.")
            else:
                L.append(f"  Action: {c['act']}.")
            if c.get("move"):
                L.append(f"  Move first: {c['move']}.")
        L.append("")
    s = "\n".join(L).replace("\u2014", ", ").replace("\u2013", "-")
    Path(out).write_text(s + "\n")


def anchor(r):
    return "p-" + re.sub(r"[^a-z0-9]+", "-", r["rel"].split("/")[-1].lower())


# ---------------------------------------------------------------- main
OWN = owners()
ALLNAMES = []


def main():
    a = sys.argv[1:]
    out = a[a.index("--out") + 1] if "--out" in a else None
    js_out = a[a.index("--json") + 1] if "--json" in a else None
    dirs = [x for i, x in enumerate(a) if not x.startswith("--") and (i == 0 or a[i - 1] not in ("--out", "--json"))]
    if dirs:
        dirs = [Path(x).resolve() for x in dirs]
    else:
        dirs = sorted(f.parent for f in KB.rglob("index.html"))
    ALLNAMES.extend(str(d.relative_to(KB)) for d in sorted(f.parent for f in KB.rglob("index.html")))
    notes = rollout_fix_notes()
    pages_figs, results = [], []
    for d in dirs:
        if not (d / "index.html").exists():
            continue
        try:
            pg = Page(d)
            figs = figures(pg)
        except Exception as e:  # a page that cannot be parsed is reported, not fatal
            print("ERROR", d, e, file=sys.stderr)
            continue
        pages_figs.append((pg, figs))
        cands = step_candidates(pg, figs) + table_candidates(pg, figs) + echo_candidates(pg, figs) \
            + details_candidates(pg) + fix_candidates(pg, notes) + flat3d_candidates(pg, figs, notes)
        results.append({"rel": pg.rel, "title": pg.title, "core_min": pg.core / WPM, "cands": cands, "figs": len(figs)})
    dups = dup_candidates(pages_figs)
    for r in results:
        r["cands"].extend(dups.get(r["rel"], []))
        r["save_core"] = sum(c["words"] for c in r["cands"] if c["core"] and c["kind"] in (1, 2, 3, 4))
        r["save_depth"] = sum(c["words"] for c in r["cands"] if c["kind"] == 6)
    tot = Counter(c["kind"] for r in results for c in r["cands"])
    print(f"pages {len(results)}; candidates by kind: " + ", ".join(f"{k}:{tot[k]}" for k in sorted(tot)))
    for r in sorted(results, key=lambda r: -r["save_core"])[:15]:
        print(f"{r['save_core'] / WPM:6.1f} core {r['save_depth'] / WPM:5.0f} depth {r['core_min']:5.0f} min  {len(r['cands']):3}  {r['rel']}")
    if out:
        report(results, out)
    if js_out:
        Path(js_out).write_text(json.dumps([{k: v for k, v in r.items()} for r in results], indent=1))


if __name__ == "__main__":
    main()
