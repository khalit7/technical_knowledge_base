"""Table lab: arXiv 1909.00175 Table 1, ground truth from its LaTeX source, scored in every parser's output.
usage: python -I table_score.py <table1_1909.00175.tex> <ING_DIR>/out_qasper <out.json>
Ground truth: the tabular at pun.tex lines 244-277 (inputs/table1_1909.00175.tex), commented rows dropped,
\\multicolumn{n} repeated over its n columns, \\citet keys replaced by the labels the paper's .bbl prints.
Per parser: the table in its output (the Markdown or HTML table holding the most ground-truth numbers; otherwise
the stretch of text from the first to the last ground-truth number), rebuilt into a grid when it is a table.
  cells_present : ground-truth cells whose text occurs in the output (numbers as whole tokens)
  adj_f1        : F1 of adjacency relations (cell text, right neighbour) and (cell text, cell below) between
                  non-empty, non "-" cells where at least one of the pair is a number, predicted grid against ground
                  truth (the relation idea of Goebel et al., ICDAR 2013, restricted to the body so that a parser that
                  merges the three header rows into one is not penalised for the merge)
  hdr_ok        : share of the table's numbers found in the right row whose column header text, read upwards,
                  contains all three ground-truth header words
  q_ok          : the three numbers the QASPER answer needs, found in the right row (system name in the first
                  cell) and the right column index"""
import json, os, re, sys
from bs4 import BeautifulSoup

TEX, OUTQ, OUT = sys.argv[1:4]
CITE = {"pedersen2017duluth": "Pedersen (2017)", "pramanick2017ju": "Pramanick and Das (2017)",
        "mikhalkova2017punfields": "Mikhalkova and Karyakin (2017)", "vadehra2017uwav": "Vadehra (2017)",
        "indurthi2017fermi": "Indurthi and Oota (2017)", "vechtomova2017uwaterloo": "Vechtomova (2017)",
        "cai2018sense": "Cai et al. (2018)"}


def clean(c):
    c = re.sub(r"\\citet\{(\w+)\}", lambda m: CITE[m.group(1)], c)
    c = re.sub(r"\\multirow\{\d+\}\{\*\}\{([^}]*)\}", r"\1", c)
    c = c.replace("$\\mathsf{NP}$", "NP").replace("$\\mathsf{BPA}$-$\\mathsf{p}$", "BPA-p").replace("$\\mathsf{BPA}$", "BPA")
    c = c.replace("F$_1$", "F1").replace("{\\em F}$_1$", "F1").replace("\\em ", "").replace("--", "\u2013")
    c = re.sub(r"\\textbf\{([^}]*)\}", r"\1", c)
    return re.sub(r"[{}]", "", c).strip()


src = "\n".join(l for l in open(TEX).read().split("\n") if not l.strip().startswith("%"))
body = src[src.index("\\begin{tabular}"):src.index("\\end{tabular}")]
body = body[body.index("}", body.index("{l||")) + 1:]
gt = []
for row in body.split("\\\\"):
    row = re.sub(r"\\(cline\{[^}]*\}|hline|hdashline)", "", row).strip()
    if not row:
        continue
    cells = []
    for c in row.split("&"):
        m = re.match(r"\s*\\multicolumn\{(\d+)\}\{[^}]*\}\{(.*)\}\s*$", c.strip(), re.S)
        if m:
            cells += [clean(m.group(2))] * int(m.group(1))
        else:
            cells.append(clean(c))
    gt.append(cells)
NC = max(len(r) for r in gt)
gt = [r + [""] * (NC - len(r)) for r in gt]
QCELLS = [("BPA-p", 3, "92.19"), ("BPA", 6, "80.19"), ("BPA-p", 9, "89.76")]
qpos = []
for lab, j, v in QCELLS:
    for i, r in enumerate(gt):
        if r[0].endswith(lab) and r[j] == v:
            qpos.append([i, j])
assert len(qpos) == 3, qpos
nums = [c for r in gt for c in r if re.fullmatch(r"\d+\.\d+", c)]


def norm(s):
    return re.sub(r"\s+", " ", re.sub(r"[*_`]", "", s.replace("\u2013", "-").replace("\u2014", "-"))).strip().lower()


def md_tables(t):
    out, cur = [], []
    for line in t.split("\n") + [""]:
        if line.strip().startswith("|"):
            cur.append(line)
        elif cur:
            rows = [[c.strip() for c in l.strip().strip("|").split("|")] for l in cur if not re.fullmatch(r"[\s|:\-]+", l)]
            out.append(("md", "\n".join(cur), rows)); cur = []
    return out


def html_tables(t):
    out = []
    for m in re.finditer(r"<table.*?</table>", t, re.S | re.I):
        soup = BeautifulSoup(m.group(0), "html.parser")
        grid, spans = [], {}
        for i, tr in enumerate(soup.find_all("tr")):
            row, j = [], 0
            for td in tr.find_all(["td", "th"]):
                while (i, j) in spans:
                    row.append(spans.pop((i, j))); j += 1
                txt = td.get_text(" ", strip=True)
                cs, rs = int(td.get("colspan", 1)), int(td.get("rowspan", 1))
                for k in range(cs):
                    row.append(txt)
                    for r in range(1, rs):
                        spans[(i + r, j + k)] = txt
                j += cs
            while (i, j) in spans:
                row.append(spans.pop((i, j))); j += 1
            grid.append(row)
        out.append(("html", m.group(0), grid))
    return out


NUM = re.compile(r"\d+\.\d+")


def rel(grid):
    s = {}
    for i, r in enumerate(grid):
        for j, c in enumerate(r):
            a = norm(c)
            if not a or a == "-":
                continue
            for di, dj, d in ((0, 1, "R"), (1, 0, "D")):
                ii, jj = i + di, j + dj
                while ii < len(grid) and jj < len(grid[ii]) and norm(grid[ii][jj]) in ("",):
                    ii, jj = ii + di, jj + dj
                if ii < len(grid) and jj < len(grid[ii]):
                    b = norm(grid[ii][jj])
                    if b and b != "-" and (NUM.fullmatch(a) or NUM.fullmatch(b)):
                        s[(a, b, d)] = s.get((a, b, d), 0) + 1
    return s


GT_REL = rel(gt)
res = {"gt": gt, "question_cells": qpos, "parsers": {}}
for p in sorted(os.listdir(OUTQ)):
    f = os.path.join(OUTQ, p, "1909.00175.md")
    if not os.path.isfile(f):
        continue
    t = open(f).read()
    cands = [c for c in md_tables(t) + html_tables(t)]
    best = max(cands, key=lambda c: sum(1 for x in nums if any(x == norm(y) for r in c[2] for y in r)), default=None)
    if best and sum(1 for x in nums if any(x == norm(y) for r in best[2] for y in r)) >= 10:
        form, raw, grid = best
    else:
        form, grid = "text", None
        pos = [m.start() for x in ("78.32", "68.84") for m in re.finditer(re.escape(x), t)]
        raw = t[max(0, min(pos) - 300):max(pos) + 80] if pos else ""
    toks = set(re.findall(r"\d+\.\d+", raw)); low = norm(raw)
    found = [[(c in toks) if re.fullmatch(r"\d+\.\d+", c) else (bool(c) and norm(c) in low) for c in r] for r in gt]
    n_cells = sum(1 for r in gt for c in r if c)
    present = sum(1 for i, r in enumerate(gt) for j, c in enumerate(r) if c and found[i][j])
    adj = None; q_ok = 0; hdr = None
    if grid:
        pr = rel(grid)
        tp = sum(min(v, pr.get(k, 0)) for k, v in GT_REL.items())
        P = tp / max(1, sum(pr.values())); R = tp / max(1, sum(GT_REL.values()))
        adj = 2 * P * R / (P + R) if P + R else 0.0
        # header association: for every ground-truth number, find it in the predicted row whose first cell names the
        # same system; the text above it in that column must contain the three header words (e.g. homographic,
        # detection, f1)
        ok = tot = 0
        for gi in range(3, len(gt)):
            prow = [r for r in grid if r and norm(r[0]).replace(" ", "") == norm(gt[gi][0]).replace(" ", "")]
            if not prow:
                continue
            pr_i = grid.index(prow[0])
            for gj in range(1, NC):
                if not NUM.fullmatch(gt[gi][gj]):
                    continue
                tot += 1
                if gj < len(prow[0]) and norm(prow[0][gj]) == gt[gi][gj]:
                    above = " ".join(norm(grid[k][gj]) for k in range(pr_i) if gj < len(grid[k])).replace(" ", "")
                    want = [norm(gt[0][gj]), norm(gt[1][gj]), norm(gt[2][gj]).rstrip(".")]
                    ok += all(w.replace(" ", "") in above for w in want)
        nnum = sum(1 for r in gt[3:] for c in r if NUM.fullmatch(c))
        hdr = ok / nnum
        for (i, j), (lab, _, v) in zip(qpos, QCELLS):
            if any(len(r) > j and norm(r[j]) == v and norm(r[0]).endswith(norm(lab)) for r in grid):
                q_ok += 1
    res["parsers"][p] = {"form": form, "raw": raw[:2500], "grid": grid, "cell_found": found, "cells_present": present,
                         "n_cells": n_cells, "adj_f1": adj, "q_ok": q_ok, "hdr_ok": hdr}
    print(p, form, present, "/", n_cells, "adjF1", None if adj is None else round(adj, 3), "q", q_ok, "hdr", hdr)
rows = []
hdr = [" ".join(dict.fromkeys(x for x in (gt[0][j], gt[1][j], gt[2][j]) if x)) for j in range(NC)]
for r in gt[3:]:
    rows.append("; ".join("%s: %s" % (hdr[j] if j else "System", r[j]) for j in range(NC) if r[j] and r[j] != "-"))
res["rows"] = rows
json.dump(res, open(OUT, "w"), ensure_ascii=False)
