"""Confirm the page embeds exactly the recorded lab outputs: rebuild the data from raw/ and compare with
parts/21_js_data.js and with what ../index.html carries; check every [[number]] key; check the round-trip ladder's
labels still match the recording; and scan everything that will be committed for secrets and private strings."""
import json, os, re, subprocess, sys, glob
H = os.path.dirname(os.path.abspath(__file__)); fails = []
sys.path.insert(0, os.path.join(H, "../../src"))
before = open(os.path.join(H, "parts/21_js_data.js")).read(); nb = open(os.path.join(H, "numbers.json")).read()
subprocess.run([sys.executable, os.path.join(H, "make_data.py")], check=True, capture_output=True)
after = open(os.path.join(H, "parts/21_js_data.js")).read()
if before != after: fails.append("21_js_data.js was stale (regenerated now; rebuild)")
if nb != open(os.path.join(H, "numbers.json")).read(): fails.append("numbers.json was stale")
page = open(os.path.join(H, "../index.html")).read()
data_line = after.split("\n", 1)[1].strip()
if data_line not in page: fails.append("index.html does not carry the current data")
N = json.loads(nb)
used = set()
for f in glob.glob(os.path.join(H, "parts/*")):
    used |= set(re.findall(r"\[\[([a-z0-9_]+)\]\]", open(f).read()))
miss = [k for k in used if k not in N]
if miss: fails.append("unknown number keys: " + ", ".join(miss))
if "[[" in page and re.search(r"\[\[[a-z0-9_]+\]\]", page): fails.append("unfilled [[key]] in index.html")
# the ladder labels assume 9 packet groups (see 24_js_hs.js)
D = json.loads(data_line[len("window.SSHD="):-1])
rounds, last = 0, None
for e in D["delay40"]:
    if rounds == 0 or (e["dir"] == "c2s" and last == "s2c"): rounds += 1
    last = e["dir"]
if rounds != 9: fails.append(f"round-trip ladder has {rounds} groups, labels assume 9")
# numbers quoted in prose that must agree with the recording
if N["mux_reuse"] >= N["mux_n"]: fails.append("multiplexing did not help in this recording; text claims it does")
if "logged in to gpu-node-02" not in D["logs"]["agent_forward"]: fails.append("agent forwarding attack did not reach gpu-node-02; text says it did")
if "refused at gpu-node-02" not in D["logs"]["agent_constrained"]: fails.append("constrained key was not refused at gpu-node-02")
if "\nsocket: /" in D["logs"]["agent_proxyjump"]: fails.append("a socket appeared under ProxyJump")
r = D["reach"]
if not r["alice on gpu-node-01 -> 127.0.0.1:8888 with the token"].startswith("200"): fails.append("loopback notebook not reached by alice")
if "Permission denied" not in r["alice on gpu-node-01 -> Unix socket in khalid's 0700 directory"]: fails.append("unix socket not protected")
# secrets and private strings in everything committed
import private_patterns
pat = re.compile(private_patterns.alternation()); sec = re.compile(r"glpat-|sk-ant-|Bearer [A-Za-z0-9]|BEGIN OPENSSH PRIVATE KEY|BEGIN [A-Z ]*PRIVATE KEY|/Users/")
files = [os.path.join(H, "../index.html"), os.path.join(H, "../README.md")] + [f for f in glob.glob(os.path.join(H, "**/*"), recursive=True) if os.path.isfile(f)]
for f in files:
    if f.endswith(".png") or f.endswith("check_embed.py"): continue
    t = open(f, errors="replace").read()
    if pat.search(t): fails.append("private pattern in " + os.path.relpath(f, H))
    if sec.search(t): fails.append("secret-like string in " + os.path.relpath(f, H) + ": " + sec.search(t).group(0))
print("check_embed:", "OK" if not fails else "FAIL"); [print(" -", x) for x in fails]
sys.exit(1 if fails else 0)
