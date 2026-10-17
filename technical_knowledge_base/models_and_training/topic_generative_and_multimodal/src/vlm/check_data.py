"""The page embeds exactly the recorded outputs, and the numbers written in the VLM lab's prose match them.
    python3 check_data.py        (after make_data.py and build.sh)
"""
import json, os, re, statistics
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "out")
L = lambda n: json.load(open(os.path.join(OUT, n)))
html = open(os.path.join(HERE, "..", "..", "index.html")).read()
m = re.search(r"window\.VL_DATA=(\{.*?\});\n", html); D = json.loads(m.group(1))
tok, tr, tm, qa, pope, cap, sc = (L(n) for n in ("tokens.json", "trace.json", "timing.json", "qa_raw.json", "pope_raw.json", "captions_raw.json", "scores.json"))
bad = []
def ok(c, msg):
    if not c: bad.append(msg)

# 1. embedded data equals recorded outputs
for r in qa["answers"]:
    a = D["qa"]["ans"][r["budget"]][r["id"]]; ok(a[0] == r["answer"] and a[1] == sc["qa"][r["budget"]]["per_id"][r["id"]], "qa " + r["id"])
for b in D["pope"]["budgets"]:
    rs = [r for r in pope["answers"] if r["budget"] == b]; ok([a[0] for a in D["pope"]["ans"][b]] == [r["answer"] for r in rs], "pope " + b)
    ok(D["pope"]["summary"][b]["acc"] == sc["pope"][b]["acc"], "pope acc " + b)
ok([c["text"] for c in D["captions"]] == [r["answer"] for r in cap["answers"]], "captions")
ok([{k: v for k, v in r.items() if k != "lm_prefill_seconds"} for r in D["timing"]["runs"]] == tm["runs"], "timing")
ok(D["trace"]["params"] == tr["params"] and D["trace"]["pca_proj_global"] == tr["pca_proj_global"], "trace")
ok(D["tokens"]["knob"] == tok["knob"] and D["prompt"]["kinds"] == tok["kind_counts"], "tokens")

# 2. prose numbers against the data (text of the VLM tab only)
t = html[html.index('id="t-vlm"'):]; t = t[:t.index('<div class="tab"', 10)] if '<div class="tab"' in t[10:] else t
t = re.sub(r"<[^>]+>", "", t).replace("&#8217;", "'").replace("&#8211;", "-")
q = {b: sc["qa"][b]["right"] for b in sc["qa"]}; Bq = list(q)
p = sc["pope"]; Bp = list(p); dft, one = Bp[1], Bp[0]
R = tm["runs"]
marks = json.load(open(os.path.join(HERE, "captions_marks.json")))
claims = [
    (f"answers {q[Bq[2]]} of 30 at the default budget ({q[Bq[0]]} at 64 tokens)", True),
    (f"says yes to {p[dft]['yes_absent']} of {p[dft]['n_absent']} absent objects", True),
    (f"{q[Bq[2]]} of 30 right at the default 1,088 image tokens, {q[Bq[1]]} at 320, {q[Bq[0]]} at 64", True),
    (f"Median time per answer: {sc['qa'][Bq[0]]['median_seconds']:.2f} s, {sc['qa'][Bq[1]]['median_seconds']:.2f} s and {sc['qa'][Bq[2]]['median_seconds']:.2f} s", True),
    (f"{round(p[dft]['acc'] * 72)} of 72 answers are right ({100 * p[dft]['acc']:.1f}%)", True),
    (f"{round(p[one]['acc'] * 72)} of 72 ({100 * p[one]['acc']:.1f}%), yes to {p[one]['yes_absent']} absent objects", True),
    (f"Random absent objects: {p[dft]['yes']['absent_random'][0]} of {p[dft]['yes']['absent_random'][1]} yes", p[one]["yes"]["absent_random"][0] == 0),
    (f"{sum(len(v) for v in marks.values())} wrong claims in {len(marks)} of the 16 descriptions", True),
    (f"median {statistics.median(r['seconds'] for r in cap['answers']):.1f} s", True),
    (f"encoder and projector take {R[2]['vision_seconds']:.2f} s and the language model's prefill of {R[2]['prompt_tokens']:,} tokens {R[2]['prefill_seconds'] - R[2]['vision_seconds']:.2f} s", True),
    (f"each decoded token then takes {1000 * R[2]['decode_seconds_per_token']:.0f} ms", True),
    (f"the same steps take {R[0]['vision_seconds']:.2f} s and {R[0]['prefill_seconds'] - R[0]['vision_seconds']:.2f} s, and {1000 * R[0]['decode_seconds_per_token']:.0f} ms per token", True),
    (f"Peak GPU memory {min(r['peak_mps_mb'] for r in R):,.0f} to {max(r['peak_mps_mb'] for r in R):,.0f} MiB", True),
    (f"peak GPU memory for this step {tr['peak_mps_mb']:,.0f} MiB", True),
    (f"median length (L2 norm) of {tr['norms']['projected_image_tokens_median']:.0f} (10th to 90th percentile {tr['norms']['projected_image_tokens_p10_p90'][0]:.0f} to {tr['norms']['projected_image_tokens_p10_p90'][1]:.0f})", True),
    (f"median length of {tr['norms']['vocab_embedding_median']:.1f}", True),
    (f"median cosine similarity of {tr['nearest_cos_median']:.2f}", True),
    (f"Model load {tr['load_seconds']:.1f} s", True),
    (f"{tr['params']['vision encoder (SigLIP)']:,}", True), ("1,088 image tokens", tok["square_default"][4]["image_tokens"] == 1088),
    (f"4,538 prompt tokens, of which 4,160 are image tokens and 378", [r for r in tok["knob"] if r["input"] == "512x512" and r["N"] == 8][0]["total_tokens"] == 4538),
    ("832: 1,920", [r for r in tok["aspect_default"] if r["w"] == 1080][0]["image_tokens"] == 832),
]
pv, pp = [round(100 * x) for x in tr["pca_vision_global_var"]], [round(100 * x) for x in tr["pca_proj_global_var"]]
claims.append((f"explain {pv[0]}%, {pv[1]}% and {pv[2]}% of the variance of the encoder vectors and {pp[0]}%, {pp[1]}% and {pp[2]}%", True))
for s, cond in claims:
    ok(s in t and cond, "prose: " + s)
print("checked", len(claims), "prose claims and the embedded data;", "FAIL" if bad else "all match")
for b in bad: print("  ", b)
raise SystemExit(1 if bad else 0)
