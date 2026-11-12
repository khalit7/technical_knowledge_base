// ---- Scene, Fig. 1 (the idea): this page's cluster and one call y = f.remote(x) through it (renderer v2) ----
// The message order is the design's (the Ownership paper and Ray's architecture whitepaper); the cluster's shape (0 CPUs on the head,
// 2 CPUs, 2 fake_gpu and an 80 MB store per worker), the idle memory and the two read times on w2 are this page's runs (window.RY).
(function(){
  if(!document.getElementById('stg-hero')||!window.RY||!window.RYG)return;const {at,off,lerp,mix}=S3;
  const Y=window.RY,G=window.RYG,M=Y.mem_idle_mb,R16=Y.objects.read16,MB=Y.spill.store_mb;
  const ms=s=>s<.1?Math.round(s*1000)+' ms':s.toFixed(2)+' s';
  window.RY_HERO={r0:R16[0].secs,r1:R16[1].secs};
  const HLP=k=>k===1?[G.NX[0],0,1.75]:k===3||k===4?[-1.9,0,2.4]:[0,0,2.4];
  const inV=(k,i)=>k===1?i===0:k===3||k===4?i<2:true;
  function draw(R,k,e){const HL=HLP(k),P=R.P,lab=(p,t,o)=>R.label(p,t,Object.assign({mono:true,fs:12},o||{}));R.grid(-6.2,6.2,-2.2,2.2,.5);
    const fin=k===6?1-e:1;
    // 1. the three nodes; what each step is not about recedes
    const dimW=i=>k===0?1:k===1?.3:k===2?(i===1?1:.3):k===3||k===4?(i===1?1:.3):k===5?1:.45;
    G.slab(R,0,{tint:P.c4});
    R.box(G.GCS,[1.2,.55,.8],{fill:mix(P.paper,P.c4,.45),a:k===0?1:.3});
    lab([G.GCS[0]-.62,.3,G.GCS[2]],'GCS',{al:'right',dx:-4,b:1,c:P.c4,a:k===0?1:.55});
    G.raylet(R,G.HRL,{a:k===0||k===2?1:.3});
    lab([G.HRL[0],.46,G.HRL[2]],'raylet',{a:k===0||k===2?1:.4,wide:1});
    R.box(G.DRV,[1.05,.5,.75],{fill:mix(P.paper,P.acc,.35),a:1});
    lab([G.DRV[0],.2,G.DRV[2]+.4],'driver',{dy:12,b:1,c:P.acc,a:k<=1||k===6?1:.7,wide:k>1?1:0});
    [1,2].forEach(i=>{G.wnode(R,i,{dim:dimW(i),gpus:true});
      if(!inV(k,i))return;
      lab([G.RL(i)[0],.46,G.RL(i)[2]],'raylet',{a:dimW(i)*(k===2&&i===1?1:.75),wide:1});
      lab([G.ST(i)[0],.22,G.ST(i)[2]-.35],'store '+MB+' MB',{c:P.c1,a:Math.max(.45,dimW(i)),wide:1})});
    if(inV(k,0))lab([G.NX[0]-G.SW/2+.1,0,G.SD/2],'head · 0 CPUs',{al:'left',dy:14,b:1,c:P.c4,a:k===0?1:.6});
    if(inV(k,1))lab([G.NX[1]-G.SW/2+.1,0,G.SD/2],'w1 · 2 CPUs',{al:'left',dy:14,b:1,a:k===0||(k>=2&&k<=5)?1:.6});
    if(inV(k,2))lab([G.NX[2]-G.SW/2+.1,0,G.SD/2],'w2 · 2 CPUs',{al:'left',dy:14,b:1,a:k===0||k===5?1:.6});
    if(k===0)lab(HL,'idle memory: head '+M.head+' MB, w1 '+M.w1+' MB, w2 '+M.w2+' MB',{b:1,a:e,wide:1});
    // 2. the owner's table: a glass plate over the driver, written as the call goes on
    const ta=(k===0?0:k===1?e:fin)*(k===2||k===3?.4:1);
    if(ta>0){const o0=[G.DRV[0]-.8,.8,G.DRV[2]],X=G.DRV[0];R.glass(o0,[1.6,0,0],[0,1.15,0],{c:P.acc,a:ta,nu:4,nv:3});
      const loc=k<=3?'at: pending':k===4?'at: w1':'at: w1, w2',rows=k===6?['refs 0: freed','copies freed','lineage dropped']:['refs 1',loc,'lineage: f(x)'];
      // close on the head (step 2) the rows sit on the plate; in the wider views they are one line above it, where they stay readable
      if(k===1){lab([X,1.95,G.DRV[2]],"owner's table for y",{dy:-10,b:1,c:P.acc,a:ta});rows.forEach((t,j)=>lab([X,1.66-.32*j,G.DRV[2]],t,{a:ta,b:j===2}))}
      else{lab([X,1.95,G.DRV[2]],"owner's table for y",{dy:-30,b:1,c:P.acc,a:ta});lab([X,1.95,G.DRV[2]],rows.join(' · '),{dy:-12,a:ta,b:k>=4,c:k>=4?P.acc:P.ink,wide:1})}}
    if(k===1)lab(HL,'y = f.remote(x) returns a ref at once; nothing has run',{b:1,c:P.acc,a:e,wide:1});
    // 3. the lease: the head's raylet has 0 CPUs, so it spills the request back; w1's raylet grants a pooled worker
    if(k===2){R.flowArc([G.DRV[0]-.3,.5,G.DRV[2]],[G.HRL[0]+.3,.3,G.HRL[2]],.45,{c:P.c3,a:Math.min(1,e*2),r:.08,n:6,speed:1.2});
      R.flowArc([G.HRL[0],.32,G.HRL[2]],[G.RL(1)[0],.32,G.RL(1)[2]],1.1,{c:P.c3,a:e,r:.085,n:10,speed:1.5});
      lab(HL,'lease 1 CPU? head: 0 CPUs, try w1 · w1 grants a worker',{b:1,c:P.c3,a:e,wide:1})}
    // 4. the task goes straight to the leased worker
    const hot=k>=3&&k<=4;
    if(hot)G.worker(R,G.WK(1,0),{c:P.acc,h:.52});
    if(k===3){R.flowArc([G.DRV[0]+.3,.55,G.DRV[2]],[G.WK(1,0)[0],.6,G.WK(1,0)[2]],1.3,{c:P.acc,a:e,r:.075,n:10,speed:1.6});
      lab(HL,'push task f(x) to the leased worker · the GCS is not on the path',{b:1,c:P.acc,a:e,wide:1})}
    if(hot)lab([G.WK(1,0)[0],.7,G.WK(1,0)[2]],'f(x) runs',{dy:-8,b:1,c:P.acc,a:k===3?e:1});
    // 5. the 8 MB result goes into w1's store; the owner learns where it is
    const ya=k<4?0:k===4?e:fin,ca=k<5?0:k===5?at(k,e,5):fin;
    if(ya>0){G.obj(R,G.OBJ(1,0),{a:ya,c:mix(P.paper,P.acc,.6)});lab([G.OBJ(1,0)[0]+.3,.5,G.OBJ(1,0)[2]],'y · 8 MB',{al:'left',dx:6,b:1,c:P.acc,a:ya})}
    if(k===4){R.flowArc([G.WK(1,0)[0]+.2,.5,G.WK(1,0)[2]],[G.OBJ(1,0)[0],.45,G.OBJ(1,0)[2]],.5,{c:P.acc,a:e,r:.08,n:7,speed:1.2});
      R.flowArc([G.WK(1,0)[0],.65,G.WK(1,0)[2]],[G.DRV[0]+.4,.7,G.DRV[2]],1.1,{c:P.acc,a:e*.6,r:.04,n:4,speed:1.3});
      lab(HL,'over 100 KB: stored on w1 · the worker tells the owner "y is at w1"',{b:1,c:P.acc,a:e,wide:1})}
    // 6. a reader on w2 pulls a copy into w2's store; a second read there is local
    if(k===5){R.flowArc([G.OBJ(1,0)[0],.45,G.OBJ(1,0)[2]],[G.OBJ(2,0)[0],.45,G.OBJ(2,0)[2]],1,{c:P.acc,a:e,r:.08,n:12,speed:1.5});
      G.worker(R,G.WK(2,0),{c:P.c1});lab([G.WK(2,0)[0],.7,G.WK(2,0)[2]],'reader',{dy:-8,b:1,a:e});
      lab(HL,'16 MB measured: first read on w2 '+ms(R16[0].secs)+', the second '+ms(R16[1].secs),{b:1,c:P.acc,a:e,wide:1})}
    if(ca>0){G.obj(R,G.OBJ(2,0),{a:ca,c:mix(P.paper,P.acc,.6)});lab([G.OBJ(2,0)[0]+.3,.5,G.OBJ(2,0)[2]],'copy of y',{al:'left',dx:6,b:1,c:P.acc,a:ca})}
    if(k===6)lab(HL,'del y: count 0, both copies and the lineage freed',{b:1,c:P.acc,a:e,wide:1});
  }
  const full={cam:[.12,.95],bounds:[[-5.7,0,-1.5],[5.7,2.1,2.5]]};
  const st=S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one call through this page\'s cluster',cam:full.cam,bounds:full.bounds,aspect:.44,dur:1400,hold:5200,draw,
    view:k=>k===1?{cam:[.25,.75],bounds:[[-5.7,0,-1.5],[-2,2.2,1.9]]}:k===3||k===4?{cam:[.2,.8],bounds:[[-5.7,0,-1.5],[1.9,2.1,2.5]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,16,18,16]});
  (window.RYSTG=window.RYSTG||{})['stg-hero']=st;
})();
