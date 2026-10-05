"""Fetch GitHub's linguist byte counts per language for ML-stack repositories (anonymous REST API,
GET /repos/{owner}/{repo}/languages). Writes repo_langs.json with the fetch date. Run: python3 fetch.py"""
import json, urllib.request, datetime, pathlib
REPOS = {
 "substrate": ["pytorch/pytorch", "vllm-project/vllm", "sgl-project/sglang", "ggml-org/llama.cpp",
               "NVIDIA/TensorRT-LLM", "microsoft/onnxruntime", "NVIDIA/cutlass", "huggingface/transformers"],
 "python_tooling_rust": ["astral-sh/uv", "astral-sh/ruff", "astral-sh/ty", "huggingface/tokenizers",
               "huggingface/safetensors", "pola-rs/polars", "pydantic/pydantic-core", "huggingface/candle"],
 "llm_apps_agents": ["modelcontextprotocol/typescript-sdk", "modelcontextprotocol/python-sdk", "vercel/ai",
               "google-gemini/gemini-cli", "openai/codex", "openai/openai-agents-js", "anthropics/anthropic-sdk-typescript",
               "langchain-ai/langchainjs"],
}
out = {"fetched_utc": datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z",
       "source": "https://api.github.com/repos/{repo}/languages (GitHub linguist bytes)", "repos": {}}
for group, repos in REPOS.items():
    for r in repos:
        try:
            with urllib.request.urlopen(f"https://api.github.com/repos/{r}/languages", timeout=30) as f:
                langs = json.load(f)
        except Exception as e:
            langs = {"error": str(e)}
        out["repos"][r] = {"group": group, "languages": langs}
        tot = sum(v for v in langs.values() if isinstance(v, int)) or 1
        top = sorted(((v, k) for k, v in langs.items() if isinstance(v, int)), reverse=True)[:4]
        print(f"{r:42s}", ", ".join(f"{k} {100*v/tot:.1f}%" for v, k in top) or langs)
pathlib.Path(__file__).with_name("repo_langs.json").write_text(json.dumps(out, indent=1))
