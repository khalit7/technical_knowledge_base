// ---- Scene (hero): one decoded token down the layers of llama.cpp and back up to the sampler (renderer v2: glass plates per layer, the token flowing down the left spine, the logits back up the right) ----
// Every number on the labels comes from window.CL (src/cl/gen_data.py); the objects on each plate are schematic, the counts beside them measured.
(function(){
  if(!document.getElementById('stg-hero')||!window.S3||!window.CLX||!CLX.CL.v)return;const {at,off,mix,cl,lerp}=S3;
  const v=CLX.CL.v,fmt=CLX.fmt;
  const N=6,GAP=1.25,Y=i=>(N-1-i)*GAP+.25,XL=-2.95,XR=2.95,PX=[-2.45,2.45],PZ=[-1.05,1.05];
  const NAMES=['your program','libllama','ggml: graph, memory, scheduler','CPU backend: thread pool','matrix products','the kernel that runs'];
  const FILES=['simple.cpp','llama-context.cpp','ggml-alloc.c · ggml-backend.cpp','ggml-cpu.c','repack.cpp','arch/arm/repack.cpp'];
  const MEAS=[fmt(v.tg_ms_tok,2)+' ms per token, all included',fmt(v.nodes,0)+' nodes, reused '+v.graphs_reused+' times',fmt(v.compute_mib,1)+' MiB buffer · 1 split',fmt(v.real_ops,0)+' real ops · a barrier after each',v.n_mulmat+' products × 16 chunks = '+fmt(v.gemv_tok,0)+' calls','every weight once: ~143 MB per token'];
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-2.2,2.2,.5);
    // plate i is the subject at step i; at the last step the subject is the sampler on plate 1
    const subj=k<=5?k:1,aP=i=>i===subj?1:(k===6&&i===5?.55:.22);
    for(let i=0;i<N;i++){const y=Y(i),a=aP(i),hot=i===subj;
      R.glass([PX[0],y,PZ[0]],[PX[1]-PX[0],0,0],[0,0,PZ[1]-PZ[0]],{c:i===5?P.acc:i<=1?P.c1:i===2?P.c3:P.c2,a:a*.85,nu:8,nv:4,dz:30});
      if(k===6||Math.abs(i-k)<=2)R.label([PX[0],y,PZ[1]],NAMES[i],{al:'right',dx:-8,fs:12.5,b:hot,c:hot?P.ink:P.mute,a:Math.max(.45,a),grp:'lay'});
      if(hot&&!(k===6))R.label([PX[0],y,PZ[1]],FILES[i],{al:'right',dx:-8,dy:15,mono:true,fs:12,c:P.mute,a:e,grp:'lay'})}
    // the spines: the token goes down on the left, the logits come back up on the right
    R.line([[XL,Y(0)+.2,0],[XL,Y(5),0]],{c:P.mute,w:1,a:.35,dash:[3,4]});
    // 0: the batch, five prompt positions and the new token at position 5
    {const y=Y(0),a=aP(0);for(let j=0;j<6;j++){const nw=j===5;R.box([-1.75+j*.6,y,0],[.44,.34,.44],{fill:nw?mix(P.paper,P.acc,.55):P.paper,a:nw?a:a*.6,shadow:false})}
      if(k===0)R.label([-1.75+5*.6,y+.34,0],'new token · position 5',{mono:true,fs:12,dy:-10,b:1,c:P.acc,a:e})}
    // 1: the cached graph (a block of node boxes) and the KV cell it finds; the sampler at the right end (last step)
    {const y=Y(1),a=k===6?.3:aP(1);for(let r=0;r<3;r++)for(let c=0;c<4;c++)R.box([-1.9+c*.42,y,-.55+r*.42],[.3,.22,.3],{fill:mix(P.paper,P.c1,.35),a:a*.9,shadow:false});
      R.box([-.1,y,0],[.36,.36,.36],{fill:mix(P.paper,P.c6,.5),a,shadow:false});
      if(k===1){R.label([-1.27,y+.25,-.55],'graph · same shapes',{mono:true,fs:12,dy:-10,a:e});R.label([-.1,y+.36,0],'KV cell',{mono:true,fs:12,dy:-10,c:P.c6,a:e})}}
    // 2: one planned buffer for every intermediate
    {const y=Y(2),a=aP(2);R.box([0,y,0],[3.2,.16,1.1],{fill:mix(P.paper,P.c3,.4),a,shadow:false});
      for(let j=1;j<8;j++)R.line([[-1.6+j*.4,y+.165,-.55],[-1.6+j*.4,y+.165,.55]],{c:P.edge,w:.7,a:a*.6});
      if(k===2)R.label([0,y+.16,.55],'one buffer, reused node to node',{mono:true,fs:12,dy:-10,a:e})}
    // 3: four threads and the barrier they meet at
    {const y=Y(3),a=aP(3);for(let t=0;t<4;t++)R.box([-1.35+t*.9,y,0],[.3,.75,.3],{fill:mix(P.paper,P.c2,.45),a,shadow:false});
      R.box([0,y+.8,0],[3.3,.07,.12],{fill:P.bad,a:a*(k===3?.6+.4*Math.min(1,e*2):1),shadow:false});
      if(k===3){R.label([1.35,y+.75,0],'4 threads',{mono:true,fs:12,al:'left',dx:14,a:e});R.label([0,y+.87,0],'barrier',{mono:true,fs:12,dy:-10,c:P.bad,a:e})}}
    // 4: one product's rows cut into 16 chunks, handed out by an atomic counter
    {const y=Y(4),a=aP(4),ctr=[-1.95,y+.05,0];for(let j=0;j<16;j++){const c=[-1.0+(j%4)*.62,y,-.6+Math.floor(j/4)*.4],got=k>4||(k===4&&e*16>j);
        R.box(c,[.5,.18,.3],{fill:got?mix(P.paper,P.c2,.55):P.paper,a,shadow:false})}
      R.ball([ctr[0],ctr[1]+.2,ctr[2]],.16,{c:P.c5,a});
      if(k===4){R.flowArc([ctr[0],ctr[1]+.3,0],[.0,y+.2,0],.5,{c:P.c5,a:e,r:.06,n:8,speed:1.4});R.label([ctr[0],y+.36,0],'atomic counter',{mono:true,fs:12,dy:-10,c:P.c5,a:e})}}
    // 5: the kernel: four interleaved weight rows and the activation streaming across them
    {const y=Y(5),a=aP(5);for(let r=0;r<4;r++)R.box([.2,y,-.6+r*.4],[3.4,.14,.26],{fill:mix(P.paper,P.acc,.25+.1*r),a,shadow:false});
      R.box([.2,y+.55,0],[3.4,.1,.22],{fill:mix(P.paper,P.c2,.6),a:a*(k>=5?1:.6),shadow:false});
      if(k>=5){const fa=k===5?e:.5;for(let r=0;r<4;r++)R.flow([[-1.5,y+.55,0],[-1.5,y+.2,-.6+r*.4],[1.9,y+.2,-.6+r*.4]],{c:P.c2,a:fa,r:.055,n:9,speed:1.2})}
      if(k===5){R.label([1.9,y+.6,0],'activation, Q8_0',{mono:true,fs:12,al:'left',dx:10,c:P.c2,a:e});R.label([1.9,y+.1,.6],'4 rows at once',{mono:true,fs:12,al:'left',dx:10,a:e})}}
    // the token: a glowing ball down the left spine, one plate per step; flowing dots on the stretch it covers
    if(k<=5){const y0=k===0?Y(0)+1:Y(k-1),y1=Y(k),yy=lerp(y0,y1,e);
      R.flow([[XL,y0+.15,0],[XL,y1+.15,0]],{c:P.acc,a:.9,r:.07,n:6,speed:1.3});
      R.flow([[XL,y1+.15,0],[PX[0]+.3,y1+.15,0]],{c:P.acc,a:at(k,e,k)*.8,r:.06,n:4,speed:1.1});
      R.glow([XL,yy+.15,0],.22,{c:P.acc});R.ball([XL,yy+.15,0],.13,{c:P.acc})}
    // last step: 49,152 logits flow back up the right spine to the sampler, which keeps the largest
    if(k===6){const y5=Y(5),y1=Y(1),sx=1.55;
      R.flow([[2.0,y5+.2,0],[XR,y5+.2,0],[XR,y1+.25,0],[sx+.75,y1+.25,0]],{c:P.c1,a:1,r:.07,n:22,speed:1.6});
      R.box([sx,y1,0],[1.3,.12,.9],{fill:mix(P.paper,P.c1,.35),a:1,shadow:false});
      const h=.12+.6*e;R.box([sx,y1+.12,0],[.22,h,.22],{fill:P.acc,a:1,shadow:false});
      R.label([sx,y1+.12+h,0],'" Paris"',{mono:true,fs:13,b:1,dy:-10,c:P.acc,a:e});
      R.label([sx+.65,y1,.45],'49,152 logits · greedy takes the largest',{mono:true,fs:12,al:'left',dx:8,a:e,wide:1});
      R.label([PX[0],y1,PZ[1]],'llama-sampler.cpp',{al:'right',dx:-8,dy:15,mono:true,fs:12,c:P.mute,a:e,grp:'lay'})}
    // the measured number for the current layer, at the plate's right edge
    if(k<=5)R.label([.3,Y(k)+1.0,PZ[0]],MEAS[k],{mono:true,fs:12.5,b:1,c:P.good,a:e});
  }
  const full={cam:[.42,.36],bounds:[[-3.4,0,-1.2],[3.4,Y(0)+1.1,1.2]]};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · one decoded token, measured',cam:full.cam,bounds:full.bounds,aspect:.92,dur:1500,hold:4400,draw,
    // each step moves in on the layer it is about, keeping a neighbour above and below; the last step shows the whole stack
    view:k=>k<=5?{cam:[.42,.5],bounds:[[-3.4,Math.max(0,Y(k)-.9),-1.2],[3.4,Y(k)+1.15,1.2]]}:full,
    margin:w=>w<520?[16,10,16,10]:[18,16,18,190]});
})();
