// ---- Scene (Reading 4, Fig. 4): offline against online mixing, then a loader hitting the weights 0.6 / 0.3 / 0.1 (illustrative) over 60 samples:
// random draws with a fixed seed against Megatron-LM's error-driven blend (the sequences of RD.mx2blend, 24_js_mx2_rd2.js). ----
(function(){
  if(!document.getElementById('stg-bl')||!RD.mx2blend)return;const {at,off,lerp,mix}=S3;
  const B=RD.mx2blend,W=B.BW,NM=B.BN,NS=B.NS,SEQ={rand:B.seqRand(),meg:B.seqMeg()};
  const PX=[-3.1,-1.9,-.7],PZ=-1.9,CX=[3.3,4.15,5.0],CZ=.9,CH=.075;
  const slot=i=>[-2.7+(i%10)*.6,0,-.15+Math.floor(i/10)*.48];
  // how many samples are drawn at step k (progress e), and from which sequence
  const plan=k=>k===2?['rand',0,20]:k===3?['rand',20,60]:k===4?['meg',0,20]:k===5?['meg',20,60]:null;
  function draw(R,k,e){const P=R.P,COL=[P.c1,P.c3,P.c2];R.grid(-4.6,6,-2.8,3,.5);
    // the three pools
    PX.forEach((x,d)=>{R.box([x,0,PZ],[.85,.95,.85],{fill:mix(P.paper,COL[d],.5)});R.label([x,.95,PZ],NM[d],{fs:12.5,b:1,dy:-13,c:COL[d]})});
    // 1. offline: everything mixed once into one shard
    const oa=k===0?1:k===1?1-e:0;
    if(oa>0){const sx=1.4,sz=.2;R.box([sx,0,sz],[1.3,.7,1.0],{fill:mix(P.paper,P.ink,.06),a:oa});
      for(let j=0;j<12;j++)R.box([sx-.6+j*.1+.05,.7,sz],[.08,.03,1.0],{fill:COL[SEQ.rand[j]],a:oa,shadow:false,edge:false});
      PX.forEach((x,d)=>R.flowArc([x,.6,PZ+.4],[sx,.75,sz-.3],.6,{c:COL[d],a:oa*(k===0?Math.min(1,e*1.5):1),r:.05+.05*W[d],n:Math.max(2,Math.round(10*W[d])),speed:1.2}));
      R.label([sx,0,sz+.5],'one pre-mixed shard',{mono:true,fs:12.5,dy:15,c:P.ink,a:oa})}
    if(k<1)return;
    const ua=k===1?e:1,pl=plan(k),seq=pl?SEQ[pl[0]]:null,n=pl?Math.floor(lerp(pl[1],pl[2],e)+1e-9):0;
    // 2. online: the sampler between the pools and the stream of samples
    R.glass([-3.6,.03,-1.2],[3.4,0,0],[0,0,.55],{c:P.c4,a:ua*.85,nu:3,nv:1,th:.04});
    R.label([-3.6,.03,-.95],'sampler · '+W.join(' / '),{al:'right',dx:-8,mono:true,fs:12.5,b:1,c:P.c4,a:ua,wide:1});
    for(let i=0;i<NS;i++){const p=slot(i),filled=seq&&i<n;R.box(p,[.46,filled?.26:.04,.36],{fill:filled?COL[seq[i]]:P.paper,a:ua*(filled?1:.5),shadow:false,lw:.6})}
    if(pl&&n>0&&e<1){const i=n-1,d=seq[i],p=slot(i);R.flowArc([PX[d],.9,PZ],[p[0],.3,p[2]],.7,{c:COL[d],a:.9,r:.07,n:5,speed:2.2})}
    R.label([-2.7,0,.95],'60 samples',{al:'right',dx:-22,mono:true,fs:12,c:P.mute,a:ua,wide:1});
    // counts against targets w·n
    if(k>=2){const c=[0,0,0];for(let i=0;i<n;i++)c[seq[i]]++;
      CX.forEach((x,d)=>{const h=c[d]*CH,t=W[d]*n*CH;R.box([x,0,CZ],[.5,Math.max(.01,h),.5],{fill:COL[d]});
        R.glass([x-.38,t,CZ-.38],[.76,0,0],[0,0,.76],{c:P.ink,a:.55,nu:1,nv:1,th:.01});
        R.label([x,Math.max(h,t),CZ],c[d]+' / '+(W[d]*n).toFixed(W[d]*n%1?1:0),{mono:true,fs:12.5,b:1,dy:-12,c:COL[d]});
        R.label([x,0,CZ+.3],NM[d],{mono:true,fs:12,dy:13,c:P.mute})});
      R.label([CX[1],0,CZ+.3],'count / target after '+n,{mono:true,fs:12,dy:34,c:P.ink,wide:1})}
  }
  const full={cam:[.22,.62],bounds:[[-4.6,0,-2.4],[5.4,1.3,2.5]]};
  S3.stage({id:'stg-bl',list:'sx-bl',fig:'Fig. 4 · a loader hitting the weights',cam:full.cam,bounds:full.bounds,aspect:.6,dur:2600,hold:4200,draw,
    margin:w=>w<520?[16,10,16,10]:[20,16,20,16],
    view:k=>k===0?{cam:[.22,.55],bounds:[[-3.8,0,-2.4],[2.4,1.2,1]]}:full});
})();
