// ---- Scene, Fig. 4 (section 6): where each kind of drafter gets its guesses (renderer v2) ----
// The target's layers are drawn schematically (five plates stand for its layers; positions illustrative). The numbers in the labels are the
// acceptance lengths measured here in the Drafters measured tab (SD.D.drafters.res: llama-server, Qwen3-4B Q4_K_M target, greedy) on the
// "Code: rename" and "Story" prompts; Medusa and MTP were not run here (no llama.cpp support; Qwen3 ships no MTP heads).
// src/check_stages.mjs checks the step list against window.SD_STG.dr.
(function(){
  if(!document.getElementById('stg-dr')||!window.SD||!window.S3||!SD.D.drafters)return;const {at,off,lerp,mix}=S3;
  const R0=SD.D.drafters.res,Lof=(key,p)=>R0[key]&&R0[key][p]&&R0[key][p].L;
  const M={ng:['ng_simple'],sm:['d06_k3'],ea:['eagle3_k3'],df:['dflash_k15']};
  const meas={};Object.entries(M).forEach(([k,[key]])=>meas[k]={code:Lof(key,'code_rename'),story:Lof(key,'story')});
  window.SD_STG=window.SD_STG||{};window.SD_STG.dr=meas;
  const YL=[.3,.68,1.06,1.44,1.82],ZR=1.9,XP=i=>-4.6+i*.62,XG=i=>.75+i*.95,XB=i=>.35+i*.27;
  const lab=(R,p,t,o)=>R.label(p,t,Object.assign({fs:12.5},o||{}));
  function draw(R,k,e){const P=R.P,blue=P.acc,or=P.c2;R.grid(-6,5,-2.6,2.8,.5);
    // the target: five plates standing for its layers, the prompt row in front, the guess slots to its right
    YL.forEach((y,j)=>R.glass([-1.25,y,-.7],[2.5,0,0],[0,0,1.4],{c:blue,a:k===3&&(j===0||j===2||j===4)||k===2&&j===4||k===5&&(j===2||j===4)?.85:.32,nu:8,nv:4,th:.03}));
    lab(R,[1.25,YL[0],.7],'target layers (schematic)',{al:'left',dx:8,mono:true,c:blue,grp:'r'});
    for(let i=0;i<7;i++)R.box([XP(i),0,ZR],[.55,.1,.45],{fill:mix(P.paper,P.mute,i===2||i===3?(k===0?.0:.15):.15),a:1});
    if(k===0)[2,3].forEach(i=>R.box([XP(i),0,ZR],[.55,.1,.45],{fill:mix(P.paper,P.c3,.45)}));
    lab(R,[XP(3),.1,ZR+.22],'prompt and text so far',{dy:16,mono:true,c:P.mute,wide:1});
    const nk=k===5?16:4,gx=k===5?XB:XG,gw=k===5?.22:.8;
    for(let i=0;i<nk;i++){const x0=gx(i);R.quad([[x0-gw/2,.005,ZR-.22],[x0+gw/2,.005,ZR-.22],[x0+gw/2,.005,ZR+.22],[x0-gw/2,.005,ZR+.22]],{ec:P.mute,dash:[4,3],a:.7})}
    const fill=(i,c,a)=>R.box([gx(i),0,ZR],[gw,.12,.44],{fill:mix(P.paper,c,.45),a});
    const seq=(i,n)=>e*n>i;                                  // the i-th of n guesses appears once the step has run that far
    // 1. n-gram: copy what followed the same tokens earlier in the prompt; no model
    if(k===0){R.flowArc([XP(3),.12,ZR],[XG(1.5),.12,ZR],.9,{c:P.c3,r:.07,n:12,speed:1.6});for(let i=0;i<4;i++)if(seq(i,4))fill(i,P.c3,1);
      lab(R,[XG(1.5),.12,ZR],'n-gram · '+meas.ng.code.toFixed(2)+' tokens per pass on code, '+meas.ng.story.toFixed(2)+' on a story',{dy:30,b:1,c:P.c3,a:e,wide:1})}
    // 2. a separate small model: reads only the tokens, one full pass per guess
    const SM=[-3.4,0,-.2];const sa=k===1?1:.18;
    [0,1].forEach(j=>R.glass([SM[0]-.55,.3+j*.38,SM[2]-.35],[1.1,0,0],[0,0,.7],{c:or,a:sa,nu:5,nv:3,th:.03}));
    if(k===1)lab(R,[SM[0],.7,SM[2]],'0.6B draft',{dy:-14,mono:true,b:1,c:or});
    if(k===1){R.flowArc([XP(5),.12,ZR],[SM[0],.35,SM[2]],.6,{c:P.mute,r:.06,n:8,speed:1.4});
      for(let i=0;i<4;i++){if(e*4>i&&e*4<i+1.5)R.flowArc([SM[0]+.4,.7,SM[2]],[XG(i),.12,ZR],1.1,{c:or,r:.07,n:7,speed:1.6});if(seq(i,4))fill(i,or,1)}
      lab(R,[XG(1.5),.12,ZR],'separate model · '+meas.sm.code.toFixed(2)+' on code, '+meas.sm.story.toFixed(2)+' on a story (k = 3)',{dy:30,b:1,c:or,a:e,wide:1})}
    // 3. Medusa: k extra heads on the last hidden state, all at once, each blind to the others' guesses
    const ma=k===2?1:.15;
    for(let i=0;i<4;i++){const hx=-.9+i*.6;R.box([hx,YL[4]+.08,0],[.4,.3,.4],{fill:mix(P.paper,P.c4,.4),a:ma});
      if(k===2){R.flow([[hx,YL[4]+.4,0],[hx,YL[4]+.75,0],[XG(i),.6,ZR-.2],[XG(i),.14,ZR]],{c:P.c4,r:.065,n:8,speed:1.5,a:e});fill(i,P.c4,e)}}
    if(k===2)lab(R,[0,YL[4]+.4,0],'Medusa heads: token t+1 … t+4 in parallel · not run here',{dy:-30,b:1,c:P.c4,a:e,wide:1});
    // 4. EAGLE-3: a one-layer head fed the target's low, middle and top features; drafts token by token
    const EA=[3.4,1.0,-.6],ea=k===3?1:.15;
    R.glass([EA[0]-.5,EA[1],EA[2]-.4],[1.0,0,0],[0,0,.8],{c:P.c6,a:ea,nu:5,nv:3,th:.05});R.box([EA[0],EA[1]-.02,EA[2]],[.6,.04,.4],{fill:P.c6,a:ea,shadow:false});
    if(k===3)lab(R,[EA[0],EA[1],EA[2]],'EAGLE-3 head (1 layer)',{dy:-18,mono:true,b:1,c:P.c6});
    if(k===3){[0,2,4].forEach(j=>R.flowArc([1.2,YL[j],0],[EA[0]-.4,EA[1]+.02,EA[2]],.25,{c:blue,r:.06,n:6,speed:1.2}));
      for(let i=0;i<4;i++){if(e*4>i&&e*4<i+1.5)R.flowArc([EA[0],EA[1],EA[2]+.3],[XG(i),.12,ZR],.5,{c:P.c6,r:.07,n:6,speed:1.6});if(seq(i,4))fill(i,P.c6,1)}
      lab(R,[XG(1.5),.12,ZR],'EAGLE-3 · '+meas.ea.code.toFixed(2)+' on code, '+meas.ea.story.toFixed(2)+' on a story (k = 3)',{dy:30,b:1,c:P.c6,a:e,wide:1})}
    // 5. MTP: a module trained with the model, on top of its stack; chained to draft more than one token
    const ta=k===4?1:.15;R.glass([-1.25,YL[4]+.42,-.7],[2.5,0,0],[0,0,1.4],{c:P.c5,a:ta,nu:8,nv:4,th:.05});
    if(k===4)lab(R,[1.25,YL[4]+.42,-.7],'MTP module',{al:'left',dx:8,mono:true,b:1,c:P.c5});
    if(k===4){R.flow([[0,YL[4]+.02,0],[0,YL[4]+.42,0]],{c:blue,r:.06,n:4,speed:1});
      for(let i=0;i<2;i++){if(seq(i,2))fill(i,P.c5,1);if(e*2>i&&e*2<i+1.4)R.flowArc([.6,YL[4]+.5,0],[XG(i),.12,ZR],.6,{c:P.c5,r:.07,n:7,speed:1.5})}
      lab(R,[XG(1),.12,ZR],'MTP · ships in the checkpoint · not run here',{dy:30,b:1,c:P.c5,a:e,wide:1})}
    // 6. block diffusion: a few-layer drafter fills a whole block of 16 positions in one pass
    const BD=[3.5,0,-2.1],ba=k===5?1:.15;
    [0,1,2].forEach(j=>R.glass([BD[0]-.55,.3+j*.3,BD[2]-.35],[1.1,0,0],[0,0,.7],{c:P.c1,a:ba,nu:5,nv:3,th:.03}));
    if(k===5)lab(R,[BD[0],.9,BD[2]],'DFlash (5 layers)',{dy:-14,mono:true,b:1,c:P.c1});
    if(k===5){[2,4].forEach(j=>R.flowArc([1.2,YL[j],-.3],[BD[0]-.4,.6,BD[2]],.3,{c:blue,r:.06,n:6,speed:1.2}));
      R.flow([[BD[0],.4,BD[2]+.35],[2.2,.3,1.2],[2.2,.12,ZR]],{c:P.c1,r:.07,n:14,speed:1.6});for(let i=0;i<16;i++)fill(i,P.c1,Math.min(1,e*1.5));
      lab(R,[XB(7.5),.12,ZR],'block of 16 in one pass · '+meas.df.code.toFixed(2)+' on code, '+meas.df.story.toFixed(2)+' on a story',{dy:30,b:1,c:P.c1,a:e,wide:1})}
  }
  const full={cam:[.3,.5],bounds:[[-5,0,-2.4],[4.4,2.4,2.3]]};
  S3.stage({id:'stg-dr',list:'sx-dr',fig:'Fig. 4 · where each drafter gets its guesses',cam:full.cam,bounds:full.bounds,aspect:.55,dur:1600,hold:5000,draw,
    margin:w=>w<520?[16,10,30,10]:[18,16,34,16],
    view:k=>k===0?{cam:[.2,.55],bounds:[[-5,0,.8],[4.4,1,2.6]]}:k===2||k===4?{cam:[.3,.4],bounds:[[-2.4,0,-1.2],[4.4,2.8,2.4]]}:full});
})();
