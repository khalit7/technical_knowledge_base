// ---- Distribution explorer tab ----
(function(){
  const $=id=>document.getElementById(id);if(!$('dx-seg'))return;
  const f=PM.f,LG=PM.lgamma;
  const sig=t=>1/(1+Math.exp(-t)),logit=p=>Math.log(p/(1-p));
  const lse=a=>{const m=Math.max(...a);return m+Math.log(a.reduce((s,v)=>s+Math.exp(v-m),0))};
  const lfact=k=>LG(k+1),lchoose=(n,k)=>lfact(n)-lfact(k)-lfact(n-k);
  function gamma(r,k){if(k<1){return gamma(r,k+1)*Math.pow(r(),1/k)}const d=k-1/3,c=1/Math.sqrt(9*d);
    for(;;){let x,v;do{x=PM.gauss(r);v=1+c*x}while(v<=0);v=v*v*v;const u=r();if(u<1-0.0331*x*x*x*x)return d*v;if(Math.log(u)<0.5*x*x+d*(1-v+Math.log(v)))return d*v}}
  const W3=['cat','dog','sat'];
  // each distribution: params, pmf/pdf, cdf, mean, var, sample, loss
  const D={
    bern:{name:'Bernoulli',disc:true,ps:[['p','p',0.01,0.99,0.01,0.8]],
      sup:P=>[0,1],pm:(P,x)=>x?P.p:1-P.p,mean:P=>P.p,vr:P=>P.p*(1-P.p),smp:(P,r)=>r()<P.p?1:0,
      loss:{ys:[0,1,1,1],lab:'observed y',eta:P=>logit(P.p),etaName:'logit z',rng:[-6,6],l:(e,y)=>Math.log1p(Math.exp(e))-y*e,g:(e,y)=>sig(e)-y,set:(P,e)=>{P.p=sig(e)}}},
    cat:{name:'Categorical (the tiny model)',disc:true,ps:[['z1','z (cat)',-3,4,0.1,2],['z2','z (dog)',-3,4,0.1,1],['z3','z (sat)',-3,4,0.1,0]],
      prob:P=>{const z=[P.z1,P.z2,P.z3],L=lse(z);return z.map(v=>Math.exp(v-L))},
      sup:P=>[0,1,2],pm:(P,x)=>D.cat.prob(P)[x],xl:x=>W3[x],mean:P=>D.cat.prob(P),vr:P=>D.cat.prob(P).map(v=>v*(1-v)),
      smp:(P,r)=>{const p=D.cat.prob(P),u=r();return u<p[0]?0:u<p[0]+p[1]?1:2},
      loss:{ys:[0,2,1,2],lab:'right word',ylab:y=>W3[y],eta:P=>P['z'+(KV+1)],etaName:'score being varied',rng:[-4,6],
        l:(e,y,P)=>{const z=[P.z1,P.z2,P.z3];z[KV]=e;return -z[y]+lse(z)},g:(e,y,P)=>{const z=[P.z1,P.z2,P.z3];z[KV]=e;const L=lse(z);return Math.exp(z[KV]-L)-(KV===y?1:0)},set:(P,e)=>{P['z'+(KV+1)]=e}}},
    binom:{name:'Binomial',disc:true,ps:[['n','n',1,30,1,10],['p','p',0.01,0.99,0.01,0.7]],
      sup:P=>Array.from({length:P.n+1},(_,i)=>i),pm:(P,k)=>Math.exp(lchoose(P.n,k)+k*Math.log(P.p)+(P.n-k)*Math.log(1-P.p)),
      mean:P=>P.n*P.p,vr:P=>P.n*P.p*(1-P.p),smp:(P,r)=>{let c=0;for(let i=0;i<P.n;i++)if(r()<P.p)c++;return c},
      loss:{ys:[0,30,1,7],lab:'observed k (successes)',clampY:P=>P.n,eta:P=>logit(P.p),etaName:'logit z',rng:[-5,5],
        l:(e,k,P)=>P.n*Math.log1p(Math.exp(e))-k*e-lchoose(P.n,Math.min(k,P.n)),g:(e,k,P)=>P.n*sig(e)-k,set:(P,e)=>{P.p=sig(e)}}},
    pois:{name:'Poisson',disc:true,ps:[['lam','λ (rate)',0.2,15,0.1,2]],
      sup:P=>Array.from({length:Math.max(8,Math.ceil(P.lam+4*Math.sqrt(P.lam))+1)},(_,i)=>i),pm:(P,k)=>Math.exp(k*Math.log(P.lam)-P.lam-lfact(k)),
      mean:P=>P.lam,vr:P=>P.lam,smp:(P,r)=>{const L=Math.exp(-P.lam);let k=0,p=1;do{k++;p*=r()}while(p>L);return k-1},
      loss:{ys:[0,20,1,3],lab:'observed count y',eta:P=>Math.log(P.lam),etaName:'log-rate η = ln λ',rng:[-2,3.5],l:(e,y)=>Math.exp(e)-y*e+lfact(y),g:(e,y)=>Math.exp(e)-y,set:(P,e)=>{P.lam=Math.exp(e)}}},
    gauss:{name:'Gaussian',disc:false,ps:[['mu','μ',-3,6,0.1,2.5],['s','σ',0.2,3,0.1,1]],
      lim:P=>[P.mu-4*P.s,P.mu+4*P.s],pd:(P,x)=>Math.exp(-((x-P.mu)**2)/(2*P.s*P.s))/Math.sqrt(2*Math.PI*P.s*P.s),
      cdf:(P,x)=>0.5*(1+erf((x-P.mu)/(P.s*Math.SQRT2))),mean:P=>P.mu,vr:P=>P.s*P.s,smp:(P,r)=>P.mu+P.s*PM.gauss(r),
      loss:{ys:[-3,8,0.1,3],lab:'observed y',eta:P=>P.mu,etaName:'mean μ',rng:[-3,8],l:(e,y,P)=>(y-e)**2/(2*P.s*P.s)+0.5*Math.log(2*Math.PI*P.s*P.s),g:(e,y,P)=>(e-y)/(P.s*P.s),set:(P,e)=>{P.mu=e}}},
    lap:{name:'Laplace',disc:false,ps:[['mu','μ',-3,6,0.1,2.5],['b','b',0.2,3,0.1,1]],
      lim:P=>[P.mu-7*P.b,P.mu+7*P.b],pd:(P,x)=>Math.exp(-Math.abs(x-P.mu)/P.b)/(2*P.b),
      cdf:(P,x)=>x<P.mu?0.5*Math.exp((x-P.mu)/P.b):1-0.5*Math.exp(-(x-P.mu)/P.b),mean:P=>P.mu,vr:P=>2*P.b*P.b,
      smp:(P,r)=>{const u=r()-0.5;return P.mu-P.b*Math.sign(u)*Math.log(1-2*Math.abs(u))},
      loss:{ys:[-3,8,0.1,3],lab:'observed y',eta:P=>P.mu,etaName:'location μ',rng:[-3,8],l:(e,y,P)=>Math.abs(y-e)/P.b+Math.log(2*P.b),g:(e,y,P)=>Math.sign(e-y)/P.b,set:(P,e)=>{P.mu=e}}},
    expo:{name:'Exponential',disc:false,ps:[['lam','λ (rate)',0.2,5,0.1,2]],
      lim:P=>[0,6/P.lam],pd:(P,x)=>x<0?0:P.lam*Math.exp(-P.lam*x),cdf:(P,x)=>x<0?0:1-Math.exp(-P.lam*x),mean:P=>1/P.lam,vr:P=>1/(P.lam*P.lam),
      smp:(P,r)=>-Math.log(1-r())/P.lam,
      loss:{ys:[0.05,5,0.05,0.5],lab:'observed waiting time y',eta:P=>Math.log(P.lam),etaName:'log-rate η = ln λ',rng:[-2,2.5],l:(e,y)=>-e+Math.exp(e)*y,g:(e,y)=>Math.exp(e)*y-1,set:(P,e)=>{P.lam=Math.exp(e)}}},
    beta:{name:'Beta',disc:false,ps:[['a','a',0.5,20,0.5,2],['b','b',0.5,20,0.5,2]],
      lim:P=>[0,1],pd:(P,x)=>PM.betaPdf(x,P.a,P.b),cdf:(P,x)=>PM.betaCdf(x,P.a,P.b,400),mean:P=>P.a/(P.a+P.b),vr:P=>P.a*P.b/((P.a+P.b)**2*(P.a+P.b+1)),
      smp:(P,r)=>{const x=gamma(r,P.a),y=gamma(r,P.b);return x/(x+y)},
      loss:{ys:[0.02,0.98,0.01,0.7],lab:'observed probability y',eta:P=>P.a,etaName:'a (b fixed)',rng:[0.3,20],l:(e,y,P)=>-(e-1)*Math.log(y)-(P.b-1)*Math.log(1-y)+PM.lbeta(e,P.b),
        g:(e,y,P)=>{const h=1e-4,l=D.beta.loss.l;return (l(e+h,y,P)-l(e-h,y,P))/(2*h)},set:(P,e)=>{P.a=Math.max(0.5,Math.round(e*2)/2)}}},
    dir:{name:'Dirichlet',disc:false,simplex:true,ps:[['a1','α (cat)',0.2,10,0.1,2],['a2','α (dog)',0.2,10,0.1,1],['a3','α (sat)',0.2,10,0.1,1]],
      mean:P=>{const s=P.a1+P.a2+P.a3;return [P.a1/s,P.a2/s,P.a3/s]},vr:P=>{const s=P.a1+P.a2+P.a3;return [P.a1,P.a2,P.a3].map(a=>a*(s-a)/(s*s*(s+1)))},
      smp:(P,r)=>{const g=[gamma(r,P.a1),gamma(r,P.a2),gamma(r,P.a3)],s=g[0]+g[1]+g[2];return g.map(v=>v/s)}}
  };
  function erf(x){// Chebyshev fit for erfc (Numerical Recipes, erfcc), fractional error below 1.2e-7
    const t=1/(1+0.5*Math.abs(x));const y=1-t*Math.exp(-x*x-1.26551223+t*(1.00002368+t*(0.37409196+t*(0.09678418+t*(-0.18628806+t*(0.27886807+t*(-1.13520398+t*(1.48851587+t*(-0.82215223+t*0.17087277)))))))));return x>=0?y:-y}
  let cur='bern',KV=2,P={},Y=0,samples=[],rng=PM.rng(11);
  const seg=$('dx-seg');seg.innerHTML=Object.keys(D).map(k=>'<button data-m="'+k+'"'+(k===cur?' class="on"':'')+'>'+D[k].name+'</button>').join('');
  function setup(k){cur=k;const d=D[k];P={};d.ps.forEach(q=>P[q[0]]=q[5]);rng=PM.rng(11);samples=[];
    $('dx-ctl').innerHTML=d.ps.map(q=>'<label>'+q[1]+': <b id="dx-v-'+q[0]+'"></b><input type="range" id="dx-p-'+q[0]+'" min="'+q[2]+'" max="'+q[3]+'" step="'+q[4]+'" value="'+q[5]+'" aria-label="'+q[1]+'"></label>').join('');
    d.ps.forEach(q=>$('dx-p-'+q[0]).addEventListener('input',e=>{P[q[0]]=+e.target.value;samples=resample(Math.max(2000,samples.length));draw()}));
    document.querySelectorAll('#dx-fx [data-d],#dx-lfx [data-d]').forEach(e=>e.hidden=e.dataset.d!==k);
    const L=d.loss;
    if(L){Y=L.ys[3];$('dx-lctl').innerHTML='<label>'+L.lab+': <b id="dx-yv"></b><input type="range" id="dx-y" min="'+L.ys[0]+'" max="'+L.ys[1]+'" step="'+L.ys[2]+'" value="'+Y+'" aria-label="'+L.lab+'"></label>'+
      (k==='cat'?'<label>Score to vary: <select id="dx-kv"><option value="0">cat</option><option value="1">dog</option><option value="2" selected>sat</option></select></label>':'');
      $('dx-y').addEventListener('input',e=>{Y=+e.target.value;draw()});if(k==='cat'){KV=2;$('dx-kv').addEventListener('change',e=>{KV=+e.target.value;draw()})}}
    else $('dx-lctl').innerHTML='';
    $('dx-h1').textContent=d.simplex?'Samples on the probability triangle':d.disc?'PMF (bars), samples (outlines) and CDF (line)':'PDF (curve), samples (histogram) and CDF (dashed)';
    samples=resample(2000);draw()}
  function resample(n){rng=PM.rng(11);const s=[];for(let i=0;i<n;i++)s.push(D[cur].smp(P,rng));return s}
  $('dx-draw').addEventListener('click',()=>{for(let i=0;i<2000;i++)samples.push(D[cur].smp(P,rng));draw()});
  $('dx-reset').addEventListener('click',()=>{samples=resample(2000);draw()});
  RD.seg(seg,setup);
  function draw(){
    const d=D[cur];d.ps.forEach(q=>{const v=P[q[0]];$('dx-v-'+q[0]).textContent=q[4]<1?(+v).toFixed(q[4]<0.1?2:1):v;$('dx-p-'+q[0]).value=v});
    const box=$('dx-svg1'),W=Math.min(RD.width(box),860),H=230,L=40,R=W-40,T=12,B=H-30;let g='';
    const n=samples.length;$('dx-n').textContent=n.toLocaleString('en-US')+' samples drawn';
    let sm,sv;
    if(d.simplex){
      const cx=W/2,sz=Math.min(H-30,(W-40)/1.16),A=[cx,T],Bp=[cx-sz*0.577,T+sz],C=[cx+sz*0.577,T+sz];
      const pt=x=>[x[0]*A[0]+x[1]*Bp[0]+x[2]*C[0],x[0]*A[1]+x[1]*Bp[1]+x[2]*C[1]];
      g+='<path d="M'+A+'L'+Bp+'L'+C+'Z" fill="none" stroke="var(--mute)"/>'+RD.t(A[0],A[1]+12,'cat',{a:'middle',fill:'var(--mute)'})+RD.t(Bp[0]-4,Bp[1],'dog',{a:'end',fill:'var(--mute)'})+RD.t(C[0]+4,C[1],'sat',{fill:'var(--mute)'});
      samples.slice(0,3000).forEach(x=>{const q=pt(x);g+='<circle cx="'+q[0].toFixed(1)+'" cy="'+q[1].toFixed(1)+'" r="1.6" fill="var(--c1)" fill-opacity=".45"/>'});
      const m=d.mean(P),q=pt(m);g+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="5" fill="var(--c2)"/>';
      $('dx-leg1').innerHTML='<span style="--sw:var(--c1)">samples (each a probability vector)</span><span style="--sw:var(--c2)">mean α/α₀</span>';
      sm=[0,1,2].map(i=>samples.reduce((s,x)=>s+x[i],0)/n);sv=[0,1,2].map(i=>samples.reduce((s,x)=>s+(x[i]-sm[i])**2,0)/n);
      $('dx-stats').innerHTML=RD.stat('Mean (formula)',m.map(v=>f(v,3)).join(', '),'α / α₀')+RD.stat('Mean (samples)',sm.map(v=>f(v,3)).join(', '),'')+
        RD.stat('Variance (formula)',d.vr(P).map(v=>f(v,4)).join(', '),'')+RD.stat('Variance (samples)',sv.map(v=>f(v,4)).join(', '),'');
      box.dataset.mean=m.map(v=>f(v,3)).join(',');
    }else{
      sm=samples.reduce((a,b)=>a+b,0)/n;sv=samples.reduce((a,b)=>a+(b-sm)**2,0)/n;
      if(d.disc){const sup=d.sup(P),K=sup.length,bw=(R-L)/K;const pm=sup.map(x=>d.pm(P,x));const fr=sup.map(x=>samples.filter(s=>s===x).length/n);
        const mx=Math.max(...pm,...fr)*1.1;const Yv=v=>B-(B-T)*v/mx;
        sup.forEach((x,i)=>{const x0=L+i*bw;g+='<rect x="'+(x0+bw*0.15).toFixed(1)+'" y="'+Yv(pm[i]).toFixed(1)+'" width="'+(bw*0.7).toFixed(1)+'" height="'+(B-Yv(pm[i])).toFixed(1)+'" fill="var(--c1)" fill-opacity=".75"/>'+
          '<rect x="'+(x0+bw*0.1).toFixed(1)+'" y="'+Yv(fr[i]).toFixed(1)+'" width="'+(bw*0.8).toFixed(1)+'" height="'+(B-Yv(fr[i])).toFixed(1)+'" fill="none" stroke="var(--c2)" stroke-width="1.5"/>';
          if(K<=16||i%Math.ceil(K/16)===0)g+=RD.t(x0+bw/2,B+14,d.xl?d.xl(x):x,{a:'middle',fill:'var(--mute)',fs:10})});
        let c=0,path='';sup.forEach((x,i)=>{const y0=B-(B-T)*c;c+=pm[i];const y1=B-(B-T)*c;path+=(i?'L':'M')+(L+i*bw).toFixed(1)+' '+y0.toFixed(1)+'L'+(L+i*bw+bw/2).toFixed(1)+' '+y0.toFixed(1)+'L'+(L+i*bw+bw/2).toFixed(1)+' '+y1.toFixed(1)+'L'+(L+(i+1)*bw).toFixed(1)+' '+y1.toFixed(1)});
        g+='<path d="'+path+'" fill="none" stroke="var(--c3)" stroke-width="1.6"/>';
        g+=RD.t(L-4,Yv(mx/1.1)+4,f(mx/1.1,2),{a:'end',fill:'var(--mute)',fs:10})+RD.t(R+4,T+8,'CDF 1',{fill:'var(--c3)',fs:10});
        $('dx-leg1').innerHTML='<span style="--sw:var(--c1)">PMF (formula)</span><span style="--sw:var(--c2)">sample frequency</span><span style="--sw:var(--c3)">CDF (right, 0 to 1)</span>';
        box.dataset.pm=pm.map(v=>f(v,3)).join(',');
      }else{const lim=d.lim(P),X=x=>L+(R-L)*(x-lim[0])/(lim[1]-lim[0]);const NB=40,bw=(lim[1]-lim[0])/NB,h=new Array(NB).fill(0);
        samples.forEach(s=>{const i=Math.floor((s-lim[0])/bw);if(i>=0&&i<NB)h[i]++});const hd=h.map(c=>c/(n*bw));
        const xs=[];for(let i=0;i<=200;i++)xs.push(lim[0]+(lim[1]-lim[0])*i/200);let ys=xs.map(x=>d.pd(P,Math.min(Math.max(x,1e-6),cur==='beta'?1-1e-6:x)));ys=ys.map(v=>isFinite(v)?v:0);
        const mx=Math.max(...ys,...hd)*1.1||1,Yv=v=>B-(B-T)*Math.min(v,mx)/mx;
        hd.forEach((v,i)=>{g+='<rect x="'+X(lim[0]+i*bw).toFixed(1)+'" y="'+Yv(v).toFixed(1)+'" width="'+Math.max(0.5,(X(lim[0]+bw)-X(lim[0])-1)).toFixed(1)+'" height="'+(B-Yv(v)).toFixed(1)+'" fill="var(--c2)" fill-opacity=".35"/>'});
        g+='<path d="'+xs.map((x,i)=>(i?'L':'M')+X(x).toFixed(1)+' '+Yv(ys[i]).toFixed(1)).join('')+'" fill="none" stroke="var(--c1)" stroke-width="2.2"/>';
        g+='<path d="'+xs.map((x,i)=>(i?'L':'M')+X(x).toFixed(1)+' '+(B-(B-T)*d.cdf(P,x)).toFixed(1)).join('')+'" fill="none" stroke="var(--c3)" stroke-width="1.4" stroke-dasharray="5 3"/>';
        for(let i=0;i<=4;i++){const v=lim[0]+(lim[1]-lim[0])*i/4;g+=RD.t(X(v),B+14,f(v,Math.abs(lim[1]-lim[0])<4?2:1),{a:'middle',fill:'var(--mute)',fs:10})}
        g+=RD.t(L-4,T+8,f(mx/1.1,2),{a:'end',fill:'var(--mute)',fs:10})+RD.t(R+4,T+8,'CDF 1',{fill:'var(--c3)',fs:10});
        $('dx-leg1').innerHTML='<span style="--sw:var(--c1)">density (formula)</span><span style="--sw:var(--c2)">histogram of samples (as a density)</span><span style="--sw:var(--c3)">CDF (right, 0 to 1)</span>';
        box.dataset.peak=f(Math.max(...ys),3);
      }
      g+='<line x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'" stroke="var(--mute)"/>';
      const m=d.mean(P),v=d.vr(P);
      const vec=Array.isArray(m);
      $('dx-stats').innerHTML=vec?RD.stat('Mean (formula)',m.map(x=>f(x,3)).join(', '),'p: the one-hot mean')+RD.stat('Sample share of each word',[0,1,2].map(i=>f(samples.filter(s=>s===i).length/n,3)).join(', '),'')+RD.stat('Variances (formula)',v.map(x=>f(x,3)).join(', '),'pᵢ(1 − pᵢ), the diagonal of diag(p) − ppᵀ'):
        RD.stat('Mean (formula)',f(m,4),'')+RD.stat('Mean (samples)',f(sm,4),'off by '+f(Math.abs(sm-m)/Math.sqrt(v/n),2)+' standard errors')+RD.stat('Variance (formula)',f(v,4),'')+RD.stat('Variance (samples)',f(sv,4),'');
      box.dataset.mean=vec?m.map(x=>f(x,3)).join(','):f(m,4);box.dataset.var=vec?v.map(x=>f(x,3)).join(','):f(v,4);
    }
    box.innerHTML=RD.svg(W,H,g,d.name+' distribution');
    drawLoss();
  }
  function drawLoss(){
    const d=D[cur],Lo=d.loss,box=$('dx-svg2');
    if(!Lo){box.innerHTML='';$('dx-lstats').innerHTML='';box.parentNode.querySelector('.leg').hidden=true;return}
    box.parentNode.querySelector('.leg').hidden=false;
    if(Lo.clampY){const yEl=$('dx-y');yEl.max=Lo.clampY(P);if(Y>P.n)Y=P.n;yEl.value=Y}
    $('dx-yv').textContent=Lo.ylab?Lo.ylab(Y):(Lo.ys[2]<1?(+Y).toFixed(2):Y);
    const W=Math.min(RD.width(box),860),H=220,L=44,R=W-44,T=12,B=H-30;const r=Lo.rng,X=e=>L+(R-L)*(e-r[0])/(r[1]-r[0]);
    const es=[];for(let i=0;i<=240;i++)es.push(r[0]+(r[1]-r[0])*i/240);
    const ls=es.map(e=>Lo.l(e,Y,P)),gs=es.map(e=>Lo.g(e,Y,P));
    const lmin=Math.min(...ls),lmax=Math.max(...ls),gmax=Math.max(...gs.map(Math.abs))||1;
    const Yl=v=>B-(B-T)*(v-lmin)/((lmax-lmin)||1),Yg=v=>(T+B)/2-(B-T)/2*v/gmax;
    let g='<line x1="'+L+'" y1="'+B+'" x2="'+R+'" y2="'+B+'" stroke="var(--mute)"/><line x1="'+L+'" y1="'+Yg(0)+'" x2="'+R+'" y2="'+Yg(0)+'" stroke="var(--line)" stroke-dasharray="2 3"/>';
    g+='<path d="'+es.map((e,i)=>(i?'L':'M')+X(e).toFixed(1)+' '+Yl(ls[i]).toFixed(1)).join('')+'" fill="none" stroke="var(--c1)" stroke-width="2.2"/>';
    g+='<path d="'+es.map((e,i)=>(i?'L':'M')+X(e).toFixed(1)+' '+Yg(gs[i]).toFixed(1)).join('')+'" fill="none" stroke="var(--c2)" stroke-width="1.6"/>';
    for(let i=0;i<=4;i++){const v=r[0]+(r[1]-r[0])*i/4;g+=RD.t(X(v),B+14,f(v,1),{a:'middle',fill:'var(--mute)',fs:10})}
    g+=RD.t(L-4,Yl(lmax)+8,f(lmax,1),{a:'end',fill:'var(--c1)',fs:10})+RD.t(L-4,B-2,f(lmin,1),{a:'end',fill:'var(--c1)',fs:10})+RD.t(R+4,Yg(gmax)+8,'+'+f(gmax,1),{fill:'var(--c2)',fs:10})+RD.t(R+4,Yg(-gmax),'−'+f(gmax,1),{fill:'var(--c2)',fs:10});
    const e0=Lo.eta(P);const l0=Lo.l(e0,Y,P),g0=Lo.g(e0,Y,P),h=1e-5,num=(Lo.l(e0+h,Y,P)-Lo.l(e0-h,Y,P))/(2*h);
    if(e0>=r[0]&&e0<=r[1])g+='<line x1="'+X(e0).toFixed(1)+'" y1="'+T+'" x2="'+X(e0).toFixed(1)+'" y2="'+B+'" stroke="var(--ink)" stroke-width="1.2"/><circle cx="'+X(e0).toFixed(1)+'" cy="'+Yl(l0).toFixed(1)+'" r="4" fill="var(--c1)"/>';
    g+=RD.t((L+R)/2,H-2,'network output: '+Lo.etaName,{a:'middle',fill:'var(--mute)',fs:11});
    box.innerHTML=RD.svg(W,H,g,'Loss and gradient against the network output');
    // argmin of the loss on the grid
    const im=ls.indexOf(lmin);
    $('dx-lstats').innerHTML=RD.stat('Output now',f(e0,3),Lo.etaName)+RD.stat('Loss ℓ',f(l0,3),'at the current output')+RD.stat('Gradient (formula)',f(g0,3),'')+RD.stat('Gradient (numerical)',f(num,3),'central difference, h = 1e-5')+RD.stat('Loss is lowest at',f(es[im],2),'on this grid');
    box.dataset.loss=f(l0,3);box.dataset.grad=f(g0,3);box.dataset.num=f(num,3);
  }
  function first(){setup(cur)}
  first();
  (window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-dist']=window.TAB_RENDER['t-dist']||[]).push(()=>draw());
  addEventListener('resize',()=>{const t=$('t-dist');if(t&&!t.hidden)draw()});
  window.PM.dist={D,setup,get P(){return P}};
})();
