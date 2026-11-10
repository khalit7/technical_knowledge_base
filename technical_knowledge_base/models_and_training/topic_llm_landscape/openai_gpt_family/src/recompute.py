# Recompute every default the visual reproduces. Run: python3 recompute.py
import json
P={ # $/1M: in, cached, write, out  (OpenAI pricing page, read 1 Oct 2026)
 'gpt-6-astra':(10,1,12.5,50),'gpt-6.1-sol':(2,.1,2.5,10),'gpt-6-sol':(2,.2,2.5,10),'gpt-6-luna':(.1,.01,.125,.5),
 'gpt-5.6-sol':(4,.4,5,20),'gpt-5.6-terra':(2,.2,2.5,12),'gpt-5.6-luna':(.2,.02,.25,1.2)}
def req(m,I,O,cached=0,write=0):
    pi,pc,pw,po=P[m]; long=I>272000; mi,mo=(2,1.5) if long else (1,1)
    U=I-cached-write
    return (U*pi*mi+cached*pc*mi+write*pw*mi+O*po*mo)/1e6
print('== request cost')
for m in ['gpt-6-astra','gpt-6.1-sol','gpt-6-luna']: print(m, round(req(m,50000,5000),5))
print('astra 300K/10K', req('gpt-6-astra',300000,10000), ' without surcharge', (300000*10+10000*50)/1e6)
print('== caching (prefix cost in units of one uncached pass)')
for r in (0.1,0.05):
    print('read',r,' write+1 read',1.25+r,' write+9 reads',1.25+9*r,' break-even uses N:',(1.25-r)/(1-r))
print('== ARC Prize standard vs adapter')
std={'max':(62.7,26098),'xhigh':(59.3,37317),'high':(54.8,40705),'medium':(38.6,48090),'low':(17.5,38166),'none':(35.2,49791)}
ada={'max':(98.6,17332),'xhigh':(98.4,18147),'high':(99.9,18817),'medium':(98.4,19285),'low':(98.0,21298),'none':(96.7,23457)}
print('points',99.9-62.7,' dollars less',1-18817/26098)
for e in std: print(e,'std $/pt',round(std[e][1]/std[e][0]),'ada $/pt',round(ada[e][1]/ada[e][0]), 'gap',round(ada[e][0]-std[e][0],1))
print('human $ per attempted game',115/9, 'with $5 bonus per completed', (115+9*5)/9)
print('== gpt-oss parameter accounting from config.json')
def oss(L,E,k=4,d=2880,ff=2880,V=201088,H=64,KV=8,hd=64):
    expert=d*2*ff+2*ff+ff*d+d           # gate_up (+bias), down (+bias)
    router=d*E+E
    mlp=L*(E*expert+router)
    attn=L*(d*H*hd+H*hd + 2*(d*KV*hd+KV*hd) + H*hd*d+d + H)   # q,k,v,o with biases, sinks
    norms=L*2*d+d
    emb=V*d; unemb=V*d
    total=mlp+attn+emb+unemb+norms
    active=L*(k*expert+router)+attn+unemb+norms
    ckpt=(mlp*4.25/8 + (total-mlp)*2)
    return dict(mlp=mlp/1e9,attn=attn/1e9,emb2=(emb+unemb)/1e9,total=total/1e9,active=active/1e9,ckpt_GB=ckpt/1e9,ckpt_GiB=ckpt/2**30)
for n,L,E in [('120b',36,128),('20b',24,32)]: print(n,{k:round(v,3) for k,v in oss(L,E).items()})
print('card: 120b MLP 114.71 attn 0.96 emb 1.16 active 5.13 total 116.83 ckpt 60.8GiB; 20b 19.12 0.64 1.16 3.61 20.91 12.8GiB')
print('page arithmetic 120b', 114.71e9*4.25/8/1e9, 2.12e9*2/1e9, (114.71e9*4.25/8+2.12e9*2)/2**30)
print('page arithmetic 20b', 19.12e9*4.25/8/1e9, 1.79e9*2/1e9, (19.12e9*4.25/8+1.79e9*2)/2**30)
print('all bf16', 116.83*2,'GB', ' active share', 5.13/116.83)
kv_tok=2*8*64*2  # K and V, 8 heads, dim 64, bf16 bytes, per layer per token
print('KV per token per layer',kv_tok,'B; 120b full layers 18 ->',18*kv_tok,'B/token; window layers fixed',18*kv_tok*128/1e6,'MB')
print('KV at 131072 tokens', 18*kv_tok*131072/2**30,'GiB +window', 18*kv_tok*128/2**30)
print('without GQA (64 KV heads), all 36 layers full:', 36*2*64*64*2*131072/2**30,'GiB')
print('MXFP4 bits', 4+8/32)
print('== AA ratios (v4.3.2, 1 Oct)')
d=json.load(open('../../src/data/aa_snapshot.json'))
R={r['aa_short_name']:r for r in d['rows']}
a=R['GPT-6 Astra (max)']
for n in ['GPT-6.1 Sol (max)','GPT-6 Sol (max)','GPT-6 Luna (max)','GPT-5.6 Terra (max)','GPT-5.6 Sol (max)']:
    r=R[n]; print(n,'price ratio out',r['price_out']/a['price_out'],'task ratio',round(r['aa_cost_per_index_task']/a['aa_cost_per_index_task'],4),'1/x',round(a['aa_cost_per_index_task']/r['aa_cost_per_index_task'],1),'out tokens x',round(r['index_tokens_output']/a['index_tokens_output'],2),'in tokens x',round(r['index_tokens_input']/a['index_tokens_input'],2),'reason share',round(r['index_tokens_reasoning']/r['index_tokens_output'],3))
print('astra reasoning share',a['index_tokens_reasoning']/a['index_tokens_output'])
print('Fable vs Astra per task', 1-3.2575/7.6297)
print('== prices')
print('6 Sol vs 5.6 Sol',1-2/4,1-10/20,' Luna',1-.1/.2,1-.5/1.2,' 5.6 Luna cut',1-.2/1,1-1.2/6,' Terra',1-2/2.5,1-12/15,' Sol promo',1-4/5,1-20/30)
print('Law relative', 54/38.7-1)
print('Sol 6.1 vs Astra per token', 2/10, 10/50, ' Luna', .1/10,.5/50)
print('== Fig. 3 (what one request costs): the step list, from the price table and AA run totals')
def split(m,I,O,h=0):
    pi,pc,pw,po=P[m]; L=I>272000; mi,mo=(2,1.5) if L else (1,1)
    return I*(1-h)*pi*mi/1e6, I*h*pc*mi/1e6, O*po*mo/1e6
print('50K/5K astra',split('gpt-6-astra',50000,5000),' sol',sum(split('gpt-6.1-sol',50000,5000)),' luna',sum(split('gpt-6-luna',50000,5000)))
print('300K',sum(split('gpt-6-astra',300000,10000)),' base rates',(300000*10+10000*50)/1e6,' 272K',sum(split('gpt-6-astra',272000,10000)))
print('agent 200K 75% cached',split('gpt-6-astra',200000,5000,.75),sum(split('gpt-6-astra',200000,5000,.75)),' uncached',sum(split('gpt-6-astra',200000,5000)))
for n in ['GPT-6 Astra (max)','GPT-6.1 Sol (max)','GPT-6 Luna (max)']:
    r=R[n];pi,pc,po=r['price_in'],r['price_cached'],r['price_out']
    I,O,Rr,C,cpt=r['index_tokens_input'],r['index_tokens_output'],r['index_tokens_reasoning'],r['cost_to_run_index'],r['aa_cost_per_index_task']
    h=max(0,min(1,(I*pi+O*po-C*1e6)/(I*(pi-pc))));sc=cpt/C
    print(n,'h %.3f'%h,'per task in %.0f out %.0f reasoning %.0f'%(I*sc,O*sc,Rr*sc),'$ uncached %.4f cached %.4f reasoning %.4f visible %.4f'%(I*sc*(1-h)*pi/1e6,I*sc*h*pc/1e6,Rr*sc*po/1e6,(O-Rr)*sc*po/1e6))
print('== Fig. 6 and Fig. 7 (gpt-oss): from config.json')
EXP=2880*2*2880+2*2880+2880*2880+2880
print('expert',EXP,' read 4 experts MXFP4 MB',4*EXP*4.25/8/1e6,' dense BF16 layer GB',128*EXP*2/1e9,' ratio',128*EXP*2/(4*EXP*4.25/8))
kv=2*8*64*2;print('cache per token per layer',kv,' full layer at 131072 MB',kv*131072/1e6,' banded KB',kv*128/1e3,' 18 full + 18 banded GB',(18*kv*131072+18*kv*128)/1e9)
for n,L,E in [('120b',36,128),('20b',24,32)]:
    o=oss(L,E);w=o['ckpt_GB']*1e9;f=L//2
    kvs=lambda g,win:((f if win else L)*2*(8 if g else 64)*64*2*131072+(f if win else 0)*2*(8 if g else 64)*64*2*128)
    print(n,'BF16 GB %.1f'%(o['total']*2),'experts BF16 %.1f MXFP4 %.1f'%(o['mlp']*2,o['mlp']*4.25/8),'rest %.1f'%((o['total']-o['mlp'])*2),'released GB %.2f'%(w/1e9),
          'cache GB %.2f / no window %.2f / no GQA %.2f / neither %.2f'%tuple(kvs(*a)/1e9 for a in [(1,1),(1,0),(0,1),(0,0)]),
          'left on 80 GB %.2f, sequences %d'%((80e9-w)/1e9,(80e9-w)//kvs(1,1)),'tokens that fit in 16 GB',int((16e9-w-f*kv*128)//(f*kv)))
