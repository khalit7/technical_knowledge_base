// ---- Scene: Fig. 3 (stg-pk, renderer v2): the pass^k and pass@k estimators, counted on one task. GPT-5.2's four recorded trials of tau2-bench
// airline task 19 (window.ATJ_R, the released file): for k = 1..4 every one of the C(4,k) ways to draw k of the 4 trials is laid out as a plinth of
// k cubes; draws whose trials all passed light up and stream into the pass^k bar, beside pass@k (draws with at least one pass). The last step averages
// the same count over all 50 tasks (window.ATJ_OUT.gpt52.pass_hat, checked against recompute.json; pass@k computed here with the same formula).
// Values are published in window.ATJN.pk for check_stages.mjs. ----
(function(){
  if(!document.getElementById('stg-pk')||!window.S3||!window.ATJ_R||!window.ATJ_OUT)return;
  const {mix,cl,lerp}=S3,TASK='19';
  const tr=window.ATJ_R.filter(r=>r.model==='gpt52'&&r.task===TASK).sort((a,b)=>a.trial-b.trial).map(r=>r.reward);if(tr.length!==4)return;
  const N=4,c=tr.reduce((a,b)=>a+b,0),comb=(n,k)=>{if(k>n)return 0;let r=1;for(let j=1;j<=k;j++)r=r*(n-k+j)/j;return r};
  const subsets=k=>{const o=[];const rec=(s,a)=>{if(a.length===k){o.push(a);return}for(let i=s;i<N;i++)rec(i+1,[...a,i])};rec(0,[]);return o};
  const D=[1,2,3,4].map(k=>{const S=subsets(k),all=S.filter(s=>s.every(i=>tr[i])).length,any=S.filter(s=>s.some(i=>tr[i])).length;return {k,S,all,any,hat:all/S.length,at:any/S.length}});
  // the 50 tasks: pass^k from 22_js_calc.js, pass@k with the same per-task formula
  const by={};window.ATJ_R.filter(r=>r.model==='gpt52').forEach(r=>(by[r.task]=by[r.task]||[]).push(r.reward));const T=Object.values(by);
  const hist=[0,0,0,0,0];T.forEach(v=>hist[v.reduce((a,b)=>a+b,0)]++);
  const HAT=window.ATJ_OUT.gpt52.pass_hat,AT=[1,2,3,4].map(k=>Math.round(10000*T.reduce((a,v)=>{const s=v.reduce((x,y)=>x+y,0);return a+1-comb(v.length-s,k)/comb(v.length,k)},0)/T.length)/100);
  (window.ATJN=window.ATJN||{}).pk={task:TASK,trials:tr.slice(),c,draws:D.map(d=>[d.S.length,d.all,d.any]),hat:D.map(d=>d.hat),at:D.map(d=>d.at),nT:T.length,hist,HAT,AT};
  const CU=.5,TX=i=>-1.3+i*.85,TZ=-1.55,BX=3.55,BH=1.7;
  const dx=(k,j)=>{const m=D[k-1].S.length,sp=Math.min(1.5,6.3/m);return -4.1+sp*(j+.5)+(6.3-sp*m)/2},DZ=.55;
  function cube(R,p,ok,a,s){const P=R.P;s=s||CU;R.box(p,[s,s,s],{fill:ok?mix(P.paper,P.good,.75):mix(P.paper,P.bad,.75),a,lw:.7})}
  function draw(R,k,e){const P=R.P,cH=P.c1,cA=P.c4,fr=k>=1&&k<=4,K=k,dd=fr?D[K-1]:null;R.grid(-5,5,-2.6,2,.5);
    // the task's four trials
    const ta=k===5?1-e:1;
    if(ta>0)tr.forEach((ok,i)=>{cube(R,[TX(i),0,TZ],ok,ta,.5);R.label([TX(i),.5,TZ-.25],(R.W<520?'':'trial '+(i+1))+(ok?' ✓':' ✗'),{fs:12.5,b:1,dy:-14,c:ok?P.good:P.bad,a:k===5?cl(1-3*e,0,1):1})});
    R.label([(TX(0)+TX(N-1))/2,.5,TZ-.25],'task '+TASK+' · '+c+' of '+N+' passed · GPT-5.2',{fs:13,b:1,dy:-36,a:k===5?cl(1-3*e,0,1):1});
    if(k===0)return;
    if(fr){// every way to draw k trials: a white plinth carrying k cubes; an all-pass draw lifts and glows
      dd.S.forEach((s,j)=>{const x=dx(K,j),all=s.every(i=>tr[i]),t=cl(e*(dd.S.length+2)/1.4-j*.5,0,1),lift=all?.18*t:0,w=K*.34+.16;
        R.box([x,0,DZ],[w,.08+lift,.5],{fill:all?mix(P.paper,cH,.55):P.paper,a:t});
        s.forEach((i,q)=>cube(R,[x-(K-1)*.17+q*.34,.08+lift,DZ],tr[i],t,.28));
        if(all&&t>.9)R.flowArc([x,.4+lift,DZ],[BX-.35,.25+dd.hat*BH*.6,DZ-.1],.5,{c:cH,a:.8,r:.05,n:4,speed:1.2});
        if(t>0&&t<1)s.forEach(i=>R.flowArc([TX(i),.5,TZ],[x,.3,DZ],.35,{c:tr[i]?P.good:P.bad,a:.5*(1-t),r:.04,n:3}))});
      R.label([0,0,DZ+.25],'C('+N+','+K+') = '+dd.S.length+' draws · '+dd.all+' all pass · '+dd.any+' with a pass',{fs:12.5,b:1,dy:16,c:P.ink,a:e});
      // the task's two estimates
      [[cH,dd.hat,'pass^'+K+' = '+dd.hat.toFixed(2),-.35],[cA,dd.at,'pass@'+K+' = '+dd.at.toFixed(2),.35]].forEach(([col,v,t,o])=>{const pv=k>1?(o<0?D[K-2].hat:D[K-2].at):v,h=Math.max(.02,lerp(pv,v,e)*BH);
        R.box([BX+o,0,DZ],[.5,h,.5],{fill:mix(P.paper,col,.6)});R.label([BX+o,h,DZ-.25],R.W<520?t.split(' = ')[1]:t,{mono:true,fs:12.5,b:1,dy:-10,al:o<0?'right':'left',dx:o<0?-2:2,c:col,a:k===1?cl(e*2-1,0,1):1})})}
    if(k===5){// averaged over the 50 tasks: pass^k falls with k, pass@k rises (on a phone only pass^k is labelled; the step text gives both series)
      [0,1,2,3].forEach(i=>{const x=-2.6+i*1.75,t=cl(e*1.6-i*.2,0,1);
        [[cH,HAT[i],-.27],[cA,AT[i],.27]].forEach(([col,v,o])=>{const h=Math.max(.02,v/100*2.4*t);R.box([x+o,0,DZ],[.46,h,.46],{fill:mix(P.paper,col,.6),a:Math.max(t,.05)});
          if(R.W>=520||o<0)R.label([x+o,h,DZ-.23],v.toFixed(1),{mono:true,fs:12.5,b:1,dy:-10,al:R.W<520?'center':o<0?'right':'left',dx:R.W<520?0:o<0?2:-2,c:col,a:t})});
        R.label([x,0,DZ+.3],'k = '+(i+1),{fs:12.5,b:1,dy:14,a:e})});
      R.label([-3.4,1.2,DZ],'pass^k',{fs:13,b:1,c:cH,al:'right',a:e,grp:'ser'});R.label([-3.4,.9,DZ],'pass@k',{fs:13,b:1,c:cA,al:'right',a:e,grp:'ser'});
      R.label([0,2.75,DZ-.3],'GPT-5.2 · all '+T.length+' airline tasks',{fs:12.5,b:1,dy:-14,c:P.mute,a:cl(e*2-1,0,1)})}
  }
  const full={cam:[0,.8],bounds:[[-4.4,0,-1.9],[4.4,1.7,1.1]]};
  S3.stage({id:'stg-pk',list:'sx-pk',fig:'Fig. 3 · the estimators, counted on one task',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5000,draw,
    margin:w=>w<520?[22,8,22,8]:[26,16,26,16],
    view:k=>k===0?{cam:[0,.7],bounds:[[-2.2,0,-2],[2.4,.9,-1.1]]}:k===5?{cam:[0,.45],bounds:[[-4.2,0,-.3],[3.4,3,1.2]]}:full});
})();
