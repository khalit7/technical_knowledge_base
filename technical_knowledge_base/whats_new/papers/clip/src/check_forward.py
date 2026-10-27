"""Check the page's JavaScript forward pass (parts/22_js_clip.js) against PyTorch on the quantised weights it ships.
  DATA=$DATA uv run --with torch --with numpy python check_forward.py   -> model/check_forward.json
200 test images (100 photos, 100 drawings) and the 36 class names in every prompt template: image and text embeddings,
image attention maps, and the zero-shot answer with the default prompt and with the ensemble."""
import json, os, subprocess, sys
import numpy as np, torch
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import train as T
HERE = T.HERE
ck = torch.load(os.path.join(HERE, 'model', 'clip_q.pt'), weights_only=False)
m = T.make('clip'); m.load_state_dict(ck['state']); m.eval()
xp, _, ap = T.batch_of(T.load('test_photo.u8'), list(range(100)))
xd, _, ad = T.batch_of(T.load('test_drawing.u8'), list(range(100, 200)))
X = torch.cat([xp, xd]); A = torch.cat([ap, ad]); Y = (A[:, 1] * 6 + A[:, 0]).numpy()
names = T.class_names(); prompts = [t.format(n) for n in names for t in T.TEMPLATES]
with torch.no_grad():
    keep = []; ie = m.embed_image(X); m.img(X, keep=keep)
    te = m.embed_text(torch.tensor([T.tok(p) for p in prompts]))
inp = os.path.join(T.DATA, 'cf_in.json'); json.dump({'imgs': X.reshape(200, -1).tolist(), 'prompts': prompts}, open(inp, 'w'))
js = """const fs=require('fs');globalThis.window=globalThis;const P='%s/';globalThis.TOYGEN=require(P+'21_js_gen.js');for(const f of ['20_model_data.js','22_js_clip.js'])eval(fs.readFileSync(P+f,'utf8'));
const I=JSON.parse(fs.readFileSync('%s','utf8'));const out={ie:[],at:[],te:[]};
for(const im of I.imgs){const r=CLIP.image(Float32Array.from(im));out.ie.push(Array.from(r.e));out.at.push(r.atts.map(l=>l.map(a=>Array.from(a))))}
for(const p of I.prompts)out.te.push(Array.from(CLIP.text(p).e));out.scale=CLIP.scale;
fs.writeFileSync('%s',JSON.stringify(out));""" % (os.path.join(HERE, 'parts'), inp, inp + '.out')
subprocess.run(['node', '-e', js], check=True)
o = json.load(open(inp + '.out'))
jie, jte = np.array(o['ie']), np.array(o['te']); ja = np.array(o['at'])
ta = torch.stack(keep, 1).numpy()
tie, tte = ie.numpy(), te.numpy()
def zs(ie_, te_, ens):
    W = te_.reshape(36, len(T.TEMPLATES), -1)
    W = W.mean(1) if ens else W[:, 0]
    W = W / np.linalg.norm(W, axis=1, keepdims=True)
    return (ie_ @ W.T).argmax(1)
res = dict(images=200, prompts=len(prompts),
           max_image_emb_diff=float(np.abs(jie - tie).max()), max_text_emb_diff=float(np.abs(jte - tte).max()),
           max_att_diff=float(np.abs(ja.reshape(ta.shape) - ta).max()),
           same_answer_default=int((zs(jie, jte, False) == zs(tie, tte, False)).sum()),
           same_answer_ensemble=int((zs(jie, jte, True) == zs(tie, tte, True)).sum()),
           acc_js_default=float((zs(jie, jte, False) == Y).mean()), acc_js_ensemble=float((zs(jie, jte, True) == Y).mean()),
           scale_js=o['scale'], scale_torch=float(m.t.clamp(max=np.log(100)).exp()))
ok = res['same_answer_default'] == 200 and res['same_answer_ensemble'] == 200 and res['max_image_emb_diff'] < 1e-4 and res['max_text_emb_diff'] < 1e-4
res['verdict'] = 'PASS' if ok else 'FAIL'
print(json.dumps(res, indent=1))
json.dump(res, open(os.path.join(HERE, 'model', 'check_forward.json'), 'w'), indent=1)
