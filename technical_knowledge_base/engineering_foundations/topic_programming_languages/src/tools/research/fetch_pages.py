"""Fetch primary-source pages and save plain text into pages/<name>.txt. Usage: python3 fetch_pages.py name=url ..."""
import sys, urllib.request, re, html, os, concurrent.futures as cf
os.makedirs("pages", exist_ok=True)
UA = {"User-Agent": "Mozilla/5.0 (Macintosh) kb-toolchain-atlas/1.0"}
def txt(h):
    h = re.sub(r"(?is)<(script|style|noscript)[^>]*>.*?</\1>", " ", h)
    h = re.sub(r"(?i)<br\s*/?>|</(p|div|li|h\d|tr|pre|section|article|dt|dd)>", "\n", h)
    h = re.sub(r"(?i)</t[dh]>", " | ", h)
    h = re.sub(r"<[^>]+>", "", h)
    h = html.unescape(h)
    h = re.sub(r"[ \t\r\f\v]+", " ", h)
    return re.sub(r"\n\s*\n+", "\n", h)
def one(a):
    name, url = a.split("=", 1)
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=60) as r:
            raw = r.read().decode("utf-8", "replace")
        open(f"pages/{name}.html", "w").write(raw)
        t = txt(raw); open(f"pages/{name}.txt", "w").write(f"URL: {url}\n" + t)
        return f"{name}: {len(t)} chars"
    except Exception as e:
        return f"{name}: ERROR {e!r}"
with cf.ThreadPoolExecutor(6) as ex:
    for m in ex.map(one, sys.argv[1:]): print(m)
