"""Fetch the tokenizer.json files used to count tokens (a few MB in total) at pinned revisions.

Corpora report token counts with different tokenizers: FineWeb with GPT-2's, The Pile, Dolma v1 and DCLM with
GPT-NeoX-20B's, OLMo 2 / Dolma 2 with a cl100k-based one, Qwen3 with its own. Counting the same samples with
several of them shows how much "tokens" depends on the tokenizer.
Usage: DC_SCRATCH=<scratch>/dc HF_HOME=$DC_SCRATCH/hf python -I fetch_tokenizers.py <path to local Qwen3 tokenizer.json>
Writes $DC_SCRATCH/data/pc/tokenizers.json {name: path} and tokenizers_manifest.json (repo, revision, sha256).
"""
import hashlib, json, os, sys, shutil
from huggingface_hub import hf_hub_download, HfApi

SCR = os.environ['DC_SCRATCH']
D = os.path.join(SCR, 'data', 'pc', 'tok')
os.makedirs(D, exist_ok=True)
REPOS = {'gpt2': 'openai-community/gpt2', 'neox': 'EleutherAI/gpt-neox-20b', 'olmo2': 'allenai/OLMo-2-1124-7B'}
api = HfApi()
paths, man = {}, {}
for k, repo in REPOS.items():
    rev = api.model_info(repo).sha
    p = hf_hub_download(repo, 'tokenizer.json', revision=rev)
    dst = os.path.join(D, k + '.json')
    shutil.copyfile(p, dst)
    paths[k] = dst
    man[k] = {'repo': repo, 'revision': rev, 'sha256': hashlib.sha256(open(dst, 'rb').read()).hexdigest()}
q = sys.argv[1]
dst = os.path.join(D, 'qwen3.json')
shutil.copyfile(q, dst)
paths['qwen3'] = dst
man['qwen3'] = {'repo': 'Qwen/Qwen3-0.6B (local copy in the shared model store)', 'sha256': hashlib.sha256(open(dst, 'rb').read()).hexdigest()}
json.dump(paths, open(os.path.join(SCR, 'data', 'pc', 'tokenizers.json'), 'w'), indent=1)
json.dump(man, open(os.path.join(SCR, 'data', 'pc', 'tokenizers_manifest.json'), 'w'), indent=1)
print(json.dumps(man, indent=1))
