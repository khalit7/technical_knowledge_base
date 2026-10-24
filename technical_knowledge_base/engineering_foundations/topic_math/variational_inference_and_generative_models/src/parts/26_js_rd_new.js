// ---- Reading visuals added in the 2026-10-24 rebuild: hero (model A, bound and gap), VAE against diffusion diagram,
// IWAE bound against K, the amortisation gap split; plus closed-block helpers (redraw on open, links that open their block) ----
(function(){
  const $=id=>document.getElementById(id),N=window.VIN;
  const pdf=(z,m,v)=>Math.exp(-0.5*(z-m)*(z-m)/v)/Math.sqrt(2*Math.PI*v);
  // ===== hero =====
  function hero(){const el=$('vi-hero');if(!el)return;const A=N.A,W0=Math.min(RD.width(el),780),narrow=W0<560;
    const w1=narrow?W0:W0-250,h1=narrow?190:210,L=8,R=8,T=12,B=24,Z0=-3,Z1=3.2;const X=z=>L+(z-Z0)/(Z1-Z0)*(w1-L-R);
    const n=241,zs=[];for(let i=0;i<n;i++)zs.push(Z0+(Z1-Z0)*i/(n-1));
    const pri=zs.map(z=>pdf(z,0,1)),post=zs.map(z=>pdf(z,A.post_m,A.post_v)),q=zs.map(z=>pdf(z,A.q.m,A.q.v));
    const ym=Math.max(...post)*1.08,Y=v=>T+(1-v/ym)*(h1-T-B);const path=a=>a.map((v,i)=>(i?'L':'M')+X(zs[i]).toFixed(1)+' '+Y(v).toFixed(1)).join('');
    let s='<line x1="'+L+'" y1="'+(h1-B)+'" x2="'+(w1-R)+'" y2="'+(h1-B)+'" stroke="var(--mute)"/>';
    for(let z=-3;z<=3;z++)s+=RD.t(X(z),h1-8,z,{a:'middle',fs:11});
    s+='<path d="'+path(post)+'L'+X(Z1)+' '+(h1-B)+'L'+X(Z0)+' '+(h1-B)+'Z" fill="var(--c4)" fill-opacity="0.25" stroke="var(--c4)"/>';
    s+='<path d="'+path(pri)+'" fill="none" stroke="var(--mute)" stroke-dasharray="4 3"/><path d="'+path(q)+'" fill="none" stroke="var(--c1)" stroke-width="2.4"/>';
    s+=RD.t(X(1.2)+6,Y(pdf(1.2,1.2,0.2))+4,'posterior',{fs:12,fill:'var(--c4)',w:600})+RD.t(X(-1.55),Y(pdf(-1.55,0,1))-6,'prior',{a:'middle',fs:12,fill:'var(--mute)'})+RD.t(X(-0.25),Y(pdf(-0.25,0.5,0.25))-4,'q',{a:'end',fs:13,fill:'var(--c1)',w:700});
    s+=RD.t(w1-R,h1-B-6,'z',{a:'end',fs:12});
    const left=RD.svg(w1,h1,s,'Prior, posterior and q for model A');
    // right: the identity on a nats axis
    const w2=narrow?W0:240,h2=narrow?120:h1;let r='';
    if(!narrow){const V0=-3.45,V1=-1.65,Yv=v=>12+(1-(v-V0)/(V1-V0))*(h2-30),x0=70,bw=34;
      r+='<line x1="'+x0+'" y1="8" x2="'+x0+'" y2="'+(h2-14)+'" stroke="var(--mute)"/>';
      [-3.4,-3,-2.6,-2.2,-1.8].forEach(v=>{r+='<line x1="'+(x0-4)+'" y1="'+Yv(v)+'" x2="'+x0+'" y2="'+Yv(v)+'" stroke="var(--mute)"/>'+RD.t(x0-7,Yv(v)+4,v.toFixed(1),{a:'end',fs:11})});
      r+=RD.t(x0,h2-1,'nats',{a:'middle',fs:11,fill:'var(--mute)'});
      const yE=Yv(A.q.elbo),yP=Yv(A.logpx);
      r+='<rect x="'+(x0+10)+'" y="'+yP+'" width="'+bw+'" height="'+(yE-yP)+'" fill="var(--c2)" fill-opacity="0.85" rx="3"/>';
      r+='<line x1="'+x0+'" y1="'+yP+'" x2="'+(x0+bw+18)+'" y2="'+yP+'" stroke="var(--c3)" stroke-width="2"/><line x1="'+x0+'" y1="'+yE+'" x2="'+(x0+bw+18)+'" y2="'+yE+'" stroke="var(--c1)" stroke-width="2"/>';
      r+=RD.t(x0+bw+22,yP+4,'log p(x) = '+A.logpx.toFixed(4),{fs:11.5,fill:'var(--c3)',w:600})+RD.t(x0+bw+22,yE+4,'ELBO = '+A.q.elbo.toFixed(4),{fs:11.5,fill:'var(--c1)',w:600});
      r+=RD.t(x0+bw+22,(yP+yE)/2,'gap',{fs:12,fill:'var(--c2)',w:700})+RD.t(x0+bw+22,(yP+yE)/2+15,A.q.kl_post.toFixed(4)+' = KL',{fs:11.5,fill:'var(--c2)'});
    }else{const V0=-3.45,V1=-1.65,Xv=v=>12+(v-V0)/(V1-V0)*(w2-24),y0=58;
      r+='<line x1="12" y1="'+y0+'" x2="'+(w2-12)+'" y2="'+y0+'" stroke="var(--mute)"/>';
      [-3.4,-3,-2.6,-2.2,-1.8].forEach(v=>{r+='<line x1="'+Xv(v)+'" y1="'+y0+'" x2="'+Xv(v)+'" y2="'+(y0+4)+'" stroke="var(--mute)"/>'+RD.t(Xv(v),y0+17,v.toFixed(1),{a:'middle',fs:11})});
      const xE=Xv(A.q.elbo),xP=Xv(A.logpx);r+='<rect x="'+xE+'" y="'+(y0-20)+'" width="'+(xP-xE)+'" height="16" fill="var(--c2)" fill-opacity="0.85" rx="3"/>';
      r+=RD.t((xE+xP)/2,y0-25,'gap '+A.q.kl_post.toFixed(4)+' = KL',{a:'middle',fs:11.5,fill:'var(--c2)',w:700});
      r+=RD.t(xE,y0+34,'ELBO '+A.q.elbo.toFixed(4),{a:'start',fs:11.5,fill:'var(--c1)',w:600})+RD.t(xP,y0+50,'log p(x) '+A.logpx.toFixed(4),{a:'end',fs:11.5,fill:'var(--c3)',w:600});
      r+=RD.t(w2-12,y0+66,'nats',{a:'end',fs:11,fill:'var(--mute)'})}
    el.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start">'+left+RD.svg(w2,narrow?h2+6:h2,r,'log p(x) equals ELBO plus the gap')+'</div>'}
  // ===== VAE against diffusion =====
  function two(){const el=$('vi-two');if(!el)return;const W=Math.min(RD.width(el),780),narrow=W<560,H=narrow?272:236;let s='';
    const defs='<defs><marker id="vi-ar" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10z" fill="var(--ink)"/></marker></defs>';
    const box=(x,y,w,h,t,c)=>{const sub=t.split('_');const lab=sub[0]+(sub[1]?'<tspan dy="4" font-size="11">'+sub[1]+'</tspan>':'');return '<rect x="'+x+'" y="'+y+'" width="'+w+'" height="'+h+'" rx="6" fill="var(--soft)" stroke="'+(c||'var(--line)')+'" stroke-width="1.5"/>'+RD.t(x+w/2,y+h/2+4,lab,{a:'middle',fs:14,w:600})};
    const arr=(x1,y1,x2,y2,c,d)=>'<line x1="'+x1+'" y1="'+y1+'" x2="'+x2+'" y2="'+y2+'" stroke="'+(c||'var(--ink)')+'" stroke-width="1.6"'+(d?' stroke-dasharray="5 3"':'')+' marker-end="url(#vi-ar)"/>';
    // row 1: VAE
    const bw=narrow?44:56,bh=30,y1=narrow?28:26;s+=RD.t(4,14,'VAE',{fs:12.5,w:700});
    const xs=[8,(W-bw)/2,W-bw-8];s+=box(xs[0],y1,bw,bh,'x')+box(xs[1],y1,bw,bh,'z')+box(xs[2],y1,bw,bh,'x');
    s+=arr(xs[0]+bw+4,y1+bh/2,xs[1]-4,y1+bh/2,'var(--c1)')+arr(xs[1]+bw+4,y1+bh/2,xs[2]-4,y1+bh/2,'var(--c3)');
    s+=RD.t((xs[0]+bw+xs[1])/2,y1+bh+16,narrow?'q_φ(z|x) learned':'encoder q_φ(z | x), learned',{a:'middle',fs:11.5,fill:'var(--c1)'});
    s+=RD.t((xs[1]+bw+xs[2])/2,y1+bh+16,narrow?'p_θ(x|z) learned':'decoder p_θ(x | z), learned',{a:'middle',fs:11.5,fill:'var(--c3)'});
    s+=RD.t(W/2,y1+bh+34,narrow?'ELBO = reconstruction − KL to N(0, I)':'ELBO = reconstruction − KL(q(z | x) ‖ N(0, I))',{a:'middle',fs:11.5,fill:'var(--c2)'});
    // row 2: diffusion
    const y2=narrow?156:128,lab=narrow?['x_0','x_1','⋯','x_T']:['x_0','x_1','x_2','⋯','x_T'],nb=lab.length,gap=(W-16-nb*bw)/(nb-1);
    s+=RD.t(4,y2-(narrow?30:14),'Diffusion',{fs:12.5,w:700});
    for(let i=0;i<nb;i++){const x=8+i*(bw+gap);s+=lab[i]==='⋯'?RD.t(x+bw/2,y2+bh/2+5,'⋯',{a:'middle',fs:16}):box(x,y2,bw,bh,lab[i]);
      if(i<nb-1){const xa=x+bw+4,xb=x+bw+gap-4;s+=arr(xa,y2+8,xb,y2+8,'var(--mute)',true)+arr(xb,y2+bh-8,xa,y2+bh-8,'var(--c3)')}}
    s+=RD.t(narrow?W-8:W/2,y2-6,narrow?'forward q: add noise, fixed':'forward steps q: add Gaussian noise, fixed',{a:narrow?'end':'middle',fs:11.5,fill:'var(--mute)'});
    s+=RD.t(W/2,y2+bh+16,'reverse steps p_θ: learned denoisers',{a:'middle',fs:11.5,fill:'var(--c3)'});
    s+=RD.t(W/2,y2+bh+34,narrow?'ELBO: two end terms + one Gaussian KL per step':'ELBO: two end terms plus one KL between Gaussians per step',{a:'middle',fs:11.5,fill:'var(--c2)'});
    s+=RD.t(W/2,y2+bh+52,'→ predict the noise (L_simple)',{a:'middle',fs:11.5,fill:'var(--c2)'});
    el.innerHTML=RD.svg(W,H,defs+s,'A VAE and a diffusion model as latent-variable models')}
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
  const all=()=>{hero();two();iw();gap()};all();RD.onRender(all);RD.onResize(all);
  // closed blocks: charts inside measure their width when opened; links to a block open it
  document.querySelectorAll('#t-read details').forEach(d=>d.addEventListener('toggle',()=>{if(d.open)dispatchEvent(new Event('resize'))}));
  document.querySelectorAll('#t-read a[href^="#vi-"]').forEach(a=>a.addEventListener('click',()=>{const t=document.getElementById(a.getAttribute('href').slice(1));if(!t)return;
    const d=t.tagName==='DETAILS'?t:t.closest('details');if(d&&!d.open)d.open=true}));
})();
