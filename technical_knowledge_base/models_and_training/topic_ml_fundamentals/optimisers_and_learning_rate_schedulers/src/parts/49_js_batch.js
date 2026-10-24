// ---- Reading, section 6: the steps against data trade-off of McCandlish et al. 2018 (eq. 2.11, 2.12), one slider ----
// S = Smin (1 + Bcrit/B), E = Emin (1 + B/Bcrit). Rate rules for kappa = B / Bcrit relative to a run tuned at Bcrit.
(function(){
  const host=document.getElementById('bt-svg'),r=document.getElementById('bt-r');if(!host||!r)return;
  const out=document.getElementById('bt-out'),lab=document.getElementById('bt-v');
  const S=k=>1+1/k,Ex=k=>1+k;
  function draw(){const e=+r.value,k=Math.pow(2,e);lab.textContent=k>=1?k+'×':'1/'+(1/k);
    const W=RD.width(host),H=Math.round(Math.min(240,Math.max(180,W*0.34))),ml=42,mr=14,mt=12,mb=34,lo=0,hi=Math.log10(20);
    const x=v=>ml+(Math.log10(v)-lo)/(hi-lo)*(W-ml-mr),y=v=>mt+(hi-Math.log10(v))/(hi-lo)*(H-mt-mb);let s='';
    [1,2,5,10,20].forEach(v=>{s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(ml-4,y(v)+4,v+'×',{a:'end',fs:11,fill:'var(--mute)'});
      s+=RD.t(x(v),H-18,v+'×',{a:'middle',fs:11,fill:'var(--mute)'})});
    s+=RD.t(W-mr,H-4,'training examples E / Emin',{a:'end',fs:11,fill:'var(--mute)'});
    s+=RD.t(ml+2,mt+2,'steps S / Smin',{fs:11,fill:'var(--mute)'});
    let d='';for(let q=-5;q<=5;q+=0.05){const kk=Math.pow(2,q);if(Ex(kk)>20||S(kk)>20)continue;d+=(d?'L':'M')+x(Ex(kk)).toFixed(1)+','+y(S(kk)).toFixed(1)}
    s+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    s+='<circle cx="'+x(2)+'" cy="'+y(2)+'" r="3" fill="none" stroke="var(--mute)"/>'+RD.t(x(2)+6,y(2)-6,'B = Bcrit',{fs:11,fill:'var(--mute)'});
    s+='<circle cx="'+x(Ex(k))+'" cy="'+y(S(k))+'" r="5.5" fill="var(--acc)"/>';
    host.innerHTML=RD.svg(W,H,s,'Steps against training examples as the batch size changes');
    const b2=1-k*(1-0.95);
    out.innerHTML=RD.stat('steps needed',S(k).toFixed(2)+'× Smin','fewer as B grows, never below 1×')+RD.stat('examples needed',Ex(k).toFixed(2)+'× Emin','more as B grows')+
      RD.stat('SGD rate, from a run tuned at Bcrit','× '+(k>=1?k:k.toPrecision(3)),'linear rule, κ = '+(k>=1?k:'1/'+(1/k)))+
      RD.stat('Adam rate and β₂ (from 0.95)','× '+Math.sqrt(k).toPrecision(3)+', β₂ '+(b2>0?b2.toPrecision(3):'outside the rule'),b2>0?'square-root rule':'κ(1 − β₂) ≥ 1: the rule has run out')}
  r.addEventListener('input',draw);draw();RD.onRender(draw);RD.onResize(draw);
})();
