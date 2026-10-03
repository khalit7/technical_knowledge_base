"""Check the browser's forward pass (parts/22_js_model.js, run in node) against PyTorch on the same quantised weights.

  uv run --with torch --with numpy python check_forward.py      (after train.py export)

For every shipped variant and 200 random prompts: the answer, the answer logits, the mixed K/V of every block
and the attention of the answer token must agree. Writes model/check_forward.json.
"""
import json, os, random, subprocess
import torch
import train as T

HERE = os.path.dirname(os.path.abspath(__file__))
N = 200
rng = random.Random(4242)
out = {}
js = r'''
const fs=require('fs');globalThis.window=globalThis;
eval(fs.readFileSync('parts/20_model_data.js','utf8'));eval(fs.readFileSync('parts/22_js_model.js','utf8'));
const job=JSON.parse(fs.readFileSync(0,'utf8')),res=[];
for(const p of job.prompts){const r=BT.run(job.name,p);
  res.push({ans:r.answer,eos:r.steps[1].tok,logits:Array.from(r.steps[0].logits),
    k:r.kv.map(b=>b.K.map(x=>Array.from(x))),v:r.kv.map(b=>b.V.map(x=>Array.from(x))),att:r.steps[0].att.map(l=>l.map(hh=>Array.from(hh[0])))})}
process.stdout.write(JSON.stringify(res));
'''
worst_all = 0
for nm in T.SHIP:
    meth = T.METHODS[nm]
    m = T.build(meth, 0).double(); m.load_state_dict(torch.load(os.path.join(T.MD, f'q_{nm}.pt')), strict=False); m = m.eval()
    prompts = [T.task_example(rng, meth.get('qfirst', False)) for _ in range(N)]
    r = subprocess.run(['node', '-e', js], input=json.dumps({'name': nm, 'prompts': [p for p, _ in prompts]}), capture_output=True, text=True, cwd=HERE)
    if r.returncode: raise SystemExit(r.stderr)
    jres = json.loads(r.stdout)
    same_ans = same_eos = 0; dl = dk = da = 0.0
    with torch.no_grad():
        for (p, a), j in zip(prompts, jres):
            pr = torch.tensor([p]); keep = []
            past, _ = T.prefill(m, meth, pr)
            lg = T.answer_logits(m, meth, pr, torch.tensor([[T.COLON, j['ans']]]), keep=keep)
            ans = int(lg[0, 0, T.P0:T.C0].argmax()) + T.P0; eos = int(lg[0, 1].argmax())
            same_ans += ans == j['ans']; same_eos += eos == j['eos']
            dl = max(dl, float((lg[0, 0] - torch.tensor(j['logits'], dtype=torch.float64)).abs().max()))
            for l in range(T.CFG['L']):
                K = past[l][0][0].transpose(0, 1).reshape(len(p), -1); V = past[l][1][0].transpose(0, 1).reshape(len(p), -1)
                dk = max(dk, float((K - torch.tensor(j['k'][l], dtype=torch.float64)).abs().max()), float((V - torch.tensor(j['v'][l], dtype=torch.float64)).abs().max()))
                at = keep[-T.CFG['L'] + l][0, :, 0, :len(p) + 1]   # the answer pass's attention, row of ':' (it cannot see the later answer token)
                da = max(da, float((at - torch.tensor(j['att'][l], dtype=torch.float64)).abs().max()))
    out[nm] = dict(prompts=N, same_answer=same_ans, same_eos=same_eos, max_logit_diff=dl, max_kv_diff=dk, max_att_diff=da)
    worst_all = max(worst_all, dl)
    print(nm, out[nm])
ok = all(v['same_answer'] == N and v['same_eos'] == N and v['max_logit_diff'] < 1e-8 for v in out.values())
out['verdict'] = 'PASS' if ok else 'FAIL'
json.dump(out, open(os.path.join(T.MD, 'check_forward.json'), 'w'), indent=1)
print(out['verdict'])
