// ---- Scene, Fig. 8 (section 8): a convex loss against a non-convex one (renderer v2) ----
// Steps 1 and 2: the page's real two-weight logistic loss (CSU): a chord between two weight vectors lies above the loss along the segment,
// a tangent plane lies below it, and at the optimum the tangent plane is flat. Steps 3 and 4: the lab's f = x² + y⁴/4 − y²/2 (illustrative):
// two minima of equal value, the chord between them below the surface, the midpoint a saddle.
(function(){
  if(!document.getElementById('stg-cvx')||!window.CSU)return;const C=CSU,F=C.lg,{mix,lerp}=S3;
  const CX=3.3,CY=.85,AX=4.4,AY=3.4,LF=(x,y)=>F.f([x,y]);
  const M1=C.mesh(LF,C.ell(CX,CY,AX,AY),16,44),SH1=2.1/(M1.hi-M1.lo),map1=(x,y,v)=>[(x-CX)*.8,(v-M1.lo)*SH1,-(y-CY)*.8],ISO1=C.iso(M1,[.3,.35,.4,.5,.6,.7,.85,1,1.2,1.4]);
  const NF=(x,y)=>x*x+y**4/4-y*y/2,M2=C.mesh(NF,C.rect(-1,1,-1.6,1.6),18,30),LO2=-.25,SH2=.62,map2=(x,y,v)=>[x*1.6,(v-LO2)*SH2+.05,-y*1.5],ISO2=C.iso(M2,[-.2,-.1,0,.25,.6,1,1.5,2]);
  const a=[.2,2.6],b=[6.3,-1],fa=LF(...a),fb=LF(...b),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];
  window.CO_CVX={a,b,fa,fb,chordMid:(fa+fb)/2,lossMid:LF(...mid),nonconvex:{min:NF(0,1),mid:NF(0,0)}};
  function draw(R,k,e){const P=R.P;R.grid(-4,4,-3,3,.5);
    const o1=k<=1?1:k===2?Math.max(0,1-2*e):0,o2=k===3?1:k===2?Math.max(0,2*e-1):0;
    if(o1>.01){C.surf(R,M1,map1,{c:P.c1,a:o1*(k===0?.75:.6),fa:.88,ea:.1});C.isoDraw(R,ISO1,LF,map1,{c:P.c1,a:o1*.7});
      // 1. the chord lies above the loss along the segment from a to b
      const A=map1(...a,fa),B=map1(...b,fb),sl=C.lift(C.seg(a,b,40),LF,map1,.03),ca=k===0?e*o1:o1*.35;
      R.line(sl,{c:P.good,w:3,top:1,a:ca});R.line([A,B],{c:P.c2,w:2.4,top:1,a:ca});
      for(let i=1;i<8;i++){const t=i/8,p=[lerp(a[0],b[0],t),lerp(a[1],b[1],t)],ch=lerp(fa,fb,t);R.line([map1(p[0],p[1],ch),map1(p[0],p[1],LF(...p))],{c:P.c2,w:1,dash:[2,3],top:1,a:ca*.8})}
      [A,B].forEach(q=>R.ball(q,.07,{c:P.ink,top:1,a:ca}));
      if(k===0){R.label(map1(...mid,(fa+fb)/2),'chord · '+((fa+fb)/2).toFixed(3),{al:'left',dx:10,dy:-8,fs:12.5,b:1,c:P.c2,a:e});
        R.label(map1(...mid,LF(...mid)),'loss at the midpoint · '+LF(...mid).toFixed(3),{al:'right',dx:-10,dy:14,fs:12.5,b:1,c:P.good,a:e})}
      // 2. tangent planes lie below; at the optimum the tangent plane is flat
      if(k===1){const w=C.wstar,h=C.fstar,s=1.4;R.glass(map1(w[0]-s*1.6,w[1]-s,h),[2*s*1.6*.8,0,0],[0,0,-2*s*.8],{c:P.good,a:e*.8,nu:6,nv:6,th:.02});
        const q=[1,0],gq=F.g(q),fq=LF(...q),u=.9;R.glass(map1(q[0]-u,q[1]-u,fq-u*gq[0]-u*gq[1]),[2*u*.8,2*u*gq[0]*SH1,0],[0,2*u*gq[1]*SH1,-2*u*.8],{c:P.c2,a:e*.7,nu:4,nv:4,th:.02});
        R.ball(map1(...q,fq),.06,{c:P.c2,top:1,a:e});R.ball(map1(w[0],w[1],h),.08,{c:P.good,top:1,a:e});
        R.label(map1(w[0],w[1],h),'flat here: the global minimum',{al:'left',dx:12,dy:16,fs:12.5,b:1,c:P.good,a:e});R.label(map1(...q,fq),'a tangent plane, below the loss',{al:'right',dx:-10,dy:-10,fs:12.5,b:1,c:P.c2,a:e})}}
    if(o2>.01){C.surf(R,M2,map2,{c:P.c4,a:o2*.8,fa:.88,ea:.12,lo:-.25,hi:2});C.isoDraw(R,ISO2,NF,map2,{c:P.c4,a:o2*.7});
      const m1=map2(0,1,-.25),m2=map2(0,-1,-.25),md=map2(0,0,0),sl=C.lift(C.seg([0,1],[0,-1],40),NF,map2,.03);
      R.line(sl,{c:P.good,w:3,top:1,a:o2});R.line([m1,m2],{c:P.c2,w:2.4,top:1,a:o2});R.line([map2(0,0,-.25),md],{c:P.c2,w:1,dash:[2,3],top:1,a:o2});
      [m1,m2].forEach(q=>R.ball(q,.08,{c:P.c4,top:1,a:o2}));R.ball(md,.07,{c:P.ink,top:1,a:o2});
      if(k===2){R.label(map2(0,0,-.25),'chord · −0.25, below the surface',{al:'left',dx:12,dy:12,fs:12.5,b:1,c:P.c2,a:o2});R.label(md,'midpoint · 0',{al:'left',dx:10,dy:-10,fs:12.5,b:1,a:o2})}
      if(k===3){R.label(m1,'network A · −0.25',{al:'left',dx:10,dy:-10,fs:12.5,b:1,c:P.c4,a:e});R.label(m2,'A with two units swapped · −0.25',{al:'left',dx:10,dy:10,fs:12.5,b:1,c:P.c4,a:e});
        R.label(md,'their average · 0',{al:'right',dx:-10,dy:-10,fs:12.5,b:1,a:e});
        [1,-1].forEach(sg=>{const pts=[];for(let t=.04;t<=1;t+=.04)pts.push(map2(0,t*sg,NF(0,t*sg)));R.flow(pts.map(p=>[p[0],p[1]+.05,p[2]]),{c:P.c4,a:e,r:.06,n:5,speed:.8,top:1})})}}
  }
  S3.stage({id:'stg-cvx',list:'sx-cvx',fig:'Fig. 8 · convex against non-convex',cam:[.4,.66],bounds:[[-3.6,0,-2.8],[3.6,2.2,2.8]],aspect:.64,dur:1600,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[20,16,16,16],
    view:k=>k>=2?{cam:[1.25,.42],bounds:[[-1.8,0,-2.6],[1.8,1.8,2.6]]}:null});
})();
