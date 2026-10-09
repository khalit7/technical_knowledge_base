// ---- Scheduling lab (t-sch): tables and charts from BKD.sch (src/sched/gen_sched.py), BKD.regress, BKD.meas ----
(function(){
  const S=BKD.sch;if(!document.getElementById('sc1-tbl'))return;
  const $=id=>document.getElementById(id),fN=v=>v.toLocaleString('en-US');
  const ms=v=>v>=1?v.toFixed(2)+' s':(v*1000).toFixed(v<0.01?1:0)+' ms';
  const wid=el=>{const w=el.clientWidth;return w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-40))};
  function lineChart(el,xs,series,o){
    const W=Math.max(300,Math.min(860,wid(el))),H=W<480?220:250,L=48,R=10,T=10,B=34;
    const lo=Math.log10(o.ymin),hi=Math.log10(o.ymax),x=i=>L+(W-L-R)*i/(xs.length-1),y=v=>T+(H-T-B)*(1-(Math.log10(Math.max(o.ymin,v))-lo)/(hi-lo));
    let b='';o.ticks.forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-4,y(v)+4,v>=1?v+' s':Math.round(v*1000)+' ms',{a:'end',fs:10,fill:'var(--mute)'})});
    xs.forEach((v,i)=>{b+=RD.t(x(i),H-B+14,o.xl(v),{a:i===xs.length-1?'end':(i===0?'start':'middle'),fs:10,fill:'var(--mute)'})});
    b+=RD.t((L+W-R)/2,H-4,o.xt,{a:'middle',fs:10.5,fill:'var(--mute)'});
    series.forEach(s=>{b+='<polyline fill="none" stroke="'+s.c+'" stroke-width="2"'+(s.d?' stroke-dasharray="'+s.d+'"':'')+' points="'+s.v.map((v,i)=>x(i).toFixed(1)+','+y(v).toFixed(1)).join(' ')+'"/>';s.v.forEach((v,i)=>{b+='<circle cx="'+x(i).toFixed(1)+'" cy="'+y(v).toFixed(1)+'" r="2.6" fill="'+s.c+'"/>'})});
    el.innerHTML=RD.svg(W,H,b,o.label);
  }
  function s1(){
    const k=$('sc1-case').value,d=S[k],M=BKD.meas&&BKD.meas.chunk;
    const meas=k==='chunk_m1'&&M;
    let h='<thead><tr><th class="num">Budget</th><th class="num">Long prompt TTFT</th><th class="num">Longest gap while it is read</th><th class="num">Mean gap then</th><th class="num">p50 gap, whole run</th>'+(meas?'<th class="num">Measured TTFT</th><th class="num">Measured longest gap</th>':'')+'</tr></thead><tbody>';
    d.rows.forEach(r=>{const m=meas?M.rows.find(x=>x.budget===r.budget):null;
      h+='<tr><td class="num">'+(r.budget?fN(r.budget):'no chunking')+'</td><td class="num">'+ms(r.long_ttft)+'</td><td class="num">'+ms(r.max_gap)+'</td><td class="num">'+ms(r.mean_gap_during)+'</td><td class="num">'+ms(r.p50_gap)+'</td>'+(meas?('<td class="num">'+(m?ms(m.ttft_med):'')+'</td><td class="num">'+(m?ms(m.maxgap_med):'')+'</td>'):'')+'</tr>'});
    $('sc1-tbl').innerHTML=h+'</tbody>';
    $('sc1-note').innerHTML='<span class="sc-der">derived</span> '+d.desc+'.'+(meas?' <span class="sc-meas">measured here</span>: median of '+M.reps+' runs per budget on llama-server (build 11146, Metal), the same requests; see the Reading tab\'s section 5 for the spread.':'');
    const P=S.chunk_poisson.rows;
    lineChart($('sc1-plot'),P.map(r=>r.budget),[{c:'var(--c2)',v:P.map(r=>r.itl_p99)},{c:'var(--c1)',v:P.map(r=>r.ttft_p99)},{c:'var(--c3)',v:P.map(r=>r.ttft_p50)}],
      {ymin:0.005,ymax:3,ticks:[0.01,0.03,0.1,0.3,1],xl:v=>fN(v),xt:'token budget per step (max_num_batched_tokens)',label:'budget sweep'});
  }
  function s2(){
    const f=S.fair[+$('sc2-sc').value],N={fcfs:'FCFS',vtc:'VTC',priority:'Priority (B first)'};
    let h='<thead><tr><th>Policy</th><th>Client</th><th class="num">Requests</th><th class="num">TTFT p50</th><th class="num">TTFT p99</th><th class="num">Service while backlogged</th></tr></thead><tbody>';
    Object.keys(N).forEach(p=>{const x=f.pol[p];x.per.forEach((c,k)=>{const s=x.series[k].slice(5,30),sv=s.reduce((a,b)=>a+b,0)/s.length;
      h+='<tr><td>'+(k?'':N[p])+'</td><td>'+(k?'B':'A')+' ('+f.clients[k].rate+' req/s)</td><td class="num">'+fN(c.n)+'</td><td class="num">'+ms(c.ttft_p50)+'</td><td class="num">'+ms(c.ttft_p99)+'</td><td class="num">'+fN(Math.round(sv))+' /s</td></tr>'})});
    $('sc2-tbl').innerHTML=h+'</tbody>';
  }
  function s3(){
    const R=S.sjf.rows,rates=[...new Set(R.map(r=>r.rate))],g=(p,k)=>rates.map(rt=>R.find(r=>r.rate===rt&&r.pol===p)[k]);
    lineChart($('sc3-plot'),rates,[{c:'var(--c1)',v:g('fcfs','ttft_mean')},{c:'var(--c2)',v:g('sjf','ttft_mean')},{c:'var(--c4)',v:g('fcfs','ttft_p99'),d:'4 3'},{c:'var(--c5)',v:g('sjf','ttft_p99'),d:'4 3'}],
      {ymin:0.01,ymax:40,ticks:[0.01,0.1,1,10],xl:v=>v+'/s',xt:'arrival rate (requests per second); the server saturates near 40',label:'sjf against fcfs'});
    let h='<thead><tr><th class="num">Rate</th><th>Policy</th><th class="num">TTFT mean</th><th class="num">TTFT p99</th><th class="num">E2E mean</th><th class="num">E2E p99</th><th class="num">p99 E2E, answers of 500+</th><th class="num">Output tok/s</th></tr></thead><tbody>';
    R.forEach(r=>{h+='<tr><td class="num">'+r.rate+'/s</td><td>'+r.pol.toUpperCase()+'</td><td class="num">'+ms(r.ttft_mean)+'</td><td class="num">'+ms(r.ttft_p99)+'</td><td class="num">'+ms(r.e2e_mean)+'</td><td class="num">'+ms(r.e2e_p99)+'</td><td class="num">'+ms(r.long_e2e_p99)+'</td><td class="num">'+fN(Math.round(r.tps))+'</td></tr>'});
    $('sc3-tbl').innerHTML=h+'</tbody>';
  }
  function s4(){
    let h='<thead><tr><th class="num">KV cache</th><th>Mode</th><th class="num">Preemptions</th><th class="num">Output tok/s</th><th class="num">TTFT p50</th><th class="num">TTFT p99</th><th class="num">TPOT p50</th></tr></thead><tbody>';
    S.preempt.rows.forEach(r=>{const mode=r.admit==='reserve'?'reserve prompt + max_tokens':(r.mode==='swap'?'swap at '+(r.swapbw/1e9)+' GB/s':'recompute');
      h+='<tr><td class="num">'+fN(r.nblocks)+' blocks ('+fN(r.nblocks*16)+' tokens)</td><td>'+mode+'</td><td class="num">'+r.npre+'</td><td class="num">'+fN(Math.round(r.tps))+'</td><td class="num">'+ms(r.ttft_p50)+'</td><td class="num">'+ms(r.ttft_p99)+'</td><td class="num">'+ms(r.tpot_p50)+'</td></tr>'});
    $('sc4-tbl').innerHTML=h+'</tbody>';
  }
  function s5(){
    const g=BKD.regress,v=S.vllm_prio,ok=v.filter(c=>c.identical).length,st=v.reduce((a,c)=>a+c.steps,0),pr=v.reduce((a,c)=>a+c.pre,0);
    $('sc5').innerHTML='<p class="small"><b>The copy is faithful.</b> With the FCFS policy, <code>bksched.py</code> and the parent\'s <code>sim.py</code> produce identical step logs and metrics on all '+g.cases+' of the parent\'s test configurations ('+g.identical+' identical, '+fN(g.steps)+' steps), including the 10 the parent checked against vLLM. <b>The priority policy is vLLM\'s.</b> vLLM v0.31.0\'s own Scheduler and KVCacheManager (commit db9527a, Python only, a stand-in model runner returning one token per finished prefill or decode) ran eight two-client traces with <code>policy="priority"</code> or "fcfs"; '+ok+' of '+v.length+' matched the simulator at every step ('+fN(st)+' steps, '+pr+' preemptions). Two details had to be copied from vLLM: ties in priority and arrival are broken by comparing request ids as strings, and a step in which the only request that needed a block preempted itself is an empty step, not a rejection.</p>';
    $('sc5-tbl').innerHTML='<thead><tr><th>Trace</th><th class="num">Steps</th><th class="num">Preemptions (vLLM, simulator)</th><th class="num">Tokens scheduled</th><th>Identical</th></tr></thead><tbody>'+v.map(c=>'<tr><td>'+c.name+'</td><td class="num">'+fN(c.steps)+'</td><td class="num">'+c.pre+', '+c.pre_sim+'</td><td class="num">'+fN(c.tokens)+'</td><td>'+(c.identical?'yes':'NO')+'</td></tr>').join('')+'</tbody>';
  }
  $('sc1-case').addEventListener('change',s1);$('sc2-sc').addEventListener('change',s2);
  const all=()=>{s1();s2();s3();s4();s5()};
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-sch']=[all];
  let tm=0;addEventListener('resize',()=>{if($('t-sch').hidden)return;clearTimeout(tm);tm=setTimeout(()=>{s1();s3()},80)});
  all();
})();
