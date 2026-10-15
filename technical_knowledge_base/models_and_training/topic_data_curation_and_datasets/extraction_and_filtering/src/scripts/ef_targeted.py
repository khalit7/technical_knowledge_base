"""A targeted sample for tables, code and maths: pages from the SAME crawl (CC-MAIN-2024-30) chosen from sites known
for that structure, looked up in Common Crawl's URL index (cluster.idx plus one gzip block of cdx-NNNNN.gz, by range request) and fetched as single WARC
records by HTTP range request from data.commoncrawl.org. The random running-example WARC holds too few of them
(3 MathML pages of 20,280).

Usage (this page's venv; network; run under the download lock):
  ef_targeted.py fetch     -> $DC_SCRATCH/data/ef/targeted/records.warc.gz (+ index.json: group, url, offset)
Groups and queries are in GROUPS below; at most PER pages per query, status 200, text/html.
"""
import json
import os
import sys
import time
import urllib.parse
import urllib.request

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402

CRAWL = "CC-MAIN-2024-30"
PER = 12
MATH_WIKI = ["Fourier_transform", "Bayes'_theorem", "Normal_distribution", "Euler's_formula", "Quadratic_formula",
             "Pythagorean_theorem", "Matrix_multiplication", "Gradient_descent", "Softmax_function", "Cross-entropy",
             "Logistic_regression", "Standard_deviation", "Eigenvalues_and_eigenvectors", "Taylor_series",
             "Riemann_zeta_function", "Maxwell's_equations", "Schrödinger_equation", "Binomial_theorem",
             "Central_limit_theorem", "Variance", "Derivative", "Integral", "Linear_regression", "Entropy_(information_theory)"]
GROUPS = {
    "mathjax": ["math.stackexchange.com/questions/*", "mathoverflow.net/questions/*",
                "physics.stackexchange.com/questions/*", "stats.stackexchange.com/questions/*"],
    "arxiv_abs": ["arxiv.org/abs/*"],
    "wiki_math": ["en.wikipedia.org/wiki/" + t for t in MATH_WIKI],
    "mathml_nlab": ["ncatlab.org/nlab/show/*"],
    "code": ["stackoverflow.com/questions/*", "docs.python.org/3/library/*",
             "developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/*", "www.geeksforgeeks.org/*"],
    "wiki_tables": ["en.wikipedia.org/wiki/List_of_*"],
    "data_tables": ["www.basketball-reference.com/players/*", "www.worldometers.info/*"],
}


def surt_prefix(pat):
    """'math.stackexchange.com/questions/*' -> 'com,stackexchange,math)/questions/' (Common Crawl's SURT key form:
    host labels reversed, 'www.' dropped, lower-cased; prefix queries end with '*')."""
    host, _, path = pat.rstrip("*").partition("/")
    labels = host.lower().split(".")
    if labels[0] == "www":
        labels = labels[1:]
    return ",".join(reversed(labels)) + ")/" + path.lower()


_IDX = {}


def cluster():
    """cluster.idx: the first key of every 3,000-line block of the sorted CDX index (read from data.commoncrawl.org,
    the same lookup the index server does; index.commoncrawl.org refused connections on 2026-10-15)."""
    if not _IDX:
        p = E.scratch("targeted", "cluster.idx")
        if not os.path.exists(p):
            with open(p, "wb") as f:
                f.write(get(f"https://data.commoncrawl.org/cc-index/collections/{CRAWL}/indexes/cluster.idx"))
        first, loc = [], []
        for line in open(p, encoding="utf-8", errors="replace"):
            a = line.rstrip("\n").split("\t")
            first.append(a[0])
            loc.append((a[1], int(a[2]), int(a[3])))
        _IDX["first"], _IDX["loc"] = first, loc
    return _IDX["first"], _IDX["loc"]


def get(url, rng=None):
    h = {"User-Agent": "ef-kb-page (research sample)"}
    if rng:
        h["Range"] = f"bytes={rng[0]}-{rng[0] + rng[1] - 1}"
    for k in range(6):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=h), timeout=120) as r:
                return r.read()
        except Exception as e:  # noqa: BLE001
            err = e
            time.sleep(2 * (k + 1))
    raise RuntimeError(f"{url}: {err}")


def cdx(url_pat, limit):
    import bisect
    import gzip
    first, loc = cluster()
    key = surt_prefix(url_pat)
    b = max(0, bisect.bisect_right(first, key) - 1)
    rows = []
    for bb in (b, b + 1):
        f, off, ln = loc[bb]
        raw = get(f"https://data.commoncrawl.org/cc-index/collections/{CRAWL}/indexes/{f}", (off, ln))
        for line in gzip.decompress(raw).decode("utf-8", "replace").splitlines():
            k, _, rest = line.partition(" ")
            if not k.startswith(key):
                continue
            j = json.loads(rest.split(" ", 1)[1])
            if j.get("status") == "200" and j.get("mime") == "text/html":
                rows.append(j)
        if len(rows) >= limit:
            break
    return rows[:limit]


def fetch_record(fn, off, length):
    try:
        return get("https://data.commoncrawl.org/" + fn, (off, length))
    except RuntimeError:
        return None


def fetch():
    out_dir = E.scratch("targeted", "x")[:-2]
    idx, seen = [], set()
    with open(os.path.join(out_dir, "records.warc.gz"), "wb") as w:
        for group, pats in GROUPS.items():
            for pat in pats:
                exact = "*" not in pat
                rows = cdx(pat if not exact else pat + "*", 3 if exact else PER * 3)
                n = 0
                for row in rows:
                    if row["url"] in seen or n >= (1 if exact else PER):
                        continue
                    b = fetch_record(row["filename"], int(row["offset"]), int(row["length"]))
                    if not b:
                        continue
                    seen.add(row["url"])
                    w.write(b)  # each record is its own gzip member: concatenation is a valid .warc.gz
                    idx.append({"group": group, "query": pat, "url": row["url"], "filename": row["filename"],
                                "offset": int(row["offset"]), "length": int(row["length"])})
                    n += 1
                print(group, pat, len(rows), n, flush=True)
    with open(os.path.join(out_dir, "index.json"), "w") as f:
        json.dump(idx, f, indent=0)
    print("records", len(idx))


if __name__ == "__main__":
    {"fetch": fetch}[sys.argv[1]]()
