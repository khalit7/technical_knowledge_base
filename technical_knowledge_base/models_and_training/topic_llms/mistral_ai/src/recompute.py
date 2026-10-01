# Recompute every default the page reproduces, from the Hugging Face configs saved in src/.
import json
B=1e9
def gqa_layer(d,nh,nkv,hd):return d*nh*hd+2*d*nkv*hd+nh*hd*d
def mla_layer(d,nh,ql,kvl,nope,rope,v):return d*ql+ql+ql*nh*(nope+rope)+d*(kvl+rope)+kvl+kvl*nh*(nope+v)+nh*v*d
def ffn(d,f):return 3*d*f
def vision(hv,L,fv,d,patch=14,merge=2):
    enc=3*patch*patch*hv+L*(4*hv*hv+3*hv*fv+2*hv)+hv
    proj=hv+ (hv*merge*merge)*hv + hv*d + d*d   # norm, patch merger, two-layer adapter
    return enc,proj
M={}
# Mistral 7B
d,L,nh,nkv,hd,f,V=4096,32,32,8,128,14336,32000
lay=gqa_layer(d,nh,nkv,hd)+ffn(d,f)+2*d
M['Mistral 7B']=dict(tot=L*lay+2*V*d+d,act=L*lay+2*V*d+d,per_layer=lay,emb=2*V*d,attn=gqa_layer(d,nh,nkv,hd),ffn=ffn(d,f))
# Mixtral 8x7B
E,k=8,2
a=gqa_layer(d,nh,nkv,hd);fe=ffn(d,f);r=d*E
M['Mixtral 8x7B']=dict(tot=L*(a+E*fe+r+2*d)+2*V*d+d,act=L*(a+k*fe+r+2*d)+2*V*d+d)
# Mixtral 8x22B
d2,L2,nh2,f2=6144,56,48,16384
a=gqa_layer(d2,nh2,8,128);fe=ffn(d2,f2)
M['Mixtral 8x22B']=dict(tot=L2*(a+8*fe+d2*8+2*d2)+2*V*d2+d2,act=L2*(a+2*fe+d2*8+2*d2)+2*V*d2+d2)
V3=131072
# Medium 3.5 / Devstral 2 text
d,L,nh,nkv,hd,f=12288,88,96,8,128,28672
lay=gqa_layer(d,nh,nkv,hd)+ffn(d,f)+2*d;txt=L*lay+2*V3*d+d
enc,proj=vision(1664,48,8192,d)
M['Devstral 2']=dict(tot=txt,act=txt)
M['Medium 3.5']=dict(tot=txt+enc+proj,act=txt+enc+proj,text=txt,vis=enc+proj)
# Devstral Small 2
d,L,nh,nkv,hd,f=5120,40,32,8,128,32768
lay=gqa_layer(d,nh,nkv,hd)+ffn(d,f)+2*d;txt=L*lay+2*V3*d+d
enc,proj=vision(1024,24,4096,d)
M['Devstral Small 2']=dict(tot=txt+enc+proj,act=txt+enc+proj,text=txt,vis=enc+proj)
# Large 3 (MLA + MoE)
d,L,nh=7168,61,128
a=mla_layer(d,nh,1536,512,128,64,128)
dense_ffn=ffn(d,16384);ef=ffn(d,4096);E,k,S,fk=128,4,1,3
moe_t=E*ef+S*ef+d*E;moe_a=k*ef+S*ef+d*E
emb=2*V3*d
txt_t=L*(a+2*d)+fk*dense_ffn+(L-fk)*moe_t+emb+d
txt_a=L*(a+2*d)+fk*dense_ffn+(L-fk)*moe_a+emb+d
enc,proj=vision(1664,48,8192,d)
M['Large 3']=dict(tot=txt_t+enc+proj,act=txt_a+enc+proj,text_t=txt_t,text_a=txt_a,vis=enc+proj,act_noemb=txt_a-emb,emb=emb)
# Small 4
d,L,nh=4096,36,32
a=mla_layer(d,nh,1024,256,64,64,128)
ef=ffn(d,2048);E,k,S=128,4,1
moe_t=E*ef+S*ef+d*E;moe_a=k*ef+S*ef+d*E;emb=2*V3*d
txt_t=L*(a+2*d+moe_t)+emb+d;txt_a=L*(a+2*d+moe_a)+emb+d
enc,proj=vision(1024,24,4096,d)
M['Small 4']=dict(tot=txt_t+enc+proj,act=txt_a+enc+proj,text_t=txt_t,text_a=txt_a,vis=enc+proj,act_noemb=txt_a-emb,emb=emb)
for n,m in M.items():
    print(n,{k:round(v/B,3) for k,v in m.items()},'r=%.2f'%(m['tot']/m['act']))
# KV cache per token (bytes, 16-bit)
kv={'Mistral 7B':2*32*8*128,'Mixtral 8x7B':2*32*8*128,'Mixtral 8x22B':2*56*8*128,'Medium 3.5':2*88*8*128,'Devstral Small 2':2*40*8*128,'Large 3':(512+64)*61,'Small 4':(256+64)*36}
for n,v in kv.items():print('kv',n,v*2,'B/token',v*2/1024,'KiB',' @256k GiB',v*2*262144/2**30)
# Worked example
b=2*32*8*128*2;print('b_tok',b,'full32k GiB',b*32768/2**30,'swa MiB',b*4096/2**20,'mha GiB',4*b*32768/2**30,'reach',32*4096,'ratio',4*b*32768/(b*4096))
print('ratios',46.7/12.9,675/41,119/6,119/8,119/6.5,'C L3',2*41,'C M35',2*128,'M35/S4',128/6,128/8)

# ---- parts for the Weights and cache tab (billions) ----
def parts():
    P={}
    def put(n,lt,la,ein,eout,vis):P[n]=dict(lt=round(lt/B,4),la=round(la/B,4),ein=round(ein/B,4),eout=round(eout/B,4),vis=round(vis/B,4))
    d,L,V=4096,32,32000;a=gqa_layer(d,32,8,128)+2*d;f=ffn(d,14336)
    put('m7',L*(a+f)+d,L*(a+f)+d,V*d,V*d,0)
    put('x7',L*(a+8*f+8*d)+d,L*(a+2*f+8*d)+d,V*d,V*d,0)
    d=6144;a=gqa_layer(d,48,8,128)+2*d;f=ffn(d,16384)
    put('x22',56*(a+8*f+8*d)+d,56*(a+2*f+8*d)+d,V*d,V*d,0)
    d=12288;a=gqa_layer(d,96,8,128)+2*d;f=ffn(d,28672);lt=88*(a+f)+d
    put('dev2',lt,lt,V3*d,V3*d,0)
    e,p=vision(1664,48,8192,d);put('m35',lt,lt,V3*d,V3*d,e+p)
    d=5120;a=gqa_layer(d,32,8,128)+2*d;f=ffn(d,32768);lt=40*(a+f)+d
    e,p=vision(1024,24,4096,d);put('devs2',lt,lt,V3*d,V3*d,e+p)
    d=7168;a=mla_layer(d,128,1536,512,128,64,128)+2*d;ef=ffn(d,4096)
    lt=61*a+3*ffn(d,16384)+58*(129*ef+128*d)+d;la=61*a+3*ffn(d,16384)+58*(5*ef+128*d)+d
    e,p=vision(1664,48,8192,d);put('l3',lt,la,V3*d,V3*d,e+p)
    d=4096;a=mla_layer(d,32,1024,256,64,64,128)+2*d;ef=ffn(d,2048)
    lt=36*(a+129*ef+128*d)+d;la=36*(a+5*ef+128*d)+d
    e,p=vision(1024,24,4096,d);put('s4',lt,la,V3*d,V3*d,e+p)
    return P
P=parts();print(json.dumps(P))
for n,p in P.items():
    print(n,'all',round(p['lt']+p['ein']+p['eout']+p['vis'],2),'act all',round(p['la']+p['ein']+p['eout']+p['vis'],2),'act layers+out',round(p['la']+p['eout'],2),'act layers',round(p['la'],2),'act layers+out+vis',round(p['la']+p['eout']+p['vis'],2),'tot -vis',round(p['lt']+p['ein']+p['eout'],2),'tot one emb',round(p['lt']+p['eout']+p['vis'],2))

# Ministral 3
for nm,d,L,f,tied in [('min3',3072,26,9216,True),('min8',4096,34,14336,False),('min14',5120,40,16384,False)]:
    a=gqa_layer(d,32,8,128)+2*d;lt=L*(a+ffn(d,f))+d;e,p=vision(1024,24,4096,d)
    P[nm]=dict(lt=round(lt/B,4),la=round(lt/B,4),ein=round(V3*d/B,4),eout=0 if tied else round(V3*d/B,4),vis=round((e+p)/B,4))
    q=P[nm];print(nm,q,'all',round(q['lt']+q['ein']+q['eout']+q['vis'],2),'kvB',2*L*8*128*2)
json.dump(P,open('parts_params.json','w'))
