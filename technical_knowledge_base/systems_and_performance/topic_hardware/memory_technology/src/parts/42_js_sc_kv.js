// ---- Scene, Fig. 3 (section 6): what one decode step reads from an H100's HBM while serving Llama 3.1 8B, from window.MEMD:
// models l8 (wbytes, 32 layers, kv_tok_bf16 = 128 KiB per token, kv at 32,768 and 131,072 tokens), chips h100 (80 GB, 3.35 TB/s),
// vLLM's default gpu_memory_utilization 0.92 (inputs/vllm_cache_config_extract.txt). Bytes are drawn to one scale: the tray is 80 GB,
// every block's floor area is its bytes, and every block is 32 layers tall (one slab per layer; the cache splits into key and value halves).
// Step time is the bound (weight bytes + cache bytes) / bandwidth; activations are ignored, as the step list says. Positions are illustrative. ----
(function(){
  if(!document.getElementById('stg-kv')||!window.MEMD)return;const {at,off,lerp,mix}=S3;
  const D=window.MEMD,m=D.models.find(x=>x.id==='l8'),h=D.chips.find(c=>c.id==='h100'),BW=h.tbs*1e12,CAP=h.gb*1e9,W=m.wbytes,T=m.kv_tok_bf16,NL=m.L;
  const K32=m.kv['32768'],K128=m.kv['131072'],UT=.92,NB=Math.floor((UT*CAP-W)/K32);
  const ms=b=>b/BW*1e3,S=[{bytes:W,tok:1},{bytes:W+K32,tok:1},{bytes:W+K128,tok:1},{bytes:W+4*K32,tok:4},{bytes:W+NB*K32,tok:NB}];
  S.forEach(s=>{s.ms=ms(s.bytes);s.tps=s.tok/(s.bytes/BW)});
  window.MT_KV={w:W,tok:T,k32:K32,k128:K128,nb:NB,steps:S,layers:NL}; // checked by check/check_stages.mjs
  const X0=-4,DZ=1,LY=.03,LH=.022;  // the tray: 8 units long for 80 GB, 2 deep; one layer slab every .03 units
  const len=b=>b*8/CAP,WX1=X0+len(W),f=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
  const DIE=[WX1+1.2,0,2.5];
  // one block of 32 layer slabs; split: key half (back, z<0) and value half (front)
  function layers(R,x0,l,fill,a,z0,z1,step){if(l<.004||a<=.01)return;for(let i=0;i<NL;i+=step)R.box([x0+l/2,i*LY,(z0+z1)/2],[l,LH*step,z1-z0],{fill,a,shadow:i===0,lw:.5})}
  function cache(R,x0,l,a,fine){const P=R.P;if(fine){layers(R,x0,l,mix(P.paper,P.k,.55),a,-DZ,0,1);layers(R,x0,l,mix(P.paper,P.v,.55),a,0,DZ,1)}
    else{R.box([x0+l/2,0,-DZ/2],[l,NL*LY,DZ],{fill:mix(P.paper,P.k,.55),a,lw:.6});R.box([x0+l/2,0,DZ/2],[l,NL*LY,DZ],{fill:mix(P.paper,P.v,.55),a,lw:.6})}}
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12.5},o||{})),TOP=NL*LY;
    R.grid(-4.8,4.8,-1.8,3.4,.5);
    // HBM: the 80 GB tray, and vLLM's 92% line
    R.quad([[X0,.005,-DZ],[X0+8,.005,-DZ],[X0+8,.005,DZ],[X0,.005,DZ]],{fill:mix(P.card,P.c1,.06),ec:P.c1,dash:[5,4],a:.9,dz:200});
    lab([X0+8,0,-DZ],'HBM · '+h.gb+' GB',{dy:-12,al:'right',fs:12,c:P.c1});
    if(k===4){const x=X0+8*UT;R.line([[x,.01,-DZ-.15],[x,.01,DZ+.15]],{c:P.bad,w:1.6,dash:[4,3],a:e});lab([x,0,DZ+.15],'vLLM 92%',{dy:14,fs:12,c:P.bad,a:e})}
    // the weights, 32 layers
    layers(R,X0,len(W),mix(P.paper,P.c1,.45),1,-DZ,DZ,k>=3?2:1);
    // the GPU die in front: everything a step reads streams to it
    R.box(DIE,[1.5,.14,.8],{fill:mix(P.paper,P.ink,.2)});lab([DIE[0],.14,DIE[2]],'H100',{fs:12,b:1});
    const wn=Math.max(3,Math.round(W/2e9)),stream=(x0,l,c,bytes,a)=>{const p0=[x0+l/2,TOP+.05,DZ*.6];R.flowArc(p0,[DIE[0],.18,DIE[2]-.3],.55,{c,r:.06,n:Math.max(2,Math.round(bytes/2e9)),speed:1.3,a})};
    stream(X0,len(W),P.c1,W,1);
    // the cache: one conversation growing (steps 2, 3), then a batch at 32K (steps 4, 5)
    let x=WX1,cb=0;
    if(k===1||k===2){const b=k===1?K32*e:lerp(K32,K128,e),l=len(b);cache(R,x,l,1,true);cb=b;if(b>2e8)stream(x,l,P.k,b,1)}
    if(k===3||k===4){const n=k===3?4:NB,n0=k===3?1:4;for(let i=0;i<n;i++){const a=i<n0?1:(k===3?Math.min(1,Math.max(0,e*2.2-(i-1)*.35)):Math.min(1,Math.max(0,e*2.4-(i-4)*.14)));
        if(k===3&&i===0){cache(R,x,len(lerp(K128,K32,Math.min(1,e*2.5))),1,false);x+=len(lerp(K128,K32,Math.min(1,e*2.5)));continue}
        if(a<=.01)break;cache(R,x,len(K32),a,false);x+=len(K32)}
      cb=(k===3?4:NB)*K32;R.flowArc([WX1+len(cb)/2,TOP+.05,DZ*.6],[DIE[0],.18,DIE[2]-.3],.55,{c:P.v,r:.06,n:Math.max(2,Math.round(cb/2e9)),speed:1.3})}
    // labels
    const s=S[k];
    lab([X0+len(W)/2,TOP,-DZ],'weights · '+f(W/1e9,2)+' GB',{dy:-14,b:1,c:P.c1,grp:'top'});
    if(k===0)lab([X0+len(W)/2,TOP/2,DZ],NL+' layers',{dy:16,fs:12,c:P.mute,a:e});
    if(k===1||k===2){const tok=k===1?Math.round(32768*e):Math.round(lerp(32768,131072,e)),l=len(cb);
      lab([WX1+l,TOP,-DZ/2],'keys',{al:'left',dx:8,fs:12,c:P.k,b:1,grp:'kv'});lab([WX1+l,TOP*.4,DZ/2],'values',{al:'left',dx:8,fs:12,c:P.v,b:1,grp:'kv'});
      lab([WX1+Math.max(l,.4)/2,TOP,0],f(tok,0)+' tokens · '+f(cb/1e9,2)+' GB',{dy:-34,b:1,grp:'top'})}
    if(k===3)lab([WX1+len(cb)/2,TOP,0],'4 × 32K · '+f(cb/1e9,2)+' GB',{dy:-34,b:1,c:P.v,grp:'top',a:e});
    if(k===4)lab([WX1+len(cb)/2,TOP,0],NB+' × 32K · '+f(cb/1e9,1)+' GB',{dy:-34,b:1,c:P.v,grp:'top',a:e});
    lab([DIE[0],.14,DIE[2]+.4],'step ≥ '+f(s.ms,s.ms<10?2:1)+' ms · '+f(s.tps,0)+' tokens/s',{dy:18,b:1,a:k===0?e:1});
  }
  const full={cam:[.18,.72],bounds:[[-4.4,0,-1.3],[4.4,1.1,3.2]]};
  const views=[{cam:[.3,.68],bounds:[[-4.4,0,-1.3],[0,1.1,3.2]]},{cam:[.3,.68],bounds:[[-4.4,0,-1.3],[0,1.1,3.2]]},{cam:[.22,.7],bounds:[[-4.4,0,-1.3],[1,1.1,3.2]]},
    {cam:[.22,.7],bounds:[[-4.4,0,-1.3],[1,1.1,3.2]]},full];
  const st=S3.stage({id:'stg-kv',list:'sx-kv',fig:'Fig. 3 · what one decode step reads, Llama 3.1 8B on an H100',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1600,hold:5000,draw,
    view:k=>views[k]||full,margin:w=>w<520?[16,10,16,10]:[24,24,24,24]});
  (window.MTSTG=window.MTSTG||{})['stg-kv']=st;
})();
