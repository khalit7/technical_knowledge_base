"""Check the page's JavaScript forward pass (parts/22_js_vit.js) against PyTorch on the quantised weights it ships.
  DATA=$DATA uv run --with torch --with numpy python check_forward.py   -> model/check_forward.json
For each shipped model: 300 test images; same predicted class, maximum logit and attention differences, and accuracy."""
import json, os, subprocess, sys
import numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import train as T
HERE = T.HERE
W = open(os.path.join(HERE, 'parts', '20_model_data.js')).read()
keys = json.loads(W[W.index('window.VITW=') + 12:W.rindex(';')])['models']
X, Y = T.load('test.u8'); X, Y = X[:300], Y[:300]
res = {}
for key, v in keys.items():
    ck = torch.load(os.path.join(HERE, 'model', v['run'] + '_q.pt'), weights_only=False)
    m = T.make(ck['arch']); m.load_state_dict(ck['state']); m.eval()
    with torch.no_grad(): lg, at = m(X, keep=True)
    inp = os.path.join(T.DATA, 'cf_in.json'); json.dump({'key': key, 'imgs': X.view(300, -1).tolist()}, open(inp, 'w'))
    js = """const fs=require('fs');globalThis.window=globalThis;eval(fs.readFileSync('%s','utf8'));eval(fs.readFileSync('%s','utf8'));
const I=JSON.parse(fs.readFileSync('%s','utf8')),m=VIT.load(I.key),out=[];
for(const im of I.imgs){const r=VIT.forward(m,Float32Array.from(im));out.push({l:r.logits,a:r.atts.map(al=>al.map(a=>Array.from(a)))})}
fs.writeFileSync('%s',JSON.stringify(out));""" % (os.path.join(HERE, 'parts', '20_model_data.js'), os.path.join(HERE, 'parts', '22_js_vit.js'), inp, inp + '.out')
    subprocess.run(['node', '-e', js], check=True)
    out = json.load(open(inp + '.out'))
    jl = np.array([o['l'] for o in out]); ja = np.array([o['a'] for o in out])
    ta = torch.stack(at, 1).numpy()  # (B, L, H, T, T)
    same = int((jl.argmax(1) == lg.numpy().argmax(1)).sum())
    res[key] = dict(images=300, same_class=same, max_logit_diff=float(np.abs(jl - lg.numpy()).max()),
                    max_att_diff=float(np.abs(ja.reshape(ta.shape) - ta).max()), acc_js=float((jl.argmax(1) == Y.numpy()).mean()))
    print(key, res[key])
ok = all(r['same_class'] == r['images'] and r['max_logit_diff'] < 1e-3 for r in res.values())
res['verdict'] = 'PASS' if ok else 'FAIL'; print(res['verdict'])
json.dump(res, open(os.path.join(HERE, 'model', 'check_forward.json'), 'w'), indent=1)
