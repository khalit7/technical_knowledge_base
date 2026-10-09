"""InferenceX DeepSeek-V4-Pro rows: for each hardware, precision and input length, each engine's best throughput per GPU
at a given per-user speed (interactivity, tokens/s per user), from the upper envelope of all its configurations
(any TP/EP, any concurrency), linear between measured points. The page's SGLang vs vLLM tab does the same in JS."""
import json, os, sys
H = os.path.dirname(os.path.abspath(__file__))
X = json.load(open(os.path.join(H, 'inputs', 'inferencex_dsv4pro_vllm_sglang.json')))


def frontier(rows):
    pts = sorted(((r['intvty'], r['tput_gpu']) for r in rows), key=lambda p: -p[0])
    out, best = [], -1
    for x, y in pts:                  # walking from fast-per-user to slow, keep points that raise throughput
        if y > best:
            out.append((x, y))
            best = y
    return sorted(out)


def at(front, x):
    """Best throughput per GPU achievable with interactivity >= x (step-wise on the frontier, linear between points)."""
    if not front or x > front[-1][0]:
        return None
    for i, (xi, yi) in enumerate(front):
        if xi >= x:
            if i == 0:
                return yi
            x0, y0 = front[i - 1]
            return y0 + (yi - y0) * (x - x0) / (xi - x0) if xi != x0 else yi
    return None


def table(targets=(10, 20, 40, 60)):
    groups = {}
    for r in X['rows']:
        groups.setdefault((r['hw'], r['prec'], r['isl'], r['osl']), {}).setdefault(r['fw'], []).append(r)
    res = []
    for k, g in sorted(groups.items()):
        if 'vllm' not in g or 'sglang' not in g:
            continue
        fv, fs = frontier(g['vllm']), frontier(g['sglang'])
        for t in targets:
            v, s = at(fv, t), at(fs, t)
            res.append({'hw': k[0], 'prec': k[1], 'isl': k[2], 'osl': k[3], 'intvty': t, 'vllm': v, 'sglang': s,
                        'ratio': (s / v) if (v and s) else None,
                        'dates': [min(r['date'] for r in g['vllm']), max(r['date'] for r in g['vllm']), min(r['date'] for r in g['sglang']), max(r['date'] for r in g['sglang'])]})
    return res


if __name__ == '__main__':
    for r in table():
        print(r['hw'], r['prec'], r['isl'], r['intvty'], r['vllm'] and round(r['vllm']), r['sglang'] and round(r['sglang']), r['ratio'] and round(r['ratio'], 2), r['dates'])
