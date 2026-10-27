"""Check the browser's forward pass (parts/22_js_model.js, run in node) against PyTorch on the same quantised weights.

  uv run --with torch --with numpy python check_forward.py      (after train.py export)

For both shipped variants: 200 test traces teacher-forced (every position's logits, both cross-attention layers'
weights, the gates, the frozen model's own logits) and 100 free-running generations (identical token sequences).
Writes model/check_forward.json.
"""
import json, os, random, subprocess
import torch
import train as T

HERE = os.path.dirname(os.path.abspath(__file__))
rng = random.Random(4242)
facts = rng.sample(T.TEST, 200)
js = r'''
const fs=require('fs');globalThis.window=globalThis;
eval(fs.readFileSync('parts/20_model_data.js','utf8'));eval(fs.readFileSync('parts/22_js_model.js','utf8'));
const job=JSON.parse(fs.readFileSync(0,'utf8')),res={tf:[],gen:[]};
for(const f of job.facts){const t=LM.trace(LM.facts[f]).full,r=LM.run(job.name,t);
  res.tf.push({logits:r.logits.map(x=>Array.from(x)),big:r.big.logits.map(x=>Array.from(x)),xatt:r.xatt.map(l=>l.map(h=>h.map(row=>Array.from(row)))),gates:r.gates.map(l=>l.map(x=>Array.from(x)))})}
for(const f of job.facts.slice(0,100))res.gen.push(LM.generate(job.name,LM.trace(LM.facts[f]).prompt).seq);
process.stdout.write(JSON.stringify(res));
'''
bq = torch.load(os.path.join(T.MD, 'q_big.pt'))
out = {}
for nm in T.SHIP:
    m = T.build(nm, 0).double(); vq = torch.load(os.path.join(T.MD, f'q_{nm}.pt'))
    full = dict(vq); full.update({'big.' + k: v for k, v in bq.items()}); m.load_state_dict(full); m.eval()
    r = subprocess.run(['node', '-e', js], input=json.dumps({'name': nm, 'facts': facts}), capture_output=True, text=True, cwd=HERE)
    if r.returncode: raise SystemExit(r.stderr)
    j = json.loads(r.stdout)
    dl = db = da = dg = 0.0
    with torch.no_grad():
        for f, jj in zip(facts, j['tf']):
            p, b = T.trace(T.FACTS[f]); ids = torch.tensor([p + b]); keep, gates = [], []
            lg = m(ids, keep=keep, gates=gates)
            dl = max(dl, float((lg[0] - torch.tensor(jj['logits'], dtype=torch.float64)).abs().max()))
            db = max(db, float((m.big(ids)[0] - torch.tensor(jj['big'], dtype=torch.float64)).abs().max()))
            for l in range(2):
                da = max(da, float((keep[l][0] - torch.tensor(jj['xatt'][l], dtype=torch.float64)).abs().max()))
                dg = max(dg, float((gates[l][0] - torch.tensor(jj['gates'][l], dtype=torch.float64)).abs().max()))
        seqs = T.generate(m, facts[:100])
        same = 0
        for s, g in zip(seqs, j['gen']):
            ss = s[:len(g)]
            same += ss == g and (len(g) == len(s) or s[len(g)] == T.EOS or len(g) == T.TLEN)
    out[nm] = dict(teacher_forced=len(facts), max_logit_diff=dl, max_big_logit_diff=db, max_xattn_diff=da, max_gate_diff=dg,
                   generations=100, identical_generations=same)
    print(nm, out[nm])
ok = all(v['identical_generations'] == 100 and v['max_logit_diff'] < 1e-8 for v in out.values())
out['verdict'] = 'PASS' if ok else 'FAIL'
json.dump(out, open(os.path.join(T.MD, 'check_forward.json'), 'w'), indent=1)
print(out['verdict'])
