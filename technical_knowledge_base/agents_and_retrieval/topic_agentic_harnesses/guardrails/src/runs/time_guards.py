"""Clean latency pass, run alone after the other jobs: Qwen3Guard-Gen-0.6B (Apple MPS, fp32, greedy until the label line,
max 12 new tokens) on the first 40 XSTest prompts and the same 40 prompts with Mistral-7B-Instruct's answers, after 3 warm-up
calls; Protect AI's DeBERTa scanner on the same 40 prompts on 2 CPU threads. Writes timing.json with medians in ms.
usage: python time_guards.py <xstest dir> <qwen dir> <deberta dir>"""
import csv, json, sys, time, statistics, torch
from transformers import AutoModelForCausalLM, AutoTokenizer, AutoModelForSequenceClassification
torch.set_num_threads(2)
XS, QD, PD = sys.argv[1:4]
rows = list(csv.DictReader(open(XS + '/model_completions/xstest_v2_completions_mistralinstruct.csv')))[:40]
dev = 'mps' if torch.backends.mps.is_available() else 'cpu'
tok = AutoTokenizer.from_pretrained(QD); m = AutoModelForCausalLM.from_pretrained(QD, torch_dtype=torch.float32).to(dev).eval()
def q(msgs):
    ids = tok([tok.apply_chat_template(msgs, tokenize=False)], return_tensors='pt').to(dev)
    t0 = time.time()
    with torch.no_grad(): m.generate(**ids, max_new_tokens=12, do_sample=False)
    if dev == 'mps': torch.mps.synchronize()
    return 1000 * (time.time() - t0)
for r in rows[:3]: q([{'role': 'user', 'content': r['prompt']}])
qp = [q([{'role': 'user', 'content': r['prompt']}]) for r in rows]
qr = [q([{'role': 'user', 'content': r['prompt']}, {'role': 'assistant', 'content': r['completion']}]) for r in rows]
pt = AutoTokenizer.from_pretrained(PD); pm = AutoModelForSequenceClassification.from_pretrained(PD).eval()
def p(t):
    x = pt(t, return_tensors='pt', truncation=True, max_length=512); t0 = time.time()
    with torch.no_grad(): pm(**x)
    return 1000 * (time.time() - t0)
for r in rows[:3]: p(r['prompt'])
pi = [p(r['prompt']) for r in rows]
out = dict(qp_ms=statistics.median(qp), qr_ms=statistics.median(qr), pi_ms_cpu=statistics.median(pi), n=len(rows), device=dev)
json.dump(out, open('timing.json', 'w')); print(out)
