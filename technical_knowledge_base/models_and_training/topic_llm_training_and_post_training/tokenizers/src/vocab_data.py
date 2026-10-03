# Vocabulary size, width and tying for open models, read from each model's config.json on Hugging Face,
# plus the repository's creation date and parameter count from the Hugging Face API. Stdlib only.
# Run from src/:  python3 vocab_data.py   (writes inputs/configs.json; fetched 2026-10-03)
# A mirror is used where the official repository is gated; the mirror is named in the row.
import json, urllib.request, sys

# (label, repo, family, algorithm note)
MODELS = [
    ('BERT-base', 'google-bert/bert-base-uncased', 'BERT', 'WordPiece'),
    ('GPT-2', 'openai-community/gpt2', 'GPT-2', 'byte-level BPE'),
    ('T5-base', 'google-t5/t5-base', 'T5', 'SentencePiece Unigram'),
    ('LLaMA 7B', 'huggyllama/llama-7b', 'Llama', 'SentencePiece BPE'),
    ('Llama 2 7B', 'NousResearch/Llama-2-7b-hf', 'Llama', 'SentencePiece BPE'),
    ('Mistral 7B', 'mistralai/Mistral-7B-v0.1', 'Mistral', 'SentencePiece BPE'),
    ('Qwen-7B', 'Qwen/Qwen-7B', 'Qwen', 'byte-level BPE (tiktoken)'),
    ('Gemma 7B', 'unsloth/gemma-7b', 'Gemma', 'SentencePiece BPE'),
    ('Llama 3 8B', 'NousResearch/Meta-Llama-3-8B', 'Llama', 'byte-level BPE (tiktoken)'),
    ('DeepSeek-V2', 'deepseek-ai/DeepSeek-V2', 'DeepSeek', 'byte-level BPE'),
    ('Mistral NeMo', 'mistralai/Mistral-Nemo-Base-2407', 'Mistral', 'Tekken (tiktoken)'),
    ('SmolLM2-135M', 'HuggingFaceTB/SmolLM2-135M', 'SmolLM', 'byte-level BPE'),
    ('Llama 3.2 1B', 'unsloth/Llama-3.2-1B', 'Llama', 'byte-level BPE (tiktoken)'),
    ('DeepSeek-V3', 'deepseek-ai/DeepSeek-V3', 'DeepSeek', 'byte-level BPE'),
    ('Gemma 3 270M', 'unsloth/gemma-3-270m', 'Gemma', 'SentencePiece BPE'),
    ('Gemma 3 1B', 'unsloth/gemma-3-1b-pt', 'Gemma', 'SentencePiece BPE'),
    ('Gemma 3 27B', 'unsloth/gemma-3-27b-pt', 'Gemma', 'SentencePiece BPE'),
    ('Llama 4 Scout', 'unsloth/Llama-4-Scout-17B-16E-Instruct', 'Llama', 'byte-level BPE (tiktoken)'),
    ('Qwen3-0.6B', 'Qwen/Qwen3-0.6B', 'Qwen', 'byte-level BPE'),
    ('Qwen3-235B-A22B', 'Qwen/Qwen3-235B-A22B', 'Qwen', 'byte-level BPE'),
    ('Kimi K2', 'moonshotai/Kimi-K2-Instruct', 'Kimi', 'byte-level BPE (tiktoken)'),
    ('gpt-oss-20b', 'openai/gpt-oss-20b', 'gpt-oss', 'o200k_harmony (tiktoken)'),
    ('Olmo 3 7B', 'allenai/Olmo-3-1025-7B', 'Olmo', 'byte-level BPE'),
    ('MiniMax-M2', 'MiniMaxAI/MiniMax-M2', 'MiniMax', 'byte-level BPE'),
    ('Mistral Large 3', 'mistralai/Mistral-Large-3-675B-Instruct-2512', 'Mistral', 'Tekken (tiktoken)'),
    ('Qwen3.5-0.8B', 'Qwen/Qwen3.5-0.8B', 'Qwen', 'byte-level BPE'),
    ('Qwen3.5-9B', 'Qwen/Qwen3.5-9B', 'Qwen', 'byte-level BPE'),
    ('Gemma 4 E2B', 'google/gemma-4-E2B-it', 'Gemma', 'SentencePiece BPE'),
    ('Gemma 4 31B', 'google/gemma-4-31B-it', 'Gemma', 'SentencePiece BPE'),
    ('DeepSeek-V4-Flash', 'deepseek-ai/DeepSeek-V4-Flash', 'DeepSeek', 'byte-level BPE'),
    ('Kimi K2.6', 'moonshotai/Kimi-K2.6', 'Kimi', 'byte-level BPE (tiktoken)'),
    ('GLM-5.3', 'zai-org/GLM-5.3', 'GLM', 'byte-level BPE'),
]

def get(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'kb-vocab/1.0'})
    with urllib.request.urlopen(req, timeout=60) as r: return json.load(r)

def find(cfg, key):
    if key in cfg: return cfg[key]
    for sub in ('text_config', 'language_config', 'llm_config'):
        if isinstance(cfg.get(sub), dict) and key in cfg[sub]: return cfg[sub][key]
    return None

rows = []
for label, repo, fam, alg in MODELS:
    try:
        cfg = get(f'https://huggingface.co/{repo}/resolve/main/config.json')
        api = get(f'https://huggingface.co/api/models/{repo}')
    except Exception as e:
        print('FAIL', repo, e, file=sys.stderr); continue
    V = find(cfg, 'vocab_size'); d = find(cfg, 'hidden_size') or find(cfg, 'd_model') or find(cfg, 'n_embd')
    tie = find(cfg, 'tie_word_embeddings')
    if tie is None: tie = cfg.get('tie_word_embeddings')
    st = (api.get('safetensors') or {}).get('total')
    rows.append({'label': label, 'repo': repo, 'family': fam, 'alg': alg, 'V': V, 'd': d, 'tie': tie,
                 'model_type': cfg.get('model_type'), 'params': st, 'created': (api.get('createdAt') or '')[:10]})
    print(label, V, d, tie, st, rows[-1]['created'], file=sys.stderr)
json.dump({'fetched': '2026-10-03', 'rows': rows}, open('inputs/configs.json', 'w'), indent=0)
