// ---- Scene, Fig. 3 (section 4): mean field fitted by CAVI to a two-dimensional posterior (renderer v2, 2026-11-07) ----
// Bishop's Normal-Gamma example (section 10.1.3) on the page's ten illustrative observations (VIN.cavi.data), priors mu0 0, lambda0 1, a0 = b0 = 1.
// The floor is (mu, tau); the shaded surface is the exact posterior; the walls carry the marginals (exact dashed, q solid);
// every q comes from VI.cavi (22_js_core.js, checked against recompute.py). Heights are densities, normalised on the drawn grid.
(function(){
  if(!document.getElementById('stg-cavi'))return;const {lerp,mix}=S3,C=window.VIN.cavi;
  const res=VI.cavi(C.data,0,1,1,1,12),E=res.exact,H=res.h,aN=res.aN,muN=res.muN;
  const MU=[.35,1.3],TA=[0,8.5],X=m=>-2.4+(m-MU[0])/(MU[1]-MU[0])*4.8,Zt=t=>1.8-(t-TA[0])/(TA[1]-TA[0])*3.6,ZW=-2.15,XW=-2.75;
  const NX=34,NY=30,dm=(MU[1]-MU[0])/NX,dt=(TA[1]-TA[0])/NY;
  const lpost=(m,t)=>t<=0?-1e300:(E.a-.5)*Math.log(t)-E.b*t-.5*E.lam*t*(m-E.mu)*(m-E.mu);
  const lgam=(t,a,b)=>t<=0?-1e300:(a-1)*Math.log(t)-b*t;
  // grid values at cell corners, normalised so they integrate to 1 on the grid
  function field(f){const V=[];let mx=-1e300;for(let i=0;i<=NX;i++){V.push([]);for(let j=0;j<=NY;j++){const v=f(MU[0]+i*dm,TA[0]+j*dt);V[i].push(v);if(v>mx)mx=v}}
    let s=0;for(let i=0;i<=NX;i++)for(let j=0;j<=NY;j++){V[i][j]=Math.exp(V[i][j]-mx);s+=V[i][j]}const k=1/(s*dm*dt);
    for(let i=0;i<=NX;i++)for(let j=0;j<=NY;j++)V[i][j]*=k;return V}
  const PO=field(lpost);let peak=0;PO.forEach(r=>r.forEach(v=>{if(v>peak)peak=v}));const HS=1.25/peak;
  const qf=(lam,b)=>field((m,t)=>-.5*lam*(m-muN)*(m-muN)+lgam(t,aN,b));
  // marginals on the walls (1-D, fine grids, normalised)
  const MM=[],TT=[];for(let i=0;i<=120;i++)MM.push(MU[0]+(MU[1]-MU[0])*i/120);for(let i=0;i<=120;i++)TT.push(TA[0]+(TA[1]-TA[0])*i/120);
  const norm=(xs,f)=>{const v=xs.map(f),mx=Math.max(...v.filter(isFinite));const e=v.map(u=>Math.exp(u-mx)),s=e.reduce((a,b)=>a+b,0)*(xs[1]-xs[0]);return e.map(u=>u/s)};
  const exMu=(()=>{const v=MM.map(m=>{let s=0;for(let j=1;j<=400;j++){const t=TA[1]*j/400;s+=Math.exp(lpost(m,t)-lpost(E.mu,E.Et))}return s});const z=v.reduce((a,b)=>a+b,0)*(MM[1]-MM[0]);return v.map(u=>u/z)})();
  const exTau=norm(TT,t=>lgam(t,E.a,E.b));
  const qMu=lam=>norm(MM,m=>-.5*lam*(m-muN)*(m-muN)),qTau=b=>norm(TT,t=>lgam(t,aN,b));
  const HM=1.15/Math.max(...qMu(H[H.length-1].lamN)),HT=1.15/Math.max(...qTau(H[H.length-1].bN));
  const last=H[H.length-1];let QF=null;
  window.VI_CAVI={lam1:H[0].lamN,b1:H[0].bN,Et1:H[0].Et,lam5:H[4].lamN,Et5:H[4].Et,lamEnd:last.lamN,bEnd:last.bN,EtEnd:last.Et,varMuQ:1/last.lamN,varMuExact:E.varMu,varTauQ:aN/(last.bN*last.bN),varTauExact:E.varT};
  const L=(()=>{const v=[-.45,1,.6],m=Math.hypot(...v);return v.map(x=>x/m)})();
  function surface(R,V,c,a,fa){const P=R.P;if(a<=.01)return;const ec=P.dark?mix(c,[255,255,255],.25):mix(c,[0,0,0],.25);
    for(let i=0;i<NX;i++)for(let j=0;j<NY;j++){const h=[V[i][j],V[i+1][j],V[i+1][j+1],V[i][j+1]];if(Math.max(...h)*HS<.0015)continue;
      const pts=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]].map(([u,w],n)=>[X(MU[0]+u*dm),h[n]*HS,Zt(TA[0]+w*dt)]);
      const u=[pts[1][0]-pts[0][0],pts[1][1]-pts[0][1],pts[1][2]-pts[0][2]],w=[pts[3][0]-pts[0][0],pts[3][1]-pts[0][1],pts[3][2]-pts[0][2]];
      let nr=[u[1]*w[2]-u[2]*w[1],u[2]*w[0]-u[0]*w[2],u[0]*w[1]-u[1]*w[0]];if(nr[1]<0)nr=nr.map(x=>-x);const nm=Math.hypot(...nr)||1;
      const lm=Math.max(0,(nr[0]*L[0]+nr[1]*L[1]+nr[2]*L[2])/nm),sh=P.dark?.62+.38*lm:.8+.2*lm,tt=Math.min(1,(h[0]+h[1]+h[2]+h[3])/4/peak);
      R.quad(pts,{fill:mix(c,P.paper,P.dark?.2+.45*(1-tt):.3+.55*(1-tt)).map(x=>x*sh),a,fa:fa||.88,ec,ea:.14,lw:.5})}}
  // q's surface as a wire mesh, drawn only where q holds mass (above 2% of its peak), so its footprint can be compared with the posterior's
  function mesh(R,V,c,a){if(a<=.01)return;let pk=0;V.forEach(r=>r.forEach(v=>{if(v>pk)pk=v}));const on=v=>v>.02*pk;
    const run=(pts,vs)=>{let cur=[];vs.forEach((v,n)=>{if(on(v))cur.push(pts[n]);else{if(cur.length>1)R.line(cur,{c,w:1.4,a,top:1});cur=[]}});if(cur.length>1)R.line(cur,{c,w:1.4,a,top:1})};
    for(let i=0;i<=NX;i+=2){const pts=[],vs=[];for(let j=0;j<=NY;j++){pts.push([X(MU[0]+i*dm),V[i][j]*HS+.01,Zt(TA[0]+j*dt)]);vs.push(V[i][j])}run(pts,vs)}
    for(let j=0;j<=NY;j+=2){const pts=[],vs=[];for(let i=0;i<=NX;i++){pts.push([X(MU[0]+i*dm),V[i][j]*HS+.01,Zt(TA[0]+j*dt)]);vs.push(V[i][j])}run(pts,vs)}}
  const wallMu=(R,ys,o)=>R.line(MM.map((m,i)=>[X(m),ys[i]*HM,ZW]),o),wallTau=(R,ys,o)=>R.line(TT.map((t,i)=>[XW,ys[i]*HT,Zt(t)]),o);
  function fillMu(R,ys,c,a){R.quad([[X(MU[0]),0,ZW]].concat(MM.map((m,i)=>[X(m),ys[i]*HM,ZW]),[[X(MU[1]),0,ZW]]),{fill:c,fa:.16,a,edge:false})}
  function fillTau(R,ys,c,a){R.quad([[XW,0,Zt(TA[0])]].concat(TT.map((t,i)=>[XW,ys[i]*HT,Zt(t)]),[[XW,0,Zt(TA[1])]]),{fill:c,fa:.16,a,edge:false})}
  // the state of q after "round" r (fractional r interpolates between rounds; r = 0: q(mu) of round 1 not yet made)
  const rnd=r=>{const i=Math.max(0,Math.min(H.length-1,Math.floor(r))),j=Math.min(H.length-1,i+1),f=r-Math.floor(r);return {lam:lerp(H[i].lamN,H[j].lamN,f),b:lerp(H[i].bN,H[j].bN,f),Et:lerp(H[i].Et,H[j].Et,f)}};
  function draw(R,k,e){const P=R.P;R.grid(-3.4,3.2,-2.6,2.4,.4);
    // walls and axes
    R.quad([[X(MU[0]),0,ZW],[X(MU[1]),0,ZW],[X(MU[1]),1.7,ZW],[X(MU[0]),1.7,ZW]],{fill:P.soft,fa:.55,ec:P.line,ea:.8,dz:3});
    R.quad([[XW,0,Zt(TA[0])],[XW,0,Zt(TA[1])],[XW,1.7,Zt(TA[1])],[XW,1.7,Zt(TA[0])]],{fill:P.soft,fa:.55,ec:P.line,ea:.8,dz:3});
    [.4,.6,.8,1,1.2].forEach(m=>R.label([X(m),0,Zt(0)+.15],m.toFixed(1),{dy:13,fs:12,c:P.mute}));R.label([X(1.3),0,Zt(0)+.15],'μ',{al:'left',dx:10,dy:13,fs:13.5,b:1,c:P.mute});
    [0,2,4,6,8].forEach(t=>R.label([X(MU[1])+.15,0,Zt(t)],String(t),{al:'left',dx:6,fs:12,c:P.mute}));R.label([X(MU[1])+.15,0,Zt(8.5)],'τ',{al:'left',dx:6,dy:-12,fs:13.5,b:1,c:P.mute});
    // 1. the exact posterior and its marginals
    const sa=k===0?e:k>=4?lerp(1,.6,e):1;surface(R,PO,P.c4,sa);
    const ma=k===0?e:1;wallMu(R,exMu,{c:P.c4,w:1.6,dash:[5,4],a:ma});wallTau(R,exTau,{c:P.c4,w:1.6,dash:[5,4],a:ma});
    if(k===0)R.label([X(E.mu),Math.max(...PO.flat())*HS*e,Zt(E.Et)],'exact posterior',{dy:-14,fs:12.5,b:1,c:P.c4,a:e});
    R.label([X(1.3),1.7,ZW],'wall: marginal of μ',{al:'right',dy:-10,fs:12,c:P.mute,a:ma,wide:1});R.label([XW,1.7,Zt(.3)],'wall: marginal of τ',{dy:-10,fs:12,c:P.mute,a:ma,wide:1});
    if(k===0)return;
    // q, round by round
    let r,ma2=1,ta2=1;if(k===1){r=0;ta2=0;ma2=e}else if(k===2){r=0;ta2=e}else if(k===3)r=e*4;else r=H.length-1;
    const s=rnd(r),Etin=k===1?1:(r<1?H[0].Et:rnd(r-1).Et),lamShow=k===1?H[0].lamN:s.lam;
    const yM=qMu(lamShow),yT=qTau(k<=2?H[0].bN:s.b);
    fillMu(R,yM,P.c1,ma2);wallMu(R,yM,{c:P.c1,w:2.6,a:ma2});
    R.label([X(muN),Math.max(...yM)*HM,ZW],'q(μ) = N('+muN.toFixed(4)+', 1/'+lamShow.toFixed(2)+')',{dy:-12,fs:12.5,b:1,c:P.c1,a:ma2,wide:1});
    if(ta2>0){fillTau(R,yT,P.c1,ta2);wallTau(R,yT,{c:P.c1,w:2.6,a:ta2});const bb=k<=2?H[0].bN:s.b,et=k<=2?H[0].Et:s.Et;
      R.label([XW,Math.max(...yT)*HT,Zt(et)],'q(τ) = Gamma(6.5, '+bb.toFixed(4)+') · E[τ] '+et.toFixed(4),{al:'left',dx:6,dy:-12,fs:12.5,b:1,c:P.c1,a:ta2,wide:1})}
    // the two updates feed each other: E[tau] goes from the tau wall to the mu wall, the moments of q(mu) go back
    const tauPt=[XW,.25,Zt(k===1?1:s.Et)],muPt=[X(muN),.25,ZW];
    if(k===1||k===3)R.flowArc(tauPt,muPt,.9,{c:P.c1,a:k===1?e:1,r:.065,n:9,speed:1.6});
    if(k===2||k===3)R.flowArc(muPt,tauPt,.9,{c:P.c2,a:k===2?e:1,r:.065,n:9,speed:1.6});
    if(k===1)R.label(tauPt,'E[τ] = 1 (start)',{al:'left',dx:8,dy:-4,fs:12.5,b:1,c:P.c1,a:e});
    if(k===3)R.label([0,2.05,0],'round '+(1+Math.min(4,Math.round(r)))+' · E[τ] '+s.Et.toFixed(4),{fs:12.5,b:1,c:P.c1});
    // 5. the product q(mu) q(tau) over the floor: axis-aligned, on the right centre, too narrow
    if(k===4){mesh(R,QF=QF||qf(last.lamN,last.bN),P.c1,e);
      R.label([X(1.22),.5,Zt(1)],'q(μ) q(τ): Var(μ) '+(1/last.lamN).toFixed(4)+' · exact '+E.varMu.toFixed(4),{al:'right',fs:12.5,b:1,c:P.c1,a:e,wide:1})}
  }
  S3.stage({id:'stg-cavi',list:'sx-cavi',fig:'Fig. 3 · mean field on a Normal-Gamma posterior',cam:[.62,.62],bounds:[[-2.9,0,-2.3],[2.6,1.7,2]],aspect:.74,dur:1600,hold:5200,draw,
    margin:w=>w<520?[14,8,12,8]:[18,16,14,16],
    view:k=>k===4?{cam:[.45,.85],bounds:[[-2.7,0,-2.2],[2.6,1.6,2]]}:k===3?{cam:[.75,.5],bounds:[[-2.9,0,-2.3],[2.4,1.6,2]]}:null});
})();
