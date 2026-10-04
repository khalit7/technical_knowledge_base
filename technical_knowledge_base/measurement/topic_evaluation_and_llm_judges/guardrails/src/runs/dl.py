from huggingface_hub import snapshot_download
for m in ['Qwen/Qwen3Guard-Gen-0.6B','protectai/deberta-v3-base-prompt-injection-v2','Qwen/Qwen3Guard-Stream-0.6B','mistralai/Shieldstral-1.0-3B']:
    try:
        p=snapshot_download(m, allow_patterns=['*.json','*.safetensors','*.txt','*.model','*.py','*.md','tekken*','*.jinja'])
        print('OK',m,p,flush=True)
    except Exception as e: print('ERR',m,e,flush=True)
from huggingface_hub import hf_hub_download
