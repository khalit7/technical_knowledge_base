import os,sys
from huggingface_hub import snapshot_download
I=sys.argv[1]
N=int(sys.argv[2]) if len(sys.argv)>2 else 9
for repo,sha in [("mlx-community/Qwen3-1.7B-4bit","3b1b1768f8f8cf8351c712464f906e86c2b8269e"),("mlx-community/Qwen3-1.7B-8bit","8c24f6782a91421513803ce527a27dcc560ab904"),("mlx-community/Qwen3-4B-4bit","4dcb3d101c2a062e5c1d4bb173588c54ea6c4d25") ][:N]:
    d=f"{I}/models/mlx/{repo.split('/')[1]}"
    snapshot_download(repo, revision=sha, local_dir=d, max_workers=8); print("got", d, flush=True)
print("MLXDONE")
