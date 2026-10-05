// ---- Part 3 (rs): Service benchmark tab (measured, from src/rs/bench/results) ----
(function(){
  const D=window.RS_DATA,host=document.getElementById('rs-bm-chart');if(!D||!host)return;
  const S=D.bench.summary,CF=[['axum-1','axum, 1 worker thread','var(--c1)'],['axum-4','axum, 4 worker threads','var(--c1)'],['fastapi-1','FastAPI, 1 uvicorn worker','var(--c2)'],['fastapi-4','FastAPI, 4 uvicorn workers','var(--c2)']];
  const LOADS=[['health','GET /health, 32 conn.'],['count','POST /count 1 KB, 32 conn.'],['count_log','POST /count_log 391 KB, 8 conn.'],['count@1000/s','/count at 1000/s (open loop)'],['count_log@20/s','/count_log at 20/s (open loop)']];
  const UNIT={rps:'req/s',p50_ms:'ms',p99_ms:'ms',peak_rss_mb:'MB'},NAME={rps:'Requests per second',p50_ms:'Median latency',p99_ms:'99th percentile latency',peak_rss_mb:'Peak resident memory'};
  let load='count_log',metric='rps';
  const lb=document.getElementById('rs-bm-load');lb.innerHTML=LOADS.map(([k,n])=>'<button data-m="'+k+'"'+(k===load?' class="on"':'')+'>'+n+'</button>').join('');
  function row(cfg){return S.find(r=>r.cfg===cfg&&r.load===load)}
  function range(cfg){const rs=D.bench.runs.filter(r=>r.cfg===cfg&&r.load===load);const k=metric==='peak_rss_mb'?'peak_rss_mb':metric;const v=rs.map(r=>r[k]);return [Math.min(...v),Math.max(...v)]}
  function draw(){
    const w=RD.width(host),narrow=w<520,lw=narrow?4:Math.min(190,w*0.4),x0=lw,x1=w-70,bh=20,gap=narrow?24:10;let y=narrow?18:8,s='';
    const vals=CF.map(([c])=>{const r=row(c);return r?r[metric]:NaN}),hi=Math.max(...CF.map(([c])=>range(c)[1]).filter(Number.isFinite));
    const X=v=>x0+(x1-x0)*v/(hi*1.02);
    CF.forEach(([c,n,col],i)=>{const v=vals[i],[lo,up]=range(c);
      s+=narrow?RD.t(4,y-5,n,{fs:12}):RD.t(4,y+14,n,{fs:12});
      s+='<rect x="'+x0+'" y="'+y+'" width="'+Math.max(1,X(v)-x0)+'" height="'+bh+'" rx="3" fill="'+col+'" opacity="'+(c.endsWith('1')?0.6:1)+'"/>';
      s+='<line x1="'+X(lo)+'" x2="'+X(up)+'" y1="'+(y+bh/2)+'" y2="'+(y+bh/2)+'" stroke="var(--ink)" stroke-width="1.2"/><line x1="'+X(lo)+'" x2="'+X(lo)+'" y1="'+(y+5)+'" y2="'+(y+bh-5)+'" stroke="var(--ink)"/><line x1="'+X(up)+'" x2="'+X(up)+'" y1="'+(y+5)+'" y2="'+(y+bh-5)+'" stroke="var(--ink)"/>';
      s+=RD.t(Math.max(X(v),X(up))+6,y+14,RS.fmt(v,metric==='rps'||metric==='peak_rss_mb'?0:2),{fs:12,w:600});y+=bh+gap});
    host.innerHTML=RD.svg(w,y-(narrow?14:0),s,NAME[metric]);
    const a4=row('axum-4'),f4=row('fastapi-4'),r=a4&&f4?a4[metric]/f4[metric]:NaN;
    document.getElementById('rs-bm-cap').innerHTML=NAME[metric]+' ('+UNIT[metric]+'), '+LOADS.find(l=>l[0]===load)[1]+'. 4 workers each: axum / FastAPI = <b>'+RS.fmt(r,metric==='rps'?1:2)+'&times;</b>'+(metric==='rps'?' (higher is better)':' (lower is better)')+'. Median load average during these runs: '+RS.fmt(RS.med(D.bench.runs.filter(x=>x.load===load).map(x=>x.load1)),1)+'.';
  }
  function drawB(){
    const el=document.getElementById('rs-bm-b'),rs=D.benchB.runs,w=RD.width(el);
    const M=[['inline','counting inline on the async worker','var(--bad)'],['spawn_blocking','counting with spawn_blocking','var(--good)']];
    let h='<div class="tw"><table><thead><tr><th>Mode</th><th class="num">/health p50</th><th class="num">p99</th><th class="num">p99.9</th><th class="num">/count_log req/s</th><th class="num">runs</th></tr></thead><tbody>';
    M.forEach(([m,n])=>{const x=rs.filter(r=>r.mode===m),f=k=>RS.med(x.map(r=>r[k])),rg=k=>RS.fmt(Math.min(...x.map(r=>r[k])),1)+' to '+RS.fmt(Math.max(...x.map(r=>r[k])),1);
      h+='<tr><td>'+n+'</td><td class="num"><b>'+RS.fmt(f('p50_ms'),2)+' ms</b><br><span class="small mute">'+rg('p50_ms')+'</span></td><td class="num">'+RS.fmt(f('p99_ms'),1)+' ms<br><span class="small mute">'+rg('p99_ms')+'</span></td><td class="num">'+RS.fmt(f('p999_ms'),1)+' ms</td><td class="num">'+RS.fmt(f('bg_rps'),0)+'</td><td class="num">'+x.length+'</td></tr>'});
    el.innerHTML=h+'</tbody></table></div><p class="small mute">Medians of '+rs.length/2+' rounds each, ranges underneath; load average '+RS.fmt(RS.med(rs.map(r=>r.load1)),1)+'. Offloading also raised /count_log throughput: the 2 async workers no longer cap how many counts run at once.</p>';
  }
  function runs(){
    const el=document.getElementById('rs-bm-runs');let h='<table><thead><tr><th>Round</th><th>Config</th><th>Load</th><th class="num">req/s</th><th class="num">p50 ms</th><th class="num">p99 ms</th><th class="num">RSS MB</th><th class="num">load avg</th></tr></thead><tbody>';
    D.bench.runs.filter(r=>r.load===load).forEach(r=>{h+='<tr><td>'+r.round+'</td><td>'+r.cfg+'</td><td>'+RS.esc(r.load)+'</td><td class="num">'+RS.fmt(r.rps,0)+'</td><td class="num">'+RS.fmt(r.p50_ms,2)+'</td><td class="num">'+RS.fmt(r.p99_ms,2)+'</td><td class="num">'+RS.fmt(r.peak_rss_mb,1)+'</td><td class="num">'+RS.fmt(r.load1,1)+'</td></tr>'});
    el.innerHTML=h+'</tbody></table><p class="small mute">Showing the selected load. Started '+RS.esc(D.bench.env.started)+', '+D.bench.env.seconds+' s in all.</p>';
    const l1=D.bench.runs.map(r=>r.load1);document.getElementById('rs-bm-load1').textContent=RS.fmt(Math.min(...l1),1)+' to '+RS.fmt(Math.max(...l1),1);
  }
  function all(){draw();drawB();runs()}
  RD.seg(lb,m=>{load=m;draw();runs()});RD.seg(document.getElementById('rs-bm-metric'),m=>{metric=m;draw()});
  RS.reg('t-rs-bench',all);RS.onResize('t-rs-bench',all);
})();
