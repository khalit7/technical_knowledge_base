// ---- Scene (Fig. 1): one token's dispatch through the expert-parallel group (renderer v2) ----
// The layout is the paper's (§3.1, §3.2, §2.1.2, §3.2.2): 64-way expert parallelism over 8 nodes of 8 H800s, so 4 routed experts per GPU (256 / 64);
// node-limited routing keeps the M = 4 nodes with the highest sum of the token's K_r / M = 2 best affinities on each, then the top 8 experts among them;
// the token crosses InfiniBand once per remote node, to the GPU with its own in-node index, and NVLink carries it on to the expert GPUs; combine is the reverse.
// The token's 256 affinities are illustrative (seeded random sigmoids, seed 17, chosen so that the token's own node is kept); the rule applied to them is the paper's.
(function(){
  if(!document.getElementById('stg-a2a'))return;const {at,off,mix}=S3;
  const SEED=17,SRC=3;
  const A=(function(){const r=mulberry32(SEED),aff=[];for(let e=0;e<256;e++){let s=0;for(let i=0;i<12;i++)s+=r();aff.push(1/(1+Math.exp(-1.5*(s-6))))}
    const score=[];for(let n=0;n<8;n++){const a=aff.slice(n*32,n*32+32).sort((x,y)=>y-x);score.push(a[0]+a[1])}
    const keep=score.map((v,i)=>[v,i]).sort((a,b)=>b[0]-a[0]).slice(0,4).map(x=>x[1]).sort((a,b)=>a-b);
    const cand=[];keep.forEach(n=>{for(let e=n*32;e<n*32+32;e++)cand.push([aff[e],e])});
    const top=cand.sort((a,b)=>b[0]-a[0]).slice(0,8).map(x=>x[1]).sort((a,b)=>a-b);
    const gpus=top.map(e=>e>>2),remote=keep.filter(n=>n!==0&&top.some(e=>(e>>5)===n));
    return {aff,score,keep,top,gpus,remote,off:top.filter(e=>(e>>5)!==0).length}})();
  window.V3A2A=A; // read by check_stages.mjs, which compares these counts with the step list
  // geometry: nodes in 2 rows of 4, each a slab with 8 GPUs in 2 rows of 4
  const nodeC=n=>[((n%4)-1.5)*3.9,0,(Math.floor(n/4)-.5)*3.1],SL=.1;
  const gpuC=g=>{const n=g>>3,i=g&7,c=nodeC(n);return [c[0]+((i%4)-1.5)*.78,SL,c[2]+(Math.floor(i/4)-.5)*.95]};
  const GH=.34,top3=g=>{const c=gpuC(g);return [c[0],c[1]+GH,c[2]]};
  const isExp=g=>A.gpus.includes(g),kept=n=>A.keep.includes(n),srcG=SRC;
  function draw(R,k,e){const P=R.P;R.grid(-8.5,8.5,-3.6,3.6,.5);
    const fadeOthers=k>=2?1-.75*(k===2?e:1):1;
    for(let n=0;n<8;n++){const c=nodeC(n),kn=kept(n),na=kn?1:fadeOthers;
      R.box([c[0],0,c[2]],[3.45,SL,2.25],{fill:k>=2&&kn?mix(P.paper,P.c1,.12):P.paper,a:na,dz:20}); // the slab is drawn first, under its GPUs
      R.label([c[0]-1.6,0,c[2]+1.13],'node '+(n+1),{mono:true,fs:12,al:'left',dy:11,c:kn&&k>=2?P.c1:P.mute,a:k===0&&n>0?0:Math.max(.35,na)});
      for(let i=0;i<8;i++){const g=n*8+i,gc=gpuC(g),ex=k>=3&&isExp(g)&&kn,src=g===srcG;
        R.box(gc,[.56,GH,.56],{fill:ex?mix(P.paper,P.c3,.55):src?mix(P.paper,P.c2,.4):P.paper,a:na*(ex||src?1:k>=3&&kn?.7:1),shadow:false});
        // step 1, close on node 1: each GPU's 4 routed experts as small blocks on its top
        if(k<=1&&n===0)for(let j=0;j<4;j++)R.box([gc[0]+((j%2)-.5)*.24,SL+GH,gc[2]+(Math.floor(j/2)-.5)*.24],[.17,.1,.17],{fill:mix(P.paper,P.c3,.3),a:k===0?1:1-e,shadow:false,lw:.6})}
      // step 2: each node's score, the sum of the token's two best affinities on it, as a bar at the node's right end
      if(k===1||k===2){const h=A.score[n]*.9,a=k===1?e:1,x=c[0]-1.58;R.box([x,SL,c[2]],[.22,h,.55],{fill:kn&&k===2?P.c1:mix(P.paper,P.c1,.35),a:a*(k===2&&!kn?.35:1),shadow:false});
        R.label([x,SL+h,c[2]],A.score[n].toFixed(2),{mono:true,fs:12,dy:-10,c:kn&&k===2?P.c1:P.mute,a:a*(k===2&&!kn?.5:1)})}}
    // the token
    const s=top3(srcG);R.ball([s[0],s[1]+.3,s[2]],.16,{c:P.c2});R.glow([s[0],s[1]+.3,s[2]],.5,{c:P.c2,a:.6});
    R.label([s[0],s[1]+.3,s[2]],'the token',{fs:12.5,b:1,c:P.c2,dy:-20,al:'center'});
    // step 3: the 8 chosen experts, a green ball on each GPU that holds one
    if(k>=3)A.top.forEach(ex=>{const p=top3(ex>>2);R.ball([p[0],p[1]+.12,p[2]],.12,{c:P.c3,a:k===3?e:1})});
    // step 4: IB, once per remote node, to the GPU with the same in-node index
    const ibA=k===4?e:k===5?.45:k===6?.3:0;
    if(ibA>0)A.remote.forEach(n=>{const d=top3(n*8+SRC),h=1.2+.25*Math.abs(nodeC(n)[0]-s[0])/3.9;R.arc(s,d,h,{c:P.c2,w:2.2,a:ibA,t:k===4?e:1});
      if(k===4)R.flowArc(s,d,h,{c:P.c2,a:e,r:.08,speed:2.2});if(k===6)R.flowArc(d,s,h,{c:P.c5,a:.9,r:.07,speed:2.2})});
    // step 5: NVLink fan-out inside each kept node, from the landing GPU (or the token's own GPU) to each expert GPU
    if(k>=5){A.keep.forEach(n=>{const land=n*8+SRC,a0=top3(land);[...new Set(A.gpus.filter(g=>(g>>3)===n&&g!==land))].forEach(g=>{const b0=top3(g);
      const fwd=k===5;R.arc(a0,b0,.32,{c:P.c1,w:2,a:fwd?e:.45,t:fwd?e:1});R.flowArc(fwd?a0:b0,fwd?b0:a0,.32,{c:fwd?P.c1:P.c5,a:fwd?e:.9,r:.055,speed:1.2,n:5})})})}
    // headline counts
    if(k===4)R.label([0,2.6,-1.6],A.remote.length+' IB sends instead of '+A.off,{fs:13.5,b:1,c:P.c2,a:e});
    if(k===6)R.label([0,2.6,-1.6],'combine: the same route backwards',{fs:13.5,b:1,c:P.c5,a:e});
    if(k===0){const c=nodeC(0);R.label([c[0]-1.17,SL+GH+.1,c[2]+.48],'4 experts on each GPU',{fs:12.5,b:1,c:P.c3,dy:-22});R.label([c[0],SL,c[2]+1.13],'8 GPUs on NVLink',{fs:12.5,c:P.c1,dy:30})}
  }
  const full={cam:[.18,.82],bounds:[[-7.9,0,-3.0],[7.9,1.6,3.0]]};
  S3.stage({id:'stg-a2a',list:'sx-a2a',fig:'Fig. 1 · one token, 64 GPUs in 8 nodes, 8 experts',cam:full.cam,bounds:full.bounds,aspect:.56,dur:1400,hold:5000,draw,
    // step 1 starts close on node 1, to show what one node holds; every other step shows the whole group
    view:k=>k===0?{cam:[.3,.72],bounds:[[-7.7,0,-2.8],[-4.0,1.0,-.2]]}:full,
    margin:w=>w<520?[22,6,10,6]:[24,14,14,14]});
})();
