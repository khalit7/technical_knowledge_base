// ---- Reading visuals, part A: estimator variances, schedules (the CAVI animation became the 3D stage 27_js_sc_2cavi.js, 2026-11-07) ----
(function(){
  const $=id=>document.getElementById(id),f=(v,d)=>Number(v).toFixed(d==null?3:d);
  const N=window.VIN;
  // ===== estimator variances =====
  function est(){const el=$('vi-est-svg');if(!el)return;const W=Math.min(RD.width(el),640),rows=['1','10','100'];
    const ser=[['pathwise (reparameterisation)','rep_var','var(--c3)'],['score function','sf_var','var(--c2)'],['score function with baseline','sfb_var','var(--c5)']];
    const L=118,R=56,rowH=58,H=rowH*rows.length+26;const lmin=0,lmax=6;const X=v=>L+(Math.log10(v)-lmin)/(lmax-lmin)*(W-L-R);
    let s='';[1,10,100,1e3,1e4,1e5,1e6].forEach((v,i)=>{const x=X(v);s+='<line x1="'+x+'" y1="4" x2="'+x+'" y2="'+(H-20)+'" stroke="var(--line)"/>'+RD.t(x,H-6,['1','10','100','1k','10k','100k','1M'][i],{a:'middle',fs:10})});
    rows.forEach((d,ri)=>{const y0=6+ri*rowH;s+=RD.t(4,y0+24,'d = '+d,{fs:12,w:600});
      ser.forEach((se,k)=>{const v=N.est[d][se[1]],y=y0+k*16;s+='<rect x="'+L+'" y="'+y+'" width="'+Math.max(1,X(v)-L).toFixed(1)+'" height="12" fill="'+se[2]+'" rx="2"/>'+RD.t(X(v)+4,y+10,v>=1000?Math.round(v).toLocaleString('en-US'):v.toFixed(v<10?2:1),{fs:10.5})})});
    el.innerHTML=RD.svg(W,H,s,'Estimator variance by dimension')+'<div class="leg">'+ser.map(se=>'<span style="--sw:'+se[2]+'">'+se[0]+'</span>').join('')+'</div>'}
  est();RD.onResize(est);
  // ===== schedules =====
  (function(){const el=$('vi-sch-svg');if(!el)return;let sched='linear';const D=VI.moons(400,3);const r=VI.rng(4);const EPS=new Float64Array(800);for(let i=0;i<800;i++)EPS[i]=r.g();
    function draw(){const t=+$('vi-sch-t').value;$('vi-sch-tv').textContent=t;const W0=RD.width(el),W=Math.min(W0,760),narrow=W<560;
      const w1=narrow?W:Math.round(W*0.55),h1=200,w2=narrow?W:W-w1-12,h2=narrow?Math.round(W*0.62):200;
      const L=36,R=18,T=8,B=26,X=v=>L+(v-1)/999*(w1-L-R),Y=v=>T+(1-v)*(h1-T-B);let s='';
      [0,0.25,0.5,0.75,1].forEach(v=>{s+='<line x1="'+L+'" y1="'+Y(v)+'" x2="'+(w1-R)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(v)+4,v,{a:'end',fs:10})});
      [1,250,500,750,1000].forEach(v=>{s+=RD.t(X(v),h1-10,v,{a:v===1000?'end':'middle',fs:10})});
      ['linear','cosine'].forEach((k,i)=>{let d='';for(let u=1;u<=1000;u+=5)d+=(u>1?'L':'M')+X(u).toFixed(1)+' '+Y(VI.abar(k,u)).toFixed(1);s+='<path d="'+d+'" fill="none" stroke="'+(i?'var(--c2)':'var(--c1)')+'" stroke-width="'+(k===sched?2.4:1.2)+'"/>'});
      s+='<line x1="'+X(t)+'" y1="'+T+'" x2="'+X(t)+'" y2="'+(h1-B)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>'+RD.t(w1-R,T+12,'ᾱ (signal left)',{a:'end',fs:10.5});
      const ab=VI.abar(sched,t),sa=Math.sqrt(ab),sn=Math.sqrt(1-ab);
      let s2='';const S=3.2,cx=w2/2,cy=h2/2,sc=Math.min(w2,h2)/(2*S);
      s2+='<rect x="0" y="0" width="'+w2+'" height="'+h2+'" fill="none" stroke="var(--line)"/>';
      for(let p=0;p<400;p++){const x=sa*D.X[2*p]+sn*EPS[2*p],y=sa*D.X[2*p+1]+sn*EPS[2*p+1];s2+='<circle cx="'+(cx+x*sc).toFixed(1)+'" cy="'+(cy-y*sc).toFixed(1)+'" r="1.8" fill="'+(D.Y[p]?'var(--c2)':'var(--c1)')+'" fill-opacity="0.8"/>'}
      el.innerHTML='<div style="display:flex;flex-wrap:wrap;gap:12px">'+RD.svg(w1,h1,s,'Schedules')+RD.svg(w2,h2,s2,'Noised points')+'</div><div class="leg"><span style="--sw:var(--c1)">curve: linear; points: upper moon</span><span style="--sw:var(--c2)">curve: cosine; points: lower moon</span></div>';
      const lam=Math.log(ab/(1-ab));
      $('vi-sch-out').innerHTML=RD.stat('ᾱ_t ('+sched+')',ab<1e-3?ab.toExponential(2):ab.toFixed(4),'signal variance left')+RD.stat('√ᾱ_t, √(1−ᾱ_t)',sa.toFixed(4)+', '+sn.toFixed(4),'x_t = first × x₀ + second × ε')+RD.stat('log-SNR λ_t',lam.toFixed(2),'log(ᾱ/(1−ᾱ))')}
    $('vi-sch-t').addEventListener('input',draw);RD.seg($('vi-sch-seg'),m=>{sched=m;draw()});draw();RD.onResize(draw);RD.onRender(draw)})();
})();
