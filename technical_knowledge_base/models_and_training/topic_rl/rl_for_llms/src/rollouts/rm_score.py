# Stage 2: score every rollout with a real reward model, Skywork-Reward-V2-Qwen3-0.6B (float32, CPU, 2 threads).
import json, torch
from transformers import AutoTokenizer, AutoModelForSequenceClassification
torch.set_num_threads(2)
RM = "Skywork/Skywork-Reward-V2-Qwen3-0.6B"
tok = AutoTokenizer.from_pretrained(RM)
rm = AutoModelForSequenceClassification.from_pretrained(RM, torch_dtype=torch.float32, num_labels=1).eval()
D = json.load(open('rollouts.json'))
SUF = D['suffix']
for P in D['problems']:
    for r in P['group']:
        conv = [{"role": "user", "content": P['question'] + SUF}, {"role": "assistant", "content": r['text']}]
        s = tok.apply_chat_template(conv, tokenize=False)
        if tok.bos_token is not None and s.startswith(tok.bos_token): s = s[len(tok.bos_token):]
        ids = tok(s, return_tensors='pt')
        with torch.no_grad(): r['rm'] = round(rm(**ids).logits[0][0].item(), 4)
    print(P['pid'], [(r['rm'], r['v_boxed']) for r in P['group']], flush=True)
D['rm_model'] = RM
json.dump(D, open('rollouts.json', 'w'))
print('done')
