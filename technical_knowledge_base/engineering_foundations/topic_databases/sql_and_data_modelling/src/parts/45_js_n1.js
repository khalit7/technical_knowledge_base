// ---- Reading, section 12: the N+1 measurement (inputs/n1.json), with the round-trip model checked against it ----
(function(){
  const bars=document.getElementById('rd-n1-bars');if(!bars)return;
  const N1=window.SM_DATA.n1;
  const NM={lazy:'lazy loading (default)',selectinload:'selectinload',joinedload:'joinedload',one_sql:'one SQL query'};
  const COL={lazy:'var(--bad)',selectinload:'var(--c1)',joinedload:'var(--c4)',one_sql:'var(--good)'};
  let n=50,path='proxy_1ms';
  const run=(p,nn)=>N1.runs.find(r=>r.path===p&&r.n===nn);
  // compare with the repeat run kept in src/inputs/n1_repeat.json
  function rep(){let mx=1,lazyMax=true;(N1.repeat||[]).forEach(q=>{const r=run(q.path,q.n);if(!r)return;Object.keys(q.ms).forEach(w=>{const a=r.ways[w].median_ms,b=q.ms[w];mx=Math.max(mx,a/b,b/a)});
      const m=Math.max(...Object.values(q.ms));if(q.ms.lazy!==m)lazyMax=false});
    return 'An earlier run with the same setup (src/inputs/n1_repeat.json) differed from this one by up to '+mx.toFixed(1)+'x on individual medians'+(lazyMax?', and lazy loading was the slowest method in every one of its cases too.':'.')}
  function draw(){
    const r=run(path,n);if(!r){bars.innerHTML='';return}
    const ws=Object.keys(NM),mx=Math.max(...ws.map(w=>r.ways[w].median_ms));
    bars.innerHTML=ws.map(w=>{const v=r.ways[w];return '<div class="row"><div class="nm">'+NM[w]+' <span class="mute">('+v.queries+' quer'+(v.queries===1?'y':'ies')+')</span></div><div class="track"><div class="fill" style="width:'+(100*v.median_ms/mx).toFixed(1)+'%;background:'+COL[w]+'"></div></div><div class="val">'+v.median_ms.toFixed(1)+' ms</div></div>'}).join('');
    const d=run('direct',n),p=run('proxy_1ms',n);
    // model: the proxy adds one extra round trip cost per query; predicted = direct time + queries x (proxy RTT - direct RTT)
    const extra=p.select1_ms-d.select1_ms,pred=d.ways.lazy.median_ms+d.ways.lazy.queries*extra;
    document.getElementById('rd-n1-stats').innerHTML=RD.stat('Lazy against selectinload',(r.ways.lazy.median_ms/r.ways.selectinload.median_ms).toFixed(1)+'x slower','N = '+n+', '+(path==='direct'?'same machine':'through the proxy'))+
      RD.stat('Round trip of SELECT 1',r.select1_ms.toFixed(2)+' ms',path==='direct'?'same machine':'through the proxy')+
      RD.stat('Lazy, predicted through the proxy',pred.toFixed(0)+' ms','direct time + '+d.ways.lazy.queries+' queries x '+extra.toFixed(2)+' ms; measured '+p.ways.lazy.median_ms.toFixed(0)+' ms');
    document.getElementById('rd-n1-note').innerHTML='Lazy loading grows with N times the round trip; the other three barely notice the network. The prediction line is the whole model of N+1: time is roughly the number of queries times the round trip. On a laptop the database answers each tiny query in a fraction of a millisecond, which is why N+1 hides in development. p10 to p90 for lazy loading here: '+r.ways.lazy.p10_ms.toFixed(1)+' to '+r.ways.lazy.p90_ms.toFixed(1)+' ms. Measured '+RD.esc(N1.date)+' on a shared laptop. '+rep()+'';
  }
  RD.seg(document.getElementById('rd-n1-n'),v=>{n=+v;draw()});
  RD.seg(document.getElementById('rd-n1-p'),v=>{path=v;draw()});
  draw();
})();
