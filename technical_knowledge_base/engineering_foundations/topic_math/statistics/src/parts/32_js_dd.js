// ---- Double descent lab (data: SD.dd from sims.py) ----
(function(){
  const card=document.getElementById('dd-card');if(!card)return;const D=SD.dd,P=D.p;let kind='even',lam=0;const sl=document.getElementById('dd-p');
  function draw(){
    const p=+sl.value,i=P.indexOf(p),r=D.betas[kind][String(lam)],th=D.betas[kind].theory[i];
    document.getElementById('dd-pv').textContent=p;
    ST.ddPlot(document.getElementById('dd-svg'),kind,lam,{mark:p,h:260});
    const f=v=>v==null?'infinite':v>=1000?Math.round(v).toLocaleString('en'):v.toFixed(3);
    document.getElementById('dd-cnt').innerHTML=RD.stat('test error, mean',f(r.mean[i]),'over 1,000 training sets')+RD.stat('test error, median',f(r.median[i]),'robust to the few blow-ups')+
      RD.stat('bias²',f(r.bias2[i]),'incl. the unseen features')+RD.stat('variance',f(r.var[i]),'')+RD.stat('Theorem 1',lam===0?f(th):'n/a','exact expectation, λ = 0')+RD.stat('noise floor',(D.sigma*D.sigma).toFixed(3),'σ²');
    // singular values
    const el=document.getElementById('dd-sv'),W=RD.width(el),H=150,L=40,R=12,T=10,B=28,pw=W-L-R,ph=H-T-B,mx=Math.max(...D.smin);
    const X=q=>L+(q-1)/(P.length-1)*pw,Y=v=>T+ph-v/mx*ph;let s='';
    [0,1,2,3,4,5,6].forEach(v=>{if(v>mx)return;s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" style="stroke:var(--line)"/>'+RD.t(L-4,Y(v)+3,String(v),{fs:9.5,a:'end',fill:'var(--mute)'})});
    s+='<path d="'+D.smin.map((v,j)=>(j?'L':'M')+X(P[j]).toFixed(1)+' '+Y(v).toFixed(1)).join('')+'" style="fill:none;stroke:var(--c4);stroke-width:2"/>';
    s+='<line x1="'+X(p)+'" x2="'+X(p)+'" y1="'+T+'" y2="'+(T+ph)+'" style="stroke:var(--ink);stroke-dasharray:3 3"/>'+RD.t(Math.min(W-R-2,X(p)+4),T+12,'p = '+p+': '+D.smin[i].toFixed(3),{fs:10.5,a:X(p)>W*0.7?'end':'start'});
    [1,20,40,60,80,100].forEach(q=>{s+=RD.t(X(q),T+ph+13,String(q),{fs:10,a:'middle',fill:'var(--mute)'})});
    s+=RD.t(L+pw/2,H-2,'features used, p',{fs:10,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Smallest singular value of the training matrix');
  }
  RD.seg(document.getElementById('dd-beta'),m=>{kind=m;draw()});
  RD.seg(document.getElementById('dd-lam'),m=>{lam=+m;draw()});
  sl.addEventListener('input',draw);
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-dd']=window.TAB_RENDER['t-dd']||[]).push(draw);
  addEventListener('resize',()=>{if(!document.getElementById('t-dd').hidden)draw()});
})();
