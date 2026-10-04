"""Write parts/22_js_data.js: the released data and this page's guard-model runs, in the compact form the page uses.

Inputs (see README):
  inputs/raw/xstest/...            XSTest prompts and Mistral-7B-Instruct-v0.1 answers, with and without the guardrail
                                   system prompt (sh fetch_inputs.sh)
  inputs/runs/qwen_out.json        Qwen3Guard-Gen-0.6B on XSTest prompts, XSTest prompt+answer, deepset test (runs/run_qwen.py)
  inputs/runs/pi_out.json          protectai/deberta-v3-base-prompt-injection-v2 on XSTest prompts and deepset test (runs/run_pi.py)
  inputs/runs/stream_out.json      Qwen3Guard-Stream-0.6B, token by token, on 168 answers (runs/run_stream.py)
  inputs/runs/pii_out.json         regex rail and urchade/gliner_multi_pii-v1 on 200 Nemotron-PII records (runs/run_pii.py)
  inputs/runs/timing.json          clean latency pass (runs/time_guards.py)
Content rule (as on the Safety and honesty page): answers to unsafe prompts that were not full refusals are withheld; other
answers are shown as their first 80 characters."""
import csv, json, os
H = os.path.dirname(os.path.abspath(__file__))
X = H + '/inputs/raw/xstest/'
P = {r['id']: r for r in csv.DictReader(open(X + 'xstest_prompts.csv'))}
MI = {r['id']: r for r in csv.DictReader(open(X + 'model_completions/xstest_v2_completions_mistralinstruct.csv'))}
MG = {r['id']: r for r in csv.DictReader(open(X + 'model_completions/xstest_v2_completions_mistralguard.csv'))}
Q = json.load(open(H + '/inputs/runs/qwen_out.json'))
PI = json.load(open(H + '/inputs/runs/pi_out.json'))
ST = json.load(open(H + '/inputs/runs/stream_out.json')) if os.path.exists(H + '/inputs/runs/stream_out.json') else {}
TM = json.load(open(H + '/inputs/runs/timing.json')) if os.path.exists(H + '/inputs/runs/timing.json') else {}
DP = json.load(open(H + '/inputs/deepset_test.json'))
code = {'Safe': 'S', 'Unsafe': 'U', 'Controversial': 'C'}
lab = {'1_full_compliance': 1, '2_full_refusal': 2, '3_partial_refusal': 3}

def ex(row, unsafe):
    l = lab[row['final_label']]
    if unsafe and l != 2: return ''
    t = ' '.join(row['completion'].split())
    return t[:80] + ('...' if len(t) > 80 else '')

def pr(d): return [round(d['p']['Unsafe'], 4), round(d['p']['Controversial'], 4)] if d['p'] else [0, 0]

def first(seq, chars):
    i = min([seq.find(c) for c in chars if seq.find(c) >= 0], default=-1)
    return i

xs = []
for id_ in sorted(MI, key=lambda k: int(k.split('-')[1])):
    m = MI[id_]; g = MG[id_]
    pid = id_.split('-')[1]
    p = P[pid]
    unsafe = m['type'].startswith('contrast')
    assert (p['label'] == 'unsafe') == unsafe
    # one prompt (id 195) was reworded in the prompt file after the completions were released; the page shows the
    # wording the models (and this page's guard runs) actually saw
    if p['prompt'] != m['prompt']: print('reworded prompt', pid)
    qp = Q['xs_prompt:' + id_]; qr = Q['xs_resp:' + id_]
    s = ST.get(id_)
    xs.append([int(pid), m['type'], 1 if unsafe else 0, m['prompt'], lab[m['final_label']], ex(m, unsafe), lab[g['final_label']], ex(g, unsafe),
               code[qp['label']], *pr(qp), code[qr['label']], *pr(qr), 1 if qr['refusal'] == 'Yes' else 0,
               round(PI['xs:' + pid]['p'], 5),
               ([s['ntok'], first(s['seq'], 'U'), first(s['seq'], 'UC'), code.get(s['user'], '?')] if s else None)])
dp = []
for i, r in enumerate(DP):
    q = Q['dp_prompt:%d' % i]; t = ' '.join(r['text'].split())
    dp.append([r['label'], t[:220] + ('...' if len(t) > 220 else ''), round(PI['dp:%d' % i]['p'], 5), code[q['label']], *pr(q), 1 if 'Jailbreak' in q['cats'] else 0])

# PII: per record, gold spans and predicted spans (start, end, label, score, source); 4 records keep their text for the demo
R = json.load(open(H + '/inputs/nemotron_pii_test200.json'))
PO = json.load(open(H + '/inputs/runs/pii_out.json'))
assert all(r['uid'] == o['uid'] for r, o in zip(R, PO['out']))
def pii_eval(flt):
    """Span recall (a gold span counts as caught when at least half its characters are masked) by gold label,
    and character precision (share of masked characters inside some gold span)."""
    hit, tot, fp, pc = {}, {}, 0, 0
    for r, o in zip(R, PO['out']):
        n = len(r['text']); m = [0] * n; g = [0] * n
        for a, b, l, sc, src in o['preds']:
            if flt(sc, src):
                for i in range(a, min(b, n)): m[i] = 1
        for a, b, l in r['spans']:
            for i in range(a, b): g[i] = 1
            tot[l] = tot.get(l, 0) + 1; hit[l] = hit.get(l, 0) + (1 if 2 * sum(m[a:b]) >= (b - a) else 0)
        pc += sum(m); fp += sum(1 for x, y in zip(m, g) if x and not y)
    return dict(hit=hit, tot=tot, prec=round(1 - fp / max(1, pc), 4), masked=pc)
pii = {'rx': pii_eval(lambda sc, src: src == 'rx')}
for t in (0.3, 0.5, 0.7):
    pii['gl%d' % int(t * 10)] = pii_eval(lambda sc, src, t=t: src == 'gl' and sc >= t)
    pii['both%d' % int(t * 10)] = pii_eval(lambda sc, src, t=t: src == 'rx' or sc >= t)
demo_ids = [i for i, r in enumerate(R) if r['format'] == 'unstructured' and 250 < len(r['text']) < 520][:4]
pii_demo = [[i, R[i]['doc'], R[i]['text'], R[i]['spans'], [[a, b, l, s, 1 if src == 'gl' else 0] for a, b, l, s, src in PO['out'][i]['preds']]] for i in demo_ids]

D = dict(xs=xs, dp=dp, pii=pii, piiDemo=pii_demo, piiMs=[PO['ms_rx'], PO['ms_gl']], timing=TM,
         nStream=len(ST))
js = '// Generated by mk_data.py: do not edit. Field order is documented in mk_data.py.\nwindow.GD=' + json.dumps(D, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(H + '/parts/22_js_data.js', 'w').write(js)
print('xs', len(xs), 'dp', len(dp), 'pii', len(pii), 'stream', len(ST), 'bytes', len(js), 'demo', demo_ids)
