// ---- Scene, Fig. 3 (2026-11-12): Shardy propagates Megatron's annotations through the MLP of one transformer block, and the SPMD partitioner
// inserts the all-reduce the row-parallel matmul needs. Every sharding and byte count is read from SS.prop (case 'tp', Shardy, the post-propagation
// HLO dump of src/runs/ss_prop.py): the fc1 dot at model_jax.py:51, the GELU's elementwise ops at model_jax.py:68, the forward all-reduces at line 51.
// Tensors are drawn as glass plates (rows: the batch, split by 'data'; columns: features, split by 'model'); sizes are not to scale. ----
(function(){
  if(!document.getElementById('stg-prop')||!window.S3||!window.SS)return;const {at,off,mix,lerp}=S3;
  const C=SS.prop.cases.find(c=>c.id==='tp'),Rw=C.shardy.rows;
  const dot=Rw.find(r=>r[0]===51&&r[1]==='dot'&&r[2]==='fwd');                          // [32,128,512] P(data, -, model)
  const gelu=Rw.filter(r=>r[0]===68&&r[2]==='fwd'),geluSpec=[...new Set(gelu.map(r=>r[4]))].join(' / ');
  const ar=C.shardy.coll.filter(c=>c[0]==='all-reduce'&&c[2]==='fwd'),nAR=ar.reduce((s,c)=>s+c[3],0),bAR=ar.reduce((s,c)=>s+c[4],0);
  const fmt=n=>Number(n).toLocaleString('en-GB');
  // geometry: activations stand in a row at z=0, the two weights behind them
  const Y0=.3,AH=1.15;
  const T={x:{x:-3.55,w:.75},h:{x:-1.25,w:1.7},g:{x:1.05,w:1.7},y:{x:3.4,w:.75}};
  const W1={x:-2.35,z:-1.35,w:1.5,h:.55,y:1.0},W2={x:2.25,z:-1.35,w:.5,h:1.3,y:.45};
  const dev=(P,d,m)=>[P.c1,P.c2,P.c3,P.c4,P.c5,P.c6,mix(P.c1,P.c3,.5),mix(P.c2,P.c4,.5)][d*4+m];
  const rowTint=(P,d)=>mix(P.paper,P.c1,d?.75:.45),colTint=(P,m)=>mix(P.paper,P.c2,.3+.17*m);
  // a plate cut into nr x nc blocks; colour(i,j) per block; z offset
  function plate(R,cx,w,z,nr,nc,colour,a,y0,h){y0=y0==null?Y0:y0;h=h||AH;const g=.045,bw=w/nc,bh=h/nr,x0=cx-w/2;
    for(let i=0;i<nr;i++)for(let j=0;j<nc;j++)R.glass([x0+j*bw+g/2,y0+h-(i+1)*bh+g/2,z],[bw-g,0,0],[0,bh-g,0],{c:colour(i,j),a,nu:2,nv:2,th:.035})}
  function dashed(R,cx,w,z,a,show){const P=R.P,x0=cx-w/2;R.quad([[x0,Y0,z],[x0+w,Y0,z],[x0+w,Y0+AH,z],[x0,Y0+AH,z]],{ec:P.mute,dash:[5,4],a,lw:1.2});if(show!==false)R.label([cx,Y0+AH/2,z],'?',{fs:18,b:1,c:P.mute,a})}
  // labels only for what the current step is about, so a close view never piles off-screen labels at its edge
  const FOC=[['x','fc1','fc2','h','g','y'],['x','fc1','h'],['h','g'],['g','fc2','y'],['g','y']];
  function draw(R,k,e){const P=R.P;R.grid(-4.3,4.2,-2.0,.9,.5);const L0=R.label.bind(R),lab=(n,p,t,o)=>{if(FOC[k].includes(n))L0(p,t,o)};
    const ka=k===0?1:.3;                                                                     // annotations recede once propagation starts
    // 1. the annotated arrays
    plate(R,T.x.x,T.x.w,0,2,1,(i)=>rowTint(P,i),k<=1?1:.35);
    lab('x',[T.x.x,Y0,0],'x',{mono:true,fs:13,b:1,dy:14,c:P.ink});lab('x',[T.x.x,Y0,0],'P(data, -, -)',{mono:true,fs:12,dy:30,c:P.c1});
    plate(R,W1.x,W1.w,W1.z,1,4,(i,j)=>colTint(P,j),k<=1?1:ka,W1.y,W1.h);
    lab('fc1',[W1.x,W1.y+W1.h,W1.z],"fc1 · P(None, 'model')",{mono:true,fs:12,b:1,dy:-10,c:P.c2,a:k<=1?1:.6});
    plate(R,W2.x,W2.w,W2.z,4,1,(i)=>colTint(P,i),k===0||k===3?1:ka,W2.y,W2.h);
    lab('fc2',[W2.x,W2.y+W2.h,W2.z],"fc2 · P('model', None)",{mono:true,fs:12,b:1,dy:-10,c:P.c2,a:k===0||k===3?1:.6});
    if(k===0){dashed(R,T.h.x,T.h.w,0,1);dashed(R,T.g.x,T.g.w,0,1);dashed(R,T.y.x,T.y.w,0,1)}
    // 2. through fc1: (i, k), (k, j) -> (i, j): data from x, model from fc1; h is cut 2 x 4, no communication
    if(k>=1){const a=k===1?e:k===2?.6:.3;plate(R,T.h.x,T.h.w,0,2,4,(i,j)=>dev(P,i,j),a);
      lab('h',[T.h.x,Y0,0],'h = x @ fc1',{mono:true,fs:13,b:1,dy:14,c:P.ink,a:Math.max(a,.5)});lab('h',[T.h.x,Y0,0],dot[4],{mono:true,fs:12,dy:30,c:P.c2,a:Math.max(a,.5)});
      if(k===1){R.flowArc([T.x.x+.3,Y0+.8,0],[T.h.x-.6,Y0+.8,0],.25,{c:P.c1,a:e,r:.06,n:6});R.flowArc([W1.x,W1.y,W1.z],[T.h.x,Y0+AH,0],.25,{c:P.c2,a:e,r:.06,n:6});
        lab('h',[T.h.x,Y0,0],'no communication',{fs:12.5,b:1,dy:50,c:P.good,a:e})}}
    else dashed(R,T.h.x,T.h.w,0,1,FOC[k].includes('h'));
    // 3. GELU is elementwise: the sharding passes straight through
    if(k>=2){const a=k===2?e:.35;plate(R,T.g.x,T.g.w,0,2,4,(i,j)=>dev(P,i,j),a);
      lab('g',[T.g.x,Y0,0],'gelu(h)',{mono:true,fs:13,b:1,dy:14,c:P.ink,a:Math.max(a,.5)});lab('g',[T.g.x,Y0,0],geluSpec,{mono:true,fs:12,dy:30,c:P.c2,a:Math.max(a,.5)});
      if(k===2){R.flow([[T.h.x+T.h.w/2,Y0+AH*.5,0],[T.g.x-T.g.w/2,Y0+AH*.5,0]],{c:P.c3,a:e,r:.07,n:6});lab('g',[T.g.x,Y0,0],gelu.length+' elementwise ops, same layout',{fs:12.5,b:1,dy:50,c:P.good,a:e})}}
    else if(k>=1)dashed(R,T.g.x,T.g.w,0,1,FOC[k].includes('g'));
    // 4. fc2 contracts the model-split dimension: each model device holds a full-size partial sum (4 plates in depth)
    const zp=m=>-.42*(m+.5)+.1;
    if(k>=3){const a=k===3?e:1-.6*e;
      for(let m=0;m<4;m++){plate(R,T.y.x,T.y.w,zp(m),2,1,()=>colTint(P,m),a*.9);
        if(k===3)R.flowArc([T.g.x+T.g.w/2-.1,Y0+AH*.7,0],[T.y.x-T.y.w/2,Y0+AH*.7,zp(m)],.2,{c:colTint(P,m),a:e,r:.05,n:4})}
      if(k===3){R.flowArc([W2.x,W2.y+W2.h*.5,W2.z],[T.y.x,Y0+AH,zp(3)],.2,{c:P.c2,a:e,r:.05,n:5});
        lab('y',[T.y.x,Y0+AH,zp(3)],'4 partial sums',{fs:12.5,b:1,dy:-14,c:P.bad,a:e});lab('y',[T.y.x,Y0,zp(0)],'[16, 128, 128] each, one per model device',{mono:true,fs:12,dy:16,c:P.ink,a:e})}}
    else if(k>=1)dashed(R,T.y.x,T.y.w,0,1,FOC[k].includes('y'));
    // 5. the partitioner inserts an all-reduce over model: the four partials stream into one sum, P(data, -, -) again
    if(k>=4){const zf=.75;for(let m=0;m<4;m++){R.flowArc([T.y.x,Y0+AH*.6,zp(m)],[T.y.x,Y0+AH*.6,zf],.18+.05*m,{c:colTint(P,m),a:e,r:.055,n:5,speed:1})}
      plate(R,T.y.x,T.y.w,zf,2,1,(i)=>rowTint(P,i),e);
      lab('y',[T.y.x,Y0+AH,zf],'y · P(data, -, -)',{mono:true,fs:12.5,b:1,dy:-14,c:P.ink,a:e});
      lab('y',[T.y.x,Y0,zf],'all-reduce over model',{fs:12.5,b:1,dy:16,c:P.c2,a:e});
      lab('y',[T.y.x,Y0,zf],fmt(bAR/nAR)+' bytes per device',{mono:true,fs:12,dy:34,c:P.ink,a:e,wide:1})}
  }
  const full={cam:[.18,.26],bounds:[[-4.1,0,-1.6],[4.0,1.95,.5]]};
  S3.stage({id:'stg-prop',list:'sx-prop',fig:"Fig. 3 · propagation through the MLP (Shardy, recorded dump)",cam:full.cam,bounds:full.bounds,aspect:.5,dur:1400,hold:4800,draw,
    margin:w=>w<520?[34,10,34,10]:[40,24,52,24],
    view:k=>k===1?{cam:[.25,.28],bounds:[[-4.0,0,-1.6],[-.2,1.95,.5]]}:k===2?{cam:[.1,.26],bounds:[[-2.3,0,-.6],[2.0,1.95,.5]]}:k===3?{cam:[-.15,.28],bounds:[[.1,0,-1.6],[4.0,1.95,.9]]}:k===4?{cam:[-.35,.3],bounds:[[1.6,0,-1.8],[4.3,1.95,1.1]]}:full});
})();
