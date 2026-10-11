"""Write K random LoRA adapters for Qwen3-0.6B in the PEFT layout (adapter_config.json + adapter_model.safetensors).

They are for measuring serving cost only: rank 16 on q, k, v, o projections of all 28 layers, A ~ N(0, 1/d),
B ~ N(0, 0.02) (non-zero, so each adapter changes the output), seeds 1..K. No training: their outputs are not
better than the base model's, only different. Needs torch and safetensors.
usage: python make_loras.py <Qwen3-0.6B dir> <out dir> <K>
"""
import json, os, sys
import torch
from safetensors.torch import save_file

src, out, K = sys.argv[1], sys.argv[2], int(sys.argv[3])
cfg = json.load(open(os.path.join(src, 'config.json')))
L, d, nh, nkv, hd = cfg['num_hidden_layers'], cfg['hidden_size'], cfg['num_attention_heads'], cfg['num_key_value_heads'], cfg['head_dim']
shapes = {'q_proj': (nh * hd, d), 'k_proj': (nkv * hd, d), 'v_proj': (nkv * hd, d), 'o_proj': (d, nh * hd)}
r = 16
for k in range(1, K + 1):
    g = torch.Generator().manual_seed(k)
    t = {}
    for l in range(L):
        for m, (o, i) in shapes.items():
            p = f'base_model.model.model.layers.{l}.self_attn.{m}'
            t[p + '.lora_A.weight'] = (torch.randn(r, i, generator=g) / i ** 0.5).contiguous()
            t[p + '.lora_B.weight'] = (torch.randn(o, r, generator=g) * 0.02).contiguous()
    dst = os.path.join(out, f'lora{k}')
    os.makedirs(dst, exist_ok=True)
    save_file(t, os.path.join(dst, 'adapter_model.safetensors'))
    json.dump({'base_model_name_or_path': 'Qwen/Qwen3-0.6B', 'peft_type': 'LORA', 'task_type': 'CAUSAL_LM', 'r': r, 'lora_alpha': 32,
               'lora_dropout': 0.0, 'bias': 'none', 'target_modules': list(shapes), 'fan_in_fan_out': False, 'inference_mode': True},
              open(os.path.join(dst, 'adapter_config.json'), 'w'), indent=1)
    print(dst, sum(v.numel() for v in t.values()), 'parameters')
