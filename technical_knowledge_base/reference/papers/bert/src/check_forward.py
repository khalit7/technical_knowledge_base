"""Check that the page's JavaScript forward pass matches PyTorch on the shipped (quantised) weights.

  uv run --with torch --with numpy python check_forward.py

For each of the four shipped models and 200 inputs (pretraining pairs with the paper's masking for the
pretrained models, test sentences for the taggers) it runs PyTorch (model/<name>_q.pt, the dequantised
weights the page ships) and parts/22_js_model.js in node on parts/20_model_data.js, and compares every
output logit (masked LM / next word, NSP, tags), every attention weight (every layer and head) and the
argmax decisions. It also checks the JavaScript grammar's truth labels (parts/21_js_lang.js) against
grammar.py. Results go to model/check_forward.json.
"""
import json, os, random, subprocess, sys
import torch
import grammar as G
import train as T

HERE = os.path.dirname(os.path.abspath(__file__))
NODE = r'''
const fs=require('fs');globalThis.window=globalThis;
for(const f of ['20_model_data.js','21_js_lang.js','22_js_model.js'])eval(fs.readFileSync(process.argv[1]+'/parts/'+f,'utf8'));
const job=JSON.parse(fs.readFileSync(0,'utf8')),out={};
for(const [name,items] of Object.entries(job.items)){const M=BM.load(name);
  out[name]=items.map(it=>{const R=BM.run(M,it.a,it.b);return {lm:R.lm&&R.lm.map(a=>Array.from(a)),nsp:R.nsp||null,tag:R.tag&&R.tag.map(a=>Array.from(a)),att:R.att}})}
out.lang=job.lang.map(w=>LANG.truth(w));
process.stdout.write(JSON.stringify(out,(k,v)=>ArrayBuffer.isView(v)?Array.from(v):v));
'''


def main():
    r = random.Random(77); items = {}
    pre = []
    for _ in range(200):
        a, b, nx = G.pretrain_pair(r); ids, seg = T.pack(a, b); x, y, kinds = T.mask_example(ids, r)
        n = len(a) + 2; wa = [T.VOCAB[i] for i in x[1:n - 1]]; wb = [T.VOCAB[i] for i in x[n:-1]]
        pre.append({'a': wa, 'b': wb})
    ltr = [{'a': G.pretrain_pair(r)[0], 'b': []} for _ in range(200)]
    tst = [{'a': w, 'b': []} for w, *_ in T.test_sets()['tok'][:200]]
    items = {'bert': pre, 'ltr': ltr, 'bert_tag': tst, 'ltr_tag': tst}
    lang = [w for w, tags, lab, info in T.test_sets()['tok'][:400]]
    js = json.loads(subprocess.run(['node', '-e', NODE, HERE], input=json.dumps({'items': items, 'lang': lang}), capture_output=True, text=True, check=True).stdout)
    rep = {'inputs_per_model': 200}
    truth = [tags for w, tags, lab, info in T.test_sets()['tok'][:400]]
    lang_ok = sum(js['lang'][i] == truth[i] for i in range(len(lang)))
    rep['grammar_truth_match'] = '%d/%d' % (lang_ok, len(lang))
    ok_all = lang_ok == len(lang)
    for name, its in items.items():
        q = torch.load(os.path.join(T.MD, name + '_q.pt'), weights_only=False)
        if q['kind'] == 'pre': m = T.Bert(T.CFG, causal=q['causal'])
        else: m = T.Tagger(T.Bert(T.CFG, causal=q['causal']), 'tok')
        m.load_state_dict(q['state']); m.eval()
        dl = da = dn = 0.0; same = 0
        with torch.no_grad():
            for i, it in enumerate(its):
                ids = [T.CLS] + [T.IDX[w] for w in it['a']] + [T.SEP]; seg = [0] * len(ids)
                if it['b']: ids += [T.IDX[w] for w in it['b']] + [T.SEP]; seg += [1] * (len(it['b']) + 1)
                X, S = torch.tensor([ids]), torch.tensor([seg]); keep = []
                J = js[name][i]
                if q['kind'] == 'pre':
                    h = m(X, S, keep); lg = m.lm_logits(h)[0]; jl = torch.tensor(J['lm'])
                    if not q['causal']: dn = max(dn, float((m.nsp_logits(h)[0].softmax(-1) - torch.tensor(J['nsp'])).abs().max()))
                else:
                    lg = m(X, S, keep)[0]; jl = torch.tensor(J['tag'])
                dl = max(dl, float((lg - jl).abs().max())); same += bool((lg.argmax(-1) == jl.argmax(-1)).all())
                for l in range(len(keep)): da = max(da, float((keep[l][0] - torch.tensor(J['att'][l])).abs().max()))
        rep[name] = dict(same_argmax_everywhere='%d/%d' % (same, len(its)), max_abs_logit_diff=dl, max_abs_attention_diff=da, max_abs_nsp_prob_diff=dn)
        print(name, rep[name])
        ok_all &= same == len(its) and dl < 1e-3 and da < 1e-4 and dn < 1e-4
    print('grammar truth', rep['grammar_truth_match'])
    json.dump(rep, open(os.path.join(T.MD, 'check_forward.json'), 'w'), indent=1)
    print('PASS' if ok_all else 'FAIL'); sys.exit(0 if ok_all else 1)


if __name__ == '__main__':
    main()
