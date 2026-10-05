#!/usr/bin/env python3
"""Python reference for every derived number in the Reading tab of Topic: hardware.

Run from anywhere with a plain python3 (stdlib only):
    python3 src/read/recompute.py
Writes src/read/out/expected.json and src/parts/22_js_rd_data.js (the page's data, generated, do not edit).
Inputs: src/read/inputs/llama31_8b_config.json (Hugging Face config, unsloth mirror of the gated Meta repo),
src/roof/out/data.json (the Roofline lab's measurements on the M1 Pro), and vendor figures typed below with
their URLs (all fetched 2026-10-05, the same figures as the build's shared facts file).
"""
import json, os

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.dirname(HERE)
cfg = json.load(open(os.path.join(HERE, 'inputs', 'llama31_8b_config.json')))
roof = json.load(open(os.path.join(SRC, 'roof', 'out', 'data.json')))
case = {c['name']: c for c in roof['cases']}

# ---------- 1. The running example: Llama 3.1 8B, one training step ----------
d, L, V = cfg['hidden_size'], cfg['num_hidden_layers'], cfg['vocab_size']
nh, nkv, hd, ff = cfg['num_attention_heads'], cfg['num_key_value_heads'], cfg['head_dim'], cfg['intermediate_size']
attn = d * nh * hd + 2 * d * nkv * hd + nh * hd * d          # q, k, v, o
mlp = 3 * d * ff                                              # gate, up, down
norms = 2 * d
per_layer = attn + mlp + norms
embed = V * d
head = V * d                                                  # untied (tie_word_embeddings false)
N = L * per_layer + embed + head + d                          # + final norm
N_matmul = L * (attn + mlp) + head                            # weights that take part in a matmul
SEQ, SEQS = 8192, 64
TOK = SEQ * SEQS                                              # tokens in one step (illustrative choice)
flops_6nd = 6 * N * TOK
flops_matmul = 6 * N_matmul * TOK
attn_flops_tok = 6 * 2 * L * SEQ * d * 0.5                    # QK^T and AV, forward+backward, causal half
flops_full = flops_matmul + attn_flops_tok * TOK
bytes_bf16 = 2 * N
states_bytes = 16 * N                                         # bf16 w + bf16 g + fp32 master + Adam m, v

H100 = dict(bf16=989.5e12, bw=3.35e12, mem=80e9, nvlink_dir=450e9, sms=132)
mfu = 0.40
step_1gpu = flops_6nd / (H100['bf16'] * mfu)

# ---------- 2. CPU core vs GPU SM: one 64 x 64 x 64 matmul tile ----------
TILE = 64
tile_fma = TILE ** 3
cpu = roof['cpu']
m1_gpu_peak = case['peak FMA fp32 (custom Metal kernel)']['gf']           # GFLOP/s, whole GPU, measured
units = [
    # name, FMA per cycle (spec), clock GHz, measured GFLOP/s per unit or None, source key
    dict(id='cpu', name='M1 Pro CPU, one performance core', fma=16, ghz=3.2, meas=cpu['p1']['median'],
         src='cpp', how='4 FP/SIMD units x 4 fp32 lanes (NEON, 128-bit); clock 3.2 GHz inferred on the C++ page'),
    dict(id='m1g', name='M1 Pro GPU, one GPU core', fma=128, ghz=1.296, meas=m1_gpu_peak / 16,
         src='turner', how='128 fp32 ALUs per core at 1.296 GHz (metal-benchmarks); measured = whole-GPU FMA peak / 16 cores'),
    dict(id='h100c', name='H100 SXM, one SM, CUDA cores (fp32)', fma=128, ghz=None, meas=None,
         src='hopper', how='128 FP32 CUDA cores per SM'),
    dict(id='h100t', name='H100 SXM, one SM, tensor cores (BF16, dense)', fma=2048, ghz=None, meas=None,
         src='a100wp', how='A100 SM: 1,024 dense FP16 FMA per clock; Hopper SM: 2x the A100 SM rate'),
]
h100_clock = H100['bf16'] / (H100['sms'] * 2048 * 2) / 1e9     # implied by the 989.5 TFLOPS dense figure
for u in units:
    if u['ghz'] is None:
        u['ghz'] = round(h100_clock, 3)
    u['cycles'] = tile_fma / u['fma']
    u['ns'] = u['cycles'] / u['ghz']
    u['gflops_spec'] = 2 * u['fma'] * u['ghz']
    if u['meas']:
        u['fma_meas'] = u['meas'] / 2 / u['ghz']

# ---------- 3. Memory: one decode token of the 8B in bf16 ----------
w_bytes = bytes_bf16
mem = [
    dict(id='m1', name='M1 Pro, LPDDR5 (measured copy)', kind='LPDDR5', bw=case['stream copy (512 MB in, 512 MB out)']['gbs'] * 1e9, cap=16e9, meas=True),
    dict(id='r5090', name='RTX 5090, GDDR7', kind='GDDR7', bw=1792e9, cap=32e9),
    dict(id='h100', name='H100 SXM, HBM3', kind='HBM3', bw=3.35e12, cap=80e9),
    dict(id='b200', name='B200, HBM3e', kind='HBM3e', bw=8e12, cap=180e9),
    dict(id='lpx', name='Groq 3 LPX rack, SRAM only (announced)', kind='SRAM', bw=40e15, cap=128e9, claim_tps=1000),
]
for m in mem:
    m['ms'] = w_bytes / m['bw'] * 1e3
    m['tps'] = 1e3 / m['ms']
    m['fits'] = w_bytes <= m['cap']
# full-memory reads per second (a model that fills memory decodes at most this many tokens/s at batch 1)
reads = [('M1 Pro (measured)', mem[0]['bw'], 16e9), ('RTX 5090', 1792e9, 32e9), ('H100 SXM', 3.35e12, 80e9),
         ('H200', 4.8e12, 141e9), ('B200 (HGX)', 8e12, 180e9), ('MI300X', 5.3e12, 192e9), ('MI355X', 8e12, 288e9),
         ('TPU v6e', 1638e9, 32e9), ('TPU7x Ironwood', 7380e9, 192 * 2**30)]
reads = [dict(name=n, bw=b, cap=c, per_s=b / c) for n, b, c in reads]
m1_b1 = case['y = x W^T, batch 1 (fp16, 8192 x 8192)']
m1_b64 = case['y = x W^T, batch 64 (fp16, 8192 x 8192)']

# ---------- 4. Ridge points (dense, FLOP per byte) ----------
ridge = [('A100 SXM 80GB', 'BF16', 312e12, 2039e9), ('H100 SXM', 'BF16', 989.5e12, 3.35e12),
         ('B200 (HGX)', 'BF16', 2250e12, 8e12), ('B200 (HGX)', 'FP8', 4500e12, 8e12), ('B200 (HGX)', 'FP4', 9000e12, 8e12),
         ('RTX 5090', 'BF16, FP32 accumulate', 209.5e12, 1792e9), ('MI355X', 'BF16', 2516.6e12, 8e12),
         ('TPU7x Ironwood', 'BF16', 2307e12, 7380e9),
         ('M1 Pro GPU (measured)', 'fp16', case['peak FMA fp16 (custom Metal kernel)']['gf'] * 1e9, mem[0]['bw'])]
ridge = [dict(name=n, fmt=f, peak=p, bw=b, ridge=p / b) for n, f, p, b in ridge]

# MFU check (Llama 3 405B, Table 4 row 2): 400 TFLOP/s per GPU against 989.5 dense
mfu_llama = 400e12 / 989.5e12

# ---------- 6. All-reduce of the 8B's bf16 gradients ----------
G = 8
S = bytes_bf16
ring_factor = 2 * (G - 1) / G
links = dict(nvlink=450e9, ib=50e9, pcie=64e9)    # per GPU per direction: NVLink 4 (900 GB/s total), IB NDR 400 Gb/s, PCIe 5.0 x16
ar = {k: ring_factor * S / v for k, v in links.items()}
ar_pcie_2gpu = 2 * (2 - 1) / 2 * S / links['pcie']
step_8gpu = flops_6nd / (8 * H100['bf16'] * mfu)
# tensor parallel (TP = 8) traffic for one 8,192-token sequence: 2 all-reduces forward + 2 backward per layer
act = SEQ * d * 2
tp_n = 4 * L
tp_bytes = tp_n * ring_factor * act
tp_time = {k: tp_bytes / links[k] for k in ('nvlink', 'ib')}
tp_compute = 6 * N * SEQ / (8 * H100['bf16'] * mfu)

# ---------- 7. Scale ladder for B200-class parts (dense BF16) ----------
dgx_kw = 14.3
pue = 1.2                                          # assumption, labelled on the page
gpus_per_gw = 1e9 / (dgx_kw * 1e3 / 8 * pue)
ladder = dict(chip_pf=2.25, node_pf=18, rack_pf=180, rack_gpus=72, gw_gpus=gpus_per_gw, gw_ef=gpus_per_gw * 2.25e15 / 1e18)

# ---------- 9. Peak per dollar-hour (on-demand list prices, fetched 2026-10-05) ----------
price = [('A100 SXM', 312, 2.039, 2.79, 'Lambda'), ('H100 SXM', 989.5, 3.35, 3.99, 'Lambda'), ('B200 SXM', 2250, 8.0, 6.69, 'Lambda'),
         ('TPU v5e', 197, 0.859, 1.20, 'Google Cloud'), ('TPU v6e', 918, 1.638, 2.70, 'Google Cloud'), ('TPU7x Ironwood', 2307, 7.38, 12.00, 'Google Cloud')]
price = [dict(name=n, tf=t, tbs=b, usd=u, who=w, tf_per_usd=t / u, tbs_per_usd=b / u) for n, t, b, u, w in price]
gpu_h_8b = 1.46e6
card_flops = 6 * N * 15e12
implied_mfu_card = card_flops / (gpu_h_8b * 3600 * H100['bf16'])
cost_8b_list = gpu_h_8b * 3.99

FT_TOK = 1e9
ft_flops = 6 * N * FT_TOK
ft = {}
for nm, pk, usd in (('H100 SXM', 989.5e12, 3.99), ('B200 SXM', 2250e12, 6.69)):
    sec = ft_flops / (8 * pk * mfu)
    ft[nm] = dict(sec=sec, hours=sec / 3600, usd=8 * sec / 3600 * usd, price=usd)
out = dict(ft=dict(tokens=FT_TOK, flops=ft_flops, runs=ft),
    model=dict(N=N, N_matmul=N_matmul, embed=embed, per_layer=per_layer, d=d, L=L, V=V, nkv=nkv, ff=ff),
    step=dict(tokens=TOK, seq=SEQ, seqs=SEQS, flops_6nd=flops_6nd, flops_matmul=flops_matmul, flops_full=flops_full,
              attn_share=attn_flops_tok * TOK / flops_matmul, bytes_bf16=bytes_bf16, states=states_bytes,
              step_1gpu=step_1gpu, step_8gpu=step_8gpu, step_64gpu=flops_6nd / (64 * H100['bf16'] * mfu), mfu=mfu),
    tile=dict(n=TILE, fma=tile_fma, units=units, h100_clock=h100_clock),
    mem=mem, reads=reads,
    m1_linear=dict(b1_ms=m1_b1['s'] * 1e3, b1_gbs=m1_b1['gbs'], b64_ms=m1_b64['s'] * 1e3, b64_gf=m1_b64['gf']),
    ridge=ridge, mfu_llama=mfu_llama,
    ar=dict(pcie_2gpu=ar_pcie_2gpu, G=G, S=S, ring_factor=ring_factor, links=links, t=ar, tp_bytes=tp_bytes, tp_time=tp_time, tp_compute=tp_compute, act=act, tp_n=tp_n),
    ladder=ladder, pue=pue, dgx_kw=dgx_kw,
    price=price, card=dict(gpu_h=gpu_h_8b, flops=card_flops, implied_mfu=implied_mfu_card, cost=cost_8b_list),
    m1=dict(gpu_peak=m1_gpu_peak, copy=mem[0]['bw'] / 1e9, cpu_core=cpu['p1']['median'], cpu_8=cpu['p8']['median']),
)
os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(out, open(os.path.join(HERE, 'out', 'expected.json'), 'w'), indent=1)
with open(os.path.join(SRC, 'parts', '22_js_rd_data.js'), 'w') as f:
    f.write('// ---- Reading tab data: generated by src/read/recompute.py, do not edit ----\n')
    f.write('window.RDH=' + json.dumps(out, separators=(',', ':')) + ';\n')

def p(*a): print(*a)
p('N', N, 'N_matmul', N_matmul, 'embed', embed)
p('step tokens', TOK, '6ND %.3e' % flops_6nd, 'matmul-only %.3e' % flops_matmul, 'attn share %.3f' % out['step']['attn_share'])
p('states GB %.1f bf16 GB %.2f' % (states_bytes / 1e9, bytes_bf16 / 1e9))
p('step 1 gpu %.1f s, 8 gpu %.1f s, 64 gpu %.2f s' % (step_1gpu, step_8gpu, out['step']['step_64gpu']))
for u in units: p(u['id'], 'cycles', u['cycles'], 'ns %.0f' % u['ns'], 'GF spec %.1f' % u['gflops_spec'], 'meas', u.get('meas'), u.get('fma_meas'))
p('h100 clock %.4f' % h100_clock)
for m in mem: p(m['id'], 'ms %.4f' % m['ms'], 'tps %.1f' % m['tps'], m['fits'])
for r in reads: p(r['name'], '%.1f' % r['per_s'])
p('m1 linear', out['m1_linear'])
for r in ridge: p(r['name'], r['fmt'], '%.1f' % r['ridge'])
p('mfu llama %.4f' % mfu_llama)
p('allreduce', {k: round(v * 1e3, 1) for k, v in ar.items()}, 'ms')
p('tp bytes GB %.2f' % (tp_bytes / 1e9), {k: round(v * 1e3, 1) for k, v in tp_time.items()}, 'ms; compute %.1f ms' % (tp_compute * 1e3))
p('ladder', ladder)
for r in price: p(r['name'], '%.0f TF/$h' % r['tf_per_usd'], '%.2f TB/s per $h' % r['tbs_per_usd'])
p('card', out['card'])
p('ft', out['ft'])
