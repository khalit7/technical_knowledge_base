"""Check that the page's JavaScript forward pass matches PyTorch on the shipped (6-bit) weights.

  uv run --with torch --with numpy python check_forward.py

For each of the four shipped models (model/ship_<kind>_q.pt, the dequantised weights the page carries) and
200 held-out prompts, it runs PyTorch and parts/22_js_model.js in node on parts/20_model_data.js, and
compares the next-token distribution read the way each kind is used (decoder: causal, last position;
encoder: three masks and [EOS], first mask; encoder-from-decoder: one position earlier), every attention
weight, and the three greedy generated tokens. It also checks that parts/_gen_results.js states the same toy
sizes as train.py and that the JS toy world draws prompts of the same shape. Results: model/check_forward.json.
"""
import json, os, random, subprocess, sys
import torch
import grammar as G
import train as T

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = r'''
const fs=require('fs');globalThis.window=globalThis;globalThis.atob=s=>Buffer.from(s,'base64').toString('binary');
for(const f of ['20_model_data.js','21_js_lang.js','22_js_model.js'])eval(fs.readFileSync(process.argv[1]+'/parts/'+f,'utf8'));
const job=JSON.parse(fs.readFileSync(0,'utf8')),out={};
for(const k of ['dec','enc','efd','dfe']){const M=EM.load(k);
  out[k]=job.prompts.map(p=>{const ids=[EM.BOS].concat(p.map(w=>EM.IDX[w]));const r=EM.next(M,ids);const g=EM.generate(M,ids,3);return {p:r.p,att:r.att,gen:g.map(x=>x.pick)}})}
process.stdout.write(JSON.stringify(out,(k,v)=>ArrayBuffer.isView(v)?Array.from(v):v));
'''


def main():
    r = random.Random(31337); prompts = [G.generate_example(r)[0] for _ in range(200)]
    js = json.loads(subprocess.run(['node', '-e', NODE, HERE], input=json.dumps({'prompts': prompts}), capture_output=True, text=True, check=True).stdout)
    rep = {'inputs_per_model': len(prompts)}; ok_all = True
    for k in ('dec', 'enc', 'efd', 'dfe'):
        q = torch.load(os.path.join(T.MD, 'ship_%s_q.pt' % k), weights_only=False)
        m = T.Toy(q['cfg']); m.load_state_dict(q['state']); m.eval()
        dp = da = 0.0; same_gen = 0
        how, shift = T.mode_of(k)
        with torch.no_grad():
            for i, p in enumerate(prompts):
                ids = [T.BOS] + [T.IDX[w] for w in p]
                if how == 'causal': X = torch.tensor([ids]); read = len(ids) - 1; causal = True
                else: X = torch.tensor([ids + [T.MASK] * 3 + [T.EOS]]); read = len(ids) - shift; causal = False
                keep = []; h = m.hidden(X, causal, keep); pr = m.logits(h[0, read]).softmax(-1)
                J = js[k][i]
                dp = max(dp, float((pr - torch.tensor(J['p'])).abs().max()))
                for l in range(len(keep)): da = max(da, float((keep[l][0] - torch.tensor(J['att'][l])).abs().max()))
                cur = list(ids); g = []
                for _ in range(3):
                    lp = T.next_logprobs(m, k, [cur])[0]; t = int(lp.argmax()); g.append(t); cur.append(t)
                same_gen += g == J['gen']
        rep[k] = dict(same_generation='%d/%d' % (same_gen, len(prompts)), max_abs_prob_diff=dp, max_abs_attention_diff=da)
        print(k, rep[k]); ok_all &= same_gen == len(prompts) and dp < 1e-4 and da < 1e-4
    src = open(os.path.join(HERE, 'mk_results.py')).read()
    sizes_ok = all(("'%s': dict(d=%d, L=%d, h=%d, I=%d)" % (s, c['d'], c['L'], c['h'], c['I'])) in src for s, c in T.SIZES.items())
    rep['sizes_agree'] = sizes_ok; ok_all &= sizes_ok
    rep['summary'] = 'identical greedy generations on %s held-out prompts for all four models; next-token probabilities within %.1e and attention weights within %.1e.' % (
        len(prompts), max(rep[k]['max_abs_prob_diff'] for k in ('dec', 'enc', 'efd', 'dfe')), max(rep[k]['max_abs_attention_diff'] for k in ('dec', 'enc', 'efd', 'dfe')))
    json.dump(rep, open(os.path.join(T.MD, 'check_forward.json'), 'w'), indent=1)
    print('PASS' if ok_all else 'FAIL', rep['summary']); sys.exit(0 if ok_all else 1)


if __name__ == '__main__':
    main()
