# Parameter counts of seven open video denoisers from their configs (meta device, no weights), and one FLOP count
# on meta tensors to check the page's formula: FLOPs per pass = 2 * P * N + 4 * L * N^2 * D (self-attention scores and values).
# usage: GM_SCRATCH=... nice -n 15 $GM_SCRATCH/venv/bin/python -I count_meta.py <inputs dir> <out json>
import sys, json, glob, os, torch, diffusers
from torch.utils.flop_counter import FlopCounterMode
IN, OUT = sys.argv[1], sys.argv[2]
res = {'diffusers': diffusers.__version__, 'params': {}}
for f in sorted(glob.glob(f'{IN}/vcfg_*_transformer.json')):
    cfg = json.load(open(f)); cls = getattr(diffusers, cfg['_class_name'])
    with torch.device('meta'):
        m = cls.from_config({k: v for k, v in cfg.items() if not k.startswith('_')})
    n = sum(p.numel() for p in m.parameters())
    res['params'][os.path.basename(f)[5:-17]] = n; print(os.path.basename(f), n, flush=True)
# FLOP check: Wan 2.1 1.3B at its pipeline default (480 x 832, 81 frames): latent 16 x 21 x 60 x 104, 512 text tokens
cfg = json.load(open(f'{IN}/vcfg_Wan-AI_Wan2.1-T2V-1.3B-Diffusers_transformer.json'))
with torch.device('meta'):
    m = diffusers.WanTransformer3DModel.from_config({k: v for k, v in cfg.items() if not k.startswith('_')}).to(torch.bfloat16)
    x = torch.empty(1, 16, 21, 60, 104, dtype=torch.bfloat16); t = torch.empty(1, dtype=torch.long); txt = torch.empty(1, 512, 4096, dtype=torch.bfloat16)
    fc = FlopCounterMode(display=False)
    with fc, torch.no_grad():
        m(hidden_states=x, timestep=t, encoder_hidden_states=txt, return_dict=False)
tot = fc.get_total_flops(); per = {str(k): int(v) for k, v in fc.get_flop_counts()['Global'].items()}
N = 21 * 30 * 52; P = res['params']['Wan-AI_Wan2.1-T2V-1.3B-Diffusers']; L, Dm = 30, 1536
res['flop_check'] = {'model': 'Wan2.1-T2V-1.3B', 'tokens': N, 'counted': int(tot), 'by_op': per,
                     'formula': int(2 * P * N + 4 * L * N * N * Dm), 'formula_terms': {'linear': int(2 * P * N), 'attention': int(4 * L * N * N * Dm)}}
print(res['flop_check'])
json.dump(res, open(OUT, 'w'), indent=1)
