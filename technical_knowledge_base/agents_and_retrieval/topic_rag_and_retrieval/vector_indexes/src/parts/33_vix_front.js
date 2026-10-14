// ---- Frontier tab (t-vixfront): measured recall / QPS / bytes for every family (data/results.json, bench_*) ----
(function(){
  const B=window.VIX&&window.VIX.r&&window.VIX.r.bench;if(!B)return;
  const $=id=>document.getElementById(id),esc=RD.esc;
  const FAM={flat:['Flat (exact)','var(--ink)'],ivf:['IVF-Flat','var(--c1)'],ivfpq:['IVF-PQ','var(--c2)'],sq:['Scalar int8','var(--c3)'],binary:['Binary + rescore','var(--c5)'],hnsw:['FAISS HNSW','var(--c4)'],hnswlib:['hnswlib HNSW','var(--c6)']};
  const BUD=[64,256,512,1024,2048,1e9],BUDL=['64 B','256 B','512 B','1 KB','2 KB','no limit'];
  const st={set:'scifact',bud:5,y:'lin',off:{}};
  function rows(){return (B[st.set]||{rows:[]}).rows}
  function legend(){$('vix-f-leg').innerHTML=Object.keys(FAM).filter(f=>rows().some(r=>r.family===f)).map(f=>'<label><input type="checkbox" data-f="'+f+'"'+(st.off[f]?'':' checked')+'><i style="background:'+FAM[f][1]+'"></i>'+FAM[f][0]+'</label>').join('');
    $('vix-f-leg').querySelectorAll('input').forEach(c=>c.addEventListener('change',()=>{st.off[c.dataset.f]=!c.checked;draw()}))}
  function vis(r){return !st.off[r.family]&&r.bytes_per_vector<=BUD[st.bud]}
  function pareto(rs){const s=rs.slice().sort((a,b)=>b.qps-a.qps);let best=-1;const out=new Set();for(const r of s){if(r.recall10>best){out.add(r);best=r.recall10}}return out}
  function draw(){
    $('vix-f-bv').textContent=BUDL[st.bud];
    const all=rows(),R=all.filter(vis),P=pareto(R);const W=Math.max(280,Math.min(RD.width($('vix-f-plot')),860)),H=Math.round(Math.min(460,W*0.62));
    const L=48,Rm=12,T=10,Bm=34;
    const qs=all.map(r=>r.qps),x0=Math.log10(Math.min(...qs)*0.8),x1=Math.log10(Math.max(...qs)*1.25);
    const ylog=st.y==='log';const yv=r=>ylog?Math.log10(Math.max(1e-4,1-r.recall10)):r.recall10;
    let y0,y1;if(ylog){y0=0;y1=-4}else{y0=Math.max(0,Math.min(...all.map(r=>r.recall10))-0.03);y1=1.005}
    const X=v=>L+(Math.log10(v)-x0)/(x1-x0)*(W-L-Rm),Y=v=>T+(1-(v-y0)/(y1-y0))*(H-T-Bm);
    let s='';
    for(let e=Math.ceil(x0);e<=Math.floor(x1);e++){const x=X(Math.pow(10,e));s+='<line x1="'+x+'" y1="'+T+'" x2="'+x+'" y2="'+(H-Bm)+'" stroke="var(--line)"/>'+RD.t(x,H-Bm+14,e>=3?(Math.pow(10,e)/1000)+'k':String(Math.pow(10,e)),{a:'middle',fs:10,fill:'var(--mute)'})}
    const yt=ylog?[0,-1,-2,-3,-4]:[0.5,0.6,0.7,0.8,0.9,1.0].filter(v=>v>=y0);
    yt.forEach(v=>{const y=Y(v);s+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-Rm)+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+3,ylog?(v===0?'0':(1-Math.pow(10,v)).toFixed(-v)):v.toFixed(1),{a:'end',fs:10,fill:'var(--mute)'})});
    s+=RD.t((L+W)/2,H-4,'queries per second, one thread (log)',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(L+4,T+10,'recall@10',{fs:11,fill:'var(--mute)'});
    // lines per family and build (rows sharing family and params other than the knob)
    const groups={};R.forEach(r=>{const k=r.family+'|'+(r.params.M||'')+'|'+(r.params.m||'')+'|'+(r.params.rescore||'')+'|'+(r.params.nlist||'');(groups[k]=groups[k]||[]).push(r)});
    Object.values(groups).forEach(g=>{if(g.length<2)return;g.sort((a,b)=>b.qps-a.qps);s+='<polyline fill="none" stroke="'+FAM[g[0].family][1]+'" stroke-width="1.3" opacity="0.6" points="'+g.map(r=>X(r.qps).toFixed(1)+','+Y(yv(r)).toFixed(1)).join(' ')+'"/>'});
    const pf=[...P].sort((a,b)=>a.qps-b.qps);if(pf.length>1)s+='<polyline fill="none" stroke="var(--ink)" stroke-dasharray="4 3" stroke-width="1" points="'+pf.map(r=>X(r.qps).toFixed(1)+','+Y(yv(r)).toFixed(1)).join(' ')+'"/>';
    R.forEach(r=>{const rad=2.5+Math.min(5,Math.log2(1+r.bytes_per_vector/64));s+='<circle cx="'+X(r.qps).toFixed(1)+'" cy="'+Y(yv(r)).toFixed(1)+'" r="'+rad.toFixed(1)+'" fill="'+FAM[r.family][1]+'" opacity="0.85"'+(P.has(r)?' stroke="var(--ink)" stroke-width="1.6"':'')+'><title>'+esc(r.label)+': recall '+r.recall10.toFixed(3)+', '+r.qps+' QPS ('+r.ms_p50+' ms median), '+r.bytes_per_vector+' bytes per vector</title></circle>'});
    $('vix-f-plot').innerHTML=RD.svg(W,H,s,'Recall against queries per second');
    const D=B[st.set];$('vix-f-cap').textContent='Point size grows with bytes per vector. '+D.n.toLocaleString('en-US')+' vectors, '+D.d+' dimensions, '+D.queries+' queries; '+R.length+' of '+all.length+' settings shown. Load average (1 min) during the runs: '+Math.min(...all.map(r=>r.load[0])).toFixed(1)+' to '+Math.max(...all.map(r=>r.load[0])).toFixed(1)+' on 10 cores. Sub-millisecond timings move with that load: where a curve is not monotonic (a larger nprobe or ef answering faster), that is noise; the three passes are in each row\'s data.';
    const bestAt=t=>{const c=R.filter(r=>r.recall10>=t).sort((a,b)=>b.qps-a.qps)[0];return c?c.label+' ('+c.qps.toLocaleString('en-US')+' QPS)':'none in budget'};
    $('vix-f-stats').innerHTML=RD.stat('Fastest at recall &ge; 0.90',bestAt(0.9),'')+RD.stat('Fastest at recall &ge; 0.99',bestAt(0.99),'')+RD.stat('Exact search',(all.find(r=>r.family==='flat')||{}).qps?(all.find(r=>r.family==='flat').qps.toLocaleString('en-US')+' QPS'):'','recall 1.0');
    const blds=D.builds||[];
    $('vix-f-tab').innerHTML='<table><tr><th>Setting</th><th class="num">recall@10</th><th class="num">QPS</th><th class="num">ms p50 / p95</th><th class="num">bytes per vector</th><th class="num">load</th></tr>'+all.slice().sort((a,b)=>b.recall10-a.recall10||b.qps-a.qps).map(r=>'<tr class="'+(vis(r)?'':'off')+'"><td class="'+(P.has(r)?'hl':'')+'">'+esc(r.label)+'</td><td class="num">'+r.recall10.toFixed(3)+'</td><td class="num">'+r.qps.toLocaleString('en-US')+'</td><td class="num">'+r.ms_p50+' / '+r.ms_p95+'</td><td class="num">'+r.bytes_per_vector.toLocaleString('en-US')+'</td><td class="num">'+r.load[0].toFixed(1)+'</td></tr>').join('')+'</table>'+
      '<p class="small mute">Build times on one thread: '+blds.map(b=>esc(b.label)+' '+b.build_s+' s').join('; ')+'. Bold: on the Pareto frontier within the budget.</p>'}
  RD.seg($('vix-f-set'),v=>{st.set=v;legend();draw()});
  $('vix-f-b').addEventListener('input',e=>{st.bud=+e.target.value;draw()});
  $('vix-f-y').addEventListener('change',e=>{st.y=e.target.value;draw()});
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-vixfront']=[draw];
  addEventListener('resize',()=>{if(!$('t-vixfront').hidden)draw()});
  legend();draw();
})();
