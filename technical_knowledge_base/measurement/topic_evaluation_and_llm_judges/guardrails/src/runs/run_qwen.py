"""Run Qwen3Guard-Gen-0.6B (greedy, as the model card) on:
  xs_prompt : the 450 XSTest prompts (prompt moderation)
  xs_resp   : the 450 XSTest prompts with Mistral-7B-Instruct-v0.1's released answers (response moderation)
  dp_prompt : the 116 deepset/prompt-injections test items (prompt moderation)
Records the generated text, the parsed label, categories, refusal flag, the probability of each label's first token at
the label position (for a threshold), and wall time per item. Writes qwen_out.json incrementally."""
import json, csv, re, time, sys, os, torch
from transformers import AutoModelForCausalLM, AutoTokenizer
torch.set_num_threads(2)
dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
M = 'models/qg06'
tok = AutoTokenizer.from_pretrained(M)
model = AutoModelForCausalLM.from_pretrained(M, torch_dtype=torch.float32).to(dev).eval()
XS = sys.argv[1]
OUT = 'qwen_out.json'
res = json.load(open(OUT)) if os.path.exists(OUT) else {}
cand = {k: tok.encode(' ' + k, add_special_tokens=False)[0] for k in ['Safe', 'Unsafe', 'Controversial']}
cand2 = {k: tok.encode(k, add_special_tokens=False)[0] for k in ['Safe', 'Unsafe', 'Controversial']}
print('label first tokens', cand, cand2, flush=True)

def run(messages):
    text = tok.apply_chat_template(messages, tokenize=False)
    ids = tok([text], return_tensors='pt').to(dev)
    t0 = time.time()
    with torch.no_grad():
        g = model.generate(**ids, max_new_tokens=40, do_sample=False, output_scores=True, return_dict_in_generate=True)
    dt = time.time() - t0
    out = g.sequences[0][ids.input_ids.shape[1]:].tolist()
    content = tok.decode(out, skip_special_tokens=True)
    # find the step whose token starts the label (after "Safety:")
    probs = None
    for step, tid in enumerate(out):
        for table in (cand, cand2):
            if tid in table.values():
                sm = torch.softmax(g.scores[step][0].float(), -1)
                probs = {k: float(sm[v]) for k, v in table.items()}
                break
        if probs: break
    lab = re.search(r'Safety: (Safe|Unsafe|Controversial)', content)
    cats = re.findall(r'(Violent|Non-violent Illegal Acts|Sexual Content or Sexual Acts|PII|Suicide & Self-Harm|Unethical Acts|Politically Sensitive Topics|Copyright Violation|Jailbreak|None)', content)
    ref = re.search(r'Refusal: (Yes|No)', content)
    return dict(raw=content, label=lab.group(1) if lab else None, cats=cats, refusal=ref.group(1) if ref else None,
                p=probs, ms=round(dt * 1000), ntok=int(ids.input_ids.shape[1]))

xs = list(csv.DictReader(open(XS + '/model_completions/xstest_v2_completions_mistralinstruct.csv')))
dp = json.load(open('deepset_test.json'))
jobs = []
for r in xs: jobs.append(('xs_prompt', r['id'], [{'role': 'user', 'content': r['prompt']}]))
for r in xs: jobs.append(('xs_resp', r['id'], [{'role': 'user', 'content': r['prompt']}, {'role': 'assistant', 'content': r['completion']}]))
for i, r in enumerate(dp): jobs.append(('dp_prompt', str(i), [{'role': 'user', 'content': r['text']}]))
n = 0
for kind, i, msg in jobs:
    key = kind + ':' + i
    if key in res: continue
    res[key] = run(msg); n += 1
    if n % 25 == 0:
        json.dump(res, open(OUT, 'w')); print(n, key, res[key]['label'], res[key]['ms'], flush=True)
json.dump(res, open(OUT, 'w')); print('done', len(res), flush=True)
