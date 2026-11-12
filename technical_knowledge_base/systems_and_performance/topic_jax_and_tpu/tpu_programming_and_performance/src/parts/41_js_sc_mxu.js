// ---- Scene, Fig. 2 (section 4): a weight on the MXU, and the padding the array multiplies as zeros (renderer v2) ----
// Each MXU is a glass plate of S x S multiply-add cells (S = 128 on v4, v5e, v5p; 256 on v6e and TPU7x), one world unit per 32 cells.
// The weight [k, n] it holds is the blue slab; the cells it does not cover are grey padding. Activation rows stream across in slabs of 8.
// Shapes and utilisations are the page's own (window.TQ.rc.mxu, from src/runs/tq_recompute.py; U.mxuUtil gives the same numbers):
// the running example's output head [4,096 x 128 x 65], q projection [4,096 x 128 x 128], attention scores with head size 32
// [128 x 32 x 128], scores with head size 128 [4,096 x 128 x 4,096] and Llama 2 7B's MLP up-projection. Explained by #sx-mxu.
(function(){
  if(!document.getElementById('stg-mxu')||!window.TQU)return;const {at,mix}=S3,U=window.TQU,MX=U.D.rc.mxu;
  const row=s=>MX.find(r=>r[0].indexOf(s)>=0);
  const HEAD=row('output head'),QP=row('q projection'),H32=row('head_dim 32'),H128=row('head_dim 128'),UP=row('MLP up');
  const u=(r,S)=>U.mxuUtil(r[1],r[2],r[3],S);
  const pct=v=>U.fmt(v*100,v<.1?2:1).replace(/\.0+$/,'')+'%';
  // one plate: its side S, corner, and the matmul whose weight it holds (k rows along z, n columns along x, clipped to one tile)
  const C=32;
  function plate(R,o,a,lab){const P=R.P,s=o.S/C,x0=o.x,z0=o.z,kk=Math.min(o.r[2],o.S)/C,nn=Math.min(o.r[3],o.S)/C;
    R.glass([x0,.002,z0],[s,0,0],[0,0,s],{c:P.acc,a:a*.45,nu:o.S/32,nv:o.S/32,th:.02,dz:40});
    // padding: the cells the weight leaves empty, grey
    if(nn<s)R.quad([[x0+nn,.01,z0],[x0+s,.01,z0],[x0+s,.01,z0+kk],[x0+nn,.01,z0+kk]],{fill:P.mute,fa:.5*o.pad,a,dash:[4,3],lw:.8});
    if(kk<s)R.quad([[x0,.01,z0+kk],[x0+s,.01,z0+kk],[x0+s,.01,z0+s],[x0,.01,z0+s]],{fill:P.mute,fa:.5*o.pad,a,dash:[4,3],lw:.8});
    R.box([x0+nn/2,0,z0+kk/2],[nn,.16*o.w,kk],{fill:mix(P.paper,P.acc,.9),a:a*Math.min(1,o.w*1.5),lw:.7,shadow:false});
    if(lab){R.label([x0+s/2,0,z0],o.S+' × '+o.S+' MXU',{dy:-14,b:1,fs:12.5,c:P.acc,a});
      R.label([x0+s/2,0,z0+s],lab,{dy:16,b:1,fs:13,c:P.ink,a})}}
  // activation slabs of 8 rows streaming across the rows the weight occupies (left to right)
  function stream(R,o,a,n){const s=o.S/C,kk=Math.min(o.r[2],o.S)/C,P=R.P;
    for(let i=0;i<n;i++){const z=o.z+kk*(i+.5)/n;R.flow([[o.x-1.6,.12,z],[o.x+s+.4,.12,z]],{c:P.c2,r:.07,a,speed:1.2,n:5})}
    for(let j=0;j<6;j++)R.box([o.x-1.15+j*.13-.4,0,o.z+kk/2],[.1,.24,kk],{fill:mix(P.paper,P.c2,.55),a:a*(1-j*.12),lw:.5,shadow:false})}
  window.TQ_SC=window.TQ_SC||{};
  function draw(R,k,e){const P=R.P;R.grid(-9,9,-4.5,5,.5);
    if(k<=2){const o={S:128,x:-2,z:-2,r:HEAD,pad:at(k,e,1)>0?at(k,e,1):0,w:k===0?e:1};
      plate(R,o,1,k===0?'weight [128, 65]':pct(u(HEAD,128))+' useful at best');
      if(k===0)R.label([-2+65/C/2,.16,-2+2],'output head',{dy:-12,b:1,fs:12.5,c:P.acc,a:e});
      if(k>=1)R.label([-2+65/C+(4-65/C)/2,.02,0],'63 columns of zeros',{fs:12.5,c:P.mute,b:1,a:at(k,e,1)});
      if(k===2){stream(R,o,e,8);R.label([-3.6,.24,-2],'4,096 rows = 512 slabs of 8',{al:'left',dy:-14,fs:12.5,b:1,c:P.c2,a:e})}}
    else if(k===3){plate(R,{S:256,x:-8.5,z:-4,r:HEAD,pad:1,w:1},1,'output head: '+pct(u(HEAD,256)));plate(R,{S:256,x:.5,z:-4,r:QP,pad:1,w:1},e,'q projection: '+pct(u(QP,256)))}
    else if(k===4){plate(R,{S:128,x:-2,z:-2,r:H32,pad:1,w:e},1,'k = 32: '+pct(u(H32,128))+' (on 256: '+pct(u(H32,256))+')');
      R.label([0,.16,-2+.5],'key block [32, 128]',{dy:-12,b:1,fs:12.5,c:P.acc,a:e})}
    else{plate(R,{S:128,x:-5,z:-2,r:H128,pad:1,w:e},1,'head 128: '+pct(u(H128,128)));plate(R,{S:256,x:.5,z:-4,r:H128,pad:1,w:e},1,'on 256: '+pct(u(H128,256)));
      R.label([2.5,0,5.4],'Llama 2 7B MLP up: '+pct(u(UP,128))+' on both',{dy:6,fs:12.5,c:P.mute,a:e,wide:1})}
    window.TQ_SC.mxu={step:k,head128:u(HEAD,128),head256:u(HEAD,256)};
  }
  const near={cam:[.12,.85],bounds:[[-4,0,-2.4],[2.4,.4,2.6]]};
  const st=S3.stage({id:'stg-mxu',list:'sx-mxu',fig:'Fig. 2 · a weight on the MXU',cam:near.cam,bounds:near.bounds,aspect:.6,dur:1500,hold:4800,draw,
    margin:w=>w<520?[22,10,24,10]:[26,18,28,18],
    view:k=>TQPH(k===3?{cam:[.12,.9],bounds:[[-8.9,0,-4.4],[8.9,.4,4.6]]}:k===5?{cam:[.12,.88],bounds:[[-5.4,0,-4.4],[8.9,.4,5.2]]}:k===2?{cam:[.2,.8],bounds:[[-4,0,-2.4],[2.6,.4,2.6]]}:near)});
  (window.TQSTG=window.TQSTG||{})['stg-mxu']=st;
})();
