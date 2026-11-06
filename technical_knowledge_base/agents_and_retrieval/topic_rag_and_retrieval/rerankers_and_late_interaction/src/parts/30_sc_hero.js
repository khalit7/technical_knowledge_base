// ---- Scene: Fig. 1, four scorers by where the query meets the document (renderer v2). Token blocks and which query term or token matches which
// are schematic; the sparse bars are the 20 heaviest real term weights of SciFact abstract 4983 (RR.sparse, the Retrieval pipeline page's run);
// storage per abstract is drawn to scale from the page's facts (4,096 bytes, the SPLADE-style estimate, ColBERT's measured bytes, 0). ----
(function(){
  if(!document.getElementById('stg-hero')||!window.RR)return;const {at,mix,lerp}=S3,R0=window.RR;
  const num=id=>{const e=document.getElementById(id);return e?+String(e.dataset.v).replace(/,/g,''):NaN};
  const LX=[-4.8,-1.6,1.6,4.8],NAMES=['Bi-encoder','Learned sparse','Late interaction','Cross-encoder'];
  const ZD=-1.2,ZQ=1.3,ZS=-2.2,ND=8,NQ=4,TS=.2;
  const dx=(X,i)=>X-1+i*(2/(ND-1)),qx=(X,i)=>X-.45+i*.3;
  const TT=(R0.sparse&&R0.sparse.ex.top_terms)||[];
  // storage per abstract, bytes (facts written into the step list as data-v by build.sh)
  function bytes(){return [4096,num('rr-hero-spb'),num('rr-hero-cbb'),0]}
  function draw(R,k,e){const P=R.P;R.grid(-6.6,6.6,-3,2.6,.5);
    const B=bytes(),HMAX=1.1,bmax=Math.max(...B);
    LX.forEach((X,i)=>{
      const on=k===4?1:k===i?1:.2,show=k===4?1:k===i?e:k>i?1:0,act=k===i?e:k===4?1:0;
      if(k===4||k===i)R.label([X,0,ZQ+.55],NAMES[i],{fs:13,b:1,dy:14,c:P.ink});
      // tokens: the document behind (white), the query in front (orange); the cross-encoder lane joins them into one row at its step
      const join=i===3?(k===3?e:k===4?1:0):0;
      for(let t=0;t<ND;t++){const x0=dx(X,t),x1=X-.62+(NQ+t)*.16,z=lerp(ZD,.1,join),x=lerp(x0,x1,join);R.box([x,0,z],[TS*(1-.3*join),TS,TS],{a:on,fill:P.paper})}
      for(let t=0;t<NQ;t++){const x0=qx(X,t),x1=X-.62+t*.16,z=lerp(ZQ,.1,join),x=lerp(x0,x1,join);R.box([x,0,z],[TS*(1-.3*join),TS,TS],{a:on,fill:mix(P.paper,P.q,.7)})}
      // storage per abstract, to scale, at the back
      const h=B[i]/bmax*HMAX,sa=i===k||k===4?show:0;
      if(B[i]>0)R.box([X,0,ZS],[1.1,Math.max(.02,h*(k===4?1:sa)),.45],{a:Math.max(.2*on,sa),fill:P.paper});
      else R.quad([[X-.55,0,ZS-.22],[X+.55,0,ZS-.22],[X+.55,0,ZS+.22],[X-.55,0,ZS+.22]],{a:Math.max(.2,sa),dash:[4,3],ec:P.mute});
      if(sa>.05)R.label([X,B[i]>0?h:0,ZS],(B[i]?B[i].toLocaleString('en-US'):'0')+' bytes stored',{fs:12,mono:true,dy:-12,a:sa});
      if(i===0){// two encoders, one vector each, one dot product
        R.glass([X-1.05,.02,-.65],[2.1,0,0],[0,.5,0],{c:P.c1,a:on*.9,nu:8,nv:3});R.glass([X-.6,.02,.85],[1.2,0,0],[0,.45,0],{c:P.c1,a:on*.9,nu:6,nv:3});
        R.box([X,0,-.15],[1.6,.1*Math.max(.15,show),.16],{fill:P.paper,a:Math.max(.2,show)*on,shadow:false});
        R.box([X,0,.45],[1.0,.1*Math.max(.15,show),.16],{fill:mix(P.paper,P.q,.75),a:Math.max(.2,show)*on,shadow:false});
        if(act>0){R.flow([[X,.12,ZD],[X,.3,-.65],[X,.12,-.15]],{c:P.mute,a:act,n:5,speed:1});R.flow([[X,.12,ZQ],[X,.28,.85],[X,.12,.45]],{c:P.q,a:act,n:5,speed:1});
          R.flowArc([X,.1,.45],[X,.1,-.15],.35,{c:P.q,a:act,n:5,r:.06,speed:.9});if(k===i)R.label([X+.2,.45,.15],'1 dot product',{al:'left',dx:6,fs:12.5,b:1,c:P.q,a:act})}}
      if(i===1&&TT.length){// a weighted bag of words: real weights, schematic query terms
        const n=TT.length,bx=j=>X-1.1+j*(2.2/(n-1)),mx=Math.max(...TT.map(t=>t[1])),QI=[0,3,6,13];
        TT.forEach((t,j)=>R.box([bx(j),0,-.35],[.07,.9*t[1]/mx*Math.max(.15,show),.07],{fill:t[2]?P.paper:mix(P.paper,P.c4,.75),a:on*Math.max(.25,show),shadow:false,lw:.6}));
        QI.forEach(j=>{R.box([bx(j),0,.55],[.07,.45*Math.max(.15,show),.07],{fill:mix(P.paper,P.q,.75),a:on*Math.max(.25,show),shadow:false,lw:.6});
          if(act>0)R.flowArc([bx(j),.45,.55],[bx(j),.9*TT[j][1]/mx,-.35],.25,{c:P.q,a:act,n:4,r:.05,speed:.9})});
        if(act>0){R.flow([[X,.12,ZD],[X,.2,-.35]],{c:P.mute,a:act*.7,n:4});if(k===i)R.label([X-1.15,.95,-.35],'term weights, '+num('rr-hero-nnz')+' non-zero',{al:'left',fs:12,mono:true,dy:-10,a:act,wide:1});
          if(k===i)R.label([X,.5,.55],'shared terms add up',{fs:12.5,b:1,dy:-14,c:P.q,a:act})}}
      if(i===2){// one stored vector per document token; each query token finds its best one
        const best=[1,3,4,6];
        for(let t=0;t<ND;t++)R.box([dx(X,t),TS,ZD],[.05,.38*Math.max(.15,show),.05],{fill:P.paper,a:on*Math.max(.25,show),shadow:false});
        for(let t=0;t<NQ;t++){R.box([qx(X,t),TS,ZQ],[.05,.38*Math.max(.15,show),.05],{fill:mix(P.paper,P.q,.75),a:on*Math.max(.25,show),shadow:false});
          if(act>0){R.flowArc([qx(X,t),.6,ZQ],[dx(X,best[t]),.6,ZD],.35,{c:P.q,a:act,n:5,r:.05,speed:1.1});R.glow([dx(X,best[t]),.6,ZD],.18,{c:P.q,a:act})}}
        if(k===i)R.label([X,.85,.05],'each query token: its best match',{fs:12.5,b:1,c:P.q,a:act,dy:-6})}
      if(i===3){// one pass over the joined sequence: every layer mixes query and document
        const la=Math.max(.15,act)*on;[.42,.72,1.02].forEach(y=>R.glass([X-.75,y,-.2],[1.55,0,0],[0,0,.6],{c:P.c1,a:la,nu:12,nv:2,th:.02}));
        if(act>0){[[0,6],[1,9],[2,4],[3,11],[1,7]].forEach(([a,b],j)=>R.flowArc([X-.62+a*.16,.2,.1],[X-.62+b*.16,.2,.1],.55+.1*j,{c:P.q,a:act*.85,n:5,r:.045,speed:1.2}));
          R.ball([X,1.35,.1],.09,{c:P.q,a:act});if(k===i)R.label([X,1.35,.1],'1 score per pair',{fs:12.5,b:1,dy:-16,c:P.q,a:act})}}
    });
    if(k===4){R.label([-4.8,0,2.45],'← precomputed, cheap per candidate',{fs:12.5,dy:14,c:P.mute,a:e,wide:1});R.label([4.8,0,2.45],'interaction, top K only →',{fs:12.5,dy:14,c:P.mute,a:e,wide:1})}
  }
  const full={cam:[.1,.62],bounds:[[-6.2,0,-2.6],[6.2,1.6,2.3]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · four scorers, by where the query meets the document',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1400,hold:4800,draw,
    margin:w=>w<520?[12,8,12,8]:[18,16,18,16],
    view:k=>k<4?{cam:[.42,.55],bounds:[[LX[k]-1.45,0,-2.5],[LX[k]+1.45,1.5,2.1]]}:full});
})();
