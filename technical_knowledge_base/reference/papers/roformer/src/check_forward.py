"""Check the page's JavaScript forward pass (parts/22_js_model.js) against PyTorch on the exported, quantised weights.

For every variant: 100 random sequences of length 32 and 100 of length 128, full attention, plus the test-time
options the page offers (a 32-token window; Position Interpolation for the RoPE variants). Compares predictions,
logits and attention weights; writes model/check_forward.json.

  uv run --with torch --with numpy python check_forward.py      (needs node on PATH)
"""
import json, os, subprocess, sys
import torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import train as T

HERE = T.HERE
NODE = r'''
const fs=require('fs');globalThis.window=globalThis;globalThis.atob=s=>Buffer.from(s,'base64').toString('binary');
eval(fs.readFileSync(process.argv[process.argv.length-1]+'/parts/20_model_data.js','utf8'));eval(fs.readFileSync(process.argv[process.argv.length-1]+'/parts/22_js_model.js','utf8'));
const job=JSON.parse(fs.readFileSync(0,'utf8'));const out=[];
for(const c of job){const M=RF.load(c.v);const r=RF.run(M,c.x,c.opt);out.push({pred:r.pred,logits:r.logits.map(a=>Array.from(a)),att:r.att.map(A=>A.map(a=>Array.from(a)))})}
process.stdout.write(JSON.stringify(out));
'''


def main():
    torch.set_num_threads(2)
    report, g = {}, torch.Generator().manual_seed(4242)
    for name in T.VARIANTS:
        ck = torch.load(os.path.join(HERE, 'model', name + '_q.pt'), weights_only=False)
        m = T.Model(name, ck['cfg']); m.load_state_dict(ck['state']); m.eval()
        opts = [('full', {}), ('window32', {'window': 32})] + ([('pi', {'pi': 0.25})] if 'rope' in name else [])
        res = {}
        for oname, opt in opts:
            jobs, ref = [], []
            for L in ((32, 128) if oname == 'full' else (128,)):
                xs = torch.randint(0, T.V, (100 if L == 32 else 40, L), generator=g)
                m.window = opt.get('window'); m.pi = opt.get('pi', 1.0)
                with torch.no_grad(): lg, a = m(xs, True)
                m.window, m.pi = None, 1.0
                for i in range(xs.shape[0]):
                    jobs.append({'v': name, 'x': xs[i].tolist(), 'opt': opt}); ref.append((lg[i], a[i]))
            js = json.loads(subprocess.run(['node', '-e', NODE, '--', HERE], input=json.dumps(jobs), capture_output=True, text=True, check=True).stdout)
            same = sum(int(torch.equal(torch.tensor(o['pred']), r[0].argmax(-1))) for o, r in zip(js, ref))
            dl = max((torch.tensor(o['logits']) - r[0]).abs().max().item() for o, r in zip(js, ref))
            da = max((torch.tensor(o['att']) - r[1]).abs().max().item() for o, r in zip(js, ref))
            res[oname] = {'sequences': len(jobs), 'identical_predictions': same, 'max_logit_diff': float('%.3g' % dl), 'max_att_diff': float('%.3g' % da)}
        report[name] = res
        print(name, res)
    ok = all(r['identical_predictions'] == r['sequences'] and r['max_logit_diff'] < 1e-3 for v in report.values() for r in v.values())
    report['PASS'] = ok
    json.dump(report, open(os.path.join(HERE, 'model', 'check_forward.json'), 'w'), indent=1)
    print('PASS' if ok else 'FAIL')


if __name__ == '__main__':
    main()
