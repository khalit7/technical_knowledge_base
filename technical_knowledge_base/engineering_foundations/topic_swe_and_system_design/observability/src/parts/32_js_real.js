// ---- Real telemetry tab: browse the demo run ----
(function(){
  const D=window.DEMO,$=id=>document.getElementById(id),esc=RD.esc;
  const fmt=(v,d)=>v.toLocaleString('en-US',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
  let view='req',cur=D.highlight.slow,drawn=false;
  RD.seg($('rl-seg'),m=>{view=m;['req','met','pq','cfg'].forEach(k=>{$('rl-'+k).hidden=k!==m});render()});
  // quick picks
  const Q=[['Typical (normal phase)',D.highlight.typical],['Slowest success',D.highlight.slow],['A timeout (503)',D.highlight.error]];
  $('rl-quick').innerHTML=Q.map(q=>'<button data-id="'+q[1]+'">'+q[0]+'</button>').join('');
  $('rl-quick').addEventListener('click',e=>{const b=e.target.closest('button');if(b){cur=b.dataset.id;drawScat();drawTrace()}});
  const tset={};D.traces.forEach(t=>tset[t.id]=t);
  function drawScat(){
    const el=$('rl-scat'),W=RD.width(el),H=230,L=46,R=10,T=10,B=26,X1=225,Y1=1700;
    const xs=v=>L+(W-L-R)*v/X1,ys=v=>T+(H-T-B)*(1-v/Y1);
    let b='<rect x="'+xs(90)+'" y="'+T+'" width="'+(xs(180)-xs(90))+'" height="'+(H-T-B)+'" fill="var(--bad)" opacity=".07"/>';
    [0,500,1000,1500].forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+ys(v)+'" y2="'+ys(v)+'" stroke="var(--line)"/>'+RD.t(L-4,ys(v)+4,v+' ms',{a:'end',fs:10,fill:'var(--mute)'})});
    for(let v=0;v<=X1;v+=45)b+=RD.t(xs(v),H-8,v+' s',{a:v===X1?'end':'middle',fs:10,fill:'var(--mute)'});
    for(let i=0;i<D.reqs.length;i+=3){const t=D.reqs[i],ms=D.reqs[i+1],s=D.reqs[i+2];
      b+='<circle cx="'+xs(t).toFixed(1)+'" cy="'+ys(Math.min(ms,Y1)).toFixed(1)+'" r="1.7" fill="'+(s>=500?'var(--bad)':'var(--c1)')+'" opacity="'+(s>=500?.95:.45)+'"/>'}
    D.traces.forEach(t=>{const sel=t.id===cur;b+='<circle class="tdot" data-id="'+t.id+'" cx="'+xs(t.t).toFixed(1)+'" cy="'+ys(Math.min(t.dur,Y1)).toFixed(1)+'" r="'+(sel?7:5)+'" fill="'+(sel?'var(--c5)':'transparent')+'" fill-opacity="'+(sel?.5:0)+'" stroke="'+(t.err?'var(--bad)':'var(--ink)')+'" stroke-width="'+(sel?2.4:1.3)+'" style="cursor:pointer"><title>trace '+t.id.slice(0,8)+': '+fmt(t.dur)+' ms at +'+fmt(t.t,1)+' s</title></circle>'});
    el.innerHTML='<div class="leg"><span style="--sw:var(--c1)">request (load generator)</span><span style="--sw:var(--bad)">503 error</span><span style="--sw:var(--ink)">ringed: trace kept, click it</span></div>'+RD.svg(W,H,b,'Every request of the demo run');
    el.querySelector('svg').addEventListener('click',e=>{const c=e.target.closest('.tdot');if(c){cur=c.dataset.id;drawScat();drawTrace()}});
  }
  function drawTrace(){
    const t=tset[cur];if(!t)return;
    const logs=(D.xlogs[t.id]||[]);
    $('rl-trace').innerHTML='<h3>Trace '+t.id+'</h3><p class="small mute">Started at +'+fmt(t.t,2)+' s ('+(t.t<90?'normal':t.t<180?'incident':'recovery')+' phase); '+fmt(t.dur)+' ms at chat-api; '+(t.err?'<span style="color:var(--bad)">error</span>':'ok')+'; '+t.sp.length+' spans in 2 processes.</p>'+
      '<div class="wf" id="rl-wf"></div><div class="kvs" id="rl-kv" style="max-height:240px"></div><h3>Its log lines, both services (joined by trace_id)</h3>'+
      '<div class="logbox">'+logs.map(l=>'<div class="'+(l.indexOf('"level":"ERROR"')>=0?'e':'')+'">'+esc(l)+'</div>').join('')+'</div>';
    WF.render($('rl-wf'),t,{onSel:i=>{$('rl-kv').textContent=WF.detail(t,i)}});
    $('rl-kv').textContent=WF.detail(t,0);
  }
  let mf='prom';
  RD.seg($('rl-fmt'),m=>{mf=m;$('rl-mtext').textContent=(mf==='om'?D.metrics_om:D.metrics_text).join('\n')});
  $('rl-mtext').textContent=D.metrics_text.join('\n');$('rl-nser').textContent=D.series_exposed_total;
  const PQ=[['Requests per second','rps',v=>v.toFixed(0)],['Average latency','avg',v=>v.toFixed(2)+' s'],['p50 latency','p50',v=>v.toFixed(2)+' s'],['p99 latency','p99',v=>v.toFixed(1)+' s'],['Share failing','err',v=>(100*v).toFixed(1)+'%'],['Retrieval p99 (client side)','dep_p99',v=>v.toFixed(1)+' s']];
  $('rl-pqgrid').innerHTML=PQ.map((p,i)=>'<div><div class="small" style="font-weight:600">'+p[0]+'</div><code style="font-size:10.5px;overflow-wrap:anywhere;display:block;color:var(--mute)">'+esc(D.queries[p[1]])+'</code><div class="chart" id="rl-pq'+i+'"></div></div>').join('');
  $('rl-raw').textContent=JSON.stringify(D.raw_example,null,1);
  const CF={rules:'Prometheus rules file for chat-api: recording rules for each window, then the workbook\'s approach 6 (Table 5-8) as a page and a ticket, each with a runbook_url. <code>promtool check rules</code>: "SUCCESS: 9 rules found" (Prometheus 3.15.0).',
    ruletest:'Unit test for the rules: three clean days, then 10 minutes at 15% errors. <code>promtool test rules slo_rules_test.yml</code> passes: no alert at minute 5, a page from minute 6 to minute 13, nothing at minute 14 or 2 h later.',
    otelcol:'An OpenTelemetry Collector gateway: OTLP in; memory_limiter, the tail-sampling policy from the Reading tab, and batching; traces to Tempo, metrics to Prometheus (remote write), logs to Loki. <code>otelcol-contrib validate</code> (0.162.0): valid. The endpoints are placeholders; it was validated, not run.'};
  RD.seg($('rl-cfgsel'),m=>showCfg(m));
  function showCfg(m){$('rl-cfgnote').innerHTML=CF[m];$('rl-cfgtext').textContent=D.configs[m]}
  showCfg('rules');
  function render(){
    if(view==='req'){drawScat();drawTrace()}
    if(view==='pq')PQ.forEach((p,i)=>LC($('rl-pq'+i),{series:[{pts:D.series[p[1]],color:'var(--c1)'}],x0:0,x1:225,band:[90,180],h:120,yfmt:p[2],label:p[0]}));
  }
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-real']=[render];
  addEventListener('resize',()=>{const t=$('t-real');if(t&&!t.hidden)render()});
})();
