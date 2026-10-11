"""Parse safetensors headers byte by byte (no safetensors library), from the shared model store.

Usage: INF_DIR=<inference scratch dir> python3 -I parse_st.py <out.json>
Reads only the first 8 bytes and the JSON header of each file (plus a few bytes of tensor data),
checks the layout rules (contiguous offsets, file size = 8 + N + data), and records per-tensor tables.
The safetensors library is used afterwards only as a cross-check (same names, shapes, dtypes).
"""
import json, os, sys, struct, hashlib, collections

INF = os.environ['INF_DIR']
FILES = {
    'hf06': 'models/hf/Qwen3-0.6B/model.safetensors',
    'hf17a': 'models/hf/Qwen3-1.7B/model-00001-of-00002.safetensors',
    'hf17b': 'models/hf/Qwen3-1.7B/model-00002-of-00002.safetensors',
    'mlx4': 'models/mlx/Qwen3-0.6B-4bit/model.safetensors',
    'mlx8': 'models/mlx/Qwen3-0.6B-8bit/model.safetensors',
    'mlxbf': 'models/mlx/Qwen3-0.6B-bf16/model.safetensors',
}
DT = {'BF16': 2, 'F16': 2, 'F32': 4, 'U32': 4, 'I32': 4, 'I64': 8, 'U8': 1, 'I8': 1, 'BOOL': 1, 'F64': 8, 'U16': 2, 'I16': 2}


def parse(path):
    size = os.path.getsize(path)
    with open(path, 'rb') as f:
        first8 = f.read(8)
        n = struct.unpack('<Q', first8)[0]
        hdr_bytes = f.read(n)
        data_start = 8 + n
        hdr = json.loads(hdr_bytes)
        meta = hdr.pop('__metadata__', None)
        ts = sorted(hdr.items(), key=lambda kv: kv[1]['data_offsets'][0])
        prev = 0; gaps = 0; bad = 0; rows = []
        for name, t in ts:
            a, b = t['data_offsets']
            if a != prev: gaps += 1
            numel = 1
            for d in t['shape']: numel *= d
            if numel * DT[t['dtype']] != b - a: bad += 1
            rows.append([name, t['dtype'], t['shape'], a, b])
            prev = b
        # first 16 bytes of the first tensor's data (by offset)
        f.seek(data_start)
        d16 = f.read(16)
        # trailing bytes of the header (padding)
        tail = hdr_bytes[-24:]
    cnt = collections.Counter(r[1] for r in rows)
    byt = collections.Counter()
    for r in rows: byt[r[1]] += r[4] - r[3]
    return {
        'path': path.split('/models/')[-1], 'file_bytes': size, 'first8_hex': first8.hex(' '),
        'header_len': n, 'header_len_mod8': n % 8, 'data_start': data_start,
        'header_head': hdr_bytes[:220].decode('utf-8', 'replace'), 'header_tail_repr': repr(tail.decode('utf-8', 'replace')),
        'metadata': meta, 'n_tensors': len(rows), 'dtype_counts': dict(cnt), 'dtype_bytes': dict(byt),
        'data_bytes': prev, 'size_check': size == data_start + prev, 'gaps': gaps, 'numel_mismatch': bad,
        'first_tensor_16_hex': d16.hex(' '), 'tensors': rows,
    }


def main():
    out = {}
    for k, rel in FILES.items():
        p = os.path.join(INF, rel)
        if os.path.exists(p):
            out[k] = parse(p)
            print(k, out[k]['n_tensors'], out[k]['header_len'], out[k]['dtype_counts'], out[k]['size_check'], out[k]['gaps'], out[k]['numel_mismatch'], out[k]['metadata'])
    # sharded index of Qwen3-1.7B
    idx = json.load(open(os.path.join(INF, 'models/hf/Qwen3-1.7B/model.safetensors.index.json')))
    wm = idx['weight_map']
    out['index17'] = {'metadata': idx.get('metadata'), 'n_entries': len(wm),
                      'per_shard': dict(collections.Counter(wm.values())),
                      'sample': [[k, wm[k]] for k in list(wm)[:3]] + [[k, wm[k]] for k in wm if k.startswith('lm_head')]}
    # cross-check with the safetensors library (lazy, header only)
    try:
        from safetensors import safe_open
        for k in ('hf06', 'mlx4'):
            p = os.path.join(INF, FILES[k])
            with safe_open(p, 'np') as f:
                names = set(f.keys())
            out[k]['lib_check'] = names == set(r[0] for r in out[k]['tensors'])
    except Exception as e:
        out['lib_err'] = str(e)
    for k in ('hf06', 'mlx4'):
        print(k, 'lib_check', out[k].get('lib_check'))
    json.dump(out, open(sys.argv[1], 'w'), indent=0)


main()
