// ---- Scene (Capacity section): one held-out batch of 512 tokens through the page's toy Switch layer (16 experts, top-1, alpha 0.01, trained 1,500 steps
// at capacity factor 1.25, seed 1; window.CAP from mk_cap_data.cjs, the Train tab's own code). Each column is an expert, its height the tokens the
// router sent it; the glass plane is the buffer of Eq. 3 at the step's capacity factor; above it (red) the dropped tokens, which flow round the experts
// on the residual path; the empty part of a buffer is padding. Step 5 is the top-2 twin at 1.25, step 6 the drops against padding at four factors. ----
(function(){
  if(!document.getElementById('stg-cap')||!window.CAP)return;const {at,lerp,mix}=S3;
  const K1=CAP.runs.k1,K2=CAP.runs.k2,N=K1.first.length,T=CAP.cfg.T,u=.028,u2=.0062,XS=.62,x=e=>(e-(N-1)/2)*XS,ZR=2.3,ZO=-1.5,X0=x(0)-.4,X1=x(N-1)+.4;
  const CFS=[null,1,1.25,2,1.25,null],cfAt=k=>CFS[k],run=k=>k===4?K2:K1;
  const C=k=>{const cf=cfAt(k);return cf==null?0:run(k).at[cf].C};
  const mx=K1.first.reduce((a,b)=>Math.max(a,b),0),mn=K1.first.reduce((a,b)=>Math.min(a,b),1e9);
  function columns(R,k,e,a){const P=R.P,r=run(k),cap=k===0?0:k===4?C(4):lerp(k===1?0:C(k-1),C(k),k===1?e:e),showCap=k>=1;
    const capA=k===1?e:1;
    for(let i=0;i<N;i++){const n1=r.first[i],n2=k===4?r.second[i]:0,tot=n1+n2,grow=k===0?e:1,h1=n1*u*grow,h2=n2*u,X=x(i);
      if(!showCap){R.box([X,0,0],[.42,Math.max(.01,h1),.42],{fill:mix(P.paper,P.c1,.35),a,shadow:false});}
      else{const kept=Math.min(tot,cap),hk=kept*u,hd=Math.max(0,tot-cap)*u;
        if(k===4){const k1=Math.min(n1,kept);R.box([X,0,0],[.42,Math.max(.01,k1*u),.42],{fill:mix(P.paper,P.c1,.45),a,shadow:false});
          if(kept>k1)R.box([X,k1*u,0],[.42,(kept-k1)*u,.42],{fill:mix(P.paper,P.c1,.15),a,shadow:false})}
        else R.box([X,0,0],[.42,Math.max(.01,hk),.42],{fill:mix(P.paper,P.c1,.35),a,shadow:false});
        if(hd>.001)R.box([X,hk,0],[.42,hd,.42],{fill:P.bad,a:a*(.35+.5*capA),shadow:false});
        if(tot<cap)R.box([X,tot*u,0],[.42,(cap-tot)*u,.42],{fill:mix(P.paper,P.c6,.25),fa:.18,ea:.35,a:a*capA,shadow:false,dz:-.01})}
      // counts over the columns: the busiest and the quietest always, the rest on wide screens
      const lab=k===4?String(tot):String(n1),big=k===4?tot===Math.max(...K2.demand)||tot===Math.min(...K2.demand):n1===mx||n1===mn;
      R.label([X,Math.max(k===4?tot:n1,cap)*u*(k===0?e:1)+.02,0],lab,{mono:true,fs:12,dy:-9,a:a*(k===0?e:1),c:P.mute,wide:big?0:1})}
    if(showCap){const y=cap*u;R.glass([X0,y,.4],[X1-X0,0,0],[0,0,-.8],{c:P.c6,a:a*capA*.9,nu:N,nv:1,th:.01});
      R.label([X0,y,0],'capacity '+Math.round(cap)+(k===4?' (top-2)':''),{al:'right',dx:-8,mono:true,fs:12.5,c:P.c6,a:a*capA,grp:'row'})}
  }
  function draw(R,k,e){const P=R.P;R.grid(-5.6,5.6,-3.2,3.4,.5);
    const fade=k===5?Math.max(0,1-2*e):1,rise=k===5?Math.max(0,2*e-1):0;
    // the router (a glass plate); dropped tokens arc over the experts to the next layer, behind them
    if(fade>.01){R.glass([-1.3,.12,ZR],[2.6,0,0],[0,.8,0],{c:P.c2,a:fade,nu:N,nv:4});R.label([0,1.05,ZR],'router · 512 tokens',{mono:true,fs:12.5,c:P.c2,a:fade,dy:-6});
      const r=run(k);
      // tokens streaming to their experts, density by count; at the step that introduces them they appear with the columns
      const fa=fade*(k===0?Math.min(1,e*1.6):.75);
      for(let i=0;i<N;i++){const n=k===4?r.demand[i]:r.first[i];R.flowArc([0,.55,ZR],[x(i),.12,.24],.55,{c:P.c2,a:fa,r:.045,n:Math.max(2,Math.round(n/9)),speed:1.5})}
      // dropped tokens skip the experts: over the top on the residual path
      if(k>=1&&k<=4){const cf=cfAt(k),dr=k===4?r.at[cf].dropped1+r.at[cf].dropped2:r.at[cf].dropped1,a=k===1?e:1;
        const hA=k===4?3.0:1.75;
        if(dr>0){R.flowArc([0,.9,ZR],[0,.16,ZO],hA,{c:P.bad,a:fade*a,r:.06,n:Math.max(3,Math.round(dr/10)),speed:1.6});
          R.label(R.arcPt([0,.9,ZR],[0,.16,ZO],hA,.5),dr+' dropped → residual',{mono:true,fs:12.5,c:P.bad,a:fade*a,b:1,dy:-20})}
        const pd=r.at[cf].pad,y=C(k)*u;R.label([X0,y*.5,0],pd+' of '+r.at[cf].slots.toLocaleString('en-GB')+' slots padded',{al:'right',dx:-8,mono:true,fs:12,c:P.c6,a:fade*a,grp:'row'})}
      columns(R,k===5?3:k,k===5?1:e,fade)}
    // step 6: the trade-off, dropped against padded, at four capacity factors
    if(rise>.01){const G=CAP.cfs,gx=j=>(j-(G.length-1)/2)*2.3;
      G.forEach((cf,j)=>{const A=K1.at[cf],X=gx(j);
        R.box([X-.38,0,0],[.6,Math.max(.01,A.dropped1*u2*rise),.6],{fill:P.bad,a:rise});
        R.box([X+.38,0,0],[.6,Math.max(.01,A.pad*u2*rise),.6],{fill:mix(P.paper,P.c6,.35),fa:.55,a:rise});
        R.label([X-.38,A.dropped1*u2*rise,0],String(A.dropped1),{mono:true,fs:12.5,dy:-10,c:P.bad,a:rise,b:1});
        R.label([X+.38,A.pad*u2*rise,0],String(A.pad),{mono:true,fs:12.5,dy:-10,c:P.c6,a:rise,b:1});
        R.label([X,0,.75],'CF '+cf,{mono:true,fs:12.5,dy:12,a:rise,b:1});
        R.label([X,0,.75],'error '+A.mse.toFixed(2),{mono:true,fs:12,dy:30,a:rise,c:P.mute})});
      R.label([gx(0)-.9,1.2,0],'dropped tokens',{al:'right',mono:true,fs:12.5,c:P.bad,a:rise,grp:'leg'});R.label([gx(0)-.9,.8,0],'padded slots',{al:'right',mono:true,fs:12.5,c:P.c6,a:rise,grp:'leg'})}
  }
  const nar=()=>innerWidth<700,full=()=>({cam:nar()?[.62,.62]:[.2,.55],bounds:[[-4.9,0,-1.2],[4.9,2.1,2.6]]});
  window.__capScene={stage:S3.stage({id:'stg-cap',list:'sx-cap',fig:'one held-out batch · toy Switch layer · 16 experts',cam:full().cam,bounds:full().bounds,aspect:.5,dur:1500,hold:5200,draw,
    margin:w=>w<520?[14,10,14,10]:[16,14,14,150],
    view:k=>k===4?{cam:nar()?[.62,.55]:[.2,.5],bounds:[[-4.9,0,-1.2],[4.9,3.5,2.6]]}:k===5?{cam:nar()?[.45,.42]:[.3,.42],bounds:[[-4.6,0,-1],[4.6,3.3,1.6]]}:full()}),C,run};
})();
