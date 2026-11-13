// ---- Scene: the R1 recipe as one flow in 3D (renderer v2: a few large objects per step, the camera moving in close per step,
// flowing dots wherever samples or rewards move). Three lanes, one per start from V3-Base, as in the paper's Figure 2:
// back lane R1-Zero, middle lane cold start and reasoning RL (Dev1, Dev2), front lane the fresh fine-tune and the last RL stage (Dev3, R1);
// the six distilled students in front. Numbers are the page's: Table 5's sample counts (stack layers to scale), Table 7's GPU hours,
// the step counts of §2.1 and §3.2.2; the cold start is "thousands" (no exact count in the paper; drawn as 4,000 to the same scale, labelled so). ----
(function(){
  if(!document.getElementById('stg-pipe'))return;const {mix}=S3;
  const T5=PAPER.tables.t5.rows,N=name=>T5.find(r=>r.model===name).n[0],TOT=N('Total');
  const ZA=-2.2,ZB=0,ZC=2.2,XV=-5.2,XD=-3.5,XM1=-1.9,XM2=1.4,XRL=-.25,XZ=-.6,ZS=3.75;
  const HS=1.25/TOT;                                          // stack height per sample: 804,745 samples are 1.25 units tall
  const dens=v=>Math.max(2,Math.round(v/TOT*14));             // dots in proportion to samples moved (at least two)
  const STU=[['Qwen-1.5B',1.5],['Qwen-7B',7],['Llama-8B',8],['Qwen-14B',14],['Qwen-32B',32],['Llama-70B',70]];
  function model(R,x,z,name,sub,a,c,cur){if(a<=.01)return;const P=R.P;
    R.box([x,0,z],[1.0,.66,.76],{fill:mix(P.paper,c,.32),a});
    R.label([x,.66,z],name,{fs:12.5,b:1,dy:-11,a:cur||a>=.99?1:a*.8,wide:cur?0:1});if(sub&&cur)R.label([x,0,z+.38],sub,{fs:12,dy:14,c:P.mute,wide:1})}
  function rule(R,x,z,name,a,c){if(a<=.01)return;const P=R.P;R.box([x,0,z],[.9,.34,.42],{fill:mix(P.paper,c,.18),a});if(a>.95)R.label([x,.34,z],name,{fs:12,dy:-9,c,wide:1})}
  // an RL loop: answers go from the lane to the reward and rewards come back
  function loop(R,x,z,zr,a,c){R.flowArc([x-.55,.42,z],[x,.38,zr],.35,{c:R.P.ink,a:a*.75,r:.05,n:4});R.flowArc([x,.38,zr],[x+.55,.42,z],.35,{c,a,r:.055,n:4})}
  function draw(R,k,e){const P=R.P;R.grid(-6.4,5,-3.4,4.4,.5);
    const A=s=>k===s?1:k>s?.28:0,last=k===5;
    const base=mix(P.paper,P.ink,.12);
    // ---- lane A: R1-Zero ----
    const a0=last?.28:A(0);
    model(R,XV,ZA,'V3-Base','671B MoE, pretrained',a0,P.mute,k===0);
    rule(R,-2.9,ZA-.95,'rule: accuracy + format',a0,P.c5);
    model(R,XZ,ZA,'R1-Zero','RL only, no SFT',k===1?.75:a0,P.c1,k===0);
    if(k===0){R.flow([[XV+.5,.33,ZA],[XZ-.5,.33,ZA]],{c:P.c1,a:e*.6,r:.05,n:5});loop(R,-2.9,ZA,ZA-.95,e,P.c5);
      R.label([-2.9,0,ZA+.2],'10,400 steps · 101K GPU hours',{fs:12,dy:16,c:P.c1,a:e})}
    // ---- lane B: cold start, Dev1, reasoning RL, Dev2 ----
    const a1=last?.28:A(1),a2=last?.28:A(2);
    model(R,XV,ZB,'V3-Base','the same base',a1,P.mute,k===1);
    const hc=4000*HS;R.box([XD,0,ZB-.95],[.72,Math.max(.012,hc),.5],{fill:mix(P.paper,P.c2,.7),a:a1});
    if(k===1){R.label([XD,.02,ZB-.95],'"thousands" (cold start)',{fs:12,dy:-12,c:P.c2,b:1});
      R.flowArc([XZ,.5,ZA+.3],[XD,.05,ZB-1.05],.7,{c:P.c2,a:e,r:.055,n:dens(4000)+2});
      R.flowArc([XD,.05,ZB-.7],[XD+.2,.35,ZB],.2,{c:P.c2,a:e,r:.05,n:3});R.flow([[XV+.5,.33,ZB],[XM1-.5,.33,ZB]],{c:P.ink,a:e*.6,r:.05,n:5})}
    model(R,XM1,ZB,'Dev1','cold-start SFT',k===1||k===2?1:a1,P.c2,k===1);
    rule(R,XRL,ZB-.95,'rule + language',a2,P.c5);
    model(R,XM2,ZB,'Dev2','reasoning RL, ε = 10',k===3?.75:a2,P.c3,k===2);
    if(k===2){loop(R,XRL,ZB,ZB-.95,e,P.c5);R.label([XRL,0,ZB+.25],'steps not stated',{fs:12,dy:16,c:P.mute,a:e})}
    // ---- lane C: 804,745 samples, Dev3, RL for all scenarios, R1 ----
    const a3=last?.5:A(3),a4=last?.28:A(4);
    model(R,XV,ZC,'V3-Base','again, not Dev2',a3,P.mute,k===3);
    const lay=[['Math',P.c1],['Code',P.c2],['STEM',P.c3],['Logic',P.c4],['General',P.c6]];let y=0;
    lay.forEach(([nm,c])=>{const h=N(nm)*HS;R.box([XD,y,ZC-.95],[.72,Math.max(.012,h),.5],{fill:mix(P.paper,c,.55),a:a3,shadow:y===0,lw:.6});
      if(k===3&&h>.1)R.label([XD+.36,y+h/2,ZC-.95],nm.toLowerCase()+' '+N(nm).toLocaleString('en-GB'),{al:'left',dx:8,fs:12,c,grp:'stack',a:e});y+=h});
    if(k===3){R.label([XD,y,ZC-.95],'804,745 samples',{fs:12.5,b:1,dy:-11});
      R.flowArc([XM2,.5,ZB+.3],[XD,y+.05,ZC-1.05],.8,{c:P.c1,a:e,r:.06,n:dens(TOT-N('General'))});
      R.box([XV-.9,0,ZC-.95],[.7,.2,.42],{fill:mix(P.paper,P.c6,.3),a:e});R.label([XV-1.25,.1,ZC-.95],'V3 SFT data',{al:'right',dx:-6,fs:12,c:P.c6,a:e,wide:1});
      R.flowArc([XV-.6,.2,ZC-.95],[XD-.3,.3,ZC-.95],.3,{c:P.c6,a:e,r:.055,n:dens(N('General'))});
      R.flowArc([XD,.3,ZC-.6],[XD+.25,.35,ZC],.2,{c:P.ink,a:e,r:.05,n:4});R.flow([[XV+.5,.33,ZC],[XM1-.5,.33,ZC]],{c:P.ink,a:e*.6,r:.05,n:5})}
    model(R,XM1,ZC,'Dev3','fresh SFT, 2 to 3 epochs',k===4?1:a3,P.c4,k===3);
    rule(R,XRL,ZC-.95,'rules + 2 reward models',a4,P.c5);
    model(R,XM2,ZC,'R1','1,700 RL steps, T 0.7',last?1:a4,P.c5,k===4);
    if(a4>.01){const x0=XM1+.45,L=1.7*1.4/1.7;R.box([x0+L*1300/1700/2,0,ZC+.62],[L*1300/1700,.07,.16],{fill:base,a:a4,shadow:false});
      R.box([x0+L*1300/1700+L*400/1700/2,0,ZC+.62],[L*400/1700,.07,.16],{fill:mix(P.paper,P.c5,.75),a:a4,shadow:false})}
    if(k===4){loop(R,XRL,ZC,ZC-.95,e,P.c5);R.label([XRL,0,ZC+.62],'1,700 steps · reward models in the last 400',{fs:12,dy:18,c:P.c5,a:e,b:1})}
    // ---- the six students, fed the same 800K samples ----
    const a5=A(5);
    STU.forEach(([nm,b],i)=>{const sx=-.2+i*.82,h=.2*Math.cbrt(b);R.box([sx,0,ZS],[.5,h,.5],{fill:mix(P.paper,P.c3,.35),a:a5});
      if(k===5){R.label([sx,h,ZS],nm,{fs:12,dy:-9,a:e,grp:'stu'});R.flowArc([XD+.3,1.1,ZC-.95],[sx,h+.05,ZS],.9,{c:P.c1,a:e*.8,r:.045,n:3})}});
    if(k===5)R.label([1.9,0,ZS+.25],'six students: SFT only, no RL',{fs:12.5,b:1,dy:18,c:P.c3,a:e});
  }
  const full={cam:[.28,.7],bounds:[[-6.4,0,-3.3],[4.6,1.4,4.2]]};
  const V=[{cam:[.3,.55],bounds:[[-5.9,0,-3.4],[.2,1.2,-1.3]]},{cam:[.32,.6],bounds:[[-5.9,0,-2.8],[.2,1.2,.6]]},{cam:[.25,.55],bounds:[[-2.6,0,-1.4],[2.2,1.2,.6]]},
    {cam:[.3,.6],bounds:[[-6.9,0,-.4],[2.2,1.5,2.8]]},{cam:[.22,.55],bounds:[[-2.6,0,.9],[2.2,1.2,3.2]]},{cam:[.3,.62],bounds:[[-4.3,0,.4],[4.6,1.4,4.3]]}];
  S3.stage({id:'stg-pipe',list:'sx-pipe',fig:'Fig. 2 · the R1 recipe, one lane per start from V3-Base',cam:full.cam,bounds:full.bounds,aspect:.66,dur:1800,hold:5200,draw,
    view:k=>{const v=V[k],h=document.getElementById('stg-pipe');return h&&h.clientWidth<520?{cam:[v.cam[0],Math.min(1.15,v.cam[1]+.3)],bounds:v.bounds}:v},margin:w=>w<520?[14,8,14,8]:[18,16,16,16]});
})();
