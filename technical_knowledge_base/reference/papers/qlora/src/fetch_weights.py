"""Real LLaMA-7B weights for the page (the base model of the paper's Appendix F test and of Guanaco 7B).

  uv run --with numpy --with scipy python fetch_weights.py

Range-requests a few whole weight matrices from the safetensors files of huggyllama/llama-7b (an ungated mirror of
the original LLaMA-1 7B release) into $QLORA_CACHE, then:
  * repeats Appendix F's Shapiro-Wilk normality test on every output unit (row) of each matrix, and on columns;
  * measures, on every block of 64 of each whole matrix, the round-to-nearest error of each 4-bit data type,
    the bin occupancy and its entropy, and what double quantisation adds;
  * writes inputs/weights_sample.json: 32 consecutive blocks of 64 weights from each matrix (FP16 bit patterns,
    base64) for the page's in-browser quantiser, and the first 512 absmax constants (two second-level blocks of 256) of each matrix (FP32, base64)
    for its double-quantisation demo; plus model/weights_stats.json with the whole-matrix measurements.
"""
import base64, json, os, struct, urllib.request
import numpy as np
from dtypes import TYPES, dynamic_map, fp8_e4m3_code

HERE = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(os.environ.get('QLORA_CACHE', '/tmp/qlora_cache'), 'llama7b')
os.makedirs(CACHE, exist_ok=True)
BASE = 'https://huggingface.co/huggyllama/llama-7b/resolve/main/'
WANT = ['model.layers.0.self_attn.q_proj.weight', 'model.layers.15.self_attn.v_proj.weight',
        'model.layers.15.mlp.up_proj.weight', 'model.layers.31.mlp.down_proj.weight']


def rng(url, a, b):
    req = urllib.request.Request(url, headers={'Range': 'bytes=%d-%d' % (a, b)})
    return urllib.request.urlopen(req).read()


def header(fn):
    n = struct.unpack('<Q', rng(BASE + fn, 0, 7))[0]
    return json.loads(rng(BASE + fn, 8, 8 + n - 1)), 8 + n


def tensor(name):
    loc = os.path.join(CACHE, name + '.npy')
    if os.path.exists(loc): return np.load(loc)
    idx = json.load(urllib.request.urlopen(BASE + 'model.safetensors.index.json'))['weight_map']
    fn = idx[name]
    h, off = header(fn)
    m = h[name]
    assert m['dtype'] == 'F16', m['dtype']
    a, b = m['data_offsets']
    raw = rng(BASE + fn, off + a, off + b - 1)
    w = np.frombuffer(raw, dtype='<f2').reshape(m['shape'])
    np.save(loc, w)
    return w


def nearest(x, code):
    code = np.array(sorted(code), dtype=np.float64)
    mids = (code[1:] + code[:-1]) / 2
    i = np.searchsorted(mids, x)
    return code[i], i


def blocks(w, B=64):
    return w.astype(np.float64).reshape(-1, B)


def measure(w):
    x = blocks(w)
    am = np.abs(x).max(1)
    xn = x / am[:, None]
    out = {}
    for k, code in TYPES.items():
        q, i = nearest(xn, code)
        err = (q - xn) * am[:, None]
        cnt = np.bincount(i.reshape(-1), minlength=len(code)).astype(float)
        p = cnt / cnt.sum()
        H = float(-(p[p > 0] * np.log2(p[p > 0])).sum())
        out[k] = {'rel_mse': float((err ** 2).sum() / (x ** 2).sum()), 'entropy_bits': H, 'occupancy': (p).round(5).tolist()}
    # double quantisation of the absmax constants: released code (dynamic 8-bit, blocks of 256, mean subtracted)
    off = am.mean(); a = am - off
    pad = (-a.size) % 256
    a2 = np.concatenate([a, np.zeros(pad)]).reshape(-1, 256)
    c2 = np.abs(a2).max(1)
    for nm, code in (('dynamic8', dynamic_map()), ('fp8_e4m3', fp8_e4m3_code())):
        qa = (nearest(a2 / c2[:, None], code)[0] * c2[:, None]).reshape(-1)[:am.size] + off
        rel = np.abs(qa - am) / am
        q, _ = nearest(xn, TYPES['nf4'])
        err = q * qa[:, None] - x
        out['nf4_dq_' + nm] = {'rel_mse': float((err ** 2).sum() / (x ** 2).sum()), 'absmax_rel_err_mean': float(rel.mean()), 'absmax_rel_err_max': float(rel.max())}
    return out


def shapiro(w):
    from scipy.stats import shapiro as sw
    rows = sum(1 for r in w.astype(np.float64) if sw(r).pvalue < 0.05)
    cols = sum(1 for c in w.astype(np.float64).T if sw(c).pvalue < 0.05)
    return {'rows': w.shape[0], 'rows_rejected': rows, 'cols': w.shape[1], 'cols_rejected': cols}


def b64f16(a):
    return base64.b64encode(np.asarray(a, dtype='<f2').tobytes()).decode()


def b64f32(a):
    return base64.b64encode(np.asarray(a, dtype='<f4').tobytes()).decode()


def main():
    stats, sample = {}, {'_source': 'huggyllama/llama-7b safetensors (LLaMA-1 7B), fetched by fetch_weights.py', 'tensors': []}
    import warnings; warnings.filterwarnings('ignore')
    for name in WANT:
        w = tensor(name)
        s = {'shape': list(w.shape), 'mean': float(w.astype(np.float64).mean()), 'std': float(w.astype(np.float64).std()),
             'kurtosis_excess': float(((w.astype(np.float64) - w.mean()) ** 4).mean() / w.astype(np.float64).var() ** 2 - 3)}
        s['quant'] = measure(w)
        s['shapiro'] = shapiro(w)
        stats[name] = s
        print(name, json.dumps({k: s[k] for k in ('shape', 'std', 'kurtosis_excess', 'shapiro')}),
              {k: round(v['rel_mse'], 5) for k, v in s['quant'].items()}, flush=True)
        flat = w.reshape(-1)
        start = 64 * 64 * 37  # a fixed, arbitrary offset into the matrix
        am = np.abs(w.astype(np.float32).reshape(-1, 64)).max(1)
        sample['tensors'].append({'name': name, 'shape': list(w.shape), 'offset': start, 'w': b64f16(flat[start:start + 2048]),
                                  'absmax': b64f32(am[:512])})
    json.dump(stats, open(os.path.join(HERE, 'model', 'weights_stats.json'), 'w'), indent=1)
    json.dump(sample, open(os.path.join(HERE, 'inputs', 'weights_sample.json'), 'w'))
    print('ok')


if __name__ == '__main__':
    main()
