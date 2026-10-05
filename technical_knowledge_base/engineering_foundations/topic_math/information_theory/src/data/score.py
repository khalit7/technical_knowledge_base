# Score sample.txt with small open causal LMs: per-token nats, token bytes. float32 CPU, 2 threads.
import json, math, sys, torch, transformers
from transformers import AutoTokenizer, AutoModelForCausalLM
torch.set_num_threads(2)
IN=sys.argv[1];OUT=sys.argv[2]
txt=open(IN,encoding='utf-8').read()
def b2u():
    bs=list(range(ord('!'),ord('~')+1))+list(range(ord('\xa1'),ord('\xac')+1))+list(range(ord('\xae'),ord('\xff')+1));cs=bs[:];n=0
    for b in range(256):
        if b not in bs: bs.append(b);cs.append(256+n);n+=1
    return {chr(c):b for b,c in zip(bs,cs)}
BD=b2u()
MODELS=[('openai-community/gpt2','<|endoftext|>',1024),('facebook/opt-125m','</s>',2048),('HuggingFaceTB/SmolLM2-135M','<|endoftext|>',2048),('Qwen/Qwen2.5-0.5B','<|endoftext|>',2048)]
res={'transformers':transformers.__version__,'torch':torch.__version__,'text_bytes':len(txt.encode()),'text_chars':len(txt),'models':{}}
for name,bos,ctx in MODELS:
    tok=AutoTokenizer.from_pretrained(name)
    m=AutoModelForCausalLM.from_pretrained(name,dtype=torch.float32).eval()
    enc=tok(txt,add_special_tokens=False,return_offsets_mapping=True)
    ids=enc['input_ids'];offs=enc['offset_mapping']
    bos_id=tok.convert_tokens_to_ids(bos)
    # bytes per token from character offsets (exact: offsets partition the text for these byte-level BPEs)
    tb=[len(bytes(BD[c] for c in t)) for t in tok.convert_ids_to_tokens(ids)]
    assert sum(tb)==len(txt.encode()),(name,sum(tb))
    full=[bos_id]+ids
    W=min(ctx,1024);S=512
    nll=[None]*len(ids)
    # sliding window: each window scores its last S new tokens (first window scores all)
    start=0
    with torch.no_grad():
        pos=1  # next index in full to score
        while pos<len(full):
            end=min(len(full),pos+S if pos>1 else W)
            lo=max(0,end-W)
            x=torch.tensor([full[lo:end]])
            lp=torch.log_softmax(m(x).logits[0].float(),-1)
            for j in range(pos,end):
                nll[j-1]=-lp[j-lo-1,full[j]].item()
            pos=end
    tot=sum(nll)
    r={'n_tokens':len(ids),'vocab':len(tok),'bos':bos,'bos_id':bos_id,'window':W,'stride':S,
       'sum_bytes_tokens':sum(tb),'total_nats':tot,'ce_nats_per_token':tot/len(ids),
       'ppl':math.exp(tot/len(ids)),'bpb':tot/math.log(2)/res['text_bytes'],'bpc':tot/math.log(2)/res['text_chars'],
       'bytes_per_token':res['text_bytes']/len(ids),
       'words':len(txt.split()),'tokens':[[t,n,round(x,4)] for t,n,x in zip(tok.convert_ids_to_tokens(ids),tb,nll)]}
    res['models'][name]=r
    print(name,len(ids),round(r['ce_nats_per_token'],4),round(r['ppl'],3),round(r['bpb'],4),sum(tb),flush=True)
json.dump(res,open(OUT,'w'),ensure_ascii=False)
