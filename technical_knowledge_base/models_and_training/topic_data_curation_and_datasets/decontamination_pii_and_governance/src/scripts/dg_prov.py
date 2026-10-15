"""The provenance chain of one real document of the running example, with every identifier read from the data:
Common Crawl WARC record (offset, length, headers) -> run0 stages -> FineWeb row -> FineWeb-Edu row -> today's
robots.txt. The document: the FDA consumer update on cannabis products (a US federal agency page, an organisation,
no personal data), chosen because it survives every stage and is in FineWeb and FineWeb-Edu.

Output: ../data/prov.json. The URL's fbclid parameter (a Facebook click identifier) is redacted before saving.
"""
import gzip
import json
import os
import re
import sys
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402

NEEDLE = "fda.gov/consumers/consumer-updates/what-you-need-know-and-what-were-working-find-out-about-products-containing-cannabis"


def redact(u):
    return re.sub(r"(fbclid=)[^&]+", r"\1[redacted]", u)


def main():
    from warcio.archiveiterator import ArchiveIterator
    out = {}
    with open(C.L.warc_path(), "rb") as f:
        it = ArchiveIterator(f)
        for r in it:
            if r.rec_type != "response":
                continue
            u = r.rec_headers.get_header("WARC-Target-URI")
            if NEEDLE not in u:
                continue
            body = r.content_stream().read()
            it.read_to_end()
            h = r.http_headers
            meta = re.findall(rb"<meta[^>]+name=[\"']?robots[^>]*>", body, re.I)
            out["warc"] = {
                "file": C.L.FILE + ".warc.gz", "crawl": C.L.CRAWL, "segment": C.L.SEGMENT,
                "record_id": r.rec_headers.get_header("WARC-Record-ID"), "date": r.rec_headers.get_header("WARC-Date"),
                "offset": it.get_record_offset(), "length": it.get_record_length(),
                "payload_type": r.rec_headers.get_header("WARC-Identified-Payload-Type"),
                "http_status": h.get_statuscode(), "content_type": h.get_header("Content-Type"),
                "x_robots_tag": h.get_header("X-Robots-Tag"), "html_bytes": len(body),
                "meta_robots": [m.decode("utf-8", "replace")[:120] for m in meta],
                "url": redact(u)}
            rid = out["warc"]["record_id"]
            break
    # run0 stages: present in each stage folder?
    stages = {}
    for st in C.L.STAGES:
        for d in C.L.run0(st):
            if d["id"] == rid:
                md = {k: v for k, v in d["metadata"].items() if k not in ("file_path",)}
                stages[st] = {"chars": len(d["text"]), "metadata_keys": sorted(md),
                              "language_score": md.get("language_score")}
                if st == "final":
                    out["final_excerpt"] = d["text"][:420]
                break
    out["run0"] = stages
    fw = C.L.curated("fineweb_warc")
    row = fw[fw.id == rid].iloc[0]
    out["fineweb"] = {"id": row.id, "dump": row.dump, "date": str(row.date), "file_path": row.file_path,
                      "token_count": int(row.token_count), "language_score": round(float(row.language_score), 4)}
    fe = C.L.curated("fineweb_edu_warc")
    er = fe[fe.id == rid]
    if len(er):
        out["fineweb_edu"] = {"score": round(float(er.iloc[0].score), 4), "int_score": int(er.iloc[0].int_score)}
    # today's robots.txt for the host
    host = urlsplit(out["warc"]["url"]).netloc.lower()
    rn = os.path.join(C.L.scratch(), "data", "dg", "robots_now.jsonl")
    for line in open(rn):
        d = json.loads(line)
        if d["host"] == host:
            p = RobotFileParser()
            p.parse(d["text"].splitlines())
            full = [x for x in C.L.curated("fineweb_warc", columns=["id", "url"]).itertuples() if x.id == rid][0].url
            out["robots_now"] = {"status": d["status"], "agents": {a: p.can_fetch(a, full) for a in
                                 ["GPTBot", "ClaudeBot", "Google-Extended", "CCBot", "*"]}}
    C.save_page("prov.json", out)
    print(json.dumps(out, indent=1)[:3000])


if __name__ == "__main__":
    main()
