// ---- Scene (Idea, Figure 2 redrawn): the routing harness and one round of the post-training loop, against curate-once (renderer v2: glass, flows, bars on plinths, camera per step) ----
// The stations sit on a U on the floor: front row (near the reader) the harness side (traffic, router, tiers C0 to C3, the per-turn record,
// the curation gates), back row the training side (the three curriculum stages, on-policy distillation, evaluation), and the dashed return
// from evaluation to the router closes the loop. What drives it:
//   real: the evaluation bars are NeoHorse-1 minus its own base on Tables 1 and 2 (RCD.d4, RCD.d9 from recompute.json);
//   illustrative, the page's own engines at their defaults: the 120-turn pool of the Schedule tab (cuPool('bal', .55, .2): tier streams and
//   the three stage trays), and the coarsened OPD toy (STU against the 'tail' teacher, K = 4) of 13_js_read2.js.
// window.NHLOOP exposes the numbers the step lists state, so src/check_stages.mjs can compare them.
(function(){
  if(!document.getElementById('stg-loop')||typeof cuPool!=='function'||typeof S3==='undefined')return;const {at,mix,rgb}=S3;
  const POOL=cuPool('bal',.55,.2),D4=RCD.d4,D9=RCD.d9,BEN=TB.bench.map(b=>b.n);
  const OP=(()=>{const p=softmax(STU),q=softmax(OPDPRESET.tail),K=4,c=coarsen(p,q,K);return {K,P:c.P,Q:c.Q,idx:c.idx,full:klDiv(p,q),coarse:klDiv(c.P,c.Q)}})();
  const TIERN=[0,1,2,3].map(t=>POOL.ex.filter(e=>e.hard===t).length);
  const low3=m=>POOL.ex.filter((e,i)=>POOL.stage[m][i]===2&&e.hard<=1).length;
  window.NHLOOP={tiers:TIERN,means:POOL.means,reserved:POOL.reserved.soft.filter(Boolean).length,low3:{soft:low3('soft'),shuf:low3('shuf')},
    d4:D4,d9:D9,gain4:RCD.gain4,gain9:RCD.gain9,opd:{K:OP.K,full:OP.full,coarse:OP.coarse,tailP:OP.P[OP.K],tailQ:OP.Q[OP.K]}};
  let MODE='loop';
  // ---- where things stand (world units; +z is toward the reader) ----
  const FZ=1.8,UQ=[-10.2,.45,FZ],RX=-8.6,TX=-6.6,TZ=[2.85,2.15,1.45,.75],TH=[.32,.55,.78,1.02],TN=['C0 bounded','C1 default','C2 multi-step','C3 maximum'];
  const REC=[-4.75,-4.2,-3.65],RN=['predicted','decided','served'],G1=-2.55,G2=-1.55,BX=-.25,BZ=[2.6,1.8,1.0],BN=['complete','partial','quarantined'],VX=1.15;
  const MXP=[3.1,0,.1],PUB=[4.6,0,.1],SZ=-2.0,SX=[2.5,0,-2.5],CELL=.27;
  const STP=[-6.45,0,-2.15],TEP=[-4.95,0,-3.45],OBX=i=>-5.75+i*.4,ZP=-1.75,ZQ=-2.55;
  const EX=i=>-10.15+i*.32,EZ=[-1.55,-2.45],EY=.32;
  // the training stages: each example's slot in its stage, sorted by soft score so a tray reads low to high
  function trays(m){const slots={};[0,1,2].forEach(j=>{POOL.ex.map((e,i)=>i).filter(i=>POOL.stage[m][i]===j).sort((a,b)=>POOL.ex[a].soft-POOL.ex[b].soft).forEach((i,s)=>{slots[i]=[j,s]})});return slots}
  const TR={soft:trays('soft'),shuf:trays('shuf')};
  const tcols=()=>{const cs=getComputedStyle(document.body);return [0,1,2,3].map(k=>rgb(cs.getPropertyValue('--t'+k).trim()||'#888'))};
  // composition: the station a step is about at full strength, the ones already passed receding, the ones still to come faint
  const fade=(k,s)=>k===s?1:k>s?.3:.13;
  function plinth(R,c,w,d,a){R.box([c[0],c[1]-.04,c[2]],[w,.04,d],{a,shadow:false});if(c[1]>.1)[-1,1].forEach(sx=>R.box([c[0]+sx*(w/2-.04),0,c[2]],[.03,c[1]-.04,.03],{a:a*.9}))}
  // ---- the harness side ----
  // labels: only on the station a step is about (faint stations stay unlabelled, so no label floats over an empty spot); the overview step names a few itself
  let NOLAB=false;const lb=(R,a,p,t,o)=>{if(a<.6||NOLAB)return;R.label(p,t,o)};
  function harness(R,a,k,e,TC,tierFlows){const P=R.P;
    lb(R,a,[UQ[0],0,UQ[2]],'user turns',{mono:true,fs:12,dy:14,c:P.mute,a:Math.max(a,.4)});
    R.box([UQ[0],0,UQ[2]],[.5,.32,.5],{fill:mix(P.paper,P.c2,.25),a});
    R.glass([RX,.05,FZ-.75],[0,0,1.5],[0,1.05,0],{c:P.acc,a,nu:4,nv:5});
    lb(R,a,[RX,1.1,FZ],'router',{mono:true,fs:12.5,b:1,dy:-10,c:P.acc,a:Math.max(a,.35)});
    TZ.forEach((z,t)=>{R.box([TX,0,z],[.62,TH[t],.5],{fill:TC[t],a});lb(R,a,[TX+.35,TH[t]*.6,z],TN[t],{al:'left',dx:8,mono:true,fs:12,c:P.ink,a:Math.max(a,.3),grp:'tier'})});
    if(tierFlows){R.flow([ [UQ[0]+.25,.45,FZ],[RX,.55,FZ]],{c:P.c2,a:tierFlows,r:.07,n:6,speed:1.2});
      TZ.forEach((z,t)=>R.flowArc([RX,.55,FZ],[TX-.32,TH[t]*.6,z],.25,{c:TC[t],a:tierFlows,r:.065,n:2+Math.round(TIERN[t]/4),speed:1.1}))}}
  function records(R,a,k,e,TC,flowA){const P=R.P,cs=[mix(P.paper,P.acc,.35),mix(P.paper,P.acc,.6),mix(P.paper,P.acc,.85)];
    R.box([REC[1],0,FZ],[1.75,.06,.75],{fill:mix(P.paper,P.ink,.06),a});
    RN.forEach((n,i)=>{R.box([REC[i],.06,FZ],[.38,.55,.38],{fill:cs[i],a});lb(R,a,[REC[i],.62,FZ],n,{mono:true,fs:12,dy:-10-(i%2)*15,c:P.ink,a:Math.max(a,.3),wide:1})});
    lb(R,a,[REC[1],0,FZ+.4],'trajectory + outcome',{mono:true,fs:12,dy:14,c:P.mute,a:Math.max(a,.3),wide:1});
    if(flowA)TZ.forEach((z,t)=>R.flowArc([TX+.3,TH[t]*.8,z],[REC[0]-.2,.45,FZ],.35,{c:TC[t],a:flowA,r:.06,n:4,speed:1.2}))}
  function curation(R,a,k,e,flowA){const P=R.P,ga=a;
    R.glass([G1,.05,FZ-.7],[0,0,1.4],[0,.9,0],{c:P.c6,a:ga,nu:3,nv:4});R.glass([G2,.05,FZ-.7],[0,0,1.4],[0,.9,0],{c:P.c6,a:ga,nu:3,nv:4});
    lb(R,a,[G1,.95,FZ],'dedupe, decontaminate',{mono:true,fs:12,dy:-10,c:P.c6,a:Math.max(a,.3),wide:1});
    lb(R,a,[G2,.95,FZ-.6],'structural gate',{mono:true,fs:12,dy:-24,c:P.c6,a:Math.max(a,.3),wide:1});
    const bc=[P.good,P.c5,P.bad];
    BZ.forEach((z,i)=>{R.box([BX,0,z],[.6,i===2?.14:.3,.5],{fill:mix(P.paper,bc[i],.55),a:a*(i===2?.6:1)});lb(R,a,[BX+.35,.2,z],BN[i],{al:'left',dx:6,mono:true,fs:12,c:bc[i],a:Math.max(a,.3),grp:'bin'})});
    // six semantic verdicts: one tile per dimension, for the complete and partial pieces
    for(let r=0;r<2;r++)for(let c=0;c<3;c++)R.box([VX-.3+c*.3,0,FZ+.15-r*.3],[.22,.22,.22],{fill:mix(P.paper,P.c4,.35+.1*(r*3+c)),a,shadow:false});
    lb(R,a,[VX,.25,FZ+.3],'6 verdicts',{mono:true,fs:12,dy:-12,c:P.c4,a:Math.max(a,.3),wide:1});
    if(flowA){R.flow([ [REC[2]+.25,.4,FZ],[G1,.45,FZ],[G2,.45,FZ],[BX-.35,.3,FZ]],{c:P.acc,a:flowA,r:.065,speed:1.2});
      R.flowArc([G2,.4,FZ],[BX-.3,.25,BZ[0]],.2,{c:P.good,a:flowA,r:.06,n:4});R.flowArc([G2,.4,FZ],[BX-.3,.1,BZ[2]],.2,{c:P.bad,a:flowA*.6,r:.05,n:3});
      R.flowArc([BX+.3,.3,BZ[0]],[VX-.45,.2,FZ+.1],.25,{c:P.good,a:flowA,r:.06,n:4});R.flowArc([BX+.3,.3,BZ[1]],[VX-.45,.2,FZ-.1],.25,{c:P.c5,a:flowA,r:.05,n:3})}}
  // ---- the training side ----
  function mixture(R,a,label){const P=R.P;R.box(MXP,[.9,.55,.7],{fill:mix(P.paper,P.c1,.3),a});R.box(PUB,[.6,.35,.5],{fill:mix(P.paper,P.ink,.12),a});
    lb(R,a,[MXP[0],0,MXP[2]+.35],label,{mono:true,fs:12.5,b:1,dy:14,c:P.c1,a:Math.max(a,.35)});lb(R,a,[PUB[0]+.3,.2,PUB[2]],'public data',{mono:true,fs:12,al:'left',dx:8,c:P.mute,a:Math.max(a,.3),wide:1})}
  function stages(R,a,m,grow,TC,flowA,showMeans){const P=R.P,sl=TR[m];
    [0,1,2].forEach(j=>{R.box([SX[j],0,SZ],[8*CELL+.16,.03,5*CELL+.16],{fill:mix(P.paper,P.ink,.05),a,shadow:false});
      lb(R,a,[SX[j],0,SZ+5*CELL/2+.1],'stage '+(j+1),{mono:true,fs:12.5,b:1,dy:15,c:P.ink,a:Math.max(a,.35)})});
    POOL.ex.forEach((x,i)=>{const [j,s]=sl[i],g=Math.max(0,Math.min(1,grow*3-j));if(g<=0)return;const c=s%8,r=Math.floor(s/8),rs=m!=='shuf'&&POOL.reserved[m][i];
      R.box([SX[j]+(c-3.5)*CELL,0,SZ+(r-2)*CELL],[.19,(.06+.42*x.soft)*g,.19],{fill:TC[Math.max(0,Math.min(3,Math.round(x.soft)))],a,shadow:false,lw:rs?2:.6,ec:rs?P.bad:null,ea:rs?1:null})});
    if(showMeans)[0,1,2].forEach(j=>{const g=Math.max(0,Math.min(1,grow*3-j));if(g>.5)lb(R,a,[SX[j],1.45,SZ],'mean '+POOL.means[m][j].toFixed(2),{mono:true,fs:12.5,b:1,c:P.ink,a:a*Math.min(1,(g-.5)*2)})});
    if(flowA){const j=Math.min(2,Math.floor(grow*3));R.flowArc([MXP[0]-.3,.5,MXP[2]-.3],[SX[j],.3,SZ+.5],.9,{c:P.c1,a:flowA,r:.07,n:10,speed:1.4})}}
  function opd(R,a,k,e,flowA,ckpt){const P=R.P,n=OP.K+1;
    if(ckpt){R.box(STP,[.7,.5,1.1],{fill:mix(P.paper,P.acc,.4)});R.label([STP[0],.5,STP[2]],'checkpoint',{mono:true,fs:12.5,b:1,dy:-12,c:P.acc})}
    R.box(STP,[.7,.5,1.1],{fill:mix(P.paper,P.acc,.4),a});R.box(TEP,[1.5,.6,.5],{fill:mix(P.paper,P.c4,.4),a});
    lb(R,a,[STP[0],.5,STP[2]],'student · NeoHorse-1',{mono:true,fs:12.5,b:1,dy:-12,c:P.acc,a:Math.max(a,.35)});
    lb(R,a,[TEP[0],.6,TEP[2]],'fixed teacher',{mono:true,fs:12.5,b:1,dy:-12,c:P.c4,a:Math.max(a,.35)});
    if(a<.5)return;
    for(let i=0;i<n;i++){const hp=1.3*OP.P[i]*e,hq=1.3*OP.Q[i]*e;
      plinth(R,[OBX(i),.08,ZP],.34,.26,a);plinth(R,[OBX(i),.08,ZQ],.34,.26,a);
      R.box([OBX(i),.08,ZP],[.2,Math.max(.01,hp),.14],{fill:P.acc,a,shadow:false});R.box([OBX(i),.08,ZQ],[.2,Math.max(.01,hq),.14],{fill:P.c4,a,shadow:false});
      lb(R,a,[OBX(i),0,ZP+.2],i<OP.K?'t'+(OP.idx[i]+1):'rest',{mono:true,fs:12,dy:10,c:P.mute,a:a*e})}
    lb(R,a,[OBX(OP.K),.08+1.3*OP.Q[OP.K],ZQ],'teacher '+OP.Q[OP.K].toFixed(3),{mono:true,fs:12.5,b:1,dy:-12,c:P.c4,a:e});
    lb(R,a,[OBX(OP.K)+.3,.08+1.3*OP.P[OP.K],ZP],'student '+OP.P[OP.K].toFixed(3),{mono:true,fs:12.5,b:1,al:'left',dx:6,c:P.acc,a:e});
    lb(R,a,[OBX(2),1.25,ZQ-.3],'KL over 5 bins '+OP.coarse.toFixed(3)+' · full '+OP.full.toFixed(3),{mono:true,fs:12.5,b:1,c:P.ink,a:e});
    if(flowA){R.flow([ [STP[0]+.35,.3,ZP],[OBX(OP.K)+.2,.3,ZP]],{c:P.acc,a:flowA,r:.06,n:6,speed:.9});
      [0,2,4].forEach(i=>R.flow([ [OBX(i),.45,TEP[2]+.25],[OBX(i),.45,ZQ-.15]],{c:P.c4,a:flowA,r:.06,n:3,speed:.7}))}}
  function evalRows(R,a,e,showBars){const P=R.P;
    [0,1].forEach(r=>{const z=EZ[r],D=r?D9:D4,mx=11;
      R.box([(EX(0)+EX(9))/2,EY-.04,z],[3.4,.04,.4],{a,shadow:false});[-1,1].forEach(sx=>R.box([(EX(0)+EX(9))/2+sx*1.65,0,z],[.03,EY-.04,.03],{a:a*.9}));
      lb(R,a,[EX(0)-.25,EY,z],r?'9B':'4B',{mono:true,fs:12.5,b:1,al:'right',dx:-6,c:P.ink,a:Math.max(a,.3)});
      if(!showBars)return;
      D.forEach((v,i)=>{const h=Math.max(.012,Math.abs(v)/mx*1.1*e),c=v>0?mix(P.paper,P.good,.75):v<0?P.bad:P.mute;R.box([EX(i),v>=0?EY:EY-.04-h,z],[.2,h,.2],{fill:c,a,shadow:false})})});
    if(!showBars)return;
    const iv=D4.indexOf(Math.max(...D4));lb(R,a,[EX(iv),EY+D4[iv]/11*1.1*e,EZ[0]],BEN[iv]+' +'+D4[iv].toFixed(2),{mono:true,fs:12.5,b:1,dy:-12,c:P.good,a:a*e});
    const ineg=D9.indexOf(Math.min(...D9));lb(R,a,[EX(ineg),EY-.1,EZ[1]],BEN[ineg]+' −'+Math.abs(D9[ineg]).toFixed(2),{mono:true,fs:12,dy:16,al:'right',c:P.bad,a:a*e,wide:1});
    lb(R,a,[EX(9)+.25,EY+.15,EZ[0]],'macro +'+RCD.gain4.toFixed(2),{mono:true,fs:12.5,b:1,al:'left',dx:6,c:P.ink,a:a*e,grp:'mac'});
    lb(R,a,[EX(9)+.25,EY+.15,EZ[1]],'macro +'+RCD.gain9.toFixed(2),{mono:true,fs:12.5,b:1,al:'left',dx:6,c:P.ink,a:a*e,grp:'mac'})}
  function draw(R,k,e){const P=R.P,TC=tcols();R.grid(-11,6,-4.2,3.8,.5);NOLAB=MODE==='loop'&&k===6;
    if(MODE==='loop'){
      harness(R,k===0?1:k===6?.5:fade(k,0),k,e,TC,k===0?Math.min(1,e*2):k===6?.35:0);
      records(R,k===1?1:k===6?.5:fade(k,1),k,e,TC,k===1?Math.min(1,e*2):0);
      curation(R,k===2?1:k===6?.5:fade(k,2),k,e,k===2?Math.min(1,e*2):0);
      mixture(R,k===3?1:k===6?.85:fade(k,3),k>=6?'next mixture':'training mixture');
      if(k===3){R.flowArc([VX+.4,.3,FZ],[MXP[0]-.3,.45,MXP[2]+.3],.6,{c:P.good,a:Math.min(1,e*2),r:.06,n:6});R.flow([ [PUB[0]-.3,.25,PUB[2]],[MXP[0]+.45,.3,MXP[2]]],{c:P.mute,a:Math.min(1,e*2),r:.06,n:3})}
      stages(R,k===3?1:k===6?.5:fade(k,3),'soft',k<3?0:k===3?e:1,TC,k===3?1:0,k===3);
      opd(R,k===4?1:k===6?.5:fade(k,4),k,k===4?e:1,k===4?Math.min(1,e*2):0);
      if(k===4)R.flowArc([SX[2]-1.2,.35,SZ+.3],[STP[0]+.3,.45,STP[2]+.4],.5,{c:P.c1,a:Math.min(1,e*2),r:.06,n:5});
      evalRows(R,k===5?1:k===6?.9:fade(k,5),k===5?e:1,k>=5);
      if(k===5)R.flowArc([STP[0]-.35,.4,STP[2]],[EX(9)+.1,.6,EZ[0]],.4,{c:P.acc,a:Math.min(1,e*2),r:.065,n:7});
      if(k===6){// allocation back to the mixture, and the dashed return to the router: designed, run once
        R.flowArc([EX(5),.9,EZ[0]+.2],[MXP[0]-.4,.6,MXP[2]-.2],1.6,{c:P.c5,a:Math.min(1,e*2),r:.07,n:16,speed:1.5});
        R.label([.2,.1,-.35],'allocate: next mix from the gaps',{mono:true,fs:12.5,b:1,c:P.c5,a:e,wide:1});
        R.arc([EX(2),.7,EZ[0]+.25],[RX,.7,FZ-.8],.9,{c:P.acc,w:2.2,dash:[7,6],t:e,head:7});
        R.flowArc([EX(2),.7,EZ[0]+.25],[RX,.7,FZ-.8],.9,{c:P.acc,a:.45*e,r:.06,n:5,speed:.8});
        R.label([RX-.5,.95,0],'next round · ran once',{mono:true,fs:12.5,b:1,al:'right',dx:-6,c:P.acc,a:e});
        [[[RX,1.1,FZ],'router'],[[TX,1.1,TZ[0]],'tiers C0 to C3'],[[REC[1],.65,FZ],'record'],[[G2,.95,FZ],'curate'],[ [SX[1],.7,SZ],'3 stages'],[ [STP[0],.8,(ZP+ZQ)/2],'distil'],[[EX(5),1.3,EZ[1]],'evaluate']].forEach(([q,t])=>R.label(q,t,{mono:true,fs:12.5,b:1,c:P.ink,a:Math.max(.5,e)}))}
    }else{// curate once: the same stations; the harness never feeds training
      const hA=k===3?1:.13;
      harness(R,hA,k,e,TC,k===3?Math.min(1,e*2):0);records(R,k===3?.9:.13,k,e,TC,k===3?Math.min(1,e*2):0);curation(R,.1,k,e,0);
      if(k===3){R.label([REC[1],1.2,FZ],'records discarded · 0 reused',{mono:true,fs:12.5,b:1,c:P.bad,a:e});
        R.line([[REC[0]-.3,.05,FZ+.45],[REC[2]+.3,.75,FZ-.45]],{c:P.bad,w:2.4,a:e});R.line([[REC[0]-.3,.75,FZ-.45],[REC[2]+.3,.05,FZ+.45]],{c:P.bad,w:2.4,a:e})}
      mixture(R,k===0?1:.3,'fixed dataset');if(k===0){R.label([MXP[0],.55,MXP[2]],'curated once, frozen',{mono:true,fs:12,dy:-28,c:P.mute,a:e,wide:1});R.flow([ [PUB[0]-.3,.25,PUB[2]],[MXP[0]+.45,.3,MXP[2]]],{c:P.mute,a:Math.min(1,e*2),r:.06,n:3})}
      stages(R,k===1?1:k===0?.13:.3,'shuf',k<1?0:k===1?e:1,TC,k===1?1:0,k===1);
      opd(R,.13,k,1,0,k===2);
      evalRows(R,k===2?1:.13,1,false);
      if(k===2){R.flowArc([STP[0]-.35,.4,STP[2]],[EX(9)+.1,.6,EZ[0]],.4,{c:P.acc,a:Math.min(1,e*2),r:.065,n:7});
        R.label([EX(5),1.1,(EZ[0]+EZ[1])/2],'benchmarks reported, then shipped',{mono:true,fs:12.5,b:1,c:P.ink,a:e});
        R.arc([STP[0]-.4,.55,STP[2]+.3],[RX,.7,FZ-.8],1.2,{c:P.mute,w:1.6,t:e,head:7})}
    }
  }
  const full={cam:[.06,1.2],bounds:[[-10.6,0,-3.8],[5,1.5,3.3]]};
  const VL=[{cam:[.28,.62],bounds:[[-10.6,0,.3],[-5.4,1.3,3.3]]},{cam:[.3,.6],bounds:[[-7.2,0,.5],[-3.1,1.2,3.2]]},{cam:[.2,.62],bounds:[[-5.1,0,.6],[1.9,1.1,3.1]]},
    {cam:[.12,.72],bounds:[[-3.9,0,-2.9],[5,1.5,.8]]},{cam:[.3,.55],bounds:[[-7,0,-3.8],[-3.9,1.5,-1.3]]},{cam:[.22,.58],bounds:[[-10.6,0,-3],[-6,1.4,-.9]]},full];
  const VO=[{cam:[.2,.62],bounds:[[-1,0,-1.4],[5.4,1.2,2.8]]},{cam:[.12,.72],bounds:[[-3.9,0,-2.9],[5,1.5,.8]]},{cam:[.2,.62],bounds:[[-10.2,0,-3.7],[-3.6,1.4,.3]]},{cam:[.25,.62],bounds:[[-10.6,0,.3],[-3,1.4,3.3]]}];
  const st=S3.stage({id:'stg-loop',list:'sx-loop',fig:'Fig. 2 · the loop, one round · pool and tokens illustrative',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,8,14,8]:[18,14,16,14],view:k=>(MODE==='loop'?VL:VO)[k]||full});
  const seg=document.getElementById('loopM');
  if(seg&&st)seg.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{if(MODE===b.dataset.m)return;
    seg.querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    MODE=b.dataset.m;document.getElementById('sx-loop').hidden=MODE!=='loop';document.getElementById('sx-once').hidden=MODE==='loop';st.list(MODE==='loop'?'sx-loop':'sx-once')}));
})();
