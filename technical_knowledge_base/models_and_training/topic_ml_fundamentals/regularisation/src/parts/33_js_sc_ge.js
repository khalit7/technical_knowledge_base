// ---- Scene (section 2, Fig. 2): why L1 gives exact zeros, in 3D (renderer v2) ----
// Real data, computed here: the diabetes data (Efron et al. 2004), all 442 patients, standardised to unit length, response centred;
// two coefficients, bmi and bp (correlated at 0.40). The training error RSS(b) over (b_bmi, b_bp) is the bowl; least squares is its bottom.
// The level shown is the 2D explorer's step "+55% of the way to b = 0" (training error rssMin + 0.55 (RSS(0) - rssMin)); at that error the ridge
// and lasso fits are found by bisection on λ exactly as in 40_js_geo.js (ridge in closed form, lasso by least angle regression), so both sit on one ellipse.
// The constraint regions are the budgets through those fits: a disc b₁² + b₂² ≤ r² for ridge, a diamond |b₁| + |b₂| ≤ t for the lasso.
// The step list's numbers are static spans (data-ge) written from this computation; check_stages.mjs compares them and recomputes the fits.
(function(){
  const $=id=>document.getElementById(id);if(!$('stg-ge')||!window.S3||!window.RG)return;const {at,off,lerp,mix}=S3;
  const D=RG.parse(DIAB.raw),N=D.y.length,all=[...Array(N).keys()],z=RG.stdz(D.X,D.y,all),SF=RG.stats(z.f(all),z.g(all)),S=RG.sub(SF,[2,3]);
  const ols=RG.ols(S),knots=RG.lassoPath(S),rssMin=RG.rss(S,ols),dMax=RG.rss(S,[0,0])-rssMin,up=b=>RG.rss(S,b)-rssMin,F=.55,lev=F*dMax;
  function fitAt(m,target){const fl=l=>m==='ridge'?RG.ridge(S,l):RG.pathAt(knots,l);let lo=0,hi=m==='lasso'?knots[0].lam:1;if(m==='ridge')while(up(fl(hi))<target)hi*=2;
    for(let it=0;it<70;it++){const mid=(lo+hi)/2;if(up(fl(mid))<target)lo=mid;else hi=mid}return {b:fl(hi),lam:hi}}
  const RI=fitAt('ridge',lev),LA=fitAt('lasso',lev),rr=Math.hypot(...RI.b),tt=Math.abs(LA.b[0])+Math.abs(LA.b[1]);
  // the regularisation paths, from least squares (λ = 0) to b = 0
  const rpath=[ols.slice()];for(let i=0;i<=40;i++){rpath.push(RG.ridge(S,Math.pow(10,-3+i*.1)))}rpath.push([0,0]);
  const lpath=knots.slice().reverse().map(k=>k.b);
  window.RG_GE={ols,ri:RI,la:LA,lev,rssMin,dMax,knots};
  const f0=v=>Math.round(v).toLocaleString('en-GB'),f3=v=>v.toFixed(3);
  const FMT={ols0:()=>f0(ols[0]),ols1:()=>f0(ols[1]),lev:()=>'+'+(100*lev/rssMin).toFixed(1)+'%',ri0:()=>f0(RI.b[0]),ri1:()=>f0(RI.b[1]),ril:()=>f3(RI.lam),
    la0:()=>f0(LA.b[0]),la1:()=>Math.abs(LA.b[1])<1e-9?'0':String(LA.b[1]),lal:()=>f3(LA.lam),kn:()=>f0(knots[1].b[0]),knl:()=>f3(knots[1].lam),knl0:()=>f3(knots[0].lam)};
  document.querySelectorAll('[data-ge]').forEach(e=>{const f=FMT[e.dataset.ge];if(f)e.textContent=f()});
  // world: x along b_bmi, z along b_bp (receding), y the training error above least squares
  const SC=250,XC=700,ZC=400,HT=2.2,CAP=1.25*dMax;
  const X=b=>(b-XC)/SC,Z=b=>-(b-ZC)/SC,Y=d=>HT*Math.min(1,d/CAP),P3=(b,dy)=>[X(b[0]),Y(up(b))+(dy||0),Z(b[1])],F3=(b,y)=>[X(b[0]),y||0,Z(b[1])];
  const B0=[-300,1700],B1=[-470,1270],NU=24,NV=20,du=(B0[1]-B0[0])/NU,dv=(B1[1]-B1[0])/NV;
  function ellipse(level){const a=S.G[0][0],b=S.G[0][1],d=S.G[1][1],tr=(a+d)/2,df=Math.sqrt(((a-d)/2)**2+b*b),e1=tr+df,e2=tr-df;
    const v1=Math.abs(b)>1e-12?[e1-d,b]:[1,0],n1=Math.hypot(...v1),q1=[v1[0]/n1,v1[1]/n1],q2=[-q1[1],q1[0]],out=[];
    for(let i=0;i<=72;i++){const th=2*Math.PI*i/72,u=Math.sqrt(level/e1)*Math.cos(th),v=Math.sqrt(level/e2)*Math.sin(th);out.push([ols[0]+u*q1[0]+v*q2[0],ols[1]+u*q1[1]+v*q2[1]])}return out}
  const ELL=ellipse(lev),ELO=ELL.reduce((m,q)=>q[1]<m[1]?q:m,ELL[0]); // the ring's point nearest the reader (lowest bp): its label sits there
  // the bowl: quads tinted by height; inside a budget region they take the method's colour, outside they recede
  function bowl(R,a,reg,col,ao){const P=R.P;if(a<=.01)return;
    for(let i=0;i<NU;i++)for(let j=0;j<NV;j++){const c=[[B0[0]+i*du,B1[0]+j*dv],[B0[0]+(i+1)*du,B1[0]+j*dv],[B0[0]+(i+1)*du,B1[0]+(j+1)*dv],[B0[0]+i*du,B1[0]+(j+1)*dv]];
      const m=[B0[0]+(i+.5)*du,B1[0]+(j+.5)*dv],h=Y(up(m))/HT,inside=reg?reg(m):true,fill=inside&&reg?mix(P.paper,col,.25+.45*(1-h)):mix(P.paper,P.c6,.1+.4*(1-h));
      R.quad(c.map(q=>P3(q)),{fill,a:a*(inside?1:ao),ea:.1,lw:.5})}}
  // a budget region as glass walls standing on the floor: a cylinder (ridge) or a diamond prism (lasso)
  function walls(R,m,a,col,hgt){if(a<=.01)return;if(m==='lasso'){const c=[[tt,0],[0,tt],[-tt,0],[0,-tt],[tt,0]];
      for(let i=0;i<4;i++){const p=F3(c[i]),q=F3(c[i+1]);R.glass(p,[q[0]-p[0],0,q[2]-p[2]],[0,hgt,0],{c:col,a:a*.8,nu:4,nv:3,th:.02})}
      R.quad(c.slice(0,4).map(q=>F3(q,.005)),{fill:col,fa:.18,a,ec:col,ea:.9,lw:1.6});return}
    const n=36;for(let i=0;i<n;i++){const t0=2*Math.PI*i/n,t1=2*Math.PI*(i+1)/n,p=[rr*Math.cos(t0),rr*Math.sin(t0)],q=[rr*Math.cos(t1),rr*Math.sin(t1)];
      R.quad([F3(p),F3(q),F3(q,hgt),F3(p,hgt)],{fill:col,fa:.13,a,ec:col,ea:.22,lw:.6})}
    const ring=[];for(let i=0;i<=72;i++){const t=2*Math.PI*i/72;ring.push([rr*Math.cos(t),rr*Math.sin(t)])}
    R.quad(ring.map(q=>F3(q,.005)),{fill:col,fa:.18,a,edge:false});R.line(ring.map(q=>F3(q,.01)),{c:col,w:1.6,a});R.line(ring.map(q=>F3(q,hgt)),{c:col,w:1,a:a*.6})}
  function draw(R,k,e){const P=R.P,ri=P.c2,la=P.c1,lv=P.c5;R.grid(-4.6,4.6,-4,4,.5);
    // the axes through b = 0: on the bmi axis bp is exactly 0
    const ax=k>=3?1:.55;R.line([F3([B0[0],0],.01),F3([B0[1],0],.01)],{c:P.ink,w:k>=3?2:1.2,a:ax});R.line([F3([0,B1[0]],.01),F3([0,B1[1]],.01)],{c:P.ink,w:1.2,a:.55});
    R.label(F3([B0[1],0]),'bmi coefficient',{fs:12,mono:true,al:'left',dx:6,c:P.ink,a:Math.max(.7,ax)});
    if(k>=3)R.label(F3([B0[1],0]),'on this axis bp = 0',{fs:12,mono:true,al:'left',dx:6,dy:15,c:P.ink,a:ax,wide:1});
    R.label(F3([0,B1[1]]),'bp coefficient',{fs:12,mono:true,dy:-12,c:P.ink,a:.7});
    R.ball(F3([0,0],.02),.06,{c:P.mute});R.label(F3([0,0]),'b = 0',{fs:12,mono:true,dy:14,al:'right',dx:-4,c:P.mute});
    // the bowl: full in steps 1 and 2, tinted by the region in 3 and 4, gone from above (5, 6)
    // the bowl recedes while the budgets are shown (3, 4) and is gone from above (5, 6)
    const ba=k<=1?1:k===2?lerp(1,.45,e):k===3?.45:k===4?.45*(1-e):0;bowl(R,ba,null,null,1);
    // least squares, the bottom of the bowl
    const ls=k<=3?P3(ols,.04):F3(ols,.03);R.glow(ls,.28,{c:P.ink,a:.5,top:1});R.ball(ls,.09,{c:P.ink,top:1});
    R.label(ls,'least squares ('+f0(ols[0])+', '+f0(ols[1])+')',{fs:12.5,mono:true,b:1,al:'left',dx:12,dy:-10,c:P.ink});
    // one level of training error: a ring on the bowl and its ellipse on the floor
    const ea=k===0?0:k===1?e:1;
    if(ea>0){if(k<=3)R.line(ELL.map(q=>F3(q,Y(lev)+.02)),{c:lv,w:2.4,a:ea,top:1});R.line(ELL.map(q=>F3(q,.012)),{c:lv,w:k>=4?2.4:1.6,a:ea*(k>=4?1:.7),dash:k>=4?null:[5,4]});
      if(k===1)R.label(F3(ELO,Y(lev)),'training error '+FMT.lev()+' above least squares',{fs:12.5,b:1,al:'left',dx:8,dy:14,c:lv,a:ea,wide:1});
      if(k>=4&&k<5)R.label(F3(ELL[18]),'one level of training error',{fs:12.5,b:1,al:'left',dx:10,c:lv,a:ea,wide:1})}
    // ridge: the disc and its column; the fit where the ring touches the wall
    const rA=k===2?e:k===3?.2:k===4?1:k===5?.35:0;
    if(rA>0){walls(R,'ridge',rA,ri,k>=4?.0:Y(lev)+.35);const p=k<=3?P3(RI.b,.05):F3(RI.b,.03);
      R.glow(p,.24,{c:ri,a:rA,top:1});R.ball(p,.09,{c:ri,a:rA,top:1});
      if(k===2||k===4)R.label(p,'ridge ('+f0(RI.b[0])+', '+f0(RI.b[1])+')',{fs:12.5,mono:true,b:1,al:k===4?'left':'right',dx:k===4?14:-12,dy:k===4?4:0,c:ri,a:rA});
      if(k===2){const pts=rpath.filter(b=>up(b)<=lev+1).map(b=>P3(b,.06));pts.push(P3(RI.b,.06));R.flow(pts,{c:ri,a:e,r:.06,speed:1.2,n:7,top:1})}}
    // lasso: the diamond and its prism; the fit at the corner on the bmi axis
    const lA=k===3?e:k===4?1:k===5?.35:0;
    if(lA>0){walls(R,'lasso',lA,la,k>=4?.0:Y(lev)+.35);const p=k<=3?P3(LA.b,.05):F3(LA.b,.03);
      R.glow(p,.26,{c:la,a:lA,top:1});R.ball(p,.1,{c:la,a:lA,top:1});
      if(k===3||k===4)R.label(p,'lasso ('+f0(LA.b[0])+', 0)',{fs:12.5,mono:true,b:1,al:'left',dx:12,dy:14,c:la,a:lA});
      if(k===3){const pts=[P3(ols,.06)];for(let i=1;i<=20;i++){const t=i/20,kb=knots[1].b,b=[lerp(ols[0],kb[0],t),lerp(ols[1],kb[1],t)];if(up(b)<=lev)pts.push(P3(b,.06))}
        pts.push(P3(LA.b,.06));R.flow(pts,{c:la,a:e,r:.06,speed:1.2,n:7,top:1})}}
    if(k===4){R.label(F3([0,rr]),'L2 budget: disc',{fs:12.5,b:1,c:ri,al:'left',dx:6,dy:-10,a:e,wide:1});R.label(F3([0,-tt]),'L1 budget: diamond',{fs:12.5,b:1,c:la,al:'left',dx:10,dy:8,a:e,wide:1})}
    // step 6: the two paths as the budget shrinks to 0, on the floor
    if(k===5){const rp=rpath.map(b=>F3(b,.02)),lp=lpath.map(b=>F3(b,.02));
      R.line(rp,{c:ri,w:2.6,a:e,top:1});R.line(lp,{c:la,w:2.6,a:e,top:1});R.flow(rp,{c:ri,a:e,r:.06,speed:1.1,top:1});R.flow(lp,{c:la,a:e,r:.06,speed:1.1,top:1});
      R.ball(F3(knots[1].b,.03),.09,{c:la,a:e,top:1});
      R.label(F3(knots[1].b),'bp leaves at λ = '+f3(knots[1].lam),{fs:12.5,mono:true,b:1,c:la,dy:16,a:e});
      R.label(F3(rpath[14]),'ridge path: both shrink',{fs:12.5,b:1,c:ri,al:'right',dx:-10,dy:-12,a:e,wide:1});
      R.label(F3([(ols[0]+knots[1].b[0])/2,(ols[1]+knots[1].b[1])/2]),'lasso path',{fs:12.5,b:1,c:la,al:'left',dx:12,dy:8,a:e,wide:1})}
  }
  const full={cam:[.5,.62],bounds:[[-4.1,0,-3.5],[4.1,HT,3.5]]},top={cam:[0.0001,1.4],bounds:[[-4.1,0,-3.6],[4.4,.1,3.6]]};
  S3.stage({id:'stg-ge',list:'sx-ge',fig:'Fig. 2 · two diabetes coefficients, one penalty at a time',cam:full.cam,bounds:full.bounds,aspect:.72,dur:1500,hold:4800,draw,
    view:k=>k>=4?top:k>=2?{cam:[.42,.7],bounds:[[-4.1,0,-3.5],[4.1,HT*.8,3.5]]}:full,
    margin:w=>w<520?[14,10,14,10]:[18,24,18,24]});
})();
