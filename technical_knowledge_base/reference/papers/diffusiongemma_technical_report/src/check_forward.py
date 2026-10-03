"""Check that the page's JavaScript forward pass matches PyTorch on the shipped (6-bit) weights.

  uv run --with torch --with numpy python check_forward.py

For both variants and 64 held-out problems it compares, between PyTorch (model/<v>_q.pt, the dequantised weights
the page ships) and parts/22_js_model.js run in node on parts/20_model_data.js:
  - the causal encoder's logits at every prompt position,
  - the decoder's logits for canvas 1 on a random noisy canvas, without and with self-conditioning
    (z computed from the first pass at temperature 1, by each side independently),
  - the decoder's logits for canvas 3 with the reference answer's first two canvases encoded into the cache,
  - the greedy AR-mode answer.
Results go to model/check_forward.json.
"""
import json, os, random, subprocess
import torch
import train as T

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = r'''
const fs=require('fs');globalThis.window=globalThis;
globalThis.mulberry32=function(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}};
eval(fs.readFileSync(process.argv[1]+'/parts/20_model_data.js','utf8'));
eval(fs.readFileSync(process.argv[1]+'/parts/22_js_model.js','utf8')+';globalThis.TD=TD;');
const job=JSON.parse(fs.readFileSync(0,'utf8')),out={};
for(const v of job.variants){const M=TD.load(v);out[v]=job.items.map(it=>{
  const cc=TD.newCache(M);const enc=TD.encode(M,cc,it.prompt).map(a=>Array.from(a));
  const L0=TD.decode(M,cc,it.noisy,null);
  const sm=L0.map(l=>{let mx=-1e30;for(const x of l)mx=Math.max(mx,x);const e=Array.from(l).map(x=>Math.exp(x-mx));const s=e.reduce((a,b)=>a+b,0);return e.map(x=>x/s)});
  const L1=TD.decode(M,cc,it.noisy,TD.selfcond(M,sm));
  const c2=TD.newCache(M);TD.encode(M,c2,it.prompt.concat(it.ref.slice(0,16)));const L2=TD.decode(M,c2,it.noisy,null);
  const ar=TD.autoregress(M,it.prompt).ans;
  return {enc,L0:L0.map(a=>Array.from(a)),L1:L1.map(a=>Array.from(a)),L2:L2.map(a=>Array.from(a)),ar}})}
process.stdout.write(JSON.stringify(out));
'''


def main():
    torch.set_num_threads(2)
    ts = T.test_set(per=32, seed=999)
    rng = random.Random(5)
    items = [{'task': t, 'prompt': p, 'ref': a, 'noisy': [rng.randrange(T.VN) for _ in range(T.C)]} for t, p, a in ts]
    res = {}
    js = json.loads(subprocess.run(['node', '-e', NODE, HERE], input=json.dumps({'variants': ['multinomial', 'masked'], 'items': items}),
                                   capture_output=True, text=True, check=True).stdout)
    for v in ('multinomial', 'masked'):
        m = T.load(v, quant=True)
        dmax = {'encoder': 0.0, 'decoder': 0.0, 'decoder_selfcond': 0.0, 'decoder_canvas3': 0.0}
        ar_same = 0; arg_same = 0; n_arg = 0
        with torch.no_grad():
            for it, j in zip(items, js[v]):
                p = torch.tensor([it['prompt']]); x = torch.tensor([it['noisy']])
                enc, _ = m(p)
                dmax['encoder'] = max(dmax['encoder'], float((enc[0] - torch.tensor(j['enc'])).abs().max()))
                _, d0 = m(p, x, torch.tensor([T.P]))
                dmax['decoder'] = max(dmax['decoder'], float((d0[0] - torch.tensor(j['L0'])).abs().max()))
                z = m.selfcond(d0.softmax(-1))
                _, d1 = m(p, x, torch.tensor([T.P]), z)
                dmax['decoder_selfcond'] = max(dmax['decoder_selfcond'], float((d1[0] - torch.tensor(j['L1'])).abs().max()))
                ctx = torch.tensor([it['prompt'] + it['ref'][:16]])
                _, d2 = m(ctx, x, torch.tensor([T.P + 16]))
                dmax['decoder_canvas3'] = max(dmax['decoder_canvas3'], float((d2[0] - torch.tensor(j['L2'])).abs().max()))
                for a, b in ((d0[0], j['L0']), (d1[0], j['L1']), (d2[0], j['L2'])):
                    arg_same += int((a.argmax(-1) == torch.tensor(b).argmax(-1)).sum()); n_arg += T.C
                ar = T.ar_decode(m, p)[0].tolist()
                ar_same += int(ar == j['ar'])
        res[v] = {'max_abs_logit_diff': dmax, 'argmax_agree': '%d/%d' % (arg_same, n_arg), 'ar_answers_identical': '%d/%d' % (ar_same, len(items))}
        print(v, res[v])
    res['what'] = '64 held-out problems (32 per task); PyTorch on model/<v>_q.pt against parts/22_js_model.js in node'
    json.dump(res, open(os.path.join(HERE, 'model', 'check_forward.json'), 'w'), indent=1)


if __name__ == '__main__':
    main()
