"""Confirm the page embeds exactly what the recordings say, and that every number quoted in the prose follows
from lab/out/*.json. Run after build.sh: python3 check_embed.py"""
import json, os, re, subprocess, sys
H = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(H, "lab", "out")
sys.path.insert(0, os.path.join(H, "..", "..", "src")); import private_patterns as pp
page = open(os.path.join(H, "..", "index.html"), encoding="utf-8").read()
data = open(os.path.join(H, "parts", "22_js_data.js"), encoding="utf-8").read()
subprocess.run([sys.executable, os.path.join(H, "gen_data.py")], check=True, capture_output=True)
assert open(os.path.join(H, "parts", "22_js_data.js"), encoding="utf-8").read() == data, "22_js_data.js is stale: rerun gen_data.py and build.sh"
assert data.split("window.MCPD=", 1)[1].strip() in page, "index.html does not embed the current data"
L = lambda f: json.load(open(os.path.join(O, f)))
tr, rep, comp, auth, wc = L("transports.json"), L("replicas.json"), L("compat.json"), L("auth.json"), L("wire_checks.json")
ok = []
def claim(text, cond):
    assert cond, "claim fails: " + text
    assert text in page, "claim text not on page: " + text
    ok.append(text)
pin, leg = tr["stdio, 2026-07-28 pinned"]["one_call"], tr["stdio, legacy 2025-11-25"]["one_call"]
claim("304 bytes under 2026-07-28 and 121 bytes under 2025-11-25", pin["up"] == 304 and leg["up"] == 121)
claim("183 bytes of <code>_meta</code>", pin["up"] - leg["up"] == 183)
claim("111 bytes (819 against 708)", pin["down"] == 819 and leg["down"] == 708 and 819 - 708 == 111)
res = re.search(r"Content-Length: \d+\r\n\r\n", "")  # result body size of the list_checkpoints reply
body = [c for c in tr["Streamable HTTP, 2026-07-28 (server free to stream)"]["one_call"]["text"] if c["down"]][0]["down"]
claim("818 bytes of result body", "content-length: 818" in body)
lst = tr["progress_call"]["text"]
claim("1,818 bytes of JSON", any("content-length: 1818" in c["down"] for c in lst))
st = {(r["era"], r["balancer"], r["shared_key"]): r for r in rep}
claim("broke 20 of 20 old-style calls and 0 of 20 new-style calls", st[("legacy", "rr", False)]["ok"] == 0 and st[("modern", "rr", True)]["ok"] == 20)
claim("Fails 20 of 20", st[("modern", "rr", False)]["ok"] == 0 and st[("modern", "rr", False)]["n"] == 20)
rs = [re.search(r'"requestState":"([^"]+)"', t["resp_body"]) for t in st[("modern", "rr", True)]["trace"]]
claim("281-character string", any(m and len(m.group(1)) == 281 for m in rs))
claim("All 9 pairings were run", len(comp) == 9 and sum(o["ok"] for o in comp) == 7)
m = {(o["client"][:6], o["server"][:6]): o for o in comp}
claim("<code>-32602 Invalid request parameters</code>", "Invalid request parameters" in m[("modern", "legacy")]["detail"])
f = auth["failures"]
claim("<code>401</code> with <code>WWW-Authenticate", f["no_token"]["status"] == 401 and f["wrong_audience"]["status"] == 401 and f["missing_scope"]["status"] == 403)
claim('error="insufficient_scope", scope="ckpt:write"', "ckpt:write" in f["missing_scope"]["www_authenticate"])
w = {c["case"]: c for c in wc}
claim("403 and 421", w["browser page on another site (Origin: http://evil.example)"]["status"] == 403 and w["DNS rebinding (Host: rebind.evil.example)"]["status"] == 421)
claim("Unknown tool: rm_rf", '"isError":true' in w["unknown tool"]["resp"])
# hygiene
for pat in [r"glpat-", r"sk-ant-", r"Bearer eyJ[\w-]{20,}\.", pp.alternation(), r"/Users/", r"/private/tmp"]:
    assert not re.search(pat, page), "forbidden text in page: " + pat
print(f"embed ok; {len(ok)} prose claims recomputed; no private or secret-like text")
