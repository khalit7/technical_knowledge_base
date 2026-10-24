"""Check the built page against the recordings and the page's JavaScript against Python.
usage: python3 recompute.py [BROWSER_VALUES.json]   (the JSON uicheck.mjs writes; PyJWT needed only for the tamper-token check)
1. index.html embeds exactly lab/out/{sdk_flow,jwt,small,wire}.json and the redacted flows.json.
2. Numbers the page derives: entropy figures, the crack-time estimate, PKCE, both SigV4 vectors (in Python).
3. Values the browser computed (from uicheck.mjs): PKCE, SigV4 matches, key checksum verdicts, the HS256 tamper token
   (byte-identical to PyJWT), the strict verifier's status for each JWT case.
4. No secret-looking strings, home paths or private patterns in the page or src/."""
import base64, hashlib, json, math, os, re, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "..", "src"))
from private_patterns import alternation  # noqa: E402
html = open(os.path.join(HERE, "..", "index.html")).read()
fails = []
ok = lambda c, m: None if c else fails.append(m)

m = re.search(r"window\.AUTHDATA=(\{.*?\});\n", html)
data = json.loads(m.group(1))
L = lambda n: json.load(open(os.path.join(HERE, "lab", "out", n)))
ok(data["sdk"] == L("sdk_flow.json"), "sdk_flow differs")
ok(data["jwt"] == L("jwt.json"), "jwt differs")
ok(data["small"] == L("small.json"), "small differs")
ok(data["wire"] == L("wire.json"), "wire differs")
JWT_RE = re.compile(r"eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]*")
red = lambda s: JWT_RE.sub(lambda m: m.group(0)[:24] + f"...[lab JWT, {len(m.group(0))} bytes]", s)
ok(data["flows"] == json.loads(red(json.dumps(L("flows.json")))), "flows differs")

sm = data["small"]
ok(abs(sm["apikey"]["entropy_bits"] - 30 * math.log2(62)) < 0.05, "key entropy")
ok(abs(sm["user_code_bits"] - 8 * math.log2(20)) < 0.01, "user code bits")
pk = base64.urlsafe_b64encode(hashlib.sha256(sm["pkce"]["verifier"].encode()).digest()).rstrip(b"=").decode()
ok(pk == sm["pkce"]["rfc_challenge"], "pkce")
ok(all(v["match"] and v["creq_match"] and v["sts_match"] for v in sm["sigv4"]), "sigv4 python")
cr = data["jwt"]["crack"]
crack_min = round(36 ** 6 / cr["per_second"] / 60)

if len(sys.argv) > 1:
    bv = json.load(open(sys.argv[1]))
    ok(bv["pkce"] == sm["pkce"]["rfc_challenge"], "browser pkce")
    ok(bv["sigOk"] == [True, True], "browser sigv4")
    ok(bv["keyOk"] is True and bv["typoOk"] is False, "browser key checksum")
    ok(bv["ucBits"] == f"{8 * math.log2(20):.1f}" and bv["keyBits"] == f"{30 * math.log2(62):.1f}", "browser bits")
    ok(bv["crackSpace"].startswith(f"{crack_min} minutes"), f"crack minutes {bv['crackSpace']} vs {crack_min}")
    want = {c["id"]: (200 if c["id"] == "good" else 403 if c["id"] == "scope" else 401) for c in data["jwt"]["cases"]}
    ok(bv["jwtStrict"] == want, "strict verifier statuses")
    try:
        import jwt
        t = jwt.encode({"sub": "agent:research-bot", "aud": "https://api.llm.test", "scope": "messages:read", "iat": 1791200000, "exp": 1791203600},
                       "lab-demo-secret-shown-on-purpose", algorithm="HS256", headers={"typ": "JWT"})
        ok(t == bv["tamperToken"], "tamper token differs from PyJWT")
        print("tamper token: PyJWT", jwt.__version__, "byte-identical" if t == bv["tamperToken"] else "DIFFERENT")
    except ImportError:
        print("PyJWT not installed: tamper-token check skipped")

priv = re.compile(alternation())
for root, _, files in os.walk(os.path.join(HERE, "..")):
    if ".shots" in root:
        continue
    for f in files:
        p = os.path.join(root, f)
        if f.endswith((".png", ".pyc")):
            continue
        s = open(p, errors="replace").read()
        for pat, name in (("gl" + "pat-", "gitlab token"), ("sk-" + "ant-", "anthropic key"), (r"/Users/[a-z]", "home path"), (r"/private/tmp/", "scratch path")):
            if re.search(pat, s) and not p.endswith(("recompute.py", "make_data.py")):
                fails.append(f"{name} in {p}")
        if priv.search(s):
            fails.append(f"private pattern in {p}")
        for b in re.findall(r"Bearer (?!<)([A-Za-z0-9._~+/-]{12,})(?![=A-Za-z0-9._~+/-])", s):
            if not (b.startswith("eyJ") and ("...[lab JWT" in s)) and not b.startswith("eyJhbGciOiJIUzI1NiIs..."):
                fails.append(f"Bearer value in {p}: {b[:16]}")
print("checks failed:", len(fails))
for x in fails:
    print("FAIL", x)
sys.exit(1 if fails else 0)
