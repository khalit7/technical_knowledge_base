"""Run Qwen3Guard-Stream-0.6B (as its model card: user turn at once, then the assistant answer token by token) on the
released Mistral-7B-Instruct-v0.1 answers to all 450 XSTest prompts, re-tokenised into Qwen3's vocabulary as the card
advises. Records the user-turn verdict, the per-token risk level of the answer (S/U/C string) and timing.
Writes stream_out.json incrementally."""
import json, csv, time, sys, os, torch
from transformers import AutoModel, AutoTokenizer
torch.set_num_threads(2)
P = 'models/qgs'
tok = AutoTokenizer.from_pretrained(P, trust_remote_code=True)
dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
model = AutoModel.from_pretrained(P, torch_dtype=torch.float32, trust_remote_code=True).to(dev).eval()
XS = sys.argv[1]
OUT = 'stream_out.json'
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
ims, usr, ime = (tok.convert_tokens_to_ids(t) for t in ['<|im_start|>', 'user', '<|im_end|>'])
xs = list(csv.DictReader(open(XS + '/model_completions/xstest_v2_completions_mistralinstruct.csv')))
# Cap (about 20 minutes on a laptop): every full compliance with an unsafe (contrast) prompt, which are the harmful
# answers a stream rail must stop, plus 40 full compliances with safe prompts drawn with random.Random(0), to measure cut-offs of good answers.
import random
harm = [r for r in xs if r['type'].startswith('contrast') and r['final_label'] == '1_full_compliance']
okc = [r for r in xs if not r['type'].startswith('contrast') and r['final_label'] == '1_full_compliance']
xs = harm + random.Random(0).sample(okc, 40)
code = {'Safe': 'S', 'Unsafe': 'U', 'Controversial': 'C'}
n = 0
for r in xs:
    if r['id'] in res: continue
    msgs = [{'role': 'user', 'content': r['prompt']}, {'role': 'assistant', 'content': r['completion']}]
    text = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=False, enable_thinking=False)
    ids = tok(text, return_tensors='pt').input_ids[0]
    L = ids.tolist()
    ls = next(i for i in range(len(L) - 1, -1, -1) if L[i:i + 2] == [ims, usr])
    ue = next(i for i in range(ls + 2, len(L)) if L[i] == ime)
    t0 = time.time()
    with torch.no_grad():
        out, st = model.stream_moderate_from_ids(ids[:ue + 1].to(dev), role='user', stream_state=None)
        u = out['risk_level'][-1]; ucat = out['category'][-1]
        seq = []
        cats = {}
        for i in range(ue + 1, len(L)):
            o, st = model.stream_moderate_from_ids(ids[i].to(dev), role='assistant', stream_state=st)
            lv = o['risk_level'][-1]; seq.append(code.get(lv, '?'))
            if lv != 'Safe' and lv not in cats: cats[lv] = o['category'][-1]
        model.close_stream(st)
    res[r['id']] = dict(user=u, ucat=ucat, seq=''.join(seq), cats=cats, ms=round((time.time() - t0) * 1000), ntok=len(L) - ue - 1)
    n += 1
    if n % 5 == 0:
        json.dump(res, open(OUT, 'w')); print(n, r['id'], u, res[r['id']]['seq'][:40], res[r['id']]['ms'], flush=True)
json.dump(res, open(OUT, 'w')); print('done', len(res), flush=True)
