// ---- Scene, Fig. 1 (top of the page): Qwen3-4B at Q4_K_M with an importance matrix on this 16 GB M1 Pro, memory to scale (one glass cell = 1 GB).
// Data: the file's bytes and its measured generation speed from LO.q.m4 (llama-bench on this laptop), the machine from LO.hw (16 GB, Apple's 200 GB/s),
// the GPU's working set LO.facts.wsGB (measured), and the F16 KV cache LO.models q4 (147,456 bytes per token from the config) times the trained 40,960 tokens. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.LO||!LO.q||!LO.q.m4)return;const {at,off,lerp,mix}=S3;
  const it=LO.q.m4.items.find(x=>x.id==='Q4_K_M+i'),hw=LO.hw.find(h=>h.k==='m1pro16'),M=LO.models.find(m=>m.k==='q4');
  const GB=hw.mem,BW=hw.bw,WS=parseFloat(LO.facts.wsGB),W8=it.bytes/1e9,KV=M.kv_tok_f16*40960/1e9,MEAS=it.tg;
  const C1=Math.round(BW/W8),C2=Math.round(BW/(W8+KV));
  (window.LOSC=window.LOSC||{}).hero={W8,KV,WS,MEAS,BW,C1,C2};
  const U=.55,X0=-GB*U/2,gx=g=>X0+g*U,Z0=-1.1,Z1=1.1,CPU=[-2.6,0,-3],GPU=[1.4,0,-3],SX=6.2,SY=.026;
  function draw(R,k,e){const P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));R.grid(-6,8,-3.8,2,.5);
    // the pool: 16 cells of 1 GB; the part macOS keeps is shaded beyond the GPU's working set
    R.glass([X0,.01,Z0],[GB*U,0,0],[0,0,Z1-Z0],{c:P.acc,nu:GB,nv:1,a:.85,th:.03});
    R.quad([[gx(WS),.04,Z0],[gx(GB),.04,Z0],[gx(GB),.04,Z1],[gx(WS),.04,Z1]],{fill:P.mute,fa:.28,edge:false});
    R.line([[gx(WS),.05,Z0-.2],[gx(WS),.05,Z1+.2]],{c:P.ink,w:1.6,dash:[5,4]});
    lab([gx(4.5),0,Z1],'16 GB unified memory · 200 GB/s',{dy:20,b:1,c:P.acc});
    lab([gx(WS),.05,Z1+.2],'GPU may use '+WS+' GB',{dy:16,b:1});
    lab([gx((WS+GB)/2),.05,Z0],'kept by macOS',{dy:-12,c:P.mute});
    // CPU and GPU share the pool: both read it at step 1; afterwards only the GPU reads
    const ca=k===0?1:.35;
    R.box(CPU,[1.5,.5,.9],{fill:mix(P.paper,P.mute,.25),a:ca});lab([CPU[0],.5,CPU[2]],'CPU',{dy:-12,b:1,a:Math.max(.5,ca)});
    R.box(GPU,[1.5,.5,.9],{fill:mix(P.paper,P.c1,.35)});lab([GPU[0],.5,GPU[2]],'GPU',{dy:-12,b:1,c:P.c1});
    if(k===0){R.flowArc([gx(4),.05,0],[CPU[0],.5,CPU[2]],.6,{c:P.mute,r:.05,n:7,speed:1.1});R.flowArc([gx(8),.05,0],[GPU[0],.5,GPU[2]],.6,{c:P.c1,r:.05,n:7,speed:1.1})}
    // the weights, then the KV cache, drawn to scale on the pool
    const wa=at(k,e,1),ka=at(k,e,2);
    if(wa>0){R.box([gx(W8/2),.04,0],[W8*U,.7*wa,1.9],{fill:mix(P.paper,P.c1,.72)});lab([gx(W8/2),.7,0],'weights '+W8.toFixed(2)+' GB',{dy:-14,b:1,c:P.c1,a:wa})}
    if(ka>0){const w=KV*U*ka;R.box([gx(W8)+w/2,.04,0],[w,.42,1.9],{fill:mix(P.paper,P.c2,k===3?.35:.65)});
      lab([gx(W8+KV/2),.42,0],'KV cache '+KV.toFixed(2)+' GB · 40,960 tokens',{dy:-14,b:1,c:P.c2,a:ka})}
    // a token reads every weight once (step 4), and the full cache too (step 5)
    if(k>=3){const ra=k===3?Math.min(1,e*1.4):1;
      for(let i=0;i<3;i++)R.flowArc([gx(W8*(i+.5)/3),.75,-.4+.4*i],[GPU[0]-.3+.3*i,.5,GPU[2]],.9,{c:P.c1,r:.07,n:9,speed:1.5,a:ra});
      if(k===4)for(let i=0;i<4;i++)R.flowArc([gx(W8+KV*(i+.5)/4),.46,-.3+.2*i],[GPU[0]+.2*i,.5,GPU[2]],1.1,{c:P.c2,r:.06,n:9,speed:1.5,a:e})}
    // tokens per second: the ceiling (bandwidth / bytes read) against the measured speed
    const sa=at(k,e,3);if(sa>0){const cv=k===4?lerp(C1,C2,e):C1,ma=k===4?1-e:1;
      R.box([SX-.4,0,0],[.6,cv*SY,.6],{fill:P.acc,fa:.25,ec:P.acc,lw:1.4,a:sa});
      lab([SX-.4,cv*SY,0],'ceiling '+Math.round(cv),{dy:-12,b:1,c:P.acc,a:sa,al:'right',dx:6});
      R.box([SX+.4,0,0],[.6,MEAS*SY,.6],{fill:mix(P.paper,P.c1,.8),a:sa*ma});
      lab([SX+.4,MEAS*SY,0],'measured '+MEAS.toFixed(1),{dy:-12,b:1,c:P.c1,a:sa*ma,al:'left',dx:-6});
      lab([SX,0,Z1],'tokens per second',{dy:20,c:P.mute,a:sa})}
  }
  const full={cam:[.16,.92],bounds:[[-5.1,0,-3.6],[7.1,2.1,1.5]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one model in this laptop’s memory',cam:full.cam,bounds:full.bounds,aspect:.58,dur:1500,hold:5200,draw,
    view:k=>k===1?{cam:[.28,.86],bounds:[[X0-.6,0,-3.6],[gx(8),1,1.5]]}:k===2?{cam:[.2,.9],bounds:[[X0-.4,0,-3.6],[gx(GB)+.4,1,1.5]]}:full,
    margin:w=>w<520?[18,10,16,10]:[24,18,20,18]});
  (window.LOSTG=window.LOSTG||{})['stg-hero']=st;
})();
