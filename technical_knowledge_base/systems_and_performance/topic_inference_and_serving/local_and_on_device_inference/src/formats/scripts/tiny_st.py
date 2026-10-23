"""The tiny checkpoint of pickle_demo.py (same seed, same two tensors) written as safetensors; records every byte.

Usage: python3 -I tiny_st.py <work dir> <out.json>
"""
import sys, os, json, struct, torch
from safetensors.torch import save_file
work, outp = sys.argv[1], sys.argv[2]
os.makedirs(work, exist_ok=True)
torch.manual_seed(0)
sd = {'layer.weight': torch.randn(2, 3).to(torch.bfloat16), 'layer.bias': torch.zeros(2)}
p = os.path.join(work, 'tiny.safetensors')
save_file(sd, p, metadata={'format': 'pt'})
b = open(p, 'rb').read()
n = struct.unpack('<Q', b[:8])[0]
res = {'bytes': len(b), 'hex': b.hex(), 'header_len': n, 'header': b[8:8 + n].decode(),
       'weight_values': sd['layer.weight'].float().tolist(), 'bias_values': sd['layer.bias'].tolist()}
json.dump(res, open(outp, 'w'), indent=1)
print(res)
