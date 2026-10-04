# Stage 3: Monte Carlo values of prefixes (the VinePPO idea): from each cut point of a chosen response,
# sample K continuations from the same policy (float16, MPS) and score them with the strict boxed verifier.
# V(prefix) ~ fraction of continuations that pass. Usage: python mc_values.py <pid>:<i>,<pid>:<i> ...
import json, sys, time, torch
from transformers import AutoTokenizer, AutoModelForCausalLM
torch.set_num_threads(2)
from rollouts_lib import v_boxed
INST = "Qwen/Qwen2.5-0.5B-Instruct"; K = 16; NCUT = 10
tok = AutoTokenizer.from_pretrained(INST)
from transformers import AutoModelForSequenceClassification
RMN = 'Skywork/Skywork-Reward-V2-Qwen3-0.6B'
rtok = AutoTokenizer.from_pretrained(RMN)
rm = AutoModelForSequenceClassification.from_pretrained(RMN, torch_dtype=torch.float32, num_labels=1).eval()
def rmscore(q, text):
    s = rtok.apply_chat_template([{'role': 'user', 'content': q}, {'role': 'assistant', 'content': text}], tokenize=False)
    if rtok.bos_token is not None and s.startswith(rtok.bos_token): s = s[len(rtok.bos_token):]
    with torch.no_grad(): return rm(**rtok(s, return_tensors='pt')).logits[0][0].item()
m = AutoModelForCausalLM.from_pretrained(INST, torch_dtype=torch.float16).to('mps').eval()
D = json.load(open('rollouts.json'))
byid = {P['pid']: P for P in D['problems']}
picks = [tuple(map(int, x.split(':'))) for x in sys.argv[1].split(',')]
out = json.load(open('mc_values.json')) if len(sys.argv) > 2 and sys.argv[2] == 'append' else {}
for pid, i in picks:
    P = byid[pid]; r = P['group'][i]
    pids = tok(P['prompt'], return_tensors='pt').input_ids[0]
    full = torch.cat([pids, torch.tensor(r['ids'])])
    n = len(full) - len(pids)
    cuts = sorted(set([0] + [round(n * k / NCUT) for k in range(1, NCUT)]))
    vals = []
    for c in cuts:
        t0 = time.time()
        prefix = full[:len(pids) + c].unsqueeze(0)
        torch.manual_seed(7 + c)
        with torch.no_grad():
            g = m.generate(prefix.repeat(K, 1).to('mps'), attention_mask=torch.ones(K, prefix.shape[1], dtype=torch.long).to('mps'),
                           do_sample=True, temperature=1.0, top_k=0, top_p=1.0, repetition_penalty=1.0, max_new_tokens=512 - c if c < 480 else 32,
                           pad_token_id=tok.pad_token_id)
        texts = [tok.decode(full[len(pids):len(pids) + c].tolist() + g[j, prefix.shape[1]:].cpu().tolist(), skip_special_tokens=True) for j in range(K)]
        passes = [v_boxed(t, P['gold']) for t in texts]
        rms = [round(rmscore(P['question'] + D['suffix'], t), 4) for t in texts]
        vals.append(dict(cut=c, v=sum(passes) / K, passes=passes, rm=rms, vrm=sum(rms) / K))
        print(pid, i, c, '/', n, sum(passes), round(sum(rms)/K,3), f'{time.time()-t0:.0f}s', flush=True)
    out[f'{pid}:{i}'] = dict(pid=pid, i=i, n=n, K=K, ntok_stored=r['len'], vals=vals)
    json.dump(out, open('mc_values.json', 'w'))
print('done')
