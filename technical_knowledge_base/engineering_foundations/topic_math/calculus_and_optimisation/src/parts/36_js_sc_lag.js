// ---- Scene, Fig. 9 (section 9): maximise f = x + y on the circle x² + y² = c; the gradients line up at the optimum (renderer v2) ----
// f is a tilted plane; the constraint is a circle on the floor, lifted onto the plane as a curve. All values are computed: f* = sqrt(2c), lambda = 1/(2x).
(function(){
  if(!document.getElementById('stg-lag'))return;const {mix,lerp}=S3,C=window.CSU;
  const XS=1.35,SH=.5,B=1.75*Math.SQRT2*SH+.12,map=(x,y,v)=>[x*XS,B+v*SH,-y*XS],F=(x,y)=>x+y;
  const M=C.mesh(F,C.ell(0,0,1.75,1.75),8,48);
  window.CO_LAG={fstar:Math.SQRT2,lambda:1/Math.SQRT2,c2:Math.sqrt(4)};
  const deg=Math.PI/180;
  function circ(r,lift){const o=[];for(let i=0;i<=72;i++){const t=i*5*deg,x=r*Math.cos(t),y=r*Math.sin(t);const p=map(x,y,lift?F(x,y):0);if(!lift)p[1]=.01;else p[1]+=.02;o.push(p)}return o}
  function draw(R,k,e){const P=R.P;R.grid(-3,3,-3,3,.5);
    // the contour lines of f drawn on the plane (x + y = const), so the value of each point on the curve can be read off
    for(let c=-2;c<=2.01;c+=.5){const r=Math.sqrt(1.75*1.75-c*c/2);if(!isFinite(r))continue;const p0=[c/2-r/Math.SQRT2,c/2+r/Math.SQRT2],p1=[c/2+r/Math.SQRT2,c/2-r/Math.SQRT2];
      const A=map(...p0,c),Bq=map(...p1,c);A[1]+=.01;Bq[1]+=.01;R.line([A,Bq],{c:P.c1,w:1,a:.5,dz:-.05})}
    C.surf(R,M,map,{c:P.c1,a:.6,fa:.5,ea:.12,lo:-2.5,hi:2.5});
    const cc=k===3?lerp(1,2,e):1,r=Math.sqrt(cc);
    R.line(circ(r,false),{c:P.c2,w:1.6,dash:[5,4],a:.9});R.line(circ(r,true),{c:P.c2,w:2.6,top:1});
    if(k===3&&e>.02){R.line(circ(1,true),{c:P.c2,w:1.2,dash:[3,3],top:1,a:.5})}
    const th=k===0?10*deg:k===1?lerp(10,45,e)*deg:45*deg,x=r*Math.cos(th),y=r*Math.sin(th),fl=map(x,y,0),on=map(x,y,F(x,y));fl[1]=.02;
    R.line([fl,on],{c:P.ink,w:1,dash:[2,3],a:.7,top:1});R.ball(on,.09,{c:P.ink,top:1});R.ball(fl,.05,{c:P.ink,top:1,a:.7});
    // the two gradients at the floor point: grad f = (1, 1) everywhere (blue), grad g = (2x, 2y) (orange)
    const gf=[1,1],gg=[2*x,2*y],sc=.75,arr=(v,c,s)=>R.line([fl,[fl[0]+v[0]*s*XS,.02,fl[2]-v[1]*s*XS]],{c,w:2.6,head:9,top:1});
    if(k>=1){arr(gf,P.c1,sc);arr(gg,P.c2,.5/(r||1));
      const ang=Math.acos(Math.max(-1,Math.min(1,(gf[0]*gg[0]+gf[1]*gg[1])/(Math.SQRT2*Math.hypot(...gg)))))/deg;
      R.label([fl[0]+.75*XS,.02,fl[2]-.75*XS],'∇f',{al:'left',dx:6,fs:13,b:1,c:P.c1});R.label([fl[0]+gg[0]*.5/(r||1)*XS,.02,fl[2]-gg[1]*.5/(r||1)*XS],'∇g',{al:'right',dx:-6,dy:10,fs:13,b:1,c:P.c2});
      if(k===1)R.label(on,'f = '+(x+y).toFixed(3)+' · angle '+Math.round(ang)+'°',{al:'left',dx:12,dy:-12,fs:12.5,b:1})}
    if(k===0)R.label(on,'f = x + y = '+(x+y).toFixed(3),{al:'left',dx:12,dy:-12,fs:12.5,b:1,a:e});
    if(k===2){R.glow(on,.45,{c:P.good,a:e,top:1});R.label(on,'parallel · f* = √2 = 1.414 · λ = 0.707',{al:'left',dx:12,dy:-12,fs:12.5,b:1,c:P.good,a:e})}
    if(k===3){R.glow(on,.4,{c:P.good,a:.8,top:1});R.label(on,'c = '+cc.toFixed(2)+' · f* = √(2c) = '+Math.sqrt(2*cc).toFixed(3),{al:'left',dx:12,dy:-12,fs:12.5,b:1,c:P.good})}
  }
  S3.stage({id:'stg-lag',list:'sx-lag',fig:'Fig. 9 · a constraint on a surface',cam:[.5,.6],bounds:[[-2.4,0,-2.4],[2.4,2.6,2.4]],aspect:.72,dur:2200,hold:4800,draw,
    margin:w=>w<520?[14,10,14,10]:[20,16,16,16]});
})();
