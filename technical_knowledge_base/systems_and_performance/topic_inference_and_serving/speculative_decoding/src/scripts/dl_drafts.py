"""Download the Qwen3-4B drafts, and the target's config and tokenizer files (all the converter reads from
--target-model-dir for these drafts), at pinned revisions.
usage: HF_HOME=<scratch>/hf python dl_drafts.py <models dir>"""
import os, sys
from huggingface_hub import snapshot_download
M = sys.argv[1]
for repo, rev, pat in [("AngelSlim/Qwen3-4B_eagle3", "fd331e59626c8e95c392381a16ee59d518727fbb", None),
                       ("z-lab/Qwen3-4B-DFlash-b16", "b74e3a329c4d963783143b1e970d95b002be72bd", ["config.json", "model.safetensors", "README.md", "*.py"]),
                       ("deepseek-ai/dspark_qwen3_4b_block7", "3457dff1417cb84927f6098a5fcb7cee85c934b7", None),
                       ("Qwen/Qwen3-4B", "1cfa9a7208912126459214e8b04321603b3df60c", ["config.json", "generation_config.json", "tokenizer.json", "tokenizer_config.json", "vocab.json", "merges.txt"])]:
    d = os.path.join(M, "hf", repo.split("/")[1])
    snapshot_download(repo, revision=rev, local_dir=d, allow_patterns=pat)
    print("done", repo, flush=True)
