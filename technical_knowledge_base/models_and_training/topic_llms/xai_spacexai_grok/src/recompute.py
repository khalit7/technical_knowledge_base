# Recompute every default the page reproduces. Run: python3 recompute.py
import json
def moe(name,d,L,nq,nkv,hd,E,k,ffe,vocab,dense_ffn=0,tied=False):
    attn=d*nq*hd*2+d*nkv*hd*2           # q,o and k,v projections
    exp=3*d*ffe                          # gated FFN: up, gate, down
    dense=3*d*dense_ffn if dense_ffn else 0
    router=d*E
    layer_tot=attn+E*exp+dense+router
    layer_act=attn+k*exp+dense+router
    emb=vocab*d*(1 if tied else 2)
    tot=L*layer_tot+emb; act=L*layer_act+emb
    kv=2*L*nkv*hd*2                      # bytes per token at 16 bits
    print(f"{name}: total {tot/1e9:.1f}B, active {act/1e9:.1f}B ({100*act/tot:.1f}%), experts {L*E*exp/1e9:.1f}B, attention {L*attn/1e9:.2f}B, emb {emb/1e9:.2f}B, KV/token {kv} B = {kv/1024:.0f} KiB")
    return dict(tot=tot,act=act,kv=kv)
# Grok-1: run.py + model.py ffn_size: int(8*6144)*2//3 = 32768
ff=int(8*6144)*2//3; ff+= (8-ff)%8
g1=moe('Grok-1 (untied head)',6144,64,48,8,128,8,2,ff,131072)
g1t=moe('Grok-1 (tied head)',6144,64,48,8,128,8,2,ff,131072,tied=True)
g2=moe('Grok 2 (config.json, untied)',8192,64,64,8,128,8,2,16384,131072,dense_ffn=32768)
print('xAI: 314B, 25% active ->',0.25*314,'B')
print('Grok-1 KV at 8192 tokens:',g1['kv']*8192/2**30,'GiB; MHA equivalent (48 kv heads):',2*64*48*128*2*8192/2**30,'GiB')
print('Grok-1 weights 8-bit GB:',g1['tot']/1e9,' 16-bit:',2*g1['tot']/1e9)
# Terminal-Bench gap
print('TB4 gap Opus 5.5 vendor 66.4 - Grok 4.7 vendor 38.0 =',66.4-38.0,'; vs AA 33 =',66.4-33)
# Index versions
print('v4.3 gap GPT-5.6 Sol 47.0 - Grok 4.6 44.3 =',47.0-44.3,'; Grok4.7-4.6 =',46.4-44.3)
# cost per task from aa_snapshot
a=json.load(open('../../src/data/aa_snapshot.json'))
for r in a['rows']:
    if r['model'].startswith('Grok'):
        n=r['cost_to_run_index']/r['aa_cost_per_index_task']
        print(r['model'],'cost/task',r['aa_cost_per_index_task'],'tasks implied',round(n),'out tok/task',round(r['index_tokens_output']/n),'in tok/task',round(r['index_tokens_input']/n))
        # rebuild cost per task from tokens and list prices (cached share unknown -> bounds)
        inp=r['index_tokens_input'];out=r['index_tokens_output']
        hi=(inp*r['price_in']+out*r['price_out'])/1e6/n; lo=(inp*r['price_cached']+out*r['price_out'])/1e6/n
        print('   from tokens: all input uncached $%.2f, all cached $%.2f per task'%(hi,lo))
        # back-solve cache share
        c=r['cost_to_run_index']*1e6; f=(inp*r['price_in']+out*r['price_out']-c)/(inp*(r['price_in']-r['price_cached']))
        print('   implied cached share of input %.1f%%'%(100*f))
# blended 3:1 price ratios (the page's "a third of the top two")
def b(i,o):return (3*i+o)/4
for nm,i,o in [('Grok 4.6/4.7',2,6),('Opus 5.5',4,20),('GPT-5.6 Sol',4,20),('Fable 5.1',10,50),('GPT-6 Astra',10,50)]:
    print(nm,'3:1 blend',b(i,o),'ratio Grok/that',round(b(2,6)/b(i,o),3))
# injection disclosure window
from datetime import date
print('Jun 3 -> Aug 20 2026 days',(date(2026,8,20)-date(2026,6,3)).days,'weeks',(date(2026,8,20)-date(2026,6,3)).days/7)
print('40% of 20 attempts =',0.4*20)
# Colossus build rates from S-1
for nm,g,mw,d in [('Colossus first cluster H100',100000,130,122),('Colossus II GB200',110000,210,91),('Colossus II GB300',110000,220,64)]:
    print(nm,'MW/day %.2f'%(mw/d),'GPUs/day %.0f'%(g/d))
print('industry 100 MW greenfield ~2 years = ',100/730,'MW/day')
# long-context cliff: request at 199,999 vs 200,000 prompt tokens, 5,000 output
for p in [199999,200000]:
    r=(2,6) if p<200000 else (4,12)
    print('prompt',p,'cost $%.4f'%((p*r[0]+5000*r[1])/1e6))
