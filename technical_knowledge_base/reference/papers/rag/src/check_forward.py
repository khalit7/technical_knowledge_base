"""Check the browser's forward pass (parts/22_js_rag.js, on the 6-bit weights in parts/20_model_data.js) against
PyTorch on the same dequantised weights (model/*_q.pt written by `train.py export`).
  uv run --with torch --with numpy python check_forward.py      (needs node; run train.py export again afterwards
                                                                  so the page shows the result)
Compares, for every held-out question and each shipped model: the retrieved top-5 and log p(z|x), the answer, and
the log-probability of the answer (RAG-Token: sum of log mixture probabilities of the chosen tokens; RAG-Sequence:
log p(y|x) of the chosen hypothesis; closed book: sum of log-probabilities of the chosen tokens).
"""
import json, os, subprocess, sys
import torch
import train as T

HERE = os.path.dirname(os.path.abspath(__file__))
JS = r'''
const fs=require('fs'),vm=require('vm');const ctx={atob:s=>Buffer.from(s,'base64').toString('binary'),console};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['20_model_data.js','21_js_world.js','22_js_rag.js'])vm.runInContext(fs.readFileSync(process.argv[2]+'/parts/'+f,'utf8'),ctx);
const {RAG,WORLD}=ctx,idx=RAG.makeIndex(WORLD.index('2018')),out={};
const qs=WORLD.questions.filter(q=>q.split==='test');
for(const m of ['tok','seq']){const M=RAG.load(m);out[m]=qs.map(q=>{const A=RAG.answer(M,idx,q.x,5);
  let lp=null;if(m==='tok')lp=A.steps.reduce((a,s)=>a+Math.log(s.p),0);else if(m==='seq')lp=Math.max(...A.hyps.map(h=>h.lp));else lp=A.steps.reduce((a,p)=>a+Math.log(p),0);
  return {y:A.y,lp,top:A.ret?A.ret.idx:null,lpz:A.ret?A.ret.lpz:null}})}
console.log(JSON.stringify(out));
'''


def torch_side():
    import math
    out = {}
    for m in ('tok', 'seq'):
        ck = torch.load(os.path.join(T.MD, m + '_q.pt')); g = T.Gen(); g.load_state_dict(ck['g']); g.eval()
        res = []
        if m == 'closed':
            for q in T.TEST:
                src = T.pad([T.gen_src(None, q['x'])]); o = [T.BOS]; lp = 0
                with torch.no_grad():
                    for _ in range(T.MAXY):
                        l = g(src, T.pad([o]))[0, -1]; b = int(l.argmax()); lp += float(l[b]); o.append(b)
                        if b == T.EOS: break
                y = o[1:]; y = y[:y.index(T.EOS)] if T.EOS in y else y
                res.append(dict(y=[T.VOCAB[i] for i in y], lp=lp))
        else:
            qe, de = T.BagEnc(), T.BagEnc(); qe.load_state_dict(ck['q']); de.load_state_dict(ck['d'])
            R = T.RAG(g, qe, de, T.W['index']['2018'], m)
            for q in T.TEST:
                with torch.no_grad():
                    top, lpz = R.retrieve([q['x']])
                    ans, _ = R.answer([q['x']])
                    y = ans[0]
                    lpt, _ = R.token_lp([q['x']], [y], top)
                    if m == 'tok':
                        lp = float(torch.logsumexp(lpz[0][:, None] + lpt[0], 0)[:len(y) + 1].sum())
                    else:
                        lp = float(torch.logsumexp(lpz[0] + lpt[0].sum(-1), -1))
                res.append(dict(y=y, lp=lp, top=top[0].tolist(), lpz=lpz[0].tolist()))
        out[m] = res
    return out


if __name__ == '__main__':
    torch.set_num_threads(2)
    js = os.path.join(T.MD, '_check.js'); open(js, 'w').write(JS)
    J = json.loads(subprocess.run(['node', js, HERE], capture_output=True, text=True, check=True).stdout)
    P = torch_side(); rep = {}
    for m in P:
        same = sum(a['y'] == b['y'] for a, b in zip(J[m], P[m])); n = len(P[m])
        dlp = max(abs(a['lp'] - b['lp']) for a, b in zip(J[m], P[m]) if a['y'] == b['y'])
        r = dict(n=n, same_answer=same, max_logprob_diff=dlp)
        if m != 'closed':
            # documents with equal scores can come back in either order, so compare the top 5 as sets and the top 1
            r['same_top5'] = sum(set(a['top']) == set(b['top']) for a, b in zip(J[m], P[m]))
            r['same_top1'] = sum(a['top'][0] == b['top'][0] for a, b in zip(J[m], P[m]))
            r['max_logprior_diff'] = max(max(abs(x - y) for x, y in zip(sorted(a['lpz']), sorted(b['lpz']))) for a, b in zip(J[m], P[m]))
        rep[m] = r; print(m, r)
    nm = dict(tok='RAG-Token', seq='RAG-Sequence', closed='closed book')
    rep['summary'] = '; '.join('%s: same answer on %d of %d held-out questions%s, answer log-probability within %.1e' % (
        nm[m], rep[m]['same_answer'], rep[m]['n'], (', the five retrieval log-probabilities within %.1e (documents whose scores tie exactly, such as an author\'s two book documents, can come back in either order)' % rep[m]['max_logprior_diff']) if 'same_top5' in rep[m] else '', rep[m]['max_logprob_diff']) for m in P)
    json.dump(rep, open(os.path.join(T.MD, 'check_forward.json'), 'w'), indent=1)
    os.remove(js)
