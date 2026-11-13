// ---- Scene: Fig. 1, the running matrix A = [[3, 0], [4, 5]] as rotate, stretch, rotate (renderer v2: glass plates, flowing dots, camera per step) ----
// Four glass plates stand one behind the other: the input, then the picture after V^T, after Sigma V^T, and after U Sigma V^T = A.
// Every shape is the unit circle mapped by the page's own SVD of A (LA.svd, the same numbers recompute.py writes as A_sv, A_rotVt_deg, A_rotU_deg).
(function(){
  if(!document.getElementById('stg-hero'))return;const {at,off,lerp}=S3;
  const A=[[3,0],[4,5]],r2=Math.SQRT1_2,v1=[r2,r2],v2=[-r2,r2],s=[Math.sqrt(45),Math.sqrt(5)];
  const Vt=[[v1[0],v1[1]],[v2[0],v2[1]]],SVt=[[s[0]*Vt[0][0],s[0]*Vt[0][1]],[s[1]*Vt[1][0],s[1]*Vt[1][1]]];
  const u1=[1/Math.sqrt(10),3/Math.sqrt(10)],A1=[[s[0]*u1[0]*v1[0],s[0]*u1[0]*v1[1]],[s[0]*u1[1]*v1[0],s[0]*u1[1]*v1[1]]]; // sigma1 u1 v1^T = [[1.5,1.5],[4.5,4.5]]
  const MS=[[[1,0],[0,1]],Vt,SVt,A],mv=(M,p)=>[M[0][0]*p[0]+M[0][1]*p[1],M[1][0]*p[0]+M[1][1]*p[1]];
  const SC=.5,YC=3.75,Z=[4.2,2.4,0,-2.6],X=[-4.4,-2.6,.2,4.2];
  // plate k: centre, half sizes (in plane units) and a tint
  const HS=[[1.45,1.45],[1.45,1.45],[7.3,2.7],[3.6,6.95]];
  const W=(k,p)=>[X[k]+p[0]*SC,YC+p[1]*SC,Z[k]+.04];
  const NS=14,TS=[...Array(NS)].map((_,i)=>i/NS*2*Math.PI);
  function shape(M){const pts=[];for(let i=0;i<=72;i++){const t=i/72*2*Math.PI;pts.push(mv(M,[Math.cos(t),Math.sin(t)]))}return pts}
  const mix2=(M,N,t)=>M.map((r,i)=>r.map((v,j)=>lerp(v,N[i][j],t)));
  function draw(R,k,e){const P=R.P,tint=[P.mute,P.c4,P.c5,P.c3],names=['input: unit circle','Vᵀ: rotate −45°','Σ: stretch 6.708, 2.236','U: rotate 71.57°'];
    R.grid(-7,7,-6,8,.5);
    // how strongly each plate is shown at this step (composition: the plates a step is about at full strength, the rest recede)
    const base=[[1,.22,.22,.22],[1,1,.22,.22],[.35,1,1,.22],[.25,.35,1,1],[1,.18,.18,1],[.2,.2,.55,1]][k];
    const prev=k>0?[[1,.22,.22,.22],[1,1,.22,.22],[.35,1,1,.22],[.25,.35,1,1],[1,.18,.18,1],[.2,.2,.55,1]][k-1]:base;
    const A_=prev.map((v,i)=>lerp(v,base[i],e));
    // what each plate shows: plate j holds the circle mapped by MS[j] once its step has come (plate 3 shows A's ellipse, then A_1's segment at the last step)
    const shown=j=>j===0||k>=j||(k===4&&j===3);
    const arrive=j=>j===0?1:k===j?e:k>j?1:0;
    const Mof=j=>j===3&&k===5?mix2(A,A1,e):j===2&&k===5?mix2(SVt,[[SVt[0][0],SVt[0][1]],[0,0]],e):MS[j];
    for(let j=0;j<4;j++){const a=A_[j],h=HS[j],o0=[X[j]-h[0]*SC,YC-h[1]*SC,Z[j]];
      R.glass(o0,[2*h[0]*SC,0,0],[0,2*h[1]*SC,0],{c:tint[j],a:a*.9,nu:j>=2?8:4,nv:j>=2?8:4});
      if(a>.5)R.label([X[j],YC+h[1]*SC,Z[j]],names[j],{mono:true,fs:12,dy:-11,c:tint[j],a,b:a>.8});
      if(!shown(j))continue;const ar=arrive(j)*a;if(ar<=.02)continue;const M=Mof(j);
      if(j>=2)R.line(shape([[1,0],[0,1]]).map(p=>W(j,p)),{c:P.mute,w:1,dash:[3,3],a:ar*.8}); // the unit circle, to scale
      R.line(shape(M).map(p=>W(j,p)),{c:P.c6,w:2.4,a:ar});
      TS.forEach(t=>R.ball(W(j,mv(M,[Math.cos(t),Math.sin(t)])),.06,{c:P.c6,a:ar}));
      const a1=mv(M,v1),a2=mv(M,v2);
      R.line([W(j,[0,0]),W(j,a1)],{c:P.c1,w:2.6,head:8,a:ar});if(Math.hypot(a2[0],a2[1])>.05)R.line([W(j,[0,0]),W(j,a2)],{c:P.c2,w:2.6,head:8,a:ar});
      const lab=j<2?['v₁','v₂']:j===2?['σ₁ = 6.708','σ₂ = 2.236']:['σ₁u₁','σ₂u₂'];
      if(ar>.5){R.label(W(j,a1),lab[0],{fs:12.5,b:1,c:P.c1,dx:a1[0]>=0?8:-8,al:a1[0]>=0?'left':'right'});if(Math.hypot(a2[0],a2[1])>.3)R.label(W(j,a2),lab[1],{fs:12.5,b:1,c:P.c2,dx:a2[0]>0.05?8:-8,dy:j===2?-10:0,al:a2[0]>0.05?'left':'right'})}}
    // data moving: the circle's points stream from one plate to the next while the step that maps them plays
    if(k>=1&&k<=3){const fa=Math.min(1,e*1.6);TS.forEach(t=>{const p=[Math.cos(t),Math.sin(t)];R.flow([W(k-1,mv(MS[k-1],p)),W(k,mv(MS[k],p))],{c:P.c6,a:fa*.85,r:.05,n:4,speed:1.4})});
      [[v1,P.c1],[v2,P.c2]].forEach(([v,c])=>R.flow([W(k-1,mv(MS[k-1],v)),W(k,mv(MS[k],v))],{c,a:fa,r:.07,n:5,speed:1.4}))}
    if(k===4){const fa=Math.min(1,e*1.6);TS.forEach(t=>{const p=[Math.cos(t),Math.sin(t)];R.flowArc(W(0,p),W(3,mv(A,p)),1.4,{c:P.c6,a:fa*.85,r:.05,n:7,speed:1.6})});
      R.label([X[3],YC-HS[3][1]*SC,Z[3]],'A in one step: the same ellipse',{mono:true,fs:12,dy:14,c:P.ink,a:e,b:1});
      R.label([X[0],YC-HS[0][1]*SC,Z[0]],'rank 2 · ‖A‖₂ = 6.708 · κ = 3',{mono:true,fs:12,dy:14,c:P.ink,a:e})}
    if(k===5){R.label([X[3],YC-HS[3][1]*SC,Z[3]],'A₁ = σ₁u₁v₁ᵀ: the circle lands on a segment',{mono:true,fs:12,dy:14,c:P.ink,a:e,b:1});
      R.label([X[2],YC-HS[2][1]*SC,Z[2]],'σ₂ → 0: error ‖A − A₁‖ = σ₂ = 2.236',{mono:true,fs:12,dy:14,c:P.c2,a:e})}
  }
  // bounds of a set of plates, for the camera
  const B=js=>{let x0=1e9,x1=-1e9,y0=1e9,y1=-1e9,z0=1e9,z1=-1e9;js.forEach(j=>{const h=HS[j];x0=Math.min(x0,X[j]-h[0]*SC);x1=Math.max(x1,X[j]+h[0]*SC);y0=Math.min(y0,YC-h[1]*SC);y1=Math.max(y1,YC+h[1]*SC);z0=Math.min(z0,Z[j]);z1=Math.max(z1,Z[j])});return [[x0-.3,y0-.5,z0-.2],[x1+.3,y1+.4,z1+.2]]};
  const full={cam:[.42,.24],bounds:B([0,1,2,3])};
  S3.stage({id:'stg-hero',list:'sx-hero',fig:'Fig. 1 · A = UΣVᵀ, drawn to scale',cam:full.cam,bounds:full.bounds,aspect:.62,dur:1500,hold:4400,draw,
    view:k=>k<=1?{cam:[.36,.22],bounds:B([0,1])}:k===2?{cam:[.4,.22],bounds:B([1,2])}:k===3||k===5?{cam:[.42,.22],bounds:B([1,2,3])}:full});
})();
