// ---- Reading: the same two coefficients as the penalty grows, under ridge, lasso, elastic net or early stopping (before/after animation) ----
// Real data: two standardised variables of the diabetes data (Efron et al. 2004), all 442 patients. Every point is an exact fit.
// Steps are levels of training error above least squares, so every method is compared at the same loss of fit: the fits of two
// methods at one step lie on the same ellipse, and only the shape of the penalty decides where.
(function(){
  const card=document.getElementById('ge-card');if(!card)return;
  const $=id=>document.getElementById(id);
  const D=RG.parse(DIAB.raw),N=D.y.length,all=[...Array(N).keys()],z=RG.stdz(D.X,D.y,all),SF=RG.stats(z.f(all),z.g(all));
  const PAIRS={bp:{ix:[2,3],nm:['bmi','bp']},s12:{ix:[4,5],nm:['s1 (total cholesterol)','s2 (LDL)']}};
  const MN={ridge:'Ridge',lasso:'Lasso',enet:'Elastic net',gd:'Early stopping'};
  const st={pair:'bp',m:'lasso'};
  let S,ols,knots,rssMin,dMax,steps,eta,gd,memo;
  const rssUp=b=>RG.rss(S,b)-rssMin;
  function prep(){
    const P=PAIRS[st.pair];S=RG.sub(SF,P.ix);ols=RG.ols(S);knots=RG.lassoPath(S);rssMin=RG.rss(S,ols);dMax=RG.rss(S,[0,0])-rssMin;
    const dk=rssUp(knots[1].b)/dMax; // the training error at which the lasso sets the second coefficient to 0
    steps=[...new Set([0,0.01,0.04,0.1,0.2,0.35,0.55,0.75,0.92,dk].map(v=>+v.toFixed(6)))].sort((a,b)=>a-b);
    eta=0.02*S.n/RG.lmax(S.G); // a hundredth of the largest stable step, so the iterates approximate gradient flow
    gd=[[0,0]];let b=[0,0];for(let t=1;t<=400000;t++){const g=[0,1].map(j=>(S.c[j]-S.G[j][0]*b[0]-S.G[j][1]*b[1])/S.n);b=[b[0]+eta*g[0],b[1]+eta*g[1]];gd.push(b);if(rssUp(b)<1e-9*dMax)break}
    memo={};
  }
  const fitL=(m,l)=>m==='ridge'?RG.ridge(S,l):m==='lasso'?RG.pathAt(knots,l):RG.enet(S,l,0.5);
  // the fit of method m whose training error is rssMin + f * dMax (bisection on lambda; for early stopping, the last step above it)
  function at(m,f){const k=m+f;if(memo[k])return memo[k];const target=f*dMax;let r;
    if(f===0)r={b:ols.slice(),lam:0,t:Infinity};
    else if(m==='gd'){let t=gd.length-1;while(t>0&&rssUp(gd[t-1])<=target)t--;r={b:gd[t],t,lam:1/(eta*t)}}
    else{let lo=0,hi=m==='lasso'?knots[0].lam:1;if(m!=='lasso')while(rssUp(fitL(m,hi))<target)hi*=2;
      for(let it=0;it<70;it++){const mid=(lo+hi)/2;if(rssUp(fitL(m,mid))<target)lo=mid;else hi=mid}r={b:fitL(m,hi),lam:hi}}
    return memo[k]=r}
  function ellipse(level){ // coefficient pairs b with training error rssMin + level
    const a=S.G[0][0],b=S.G[0][1],d=S.G[1][1],tr=(a+d)/2,df=Math.sqrt(((a-d)/2)**2+b*b),e1=tr+df,e2=tr-df;
    const v1=Math.abs(b)>1e-12?[e1-d,b]:[1,0],n1=Math.hypot(...v1),q1=[v1[0]/n1,v1[1]/n1],q2=[-q1[1],q1[0]];
    const xs=[],ys=[];for(let i=0;i<=120;i++){const th=2*Math.PI*i/120,u=Math.sqrt(level/e1)*Math.cos(th),v=Math.sqrt(level/e2)*Math.sin(th);
      xs.push(ols[0]+u*q1[0]+v*q2[0]);ys.push(ols[1]+u*q1[1]+v*q2[1])}return {xs,ys}}
  // the constraint region whose boundary passes through b: circle (ridge), diamond (lasso), 0.5|b|_1 + 0.25|b|^2 (elastic net, rho = 0.5)
  function region(m,b){const xs=[],ys=[];
    if(m==='ridge'){const r=Math.hypot(b[0],b[1]);for(let i=0;i<=96;i++){const t=2*Math.PI*i/96;xs.push(r*Math.cos(t));ys.push(r*Math.sin(t))}}
    else if(m==='lasso'){const r=Math.abs(b[0])+Math.abs(b[1]);[[r,0],[0,r],[-r,0],[0,-r],[r,0]].forEach(p=>{xs.push(p[0]);ys.push(p[1])})}
    else{const k=0.5*(Math.abs(b[0])+Math.abs(b[1]))+0.25*(b[0]*b[0]+b[1]*b[1]);
      for(let i=0;i<=192;i++){const t=2*Math.PI*i/192,c=Math.cos(t),s=Math.sin(t),l1=Math.abs(c)+Math.abs(s);const r=(-0.5*l1+Math.sqrt(0.25*l1*l1+k))/0.5;xs.push(r*c);ys.push(r*s)}}
    return {xs,ys}}
  const f0=v=>(Math.abs(v)<0.05?'0':(v<0?'−':'')+Math.abs(v).toFixed(1));
  const fl=l=>!isFinite(l)?'∞':l===0?'0':l>=0.01?l.toFixed(3):l.toExponential(1).replace('e-','e−');
  function draw(i){
    if(!S)prep();const f=steps[i],P=PAIRS[st.pair],R=at(st.m,f),b=R.b;
    const other=st.m==='ridge'?'lasso':'ridge',O=at(other,f);
    // equal-scale axes that hold 0, the least-squares point and both paths
    const xsAll=[0,ols[0]],ysAll=[0,ols[1]];steps.forEach(g=>{['ridge','lasso'].forEach(m=>{const q=at(m,g).b;xsAll.push(q[0]);ysAll.push(q[1])})});
    let xr=PL.ext(xsAll,0.2),yr=PL.ext(ysAll,0.2);
    const el=$('ge-plot'),W=Math.max(260,Math.min(620,RD.width(el))),H=Math.round(Math.min(400,Math.max(250,W*0.72)));
    const iw=W-58,ih=H-44,ux=(xr[1]-xr[0])/iw,uy=(yr[1]-yr[0])/ih;
    if(ux>uy){const c=(yr[0]+yr[1])/2,h=ux*ih/2;yr=[c-h,c+h]}else{const c=(xr[0]+xr[1])/2,h=uy*iw/2;xr=[c-h,c+h]}
    const polys=[],lines=[],pts=[],txt=[];
    const lev=f*dMax;
    [0.3,2.2].forEach(g=>{const e=ellipse(Math.max(lev,0.02*dMax)*g);lines.push({xs:e.xs,ys:e.ys,c:'var(--dim)',w:1})});
    if(f>0){const e=ellipse(lev);lines.push({xs:e.xs,ys:e.ys,c:'var(--c2)',w:1.8})}
    if(st.m!=='gd'&&f>0){const r=region(st.m,b);polys.push({xs:r.xs,ys:r.ys,fill:'var(--c1)',fo:.16,c:'var(--c1)',w:1.6})}
    if(st.m==='gd'){const rp=steps.map(g=>at('ridge',g).b);lines.push({xs:rp.map(q=>q[0]),ys:rp.map(q=>q[1]),c:'var(--c4)',w:1.4,dash:'4 3'});
      const T=isFinite(R.t)?R.t:0,sk=Math.max(1,Math.ceil(T/60));for(let k=0;k<=T;k+=sk)pts.push({x:gd[k][0],y:gd[k][1],r:1.8,c:'var(--c3)'})}
    else{const pa=steps.slice(0,i+1).map(g=>at(st.m,g).b);lines.push({xs:pa.map(q=>q[0]),ys:pa.map(q=>q[1]),c:'var(--c1)',w:1.4,dash:'4 3'})}
    if(f>0)pts.push({x:O.b[0],y:O.b[1],r:5,c:'var(--mute)',o:.75,title:MN[other]+' with the same training error'});
    pts.push({x:ols[0],y:ols[1],r:3.5,c:'var(--ink)',title:'least squares'});
    pts.push({x:b[0],y:b[1],r:6,c:st.m==='gd'?'var(--c3)':'var(--c1)',stroke:'var(--bg)',title:'the fit'});
    txt.push({x:ols[0],y:ols[1]+(yr[1]-yr[0])*0.04,s:'least squares',a:'middle',c:'var(--mute)'});
    PL.chart({el,id:'ge',x:xr,y:yr,polys,lines,pts,txt,h:H,maxw:620,xl:'coefficient of '+P.nm[0],yl:'coefficient of '+P.nm[1],label:'Coefficients of '+P.nm.join(' and ')+' as the penalty grows'});
    const nz=b.filter(v=>Math.abs(v)<1e-9).length,nzo=O.b.filter(v=>Math.abs(v)<1e-9).length;
    $('ge-n').innerHTML=RD.stat('training error','+'+(100*lev/rssMin).toFixed(1)+'%','sum of squares above least squares; the same for both dots')+
      RD.stat(MN[st.m],f0(b[0])+', '+f0(b[1]),(nz?'<b>'+nz+' exactly zero</b>':'none zero')+(st.m==='gd'?'; '+(isFinite(R.t)?R.t.toLocaleString('en-US')+' steps':'run to convergence'):'; λ = '+fl(R.lam)))+
      (st.m==='gd'?RD.stat('ridge, same error',f0(O.b[0])+', '+f0(O.b[1]),'λ = '+fl(O.lam)+' against 1/(ηt) = '+fl(R.lam)):RD.stat(MN[other]+' (grey)',f0(O.b[0])+', '+f0(O.b[1]),(nzo?nzo+' exactly zero':'none zero')+'; λ = '+fl(O.lam)));
    $('ge-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+steps.length+'</div>'+cap(i,f,nz,P,O);
  }
  function cap(i,f,nz,P,O){
    if(i===0)return 'No penalty: the fit is ordinary least squares, the centre of the ellipses. Each ellipse is a set of coefficient pairs with the same training error. Each next step accepts a little more training error in exchange for smaller coefficients.';
    const dk=+(rssUp(knots[1].b)/dMax).toFixed(6),ex=Math.abs(f-dk)<1e-9;
    if(st.m==='lasso'){if(ex)return 'Exactly here the lasso sets '+P.nm[1]+' to 0: the ellipse of this training error touches the diamond at its corner. The grey ridge fit, on the same ellipse, keeps both.';
      if(nz)return P.nm[1]+' stays at exactly 0: the diamond is pointed, so the ellipse keeps meeting it at the corner on the '+P.nm[0]+' axis. Only '+P.nm[0]+' is in the model; that corner is why L1 selects variables.';
      return 'The fit is where an ellipse first touches a diamond |b₁| + |b₂| ≤ t. Both coefficients shrink, along a straight line.'+(st.pair==='s12'?' The two variables are correlated at 0.90 and their least-squares coefficients have opposite signs; the lasso is about to drop one.':'')}
    if(st.m==='ridge')return 'The fit is where the ellipse touches a circle b₁² + b₂² ≤ t. A circle has no corners, so the touching point is almost never on an axis: both coefficients shrink'+(st.pair==='s12'?' and, being correlated, are pulled towards each other (the grouping effect)':'')+', and neither reaches 0 at any finite λ. The grey dot is the lasso on the same ellipse'+(O.b.some(v=>Math.abs(v)<1e-9)?', on an axis.':'.');
    if(st.m==='enet')return 'Elastic net mixes both: a diamond with bulging sides. Its corners still give exact zeros ('+(nz?P.nm[1]+' is 0 here':'none yet')+'), and the curved sides share weight between correlated variables. The grey dot is ridge.';
    return 'Gradient descent from 0, stopped when its training error reaches this level (green dots: the steps taken). The dashed purple line is the ridge path. Early stopping stays close to it without matching it: for a quadratic loss, stopping after t steps of size η acts like an L2 penalty λ ≈ 1/(ηt), an approximation Goodfellow et al. derive for curvatures that are small relative to λ (eq. 7.44 and 7.45). The counters show how close it comes: compare the coefficients, and 1/(ηt) with ridge\'s λ at the same training error.';
  }
  let A;
  function n(){if(!S)prep();return steps.length}
  A=RD.anim({card:'ge-card',ctl:'ge-ctl',n:n(),draw,ms:1800,label:'Step through the penalty'});
  function seg(id,key){$(id).addEventListener('click',e=>{const bt=e.target.closest('button');if(!bt)return;
    [...e.currentTarget.querySelectorAll('button')].forEach(x=>x.classList.toggle('on',x===bt));st[key]=bt.dataset.v;if(key==='pair')prep();A.reset(steps.length);A.play()})}
  seg('ge-m','m');seg('ge-p','pair');
  addEventListener('resize',()=>{if(card.offsetParent)A.redraw()});
})();
