import os, sys, json, hashlib
from huggingface_hub import HfApi, hf_hub_download
inf=sys.argv[1]
api=HfApi()
info=api.model_info("Qwen/Qwen3-4B", files_metadata=True)
print("sha", info.sha, flush=True)
out=os.path.join(inf,"models","hf","Qwen3-4B")
for s in info.siblings:
    if s.rfilename.endswith(".safetensors") or s.rfilename=="model.safetensors.index.json":
        p=hf_hub_download("Qwen/Qwen3-4B", s.rfilename, revision=info.sha, local_dir=out)
        h=hashlib.sha256(open(p,'rb').read()).hexdigest() if s.rfilename.endswith('.safetensors') else ''
        up=s.lfs.sha256 if s.lfs else ''
        print(s.rfilename, os.path.getsize(p), h, 'MATCH' if h==up else ('n/a' if not h else 'MISMATCH '+up), flush=True)
