"""Build parts/20_js_mf_data.js (window.MF) from the recorded results in results/.

Usage (from src/formats/): python3 gen_data.py
Every number the page shows from a run comes from here; check_data.py checks the built page against results/.
Tensor names are shortened for size: 'model.layers.' is written '~' and expanded by the page.
"""
import json, re, statistics as st, os

R = 'results/'
J = lambda f: json.load(open(R + f))


def lines(f):
    return [l.strip() for l in open(R + f) if l.strip() and not l.startswith('#')]


def kv(line):
    return dict(x.split('=', 1) for x in line.split() if '=' in x)


S = J('st.json'); G = J('gg.json')
short = lambda n: n.replace('model.layers.', '~')
MF = {}
# safetensors files
MF['st'] = {}
for k in ('hf06', 'hf17a', 'hf17b', 'mlx4', 'mlx8', 'mlxbf'):
    x = S[k]
    MF['st'][k] = {'path': x['path'], 'size': x['file_bytes'], 'hlen': x['header_len'], 'ds': x['data_start'], 'n': x['n_tensors'],
                   'meta': x['metadata'], 'dc': x['dtype_counts'], 'db': x['dtype_bytes'], 'first8': x['first8_hex'],
                   'head': x['header_head'][:200]}
    if k in ('hf06', 'mlx4'):
        MF['st'][k]['t'] = [[short(r[0]), r[1], r[2], r[3], r[4] - r[3]] for r in x['tensors']]
MF['index17'] = S['index17']
# GGUF files
MF['gg'] = {}
for k, x in G.items():
    d = {'path': x['path'], 'size': x['file_bytes'], 'ver': x['version'], 'n': x['n_tensors'], 'nkv': x['n_kv'], 'align': x['alignment'],
         'kvEnd': x['kv_end'], 'tiEnd': x['ti_end'], 'ds': x['data_start'], 'tc': x['type_counts'], 'tb': x['type_bytes'],
         'numel': x['numel'], 'bpw': x['bpw_all'], 'head': x['head_hex'][:64]}
    if k == 'q4km':
        d['t'] = [[r[0], r[1], r[2], r[3], r[4]] for r in x['tensors']]
        d['kv'] = [[a, b, c, p, n] for a, b, c, p, n in x['kv']]
    MF['gg'][k] = d
MF['fields'] = J('fields.json')
MF['cmp'] = J('cmp.json')
P = J('pk.json')
MF['pk'] = {'torch': P['torch'], 'zip': P['zip'], 'dis': P['tiny_dis'], 'ops': P['tiny_ops'], 'globals': P['tiny_globals'],
            'pklBytes': P['tiny_pkl_bytes'], 'fileBytes': P['tiny_file_bytes'], 'evilDis': P['evil_dis'],
            'wo': re.sub(r'\x1b\[[0-9;]*m', '', P['weights_only_full']), 'loads': P['pickle_loads_stdout']}
for k in ('onnx_tiny', 'onnx_06'):
    o = J(k + '.json'); o.pop('first_nodes', None); MF[k] = o
MF['onnx_tiny_first'] = J('onnx_tiny.json')['first_nodes'][:24]
L = J('lb.json'); base = st.median(r['rss_bytes'] for r in L['runs']['base'])
MF['lb'] = {'binBytes': L['bin_bytes'], 'stBytes': L['st_bytes'], 'torch': L['torch'], 'safetensors': L['safetensors'], 'reps': len(L['runs']['base']), 'm': {}}
for m, rs in L['runs'].items():
    if m == 'base': continue
    s = [r['s'] for r in rs]
    MF['lb']['m'][m] = {'med': st.median(s), 'min': min(s), 'max': max(s), 'mib': round((st.median(r['rss_bytes'] for r in rs) - base) / 2 ** 20)}
MF['blocks'] = J('blocks.json')
MF['conv'] = [kv(l) | {'run': l.split()[0]} for l in lines('conv_gguf.txt')]
MF['quant'] = [dict(zip(['src', 's', 'bytes', 'sha'], l.split()[:4])) for l in lines('quant.txt')]
MF['mlxconv'] = [kv(l) for l in lines('mlx_conv.txt')]
mm = [kv(l) for l in lines('mmap.txt')]
MF['mmap'] = {m: {'s': [float(r['ready_s']) for r in mm if r['mode'] == m], 'gib': [round(int(r['rss_kib']) / 2 ** 20, 2) for r in mm if r['mode'] == m]} for m in ('mmap', 'none')}
sp = [l for l in lines('split.txt') if l.startswith('shard')]
MF['split'] = [kv(l) | {'name': l.split()[1]} for l in sp]

MF['tinySt']=J('tiny_st.json')
rf=[l.split() for l in lines('repo_files.txt')]
MF['repo']=[[int(x[0]),x[1]] for x in rf if x[0]!='mlx']
MF['repoMlx']=[[int(x[1]),x[2]] for x in rf if x[0]=='mlx']
# ---- numbers quoted in the prose (<span data-mf="key">), formatted once here ----
c = lambda n: f'{int(n):,}'
gb = lambda b: f'{b / 1e9:.2f} GB'
mb = lambda b: f'{b / 1e6:.1f} MB'
h06 = S['hf06']; T06 = {r[0]: r for r in h06['tensors']}; lm = T06['lm_head.weight']
q = G['q4km']; kvlen = {a: n for a, b, cc, pp, n in q['kv']}
tok = kvlen['tokenizer.ggml.tokens'] + kvlen['tokenizer.ggml.token_type'] + kvlen['tokenizer.ggml.merges']
F16 = MF['cmp']['f16_representability']; lbm = MF['lb']['m']
med = lambda xs: st.median(xs)
O6 = MF['onnx_06']; OT = MF['onnx_tiny']
facts = {
 'st06Size': c(h06['file_bytes']), 'st06SizeGB': gb(h06['file_bytes']), 'st06Hlen': c(h06['header_len']), 'st06N': c(h06['n_tensors']),
 'st06HdrPct': f"{100 * h06['data_start'] / h06['file_bytes']:.4f}%",
 'lmBytes': c(lm[4] - lm[3]), 'lmMB': mb(lm[4] - lm[3]), 'lmPct': f"{100 * (lm[4] - lm[3]) / h06['file_bytes']:.1f}%",
 'mlx4N': c(S['mlx4']['n_tensors']), 'mlx4Size': c(S['mlx4']['file_bytes']), 'mlx4Hlen': c(S['mlx4']['header_len']), 'mlxbfN': c(S['mlxbf']['n_tensors']),
 'f16Total': c(F16['values']), 'f16Inexact': c(F16['not_exact_in_f16']), 'f16Zero': c(F16['flushed_to_zero']),
 'f16Pct': f"{100 * F16['not_exact_in_f16'] / F16['values']:.3f}%", 'f16MaxAbs': f"{MF['cmp']['files']['ours_f16']['max_abs_diff']:.1e}",
 'ggSize': c(q['file_bytes']), 'ggDs': c(q['data_start']), 'ggN': c(q['n_tensors']), 'ggKv': c(q['n_kv']), 'ggTok': c(tok),
 'ggTokPct': f"{100 * tok / q['data_start']:.1f}%", 'ggHdrPct': f"{100 * q['data_start'] / q['file_bytes']:.1f}%", 'ggBpw': f"{q['bpw_all']:.2f}",
 'ggTI': c(q['ti_end'] - q['kv_end']),
 'binFull': f"{lbm['bin_full']['med']:.2f} s", 'binFullMiB': c(lbm['bin_full']['mib']), 'binTouch': f"{lbm['bin_full+touch']['med']:.2f} s",
 'stFull': f"{lbm['st_full']['med'] * 1000:.0f} ms", 'stFullMiB': c(lbm['st_full']['mib']), 'stTouch': f"{lbm['st_full+touch']['med'] * 1000:.0f} ms",
 'binMmap': f"{lbm['bin_mmap']['med'] * 1000:.0f} ms", 'binMmapTouch': f"{lbm['bin_mmap+touch']['med'] * 1000:.0f} ms", 'stOne': f"{lbm['st_one']['med'] * 1000:.0f} ms",
 'touchMiB': c(lbm['st_full+touch']['mib']), 'lbReps': str(MF['lb']['reps']),
 'mmapS': f"{med(MF['mmap']['mmap']['s']):.2f} s", 'noneS': f"{med(MF['mmap']['none']['s']):.2f} s",
 'mmapGiB': f"{med(MF['mmap']['mmap']['gib']):.2f} GiB", 'noneGiB': f"{med(MF['mmap']['none']['gib']):.2f} GiB",
 'mmapRange': f"{min(MF['mmap']['mmap']['s']):.2f} to {max(MF['mmap']['mmap']['s']):.2f} s", 'noneRange': f"{min(MF['mmap']['none']['s']):.2f} to {max(MF['mmap']['none']['s']):.2f} s",
 'onNodes': c(O6['n_nodes']), 'onData': gb(O6['files']['qwen3_06b.onnx.data']), 'onGraph': mb(O6['files']['qwen3_06b.onnx']),
 'onOpset': str(O6['opset'][0][1]), 'onDiff': f"{O6['max_abs_diff']:.1e}", 'onExport': f"{O6['export_seconds']:.0f} s", 'onSoftmax': str(O6['op_counts']['Softmax']),
 'onMatMul': str(O6['op_counts']['MatMul']), 'onInit': c(O6['n_initializers']), 'onExt': c(O6['external_initializers']),
 'otNodes': c(OT['n_nodes']), 'otDiff': f"{OT['max_abs_diff']:.1e}",
 'convBf16': c(MF['conv'][0]['bytes']), 'convS': f"{min(float(x['seconds']) for x in MF['conv']):.0f} to {max(float(x['seconds']) for x in MF['conv']):.0f} s",
 'q4Ours': c(MF['quant'][1]['bytes']), 'q4Uns': c(MF['quant'][0]['bytes']),
 'pkOps': str(sum(MF['pk']['ops'].values())), 'pkReduce': str(MF['pk']['ops']['REDUCE']), 'pkGlobal': str(MF['pk']['ops']['GLOBAL']), 'pkBytes': str(MF['pk']['pklBytes']),
}
MF['facts'] = facts
js = '// Generated by src/gen_data.py from src/results/ (runs on an Apple M1 Pro, 2026-10-11). Do not edit by hand.\nwindow.MF=' + json.dumps(MF, separators=(',', ':'), ensure_ascii=False).replace('{{', '{\\u007b') + ';\n'
open('../parts/20_js_mf_data.js', 'w').write(js)
print('wrote', len(js), 'bytes')
