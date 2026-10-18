"""Download the tokenizer files (only) of 2026 open models into the Hugging Face cache and record the revision.
Run under the download lock: HF_HUB_DISABLE_PROGRESS_BARS=1 <venv>/bin/python fetch.py -> fetched.json
"""
import json, os, hashlib
from huggingface_hub import hf_hub_download, HfApi
HERE = os.path.dirname(os.path.abspath(__file__))
WANT = [("deepseek-ai/DeepSeek-V4-Pro", ["tokenizer.json"]),
        ("moonshotai/Kimi-K3", ["tiktoken.model", "tokenization_kimi.py", "tokenizer_config.json"]),
        ("nvidia/NVIDIA-Nemotron-3-Super-120B-A12B-BF16", ["tokenizer.json"]),
        ("google/gemma-4-31B-it", ["tokenizer.json"]),
        ("MiniMaxAI/MiniMax-M3", ["tokenizer.json"]),
        ("allenai/Olmo-3-32B-Think", ["tokenizer.json"]),
        ("zai-org/GLM-5", ["tokenizer.json"]),
        ("Qwen/Qwen3.5-397B-A17B", ["tokenizer.json"]),
        ("HuggingFaceTB/SmolLM3-3B-Base", ["tokenizer.json"])]
api = HfApi(); rec = []
for repo, files in WANT:
    try:
        info = api.model_info(repo); sha = info.sha
        rec.append({"repo": repo, "info": True, "revision": sha, "created": str(info.created_at)[:10]})
    except Exception as e:
        rec.append({"repo": repo, "error": type(e).__name__ + ": " + str(e)[:120]}); print(repo, "ERR", e); continue
    for f in files:
        try:
            p = hf_hub_download(repo, f, revision=sha)
            rec.append({"repo": repo, "file": f, "revision": sha, "bytes": os.path.getsize(p),
                        "sha256": hashlib.sha256(open(p, "rb").read()).hexdigest()})
            print(repo, f, sha[:10], os.path.getsize(p))
        except Exception as e:
            rec.append({"repo": repo, "file": f, "revision": sha, "error": type(e).__name__ + ": " + str(e)[:120]}); print(repo, f, "ERR", str(e)[:100])
json.dump(rec, open(os.path.join(HERE, "fetched.json"), "w"), indent=1)
