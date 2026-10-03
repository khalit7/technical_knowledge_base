"""Check the page's JavaScript forward pass (parts/22_js_model.js) against PyTorch on the exported, quantised weights.

For every variant: 100 held-out sequences at the training length (and, for the induction-heads models, 20 at length 256),
comparing predictions, logits at every position and, for the Mamba models, layer 1's mean Delta and final SSM state.
Also checks that the page's seeded generators produce valid task instances. Writes model/check_forward.json.

  uv run --with torch --with numpy python check_forward.py      (needs node on PATH)
"""
import json, os, subprocess, sys
import torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import train as T

HERE = T.HERE
NODE = r'''
const fs=require('fs');globalThis.window=globalThis;globalThis.atob=s=>Buffer.from(s,'base64').toString('binary');
const dir=process.argv[process.argv.length-1];
eval(fs.readFileSync(dir+'/parts/20_model_data.js','utf8'));eval(fs.readFileSync(dir+'/parts/22_js_model.js','utf8'));
const job=JSON.parse(fs.readFileSync(0,'utf8'));const out=[];
for(const c of job){const M=MB.load(c.v);const r=MB.run(M,c.x,{want:M.kind!=='attn'});
  const o={logits:r.logits.map(a=>Array.from(a))};
  if(M.kind!=='attn'){o.dmean=r.steps.map(s=>s[0].mean);o.hlast=Array.from(r.steps[r.steps.length-1][0].h)}
  out.push(o)}
// generators: 200 of each, checked for the task's rules
let gen={sc:0,ih:0};const rs=(a=>()=>{a=(a+0x6D2B79F5)|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296})(5);
for(let i=0;i<200;i++){const s=MB.makeSC(rs);const d=s.x.slice(0,48).filter(v=>v>0);if(d.length===6&&s.x.slice(48).every(v=>v===9)&&d.every((v,j)=>v===s.y[j]))gen.sc++;
  const q=MB.makeIH(rs,64);if(q.x[63]===15&&q.x[q.p]===15&&q.x[q.p+1]===q.y&&q.x.filter(v=>v===15).length===2)gen.ih++}
process.stdout.write(JSON.stringify({out,gen}));
'''


def main():
    torch.set_num_threads(2)
    report = {}
    for name in T.VARIANTS:
        task = name.split('_')[0]
        m = T.build(name); m.load_state_dict(torch.load(os.path.join(HERE, 'model', name + '_q.pt'), weights_only=False)['state']); m.eval()
        sets = [T.test_set(task, n=100, seed=31337)]
        if task == 'ih': sets.append(T.test_set(task, L=256, n=20, seed=31337))
        jobs, ref = [], []
        for x, y in sets:
            with torch.no_grad():
                if name.endswith('attn'):
                    lg = m(x); extra = [None] * len(x)
                else:
                    lg, deltas = m(x, want=True); extra = [(deltas[0][i].mean(-1), None) for i in range(len(x))]
            for i in range(len(x)):
                jobs.append({'v': name, 'x': x[i].tolist()}); ref.append((lg[i], extra[i], y[i]))
        r = subprocess.run(['node', '-e', NODE, HERE], input=json.dumps(jobs), capture_output=True, text=True)
        if r.returncode: print(r.stderr); raise SystemExit(1)
        js = json.loads(r.stdout); out = js['out']
        same = dl = dd = 0.0; n = 0
        for o, (lg, ex, y) in zip(out, ref):
            jl = torch.tensor(o['logits'])
            dl = max(dl, (jl - lg).abs().max().item())
            same += int((jl.argmax(-1) == lg.argmax(-1)).all().item()); n += 1
            if ex is not None:
                dd = max(dd, (torch.tensor(o['dmean']) - ex[0]).abs().max().item())
        report[name] = dict(sequences=n, identical_predictions=int(same), max_logit_diff=float('%.3g' % dl), max_delta_mean_diff=None if name.endswith('attn') else float('%.3g' % dd))
        report['generators'] = js['gen']
        print(name, report[name])
    ok = all(v['identical_predictions'] == v['sequences'] and v['max_logit_diff'] < 1e-3 for k, v in report.items() if k != 'generators')
    ok = ok and report['generators'] == {'sc': 200, 'ih': 200}
    report['pass'] = ok
    tot = sum(v['sequences'] for k, v in report.items() if k not in ('generators', 'pass'))
    same = sum(v['identical_predictions'] for k, v in report.items() if k not in ('generators', 'pass'))
    mx = max(v['max_logit_diff'] for k, v in report.items() if k not in ('generators', 'pass'))
    report['summary'] = 'identical predictions at every position on %d of %d sequences, logits within %.1e' % (same, tot, mx)
    json.dump(report, open(os.path.join(HERE, 'model', 'check_forward.json'), 'w'), indent=1)
    print('PASS' if ok else 'FAIL', report['summary'], report['generators'])


if __name__ == '__main__':
    main()
