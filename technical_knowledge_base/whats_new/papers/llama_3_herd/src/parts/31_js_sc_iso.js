// ---- Scene: the scaling law that sized the 405B, Fig. 1 (renderer v2) ----
// Every point and line is the page's own: the 133 runs of Figure 2 read from the vector PDF (window.PAPER.figs.fig2: tokens, loss),
// the parabolas refitted by recompute.py (rc.iso[budget].c, in log10 tokens), their minima, and the power law through them (rc.fit: alpha, A),
// extrapolated to the flagship's budget (rc.forecast.refit). Floor: log10 training tokens across, log10 training FLOPs in depth; height: validation loss.
(function(){
  if(!document.getElementById('stg-iso')||!window.S3)return;const {at,mix}=S3;
  const RCX=window.PAPER.rc,FGX=window.PAPER.figs,BUD=Object.keys(FGX.fig2),lg=Math.log10,HI=BUD.indexOf('1e+21')>=0?BUD.indexOf('1e+21'):BUD.indexOf('1e21');
  const X=lx=>(lx-11.2)*1.15,Z=lC=>(lC-22.2)*.75,LB=.67,HS=6.5,Y=L=>(L-LB)*HS;
  const hue=i=>'hsl('+(205-i*16)+',58%,'+(52-i*2.2)+'%)';            // the 2D Figure 2 chart's blues to purples
  const al=RCX.fit.alpha,A=RCX.fit.A,Dst=C=>A*Math.pow(C,al),FR=RCX.forecast.refit;
  const pq=(c,lx)=>c[0]+c[1]*lx+c[2]*lx*lx;
  const hum=v=>v>=1e12?(v/1e12).toFixed(v>=1e13?2:1)+'T':v>=1e9?(v/1e9).toFixed(v>=1e11?0:1)+'B':(v/1e6).toFixed(0)+'M';
  const sup=n=>String(n).replace(/[-0-9]/g,c=>'⁻⁰¹²³⁴⁵⁶⁷⁸⁹'['-0123456789'.indexOf(c)]);
  const sciT=C=>{const e=Math.floor(lg(C)+1e-9),m=C/10**e;return (Math.abs(m-1)<1e-6?'':(+m.toFixed(1))+' × ')+'10'+sup(e)};
  function parab(b){const r=RCX.iso[b],xs=FGX.fig2[b].points.map(p=>lg(p[0])),a=Math.min(...xs)-.05,c=Math.max(...xs)+.05,lC=lg(+b),pts=[];
    for(let i=0;i<=36;i++){const lx=a+(c-a)*i/36;pts.push([X(lx),Y(pq(r.c,lx)),Z(lC)])}return pts}
  const C0=+BUD[0],C1=+BUD[BUD.length-1],CF=3.8e25,CG=RCX.C_for_16_55T;
  function lawLine(ca,cb){const pts=[];for(let i=0;i<=24;i++){const C=ca*Math.pow(cb/ca,i/24);pts.push([X(lg(Dst(C))),.012,Z(lg(C))])}return pts}
  // steps 1 and 2 are about one budget, whose loss varies by only 0.02: its heights are stretched 4 times around its minimum there
  // (local loss ticks say so), easing back to the common scale at step 3
  const EXA=(k,e)=>k<=1?4:k===2?4-3*e:1;
  // at step 5 every curve is lowered onto the floor, so the minima land where the power law is drawn (a floor plan of tokens against FLOPs)
  const DROP=(k,e)=>k<4?1:k===4?1-e:0;
  function yv(L,b,k,e){const d=DROP(k,e);if(b!==BUD[HI])return d*Y(L);const m=RCX.iso[b].min_loss;return d*(Y(m)+(L-m)*HS*EXA(k,e))}
  function draw(R,k,e){const P=R.P;R.grid(-2.8,2.8,-2.9,2.9,.4);
    // axes on the floor: tokens across the front edge, budget along the right edge
    const W5=k>=5,zf=W5?Z(26.4):Z(22.4),xr=W5?X(13.7):X(12.4);
    if(k>=2)(W5?[[9,'1B'],[10,'10B'],[11,'100B'],[12,'1T'],[13,'10T']]:[[9,'1B'],[10,'10B'],[11,'100B'],[12,'1T']]).forEach(([v,t])=>R.label([X(v),0,zf],t,{mono:true,fs:12,c:P.mute,dy:4,wide:W5&&v<12}));
    if(k>=2)R.label([X(8.75),0,zf],'tokens',{mono:true,fs:12,c:P.ink,al:'right',dx:-6,dy:4,wide:1});
    if(k>=2)(W5?[[19,'10¹⁹ FLOPs'],[21,'10²¹'],[23,'10²³']]:[[19,'10¹⁹ FLOPs'],[20,'10²⁰'],[21,'10²¹'],[22,'10²²']]).forEach(([v,t])=>R.label([xr,0,Z(v)],t,{mono:true,fs:12,c:P.mute,al:'left',dx:4}));
    if(k>=2&&k<=3){const hp=[X(9.05),0,Z(18.6)];R.line([hp,[hp[0],Y(.94),hp[2]]],{c:P.mute,w:1,a:.7});
      [.7,.8,.9].forEach(L=>{R.line([[hp[0]-.05,Y(L),hp[2]],[hp[0]+.05,Y(L),hp[2]]],{c:P.mute,w:1});R.label([hp[0],Y(L),hp[2]],'loss '+L.toFixed(1),{mono:true,fs:12,c:P.mute,al:'right',dx:-6,grp:'ax'})})}
    if(k<=1){const b=BUD[HI],xs=FGX.fig2[b].points.map(p=>lg(p[0])),hp=[X(Math.min(...xs))-.25,0,Z(lg(+b))];R.line([[hp[0],yv(.735,b,k,e),hp[2]],[hp[0],yv(.758,b,k,e),hp[2]]],{c:P.mute,w:1});
      [.74,.75].forEach(L=>{const y=yv(L,b,k,e);R.line([[hp[0]-.04,y,hp[2]],[hp[0]+.04,y,hp[2]]],{c:P.mute,w:1});R.label([hp[0],y,hp[2]],'loss '+L.toFixed(2),{mono:true,fs:12,c:P.mute,al:'right',dx:-6})});
      R.label([hp[0],yv(.735,b,k,e),hp[2]],'height × 4',{mono:true,fs:12,c:P.mute,al:'right',dx:-6,dy:16,wide:1})}
    // the runs and their parabolas, budget by budget: one budget first (steps 1 and 2), all ten from step 3
    BUD.forEach((b,i)=>{const one=i===HI,c=hue(i),lC=lg(+b),r=RCX.iso[b];
      const a=k<=1?(one?1:0):k===2?(one?1:e):k===3?(i>=8||i<=1?1:.28):.3;if(a<=.01)return;
      FGX.fig2[b].points.forEach(p=>{const x=X(lg(p[0])),y=yv(p[1],b,k,e),z=Z(lC);
        if(one&&k<=1)R.line([[x,0,z],[x,y,z]],{c,w:1,a:a*.35});R.ball([x,y,z],one&&k<=1?.05:.038,{c,a})});
      // the cut on the floor: this budget's runs trade parameters for tokens along one line
      const xs=FGX.fig2[b].points.map(p=>lg(p[0]));R.line([[X(Math.min(...xs)),.004,Z(lC)],[X(Math.max(...xs)),.004,Z(lC)]],{c,w:1.2,a:a*.5,dash:[4,3]});
      if(k>=1){const pa=one&&k===1?e:a,pts=parab(b).map(q=>[q[0],yv(q[1]/HS+LB,b,k,e),q[2]]);R.line(pts,{c,w:one&&k<=1?3:2,a:pa,top:1});
        const lm=lg(r.min_tokens),pm=[X(lm),yv(r.min_loss,b,k,e),Z(lC)];R.ball(pm,one&&k<=1?.07:.05,{c:P.ink,a:pa,top:1});
        if(one&&k===1){R.glow(pm,.2,{c,a:pa,top:1});R.label(pm,'minimum: '+hum(r.min_tokens)+' tokens, loss '+r.min_loss.toFixed(3),{fs:12.5,b:1,c:P.ink,dy:22,a:pa})}
        if(k>=4)R.line([[pm[0],0,pm[2]],pm],{c:P.ink,w:1,a:pa*.5,dash:[2,3]})}
      if(one&&k===0){const top=FGX.fig2[b].points.slice().sort((u,v)=>u[0]-v[0]);R.label([X(lg(top[0][0])),yv(top[0][1],b,k,e),Z(lC)],sciT(+b)+' FLOPs: '+top.length+' runs',{fs:12.5,b:1,c,dy:-16,al:'left'})}
      if(k===2||k===3){const pp=parab(b),e0=pp[pp.length-1];if(i===0||i>=8||k===2&&i%3===0)R.label([e0[0],yv(e0[1]/HS+LB,b,k,e),e0[2]],(k===3?'curvature '+r.c[2].toFixed(3):sciT(+b)),{mono:true,fs:12,c,al:'left',dx:8,a:Math.max(.6,a),grp:'bud'})}});
    // the minima on the floor lie on one straight line in log-log: the power law
    if(k>=4){const a=k===4?e:1;BUD.forEach(b=>R.ball([X(lg(RCX.iso[b].min_tokens)),.02,Z(lg(+b))],.055,{c:P.c1,a}));
      const ln=lawLine(C0,C1);R.line(ln,{c:P.c1,w:3,a});R.flow(ln.map(p=>[p[0],.05,p[2]]),{c:P.c1,a,r:.055,speed:.8});
      if(k===4)R.label(ln[24],'D* = '+A.toFixed(4)+' C^'+al.toFixed(4),{mono:true,fs:12.5,b:1,c:P.c1,al:'left',dx:12,a})}
    // 3.6 orders of magnitude further: the flagship's budget
    if(k>=5){const ln=lawLine(C1,CG);R.line(ln,{c:P.c1,w:2.4,a:e,dash:[6,4],head:9});R.flow(ln.map(p=>[p[0],.05,p[2]]),{c:P.c1,a:e,r:.06,speed:1.2});
      const pF=[X(lg(FR['D_at_3.8e25'])),.05,Z(lg(CF))],pG=[X(lg(16.55e12)),.05,Z(lg(CG))],pR=[X(lg(15.6e12)),.05,Z(lg(CF))];
      R.glow(pG,.28,{c:P.c1,a:e});R.ball(pG,.075,{c:P.c1,a:e});R.label(pG,'4.0 × 10²⁵ FLOPs: '+hum(16.55e12)+' tokens, '+(FR.N_at_4e25/1e9).toFixed(1)+'B',{fs:12.5,b:1,c:P.c1,al:'right',dx:-16,dy:-30,a:e});
      R.ball(pF,.06,{c:P.mute,a:e});R.label(pF,'at 3.8 × 10²⁵: '+(FR['D_at_3.8e25']/1e12).toFixed(1)+'T, '+(FR['N_at_3.8e25']/1e9).toFixed(0)+'B',{fs:12,mono:true,c:P.mute,al:'right',dx:-16,dy:-12,a:e,wide:1});
      R.box(pR,[.14,.45,.14],{fill:mix(P.paper,P.c3,.55),a:e});R.label([pR[0],.05,pR[2]],'the run: 405B on 15.6T',{fs:12.5,b:1,c:P.c3,al:'right',dx:-16,dy:6,a:e})}
  }
  const b21=BUD[HI],lm=lg(RCX.iso[b21].min_tokens),lC21=lg(+b21);
  const near={cam:[.3,.42],bounds:[[X(lm-.75),0,Z(lC21)-.45],[X(lm+.7),yv(.758,b21,0,1),Z(lC21)+.45]]};
  const data={cam:[.45,.55],bounds:[[X(9.1),0,Z(18.6)],[X(12.3),Y(.94),Z(22.2)]]};
  const top={cam:[.3,.95],bounds:[[X(9.1),0,Z(18.6)],[X(12.7),.4,Z(22.5)]]};
  const full={cam:[.2,1.1],bounds:[[X(9),0,Z(18.6)],[X(13.7),.3,Z(26.6)]]};
  S3.stage({id:'stg-iso',list:'sx-iso',fig:'Fig. 1 · the scaling law that sized the 405B',cam:data.cam,bounds:data.bounds,aspect:.72,dur:1500,hold:5200,draw,
    view:k=>{const v=k<=1?near:k<=3?data:k===4?top:full;return innerWidth<600?{cam:[v.cam[0],v===near?.62:Math.max(.75,v.cam[1]+.2)],bounds:v===near?[v.bounds[0],[v.bounds[1][0],v.bounds[1][1],v.bounds[1][2]-.4]]:v.bounds}:v},
    margin:w=>w<520?[14,10,14,10]:[18,16,16,70]});
})();
