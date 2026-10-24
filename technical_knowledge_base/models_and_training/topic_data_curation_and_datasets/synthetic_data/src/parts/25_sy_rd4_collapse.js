// ---- Reading section 7 (moved from the Collapse lab tab 2026-10-24): categorical model refit on its own samples; same algorithm and PRNG as src/scripts/collapse_categorical.py ----
(function(){
  const D=window.SY||{},esc=RD.esc;const $=id=>document.getElementById(id);if(!$('sc-card'))return;
  function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
  function zipf(V,s){const w=[];let z=0;for(let k=1;k<=V;k++){const x=1/Math.pow(k,s);w.push(x);z+=x}return w.map(x=>x/z)}
  function draw(p,n,rnd){const cdf=new Float64Array(p.length);let c=0;for(let i=0;i<p.length;i++){c+=p[i];cdf[i]=c}
    const cnt=new Array(p.length).fill(0),last=p.length-1;
    for(let j=0;j<n;j++){const u=rnd()*c;let lo=0,hi=last;while(lo<hi){const m=(lo+hi)>>1;if(cdf[m]>u)hi=m;else lo=m+1}cnt[lo]++}return cnt}
  const norm=c=>{let s=0;for(const x of c)s+=x;return c.map(x=>x/s)};
  function metrics(p,p0){let alive=0,tail=0,tv=0,ent=0;for(let k=0;k<p.length;k++){if(p[k]>0){alive++;ent-=p[k]*Math.log2(p[k])}if(k>=100)tail+=p[k];tv+=Math.abs(p[k]-p0[k])}
    return {alive,tail:+tail.toFixed(6),tv:+(tv/2).toFixed(6),ent:+ent.toFixed(6)}}
  function run(mode,V,s,n,G,pi,seed,keep){const rnd=mulberry32(seed),p0=zipf(V,s),real=draw(p0,n,rnd);let pool=real.slice(),p=norm(real);
    const out=[metrics(p,p0)],ps=keep?[p]:null;
    for(let g=1;g<=G;g++){const syn=draw(p,n,rnd);let fit;
      if(mode==='replace')fit=syn;
      else if(mode==='accumulate'){pool=pool.map((a,i)=>a+syn[i]);fit=pool}
      else if(mode==='subsample'){pool=pool.map((a,i)=>a+syn[i]);fit=draw(norm(pool),n,rnd)}
      else{const k=Math.round(pi*n),fr=draw(p0,k,rnd),sy=draw(p,n-k,rnd);fit=fr.map((a,i)=>a+sy[i])}
      p=norm(fit);out.push(metrics(p,p0));if(keep)ps.push(p)}
    return {m:out,ps,p0}}
  const MODES=['replace','accumulate','subsample','fresh'],NAME={replace:'Replace',accumulate:'Accumulate',subsample:'Accumulate-subsample',fresh:'Fresh real data'},CL={replace:'var(--c2)',accumulate:'var(--c3)',subsample:'var(--c4)',fresh:'var(--c5)'};
  const V=1000;let mode='replace',R=null,ALL=null,A=null;
  function params(){return {n:+$('sc-n').value,s:+$('sc-s').value,pi:+$('sc-pi').value,G:+$('sc-g').value,seed:Math.max(1,Math.min(9999,Math.round(+$('sc-seed').value||1)))}}
  function compute(){const P=params();ALL={};MODES.forEach(m=>{ALL[m]=m===mode?null:run(m,V,P.s,P.n,P.G,P.pi,P.seed,false).m});R=run(mode,V,P.s,P.n,P.G,P.pi,P.seed,true);ALL[mode]=R.m;return P}
  function rankChart(i){const host=$('sc-rank'),w=RD.width(host),h=220,l=46,r=10,t=10,b=30;const p=R.ps[i],p0=R.p0;
    const X=k=>l+(w-l-r)*Math.log10(k)/3,lo=-6,Y=v=>t+(h-t-b)*(1-(Math.log10(v)-lo)/(0-lo));
    let s='';[0,-1,-2,-3,-4,-5,-6].forEach(e=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(Math.pow(10,e))+'" y2="'+Y(Math.pow(10,e))+'" stroke="var(--line)"/>'+RD.t(l-5,Y(Math.pow(10,e))+4,e===0?'1':'1e'+e,{a:'end',fs:10})});
    [1,10,100,1000].forEach(k=>s+=RD.t(X(k),h-b+14,k,{a:k===1000?'end':'middle',fs:10}));s+=RD.t((l+w-r)/2,h-3,'rank of the word type in the real distribution',{a:'middle',fs:10,fill:'var(--mute)'});
    s+='<path d="'+p0.map((v,k)=>(k?'L':'M')+X(k+1).toFixed(1)+' '+Y(v).toFixed(1)).join(' ')+'" fill="none" stroke="var(--dim)" stroke-width="3"/>';
    let d='',pen=false;p.forEach((v,k)=>{if(v>0){d+=(pen?'L':'M')+X(k+1).toFixed(1)+' '+Y(Math.max(v,1e-6)).toFixed(1)+' ';pen=true}else pen=false});
    s+='<path d="'+d+'" fill="none" stroke="var(--c1)" stroke-width="1.3"/>';
    let ticks='';p.forEach((v,k)=>{if(v===0)ticks+='M'+X(k+1).toFixed(1)+' '+(h-b)+'v-7'});s+='<path d="'+ticks+'" stroke="var(--bad)" stroke-width="1"/>';
    host.innerHTML=RD.svg(w,h,s,'Probability of each word type by rank, real against model')}
  function aliveChart(i){const host=$('sc-alive'),w=RD.width(host),h=170,l=46,r=10,t=10,b=28,G=R.m.length-1;
    const X=g=>l+(w-l-r)*g/G,Y=v=>t+(h-t-b)*(1-v/V);let s='';[0,250,500,750,1000].forEach(v=>{s+='<line x1="'+l+'" x2="'+(w-r)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(l-5,Y(v)+4,v,{a:'end',fs:10})});
    for(let g=0;g<=G;g+=G>40?20:5)s+=RD.t(X(g),h-b+14,g,{a:'middle',fs:10});s+=RD.t((l+w-r)/2,h-2,'generation',{a:'middle',fs:10,fill:'var(--mute)'});
    MODES.forEach(m=>{const a=ALL[m];const upto=m===mode?i:G;s+='<path d="'+a.slice(0,upto+1).map((x,g)=>(g?'L':'M')+X(g).toFixed(1)+' '+Y(x.alive).toFixed(1)).join(' ')+'" fill="none" stroke="'+CL[m]+'" stroke-width="'+(m===mode?3:1.2)+'" opacity="'+(m===mode?1:.5)+'"/>';
      });
    s+='<line x1="'+X(i)+'" x2="'+X(i)+'" y1="'+t+'" y2="'+(h-b)+'" stroke="var(--ink)" stroke-dasharray="3 3"/>';
    host.innerHTML=RD.svg(w,h,s,'Word types alive by generation, four workflows')}
  function drawStep(i){if(!R)return;const P=params(),x=R.m[i],x0=R.m[0];rankChart(i);aliveChart(i);
    $('sc-cap').innerHTML='<div class="t">'+NAME[mode]+', generation '+i+'</div>'+(i===0?'The model counted '+P.n.toLocaleString('en-US')+' draws from the real distribution: only '+x0.alive+' of the 1,000 types appeared, the rest are dead from the start (red ticks). Expected: the sum over types of 1 &minus; (1 &minus; p)<sup>n</sup>.':
      mode==='replace'?'Fit on '+P.n.toLocaleString('en-US')+' samples of the previous model. Dead types never return; surviving probabilities wander.':mode==='accumulate'?'Fit on the real sample plus '+i+' synthetic samples. Real counts stay in the pool, so the set of live types cannot shrink.':mode==='subsample'?'The pool grows, but each model sees only '+P.n.toLocaleString('en-US')+' draws from it.':'Each generation\'s '+P.n.toLocaleString('en-US')+' samples include '+Math.round(P.pi*P.n).toLocaleString('en-US')+' fresh draws from the real distribution.');
    $('sc-cnt').innerHTML=RD.stat('Types alive',x.alive,'generation 0: '+x0.alive)+RD.stat('Entropy, bits',x.ent.toFixed(2),'generation 0: '+x0.ent.toFixed(2))+RD.stat('Tail mass (rank 101+)',(100*x.tail).toFixed(1)+'%','real: '+(100*R.p0.slice(100).reduce((a,b)=>a+b,0)).toFixed(1)+'%')+RD.stat('Distance from real',(100*x.tv).toFixed(1)+'%','total variation')}
  function rebuild(){const P=compute();A.reset(P.G+1);parity(P)}
  function parity(P){const ref=D.collapse_ref,el=$('sc-par');if(!ref||!el)return;const rp=ref.params;
    if(P.n!==rp.n||P.s!==rp.s||P.G!==rp.G||P.seed!==rp.seed||P.pi!==rp.pi){el.innerHTML='Settings differ from the recorded Python run (n 2,000, s 1.1, 30 generations, seed 1, 10% fresh), so no check is shown.';return}
    const ok=MODES.every(m=>ALL[m].length===ref.runs[m].length&&ALL[m].every((x,g)=>{const y=ref.runs[m][g];return x.alive===y.alive&&['tail','tv','ent'].every(k=>Math.abs(x[k]-y[k])<=2e-6)}));
    el.innerHTML='<span class="chk'+(ok?'':' no')+'">'+(ok?'Matches':'Does not match')+'</span> the recorded Python run (src/scripts/collapse_categorical.py, same PRNG) generation by generation for all four workflows (types alive exactly; tail mass, distance and entropy to the sixth decimal, where the two languages round ties differently). Over 50 seeds at these settings, types alive at generation 30 (median, range): '+MODES.map(m=>NAME[m]+' '+ref.alive_at_G_50_seeds[m].median+' ('+ref.alive_at_G_50_seeds[m].min+' to '+ref.alive_at_G_50_seeds[m].max+')').join('; ')+'. <span class="meas">measured</span>'}
  compute();
  A=RD.anim({card:'sc-card',ctl:'sc-ctl',n:R.m.length,draw:drawStep,ms:350,label:'Generation'});
  parity(params());
  RD.seg($('sc-mode'),m=>{mode=m;rebuild()});
  ['sc-n','sc-s','sc-pi','sc-g','sc-seed'].forEach(id=>$(id).addEventListener('change',rebuild));
  RD.onRender(()=>A.redraw());RD.onResize(()=>A.redraw());
})();
