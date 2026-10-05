// ---- Double descent: shared plot (Reading s11 and the Double descent lab). Data: SD.dd from sims.py ----
// series drawn against p (features used): mean test error, bias^2, variance, and Belkin, Hsu and Xu's Theorem 1 (lam = 0 only)
ST.ddPlot=function(el,kind,lam,o){
  o=o||{};const D=SD.dd,P=D.p,r=D.betas[kind][String(lam)],th=D.betas[kind].theory;
  const W=RD.width(el),H=o.h||240,L=44,R=12,T=12,B=32,pw=W-L-R,ph=H-T-B,ymin=-2,ymax=o.ymax||6;
  const X=p=>L+(p-1)/(P.length-1)*pw,Y=v=>{const l=Math.log10(Math.max(v,1e-3));return T+(ymax-Math.min(ymax,Math.max(ymin,l)))/(ymax-ymin)*ph};
  let s='';
  for(let e=ymin;e<=ymax;e++){s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(Math.pow(10,e))+'" y2="'+Y(Math.pow(10,e))+'" style="stroke:var(--line)"/>'+RD.t(L-4,Y(Math.pow(10,e))+3,e<0?String(Math.pow(10,e)):(e>3?'1e'+e:String(Math.pow(10,e))),{fs:9.5,a:'end',fill:'var(--mute)'})}
  s+='<rect x="'+X(D.n-1)+'" width="'+(X(D.n+1)-X(D.n-1))+'" y="'+T+'" height="'+ph+'" style="fill:var(--hl);opacity:.7"/>';
  const line=(arr,c,w,dash)=>{let d='';arr.forEach((v,i)=>{if(v==null)return;d+=(d?'L':'M')+X(P[i]).toFixed(1)+' '+Y(v).toFixed(1)});return '<path d="'+d+'" style="fill:none;stroke:'+c+';stroke-width:'+w+(dash?';stroke-dasharray:'+dash:'')+'"/>'};
  s+=line(r.bias2,'var(--c3)',1.6,'5 3')+line(r.var,'var(--c2)',1.6,'2 2')+line(r.mean,'var(--c1)',2.2);
  if(lam===0)th.forEach((v,i)=>{if(v!=null&&i%3===0)s+='<circle cx="'+X(P[i]).toFixed(1)+'" cy="'+Y(v).toFixed(1)+'" r="2.3" style="fill:none;stroke:var(--ink);stroke-width:1.2"/>'});
  if(o.mark){s+='<line x1="'+X(o.mark)+'" x2="'+X(o.mark)+'" y1="'+T+'" y2="'+(T+ph)+'" style="stroke:var(--ink);stroke-dasharray:3 3"/>'}
  [1,20,40,60,80,100].forEach(p=>{s+=RD.t(X(p),T+ph+13,String(p),{fs:10,a:'middle',fill:'var(--mute)'})});
  s+=RD.t(X(D.n)+4,T+10,'threshold p = n = '+D.n,{fs:10,fill:'var(--mute)'});
  s+=RD.t(L+pw/2,H-3,'features used, p (n = '+D.n+' training examples); y: test error, log scale',{fs:10,a:'middle',fill:'var(--mute)'});
  el.innerHTML=RD.svg(W,H,s,'Double descent: test error, bias squared and variance against the number of features')+
    '<div class="leg"><span style="--sw:var(--c1)">test error (mean of '+D.T.toLocaleString('en')+' training sets)</span><span style="--sw:var(--c3)">bias² (dashed)</span><span style="--sw:var(--c2)">variance (dotted)</span>'+(lam===0?'<span style="--sw:transparent">\u25cb Theorem 1, exact (circles)</span>':'')+'</div>';
};
(function(){
  const card=document.getElementById('rd-dd-card');if(!card)return;let lam=0;
  function draw(){const el=document.getElementById('rd-dd-svg');ST.ddPlot(el,'even',lam,{});
    const r=SD.dd.betas.even[String(lam)],P=SD.dd.p,at=(a,p)=>a[P.indexOf(p)];
    const f=v=>v>=1000?Math.round(v).toLocaleString('en'):v.toFixed(3);
    document.getElementById('rd-dd-cnt').innerHTML=RD.stat('error at p = 10',f(at(r.mean,10)),'below the threshold')+RD.stat('error at p = 40',f(at(r.mean,40)),lam===0?'Theorem 1: infinite':'ridge tames the peak')+RD.stat('error at p = 100',f(at(r.mean,100)),'past the threshold')+RD.stat('variance at p = 40',f(at(r.var,40)),'bias² '+f(at(r.bias2,40)));
  }
  RD.seg(document.getElementById('rd-dd-seg'),m=>{lam=+m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
