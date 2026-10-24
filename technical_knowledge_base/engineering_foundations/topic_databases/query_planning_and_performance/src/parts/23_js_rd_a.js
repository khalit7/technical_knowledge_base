// ---- Reading tab: static visuals drawn from QPD (measured data) ----
(function(){
const Q=window.QPD,E=RD.esc,$=id=>document.getElementById(id);
const f=(x,d)=>Number(x).toLocaleString('en-GB',{minimumFractionDigits:d||0,maximumFractionDigits:d||0});
const ms=x=>x>=100?f(x):x>=10?f(x,1):x>=1?f(x,2):f(x,3);
window.QPF={f,ms};
// bars: rows [{nm,v,lab,c,hl}], log scale optional
function bars(el,rows,o){o=o||{};QPG.hbars(el,[{rows:rows.map(r=>({label:r.nm,v:r.v,txt:r.lab,col:r.c,hl:r.hl}))}],{log:o.log,label:o.label||''})}
window.QPB=bars;
// 1. MCV list against the truth, or the tokens histogram
function mcv(m){const el=$('rd-mcv'),cap=$('rd-mcv-cap');
  if(m==='country'){const c=Q.stats.country,tr={};c.actual.forEach(a=>tr[a.country]=a.n/1e5);
    el.innerHTML='<div class="hmleg"><span><i style="display:inline-block;width:10px;height:10px;background:var(--c1);margin-right:4px"></i>stored in pg_stats (sample of 30,000 rows)</span><span><i style="display:inline-block;width:10px;height:10px;background:var(--c3);margin-right:4px"></i>true share (all 100,000 rows)</span></div>'+
      '<div class="bars">'+c.mcv.map((k,i)=>{const a=c.mcf[i],b=tr[k],mx=c.mcf[0]*1.08;return '<div class="row"><span class="nm">'+k+'</span><span class="track" style="height:16px"><span class="fill" style="width:'+(100*a/mx).toFixed(1)+'%;background:var(--c1);bottom:50%"></span><span class="fill" style="width:'+(100*b/mx).toFixed(1)+'%;background:var(--c3);top:50%"></span></span><span class="val">'+(100*a).toFixed(2)+'%</span></div>'}).join('')+'</div>';
    cap.textContent='All 20 countries fit in the MCV list (target 100), so every equality estimate on country uses a stored frequency. The sample gets the shares right to within about one percentage point: US stored at '+(100*c.mcf[0]).toFixed(2)+'%, truly '+(100*tr.US).toFixed(2)+'%.';
  }else{const h=Q.stats.tokens_hist,W=RD.width(el),H=70,lo=h[0],hi=h[h.length-1],x=v=>8+(W-16)*(v-lo)/(hi-lo);let b='';
    for(let i=0;i<h.length-1;i++){const x0=x(h[i]),x1=x(h[i+1]);b+='<rect x="'+x0.toFixed(1)+'" y="14" width="'+Math.max(.6,x1-x0-.4).toFixed(1)+'" height="34" fill="'+(i%2?'var(--c1)':'var(--c6)')+'" opacity=".75"><title>'+h[i]+' to '+h[i+1]+' tokens</title></rect>'}
    [lo,200,500,1000,hi].forEach(v=>{b+=RD.t(x(v),62,f(v),{a:v===lo?'start':v===hi?'end':'middle',fs:10.5,fill:'var(--mute)'})});
    b+=RD.t(8,10,'messages.tokens: 100 buckets, each holding the same number of rows',{fs:11,fill:'var(--mute)'});
    el.innerHTML='<div class="rd-svg">'+RD.svg(W,H,b,'histogram buckets')+'</div>';
    cap.textContent='The '+h.length+' stored bounds of messages.tokens (after its '+Q.stats.tokens_mcv_n+' most common values are set aside). Each bucket holds the same share of rows, so buckets are narrow where values are dense (short user messages, 10 to 200 tokens) and wide where they are rare (long replies). An estimate for tokens < 200 counts whole buckets and interpolates inside the one containing 200.'}}
RD.seg($('rd-mcv-seg'),mcv);RD.onRender(()=>mcv(($('rd-mcv-seg').querySelector('.on')||{}).dataset.m||'country'));RD.onResize(()=>mcv(($('rd-mcv-seg').querySelector('.on')||{}).dataset.m||'country'));
// 2. statistics target table
$('rd-target').innerHTML=Q.stats.target.map(r=>'<tr><td class="num">'+f(r.target)+'</td><td class="num">'+f(r.sample_rows)+'</td><td class="num">'+r.analyze_s.toFixed(2)+' s</td><td class="num">'+f(r.n_distinct)+'</td><td class="num">'+f(r.n_mcv)+'</td><td class="num">'+f(r.top.est)+'</td><td class="num">'+f(r.typical.est)+'</td></tr>').join('')+
  '<tr><td class="num mute">truth</td><td></td><td></td><td class="num"><b>'+f(Q.stats.nd['chats.user_id'][1])+'</b></td><td></td><td class="num"><b>'+f(Q.stats.target[0].top.act)+'</b></td><td class="num"><b>'+f(Q.stats.target[0].typical.act)+'</b></td></tr>';
// 3. extended statistics table
(function(){const x=Q.stats.ext,ks=['none','dependencies','ndistinct','mcv','all'],nm={none:'No extended statistics',dependencies:'dependencies',ndistinct:'ndistinct',mcv:'mcv',all:'all three'};
  const qs=[['and',"country = 'GB' AND city = 'London'"],['mismatch',"country = 'GB' AND city = 'Paris'"],['group','GROUP BY country, city (groups)'],['in',"country IN ('GB','FR') AND city IN ('London','Paris')"]];
  const cell=(e,a)=>{const r=Math.max(e,1)/Math.max(a,1),ok=r<=1.5&&r>=1/1.5;return '<td class="num '+(ok?'ok':'bad')+'">'+f(e)+'</td>'};
  $('rd-ext').innerHTML='<thead><tr><th>Query on users</th><th class="num">Truth</th>'+ks.map(k=>'<th class="num">'+nm[k]+'</th>').join('')+'</tr></thead><tbody>'+
   qs.map(([k,l])=>'<tr><td><code>'+E(l)+'</code></td><td class="num"><b>'+f(x.none[k].act)+'</b></td>'+ks.map(s=>cell(x[s][k].est,x[s][k].act)).join('')+'</tr>').join('')+'</tbody>'})();
// 4. where estimates went wrong on this page: estimated against actual rows, log scale (dumbbell)
function errs(){const x=Q.stats.ext.none.and,st=Q.stats.stale.after_load,g=Q.generic,el=$('rd-err');
  const rows=[['Independence','GB and London users',x.est,x.act],['Pattern (LIKE)','title LIKE prefix',100,1],['Stale statistics','after a bulk load',st.est,st.act],
   ['Join','London users x their chats',1580,22364],['Unknown parameter','generic plan, enterprise org',290,g.rows_org1]];
  const W=RD.width(el),narrow=W<560,L=narrow?8:170,R=14,rh=narrow?50:34,T0=22,H=T0+rows.length*rh+26,lo=0,hi=7;
  const xs=v=>L+(W-L-R)*(Math.log10(Math.max(v,1))-lo)/(hi-lo);let b='';
  for(let e=lo;e<=hi;e++){const xx=xs(Math.pow(10,e));b+='<line x1="'+xx+'" x2="'+xx+'" y1="'+(T0-6)+'" y2="'+(H-22)+'" stroke="var(--line)"/>'+QPG.T(xx,H-8,['1','10','100','1k','10k','100k','1M','10M'][e],{a:'middle',fs:10.5,fill:'var(--mute)'})}
  b+=QPG.T(W-R,10,'rows (log scale)',{a:'end',fs:10.5,fill:'var(--mute)'});
  rows.forEach((r,i)=>{const y=T0+i*rh+(narrow?30:14),xe=xs(r[2]),xa=xs(r[3]),k=r[2]>r[3]?r[2]/Math.max(1,r[3]):r[3]/Math.max(1,r[2]);
    if(narrow)b+=QPG.T(L,y-18,r[0]+': '+r[1],{fs:11.5,w:600});else{b+=QPG.T(0,y-1,r[0],{fs:11.5,w:600})+QPG.T(0,y+12,r[1],{fs:10.5,fill:'var(--mute)'})}
    b+='<line x1="'+xe+'" x2="'+xa+'" y1="'+y+'" y2="'+y+'" stroke="var(--bad)" stroke-width="3" opacity=".5"/>';
    b+='<circle cx="'+xe+'" cy="'+y+'" r="6" fill="var(--bg)" stroke="var(--c1)" stroke-width="2.5"><title>estimated '+f(r[2])+'</title></circle><circle cx="'+xa+'" cy="'+y+'" r="6" fill="var(--c2)"><title>actual '+f(r[3])+'</title></circle>';
    const lab=(k>=100?f(k):k.toFixed(1))+'x '+(r[2]>r[3]?'over':'under'),hiX=Math.max(xe,xa),loX=Math.min(xe,xa),right=hiX+12+7*lab.length<W;
    b+=QPG.T(right?hiX+12:loX-12,y+4,lab,{a:right?'start':'end',fs:11,fill:'var(--bad)',w:600})});
  el.innerHTML='<div class="hmleg"><span><svg width="14" height="14"><circle cx="7" cy="7" r="5" fill="none" stroke="var(--c1)" stroke-width="2.5"/></svg>estimated</span><span><svg width="14" height="14"><circle cx="7" cy="7" r="5.5" fill="var(--c2)"/></svg>actual</span></div>'+QPG.svg(W,H,b,'estimated against actual rows for five misestimates')}
RD.onRender(errs);RD.onResize(errs);errs();
// 5. GEQO planning time
function geqo(){const el=$('rd-geqo'),rows=Q.geqo,W=RD.width(el),H=230,L=46,R=10,T=14,B=34;
  const xs=n=>L+(W-L-R)*(n-2)/14,lmin=-1,lmax=4,y=v=>T+(H-T-B)*(1-(Math.log10(v)-lmin)/(lmax-lmin));let b='';
  [0.1,1,10,100,1000,10000].forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,y(v)+4,v>=1?f(v):'0.1',{a:'end',fs:10.5,fill:'var(--mute)'})});
  for(let n=2;n<=16;n+=2)b+=RD.t(xs(n),H-B+15,n,{a:'middle',fs:10.5,fill:'var(--mute)'});
  b+=RD.t((L+W-R)/2,H-4,'tables joined',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(4,10,'planning time, ms (log scale)',{fs:10.5,fill:'var(--mute)'});
  b+='<rect x="'+xs(11.5)+'" y="'+T+'" width="'+(xs(16)-xs(11.5)+4)+'" height="'+(H-T-B)+'" fill="var(--acc2)" opacity=".45"/>'+RD.t(W-R-3,T+12,'GEQO by default',{a:'end',fs:10.5,fill:'var(--acc)'});
  const line=(k,c,d)=>{const p=rows.map(r=>xs(r.tables).toFixed(1)+','+y(r[k].plan_ms).toFixed(1)).join(' ');return '<polyline points="'+p+'" fill="none" stroke="'+c+'" stroke-width="2"'+(d?' stroke-dasharray="5 4"':'')+'/>'+rows.map(r=>'<circle cx="'+xs(r.tables)+'" cy="'+y(r[k].plan_ms)+'" r="2.6" fill="'+c+'"><title>'+r.tables+' tables: '+r[k].plan_ms+' ms</title></circle>').join('')};
  b+=line('dp','var(--c2)')+line('geqo','var(--c1)',1);
  const last=rows[rows.length-1];b+=RD.t(xs(16)-4,y(last.dp.plan_ms)-6,f(last.dp.plan_ms)+' ms',{a:'end',fs:11,fill:'var(--c2)',w:600})+RD.t(xs(16)-4,y(last.geqo.plan_ms)+14,ms(last.geqo.plan_ms)+' ms',{a:'end',fs:11,fill:'var(--c1)',w:600});
  el.innerHTML='<div class="hmleg"><span><i style="display:inline-block;width:14px;height:3px;background:var(--c2);margin-right:4px"></i>exhaustive search (geqo off)</span><span><i style="display:inline-block;width:14px;height:3px;background:var(--c1);margin-right:4px"></i>GEQO forced at every size</span></div><div class="rd-svg">'+RD.svg(W,H,b,'planning time by number of tables')+'</div>';
  const r10=rows.find(r=>r.tables===10),r7=rows.find(r=>r.tables===7);
  $('rd-geqo-cap').textContent='Measured: a reporting-style query joining one 200,000-row fact table to 1 to 15 small lookup tables (comma-separated FROM list), best of three. Exhaustive planning took '+ms(r10.dp.plan_ms)+' ms at 10 tables and '+f(last.dp.plan_ms)+' ms at 16; GEQO stayed near '+f(last.geqo.plan_ms)+' ms. Execution took about '+f(last.dp.exec_ms)+' ms either way: on this simple star-shaped join GEQO found plans of the same cost from 11 tables up, and ones about '+(100*(r7.geqo.cost/r7.dp.cost-1)).toFixed(1)+'% costlier at 7 to 10 tables when forced. All five geqo_seed values tried at 16 tables gave the same cost; on messier queries that is not guaranteed.'}
RD.onRender(geqo);RD.onResize(geqo);
// 6. log lines
(function(){const w=Q.workload,clip=s=>(s||'').split('\n').slice(0,9).map(l=>l.replace(/^\d{4}-\d\d-\d\d (\d\d:\d\d:\d\d)\.\d+ \w+ \[\d+\]/,'$1')).join('\n');
  $('rd-loglines').textContent=clip(w.log_duration)+'\n'+clip(w.log_plan)})();
// 7. application patterns
function app(m){const a=Q.app,el=$('rd-app'),cap=$('rd-app-cap');
  if(m==='nplus1'){const n=a.nplus1;bars(el,[{nm:'21 queries (N+1)',v:n.nplus1.median_ms,lab:ms(n.nplus1.median_ms)+' ms',c:'var(--bad)'},{nm:'1 query (LATERAL join)',v:n.joined.median_ms,lab:ms(n.joined.median_ms)+' ms',c:'var(--good)'}]);
    cap.textContent='Median time to build one sidebar (a user\u2019s 20 latest chats with each one\u2019s last message), over '+f(n.nplus1.n)+' page loads for '+n.users+' users, warm cache, loopback TCP: '+(n.nplus1.median_ms/n.joined.median_ms).toFixed(1)+' times slower as N+1. 90th percentile: '+ms(n.nplus1.p90_ms)+' against '+ms(n.joined.p90_ms)+' ms.'}
  else{const b=a.batch.ms,nm={autocommit_each:'one INSERT per row, each committed',one_tx_each:'one INSERT per row, one transaction',executemany:'executemany (pipelined)',multirow_1000:'INSERT of 1,000 rows at a time',unnest_arrays:'one INSERT from arrays (unnest)',copy:'COPY'};
    bars(el,Object.keys(nm).map(k=>({nm:nm[k],v:b[k],lab:ms(b[k])+' ms',c:k==='copy'?'var(--good)':k==='autocommit_each'?'var(--bad)':'var(--c1)'})),{log:true});
    cap.textContent='10,000 rows into a 6-column table, best of three, logarithmic bars. Committing each row waits for the log to be flushed every time (fsync on, synchronous_commit on); COPY streams all rows in one command: '+f(b.autocommit_each/b.copy)+' times faster than row by row.'}}
RD.seg($('rd-app-seg'),app);app('nplus1');const appCur=()=>(($('rd-app-seg').querySelector('.on')||{}).dataset||{}).m||'nplus1';RD.onRender(()=>app(appCur()));RD.onResize(()=>app(appCur()));
// 8. spills
function spill(m){const rows=Q.spill[m],el=$('rd-spill'),cap=$('rd-spill-cap');const best=Math.min(...rows.map(r=>r.ms));
  bars(el,rows.map(r=>{const sp=(r.temp_written||0)>0;return {nm:'work_mem '+r.work_mem,v:r.ms,lab:f(r.ms)+' ms',c:sp?'var(--bad)':'var(--good)',hl:r.work_mem==='4MB'}}));
  const d=rows.find(r=>r.work_mem==='4MB'),big=rows[rows.length-1],mem=rows.find(r=>!(r.temp_written>0));
  const what=m==='sort'?'Sort Method: '+d.method+', '+f(d.space_kb)+' kB on disk at 4 MB; '+big.method+' using '+f(big.space_kb)+' kB of memory at '+big.work_mem+' (in memory the rows take more room than in the compact temporary files)':
    m==='hashjoin'?'Hash Batches '+d.batches+' at 4 MB, peak '+f(d.peak_kb)+' kB; 1 batch from '+mem.work_mem+', peak '+f(mem.peak_kb)+' kB':'HashAggregate Batches '+d.batches+' and '+f(d.disk_kb)+' kB of disk at 4 MB; 1 batch from '+mem.work_mem+', '+f(mem.peak_kb)+' kB of memory';
  cap.innerHTML='Red: spilled to temporary files. <code>'+E(Q.spill_sql[m])+'</code>. '+E(what)+'. Default 4 MB against the fastest setting: '+(d.ms/best).toFixed(2)+' times.'}
RD.seg($('rd-spill-seg'),spill);spill('sort');const spCur=()=>(($('rd-spill-seg').querySelector('.on')||{}).dataset||{}).m||'sort';RD.onRender(()=>spill(spCur()));RD.onResize(()=>spill(spCur()));
// 9. parallel workers
function par(){const el=$('rd-par'),rows=Q.parallel,W=RD.width(el),H=200,L=46,R=12,T=14,B=34,t0=rows[0].ms;
  const xs=w=>L+(W-L-R)*w/8,ym=Math.max(...rows.map(r=>r.ms))*1.05,y=v=>T+(H-T-B)*(1-v/ym);let b='';
  [0,500,1000,1500].forEach(v=>{b+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+RD.t(L-5,y(v)+4,f(v),{a:'end',fs:10.5,fill:'var(--mute)'})});
  for(let w=0;w<=8;w++)b+=RD.t(xs(w),H-B+15,w,{a:'middle',fs:10.5,fill:'var(--mute)'});
  b+=RD.t((L+W-R)/2,H-4,'max_parallel_workers_per_gather',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(4,10,'ms',{fs:10.5,fill:'var(--mute)'});
  const ideal=[];for(let w=0;w<=8;w+=.25)ideal.push(xs(w).toFixed(1)+','+y(t0/(1+w)).toFixed(1));
  b+='<polyline points="'+ideal.join(' ')+'" fill="none" stroke="var(--dim)" stroke-width="1.5" stroke-dasharray="4 4"/>';
  b+='<polyline points="'+rows.map(r=>xs(r.workers)+','+y(r.ms)).join(' ')+'" fill="none" stroke="var(--c1)" stroke-width="2"/>'+rows.map(r=>'<circle cx="'+xs(r.workers)+'" cy="'+y(r.ms)+'" r="3" fill="var(--c1)"><title>'+r.workers+' allowed, '+r.launched+' launched: '+r.ms+' ms</title></circle>'+RD.t(xs(r.workers)+(r.workers===8?-4:4),y(r.ms)-6,f(r.ms),{a:r.workers===8?'end':'start',fs:10,fill:'var(--ink)'})).join('');
  el.innerHTML='<div class="hmleg"><span><i style="display:inline-block;width:14px;height:3px;background:var(--c1);margin-right:4px"></i>measured</span><span><i style="display:inline-block;width:14px;height:0;border-top:2px dashed var(--dim);margin-right:4px"></i>perfect scaling (leader plus workers)</span></div><div class="rd-svg">'+RD.svg(W,H,b,'time by parallel workers')+'</div>';
  const best=rows.reduce((a,r)=>r.ms<a.ms?r:a);
  $('rd-par-cap').innerHTML='<code>'+E(Q.parallel_sql)+'</code> over 10,000,000 rows, warm cache, best of three. Serial: '+f(t0)+' ms; best: '+f(best.ms)+' ms with '+best.launched+' workers launched ('+(t0/best.ms).toFixed(1)+' times). Allowing 6 or 8 still launched 5: the size rule gives this table 5. The default allows 2: '+f(rows[2].ms)+' ms. The curve flattens because the leader must combine the workers\u2019 partial results and the laptop has 8 fast cores and 2 slow ones.'}
RD.onRender(par);RD.onResize(par);
// 10. generic plan sequence
function gen(m){const g=Q.generic,s=g[m],el=$('rd-gen'),lab=$('rd-gen-lab'),mx=Math.log10(10000),mn=Math.log10(0.3);
  el.innerHTML=s.map((r,i)=>{const h=Math.max(2,100*(Math.log10(r.ms)-mn)/(mx-mn));return '<div style="height:'+h.toFixed(1)+'%;background:'+(r.generic?'var(--bad)':'var(--c1)')+'" title="call '+(i+1)+': '+r.ms+' ms"><span>'+ms(r.ms)+'</span></div>'}).join('');
  lab.innerHTML=g.seq.map((o,i)=>'<div>'+(i+1)+'<br>'+(o===1?'<b>enterprise</b>':'org '+o)+'<br>'+(s[i].generic?'generic':'custom')+'</div>').join('');
  const t={auto:'Blue: custom plan; red: generic plan. Bars on a log scale, ms. Calls 7 and 8 reused the generic plan: the enterprise took '+f(s[6].ms)+' ms instead of '+f(s[5].ms)+' ms.',
   force_custom:'Every call planned for its own value: the enterprise took '+f(s[5].ms)+' and '+f(s[6].ms)+' ms, the small organisations under 1 ms. Planning cost about a millisecond per call.',
   hint:'Pinned with /*+ HashJoin(e c) SeqScan(e) */: every call runs a hash join over all chats. Small organisations: '+f(Math.min(...s.slice(0,5).map(r=>r.ms)))+' to '+f(Math.max(...s.slice(0,5).map(r=>r.ms)))+' ms instead of under 1 ms; the enterprise '+f(s[6].ms)+' ms.'};
  $('rd-gen-cap').textContent=t[m]+' Each bar is the best of three identical sessions.'}
RD.seg($('rd-gen-seg'),gen);gen('auto');
})();
