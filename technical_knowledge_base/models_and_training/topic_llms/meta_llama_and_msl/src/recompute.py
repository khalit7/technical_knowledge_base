# Recompute every default the page reproduces. Run: python3 recompute.py
import math, json
from math import sqrt
print('== Overtraining worked example')
N,D=8e9,15e12
print('tok/param',D/N, 'x chinchilla',D/N/20, 'llama1 7B',1e12/7e9, 1e12/7e9/20)
C=6*N*D; Ns=sqrt(C/120); print('C',C,'N*',Ns,'D*',20*Ns,'serve ratio',Ns/N, 'serve 15T',2*N*15e12, 2*N*15e12/C)
print('405B: tok/param',15.6e12/405e9, 'C(15.6T)',6*405e9*15.6e12, 'C(15T)',6*405e9*15e12)
print('402B on 16.55T by 6ND:',6*402e9*16.55e12,' tokens/param',16.55e12/402e9,' N=C/(6D)',3.8e25/(6*16.55e12))
print('Llama3 own law D*=0.29*C^0.53 at 3.8e25:',0.29*(3.8e25)**0.53)
print('70B tok/param',15e12/70e9)
print('Llama2 7B tok/param 2T',2e12/7e9,' 1.8T',1.8e12/7e9)
print('Llama 4 Scout active 17B/40T',40e12/17e9,'Maverick 22T',22e12/17e9)
print('Glimmer?')
print()
print('== Chinchilla fits and Sardana Table 2')
FITS={'sardana':(1.69,406.4,410.7,0.336,0.283),'hoff_round':(1.69,406.4,410.7,0.34,0.28),'hoff_precise':(1.6934,406.4,410.7,0.3392,0.2849),'epoch':(1.8172,482.01,2085.43,0.3478,0.3658)}
def L(f,N,D):E,A,B,a,b=f;return E+A/N**a+B/D**b
def Dfor(f,N,l):
    E,A,B,a,b=f;r=l-E-A/N**a
    return None if r<=0 else (B/r)**(1/b)
def opt(f,l,Dinf):
    # minimise 6ND+2N Dinf on the iso-loss curve (golden-section on log N)
    E,A,B,a,b=f
    lo=math.log((A/(l-E))**(1/a))+1e-6; hi=lo+12
    def cost(x):
        n=math.exp(x);d=Dfor(f,n,l);return 6*n*d+2*n*Dinf
    g=(sqrt(5)-1)/2
    x1,x2=hi-g*(hi-lo),lo+g*(hi-lo)
    for _ in range(200):
        if cost(x1)<cost(x2): hi=x2
        else: lo=x1
        x1,x2=hi-g*(hi-lo),lo+g*(hi-lo)
    n=math.exp((lo+hi)/2);return n,Dfor(f,n,l),cost((lo+hi)/2)
rows=[(50e9,2.53,1e9,27.4e9,2.64e20,6.33e6,46.8e9,2.41e20),(200e9,2.13,7e9,276e9,1.44e22,5.4e9,367e9,1.40e22),(1e12,2.05,13e9,577e9,7.10e22,8.32e9,967e9,6.49e22),(5e12,1.96,30e9,1.56e12,5.80e23,16.4e9,3.27e12,4.86e23),(10e12,1.89,70e9,4.26e12,3.19e24,41.6e9,7.92e12,2.81e24)]
f=FITS['sardana']
for Dinf,l,Nc,Dc,Fc,No,Do,Fo in rows:
    nc,dc,cc=opt(f,l,0); no,do,co=opt(f,l,Dinf)
    print('Dinf %.0e loss %.2f | chin %.3gB %.3gT tot %.3g (pub %.3gB %.3gT %.3g) | opt %.3gB %.3gT %.3g (pub %.3gB %.3gT %.3g) red %.1f%%'%(Dinf,l,nc/1e9,dc/1e12,cc+2*nc*Dinf,Nc/1e9,Dc/1e12,Fc,no/1e9,do/1e12,co,No/1e9,Do/1e12,Fo,100*(1-co/(cc+2*nc*Dinf))))
print('Training-only optimal tokens/param by fit (loss 2.0):')
for k,f in FITS.items():
    n,d,c=opt(f,2.0,0);print(k,'N %.3gB D %.3gT ratio %.1f'%(n/1e9,d/1e12,d/n))
print('Llama 3 8B on 15T under each fit: loss and the training-only optimum for that loss')
for k,f in FITS.items():
    l=L(f,8e9,15e12);n,d,c=opt(f,l,0);print(k,'loss %.4f chin-opt N %.3gB D %.3gT C %.3g vs 8B C %.3g ratio %.2f'%(l,n/1e9,d/1e12,c,7.2e23,7.2e23/c))
    for T in [0,1e12,15e12,100e12]:
        n2,d2,c2=opt(f,l,T);print('   T %.0e opt N %.3gB D %.3gT tokens/param %.0f'%(T,n2/1e9,d2/1e12,d2/n2))
print()
print('== Parameter counts from config.json')
def dense(h,Lr,nh,kv,hd,ff,V,tied=False):
    att=h*nh*hd*2+h*kv*hd*2; mlp=3*h*ff; emb=V*h*(1 if tied else 2); norms=Lr*2*h+h
    return Lr*(att+mlp)+emb+norms, att, mlp
for nm,c in {'Llama 3.1 8B':(4096,32,32,8,128,14336,128256),'Llama 3.1 70B':(8192,80,64,8,128,28672,128256),'Llama 3.1 405B':(16384,126,128,8,128,53248,128256)}.items():
    t,a,m=dense(*c);print(nm,'%.3fB'%(t/1e9))
def l4(E,step):
    h,Lr,nh,kv,hd,fe,fd,V=5120,48,40,8,128,8192,16384,202048
    att=h*nh*hd*2+h*kv*hd*2; exp=3*h*fe; dmlp=3*h*fd; router=h*E
    moeL=[i for i in range(Lr) if (i+1)%step==0] if step>1 else list(range(Lr))
    nm=len(moeL); nd=Lr-nm
    tot=Lr*att+nm*(E*exp+exp+router)+nd*dmlp+2*V*h
    act=Lr*att+nm*(2*exp+router)+nd*dmlp+2*V*h
    return tot,act,att,exp,dmlp
for nm,(E,s) in {'Scout':(16,1),'Maverick':(128,2)}.items():
    t,a,att,exp,dm=l4(E,s);print(nm,'text total %.2fB active %.2fB (embeddings in and out counted) active w/o input emb %.2fB'%(t/1e9,a/1e9,(a-202048*5120)/1e9),'attn/layer %.1fM expert %.1fM densemlp %.1fM'%(att/1e6,exp/1e6,dm/1e6))
# vision encoder Llama 4: 34 layers, 1408 hidden, 5632 ff (gelu, 2 matrices), attn 4*h^2
v4=34*(4*1408*1408+2*1408*5632);print('L4 vision encoder approx %.2fB'%(v4/1e9))
# Glimmer
h,Lr,nh,kv,hd,ff,V=6656,52,32,2,128,19968,202048
att=h*nh*hd*2+h*kv*hd*2; mlp=3*h*ff; emb=2*V*h; gate=h*nh*hd
txt=Lr*(att+mlp)+emb
print('Glimmer text w/o gate %.2fB, +gate %.2fB, +1.8B vision %.2fB; +gate+vision %.2fB'%(txt/1e9,(txt+Lr*gate)/1e9,(txt+1.8e9)/1e9,(txt+Lr*gate+1.8e9)/1e9))
print('Glimmer BF16 bytes',29.6e9*2/1e9,'GB',29.6e9*2/2**30,'GiB')
print()
print('== Memory')
print('Scout int4 GB',109e9*0.5/1e9,' BF16',109e9*2/1e9,' Maverick FP8',400e9/1e9,'vs 640')
def kvtok(Lglob,kv,hd,b=2):return Lglob*2*kv*hd*b
for nm,(Lr,kv) in {'8B':(32,8),'70B':(80,8),'405B':(126,8)}.items():print(nm,'KV/token',kvtok(Lr,kv,128),'B; at 128K GiB',kvtok(Lr,kv,128)*131072/2**30)
g=kvtok(12,8,128);ch=kvtok(36,8,128)
for ctx in [8192,131072,1048576,10485760]:
    print('Llama4 ctx',ctx,'iRoPE KV GiB %.2f'%((g*ctx+ch*min(ctx,8192))/2**30),'all-global GiB %.2f'%(kvtok(48,8,128)*ctx/2**30))
gg=kvtok(13,2,128);gs=kvtok(39,2,128)
print('Glimmer KV/token global',gg,'at 131072 GiB %.3f'%((gg*131072+gs*2048)/2**30),'all-global %.3f'%(kvtok(52,2,128)*131072/2**30))
print('temperature factor at positions:',[(p,round(math.log1p(math.floor((p+1)/8192))*0.1+1,3)) for p in [8191,8192,131071,1048575,10485759]])
print()
print('== 4D parallelism')
for g,tp,cp,pp,dp,sl,b,tf in [(8192,8,1,16,64,8192,32,430),(16384,8,1,16,128,8192,16,400),(16384,8,16,16,8,131072,16,380)]:
    print(g,tp*cp*pp*dp,'tokens/batch',sl*b*dp,'MFU vs 989 TF',tf/989,'days for 3.8e25 at this rate',3.8e25/(g*tf*1e12)/86400)
print('interruptions sum',148+72+54+35+32+19+17+7+7+6+6+3+3+2+2+2+2+2, 'GPU-category',148+72+19+17+6+6,(148+72+19+17+6+6)/419)
print()
print('== AA')
print('Muse 1.3 xhigh 45.1 $1.3678 max 48.1 $1.6049; Glimmer 17.5 $0.0567')
print('cost ratio max/xhigh',1.6049/1.3678)
