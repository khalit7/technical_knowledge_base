"""Check that the built page embeds exactly the recorded data and that numbers written in prose equal the data.
Run from src/ after build.sh: python3 check_data.py   (exit 1 on any failure)
"""
import json, re, sys
html = open("../index.html").read()
text = re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", re.sub(r"<script.*?</script>|<style.*?</style>", " ", html, flags=re.S)))
m = re.search(r"window\.TKN=(\{.*?\});\n", html, flags=re.S); T = json.loads(m.group(1))
L = lambda n: json.load(open("out/" + n))
fails = []
def eq(name, a, b):
    if a != b: fails.append(f"{name}: page {a!r} != recorded {b!r}")
def say(phrase):
    if phrase not in text: fails.append("prose missing: " + phrase)
# embedded data equals recorded data
sw = L("bpe_sweep.json"); eq("sweep", [r["val_tokens"] for r in T["sweep"]], [r["val_tokens"] for r in sw["runs"]])
fg = L("freq_glitch.json"); eq("freq count", T["freq"]["count"], fg["count"]); eq("freq norm", T["freq"]["norm"], fg["norm"])
bi = L("bpe_inspect.json"); eq("merges", T["bpe"]["merges"], bi["merge_pairs"])
ce = L("calc_embed.json"); eq("calc", [(r["key"], r["share_active"]) for r in T["calc"]], [(r["key"], r["share_active"]) for r in ce["rows"]])
t26 = L("tok2026.json"); eq("t26 entries", [r["entries"] for r in T["t26"]["rows"]], [r["entries"] for r in t26["rows"]])
for k in ("olmo", "qwen"):
    try: a = L(f"arith_{k}.json")
    except FileNotFoundError: fails.append("missing arith " + k); continue
    eq("arith " + k, T["arith"][k]["plain"]["acc"], a["styles"]["plain"]["acc"]); eq("arith comma " + k, T["arith"][k]["comma"]["acc"], a["styles"]["comma"]["acc"])
lt = L("letters.json"); eq("letters", (T["letters"]["acc_word"], T["letters"]["acc_spelled"]), (lt["acc_word"], lt["acc_spelled"]))
sl = L("space_letters.json"); eq("space", T["space"]["tiny"][1]["greedy"], sl["space_tiny"]["rows"][1]["greedy"])
nw = sum(r["word_ok"] for r in lt["rows"]); ns = sum(r["spelled_ok"] for r in lt["rows"])
say(f"{nw} of 24 written normally and {ns} of 24 spelled out")
# prose numbers against data
r = bi["running"]; c = bi["compare"]["running"]
say(f'874 characters become {r["n_tokens"]} tokens ({r["chars"]/r["n_tokens"]:.2f} characters per token)')
say(f'needs {c["gpt2"]} tokens for the same text, Llama 3\'s 128,256 entries {c["llama3"]}')
S = {x["V_target"]: x for x in sw["runs"]}
say(f'took {S[4096]["train_seconds"]:.0f} seconds'); say(f'256 bytes give {S[257]["val_chars_per_token"]:.1f}, 4,096 entries {S[4096]["val_chars_per_token"]:.2f}, 16,384 entries {S[16384]["val_chars_per_token"]:.2f}, and the curve stops at {S[65536]["val_chars_per_token"]:.2f}')
say(f'at {S[65536]["V"]:,} entries'); assert all(sw["prefix_check"].values()); assert S[4096]["same_as_committed"]
fl = {V: x["val_tokens"] * 2 * (4721920 + 256 * x["V"]) for V, x in S.items()}; best = min(fl, key=fl.get)
if best not in (2048, 4096): fails.append(f"FLOPs minimum at {best}")
say(f'{fg["n_zero"]} of the 4,096 entries never occur'); say(f'{fg["n_byte_tokens_zero"]} byte tokens'); say(f'{fg["n_zero"]-fg["n_byte_tokens_zero"]} <b>intermediate merges</b>'.replace("<b>", "").replace("</b>", ""))
say(f'cosine similarity {fg["cos_within_zero"]:.3f} with each other, against {fg["cos_within_200_common"]:.3f}')
cc = bi["compare"]["code"]; say(f'costs {cc["ours"]} tokens'); say(f'against {cc["gpt2"]} for GPT-2 and {cc["llama3"]} for Llama 3')
R = {x["key"]: x for x in t26["rows"]}
say(f'{R["gemma4s"]["shared_with_pred"]:,} of Gemma 3'); say(f'shares {R["qwen35s"]["shared_with_pred"]:,} of Qwen3'); say(f'shares {R["llama4"]["shared_with_pred"]:,} with Llama 3')
say(f'only {R["glm5"]["n3digit_tokens"]} of the 1,000'); say(f'Qwen3 {R["qwen3"]["n_hindi"]} to Qwen3.5 {R["qwen35s"]["n_hindi"]} tokens'); say(f'Llama 3 {R["llama3"]["n_hindi"]} to Llama 4 {R["llama4"]["n_hindi"]}')
C = {x["key"]: x for x in ce["rows"]}
p = lambda x: f"{round(100*x)}%"
say(f'tables are {p(C["gpt-oss-20b"]["share_active"])} of the active parameters and the output layer is {p(C["gpt-oss-20b"]["head_flops_per_token"]/C["gpt-oss-20b"]["decode_flops_1"])} of the decode FLOPs')
say(f'(Qwen3-0.6B {p(C["qwen3-0.6b"]["share_total"])}, Llama 3.1 8B {p(C["llama-3.1-8b"]["share_total"])}, Llama 3.1 405B {p(C["llama-3.1-405b"]["share_total"])})')
ao = T["arith"].get("olmo")
if ao: say(f'{p(ao["plain"]["acc"])} exact plain against {p(ao["comma"]["acc"])} with commas, digit accuracy {p(ao["plain"]["dig"])} against {p(ao["comma"]["dig"])}')
for f in fails: print("FAIL", f)
print("check_data:", "ok" if not fails else f"{len(fails)} failures"); sys.exit(1 if fails else 0)
