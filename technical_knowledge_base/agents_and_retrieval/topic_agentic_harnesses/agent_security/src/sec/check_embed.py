#!/usr/bin/env python3
"""Prove the built page embeds exactly the generated defensive data, that no forbidden token leaks,
and that the hand-written numbers in the prose match the data. Run: python3 check_embed.py

Defensive only: there is no injection run, no exfiltration command and no model run in the data, and
this check asserts their absence as well as the positive facts."""
import getpass, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
INDEX = os.path.join(os.path.dirname(SRC), "index.html")
DATA_JS = os.path.join(SRC, "parts", "26_js_hsec_data.js")
html = open(INDEX).read()
datajs = open(DATA_JS).read()
blob = datajs[datajs.index("window.HSEC=") + len("window.HSEC="):].strip()
if blob.endswith(";"):
    blob = blob[:-1]
data = json.loads(blob)
ok = True


def req(cond, msg):
    global ok
    print(("ok  " if cond else "FAIL") + "  " + msg)
    if not cond:
        ok = False


# 1. the data JS is embedded verbatim in the page
req(datajs.strip() in html, "26_js_hsec_data.js embedded verbatim in index.html")

# 2. no forbidden token, email, git identity or em-dash in the page
try:
    login = getpass.getuser()
except Exception:
    login = ""
forbidden = [t for t in ["/Users/", "Users-", login, "glpat", "sk-ant", "scratchpad",
                         "gmail.com", "khalidsulman", "—"] if t]
for tok in forbidden:
    req(tok not in html, "page is free of %r" % tok)

# 3. the page carries no offensive artefact (defensive-only scope)
for banned in ["harness_runs", "cc_runs", "gate_probe", "credentials.env",
               "/dev/tcp", "nslookup", "urllib.request", "Injection lab", "t-hsinj"]:
    req(banned not in html, "page is free of offensive artefact %r" % banned)

# 4. gate decisions: the reused root table, split used in the gate-tab note
gc = data["gate_cases"]
denied = [o for o in gc if o["verdict"] != "allow"]
allowed = [o for o in gc if o["verdict"] == "allow"]
named = [o for o in denied if "deny rule" in o["why"]]
failclosed = [o for o in denied if "deny rule" not in o["why"]]
req(len(gc) == 11, "gate table has 11 actions; got %d" % len(gc))
req(len(allowed) == 4, "4 allowed; got %d" % len(allowed))
req(len(denied) == 7, "7 denied; got %d" % len(denied))
req(len(named) == 4, "4 denied by a named rule (prose); got %d" % len(named))
req(len(failclosed) == 3, "3 denied by fail-closed (prose); got %d" % len(failclosed))
req(len(named) + len(failclosed) == len(denied), "named + fail-closed == denied")

# 5. egress allow-list simulation: default-deny, covers DNS
eg = data["egress"]
req(len(eg) == 7, "egress has 7 requests; got %d" % len(eg))
req(any(r["kind"] == "dns" for r in eg), "egress covers DNS lookups")
req(any(r["kind"] == "dns" and r["verdict"] == "allow" for r in eg), "a listed DNS name is allowed")
req(any(r["kind"] == "dns" and r["verdict"] == "deny" for r in eg), "an unlisted DNS name is denied")
req(any("IP literal" in r["why"] and r["verdict"] == "deny" for r in eg), "a raw IP is denied by default")

# 6. the benign sandbox demo and its listener
req(data["listener"]["secret_seen"] is False, "listener never saw any secret")
req(data["listener"]["total"] == 1 and data["listener"]["paths"] == ["/sandbox-demo-ping"],
    "listener saw exactly the one benign marker")
sb = {c["profile"]: c["result"] for c in data["sandbox"]["cases"] if "connect" in c["op"]}
req(any("NETWORK_OK" in v for k, v in sb.items() if "none" in k), "unsandboxed network connects")
req(any("NETWORK_BLOCKED" in v for k, v in sb.items() if "deny network" in k), "sandboxed network is blocked")
wr = data["sandbox"]["cases"]
req(any("/tmp" in c["op"] and "subpath" in c["profile"] and "WRITE_BLOCKED" in c["result"] for c in wr),
    "out-of-tree write blocked under the write profile")
req(any("inside the work dir" in c["op"] and "WRITE_OK" in c["result"] for c in wr),
    "in-tree write allowed under the write profile")

print("\n" + ("PASS" if ok else "FAIL"))
sys.exit(0 if ok else 1)
