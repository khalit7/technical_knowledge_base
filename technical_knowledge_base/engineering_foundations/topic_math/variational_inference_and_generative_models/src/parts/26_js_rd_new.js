// ---- Reading visuals added in the 2026-10-24 rebuild: IWAE bound against K (the hero and the VAE against diffusion diagram became 3D stages, 2026-11-07), the amortisation gap split; plus closed-block helpers (redraw on open, links that open their block) ----
(function(){
  const $=id=>document.getElementById(id),N=window.VIN;
  const pdf=(z,m,v)=>Math.exp(-0.5*(z-m)*(z-m)/v)/Math.sqrt(2*Math.PI*v);
  // ===== IWAE bound against K =====
  function iw(){const el=$('vi-iw-svg');if(!el)return;const A=N.A,W=Math.min(RD.width(el),640),H=200,L=46,R=14,T=14,B=30;
    const Ks=['1','10','100','1000'],V0=-3.3,V1=-1.8,X=i=>L+i/3*(W-L-R-40)+20,Y=v=>T+(1-(v-V0)/(V1-V0))*(H-T-B);let s='';
    [-3.2,-2.8,-2.4,-2.0].forEach(v=>{s+='<line x1="'+L+'" y1="'+Y(v)+'" x2="'+(W-R)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,Y(v)+4,v.toFixed(1),{a:'end',fs:11})});
    s+='<line x1="'+L+'" y1="'+Y(A.logpx)+'" x2="'+(W-R)+'" y2="'+Y(A.logpx)+'" stroke="var(--c3)" stroke-width="1.6" stroke-dasharray="5 3"/>'+RD.t(L+6,Y(A.logpx)-5,'log p(x) = '+A.logpx.toFixed(4),{fs:11.5,fill:'var(--c3)',w:600});
    s+='<line x1="'+L+'" y1="'+Y(A.q.elbo)+'" x2="'+(W-R)+'" y2="'+Y(A.q.elbo)+'" stroke="var(--c1)" stroke-dasharray="2 3"/>'+RD.t(W-R,Y(A.q.elbo)+14,'exact ELBO '+A.q.elbo.toFixed(4),{a:'end',fs:11,fill:'var(--c1)'});
    let d='';Ks.forEach((k,i)=>{const v=A.q.iwae[k];d+=(i?'L':'M')+X(i)+' '+Y(v);s+='<circle cx="'+X(i)+'" cy="'+Y(v)+'" r="4.5" fill="var(--c2)"/>'+RD.t(X(i)+(i===3?-2:8),Y(v)+(i===0?-8:i===3?-10:16),v.toFixed(i<2?2:3),{a:i===3?'end':'start',fs:11.5,w:600});
      s+=RD.t(X(i),H-10,'K = '+Number(k).toLocaleString('en-US'),{a:'middle',fs:11})});
    s='<path d="'+d+'" fill="none" stroke="var(--c2)" stroke-width="1.6"/>'+s;
    el.innerHTML=RD.svg(W,H,s,'Importance-weighted bound against K')}
  // ===== amortisation gap split =====
  function gap(){const el=$('vi-gap-svg');if(!el)return;const G=window.VIVAE.gap,W=Math.min(RD.width(el),680),narrow=W<520,H=150,L=14,R=14;
    const V0=-146,V1=-134.5,X=v=>L+(v-V0)/(V1-V0)*(W-L-R),y=58;let s='';
    s+='<line x1="'+L+'" y1="'+(y+26)+'" x2="'+(W-R)+'" y2="'+(y+26)+'" stroke="var(--mute)"/>';
    [-146,-144,-142,-140,-138,-136].forEach(v=>{s+='<line x1="'+X(v)+'" y1="'+(y+26)+'" x2="'+X(v)+'" y2="'+(y+30)+'" stroke="var(--mute)"/>'+RD.t(X(v),y+43,v,{a:'middle',fs:11})});
    s+=RD.t(L,y+60,'nats per image (first 100 test images)',{fs:11,fill:'var(--mute)'});
    const xe=X(G.elbo_encoder),xo=X(G.elbo_optimised),xp=X(G.logpx_quadrature);
    s+='<rect x="'+xe+'" y="'+y+'" width="'+(xo-xe)+'" height="20" fill="var(--c2)" fill-opacity="0.85" rx="2"/><rect x="'+xo+'" y="'+y+'" width="'+Math.max(2,xp-xo)+'" height="20" fill="var(--c5)" rx="1"/>';
    s+=RD.t((xe+xo)/2,y+15,'amortisation gap '+G.amortisation_gap.toFixed(2),{a:'middle',fs:12,fill:'var(--bg)',w:700});
    [[xe,'encoder ELBO '+G.elbo_encoder.toFixed(2),'start',y-6,'var(--c1)'],[xp,'log p(x) '+G.logpx_quadrature.toFixed(2),'end',y-36,'var(--c3)'],[xo,'ELBO, per-image q '+G.elbo_optimised.toFixed(2),'end',y-21,'var(--c5)']].forEach(([x,t,a,yy,c])=>{s+='<line x1="'+x+'" y1="'+(yy+3)+'" x2="'+x+'" y2="'+y+'" stroke="'+c+'"/>'+RD.t(x+(a==='start'?0:0),yy,t,{a,fs:11.5,fill:c,w:600})});
    s+=RD.t(xp,y+78,'approximation gap '+G.approximation_gap.toFixed(2)+' (thin bar)',{a:'end',fs:11,fill:'var(--c5)'});
    el.innerHTML=RD.svg(W,H,s,'The ELBO gap split into amortisation and approximation')}
  const all=()=>{iw();gap()};all();RD.onRender(all);RD.onResize(all);
  // closed blocks: charts inside measure their width when opened; links to a block open it
  document.querySelectorAll('#t-read details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)dispatchEvent(new Event('resize'))}));
  document.querySelectorAll('#t-read a[href^="#vi-"]').forEach(a=>a.addEventListener('click',()=>{const t=document.getElementById(a.getAttribute('href').slice(1));if(!t)return;
    const d=t.tagName==='DETAILS'?t:t.closest('details');if(d&&!d.open)d.open=true}));
})();
