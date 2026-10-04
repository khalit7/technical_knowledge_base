"""Run protectai/deberta-v3-base-prompt-injection-v2 (the LLM Guard prompt-injection scanner model) on the 450 XSTest
prompts and the 116 deepset/prompt-injections test items. Records P(INJECTION) and wall time. Writes pi_out.json."""
import json, csv, time, sys, torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
torch.set_num_threads(2)
P = 'models/pi2'
tok = AutoTokenizer.from_pretrained(P)
m = AutoModelForSequenceClassification.from_pretrained(P).eval()
print(m.config.id2label, flush=True)
inj = [k for k, v in m.config.id2label.items() if 'INJ' in v.upper()][0]
XS = sys.argv[1]
xs = list(csv.DictReader(open(XS + '/xstest_prompts.csv')))
dp = json.load(open('deepset_test.json'))
res = {}
def score(t):
    x = tok(t, return_tensors='pt', truncation=True, max_length=512)
    t0 = time.time()
    with torch.no_grad(): p = torch.softmax(m(**x).logits[0], -1)[int(inj)].item()
    return dict(p=round(p, 6), ms=round((time.time() - t0) * 1000, 1), ntok=int(x.input_ids.shape[1]))
for r in xs: res['xs:' + r['id']] = score(r['prompt'])
for i, r in enumerate(dp): res['dp:' + str(i)] = score(r['text'])
json.dump(res, open('pi_out.json', 'w')); print('done', len(res), flush=True)
