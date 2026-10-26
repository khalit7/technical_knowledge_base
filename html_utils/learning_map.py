"""The learning map on the home page of the reading site: the order to study the topic pages in, from their strict
prerequisites ("prereqs" in technical_knowledge_base/pages.json, a list of page ids).

usage: python3 html_utils/learning_map.py check     validate the prerequisite graph (exit 1 on an error)
       build_site.py imports it: check() fails the build on an error; section(url) returns the map's HTML.

What is in the map: every built topic page (status html_only, not under Papers or Tech news).
Graph rules (check):
  errors   an unknown prereq id, a prereq that is not a built topic page, a self-loop, a cycle (printed)
  warnings a built topic page with no "prereqs" key (treated as none), a prereq given by an old id (alias),
           a transitively redundant edge, a prereq the page's own "You need" line no longer links (staleness)
Layout (all at build time, no runtime layout library):
  page stage  = longest prerequisite chain below the page (stage 1 needs nothing)
  overview    = the topic graph: topic A sits in a layer below topic B when at least STRONG (a third) of A's pages
                build on B (a page of B is in the page's prerequisite closure); layer = longest chain over these
                strong links (topics that mostly build on each other would share a layer). Strong links are solid
                lines, thicker by share of pages; weaker ones (some pages, under STRONG) show dotted only when a topic
                is focused and are listed on its card. Each card: pages, hours, and pages per stage as pills under
                stage numbers 1..N (each titled "n pages at stage k"). Topics with no strong link sit in rows above the linked row of their layer.
                Below 900 px the same layers are rows of HTML cards with "Builds on" text.
  topic and path views: pages in columns by stage;
  order       = barycenter sweeps over layers with dummy nodes for long edges, keeping the order with fewest crossings
  y           = repeated least-squares pulls toward neighbours under order and spacing constraints (isotonic fit)
The overview is an inline SVG (plus HTML cards for narrow screens); topic views and "path to" views are a small JSON of coordinates that the page's
script draws (it never computes a layout).
Motion (CSS transforms, opacity and stroke-dashoffset through the Web Animations API, no library; all skipped under
prefers-reduced-motion): a one-time load reveal (layers rise top to bottom, strong lines draw upper to lower, then the
start-anytime band; about 1 s, finished at once by any input), focus (lines into the topic draw, dots run along them
from the topics it builds on until blur), opening a topic (the card's outline grows into the view, pages appear stage by
stage) and path Step (arriving lines draw with a dot running into the page, then it fills).
"""
import html, json, re, sys
from collections import defaultdict
from itertools import permutations
from math import factorial
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SECTIONS = ["Models & training", "Systems & performance", "Agents & retrieval", "Measurement", "Engineering foundations"]
W = 888            # drawing width: the home page's content column
BW = 110           # node width
TOP = 30           # room for the stage headings


# ---------------------------------------------------------------- the graph
class KB:
    def __init__(self, pages=None):
        if pages is None:
            pages = json.loads((ROOT / "technical_knowledge_base/pages.json").read_text())["pages"]
        self.pages = pages
        self.by_path = {p["path"]: p for p in pages}
        self.by_id = {p["id"].replace("-", ""): p for p in pages}
        self.alias = {}
        for p in pages:
            for a in p.get("aliases", []):
                self.alias.setdefault(a.replace("-", ""), p)
        self.topic = [p for p in pages if self.is_topic(p)]
        self.tset = {p["path"] for p in self.topic}

    def parent(self, path):
        while "/" in path:
            path = path.rsplit("/", 1)[0]
            if path in self.by_path:
                return path
        return None

    def root(self, path):
        while self.parent(path):
            path = self.parent(path)
        return path

    def is_topic(self, p):
        return (p.get("status") == "html_only" and "/reference/" not in "/" + p["path"] + "/"
                and (ROOT / p["path"] / "index.html").exists())

    def resolve(self, ref):
        """a prereq entry (id, old id, or a path) -> (page or None, how)"""
        r = ref.replace("-", "")
        if r in self.by_id:
            return self.by_id[r], "id"
        if r in self.alias:
            return self.alias[r], "alias"
        if ref in self.by_path:
            return self.by_path[ref], "path"
        return None, "unknown"


def reading(path):
    s = (ROOT / path / "index.html").read_text(errors="replace")
    m = re.search(r"Reading:\s*(?:<[^>]+>\s*)*(\d+)\s*min(?:,\s*plus\s*(\d+))?", s)
    return (int(m.group(1)), int(m.group(2) or 0)) if m else (None, None)


def you_need_ids(path):
    """ids linked in the page's "You need" line (up to "New terms")"""
    s = (ROOT / path / "index.html").read_text(errors="replace")
    i = s.find("You need")
    if i < 0:
        return None
    ends = [k for k in (s.find(t, i) for t in ("New terms", "</p>", "</ul>", "</section>")) if k > 0]
    seg = s[i: min(ends) if ends else i + 4000]
    return {m.group(1).replace("-", "") for m in re.finditer(r"/p/([0-9a-f][0-9a-f-]{31,35})", seg)}


def check(kb=None, quiet=False):
    """validate the prerequisite graph; returns (errors, warnings, prereq map path -> [paths])"""
    kb = kb or KB()
    err, warn, pre = [], [], {}
    for p in kb.topic:
        if "prereqs" not in p:
            warn.append(f'no "prereqs" key (treated as none): {p["title"]} ({p["path"]})')
        out = []
        for ref in p.get("prereqs", []):
            q, how = kb.resolve(ref)
            if q is None:
                err.append(f'unknown prereq id {ref} on {p["title"]} ({p["path"]})')
                continue
            if how == "alias":
                warn.append(f'prereq {ref} on {p["title"]} is an old id of {q["title"]}; rewrite it as {q["id"]}')
            if how == "path":
                warn.append(f'prereq {ref} on {p["title"]} is a path; write the id {q["id"]}')
            if q["path"] not in kb.tset:
                err.append(f'prereq {q["title"]} of {p["title"]} is not a built topic page (status {q.get("status")})')
                continue
            if q is p:
                err.append(f'self-loop: {p["title"]} lists itself')
                continue
            if q["path"] not in out:
                out.append(q["path"])
        pre[p["path"]] = out
    # cycles
    state, stack = {}, []

    def dfs(v):
        state[v] = 1
        stack.append(v)
        for u in pre.get(v, []):
            if state.get(u) == 1:
                cyc = stack[stack.index(u):] + [u]
                err.append("cycle: " + " needs ".join(kb.by_path[x]["title"] for x in cyc))
            elif u not in state:
                dfs(u)
        stack.pop()
        state[v] = 2

    sys.setrecursionlimit(10000)
    for v in pre:
        if v not in state:
            dfs(v)
    if not any(e.startswith("cycle") for e in err):
        clo = closures(pre)
        for v, ps in pre.items():
            for a in ps:
                via = [c for c in ps if c != a and a in clo[c]]
                if via:
                    warn.append(f'redundant edge: {kb.by_path[v]["title"]} needs {kb.by_path[a]["title"]}, already implied by {kb.by_path[via[0]]["title"]}')
    # staleness: a prereq the page's own "You need" line no longer links
    stale = 0
    for p in kb.topic:
        ps = pre.get(p["path"], [])
        if not ps:
            continue
        linked = you_need_ids(p["path"])
        for a in ps:
            q = kb.by_path[a]
            ids = {q["id"].replace("-", "")} | {x.replace("-", "") for x in q.get("aliases", [])}
            if linked is None or not (ids & linked):
                stale += 1
                warn.append(f'stale?: {p["title"]} lists {q["title"]} as a prereq but its "You need" line does not link it'
                            + (" (no You need line)" if linked is None else ""))
    if not quiet:
        for w in warn:
            print("learning map warning:", w)
        for e in err:
            print("learning map ERROR:", e)
        n_edges = sum(len(v) for v in pre.values())
        print(f"learning map: {len(pre)} pages, {n_edges} edges, {len(err)} errors, {len(warn)} warnings "
              f"({stale} prereqs not linked from their page's You need line)")
    return err, warn, pre


def closures(pre):
    memo = {}

    def c(v):
        if v not in memo:
            s = set()
            for u in pre.get(v, []):
                s |= {u} | c(u)
            memo[v] = s
        return memo[v]

    for v in pre:
        c(v)
    return memo


def longest_layers(nodes, preds):
    memo = {}

    def f(v):
        if v not in memo:
            memo[v] = 1 + max((f(u) for u in preds.get(v, []) if u in nodes), default=-1)
        return memo[v]

    for v in nodes:
        f(v)
    return memo


# ---------------------------------------------------------------- text measuring and wrapping
_NARROW, _SEMI, _WIDE = set("iljI.,:;|!'`"), set("ftr()-/[] "), set("mwMW@")


def text_w(s, size, bold=False):
    w = 0.0
    for ch in s:
        if ch in _NARROW: f = 0.25
        elif ch in _SEMI: f = 0.33
        elif ch in _WIDE: f = 0.86
        elif ch.isupper(): f = 0.68
        elif ch.isdigit(): f = 0.58
        else: f = 0.55
        w += f
    return w * size * (1.07 if bold else 1.0) * 1.04


def wrap(text, maxw, size, bold=False, maxlines=4):
    toks = re.findall(r"[^\s-]+-?|\s+|-", text)
    lines, cur = [], ""
    for t in toks:
        if t.isspace():
            if cur:
                cur += " "
            continue
        if text_w((cur + t).rstrip(), size, bold) <= maxw or not cur.strip():
            cur += t
        else:
            lines.append(cur.rstrip())
            cur = t
    if cur.strip():
        lines.append(cur.rstrip())
    out = []
    for ln in lines:  # a single token wider than the box: split it
        while text_w(ln, size, bold) > maxw and len(ln) > 3:
            k = len(ln)
            while k > 1 and text_w(ln[:k], size, bold) > maxw:
                k -= 1
            out.append(ln[:k])
            ln = ln[k:]
        out.append(ln)
    if len(out) > maxlines:
        last = out[maxlines - 1]
        while last and text_w(last + "…", size, bold) > maxw:
            last = last[:-1].rstrip()
        out = out[:maxlines - 1] + [last.rstrip(" ,;:-") + "…"]
    return out


def short_title(t):
    if t.startswith("Topic: "):
        return t[7:]
    head = t.split(":")[0]
    return head if ":" in t and len(head) >= 12 else t


# ---------------------------------------------------------------- layered layout
def crossings(a, b):
    n = 0
    for i in range(len(a)):
        for j in range(i + 1, len(a)):
            if (a[i] - a[j]) * (b[i] - b[j]) < 0:
                n += 1
    return n


def isotonic(z, w):
    """weighted pool-adjacent-violators: nondecreasing fit of z"""
    blocks = []
    for zi, wi in zip(z, w):
        blocks.append([zi * wi, wi, 1])
        while len(blocks) > 1 and blocks[-2][0] / blocks[-2][1] > blocks[-1][0] / blocks[-1][1]:
            s, ww, n = blocks.pop()
            blocks[-1][0] += s; blocks[-1][1] += ww; blocks[-1][2] += n
    out = []
    for s, ww, n in blocks:
        out += [s / ww] * n
    return out


def layout(nodes, edges, layer, height, colx, gap=14, iters=28, cgap=26):
    """lays out each connected part on its own and stacks the parts top to bottom, so unrelated chains never
    leave holes in each other"""
    comp = {v: v for v in nodes}

    def find(v):
        while comp[v] != v:
            comp[v] = comp[comp[v]]
            v = comp[v]
        return v

    for u, v in edges:
        comp[find(u)] = find(v)
    parts = []
    for v in nodes:
        r = find(v)
        if r not in [p[0] for p in parts]:
            parts.append((r, []))
        next(p for p in parts if p[0] == r)[1].append(v)
    # singletons first (a topic's root page), then the parts in the order of their first node
    parts.sort(key=lambda p: (len(p[1]) > 1, nodes.index(p[1][0])))
    tops, pts, y0 = {}, {}, 0.0
    singles = [p[1][0] for p in parts if len(p[1]) == 1]
    if singles:  # singletons share one row band, side by side when in different stages
        by_l = defaultdict(list)
        for v in singles:
            by_l[layer[v]].append(v)
        hmax = 0
        for l, vs in by_l.items():
            t = 0
            for v in vs:
                tops[v] = t
                t += height[v] + gap
            hmax = max(hmax, t - gap)
        y0 = hmax + cgap
    for _, vs in parts:
        if len(vs) == 1:
            continue
        s = set(vs)
        t, p, H = _layout(vs, [e for e in edges if e[0] in s], layer, height, gap, iters)
        for v in t:
            tops[v] = t[v] + y0
        for e, q in p.items():
            pts[e] = [(l, y + y0) for l, y in q]
        y0 += H + cgap
    return tops, pts, y0 - cgap


def _layout(nodes, edges, layer, height, gap=14, iters=28, dgap=6, maxw=None):
    """nodes: ids in a preferred initial order; edges (u, v) with layer[u] < layer[v]; height: id -> px.
    returns (top y per node, chains: (u, v) -> list of (layer, y) for its dummy points, total height)"""
    nl = max(layer[v] for v in nodes) + 1
    L = [[] for _ in range(nl)]
    lay, h, kind = dict(layer), dict(height), {}
    for v in nodes:
        L[layer[v]].append(v)
        kind[v] = "n"
    up, dn = defaultdict(list), defaultdict(list)
    chains = {}
    for k, (u, v) in enumerate(edges):
        prev, ch = u, []
        for l in range(layer[u] + 1, layer[v]):
            d = ("d", k, l)
            lay[d], h[d], kind[d] = l, 4, "d"
            # dummies start next to their source
            L[l].append(d)
            up[d].append(prev); dn[prev].append(d)
            ch.append(d)
            prev = d
        up[v].append(prev); dn[prev].append(v)
        chains[(u, v)] = ch

    def pos_of():
        return {v: i for l in L for i, v in enumerate(l)}

    def total():
        pos, n = pos_of(), 0
        for l in range(nl - 1):
            segs = [(pos[a], pos[b]) for a in L[l] for b in dn[a]]
            n += crossings([s[0] for s in segs], [s[1] for s in segs])
        return n

    best, best_c = [list(l) for l in L], total()
    for it in range(iters):
        pos = pos_of()
        rng = range(1, nl) if it % 2 == 0 else range(nl - 2, -1, -1)
        for l in rng:
            nb = up if it % 2 == 0 else dn
            key = {}
            for v in L[l]:
                ps = [pos[u] for u in nb[v]]
                key[v] = sum(ps) / len(ps) if ps else pos[v]
            L[l].sort(key=lambda v: (key[v], pos[v]))
            for i, v in enumerate(L[l]):
                pos[v] = i
        c = total()
        if c < best_c:
            best, best_c = [list(l) for l in L], c
    L = best
    # then swap neighbours while that removes crossings, or keeps them and shortens the lines (greedy switch)
    def cost():
        pos = pos_of()
        return total(), sum(abs(pos[a] - pos[b]) for l in range(nl - 1) for a in L[l] for b in dn[a])

    better, c0 = True, cost()
    while better and c0[0]:
        better = False
        for l in range(nl):
            for i in range(len(L[l]) - 1):
                L[l][i], L[l][i + 1] = L[l][i + 1], L[l][i]
                c1 = cost()
                if c1 < c0:
                    c0, better = c1, True
                else:
                    L[l][i], L[l][i + 1] = L[l][i + 1], L[l][i]
    # small drawings (the topic graph): try every order of each pair of neighbouring layers
    better = True
    while better and c0[0]:
        better = False
        for l in range(nl - 1):
            if factorial(len(L[l])) * factorial(len(L[l + 1])) > 20000:
                continue
            keep = best2 = (list(L[l]), list(L[l + 1]))
            for pa in permutations(keep[0]):
                L[l] = list(pa)
                for pb in permutations(keep[1]):
                    L[l + 1] = list(pb)
                    c1 = cost()
                    if c1 < c0:
                        c0, better, best2 = c1, True, (list(pa), list(pb))
            L[l], L[l + 1] = best2
    # y: stack, then pull toward neighbours under the order and spacing constraints
    y = {}
    for l in L:
        t = 0
        for v in l:
            y[v] = t + h[v] / 2
            t += h[v] + gap
    for it in range(40):
        rng = range(nl) if it % 2 == 0 else range(nl - 1, -1, -1)
        for l in rng:
            row = L[l]
            if not row:
                continue
            want, wts = [], []
            for v in row:
                nb = up[v] + dn[v]
                want.append(sum(y[u] for u in nb) / len(nb) if nb else y[v])
                wts.append(0.6 if kind[v] == "d" else 1.0)
            s, acc = [], 0.0
            for i, v in enumerate(row):
                if i:
                    a = row[i - 1]
                    g = dgap if (kind[a] == "d" or kind[v] == "d") else gap
                    acc += h[a] / 2 + g + h[v] / 2
                s.append(acc)
            fit = isotonic([want[i] - s[i] for i in range(len(row))], wts)
            for i, v in enumerate(row):
                y[v] = fit[i] + s[i]
    top = min(y[v] - h[v] / 2 for v in y)
    for v in y:
        y[v] -= top
    if maxw:  # keep every layer inside [0, maxw], keeping its order and spacing
        for row in L:
            gp = [0] + [dgap if (kind[a] == "d" or kind[v] == "d") else gap for a, v in zip(row, row[1:])]
            hi = maxw
            for i in range(len(row) - 1, -1, -1):
                v = row[i]
                y[v] = min(y[v], hi - h[v] / 2)
                hi = y[v] - h[v] / 2 - gp[i]
            lo = 0
            for i, v in enumerate(row):
                y[v] = max(y[v], lo + h[v] / 2)
                lo = y[v] + h[v] / 2 + (gp[i + 1] if i + 1 < len(row) else 0)
    H = max(y[v] + h[v] / 2 for v in y)
    tops = {v: y[v] - height[v] / 2 for v in nodes}
    pts = {e: [(lay[d], y[d]) for d in ch] for e, ch in chains.items()}
    return tops, pts, H


def ports(edges, box, pts):
    """spread edge ends over a node's side, ordered by where the edge comes from or goes to"""
    out, inn = defaultdict(list), defaultdict(list)
    for e in edges:
        u, v = e
        p = pts.get(e, [])
        out[u].append((p[0][1] if p else box[v][1] + box[v][3] / 2, e))
        inn[v].append((p[-1][1] if p else box[u][1] + box[u][3] / 2, e))
    sy, ty = {}, {}
    for dct, res, end in ((out, sy, 0), (inn, ty, 1)):
        for n, lst in dct.items():
            lst.sort()
            x, y0, w, hh = box[n]
            k = len(lst)
            span = min(hh - 12, 9 * (k - 1))
            for i, (_, e) in enumerate(lst):
                res[e] = y0 + hh / 2 + (0 if k == 1 else -span / 2 + span * i / (k - 1))
    return sy, ty


def edge_d(x0, y0, mids, x1, y1):
    """smooth left-to-right path; mids: (xl, xr, y) segments the edge runs along (its dummy points)"""
    d = f"M{x0:.0f} {y0:.0f}"
    cx, cy = x0, y0
    for xl, xr, yy in mids + [(x1, None, y1)]:
        dx = (xl - cx) / 2
        d += f"C{cx + dx:.0f} {cy:.0f} {xl - dx:.0f} {yy:.0f} {xl:.0f} {yy:.0f}"
        if xr is not None:
            d += f"H{xr:.0f}"
            cx = xr
        cy = yy
    return d


def columns(n, maxsp=230):
    sp = min(maxsp, (W - 8 - BW) / (n - 1)) if n > 1 else 0
    return [round(i * sp) for i in range(n)]


# ---------------------------------------------------------------- the map
FS, LH = 12, 15


def page_height(lines):
    return 8 + len(lines) * LH + 15


def build(url, kb=None):
    kb = kb or KB()
    err, warn, pre = check(kb, quiet=True)
    if err:
        raise SystemExit("learning map: " + "; ".join(err))
    topic = [p for p in kb.topic]
    roots = []
    for p in topic:
        r = kb.root(p["path"])
        if r not in roots:
            roots.append(r)
    sec_of = {r: kb.by_path[r].get("section") for r in roots}
    first = {r: i for i, r in enumerate(roots)}
    roots.sort(key=lambda r: (SECTIONS.index(sec_of[r]) if sec_of[r] in SECTIONS else 9, first[r]))
    tix = {r: i for i, r in enumerate(roots)}
    order = sorted(topic, key=lambda p: (tix[kb.root(p["path"])], 0 if p["path"] == kb.root(p["path"]) else 1))
    pix = {p["path"]: i for i, p in enumerate(order)}
    glayer = longest_layers(set(pix), pre)
    P = []
    for p in order:
        m, plus = reading(p["path"])
        lines = wrap(short_title(p["title"]), BW - 12, FS, maxlines=4)
        P.append({"id": p["id"].replace("-", ""), "t": p["title"], "u": url(p), "m": m, "x": plus,
                  "c": tix[kb.root(p["path"])], "l": lines, "h": page_height(lines), "g": glayer[p["path"]],
                  "pre": [pix[a] for a in pre[p["path"]]]})
    T = []
    for r in roots:
        rp = kb.by_path[r]
        mem = [pix[p["path"]] for p in order if kb.root(p["path"]) == r]
        T.append({"n": short_title(rp["title"]), "slug": r.rsplit("/", 1)[-1].removeprefix("topic_"),
                  "s": SECTIONS.index(sec_of[r]) if sec_of[r] in SECTIONS else 0, "r": pix[r], "p": mem,
                  "m": sum(P[i]["m"] or 0 for i in mem)})

    views = {"topic": [topic_view(P, T, k) for k in range(len(T))], "path": {}}
    clo = closures({i: P[i]["pre"] for i in range(len(P))})
    for i in range(len(P)):
        if clo[i]:
            views["path"][i] = path_view(P, i, clo[i])
    ov_svg, ov_list, groups = overview(P, T)
    return P, T, views, ov_svg, ov_list, groups, (err, warn)


def view_from(P, nodes, edges, layer, ghost=()):
    ncol = max(layer.values()) + 1
    cx = columns(ncol)
    tops, pts, H = layout(nodes, edges, layer, {i: P[i]["h"] for i in nodes}, cx)
    box = {i: (cx[layer[i]], TOP + tops[i], BW, P[i]["h"]) for i in nodes}
    sy, ty = ports(edges, box, {e: [(l, TOP + y) for l, y in p] for e, p in pts.items()})
    E = []
    for (u, v) in edges:
        mids = [(cx[l], cx[l] + BW, TOP + y) for l, y in pts[(u, v)]]
        E.append([u, v, edge_d(box[u][0] + BW, sy[(u, v)], mids, box[v][0] - 1, ty[(u, v)])])
    N = [[i, box[i][0], round(box[i][1]), 1 if i in ghost else 0] for i in nodes]
    return {"w": cx[-1] + BW + 2, "h": round(TOP + H + 8), "cols": cx, "n": N, "e": E, "lay": {i: layer[i] for i in nodes}}


def topic_view(P, T, k):
    mem = T[k]["p"]
    ms = set(mem)
    ghosts = []
    for i in mem:
        for a in P[i]["pre"]:
            if a not in ms and a not in ghosts:
                ghosts.append(a)
    layer = {g: 0 for g in ghosts}

    def f(i):
        if i not in layer:
            layer[i] = 1 + max((f(a) for a in P[i]["pre"]), default=0)
        return layer[i]

    for i in mem:
        f(i)
    if not ghosts:
        for i in mem:
            layer[i] -= 1
    nodes = sorted(ghosts, key=lambda g: (P[g]["c"], g)) + mem
    edges = [(a, i) for i in mem for a in P[i]["pre"]]
    v = view_from(P, nodes, edges, layer, ghost=set(ghosts))
    v["before"] = 1 if ghosts else 0
    return v


def path_view(P, t, clo):
    nodes = sorted(clo | {t}, key=lambda i: (P[i]["c"], i))
    s = set(nodes)
    layer = {i: P[i]["g"] for i in nodes}
    edges = [(a, i) for i in nodes for a in P[i]["pre"] if a in s]
    v = view_from(P, nodes, edges, layer)
    ys = {n[0]: n[2] for n in v["n"]}
    v["order"] = sorted(nodes, key=lambda i: (layer[i], ys[i]))
    del v["lay"]
    return v


FREE_HEAD = "Start anytime: no other topic is mostly needed"
FREE_NOTE = "Their weaker links show dotted when you focus one."
STRONG = 1 / 3     # topic A is placed after topic B when at least this share of A's pages build on B's pages
CW_MIN, CW_MAX, CW_FREE, CG, GUT = 140, 205, 150, 16, 26   # card widths (min, max, start-anytime grid), gap, gutter for layer names
RX, SH = 10, 14    # card corner radius, height of the stage pills


def accent(x, y, h, rx=RX, w=3):
    """the section colour as a thin strip along the card's left edge, following its rounded corners"""
    dy = rx - (rx * rx - (rx - w) ** 2) ** 0.5
    return (f'<path class="lm-bar" d="M{x + w:.1f} {y + dy:.1f}A{rx} {rx} 0 0 0 {x:.1f} {y + rx:.1f}V{y + h - rx:.1f}'
            f'A{rx} {rx} 0 0 0 {x + w:.1f} {y + h - dy:.1f}Z"/>')


DEFS = ('<filter id="lm-sh" x="-10%" y="-12%" width="120%" height="136%"><feDropShadow class="lm-fs" dx="0" dy="1" stdDeviation="1.6"/></filter>'
        '<filter id="lm-sh2" x="-14%" y="-16%" width="128%" height="148%"><feDropShadow class="lm-fs2" dx="0" dy="3" stdDeviation="4"/></filter>')


def topic_links(P, T):
    """for each topic, how many of its pages build on each other topic (that topic's pages are in the page's
    prerequisite closure). returns strong {(b, a): count} (a's pages mostly build on b), weak (some, under STRONG),
    and per topic the number of pages whose closure stays inside the topic"""
    clo = closures({i: P[i]["pre"] for i in range(len(P))})
    strong, weak, alone = {}, {}, []
    for k, t in enumerate(T):
        cnt, a = defaultdict(int), 0
        for i in t["p"]:
            d = {P[j]["c"] for j in clo[i]} - {k}
            a += not d
            for b in d:
                cnt[b] += 1
        alone.append(a)
        for b, c in cnt.items():
            (strong if c >= STRONG * len(t["p"]) - 1e-9 else weak)[(b, k)] = c
    return strong, weak, alone


def sccs(n, edges):
    adj = defaultdict(list)
    for b, a in edges:
        adj[b].append(a)
    idx, low, on, st, out = {}, {}, set(), [], []

    def sc(v):
        idx[v] = low[v] = len(idx)
        st.append(v); on.add(v)
        for w in adj[v]:
            if w not in idx:
                sc(w); low[v] = min(low[v], low[w])
            elif w in on:
                low[v] = min(low[v], idx[w])
        if low[v] == idx[v]:
            comp = []
            while True:
                w = st.pop(); on.discard(w); comp.append(w)
                if w == v:
                    break
            out.append(comp)

    for v in range(n):
        if v not in idx:
            sc(v)
    return out


def topic_layers(nT, strong):
    """layer = longest chain over the strong edges; topics that mostly build on each other (a cycle) share a layer"""
    comps = sccs(nT, strong)
    cid = {v: c for c, vs in enumerate(comps) for v in vs}
    preds = defaultdict(set)
    for b, a in strong:
        if cid[b] != cid[a]:
            preds[cid[a]].add(cid[b])
    cl = longest_layers(set(range(len(comps))), preds)
    return {v: cl[cid[v]] for v in range(nT)}, [c for c in comps if len(c) > 1]


def vcurve(x0, y0, x1, y1):
    dy = (y1 - y0) / 2
    return f"C{x0:.0f} {y0 + dy:.0f} {x1:.0f} {y1 - dy:.0f} {x1:.0f} {y1:.0f}"


def overview(P, T):
    """the topic graph: one card per topic in layers top to bottom (study order), solid lines for the strong links;
    returns (inline SVG for wide screens, card rows for narrow screens, cycle note)"""
    nT = len(T)
    strong, weak, alone = topic_links(P, T)
    lay, cyc = topic_layers(nT, strong)
    nst = max(p["g"] for p in P) + 1
    names = lambda ks: ", ".join(T[b]["n"] for b in ks)
    for k, t in enumerate(T):
        n = len(t["p"])
        t["l"], t["al"] = lay[k], alone[k]
        t["st"] = [sum(1 for i in t["p"] if P[i]["g"] == g) for g in range(nst)]
        t["up"] = sorted(b for (b, a) in list(strong) + list(weak) if a == k)
        t["dn"] = sorted(a for (b, a) in list(strong) + list(weak) if b == k)
        t["su"] = sorted((b for (b, a) in strong if a == k), key=lambda b: -strong[(b, k)])
        t["wu"] = sorted((b for (b, a) in weak if a == k), key=lambda b: (-weak[(b, k)], b))
    linked = {v for e in strong for v in e}
    nl = max(lay.values()) + 1
    secord = lambda k: (T[k]["s"], k)

    # ---- rows: the spine first, layer by layer: the linked topics of a layer in one row whose order and x come from
    # the layered layout (barycenter sweeps, exhaustive swaps, isotonic x), leaving room for lines passing through.
    # Then one band of the topics with no strong link either way ("start anytime"), in a compact grid.
    AW = W - GUT - 8
    per = max(1, int((AW + CG) // (CW_FREE + CG)))
    lk = sorted(linked, key=secord)
    free = sorted((k for k in range(nT) if k not in linked), key=secord)
    es = [(b, a) for (b, a) in strong if lay[b] < lay[a]]
    through = defaultdict(int)
    for b, a in es:
        for l in range(lay[b] + 1, lay[a]):
            through[l] += 1
    width = {}
    rows_of = []          # per spine layer: [row]; then the start-anytime rows
    for l in range(nl):
        lr = [k for k in lk if lay[k] == l]
        if lr:
            n = len(lr)
            w = max(CW_MIN, min(CW_MAX, (AW - 4 - (n - 1) * CG - through[l] * (4 + 2 * 12 - CG)) / n))
            for k in lr:
                width[k] = w
            rows_of.append([lr])
    nsp = len(rows_of)
    if free:
        nr = -(-len(free) // per)
        m = -(-len(free) // nr)
        rows_of.append([free[i:i + m] for i in range(0, len(free), m)])
        for k in free:
            width[k] = min(CW_MAX, (AW - (m - 1) * CG) / m)

    # ---- card contents (sizes known at build time); the "also use" list is a panel shown only on focus
    TX = 12
    card = {}
    for k, t in enumerate(T):
        n = len(t["p"])
        tw = width[k] - TX - 8
        tl = wrap(t["n"], tw, 13.5, True, 2)
        wk = wrap("Some pages also use: " + names(t["wu"]), tw, 11, maxlines=6) if t["wu"] else []
        h = 11 + 16 * len(tl) + 16 + 5 + 11 + SH + 12
        card[k] = {"tl": tl, "wk": wk, "h": h}

    xs, dpts = {}, {}
    if lk:
        tops, pts, ext = _layout(lk, es, lay, {k: width[k] for k in lk}, gap=CG, dgap=12, maxw=AW)
        ox = GUT + max(0, (AW - ext) / 2)
        for k in lk:
            xs[k] = ox + tops[k]
        dpts = {e: [(l, ox + x) for l, x in p] for e, p in pts.items()}
    for rows in rows_of[:nsp]:   # linked rows in layout order; wrap evenly if they do not fit (lines may then cross cards)
        lr = sorted(rows[-1], key=lambda k: xs[k])
        if xs[lr[-1]] + width[lr[-1]] > W + 1:
            rows.pop()
            for i in range(0, len(lr), per):
                rows.append(lr[i:i + per])
            for k in lr:
                xs.pop(k)
        else:
            rows[-1] = lr

    box, crow, y, bands = {}, {}, 0, []
    for l, rows in enumerate(rows_of):
        y0 = y
        y += 12 if l < nsp else 30
        for r, row in enumerate(rows):
            rh = max(card[k]["h"] for k in row)
            if row[0] in xs:
                for k in row:
                    box[k] = (xs[k], y, width[k], rh)
                crow[l] = (y, y + rh)
            else:
                tot = sum(width[k] for k in row) + (len(row) - 1) * CG
                x = GUT + (AW - tot) / 2
                for k in row:
                    box[k] = (x, y, width[k], rh)
                    x += width[k] + CG
            y += rh + (CG if r < len(rows) - 1 else 0)
        crow.setdefault(l, (y0 + 12, y))
        bands.append((y0, y + 12))
        y += 12 + (44 if l + 1 < nsp else 28)
    y -= 12 + (44 if len(rows_of) <= nsp else 28)
    # focus panels ("Some pages also use"), under the card, or above it when there is no room below
    panel = {}
    for k in box:
        if card[k]["wk"]:
            x, yb, w, hb = box[k]
            ph = 10 + 14 * len(card[k]["wk"])
            py = yb + hb + 4 if yb + hb + 4 + ph <= y + 12 else yb - 4 - ph
            panel[k] = (x, py, w, ph)
    H = round(y + 12)

    # ---- strong edges: from the bottom of the topic built on to the top of the topic building on it
    def ports(lst, key):
        out = {}
        groups = defaultdict(list)
        for e in lst:
            groups[key(e)[0]].append((key(e)[1], e))
        for n, g in groups.items():
            g.sort()
            m = len(g)
            span = min(box[n][2] - 44, 18 * (m - 1))
            for i, (_, e) in enumerate(g):
                out[e] = box[n][0] + box[n][2] / 2 + (0 if m == 1 else -span / 2 + span * i / (m - 1))
        return out

    E = [e for e in strong if lay[e[0]] < lay[e[1]]]
    cx = lambda k: box[k][0] + box[k][2] / 2
    sx = ports(E, lambda e: (e[0], dpts[e][0][1] if dpts.get(e) else cx(e[1])))
    tx = ports(E, lambda e: (e[1], dpts[e][-1][1] if dpts.get(e) else cx(e[0])))
    o = [f'<svg id="lm-ov" class="lm-svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" role="group" '
         f'aria-label="The {nT} topics in layers, in study order from top to bottom">']
    o.append('<defs><marker id="lm-ar2" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="8" markerHeight="8" markerUnits="userSpaceOnUse" orient="auto">'
             '<path d="M0 0L8 4L0 8z" class="lm-arh"/></marker></defs>')
    for l, (a, b) in enumerate(bands):
        if l < nsp:
            cnt = len(rows_of[l][0]) if len(rows_of[l]) == 1 else sum(map(len, rows_of[l]))
            head = f"Layer {l + 1}" + (": start here" if l == 0 else "") + f", {cnt} topic{'s' if cnt != 1 else ''}"
            for alt in (head, f"Layer {l + 1}" + (": start here" if l == 0 else ""), f"Layer {l + 1}"):
                if text_w(alt, 12, True) <= b - a - 10:
                    head = alt
                    break
            else:
                head = f"L{l + 1}"
            my = (a + b) / 2
            o.append(f'<g class="lm-bd" data-l="{l}"><rect class="lm-band" x="0.5" y="{a}" width="{W - 1}" height="{b - a}" rx="12"/>'
                     f'<text class="lm-lh" x="16" y="{my:.0f}" text-anchor="middle" transform="rotate(-90 16 {my:.0f})">{head}</text></g>')
        else:
            o.append(f'<g class="lm-bd" data-l="f"><rect class="lm-bandf" x="0.5" y="{a}" width="{W - 1}" height="{b - a}" rx="12"/>'
                     f'<text class="lm-lh" x="{GUT}" y="{a + 19}">{FREE_HEAD} ({len(free)} topics).</text>'
                     f'<text class="lm-lh2" x="{GUT + text_w(FREE_HEAD + f" ({len(free)} topics).", 12, True) + 8:.0f}" y="{a + 19}">{FREE_NOTE}</text></g>')
    grads = []
    o.append('<g class="lm-es">')
    labels = []
    for e in sorted(E, key=lambda e: -strong[e]):
        b, a = e
        n = len(T[a]["p"]); c = strong[e]
        x0, y0 = sx[e], box[b][1] + box[b][3]
        d = f"M{x0:.0f} {y0:.0f}"
        for l, x in dpts.get(e, []):
            t0, t1 = crow[l]
            d += vcurve(x0, y0, x, t0) + f"V{t1:.0f}"
            x0, y0 = x, t1
        x1, y1 = tx[e], box[a][1]
        d += vcurve(x0, y0, x1, y1)
        wpx = 1 + 6.5 * c / n
        tip = f"{T[a]['n']}: {c} of {n} pages build on {T[b]['n']}"
        gx0, gy0 = sx[e], box[b][1] + box[b][3]
        grads.append(f'<linearGradient id="lm-g{b}-{a}" gradientUnits="userSpaceOnUse" x1="{gx0:.0f}" y1="{gy0:.0f}" x2="{x1:.0f}" y2="{y1:.0f}">'
                     f'<stop offset="0" class="lm-st s{T[b]["s"]}"/><stop offset="1" class="lm-st s{T[a]["s"]}"/></linearGradient>')
        o.append(f'<path class="lm-se" data-a="{b}" data-b="{a}" d="{d}" stroke="url(#lm-g{b}-{a})" stroke-width="{wpx:.1f}"><title>{html.escape(tip)}</title></path>')
        lx, ly = (x0 + x1) / 2, (y0 + y1) / 2
        lt = f"{c} of {n} pages"
        lw = text_w(lt, 11) + 14
        labels.append(f'<g class="lm-el" data-a="{b}" data-b="{a}"><rect x="{lx - lw / 2:.0f}" y="{ly - 10:.0f}" width="{lw:.0f}" height="20" rx="10"/>'
                      f'<text x="{lx:.0f}" y="{ly + 4:.0f}" text-anchor="middle">{lt}</text></g>')
    o.append('</g><g class="lm-ws">')
    for e in sorted(weak, key=lambda e: -weak[e]):
        b, a = e
        (xb, yb, _, hb), (xa, ya, _, ha) = box[b], box[a]
        if ya >= yb + hb + 4:
            d = f"M{cx(b) + 8:.0f} {yb + hb:.0f}" + vcurve(cx(b) + 8, yb + hb, cx(a) - 8, ya - 2)
        elif ya + ha <= yb - 4:
            d = f"M{cx(b) - 8:.0f} {yb:.0f}" + vcurve(cx(b) - 8, yb, cx(a) + 8, ya + ha + 2)
        else:
            d = f"M{cx(b):.0f} {yb:.0f}C{cx(b):.0f} {yb - 44:.0f} {cx(a):.0f} {ya - 44:.0f} {cx(a):.0f} {ya - 2:.0f}"
        tip = f"{T[a]['n']}: {weak[e]} of {len(T[a]['p'])} pages build on {T[b]['n']}"
        o.append(f'<path class="lm-we" data-a="{b}" data-b="{a}" d="{d}" marker-end="url(#lm-ar2)"><title>{html.escape(tip)}</title></path>')
    o.append('</g><g class="lm-dots"></g>')
    o[1] = '<defs>' + DEFS + "".join(grads) + o[1][len('<defs>'):]

    def strip_svg(k, x, y):
        """stage numbers on a tiny row, then one pill per stage with its page count"""
        s, cell = "", min(30, (width[k] - TX - 12 + 4) / nst - 4)
        for g, c in enumerate(T[k]["st"]):
            cx0 = x + g * (cell + 4)
            s += f'<text class="lm-sl" x="{cx0 + cell / 2:.1f}" y="{y + 8}" text-anchor="middle">{g + 1}</text>'
        y += 11
        for g, c in enumerate(T[k]["st"]):
            cx0 = x + g * (cell + 4)
            tip = f"{c} page{'s' if c != 1 else ''} at stage {g + 1}"
            s += f'<rect class="lm-cell{" z" if not c else ""}" x="{cx0:.1f}" y="{y}" width="{cell:.1f}" height="{SH}" rx="{SH / 2:.0f}"><title>{tip}</title></rect>'
            if c:
                s += f'<text class="lm-cnt" x="{cx0 + cell / 2:.1f}" y="{y + 10.5}" text-anchor="middle">{c}</text>'
        return s

    def tip_of(k):
        t = T[k]
        s = f'{t["n"]}: {len(t["p"])} pages, {t["m"]} min core reading; pages per stage ' + ", ".join(str(c) for c in t["st"]) + f'; {t["al"]} of {len(t["p"])} pages build only on pages of this topic.'
        if t["su"]:
            s += " Builds on " + ", ".join(f'{T[b]["n"]} ({strong[(b, k)]} of {len(t["p"])} pages)' for b in t["su"]) + "."
        if t["wu"]:
            s += " Some pages also use " + ", ".join(f'{T[b]["n"]} ({weak[(b, k)]})' for b in t["wu"]) + "."
        return s + " Click to open its pages."

    for k in sorted(box, key=lambda k: (box[k][1], box[k][0])):
        t, c = T[k], card[k]
        x, y, w, h = box[k]
        meta = f'{len(t["p"])} pages, {t["m"] / 60:.1f} h'
        s = (f'<g class="lm-t s{t["s"]}" data-t="{k}" data-k="{k}" data-l="{lay[k]}" data-free="{0 if k in linked else 1}" role="button" tabindex="0" '
             f'aria-label="Open {html.escape(t["n"])}: {meta}"><title>{html.escape(tip_of(k))}</title>'
             f'<rect class="lm-box" x="{x:.1f}" y="{y}" width="{w:.1f}" height="{h}" rx="{RX}"/>' + accent(x, y, h))
        yy = y + 11
        for ln in c["tl"]:
            s += f'<text class="lm-tl" x="{x + TX:.1f}" y="{yy + 12}">{html.escape(ln)}</text>'
            yy += 16
        s += (f'<text class="lm-m" x="{x + TX:.1f}" y="{yy + 12}"><tspan class="lm-pn">{len(t["p"])}</tspan> pages, '
              f'<tspan class="lm-hr">{t["m"] / 60:.1f} h</tspan></text>')
        yy += 16 + 5
        s += strip_svg(k, x + TX, yy)
        o.append(s + '</g>')
    o.append('<g class="lm-els">' + "".join(labels) + '</g>')
    for k, (x, py, w, ph) in panel.items():
        s = f'<g class="lm-wkp" data-k="{k}"><rect x="{x:.1f}" y="{py:.0f}" width="{w:.1f}" height="{ph}" rx="8"/>'
        for j, ln in enumerate(card[k]["wk"]):
            s += f'<text class="lm-wk" x="{x + TX:.1f}" y="{py + 17 + 14 * j:.0f}">{html.escape(ln)}</text>'
        o.append(s + '</g>')
    o.append('</svg>')

    # ---- narrow screens: the same layers as rows of cards, links as text
    q = []
    for l, rows in enumerate(rows_of):
        ks = [k for row in rows for k in row]
        q.append((f'<h4>Layer {l + 1}{": start here" if l == 0 else ""}</h4>' if l < nsp else f'<h4>{FREE_HEAD}</h4><p class="lm-note">{FREE_NOTE}</p>') + '<div class="lm-cards">')
        for k in ks:
            t = T[k]
            n = len(t["p"])
            st = "".join(f'<span title="{c} page{"s" if c != 1 else ""} at stage {g + 1}"><em>{g + 1}</em><i class="{"z" if not c else ""}">{c or ""}</i></span>'
                         for g, c in enumerate(t["st"]))
            q.append(f'<div class="lm-c lm-t s{t["s"]}" data-k="{k}" role="button" tabindex="0" aria-label="{html.escape(t["n"])}: show what it builds on">'
                     f'<b>{html.escape(t["n"])}</b><span class="lm-cm">{n} pages, {t["m"] / 60:.1f} h</span>'
                     f'<span class="lm-strip">{st}</span>'
                     + (f'<span class="lm-cb">Builds on: ' + ", ".join(f'{html.escape(T[b]["n"])} ({strong[(b, k)]} of {n} pages)' for b in t["su"]) + '</span>' if t["su"] else '')
                     + (f'<span class="lm-cw">Some pages also use: {html.escape(names(t["wu"]))}</span>' if t["wu"] else '')
                     + f'<button class="lm-btn lm-open" data-t="{k}">Open its pages</button></div>')
        q.append('</div>')
    note = ""
    if cyc:
        note = " " + " ".join(f'{" and ".join(T[v]["n"] for v in c)} mostly build on each other, so they sit side by side.' for c in cyc)
    return "".join(o), "".join(q), note


# ---------------------------------------------------------------- HTML
CSS = """
.lm{position:relative;margin:24px 0 8px;--s0:#2f6fb5;--s1:#b8602a;--s2:#2b8a57;--s3:#8a4fb8;--s4:#1f8585;--card:#fff;--hl:#d99a00;--card2:#f7f7f5;
 --cardln:rgba(31,35,40,.10);--cardln2:rgba(31,35,40,.18);--shc:#1f2328;--sho:.09;--sho2:.16;--band:rgba(31,35,40,.028);--pill0:rgba(31,35,40,.05);--edge:.5}
@media (prefers-color-scheme:dark){.lm{--s0:#6ea8e6;--s1:#e3925c;--s2:#5cc48d;--s3:#b98ce3;--s4:#4fc1c1;--card:#232323;--hl:#f2c14e;--card2:#262626;
 --cardln:rgba(255,255,255,.08);--cardln2:rgba(255,255,255,.16);--shc:#000;--sho:.5;--sho2:.7;--band:rgba(255,255,255,.025);--pill0:rgba(255,255,255,.06);--edge:.55}}
.lm h2{margin:0 0 4px;letter-spacing:-.01em}.lm .lm-sub{color:var(--mute);margin:0 0 16px;font-size:14px}
.lm-bar0{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:center;margin:0 0 12px}
.lm-qw{position:relative;flex:1 1 260px;max-width:420px}
.lm-qw input{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:8px 12px;border:1px solid var(--cardln2);border-radius:10px;background:var(--card);color:var(--ink);box-shadow:0 1px 2px rgba(0,0,0,.04)}
.lm-qw input:focus{outline:none;border-color:var(--acc);box-shadow:0 0 0 3px color-mix(in srgb,var(--acc) 20%,transparent)}
.lm-sug{position:absolute;z-index:5;left:0;right:0;top:100%;margin:4px 0 0;padding:4px;list-style:none;background:var(--card);border:1px solid var(--cardln);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.14)}
.lm-sug li{margin:0}.lm-sug button{display:block;width:100%;text-align:left;font:inherit;font-size:13.5px;padding:6px 10px;border:0;border-radius:6px;background:none;color:var(--ink);cursor:pointer}
.lm-sug button:hover,.lm-sug button.on{background:var(--card2)}
.lm button.lm-btn{font:inherit;font-size:13px;padding:5px 12px;border:1px solid var(--cardln2);border-radius:8px;background:var(--card);color:var(--ink);cursor:pointer;box-shadow:0 1px 2px rgba(0,0,0,.05);transition:border-color .15s,background .15s}
.lm button.lm-btn:hover{border-color:var(--acc)}.lm button.lm-btn:disabled{opacity:.45;cursor:default}
.lm-leg{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12.5px;color:var(--mute);margin:0 0 12px}
.lm-leg i{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:1px}
.lm-head{display:flex;flex-wrap:wrap;gap:8px 12px;align-items:baseline;margin:0 0 8px}.lm-head b{font-size:15.5px}.lm-head span{color:var(--mute);font-size:13.5px}
.lm-scroll{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch}
.lm-svg{display:block;font-family:inherit;font-variant-numeric:tabular-nums;overflow:visible}
.lm-fs{flood-color:var(--shc);flood-opacity:var(--sho)}.lm-fs2{flood-color:var(--shc);flood-opacity:var(--sho2)}
.lm-st{stop-color:var(--sc)}
.lm-col{font-size:11px;fill:var(--mute);font-weight:600;letter-spacing:.06em}
.lm-e{fill:none;stroke:var(--mute);stroke-opacity:.45;stroke-linecap:round}.lm-arh{fill:var(--mute)}
.lm-e.on{stroke:var(--hl);stroke-opacity:1;stroke-width:2.2}.lm-e.off{stroke-opacity:.1}.lm-e.drw{marker-end:none}
.lm-box{fill:var(--card);stroke:var(--cardln);stroke-width:1;filter:url(#lm-sh);transition:stroke .15s,fill .25s}.lm-bar{fill:var(--sc)}
.s0{--sc:var(--s0)}.s1{--sc:var(--s1)}.s2{--sc:var(--s2)}.s3{--sc:var(--s3)}.s4{--sc:var(--s4)}
.lm-tl{font-size:13.5px;fill:var(--ink);font-weight:600;letter-spacing:-.005em}.lm-pl{font-size:12px;fill:var(--ink)}.lm-m{font-size:11.5px;fill:var(--mute)}
.lm-pn{fill:var(--ink);font-weight:600}.lm-hr{fill-opacity:.8}
.lm-t,.lm-pb{cursor:pointer}.lm-t:hover .lm-box,.lm-t:focus-visible .lm-box{stroke:var(--sc);filter:url(#lm-sh2)}.lm-t:focus{outline:none}
.lm-band{fill:var(--band)}.lm-bandf{fill:none;stroke:var(--cardln2);stroke-dasharray:3 5;stroke-linecap:round}.lm-lh2{font-size:12px;fill:var(--mute)}
.lm-lh{font-size:11px;font-weight:600;fill:var(--mute);letter-spacing:.06em}
.lm-sl{font-size:9px;fill:var(--mute);fill-opacity:.8;font-weight:500}
.lm-cell{fill:var(--sc);fill-opacity:.15}.lm-cell.z{fill:var(--pill0);fill-opacity:1}
.lm-cnt{font-size:11px;font-weight:650;fill:var(--sc);pointer-events:none}
.lm-wk{font-size:11px;fill:var(--mute)}
.lm-se{fill:none;stroke-linecap:round;stroke-opacity:var(--edge);transition:stroke-opacity .2s}
.lm-we{fill:none;stroke:var(--mute);stroke-width:1.6;stroke-dasharray:1 5;stroke-linecap:round;opacity:0;pointer-events:none;transition:opacity .25s}
.lm-wkp{opacity:0;pointer-events:none;transition:opacity .2s}.lm-wkp rect{fill:var(--card);stroke:var(--cardln);filter:url(#lm-sh2)}.lm.foc .lm-wkp.on{opacity:1}
.lm-el{opacity:0;pointer-events:none;transition:opacity .2s}.lm-el rect{fill:var(--card);stroke:var(--cardln);filter:url(#lm-sh)}.lm-el text{font-size:11px;fill:var(--ink);font-weight:600}
.lm-dot{fill:var(--card);stroke:var(--sc);stroke-width:2;pointer-events:none}
#lm-ov .lm-t{transition:opacity .2s}
.lm.foc #lm-ov .lm-t,.lm.foc .lm-c{opacity:.25}
.lm.foc #lm-ov .lm-t.me,.lm.foc #lm-ov .lm-t.up,.lm.foc #lm-ov .lm-t.dn,.lm.foc .lm-c.me,.lm.foc .lm-c.up,.lm.foc .lm-c.dn{opacity:1}
.lm.foc #lm-ov .lm-se{stroke-opacity:.07}.lm.foc #lm-ov .lm-se.on{stroke-opacity:1}
.lm.foc .lm-we.on{opacity:.9}.lm.foc .lm-el.on{opacity:1}
#lm-ov .lm-t.me .lm-box{stroke:var(--sc);stroke-width:1.5;filter:url(#lm-sh2)}
.lm-ovkey{display:flex;flex-wrap:wrap;gap:8px 16px;font-size:12.5px;color:var(--mute);margin:8px 0 0;align-items:center}
.lm-ovkey svg{vertical-align:middle;margin-right:6px}.lm-ovkey .lm-sl,.lm-ovkey .lm-cnt{font-size:11px}
.lm-n a:hover .lm-box,.lm-n a:focus .lm-box{stroke:var(--sc);filter:url(#lm-sh2)}.lm-n a{text-decoration:none}
.lm-n.ghost .lm-box{stroke:var(--sc);stroke-opacity:.7;stroke-dasharray:4 3;fill:var(--card2);filter:none}.lm-n.ghost .lm-bar{fill-opacity:.5}
.lm-n.tgt .lm-box{stroke:var(--sc);stroke-width:2}
.lm-n.done .lm-box{fill:color-mix(in srgb,var(--sc) 14%,var(--card))}
.lm-n.cur .lm-box{stroke:var(--hl);stroke-width:2.5;fill:color-mix(in srgb,var(--hl) 16%,var(--card))}.lm-n{transition:opacity .25s}.lm-n.todo{opacity:.3}
.lm-pb circle{fill:var(--card);stroke:var(--acc);stroke-width:1.2}.lm-pb path{fill:none;stroke:var(--acc);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.lm-pb:hover circle,.lm-pb:focus circle{fill:var(--acc)}.lm-pb:hover path,.lm-pb:focus path{stroke:var(--bg)}.lm-pb:focus{outline:none}
.lm-cap{color:var(--mute);font-size:13px;margin:8px 0 0}
.lm-fly{position:absolute;pointer-events:none;transform-origin:0 0;border:1.5px solid var(--sc);border-radius:12px;background:color-mix(in srgb,var(--sc) 5%,transparent);box-sizing:border-box;z-index:3}
.lm-list{display:none}.lm-list h4{margin:16px 0 8px;font-size:12px;color:var(--mute);font-weight:600;letter-spacing:.05em}
.lm-cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px}
.lm-c{display:flex;flex-direction:column;gap:4px;padding:10px 10px 10px 13px;border:1px solid var(--cardln);border-radius:10px;background:var(--card);color:var(--ink);cursor:pointer;font-size:12px;line-height:1.35;transition:opacity .2s,box-shadow .2s;min-width:0;
 box-shadow:inset 3px 0 0 var(--sc),0 1px 3px color-mix(in srgb,var(--shc) calc(var(--sho)*100%),transparent)}
.lm-c b{font-size:13.5px;font-weight:600;overflow-wrap:anywhere}.lm-c .lm-cm{color:var(--mute);font-variant-numeric:tabular-nums}.lm-c .lm-cw{color:var(--mute);display:none}.lm-c.me .lm-cw{display:block}
.lm-c.me,.lm-c:focus-visible{outline:none;border-color:var(--sc);box-shadow:inset 3px 0 0 var(--sc),0 4px 14px color-mix(in srgb,var(--shc) calc(var(--sho2)*100%),transparent)}
.lm-c .lm-cb{color:var(--mute)}
.lm-strip{display:flex;gap:3px;margin:2px 0 1px;font-variant-numeric:tabular-nums}.lm-strip>span{display:flex;flex-direction:column;align-items:center;gap:1px}
.lm-strip em{font-style:normal;font-size:11px;line-height:12px;color:var(--mute);opacity:.8}
.lm-strip i{font-style:normal;font-weight:650;font-size:11px;width:22px;height:15px;line-height:15px;text-align:center;border-radius:8px;color:var(--sc);background:color-mix(in srgb,var(--sc) 15%,transparent)}
.lm-strip i.z{background:var(--pill0)}
.lm-c .lm-open{display:none;margin-top:4px;align-self:flex-start}.lm-c.me .lm-open{display:block}
.lm-fp{display:flex;flex-wrap:wrap;gap:6px;align-items:center;font-size:12.5px;margin:4px 0 8px}.lm-fp>span:first-child{color:var(--mute)}
.lm-fp .ch{padding:2px 10px 2px 8px;border:1px solid var(--cardln);border-radius:999px;background:var(--card);box-shadow:0 1px 2px rgba(0,0,0,.05)}.lm-fp .ch::before{content:"";display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--sc);margin-right:6px;vertical-align:1px}
.lm-fp .ch b{font-weight:600;font-variant-numeric:tabular-nums}
.lm-note{font-size:12.5px;color:var(--mute);margin:4px 0}
.lm-pl-list{padding:0;margin:4px 0;list-style:none}
.lm-pl-list li{display:flex;gap:8px;align-items:baseline;margin:4px 0;padding:4px 0 4px 10px;border-left:3px solid var(--sc);border-radius:2px}
.lm-pl-list li a{flex:1;min-width:0}.lm-pl-list li .mm{color:var(--mute);font-size:12.5px;white-space:nowrap}
.lm-pl-list li .lm-pbt{margin-left:auto;font:inherit;font-size:12px;padding:1px 8px;border:1px solid var(--cardln2);border-radius:999px;background:none;color:var(--acc);cursor:pointer;white-space:nowrap}
.lm-path{margin-top:16px}.lm-path ol{padding-left:0;list-style:none;counter-reset:s;margin:8px 0}
.lm-path ol li{counter-increment:s;display:flex;gap:8px;align-items:baseline;margin:2px 0;padding:5px 8px;border-left:3px solid var(--sc);border-radius:2px 8px 8px 2px;transition:background .25s,opacity .25s}
.lm-path ol li::before{content:counter(s);color:var(--mute);font-size:12.5px;min-width:1.4em;text-align:right;font-variant-numeric:tabular-nums}
.lm-path ol li .tx{flex:1;display:flex;gap:8px;align-items:baseline;min-width:0}.lm-path ol li .tx a{min-width:0}
.lm-path ol li .mm{color:var(--mute);font-size:12.5px;margin-left:auto;white-space:nowrap;font-variant-numeric:tabular-nums}
.lm-path ol li.done{background:color-mix(in srgb,var(--sc) 9%,transparent)}
.lm-path ol li.cur{background:color-mix(in srgb,var(--hl) 14%,transparent);box-shadow:inset 0 0 0 1.5px var(--hl)}.lm-path ol li.todo{opacity:.45}
.lm-path ol li.tg{font-weight:600}
.lm-sum{font-size:14px;margin:4px 0}.lm-ctl{display:flex;flex-wrap:wrap;gap:8px;margin:8px 0}
@media (max-width:899px){.lm.ov .lm-map{display:none}.lm.ov .lm-list{display:block}.lm-ovkey .ln{display:none}}
@media (max-width:640px){.lm .lm-map{display:none}.lm .lm-list{display:block}.lm-qw{max-width:none}
 .lm-path ol li .tx{display:block}.lm-path ol li .mm{display:block;margin:1px 0 0;white-space:normal}}
.lm:not(.ov) #lm-ovcap,.lm:not(.ov) #lm-ovl{display:none}
@media (prefers-reduced-motion:reduce){.lm *{transition:none!important}}
"""

JS = r"""
(()=>{const D=JSON.parse(document.getElementById('lm-data').textContent),P=D.P,T=D.T,V=D.V;
const $=s=>document.querySelector(s),root=$('#lm'),view=$('#lm-view'),plist=$('#lm-plist'),path=$('#lm-path'),list=$('.lm-list');
const RM=matchMedia('(prefers-reduced-motion: reduce)');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const byId={};P.forEach((p,i)=>byId[p.id]=i);
const mins=p=>p.m==null?'?':p.m;
const settle=()=>root.getAnimations({subtree:true}).forEach(a=>{try{a.finish()}catch(e){a.cancel()}});
const NS='http://www.w3.org/2000/svg',EASE='cubic-bezier(.2,.7,.2,1)';
const accent=(x,y,h,rx)=>{const w=3,dy=rx-Math.sqrt(rx*rx-(rx-w)*(rx-w));return `<path class="lm-bar" d="M${x+w} ${y+dy}A${rx} ${rx} 0 0 0 ${x} ${y+rx}V${y+h-rx}A${rx} ${rx} 0 0 0 ${x+w} ${y+h-dy}Z"/>`};
const drawKF=L=>[{strokeDasharray:`${L} ${L}`,strokeDashoffset:L},{strokeDasharray:`${L} ${L}`,strokeDashoffset:0}];
// keyframes that carry a dot along a path, from its start (the page or topic built on) to its end
function along(e,fade){const L=e.getTotalLength(),n=Math.max(8,Math.round(L/14)),kf=[];
 for(let i=0;i<=n;i++){const q=e.getPointAtLength(L*i/n);kf.push({transform:`translate(${q.x.toFixed(1)}px,${q.y.toFixed(1)}px)`,opacity:fade&&(i===0||i===n)?0:1})}return kf}
function dot(g,sc,r){const c=document.createElementNS(NS,'circle');c.setAttribute('r',r);c.setAttribute('class','lm-dot s'+sc);g.appendChild(c);return c}
function nodeSVG(i,x,y,cls){const p=P[i],w=110,h=p.h;let s=`<g class="lm-n s${T[p.c].s} ${cls}" data-i="${i}"><a href="${esc(p.u)}"><title>${esc(p.t)} (${esc(T[p.c].n)}), ${mins(p)} min</title>`+
 `<rect class="lm-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="8"/>`+accent(x,y,h,8);
 p.l.forEach((ln,j)=>s+=`<text class="lm-pl" x="${x+10}" y="${y+18+15*j}">${esc(ln)}</text>`);
 s+=`<text class="lm-m" x="${x+10}" y="${y+h-7}">${mins(p)} min</text></a>`;
 s+=`<g class="lm-pb" role="button" tabindex="0" data-p="${i}" aria-label="Path to ${esc(p.t)}"><title>Path to this page</title><circle cx="${x+w-11}" cy="${y+h-11}" r="8"/><path d="M${x+w-15} ${y+h-8}l3-3 2 2 3-4m-2 0h2v2"/></g></g>`;return s}
function svgOf(v,cls,heads){let s=`<svg class="lm-svg" width="${v.w}" height="${v.h}" viewBox="0 0 ${v.w} ${v.h}"><defs>${D.DEFS}</defs>`;
 v.cols.forEach((x,k)=>s+=`<text class="lm-col" x="${x+55}" y="14" text-anchor="middle">${heads[k]}</text>`);
 s+='<g>'+v.e.map(e=>`<path class="lm-e" data-a="${e[0]}" data-b="${e[1]}" d="${e[2]}" stroke-width="1.3" marker-end="url(#lm-ar)"/>`).join('')+'</g>';
 v.n.forEach(n=>s+=nodeSVG(n[0],n[1],n[2],(n[3]?'ghost ':'')+(cls[n[0]]||'')));
 return s+'<defs><marker id="lm-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" class="lm-arh"/></marker></defs></svg>'}
const pli=(i,extra)=>{const p=P[i];return `<li class="s${T[p.c].s}"><a href="${esc(p.u)}">${esc(p.t)}</a><span class="mm">${mins(p)} min</span>${extra||''}<button class="lm-pbt" data-p="${i}" aria-label="Path to ${esc(p.t)}">path</button></li>`};
let step=-1,timer=null,cur=null,ptok=0,from=null,fk=null;const DOTS=[];
function stopPlay(){if(timer){clearInterval(timer);timer=null}const b=$('#lm-play');if(b)b.textContent='Play'}
// focus on a topic: it, the topics its pages build on and the topics building on it stay lit, the rest dims
// while focused, the lines into the topic draw in and dots run along them from the topics it builds on (stops on blur)
function dotsOff(){DOTS.forEach(a=>a.cancel());DOTS.length=0;root.querySelectorAll('.lm-dots').forEach(g=>g.textContent='')}
function dotsOn(k){const svg=$('#lm-ov');if(RM.matches||!svg||!svg.getBoundingClientRect().width)return;const g=svg.querySelector('.lm-dots');
 svg.querySelectorAll(`.lm-se[data-b="${k}"]`).forEach(e=>{const L=e.getTotalLength(),kf=along(e,true),dur=Math.max(1100,L*11),nd=L>140?3:2,sc=T[+e.dataset.a].s;
  DOTS.push(e.animate(drawKF(L),{duration:380,easing:EASE}));
  for(let j=0;j<nd;j++)DOTS.push(dot(g,sc,3.5).animate(kf,{duration:dur,delay:300+j*dur/nd,iterations:Infinity,fill:'backwards'}))})}
function focusT(k){if(k===fk&&(k==null||root.classList.contains('foc')))return;fk=k;dotsOff();root.classList.toggle('foc',k!=null);const t=k==null?null:T[k];
 root.querySelectorAll('.lm-t[data-k]').forEach(x=>{const j=+x.dataset.k;x.classList.toggle('me',j===k);x.classList.toggle('up',!!t&&t.up.includes(j));x.classList.toggle('dn',!!t&&t.dn.includes(j))});
 root.querySelectorAll('#lm-ov .lm-se,#lm-ov .lm-we,#lm-ov .lm-el').forEach(e=>e.classList.toggle('on',k!=null&&(+e.dataset.a===k||+e.dataset.b===k)));
 root.querySelectorAll('#lm-ov .lm-wkp').forEach(e=>e.classList.toggle('on',+e.dataset.k===k));if(k!=null)dotsOn(k)}
function showOverview(){stopPlay();dotsOff();settle();cur=null;fk=null;view.innerHTML=D.OV;root.classList.add('ov');focusT(null);plist.innerHTML='';path.hidden=true;
 $('#lm-head').innerHTML='<b>All topics</b><span>Hover or tap a topic to see what it builds on; click to open its pages</span>'}
// open a view by growing the clicked card into it, then reveal its pages stage by stage (only after a click)
function grow(rs){const box=[view,list].find(e=>e.offsetParent!==null);if(!from||RM.matches||!box){from=null;return}
 const [r,sc]=from;from=null;let c=box.getBoundingClientRect();if(c.top<0){scrollBy(0,c.top-12);c=box.getBoundingClientRect()}
 const t=Math.max(0,Math.min(r.top-c.top,c.height-r.height)),l=Math.max(0,r.left-c.left),rt=Math.max(0,c.width-l-r.width),b=Math.max(0,c.height-t-r.height);
 box.animate([{clipPath:`inset(${t}px ${rt}px ${b}px ${l}px round 10px)`},{clipPath:'inset(0px 0px 0px 0px round 12px)'}],{duration:280,easing:EASE});
 // the card's outline grows into the frame of the view (FLIP), then fades
 const R=root.getBoundingClientRect(),f=document.createElement('div');f.className='lm-fly s'+sc;
 Object.assign(f.style,{left:c.left-R.left+'px',top:c.top-R.top+'px',width:c.width+'px',height:Math.min(c.height,innerHeight)+'px'});root.appendChild(f);
 const fa=f.animate([{transform:`translate(${r.left-c.left}px,${r.top-c.top}px) scale(${r.width/c.width},${r.height/Math.min(c.height,innerHeight)})`,opacity:1},{transform:'none',opacity:.9,offset:.75},{transform:'none',opacity:0}],{duration:360,easing:EASE});
 fa.finished.then(()=>f.remove(),()=>f.remove());
 // then the pages appear stage by stage, left to right
 rs.forEach(([el,k])=>el.animate([{opacity:0,transform:'translateX(-8px)'},{opacity:1,transform:'none'}],{duration:180,delay:180+65*Math.min(k,4),easing:EASE,fill:'backwards'}))}
function showTopic(k){stopPlay();dotsOff();settle();cur=null;root.classList.remove('ov');focusT(null);const t=T[k],v=V.topic[k],heads=v.cols.map((_,j)=>v.before?(j?'Stage '+j:'From other topics'):'Stage '+(j+1));
 path.hidden=true;
 $('#lm-head').innerHTML=`<button class="lm-btn" id="lm-back">All topics</button><b><a href="${esc(P[t.r].u)}">${esc(P[t.r].t)}</a></b><span>${t.p.length} pages, ${t.m} min core reading</span>`;
 view.innerHTML=`<div class="lm-scroll">${svgOf(v,{},heads)}</div><p class="lm-cap">Each column needs only the columns to its left. ${v.before?'Dashed pages belong to other topics. ':''}Click a page to read it, or its round button for its full path.</p>`;
 const cols=heads.map(()=>[]);v.n.forEach(n=>cols[v.lay[n[0]]].push(n));
 plist.innerHTML=cols.map((c,j)=>c.length?`<div data-j="${j}"><h4>${heads[j]}</h4><ul class="lm-pl-list">${c.sort((a,b)=>a[2]-b[2]).map(n=>pli(n[0],n[3]?`<span class="mm">${esc(T[P[n[0]].c].n)}</span>`:'')).join('')}</ul></div>`:'').join('');
 const rs=[...view.querySelectorAll('.lm-n')].map(g=>[g,v.lay[g.dataset.i]]).concat([...view.querySelectorAll('.lm-e')].map(e=>[e,v.lay[e.dataset.b]]),[...view.querySelectorAll('.lm-col')].map((e,j)=>[e,j]),[...plist.querySelectorAll('[data-j]')].map(e=>[e,+e.dataset.j]));
 grow(rs)}
function paint(fwd){if(!cur)return;const o=cur.order,rk={},tok=++ptok;o.forEach((j,r)=>rk[j]=r);settle();
 const setN=withCur=>{const cl=(el,r)=>{el.classList.toggle('done',step>=0&&r<step);el.classList.toggle('cur',withCur&&step>=0&&r===step);el.classList.toggle('todo',step>=0&&(r>step||(!withCur&&r===step)))};
  view.querySelectorAll('.lm-n').forEach(g=>cl(g,rk[+g.dataset.i]));path.querySelectorAll('ol li').forEach((li,r)=>cl(li,r));
  view.querySelectorAll('.lm-e.drw').forEach(e=>e.classList.remove('drw'))};
 const inc=[];view.querySelectorAll('.lm-e').forEach(e=>{const rb=rk[+e.dataset.b],into=step>=0&&rb===step;e.classList.toggle('on',into);e.classList.toggle('off',step>=0&&rb>step);if(into)inc.push(e)});
 if(fwd&&inc.length&&!RM.matches){setN(false);const g=view.querySelector('.lm-svg>g');
  const as=inc.map(e=>{e.classList.add('drw');const L=e.getTotalLength(),o={duration:380,easing:'cubic-bezier(.4,0,.2,1)'},d=dot(g,T[P[+e.dataset.a].c].s,4),da=d.animate(along(e,false),o);
   da.finished.then(()=>d.remove(),()=>d.remove());return e.animate(drawKF(L),o)});
  Promise.all(as.map(a=>a.finished)).then(()=>{if(tok===ptok)setN(true)},()=>{})}else setN(true);
 $('#lm-prev').disabled=step<=0;$('#lm-next').disabled=step>=o.length-1;
 $('#lm-pos').textContent=step<0?'':`${step+1} of ${o.length}: ${P[o[step]].t}`}
function showPath(i){stopPlay();dotsOff();settle();root.classList.remove('ov');focusT(null);const p=P[i],v=V.path[i],order=v?v.order:[i];cur={i,order};step=-1;
 $('#lm-head').innerHTML=`<button class="lm-btn" id="lm-back">All topics</button><button class="lm-btn" data-t="${p.c}" id="lm-totopic">${esc(T[p.c].n)}</button><b>Path to ${esc(p.t)}</b>`;
 if(v){const nc=v.cols.length,heads=v.cols.map((_,j)=>'Stage '+(j+1)),cls={};cls[i]='tgt';
  view.innerHTML=`<div class="lm-scroll">${svgOf(v,cls,heads)}</div><p class="lm-cap">Everything this page needs, directly or through another page, in ${nc} stages. Thick border: the page you picked.</p>`}
 else view.innerHTML='<p class="lm-cap">This page has no prerequisites in the knowledge base: start here.</p>';
 plist.innerHTML='';
 const before=order.slice(0,-1),sm=a=>a.reduce((s,j)=>s+(P[j].m||0),0),sx=a=>a.reduce((s,j)=>s+(P[j].x||0),0),tot=sm(order);
 const fp=[];order.forEach(j=>{const c=P[j].c;let f=fp.find(x=>x.c===c);if(!f)fp.push(f={c,m:0});f.m+=P[j].m||0});
 path.hidden=false;
 path.innerHTML=`<p class="lm-sum">${before.length?`<b>${before.length} page${before.length>1?'s':''} first</b>, ${sm(before)} min of core reading; with the page itself <b>${tot} min</b> (about ${(tot/60).toFixed(1)} h), plus ${sx(order)} min in closed details.`:'No prerequisites: read it directly.'}</p>`+
 `<div class="lm-fp" id="lm-fp"><span>Topics on the way:</span>${fp.map(f=>`<span class="ch s${T[f.c].s}" data-c="${f.c}">${esc(T[f.c].n)} <b>${f.m} min</b></span>`).join('')}</div>`+
 (before.length?`<div class="lm-ctl"><button class="lm-btn" id="lm-prev">Previous</button><button class="lm-btn" id="lm-next">Step</button>${RM.matches?'':'<button class="lm-btn" id="lm-play">Play</button>'}<button class="lm-btn" id="lm-all">Show all</button><span id="lm-pos" class="lm-cap" style="margin:0;align-self:center"></span></div>`:'')+
 `<ol id="lm-order">${order.map(j=>`<li class="s${T[P[j].c].s}${j===i?' tg':''}" data-i="${j}"><span class="tx"><a href="${esc(P[j].u)}">${esc(P[j].t)}</a><span class="mm">${esc(T[P[j].c].n)}, ${mins(P[j])} min</span></span></li>`).join('')}</ol>`;
 if(before.length)paint(false)}
function route(){const h=decodeURIComponent(location.hash.slice(1));let m;
 if((m=h.match(/^path=([0-9a-f]{32})$/))&&m[1]in byId)showPath(byId[m[1]]);
 else if((m=h.match(/^topic=([a-z0-9_]+)$/))&&T.some(t=>t.slug===m[1]))showTopic(T.findIndex(t=>t.slug===m[1]));
 else if(h.startsWith('path=')||h.startsWith('topic=')||cur||!root.classList.contains('ov'))showOverview()}
const go=hash=>{if(location.hash.slice(1)===hash)route();else location.hash=hash};
root.addEventListener('click',e=>{
 const c=e.target.closest('.lm-c');if(c&&!e.target.closest('.lm-open')){e.preventDefault();const k=+c.dataset.k;if(c.classList.contains('me')){from=[c.getBoundingClientRect(),T[k].s];go('topic='+T[k].slug)}else focusT(k);return}
 const t=e.target.closest('[data-t],[data-p],#lm-back,#lm-prev,#lm-next,#lm-play,#lm-all');if(!t){if(root.classList.contains('foc')&&!e.target.closest('#lm-ov'))focusT(null);return}
 if(t.id==='lm-back'){history.pushState('',document.title,location.pathname+location.search);showOverview();return}
 if(t.id==='lm-next'){stopPlay();step=Math.min(step+1,cur.order.length-1);paint(true);return}
 if(t.id==='lm-prev'){stopPlay();step=Math.max(step-1,0);paint(false);return}
 if(t.id==='lm-all'){stopPlay();step=-1;paint(false);return}
 if(t.id==='lm-play'){if(timer){stopPlay();return}if(step>=cur.order.length-1)step=-1;t.textContent='Pause';
  const adv=()=>{if(document.hidden)return;step++;paint(true);if(step>=cur.order.length-1)stopPlay()};adv();timer=setInterval(adv,1300);return}
 e.preventDefault();
 if(t.dataset.p!=null)go('path='+P[+t.dataset.p].id);
 else{const card=t.closest('.lm-t')||t.closest('.lm-c');if(card)from=[(card.querySelector('.lm-box')||card).getBoundingClientRect(),T[+t.dataset.t].s];go('topic='+T[+t.dataset.t].slug)}});
root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=button]')){e.preventDefault();
  if(e.target.matches('.lm-c')){if(!e.target.classList.contains('me'))focusT(+e.target.dataset.k);else{from=[e.target.getBoundingClientRect(),T[+e.target.dataset.k].s];go('topic='+T[+e.target.dataset.k].slug)}}
  else e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}))}
 else if(e.key==='Escape')focusT(null)});
['mouseover','focusin'].forEach(ev=>root.addEventListener(ev,e=>{const g=e.target.closest('#lm-ov .lm-t');if(g)focusT(+g.dataset.k);else if(ev==='focusin'&&e.target.matches('.lm-c:focus-visible'))focusT(+e.target.dataset.k)}));
['mouseout','focusout'].forEach(ev=>root.addEventListener(ev,e=>{const g=e.target.closest('#lm-ov .lm-t');if(g&&!(e.relatedTarget&&g.contains(e.relatedTarget)))focusT(null)}));
// search over titles
const q=$('#lm-q'),sug=$('#lm-sug');let hits=[],hi=0;
function drawSug(){sug.hidden=!hits.length;sug.innerHTML=hits.map((i,r)=>`<li><button class="${r===hi?'on':''}" data-p="${i}">${esc(P[i].t)} <span class="lm-m" style="color:var(--mute)">${esc(T[P[i].c].n)}</span></button></li>`).join('')}
q.addEventListener('input',()=>{const w=q.value.toLowerCase().split(/\s+/).filter(Boolean);hi=0;
 hits=w.length?P.map((p,i)=>i).filter(i=>{const s=(P[i].t+' '+T[P[i].c].n).toLowerCase();return w.every(x=>s.includes(x))}).sort((a,b)=>P[a].t.length-P[b].t.length).slice(0,8):[];drawSug()});
q.addEventListener('keydown',e=>{if(!hits.length)return;if(e.key==='ArrowDown'){hi=(hi+1)%hits.length;drawSug();e.preventDefault()}
 else if(e.key==='ArrowUp'){hi=(hi+hits.length-1)%hits.length;drawSug();e.preventDefault()}
 else if(e.key==='Enter'){e.preventDefault();pick(hits[hi])}else if(e.key==='Escape'){hits=[];drawSug()}});
const pick=i=>{hits=[];drawSug();q.value='';go('path='+P[i].id)};
sug.addEventListener('mousedown',e=>{const b=e.target.closest('[data-p]');if(b){e.preventDefault();e.stopPropagation();pick(+b.dataset.p)}});
document.addEventListener('click',e=>{if(!e.target.closest('.lm-qw')){hits=[];drawSug()}});
window.addEventListener('hashchange',route);
document.addEventListener('visibilitychange',()=>{if(document.hidden)stopPlay()});
// once per page load (Khalid's explicit choice for the home page): the layers rise in top to bottom, the strong lines
// draw from the upper topic to the lower, then the start-anytime band fades in; about 1 s, then still. Any pointer or
// key input finishes it at once; reduced motion skips it.
function reveal(){if(RM.matches||document.hidden||location.hash)return;const A=[],ST=110,FD=620;
 const rise=[{opacity:0,transform:'translateY(8px)'},{opacity:1,transform:'none'}],fade=[{opacity:0},{opacity:1}];
 const svg=$('#lm-ov');
 if(svg&&svg.getBoundingClientRect().width){
  svg.querySelectorAll('.lm-bd,.lm-t').forEach(g=>{const f=g.dataset.l==='f'||g.dataset.free==='1';
   A.push(g.animate(f?fade:rise,{duration:f?340:320,delay:f?FD:ST*+g.dataset.l,easing:EASE,fill:'backwards'}))});
  svg.querySelectorAll('.lm-se').forEach(e=>{const la=+svg.querySelector(`.lm-t[data-k="${e.dataset.a}"]`).dataset.l;
   A.push(e.animate(drawKF(e.getTotalLength()),{duration:380,delay:ST*(la+1)+170,easing:'cubic-bezier(.4,0,.2,1)',fill:'backwards'}))});
  const cap=$('#lm-ovcap');if(cap)A.push(cap.animate(fade,{duration:340,delay:FD,fill:'backwards'}))}
 else{const ov=$('#lm-ovl');if(ov&&ov.offsetParent!==null){let l=0;[...ov.children].forEach(el=>{if(el.matches('h4'))l++;
   A.push(el.animate(rise,{duration:300,delay:Math.min(l-1,4)*ST,easing:EASE,fill:'backwards'}))})}}
 if(!A.length)return;const stop=()=>{A.forEach(a=>{try{a.finish()}catch(e){}});['pointerdown','keydown','wheel','mouseover'].forEach(ev=>root.removeEventListener(ev,stop,true))};
 ['pointerdown','keydown','wheel','mouseover'].forEach(ev=>root.addEventListener(ev,stop,true));Promise.all(A.map(a=>a.finished)).then(stop,()=>{})}
D.OV=view.innerHTML;route();reveal()})();
"""


def section(url, kb=None):
    """the learning map block for the home page"""
    P, T, views, ov_svg, ov_list, note, _ = build(url, kb)
    data = {"P": P, "T": T, "V": {"topic": views["topic"], "path": views["path"]}, "DEFS": DEFS}
    js_data = json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    leg = "".join(f'<span><i style="background:var(--s{k})"></i>{html.escape(s)}</span>' for k, s in enumerate(SECTIONS))
    npages, nedges = len(P), sum(len(p["pre"]) for p in P)
    nst = len(T[0]["st"])
    cells = "".join(f'<text class="lm-sl" x="{10 + g * 21}" y="9" text-anchor="middle">{g + 1}</text>'
                    f'<rect class="lm-cell{" z" if not c else ""}" x="{1 + g * 21}" y="12" width="18" height="{SH}" rx="{SH // 2}"/>'
                    + (f'<text class="lm-cnt" x="{10 + g * 21}" y="23" text-anchor="middle">{c}</text>' if c else "")
                    for g, c in enumerate([3, 4, 1] + [0] * (nst - 3)))
    share = f"{round(STRONG * 100)}%" if abs(STRONG - 1 / 3) > 1e-9 else "a third"
    key = (f'<div class="lm-ovkey"><span><svg class="s0" width="{2 + nst * 21}" height="28" aria-hidden="true">{cells}</svg>'
           f'pages at stages 1 to {nst} (stage: a page\'s longest chain of prerequisites)</span>'
           '<span class="ln"><svg width="34" height="14" aria-hidden="true"><defs><linearGradient id="lm-gk" gradientUnits="userSpaceOnUse" x1="3" y1="0" x2="31" y2="0"><stop offset="0" class="lm-st s0"/>'
           '<stop offset="1" class="lm-st s1"/></linearGradient></defs><path class="lm-se" d="M3 7H31" stroke="url(#lm-gk)" stroke-width="5"/></svg>'
           f'at least {share} of the lower topic\'s pages build on the upper one; thicker, more of them</span>'
           '<span class="ln"><svg width="34" height="14" aria-hidden="true"><path class="lm-we" style="opacity:.9" d="M2 7H32"/></svg>'
           'a few pages (under that share), shown when a topic is focused</span></div>')
    return f"""<section id="lm" class="lm ov" data-pagefind-ignore>
<h2>Learning map</h2>
<p class="lm-sub">The order to study in, from each page's strict prerequisites ({npages} pages, {nedges} links). A page's stage is its longest chain of prerequisites: stage 1 needs nothing, and every page needs only pages in earlier stages.</p>
<div class="lm-bar0"><div class="lm-qw"><input id="lm-q" type="search" placeholder="Path to a page: type a title, e.g. FlashAttention" aria-label="Path to a page" autocomplete="off"><ul id="lm-sug" class="lm-sug" hidden></ul></div></div>
<div class="lm-leg">{leg}</div>
<div class="lm-head" id="lm-head"><b>All topics</b><span>Hover or tap a topic to see what it builds on; click to open its pages</span></div>
<div class="lm-map" id="lm-view"><div class="lm-scroll">{ov_svg}</div></div>
<div class="lm-list"><div id="lm-ovl">{ov_list}</div><div id="lm-plist"></div></div>
<div id="lm-ovcap">{key}<p class="lm-cap">A stage counts a page's whole chain of prerequisites across all topics, so a topic can have pages at stage 1 even when it sits in a later layer. Topics in study order, top to bottom: a topic sits below another when at least {share} of its pages build on that topic's pages (directly or through other pages), and a solid line joins them, thicker when more of its pages do; topics with no such link either way are in the last band and can be read at any time. Hover or tap a topic to light up what it builds on and what builds on it, with dotted lines (and the list "Some pages also use") where only a few of its pages do; click it for its pages in order.{html.escape(note)}</p></div>
<div class="lm-path" id="lm-path" hidden></div>
<script type="application/json" id="lm-data">{js_data}</script>
<script>{JS}</script>
</section>"""


if __name__ == "__main__":
    if sys.argv[1:2] == ["check"]:
        e, w, _ = check()
        sys.exit(1 if e else 0)
    print(__doc__)
