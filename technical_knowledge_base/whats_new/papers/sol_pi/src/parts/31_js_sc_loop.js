// ---- Scene: the SoL-Pi search, from 152 directions to four mechanisms, and what the stack does against Pi (renderer v2: glass plates, flowing dots, camera per step) ----
// Every count is the paper's or the blog's as the page quotes them (152 directions by family 24/26/26/15/15/46; 495 + 40 environments; four survivors);
// the bars are Tables 1 and 2 (window.PAPER.tables): the fixed four-mechanism stack as a change against Pi, for tokens, cost and score, both models.
(function(){
  if(!document.getElementById('stg-loop'))return;const {at,off,lerp,mix}=S3;const TB=PAPER.tables;
  const FAM=[['context',24],['progress',26],['tools',26],['delegation',15],['prompt and policy',15],['improvement and evaluation',46]];
  const TAB=['#4e79a7','#f28e2b','#59a14f','#b07aa1','#d4a72c','#76b7b2'];
  const MECH=[['Online Context Compact','Context'],['Action Fusion','Tool call'],['ObservationPack','Observation'],['Evidence-Preserving Reducer','Observation']];
  const ch=(m)=>{const pi=TB[m].find(r=>r.kind==='pi'),ef=TB[m].find(r=>r.kind==='sol');return [['tokens',100*(ef.total/pi.total-1)],['cost',100*(ef.cost/pi.cost-1)],['score',100*(ef.score/pi.score-1)]]};
  const D=window.LOOPDATA={fam:FAM.map(f=>f[1]),dirs:FAM.reduce((s,f)=>s+f[1],0),env:[495,40],kept:4,sol:ch('sol'),opus:ch('opus')};
  // layout: families at the back, the environments in the middle, the two gates in front, the agent loop and the bars at the very front
  const CS=.17,CG=.05,FW=6*(CS+CG),FGAP=.42,fx=i=>(i-2.5)*(FW+FGAP),ZF=-3.4;
  const cube=(i,j)=>[fx(i)-FW/2+(j%6+.5)*(CS+CG),0,ZF+Math.floor(j/6)*(CS+CG)];
  const EC=.15,EX0=-3.3,EZ0=-1.2,ZG1=1.25,ZG2=2.05,ZL=3.55,LR=1.25;
  const ST=[[0,ZL-LR],[LR*1.25,ZL],[0,ZL+LR],[-LR*1.25,ZL]],SN=['Model','Tool call','Observation','Context'];
  const keepAt=i=>[[-1.2,.35,ZG2+.6],[-.4,.35,ZG2+.6],[.4,.35,ZG2+.6],[1.2,.35,ZG2+.6]][i];
  const slot=i=>{const s=[ST[3],ST[1],ST[2],ST[2]][i],dx=i===2?-.38:i===3?.38:0;return [s[0]+dx+(i===0?-.62:i===1?.62:0),.5,s[1]+(i>=2?.62:0)]};
  // signed bars on a white plinth (positive up, negative hanging below): change against Pi in percent
  function plinth(R,c,vals,col,a,lab){if(a<=.01)return;const P=R.P,W=2.4,bw=W/3,Y=c[1],h=v=>Math.abs(v)/55*1.15;
    R.box([c[0],Y-.05,c[2]],[W+.2,.05,.5],{a,shadow:false});[-1,1].forEach(sx=>R.box([c[0]+sx*(W/2),0,c[2]],[.03,Y-.05,.03],{a:a*.9}));
    vals.forEach(([n,v],i)=>{const x=c[0]-W/2+bw*(i+.5),hh=Math.max(.02,h(v));R.box([x,v>=0?Y:Y-.05-hh,c[2]],[bw*.62,hh,.3],{fill:i===2?P.c4:col,a,shadow:false});
      R.label([x,v>=0?Y+hh:Y-.05-hh,c[2]],(v>0?'+':'')+v.toFixed(1)+'%',{mono:true,fs:12.5,dy:v>=0?-11:11,b:1,a});R.label([x,Y,c[2]+.3],n,{fs:12,dy:-12,a,c:P.mute})});
    R.label([c[0],Y+1.25,c[2]],lab,{fs:13,b:1,a})}
  function draw(R,k,e){const P=R.P;R.grid(-6.5,6.5,-4.2,4.6,.5);
    // 1. the proposal pool: one cube per direction, by family
    const fa=k===0?1:k===1?.55:k===2?.3:k===3?.3-.18*e:k===4?.12-.08*e:.04;
    FAM.forEach(([nm,n],i)=>{for(let j=0;j<n;j++){const p=cube(i,j);R.box(p,[CS,CS,CS],{fill:TAB[i],a:fa*(k===0?Math.min(1,e*1.5+.0):1),shadow:false,lw:.6})}
      if(k<=2)R.label([fx(i),.2,ZF-.15],nm+' '+n,{fs:12,dy:i%2?-30:-10,a:k<=1?1:.35,wide:1})});
    // 2. lineages run on 535 environments (495 repository tasks, 40 synthetic), dots streaming from the pool into them
    const ea=k===0?0:k===1?e:k===2?.45:k===3?.25*(1-e):0;
    R.glass([EX0,0.02,EZ0],[33*EC,0,0],[0,0,15*EC],{c:P.c1,a:ea,nu:33,nv:15,th:.02});
    R.glass([EX0+33*EC+.25,0.02,EZ0],[8*EC,0,0],[0,0,5*EC],{c:P.c2,a:ea,nu:8,nv:5,th:.02});
    if(ea>.05&&k<=1){R.label([EX0+33*EC/2,0,EZ0+15*EC],'495 repository tasks',{fs:12.5,dy:14,a:ea,c:P.c1,b:1});R.label([EX0+33*EC+.25+4*EC,0,EZ0+5*EC],'40 synthetic',{fs:12.5,dy:14,a:ea,c:P.c2,b:1})}
    if(k===1||k===2){const a=k===1?e:.5;FAM.forEach((_,i)=>R.flowArc([fx(i),.3,ZF+.9],[EX0+((i+.5)/6)*(33*EC+1.45),.1,EZ0+1.1],.9,{c:TAB[i],a,r:.06,n:5,speed:1.4}))}
    // 3. two gates in order: capability within tolerance, then cheaper; four candidates come out
    const ga=k<2?0:k===2?e:k===3?.6*(1-e):0;
    if(ga>0){R.glass([-2.2,0,ZG1],[4.4,0,0],[0,.95,0],{c:P.c3,a:ga,nu:8,nv:3});R.glass([-2.2,0,ZG2],[4.4,0,0],[0,.95,0],{c:P.c5,a:ga,nu:8,nv:3});
      if(k===2){R.label([-2.2,.95,ZG1],'gate 1 · capability within tolerance',{al:'right',dx:-6,fs:12.5,c:P.c3,a:ga,b:1,wide:1});R.label([-2.2,.95,ZG2],'gate 2 · an efficiency metric improves',{al:'right',dx:-6,fs:12.5,c:P.c5,a:ga,b:1,wide:1})}}
    if(k===2){[-1.9,-1.1,-.4,.4,1.1,1.9].forEach((x,i)=>R.flow([[x,.35,EZ0+2.3],[x,.35,ZG1]],{c:P.c1,a:e*.8,r:.055,n:4}));[-1.2,-.4,.4,1.2].forEach(x=>R.flow([[x,.35,ZG1],[x,.35,ZG2]],{c:P.c3,a:e*.8,r:.055,n:3}))}
    // the four survivors: balls behind gate 2 at step 3, gliding to where they act in the loop at step 4
    const sa=k<2?0:k===2?e:k===3?1:k===4?1-e:0;
    MECH.forEach((m,i)=>{const p0=keepAt(i),p1=slot(i),t=k<3?0:k===3?e:1,p=[lerp(p0[0],p1[0],t),lerp(p0[1],p1[1],t),lerp(p0[2],p1[2],t)];
      R.glow(p,.32,{c:P.acc,a:sa*.5});R.ball(p,.13,{c:P.acc,a:sa});if(k===3)R.label(p,m[0],{fs:12.5,dy:i===3?20:-16,b:1,c:P.acc,a:e})});
    if(k===2)R.label([0,.35,ZG2+.6],'4 of 152 · 1 in 38',{fs:13,b:1,dy:-26,a:e,c:P.acc});
    // 4. the agent loop: four stations, the conversation flowing round; each survivor sits where it acts
    const la=k<3?0:k===3?e:k===4?1-e:0;
    if(la>.01){ST.forEach((s,i)=>{R.box([s[0],0,s[1]],[.95,.42,.55],{a:la});R.label([s[0],.42,s[1]],SN[i],{fs:12.5,b:1,dy:-11,a:la})});
      for(let i=0;i<4;i++){const a0=ST[i],b0=ST[(i+1)%4];R.flowArc([a0[0],.25,a0[1]],[b0[0],.25,b0[1]],.25,{c:P.c1,a:la*.85,r:.06,n:5,speed:1.2})}}
    // 5 and 6. the full stack against Pi on EdgeBench: GPT-5.6 Sol (searched on), then Opus 5 (never searched on)
    plinth(R,[-1.6,1.15,ZL],D.sol,P.acc,k<4?0:k===4?e:1,'GPT-5.6 Sol');
    plinth(R,[1.6,1.15,ZL],D.opus,P.c6,k<5?0:k===5?e:1,'Opus 5');
  }
  const full={cam:[.18,.72],bounds:[[-5.6,0,-3.9],[5.6,1.3,4.3]]};
  S3.stage({id:'stg-loop',list:'sx-loop',fig:'Fig. 1 · the search, and what it kept',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,14],
    view:k=>k===0?{cam:[.12,.78],bounds:[[-5.4,0,-3.9],[5.4,.6,-1.6]]}:k===1?{cam:[.16,.74],bounds:[[-5.4,0,-3.9],[5.4,.6,1.2]]}:k===2?{cam:[.75,.42],bounds:[[-3.4,0,-1.3],[3.4,1.1,2.8]]}:k===3?{cam:[.2,.72],bounds:[[-2.4,0,1.9],[2.4,.8,5.2]]}:{cam:[.12,.3],bounds:[[-3.1,0,ZL-.5],[3.1,2.6,ZL+.5]]}});
})();
