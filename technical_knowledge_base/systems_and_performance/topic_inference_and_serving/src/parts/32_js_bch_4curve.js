// ---- Engine bench: throughput-latency curves and goodput under an SLO, from the load tests ----
(function(){
  const B=window.BCH,D=B.D,$=B.$;
  if(!$('bch-cv-plot'))return;
  const COL={'llama.cpp':'var(--c1)','MLX':'var(--c2)','vLLM (CPU)':'var(--c4)'};
  const MAIN={'llama.cpp':['lsv_0.6b_q4_closed','lsv_0.6b_q4_poisson'],'MLX':['msv_0.6b_4bit_closed','msv_0.6b_4bit_poisson','msv_0.6b_4bit_poissonA'],'vLLM (CPU)':['vsv_0.6b_fp32_closed','vsv_0.6b_fp32_poisson']};
  const rows=(eng,mode)=>D.srv.filter(r=>r.engine===eng&&MAIN[eng].includes(r.tag)&&r.mode===mode&&r.n_ok>0&&!r.prefix_words);
  const lvl=r=>r.mode==='closed'?r.conc:r.rate;
  // one point per load level: median over seeds of x (throughput) and y (latency), range as min..max of y
  function points(eng,mode,met){
    const rs=rows(eng,mode);const lv=[...new Set(rs.map(lvl))].sort((a,b)=>a-b);
    return lv.map(v=>{const g=rs.filter(r=>lvl(r)===v);const ys=g.map(r=>r[met]*1000);const xs=g.map(r=>r.out_tok_per_s);
      return [B.med(xs),B.med(ys),Math.min(...ys),Math.max(...ys),eng+', '+(mode==='closed'?v+' users':v+' requests/s offered')+': '+B.f(B.med(xs))+' tokens/s, '+B.f(B.med(ys))+' ms ('+g.length+' runs)',v]})}
  function drawCurve(){
    const e=$('bch-cv-eng').value,mode=$('bch-cv-mode').value,met=$('bch-cv-met').value;
    const engs=e==='all'?Object.keys(MAIN):[e];
    const ser=engs.map(n=>({name:n,color:COL[n],ordered:true,ptlab:true,pts:points(n,mode,met)})).filter(s=>s.pts.length);
    const nm=$('bch-cv-met').selectedOptions[0].textContent;
    const cap=$('bch-cv-cap');
    if(!ser.length){$('bch-cv-plot').innerHTML='<p class="mute" style="padding:10px">No '+(mode==='closed'?'closed-loop':'open-loop')+' runs for this engine: vLLM on 4 CPU cores was measured in closed loop only (an open-loop sweep at its 0.1 to 0.3 requests/s would have held the shared machine for hours).</p>';$('bch-cv-leg').innerHTML='';cap.textContent='';return}
    const ylog=ser.some(s=>s.pts.some(p=>p[3]>20*Math.max(1,Math.min(...s.pts.map(q=>q[1])))));
    B.chart({el:$('bch-cv-plot'),legend:$('bch-cv-leg'),series:ser,xlab:'output tokens/s achieved (whole run)',ylab:nm+' (ms'+(ylog?', log scale':'')+')',ylog:ylog,ymin:ylog?undefined:0,label:'Latency against throughput'});
    const lab=mode==='closed'?'users':'requests/s';
    cap.innerHTML='Each point is one load level, labelled with its '+(mode==='closed'?'number of users':'offered rate in requests/s')+' and joined in order of load ('+ser.map(s=>s.name+': '+s.pts.map(p=>p[5]).join(', ')).join('; ')+' '+lab+'), median over seeds, bar from the lowest to the highest seed. '+
      (mode==='poisson'?'Read it left to right: as the offered rate rises, throughput rises until the engine saturates, then only latency rises. The bend is where to run a server, a little before it. ':'Closed loop limits itself: when the server slows, users send less, so throughput never collapses; latency still grows with every user added. ')+
      (ser.some(s=>s.name==='MLX')&&mode==='poisson'?'MLX points stop at 2 requests/s: above that its server ran out of memory (see Engines side by side). ':'');
  }
  ['bch-cv-eng','bch-cv-mode','bch-cv-met'].forEach(id=>$(id).addEventListener('change',drawCurve));
  // goodput: requests per second meeting both limits, per closed-loop level
  function drawSLO(){
    const tl=+$('bch-slo-t').value,pl=+$('bch-slo-p').value,eng=$('bch-slo-eng').value;
    $('bch-slo-tv').textContent=B.f(tl);$('bch-slo-pv').textContent=B.f(pl);
    const rs=rows(eng,'closed');const lv=[...new Set(rs.map(r=>r.conc))].sort((a,b)=>a-b);
    const thr=[],good=[];let best=null;
    lv.forEach(c=>{const g=rs.filter(r=>r.conc===c);
      const t=g.map(r=>r.req_per_s);const gd=g.map(r=>{const ok=r.rq.filter(q=>q[0]<=tl&&q[1]<=pl).length;return r.req_per_s*ok/Math.max(1,r.rq.length)});
      thr.push([c,B.med(t),Math.min(...t),Math.max(...t),eng+', '+c+' users: '+B.f(B.med(t),2)+' requests/s completed']);
      good.push([c,B.med(gd),Math.min(...gd),Math.max(...gd),eng+', '+c+' users: '+B.f(B.med(gd),2)+' requests/s met the SLO']);
      if(!best||B.med(gd)>best[1])best=[c,B.med(gd)]});
    B.chart({el:$('bch-slo-plot'),legend:$('bch-slo-leg'),series:[{name:'throughput (all completed requests)',color:'var(--mute)',dash:'4 3',pts:thr},{name:'goodput (requests meeting the SLO)',color:COL[eng],pts:good}],
      xlog:true,xticks:lv,xlab:'concurrent users (closed loop, log scale)',ylab:'requests/s',ymin:0,label:'Goodput against concurrency'});
    $('bch-slo-cap').innerHTML='With TTFT &#8804; '+B.f(tl)+' ms and TPOT &#8804; '+B.f(pl)+' ms, '+eng+' delivers the most useful work at <b>'+best[0]+' users</b> ('+B.f(best[1],2)+' requests/s meeting the SLO). Goodput per request is checked against each request\'s own TTFT and TPOT, not against percentiles. For scale, <a href="https://github.com/mlcommons/inference_policies/blob/master/inference_rules.adoc" target="_blank" rel="noopener noreferrer">MLPerf Inference\'s rules</a> ask a Llama 3.1 8B server for p99 TTFT &#8804; 2,000 ms and p99 TPOT &#8804; 100 ms (500 and 30 in its interactive variant; read 2026-10-08).';
  }
  ['bch-slo-t','bch-slo-p'].forEach(id=>$(id).addEventListener('input',drawSLO));$('bch-slo-eng').addEventListener('change',drawSLO);
  B.onRender(()=>{drawCurve();drawSLO()});
})();
