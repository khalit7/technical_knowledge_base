// ---- Scene, Fig. 5: y = GELU(xW + b) unfused and fused (renderer v2) ----
// Global memory is the floor; the GPU core and its on-chip memory float above it. Unfused, the matmul writes C (4,096 x 4,096 float32,
// 64 MiB) to global memory and a second kernel reads it back; fused, the epilogue runs on the accumulators and C is never written.
// The bars on the right are the page's recorded M1 Pro timings (window.WKD.m1.fuse, K = 1,024), the dashed line the matmul alone.
// Steps: #sx-fuse.
(function(){
  if(!document.getElementById('stg-fuse')||!window.WKD||!window.S3)return;const {at,off,mix}=S3;
  const F=window.WKD.m1.fuse,ms=k=>F[k+'@1024'].ms,BARS=[['U','unfused'],['F0','staged'],['Fp','precise'],['F','fast']],HS=.15;
  const YK=2.2,bx=j=>3.7+j*.55,BZ=-.9;
  function plate(R,x0,w,c,lab,a,dash){R.glass([x0,.01,-1],[w,0,0],[0,0,1.6],{c,a,nu:6,nv:4,th:.02});
    if(lab)R.label([x0+w/2,0,.6],lab,{mono:true,fs:12,b:1,c,dy:14,a:Math.max(a,lab[0]==='C'&&a<.3?1:a)})}
  function draw(R,k,e){const P=R.P,G=P.c2,S=P.c1,Rg=P.c3;R.grid(-4.6,5.8,-2.6,2.4,.5);
    // global memory: x and W on the left, C in the middle, y on the right
    R.glass([-4.2,0,-1.3],[7.2,0,0],[0,0,2.2],{c:P.mute,a:.35,nu:1,nv:1,th:.01});
    R.label([3,0,.9],'global memory',{mono:true,fs:12,c:P.mute,al:'right',dy:14,wide:1});
    plate(R,-3.9,1.5,G,'x, W',1);
    const cA=k===0?at(k,e,0):k===1?1:k===2?.25:.12;
    plate(R,-1.1,1.6,G,k>=3?'C: never written':'C · 64 MiB',cA);
    if(k>=3)R.quad([[-1.1,.03,-1],[.5,.03,-1],[.5,.03,.6],[-1.1,.03,.6]],{ec:P.mute,dash:[5,4],a:.8});
    plate(R,1.2,1.5,G,'y',k===0?.25:1);
    // the kernels above: two boxes unfused, one fused
    const two=k<=1,a2=two?1:off(k,e,2);
    if(a2>.01){R.box([-2.2,YK,-.2],[1.6,.4,1.1],{fill:mix(P.paper,S,.15),a:k===1?.35:a2,shadow:false});R.label([-2.2,YK+.4,-.2],'kernel 1: matmul',{mono:true,fs:12,b:1,dy:-12,a:k===1?.5:a2});
      R.box([1.0,YK,-.2],[1.4,.4,1.1],{fill:mix(P.paper,S,.15),a:k===0?.3:a2,shadow:false});R.label([1.0,YK+.4,-.2],'kernel 2: + b, GELU',{mono:true,fs:12,b:1,dy:-12,a:k===0?.4:a2})}
    if(!two){const a=at(k,e,2);R.box([-.6,YK,-.2],[3.6,.4,1.1],{fill:mix(P.paper,S,.15),a,shadow:false});
      R.label([-.6,YK+.4,-.2],'fused kernel',{mono:true,fs:12,b:1,dy:-12,a})}
    // the accumulators in registers
    const accX=two?-2.2:-.6;if(k!==1)R.glow([accX,YK+.2,-.2],.45,{c:Rg,a:k===0?e:1});
    if(k===0||k===2)R.label([accX,YK,.35],'accumulators in registers',{mono:true,fs:12,c:Rg,dy:12,wide:1,a:k===0?e:1});
    // step 1: x and W up into kernel 1, C down; step 2: C back up into kernel 2, y down
    if(k===0){R.flow([[-3.15,.05,-.2],[-3.15,1.2,-.2],[-2.6,YK,-.2]],{c:G,a:e,n:8});R.flow([[-2.0,YK,-.2],[-1.2,1.2,-.2],[-.3,.05,-.2]],{c:G,a:e,n:8,r:.08})}
    if(k===1){R.flow([[-.3,.05,-.2],[.2,1.2,-.2],[.7,YK,-.2]],{c:G,a:e,n:8,r:.08});R.flow([[1.3,YK,-.2],[1.7,1.2,-.2],[1.95,.05,-.2]],{c:G,a:e,n:8,r:.08});
      R.label([-.3,1.2,-.2],'C read back: 134 MB more traffic',{mono:true,fs:12.5,b:1,c:G,al:'right',dx:-10,a:e})}
    if(k>=2){R.flow([[-3.15,.05,-.2],[-3.15,1.2,-.2],[-2.2,YK,-.2]],{c:G,a:.8,n:8});R.flow([[1.0,YK,-.2],[1.6,1.2,-.2],[1.95,.05,-.2]],{c:G,a:at(k,e,2),n:8,r:.08})}
    if(k===2){const a=e;R.glass([.1,YK+.42,-.6],[.9,0,0],[0,0,.8],{c:S,a,nu:4,nv:4});R.label([.55,YK+.45,-.6],'16 KB staging tile',{mono:true,fs:12,b:1,c:S,dy:-30,dx:30,a});
      R.flow([[-.6,YK+.25,-.2],[.4,YK+.5,-.2]],{c:S,a,n:5});R.flow([[.7,YK+.5,-.2],[1.2,YK+.25,-.2]],{c:S,a,n:5})}
    if(k>=3){const a=k===3?e:1;R.label([-.6,YK,.35],k===3?'GELU on the accumulators, precise::tanh':'GELU on the accumulators, fast::tanh',{mono:true,fs:12,b:1,c:Rg,dy:12,a})}
    // the measured times
    // the measured times, one bar per version, in a row going towards the viewer
    const show=[0,2,3,4];BARS.forEach(([key,lab],j)=>{const t=ms(key),h=t*HS,cur=show[j]===k||(k===1&&j===0),past=show[j]<k;
      R.box([bx(j),0,BZ],[.34,h,.34],{fill:cur?G:past?mix(P.paper,G,.4):P.paper,a:cur?1:past?.8:.25,lw:.7});
      R.label([bx(j),h,BZ],t.toFixed(2),{mono:true,fs:12,b:cur,c:cur?G:P.mute,dy:-10,a:cur||past?1:.5,grp:'fv'});
      R.label([bx(j),0,BZ+.17],lab,{mono:true,fs:12,c:cur?G:P.mute,dy:12+18*(j%2),a:cur||past?1:.6,wide:1})});
    const hm=ms('MM')*HS;R.line([[bx(0)-.3,hm,BZ],[bx(3)+.3,hm,BZ]],{c:P.ink,w:1.2,dash:[4,3],a:.7});
    R.label([bx(0)-.3,hm,BZ],'matmul alone '+ms('MM').toFixed(2)+' ms',{mono:true,fs:12,al:'right',dx:-6,c:P.ink,wide:1});
  }
  const st=S3.stage({id:'stg-fuse',list:'sx-fuse',fig:'Fig. 5 · bias and GELU, fused into the matmul',cam:[.3,.45],bounds:[[-4.3,0,-1.6],[5.8,3.2,1.4]],aspect:.56,dur:1400,hold:5200,draw,
    margin:w=>w<520?[16,10,16,10]:[22,16,24,16],view:k=>({cam:[.34-.03*k,.45],bounds:[[-4.3,0,-1.6],[5.8,3.2,1.4]]})});
  (window.WKSTG=window.WKSTG||{})['stg-fuse']=st;
})();
