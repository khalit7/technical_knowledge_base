// ---- Reading s6: bootstrap world against the real world (data: SD.boot from sims.py) ----
(function(){
  const card=document.getElementById('rd-bs-card');if(!card)return;let key='tiny30';
  function draw(){
    const b=SD.boot[key],el=document.getElementById('rd-bs-svg'),sc=SD.boot.B/SD.boot.R;
    el.innerHTML=ST.hist({w:RD.width(el),h:200,lo:b.lo,hi:b.hi,cnt:b.hist_boot,cnt2:b.hist_true.map(c=>c*sc),fill:'var(--c1)',stroke2:'var(--c2)',
      vlines:[{x:b.mu,label:'true mean '+b.mu.toFixed(3)},{x:b.mean,label:'this sample '+b.mean.toFixed(3),c:'var(--c1)',dy:12}],xlab:'mean of n = '+b.n,label:'Bootstrap distribution against the true sampling distribution'})+
      '<div class="leg"><span style="--sw:var(--c1)">bootstrap: '+SD.boot.B+' resamples of one sample</span><span style="--sw:var(--c2)">truth: '+SD.boot.R.toLocaleString('en')+' fresh samples (outline)</span></div>';
    const f=a=>'('+a[0].toFixed(3)+', '+a[1].toFixed(3)+')',hit=a=>a[0]<=b.mu&&b.mu<=a[1]?'catches':'misses';
    document.getElementById('rd-bs-cnt').innerHTML=RD.stat('bootstrap SE',b.boot_sd.toFixed(3),'formula s/√n: '+b.se_formula.toFixed(3))+RD.stat('true SE',b.true_sd.toFixed(3),'from fresh samples')+
      RD.stat('t-interval',f(b.ci.t),hit(b.ci.t)+' the truth')+RD.stat('percentile',f(b.ci.pct),hit(b.ci.pct)+' the truth')+RD.stat('BCa',f(b.ci.bca),hit(b.ci.bca)+' the truth');
  }
  RD.seg(document.getElementById('rd-bs-seg'),m=>{key=m;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
})();
// ---- Reading s10: bounds against the exact tail (exact binomial tail from sims.py; bounds computed here) ----
ST.bounds=n=>{const t=0.05,se=Math.sqrt(0.25/n);return {cheb:0.25/(n*t*t),hoeff:2*Math.exp(-2*n*t*t),clt:2*(1-ST.Phi(t/se))}};
ST.Phi=x=>{// Abramowitz and Stegun 7.1.26 erf, |error| < 1.5e-7
  const z=Math.abs(x)/Math.SQRT2,tt=1/(1+0.3275911*z),y=1-(((((1.061405429*tt-1.453152027)*tt)+1.421413741)*tt-0.284496736)*tt+0.254829592)*tt*Math.exp(-z*z);return x>=0?0.5*(1+y):0.5*(1-y)};
(function(){
  const card=document.getElementById('rd-conc-card');if(!card)return;const C=SD.conc,sl=document.getElementById('rd-conc-n');
  function draw(){
    const i=+sl.value,n=C.n[i],el=document.getElementById('rd-conc-svg'),W=RD.width(el),H=210,L=40,R=12,T=12,B=30,pw=W-L-R,ph=H-T-B;
    document.getElementById('rd-conc-nv').textContent=n;
    const lx=v=>L+(Math.log(v)-Math.log(10))/(Math.log(2000)-Math.log(10))*pw,ly=v=>T+(-Math.log10(Math.max(v,1e-4)))/4*ph;
    let s='';[1,0.1,0.01,0.001,0.0001].forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ly(v)+'" y2="'+ly(v)+'" style="stroke:var(--line)"/>'+RD.t(L-4,ly(v)+3,String(v),{fs:9.5,a:'end',fill:'var(--mute)'})});
    const ser=[['Chebyshev','var(--c4)',n=>Math.min(1,ST.bounds(n).cheb)],['Hoeffding','var(--c2)',n=>Math.min(1,ST.bounds(n).hoeff)],['CLT approx.','var(--c1)',n=>ST.bounds(n).clt]];
    ser.forEach(([nm,c,f])=>{let d='';for(let j=0;j<=80;j++){const nn=10*Math.pow(200,j/80);d+=(j?'L':'M')+lx(nn).toFixed(1)+' '+ly(f(nn)).toFixed(1)}s+='<path d="'+d+'" style="fill:none;stroke:'+c+';stroke-width:1.8"/>'});
    C.n.forEach((nn,j)=>{s+='<circle cx="'+lx(nn).toFixed(1)+'" cy="'+ly(C.exact[j]).toFixed(1)+'" r="2.6" style="fill:var(--ink)"/>'});
    s+='<line x1="'+lx(n)+'" x2="'+lx(n)+'" y1="'+T+'" y2="'+(T+ph)+'" style="stroke:var(--mute);stroke-dasharray:3 3"/>';
    [10,100,1000].forEach(v=>{s+=RD.t(lx(v),T+ph+13,String(v),{fs:10,a:'middle',fill:'var(--mute)'})});
    s+=RD.t(L+pw/2,H-3,W<520?'n (log); y: P(off by 5 points or more), log':'examples n (log scale); y: chance of being off by 5 points or more (log)',{fs:10,a:'middle',fill:'var(--mute)'});
    el.innerHTML=RD.svg(W,H,s,'Tail bounds against the exact tail')+'<div class="leg"><span style="--sw:var(--c4)">Chebyshev</span><span style="--sw:var(--c2)">Hoeffding</span><span style="--sw:var(--c1)">CLT approximation</span><span style="--sw:var(--ink)">exact (binomial, dots)</span></div>';
    const b=ST.bounds(n);
    document.getElementById('rd-conc-cnt').innerHTML=RD.stat('exact',C.exact[i].toPrecision(3),'accuracy 0.5, n = '+n)+RD.stat('CLT approx.',b.clt.toPrecision(3),'an approximation')+RD.stat('Hoeffding bound',Math.min(1,b.hoeff).toPrecision(3),'a guarantee')+RD.stat('Chebyshev bound',Math.min(1,b.cheb).toPrecision(3),'a guarantee');
  }
  sl.addEventListener('input',draw);RD.onRender(draw);RD.onResize(draw);draw();
})();
// ---- Mistakes: peeking table (SD.peek from sims.py) ----
(function(){const t=document.getElementById('rd-peek-tab');if(!t)return;const P=SD.peek.rate;
  t.innerHTML='<tr><th>Looks, equally spaced up to n = 100</th>'+Object.keys(P).map(k=>'<th class="num">'+k+'</th>').join('')+'</tr><tr><td>False-positive rate</td>'+Object.keys(P).map(k=>'<td class="num">'+ST.pct(P[k])+'</td>').join('')+'</tr>';})();
