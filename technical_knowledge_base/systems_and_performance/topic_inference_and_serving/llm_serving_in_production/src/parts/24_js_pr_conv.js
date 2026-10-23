// ---- Reading tab, section 2: the Mooncake-trace results table (all repeats, min to max) ----
(function(){
  const el=document.getElementById('pr-conv-tab');if(!el||!window.PRD)return;
  const RUN=(PRD.route&&PRD.route.conv)||{};
  const NAME={rr:'Round robin',ll:'Least loaded',hash1:'Hash of the first block (the shared system prompt)',hash2:'Hash of the first two blocks',ca:'SGLang cache-aware, CLI defaults',wt:'Weighted: 3 x prefix + 2 x queue'};
  const rng=(a,f)=>{const v=a.map(f),mn=Math.min(...v),mx=Math.max(...v);return {mn,mx}};
  const fmt=(r,d,u)=>r.mn.toFixed(d)===r.mx.toFixed(d)?r.mn.toFixed(d)+u:r.mn.toFixed(d)+' to '+r.mx.toFixed(d)+u;
  let h='<tr><th>Policy</th><th class="num">Runs</th><th class="num">Prefix hit rate</th><th class="num">Prompt tokens computed</th><th class="num">TTFT p50</th><th class="num">TTFT p99</th><th class="num">Busiest replica\'s share</th></tr>';
  Object.keys(NAME).forEach(p=>{const a=RUN[p];if(!a)return;
    h+='<tr><td>'+NAME[p]+'</td><td class="num">'+a.length+'</td><td class="num">'+fmt(rng(a,r=>r.hit*100),1,'%')+'</td><td class="num">'+fmt(rng(a,r=>r.computed/1000),0,'k')+'</td><td class="num">'+fmt(rng(a,r=>r.ttft_p50),2,' s')+'</td><td class="num">'+fmt(rng(a,r=>r.ttft_p99),1,' s')+'</td><td class="num">'+fmt(rng(a,r=>100*Math.max(...r.per_replica.map(x=>x.computed))/r.computed),0,'%')+'</td></tr>'});
  el.innerHTML=h;
})();
