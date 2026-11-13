// ---- Scene (Fig. 5, double quantisation): 512 real block constants quantised a second time (renderer v2) ----
// Data, from the page's own files and engine: the first 512 absmax constants of layer 15's value projection (QD.w[1].absmax, FP32, written by
// fetch_weights.py: one per block of 64 weights, its first eight rows), double-quantised by QE.dq exactly as the released code does it and as
// check_engine.mjs checks against Python: subtract the mean, blocks of 256, the 8-bit dynamic map (QD.dyn8), one FP32 constant per block.
// The bill uses QE.constBits and LLaMA 65B's recounted parameters (PAPER.rc.llama).
(function(){
  if(!document.getElementById('stg-dq')||!window.S3||!window.QE||!window.QD)return;const {at,off,mix,lerp}=S3;
  const QD=window.QD,QE=window.QE,RC=(window.PAPER||{}).rc||{},am=QE.decF32(QD.w[1].absmax),n=am.length,d=QE.dq(am,QD.dyn8,256),M=Math.max(...am);
  const c1=[0,1].map(b=>{let m=0;for(let i=b*256;i<(b+1)*256;i++)m=Math.max(m,Math.abs(am[i]-d.off));return m});
  let es=0,emax=0;am.forEach((v,i)=>{const r=Math.abs(d.q[i]-v)/v;es+=r;emax=Math.max(emax,r)});
  const bits0=QE.constBits(64,32,false),bits1=QE.constBits(64,32,true,8,256),P65=RC.llama&&RC.llama['65B']?RC.llama['65B'].total:null;
  window.QL_DQ={n,lo:Math.min(...am),hi:M,off:d.off,c1,err:es/n,emax,bits0,bits1,saved:bits0-bits1,gb65:P65?(bits0-bits1)*P65/8/1e9:null};
  // ---- layout: two 16 x 16 glass plates, one per block of 256 constants; each constant a bar (height in the same units throughout)
  const c=.14,S=16*c,G0=.35,HM=1.6/M,YP=.06,bw=c*.6;
  const big=[0,1].map(b=>{let k=b*256;for(let i=b*256;i<(b+1)*256;i++)if(Math.abs(am[i]-d.off)>Math.abs(am[k]-d.off))k=i;return k});
  function draw(R,k,e){const P=R.P;R.grid(-4.4,5,-2.4,2.4,.5);
    const gold=P.c5,fill=mix(P.paper,gold,.5);
    const gap=k<2?G0:k===2?lerp(G0,1.1,e):1.1,cx=b=>b===0?-gap/2-S/2:gap/2+S/2;
    const sub=k===0?0:k===1?e:1,qz=k===3?e:k>3?1:0,fa=k===4?.35:1;
    for(let b=0;b<2;b++){R.glass([cx(b)-S/2,YP,-S/2],[S,0,0],[0,0,S],{c:gold,a:.85*fa,nu:4,nv:4,th:.03});
      for(let i=0;i<256;i++){const g=b*256+i,r=i>>4,cc=i&15,v=lerp(am[g],d.q[g],qz)-sub*d.off,h=Math.max(.004,Math.abs(v)*HM),px=cx(b)-S/2+c*(cc+.5),pz=-S/2+c*(r+.5);
        const hot=k===2&&g===big[b];R.box([px,v>=0?YP:YP-h,pz],[bw,h,bw],{fill:hot?P.c2:fill,a:fa,shadow:false,lw:.35,ea:.3});
        // the rounding error, drawn 100 times larger, as a red tip on top of the bar
        if(qz>.01){const er=(d.q[g]-am[g])*HM*25*qz;if(Math.abs(er)>.003)R.box([px,v>=0?YP+h:YP-h-Math.abs(er),pz],[bw*.7,Math.abs(er),bw*.7],{fill:P.bad,a:fa,shadow:false,edge:false})}}}
    if(k<=1)R.label([cx(0)-S/2,YP,S/2],R.W<520?'512 constants':'512 FP32 constants, one per block of 64 weights',{mono:true,fs:12,c:P.mute,al:'left',dy:22,a:k===1?1-e:1});
    // 2. the mean, as a plane the bars drop through
    if(k===1){const y=YP+d.off*HM*(1-e);R.quad([[cx(0)-S/2-.1,y,-S/2-.1],[cx(1)+S/2+.1,y,-S/2-.1],[cx(1)+S/2+.1,y,S/2+.1],[cx(0)-S/2-.1,y,S/2+.1]],{fill:P.c4,a:1,fa:.16,ec:P.c4,ea:.7,dash:[5,4]});
      R.label([cx(1)+S/2+.1,y,0],'mean '+d.off.toFixed(4),{mono:true,fs:12.5,b:1,al:'left',dx:8,c:P.c4})}
    // 3. one FP32 c1 per block of 256: the block's largest magnitude streams into it
    if(k>=2&&k<4){const a=k===2?e:1;for(let b=0;b<2;b++){const cp=[cx(b),YP,-S/2-.55];R.box(cp,[.34,.34,.34],{fill:mix(P.paper,gold,.85),a});
        R.label([cp[0],YP+.34,cp[2]],'c₁ = '+c1[b].toFixed(4),{mono:true,fs:12,b:1,dy:-12,c:gold,a});
        if(k===2){const g=big[b],i=g-b*256;R.flowArc([cx(b)-S/2+c*((i&15)+.5),YP+.3,-S/2+c*((i>>4)+.5)],[cp[0],YP+.36,cp[2]],.35,{c:P.c2,a:e,r:.05,n:6,speed:1})}}}
    if(k===3)R.label([cx(1)+S/2,YP+.6,0],R.W<520?'error × 25':'red: rounding error × 25',{mono:true,fs:12,b:1,c:P.bad,al:'left',dx:8,a:e,wide:1});
    // 5. the bill: bits per weight spent on constants, as three columns
    if(k===4){const bx=cx(1)+S/2+.9,hs=2.4,cols=[[bits0,'FP32',mix(P.paper,P.ink,.15),P.ink],[bits1,'with DQ',mix(P.paper,gold,.7),gold],[bits0-bits1,'saved',P.c3,P.c3]];
      cols.forEach(([v,l,f,lc],i)=>{const p=[bx+i*1.05,0,0];R.box(p,[.45,v*hs*e,.45],{fill:f});R.label([p[0],v*hs*e,p[2]],String(+v.toFixed(3)),{mono:true,fs:12.5,b:1,dy:-12,c:lc});
        R.label([p[0],0,p[2]+.25],l,{mono:true,fs:12,dy:14,c:lc})});
      R.label([bx+1.05,1.95,0],'bits per weight on constants',{fs:12.5,b:1,c:P.ink,a:e,wide:1});
      if(P65)R.label([bx+1.05,0,.25],'LLaMA 65B: '+((bits0-bits1)*P65/8/1e9).toFixed(2)+' GB saved',{fs:12.5,b:1,c:P.c3,dy:34,a:e})}
  }
  const full={cam:[.3,.72],bounds:[[-3.2,-.3,-1.9],[4.4,1.6,1.9]]};
  S3.stage({id:'stg-dq',list:'sx-dq',fig:'Fig. 5 · 512 real block constants, quantised again',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:5000,draw,
    view:k=>k===4?{cam:[.2,.5],bounds:[[-3.2,-.3,-1.6],[6.2,1.8,1.6]]}:k===3?{cam:[.45,.42],bounds:[[-2.8,-.3,-1.6],[3.4,1.3,1.6]]}:full,
    margin:w=>w<520?[16,10,14,10]:[18,24,16,24]});
})();
