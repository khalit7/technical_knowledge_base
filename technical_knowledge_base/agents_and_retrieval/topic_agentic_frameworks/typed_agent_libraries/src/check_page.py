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


# 2b. numbers written statically in the Reading prose (rebuilt 2026-10-24) against the data
import html as _h
TXT = re.sub(r"\s+", " ", _h.unescape(re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>|<style.*?</style>", " ", PAGE, flags=re.S))))
V = lambda a: sum(x["valid"] for x in a)
C = lambda a: sum(x["valid"] and x["category_ok"] for x in a)
pt, pp = route("pai_tool"), route("pai_prompted")
ok(f"{V(nat)} of {len(nat)} runs returned a result" in TXT and V(nat) == 0 and len(nat) == 60, "native routes 0 of 60")
ok(f"Pydantic AI {V(route('pai_native'))} of 20, Agents SDK {V(route('oai'))} of 20, ADK {V(route('adk'))} of 20" in TXT, "native per library")
ok(f"{V(cons)} of {len(cons)} replies parse, yet only {C(cons)} named the right bug category" in TXT, "constrained valid and category")
ok(f"{V(pt)} of {len(pt)} valid, got {C(pt)}" in TXT, "tool route valid and category")
ok(f"(prompted, {V(pp)} of {len(pp)}) or into a tool ({V(pt)} of {len(pt)})" in TXT, "prompted and tool validity")
ok(f"right in {C(pp)} of {V(pp)} prompted runs, {C(cons)} of {V(cons)} constrained, but only {C(pt)} of {V(pt)} tool-output" in TXT, "category among valid")
objs = [x for x in so if x["valid"] and x.get("conf") is not None]
ok(f"{sum(x['conf'] == 5 for x in objs)} of {len(objs)} valid results" in TXT, "confidence 5 count")
hp, sp = route("claude_haiku_prompt"), route("claude_sonnet_prompt")
ok(f"wrapped {sum(x['fenced'] for x in hp)} of {len(hp)} replies" in TXT and f"recovers {sum(x['lenient'] for x in hp)}" in TXT and f"bare JSON {V(sp)} of {len(sp)}" in TXT, "Claude prompted routes")
val = FT["val"]
nret = sum(len(x["retries"]) for x in val); withr = sum(1 for x in val if x["retries"])
ok(f"{len(val)} runs, {V(val)} returned a valid result" in TXT and f"{nret} retry prompts went back in {withr} runs" in TXT, "validator runs and retries")
M = FT["mech"]
gp, gs = M["oai_guard_par_greedy"]["cases"][0]["requests"], M["oai_guard_seq_greedy"]["cases"][0]["requests"]
ok(f"tripped after {gp} model requests; blocking: tripped after {gs}" in TXT, "guardrail request counts")
ok(f"all {M['oai_handoff_greedy']['wire'][1]['msgs']} messages so far" in TXT, "handoff message count")
at = [k for k in M if k.startswith("adk_task")]
ok(f"tests passed after {sum(M[k]['tests']['pass'] for k in at)} of {len(at)} runs" in TXT and ", ".join(str(len(M[k]['wire'])) for k in sorted(at)) in TXT.replace(" and ", ", "), "ADK seventh way")
ok(f"{len(FT['card']['/.well-known/agent-card.json']['body']['skills'])} skills" in TXT, "agent card skills")

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
