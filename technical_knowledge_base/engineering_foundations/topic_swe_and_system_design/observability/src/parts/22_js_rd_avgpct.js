// ---- Reading: averaged percentiles (section 4). The hero and the OpenTelemetry path are 3D stages since 2026-11-07 (34_js_sc_hero.js, 37_js_sc_otel.js) ----
// All numbers from window.DEMO (the real run, src/inputs) and DEMO.avgpct (src/avgpct.py). Static figures: nothing moves.
(function(){
  if(!document.getElementById('ap-chart'))return;
  const D=window.DEMO,$=id=>document.getElementById(id),T=RD.t;
  const fmt=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});

  // averaged percentiles: three replicas' p99s, their mean, and the pooled p99's lower bound
  function avgP(){
    const el=$('ap-chart');if(!el)return;const A=D.avgpct.replicas,W=RD.width(el),L=64,R=12,TP=30,RH=26,H=TP+A.parts.length*RH+26;
    const X1=1600,xs=v=>L+(W-L-R)*v/X1;let b='';
    b+='<rect x="'+xs(A.pooled_lower_bound).toFixed(1)+'" y="'+(TP-6)+'" width="'+(xs(X1)-xs(A.pooled_lower_bound)).toFixed(1)+'" height="'+(A.parts.length*RH+6)+'" fill="var(--good)" opacity=".12"/>';
    A.parts.forEach((p,i)=>{const y=TP+i*RH;b+=T(L-6,y+14,p.label,{a:'end',fs:11});
      b+='<rect x="'+L+'" y="'+(y+3)+'" width="'+Math.max(1,xs(p.p99)-L).toFixed(1)+'" height="14" fill="'+(p.label==='r3-cold'?'var(--bad)':'var(--c1)')+'" opacity=".8"/>';
      const lab='p99 '+fmt(p.p99,1)+' ms',xe=xs(p.p99);b+=T(xe+4>W-90?xe-4:xe+4,y+14,lab,{a:xe+4>W-90?'end':'start',fs:11,fill:xe+4>W-90?'var(--bg)':'var(--ink)'})});
    const xm=xs(A.mean_of_p99);
    b+='<line x1="'+xm+'" x2="'+xm+'" y1="'+(TP-6)+'" y2="'+(TP+A.parts.length*RH)+'" stroke="var(--c5)" stroke-width="2" stroke-dasharray="5 3"/>';
    b+=T(xm,TP-12,'mean of p99s: '+fmt(A.mean_of_p99,1)+' ms',{a:xm>W/2?'end':'middle',fs:11,fill:'var(--c5)',w:600});
    b+=T(W-R,TP+A.parts.length*RH+16,'true p99 of all '+A.n+': &#8805; '+fmt(A.pooled_lower_bound,1)+' ms (shaded)',{a:'end',fs:11,fill:'var(--good)'});
    [0,500,1000,1500].forEach(v=>{b+='<line x1="'+xs(v)+'" x2="'+xs(v)+'" y1="'+(TP-2)+'" y2="'+(TP+A.parts.length*RH)+'" stroke="var(--line)"/>'});
    el.innerHTML=RD.svg(W,H,b,'Three replicas p99, their mean, and the pooled p99');
  }
  function all(){avgP()}
  RD.onRender(all);RD.onResize(all);all();
})();
