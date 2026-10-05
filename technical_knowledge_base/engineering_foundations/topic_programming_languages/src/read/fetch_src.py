"""Fetch a web page, strip it to text, save to read/sources/<name>.txt with URL and fetch date on line 1.
Usage: python3 fetch_src.py name url [name url ...]. Raw HTML is not kept (size)."""
import gzip, sys, re, html, urllib.request, datetime, pathlib
out = pathlib.Path(__file__).with_name("sources")
args = sys.argv[1:]
for name, url in zip(args[::2], args[1::2]):
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh) kb-research"})
        r = urllib.request.urlopen(req, timeout=40); b = r.read()
        if r.headers.get("Content-Encoding") == "gzip" or b[:2] == b"\x1f\x8b": b = gzip.decompress(b)
        raw = b.decode("utf-8", "ignore")
    except Exception as e:
        print(name, "ERROR", e); continue
    t = re.sub(r"(?is)<(script|style|svg|noscript)\b.*?</\1>", " ", raw)
    t = re.sub(r"(?i)<br\s*/?>|</(p|div|li|h[1-6]|tr|pre|section)>", "\n", t)
    t = html.unescape(re.sub(r"<[^>]+>", " ", t))
    t = "\n".join(re.sub(r"[ \t]+", " ", l).strip() for l in t.splitlines())
    t = re.sub(r"\n{3,}", "\n\n", t)
    (out / f"{name}.txt").write_text(f"SOURCE {url} fetched {datetime.date.today().isoformat()}\n\n" + t)
    print(name, len(t))
