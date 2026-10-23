"""Walk three real files field by field and record each field's offset, length, raw bytes and meaning,
for the page's step-by-step parse animation (File explorer tab).

Usage: INF_DIR=... python3 -I extract_fields.py <out.json>
Files: Qwen3-0.6B model.safetensors (HF), Qwen3-0.6B-Q4_K_M.gguf, Qwen3-0.6B-4bit MLX model.safetensors.
Long values (the tokenizer arrays, the chat template, the JSON header) are recorded with their true
length and only their first bytes, and marked as such.
"""
import os, sys, json, struct

INF = os.environ['INF_DIR']
HEXMAX = 48
VT = {0: 'UINT8', 1: 'INT8', 2: 'UINT16', 3: 'INT16', 4: 'UINT32', 5: 'INT32', 6: 'FLOAT32', 7: 'BOOL',
      8: 'STRING', 9: 'ARRAY', 10: 'UINT64', 11: 'INT64', 12: 'FLOAT64'}
FMT = {0: '<B', 1: '<b', 2: '<H', 3: '<h', 4: '<I', 5: '<i', 6: '<f', 7: '<?', 10: '<Q', 11: '<q', 12: '<d'}
GT = {0: 'F32', 1: 'F16', 8: 'Q8_0', 12: 'Q4_K', 14: 'Q6_K', 30: 'BF16'}


def F(fields, f, off, n, kind, label, value):
    f.seek(off); raw = f.read(min(n, HEXMAX))
    fields.append({'o': off, 'n': n, 'k': kind, 'l': label, 'v': value, 'h': raw.hex()})


def st(path, show):
    out = []; size = os.path.getsize(path)
    with open(path, 'rb') as f:
        n = struct.unpack('<Q', f.read(8))[0]
        F(out, f, 0, 8, 'len', 'header length (u64, little-endian)', f'{n:,} bytes of JSON follow')
        hdr = f.read(n).decode()
        j = json.loads(hdr)
        # locate each shown entry inside the JSON text
        F(out, f, 8, 1, 'json', 'JSON header starts', '{')
        if '__metadata__' in j:
            i = hdr.index('"__metadata__"'); e = hdr.index('}', i) + 1
            F(out, f, 8 + i, e - i, 'meta', '__metadata__ (string to string only)', json.dumps(j['__metadata__']))
        for name in show:
            key = '"' + name + '"'; i = hdr.index(key); e = hdr.index('}', i) + 1
            t = j[name]
            F(out, f, 8 + i, e - i, 'entry', 'tensor entry: ' + name,
              f"{t['dtype']} {t['shape']} bytes [{t['data_offsets'][0]:,}, {t['data_offsets'][1]:,}) of the data buffer")
        rest = len(j) - 1 - len(show)
        F(out, f, 8, n, 'json', f'the rest of the header: {rest} more entries like these', f'{n:,} bytes in all')
        pad = len(hdr) - len(hdr.rstrip(' '))
        if pad:
            F(out, f, 8 + n - pad, pad, 'pad', 'padding spaces (header length made a multiple of 8)', f'{pad} spaces')
        else:
            F(out, f, 8 + n - 2, 2, 'json', 'end of JSON, no padding', f'header length {n:,} = {n % 8} mod 8')
        ds = 8 + n
        first = min(((k, v) for k, v in j.items() if k != '__metadata__'), key=lambda kv: kv[1]['data_offsets'][0])
        a, b = first[1]['data_offsets']
        F(out, f, ds + a, b - a, 'data', 'first tensor in the buffer: ' + first[0], f"{first[1]['dtype']} {first[1]['shape']}: raw values, no framing")
        F(out, f, ds, size - ds, 'data', 'the data buffer: every tensor back to back', f'{size - ds:,} bytes; file ends at {size:,}')
    return {'size': size, 'fields': out}


def gguf(path):
    out = []; size = os.path.getsize(path)
    with open(path, 'rb') as f:
        def rd(fmt): return struct.unpack(fmt, f.read(struct.calcsize(fmt)))[0]
        def rs():
            n = rd('<Q'); return f.read(n).decode('utf-8', 'replace')
        F(out, f, 0, 4, 'magic', 'magic', "'GGUF'"); f.seek(4)
        v = rd('<I'); F(out, f, 4, 4, 'hdr', 'version (u32)', str(v))
        nt = rd('<q'); F(out, f, 8, 8, 'hdr', 'tensor count (u64)', f'{nt}')
        nkv = rd('<q'); F(out, f, 16, 8, 'hdr', 'metadata key/value count (u64)', f'{nkv}')
        for _ in range(nkv):
            p0 = f.tell(); k = rs(); t = rd('<I')
            if t == 8:
                s = rs(); val = repr(s[:70]) + (f' ... ({len(s.encode()):,} bytes)' if len(s) > 70 else '')
            elif t == 9:
                at = rd('<I'); n = rd('<Q')
                if at == 8:
                    items = [rs() for _ in range(n)]; val = f'array of {n:,} {VT[at]}: ' + ', '.join(repr(x) for x in items[:4]) + ', ...'
                else:
                    f.seek(f.tell() + struct.calcsize(FMT[at]) * n); val = f'array of {n:,} {VT[at]}'
            else:
                val = rd(FMT[t]); val = (f'{val:g}' if t in (6, 12) else str(val))
            p1 = f.tell()
            F(out, f, p0, p1 - p0, 'kv', f'{k} ({VT[t]})', val); f.seek(p1)
        align = 32
        tis = []
        for i in range(nt):
            p0 = f.tell(); name = rs(); nd = rd('<I'); dims = [rd('<q') for _ in range(nd)]; ty = rd('<i'); off = rd('<Q'); p1 = f.tell()
            tis.append((p0, p1, name, dims, ty, off))
        for p0, p1, name, dims, ty, off in tis[:3] + tis[-1:]:
            F(out, f, p0, p1 - p0, 'ti', 'tensor info: ' + name, f'dims {dims} (fastest first), type {GT.get(ty, ty)}, offset {off:,} into the data')
            f.seek(p1)
        ti0 = tis[0][0]; ti1 = tis[-1][1]
        out.insert(len(out) - 1, {'o': ti0, 'n': ti1 - ti0, 'k': 'ti', 'l': f'all {nt} tensor infos', 'v': f'{ti1 - ti0:,} bytes', 'h': ''})
        ds = (ti1 + align - 1) // align * align
        F(out, f, ti1, ds - ti1, 'pad', 'zero padding to the 32-byte alignment', f'{ds - ti1} byte(s); data starts at {ds:,}')
        first = min(tis, key=lambda x: x[5])
        F(out, f, ds + first[5], 32, 'data', 'first tensor data: ' + first[2], f'type {GT.get(first[4], first[4])}')
        F(out, f, ds, size - ds, 'data', 'tensor data, each tensor aligned to 32 bytes', f'{size - ds:,} bytes; file ends at {size:,}')
    return {'size': size, 'fields': out}


res = {
    'st06': st(os.path.join(INF, 'models/hf/Qwen3-0.6B/model.safetensors'),
               ['lm_head.weight', 'model.embed_tokens.weight', 'model.layers.0.self_attn.k_proj.weight']),
    'gguf': gguf(os.path.join(INF, 'models/gguf/Qwen3-0.6B-Q4_K_M.gguf')),
    'mlx4': st(os.path.join(INF, 'models/mlx/Qwen3-0.6B-4bit/model.safetensors'),
               ['model.layers.0.self_attn.k_proj.weight', 'model.layers.0.self_attn.k_proj.scales', 'model.layers.0.self_attn.k_proj.biases']),
}
for k, v in res.items():
    print(k, v['size'], len(v['fields']))
    for x in v['fields'][:6] + v['fields'][-5:]: print('  ', x['o'], x['n'], x['k'], x['l'][:60], '|', str(x['v'])[:80])
json.dump(res, open(sys.argv[1], 'w'), indent=0, ensure_ascii=False)
