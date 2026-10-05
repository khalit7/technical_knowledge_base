// ---- Gradient lab: 3. curvature and step size on a 2D bowl ----
(function(){
  const U=GLU,$=U.$,G=GL;
  const START=[-4,3.2],STEPS=60;
  const S={opt:'gd',lmax:2,kap:4,ang:30,lr:0.3,beta:0.9};
  const PRE={smooth:{opt:'gd',kap:4,ang:30,lr:0.3,beta:0.9},osc:{opt:'gd',kap:4,ang:30,lr:0.85,beta:0.9},div:{opt:'gd',kap:4,ang:30,lr:1.05,beta:0.9},
    valley:{opt:'gd',kap:25,ang:30,lr:0.96,beta:0.9},mom:{opt:'mom',kap:25,ang:30,lr:1.39,beta:0.44},adam:{opt:'adam',kap:25,ang:45,lr:0.1,beta:0.9}};
  let run=null;
  const o=()=>({opt:S.opt,l1:S.lmax,l2:S.lmax/S.kap,ang:S.ang*Math.PI/180,lr:S.lr,beta:S.beta,start:START,steps:STEPS});
  function ctl(){const lrMax=S.opt==='adam'?1:Math.max(4.2/S.lmax,S.lr);
    let h='<label>Steepest curvature λ<sub>max</sub>: <b>'+U.f(S.lmax,2)+'</b><input type="range" id="gl-lm" min="0.5" max="5" step="0.1" value="'+S.lmax+'" aria-label="Largest eigenvalue"></label>'+
      '<label>Condition number κ = λ<sub>max</sub>/λ<sub>min</sub>: <b>'+U.f(S.kap,1)+'</b><input type="range" id="gl-kap" min="0" max="2" step="0.01" value="'+Math.log10(S.kap)+'" aria-label="Condition number (log scale)"></label>'+
      '<label>Valley rotation: <b>'+S.ang+'°</b><input type="range" id="gl-ang" min="0" max="90" step="5" value="'+S.ang+'" aria-label="Rotation in degrees"></label>';
    if(S.opt!=='newton')h+='<label>Learning rate η: <b>'+U.f(S.lr,3)+'</b><input type="range" id="gl-lr" min="0.005" max="'+lrMax.toFixed(3)+'" step="0.005" value="'+S.lr+'" aria-label="Learning rate"></label>';
    if(S.opt==='mom')h+='<label>Momentum β: <b>'+U.f(S.beta,2)+'</b><input type="range" id="gl-beta" min="0" max="0.99" step="0.01" value="'+S.beta+'" aria-label="Momentum beta"></label>';
    $('gl-curvCtl').innerHTML=h;
    const on=(id,fn)=>{const el=$(id);if(el)el.addEventListener('input',()=>{fn(+el.value);ctl();recompute(true)})};
    on('gl-lm',v=>S.lmax=v);on('gl-kap',v=>S.kap=Math.pow(10,v));on('gl-ang',v=>S.ang=v);on('gl-lr',v=>S.lr=v);on('gl-beta',v=>S.beta=v)}
  function recompute(jump){run=G.runOpt(o());A.reset(run.path.length);if(jump)A.go(run.path.length-1);else A.go(0);stats()}
  function draw(i){bowl(i);lcurve(i)}
  function bowl(i){const el=$('gl-bowl'),W=Math.min(U.width(el),420),H=W,R=5.2;const X=x=>W/2+x/R*W/2,Y=y=>H/2-y/R*H/2;
    const l1=S.lmax,l2=S.lmax/S.kap,a=S.ang*Math.PI/180,c=Math.cos(a),s=Math.sin(a);let b='<defs><clipPath id="gl-clipB"><rect x="0" y="0" width="'+W+'" height="'+H+'"/></clipPath></defs><g clip-path="url(#gl-clipB)">';
    b+=U.ln(0,Y(0),W,Y(0),'var(--line)')+U.ln(X(0),0,X(0),H,'var(--line)');
    const L0=G.qLoss(G.hess(l1,l2,a),START);
    for(let k=0;k<9;k++){const lev=L0*Math.pow(0.45,k-1.2);const ru=Math.sqrt(2*lev/l1),rv=Math.sqrt(2*lev/l2);const pts=[];
      for(let t=0;t<=64;t++){const th=t/64*2*Math.PI,u=ru*Math.cos(th),v=rv*Math.sin(th);pts.push([X(c*u-s*v),Y(s*u+c*v)])}b+=U.pl(pts,'var(--dim)',{w:1})}
    // eigen-directions
    b+=U.ln(X(-R*c),Y(-R*s),X(R*c),Y(R*s),'var(--c2)',{dash:'3 4'})+U.ln(X(R*s),Y(-R*c),X(-R*s),Y(R*c),'var(--c3)',{dash:'3 4'});
    const P=run.path.slice(0,i+1).map(p=>[X(Math.max(-1e4,Math.min(1e4,p[0]))),Y(Math.max(-1e4,Math.min(1e4,p[1])))]);
    b+=U.pl(P,'var(--c1)',{w:1.6});P.forEach((p,k)=>{if(k&&k<=i)b+=U.dot(p[0],p[1],2.2,'var(--c1)')});
    b+=U.dot(X(START[0]),Y(START[1]),4.5,'var(--ink)');
    b+='</g>'+U.t(X(0)+5,Y(0)-5,'× minimum',{fs:10.5,c:'var(--mute)'});
    b+=U.t(6,H-8,'steep axis',{fs:10.5,c:'var(--c2)'})+U.t(W-6,H-8,'flat axis',{a:'end',fs:10.5,c:'var(--c3)'});
    el.innerHTML=U.svg(W,H,b,'Contours of a quadratic bowl with the optimiser path')}
  function lcurve(i){const el=$('gl-lcurve'),W=Math.min(U.width(el),460),H=Math.min(W,260),pad={l:40,r:10,t:10,b:26};
    const L=run.loss.map(v=>Math.log10(Math.max(v,1e-16)));const lo=-12,hi=Math.max(2,Math.min(8,Math.ceil(Math.max(...L.filter(isFinite)))));
    const X=k=>pad.l+k/STEPS*(W-pad.l-pad.r),Y=v=>pad.t+(1-(Math.min(hi,Math.max(lo,v))-lo)/(hi-lo))*(H-pad.t-pad.b);let b='';
    for(let v=lo;v<=hi;v+=4)b+=U.ln(pad.l,Y(v),W-pad.r,Y(v),'var(--line)')+U.t(pad.l-4,Y(v)+3,'1e'+String(v).replace('-','−'),{a:'end',fs:10,c:'var(--mute)'});
    for(let k=0;k<=STEPS;k+=20)b+=U.t(X(k),H-pad.b+14,String(k),{a:'middle',fs:10,c:'var(--mute)'});
    b+=U.pl(L.slice(0,i+1).map((v,k)=>[X(k),Y(isFinite(v)?v:hi)]),'var(--c1)',{w:1.8});
    b+=U.t((pad.l+W-pad.r)/2,H-2,'step',{a:'middle',fs:10.5,c:'var(--mute)'});
    el.innerHTML=U.svg(W,H,b,'Loss against step')}
  function stats(){const l1=S.lmax,l2=S.lmax/S.kap,H=G.hess(l1,l2,S.ang*Math.PI/180),r=S.lr*l1,v=G.verdict(o());
    const last=run.loss[run.loss.length-1],L0=run.loss[0];
    let pill='';
    if(S.opt==='gd'){const cls=v==='smooth'?'good':v==='oscillates'?'warn':'bad';pill='<span class="gl-pill '+cls+'">'+v+'</span>'}
    else if(S.opt==='mom'){pill='<span class="gl-pill '+(v==='converges'?'good':'bad')+'">'+v+' (limit ηλ<sub>max</sub> &lt; 2(1 + β) = '+U.f(2*(1+S.beta),2)+')</span>'}
    else pill='<span class="gl-pill">'+(isFinite(last)&&last<L0?'loss falls':'loss does not fall')+'</span>';
    const g0=G.qGrad(H,START),det=H[0][0]*H[1][1]-H[0][1]*H[1][0],nst=[-(H[1][1]*g0[0]-H[0][1]*g0[1])/det,-(-H[1][0]*g0[0]+H[0][0]*g0[1])/det];
    let k6=run.loss.findIndex(x=>x<L0*1e-6);
    $('gl-curvOut').innerHTML=U.stat('Hessian H',U.mat(H,{d:2}),'eigenvalues '+U.f(l1,2)+' and '+U.f(l2,3))+
      U.stat('Stability limit 2/λ<sub>max</sub>',U.f(2/l1,3),'learning rate η = '+(S.opt==='newton'?'not used':U.f(S.lr,3)))+
      (S.opt==='gd'||S.opt==='mom'?U.stat('η × λ<sub>max</sub>',U.f(r,2),pill):U.stat('Verdict',pill,''))+
      (S.opt==='gd'?U.stat('Shrink factor per step, |1 − ηλ|',U.f(Math.abs(1-r),3)+' / '+U.f(Math.abs(1-S.lr*l2),3),'steep axis / flat axis (above 1 grows)'):'')+
      U.stat('Steps to cut the loss a millionfold',k6>0?String(k6):'not in '+STEPS,'loss after '+STEPS+': '+U.g(last,2))+
      U.stat('Newton step from the start',U.mat(nst,{d:2}),'−H<sup>−1</sup>∇L: exactly minus the start, so it lands on the minimum');
    let note='';
    if(S.opt==='gd')note='Best fixed learning rate for this bowl: η = 2/(λ<sub>max</sub> + λ<sub>min</sub>) = '+U.f(2/(l1+l2),3)+', which shrinks the error by (κ − 1)/(κ + 1) = '+U.f((S.kap-1)/(S.kap+1),3)+' per step in distance to the minimum (Goh 2017); the loss, a squared distance, shrinks by the square of that.';
    if(S.opt==='mom')note='Best momentum for this bowl (Goh 2017): β = ((√κ − 1)/(√κ + 1))² = '+U.f(Math.pow((Math.sqrt(S.kap)-1)/(Math.sqrt(S.kap)+1),2),2)+' with η = (2/(√λ<sub>max</sub> + √λ<sub>min</sub>))² = '+U.f(Math.pow(2/(Math.sqrt(l1)+Math.sqrt(l2)),2),2)+', shrinking the error by (√κ − 1)/(√κ + 1) = '+U.f((Math.sqrt(S.kap)-1)/(Math.sqrt(S.kap)+1),3)+' per step. Note that ηλ<sub>max</sub> can exceed 2 here: plain gradient descent at the same learning rate would diverge.';
    if(S.opt==='adam')note='<span class="ill">Intuition, not a theorem:</span> Adam’s step per coordinate is about η in size whatever the curvature, so it does not blow up at large η the way gradient descent does; instead it ends up jittering around the minimum at a scale set by η. Rotate the valley to 0° and to 45° at the same η: lined up with the axes it helps most.';
    if(S.opt==='newton')note='Newton’s method divides the gradient by the curvature in every direction at once, so the condition number stops mattering: one step, whatever κ and the rotation. The cost is the inverse Hessian, impossible to form for millions of parameters.';
    $('gl-curvNote').innerHTML=note}
  const A=U.anim({card:'gl-curvCard',ctl:'gl-curvAnim',n:STEPS+1,draw:i=>{if(run)draw(Math.min(i,run.path.length-1))},ms:160,label:'Optimiser step'});
  U.seg($('gl-optSeg'),m=>{S.opt=m;if(m==='adam'&&S.lr>1)S.lr=0.1;ctl();recompute(false);A.play()});
  $('gl-presets').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const p=PRE[b.dataset.p];Object.assign(S,p,{lmax:2});
    $('gl-optSeg').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x.dataset.m===S.opt));ctl();recompute(false);A.play()});
  ctl();run=G.runOpt(o());A.reset(run.path.length);stats();
  U.onRender(()=>A.redraw());U.onResize(()=>A.redraw());
})();
