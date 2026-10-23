"""Every derived number of the parallelism and KV-transfer sections, from the root's Capacity planner model
(../../src/plan/plan.py, which imports the hardware root's calculator unchanged). Pure Python, no packages.
Writes out/calc.json. Run: python3 -I recompute.py
"""
import json, math, os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', '..', 'src', 'plan'))
import plan as PL  # noqa: E402
HW = PL.HW
r = lambda x, d=5: float('%.*g' % (d, x))
out = {}

# ---- the running example: Llama 3.1 70B, FP8 weights, BF16 KV, H200 ----
D = dict(PL.DEFAULT)
m = PL.MODELS['l70']
out['ex'] = dict(model=m['name'], L=m['L'], h=m['h'], nkv=m['nkv'], nh=m['nh'], d=m['dqk'], P=m['P'], kv_tok=HW.kv_per_token(m, 2))

# per token: bytes each scheme moves (activations in BF16, 2 bytes)
h, L = m['h'], m['L']
S = h * 2  # one token's hidden state
tpb = {}
for t in (2, 4, 8):
    per_ar = 2 * (t - 1) / t * S  # ring all-reduce: bytes each GPU sends
    tpb[t] = dict(per_allreduce_sent=r(per_ar), per_layer_sent=r(2 * per_ar), per_token_sent=r(2 * per_ar * L), allreduces=2 * L)
out['tp_bytes'] = tpb
out['pp_bytes'] = dict(per_boundary=S)
# a whole decode step at batch 1 and 64 under TP and PP (planner step(), no overlap of communication)
rows = []
for kind in ('tp', 'pp'):
    for n in (1, 2, 4, 8):
        o = dict(D, **{kind: n})
        s = PL.setup(o)
        for B in ((1, 8, 64) if (kind, n) == ('tp', 1) else (1, 64)):
            st = PL.step(o, s, B, 0)
            rows.append(dict(kind=kind, n=n, B=B, t_ms=r(st['t'] * 1e3), mem_ms=r(st['t_mem'] * 1e3), cmp_ms=r(st['t_cmp'] * 1e3),
                             comm_ms=r(st['t_comm'] * 1e3), ovh_ms=D['tovh'], w_gpu_gb=r(s['w_gpu'] / 1e9), seqs=int(s['bmax'])))
out['steps'] = rows
out['lat_us'] = PL.CHIPS['h200']['lat']  # assumed latency of one small all-reduce on NVLink (planner)
# replicas: the same 8 GPUs as 8 copies; tokens per second per GPU at batch 64
one = PL.step(D, PL.setup(D), 64, 0)['t']
out['dp8_b64_tps'] = r(64 / one * 8)

# ---- expert parallelism: DeepSeek-R1 (V3 architecture) ----
ds = PL.MODELS['dsr1']
k, hd, moeL = ds['k'], ds['h'], ds['moeL']
out['ep'] = dict(k=k, h=hd, moeL=moeL, E=ds['E'], dispatch=k * hd * 1, combine=k * hd * 2, per_layer=k * hd * 3,
                 per_token=k * hd * 3 * moeL, P=ds['P'], Pact=ds['Pact'])

# ---- KV transfer per request ----
LINKS = [('nvl', 'NVLink 4 (H100/H200), one direction', 450e9), ('pcie5', 'PCIe 5.0 x16, one direction', 63e9),
         ('nic400', '400 Gb/s NIC (InfiniBand or RoCE)', 50e9), ('eth100', '100 Gb/s Ethernet', 12.5e9)]
out['links'] = [dict(k=a, name=b, Bps=c) for a, b, c in LINKS]
MODS = ['l8', 'l70', 'l405', 'q235', 'dsr1', 'q17']
kv = []
for mk in MODS:
    mm = PL.MODELS[mk]
    kv.append(dict(k=mk, name=mm['name'], kv_tok=HW.kv_per_token(mm, 2), L=mm['L']))
out['kvmods'] = kv
# prefill time of the running example's prompt on one H200 (planner step with c prompt tokens, no decodes)
pre = {}
s = PL.setup(D)
for P in (500, 1000, 2000, 4000, 8000, 16000, 32000):
    o = dict(D, P=P, share=0)
    so = PL.setup(o)
    left, t = P, 0.0
    while left > 0:  # chunks of the 8,192-token step budget
        c = min(8192, left)
        t += PL.step(o, so, 0, c)['t']
        left -= c
    pre[P] = r(t * 1e3)
out['prefill_ms'] = pre
out['tpot_ms_b64'] = r(one * 1e3)
ex_bytes = 2000 * HW.kv_per_token(m, 2)
out['ex_xfer'] = dict(tokens=2000, bytes=ex_bytes, mib=r(ex_bytes / 2**20), ms={a: r(ex_bytes / c * 1e3) for a, _, c in LINKS})

# the prefill/decode animation: two H200s, 64 users decoding, one new 2,000-token prompt (no shared prefix)
o = dict(D, share=0)
so = PL.setup(o)
st = lambda B, c: r(PL.step(o, so, B, c)['t'] * 1e3)
out['pdanim'] = dict(co_dec=st(32, 0), co_mix=st(32, 2000), co_mix512=st(32, 512), pd_pre=st(0, 2000), pd_dec=st(64, 0), xfer_ms=out['ex_xfer']['ms']['nic400'])

# memory per GPU at TP 1 and TP 2 (section 1's to-scale bars): what the planner's setup() reserves and what is left for cache
mem = {}
for t in (1, 2):
    so = PL.setup(dict(D, tp=t))
    mem[t] = dict(usable_gb=r(so['usable'] / 1e9), w_gb=r(so['w_gpu'] / 1e9), act_gb=r(so['act'] / 1e9), ovh_gb=r(so['ovh'] / 1e9),
                  fixed_gb=r(so['fixed'] / 1e9), pool_gb=r(so['pool'] / 1e9), per_seq_mb=r(so['per_seq'] / 1e6), held=so['held'],
                  seqs=int(so['seqs_kv']), share=D['share'])
out['mem'] = mem

os.makedirs(os.path.join(HERE, 'out'), exist_ok=True)
json.dump(out, open(os.path.join(HERE, 'out', 'calc.json'), 'w'), indent=1)
print(json.dumps(out)[:3000])
