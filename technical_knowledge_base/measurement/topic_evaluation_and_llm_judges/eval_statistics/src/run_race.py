"""Score small open models on RACE-H (test) by next-token probabilities over the four answer letters.

usage: uv run --with torch --with transformers --with pyarrow python3 run_race.py <race_high_test.parquet> <model id> <out.json> [max_passages]
RACE-H test (https://huggingface.co/datasets/ehovy/race, config "high", split "test"): 3,498 questions on 1,045 passages,
the same counts as Miller (2024), Tables 3 and 4. Passages are taken in a fixed seeded order (seed 0); every question
of a chosen passage is kept, so clusters stay whole (Miller, Appendix C: sample at the cluster level).
Output per question: passage index, gold letter, and the model's probabilities over A/B/C/D renormalised over the
four letters (three decimals). Greedy answer = argmax; a "sampled" answer draws from these four probabilities.
"""
import sys, json, random, time, os
import torch, pyarrow.parquet as pq
from transformers import AutoTokenizer, AutoModelForCausalLM
torch.set_num_threads(2)
src, mid, out = sys.argv[1], sys.argv[2], sys.argv[3]
maxp = int(sys.argv[4]) if len(sys.argv) > 4 else 10 ** 9
rows = pq.read_table(src).to_pylist()
arts = sorted(set(r['example_id'] for r in rows))
random.Random(0).shuffle(arts)
arts = arts[:maxp]
keep = {a: i for i, a in enumerate(arts)}
qs = [r for r in rows if r['example_id'] in keep]
qs.sort(key=lambda r: (keep[r['example_id']], r['question']))
dev = os.environ.get('DEV') or ('mps' if torch.backends.mps.is_available() else 'cpu')
tok = AutoTokenizer.from_pretrained(mid)
model = AutoModelForCausalLM.from_pretrained(mid, torch_dtype=torch.float32).to(dev).eval()
letters = ['A', 'B', 'C', 'D']
ids = []
for L in letters:
    t = tok.encode(' ' + L, add_special_tokens=False)
    ids.append(t[-1])
part = out + '.part'
res = [json.loads(l) for l in open(part)] if os.path.exists(part) else []
fp = open(part, 'a')
t0 = time.time()
for k, r in enumerate(qs):
    if k < len(res):
        continue
    opts = '\n'.join('%s. %s' % (L, o) for L, o in zip(letters, r['options']))
    prompt = 'Read the article and answer the question.\n\nArticle:\n%s\n\nQuestion: %s\n%s\nAnswer:' % (r['article'].strip(), r['question'].strip(), opts)
    enc = tok(prompt, return_tensors='pt').to(dev)
    with torch.no_grad():
        lg = model(**enc).logits[0, -1]
    p = torch.softmax(lg[ids].float(), 0).tolist()
    res.append({'c': keep[r['example_id']], 'g': letters.index(r['answer']), 'p': [round(x, 3) for x in p]})
    fp.write(json.dumps(res[-1]) + '\n'); fp.flush()
    if k % 100 == 0:
        print(k, len(qs), round(time.time() - t0, 1), flush=True)
json.dump({'model': mid, 'dataset': 'ehovy/race high test', 'n_passages': len(arts), 'n_questions': len(qs),
           'prompt': 'zero-shot; "Read the article and answer the question." + article + question + lettered options + "Answer:"; next-token logits of " A".." D" renormalised',
           'device': dev, 'items': res}, open(out, 'w'))
print('done', len(qs), round(time.time() - t0, 1))
