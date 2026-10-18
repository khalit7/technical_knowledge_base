"""What 2026 open models' tokenizers are, read from their own files (tokenizers 0.23.3, offline from the HF cache):
entries, the digit rule and whitespace handling seen on probe strings, characters per token on the same sentences,
and how much of each vocabulary is shared with its predecessor. Kimi K3 (tiktoken format) is read from
tiktoken.model and the pattern in tokenization_kimi.py. Run: HF_HUB_OFFLINE=1 <venv>/bin/python analyze.py -> ../out/tok2026.json
"""
import json, os, glob, base64
from tokenizers import Tokenizer
from huggingface_hub import hf_hub_download
import regex
HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "..", "src", "data"))
EX = json.load(open(os.path.join(HERE, "..", "inputs", "examples.json")))
RUN = json.load(open(os.path.join(DATA, "running_sequence.json")))["text"]
FET = {r["repo"]: r for r in json.load(open(os.path.join(HERE, "fetched.json"))) if r.get("info")}
TOK = [  # key, label, repo (tokenizer.json in the HF cache), predecessor key
    ("llama3", "Llama 3 / 3.1", "NousResearch/Meta-Llama-3-8B", None),
    ("smollm3", "SmolLM3", "HuggingFaceTB/SmolLM3-3B-Base", "llama3"),
    ("llama4", "Llama 4", "unsloth/Llama-4-Scout-17B-16E-Instruct", "llama3"),
    ("qwen3", "Qwen3", "Qwen/Qwen3-0.6B", None),
    ("qwen35s", "Qwen3.5 (0.8B)", "Qwen/Qwen3.5-0.8B", "qwen3"),
    ("qwen35", "Qwen3.5-397B-A17B", "Qwen/Qwen3.5-397B-A17B", "qwen35s"),
    ("dsv3", "DeepSeek-V3", "deepseek-ai/DeepSeek-V3", None),
    ("dsv4f", "DeepSeek-V4-Flash", "deepseek-ai/DeepSeek-V4-Flash", "dsv3"),
    ("dsv4p", "DeepSeek-V4-Pro", "deepseek-ai/DeepSeek-V4-Pro", "dsv4f"),
    ("gemma3", "Gemma 3", "unsloth/gemma-3-1b-it", None),
    ("gemma4s", "Gemma 4 (E2B)", "google/gemma-4-E2B-it", "gemma3"),
    ("gemma4", "Gemma 4 31B", "google/gemma-4-31B-it", "gemma4s"),
    ("glm5", "GLM-5", "zai-org/GLM-5", None),
    ("glm53", "GLM-5.3", "zai-org/GLM-5.3", "glm5"),
    ("mm2", "MiniMax-M2", "MiniMaxAI/MiniMax-M2", None),
    ("mm3", "MiniMax-M3", "MiniMaxAI/MiniMax-M3", "mm2"),
    ("olmo2", "OLMo 2", "allenai/OLMo-2-0425-1B", None),
    ("olmo3", "Olmo 3", "allenai/Olmo-3-32B-Think", "olmo2"),
    ("nem3", "Nemotron 3 Super", "nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16", None),
]
PROBE = {"digits": "12345678", "year": "In 2026,", "indent": "        return total", "han": EX["langs"]["zho_Hans"]["text"]}
SENT = {"english": EX["langs"]["eng_Latn"]["text"], "running": RUN, "chinese": EX["langs"]["zho_Hans"]["text"],
        "hindi": EX["langs"]["hin_Deva"]["text"], "code": EX["code"]["text"]}
out = {"rows": [], "probe": PROBE, "sent": {k: len(v) for k, v in SENT.items()}}
vocabs = {}
for key, label, repo, pred in TOK:
    p = hf_hub_download(repo, "tokenizer.json", local_files_only=True, revision=FET.get(repo, {}).get("revision"))
    t = Tokenizer.from_file(p); J = json.load(open(p))
    vocabs[key] = set(t.get_vocab(with_added_tokens=False))
    model = J["model"]["type"]; byte_fb = J["model"].get("byte_fallback", False)
    pre = json.dumps(J.get("pre_tokenizer")); norm = json.dumps(J.get("normalizer"))
    r = {"key": key, "label": label, "repo": repo, "revision": FET.get(repo, {}).get("revision"), "created": FET.get(repo, {}).get("created"),
         "model": model, "byte_fallback": byte_fb, "bytelevel": "ByteLevel" in pre, "nfc": "NFC" in norm,
         "entries": t.get_vocab_size(with_added_tokens=True), "ordinary": t.get_vocab_size(with_added_tokens=False),
         "digit_rule": "1-3 from the left" if "\\\\p{N}{1,3}" in pre else ("single digits" if ("\\\\p{N}|" in pre or "individual_digits\": true" in pre or "Digits" in pre) else "see probe"),
         "pred": pred}
    v = t.get_vocab(with_added_tokens=False)
    r["n3digit_tokens"] = sum(1 for i in range(1000) if f"{i:03d}" in v or f"\u2581{i:03d}" in v)
    r["n2digit_tokens"] = sum(1 for i in range(100) if f"{i:02d}" in v)
    r["digit_rule"] = "single digits" if all(len(x) == 1 for x in [t.decode([i]) for i in t.encode(PROBE["digits"], add_special_tokens=False).ids]) else "runs of up to 3, from the left"
    for k, s in PROBE.items():
        e = t.encode(s, add_special_tokens=False); r["probe_" + k] = [t.decode([i]) for i in e.ids]
    for k, s in SENT.items():
        n = len(t.encode(s, add_special_tokens=False).ids); r["n_" + k] = n
    if pred:
        a, b = vocabs[key], vocabs[pred]; r["shared_with_pred"] = len(a & b); r["pred_size"] = len(b)
    out["rows"].append(r)
    print(f'{label:20s} {model} entries={r["entries"]} ordinary={r["ordinary"]} bl={r["bytelevel"]} fb={byte_fb} nfc={r["nfc"]} digits={r["probe_digits"]} n3={r["n3digit_tokens"]} indent={r["probe_indent"]} shared={r.get("shared_with_pred")} en={r["n_english"]} run={r["n_running"]} zh={r["n_chinese"]} hi={r["n_hindi"]} code={r["n_code"]}')
# Kimi K3: tiktoken file of base64 token and rank per line, plus 256 reserved special ids (tokenization_kimi.py)
kd = glob.glob(os.path.expanduser("~/.cache/huggingface/hub/models--moonshotai--Kimi-K3/snapshots/*/"))[0]
lines = [l.split() for l in open(kd + "tiktoken.model") if l.strip()]
src = open(kd + "tokenization_kimi.py").read()
pat_lines = src[src.index("pat_str = \"|\".join(["):].split("])")[0].split("\n")[1:]
pat = "|".join(l.strip().rstrip(",")[4:-3] for l in pat_lines if l.strip().startswith('r"""'))
rx = regex.compile(pat, flags=regex.V1)
out["kimi_k3"] = {"repo": "moonshotai/Kimi-K3", "revision": FET["moonshotai/Kimi-K3"]["revision"], "created": FET["moonshotai/Kimi-K3"]["created"],
                  "ordinary": len(lines), "reserved_special": 256, "entries": len(lines) + 256,
                  "pattern": pat, "pre_digits": rx.findall(PROBE["digits"]), "pre_han": rx.findall(PROBE["han"])[:6]}
print("kimi", out["kimi_k3"]["ordinary"], out["kimi_k3"]["entries"], out["kimi_k3"]["pre_digits"], out["kimi_k3"]["pre_han"])
json.dump(out, open(os.path.join(HERE, "..", "out", "tok2026.json"), "w"), indent=1, ensure_ascii=False)
