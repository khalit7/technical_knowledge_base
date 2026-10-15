"""URL and domain filtering in depth (shared venv: datatrove 0.10.1, tldextract).

1. datatrove's shipped domain list (assets/url_filterblacklistsv0_3_0.tar.gz: 'domains', 'urls') against today's UT1
   blacklists (Universite Toulouse 1 Capitole, downloaded 2026-10-15, Last-Modified 2026-10-14), the source RefinedWeb
   names (arXiv 2306.01116 App. G.1.1, Table 13): how many of datatrove's domains are in which UT1 category, how many
   UT1 adult domains are not in datatrove's list (added since).
2. The running example: the 19,241 pages trafilatura extracted plus the 183 the URL filter removed; registered domain and host of every URL against datatrove's list
   and against each UT1 category; what a fresh UT1 list would remove that datatrove's did not.
Output: src/data/ef_url.json (counts only; no adult URL or host is written).
"""
import collections
import os
import sys
import tarfile

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ef_common as E  # noqa: E402
L = E.L

RW_CATS = ["adult", "phishing", "dating", "gambling", "filehosting", "ddos", "agressif", "chat", "mixed_adult", "arjel"]
OTHER_CATS = ["malware", "cryptojacking", "warez", "drugs", "violence", "lingerie", "sexual_education", "shortener",
              "redirector", "press", "blog", "forums", "social_networks", "sports", "shopping", "games", "jobsearch",
              "financial", "bank", "audio-video", "download", "publicite", "fakenews", "manga", "celebrity"]


def read_set(path):
    with open(path, encoding="utf-8", errors="replace") as f:
        return {x.strip().lower() for x in f if x.strip() and not x.startswith("#")}


def main():
    import datatrove
    asset = os.path.join(os.path.dirname(datatrove.__file__), "assets", "url_filterblacklistsv0_3_0.tar.gz")
    dt_dir = E.scratch("lists", "datatrove_v0_3_0", "x")[:-2]
    if not os.path.exists(os.path.join(dt_dir, "domains")):
        with tarfile.open(asset) as t:
            t.extractall(dt_dir)
    dt_domains = read_set(os.path.join(dt_dir, "domains"))
    dt_urls = read_set(os.path.join(dt_dir, "urls"))
    ut1 = E.scratch("lists", "ut1", "blacklists")
    cats = {}
    for c in RW_CATS + OTHER_CATS:
        p = os.path.join(ut1, c, "domains")
        if os.path.exists(p):
            cats[c] = read_set(p)
    res = {"datatrove_domains": len(dt_domains), "datatrove_urls": len(dt_urls),
           "ut1_sizes": {c: len(s) for c, s in cats.items()}}
    rw_union = set().union(*(cats[c] for c in RW_CATS if c in cats))
    res["ut1_rw_union"] = len(rw_union)
    res["dt_in_ut1_cat"] = {c: len(dt_domains & cats[c]) for c in cats}
    res["dt_in_rw_union"] = len(dt_domains & rw_union)
    res["dt_not_in_any_ut1"] = len(dt_domains - set().union(*cats.values()))
    res["ut1_adult_not_in_dt"] = len(cats["adult"] - dt_domains)
    print({k: v for k, v in res.items() if k != "ut1_sizes"}, flush=True)

    # 2. the running example's pages
    from tldextract import TLDExtract
    tx = TLDExtract()
    removed = {d["id"]: d["metadata"].get("filter_reason") for d in L.run0_removed("1_url")}
    pages = [(d["id"], d["metadata"]["url"]) for d in L.run0("extracted")]  # 19,241 extracted pages
    url_removed = [(d["id"], d["metadata"]["url"]) for d in L.run0_removed("1_url")]
    hits = collections.Counter()
    hit_reason = collections.Counter()
    fresh_extra = collections.Counter()
    by_cat_pages = collections.defaultdict(list)
    for pid, url in pages + url_removed:
        info = tx(url)
        rd, fq = info.registered_domain.lower(), info.fqdn.lower()
        in_dt = rd in dt_domains or fq in dt_domains
        for c, s in cats.items():
            if rd in s or fq in s:
                hits[c] += 1
                if pid in removed:
                    hit_reason[(c, removed[pid])] += 1
                elif c in RW_CATS:
                    fresh_extra[c] += 1
                    by_cat_pages[c].append(pid)
        if in_dt and pid not in removed:
            hits["_dt_but_kept"] += 1
    res["pages_checked"] = len(pages) + len(url_removed)
    res["pages_url_removed"] = len(url_removed)
    res["pages_by_ut1_cat"] = dict(hits)
    res["ut1_cat_vs_run0_reason"] = {f"{c}|{r}": n for (c, r), n in hit_reason.items()}
    res["fresh_rw_extra_pages"] = dict(fresh_extra)
    E.save("ef_url.json", res)
    with open(E.scratch("url_fresh_extra_ids.txt"), "w") as f:
        for c, ids in by_cat_pages.items():
            for i in ids:
                f.write(c + "\t" + i + "\n")
    print(res)


if __name__ == "__main__":
    main()
