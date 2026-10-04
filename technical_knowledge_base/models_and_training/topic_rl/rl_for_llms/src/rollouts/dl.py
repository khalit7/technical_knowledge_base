from huggingface_hub import snapshot_download
for r in ["Qwen/Qwen2.5-0.5B-Instruct","Qwen/Qwen2.5-0.5B","Skywork/Skywork-Reward-V2-Qwen3-0.6B"]:
    try:
        p=snapshot_download(r, allow_patterns=["*.json","*.safetensors","*.txt","*.model","*.jinja","merges.txt","vocab.json"]); print("OK",r,p,flush=True)
    except Exception as e: print("FAIL",r,e,flush=True)
