"""Retroactive opt-out check, Apertus-style, on the running example: for every host FineWeb kept a document from in our
WARC (crawled July 2024), fetch the host's robots.txt as it is today (one GET per host, no page fetched) and ask
whether it now disallows that document's URL for the AI training crawlers.

Same idea as Apertus (arXiv 2509.14233, Sec 3.1.1: January 2025 robots.txt applied to 2013-2024 crawls) and
Fan et al. (arXiv 2504.06219), on a small sample. RFC 9309 error rules: 4xx means no restrictions (allow all),
5xx or unreachable means "complete disallow" for a crawler; we count unreachable hosts separately rather than as
disallow, because a retroactive filter would usually keep them (Apertus: "if the corresponding robots.txt files are
not available, we consider the data usable").

Output: $DC_SCRATCH/data/dg/robots_now.jsonl (per host) and ../data/robots_now.json (counts only, no host names).
"""
import json
import os
import sys
import time
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

import requests

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402

AGENTS = ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot", "Applebot-Extended", "Meta-ExternalAgent", "Bytespider"]
UA = "Mozilla/5.0 (compatible; robots-txt-survey; one request per host)"


def fetch(host):
    for scheme in ("https", "http"):
        try:
            r = requests.get(f"{scheme}://{host}/robots.txt", headers={"User-Agent": UA}, timeout=12,
                             allow_redirects=True)
            return {"host": host, "status": r.status_code, "text": r.text[:500_000] if r.status_code == 200 else ""}
        except requests.RequestException as e:
            err = type(e).__name__
    return {"host": host, "status": None, "err": err, "text": ""}


def main():
    fw = C.L.curated("fineweb_warc", columns=["id", "url"])
    urls = list(fw.url)
    hosts = sorted({urlsplit(u).netloc.lower() for u in urls})
    od = C.out_dir()
    cache = os.path.join(od, "robots_now.jsonl")
    got = {}
    if os.path.exists(cache):
        for line in open(cache):
            d = json.loads(line)
            got[d["host"]] = d
    todo = [h for h in hosts if h not in got]
    t0 = time.time()
    with ThreadPoolExecutor(8) as ex, open(cache, "a") as f:
        for d in ex.map(fetch, todo):
            got[d["host"]] = d
            f.write(json.dumps(d) + "\n")
    c = Counter()
    per_agent = Counter()
    for u in urls:
        h = urlsplit(u).netloc.lower()
        d = got[h]
        c["docs"] += 1
        st = d.get("status")
        if st is None:
            c["unreachable"] += 1
            continue
        if st >= 500:
            c["server_error"] += 1
            continue
        if st != 200:
            c["no_robots_4xx_or_other"] += 1
            continue
        c["with_robots"] += 1
        p = RobotFileParser()
        p.parse(d["text"].splitlines())
        blocked = [a for a in AGENTS if not p.can_fetch(a, u)]
        for a in blocked:
            per_agent[a] += 1
        if any(a != "CCBot" for a in blocked):
            c["blocked_any_ai_trainer"] += 1
        if not p.can_fetch("*", u):
            c["blocked_star"] += 1
    out = {"date": time.strftime("%Y-%m-%d"), "hosts": len(hosts), "counts": dict(c), "blocked_by_agent": dict(per_agent),
           "seconds": round(time.time() - t0)}
    C.save_page("robots_now.json", out)
    print(json.dumps(out, indent=1))


if __name__ == "__main__":
    main()
