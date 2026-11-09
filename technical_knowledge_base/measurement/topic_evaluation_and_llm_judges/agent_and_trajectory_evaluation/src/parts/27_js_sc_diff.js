// ---- Scene: Fig. 2 (stg-diff, renderer v2): outcome grading by state diff, on the same trial as Fig. 1 (GPT-5.2, airline task 29, trial 1).
// The starting database is copied twice; the task's gold actions are replayed on one copy and the agent's calls on the other (as dbdiff.py does with
// tau2-bench's own environment at commit 5bfa7e3); the two are compared, then the six differing fields are lifted out with their gold and agent
// values (window.ATJ.cases[..].diff). Last step: the do-nothing agent (regrade.py), which leaves the starting state and passes every task whose gold is
// "no change" (window.ATJ.meta.null.airline). The plates' cells are schematic; the actions, field names, values and counts are the recorded ones,
// published in window.ATJN.diff for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-diff')||!window.S3||!window.ATJ)return;
  const {mix,cl,lerp3}=S3,D=window.ATJ,C=D.cases['gpt52/29/1'],NUL=D.meta.null.airline;if(!C)return;
  const writes=C.steps.filter(s=>s.k==='call'&&s.w),fmt=v=>v==null?'none':String(v);
  const nm=k=>k.replace(/^reservations\.\w+\./,'').replace(/^users\.\w+\.payment_methods\.(\w+)\.amount$/,'$1 balance').replace(/payment_history\[(\d)\]\.payment_id$/,(m,i)=>'payment '+(+i+1)+' method').replace(/payment_history\[(\d)\]\.amount$/,(m,i)=>'payment '+(+i+1)+' amount');
  const DF=C.diff.map(d=>({k:d[0],name:nm(d[0]),g:d[2],a:d[3],txt:nm(d[0])+': '+fmt(d[2])+' → '+fmt(d[3])}));
  const tasks=Array.from({length:NUL.n},(_,i)=>String(i)),pass=new Set(NUL.tasks);
  (window.ATJN=window.ATJN||{}).diff={gold:C.gold.map(g=>g.n),writes:writes.map(s=>s.n),calls:C.steps.filter(s=>s.k==='call').length,nd:DF.length,fields:DF.map(d=>d.txt),nullPass:NUL.pass,nullN:NUL.n,start:(C.gold[0].a||{}).reservation_id};
  // plates: 8 by 4 schematic cells; row 0 the old reservation, row 1 the new one, row 3 the user's payment methods
  const NX=8,NZ=4,CS=.4,PW=NX*CS,PD=NZ*CS,ST=[0,0,-1.7],GD=[-2.25,0,.75],AG=[2.25,0,.75];
  const cell=(o,c,r)=>[o[0]-PW/2+CS*(c+.5),.03,o[2]-PD/2+CS*(r+.5)];
  const GOLD=[[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,0]],AGT=[[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[6,0],[5,3]];
  const DC=[[3,1],[4,1],[5,1],[6,1],[7,1],[5,3]].slice(0,DF.length); // where each differing field sits (schematic)
  const BASE=[[0,0],[1,0],[2,0],[3,0],[4,0],[5,0],[0,3],[1,3],[2,3],[3,3],[4,3],[5,3]]; // rows already in the starting database (schematic)
  const has=(L,c,r)=>L.some(q=>q[0]===c&&q[1]===r);
  function plate(R,o,c,a,lab,la){const P=R.P;R.glass([o[0]-PW/2,.02,o[2]-PD/2],[PW,0,0],[0,0,PD],{c,a,nu:NX,nv:NZ,th:.04});
    BASE.forEach(([cc,r])=>{const p=cell(o,cc,r);R.box(p,[CS*.78,.05,CS*.78],{fill:P.paper,a:a*.9,shadow:false,lw:.5})});
    if(la>0)R.label([o[0],0,o[2]+PD/2],lab,{fs:12.5,b:1,c,dy:15,a:la})}
  function cells(R,o,L,col,a,lift){L.forEach(([c,r])=>{const p=cell(o,c,r),u=lift?lift(c,r):0;R.box([p[0],p[1]+u,p[2]],[CS*.78,.07,CS*.78],{fill:col(c,r),a,shadow:false})})}
  function draw(R,k,e){const P=R.P,cG=P.c5,cA=P.c2,cE=P.c6;R.grid(-4.6,4.6,-3,2.4,.5);
    const fade=k===5?1-e:1; // the do-nothing step clears the replayed copies' changes
    // 1. the starting database (back), fading to the task grid in the last step
    plate(R,ST,cE,k===0?1:k===5?.35*(1-e)+.05:k===4?.15:.45,'start · reservation '+(window.ATJN.diff.start||''),k===0?1:k===4||k===5?0:.7);
    // 2. the gold copy and its replayed actions
    const ga=k===0?0:k===1?e:1;
    if(ga>0){const p=lerp3(ST,GD,k===1?e:1);plate(R,p,cG,ga*(k===2?.3:.6),'gold state',ga);
      cells(R,p,GOLD,()=>mix(P.paper,cG,.75),(k===1?Math.max(0,e*1.5-.5):1)*(k===2?.45:1))}
    if(k===1){R.flowArc([ST[0]-.6,.1,ST[2]+.5],[GD[0]+.3,.1,GD[2]-.5],.9,{c:cG,a:.85,r:.06,n:9});
      R.label([GD[0],.1,GD[2]-PD/2],C.gold.length+' gold actions replayed',{fs:12.5,b:1,c:cG,dy:-14,a:e})}
    // 3. the agent's copy
    const aa=k<=1?0:k===2?e:1;
    if(aa>0){const p=lerp3(ST,AG,k===2?e:1),dn=k===5;plate(R,p,cA,aa*.6,dn?'do-nothing agent · no calls':'agent state',aa);
      cells(R,p,AGT,(c,r)=>has(DC,c,r)&&k>=3&&k<5?mix(P.paper,P.bad,.7):mix(P.paper,cA,.75),(k===2?Math.max(0,e*1.5-.5):1)*fade)}
    if(k===2){R.flowArc([ST[0]+.6,.1,ST[2]+.5],[AG[0]-.3,.1,AG[2]-.5],.9,{c:cA,a:.85,r:.06,n:9});
      R.label([AG[0],.1,AG[2]-PD/2],window.ATJN.diff.calls+' calls replayed, '+writes.length+' of them writes',{fs:12.5,b:1,c:cA,dy:-14,a:e})}
    // 4. compare: both copies stream into the comparison, which does not hold
    const HC=[0,0,2.1];
    if(k===3){R.flow([[GD[0]+PW/2,.15,GD[2]+.3],[HC[0]-.3,.25,HC[2]]],{c:cG,a:.85,r:.06,n:6});R.flow([[AG[0]-PW/2,.15,AG[2]+.3],[HC[0]+.3,.25,HC[2]]],{c:cA,a:.85,r:.06,n:6})}
    if(k===3){const a=e;R.box(HC,[.6,.4,.6],{fill:mix(P.paper,P.bad,.35),a});R.label([HC[0],.4,HC[2]],'gold ≠ agent · reward '+C.reward,{fs:13,b:1,c:P.bad,dy:-12,a})}
    // 5. the diff, lifted out: each differing field rises from the agent's copy into a stack between the two copies
    if(k===4){DF.forEach((d,j)=>{const c=DC[j],from=cell(AG,c[0],c[1]),to=[2.1,2.45-j*.3,.75],p=lerp3(from,to,e);
        R.box(p,[.34,.08,.34],{fill:mix(P.paper,P.bad,.75),shadow:false});
        R.label(p,d.txt,{mono:true,fs:12,al:'right',dx:-12,c:P.ink,a:cl(e*2.2-1.2,0,1),grp:'diff'})});
      R.label([2.1,2.5,.75],DF.length+' fields differ (gold → agent)',{fs:13,b:1,c:P.bad,dy:-16,a:e})}
    // 6. the do-nothing agent: its copy is the start state; the task grid shows where that passes
    if(k===5){const NCOL=10,TS=.42;tasks.forEach((t,i)=>{const c=i%NCOL,r=Math.floor(i/NCOL),p=[-1.9+c*TS,0,-2.55+r*TS],ok=pass.has(t);
        R.box(p,[TS*.8,ok?.22:.06,TS*.8],{fill:ok?mix(P.paper,P.good,.7):mix(P.paper,P.line,.4),a:e,shadow:false})});
      R.label([0,.25,-2.75],NUL.pass+' of '+NUL.n+' airline tasks: gold = start, so doing nothing passes',{fs:12.5,b:1,c:P.good,dy:-14,a:e});
      R.label([AG[0],0,AG[2]+PD/2],'task 29: the gold\'s changes are missing · fail',{fs:12,c:P.bad,b:1,dy:34,a:e,wide:1})}
  }
  const full={cam:[0,.92],bounds:[[-4.1,0,-2.6],[4.1,1,1.8]]};
  S3.stage({id:'stg-diff',list:'sx-diff',fig:'Fig. 2 · outcome grading by state diff, task 29',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5000,draw,
    margin:w=>w<520?[18,8,20,8]:[22,16,24,16],
    view:k=>k===0?{cam:[0,.85],bounds:[[-2.2,0,-2.7],[2.2,.5,-.7]]}:k===1?{cam:[-.1,.85],bounds:[[-4.1,0,-2.7],[2,.6,1.7]]}:k===2?{cam:[.1,.85],bounds:[[-2,0,-2.7],[4.1,.6,1.7]]}:k===3?{cam:[0,.75],bounds:[[-4.1,0,-.3],[4.1,.7,2.5]]}:k===4?{cam:[0,.32],bounds:[[-3.9,0,-.3],[3.9,2.7,1.8]]}:k===5?{cam:[0,.95],bounds:[[-4.1,0,-3.1],[4.1,.6,1.8]]}:full});
})();
