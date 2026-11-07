// ---- Scene: Fig. 8, least squares as a projection in R^3, one axis per data point (renderer v2) ----
// y = (1, 2, 2), the columns a1 = (1, 1, 1) and a2 = (0, 1, 2) of X, the foot y_hat = Xw with w = (1.167, 0.5), the residual, and the QR basis.
// The camera frame is chosen so the column space is level: world x along q2 = (-1, 0, 1)/sqrt2, depth along q1 = (1, 1, 1)/sqrt3, up along -(1, -2, 1)/sqrt6.
// Every number is computed here from X and y (the same as recompute.py: ls_w, ls3_yhat, ls3_resid, ls3_Qty).
(function(){
  if(!document.getElementById('stg-ls'))return;const {at,off,lerp,lerp3}=S3;
  const X=[[1,0],[1,1],[1,2]],y=[1,2,2],a1=[1,1,1],a2=[0,1,2];
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  // normal equations (2 x 2) for w, then the foot and the residual
  const g=[[3,3],[3,5]],r=[dot(a1,y),dot(a2,y)],dt=g[0][0]*g[1][1]-g[0][1]*g[1][0],w=[(g[1][1]*r[0]-g[0][1]*r[1])/dt,(g[0][0]*r[1]-g[1][0]*r[0])/dt];
  const yh=[0,1,2].map(i=>w[0]*a1[i]+w[1]*a2[i]),res=y.map((v,i)=>v-yh[i]);
  const eq=[1,1,1].map(v=>v/Math.sqrt(3)),eb=[-1,0,1].map(v=>v/Math.SQRT2),eu=[-1,2,-1].map(v=>v/Math.sqrt(6));
  const S=1.25,O=[-.6,1.45,2.6],Wd=p=>[O[0]+S*dot(p,eb),O[1]+S*dot(p,eu),O[2]-S*dot(p,eq)];
  const F=v=>v.toFixed(3);
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-4,4.5,.5);
    // the data axes: one per data point
    const ax=k>=3?.35:.8;[[1,0,0],[0,1,0],[0,0,1]].forEach((d,i)=>{R.line([Wd([0,0,0]),Wd(d.map(v=>2.35*v))],{c:P.mute,w:1.2,a:ax,head:6});R.label(Wd(d.map(v=>2.5*v)),'point '+(i+1),{mono:true,fs:12,c:P.mute,a:ax})});
    // y, the targets as one vector
    const ya=1;R.line([Wd([0,0,0]),Wd(y)],{c:P.ink,w:3,head:9,a:ya});R.label(Wd(y),'y = (1, 2, 2)',{fs:12.5,b:1,dx:8,dy:-6,al:'left',a:ya});
    // 2. the plane spanned by the columns
    const pa=k===1?e:k>=2?1:0;
    if(pa>0){const L0=-.6,L1=3.4,M0=-1.2,M1=1.9,o0=Wd([0,1,2].map(i=>eq[i]*L0+eb[i]*M0)),u=[0,1,2].map(i=>Wd([0,1,2].map(j=>eq[j]*L1+eb[j]*M0))[i]-o0[i]),v=[0,1,2].map(i=>Wd([0,1,2].map(j=>eq[j]*L0+eb[j]*M1))[i]-o0[i]);
      R.glass(o0,u,v,{c:P.c3,a:pa*.9,nu:8,nv:6,th:.02});R.label([o0[0]+u[0]+v[0]*.05,o0[1],o0[2]+u[2]+v[2]*.05],'column space of X: every Xw',{mono:true,fs:12,c:P.c3,b:1,a:pa,dy:12,al:'right',dx:-6});
      const ca=k===1?e:k===4?.35:1;R.line([Wd([0,0,0]),Wd(a1)],{c:P.c1,w:2.6,head:8,a:ca});R.line([Wd([0,0,0]),Wd(a2)],{c:P.c4,w:2.6,head:8,a:ca});
      if(k<4){R.label(Wd(a1),'a₁ = (1, 1, 1)',{fs:12.5,b:1,c:P.c1,dx:-8,al:'right',dy:8,a:ca});R.label(Wd(a2),'a₂ = (0, 1, 2)',{fs:12.5,b:1,c:P.c4,dx:8,al:'left',dy:8,a:ca})}}
    // 3. the foot: y_hat = w0 a1 + w1 a2, reached along the two columns
    const fa=k===2?e:k>=3?1:0;
    if(fa>0){const p1=a1.map(v=>v*w[0]);R.line([Wd([0,0,0]),Wd(p1),Wd(yh)],{c:P.c1,w:1.4,dash:[4,3],a:fa*(k===4?.3:.8)});
      R.line([Wd([0,0,0]),Wd(yh)],{c:P.c2,w:3,head:9,a:fa});R.ball(Wd(yh),.07,{c:P.c2,a:fa});
      R.label(Wd(yh),'ŷ = 1.167 a₁ + 0.5 a₂',{fs:12.5,b:1,c:P.c2,dx:8,dy:16,al:'left',a:fa*(k===4?.5:1)})}
    if(k===2)R.flow([Wd(y),Wd(yh)],{c:P.c2,a:e,r:.05,n:4,speed:.5});
    // 4. the residual at right angles
    const ra=k===3?e:k===4?1:0;
    if(ra>0){R.line([Wd(yh),Wd(y)],{c:P.c6,w:3,a:ra});const s=.12,u1=eq.map(v=>v*s/S),up=eu.map(v=>v*s/S);
      R.line([Wd(yh.map((v,i)=>v+u1[i])),Wd(yh.map((v,i)=>v+u1[i]+up[i])),Wd(yh.map((v,i)=>v+up[i]))],{c:P.c6,w:1.5,a:ra});
      R.label(Wd(yh.map((v,i)=>(v+y[i])/2)),'y − ŷ = (−0.167, 0.333, −0.167)',{fs:12.5,b:1,c:P.c6,dx:10,al:'left',a:ra});
      if(k===3)R.flow([Wd(y),Wd(yh)],{c:P.c6,a:e,r:.035,n:3,speed:.35})}
    // 5. QR: an orthonormal basis of the same plane, and the foot's coordinates in it
    if(k===4){const q1=[1,1,1].map(v=>v/Math.sqrt(3)),q2=[-1,0,1].map(v=>v/Math.SQRT2),c1=dot(q1,y),c2=dot(q2,y);
      R.line([Wd([0,0,0]),Wd(q1)],{c:P.c5,w:3,head:9,a:e});R.line([Wd([0,0,0]),Wd(q2)],{c:P.c5,w:3,head:9,a:e});
      R.label(Wd(q1),'q₁',{fs:13,b:1,c:P.c5,dx:-8,al:'right',a:e});R.label(Wd(q2),'q₂',{fs:13,b:1,c:P.c5,dx:-8,dy:-8,al:'right',a:e});
      R.line([Wd(q1.map(v=>v*c1)),Wd(yh)],{c:P.c5,w:1.3,dash:[3,3],a:e*.8});R.line([Wd(q2.map(v=>v*c2)),Wd(yh)],{c:P.c5,w:1.3,dash:[3,3],a:e*.8});
      R.label(Wd(yh),'Qᵀy = ('+F(c1)+', '+F(c2)+')',{mono:true,fs:12.5,b:1,c:P.c5,dy:36,dx:8,al:'left',a:e})}
  }
  const fit=ps=>{const W=ps.map(Wd),lo=[0,1,2].map(i=>Math.min(...W.map(p=>p[i]))),hi=[0,1,2].map(i=>Math.max(...W.map(p=>p[i])));return [[lo[0]-.3,0,lo[2]-.3],[hi[0]+.3,hi[1]+.2,hi[2]+.3]]};
  const pts=[[0,0,0],[2.5,0,0],[0,2.5,0],[0,0,2.5],y,a2];
  const full={cam:[.62,.5],bounds:fit(pts)};
  S3.stage({id:'stg-ls',list:'sx-ls',fig:'Fig. 8 · ℝ³, one axis per data point',cam:full.cam,bounds:full.bounds,aspect:.6,dur:1500,hold:4600,draw,
    view:k=>k===3?{cam:[.95,.12],bounds:(()=>{const a=Wd(yh),b=Wd(y);return [[Math.min(a[0],b[0])-1.8,Math.min(a[1],b[1])-.6,Math.min(a[2],b[2])-1.8],[Math.max(a[0],b[0])+1.8,Math.max(a[1],b[1])+.5,Math.max(a[2],b[2])+1.8]]})()}:full});
})();
