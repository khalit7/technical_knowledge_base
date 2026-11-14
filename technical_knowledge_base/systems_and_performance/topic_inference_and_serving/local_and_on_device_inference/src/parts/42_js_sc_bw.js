// ---- Scene, Fig. 3 (section 1): bytes read per token against tokens per second for four Qwen3-1.7B files measured on this laptop.
// Each file is a box whose height is its GB (all of it is read for every token), beside two bars: the ceiling 200 GB/s / GB and the measured
// generation speed (llama-bench tg128, fastest pass, LO.q.m17). Step 6 adds the F16 KV cache of 16,000 tokens (LO.models q17: 114,688 bytes a token). ----
(function(){
  if(!document.getElementById('stg-bw')||!window.LO||!LO.q||!LO.q.m17)return;const {at,off,lerp,mix}=S3;
  const Q=LO.q.m17,hw=LO.hw.find(h=>h.k==='m1pro16'),BW=hw.bw,M=LO.models.find(m=>m.k==='q17'),KV=M.kv_tok_f16*16000/1e9;
  const F=[['F16',Q.base],['Q8_0',Q.items.find(x=>x.id==='Q8_0')],['Q4_K_M',Q.items.find(x=>x.id==='Q4_K_M+i')],['Q4_0',Q.items.find(x=>x.id==='Q4_0')]]
    .map(([n,it])=>({n,gb:it.bytes/1e9,tg:it.tg,ceil:BW/(it.bytes/1e9)}));
  (window.LOSC=window.LOSC||{}).bw={F,KV,BW,ceilKV:BW/(F[2].gb+KV)};
  const XS=[-4.8,-1.6,1.6,4.8],GZ=-3.9,GPU=[0,0,GZ],HB=.55,SY=.0135,Z=.3;
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));R.grid(-7,7,-4.6,1.6,.5);
    R.box(GPU,[2.6,.5,1],{fill:mix(P.paper,P.c1,.35)});lab([0,.5,GZ],'M1 Pro GPU · reads 200 GB/s at most',{dy:-12,b:1,c:P.c1});
    F.forEach((f,i)=>{const x=XS[i],act=k===i||k===4||(k===5&&i===2);
      const a=k===4?1:act?1:.1,la=act?1:0; // in a close-up the other files, cut by the frame, recede almost fully
      const fx=x-.6,h=f.gb*HB,kv=k===5&&i===2?at(k,e,5):0;
      R.box([fx,0,Z],[.9,h,.9],{fill:mix(P.paper,P.c1,.15+.45*(f.gb/F[0].gb)),a});
      lab([fx,0,Z+.45],f.n+' · '+f.gb.toFixed(2)+' GB',{dy:16,b:1,a:la});
      if(kv>0){R.box([fx,h,Z],[.9,KV*HB*kv,.9],{fill:mix(P.paper,P.c2,.6)});lab([fx,h+KV*HB,Z],'+ KV '+KV.toFixed(2)+' GB',{dy:-12,b:1,c:P.c2,a:kv,al:'right',dx:4})}
      // bars: ceiling (glass) and measured (solid)
      const ce=k===5&&i===2?lerp(f.ceil,BW/(f.gb+KV),e):f.ceil,ma=k===5&&i===2?1-e:1;
      R.box([x+.35,0,Z],[.48,ce*SY,.48],{fill:P.acc,fa:.22,ec:P.acc,lw:1.3,a:a*.95});
      R.box([x+.95,0,Z],[.48,f.tg*SY,.48],{fill:mix(P.paper,P.c3,.75),a:a*ma});
      if(la>0){lab([x+.35,ce*SY,Z],String(Math.round(ce)),{dy:-11,b:1,c:P.acc,a:la});lab([x+.95,f.tg*SY,Z],f.tg.toFixed(1),{dy:-11,b:1,c:P.c3,a:la*ma})}
      if(act&&k!==4)lab([x+.65,0,Z+.45],'ceiling · measured',{dy:34,c:P.mute,a:la})
      // one token: the file's bytes stream to the GPU, dots in proportion to the GB read, at a pace in proportion to the measured speed
      if(act&&k!==4){const ra=k===i?Math.min(1,e*1.5):1;
        R.flowArc([fx,h,Z-.2],[x>0?.5:-.5,.5,GZ],.8,{c:P.c1,r:.065,n:Math.round(4+f.gb*4),speed:.5+f.tg/70,a:ra});
        if(kv>0)R.flowArc([fx+.2,h+KV*HB*kv,Z],[.6,.5,GZ],1,{c:P.c2,r:.06,n:Math.round(4+KV*4),speed:.5+f.tg/70,a:kv})}
    });
  }
  const near=i=>({cam:[.18,.6],bounds:[[Math.min(XS[i]-1.6,-1.4),0,-4.4],[Math.max(XS[i]+1.6,1.4),2.4,1.3]]});
  const full={cam:[.1,.62],bounds:[[-6.2,0,-4.4],[6.2,2.4,1.3]]};
  const st=S3.stage({id:'stg-bw',list:'sx-bw',fig:'Fig. 3 · bytes per token against tokens per second',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:5200,draw,
    view:k=>k<4?near(k):k===5?near(2):full,margin:w=>w<520?[16,8,18,8]:[22,16,22,16]});
  (window.LOSTG=window.LOSTG||{})['stg-bw']=st;
})();
