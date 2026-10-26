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
  overview    = one bar per topic on the shared stage axis, from the stage of its earliest page to the stage of its
                latest page, with the number of its pages in each stage and a ring on the root page's stage when that
                is later than the earliest page; rows sorted by start stage, then mean page stage, then end stage. Hovering or
                focusing a bar lights up the topics its pages directly need (no topic-level arrows).
  topic and path views: pages in columns by stage;
  order       = barycenter sweeps over layers with dummy nodes for long edges, keeping the order with fewest crossings
  y           = repeated least-squares pulls toward neighbours under order and spacing constraints (isotonic fit)
The overview is an inline SVG; topic views and "path to" views are a small JSON of coordinates that the page's
script draws (it never computes a layout).
"""
import html, json, re, sys
from collections import defaultdict
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


def _layout(nodes, edges, layer, height, gap=14, iters=28):
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
                    g = 6 if (kind[a] == "d" or kind[v] == "d") else gap
                    acc += h[a] / 2 + g + h[v] / 2
                s.append(acc)
            fit = isotonic([want[i] - s[i] for i in range(len(row))], wts)
            for i, v in enumerate(row):
                y[v] = fit[i] + s[i]
    top = min(y[v] - h[v] / 2 for v in y)
    for v in y:
        y[v] -= top
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


def overview(P, T):
    """topics as bars on the page-stage axis -> inline SVG (and the phone list)"""
    nT = len(T)
    ncol = max(p["g"] for p in P) + 1
    span = {k: (min(P[i]["g"] for i in T[k]["p"]), max(P[i]["g"] for i in T[k]["p"])) for k in range(nT)}
    per = {k: defaultdict(int) for k in range(nT)}
    for k in range(nT):
        for i in T[k]["p"]:
            per[k][P[i]["g"]] += 1
    deps = {k: sorted({P[a]["c"] for i in T[k]["p"] for a in P[i]["pre"]} - {k}) for k in range(nT)}
    mean = {k: sum(P[i]["g"] for i in T[k]["p"]) / len(T[k]["p"]) for k in range(nT)}
    rows = sorted(range(nT), key=lambda k: (span[k][0], round(mean[k], 6), span[k][1], T[k]["s"], k))
    meta = {k: f'{len(T[k]["p"])} pages' for k in range(nT)}
    LW = round(max(text_w(T[k]["n"], 12.5, True) for k in range(nT)) + 10
               + max(text_w(meta[k], 11) for k in range(nT)) + 22)
    cw = (W - LW) / ncol
    cx = [LW + l * cw for l in range(ncol)]
    RH, BH, top = 30, 20, TOP + 2
    Hs = top + RH * nT + 6
    o = [f'<svg id="lm-ov" class="lm-svg" width="{W}" height="{Hs}" viewBox="0 0 {W} {Hs}" '
         f'role="group" aria-label="Topics as bars from the stage of their first page to the stage of their last page">']
    for l in range(ncol):
        o.append(f'<rect class="lm-band{l % 2}" x="{cx[l]:.1f}" y="{TOP - 6}" width="{cw:.1f}" height="{Hs - TOP + 6}"/>'
                 f'<text class="lm-col" x="{cx[l] + cw / 2:.1f}" y="14" text-anchor="middle">Stage {l + 1}</text>')
    for r, k in enumerate(rows):
        t, (a, b) = T[k], span[k]
        y = top + r * RH
        rs = P[t["r"]]["g"]
        dn = ", ".join(T[d]["n"] for d in deps[k]) or "no other topic"
        tip = (f'{t["n"]}: {len(t["p"])} pages, {t["m"]} min core reading; stages {a + 1} to {b + 1}'
               + (f', root page at stage {rs + 1}' if rs != a else '') + f'. Its pages build on {dn}. Click to open its pages.')
        o.append(f'<g class="lm-t s{t["s"]}" data-t="{k}" data-a="{a}" data-b="{b}" data-r="{rs}" data-dep="{" ".join(map(str, deps[k]))}" '
                 f'role="button" tabindex="0" aria-label="Open {html.escape(t["n"])}: {len(t["p"])} pages, stages {a + 1} to {b + 1}">'
                 f'<title>{html.escape(tip)}</title>'
                 f'<rect class="lm-box" x="0" y="{y}" width="{W}" height="{RH}" rx="4"/>'
                 f'<text class="lm-tl" x="8" y="{y + RH / 2 + 4.5:.1f}">{html.escape(t["n"])}</text>'
                 f'<text class="lm-m" x="{LW - 10}" y="{y + RH / 2 + 4:.1f}" text-anchor="end">{meta[k]}</text>'
                 f'<rect class="lm-span" x="{cx[a] + 3:.1f}" y="{y + (RH - BH) / 2}" width="{cx[b] + cw - cx[a] - 6:.1f}" height="{BH}" rx="5"/>')
        for l in range(a, b + 1):
            n = per[k].get(l, 0)
            mx = cx[l] + cw / 2
            if l == rs and rs != a:
                o.append(f'<circle class="lm-root" cx="{mx:.1f}" cy="{y + RH / 2}" r="8.5"/>')
            if n:
                o.append(f'<text class="lm-cnt" x="{mx:.1f}" y="{y + RH / 2 + 4}" text-anchor="middle">{n}</text>')
        o.append('</g>')
    o.append('</svg>')
    # phone list: the same order, grouped by the stage a topic can start at
    lst, cur = [], None
    for k in rows:
        a, b = span[k]
        if a != cur:
            if cur is not None:
                lst.append('</div>')
            lst.append(f'<h4>Start at stage {a + 1}</h4><div class="lm-chips">')
            cur = a
        rs = P[T[k]["r"]]["g"]
        st = f"stage {a + 1}" if a == b else f"stages {a + 1} to {b + 1}"
        lst.append(f'<button class="lm-chip s{T[k]["s"]}" data-t="{k}">{html.escape(T[k]["n"])}<span>{st}, {meta[k]}'
                   + (f', root at {rs + 1}' if rs != a else '') + '</span></button>')
    lst.append('</div>')
    return "".join(o), "".join(lst), []


# ---------------------------------------------------------------- HTML
CSS = """
.lm{margin:18px 0 8px;--s0:#2f6fb5;--s1:#b8602a;--s2:#2b8a57;--s3:#8a4fb8;--s4:#1f8585;--card:#fff;--hl:#d99a00;--card2:#f6f6f4}
@media (prefers-color-scheme:dark){.lm{--s0:#6ea8e6;--s1:#e3925c;--s2:#5cc48d;--s3:#b98ce3;--s4:#4fc1c1;--card:#202020;--hl:#f2c14e;--card2:#262626}}
.lm h2{margin:0 0 2px}.lm .lm-sub{color:var(--mute);margin:0 0 10px;font-size:14px}
.lm-bar0{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;margin:0 0 10px}
.lm-qw{position:relative;flex:1 1 260px;max-width:420px}
.lm-qw input{width:100%;box-sizing:border-box;font:inherit;font-size:14px;padding:6px 10px;border:1px solid var(--line);border-radius:6px;background:var(--bg);color:var(--ink)}
.lm-sug{position:absolute;z-index:5;left:0;right:0;top:100%;margin:2px 0 0;padding:4px 0;list-style:none;background:var(--bg);border:1px solid var(--line);border-radius:6px;box-shadow:0 4px 14px rgba(0,0,0,.12)}
.lm-sug li{margin:0}.lm-sug button{display:block;width:100%;text-align:left;font:inherit;font-size:13.5px;padding:5px 10px;border:0;background:none;color:var(--ink);cursor:pointer}
.lm-sug button:hover,.lm-sug button.on{background:var(--card2)}
.lm button.lm-btn{font:inherit;font-size:13px;padding:4px 10px;border:1px solid var(--line);border-radius:6px;background:var(--card);color:var(--ink);cursor:pointer}
.lm button.lm-btn:hover{border-color:var(--acc)}.lm button.lm-btn:disabled{opacity:.45;cursor:default}
.lm-leg{display:flex;flex-wrap:wrap;gap:4px 14px;font-size:12.5px;color:var(--mute);margin:0 0 8px}
.lm-leg i{display:inline-block;width:10px;height:10px;border-radius:2px;margin-right:5px;vertical-align:-1px}
.lm-head{display:flex;flex-wrap:wrap;gap:6px 12px;align-items:baseline;margin:0 0 6px}.lm-head b{font-size:15.5px}.lm-head span{color:var(--mute);font-size:13.5px}
.lm-scroll{overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch}
.lm-svg{display:block;font-family:inherit}
.lm-col{font-size:11.5px;fill:var(--mute);font-weight:600;letter-spacing:.02em}
.lm-e{fill:none;stroke:var(--mute);stroke-opacity:.5}.lm-arh{fill:var(--mute)}
.lm-e.on{stroke:var(--ink);stroke-opacity:.95}.lm-e.off{stroke-opacity:.12}
.lm-box{fill:var(--card);stroke:var(--sc);stroke-width:1.3}.lm-bar{fill:var(--sc)}
.s0{--sc:var(--s0)}.s1{--sc:var(--s1)}.s2{--sc:var(--s2)}.s3{--sc:var(--s3)}.s4{--sc:var(--s4)}
.lm-tl{font-size:12px;fill:var(--ink);font-weight:600}.lm-pl{font-size:12px;fill:var(--ink)}.lm-m{font-size:11px;fill:var(--mute)}
.lm-t,.lm-pb{cursor:pointer}.lm-t:hover .lm-box,.lm-t:focus .lm-box{stroke-width:2.6}.lm-t:focus{outline:none}
.lm-t.dim,.lm-n.dim{opacity:.35}
#lm-ov .lm-box{fill:transparent;stroke:none}#lm-ov .lm-tl{font-size:12.5px}
#lm-ov .lm-t:hover .lm-box,#lm-ov .lm-t:focus .lm-box{fill:var(--card2);stroke:none}
.lm-band0{fill:var(--card2)}.lm-band1{fill:none}
.lm-span{fill:var(--sc);fill-opacity:.2;stroke:var(--sc);stroke-width:1.3}
.lm-cnt{font-size:11.5px;font-weight:600;fill:var(--ink)}.lm-root{fill:var(--card);stroke:var(--ink);stroke-width:1.3}
#lm-ov.hov .lm-t{opacity:.28}#lm-ov.hov .lm-t.me,#lm-ov.hov .lm-t.dep{opacity:1}
#lm-ov .lm-t.dep .lm-span{stroke-width:2.6;fill-opacity:.32}#lm-ov .lm-t.me .lm-span{stroke-width:2.6}
.lm-ovkey{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:12.5px;color:var(--mute);margin:6px 0 0}
.lm-ovkey svg{vertical-align:-4px;margin-right:5px}
.lm-n a:hover .lm-box,.lm-n a:focus .lm-box{stroke-width:2.6}.lm-n a{text-decoration:none}
.lm-n.ghost .lm-box{stroke-dasharray:4 3;fill:var(--card2)}
.lm-n.tgt .lm-box{stroke-width:3}
.lm-n.cur .lm-box{stroke:var(--hl);stroke-width:4}.lm-n.todo{opacity:.3}
.lm-pb circle{fill:var(--card);stroke:var(--acc);stroke-width:1.2}.lm-pb path{fill:none;stroke:var(--acc);stroke-width:1.6;stroke-linecap:round;stroke-linejoin:round}
.lm-pb:hover circle,.lm-pb:focus circle{fill:var(--acc)}.lm-pb:hover path,.lm-pb:focus path{stroke:var(--bg)}.lm-pb:focus{outline:none}
.lm-cap{color:var(--mute);font-size:13px;margin:6px 0 0}
.lm-list{display:none}.lm-list h4{margin:12px 0 4px;font-size:13px;color:var(--mute);font-weight:600}
.lm-chips{display:flex;flex-wrap:wrap;gap:6px}
.lm-chip{font:inherit;font-size:13.5px;text-align:left;padding:5px 10px;border:1px solid var(--sc);border-left-width:4px;border-radius:6px;background:var(--card);color:var(--ink);cursor:pointer}
.lm-chip span{display:block;font-size:11.5px;color:var(--mute)}
.lm-note{font-size:12.5px;color:var(--mute);margin:4px 0}
.lm-pl-list{padding:0;margin:4px 0;list-style:none}
.lm-pl-list li{display:flex;gap:8px;align-items:baseline;margin:3px 0;padding:3px 0 3px 8px;border-left:4px solid var(--sc)}
.lm-pl-list li a{flex:1;min-width:0}.lm-pl-list li .mm{color:var(--mute);font-size:12.5px;white-space:nowrap}
.lm-pl-list li .lm-pbt{margin-left:auto;font:inherit;font-size:12px;padding:1px 7px;border:1px solid var(--line);border-radius:5px;background:none;color:var(--acc);cursor:pointer;white-space:nowrap}
.lm-path{margin-top:12px}.lm-path ol{padding-left:0;list-style:none;counter-reset:s;margin:6px 0}
.lm-path ol li{counter-increment:s;display:flex;gap:8px;align-items:baseline;margin:2px 0;padding:3px 6px;border-left:4px solid var(--sc);border-radius:2px}
.lm-path ol li::before{content:counter(s);color:var(--mute);font-size:12.5px;min-width:1.4em;text-align:right}
.lm-path ol li .mm{color:var(--mute);font-size:12.5px;margin-left:auto;white-space:nowrap}
.lm-path ol li.cur{background:var(--card2);outline:2px solid var(--hl)}.lm-path ol li.todo{opacity:.45}
.lm-path ol li.tg{font-weight:600}
.lm-sum{font-size:14px;margin:4px 0}.lm-ctl{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
@media (max-width:640px){.lm .lm-map{display:none}.lm .lm-list{display:block}.lm-qw{max-width:none}}
"""

JS = r"""
(()=>{const D=JSON.parse(document.getElementById('lm-data').textContent),P=D.P,T=D.T,V=D.V;
const $=s=>document.querySelector(s),root=$('#lm'),view=$('#lm-view'),plist=$('#lm-plist'),path=$('#lm-path');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const byId={};P.forEach((p,i)=>byId[p.id]=i);
const mins=p=>p.m==null?'?':p.m;
function nodeSVG(i,x,y,cls){const p=P[i],w=110,h=p.h;let s=`<g class="lm-n s${T[p.c].s} ${cls}" data-i="${i}"><a href="${esc(p.u)}"><title>${esc(p.t)} (${esc(T[p.c].n)}), ${mins(p)} min</title>`+
 `<rect class="lm-box" x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/><rect class="lm-bar" x="${x}" y="${y}" width="4" height="${h}" rx="2"/>`;
 p.l.forEach((ln,j)=>s+=`<text class="lm-pl" x="${x+9}" y="${y+18+15*j}">${esc(ln)}</text>`);
 s+=`<text class="lm-m" x="${x+9}" y="${y+h-7}">${mins(p)} min</text></a>`;
 s+=`<g class="lm-pb" role="button" tabindex="0" data-p="${i}" aria-label="Path to ${esc(p.t)}"><title>Path to this page</title><circle cx="${x+w-11}" cy="${y+h-11}" r="8"/><path d="M${x+w-15} ${y+h-8}l3-3 2 2 3-4m-2 0h2v2"/></g></g>`;return s}
function svgOf(v,cls,heads){let s=`<svg class="lm-svg" width="${v.w}" height="${v.h}" viewBox="0 0 ${v.w} ${v.h}">`;
 v.cols.forEach((x,k)=>s+=`<text class="lm-col" x="${x+55}" y="14" text-anchor="middle">${heads[k]}</text>`);
 s+='<g>'+v.e.map(e=>`<path class="lm-e" data-a="${e[0]}" data-b="${e[1]}" d="${e[2]}" stroke-width="1.3" marker-end="url(#lm-ar)"/>`).join('')+'</g>';
 v.n.forEach(n=>s+=nodeSVG(n[0],n[1],n[2],(n[3]?'ghost ':'')+(cls[n[0]]||'')));
 return s+'<defs><marker id="lm-ar" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L8 4L0 8z" class="lm-arh"/></marker></defs></svg>'}
const pli=(i,extra)=>{const p=P[i];return `<li class="s${T[p.c].s}"><a href="${esc(p.u)}">${esc(p.t)}</a><span class="mm">${mins(p)} min</span>${extra||''}<button class="lm-pbt" data-p="${i}" aria-label="Path to ${esc(p.t)}">path</button></li>`};
let step=-1,timer=null,cur=null;
function stopPlay(){if(timer){clearInterval(timer);timer=null}const b=$('#lm-play');if(b)b.textContent='Play'}
function showOverview(){stopPlay();cur=null;view.innerHTML=D.OV;$('#lm-ovl').hidden=false;plist.innerHTML='';path.hidden=true;
 $('#lm-head').innerHTML='<b>All topics</b><span>Pick a topic to see its pages in order</span>'}
function showTopic(k){stopPlay();cur=null;const t=T[k],v=V.topic[k],heads=v.cols.map((_,j)=>v.before?(j?'Stage '+j:'From other topics'):'Stage '+(j+1));
 $('#lm-ovl').hidden=true;path.hidden=true;
 $('#lm-head').innerHTML=`<button class="lm-btn" id="lm-back">All topics</button><b><a href="${esc(P[t.r].u)}">${esc(P[t.r].t)}</a></b><span>${t.p.length} pages, ${t.m} min core reading</span>`;
 view.innerHTML=`<div class="lm-scroll">${svgOf(v,{},heads)}</div><p class="lm-cap">Each column needs only the columns to its left. ${v.before?'Dashed pages belong to other topics. ':''}Click a page to read it, or its round button for its full path.</p>`;
 const cols=heads.map(()=>[]);v.n.forEach(n=>cols[v.lay[n[0]]].push(n));
 plist.innerHTML=cols.map((c,j)=>c.length?`<h4>${heads[j]}</h4><ul class="lm-pl-list">${c.sort((a,b)=>a[2]-b[2]).map(n=>pli(n[0],n[3]?`<span class="mm">${esc(T[P[n[0]].c].n)}</span>`:'')).join('')}</ul>`:'').join('')}
function paint(){if(!cur)return;const o=cur.order;
 view.querySelectorAll('.lm-n').forEach(g=>{const r=o.indexOf(+g.dataset.i);g.classList.toggle('cur',step>=0&&r===step);g.classList.toggle('todo',step>=0&&r>step)});
 view.querySelectorAll('.lm-e').forEach(e=>{const on=step>=0&&+e.dataset.b===o[step];e.classList.toggle('on',on);e.classList.toggle('off',step>=0&&!on)});
 path.querySelectorAll('ol li').forEach((li,r)=>{li.classList.toggle('cur',step>=0&&r===step);li.classList.toggle('todo',step>=0&&r>step)});
 $('#lm-prev').disabled=step<=0;$('#lm-next').disabled=step>=o.length-1;
 $('#lm-pos').textContent=step<0?'':`${step+1} of ${o.length}: ${P[o[step]].t}`}
function showPath(i){stopPlay();const p=P[i],v=V.path[i],order=v?v.order:[i];cur={i,order};step=-1;
 $('#lm-ovl').hidden=true;
 $('#lm-head').innerHTML=`<button class="lm-btn" id="lm-back">All topics</button><button class="lm-btn" data-t="${p.c}" id="lm-totopic">${esc(T[p.c].n)}</button><b>Path to ${esc(p.t)}</b>`;
 if(v){const nc=v.cols.length,heads=v.cols.map((_,j)=>'Stage '+(j+1)),cls={};cls[i]='tgt';
  view.innerHTML=`<div class="lm-scroll">${svgOf(v,cls,heads)}</div><p class="lm-cap">Everything this page needs, directly or through another page, in ${nc} stages. Thick border: the page you picked.</p>`}
 else view.innerHTML='<p class="lm-cap">This page has no prerequisites in the knowledge base: start here.</p>';
 plist.innerHTML='';
 const before=order.slice(0,-1),sm=a=>a.reduce((s,j)=>s+(P[j].m||0),0),sx=a=>a.reduce((s,j)=>s+(P[j].x||0),0),tot=sm(order);
 path.hidden=false;
 path.innerHTML=`<p class="lm-sum">${before.length?`<b>${before.length} page${before.length>1?'s':''} first</b>, ${sm(before)} min of core reading; with the page itself <b>${tot} min</b> (about ${(tot/60).toFixed(1)} h), plus ${sx(order)} min in closed details.`:'No prerequisites: read it directly.'}</p>`+
 (before.length?`<div class="lm-ctl"><button class="lm-btn" id="lm-prev">Previous</button><button class="lm-btn" id="lm-next">Step</button><button class="lm-btn" id="lm-play">Play</button><button class="lm-btn" id="lm-all">Show all</button><span id="lm-pos" class="lm-cap" style="margin:0;align-self:center"></span></div>`:'')+
 `<ol id="lm-order">${order.map((j,r)=>`<li class="s${T[P[j].c].s}${j===i?' tg':''}" data-i="${j}"><a href="${esc(P[j].u)}">${esc(P[j].t)}</a><span class="mm">${esc(T[P[j].c].n)}, ${mins(P[j])} min</span></li>`).join('')}</ol>`;
 if(before.length)paint()}
function route(){const h=decodeURIComponent(location.hash.slice(1));let m;
 if((m=h.match(/^path=([0-9a-f]{32})$/))&&m[1]in byId)showPath(byId[m[1]]);
 else if((m=h.match(/^topic=([a-z0-9_]+)$/))&&T.some(t=>t.slug===m[1]))showTopic(T.findIndex(t=>t.slug===m[1]));
 else if(h.startsWith('path=')||h.startsWith('topic=')||cur)showOverview()}
const go=hash=>{if(location.hash.slice(1)===hash)route();else location.hash=hash};
root.addEventListener('click',e=>{const t=e.target.closest('[data-t],[data-p],#lm-back,#lm-prev,#lm-next,#lm-play,#lm-all');if(!t)return;
 if(t.id==='lm-back'){history.pushState('',document.title,location.pathname+location.search);showOverview();return}
 if(t.id==='lm-next'){stopPlay();step=Math.min(step+1,cur.order.length-1);paint();return}
 if(t.id==='lm-prev'){stopPlay();step=Math.max(step-1,0);paint();return}
 if(t.id==='lm-all'){stopPlay();step=-1;paint();return}
 if(t.id==='lm-play'){if(timer){stopPlay();return}if(step>=cur.order.length-1)step=-1;t.textContent='Pause';
  const adv=()=>{if(document.hidden)return;step++;paint();if(step>=cur.order.length-1)stopPlay()};adv();timer=setInterval(adv,1300);return}
 e.preventDefault();if(t.dataset.p!=null)go('path='+P[+t.dataset.p].id);else go('topic='+T[+t.dataset.t].slug)});
root.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches('[role=button]')){e.preventDefault();e.target.dispatchEvent(new MouseEvent('click',{bubbles:true}))}});
// hover or focus on a topic bar: light up the topics its pages build on
function hov(g){const ov=$('#lm-ov');if(!ov)return;const ds=g?g.dataset.dep.split(' ').filter(Boolean):[];
 ov.classList.toggle('hov',!!g);ov.querySelectorAll('.lm-t').forEach(x=>{x.classList.toggle('me',x===g);x.classList.toggle('dep',ds.includes(x.dataset.t))})}
['mouseover','focusin'].forEach(ev=>root.addEventListener(ev,e=>{const g=e.target.closest('#lm-ov .lm-t');if(g)hov(g)}));
['mouseout','focusout'].forEach(ev=>root.addEventListener(ev,e=>{const g=e.target.closest('#lm-ov .lm-t');if(g&&!(e.relatedTarget&&g.contains(e.relatedTarget)))hov(null)}));
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
D.OV=view.innerHTML;route()})();
"""


def section(url, kb=None):
    """the learning map block for the home page"""
    P, T, views, ov_svg, ov_list, _, _ = build(url, kb)
    data = {"P": P, "T": T, "V": {"topic": views["topic"], "path": views["path"]}}
    js_data = json.dumps(data, separators=(",", ":"), ensure_ascii=False).replace("</", "<\\/")
    leg = "".join(f'<span><i style="background:var(--s{k})"></i>{html.escape(s)}</span>' for k, s in enumerate(SECTIONS))
    npages, nedges = len(P), sum(len(p["pre"]) for p in P)
    key = ('<div class="lm-ovkey"><span><svg width="34" height="16" aria-hidden="true"><rect class="lm-span s0" x="1" y="2" width="32" height="12" rx="4"/>'
           '<text class="lm-cnt" x="17" y="12" text-anchor="middle">3</text></svg>pages of the topic in that stage</span>'
           '<span><svg width="18" height="18" aria-hidden="true"><circle class="lm-root" cx="9" cy="9" r="7.5"/></svg>its root page, when it comes later</span></div>')
    return f"""<section id="lm" class="lm" data-pagefind-ignore>
<h2>Learning map</h2>
<p class="lm-sub">The order to study in, from each page's strict prerequisites ({npages} pages, {nedges} links). A page's stage is its longest chain of prerequisites: stage 1 needs nothing, and every page needs only pages in earlier stages.</p>
<div class="lm-bar0"><div class="lm-qw"><input id="lm-q" type="search" placeholder="Path to a page: type a title, e.g. FlashAttention" aria-label="Path to a page" autocomplete="off"><ul id="lm-sug" class="lm-sug" hidden></ul></div></div>
<div class="lm-leg">{leg}</div>
<div class="lm-head" id="lm-head"><b>All topics</b><span>Pick a topic to see its pages in order</span></div>
<div class="lm-map" id="lm-view"><div class="lm-scroll">{ov_svg}</div>{key}<p class="lm-cap">Each bar runs from the stage where a topic's first pages can be read to the stage of its deepest page, so you see when you can start it and how far it goes. Hover a topic to light up the topics its pages build on; click it for its pages in order.</p></div>
<div class="lm-list"><div id="lm-ovl">{ov_list}</div><div id="lm-plist"></div></div>
<div class="lm-path" id="lm-path" hidden></div>
<script type="application/json" id="lm-data">{js_data}</script>
<script>{JS}</script>
</section>"""


if __name__ == "__main__":
    if sys.argv[1:2] == ["check"]:
        e, w, _ = check()
        sys.exit(1 if e else 0)
    print(__doc__)
