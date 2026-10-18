"""Write parts/22_js_tk_2new.js (window.TKN) from the recorded outputs in out/ and the root's tokenizer.json.
Stdlib only; run by build.sh. Do not edit the output by hand.
"""
import json, os, re
HERE = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(HERE, "out")
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "src", "data"))
L = lambda n: json.load(open(os.path.join(OUT, n)))
bi = L("bpe_inspect.json"); sw = L("bpe_sweep.json"); fg = L("freq_glitch.json")
J = json.load(open(os.path.join(DATA, "tokenizer.json")))
vocab = J["model"]["vocab"]; inv = {v: k for k, v in vocab.items()}
def b2u():
    bs = list(range(33, 127)) + list(range(161, 173)) + list(range(174, 256)); cs = bs[:]; n = 0
    for b in range(256):
        if b not in bs: bs.append(b); cs.append(256 + n); n += 1
    return {chr(c): b for b, c in zip(bs, cs)}
U2B = b2u()
# byte value of each byte id (1..256), and each id's bytes as hex (for exact display of partial UTF-8)
byte_of = [None] * 257
for i in range(1, 257): byte_of[i] = U2B[inv[i]]
hexs = [""] + ["".join("%02x" % U2B[c] for c in inv[i]) for i in range(1, len(inv))]
merges = [[vocab[a], vocab[b]] for a, b in (m.split(" ") if isinstance(m, str) else m for m in J["model"]["merges"])]
assert all(vocab[inv[257 + r]] == 257 + r for r in range(len(merges)))
T = {"bpe": {"sha": bi["sha256"][:8], "n_merges": bi["n_merges"], "merges": merges, "byteOf": byte_of, "hex": hexs,
             "first": bi["first_merges"][:30], "hist": bi["token_bytes_hist"], "longest": bi["longest"][:10],
             "run": {k: bi["running"][k] for k in ("text", "chars", "bytes", "words", "n_tokens", "shattered")}},
     "compare": {k: {kk: vv for kk, vv in v.items()} for k, v in bi["compare"].items()},
     "sweep": [{k: r[k] for k in ("V_target", "V", "merges", "train_seconds", "val_tokens", "val_chars_per_token", "running_tokens", "emb_params", "emb_share", "same_as_committed")} for r in sw["runs"]],
     "sweepMeta": {"val_chars": sw["val_chars"], "train_stories": sw["train_stories"], "prefix": all(sw["prefix_check"].values()), "nonemb": 4721920},
     "freq": {"count": fg["count"], "norm": fg["norm"], "n_zero": fg["n_zero"], "n_byte_zero": fg["n_byte_tokens_zero"],
              "median_norm": round(fg["median_norm"], 3), "cos_zero": fg["cos_within_zero"], "cos_common": fg["cos_within_200_common"],
              "buckets": fg["buckets"], "probe": fg["probe"], "zero_merges": [z["piece"] for z in fg["zero"] if z["id"] > 256],
              "train_tokens": fg["train_tokens"], "spearman": fg["spearman_freq_norm"]}}
def opt(name):
    p = os.path.join(OUT, name); return json.load(open(p)) if os.path.exists(p) else None
def digacc(R):
    s = t = 0
    for r in R:
        w = r["want"].replace(",", ""); g = r["got"].replace(",", ""); t += len(w)
        if g.isdigit(): s += sum(1 for a, b in zip(w[::-1], g[::-1]) if a == b)
    return round(s / t, 3)
ar = {}
for k in ("olmo", "qwen"):
    d = opt(f"arith_{k}.json")
    if d: ar[k] = {"model": d["model"], "revision": d["revision"], "n": d["n"], "seconds": d["seconds"],
                   **{st: {"acc": v["acc"], "dig": digacc(v["rows"]), "rows": [[r["a"], r["b"], r["want"], r["got"]] for r in v["rows"]], "pieces": [r["pieces"] for r in v["rows"][:3]]} for st, v in d["styles"].items()}}
T["arith"] = ar
sl = opt("space_letters.json")
if sl: T["space"] = {"smollm2": sl["space_smollm2"]["rows"], "tiny": sl["space_tiny"]["rows"]}
lt = opt("letters.json")
if lt: T["letters"] = {k: lt[k] for k in ("model", "revision", "rows", "acc_word", "acc_spelled", "example_prompt")}
t26 = L("tok2026.json")
T["t26"] = {"rows": [{k: r.get(k) for k in ("key", "label", "repo", "revision", "created", "bytelevel", "byte_fallback", "nfc", "entries", "ordinary", "digit_rule",
                                             "probe_digits", "probe_indent", "n_english", "n_running", "n_chinese", "n_hindi", "n_code", "pred", "shared_with_pred", "pred_size", "n3digit_tokens")} for r in t26["rows"]],
            "kimi": t26["kimi_k3"], "sent": t26["sent"]}
T["calc"] = L("calc_embed.json")["rows"]
T["snip"] = L("snippets.json"); T["quotes"] = L("quotes.json")
# config vocab sizes for the 2026 table (root map inputs)
MAP = os.path.normpath(os.path.join(HERE, "..", "..", "src", "map", "inputs", "configs"))
cfgv = {}
for f in os.listdir(MAP):
    c = json.load(open(os.path.join(MAP, f))); tc = c.get("text_config") or {}
    cfgv[f[:-5]] = c.get("vocab_size") or tc.get("vocab_size")
CF = {"llama3": "unsloth__llama-3-8b", "smollm3": "HuggingFaceTB__SmolLM3-3B-Base", "llama4": "unsloth__Llama-4-Maverick-17B-128E-Instruct",
      "qwen3": "Qwen__Qwen3-32B", "qwen35": "Qwen__Qwen3.5-397B-A17B", "dsv3": "deepseek-ai__DeepSeek-V3", "dsv4p": "deepseek-ai__DeepSeek-V4-Pro",
      "gemma4": "google__gemma-4-31B-it", "glm5": "zai-org__GLM-5", "mm2": "MiniMaxAI__MiniMax-M2", "mm3": "MiniMaxAI__MiniMax-M3",
      "olmo3": "allenai__Olmo-3-32B-Think", "olmo2": "allenai__OLMo-2-1124-7B-Instruct", "nem3": "nvidia__NVIDIA-Nemotron-3-Super-120B-A12B-BF16"}
OLD = {r["repo"]: r["V"] for r in json.load(open(os.path.join(HERE, "inputs", "configs.json")))["rows"]} if isinstance(json.load(open(os.path.join(HERE, "inputs", "configs.json"))), dict) else {}
for r in T["t26"]["rows"]:
    if r["key"] in CF: r["cfgV"] = cfgv[CF[r["key"]]]; r["cfgSrc"] = "root map config " + CF[r["key"]].replace("__", "/")
    elif r["repo"] == "unsloth/gemma-3-1b-it": r["cfgV"] = OLD["unsloth/gemma-3-1b-pt"]; r["cfgSrc"] = "config.json of unsloth/gemma-3-1b-pt (inputs/configs.json, 2026-10-03)"
    elif r["repo"] in OLD: r["cfgV"] = OLD[r["repo"]]; r["cfgSrc"] = "config.json (inputs/configs.json, 2026-10-03)"
T["t26"]["kimi"]["cfgV"] = cfgv["moonshotai__Kimi-K3"]
# the pipeline sentence: pre-tokens and, inside each, the merges applied in rank order
from_sn = T["snip"]["encode"]["stdout"].split("\n")
sent = "Roxy loved to climb the icy hill."
PAT = re.compile(r"""'s|'t|'re|'ve|'m|'ll|'d| ?[A-Za-z]+| ?[0-9]+| ?[^\sA-Za-z0-9]+|\s+(?!\S)|\s+""")
id_of_byte = {b: i for i, b in enumerate(byte_of) if b is not None}
rank = {(a, b): r for r, (a, b) in enumerate(merges)}
pipe = []
for w in PAT.findall(sent):
    syms = [id_of_byte[b] for b in w.encode()]; trace = [list(syms)]; ranks = []
    while True:
        best = None
        for i in range(len(syms) - 1):
            r = rank.get((syms[i], syms[i + 1]))
            if r is not None and (best is None or r < best[0]): best = (r, i)
        if not best: break
        r, i = best; syms = syms[:i] + [257 + r] + syms[i + 2:]; trace.append(list(syms)); ranks.append(r + 1)
    pipe.append({"w": w, "bytes": list(w.encode()), "trace": trace, "ranks": ranks})
T["pipe"] = {"sentence": sent, "words": pipe, "ids_from_library": json.loads(from_sn[0])}
assert [t for p in pipe for t in p["trace"][-1]] == T["pipe"]["ids_from_library"], "pipeline merge replay differs from the library"
js = "// written by src/make_page_data.py from src/out/*.json and the root's tokenizer.json; do not edit by hand\nwindow.TKN=" + json.dumps(T, ensure_ascii=False, separators=(",", ":")) + ";\n"
open(os.path.join(HERE, "parts", "22_js_tk_2new.js"), "w").write(js)
print("22_js_tk_2new.js", len(js.encode()), "bytes; arith", list(ar), "space/letters", bool(sl))
