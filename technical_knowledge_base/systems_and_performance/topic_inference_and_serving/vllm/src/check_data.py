"""Checks that the page embeds exactly the built data and that numbers written in the prose agree with the data.
usage: python3 -I check_data.py   (from src/, after build.sh)"""
import json, os, re, html

HERE = os.path.dirname(os.path.abspath(__file__))
page = open(os.path.join(HERE, "..", "index.html")).read()
fails = []


def embedded(var):
    m = re.search(r"window\." + var + r"=(\{.*?\});\n", page, re.S)
    return json.loads(m.group(1)) if m else None


step = json.load(open(os.path.join(HERE, "stepper", "out", "stepper_data.json")))
knob = json.load(open(os.path.join(HERE, "knob", "out", "knob_data.json")))
if embedded("VL_STEP") != step:
    fails.append("VL_STEP differs from stepper/out/stepper_data.json")
if embedded("VL_KNOB") != knob:
    fails.append("VL_KNOB differs from knob/out/knob_data.json")

text = html.unescape(re.sub(r"<[^>]+>", " ", page))
text = re.sub(r"\s+", " ", text)


def expect(desc, cond):
    if not cond:
        fails.append(desc)


# Reading s3 / stepper: A and A2 share 59 tokens, one block hit
runs = {r["key"]: r for r in step["runs"]}
a, a2 = step["texts"][runs["pc_on"]["req"]["A"]["t"]], step["texts"][runs["pc_on"]["req"]["A2"]["t"]]
k = 0
while a[k] == a2[k]:
    k += 1
hits = {e[1]: e[2] for st in runs["pc_on"]["steps"] for e in st["ev"] if e[0] == "admit"}
expect("A/A2 diverge at 100, hit 96 (3 blocks)", k == 100 and hits.get("A2") == 96 and "<think>" in "".join(a[k - 3:k + 6]))
# Reading s5 predict: 9,344 tokens = start-up log of the default run
expect("9,344 tokens in the default run's log", knob["runs"]["k0_default"]["kv_tokens"] == 9344 and "9,344" in text)
expect("2 GiB / (128 x 229,376) = 73 blocks", 2 * 1024**3 // (128 * 229376) == 73 and 73 * 128 == 9344)
expect("1 GiB = 4,608 tokens", knob["runs"]["kv1_r1"]["kv_tokens"] == 4608 == (1024**3 // (128 * 229376)) * 128)
expect("3 GiB = 13,952 tokens", knob["runs"]["seqs16_r1"]["kv_tokens"] == 13952 == (3 * 1024**3 // (128 * 229376)) * 128)
# Reading s8: test counts
tb = open(os.path.join(HERE, "patch", "tests_baseline.txt")).read()
tp = open(os.path.join(HERE, "patch", "tests_patched.txt")).read()
expect("baseline 373 passed, 1 failed", "1 failed, 373 passed" in tb and "373 passed, 1 failed" in text)
expect("patched 374 passed", "374 passed" in tp and "374 passed" in text)
expect("AttributeError in baseline", "no attribute 'evicted_blocks'" in tb)
diff = open(os.path.join(HERE, "patch", "eviction_metric.diff")).read()
add = sum(1 for l in diff.splitlines() if l.startswith("+") and not l.startswith("+++"))
rem = sum(1 for l in diff.splitlines() if l.startswith("-") and not l.startswith("---"))
expect(f"diff 57 added 1 removed (got {add}, {rem})", add == 57 and rem == 1 and "57 lines added, 1 removed" in text)
# Knob lab statements written as text
expect("no preemptions in any kv/seqs run", all(knob["runs"][t]["deltas"]["vllm:num_preemptions_total"] == 0 for t in knob["runs"]))
expect("3.45/9.72 GiB refusal", "3.45/9.72 GiB" in open(os.path.join(HERE, "knob", "results", "kv4_refused.txt")).read())
# process list: API server, EngineCore, Worker
ps = " ".join(knob["ps_k0_default"])
expect("three vLLM processes", "vllm serve" in ps and "VLLM::EngineCore" in ps and "VLLM::Worker" in ps)
expect("MRV2 fallback line in the CPU log", any("Model Runner V2 requires Triton" in l for l in knob["log_k0_default"]))
# stepper summaries recomputed
for r in step["runs"]:
    s = r["sum"]
    tok = sum(sum(st["tok"].values()) for st in r["steps"])
    expect(f"{r['key']} tokens", tok == s["tokens_computed"])
print("checks failed:", len(fails))
for f in fails:
    print("  ", f)
raise SystemExit(1 if fails else 0)
