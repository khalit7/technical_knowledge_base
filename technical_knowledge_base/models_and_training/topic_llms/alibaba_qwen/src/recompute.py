# Recompute every default the HTML reproduces, from the Hugging Face config.json files in src/.
import json,math
def cfg(n):
    c=json.load(open('inputs/cfg_%s.json'%n));return c.get('text_config',c)
M={'Qwen3-235B-A22B':'235B-A22B','Qwen3-30B-A3B':'30B-A3B','Qwen3-32B':'32B','Qwen3-Next-80B-A3B-Instruct':'Next-80B','Qwen3.5-397B-A17B':'3.5-397B','Qwen3.8-27B':'3.8-27B','Qwen3.8-2.4T-A95B':'3.8-2.4T','Qwen3.8-Flash-Next':'Flash-Next'}
for n,s in M.items():
    c=cfg(n);L=c['num_hidden_layers'];d=c['hidden_size']
    lt=c.get('layer_types');fi=c.get('full_attention_interval')
    Lf=sum(1 for x in lt if x=='full_attention') if lt else (L//fi if fi else L)
    Ll=L-Lf
    kv=Lf*2*c['num_key_value_heads']*c['head_dim']*2
    st=Ll*c.get('linear_num_value_heads',0)*c.get('linear_key_head_dim',0)*c.get('linear_value_head_dim',0)
    E=c.get('num_experts');k=c.get('num_experts_per_tok')
    out='%-10s L=%d full=%d lin=%d  KV/token=%d B (%.1f KiB)  KV@262144=%.2f GiB  state=%d nums (%.1f MiB @2B)'%(s,L,Lf,Ll,kv,kv/1024,kv*262144/2**30,st,st*2/2**20)
    if E:
        dff=c['moe_intermediate_size'];sh=1 if c.get('shared_expert_intermediate_size') else 0
        pe=3*d*dff;tot=L*(E+sh)*pe;act=L*(k+sh)*pe
        out+='  P_exp=%d stored=%.2fB active=%.2fB  routed share %.2f%%'%(pe,tot/1e9,act/1e9,100*k/E)
        if st:
            fullkv_lin=Ll*2*c['num_key_value_heads']*c['head_dim']*2
            out+='  crossover=%.0f tokens'%(st*2/fullkv_lin)
    print(out)
# Worked numbers in the page
print('Qwen3-235B KV 262144:',94*2*4*128*2*262144/2**30,'GiB')
print('Next: 36 layers as full attn per token',36*2*2*256*2,'B; crossover',36*32*128*128*2/(36*2*2*256*2))
# QSA
for T in [4096,32768,262144,1000000]:
    print('QSA T=%d blocks=%d ratio tokens=%.1f'%(T,T//4,T/2048))
print('n-gram params 20M x 2560 =',20_000_000*2560/1e9,'B; BF16 bytes',20_000_000*2560*2/1e9,'GB')
print('GR bottleneck d/8=',2560/8)
# Flash-Next vs 3.7-Plus Table 11
t11={'MMLU':(90.36,90.43),'MMLU-Redux':(90.68,91.47),'MMLU-Pro':(73.23,70.90),'SuperGPQA':(51.36,48.42),'BBH':(90.87,89.41),'GPQA':(51.42,51.52),'GSM8K':(93.29,92.95),'MATH':(72.78,74.38),'EvalPlus':(78.76,78.06),'MultiPL-E':(79.09,81.68),'SWEBench-Pretrain':(50.99,49.24),'MGSM':(89.33,85.42),'MMMLU':(84.86,84.53),'INCLUDE':(78.40,78.90)}
d={k:round(a-b,2) for k,(a,b) in t11.items()};lead=[k for k in d if d[k]>0];print('leads',len(lead),'max trail',min(d.values()),d)
print('distill GPU-hour ratio',1800/17920)
print('sparsity ratios',235/22,80/3,397/17,2400/95,125/6)
print('Arena/AA: FN cost per task / 2.4T',0.3722/2.1559)
# Global-batch LBL toy (illustrative): 8 experts, 4 domains each preferring 2 experts
def lbl(s):
    NE=8;mic=[]
    allf=[0]*NE
    for dom in range(4):
        f=[(1-s)/NE+(s/2 if i//2==dom else 0) for i in range(NE)]
        mic.append(NE*sum(x*x for x in f));allf=[a+b/4 for a,b in zip(allf,f)]
    return sum(mic)/4,NE*sum(x*x for x in allf)
print('LBL micro/global at s=0,0.5,1',[lbl(s) for s in (0,0.5,1)])
