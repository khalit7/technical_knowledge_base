// ---- Scene, Fig. 3: one block of 4 x 4 threads computes a 4 x 4 tile of C = A x B with K = 8 (illustrative sizes, the same as the 2D
// animation this replaced, which came from the parent root). A (4 x 8) and B (8 x 4) lie in global memory as glass plates; on every
// element stands a bar as tall as the number of times it has been fetched from global memory. Without tiles every element is fetched
// by all four threads that need it (2T^2K = 256 fetches); staged through shared memory it is fetched once (2TK = 64), in two phases of 4.
// Counts are computed below from T, K and the phase width, as the old animation did. Steps: #sx-tile. ----
(function(){
  if(!document.getElementById('stg-tile'))return;const {at,off,mix}=S3;
  const T=4,K=8,TK=4,G=.42;
  const AX=k=>-4.4+k*G,AZ=r=>-.63+r*G,BX=c=>1.55+c*G,BZ=k=>-1.47+k*G,SY=1.5,CY=2.7,SA=c=>-1.12+c*G*.78,SB=c=>.22+c*G*.78,SZ=r=>-.5+r*G*.78;
  const H1=.22;   // bar height of one fetch
  // global fetches per element after step k: direct (step 2) 4 each; staged: the first phase's columns from step 3, the second's from step 5
  const fetchA=(k,col,stg)=>stg?(k>=4?1:k>=2&&col<TK?1:0):(k>=1?T:0);
  function draw(R,k,e){const P=R.P;R.grid(-5,4,-2.2,2.2,.5);
    const stg=k>=2,grow=(v,on)=>on?v*e:v;
    // the two matrices in global memory
    R.glass([AX(0)-G/2,.01,AZ(0)-G/2],[K*G,0,0],[0,0,T*G],{c:P.c1,a:.9,nu:K,nv:T,th:.03});
    R.glass([BX(0)-G/2,.01,BZ(0)-G/2],[T*G,0,0],[0,0,K*G],{c:P.c1,a:.9,nu:T,nv:K,th:.03});
    R.label([AX(3.5),0,AZ(T-1)+G/2],'A · 4 x 8 in global memory',{mono:true,fs:12.5,b:1,dy:16,c:P.c1,wide:1});
    R.label([BX(1.5),0,BZ(K-1)+G/2],'B · 8 x 4',{mono:true,fs:12.5,b:1,dy:16,c:P.c1,wide:1});
    // fetch-count bars: the direct count stays as a faint ghost once tiles are used, so the two can be compared
    for(let r=0;r<T;r++)for(let c=0;c<K;c++){
      const now=fetchA(k,c,stg),newly=(k===1)||(k===2&&c<TK)||(k===4&&c>=TK),h=grow(now*H1,newly);
      if(stg)R.box([AX(c),.04,AZ(r)],[G*.55,T*H1,G*.55],{fill:P.paper,a:.12,shadow:false,lw:.5});
      if(h>.005)R.box([AX(c),.04,AZ(r)],[G*.55,h,G*.55],{fill:mix(P.paper,P.c1,.7),shadow:false,lw:.6})}
    for(let kk=0;kk<K;kk++)for(let c=0;c<T;c++){
      const now=fetchA(k,kk,stg),newly=(k===1)||(k===2&&kk<TK)||(k===4&&kk>=TK),h=grow(now*H1,newly);
      if(stg)R.box([BX(c),.04,BZ(kk)],[G*.55,T*H1,G*.55],{fill:P.paper,a:.12,shadow:false,lw:.5});
      if(h>.005)R.box([BX(c),.04,BZ(kk)],[G*.55,h,G*.55],{fill:mix(P.paper,P.c1,.7),shadow:false,lw:.6})}
    if(k>=1)R.label([AX(3.5),0,AZ(T-1)+G/2],k===1?'bar: fetches, 4 each':k===4?'bar: fetches, 1 each':'bar: fetches · faint: before',{mono:true,fs:12,dy:32,c:P.c1,a:k===1?e:1,wide:1});
    // the shared-memory tiles As and Bs, raised in the middle
    const sa=stg?1:.15,sf=stg?1:0;
    R.glass([SA(0)-G*.39,SY,SZ(0)-G*.39],[T*G*.78,0,0],[0,0,T*G*.78],{c:P.c3,a:sa,nu:T,nv:T,th:.05});
    R.glass([SB(0)-G*.39,SY,SZ(0)-G*.39],[T*G*.78,0,0],[0,0,T*G*.78],{c:P.c3,a:sa,nu:T,nv:T,th:.05});
    if(stg)R.label([(SA(0)+SB(T-1))/2,SY,SZ(T-1)+G*.4],'As, Bs · shared memory',{mono:true,fs:12.5,b:1,dy:14,c:P.c3,wide:1});
    // the block's 16 threads, each holding one element of C; it darkens as its sum accumulates
    const done=k===0?0:k===1?K*e:k===2?0:k===3?TK*e:TK+TK*e;
    for(let r=0;r<T;r++)for(let c=0;c<T;c++)R.box([-.53+c*G*.8,CY,-.5+r*G*.8],[G*.6,.18,G*.6],{fill:mix(P.paper,P.c2,.25+.65*done/K),shadow:false,lw:.6});
    R.label([0,CY+.18,-.5],'16 threads · one C tile',{mono:true,fs:12.5,b:1,dy:-14,c:P.c2,wide:1});
    // flows: global straight to the threads (no tiles); global into shared memory (a phase's copy); shared memory to the threads (reuse)
    if(k===1){for(let r=0;r<T;r++)R.flowArc([AX(3+(r%2)),.3,AZ(r)],[-.53,CY,-.5+r*G*.8],.5,{c:P.c1,a:e,r:.06,n:6,speed:1.4});
      for(let c=0;c<T;c++)R.flowArc([BX(c),.3,BZ(3+(c%2))],[-.53+c*G*.8,CY,.5],.5,{c:P.c1,a:e,r:.06,n:6,speed:1.4})}
    if(k===2||k===4){const k0=k===2?0:TK;for(let r=0;r<T;r++)R.flowArc([AX(k0+1.5),.3,AZ(r)],[SA(1.5),SY,SZ(r)],.35,{c:P.c1,a:e,r:.06,n:4,speed:1.2});
      for(let c=0;c<T;c++)R.flowArc([BX(c),.3,BZ(k0+1.5)],[SB(c),SY,SZ(1.5)],.35,{c:P.c1,a:e,r:.06,n:4,speed:1.2})}
    if(k===3||k===4){const a=k===3?e:.8;for(let i=0;i<T;i++){R.flow([[SA(1.5),SY+.08,SZ(i)],[-.53+i*G*.4,CY,-.5+i*G*.8]],{c:P.c3,a,r:.06,n:8,speed:1.6});
      R.flow([[SB(i),SY+.08,SZ(1.5)],[-.53+i*G*.8,CY,-.5+i*G*.4]],{c:P.c3,a,r:.06,n:8,speed:1.6})}}
    // the running count
    const g=k===0?0:k===1?2*T*T*K:k<4?2*T*TK:2*T*K;
    if(k>0)R.label([-.6,0,1.75],(k===1?'no tiles: ':'tiled: ')+g+' global fetches'+(k===4?' · 4 times fewer':''),{mono:true,fs:13,b:1,dy:14,c:P.ink});
  }
  const full={cam:[.08,.6],bounds:[[-4.7,0,-1.7],[3.3,2.9,1.9]]};
  const st=S3.stage({id:'stg-tile',list:'sx-tile',fig:'Fig. 3 · one tile, fetched once, reused from shared memory',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[26,16,40,16],
    // the camera turns a little per step; it never crops the scene
    view:k=>({cam:[-.06+.06*k,.6-.03*k],bounds:full.bounds})});
  (window.MHSTG=window.MHSTG||{})['stg-tile']=st;
})();
