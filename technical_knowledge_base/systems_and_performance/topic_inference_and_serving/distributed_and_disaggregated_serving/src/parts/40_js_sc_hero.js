// ---- Scene, the top of the page (Fig. 1): five ways to spread serving over GPUs, then the serving layer above them. Four GPUs drawn for eight;
// the model as four glass slabs of layers (20 each). What crosses per token and the link it needs come from window.DDC (recompute.py):
// TP 8 per-token bytes per GPU, the 16 KiB hidden state, DeepSeek-V3's expert traffic, the 2,000-token prompt's cache and its transfer times. ----
(function(){
  if(!document.getElementById('stg-hero')||!window.DDS||!window.DDC)return;const {mix,lerp}=S3,{vis,gpu,lab,f0,f1}=DDS,C=window.DDC;
  const X=[-3.3,-1.1,1.1,3.3],GS=[1.7,.22,1.25],Y=j=>.44+j*.28,SL=[1.3,.95];
  const MB=b=>(b/1e6).toFixed(2)+' MB';
  const T={tp:MB(C.tp_bytes['8'].per_token_sent),ep:MB(C.ep.per_token),kv:f0(C.ex_xfer.mib)+' MiB',nic:f0(C.ex_xfer.ms.nic400)+' ms',nvl:f1(C.ex_xfer.ms.nvl)+' ms'};
  window.DD_HERO=T; // checked by check_stages.mjs against the step list
  const plate=(R,cx,y,w,d,c,a,nu)=>R.glass([cx-w/2,y,-d/2],[w,0,0],[0,0,d],{c,a,nu:nu||4,nv:3});
  function draw(R,k,e,st){const P=R.P,v=f=>vis(k,e,st,f);R.grid(-5,5,-1.6,3.4,.5);
    // the GPUs, always there
    const pd=v(q=>q>=4);
    X.forEach((x,g)=>{gpu(R,[x,0,0],GS);lab(R,[x,0,GS[2]/2],'GPU '+g,{dy:15,c:P.mute,fs:12,a:1-pd});
      if(pd>0)lab(R,[x,0,GS[2]/2],g<2?'prefill GPU':'decode GPU',{dy:15,b:1,c:g<2?P.c2:P.c1,fs:12,a:pd})});
    // 1. replicas: four whole copies, a router in front, nothing between them
    let a=v(q=>q===0);
    if(a>0){X.forEach(x=>{for(let j=0;j<4;j++)plate(R,x,Y(j),SL[0],SL[1],P.c1,a)});
      R.box([0,0,2.55],[1.5,.3,.55],{fill:mix(P.paper,P.c5,.35),a});lab(R,[0,.3,2.55],'router',{dy:-12,b:1,a});
      X.forEach((x,g)=>R.flowArc([0,.3,2.4],[x,Y(0)-.05,.5],.5+.1*Math.abs(g-1.5),{c:P.c5,a,r:.06,n:6,speed:1.2}));
      lab(R,[X[3]+.7,Y(3),0],'whole copy',{al:'left',dx:8,fs:12.5,c:P.c1,a,wide:1});lab(R,[0,0,2.85],'nothing crosses between GPUs',{dy:18,b:1,c:P.acc,fs:13,a})}
    // 2. tensor parallel: every layer cut across the GPUs, two all-reduces per layer
    a=v(q=>q===1);
    if(a>0){X.forEach(x=>{for(let j=0;j<4;j++)plate(R,x,Y(j),2.18,SL[1],P.c1,a,2)});
      for(let j=0;j<4;j++){const y=Y(j)+.1;R.flow([[X[0],y,.12],[X[3],y,.12]],{c:P.c2,a:a*(j===3?1:.6),r:.075,speed:1.4,top:j===3});R.flow([[X[3],y,-.12],[X[0],y,-.12]],{c:P.c2,a:a*(j===3?1:.6),r:.075,speed:1.4,top:j===3})}
      lab(R,[0,Y(3)+.1,-.5],T.tp+' per token per GPU, over NVLink',{dy:-16,b:1,c:P.c2,fs:13,a})}
    // 3. pipeline parallel: each GPU a run of whole layers; one hidden state crosses each boundary
    a=v(q=>q===2);
    if(a>0){X.forEach((x,g)=>{plate(R,x,Y(g),SL[0],SL[1],mix(P.c3,P.c1,g/4),a);lab(R,[x+.7,Y(g),0],'layers '+(g*20+1)+' to '+(g*20+20),{al:'left',dx:6,fs:12,c:P.mute,a,wide:1})});
      for(let g=0;g<3;g++)R.flowArc([X[g]+.4,Y(g)+.06,0],[X[g+1]-.4,Y(g+1)+.06,0],.25,{c:P.c3,a,r:.075,n:5,speed:1.1});
      lab(R,R.arcPt([X[1]+.4,Y(1)+.06,0],[X[2]-.4,Y(2)+.06,0],.25,.5),'16 KiB per boundary',{dy:-16,b:1,c:P.c3,fs:13,a})}
    // 4. expert parallel: attention at home, tokens to their experts on other GPUs and back
    a=v(q=>q===3);
    if(a>0){X.forEach((x,g)=>{plate(R,x,1.05,SL[0],SL[1],P.c1,a);
        for(let i=0;i<6;i++){const ex=x-.45+(i%3)*.45,ez=-.22+Math.floor(i/3)*.44,hot=(g>0&&i===(g+1)%6);R.box([ex,GS[1],ez],[.3,.3,.3],{fill:hot?mix(P.paper,P.c4,.75):mix(P.paper,P.c4,.25),a,lw:hot?1.6:.7,shadow:false})}});
      lab(R,[X[0],1.05,-.45],'attention, own users',{dy:-12,fs:12,c:P.c1,a,wide:1});lab(R,[X[3]+.7,.4,0],'experts',{al:'left',dx:6,fs:12,c:P.c4,a,wide:1});
      R.ball([X[0],1.12,0],.09,{c:P.acc,a});
      for(let g=1;g<4;g++){const ex=X[g]-.45+((g+1)%6%3)*.45,ez=-.22+Math.floor(((g+1)%6)/3)*.44;
        R.flowArc([X[0]+.1,1.1,.1],[ex,.55,ez],.45,{c:P.c2,a,r:.06,n:6,speed:1.4});R.flowArc([ex,.55,ez+.08],[X[0]-.1,1.1,-.1],.65,{c:P.c4,a:a*.85,r:.05,n:5,speed:1.2})}
      lab(R,[X[2],1.5,0],T.ep+' per token (DeepSeek-V3)',{dy:-12,b:1,c:P.c2,fs:13,a})}
    // 5. prefill/decode split: the cache crosses once per request
    a=pd;
    if(a>0){const dim=k===5?.45:1;X.forEach((x,g)=>{for(let j=0;j<2;j++)plate(R,x,Y(j),SL[0],SL[1],g<2?P.c2:P.c1,a*dim)});
      for(let j=0;j<4;j++)R.glass([-.32,.5+j*.12,-.35],[.64,0,0],[0,0,.7],{c:P.c4,a:a*dim,nu:4,nv:2,th:.03});
      R.flow([[X[1]+.5,.75,0],[X[2]-.5,.75,0]],{c:P.c4,a:a*dim,r:.09,n:7,speed:1.3});
      const ka=v(q=>q===4);lab(R,[0,1.0,0],T.kv+' once per request',{dy:-14,b:1,c:P.c4,fs:13,a:ka});lab(R,[0,1.0,0],T.nic+' at 50 GB/s',{dy:4,c:P.mute,fs:12,a:ka})}
    // 6. the serving layer above: routes requests, moves caches, sizes the pools
    a=v(q=>q===5);
    if(a>0){R.glass([-4.3,2.15,-.75],[8.6,0,0],[0,0,1.6],{c:P.c5,a,nu:12,nv:2});
      R.box([-1.2,2.18,.05],[1.5,.22,.6],{fill:mix(P.paper,P.c5,.35),a,shadow:false});lab(R,[-1.2,2.4,.05],'router',{dy:-10,b:1,a});
      R.box([1.4,2.18,.05],[1.5,.22,.6],{fill:mix(P.paper,P.c5,.35),a,shadow:false});lab(R,[1.4,2.4,.05],'planner',{dy:-10,b:1,a});
      lab(R,[4.3,2.15,.85],'serving layer · Dynamo, llm-d',{al:'right',dy:18,b:1,c:P.c5,fs:13,a});
      R.flowArc([-1.2,3.4,2.8],[-1.2,2.3,.2],.2,{c:P.acc,a,r:.07,n:6,speed:1.3});
      [X[0],X[1]].forEach(x=>R.flowArc([-1.2,2.15,0],[x,Y(1)+.1,0],.15,{c:P.c2,a,r:.06,n:5,speed:1.2}));
      R.flowArc([1.4,2.15,0],[X[3],Y(1)+.1,0],.15,{c:P.c5,a:a*.7,r:.05,n:4,speed:1})}
  }
  const full={cam:[.1,.7],bounds:[[-4.3,0,-.7],[4.3,1.1,2.9]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · five ways to spread serving',cam:full.cam,bounds:full.bounds,aspect:.41,dur:1500,hold:4800,draw,
    view:k=>DDP('stg-hero',k===5?{cam:[.12,.55],bounds:[[-4.4,0,-.8],[4.4,2.5,3]]}:k===3?{cam:[.1,.62],bounds:[[-4.3,0,-.7],[4.3,1.6,1.2]]}:null,full.cam),margin:w=>w<520?[16,10,14,10]:[22,18,18,18]});
  (window.DDSTG=window.DDSTG||{})['stg-hero']=st;
})();
