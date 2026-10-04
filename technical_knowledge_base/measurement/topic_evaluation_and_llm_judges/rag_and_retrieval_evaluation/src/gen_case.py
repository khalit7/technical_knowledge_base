"""The retrieval-failure case of the Reading animation: one SciFact claim (BEIR test id 54, SciFact dev), its top-3
abstracts under BM25 and under the BM25 + dense RRF hybrid (from beir_run.py), and a small open model answering from
each context with a RAGTruth-style instruction. Greedy decoding, so the run is deterministic on this machine.
Usage: uv run --with torch --with transformers python gen_case.py <beir dir> <beir out dir> <out json> [claim id] [local model dir]"""
import json, sys, torch
from transformers import AutoTokenizer, AutoModelForCausalLM
torch.set_num_threads(2)
base, outd, out = sys.argv[1:4]
QID = sys.argv[4] if len(sys.argv) > 4 else '54'
MODEL = 'Qwen/Qwen2.5-1.5B-Instruct'
P = json.load(open(f'{outd}/scifact_perquery.json'))
C = {}
for l in open(f'{base}/scifact/corpus.jsonl'):
    d = json.loads(l); C[d['_id']] = d
q = P['q'][QID]
PATH = sys.argv[5] if len(sys.argv) > 5 else MODEL  # a local copy of the same weights, if the hub download stalls
tok = AutoTokenizer.from_pretrained(PATH); m = AutoModelForCausalLM.from_pretrained(PATH, dtype=torch.float32)
res = {'model': MODEL, 'qid': QID, 'claim': q['t'], 'gold': q['gold'], 'runs': {}}
for sysname in ['bm25_lucene', 'hybrid_rrf']:
    ids = q['top'][sysname][:3]
    ctx = '\n\n'.join(f'passage {i+1}: {C[d]["title"]}. {C[d]["text"]}' for i, d in enumerate(ids))
    prompt = ('Is the following scientific claim supported or contradicted by the passages?\n' + 'Claim: ' + q['t'] +
              '\nAnswer in one or two sentences, starting with "Supported", "Contradicted" or "Unable to answer based on given passages", and name the passage you rely on.' +
              '\nBear in mind that your response should be strictly based on the following three passages:\n' + ctx)
    msgs = [{'role': 'user', 'content': prompt}]
    x = tok(tok.apply_chat_template(msgs, add_generation_prompt=True, tokenize=False), return_tensors='pt')['input_ids']
    with torch.no_grad():
        y = m.generate(x, max_new_tokens=120, do_sample=False)
    ans = tok.decode(y[0, x.shape[1]:], skip_special_tokens=True).strip()
    res['runs'][sysname] = {'ids': ids, 'titles': [C[d]['title'] for d in ids], 'answer': ans, 'prompt_tokens': int(x.shape[1])}
    print(sysname, ids, '\n', ans, flush=True)
json.dump(res, open(out, 'w'), indent=1)
