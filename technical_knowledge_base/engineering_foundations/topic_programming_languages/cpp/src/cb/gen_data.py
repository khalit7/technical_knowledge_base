#!/usr/bin/env python3
"""Turn Part 2's recorded outputs (out/*.txt, out/*.s) into ../parts/40_js_cb_0data.js (window.CB).
Every number and every output block the page shows comes from here; check/check_embed.py verifies it."""
import json, re, statistics, pathlib
HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / 'out'
rd = lambda n: (OUT / n).read_text()

def runs(name, n=3):
    return [rd(f'{name}_{r}.txt') for r in range(1, n + 1) if (OUT / f'{name}_{r}.txt').exists()]

def load_of(txt):
    m = re.match(r'# load: ([\d.]+) ([\d.]+) ([\d.]+)', txt)
    return float(m.group(1)) if m else None

def body(txt):  # the program's own output, without our "# load" line
    return '\n'.join(l for l in txt.splitlines() if not l.startswith('# load')).rstrip('\n')

def num(pat, txt, cast=float):
    m = re.search(pat, txt)
    if not m: raise SystemExit(f'pattern not found: {pat}')
    return cast(m.group(1))

def stat(vals):
    return {'runs': vals, 'med': statistics.median(vals), 'min': min(vals), 'max': max(vals)}

def series(name, pats):
    rs = runs(name)
    d = {k: stat([num(p, r) for r in rs]) for k, p in pats.items()}
    return {'raw': body(rs[0]), 'load': [load_of(r) for r in rs], 'n': len(rs), 'v': d}

def asm_fn(fname, sym, upto_ret=True):
    """One function from a stripped assembly listing: from its label to its last ret before the next function."""
    lines = rd(fname).splitlines()
    i = next(k for k, l in enumerate(lines) if l.startswith(sym + ':'))
    j = i + 1
    while j < len(lines) and not (re.match(r'^__Z|^_main', lines[j])):
        j += 1
    out = [re.sub(r'\s+;\s*(@.*|=0x[0-9a-f]+)$', '', l) for l in lines[i:j]]
    return '\n'.join(out).rstrip()

CB = {}
CB['sysctl'] = rd('sysctl.txt').strip()
# ladder: working set (KB) -> ns per load
def ladder(kind, n):
    out = []
    for r in range(1, n + 1):
        f = OUT / f'ladder_{kind}_{r}.txt'
        if not f.exists(): continue
        t = f.read_text()
        pts = [[int(a), float(b)] for a, b in re.findall(r'^(\d+)\t([\d.]+)$', t, re.M)]
        out.append({'load': load_of(t), 'pts': pts})
    return out
CB['ladder'] = {'random': ladder('random', 3), 'seq': ladder('seq', 2)}

CB['layout'] = rd('layout.txt').rstrip()
CB['aos'] = series('aos_soa', {
    'f_aos': r'one field   \(logprob\)\s+AoS ([\d.]+)', 'f_soa': r'one field   \(logprob\)\s+AoS [\d.]+ ns/record\s+SoA ([\d.]+)',
    'i_aos': r'one field   \(user, integer\) AoS ([\d.]+)', 'i_soa': r'\(user, integer\) AoS [\d.]+ ns/record\s+SoA ([\d.]+)',
    'a_aos': r'all 8 fields\s+AoS ([\d.]+)', 'a_soa': r'all 8 fields\s+AoS [\d.]+ ns/record\s+SoA ([\d.]+)'})
CB['aosfm'] = series('aos_soa_fm', {
    'f_aos': r'one field   \(logprob\)\s+AoS ([\d.]+)', 'f_soa': r'one field   \(logprob\)\s+AoS [\d.]+ ns/record\s+SoA ([\d.]+)'})
CB['rowcol'] = series('rowcol', {'row': r'row by row\s+[\d.]+ ms\s+([\d.]+) ns', 'col': r'column by col\s+[\d.]+ ms\s+([\d.]+) ns',
                                 'ratio': r'columns are ([\d.]+)x'})
CB['br_o2'] = series('branch_o2', {'u': r'unsorted\s+([\d.]+)', 's': r'sorted\s+([\d.]+) ns', 'r': r'= ([\d.]+)x'})
CB['br_keep'] = series('branch_keep', {'u': r'unsorted\s+([\d.]+)', 's': r'\n  sorted\s+([\d.]+) ns', 'r': r'= ([\d.]+)x'})
dk = {}
for lvl, tag in (('l1', r'in L1\), \d+ passes'), ('dram', r'from DRAM\), \d+ passes')):
    for key, lab in (('scalar', 'scalar'), ('auto', r'auto \(-O2\)'), ('fm', r'auto \(-O2 -ffast-math\)'), ('neon', 'NEON intrinsics')):
        dk[f'{lvl}_{key}'] = tag + r'[\s\S]*?' + lab + r'\s+([\d.]+) ns/elem'
CB['dot'] = series('dot', dk)
CB['dot']['results'] = {'serial': num(r'scalar\s+[\d.]+ ns/elem.*result (\d+)\.0', rd('dot_1.txt').split('DRAM')[1]),
                        'sixteen': num(r'NEON intrinsics\s+[\d.]+ ns/elem.*result (\d+)\.0', rd('dot_1.txt').split('DRAM')[1]),
                        'exact': 402653161.75}   # exact sum computed in Python (see README)
CB['fs'] = series('false_sharing', {'one': r'1 thread alone\s+(\d+) ms', 'b8': r'8 bytes apart\s+(\d+) ms',
                                    'b64': r'64 bytes apart\s+(\d+) ms', 'b128': r'128 bytes apart\s+(\d+) ms'})
CB['litmus'] = series('litmus', {'relaxed': r'relaxed load : (\d+)', 'acqrel': r'acquire load : (\d+)', 'trials': r'= (\d+) trials'})
CB['mmap'] = series('mmap', {'fault_us': r'cost about ([\d.]+) us', 'first': r'first time ([\d.]+) ms', 'second': r'second time ([\d.]+) ms',
                             'map_ms': r'mmap\(\) call ([\d.]+) ms', 'touch8': r'touching 8 spread-out bytes ([\d.]+) ms',
                             'touchall': r'touching every page: ([\d.]+) ms', 'read_ms': r'std::vector: ([\d.]+) ms',
                             'minor': r'in total: (\d+) minor', 'major': r'minor = already in the page cache, (\d+) major'})
CB['mmap']['raws'] = [body(r) for r in runs('mmap')]
CB['roof'] = series('roof', {'p1': r'peak FMA, 1 thread: ([\d.]+)', 'p8': r'peak FMA, 8 threads: ([\d.]+)',
                             'bw1': r'read bandwidth, 1 thread: ([\d.]+)', 'bw8': r'read bandwidth, 8 threads: ([\d.]+)',
                             'mv1': r'matvec .*1 thread: ([\d.]+) GFLOP', 'mv8': r'matvec .*8 threads: ([\d.]+) GFLOP',
                             'mm1': r'matmul .*1 thread: ([\d.]+) GFLOP', 'mm8': r'matmul .*8 threads: ([\d.]+) GFLOP'})
CB['alloc'] = series('alloc', {'grow': r'growing\s+([\d.]+) ms', 'res': r'reserve\(\)\s+([\d.]+) ms', 'box': r'make_unique\)\s+([\d.]+) ms',
                               'moves': r'moved its buffer (\d+) times'})
CB['profile'] = series('profile', {'ipc_r': r'rows: .*?([\d.]+) instructions per cycle', 'ipc_c': r'cols: .*?([\d.]+) instructions per cycle',
                                   'ins_r': r'rows: [\d.]+ s, (\d+) M instructions', 'ins_c': r'cols: [\d.]+ s, (\d+) M instructions'})
CB['race'] = {'o2': rd('race_O2_300.txt').rstrip(), 'o0': rd('race_O0_300.txt').rstrip()}
CB['tsan'] = '\n'.join(rd('tsan.txt').splitlines()[:5] + ['    ...'] + [l for l in rd('tsan.txt').splitlines() if l.startswith('  Previous write')][:1]
                       + [rd('tsan.txt').splitlines()[k + 1] for k, l in enumerate(rd('tsan.txt').splitlines()) if l.startswith('  Previous write')][:1]
                       + ['    ...'] + [l for l in rd('tsan.txt').splitlines() if l.startswith('SUMMARY')][:2])
CB['abi'] = rd('abi.txt').rstrip()
CB['remarks'] = rd('vec_remarks.txt').rstrip()
CB['remarks_fm'] = rd('vec_remarks_fm.txt').rstrip()
CB['asm'] = {
    'sq_O0': asm_fn('codegen_O0.s', '__Z11sum_squaresi'), 'sq_O2': asm_fn('codegen_O2.s', '__Z11sum_squaresi'),
    'area': asm_fn('codegen_O2.s', '__Z7area_ofRK5Shape'), 'area_sq': asm_fn('codegen_O2.s', '__Z14area_of_squareRK6Square'),
    'dot_scalar': asm_fn('dot_kernels_O2.s', '__Z10dot_scalarPKfS0_m'), 'dot_auto': asm_fn('dot_kernels_O2.s', '__Z8dot_autoPKfS0_m'),
    'dot_fm': asm_fn('dot_fm.s', '__Z17dot_auto_fastmathPKfS0_m'), 'dot_neon': asm_fn('dot_kernels_O2.s', '__Z8dot_neonPKfS0_m'),
    'send_relaxed': asm_fn('orders.s', '__Z12send_relaxedv'), 'send_release': asm_fn('orders.s', '__Z12send_releasev'),
    'recv_relaxed': asm_fn('orders.s', '__Z12recv_relaxedv'), 'recv_acquire': asm_fn('orders.s', '__Z12recv_acquirev'),
    'send_seq': asm_fn('orders.s', '__Z12send_seq_cstv'), 'recv_seq': asm_fn('orders.s', '__Z12recv_seq_cstv'),
    'br_keep': asm_fn('branch_keep.s', '__Z9count_bigPKhm'),
}
CB['llama'] = rd('llama_excerpts.txt').rstrip()
_names = {'ggml/src/ggml-cpu/simd-mappings.h': 'simd', 'ggml/src/ggml-cpu/vec.cpp': 'vec', 'ggml/src/ggml-cpu/ops.h': 'ops', 'src/llama-mmap.cpp': 'mmap'}
CB['llamaex'] = {}
for chunk in CB['llama'].split('=== ')[1:]:
    head, _, text = chunk.partition('\n')
    CB['llamaex'][_names[head.split(':')[0]]] = text.rstrip('\n')
SHOWN = ['ladder.cpp', 'layout.cpp', 'aos_soa.cpp', 'rowcol.cpp', 'dot_kernels.cpp', 'branch.cpp', 'false_sharing.cpp', 'litmus.cpp',
         'race.cpp', 'mmap_demo.cpp', 'codegen.cpp', 'abi.cpp', 'orders_asm.cpp', 'alloc.cpp', 'hot.cpp', 'roof.cpp', 'bench.h', 'profile.sh']
CB['src'] = {f: (HERE / 'code' / f).read_text().rstrip('\n') for f in SHOWN}
import os
if os.environ.get('CB_JSON_ONLY'):
    print(json.dumps(CB, separators=(',', ':'))); raise SystemExit
js = '// Generated by src/cb/gen_data.py from src/cb/out/ (real outputs recorded on this M1 Pro, 2026-10-05). Do not edit.\nwindow.CB=' + json.dumps(CB, separators=(',', ':')) + ';\n'
(HERE.parent / 'parts' / '40_js_cb_0data.js').write_text(js)
print('wrote', len(js), 'bytes')
