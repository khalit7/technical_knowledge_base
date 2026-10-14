"""Write labels/url.json: every URL-filter removal in run0 that was NOT a blocklisted domain (77 of 183), labelled by
the agent from the URL alone (2026-10-14). R = right drop (adult or spam page), W = wrong drop (an ordinary page
caught by a word in its URL), U = unclear. Only the label, reason and, for W, a short description are kept;
URLs of adult pages are not written anywhere in the repo.
"""
import json, os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import pip_common as P
from urllib.parse import urlparse
W = {"boardandbrush.com": "craft workshop selling cornhole board sets",
     "gridironheroics.com": "American football news about quarterback Hendon Hooker",
     "selahafrik.com": "Christian site, tag page about the Ethiopian eunuch (Acts 8)",
     "tiendareid.com.do": "hardware shop, part number ending in XXX",
     "tutos.ouiaremakers.com": "French DIY tutorial, 'p'tits lapins' (little rabbits) for Easter",
     "kimmett.ca": "essay whose title contains the word 'hooker'",
     "findingmyownvoice7.blogspot.com": "music blog post title",
     "www.headbangers.gr": "music news tag page",
     "www.valeriarandone.it": "Italian blog post (reflection) with 'viagra' in the title",
     "picoteandoelespectaculo.blogspot.com": "Spanish entertainment blog (confessions about addiction)"}
U = {"indirect.injury-lawyer.com", "www.belleb.ru", "filmexperience.blogspot.com", "manhwafull.net", "theanaiza.com",
     "circle.kir.jp"}
out = []
for d in P.L.run0_removed("1_url"):
    r = d["metadata"].get("filter_reason")
    if r == "domain":
        continue
    host = urlparse(d["metadata"]["url"]).netloc
    lab = "W" if host in W else ("U" if host in U else "R")
    out.append({"reason": r, "label": lab, "host": host if lab == "W" else "", "what": W.get(host, "")})
json.dump(out, open(os.path.join(P.HERE, "labels", "url.json"), "w"), indent=0)
from collections import Counter
print(len(out), Counter(o["label"] for o in out), Counter((o["reason"], o["label"]) for o in out))
