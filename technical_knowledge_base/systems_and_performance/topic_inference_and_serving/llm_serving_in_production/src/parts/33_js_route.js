// ---- Router lab: per-request dots, TTFT distributions and the table of every repeat ----
(function(){
  const root=document.getElementById('t-route');if(!root||!window.PRD)return;
  const D=PRD,REQ=D.route_req||{},RUN=(D.route&&D.route.conv)||{};
  const NAME={rr:'Round robin',ll:'Least loaded',hash1:'Hash of the first block',hash2:'Hash of the first two blocks',ca:'SGLang cache-aware',wt:'llm-d-style weighted'};
  const COL={rr:'var(--c6)',ll:'var(--c4)',hash1:'var(--bad)',hash2:'var(--c5)',ca:'var(--c1)',wt:'var(--c3)'};
  const pols=Object.keys(NAME).filter(p=>REQ[p]);let cur=pols.includes('ca')?'ca':pols[0];
  const m=D.trace||{};document.getElementById('rl-meta').textContent=(m.requests||'')+' requests from '+(m.conversations||'')+' conversations, '+(m.turns_gt1||'')+' of them later turns; a 512-token block of the original is 16 tokens here and time runs '+(m.compress||'')+' times faster';
  const seg=document.getElementById('rl-pol');seg.innerHTML=pols.map(p=>'<button data-m="'+p+'"'+(p===cur?' class="on"':'')+'>'+NAME[p]+'</button>').join('');
  RD.seg(seg,v=>{cur=v;dots()});
  function dots(){
    const el=document.getElementById('rl-dots'),w=RD.width(el),L=34,h=210,lane=(h-30)/3,R=REQ[cur];if(!R)return;
    const T=Math.max(...R.map(r=>r[0]))*1.02,x=t=>L+(w-L-8)*t/T;let s='';
    for(let k=0;k<3;k++){const y=6+k*lane;s+='<rect x="'+L+'" y="'+y+'" width="'+(w-L-8)+'" height="'+(lane-4)+'" fill="var(--soft)" rx="4"/>'+RD.t(L-4,y+lane/2+2,'R'+(k+1),{a:'end',fs:10.5,w:600})}
    const rng=PRSIM.Rng(5);
    R.forEach(r=>{const k=r[1],hit=(r[2]||0)/Math.max(1,r[5]),col=hit<0.05?'var(--bad)':hit<0.5?'var(--c5)':'var(--good)',rad=1.2+Math.sqrt(r[5])/9;
      s+='<circle cx="'+x(r[0]).toFixed(1)+'" cy="'+(6+k*lane+4+rng()*(lane-12)).toFixed(1)+'" r="'+rad.toFixed(1)+'" fill="'+col+'" opacity=".75"/>'});
    for(let t=0;t<=T;t+=30)s+=RD.t(x(t),h-6,t+' s',{a:'middle',fs:10,fill:'var(--mute)'});
    const run=RUN[cur]&&RUN[cur][0];
    el.innerHTML=RD.svg(w,h,s,'Requests by send time and replica for '+NAME[cur]);
    if(run)el.insertAdjacentHTML('beforeend','<p class="small">'+NAME[cur]+', first repeat: requests per replica '+run.per_replica.map(p=>p.req).join(' / ')+'; prompt tokens computed per replica '+run.per_replica.map(p=>p.computed.toLocaleString('en-US')).join(' / ')+'; hit rate '+(run.hit*100).toFixed(1)+'%'+(run.modes?'; decisions: '+run.modes.cache+' followed the cache, '+run.modes['low-match']+' went to the least loaded (match at or below 0.3), '+run.modes.imbalanced+' by the imbalance rule':'')+'.</p>');
  }
  function cdf(){
    const el=document.getElementById('rl-cdf'),w=RD.width(el),L=34,h=220,lo=Math.log10(0.02),hi=Math.log10(20),x=v=>L+(w-L-10)*(Math.log10(Math.max(0.02,Math.min(20,v)))-lo)/(hi-lo),y=q=>8+(h-36)*(1-q);
    let s='';[0.02,0.05,0.1,0.2,0.5,1,2,5,10,20].forEach(v=>{s+='<line x1="'+x(v)+'" x2="'+x(v)+'" y1="8" y2="'+(h-28)+'" stroke="var(--line)"/>'+RD.t(x(v),h-14,v,{a:'middle',fs:10,fill:'var(--mute)'})});
    [0,0.5,0.9,1].forEach(q=>{s+=RD.t(L-4,y(q)+4,Math.round(q*100)+'%',{a:'end',fs:9.5,fill:'var(--mute)'})});
    s+=RD.t(w-10,h-2,'TTFT, seconds',{a:'end',fs:10,fill:'var(--mute)'});
    pols.forEach(p=>{const t=REQ[p].map(r=>r[4]).filter(v=>v!=null).sort((a,b)=>a-b);let d='';t.forEach((v,i)=>{d+=(i?'L':'M')+x(v).toFixed(1)+' '+y((i+1)/t.length).toFixed(1)});
      s+='<path d="'+d+'" fill="none" stroke="'+COL[p]+'" stroke-width="'+(p===cur?2.6:1.4)+'"/>'});
    el.innerHTML=RD.svg(w,h,s,'TTFT distribution per routing policy')+'<div class="leg">'+pols.map(p=>'<span style="--sw:'+COL[p]+'">'+NAME[p]+'</span>').join('')+'</div>';
  }
  function table(){
    const f=(a,k,d,u)=>{const v=a.map(r=>r[k]);const mn=Math.min(...v),mx=Math.max(...v);return v.length>1?(mn.toFixed(d)+' to '+mx.toFixed(d)+(u||'')):(v[0].toFixed(d)+(u||''))};
    let h='<tr><th>Policy</th><th class="num">Repeats</th><th class="num">Prefix hit rate</th><th class="num">Prompt tokens computed</th><th class="num">TTFT p50</th><th class="num">TTFT p90</th><th class="num">TTFT p99</th><th class="num">Busiest replica\'s share of tokens computed</th></tr>';
    pols.forEach(p=>{const a=RUN[p]||[];if(!a.length)return;const sh=a.map(r=>Math.max(...r.per_replica.map(x=>x.computed))/r.computed);
      h+='<tr><td>'+NAME[p]+'</td><td class="num">'+a.length+'</td><td class="num">'+f(a.map(r=>({v:r.hit*100})),'v',1,'%')+'</td><td class="num">'+f(a.map(r=>({v:r.computed/1000})),'v',1,'k')+'</td><td class="num">'+f(a,'ttft_p50',2,' s')+'</td><td class="num">'+f(a,'ttft_p90',2,' s')+'</td><td class="num">'+f(a,'ttft_p99',2,' s')+'</td><td class="num">'+f(sh.map(v=>({v:v*100})),'v',0,'%')+'</td></tr>'});
    document.getElementById('rl-tab').innerHTML=h;
    const la=[].concat(...pols.map(p=>(RUN[p]||[]).map(r=>r.load))).flat();
    document.getElementById('rl-note').textContent='Ranges are min to max over repeats, each from fresh replicas with empty caches. One-minute load average of the machine before and after the runs: '+Math.min(...la).toFixed(1)+' to '+Math.max(...la).toFixed(1)+' (the laptop was shared). With a fixed arrival schedule every policy delivers the same output tokens per second; the policies differ in the work the replicas do (tokens computed) and in how long users wait. An infinite cache on one replica would find '+((m.ideal_hit_one_replica||0)*100).toFixed(1)+'% of all prompt tokens cached; the replicas here hold far less.';
  }
  const SIM=D.route_sim;let capSel=128;
  if(SIM){const cs=document.getElementById('rl-cap');cs.innerHTML=SIM.C.map(c=>'<button data-m="'+c+'"'+(c===capSel?' class="on"':'')+'>'+(c>=100000?'Unlimited cache':(c*16).toLocaleString('en-US')+' tokens per replica')+'</button>').join('');RD.seg(cs,v=>{capSel=+v;sim()})}
  function sim(){
    if(!SIM)return;const el=document.getElementById('rl-sim'),w=RD.width(el),L=40,h=230,Ns=SIM.N,x=n=>L+(w-L-14)*(Math.log2(n)/Math.log2(16)),y=v=>10+(h-40)*(1-v/0.45);
    let s='';[0,0.1,0.2,0.3,0.4].forEach(v=>{s+='<line x1="'+L+'" x2="'+(w-14)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,Math.round(v*100)+'%',{a:'end',fs:10,fill:'var(--mute)'})});
    Ns.forEach(n=>{s+=RD.t(x(n),h-14,n,{a:'middle',fs:10,fill:'var(--mute)'})});s+=RD.t(w-14,h-1,'replicas',{a:'end',fs:10,fill:'var(--mute)'});
    s+=RD.t(L+4,y(0.4065)-4,'one replica, unlimited cache: '+((D.trace&&D.trace.ideal_hit_one_replica||0)*100).toFixed(1)+'%',{fs:10,fill:'var(--mute)'});
    s+='<line x1="'+L+'" x2="'+(w-14)+'" y1="'+y(0.4065)+'" y2="'+y(0.4065)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    SIM.pol.forEach(p=>{let d='';Ns.forEach((n,i)=>{d+=(i?'L':'M')+x(n).toFixed(1)+' '+y(SIM.hit[p+'_'+n+'_'+capSel]).toFixed(1)});s+='<path d="'+d+'" fill="none" stroke="'+COL[p]+'" stroke-width="2"/>';
      Ns.forEach(n=>{s+='<circle cx="'+x(n).toFixed(1)+'" cy="'+y(SIM.hit[p+'_'+n+'_'+capSel]).toFixed(1)+'" r="2.5" fill="'+COL[p]+'"/>'});
      const m=RUN[p]&&RUN[p][0];if(m)s+='<rect x="'+(x(3)-4)+'" y="'+(y(m.hit)-4)+'" width="8" height="8" fill="none" stroke="'+COL[p]+'" stroke-width="2"/>'});
    el.innerHTML=RD.svg(w,h,s,'Simulated prefix hit rate against number of replicas')+'<div class="leg">'+SIM.pol.map(p=>'<span style="--sw:'+COL[p]+'">'+NAME[p]+'</span>').join('')+'<span style="--sw:transparent">squares: measured, 3 replicas</span></div>';
  }
  function all(){dots();cdf();sim();table()}
  RD.onRender(all,'t-route');RD.onResize(()=>{dots();cdf();sim()},'t-route');
})();
