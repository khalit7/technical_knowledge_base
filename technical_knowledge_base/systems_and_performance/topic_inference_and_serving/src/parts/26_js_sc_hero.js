// ---- Scene, Fig. 1 (the map): one request through a serving fleet (renderer v2: a few large objects per step, the camera moving in
// close, flowing dots wherever data moves). A map, not a mechanism: each step lights the part one child page owns, and the step list
// (sx-hero) links that child's own figure.
// Numbers from RDD (src/read/recompute.py, the Capacity planner's step model for the running example: Llama 3.1 70B in FP8 on one H200):
// weights 72.66 GB, prefill 423.5 ms, decode 21.6 ms alone, 141 conversations, 2,982 tokens a second at 141, 10 H200s at peak; the
// cache left after the weights (about 54 GB) is the page's own figure from section 4; the laptop's 196 tokens a second is measured
// on the Engine bench (RDD.meas). Counts drawn are illustrative and say so: three replicas, eight layer plates of ten layers, the blocks
// and their owners, five users.
// Colours: orange tokens, blue weights, purple KV cache, gold the router, green the sampler, teal the drafter.
(function(){
  if(!document.getElementById('stg-hero')||!window.RDD)return;const {mix,lerp}=S3;const D=RDD.life,M=RDD.meas,C=RDD.cost;
  const nf=(v,d)=>Number(v).toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const B141=RDD.batch[RDD.batch.length-1],CACHE=54; // GB left for the cache on one H200 (section 4)
  // where things sit
  const UX=-8.2,UZ=[-1.4,-.7,0,.7,1.4],RT=[-6.0,0,0],SC=[-2.45,.06,.5],SA=[2.55,.06,-.75],DR=[2.55,.06,1.0];
  const PX=i=>-1.4+i*.42,PZ0=-1.6,PZ1=.1,PY=.12,PH=1.45,TY=.78,TZ=-.75;
  const NCOL=10,NROW=4,BX=c=>-1.45+c*.32,BZ=r=>.6+r*.29;
  // block owners: -1 free, 0 this request (filled during prefill), 1..5 other conversations (illustrative)
  const OWN=[2,2,2,3,3,1,1,1,1,4, 2,5,5,3,-1,0,0,0,4,4, 5,5,1,-1,0,0,0,0,-1,3, 4,-1,-1,0,0,-1,-1,-1,-1,-1];
  const REP=[[-1.6,0,-4.3],[2.4,0,-4.3]],LP=[6.5,0,-.9];
  function draw(R,k,e){const P=R.P,nar=R.W<520;R.grid(-9,8,-5.6,2.9,.5);
    const OC=[P.c4,P.c1,P.c3,P.c5,P.c6,P.c2];
    const L=[['all'],['usr','rt','rep','bg','pool'],['sch','pool','w','bars'],['sch','w','pool'],['w','pool','usr2'],['w','samp','usr','sch'],['dr','w','samp'],['bg','rep','rt','usr'],['lap']];
    const has=(j,g)=>{const s=L[Math.max(0,Math.min(L.length-1,j))];return s.includes('all')||s.includes(g)};
    const lit=g=>{const A0=j=>has(j,g)?1:.22;return lerp(A0(k-1),A0(k),e)};
    const on=s=>k===s?e:0;
    // ---- users and agents ----
    const au=Math.max(lit('usr'),lit('usr2')*.6);
    UZ.forEach((z,i)=>{R.box([UX,0,z],[.42,.05,.42],{a:au,shadow:false});R.ball([UX,.22,z],.15,{c:P.c2,a:au})});
    // ---- the router ----
    const ar=lit('rt');R.box(RT,[.95,.55,1.2],{fill:mix(P.paper,P.c5,.5),a:ar});
    // ---- the featured replica: a tray, the scheduler, eight layer plates, the block pool, the sampler, the drafter ----
    const arep=Math.max(lit('rep'),.22);
    R.box([.5,0,.2],[7.3,.06,4.1],{fill:mix(P.paper,P.c1,.08),a:Math.max(arep,lit('sch'),lit('w')),dz:100});
    const as=lit('sch');R.box(SC,[.8,.5,.8],{fill:mix(P.paper,P.ink,.14),a:as});
    const aw=lit('w'),wt=k===4?.55:k===3?.3:.38;
    for(let i=0;i<8;i++){const hot=(k===3||k===4)?1:0;R.glass([PX(i),PY,PZ0],[0,0,PZ1-PZ0],[0,PH,0],{c:mix(P.c1,P.c2,k===3?.35*e:0),a:aw*(hot?.95:.8),nu:3,nv:4})}
    const ap=lit('pool');
    OWN.forEach((o,j)=>{const c=j%NCOL,r=Math.floor(j/NCOL),p=[BX(c),.06,BZ(r)];
      let a=ap,fill=o<0?P.paper:mix(P.paper,OC[o],.55);
      if(o===0){const f=k<3?0:k===3?Math.min(1,Math.max(0,e*1.4-(c-3)*.08)):1;fill=f>0?mix(P.paper,P.c2,.7*f):P.paper}
      R.box(p,[.25,.07,.23],{fill,a,shadow:false,lw:.6})});
    const asa=lit('samp');R.box(SA,[.62,.42,.62],{fill:mix(P.paper,P.c3,.5),a:asa});
    const ad=lit('dr');R.box(DR,[.5,.32,.5],{fill:mix(P.paper,P.c6,.5),a:ad});
    // ---- two more replicas behind, and a laptop to the right ----
    const ab=lit('bg');
    REP.forEach((c,i)=>{R.box(c,[3.2,.06,2.2],{fill:mix(P.paper,P.c1,.08),a:ab,dz:100});R.box([c[0],.06,c[2]],[1.7,.4,1.2],{fill:mix(P.paper,k===7?(i?P.c4:P.c2):P.c1,k===7?.45*e+.25:.25),a:ab})});
    const al=lit('lap');
    R.box(LP,[2.3,.08,1.6],{fill:mix(P.paper,P.ink,.1),a:al,dz:100});
    R.box([LP[0]-.5,.08,LP[2]],[.8,.2,.55],{fill:mix(P.paper,P.c1,.45),a:al});
    R.box([LP[0]+.55,.08,LP[2]],[.5,.14,.5],{fill:mix(P.paper,P.ink,.25),a:al});
    // ---- step 0: the whole loop, labelled ----
    if(k===0){const a=e;
      UZ.forEach(z=>R.flowArc([UX+.2,.3,z],[RT[0]-.45,.35,RT[2]],.35,{c:P.c2,a,r:.05,n:4,speed:.9}));
      R.flowArc([RT[0]+.5,.35,0],[SC[0]-.42,.35,SC[2]],.5,{c:P.c2,a,r:.06,n:5,speed:1});
      R.flowArc([SA[0],.5,SA[2]],[UX,.45,0],2.2,{c:P.c3,a:a*.8,r:.05,n:16,speed:1.4});
      R.label([UX,.4,UZ[0]],'users and agents',{fs:12.5,b:1,dy:-14,c:P.c2,a});
      R.label([RT[0],.6,RT[2]],'router',{fs:12.5,b:1,dy:-12,c:P.c5,a});
      R.label([.2,PY+PH,-.75],nar?'one replica':'one replica: a serving engine on one H200',{fs:12.5,b:1,dy:-14,c:P.ink,a});
      R.label([REP[0][0],.5,REP[0][2]],'replica 2',{fs:12,dy:-12,c:P.mute,a,wide:1});R.label([REP[1][0],.5,REP[1][2]],'replica 3',{fs:12,dy:-12,c:P.mute,a,wide:1});
      R.label([LP[0],.3,LP[2]],'a laptop',{fs:12.5,b:1,dy:-14,c:P.ink,a});
      R.label([0,1.6,-3],'tokens stream back',{fs:12,dy:-8,c:P.c3,a,wide:1})}
    // ---- step 1: the router sends the request to the replica holding its prefix ----
    if(k===1){const a=e;
      UZ.forEach(z=>R.flowArc([UX+.2,.3,z],[RT[0]-.45,.35,RT[2]],.35,{c:P.c2,a,r:.05,n:4,speed:.9}));
      R.flowArc([RT[0]+.5,.35,0],[SC[0]-.42,.35,SC[2]],.5,{c:P.c2,a,r:.07,n:7,speed:1.1});
      REP.forEach(c=>R.arc([RT[0]+.4,.35,-.3],[c[0]-.9,.3,c[2]+.6],.6,{c:P.mute,w:1.3,a:a*.7,dash:[5,4]}));
      [15,16,17,25].forEach(j=>R.glow([BX(j%NCOL),.12,BZ(Math.floor(j/NCOL))],.35,{c:P.c4,a:a*.8}));
      R.label([RT[0],.6,RT[2]],nar?'router':'prefix-aware router',{fs:12.5,b:1,dy:-12,c:P.c5,a});
      R.label([BX(6),.15,BZ(3)],nar?'its prefix is here':'this replica holds its prefix',{fs:12.5,b:1,dy:18,c:P.c4,a});
      R.label([RT[0]+1.6,0,2.3],nar?'13,000 → 5,804':'prompt tokens computed: 13,000 round-robin, 5,804 by prefix',{fs:12,dy:16,c:P.ink,a,wide:nar?1:0})}
    // ---- step 2: the scheduler, the block pool, and the memory to scale ----
    if(k===2){const a=e;
      for(let i=0;i<4;i++)R.ball([SC[0]-1.1+i*.22,.12,SC[2]+.1],.09,{c:i<2?P.c2:mix(P.paper,P.c2,.5),a});
      R.flowArc([SC[0]+.4,.4,SC[2]+.1],[BX(4),.16,BZ(1)],.35,{c:P.c4,a,r:.05,n:5,speed:.8});
      const sc=1.4/D.weights_gb,bx=3.3,bz=1.75;
      [[bx,D.weights_gb,P.c1,nar?nf(D.weights_gb,2)+' GB':'weights · '+nf(D.weights_gb,2)+' GB'],[bx+.75,CACHE,P.c4,nar?'≈ '+CACHE+' GB':'KV cache · about '+CACHE+' GB']].forEach(([x,v,c,t],i)=>{
        R.box([x,0,bz],[.6,.05,.6],{a,shadow:false});R.box([x,.05,bz],[.42,v*sc,.42],{fill:mix(P.paper,c,.55),a});
        if(i)R.label([x-.1,0,bz+.45],t,{mono:true,fs:12.5,b:1,dy:16,c,a});else R.label([x,.05+v*sc,bz],t,{mono:true,fs:12.5,b:1,dy:-10,c,a,al:'right',dx:16})});
      R.label([SC[0],.56,SC[2]],'scheduler',{fs:12.5,b:1,dy:-12,c:P.ink,a});
      R.label([BX(4.5),.13,BZ(3)],nar?D.seqs_fit+' conversations':'block pool: room for '+D.seqs_fit+' conversations',{fs:12.5,b:1,dy:18,c:P.c4,a});
      R.label([PX(4),PY+PH,-.75],nar?'80 layers':'80 layers, drawn as 8 plates',{fs:12,dy:-12,c:P.c1,a})}
    // ---- step 3: prefill, the whole prompt through every layer, keys and values written into the pool ----
    if(k===3){const a=e,path=[[SC[0]+.42,TY,SC[2]-.4],[PX(0)-.3,TY,TZ],[PX(7)+.35,TY,TZ]];
      [-.35,-.12,.12,.35].forEach((dz,i)=>R.flow(path.map((p,j)=>j?[p[0],p[1]+dz*.4,p[2]+dz]:p),{c:P.c2,a,r:.06,n:22,speed:1.5,top:1}));
      [0,2,4,6].forEach(i=>R.flowArc([PX(i)+.05,PY+.1,PZ1],[BX(3+i*.6),.16,BZ(1+(i>3?1:0))],.25,{c:P.c4,a,r:.045,n:4,speed:.8}));
      R.label([PX(3.5),PY+PH,-.75],nar?'prefill: 2,000 tokens':'prefill: 2,000 tokens, one pass',{fs:12.5,b:1,dy:-14,c:P.c2,a});
      R.label([PX(7)+.4,TY,TZ],nar?nf(D.t_pre_ms/1000,2)+' s':nf(D.t_pre_ms/1000,2)+' s · compute-bound',{fs:12.5,b:1,al:'left',dx:10,c:P.ink,a});
      R.label([BX(9),.13,BZ(2)],nar?'625 MiB of cache':'keys and values: 625 MiB',{fs:12.5,al:'left',dx:14,c:P.c4,a,b:1})}
    // ---- step 4: decode, one token per user per step, the weights read once for all of them ----
    if(k===4){const a=e,cols=[P.c2,P.c4,P.c3,P.c5,P.c6];
      cols.forEach((c,i)=>{const dz=(i-2)*.16;R.flow([[SC[0]+.42,TY,SC[2]-.4],[PX(0)-.3,TY+dz*.3,TZ+dz],[PX(7)+.35,TY+dz*.3,TZ+dz]],{c,a,r:.07,n:3,speed:.9,top:1})});
      [1,3,5,7].forEach(i=>R.flowArc([BX(i+1),.14,BZ(1)],[PX(i),PY+.2,PZ1],.3,{c:P.c4,a:a*.85,r:.045,n:3,speed:.7}));
      R.label([PX(3.5),PY+PH,-.75],nar?'decode: 1 token per user':'decode: one token per user per step',{fs:12.5,b:1,dy:-14,c:P.c2,a});
      R.label([PX(7)+.4,TY,TZ],nar?D.t_dec_ms+' ms alone':D.t_dec_ms+' ms a step alone · bandwidth-bound',{fs:12.5,b:1,al:'left',dx:10,c:P.ink,a});
      R.label([BX(9),.13,BZ(2)],nar?nf(B141.tot)+' tok/s at '+B141.B:B141.B+' users on one read: '+nf(B141.tot)+' tok/s',{fs:12.5,al:'left',dx:14,c:P.ink,a,b:1})}
    // ---- step 5: the sampler turns scores into one token; it streams out and comes back as the next input ----
    if(k===5){const a=e,o0=[SA[0]-.42,.62,SA[2]],nu=10,cw=.84/nu;
      R.flow([[PX(7)+.1,TY,TZ],[SA[0]-.3,TY,SA[2]]],{c:P.c1,a,r:.06,n:4,speed:.9});
      R.glass(o0,[.84,0,0],[0,.5,0],{c:P.c3,a,nu,nv:4});
      R.glow([o0[0]+cw*6.5,.62+.5*.625,SA[2]],.18,{c:P.c2,a});
      R.flowArc([SA[0],.5,SA[2]],[UX,.45,0],2.2,{c:P.c3,a:a*.85,r:.05,n:16,speed:1.4});
      R.flowArc([SA[0],.45,SA[2]+.3],[SC[0]+.2,.5,SC[2]],.9,{c:P.c2,a,r:.06,n:6,speed:1});
      R.label([SA[0],1.15,SA[2]],nar?'128,256 scores':'sampler: 128,256 scores → 1 token',{fs:12.5,b:1,dy:-10,c:P.c3,a});
      R.label([SC[0],.56,SC[2]],nar?'next input':'the token is the next input',{fs:12,dy:-12,c:P.c2,a})}
    // ---- step 6: a drafter guesses k tokens; one pass of the model checks them ----
    if(k===6){const a=e;
      for(let i=0;i<4;i++)R.ball([DR[0]-.3+i*.2,.5,DR[2]],.08,{c:P.c6,a});
      R.flowArc([DR[0]-.3,.5,DR[2]],[PX(0)-.3,TY,TZ],.9,{c:P.c6,a,r:.06,n:6,speed:1});
      [-.12,-.04,.04,.12].forEach(dz=>R.flow([[PX(0)-.3,TY,TZ+dz],[PX(7)+.35,TY,TZ+dz]],{c:P.c6,a,r:.06,n:3,speed:.9,top:1}));
      R.label([DR[0],.5,DR[2]],nar?'draft: k guesses':'drafter: guesses k tokens',{fs:12.5,b:1,dy:-14,c:P.c6,a});
      R.label([PX(3.5),PY+PH,-.75],nar?'one pass checks all k':'one pass of the model checks all k',{fs:12.5,b:1,dy:-14,c:P.ink,a});
      R.label([PX(7)+.4,TY,TZ],nar?'4 tokens: 2.2× one':'a pass over 4 tokens: 2.2× one (laptop)',{fs:12,al:'left',dx:10,c:P.ink,a,wide:nar?1:0})}
    // ---- step 7: many GPUs: a fleet of copies, and prefill and decode on separate pools with the cache crossing ----
    if(k===7){const a=e;
      R.flowArc([REP[0][0]+.85,.45,REP[0][2]],[REP[1][0]-.85,.45,REP[1][2]],.6,{c:P.c4,a,r:.08,n:9,speed:1.1});
      R.flowArc([RT[0]+.4,.35,-.3],[REP[0][0]-.9,.3,REP[0][2]+.5],.6,{c:P.c2,a,r:.06,n:5,speed:1});
      R.label([REP[0][0],0,REP[0][2]+1.1],'prefill pool',{fs:12.5,b:1,dy:14,c:P.c2,a});
      R.label([REP[1][0],0,REP[1][2]+1.1],'decode pool',{fs:12.5,b:1,dy:14,c:P.c4,a});
      R.label([.4,1.2,-4.3],nar?'cache: 625 MiB, ≈ 13 ms':'the cache crosses: 625 MiB, about 13 ms at 400 Gb/s',{fs:12.5,b:1,dy:-12,c:P.c4,a});
      R.label([.35,0,2.7],nar?C.gpus+' H200s at peak':C.gpus+' H200s for 20 requests a second at peak',{fs:12.5,b:1,dy:16,c:P.ink,a})}
    // ---- step 8: a laptop, one user, bandwidth over bytes ----
    if(k===8){const a=e;
      R.flow([[LP[0]-.1,.2,LP[2]],[LP[0]+.3,.2,LP[2]]],{c:P.c1,a,r:.06,n:4,speed:.6});
      R.label([LP[0]-.5,.28,LP[2]],nar?'memory':'unified memory, 200 GB/s rated',{fs:12.5,b:1,dy:-12,c:P.c1,a,al:'right',dx:-4});
      R.label([LP[0]+.55,.22,LP[2]],'M1 Pro',{fs:12.5,b:1,dy:-12,c:P.ink,a,al:'left',dx:4});
      R.label([LP[0],0,LP[2]+.8],nar?M.tg_06q4+' tok/s':'Qwen3-0.6B Q4_K_M: '+M.tg_06q4+' tok/s, one user',{fs:12.5,b:1,dy:16,c:P.ink,a})}
  }
  const full={cam:[.42,.72],bounds:[[-8.6,0,-5.5],[7.7,1.5,2.4]]};
  const eng={cam:[.4,.62],bounds:[[-3.1,0,-1.8],[3.6,1.6,2.0]]};
  const V=[full,{cam:[.4,.72],bounds:[[-8.6,0,-5.5],[4.1,1.2,2.4]]},
    {cam:[.4,.62],bounds:[[-3.1,0,-1.8],[4.6,1.6,2.2]]},eng,eng,{cam:[.4,.62],bounds:[[-3.1,0,-1.8],[3.6,1.8,2.0]]},eng,
    {cam:[.42,.74],bounds:[[-6.6,0,-5.5],[4.2,1,2.6]]},{cam:[.45,.6],bounds:[[5.1,0,-2.0],[7.9,.7,.3]]}];
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one request through a serving fleet',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:5200,draw,
    view:k=>V[k]||full,margin:w=>w<520?[18,8,16,8]:[24,20,20,20]});
})();
