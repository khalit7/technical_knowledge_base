// ---- Scene (Fig. 2, the Idea): Equation 5 on 1,024 real weights (renderer v2: glass plates, flowing dots, camera per step) ----
// Data, all from the page's own files and engine: the first 1,024 weights of the LLaMA-7B sample of layer 15's value projection
// (QD.w[1], row 37, inputs 0 to 1,023, FP16), quantised by QE.quantise to NF4 (QD.types.nf4, Appendix E) in blocks of 64, exactly as
// the in-browser quantiser and check_engine.mjs do; the 16 block constants double-quantised by QE.dq (8-bit dynamic map, the released code;
// here the 16 constants form one group, the real group is 256 constants). The plate shows the 16 blocks as 16 rows of 64.
// The adapters L1 and L2 and the input X are shapes only (no values): this page has no trained adapter for LLaMA.
(function(){
  if(!document.getElementById('stg-eq5')||!window.S3||!window.QE||!window.QD)return;const {at,off,mix,lerp}=S3;
  const QD=window.QD,QE=window.QE,NB=16,BS=64,N=NB*BS;
  const x=Array.from(QE.decF16(QD.w[1].w)).slice(0,N),code=QD.types.nf4,q=QE.quantise(x,code,BS),am=Array.from(q.am),dq=QE.dq(am,QD.dyn8,256);
  const cv=Array.from(q.idx,i=>code[i]),deq=cv.map((v,i)=>v*dq.q[i>>6]),AM=Math.max(...am);
  window.QL_EQ5={n:N,blocks:NB,amlo:Math.min(...am),amhi:AM,bytesCodes:N/2,bytesC2:NB,deqErr:Math.max(...deq.map((v,i)=>Math.abs(v-cv[i]*am[i>>6])))};
  // ---- layout: the stored plate on the floor, its BF16 copy lifted above it; constants to the right; X on the left, Y on the right; adapters in front
  // three levels: the stored codes on the floor, the BF16 copy above them, the adapters on top; X enters on the left, Y leaves on the right
  const c=.1,PW=BS*c,PD=NB*c,X0=-PW/2,Z0=-PD/2,YS=.08,YB=1.45,YA=2.75,HC=.32,HB=.42,bw=c*.62;
  const CX=PW/2+.4,C1=[PW/2+1.25,YS,0],XP=[-PW/2-1.1,YB,0],YP=[PW/2+2.1,YB,0];
  const L1o=[-2.2,YA,-.75],L2o=[.8,YA,-.15]; // adapter plates (corner points)
  function bars(R,y,vals,h,fill,a){if(a<=.02)return;for(let b=0;b<NB;b++)for(let j=0;j<BS;j++){const v=vals[b*BS+j],hh=Math.max(.004,Math.abs(v)*h),px=X0+c*(j+.5),pz=Z0+c*(b+.5);
      R.box([px,v>=0?y:y-hh,pz],[bw,hh,bw],{fill,a,shadow:false,lw:.3,ea:.25})}}
  function draw(R,k,e){const P=R.P;R.grid(-6,6.4,-2.2,3.4,.5);
    const nf=mix(P.paper,P.c4,.45),bf=mix(P.paper,P.c1,.45),gold=P.c5,ad=P.c3,gr=P.c2;
    // 1. the stored plate: NF4 codes, drawn at their code values (16 terraces); recedes while the BF16 copy is the subject
    const sa=k===0?1:k===1||k===2?.32:k===6?lerp(.25,1,e):.25;
    R.glass([X0,YS,Z0],[PW,0,0],[0,0,PD],{c:P.c4,a:Math.max(.5,sa),nu:16,nv:16,th:.03});
    if(k<=2||k===6)bars(R,YS,cv,HC,nf,sa);
    if(k!==5)R.label([X0,YS,Z0+PD],R.W<520?'W · NF4':'W · NF4 codes · 4 bits each · 16 blocks of 64',{mono:true,fs:12.5,b:1,al:'left',dy:16,c:P.c4,a:Math.max(.6,sa)});
    if(k>=5&&k<6)R.label([X0,YS,Z0+PD],'W · NF4: no gradient, never updated',{mono:true,fs:12,b:1,al:'left',dy:16,c:P.c4,a:k===5?e:1,wide:1});
    // the constants: one c2 per block (an 8-bit code until it is rebuilt), one FP32 c1 for the group
    const grow=k===0?0:k===1?e:1,ca=k===0||k===1?1:k===2?.85:k===6?1:.4;
    for(let b=0;b<NB;b++){const h=lerp(.07,.06+am[b]/AM*.55,grow);R.box([CX,YS,Z0+c*(b+.5)],[.22,h,c*.75],{fill:mix(P.paper,gold,.55),a:ca,shadow:false,lw:.5})}
    R.label([CX,YS,Z0+PD],R.W<520?'c₂':'c₂ · 8-bit · one per block',{mono:true,fs:12,c:gold,a:ca,dy:16});
    R.box(C1,[.32,.32,.32],{fill:mix(P.paper,gold,.8),a:ca});R.label([C1[0],C1[1]+.32,C1[2]],R.W<520?'c₁':'c₁ · FP32',{mono:true,fs:12,b:1,c:gold,dy:-12,a:ca});
    if(k===1)for(let b=0;b<NB;b+=3)R.flowArc([C1[0],C1[1]+.2,C1[2]],[CX+.1,YS+.3,Z0+c*(b+.5)],.25,{c:gold,a:e,r:.045,n:4,speed:1});
    // 2. the BF16 copy, made for this multiplication only: code value times its block's rebuilt constant
    const ba=k<2?0:k===2?e:k===6?1-e:1;
    if(ba>.01){R.glass([X0,YB,Z0],[PW,0,0],[0,0,PD],{c:P.c1,a:ba*.9,nu:16,nv:16,th:.03});
      bars(R,YB,k===2?deq.map(v=>v*e):deq,HB/AM,bf,ba);
      R.label([X0,YB,Z0+PD],R.W<520?'W · BF16':'W · BF16 copy · this matmul only',{mono:true,fs:12.5,b:1,al:'left',c:P.c1,a:ba,dy:14})}
    if(k===2)for(let b=1;b<NB;b+=4){R.flowArc([CX,YS+.35,Z0+c*(b+.5)],[X0+PW-.2,YB,Z0+c*(b+.5)],.35,{c:gold,a:e,r:.045,n:5,speed:1.1});
      R.flow([[X0+PW-.2,YB+.06,Z0+c*(b+.5)],[X0+.2,YB+.06,Z0+c*(b+.5)]],{c:gold,a:e*.8,r:.04,n:8,speed:1.4})}
    // 3. X in, Y out (plinths without values: any token's activations)
    const io=k<3?0:k===3?e:k===6?1-e:1;
    if(io>.01){R.box([XP[0],XP[1]-.05,XP[2]],[.18,.05,1.3],{a:io,shadow:false});R.label([XP[0],XP[1],XP[2]-.65],'X · BF16',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:io});
      R.box([YP[0],YP[1]-.05,YP[2]],[.18,.05,1.3],{a:io,shadow:false});R.label([YP[0],YP[1],YP[2]-.65],k>=4?'Y = XW + XL₁L₂':'Y = XW',{mono:true,fs:12.5,b:1,dy:-12,c:P.ink,a:io});
      [-.4,0,.4].forEach(dz=>{const fa=io*(k===4?.45:k===5?.2:1);R.flowArc([XP[0]+.1,XP[1]+.05,dz],[X0+.1,YB+.05,dz*.8],.3,{c:P.c1,a:fa,r:.05,n:5,speed:1.2});
        R.flowArc([X0+PW-.1,YB+.05,dz*.8],[YP[0]-.1,YP[1]+.05,YP[2]+dz],.3,{c:P.c1,a:fa,r:.05,n:6,speed:1.2})})}
    // 4. the adapter path in BF16: L1 (d x r) and L2 (r x d), shapes only
    const la=k<4?0:k===4?e:k===6?1-e:1;
    if(la>.01){R.glass(L1o,[.3,0,0],[0,0,1.5],{c:ad,a:la,nu:2,nv:8});R.glass(L2o,[1.5,0,0],[0,0,.3],{c:ad,a:la,nu:8,nv:2});
      R.label([L1o[0]+.15,YA,L1o[2]],R.W<520?'L₁':'L₁ · d × r · BF16',{mono:true,fs:12,b:1,c:ad,dy:-12,a:la});
      R.label([L2o[0]+.75,YA,L2o[2]],R.W<520?'L₂':'L₂ · r × d · BF16',{mono:true,fs:12,b:1,c:ad,dy:-12,a:la});
      const fa=la*(k===5?.2:1);R.flowArc([XP[0],XP[1]+.1,0],[L1o[0]+.15,YA+.05,0],.5,{c:ad,a:fa,r:.05,n:7,speed:1.2});
      R.flow([[L1o[0]+.3,YA+.08,0],[L2o[0]+.05,YA+.08,0]],{c:ad,a:fa,r:.05,n:7,speed:1.2});
      R.flowArc([L2o[0]+1.5,YA+.05,0],[YP[0],YP[1]+.1,0],.4,{c:ad,a:fa,r:.05,n:6,speed:1.2})}
    // 5. backward: gradients into L2 and L1 (their weights train) and through the BF16 copy to X; none into the stored codes
    if(k===5){const g=e;R.flowArc([YP[0],YP[1]+.2,.2],[L2o[0]+1.4,YA+.15,.1],.4,{c:gr,a:g,r:.055,n:6,speed:.9});
      R.flow([[L2o[0]+.1,YA+.18,.1],[L1o[0]+.25,YA+.18,.1]],{c:gr,a:g,r:.055,n:6,speed:.9});
      [-.3,.3].forEach(dz=>{R.flowArc([YP[0]-.1,YP[1]+.15,YP[2]+dz],[X0+PW-.1,YB+.15,dz*.8],.3,{c:gr,a:g,r:.05,n:5,speed:.9});
        R.flowArc([X0+.1,YB+.15,dz*.8],[XP[0]+.1,XP[1]+.15,dz],.3,{c:gr,a:g,r:.05,n:5,speed:.9})});
      R.label([(L1o[0]+L2o[0])/2+.4,YA+.2,0],'∂E/∂L₁, ∂E/∂L₂',{mono:true,fs:12,b:1,c:gr,dy:-14,a:g,wide:1});
      R.label([XP[0],XP[1]+.2,XP[2]+.65],'∂E/∂X',{mono:true,fs:12,b:1,c:gr,dy:14,a:g})}
    // 6. after the multiplication only the codes and constants remain
    if(k===6)R.label([X0+PW/2,YS+.4,Z0],'stays in memory: 4.127 bits per weight',{fs:13,b:1,c:P.c4,dy:-14,a:e})
  }
  const full={cam:[.06,.5],bounds:[[-4.6,-.3,-1],[5.4,3.1,1]]};
  S3.stage({id:'stg-eq5',list:'sx-eq5',fig:'Fig. 2 · Equation 5 on 1,024 real LLaMA-7B weights',cam:full.cam,bounds:full.bounds,aspect:.5,dur:1500,hold:5200,draw,
    // the first three steps are about the stored codes and constants: in close on them
    view:k=>k<=1||k===6?{cam:[.08,.78],bounds:[[-3.4,-.3,-.9],[4.6,.8,.9]]}:k===2?{cam:[.08,.55],bounds:[[-3.4,-.3,-.9],[4.6,2,.9]]}:full,
    margin:w=>w<520?[16,10,14,10]:[18,24,16,24]});
})();
