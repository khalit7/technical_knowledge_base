// ---- Scene: one RL step on the GPUs (Fig. 3, section 12). The inference engine and the trainer as GPU pools, each with its copy of the weights
// as a glass plate; the rollouts are the first 16 real answers of this page's data (LLD.groups[0], GSM8K test problem 0) drawn to their lengths,
// growing at one token per tick per slot; the scorer is the strict verifier; the asynchronous count is the page's timeline model (section 12). ----
(function(){
  if(!document.getElementById('stg-inf'))return;const {at,off,lerp,mix}=S3;
  const E=window.LLE,D=window.LLD;if(!E||!D)return;
  const g=D.groups[0],g2=D.groups[1],N=g.L.length,LM=Math.max(...g.L),idle=1-g.L.reduce((a,b)=>a+b,0)/(N*LM);
  const Lall=[].concat(...D.groups.map(x=>x.L)).slice(0,160),as=E.asyncSched(Lall,16,32,300),stale=as.jobs.filter(j=>j.stale>0).length,smax=Math.max(...as.jobs.map(j=>j.stale));
  const X0=-2.65,SC=3.3/512,ZS=.3,z=i=>(i-(N-1)/2)*ZS,xe=L=>X0+SC*L,YR=.12;
  const EN=[-4.25,0],TRN=[4.0,0],SCO=[1.75,0];
  // a GPU pool: four GPU boxes on a plinth and the weights as one glass plate standing behind them
  function pool(R,c,x,a,wc,lab,sub,la){la=la!=null?la:Math.max(.45,a);const P=R.P;if(a<=.01)return;R.box([x,0,0],[1.6,.05,2.3],{a});
    [[-.38,-.55],[.38,-.55],[-.38,.55],[.38,.55]].forEach(([dx,dz])=>R.box([x+dx,.05,dz+.35],[.62,.38,.62],{fill:mix(P.paper,c,.4),a,lw:.7}));
    R.glass([x-.62,.42,-.75],[1.24,0,0],[0,1.05,0],{c:wc,a,nu:6,nv:6});R.label([x,1.62,-.75],lab,{fs:13.5,b:1,c,dy:-8,a:la});if(sub)R.label([x,0,1.25],sub,{fs:12,dy:14,c:P.mute,a:la,wide:1})}
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-5.6,5.4,-3,3,.5);
    const ea=[1,1,.3,.3,1,1][k],ta=[.25,.25,.3,1,1,1][k],sa=[.2,.2,1,1,.3,.4][k];
    const lf=k===2?1-e:k===3?0:k===4?e:1,v1=k===4,wE=k===4?mix(P.c1,P.c3,e):P.c1,wT=k>=3?P.c3:P.c1;   // lf: the engine's labels fade out for the close-up steps 3 and 4, where it lies partly outside the view
    pool(R,P.c1,EN[0],ea,wE,'inference engine',v1?(e<.5?'weights v':'weights v + 1'):k===5?'still on weights v':'weights v · vLLM, SGLang',lf*Math.max(.45,ea));
    pool(R,P.c4,TRN[0],ta,wT,'trainer',k>=3?'weights v + 1 · FSDP, Megatron':'weights v · FSDP, Megatron',k===2?(1-e)*.45:null);
    // the scorer
    R.box([SCO[0],0,SCO[1]],[.9,.7,1.1],{fill:mix(P.paper,P.c5,.2),a:sa});R.label([SCO[0],.85,SCO[1]],'scorer',{fs:13.5,b:1,c:P.c5,dy:-8,a:Math.max(.45,sa)});
    if(sa>.5)R.label([SCO[0],0,.75],'verifier · reward model · env',{fs:12,dy:14,c:P.mute,wide:1,al:k===3?'right':'center',dx:k===3?30:0});   // step 4: ends under the scorer, clear of the trainer's line
    // the batch: one row per slot, growing one token per tick; a finished slot then idles until the longest is done
    const tick=k===0?e*LM:LM,ra=k===5?Math.max(0,.45-e):k===4?.45:1;
    for(let i=0;i<N;i++){const L=Math.min(g.L[i],tick),zz=z(i),done=g.L[i]<=tick;if(L>0&&ra>.01)R.box([X0+SC*L/2,YR,zz],[SC*L,.08,.16],{fill:mix(P.paper,P.c1,done&&k===0?.55:.3),a:ra,shadow:false,lw:.6});
      if(k===0&&!done)R.flow([[EN[0]+.8,.5,zz*.5],[X0,YR+.05,zz],[xe(L),YR+.05,zz]],{c:P.c1,a:.6,r:.035,speed:2,n:3});
      // 2. idle: dashed outline from the slot's finish to the longest finish
      if(k===1&&g.L[i]<LM)R.quad([[xe(g.L[i]),YR+.04,zz-.07],[xe(LM),YR+.04,zz-.07],[xe(LM),YR+.04,zz+.07],[xe(g.L[i]),YR+.04,zz+.07]],{fill:P.c2,fa:.12*e,ec:P.c2,ea:.7*e,dash:[3,3],lw:1});
      // 3. scored
      if(k>=2&&ra>.01){const sc=k===2?e:1,r=g.r[i];R.ball([xe(g.L[i])+.08,YR+.1,zz],.055,{c:r?P.c3:P.mute,a:sc*ra});if(k===2)R.flowArc([xe(g.L[i])+.1,YR+.1,zz],[SCO[0]-.45,.4,zz*.4],.15,{c:P.c1,a:.6,r:.035,speed:1.4,n:3})}}
    if(k<5)R.label([X0+1.4,YR,z(N-1)+.2],nar?'16 answers':'16 answers to GSM8K #0, real lengths',{fs:12.5,dy:16,c:P.mute,a:k>=4?.5*(k===4?e:1):k===3?1-e:1});
    if(k===1)R.label([xe(LM)+.15,YR+.1,z(0)],'idle: '+Math.round(idle*100)+'% of slot time',{al:'left',dx:6,fs:13,b:1,c:P.c2,a:e});
    if(k===0)R.label([xe(LM),YR,z(g.L.indexOf(LM))],LM+' tokens',{al:'left',dx:8,mono:true,fs:12.5,c:P.c1,a:e});
    if(k===2)R.label([SCO[0],.95,SCO[1]],g.r.reduce((a,b)=>a+b,0)+' of 16 pass',{fs:13,b:1,c:P.c3,dy:-26,a:e});
    // 4. train: answers, scores and the engine's log-probabilities into the trainer
    if(k===3||k===5){const a=k===3?Math.min(1,e*1.5):.8;for(let j=-1;j<=1;j++)R.flowArc([SCO[0]+.45,.45,j*.35],[TRN[0]-.8,.5,j*.5],.3,{c:P.c5,a,r:.055,speed:1.4,n:5});
      if(k===3)R.label([TRN[0],1.9,-.75],'gradient step',{mono:true,fs:12.5,b:1,c:P.c4,dy:-14,a:e})}
    // 5. sync: the new weights flow back to the engine (a long arc over the batch)
    if(k===4){R.flowArc([TRN[0],1.3,-.75],[EN[0],1.3,-.75],1.4,{c:P.c3,a:Math.min(1,e*1.5),r:.09,speed:2.2,n:22});R.label([0,2.9,-.75],nar?'weights v + 1':'weights v + 1 → engine (network, or a local copy if colocated)',{fs:13,b:1,c:P.c3,a:e})}
    // 6. asynchronous: the next batch starts at once on the old weights while the trainer is still busy
    if(k===5){const t2=e*Math.max(...g2.L);for(let i=0;i<N;i++){const L=Math.min(g2.L[i],t2),zz=z(i);if(L>0)R.box([X0+SC*L/2,YR,zz],[SC*L,.08,.16],{fill:mix(P.paper,P.c2,.3),a:.95,shadow:false,lw:.6});if(L<g2.L[i])R.flow([[X0,YR+.05,zz],[xe(L),YR+.05,zz]],{c:P.c2,a:.6,r:.035,speed:2,n:2})}
      R.flow([[EN[0]+.8,.6,0],[X0,YR+.1,0]],{c:P.c2,a:.6,r:.04,speed:1.5,n:4});
      R.label([X0+1.6,YR,z(N-1)],nar?'next batch: stale':'next batch, decoding on weights v while the trainer makes v + 1',{fs:13,b:1,c:P.c2,dy:34,a:e})}
  }
  const full={cam:[.12,.66],bounds:[[-5.2,0,-2.6],[4.9,1.9,2.6]]};
  S3.stage({id:'stg-inf',list:'sx-inf',fig:'Fig. 3 · generate, score, train, sync',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5000,draw,
    view:k=>k===0||k===1?{cam:[.25,.7],bounds:[[-5.2,0,-2.6],[1.4,1.6,2.6]]}:k===2?{cam:[.1,.62],bounds:[[-2.9,0,-2.6],[2.4,1.4,2.6]]}:k===3?{cam:[-.15,.6],bounds:[[1.0,0,-1.6],[4.9,1.9,1.6]]}:k===4?{cam:[.1,.5],bounds:[[-5.2,0,-1.5],[4.9,3.0,1.5]]}:full});
  window.RL3=Object.assign(window.RL3||{},{inf:{minL:Math.min(...g.L),maxL:LM,idle,pass:g.r.reduce((a,b)=>a+b,0),stale,smax}});
})();
