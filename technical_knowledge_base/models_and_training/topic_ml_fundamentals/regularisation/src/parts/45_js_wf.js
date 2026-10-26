// ---- Reading section 8: double descent in weak-features regression, decomposed into bias² and variance, with the singular values ----
// Data: WF from weak_features_dd.py (moved from the Statistics page on 2026-10-26). Every signal and ridge strength; nothing moves until the reader acts.
(function(){
  const card=document.getElementById('wf-card');if(!card)return;const D=WF,P=D.p;let kind='even',lam=0;const sl=document.getElementById('wf-p');
  function plot(el,mark){
    const r=D.betas[kind][String(lam)],th=D.betas[kind].theory;
    const W=RD.width(el),H=260,L=44,R=12,T=12,B=32,pw=W-L-R,ph=H-T-B,ymin=-2,ymax=6;
    const X=p=>L+(p-1)/(P.length-1)*pw,Y=v=>{const l=Math.log10(Math.max(v,1e-3));return T+(ymax-Math.min(ymax,Math.max(ymin,l)))/(ymax-ymin)*ph};
    let s='';
    for(let e=ymin;e<=ymax;e++){s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(Math.pow(10,e))+'" y2="'+Y(Math.pow(10,e))+'" style="stroke:var(--line)"/>'+RD.t(L-4,Y(Math.pow(10,e))+3,e<0?String(Math.pow(10,e)):(e>3?'1e'+e:String(Math.pow(10,e))),{fs:9.5,a:'end',fill:'var(--mute)'})}
    s+='<rect x="'+X(D.n-1)+'" width="'+(X(D.n+1)-X(D.n-1))+'" y="'+T+'" height="'+ph+'" style="fill:var(--hl);opacity:.7"/>';
    const line=(arr,c,w,dash)=>{let d='';arr.forEach((v,i)=>{if(v==null)return;d+=(d?'L':'M')+X(P[i]).toFixed(1)+' '+Y(v).toFixed(1)});return '<path d="'+d+'" style="fill:none;stroke:'+c+';stroke-width:'+w+(dash?';stroke-dasharray:'+dash:'')+'"/>'};
    s+=line(r.bias2,'var(--c3)',1.6,'5 3')+line(r.var,'var(--c2)',1.6,'2 2')+line(r.mean,'var(--c1)',2.2);
    if(lam===0)th.forEach((v,i)=>{if(v!=null&&i%3===0)s+='<circle cx="'+X(P[i]).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="2.3" style="fill:none;stroke:var(--ink);stroke-width:1.2"/>'});
    s+='<line x1="'+X(mark)+'" x2="'+X(mark)+'" y1="'+T+'" y2="'+(T+ph)+'" style="stroke:var(--ink);stroke-dasharray:3 3"/>';
    [1,20,40,60,80,100].forEach(p=>{s+=RD.t(X(p),T+ph+13,String(p),{fs:10,a:'middle',fill:'var(--mute)'})});
    s+=RD.t(X(D.n)+4,T+10,'threshold p = n = '+D.n,{fs:10,fill:'var(--mute)'});
    s+=RD.t(L+pw/2,H-3,'features used, p (n = '+D.n+' training examples); y: test error, log scale',{fs:10,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Double descent: test error, bias squared and variance against the number of features')+
      '<div class="leg"><span style="--sw:var(--c1)">test error (mean of '+D.T.toLocaleString('en')+' training sets)</span><span style="--sw:var(--c3)">bias² (dashed)</span><span style="--sw:var(--c2)">variance (dotted)</span>'+(lam===0?'<span style="--sw:transparent">○ Theorem 1, exact (circles)</span>':'')+'</div>';
  }
  function draw(){
    const p=+sl.value,i=P.indexOf(p),r=D.betas[kind][String(lam)],th=D.betas[kind].theory[i];
    document.getElementById('wf-pv').textContent=p;
    plot(document.getElementById('wf-svg'),p);
    const f=v=>v==null?'infinite':v>=1000?Math.round(v).toLocaleString('en'):v.toFixed(3);
    document.getElementById('wf-cnt').innerHTML=RD.stat('test error, mean',f(r.mean[i]),'over 1,000 training sets')+RD.stat('test error, median',f(r.median[i]),'robust to the few blow-ups')+
      RD.stat('bias²',f(r.bias2[i]),'incl. the unseen features')+RD.stat('variance',f(r.var[i]),'')+RD.stat('Theorem 1',lam===0?f(th):'n/a','exact expectation, λ = 0')+RD.stat('noise floor',(D.sigma*D.sigma).toFixed(3),'σ²');
    // singular values
    const el=document.getElementById('wf-sv'),W=RD.width(el),H=150,L=40,R=12,T=10,B=28,pw=W-L-R,ph=H-T-B,mx=Math.max(...D.smin);
    const X=q=>L+(q-1)/(P.length-1)*pw,Y=v=>T+ph-v/mx*ph;let s='';
    [0,1,2,3,4,5,6].forEach(v=>{if(v>mx)return;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--line)"/>'+RD.t(L-4,Y(v)+3,String(v),{fs:9.5,a:'end',fill:'var(--mute)'})});
    s+='<path d="'+D.smin.map((v,j)=>(j?'L':'M')+X(P[j]).toFixed(1)+' '+Y(v).toFixed(1)).join('')+'" style="fill:none;stroke:var(--c4);stroke-width:2"/>';
    s+='<line x1="'+X(p)+'" x2="'+X(p)+'" y1="'+T+'" y2="'+(T+ph)+'" style="stroke:var(--ink);stroke-dasharray:3 3"/>'+RD.t(Math.min(W-R-2,X(p)+4),T+12,'p = '+p+': '+D.smin[i].toFixed(3),{fs:10.5,a:X(p)>W*0.7?'end':'start'});
    [1,20,40,60,80,100].forEach(q=>{s+=RD.t(X(q),T+ph+13,String(q),{fs:10,a:'middle',fill:'var(--mute)'})});
    s+=RD.t(L+pw/2,H-2,'features used, p',{fs:10,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Smallest singular value of the training matrix');
  }
  RD.seg(document.getElementById('wf-beta'),m=>{kind=m;draw()});
  RD.seg(document.getElementById('wf-lam'),m=>{lam=+m;draw()});
  sl.addEventListener('input',draw);
  RD.onRender(draw);RD.onResize(draw);draw();
})();
