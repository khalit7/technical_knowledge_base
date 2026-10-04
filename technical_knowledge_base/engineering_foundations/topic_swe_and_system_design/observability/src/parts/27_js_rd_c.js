// ---- Reading: dashboard panels, telemetry sizing table, glossary ----
(function(){
  const D=window.DEMO,$=id=>document.getElementById(id);
  const fmt=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  const P=[['Requests per second',[{pts:D.series.rps,color:'var(--c1)'}],v=>v.toFixed(0)],
    ['Share of requests failing (5xx)',[{pts:D.series.err,color:'var(--bad)'}],v=>(100*v).toFixed(1)+'%'],
    ['Latency: p50 and p99',[{pts:D.series.p50,color:'var(--good)',label:'p50'},{pts:D.series.p99,color:'var(--bad)',label:'p99'}],v=>v.toFixed(1)+' s'],
    ['Calls to retrieval: p99, as chat-api sees them',[{pts:D.series.dep_p99,color:'var(--c3)'}],v=>v.toFixed(1)+' s']];
  const g=$('db-grid');g.innerHTML=P.map((p,i)=>'<div><div class="small" style="font-weight:600">'+p[0]+'</div><div class="chart" id="db-'+i+'"></div></div>').join('');
  function draw(){P.forEach((p,i)=>LC($('db-'+i),{series:p[1],x0:0,x1:225,band:[90,180],h:130,yfmt:p[2],label:p[0]}))}
  RD.onRender(draw);RD.onResize(draw);draw();

  // telemetry sizing for the chat product
  const N=10e6,spr=WF.byId(D.highlight.typical).sp.length,spm=spr*N*30;
  const keep=D.sampling.tail_kept/D.sampling.incident_traces,C=window.OBS_COST;
  const cpu=D.bench.one_request_all_telemetry*1e-6*N/86400;
  const rows=[
    ['Messages a day','10,000,000','parent root\'s estimate'],
    ['Spans per message (measured)',fmt(spr),'chat-api 6, retrieval 2'],
    ['Spans per 30 days, unsampled',fmt(spm/1e9,1)+' billion','above Honeycomb Pro\'s 750 million a month'],
    ['... tail-sampled as in the demo',fmt(spm*keep/1e6)+' million','keeps '+fmt(100*keep,1)+'%, the incident-phase share; normal traffic keeps less'],
    ['Log data per 30 days',fmt(C.gbm)+' GB','$'+fmt(C.ing)+' to ingest at $0.10/GB'],
    ['Log lines indexed per 30 days',fmt(C.lines/1e6)+' million','$'+fmt(C.idx)+' at $1.70 per million (15 days)'],
    ['Latency histogram series','2,400','12 per combination &times; 5 routes &times; 4 statuses &times; 10 servers (calculator defaults)'],
    ['CPU spent emitting telemetry',fmt(cpu,3)+' cores, averaged','96 &micro;s per message (Profiling) &times; '+fmt(N/86400)+' messages a second']];
  $('tc-table').querySelector('tbody').innerHTML=rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num"><b>'+r[1]+'</b></td><td class="small mute">'+r[2]+'</td></tr>').join('');
  window.OBS_SIZE={spr,spm,keep,cpu};

})();
