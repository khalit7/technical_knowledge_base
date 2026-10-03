import torch, numpy as np, os, sys
from transformers import AutoModelForCausalLM, AutoTokenizer
import qformats as qf
HERE=os.path.dirname(os.path.abspath(__file__))
M='Qwen/Qwen2.5-0.5B'; L='model.layers.8.self_attn.q_proj'
tok=AutoTokenizer.from_pretrained(M); model=AutoModelForCausalLM.from_pretrained(M,dtype=torch.float32).eval()
mod=dict(model.named_modules())[L]
def acts(fn):
    t=open(os.path.join(HERE,'inputs',fn)).read().split('\n',1)[1]; ids=tok(t,return_tensors='pt').input_ids[:,:512]; b={}
    h=mod.register_forward_hook(lambda m,i,o:b.__setitem__('x',i[0][0].numpy().astype(np.float64)))
    with torch.no_grad(): model(ids)
    h.remove(); return b['x'][1:]
Xc=acts('calib_pride_and_prejudice.txt'); Xe=acts('eval_tale_of_two_cities.txt')
W=mod.weight.detach().numpy().astype(np.float64)
rng=np.random.default_rng(int(sys.argv[1]) if len(sys.argv)>1 else 0)
top=np.argsort(-np.abs(Xc).max(0))[:8]
rest=np.setdiff1d(np.arange(896),top); 
cfgs=[]
for k in range(4):
    ch=np.sort(np.concatenate([top,rng.choice(rest,56,replace=False)])); rw=np.sort(rng.choice(896,8,replace=False)); cfgs.append((ch,rw,16))
for chans,rows,T in cfgs:
    X=Xe[:T][:,chans]; Ws=W[rows][:,chans]; Y=X@Ws.T; xc=np.abs(Xc[:,chans]).max(0)
    def err(Wq,Xq): return np.linalg.norm(Xq@Wq.T-Y)/np.linalg.norm(Y)
    def qa(X,amax): s=amax/127; return np.clip(np.round(X/s),-127,127)*s
    base=err(qf.q_int(Ws,8,0),qa(X,xc.max()))
    out=[]
    for a in np.arange(0,1.01,0.25):
        s=xc**a/np.abs(W[:,chans]).max(0)**(1-a)
        out.append((a,round(err(qf.q_int(Ws*s,8,0),qa(X/s,(xc/s).max())),4)))
    # AWQ int4 per-row (g = 64)
    sx=np.abs(Xc[:,chans]).mean(0)
    rtn=err(qf.q_int(Ws,4,0,sym=False),X)
    aw=[(a,round(err(qf.q_int(Ws*(sx**a/np.sqrt((sx**a).max()*(sx**a).min())),4,0,sym=False)/(sx**a/np.sqrt((sx**a).max()*(sx**a).min())),X),4)) for a in np.arange(0,1.01,0.25)]
    print(list(rows),'W8A8 base',round(base,4),out,'| AWQ rtn',round(rtn,4),aw)
print('x slice chan max eval', np.round(np.abs(Xe[:16,:64]).max(0),1))
