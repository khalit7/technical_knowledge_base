"""Parse GGUF files byte by byte with a from-scratch reader (struct only), then cross-check with gguf-py.

Usage: INF_DIR=<inference scratch dir> python3 -I parse_gguf.py <out.json>
Follows the layout documented in llama.cpp b11146 ggml/include/gguf.h L1-L30:
magic, version (u32), tensor count (i64), kv count (i64), kv pairs, tensor infos, padding to
general.alignment (default 32), tensor data blob (offsets relative to the blob, each aligned).
"""
import json, os, sys, struct, collections, hashlib

INF = os.environ['INF_DIR']
FILES = {
    'q4km': 'models/gguf/Qwen3-0.6B-Q4_K_M.gguf',
    'bf16': 'models/gguf/Qwen3-0.6B-BF16.gguf',
    'f16': 'models/gguf/Qwen3-0.6B-F16.gguf',
    'q8': 'models/gguf/Qwen3-0.6B-Q8_0.gguf',
    'f16_17': 'lo/q/Qwen3-1.7B-F16.gguf',
    'q4km_17': 'models/gguf/Qwen3-1.7B-Q4_K_M.gguf',
    'q4km_4': 'models/gguf/Qwen3-4B-Q4_K_M.gguf',
}
VT = {0: 'UINT8', 1: 'INT8', 2: 'UINT16', 3: 'INT16', 4: 'UINT32', 5: 'INT32', 6: 'FLOAT32', 7: 'BOOL',
      8: 'STRING', 9: 'ARRAY', 10: 'UINT64', 11: 'INT64', 12: 'FLOAT64'}
FMT = {0: '<B', 1: '<b', 2: '<H', 3: '<h', 4: '<I', 5: '<i', 6: '<f', 7: '<?', 10: '<Q', 11: '<q', 12: '<d'}


class R:
    def __init__(s, f): s.f = f
    def pos(s): return s.f.tell()
    def u(s, fmt):
        n = struct.calcsize(fmt); return struct.unpack(fmt, s.f.read(n))[0]
    def str(s):
        n = s.u('<Q'); return s.f.read(n).decode('utf-8', 'replace')
    def val(s, t):
        if t == 8: return s.str()
        if t == 9:
            at = s.u('<I'); n = s.u('<Q')
            if at == 8:
                items = [s.str() for _ in range(n)]
            else:
                sz = struct.calcsize(FMT[at]); raw = s.f.read(sz * n)
                items = list(struct.unpack('<' + FMT[at][1] * n, raw))
            return {'array_of': VT[at], 'n': n, 'items': items}
        return s.u(FMT[t])


def parse(path, full):
    from gguf.constants import GGML_QUANT_SIZES, GGMLQuantizationType as QT
    size = os.path.getsize(path)
    with open(path, 'rb') as f:
        r = R(f)
        head = f.read(64); f.seek(0)
        magic = f.read(4); ver = r.u('<I'); nt = r.u('<q'); nkv = r.u('<q')
        kvs = []; align = 32
        for _ in range(nkv):
            p0 = r.pos(); k = r.str(); t = r.u('<I'); v = r.val(t); p1 = r.pos()
            if k == 'general.alignment': align = v
            kvs.append([k, VT[t], v, p0, p1 - p0])
        kv_end = r.pos()
        tis = []
        for _ in range(nt):
            p0 = r.pos(); name = r.str(); nd = r.u('<I'); dims = [r.u('<q') for _ in range(nd)]
            ty = r.u('<i'); off = r.u('<Q')
            tis.append([name, dims, QT(ty).name, off, p0])
        ti_end = r.pos()
        data_start = (ti_end + align - 1) // align * align
        # sizes from block geometry
        rows = []; bad_align = 0; gap_bytes = 0; prev_end = 0
        for name, dims, ty, off, p0 in sorted(tis, key=lambda x: x[3]):
            bs, ts = GGML_QUANT_SIZES[QT[ty]]
            n = 1
            for d in dims: n *= d
            nbytes = n // bs * ts
            if off % align: bad_align += 1
            gap_bytes += off - prev_end
            prev_end = off + nbytes
            rows.append([name, dims, ty, off, nbytes])
        f.seek(data_start)
        first_data = f.read(32)
        # one Q4_K block and one Q6_K block for the layout view
        blocks = {}
        for want in ('Q4_K', 'Q6_K', 'Q8_0', 'BF16', 'F16'):
            for name, dims, ty, off, nb in rows:
                if ty == want:
                    bs, ts = GGML_QUANT_SIZES[QT[ty]]
                    f.seek(data_start + off); raw = f.read(ts if bs > 1 else 32)
                    blocks[want] = {'tensor': name, 'abs_offset': data_start + off, 'hex': raw.hex(), 'block_elems': bs, 'block_bytes': ts}
                    break
    tc = collections.Counter(x[2] for x in rows); tb = collections.Counter()
    for x in rows: tb[x[2]] += x[4]
    numel = sum((lambda d: __import__('math').prod(d))(x[1]) for x in rows)
    out = {
        'path': path.split('/inf/')[-1].replace('models/', ''), 'file_bytes': size, 'head_hex': head.hex(),
        'magic': magic.decode(), 'version': ver, 'n_tensors': nt, 'n_kv': nkv, 'alignment': align,
        'kv_end': kv_end, 'ti_end': ti_end, 'data_start': data_start, 'pad_before_data': data_start - ti_end,
        'data_bytes': prev_end, 'size_check': size == data_start + prev_end, 'misaligned': bad_align,
        'gap_bytes_between_tensors': gap_bytes - 0, 'type_counts': dict(tc), 'type_bytes': dict(tb), 'numel': numel,
        'bpw_all': round(8 * prev_end / numel, 4), 'first_data_hex': first_data.hex(), 'blocks': blocks,
    }
    # metadata summary: long arrays and long strings shortened for the page
    kvo = []
    for k, t, v, p0, ln in kvs:
        if isinstance(v, dict):
            it = v['items']
            vv = {'array_of': v['array_of'], 'n': v['n'], 'first': it[:6], 'last': it[-2:] if v['n'] > 8 else []}
            if v['array_of'] == 'STRING': vv['sha256'] = hashlib.sha256('\x00'.join(it).encode()).hexdigest()[:16]
        elif isinstance(v, str) and len(v) > 160:
            vv = {'str_len': len(v.encode()), 'start': v[:120], 'sha256': hashlib.sha256(v.encode()).hexdigest()[:16]}
        else:
            vv = v
        kvo.append([k, t, vv, p0, ln])
    out['kv'] = kvo if full else [x for x in kvo if not x[0].startswith('tokenizer.ggml.')][:60]
    out['kv_keys'] = [x[0] for x in kvs]
    if full:
        out['tensors'] = [[n, d, t, o, b] for n, d, t, o, b in rows]
        out['ti_first'] = [[x[0], x[1], x[2], x[3], x[4]] for x in tis[:3]]
        tmpl = [v for k, t, v, a, b in kvs if k == 'tokenizer.chat_template']
        out['chat_template_full'] = tmpl[0] if tmpl else None
    else:
        out['tensors_sample'] = rows[:4]
    return out


def main():
    res = {}
    for k, rel in FILES.items():
        p = os.path.join(INF, rel)
        if not os.path.exists(p): print('missing', k); continue
        res[k] = parse(p, k in ('q4km', 'bf16'))
        x = res[k]
        print(k, x['version'], x['n_tensors'], x['n_kv'], x['alignment'], x['data_start'], x['pad_before_data'], x['size_check'], x['misaligned'], x['gap_bytes_between_tensors'], x['type_counts'], x['bpw_all'])
    # cross-check with gguf-py's reader
    from gguf import GGUFReader
    for k in ('q4km', 'bf16'):
        rd = GGUFReader(os.path.join(INF, FILES[k]))
        ok = [t.name for t in rd.tensors] == [x[0] for x in sorted(res[k]['tensors'], key=lambda z: z[3])] or \
             sorted(t.name for t in rd.tensors) == sorted(x[0] for x in res[k]['tensors'])
        okoff = sorted(int(t.data_offset) for t in rd.tensors) == sorted(res[k]['data_start'] + x[3] for x in res[k]['tensors'])
        res[k]['ggufpy_check'] = {'names': ok, 'abs_offsets': okoff, 'n_fields': len(rd.fields)}
        print(k, 'gguf-py', res[k]['ggufpy_check'])
    json.dump(res, open(sys.argv[1], 'w'), indent=0, ensure_ascii=False)


main()
