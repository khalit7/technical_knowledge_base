// ---- Small-n intervals tab: exact coverage of four binomial intervals (no simulation) ----
(function(){
  const S=window.EST,host=document.getElementById('cv-svg');if(!host)return;
  const M=[['wald','CLT (Wald)','var(--c2)'],['wilson','Wilson score','var(--c1)'],['cp','Clopper-Pearson','var(--c3)'],['bayes','Bayes, uniform prior','var(--c4)']];
  const on={wald:1,wilson:1,cp:1,bayes:1};
  const lg=document.getElementById('cv-lg');
  lg.innerHTML=M.map(m=>'<label><input type="checkbox" data-m="'+m[0]+'" checked><i style="background:'+m[2]+'"></i>'+m[1]+'</label>').join('');
  lg.addEventListener('change',e=>{const c=e.target.closest('input');if(!c)return;on[c.dataset.m]=c.checked?1:0;draw()});
  const nI=document.getElementById('cv-n'),cI=document.getElementById('cv-c');
  const cache={};
  function ints(n,c){const key=n+'|'+c;if(cache[key])return cache[key];const o={};M.forEach(m=>{o[m[0]]=[];for(let k=0;k<=n;k++)o[m[0]].push(S.ci[m[0]](k,n,c))});return cache[key]=o}
  function covCurve(n,c,T){const I=ints(n,c),lc=[];for(let k=0;k<=n;k++)lc.push(S.lchoose(n,k));
    const res={};M.forEach(m=>res[m[0]]=[]);
    T.forEach(t=>{const lt=Math.log(t),l1=Math.log(1-t);const pm=[];for(let k=0;k<=n;k++)pm.push(Math.exp(lc[k]+k*lt+(n-k)*l1));
      M.forEach(m=>{let s=0;const A=I[m[0]];for(let k=0;k<=n;k++)if(A[k][0]<=t&&t<=A[k][1])s+=pm[k];res[m[0]].push(s)})});
    return res}
  function avg(n,c){const T=[];for(let i=0;i<400;i++)T.push((i+.5)/400);const r=covCurve(n,c,T),o={};
    const I=ints(n,c);
    M.forEach(m=>{o[m[0]]={cov:S.mean(r[m[0]])};
      // expected width under a uniform true rate: each k is equally likely (beta-binomial with a = b = 1)
      let w=0;for(let k=0;k<=n;k++){const a=Math.max(0,I[m[0]][k][0]),b=Math.min(1,I[m[0]][k][1]);w+=(b-a)/(n+1)}o[m[0]].w=w;
      let out=0,zero=0;for(let k=0;k<=n;k++){const A=I[m[0]][k];if(A[0]<-1e-9||A[1]>1+1e-9)out++;if(A[1]-A[0]<1e-9)zero++}o[m[0]].out=out;o[m[0]].zero=zero});
    return o}
  window.ES_CHECK=window.ES_CHECK||{};
  function draw(){
    const n=+nI.value,c=+cI.value;document.getElementById('cv-nv').textContent=n;
    document.querySelectorAll('#cv-pre button').forEach(b=>b.classList.toggle('on',+b.dataset.n===n));
    const W=Math.min(860,RD.width(host)),H=Math.round(Math.min(320,Math.max(220,W*.45))),pl=40,pr=10,pt=10,pb=30;
    const T=[];const NP=Math.min(240,Math.max(120,Math.floor(W/3)));for(let i=0;i<NP;i++)T.push(0.001+0.998*i/(NP-1));
    const r=covCurve(n,c,T);const lo=c>=.99?.9:c>=.95?.8:.7;
    const X=t=>pl+t*(W-pl-pr),Y=v=>pt+(1-(Math.max(lo,v)-lo)/(1-lo))*(H-pt-pb);
    let s='';
    for(let v=lo;v<=1.0001;v+=.05){const y=Y(v);s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+y+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(pl-4,y+4,Math.round(v*100)+'%',{a:'end',fs:10.5,fill:'var(--mute)'})}
    for(let t=0;t<=1.0001;t+=.25){const x=X(t);s+=RD.t(x,H-12,Math.round(t*100)+'%',{a:t===0?'start':t>=1?'end':'middle',fs:10.5,fill:'var(--mute)'})}
    s+='<line x1="'+pl+'" x2="'+(W-pr)+'" y1="'+Y(c)+'" y2="'+Y(c)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>';
    M.forEach(m=>{if(!on[m[0]])return;s+='<polyline fill="none" stroke="'+m[2]+'" stroke-width="1.6" points="'+T.map((t,i)=>X(t).toFixed(1)+','+Y(r[m[0]][i]).toFixed(1)).join(' ')+'"/>'});
    host.innerHTML=RD.svg(W,H,s,'Coverage against the true pass rate for four interval methods');
    document.getElementById('cv-cap').textContent='Horizontal axis: true pass rate. Vertical axis: probability that the interval built from one run of '+n+' items contains it (exact binomial sum, '+NP+' points). Dashed line: the promised '+Math.round(c*100)+'%. Curves below '+Math.round(lo*100)+'% are drawn at the floor.';
    const A=avg(n,c);
    document.getElementById('cv-tab').innerHTML='<tr><th>Method</th><th class="num">Average coverage, true rate uniform on [0, 1]</th><th class="num">Average width</th><th class="num">Counts k with an interval outside [0, 1]</th><th class="num">Counts with zero width</th></tr>'+
      M.map(m=>'<tr><td>'+m[1]+'</td><td class="num">'+(100*A[m[0]].cov).toFixed(1)+'%</td><td class="num">'+(100*A[m[0]].w).toFixed(1)+' pts</td><td class="num">'+A[m[0]].out+' of '+(n+1)+'</td><td class="num">'+A[m[0]].zero+'</td></tr>').join('');
    if(n===100&&c===.95)window.ES_CHECK.cov100={wald:A.wald.cov,wilson:A.wilson.cov,cp:A.cp.cov,bayes:A.bayes.cov};
    document.getElementById('cv-repro').innerHTML=(n===100&&c===.95?'<b>Defaults reproduce Bowyer et al.</b> (their Section 3.1: "in the N=100 column we see that 95% CLT-based intervals achieve a coverage of only 92.5%"): computed exactly here, independently, the CLT interval covers '+(100*A.wald.cov).toFixed(1)+'% on average; the small gap to 92.5% is their simulation (100 true rates, 200 datasets each). ':'')+
      'The Bayes interval averages exactly its nominal level by construction here, because the uniform average over true rates is its own prior; Clopper-Pearson over-covers, as Bowyer et al. say ("overly conservative"); Wilson stays close to nominal at every n, narrower than Clopper-Pearson.';
  }
  nI.addEventListener('input',draw);cI.addEventListener('change',draw);
  document.getElementById('cv-pre').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;nI.value=b.dataset.n;draw()});
  function own(){let k=Math.max(0,Math.floor(+document.getElementById('cv-k').value||0)),n=Math.max(1,Math.floor(+document.getElementById('cv-m').value||1));if(k>n)k=n;
    document.getElementById('cv-own').innerHTML='<tr><th>Method</th><th class="num">95% interval</th><th class="num">Width</th></tr>'+M.map(m=>{const I=S.ci[m[0]](k,n,.95);return'<tr><td>'+m[1]+'</td><td class="num">'+(100*I[0]).toFixed(1)+'% to '+(100*I[1]).toFixed(1)+'%</td><td class="num">'+(100*(I[1]-I[0])).toFixed(1)+' pts</td></tr>'}).join('')}
  ['cv-k','cv-m'].forEach(id=>document.getElementById(id).addEventListener('input',own));
  let first=true;onTab('t-cov',()=>{draw();if(first){own();first=false}});
  addEventListener('resize',()=>{const t=document.getElementById('t-cov');if(t&&!t.hidden)draw()});
  // the published check runs once at load so the recompute comparison does not depend on opening the tab
  (function(){const A=avg(100,.95);window.ES_CHECK.cov100={wald:A.wald.cov,wilson:A.wilson.cov,cp:A.cp.cov,bayes:A.bayes.cov}})();
})();
