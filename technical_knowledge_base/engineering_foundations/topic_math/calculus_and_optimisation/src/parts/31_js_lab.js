// ---- Optimisation lab (t-lab): four 2D functions with analytic gradients and Hessians, eight methods, step inspector ----
window.LAB=(function(){
  const $=id=>document.getElementById(id),T=CO.T,M=CO.minus,D=CO.D;
  // ---- functions: f, g (gradient), H (Hessian as [a,b,c] = [[a,b],[b,c]]) ----
  const st={fn:'quad',me:'gd',kap:10,rot:0,eta:0.1818,beta:0.9,n:60,start:null,k:0,run:null};
  function quadH(){const r=st.rot*Math.PI/180,c=Math.cos(r),s=Math.sin(r),l1=1,l2=st.kap;return [l1*c*c+l2*s*s,(l1-l2)*c*s,l1*s*s+l2*c*c]}
  const X2=D.X2||[],S2=D.s||[],lam=D.lam||0;
  const FN={
    quad:{name:'Quadratic bowl',box:[-3,3,-3,3],start:[-2.5,1.5],min:[[0,0]],fmin:0,
      f(p){const h=quadH();return 0.5*(h[0]*p[0]*p[0]+2*h[1]*p[0]*p[1]+h[2]*p[1]*p[1])},
      g(p){const h=quadH();return [h[0]*p[0]+h[1]*p[1],h[1]*p[0]+h[2]*p[1]]},H(){return quadH()},
      desc:()=>'f(θ) = ½ θᵀHθ with eigenvalues 1 and κ = '+st.kap+', rotated by '+st.rot+'°. Minimum 0 at the origin. Illustrative.'},
    rosen:{name:'Rosenbrock',box:[-2,2,-1,3],start:[-1.2,1],min:[[1,1]],fmin:0,
      f(p){const a=1-p[0],b=p[1]-p[0]*p[0];return a*a+100*b*b},
      g(p){const b=p[1]-p[0]*p[0];return [-2*(1-p[0])-400*p[0]*b,200*b]},
      H(p){return [2-400*(p[1]-3*p[0]*p[0]),-400*p[0],200]},
      desc:()=>'f(x, y) = (1 − x)² + 100 (y − x²)² (Rosenbrock 1960): a curved, narrow valley; minimum 0 at (1, 1). The classic test of whether a method follows curvature. Illustrative.'},
    saddle:{name:'Saddle',box:[-2,2,-2,2],start:[1.5,0.02],min:[[0,1],[0,-1]],fmin:-0.25,
      f(p){return p[0]*p[0]+p[1]**4/4-p[1]*p[1]/2},g(p){return [2*p[0],p[1]**3-p[1]]},H(p){return [2,0,3*p[1]*p[1]-1]},
      desc:()=>'f(x, y) = x² + y⁴/4 − y²/2: a saddle at the origin (Hessian eigenvalues 2 and −1) between two minima at (0, ±1), value −0.25. Illustrative.'},
    logit:{name:'Logistic loss',box:[-1,7,-3,5],start:[0,0],min:null,fmin:null,
      f(p){let t=0;for(let i=0;i<X2.length;i++)t+=CO.softplus(-S2[i]*(p[0]*X2[i][0]+p[1]*X2[i][1]));return t/X2.length+0.5*lam*(p[0]*p[0]+p[1]*p[1])},
      g(p){let a=0,b=0;for(let i=0;i<X2.length;i++){const q=CO.sig(-S2[i]*(p[0]*X2[i][0]+p[1]*X2[i][1]));a+=-S2[i]*X2[i][0]*q;b+=-S2[i]*X2[i][1]*q}return [a/X2.length+lam*p[0],b/X2.length+lam*p[1]]},
      H(p){let a=0,b=0,c=0;for(let i=0;i<X2.length;i++){const x=X2[i],q=CO.sig(p[0]*x[0]+p[1]*x[1]),w=q*(1-q);a+=w*x[0]*x[0];b+=w*x[0]*x[1];c+=w*x[1]*x[1]}const n=X2.length;return [a/n+lam,b/n,c/n+lam]},
      desc:()=>'The real L2-regularised logistic loss on two standardised features of the breast-cancer data (mean radius, mean texture; 569 patients; label +1 malignant; no intercept; λ = 1/569). Convex; minimum at w* = ('+LAB.wstar.map(v=>v.toFixed(3)).join(', ')+').'}
  };
  // ---- 2x2 helpers ----
  const eig=h=>{const tr=h[0]+h[2],dt=h[0]*h[2]-h[1]*h[1],d=Math.sqrt(Math.max(0,tr*tr/4-dt));const l1=tr/2-d,l2=tr/2+d;
    const vec=l=>{let v=Math.abs(h[1])>1e-12?[l-h[2],h[1]]:(Math.abs(h[0]-l)<Math.abs(h[2]-l)?[1,0]:[0,1]);const n=Math.hypot(v[0],v[1]);return [v[0]/n,v[1]/n]};
    return {l:[l1,l2],v:[vec(l1),vec(l2)]}};
  const solve=(h,g)=>{const dt=h[0]*h[2]-h[1]*h[1];if(Math.abs(dt)<1e-14)return null;return [(h[2]*g[0]-h[1]*g[1])/dt,(-h[1]*g[0]+h[0]*g[1])/dt]};
  // logistic optimum by Newton
  const wstar=(()=>{let w=[0,0];for(let i=0;i<40;i++){const d=solve(FN.logit.H(w),FN.logit.g(w));w=[w[0]-d[0],w[1]-d[1]]}return w})();
  FN.logit.min=[wstar];FN.logit.fmin=FN.logit.f(wstar);
  // ---- methods ----
  function run(){const F=FN[st.fn],N=st.n,eta=st.eta,be=st.beta;let p=(st.start||F.start).slice();const P=[p.slice()];
    let v=[0,0],m=[0,0],s2=[0,0],Mi=[1,0,1],gPrev=null,pPrev=null;const info=[];
    const armijo=(p,g,d)=>{let t=1;const f0=F.f(p),sl=g[0]*d[0]+g[1]*d[1];for(let i=0;i<50;i++){const q=[p[0]+t*d[0],p[1]+t*d[1]];if(F.f(q)<=f0+1e-4*t*sl)return t;t*=0.5}return t};
    for(let k=0;k<N;k++){const g=F.g(p);let q,note='';
      if(st.me==='gd')q=[p[0]-eta*g[0],p[1]-eta*g[1]];
      else if(st.me==='hb'){v=[be*v[0]+g[0],be*v[1]+g[1]];q=[p[0]-eta*v[0],p[1]-eta*v[1]]}
      else if(st.me==='nag'){const la=[p[0]+be*v[0],p[1]+be*v[1]],gl=F.g(la);v=[be*v[0]-eta*gl[0],be*v[1]-eta*gl[1]];q=[p[0]+v[0],p[1]+v[1]]}
      else if(st.me==='adam'){const b1=0.9,b2=0.999,t=k+1;m=[b1*m[0]+(1-b1)*g[0],b1*m[1]+(1-b1)*g[1]];s2=[b2*s2[0]+(1-b2)*g[0]*g[0],b2*s2[1]+(1-b2)*g[1]*g[1]];
        q=[0,1].map(i=>p[i]-eta*(m[i]/(1-b1**t))/(Math.sqrt(s2[i]/(1-b2**t))+1e-8))}
      else if(st.me==='newton'){const d=solve(F.H(p),g);if(!d){note='singular Hessian';q=p.slice()}else q=[p[0]-d[0],p[1]-d[1]]}
      else if(st.me==='dnewton'){const h=F.H(p),e=eig(h);let d=solve(h,g);if(!d||e.l[0]<=0){d=[-g[0],-g[1]];note='Hessian not positive definite: gradient direction used'}else d=[-d[0],-d[1]];
        if(g[0]*d[0]+g[1]*d[1]>=0){d=[-g[0],-g[1]]}const t=armijo(p,g,d);q=[p[0]+t*d[0],p[1]+t*d[1]];note=note||('line search step t = '+CO.fmt(t,3))}
      else if(st.me==='sfn'){const h=F.H(p),e=eig(h);const a=e.l.map(l=>Math.max(Math.abs(l),1e-3));let d=[0,0];
        for(let i=0;i<2;i++){const u=e.v[i],c=(u[0]*g[0]+u[1]*g[1])/a[i];d=[d[0]-c*u[0],d[1]-c*u[1]]}
        const t=armijo(p,g,d);q=[p[0]+t*d[0],p[1]+t*d[1]];note='divides by |λ|; line search t = '+CO.fmt(t,3)}
      else if(st.me==='bfgs'){if(gPrev){const s=[p[0]-pPrev[0],p[1]-pPrev[1]],y=[g[0]-gPrev[0],g[1]-gPrev[1]],ys=y[0]*s[0]+y[1]*s[1];
          if(ys>1e-12){const r=1/ys;const A=[[1-r*s[0]*y[0],-r*s[0]*y[1]],[-r*s[1]*y[0],1-r*s[1]*y[1]]];const Mm=[[Mi[0],Mi[1]],[Mi[1],Mi[2]]];
            const AM=[[A[0][0]*Mm[0][0]+A[0][1]*Mm[1][0],A[0][0]*Mm[0][1]+A[0][1]*Mm[1][1]],[A[1][0]*Mm[0][0]+A[1][1]*Mm[1][0],A[1][0]*Mm[0][1]+A[1][1]*Mm[1][1]]];
            const R=[[AM[0][0]*A[0][0]+AM[0][1]*A[0][1],AM[0][0]*A[1][0]+AM[0][1]*A[1][1]],[AM[1][0]*A[0][0]+AM[1][1]*A[0][1],AM[1][0]*A[1][0]+AM[1][1]*A[1][1]]];
            Mi=[R[0][0]+r*s[0]*s[0],R[0][1]+r*s[0]*s[1],R[1][1]+r*s[1]*s[1]]}else note='curvature condition failed: update skipped'}
        else{const gn=Math.hypot(g[0],g[1])||1;Mi=[Math.min(1,1/gn),0,Math.min(1,1/gn)]}
        const d=[-(Mi[0]*g[0]+Mi[1]*g[1]),-(Mi[1]*g[0]+Mi[2]*g[1])];const t=armijo(p,g,d);gPrev=g;pPrev=p.slice();q=[p[0]+t*d[0],p[1]+t*d[1]];note=note||('line search t = '+CO.fmt(t,3))}
      info.push(note);p=q;P.push(p.slice());if(!isFinite(p[0])||!isFinite(p[1])||Math.abs(p[0])>1e8||Math.abs(p[1])>1e8)break}
    return {P,info}}
  // ---- drawing ----
  let cache={key:'',svg:''};
  function plot(){const el=$('lab-plot');const F=FN[st.fn],B=F.box,W=Math.min(560,RD.width(el)),Hh=W;const R=st.run;
    const sx=x=>(x-B[0])/(B[1]-B[0])*W,sy=y=>Hh-(y-B[2])/(B[3]-B[2])*Hh;
    const key=st.fn+st.kap+'_'+st.rot+'_'+W;
    if(cache.key!==key){const fm=F.fmin,lv=[];const span=Math.max(1e-6,F.f([B[0],B[3]])-fm);
      for(let i=-3;i<=Math.log10(span)+0.5;i+=0.25)lv.push(fm+Math.pow(10,i));
      if(st.fn==='saddle')lv.unshift(-0.2,-0.1,0);
      const ps=CO.contours((x,y)=>F.f([x,y]),B[0],B[1],B[2],B[3],st.fn==='logit'?50:90,st.fn==='logit'?50:90,lv,(x,y)=>[sx(x),sy(y)]);
      cache={key,svg:ps.map(d=>'<path d="'+d+'" style="fill:none;stroke:var(--dim);stroke-width:1"/>').join('')}}
    let s='<rect width="'+W+'" height="'+Hh+'" style="fill:var(--bg);stroke:var(--line)"/>'+cache.svg;
    (F.min||[]).forEach(m=>s+='<path d="M'+(sx(m[0])-5)+' '+(sy(m[1])-5)+'l10 10M'+(sx(m[0])+5)+' '+(sy(m[1])-5)+'l-10 10" style="stroke:var(--good);stroke-width:2"/>');
    const P=R.P,k=Math.min(st.k,P.length-1),pk=P[k];
    // local Taylor model contours around the inspected point
    if(isFinite(pk[0])&&pk[0]>B[0]&&pk[0]<B[1]&&pk[1]>B[2]&&pk[1]<B[3]){const f0=F.f(pk),g=F.g(pk),h=F.H(pk);
      const mf=(x,y)=>{const a=x-pk[0],b=y-pk[1];return f0+g[0]*a+g[1]*b+0.5*(h[0]*a*a+2*h[1]*a*b+h[2]*b*b)};
      const r=(B[1]-B[0])*0.22;const sp=Math.abs(g[0])*r+Math.abs(g[1])*r+0.5*(Math.abs(h[0])+Math.abs(h[2])+2*Math.abs(h[1]))*r*r;
      const lv=[-0.5,-0.25,-0.1,0.1,0.25,0.5].map(c=>f0+c*sp);
      const ms=CO.contours(mf,pk[0]-r,pk[0]+r,pk[1]-r,pk[1]+r,30,30,lv,(x,y)=>[sx(x),sy(y)]);
      s+=ms.map(d=>'<path d="'+d+'" style="fill:none;stroke:var(--c4);stroke-width:1.2;stroke-dasharray:4 3"/>').join('');
      const e=eig(h),big=Math.max(Math.abs(e.l[0]),Math.abs(e.l[1]))||1;
      e.l.forEach((l,i)=>{const L=0.08*W*(0.35+0.65*Math.abs(l)/big),u=e.v[i],col=l>1e-9?'var(--c1)':l<-1e-9?'var(--c2)':'var(--mute)';
        s+='<line x1="'+(sx(pk[0])-u[0]*L)+'" y1="'+(sy(pk[1])+u[1]*L)+'" x2="'+(sx(pk[0])+u[0]*L)+'" y2="'+(sy(pk[1])-u[1]*L)+'" style="stroke:'+col+';stroke-width:2.4"/>'})}
    const pts=P.filter(p=>isFinite(p[0])).map(p=>[Math.max(-W,Math.min(2*W,sx(p[0]))),Math.max(-Hh,Math.min(2*Hh,sy(p[1])))]);
    s+='<path d="'+pts.map((q,i)=>(i?'L':'M')+q[0].toFixed(1)+' '+q[1].toFixed(1)).join('')+'" style="fill:none;stroke:var(--ink);stroke-width:1.4"/>';
    pts.forEach((q,i)=>{if(i<=k)s+='<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="'+(i===0?4.5:2.2)+'" style="fill:'+(i===0?'var(--c3)':'var(--ink)')+'"/>'});
    if(pts[k])s+='<circle cx="'+pts[k][0]+'" cy="'+pts[k][1]+'" r="6" style="fill:none;stroke:var(--c4);stroke-width:2.4"/>';
    s+=T(6,14,'('+B[0]+', '+B[2]+') to ('+B[1]+', '+B[3]+')','start',10,'var(--mute)');
    el.innerHTML='<svg viewBox="0 0 '+W+' '+Hh+'" width="'+W+'" height="'+Hh+'" role="img" aria-label="contours and path" style="overflow:hidden">'+s+'</svg>';
    el.firstChild.addEventListener('click',ev=>{const r=el.firstChild.getBoundingClientRect();const x=B[0]+(ev.clientX-r.left)/r.width*(B[1]-B[0]),y=B[3]-(ev.clientY-r.top)/r.height*(B[3]-B[2]);st.start=[x,y];st.k=0;go()});
    // loss per step
    const fm=F.fmin,gap=P.map(p=>F.f(p)-fm);const L=$('lab-loss');const W2=Math.min(560,RD.width(L));
    const pos=gap.filter(v=>isFinite(v)&&v>0);const ymin=Math.max(1e-16,Math.min(...pos,1)),ymax=Math.max(...pos,1e-3);
    const lo=Math.pow(10,Math.floor(Math.log10(ymin))),hi=Math.pow(10,Math.ceil(Math.log10(ymax)));const yt=[];for(let v=lo;v<=hi*1.01;v*=Math.pow(10,Math.max(1,Math.ceil(Math.log10(hi/lo)/5))))yt.push(v);
    const c=CO.chart({id:'labl',w:W2,h:170,logy:true,x:[0,Math.max(1,P.length-1)],y:[lo,hi],xt:[0,Math.round((P.length-1)/2),P.length-1],yt,ytf:CO.pow10,ml:46,xl:'step k: f − f* (log scale)'+(st.fn==='saddle'?'; f* = −0.25':''),
      series:[{pts:gap.map((v,i)=>[i,Math.max(v,1e-16)]),col:'var(--c1)',dots:P.length<80,r:1.8}],extra:(sx2,sy2)=>'<line x1="'+sx2(k)+'" x2="'+sx2(k)+'" y1="'+sy2(lo)+'" y2="'+sy2(hi)+'" style="stroke:var(--c4)"/>'});
    L.innerHTML=c.svg}
  function insp(){const F=FN[st.fn],P=st.run.P,k=Math.min(st.k,P.length-1),p=P[k];$('lab-kv').textContent=k;
    if(!isFinite(p[0])||!isFinite(p[1])){$('lab-insp').innerHTML='<p>Diverged.</p>';return}
    const f=F.f(p),g=F.g(p),h=F.H(p),e=eig(h),gn=Math.hypot(g[0],g[1]);
    const cls=e.l[0]>1e-9?'positive definite: locally a bowl':e.l[1]<-1e-9?'negative definite: locally a cap':e.l[0]<-1e-9&&e.l[1]>1e-9?'indefinite: locally a saddle':'semidefinite: flat in one direction';
    const nd=solve(h,g),f2=v=>M(CO.fmt(v,4));
    const lmax=e.l[1];
    let s='<dl class="kv"><dt>point θ</dt><dd id="lab-p">('+f2(p[0])+', '+f2(p[1])+')</dd><dt>loss f</dt><dd id="lab-f">'+f2(f)+'</dd><dt>gradient</dt><dd>('+f2(g[0])+', '+f2(g[1])+'), length '+CO.fmt(gn,4)+'</dd></dl>';
    s+='<div class="small">Hessian <span class="hm2" id="lab-H"><span>'+f2(h[0])+'</span><span>'+f2(h[1])+'</span><span>'+f2(h[1])+'</span><span>'+f2(h[2])+'</span></span></div>';
    s+='<dl class="kv"><dt>eigenvalues</dt><dd id="lab-eig">'+f2(e.l[0])+' and '+f2(e.l[1])+'</dd><dt>curvature says</dt><dd>'+cls+'</dd>'+
      (e.l[0]>0?'<dt>condition number</dt><dd>'+CO.fmt(e.l[1]/e.l[0],4)+'</dd>':'')+
      (lmax>0?'<dt>local step limit 2/λmax</dt><dd>'+CO.fmt(2/lmax,4)+(st.me==='gd'?(st.eta>2/lmax?' <b style="color:var(--bad)">(your η = '+CO.fmt(st.eta,3)+' is above it)</b>':' (your η = '+CO.fmt(st.eta,3)+' is below it)'):'')+'</dd>':'')+
      '<dt>Newton step from here</dt><dd>'+(nd?'('+f2(-nd[0])+', '+f2(-nd[1])+')'+(e.l[0]<0?': points towards the saddle or cap, not downhill':''):'undefined (singular)')+'</dd>'+
      (k<st.run.info.length&&st.run.info[k]?'<dt>this step</dt><dd>'+st.run.info[k]+'</dd>':'')+'</dl>';
    s+='<div class="small mute">Run: '+(P.length-1)+' steps, final loss '+f2(F.f(P[P.length-1]))+(F.fmin!=null?' (minimum '+f2(F.fmin)+')':'')+'.</div>';
    $('lab-insp').innerHTML=s}
  function defEta(){const fn=st.fn,me=st.me;const L={quad:st.kap,rosen:2600,saddle:2,logit:0.33}[fn];
    if(me==='gd'||me==='nag')return fn==='quad'?2/(st.kap+1):fn==='rosen'?0.0005:1/L;
    if(me==='hb')return fn==='quad'?Math.pow(2/(1+Math.sqrt(st.kap)),2):fn==='rosen'?0.0002:0.5/L;
    if(me==='adam')return fn==='rosen'?0.05:fn==='logit'?0.3:0.1;return 1}
  function go(){st.run=run();const n=st.run.P.length-1;const ks=$('lab-k');ks.max=n;st.k=Math.min(st.k,n);ks.value=st.k;plot();insp();
    const usesEta=['gd','hb','nag','adam'].includes(st.me),usesBeta=['hb','nag'].includes(st.me);
    $('lab-eta').disabled=!usesEta;$('lab-beta').disabled=!usesBeta;
    $('lab-kapl').style.display=$('lab-rotl').style.display=st.fn==='quad'?'':'none';
    $('lab-hint').textContent=usesEta?'':'This method chooses its own step (Newton: 1; the others: a backtracking line search).';
    $('lab-fdesc').textContent=FN[st.fn].desc()}
  const setEta=v=>{st.eta=v;$('lab-eta').value=Math.log10(v);$('lab-etav').textContent=CO.fmt(v,4)};
  function init(){
    RD.seg($('lab-fn'),m=>{st.fn=m;st.start=null;st.k=0;setEta(defEta());go()});
    RD.seg($('lab-me'),m=>{st.me=m;st.k=0;setEta(defEta());go()});
    $('lab-eta').addEventListener('input',e=>{st.eta=Math.pow(10,+e.target.value);$('lab-etav').textContent=CO.fmt(st.eta,4);go()});
    $('lab-beta').addEventListener('input',e=>{st.beta=+e.target.value;$('lab-betav').textContent=st.beta;go()});
    $('lab-n').addEventListener('input',e=>{st.n=+e.target.value;$('lab-nv').textContent=st.n;go()});
    $('lab-kap').addEventListener('input',e=>{st.kap=+e.target.value;$('lab-kapv').textContent=st.kap;go()});
    $('lab-rot').addEventListener('input',e=>{st.rot=+e.target.value;$('lab-rotv').textContent=st.rot+'°';go()});
    $('lab-k').addEventListener('input',e=>{st.k=+e.target.value;plot();insp()});
    $('lab-def').addEventListener('click',()=>{setEta(defEta());go()});
    $('lab-start').addEventListener('click',()=>{st.start=null;st.k=0;go()});
    setEta(defEta());st.run=run();
    (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-lab']=window.TAB_RENDER['t-lab']||[]).push(go);
    addEventListener('resize',()=>{const t=$('t-lab');if(t&&!t.hidden)go()});
  }
  init();
  return {st,FN,run,eig,wstar,go,defEta};
})();
