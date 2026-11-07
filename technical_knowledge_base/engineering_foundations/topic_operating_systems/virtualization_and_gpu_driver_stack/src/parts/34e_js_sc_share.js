// ---- Scene, Fig. 8 (section 8): one GPU shared by jobs A and B: time slicing, MPS, MIG (renderer v2) ----
// An A100 40GB as MIG counts it: 7 compute slices over time (columns of blocks, time from back to front) and 8 memory slices in front.
// The MIG placements (4g.20gb at 0, 3g.20gb at 4; seven 1g.5gb at 0..6) are NVIDIA's (nvidia-smi mig -lgipp, the lab below);
// the time slots and MPS's shares of each slot are illustrative.
(function(){
  if(!document.getElementById('stg-share'))return;const {at,mix}=S3;
  const NC=7,NT=6,NM=8,xc=c=>-3.0+c*1.0,zt=t=>-1.55+t*.48,xm=j=>-3.15+j*.9,ZM=1.75,YC=.62;
  const MPS=[.6,.45,.7,.5,.35,.6]; // A's share of each time slot under MPS (illustrative, as the 2D figure had it)
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-4.4,4.4,-2.2,2.6,.5);
    const A=P.c1,B=P.c4,seven=[P.c1,P.c2,P.c3,P.c4,P.c5,P.c6,mix(P.c1,P.c3,.5)];
    // the chip: a glass plate carrying the compute slices; memory slices in front
    R.glass([-3.6,.5,-1.85],[7.2,0,0],[0,0,2.95],{c:P.mute,a:.5,nu:7,nv:6,th:.05});
    const ownM=j=>k===3?(j<4?A:B):k===4?(j<7?seven[j]:null):null;
    for(let j=0;j<NM;j++){const o=ownM(j);R.box([xm(j),0,ZM],[.78,.38,.55],{fill:o?mix(P.paper,o,.55*(k===3||k===4?e:1)+.0):mix(P.paper,P.mute,k===1||k===2?.25:.1),a:1})}
    R.label([xm(0)-.45,.19,ZM],nar?'memory':'memory slices (L2, DRAM)',{al:'right',fs:12.5,b:1,dx:-6,c:P.ink});
    if(k===1||k===2)R.label([xm(7)+.45,.19,ZM],'one pool for A and B',{al:'left',fs:12.5,b:1,dx:6,c:P.bad,a:e,wide:1});
    // compute: 7 columns x 6 time slots
    for(let c=0;c<NC;c++)for(let t=0;t<NT;t++){const p=[xc(c),YC,zt(t)],s=[.84,.34,.4];
      if(k===0){R.box(p,s,{fill:P.paper,shadow:false});continue}
      if(k===1){R.box(p,s,{fill:mix(P.paper,t%2?B:A,.6*e+.1),shadow:false});continue}
      if(k===2){const wa=s[0]*MPS[t],wb=(s[0]-wa)*(.3+.7*e);R.box([p[0]-s[0]/2+wa/2,YC,p[2]],[wa-.02,s[1],s[2]],{fill:mix(P.paper,A,.6),shadow:false});R.box([p[0]-s[0]/2+wa+wb/2,YC,p[2]],[wb-.02,s[1],s[2]],{fill:mix(P.paper,B,.6),shadow:false});continue}
      const col=k===3?(c<4?A:B):seven[c];R.box(p,s,{fill:mix(P.paper,col,.6*e+.1),shadow:false})}
    R.label([xc(0)-.5,YC+.17,zt(0)],nar?'compute':'compute slices (SMs)',{al:'right',fs:12.5,b:1,dx:-6,c:P.ink});
    R.label([xc(6)+.5,YC,zt(5)],'time',{al:'left',fs:12,dx:6,dy:4,c:P.mute});R.line([[xc(6)+.55,YC,zt(0)],[xc(6)+.55,YC,zt(5)+.2]],{c:P.mute,w:1.2,head:7});
    // the jobs and their data: flows from compute to memory
    if(k>=1){const fl=(x0,x1,c,a)=>R.flowArc([x0,YC+.36,zt(5)+.2],[x1,.38,ZM-.2],.3,{c,a,r:.085,n:7,speed:1.2});
      if(k===1||k===2){fl(xc(1),xm(5),A,e*.9);fl(xc(5),xm(1),B,e*.9);fl(xc(3),xm(3),A,e*.6)}
      else if(k===3){fl(xc(1),xm(1),A,e);fl(xc(2),xm(3),A,e*.8);fl(xc(5),xm(5),B,e);fl(xc(4),xm(6),B,e*.8)}
      else for(let c=0;c<NC;c++)fl(xc(c),xm(c),seven[c],e*.85)}
    // MIG: the cut, and the instance names
    if(k===3){R.glass([(xc(3)+xc(4))/2,0,-1.9],[0,1.2,0],[0,0,4.2],{c:P.ink,a:e*.6,nu:2,nv:6,th:.02});
      R.label([xc(1.5),YC+.4,-1.8],'A: 4g.20gb',{fs:13,b:1,mono:true,dy:-12,c:A,a:e});R.label([xc(5),YC+.4,-1.8],'B: 3g.20gb',{fs:13,b:1,mono:true,dy:-12,c:B,a:e})}
    if(k===4)R.label([0,YC+.4,-1.8],'7 x 1g.5gb',{fs:13,b:1,mono:true,dy:-12,c:P.ink,a:e});
    if(k===1)R.label([0,YC+.4,-1.8],'A, B, A, B: one context at a time',{fs:13,b:1,dy:-12,c:P.ink,a:e});
    if(k===2)R.label([0,YC+.4,-1.8],'A and B at once, merged',{fs:13,b:1,dy:-12,c:P.ink,a:e});
    if(k===0){R.box([-1.6,1.55,-1.0],[.7,.4,.5],{fill:mix(P.paper,A,.6)});R.label([-1.6,1.95,-1.0],'job A',{fs:12.5,b:1,dy:-10,c:A});
      R.box([1.6,1.55,-1.0],[.7,.4,.5],{fill:mix(P.paper,B,.6)});R.label([1.6,1.95,-1.0],'job B',{fs:12.5,b:1,dy:-10,c:B})}
  }
  const full={cam:[.4,.72],bounds:[[-3.7,0,-1.9],[3.7,1.2,2.1]]};
  S3.stage({id:'stg-share',list:'sx-share',fig:'Fig. 8 · one GPU, two jobs',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4800,draw,
    view:k=>k===0?{cam:full.cam,bounds:[[-3.7,0,-1.9],[3.7,2.0,2.1]]}:null,
    margin:w=>w<520?[18,10,18,10]:[26,120,20,150]});
})();
