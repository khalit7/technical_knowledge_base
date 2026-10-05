"""Join the lab outputs into the page's data script: python3 make_data.py WIRELOG
Reads lab/out/{sdk_flow,flows,jwt,small}.json, inputs/real_discovery.json and the taps' raw wire log; writes
lab/out/wire.json (the wire log cut into request/response exchanges per phase, redacted) and parts/21_js_data.js.
Redaction: access-token JWTs in the wire log are shortened to their first 24 characters plus their length (the JWT lab
shows whole tokens, from keys that existed only during the run); machine paths and the private patterns are refused."""
import json, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "src"))
from private_patterns import alternation  # noqa: E402

WIRE = sys.argv[1]
OUTD = os.path.join(HERE, "lab", "out")
JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*")
short_jwt = lambda m: m.group(0)[:24] + f"...[lab JWT, {len(m.group(0))} bytes]"
PRIV = re.compile(alternation())
HOME = re.compile(r"/Users/[A-Za-z0-9._-]+|/private/tmp/[^\s\"']+")


def red(s):
    s = JWT_RE.sub(short_jwt, s)
    if PRIV.search(s) or HOME.search(s):
        raise SystemExit("private string in wire data: " + (PRIV.search(s) or HOME.search(s)).group(0))
    return s


# ---- wire log -> exchanges ----
phases, cur = [], None
conns = {}
for line in open(WIRE):
    r = json.loads(line)
    if "mark" in r:
        cur = {"phase": r["mark"], "ex": []}; phases.append(cur); continue
    if cur is None:
        continue
    key = (r["tap"], r["conn"])
    st = conns.setdefault(key, {"last": None, "ex": None})
    if r["dir"] == "c2s":
        if st["last"] != "c2s":   # a new request on this connection
            st["ex"] = {"tap": r["tap"], "conn": r["conn"], "t": r["t"], "req": "", "resp": ""}
            cur["ex"].append(st["ex"])
        st["ex"]["req"] += r["data"]
    else:
        if st["ex"] is None:
            continue
        st["ex"]["resp"] += r["data"]
    st["last"] = r["dir"]
phases = [p for p in phases if p["ex"] and p["phase"] != "end"]
for p in phases:
    for e in p["ex"]:
        e["req"], e["resp"] = red(e["req"]), red(e["resp"])
        e["who"] = ("browser" if "lab-browser" in e["req"] else
                    "mcp-server" if e["tap"] in ("as", "upstream") and ("Python-urllib" in e["req"]) else "client")
json.dump(phases, open(os.path.join(OUTD, "wire.json"), "w"), indent=1)

L = lambda n: json.load(open(os.path.join(OUTD, n)))
sdk, flows, jw, small = L("sdk_flow.json"), L("flows.json"), L("jwt.json"), L("small.json")
disc = json.load(open(os.path.join(HERE, "inputs", "real_discovery.json")))
summ = {}
for k, d in disc["docs"].items():
    doc = d["doc"]
    summ[k] = {"url": d["url"], "issuer": doc.get("issuer"), "code_challenge_methods_supported": doc.get("code_challenge_methods_supported"),
               "response_types_supported": doc.get("response_types_supported"), "grant_types_supported": doc.get("grant_types_supported"),
               "authorization_response_iss_parameter_supported": doc.get("authorization_response_iss_parameter_supported"),
               "token_endpoint_auth_methods_supported": doc.get("token_endpoint_auth_methods_supported"),
               "id_token_signing_alg_values_supported": doc.get("id_token_signing_alg_values_supported"),
               "claims_count": len(doc.get("claims_supported", []))}
data = {"wire": phases, "sdk": sdk, "flows": json.loads(red(json.dumps(flows))), "jwt": jw, "small": small,
        "disc": {"fetched": disc["fetched"], "docs": summ, "google_jwks": disc["google_jwks"]}}
js = "window.AUTHDATA=" + json.dumps(data, separators=(",", ":")) + ";\n"
if PRIV.search(js) or HOME.search(js):
    raise SystemExit("private string in page data")
open(os.path.join(HERE, "parts", "21_js_data.js"), "w").write(js)
print("parts/21_js_data.js", len(js), "bytes;", sum(len(p["ex"]) for p in phases), "exchanges in", len(phases), "phases")
