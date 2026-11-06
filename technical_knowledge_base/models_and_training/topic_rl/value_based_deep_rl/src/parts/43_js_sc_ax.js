// ---- Scene (section 11): Ape-X's actors, one shared prioritised replay and one learner, then R2D2's sequences (renderer v2: flows, glass learner, camera per step) ----
// Numbers (window.VB3.ax, checked by src/checks/check_stages.mjs) are the ones section 11 quotes: Ape-X 360 actors with eps_i = 0.4^(1 + 7i/359)
// (0.4 down to 0.4^8, about 0.0007), median 434% after 22.8 billion frames; R2D2 256 actors, sequences of 80 steps, burn-in 40, median 1920.6%.
(function(){
  const N=360,EPS=.4,AL=7,eps=i=>Math.pow(EPS,1+i*AL/(N-1)),R2=256,SEQ=80,BURN=40;
  window.VB3=window.VB3||{};window.VB3.ax={N,EPS,AL,eMin:eps(N-1),R2,SEQ,BURN,train:SEQ-BURN};
  if(!document.getElementById('stg-ax')||!window.S3)return;const {at,mix,lerp}=S3;
  const CO=20,SP=.21,FX=c=>-5.3+c*SP,FZ=r=>-1.85+r*SP,LG=Math.log(eps(N-1));
  const hgt=i=>.08+.62*(1-Math.log(eps(i))/LG)/(1-1/8);           // log scale: the most exploratory actor (eps 0.4) tallest, the greediest shortest
  const RX=c=>.1+c*.16,RZ=0,NS=16,LX=3.9,LZ=0,LY=[.95,.8,.62];
  const SX=i=>-.15+i*.045,SY=1.75;                                  // R2D2: one replayed sequence of 80 steps, drawn above the replay
  function draw(R,k,e){const P=R.P,ph=R.W<520,fa=Math.min(1,e*1.6);R.grid(-5.8,5,-2.4,2.4,.5);
    // the actors: one small column per actor, height its exploration rate (log scale); at the R2D2 step 256 of them remain
    const fA=k===0||k===3||k===4?1:k===1?.6:.2,n2=k===4?Math.round(lerp(N,R2,e)):N,co2=k===4?Math.round(lerp(CO,16,e)):CO;
    for(let i=0;i<N;i++){const keep=i<n2,a=fA*(keep?1:Math.max(0,1-e*2));if(a<=.01)continue;const c=i%co2,r=Math.floor(i/co2),h=k===4?.25:hgt(i);
      R.box([FX(c),0,FZ(r)],[.14,h,.14],{fill:k===4?mix(P.paper,P.c5,.45):mix(P.paper,P.c2,.15+.75*(h-.08)/.62),a,shadow:false,lw:.6})}
    R.label([FX(CO/2),0,FZ(17)+.25],k===4?(ph?'256 actors':'R2D2: 256 actors'):(ph?'360 actors':'360 actors, each its own emulator'),{fs:12.5,b:1,dy:14,a:fA>=.6?1:0});
    if(k===0){R.label([FX(0),hgt(0),FZ(0)],'ε 0.4',{fs:12.5,mono:1,b:1,c:P.c2,al:'right',dx:-6,a:fa});
      R.label([FX(CO-1),hgt(N-1),FZ(17)],'ε ≈ 0.0007',{fs:12.5,mono:1,b:1,c:P.c2,al:'left',dx:8,a:fa})}
    // the shared prioritised replay: a row of transitions
    const fR=k>=1?(k===3?.35:1):.06;
    for(let i=0;i<NS;i++)R.box([RX(i),0,RZ],[.1,.75,1.1],{fill:mix(P.paper,P.c3,.35),a:fR,shadow:i===0||i===NS-1});
    if(k>=1)R.label([RX(NS/2),0,RZ+.6],ph?'shared replay':'one shared prioritised replay',{fs:12.5,b:1,dy:14,a:Math.max(fR,.5)});
    // the learner: one network, glass plates (with an LSTM at the R2D2 step)
    const fL=k>=2?1:.08;LY.forEach((h,i)=>R.glass([LX-.35+i*.35,.08,LZ-h/2],[0,0,h],[0,h,0],{c:P.c1,a:fL,nu:4,nv:4,th:.06}));
    if(k===4){R.box([LX+.75,.25,LZ],[.4,.4,.4],{fill:mix(P.paper,P.c5,.6),a:e});R.label([LX+.75,.65,LZ],'LSTM',{fs:12.5,b:1,dy:-12,c:P.c5,a:e})}
    if(k>=2)R.label([LX,0,LZ+.6],ph?'learner':'one GPU learner',{fs:12.5,b:1,dy:14,a:fL});
    // 2. every actor writes its transitions, with their priorities, into the replay
    if(k===1||k===4){const src=k===1?[[2,1],[9,3],[16,2],[4,8],[12,9],[18,10],[6,15],[14,16]]:[[3,2],[12,4],[7,11],[14,14]];
      src.forEach(([c,r],j)=>R.flowArc([FX(c),.5,FZ(r)],[RX(2+j%12),.8,RZ+(j%3-1)*.3],.5+.06*j,{c:P.acc,a:fa*.85,r:.06,speed:1.4,n:9}));
      if(k===1)R.label([FX(CO)+.4,1.45,0],ph?'priorities from the actors':'transitions with priorities the actors computed',{fs:12.5,b:1,c:P.acc,a:fa})}
    // 3. the learner samples by priority
    if(k===2){[3,7,8,13].forEach((i,j)=>R.flowArc([RX(i),.8,RZ],[LX-.35,.75,LZ],.35+.08*j,{c:P.c3,a:fa,r:.07,speed:1.3,n:8}));
      R.label([(RX(NS)+LX)/2,1.35,0],ph?'sampled by priority':'sampled by priority',{fs:12.5,b:1,c:P.c3,a:fa});
      R.label([LX,0,LZ+.6],'Double DQN, dueling, n-step',{fs:12.5,c:P.c1,dy:32,a:fa,wide:1})}
    // 4. new weights go back to every actor
    if(k===3){[[4,4],[15,6],[9,13],[17,15]].forEach(([c,r],j)=>R.flowArc([LX,1.0,LZ],[FX(c),.75,FZ(r)],1.1+.1*j,{c:P.c1,a:fa*.9,r:.07,speed:1.8,n:14}));
      R.label([0,2.4,0],ph?'latest weights to the actors':'the actors copy the learner’s latest weights',{fs:12.5,b:1,c:P.c1,a:fa})}
    // 5. R2D2: the replay holds sequences of 80 steps; the learner unrolls the first 40 as burn-in and trains on the other 40
    if(k===4){for(let i=0;i<SEQ;i++){const b=i<BURN;R.box([SX(i),SY,RZ],[.04,.22,.3],{fill:b?mix(P.paper,P.mute,.35):mix(P.paper,P.acc,.6),a:e,shadow:false,lw:.4})}
      if(ph)R.label([SX(SEQ/2),SY+.22,RZ],'burn-in 40 · train 40',{fs:12.5,b:1,mono:1,c:P.acc,dy:-12,a:e});else{R.label([SX(BURN/2),SY+.22,RZ],'burn-in 40',{fs:12.5,b:1,mono:1,c:P.mute,dy:-12,a:e});R.label([SX(BURN+BURN/2),SY+.22,RZ],'train 40',{fs:12.5,b:1,mono:1,c:P.acc,dy:-12,a:e})}
      R.flowArc([SX(SEQ-1)+.05,SY+.1,RZ],[LX-.35,.9,LZ],.25,{c:P.acc,a:e,r:.07,speed:1.2,n:7});
      R.label([SX(0)-.08,SY+.11,RZ],ph?'80 steps':'one sequence: 80 steps',{fs:12.5,b:1,al:'right',dx:-6,a:e})}
  }
  const full={cam:[-.25,.7],bounds:[[-5.5,0,-2.1],[4.6,2.0,2.1]]};
  // the actors are seen up close first; the replay and learner steps frame them; the weights going back and R2D2 use the whole picture
  const V0=[{cam:[-.3,.62],bounds:[[-5.5,0,-2.1],[-1,1.2,2.1]]},{cam:[-.25,.62],bounds:[[-5.5,0,-2.1],[2.8,1.6,2.1]]},{cam:[-.2,.55],bounds:[[-.4,0,-1],[4.6,1.6,1]]},full,full];
  S3.stage({id:'stg-ax',list:'sx-ax',fig:'§11 · Ape-X: many actors, one replay, one learner',cam:full.cam,bounds:full.bounds,aspect:.62,draw,dur:1500,hold:4800,
    margin:w=>w<520?[16,10,14,10]:[20,16,16,16],view:k=>V0[k]});
})();
