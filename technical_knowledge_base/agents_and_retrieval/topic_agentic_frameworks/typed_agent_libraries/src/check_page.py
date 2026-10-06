"""Checks for this page. Run after build.sh: python3 check_page.py
1. The page embeds exactly the data that build_data.py derives from the redacted recordings (byte for byte).
2. Hand-typed numbers in the prose match their sources (the recordings, the parent's data, the installed source notes).
3. No em-dash and no private string anywhere in the page or src/.
"""
import getpass, glob, json, os, re, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
PAGE = open(os.path.join(HERE, "..", "index.html")).read()
fails = []


def ok(cond, msg):
    print(("ok   " if cond else "FAIL ") + msg)
    if not cond:
        fails.append(msg)


# 1. data embedded exactly
data_path = os.path.join(HERE, "parts", "22_js_ft_data.js")
before = open(data_path).read()
subprocess.run([sys.executable, os.path.join(HERE, "build_data.py")], check=True, capture_output=True)
after = open(data_path).read()
ok(before == after, "parts/22_js_ft_data.js is exactly what build_data.py derives from src/recordings")
ok(after.strip() in PAGE, "index.html embeds that data file unchanged")
FT = json.loads(after[len("window.FT="):].rstrip().rstrip(";"))

# 2. prose numbers
root_tok = json.load(open(os.path.join(HERE, "..", "..", "src", "same", "data", "first_tokens.json")))
full = {k: v["full"] for k, v in root_tok.items()}
ok("2,231" in PAGE and full["a5_1"] == 2231, "smolagents first request 2,231 tokens (parent's first_tokens.json)")
ok("385 to 507" in PAGE and min(full[k] for k in ("a1_1", "a2_1", "a3_1", "a4_1")) == 385 and max(full[k] for k in ("a1_1", "a2_1", "a3_1", "a4_1")) == 507,
   "385 to 507 for the other four (parent's first_tokens.json)")
so = FT["so"]


def route(r):
    return [x for x in so if x["route"] == r]


for rid in ("pai_native", "oai", "adk"):
    a = route(rid)
    ok(len(a) > 0, f"{rid}: {len(a)} recorded runs, {sum(x['valid'] for x in a)} valid")
nat = route("pai_native") + route("oai") + route("adk")
m = re.search(r"data-ftv-native=\"(\d+)/(\d+)\"", PAGE)
if m:
    ok((int(m.group(1)), int(m.group(2))) == (sum(x["valid"] for x in nat), len(nat)), "findings box: native-route count matches data")
cons = route("constrained")
m = re.search(r"data-ftv-cons=\"(\d+)/(\d+)\"", PAGE)
if m:
    ok((int(m.group(1)), int(m.group(2))) == (sum(x["valid"] for x in cons), len(cons)), "findings box: constrained count matches data")
hp = route("claude_haiku_prompt")
m = re.search(r"data-ftv-fence=\"(\d+)/(\d+)\"", PAGE)
if m:
    ok((int(m.group(1)), int(m.group(2))) == (sum(x["fenced"] for x in hp), len(hp)), "findings box: Haiku fenced count matches data")
for s in ["Fix the errors and try again.", "transfer_to_", "final_result", "set_model_response", "run_in_parallel=True",
          "DEFAULT_MAX_TURNS" if False else "10 turns", "50 requests", "20 steps", "500 model calls"]:
    ok(s in PAGE, f"prose mentions {s!r}")

# 3. em-dashes and private strings
ok(chr(0x2014) not in PAGE, "no em-dash in index.html")
bad = re.compile("/" + "Users" + "/|" + "Users" + "-|gl" + "pat|sk" + "-ant|" + re.escape(getpass.getuser()), re.I)
hits = []
for p in [os.path.join(HERE, "..", "index.html"), os.path.join(HERE, "..", "README.md")] + glob.glob(os.path.join(HERE, "**", "*"), recursive=True):
    if os.path.isfile(p) and not p.endswith((".png", ".sqlite")):
        t = open(p, errors="replace").read()
        if bad.search(t) or chr(0x2014) in t:
            hits.append(os.path.relpath(p, HERE))
ok(not hits, "no private string or em-dash in src/ or the page: " + ", ".join(hits))
ok(not glob.glob(os.path.join(HERE, "**", "__pycache__"), recursive=True), "no __pycache__ folders")
print("FAILED" if fails else "ALL OK", len(fails))
sys.exit(1 if fails else 0)
