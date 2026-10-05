// ---- Reading visuals, part A: CAVI animation, estimator variances, VAE curves, beta sweep, schedules ----
(function(){
  const $=id=>document.getElementById(id),f=(v,d)=>Number(v).toFixed(d==null?3:d);
  const N=window.VIN;
  // ===== CAVI =====
  (function(){
    const C=N.cavi,res=VI.cavi(C.data,0,1,1,1,12);const E=res.exact;
    // grid for the exact Normal-Gamma posterior over (mu, tau)
    const MU=[0.35,1.3],TA=[0,8.5];
    const lpost=(mu,tau)=>tau<=0?-1e300:(E.a-0.5)*Math.log(tau)-E.b*tau-0.5*E.lam*tau*(mu-E.mu)*(mu-E.mu);
    // steps: 0 exact only; then q(mu), q(tau) alternating for 4 rounds; last: compare
    const steps=[{k:-1}];for(let i=0;i<4;i++){steps.push({k:i,part:'mu'});steps.push({k:i,part:'tau'})}steps.push({k:3,part:'end'});
    function draw(si){
      const el=$('vi-cavi-svg'),W=Math.min(RD.width(el),620),H=Math.round(W*0.62),L=44,R=12,T=10,B=34;
      const X=m=>L+(m-MU[0])/(MU[1]-MU[0])*(W-L-R),Y=t=>T+(1-(t-TA[0])/(TA[1]-TA[0]))*(H-T-B);
      let s='';const nx=46,ny=34;let mx=-1e300;const g=[];
      for(let i=0;i<nx;i++)for(let j=0;j<ny;j++){const mu=MU[0]+(i+0.5)/nx*(MU[1]-MU[0]),ta=TA[0]+(j+0.5)/ny*(TA[1]-TA[0]);const v=lpost(mu,ta);g.push([i,j,v]);if(v>mx)mx=v}
      const cw=(W-L-R)/nx,ch=(H-T-B)/ny;
      g.forEach(([i,j,v])=>{const o=Math.exp(v-mx);if(o>0.02)s+='<rect x="'+(L+i*cw).toFixed(1)+'" y="'+(T+(ny-1-j)*ch).toFixed(1)+'" width="'+(cw+0.5).toFixed(1)+'" height="'+(ch+0.5).toFixed(1)+'" fill="var(--c4)" fill-opacity="'+(0.85*o).toFixed(3)+'"/>'});
      // axes
      s+='<line x1="'+L+'" y1="'+(H-B)+'" x2="'+(W-R)+'" y2="'+(H-B)+'" stroke="var(--mute)"/><line x1="'+L+'" y1="'+T+'" x2="'+L+'" y2="'+(H-B)+'" stroke="var(--mute)"/>';
      [0.4,0.6,0.8,1.0,1.2].forEach(m=>{s+=RD.t(X(m),H-B+14,m.toFixed(1),{a:'middle',fs:10.5})});
      [0,2,4,6,8].forEach(t=>{s+=RD.t(L-5,Y(t)+4,t,{a:'end',fs:10.5})});
      s+=RD.t((L+W-R)/2,H-4,'mean μ',{a:'middle',fs:11})+RD.t(12,T+8,'τ',{fs:12});
      const st=steps[si];let cap,cnt=[];
      if(st.k<0){cap=['The exact posterior','Shaded: the true posterior of (μ, τ) given the ten points. It leans: when the precision τ is low, μ is less certain, so the shape widens towards the bottom. Mean field will fit it with a product q(μ) q(τ), an axis-aligned shape.'];
        cnt=[['E[τ] (start)','1'],['exact Var(μ)',f(E.varMu,4)],['exact E[τ]',f(E.Et,3)]]}
      else{const h=res.h[st.k],lam=h.lamN,mu=res.muN,sdm=1/Math.sqrt(lam);
        const haveTau=st.part!=='mu'||st.k>0;const hb=st.part==='mu'?res.h[st.k-1]:h;
        // vertical band for q(mu)
        if(st.part==='mu'&&!haveTau){s+='<rect x="'+X(mu-2*sdm)+'" y="'+T+'" width="'+(X(mu+2*sdm)-X(mu-2*sdm))+'" height="'+(H-T-B)+'" fill="var(--c1)" fill-opacity="0.12" stroke="var(--c1)" stroke-dasharray="4 3"/>'}
        if(haveTau){const a=res.aN,b=hb.bN,Et=a/b,sdt=Math.sqrt(a)/b;const lamU=st.part==='mu'?lam:h.lamN,sdu=1/Math.sqrt(lamU);
          [1,2].forEach(k=>{s+='<ellipse cx="'+X(mu)+'" cy="'+Y(Et)+'" rx="'+(X(mu+k*sdu)-X(mu)).toFixed(1)+'" ry="'+(Y(Et-k*sdt)-Y(Et)).toFixed(1)+'" fill="none" stroke="var(--c1)" stroke-width="'+(k===1?2:1.2)+'"'+(k===2?' stroke-dasharray="5 3"':'')+'/>'});
          s+='<circle cx="'+X(mu)+'" cy="'+Y(Et)+'" r="3" fill="var(--c1)"/>'}
        const r=st.k+1;
        if(st.part==='mu')cap=['Round '+r+': update q(μ)','q(μ) = N('+f(mu,4)+', 1/'+f(lam,2)+'): the mean never changes (it does not depend on τ here); the precision is (λ₀ + N) E[τ] = 11 × '+f(h.EtPrev,3)+'.'+(r===1?' With E[τ] = 1 the first guess is far too wide (dashed band: ±2 sd).':'')];
        else if(st.part==='tau')cap=['Round '+r+': update q(τ)','q(τ) = Gamma(6.5, '+f(h.bN,4)+'), so E[τ] = '+f(h.Et,4)+'. A larger E[τ] makes the next q(μ) narrower, which lowers b, which raises E[τ]: the two updates feed each other until nothing moves.'];
        else cap=['Converged: right centre, too narrow','The ellipses sit on the posterior’s centre (E[τ] '+f(h.Et,4)+' against '+f(E.Et,4)+' exact) but are axis-aligned and tighter: Var(μ) '+f(1/h.lamN,4)+' against '+f(E.varMu,4)+' exact, Var(τ) '+f(res.aN/(h.bN*h.bN),3)+' against '+f(E.varT,3)+'. Mean field cannot lean, and reverse KL prefers too narrow to too wide.'];
        cnt=[['round',String(r)],['λ_N (precision of q(μ))',f(st.part==='mu'?lam:h.lamN,3)],['b_N',st.part==='mu'&&r===1?'not yet':f(hb.bN,4)],['E[τ]',st.part==='mu'&&r===1?'1 (start)':f(hb.Et,4)]]}
      el.innerHTML=RD.svg(W,H,s,'CAVI on a Normal-Gamma posterior');
      $('vi-cavi-cap').innerHTML='<div class="t">'+cap[0]+'</div><p>'+cap[1]+'</p>';
      $('vi-cavi-cnt').innerHTML=cnt.map(c=>RD.stat(c[0],c[1])).join('');
    }
    RD.anim({card:'vi-cavi-card',ctl:'vi-cavi-ctl',n:steps.length,draw,ms:2200,label:'CAVI step'});
    RD.onResize(()=>draw(0));
  })();
  // ===== estimator variances =====
  function est(){const el=$('vi-est-svg');if(!el)return;const W=Math.min(RD.width(el),640),rows=['1','10','100'];
    const ser=[['pathwise (reparameterisation)','rep_var','var(--c3)'],['score function','sf_var','var(--c2)'],['score function with baseline','sfb_var','var(--c5)']];
    const L=118,R=56,rowH=58,H=rowH*rows.length+26;const lmin=0,lmax=6;const X=v=>L+(Math.log10(v)-lmin)/(lmax-lmin)*(W-L-R);
    let s='';[1,10,100,1e3,1e4,1e5,1e6].forEach((v,i)=>{const x=X(v);s+='<line x1="'+x+'" y1="4" x2="'+x+'" y2="'+(H-20)+'" stroke="var(--line)"/>'+RD.t(x,H-6,['1','10','100','1k','10k','100k','1M'][i],{a:'middle',fs:10})});
    rows.forEach((d,ri)=>{const y0=6+ri*rowH;s+=RD.t(4,y0+24,'d = '+d,{fs:12,w:600});
      ser.forEach((se,k)=>{const v=N.est[d][se[1]],y=y0+k*16;s+='<rect x="'+L+'" y="'+y+'" width="'+Math.max(1,X(v)-L).toFixed(1)+'" height="12" fill="'+se[2]+'" rx="2"/>'+RD.t(X(v)+4,y+10,v>=1000?Math.round(v).toLocaleString('en-US'):v.toFixed(v<10?2:1),{fs:10.5})})});
    el.innerHTML=RD.svg(W,H,s,'Estimator variance by dimension')+'<div class="leg">'+ser.map(se=>'<span style="--sw:'+se[2]+'">'+se[0]+'</span>').join('')+'</div>'}
  est();RD.onResize(est);
  // ===== VAE training curves =====
  function curves(){const el=$('vi-curve-svg');if(!el)return;const V=window.VIVAE,c=V.curve,W=Math.min(RD.width(el),680),H=230,L=44,R=40,T=10,B=30;
    const xmax=c[c.length-1][0],X=v=>L+v/xmax*(W-L-R),Y1=v=>T+(1-(v-130)/(230-130))*(H-T-B),Y2=v=>T+(1-(v-4)/(8-4))*(H-T-B);
    let s='';[130,150,170,190,210,230].forEach(v=>{s+='<line x1="'+L+'" y1="'+Y1(v)+'" x2="'+(W-R)+'" y2="'+Y1(v)+'" stroke="var(--line)"/>'+RD.t(L-4,Y1(v)+4,v,{a:'end',fs:10,fill:'var(--c1)'})});
    [4,5,6,7,8].forEach(v=>{s+=RD.t(W-R+4,Y2(v)+4,v,{fs:10,fill:'var(--c2)'})});
    for(let e=0;e<=30;e+=5){const x=X(e*V.spe);s+=RD.t(x,H-12,e===0?'0':String(e),{a:'middle',fs:10})}
    s+=RD.t((L+W-R)/2,H-1,'epoch',{a:'middle',fs:10.5});
    const pl=(k,Y)=>c.map((r,i)=>(i?'L':'M')+X(r[0]).toFixed(1)+' '+Y(r[k]).toFixed(1)).join('');
    s+='<path d="'+pl(1,Y1)+'" fill="none" stroke="var(--c1)" stroke-width="1.8"/><path d="'+pl(2,Y2)+'" fill="none" stroke="var(--c2)" stroke-width="1.8"/>';
    el.innerHTML=RD.svg(W,H,s,'VAE reconstruction and KL over training')+'<div class="leg"><span style="--sw:var(--c1)">reconstruction (left axis, nats)</span><span style="--sw:var(--c2)">KL to the prior (right axis, nats)</span></div>'}
  curves();RD.onResize(curves);
  // ===== beta sweep =====
  (function(){const el=$('vi-beta-out');if(!el)return;const B=window.VIVAE.beta;
    let h='<div class="tw"><table class="mini"><tr><th>β</th><th>rec.</th><th>KL</th><th>active</th><th>log p</th><th>KL per dim.</th></tr>';
    B.forEach(b=>{const kd=b.kd.slice().sort((a,c)=>c-a);const mx=2.7;
      const bars='<svg width="112" height="22" viewBox="0 0 112 22">'+kd.map((v,i)=>'<rect x="'+(i*7).toFixed(1)+'" y="'+(21-Math.max(0.6,v/mx*20)).toFixed(1)+'" width="5.6" height="'+Math.max(0.6,v/mx*20).toFixed(1)+'" fill="'+(v<0.01?'var(--dim)':'var(--c4)')+'"/>').join('')+'</svg>';
      h+='<tr><td class="num">'+b.beta+'</td><td class="num">'+b.rec.toFixed(1)+'</td><td class="num">'+b.kl.toFixed(1)+'</td><td class="num">'+b.active+'</td><td class="num">'+b.iwae1000.toFixed(1)+'</td><td>'+bars+'</td></tr>'});
    el.innerHTML=h+'</table></div><p class="small mute">Grey bars: dimensions with KL below 0.01 nats (unused). The best log-likelihood is near β = 1, the only value that trains on a bound of it.</p>'})();
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
