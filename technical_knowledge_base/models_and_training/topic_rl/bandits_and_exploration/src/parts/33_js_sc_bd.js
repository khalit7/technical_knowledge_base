// ---- Scene (section 3): five strategies on the same five arms (seed 3), as a field of bars: rows are strategies, columns arms,
// height the share of the row's pulls that went to the arm; the block at the end of each row is its total regret. Driven by BX.banditRun.
// Renderer v2: each stretch's pulls stream down onto the arms they landed on (dots in proportion to the stretch's share), no shadows on the
// 30-box field, at the last step the other arms recede so the best arm's column and the regret blocks (the bills) stand out. ----
(function(){
  const B=window.BX;if(!B||!document.getElementById('stg-bd'))return;const {at,lerp,mix}=S3;
  const mu=B.BANDIT.mu,K=mu.length,best=mu.indexOf(Math.max(...mu)),CP=[0,5,30,100,300];
  const ROWS=[['greedy',{kind:'greedy'},'greedy','c2'],['eps',{kind:'eps',eps:0.1},'ε-greedy','c1'],['opt',{kind:'greedy',q0:5,alpha:0.1},'optimistic','c5'],['ucb',{kind:'ucb',c:2},'UCB','c3'],['ts',{kind:'ts'},'Thompson','c4']];
  let runs=null;function data(){if(!runs){const tab=B.banditTable(3);runs=ROWS.map(r=>B.banditRun(tab,r[1]))}return runs}
  const X=k=>(k-2)*1.2,Z=j=>(j-2)*1.2,XR=3.9,HB=1.6,HR=1.8,RMAX=400,ZF=3.05;
  const SHORT=['greedy','ε-greedy','optim.','UCB','Thompson'];
  function draw(R,k,e){const P=R.P,h=data(),nar=R.W<520;R.grid(-4.8,4.8,-3,3.6,.6);
    const t=k===0?0:Math.round(lerp(CP[k-1],CP[k],e));
    // the best arm's column, marked on the floor across every row; the arms and their true means at the front
    R.quad([[X(best)-.5,0,Z(0)-.5],[X(best)+.5,0,Z(0)-.5],[X(best)+.5,0,ZF-.25],[X(best)-.5,0,ZF-.25]],{fill:mix(P.card,P.acc,.12),edge:false,a:1,dz:.5});
    for(let a=0;a<K;a++){const isB=a===best,m=(mu[a]<0?'−':'')+Math.abs(mu[a]).toFixed(1);
      R.label([X(a),0,ZF],nar?String(a+1):'arm '+(a+1),{fs:12.5,b:1,c:isB?P.acc:P.ink});
      if(!nar)R.label([X(a),0,ZF],'μ '+m,{mono:true,fs:12,dy:15,c:isB?P.acc:P.mute})}
    R.label([XR,0,ZF],'regret',{mono:true,fs:12,c:P.mute});
    // the pulls of this stretch (from the last checkpoint to this one) for each row and arm
    const ra=k===0?.45:1;
    ROWS.forEach(([key,,lab,c],j)=>{const z=Z(j),x=t>0?h[j][t-1]:null;
      if(k>=1){const n1=h[j][CP[k]-1].N,n0=CP[k-1]>0?h[j][CP[k-1]-1].N:n1.map(()=>0),tot=CP[k]-CP[k-1];
        for(let a=0;a<K;a++){const sh=(n1[a]-n0[a])/tot;if(sh<=0)continue;const top=x?Math.max(.02,x.N[a]/t*HB):0;
          R.flow([[X(a),top+1.5,z],[X(a),top+.05,z]],{c:P[c],a:Math.min(1,e*2)*(.55+.45*sh)*(k===4&&a!==best?.5:1),r:.05+.04*sh,n:2+Math.round(sh*7),speed:1.1})}}
      R.label([X(0)-.6,.05,z],nar?SHORT[j]:lab,{al:'right',dx:-4,fs:12.5,b:1,c:P[c]});
      for(let a=0;a<K;a++){const sh=x?x.N[a]/t:0;
        if(sh>0)R.box([X(a),0,z],[.7,Math.max(.02,sh*HB),.7],{fill:mix(P.paper,P[c],a===best?.85:.4),a:k===4&&a!==best?.3+.7*(1-e):1,shadow:false});
        else R.quad([[X(a)-.35,0,z-.35],[X(a)+.35,0,z-.35],[X(a)+.35,0,z+.35],[X(a)-.35,0,z+.35]],{fill:P.soft,a:.9*ra,ea:.3})}
      const rg=x?x.reg:0,rh=Math.min(1,rg/RMAX)*HR;
      if(rg>0)R.box([XR,0,z],[.7,Math.max(.02,rh),.7],{fill:mix(P.paper,P.bad,.45),a:1,shadow:false});
      if(t>0)R.label([XR+.4,rh,z],rg.toFixed(rg>=100?0:1),{al:'left',dx:3,mono:true,fs:12,c:P.bad})});
    R.label([X(0)-.6,0,ZF],'pull '+t,{al:'right',dx:-4,mono:true,fs:12.5,b:1})}
  const full={cam:[-.28,.8],bounds:[[-5.4,0,-2.9],[4.9,2.4,3.4]]};
  S3.stage({id:'stg-bd',list:'sx-bd',fig:'Fig. 2 · where each strategy sends its pulls',cam:full.cam,bounds:full.bounds,aspect:.66,draw,dur:2600,hold:4800,
  });
})();
