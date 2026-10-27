"""Check that the page's JavaScript toy Qwen3 matches PyTorch on the shipped (6-bit) weights.

  uv run --with torch --with numpy python check_forward.py

For every shipped variant and 240 held-out problems (20 per length), in three modes and four budgets, it compares
PyTorch's batched decoder (train.batched_decode on model/<v>_q.pt) with parts/22_js_model.js run in node on
parts/20_model_data.js: the decoded trace (thinking tokens, cut, answer) and every logit of the final sequence.
It also checks the unbatched reference decoder (train.decode_one) against the batched one. Writes model/check_forward.json.
"""
import json, os, subprocess, sys
import torch
import train as T
import evaluate as E

HERE = T.HERE
NODE = r'''
const fs=require('fs');globalThis.window=globalThis;globalThis.atob=s=>Buffer.from(s,'base64').toString('binary');
eval(fs.readFileSync(process.argv[1]+'/parts/20_model_data.js','utf8'));
const TQ=require(process.argv[1]+'/parts/22_js_model.js');
const job=JSON.parse(fs.readFileSync(0,'utf8')),out=[];
for(const c of job.cases){const r=TQ.decode(c.v,c.q,c.mode,c.b);const lg=TQ.forward(TQ.load(c.v),r.seq);
  out.push({think:r.think,cut:r.cut,ans:r.ans,bad:r.bad,seq:r.seq,logits:lg.map(a=>Array.from(a))})}
process.stdout.write(JSON.stringify(out));
'''


def main():
    torch.set_num_threads(2)
    test = T.test_set(); qs = [q for i, q in enumerate(test) if i % 10 == 0]  # 20 per length
    cases = []
    for v in E.SHIP:
        for mode, b in (('think', None), ('default', None), ('nothink', None), ('think', 0), ('think', 3), ('think', 7)):
            for q in qs: cases.append(dict(v=v, q=q, mode=mode, b=b))
    js = json.loads(subprocess.run(['node', '-e', NODE, HERE], input=json.dumps({'cases': cases}), capture_output=True, text=True, check=True).stdout)
    models = {v: E.load(v, True)[0] for v in E.SHIP}
    rep = {'cases': len(cases)}; same = 0; same_ref = 0; dl = 0.0; acc_t = acc_j = 0
    # PyTorch, batched by (variant, mode, budget, n)
    torch_out = {}
    for v in E.SHIP:
        for mode, b in sorted(set((c['mode'], c['b'] if c['b'] is not None else -1) for c in cases)):
            bb = None if b == -1 else b
            for n, group in E.by_n(qs).items():
                for q, o in zip(group, T.batched_decode(models[v], group, mode, bb)): torch_out[(v, mode, b, tuple(q))] = o
    with torch.no_grad():
        for c, J in zip(cases, js):
            o = torch_out[(c['v'], c['mode'], c['b'] if c['b'] is not None else -1, tuple(c['q']))]
            r = T.decode_one(models[c['v']], c['q'], c['mode'], c['b'])
            key = lambda x: (x['think'], x['cut'], x['ans'], x['bad'])
            same += key(o) == key(J); same_ref += key(o) == key(r)
            ans = T.psums(c['q'])[-1]; acc_t += o['ans'] == ans; acc_j += J['ans'] == ans
            lg = models[c['v']](torch.tensor([J['seq']]))[0]
            dl = max(dl, float((lg - torch.tensor(J['logits'])).abs().max()))
    rep.update(same_trace='%d/%d' % (same, len(cases)), batched_vs_reference='%d/%d' % (same_ref, len(cases)), max_abs_logit_diff=dl,
               torch_acc=acc_t / len(cases), js_acc=acc_j / len(cases))
    ok = same == len(cases) and same_ref == len(cases) and dl < 1e-3
    rep['result'] = 'PASS' if ok else 'FAIL'
    print(rep)
    json.dump(rep, open(os.path.join(HERE, 'model', 'check_forward.json'), 'w'), indent=1)
    sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
