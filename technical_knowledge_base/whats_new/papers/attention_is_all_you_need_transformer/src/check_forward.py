"""Check that the page's JavaScript forward pass matches PyTorch on the shipped (quantised) weights.

  uv run --with torch --with numpy python check_forward.py

For every variant and 200 held-out test sentences it compares, between PyTorch (model/<v>_q.pt,
the dequantised weights the page ships) and parts/22_js_model.js run in node on parts/20_model_data.js:
the greedy translation, every logit of the final decoder pass, and every attention weight (encoder
self, masked decoder self, cross; every layer and head). It also checks that the JavaScript grammar
(parts/21_js_lang.js) gives the same reference translation and alignment as grammar.py, and that the
JavaScript model's accuracy on these sentences matches PyTorch's. Results go to model/check_forward.json.
"""
import json, os, subprocess, sys
import torch
import grammar as G
import train as T

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = r'''
const fs=require('fs');globalThis.window=globalThis;
eval(fs.readFileSync(process.argv[1]+'/parts/20_model_data.js','utf8'));
eval(fs.readFileSync(process.argv[1]+'/parts/21_js_lang.js','utf8'));
eval(fs.readFileSync(process.argv[1]+'/parts/22_js_model.js','utf8'));
const job=JSON.parse(fs.readFileSync(0,'utf8')),out={};
for(const v of job.variants){const M=TM.load(v);out[v]=job.sents.map(s=>{const r=TM.translate(M,s);return {out:r.out,logits:r.logits.map(a=>Array.from(a)),enc:r.enc,self:r.self,crs:r.crs}})}
out.lang=job.sents.map(s=>({tr:LANG.translate(s),al:LANG.align(s)}));
process.stdout.write(JSON.stringify(out,(k,v)=>ArrayBuffer.isView(v)?Array.from(v):v));
'''


def torch_run(m, s):
    src = torch.tensor([[T.IDX[w] for w in s]])
    hyp = [T.VOCAB[i] for i in m.greedy(src)[0].tolist()]
    if '</s>' in hyp: hyp = hyp[:hyp.index('</s>') + 1]
    keep = {'enc': [], 'dec': [], 'crs': []}
    mem, smask = m.encode(src, keep)
    tin = torch.tensor([[T.BOS] + [T.IDX[w] for w in hyp[:-1]]])  # row t of the logits chose word t+1
    logits = m.decode(tin, mem, smask, keep)[0]
    return hyp, logits, keep


def main():
    variants = list(T.VARIANTS)
    ck = torch.load(os.path.join(HERE, 'model', 'full.pt'), weights_only=False)
    sents = ck['test'][:200]
    js = json.loads(subprocess.run(['node', '-e', NODE, HERE], input=json.dumps({'variants': variants, 'sents': sents}),
                                   capture_output=True, text=True, check=True).stdout)
    rep = {'sentences': len(sents)}
    lang_ok = sum(js['lang'][i]['tr'] == G.translate(s) and [a if a is not None else None for a in js['lang'][i]['al']] == G.alignment(s) for i, s in enumerate(sents))
    rep['grammar_match'] = '%d/%d' % (lang_ok, len(sents))
    for v in variants:
        q = torch.load(os.path.join(HERE, 'model', v + '_q.pt'), weights_only=False)
        m = T.Transformer(q['cfg']); m.load_state_dict(q['state']); m.eval()
        same_out = 0; dl = da = 0.0; acc_t = acc_j = 0
        with torch.no_grad():
            for i, s in enumerate(sents):
                hyp, logits, keep = torch_run(m, s)
                J = js[v][i]
                ref = G.translate(s) + ['</s>']
                acc_t += hyp == ref; acc_j += J['out'] == ref
                same_out += hyp == J['out']
                if hyp != J['out']: continue
                dl = max(dl, float((logits - torch.tensor(J['logits'])).abs().max()))
                for kk, jk in (('enc', 'enc'), ('dec', 'self'), ('crs', 'crs')):
                    for l in range(len(keep[kk])):
                        da = max(da, float((keep[kk][l][0] - torch.tensor(J[jk][l])).abs().max()))
        rep[v] = dict(same_translation='%d/%d' % (same_out, len(sents)), max_abs_logit_diff=dl, max_abs_attention_diff=da,
                      torch_accuracy=acc_t / len(sents), js_accuracy=acc_j / len(sents))
        print(v, rep[v])
    print('grammar', rep['grammar_match'])
    json.dump(rep, open(os.path.join(HERE, 'model', 'check_forward.json'), 'w'), indent=1)
    ok = all(rep[v]['same_translation'].split('/')[0] == str(len(sents)) and rep[v]['max_abs_logit_diff'] < 1e-3 and rep[v]['max_abs_attention_diff'] < 1e-4 for v in variants) and lang_ok == len(sents)
    print('PASS' if ok else 'FAIL'); sys.exit(0 if ok else 1)


if __name__ == '__main__':
    main()
