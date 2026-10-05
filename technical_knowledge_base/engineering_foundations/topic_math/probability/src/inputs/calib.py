# Next-token calibration of small open base models on WikiText-2 (raw) test.
# Output: per-temperature reliability bins (top-1 confidence), ECE, NLL, accuracy.
import os, json, sys, math
os.environ["OMP_NUM_THREADS"]="2"
import torch, pandas as pd
torch.set_num_threads(2)
from transformers import AutoTokenizer, AutoModelForCausalLM
import transformers
name=sys.argv[1]; ntok=int(sys.argv[2]); out=sys.argv[3]
pq=[os.path.join(dp,f) for dp,_,fs in os.walk(os.path.expanduser("~/.cache/huggingface/hub/datasets--Salesforce--wikitext/snapshots")) for f in fs if f.startswith("test")][0]
df=pd.read_parquet(pq)
text="".join(df["text"].tolist())
tok=AutoTokenizer.from_pretrained(name); model=AutoModelForCausalLM.from_pretrained(name,torch_dtype=torch.float32); model.eval()
ids=tok(text,return_tensors="pt").input_ids[0][:ntok+1]
ctx=512; Ts=[round(0.5+0.05*i,2) for i in range(31)]
NB=15
bins={T:[[0,0.0,0.0] for _ in range(NB)] for T in Ts}  # count, sum conf, sum correct
nll={T:0.0 for T in Ts}; n=0; correct=0
ptrue_hist=[0]*20
examples=[]
with torch.no_grad():
  for s in range(0,ntok,ctx):
    chunk=ids[s:s+ctx+1]
    if len(chunk)<2: break
    logits=model(chunk[:-1].unsqueeze(0)).logits[0].float()
    tgt=chunk[1:]
    top=logits.argmax(-1); corr=(top==tgt)
    correct+=int(corr.sum()); n+=len(tgt)
    for T in Ts:
      lp=torch.log_softmax(logits/T,-1)
      nll[T]+=float(-lp.gather(1,tgt[:,None]).sum())
      conf=lp.max(-1).values.exp()
      b=torch.clamp((conf*NB).long(),max=NB-1)
      for k in range(NB):
        m=b==k
        if m.any():
          bins[T][k][0]+=int(m.sum()); bins[T][k][1]+=float(conf[m].sum()); bins[T][k][2]+=float(corr[m].sum())
    if s==0:
      p=torch.softmax(logits,-1)
      for i in [10,40,80]:
        tp=p[i].topk(5)
        examples.append({"context":tok.decode(chunk[max(0,i-12):i+1]),"target":tok.decode([int(tgt[i])]),
          "top":[[tok.decode([int(j)]),round(float(v),4)] for v,j in zip(tp.values,tp.indices)],"p_target":round(float(p[i,tgt[i]]),4)})
    print(s,flush=True)
res={"model":name,"transformers":transformers.__version__,"torch":torch.__version__,"dataset":"Salesforce/wikitext wikitext-2-raw-v1 test","tokens":n,"context":ctx,"bins":NB,
 "top1_acc":correct/n,"T":Ts,"per_T":{}}
for T in Ts:
  bb=bins[T]; ece=sum(abs(c[1]-c[2]) for c in bb)/n
  res["per_T"][str(T)]={"nll":nll[T]/n,"ece":ece,"bins":[[c[0],round(c[1],4),c[2]] for c in bb]}
res["examples"]=examples
json.dump(res,open(out,"w"),indent=0)
print("done",res["top1_acc"],res["per_T"]["1.0"]["ece"],res["per_T"]["1.0"]["nll"])
