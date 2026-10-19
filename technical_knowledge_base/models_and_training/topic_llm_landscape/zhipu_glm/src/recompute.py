# Recompute every derived number the page shows, from config.json files in src/ and published prices.
import json
L1M=1_048_576
def cfg(m):
    d=json.load(open(f'inputs/cfg_{m}.json'));return d.get('text_config',d)
f=cfg('GLM-5.3-Flash'); g=cfg('GLM-5.3'); a=cfg('GLM-4.5')
# --- per-token cache (numbers) ---
gqa=2*a['num_key_value_heads']*a['head_dim']*a['num_hidden_layers']
print('GLM-4.5 GQA numbers/token',gqa,'bytes',gqa*2,'KiB',gqa*2/1024,'128K GiB',gqa*2*131072/2**30)
mla=g['kv_lora_rank']+g['qk_rope_head_dim']; nfull=g['indexer_types'].count('full'); L=g['num_hidden_layers']
idx=g['index_head_dim']
g53=mla*L+idx*nfull; g5=mla*L+idx*L
print('GLM-5.3 latent/layer',mla,'layers',L,'full indexers',nfull,'numbers/token',g53,'MLA only',mla*L,'GLM-5 (indexer every layer)',g5)
nd=f['layer_types'].count('deepseek_sparse_attention'); nk=f['layer_types'].count('linear_attention'); LF=f['num_hidden_layers']
mlaF=f['kv_lora_rank']+f['qk_rope_head_dim']; pool=f['index_kpool']
fl=nd*(mlaF+idx/pool); fl_nopool=nd*(mlaF+idx)
print('Flash DSA layers',nd,'KDA',nk,'latent',mlaF,'numbers/token',fl,'without IndexPool',fl_nopool)
la=f['linear_attn_config']; st=nk*la['num_heads']*la['head_dim']*la['head_dim']
print('KDA state numbers',st,'BF16 MiB',st*2/2**20)
print('whole-model ratio 5.3/Flash',g53/fl,'MLA only',mla*L/(nd*mlaF))
pl53=g53/L; plF=fl/LF; plFn=fl_nopool/LF
print('per-layer avg 5.3',pl53,'Flash',plF,'ratio',pl53/plF,'without IndexPool',pl53/plFn,'IndexPool share',plFn/plF,'layer-mix factor',LF/nd,'nope factor',mla/mlaF)
for v in [(mla*L+idx*L)/L/plF, mla/(nd*mlaF/LF)]: print(' variant',v)
print('1M cache GiB BF16: 5.3',g53*2*L1M/2**30,'Flash',fl*2*L1M/2**30,'GLM-4.5 (if it could)',gqa*2*L1M/2**30)
# --- per-token attention multiply-adds at context n ---
def att(n):
    k=2048; H=g['num_attention_heads']
    core53=L*H*min(k,n)*(mla+g['kv_lora_rank'])
    ind53=nfull*g['index_n_heads']*idx*n; ind5=L*g['index_n_heads']*idx*n
    full=L*H*n*(mla+g['kv_lora_rank'])
    HF=f['num_attention_heads']
    coreF=nd*HF*min(k,n)*(mlaF+f['kv_lora_rank']); indF=nd*f['index_n_heads']*idx*n/pool
    kda=nk*la['num_heads']*3*la['head_dim']**2
    gq=a['num_hidden_layers']*a['num_attention_heads']*n*2*a['head_dim']
    return dict(full=full,g5=core53+ind5,g53=core53+ind53,flash=coreF+indF+kda,gqa45=gq,ind5=ind5,ind53=ind53,core53=core53,coreF=coreF,indF=indF,kda=kda)
for n in [131072,L1M]:
    r=att(n);print(n,{k:'%.3g'%v for k,v in r.items()},'5.3/flash',r['g53']/r['flash'])
# IndexShare Amdahl at 1M: weights term = active params as MACs
r=att(L1M)
for act in [40e9,30e9,25e9]:
    print('IndexShare ratio, weights',act/1e9,'B MACs:',(r['g5']+act)/(r['g53']+act))
print('Amdahl f from 2.9 with n=4:',(1-1/2.9)/(1-1/4))
# heads
print('heads 5120/128',5120/128,'96/40',96/40,'q proj',96*128)
# sparsity
for nm,t,ac in [('4.5',355,32),('Air',106,12),('5.x',744,40),('Flash',320,18)]: print(nm,round(t/ac,1))
# prices: job 10M input, 8M cached, 1M output
P={'GLM-5.3':(1.4,.26,4.4),'GLM-5.3-Flash':(.15,.03,.5),'GLM-5.3-FlashX':(.37,.075,1.25),'GLM-4.7':(.6,.11,2.2),'GLM-4.5-Air':(.2,.03,1.1)}
for k,(i,c,o) in P.items(): print(k,'job',2*i+8*c+1*o)
print('ratio',(2*1.4+8*.26+4.4)/(2*.15+8*.03+.5))
# weights size
print('Flash FP8 GB',(314396639232+2*6926096640+4*295518)/1e9,'GiB',(314396639232+2*6926096640+4*295518)/2**30)
print('Atria FP8 GB',(751226191872+2*2103729152+4*19456)/1e9,'BF16 TB',753329940480*2/1e12)
# slime worked example
ls=[3,5,8,40];print('sync util',sum(ls)/(4*max(ls)))
# AA cost per point
for m,s,c in [('GLM-5.3',44.8,2.0056),('Kimi K3',43.6,2.0001),('MiMo-V2.6-Pro',46.3,.1332),('Flash',41.8,.2533)]: print(m,'$/point',c/s)
print('TB3 ratio',28.3/4.6,'MTP',5.47/4.56)
