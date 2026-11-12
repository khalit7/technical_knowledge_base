// ---- Scene, Fig. 2 (section 4): fusion keeps intermediates on chip. The Fusion explorer's "elementwise chain", tanh(x * 2.0 + 1.0) * 3.0 on a
// 256 x 512 float32 array, compiled on this CPU with the fusion pass off (7 kernels: three broadcasts that write a full array of one constant,
// then multiply, add, tanh, multiply) and with the default pipeline (one kLoop fusion). Bytes are XLA's cost_analysis for each program
// (XPD.low.scn.chain from fusion_lab.json); the split into 14 reads and writes of 512 KiB is derived from the kernels' operands and adds up to it.
// Back row: memory (RAM on this CPU; HBM on a GPU or TPU). Front row, raised: the chip, where a kernel's registers and caches live. ----
(function(){
  if(!document.getElementById('stg-fuse')||!window.XPS||!window.XPD)return;const {at,off,lerp,lerp3,mix}=S3,{lab,legs,tint,f}=XPS;
  const C=XPD.low.scn.chain,U=C.unfused,AB=C.array_b,nU=U.length;
  const KX=i=>-3.9+i*1.3,KY=1.9,KZ=0,MZ=0,AX=i=>i<0?-5.3:KX(i);
  // memory arrays: x (input, i=-1), then the array each unfused kernel writes (the three broadcasts' constants, t1, t2, t3, y)
  const names=['x','2.0 everywhere','1.0 everywhere','3.0 everywhere','x * 2','+ 1','tanh','y'];
  const short=['x','b','b','b','t1','t2','t3','y'];
  // what each unfused compute kernel reads (array slots, -1 is x), in recorded order: multiply(x, b), add(t1, b), tanh(t2), multiply(t3, b)
  const reads={3:[-1,0],4:[3,1],5:[4],6:[5,2]};
  const FX=.3,FW=6.3;
  function draw(R,k,e){const P=R.P;R.grid(-6.6,6,-2.1,1.9,.5);
    // the two planes: memory at the back on the floor, the chip raised in front
    R.glass([-6.0,0,MZ-.6],[11.7,0,0],[0,0,1.2],{c:P.c2,a:.5,nu:12,nv:1,th:.04});
    lab(R,[-6.0,0,MZ+.6],'memory: RAM here, HBM on a GPU or TPU',{fs:12.5,b:1,al:'left',dy:36,c:P.c2});
    R.glass([-4.7,KY-.02,KZ-.55],[9.4,0,0],[0,0,1.1],{c:P.c3,a:.45,nu:9,nv:1,th:.04});
    lab(R,[-4.7,KY,KZ+.55],'on chip: registers and caches',{fs:12.5,b:1,al:'left',dy:16,c:P.c3});
    // memory arrays (512 KiB each); the intermediates fade once fusion keeps them on chip
    const fused=k>=3?(k===3?e:1):0;
    for(let i=-1;i<nU;i++){const keep=i===-1||i===nU-1,written=i<3?k>=1:k>=2,a0=keep?1:(written?(k===2&&i>=3?Math.min(1,.15+e*1.2):1):.18);
      const a=keep?a0:a0*(1-fused*.85);R.box([AX(i),0,MZ],[.9,.22,.7],{fill:keep?tint(P,P.acc,.35):tint(P,P.c2,written?.45:.15),a,shadow:false});
      lab(R,[AX(i),0,MZ+.35],short[i+1],{mono:true,fs:12,dy:14,c:keep?P.acc:P.c2,a:Math.max(.35,a),wide:1})}
    // unfused kernels on the chip, one box each; at step 4 they slide together into one fused kernel
    const gx=i=>lerp(KX(i),FX-FW/2+.45+i*((FW-.9)/(nU-1)),fused);
    U.forEach((u,i)=>{const isB=u[0]==='broadcast',on=k===0||(k===1&&isB)||(k===2&&!isB)||k>=3;
      const a=k===0?.95:on?1:.3;R.box([gx(i),KY,KZ],[lerp(.9,.62,fused),.42,lerp(.7,.5,fused)],{fill:isB?tint(P,P.c3,.18):tint(P,P.c3,.45),a,shadow:false});
      lab(R,[gx(i),KY+.42,KZ],u[0],{mono:true,fs:12,dy:-10,c:P.ink,a:k>=3?.8*(1-fused):a,wide:1})});
    // the graph's edges on the chip at step 1: which result feeds which operation
    if(k===0){const E=[[0,3],[3,4],[1,4],[4,5],[5,6],[2,6]];E.forEach(([a,b])=>R.arc([KX(a)+.42,KY+.22,KZ+.36],[KX(b)-.42,KY+.22,KZ+.36],.06+.05*Math.abs(b-a),{c:P.mute,w:1.4,head:6,t:e}))}
    // the fused kernel's shell
    if(fused>0){R.glass([FX-FW/2,KY-.01,KZ-.42],[FW,0,0],[0,.62,0],{c:P.acc,a:fused*.9,nu:1,nv:1,th:.84});
      lab(R,[FX,KY+.64,KZ-.42],C.fused_name+': all '+C.fused.length+' operations, one kernel',{mono:true,fs:12.5,b:1,dy:-12,c:P.acc,a:fused})}
    // traffic: writes stream down from a kernel to its array, reads stream up
    const down=(i,a)=>R.flow(legs([[KX(i)+.15,KY,KZ],[AX(i)+.15,.24,MZ]]),{c:P.c2,r:.065,n:6,a,speed:1.3});
    const up=(j,i,a)=>R.flow(legs([[AX(j)-.15,.24,MZ],[KX(i)-.2,KY,KZ]]),{c:P.acc,r:.065,n:6,a,speed:1.3});
    if(k===1)[0,1,2].forEach(i=>down(i,Math.min(1,e*1.5)));
    if(k===2)[3,4,5,6].forEach(i=>{reads[i].forEach(j=>up(j,i,Math.min(1,e*1.5)));down(i,Math.min(1,e*1.5))});
    if(k===3){for(let i=0;i<nU-1;i++)R.flowArc([gx(i),KY+.3,KZ],[gx(i+1),KY+.3,KZ],.18,{c:P.c3,r:.05,n:3,a:e,speed:.9})}
    if(k===4){R.flow(legs([[AX(-1),.24,MZ],[FX-FW/2+.2,KY,KZ]]),{c:P.acc,r:.075,n:9,a:e,speed:1.3});
      R.flow(legs([[FX+FW/2-.2,KY,KZ],[AX(nU-1),.24,MZ]]),{c:P.c2,r:.075,n:9,a:e,speed:1.3});
      for(let i=0;i<nU-1;i++)R.flowArc([gx(i),KY+.3,KZ],[gx(i+1),KY+.3,KZ],.18,{c:P.c3,r:.05,n:3,a:.7,speed:.9})}
    // the byte count of the step's program, upright in the corner of the chip plane
    const t=k===1?'3 x 512 KiB written':k===2?'14 x 512 KiB = '+f(C.unfused_b)+' bytes':k>=4?f(C.fused_b)+' bytes: '+(C.unfused_b/C.fused_b).toFixed(1)+' times fewer':'';
    if(t)lab(R,[5.6,0,MZ+.6],t,{fs:13,b:1,al:'right',dy:36,c:k>=4?P.acc:P.c2,a:k===1||k===2||k===4?e:1})
  }
  const full={cam:[.14,.32],bounds:[[-6.0,0,-.7],[5.3,3.0,.8]]};
  const st=S3.stage({id:'stg-fuse',list:'sx-fuse',fig:'Fig. 2 · the same chain unfused and fused',cam:full.cam,bounds:full.bounds,aspect:.46,dur:1500,hold:5000,draw,
    margin:w=>w<520?[14,10,14,10]:[22,16,22,16],
    // step 4 moves in on the chip while the kernels merge; the rest show the whole picture
    view:k=>k===3?{cam:[.18,.4],bounds:[[-4.4,1.4,-.6],[4.4,2.9,.6]]}:full});
  (window.XPSTG=window.XPSTG||{})['stg-fuse']=st;
})();
