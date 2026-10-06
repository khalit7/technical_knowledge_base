"""Checks for this page (run after extract.py and build.sh):
1. The page embeds exactly the data extract.py derives from src/recordings/ (re-derived here, compared byte for byte).
2. Every recording in src/recordings/ is in the page's data, and every run in the data has a recording.
3. Every number the prose binds (data-ht="key") exists in the data, and the key facts are re-derived independently here
   from the raw recordings (success rates, visible-but-not-hidden counts, zero-spread groups, GRPO advantages).
4. No em-dash, home path, account name, git identity, e-mail address or token prefix in the page, recordings or inputs."""
import getpass, glob, json, os, re, statistics as st, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = os.path.join(os.path.dirname(HERE), "index.html")
html = open(PAGE, encoding="utf-8").read()
fail = []

# 1. embedded data equals a fresh extraction
page_data = json.JSONDecoder().raw_decode(html, html.index("window.HT=") + len("window.HT="))[0]
subprocess.run([sys.executable, os.path.join(HERE, "extract.py")], check=True, capture_output=True)
fresh = open(os.path.join(HERE, "parts", "30_js_data.js"), encoding="utf-8").read()
fresh_data = json.JSONDecoder().raw_decode(fresh, fresh.index("window.HT=") + len("window.HT="))[0]
if fresh_data != page_data:
    fail.append("page data differs from a fresh extract.py run (rebuild with build.sh)")

# 2. recordings and runs match one to one
recs = sorted(os.path.basename(p)[:-6] for p in glob.glob(os.path.join(HERE, "recordings", "*.jsonl")))
ids = sorted(r["id"] for r in page_data["runs"])
if recs != ids:
    fail.append(f"recordings {len(recs)} vs runs in page {len(ids)}")
for rid, tr in page_data["traj"].items():
    ev = [json.loads(l) for l in open(os.path.join(HERE, "recordings", rid + ".jsonl"))]
    calls = [e for e in ev if e["ev"] == "call"]
    if len([e for e in tr if e[0] == "c"]) != len(calls) or any(c[1] != e["inp"] for c, e in zip([e for e in tr if e[0] == "c"], calls)):
        fail.append("embedded trajectory differs from recording: " + rid)

# 3. bound facts exist; independent re-derivation of the main ones
keys = set(re.findall(r'data-ht="([a-z0-9_]+)"', html))
missing = [k for k in keys if k not in page_data["f"] or page_data["f"][k] in (None, "")]
if missing:
    fail.append("prose binds missing facts: " + ", ".join(sorted(missing)))
runs = []
for p in glob.glob(os.path.join(HERE, "recordings", "*.jsonl")):
    ev = [json.loads(l) for l in open(p)]
    meta, end = ev[0], ev[-1]
    runs.append((meta["id"], "local" if meta["id"].startswith("local") else "haiku", meta["harness"], meta["task"],
                 end["reward"]["binary"], end["reward"]["visible_all_pass"], end["reward"]["partial"]))
f = page_data["f"]
if str(len(runs)) != f["n_runs"]:
    fail.append("n_runs")
for m_, h in [("local", "bash"), ("local", "tools"), ("local", "plain")]:
    L = [r[4] for r in runs if r[1] == m_ and r[2] == h]
    if L and f"{round(100 * st.mean(L))}%" != f["loc_" + h]:
        fail.append("loc_" + h)
if str(sum(1 for r in runs if r[5] and not r[4])) != f["vis_not_hidden"]:
    fail.append("vis_not_hidden")
groups = {}
for r in runs:
    groups.setdefault((r[1], r[2], r[3]), []).append(r)
for m_, key in (("local", "zero_loc"), ("haiku", "zero_hk")):
    G = [g for k, g in groups.items() if k[0] == m_]
    z = sum(1 for g in G if len({x[4] for x in g}) == 1)
    if f.get(key) != f"{z} of {len(G)}":
        fail.append(key)
for g in page_data["groups"]:
    rs = g["bin"]
    mu, sd = st.mean(rs), st.pstdev(rs)
    adv = [round((x - mu) / sd, 4) if sd else 0.0 for x in rs]
    if adv != g["bin_adv"]:
        fail.append("advantage " + g["t"])

# 4. forbidden strings
user = getpass.getuser()
def git(k):
    return subprocess.run(["git", "config", "--global", k], capture_output=True, text=True).stdout.strip()
forbid = ["/Us" + "ers/", "Us" + "ers-", user, "gl" + "pat", "sk-" + "ant", os.path.expanduser("~")] + [x for x in (git("user.name"), git("user.email")) if x]
email = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
files = [PAGE] + glob.glob(os.path.join(HERE, "**", "*"), recursive=True)
for p in files:
    if os.path.isdir(p) or "__pycache__" in p or p.endswith(".png"):
        continue
    t = open(p, encoding="utf-8", errors="replace").read()
    for x in forbid:
        if x and x.lower() in t.lower():
            fail.append(f"forbidden string in {os.path.relpath(p, HERE)}")
    for e in email.findall(t):
        if not e.endswith(("example.com", "anthropic.com")) and "@" in e and not re.match(r"^[\w.-]+@\d", e):
            fail.append(f"e-mail-like string in {os.path.relpath(p, HERE)}: {e[:3]}...")
    if chr(0x2014) in t:
        fail.append(f"em-dash in {os.path.relpath(p, HERE)}")
print("\n".join(sorted(set(fail))) if fail else f"OK: {len(runs)} recordings embedded, {len(keys)} bound facts, {len(page_data['groups'])} groups re-derived, no private strings")
sys.exit(1 if fail else 0)
