"""Check that every source URL in atlas_tools.py and atlas_more.py answers (HTTP status after redirects). Run: python3 -B src/map/check_urls.py"""
import os, re, sys, urllib.request, concurrent.futures as cf
HERE = os.path.dirname(os.path.abspath(__file__))
txt = "".join(open(os.path.join(HERE, f)).read() for f in ("atlas_tools.py", "atlas_more.py") if os.path.exists(os.path.join(HERE, f)))
urls = sorted(set(re.findall(r'"(https://[^"]+)"', txt)) | {"https://github.com/" + r for r in re.findall(r'GH \+ "([^"#]+)', txt)})
def chk(u):
    try:
        r = urllib.request.urlopen(urllib.request.Request(u, headers={"User-Agent": "Mozilla/5.0 kb-tool-map"}), timeout=25)
        return u, r.status
    except Exception as e:
        return u, str(e)[:60]
bad = 0
with cf.ThreadPoolExecutor(6) as ex:
    for u, s in ex.map(chk, urls):
        if s != 200: bad += 1; print(s, u)
print(len(urls), "urls,", bad, "not 200")
