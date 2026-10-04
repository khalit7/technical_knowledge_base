# Stage 1: real GRPO-style rollouts from Qwen2.5-0.5B-Instruct on GSM8K test problems.
# For each sampled token we keep three log-probabilities:
#   lp_roll  : what the "inference engine" sampled with (float16 on Apple MPS, KV cache, generate())
#   lp_train : what a "trainer" recomputes for the same token (float32 on CPU, one full forward pass, no cache)
#   lp_bf16  : the same token, bfloat16 on MPS, one full forward pass (no cache)
#   lp_ref   : the same token under Qwen2.5-0.5B base (float32 CPU), the stand-in reference model
# Verifiers: boxed (strict), last number, gold-anywhere (lenient). Output: rollouts.json
import json, re, sys, time, torch
from transformers import AutoTokenizer, AutoModelForCausalLM
torch.set_num_threads(2)
torch.manual_seed(0)
PIDS = [int(x) for x in sys.argv[1].split(',')] if len(sys.argv) > 1 else [0, 1, 2, 3, 5, 7, 10, 12, 20, 25]
G = 16; MAXNEW = 512
INST = "Qwen/Qwen2.5-0.5B-Instruct"; BASE = "Qwen/Qwen2.5-0.5B"
tok = AutoTokenizer.from_pretrained(INST)
data = [json.loads(l) for l in open('gsm8k_test.jsonl')]
roll = AutoModelForCausalLM.from_pretrained(INST, torch_dtype=torch.float16).to('mps').eval()
train = AutoModelForCausalLM.from_pretrained(INST, torch_dtype=torch.float32).eval()
bf = AutoModelForCausalLM.from_pretrained(INST, torch_dtype=torch.bfloat16).to('mps').eval()
ref = AutoModelForCausalLM.from_pretrained(BASE, torch_dtype=torch.float32).eval()
SUFFIX = "\nPlease reason step by step, and put your final answer within \\boxed{}."

def num(s):
    s = s.replace(',', '').replace('$', '').strip()
    m = re.findall(r'-?\d+(?:\.\d+)?', s)
    return float(m[-1]) if m else None

def v_boxed(text, gold):
    b = re.findall(r'\\boxed\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}', text)
    if not b: return 0
    v = num(b[-1]); return int(v is not None and abs(v - gold) < 1e-6)

def v_last(text, gold):
    v = num(text); return int(v is not None and abs(v - gold) < 1e-6)

def v_any(text, gold):
    vals = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', text.replace(',', ''))]
    return int(any(abs(v - gold) < 1e-6 for v in vals))

@torch.no_grad()
def lps(model, ids, plen, dev='cpu'):
    out = model(ids.to(dev)).logits.float().cpu()
    lp = torch.log_softmax(out[0, plen - 1:-1], -1)
    return lp.gather(1, ids[0, plen:].unsqueeze(1)).squeeze(1)

res = []
for pid in PIDS:
    q = data[pid]['question']; gold = float(data[pid]['answer'].split('####')[-1].replace(',', ''))
    msgs = [{"role": "user", "content": q + SUFFIX}]
    prompt = tok.apply_chat_template(msgs, tokenize=False, add_generation_prompt=True)
    pids = tok(prompt, return_tensors='pt').input_ids
    plen = pids.shape[1]
    t0 = time.time()
    torch.manual_seed(1000 + pid)
    with torch.no_grad():
        g = roll.generate(pids.repeat(G, 1).to('mps'), attention_mask=torch.ones(G, plen, dtype=torch.long).to('mps'), do_sample=True, temperature=1.0, top_k=0, top_p=1.0, repetition_penalty=1.0,
                          max_new_tokens=MAXNEW, output_scores=True, output_logits=True, return_dict_in_generate=True,
                          pad_token_id=tok.pad_token_id)
    seqs = g.sequences.cpu()
    T = len(g.scores)
    chosen = seqs[:, plen:plen + T]
    LR = torch.stack([torch.log_softmax(g.logits[s].float(), -1).gather(1, chosen[:, s:s+1].to('mps')).squeeze(1).cpu() for s in range(T)], 1)  # G x T
    print('scores-vs-logits max diff', float(max((g.scores[s].float()-g.logits[s].float()).abs().nan_to_num(0, 0, 0).max() for s in range(3))), flush=True)
    del g
    group = []
    for i in range(G):
        gen = seqs[i, plen:]
        L = len(gen)
        eos = [j for j, t in enumerate(gen.tolist()) if t in (tok.eos_token_id, tok.pad_token_id, 151645)]
        n = eos[0] + 1 if eos else L  # include the end token
        trunc = not eos
        gen = gen[:n]
        lr = LR[i, :n]
        ids = torch.cat([pids[0], gen]).unsqueeze(0)
        lt = lps(train, ids, plen); lf = lps(ref, ids, plen); lb = lps(bf, ids, plen, 'mps')
        text = tok.decode(gen, skip_special_tokens=True)
        toks = [tok.decode([t]) for t in gen.tolist()]
        group.append(dict(ids=gen.tolist(), text=text, toks=toks, lp_roll=[round(x, 5) for x in lr.tolist()],
                          lp_train=[round(x, 5) for x in lt.tolist()], lp_ref=[round(x, 5) for x in lf.tolist()], lp_bf16=[round(x, 5) for x in lb.tolist()],
                          len=n, truncated=trunc, v_boxed=v_boxed(text, gold), v_last=v_last(text, gold), v_any=v_any(text, gold)))
    res.append(dict(pid=pid, question=q, gold=gold, prompt=prompt, group=group))
    print(pid, 'boxed', sum(r['v_boxed'] for r in group), 'last', sum(r['v_last'] for r in group), 'any', sum(r['v_any'] for r in group),
          'lens', [r['len'] for r in group], f'{time.time()-t0:.0f}s', flush=True)
    json.dump(dict(model=INST, ref=BASE, G=G, maxnew=MAXNEW, suffix=SUFFIX, problems=res), open('rollouts.json', 'w'))
print('done')
