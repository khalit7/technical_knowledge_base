// ---- Layout calculator: the model, mirrored line for line from src/recompute.py layout() ----
window.LAY=(function(){
  const GB=1e9;
  function llama(L,h,f,nh,kv,V,hd){V=V||128256;hd=hd||128;const attn=h*(h+2*kv*hd)+h*h,mlp=3*h*f,per=attn+mlp+2*h,tot=2*V*h+L*per+h;
    return {L,h,f,nh,hkv:kv*hd,V,P:tot,Pexp:0,Pact:tot,k:0,E:0,moeL:0}}
  const M={
    llama3_8b:Object.assign(llama(32,4096,14336,32,8),{name:'Llama 3 8B'}),
    llama3_70b:Object.assign(llama(80,8192,28672,64,8),{name:'Llama 3 70B'}),
    llama3_405b:Object.assign(llama(126,16384,53248,128,8),{name:'Llama 3 405B'}),
    deepseek_v3:{name:'DeepSeek-V3 671B (MoE)',L:61,h:7168,f:18432,nh:128,hkv:128*128,V:129280,P:671026419200,Pexp:653908770816,Pact:37552282624,k:8,E:256,moeL:58},
    zero_7p5b:{name:'ZeRO paper 7.5B (states only)',L:0,h:0,f:0,nh:0,hkv:0,V:0,P:7.5e9,Pexp:0,Pact:7.5e9,k:0,E:0,moeL:0}};
  const RECIPES={
    zero16:{w:2,g:2,o:12,name:'16: bf16 weights and gradients, fp32 Adam (ZeRO)'},
    llama18:{w:2,g:4,o:12,name:'18: fp32 gradients (our reading of Llama 3)'},
    mtnlg20:{w:2,g:4,o:14,name:'20: MT-NLG\'s count'},
    ds14:{w:2,g:4,o:8,name:'14: bf16 Adam moments (our reading of DeepSeek-V3)'}};
  const GPUS={h100:{mem:80,nv:450,ib:50,peak:989.5e12,name:'H100 SXM: NVLink 450, network 50 GB/s'},h800:{mem:80,nv:160,ib:50,peak:989.5e12,name:'H800: NVLink 160, IB 50 GB/s (DeepSeek)'}};
  function layout(o){
    const md=M[o.model],r=RECIPES[o.recipe||'zero16'],G=GPUS[o.gpu||'h100'];
    const TP=o.TP||1,CP=o.CP||1,PP=o.PP||1,DP=o.DP||1,EP=o.EP||1,zero=o.zero||0,s=o.s||8192,b=o.b||1,m=o.m||1;
    const copies=o.copies||1,disp=o.disp_bytes||2,gpn=8,mfu=o.mfu||0.4,acts=o.acts!==false,ckpt=o.ckpt||'store';
    const N=TP*CP*PP*DP;
    const Pd=md.P-md.Pexp,Pe=md.Pexp;
    const pd=Pd/(TP*PP)*copies,pe=Pe?Pe/(EP*PP*TP)*copies:0;
    const Dd=DP*CP,De=Math.max(1,Math.floor(DP*CP/EP));
    const st=(p,D)=>[r.w*p/(zero>=3?D:1),r.g*p/(zero>=2?D:1),r.o*p/(zero>=1?D:1)];
    const [wd,gd,od]=st(pd,Dd),[we,ge,oe]=st(pe,De);
    const W=wd+we,Gr=gd+ge,O=od+oe;
    const Ls=md.L?md.L/PP:0,infl=o.inflight||Math.min(m,PP);
    const perLayer=34*s*b*md.h/(TP*CP);
    let A;
    if(!acts||!md.L)A=0;else if(ckpt==='full')A=Ls*infl*2*s*b*md.h/(TP*CP)+perLayer;else A=Ls*infl*perLayer;
    const ar=n=>2*(n-1)/n,rs=n=>(n-1)/n;
    const dpb=(p,D)=>{if(D<=1||p===0)return 0;if(zero===0)return ar(D)*r.g*p;if(zero===1||zero===2)return rs(D)*r.g*p+rs(D)*2*p;return rs(D)*r.g*p+rs(D)*2*p*2*m};
    const comm={};
    comm.DP=dpb(pd,Dd)+dpb(pe,De);
    const actMsg=s*b*md.h*2/CP;
    comm.TP=TP>1?4*ar(TP)*actMsg*Ls*m:0;
    comm.CP=CP>1?2*rs(CP)*(2*s*b*md.hkv*2/TP)*Ls*m:0;
    comm.PP=PP>1?2*s*b*md.h*2/(TP*CP)*m:0;
    if(EP>1&&md.k){const T=s*b/(CP*TP),fwd=T*md.k*md.h*(disp+2)*(EP-1)/EP,bwd=T*md.k*md.h*4*(EP-1)/EP;comm.EP=(fwd+bwd)*(md.moeL/PP)*m}else comm.EP=0;
    const span={TP:TP,CP:TP*CP,EP:TP*CP*EP,PP:TP*CP*EP*PP,DP:N};
    const link={};for(const k in span)link[k]=span[k]<=gpn?'nv':'ib';
    const t={};for(const k in comm)t[k]=comm[k]/((link[k]==='nv'?G.nv:G.ib)*GB);
    const tokens=DP*m*b*s;
    const tComp=md.L?6*md.Pact*tokens/(N*G.peak*mfu):0;
    return {N,pd,pe,W:W/GB,G:Gr/GB,O:O/GB,states:(W+Gr+O)/GB,A:A/GB,total:(W+Gr+O+A)/GB,comm:Object.fromEntries(Object.entries(comm).map(([k,v])=>[k,v/GB])),link,t,tokens,t_comp:tComp,mem:G.mem};
  }
  const PRESETS={
    zero75:{model:'zero_7p5b',DP:64,zero:1,recipe:'zero16',acts:false},
    l8b_fsdp:{model:'llama3_8b',DP:8,zero:3,s:8192,b:1,m:4,mfu:0.40},
    l405_8k_8k:{model:'llama3_405b',TP:8,PP:16,DP:64,zero:2,recipe:'llama18',s:8192,m:32,mfu:0.43},
    l405_8k_16k:{model:'llama3_405b',TP:8,PP:16,DP:128,zero:2,recipe:'llama18',s:8192,m:16,mfu:0.41},
    l405_128k:{model:'llama3_405b',TP:8,CP:16,PP:16,DP:8,zero:2,recipe:'llama18',s:131072,m:16,mfu:0.38},
    dsv3:{model:'deepseek_v3',PP:16,DP:128,EP:64,zero:1,recipe:'ds14',s:4096,m:120,gpu:'h800',mfu:0.3427,copies:2,inflight:17,disp_bytes:1}};
  return {M,RECIPES,GPUS,PRESETS,layout};
})();
