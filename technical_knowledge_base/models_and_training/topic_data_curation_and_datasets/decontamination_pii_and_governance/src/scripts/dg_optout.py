"""Machine-readable opt-out signals on the running example's raw pages, and what FineWeb kept from them.

Per HTML response in the WARC (20,991 records): the HTTP X-Robots-Tag header, <meta name="robots"> content (noai,
noimageai), TDMRep's tdm-reservation (HTTP header or <meta name="tdm-reservation">), and the IETF aipref draft's
Content-Usage header. Per host: the robots.txt Common Crawl fetched in the same crawl, when it is in this segment
slot's robotstxt file, parsed with urllib.robotparser for the AI crawler tokens (GPTBot, CCBot, Google-Extended,
ClaudeBot, Applebot-Extended, Meta-ExternalAgent, Bytespider) and "*".

Joined with FineWeb (rows from the same WARC) and run0's final output: how many kept documents carry a signal that
reserves AI training. Output: ../data/optout.json (counts only; host names are not written).
"""
import os
import re
import sys
from collections import Counter
from urllib.parse import urlsplit
from urllib.robotparser import RobotFileParser

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import dg_common as C  # noqa: E402

AGENTS = ["GPTBot", "CCBot", "Google-Extended", "ClaudeBot", "Applebot-Extended", "Meta-ExternalAgent", "Bytespider"]
META = re.compile(rb"<meta[^>]+>", re.I)
NAME = re.compile(rb"name\s*=\s*[\"']?([^\"'\s>]+)", re.I)
CONTENT = re.compile(rb"content\s*=\s*[\"']([^\"']*)", re.I)


def robots_by_host():
    from warcio.archiveiterator import ArchiveIterator
    out = {}
    with open(C.L._cc("robotstxt"), "rb") as f:
        for r in ArchiveIterator(f):
            if r.rec_type != "response":
                continue
            u = r.rec_headers.get_header("WARC-Target-URI")
            st = r.http_headers.get_statuscode() if r.http_headers else None
            body = r.content_stream().read().decode("utf-8", "replace")
            host = urlsplit(u).netloc.lower()
            out[host] = (st, body)
    return out


def warc_with_headers():
    from warcio.archiveiterator import ArchiveIterator
    with open(C.L.warc_path(), "rb") as f:
        for r in ArchiveIterator(f):
            if r.rec_type != "response":
                continue
            h = {k.lower(): v for k, v in (r.http_headers.headers if r.http_headers else [])}
            yield {"id": r.rec_headers.get_header("WARC-Record-ID"), "url": r.rec_headers.get_header("WARC-Target-URI"),
                   "h": h, "body": r.content_stream().read()}


def main():
    rob = robots_by_host()
    fw = set(C.L.ids("fineweb_kept"))
    final = set(C.L.ids("run0_final"))
    c = Counter()
    hosts_seen = set()
    parsers = {}
    for r in warc_with_headers():
        c["records"] += 1
        body = r["body"][:200_000]
        host = urlsplit(r["url"]).netloc.lower()
        hosts_seen.add(host)
        kept_fw = r["id"] in fw
        kept_fin = r["id"] in final
        c["fineweb_kept"] += kept_fw
        sig = set()
        xr = (r["h"].get("x-robots-tag") or "").lower()
        if "noai" in xr or "noimageai" in xr:
            sig.add("header_noai")
        if (r["h"].get("tdm-reservation") or "").strip() == "1":
            sig.add("header_tdm_reservation")
        if "train-ai=n" in (r["h"].get("content-usage") or "").replace(" ", "").lower():
            sig.add("header_content_usage")
        for m in META.finditer(body):
            tag = m.group(0)
            n = NAME.search(tag)
            v = CONTENT.search(tag)
            if not n or not v:
                continue
            name, val = n.group(1).lower(), v.group(1).lower()
            if name in (b"robots", b"googlebot") and (b"noai" in val or b"noimageai" in val):
                sig.add("meta_noai")
            if name in (b"robots",) and b"noindex" in val:
                sig.add("meta_noindex")
            if name == b"tdm-reservation" and val.strip() == b"1":
                sig.add("meta_tdm_reservation")
        # robots.txt for this host, same crawl
        if host in rob:
            c["records_with_robots"] += 1
            c["fineweb_kept_with_robots"] += kept_fw
            if host not in parsers:
                st, txt = rob[host]
                p = RobotFileParser()
                p.parse(txt.splitlines() if st == 200 else [])
                parsers[host] = p
            p = parsers[host]
            for a in AGENTS:
                if not p.can_fetch(a, r["url"]):
                    sig.add("robots_" + a)
        for s in sig:
            c["records_" + s] += 1
            if kept_fw:
                c["fineweb_kept_" + s] += 1
            if kept_fin:
                c["final_" + s] += 1
        if any(s.startswith("robots_") and s != "robots_CCBot" for s in sig) and kept_fw:
            c["fineweb_kept_any_ai_bot_blocked"] += 1
    out = dict(c)
    out["hosts"] = len(hosts_seen)
    out["hosts_with_robots_in_slot"] = len(hosts_seen & set(rob))
    out["robots_files_in_slot"] = len(rob)
    C.save_page("optout.json", out)
    for k in sorted(out):
        print(k, out[k])


if __name__ == "__main__":
    main()
