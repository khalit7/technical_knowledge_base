# Vocabulary overlap between tokenizer generations quoted on the page (Gemma 4 vs 3, Qwen3.5 vs Qwen3, DeepSeek-V4 vs V3),
# and entry counts. Run from src/: uv run --with tokenizers --with huggingface_hub python overlap.py  (writes inputs/vocab_overlap.json)
import json
from tokenizers import Tokenizer
from huggingface_hub import hf_hub_download
R = {'gemma4': 'google/gemma-4-E2B-it', 'gemma3': 'unsloth/gemma-3-1b-it', 'qwen35': 'Qwen/Qwen3.5-0.8B', 'qwen3': 'Qwen/Qwen3-8B',
     'dsv4': 'deepseek-ai/DeepSeek-V4-Flash', 'dsv3': 'deepseek-ai/DeepSeek-V3', 'llama4': 'unsloth/Llama-4-Scout-17B-16E-Instruct'}
V = {k: Tokenizer.from_file(hf_hub_download(r, 'tokenizer.json')) for k, r in R.items()}
out = {'entries': {k: [t.get_vocab_size(True), t.get_vocab_size(False)] for k, t in V.items()},
       'shared': {a + '_' + b: len(set(V[a].get_vocab()) & set(V[b].get_vocab())) for a, b in [('gemma4', 'gemma3'), ('qwen35', 'qwen3'), ('dsv4', 'dsv3')]},
       'identical': {a + '_' + b: V[a].get_vocab() == V[b].get_vocab() for a, b in [('gemma4', 'gemma3'), ('qwen35', 'qwen3'), ('dsv4', 'dsv3')]},
       'gemma4_digits': V['gemma4'].encode('12345678', add_special_tokens=False).tokens}
json.dump(out, open('inputs/vocab_overlap.json', 'w'), indent=1); print(out)
