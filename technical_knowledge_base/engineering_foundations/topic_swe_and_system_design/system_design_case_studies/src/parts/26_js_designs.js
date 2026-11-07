// ---- The seven designs: the build-up specs (naive, then each bottleneck found and fixed), estimate tables, measured results ----
// Each spec is drawn in 3D by 33_js_sc_arch.js; the step text is the ol.sx list in the Reading HTML (one item per step, checked by src/check_stages.mjs).
// Counter values come from EST_EXPECT (the defaults of est_spec.json, also checked by recompute.py), so prose, tables and stages agree.
(function(){
  const E=window.EST_EXPECT,F=RD.fmt;
  const pct=x=>F(x*100,1)+'%',ms=x=>F(x,1)+' ms',n0=x=>F(x,0),txt=x=>x;
  const SPECS={};
  // 1. URL shortener
  SPECS.url={lanes:['Clients','Front','App','Cache and IDs','Storage','Async'],
    nodes:[{id:'cl',l:'Browser',s:'GET /aZ3kQ9x',c:0,r:0,in:0},
      {id:'lb',l:'Load balancer',c:1,r:0,in:6},
      {id:'app1',l:'App server',s:'one machine',c:2,r:0,in:0,out:6},{id:'app2',l:'App servers',s:'12, stateless',c:2,r:0,in:6},
      {id:'cache',l:'Redis cache',s:'code to URL, TTL',c:3,r:0,in:4},{id:'ids',l:'ID range service',s:'blocks of 10,000',c:3,r:1,in:2},
      {id:'db',l:'Postgres',s:'one primary',c:4,r:0,in:0,out:8,kind:'store'},{id:'sh',l:'Shards by code hash',s:'each with a replica',c:4,r:0,in:8,kind:'store'},
      {id:'q',l:'Click queue',s:'at-least-once',c:5,r:0,in:4},{id:'an',l:'Analytics consumers',s:'counts per hour',c:5,r:1,in:4}],
    edges:[{a:'cl',b:'app1'},{a:'app1',b:'db'},{a:'app1',b:'ids',in:2},{a:'cl',b:'lb'},{a:'lb',b:'app2'},{a:'app2',b:'cache'},{a:'app2',b:'ids'},{a:'app2',b:'db'},{a:'app2',b:'sh'},{a:'app1',b:'cache',in:4},{a:'app1',b:'q',in:4},{a:'app2',b:'q'},{a:'q',b:'an'}],
    steps:[
      {k:'naive',hot:[]},
      {k:'bad',hot:['app1']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['db']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['app1']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['db']},
      {k:'fix',hot:[]}],
    counters:[{l:'Database reads a second at peak',v:[E.url.r_pk,E.url.r_pk,E.url.r_pk,E.url.r_pk,E.url.db_rd,E.url.db_rd,E.url.db_rd,E.url.db_rd,E.url.db_rd],fmt:n0},
      {l:'Code space used after 5 years',v:[E.url.fill6,E.url.fill6,E.url.fill7,E.url.fill7,E.url.fill7,E.url.fill7,E.url.fill7,E.url.fill7,E.url.fill7],fmt:pct},
      {l:'Writes on the redirect path',v:['1 per click','1 per click','1 per click','1 per click','none','none','none','none','none'],fmt:txt},
      {l:'Machines whose loss stops redirects',v:[2,2,2,2,1,1,0,0,0],fmt:n0,d:'cache down falls back to the database'}]};
  // 2. Rate limiter
  SPECS.rl={lanes:['Clients','Gateways','Limiter state','Config'],
    nodes:[{id:'cl',l:'API clients',s:'one key, many calls',c:0,r:0,in:0},
      {id:'g1',l:'Gateway 1',s:'local counter',c:1,r:0,in:0},{id:'g2',l:'Gateway 2',s:'local counter',c:1,r:1,in:0},{id:'g3',l:'Gateway 50',s:'local counter',c:1,r:2,in:0},
      {id:'rd',l:'Redis',s:'GET then SET',c:2,r:0,in:2,out:4},{id:'rda',l:'Redis',s:'atomic Lua script',c:2,r:0,in:4,out:8},
      {id:'rs',l:'Redis shards',s:'by key, + replicas',c:2,r:0,in:8},{id:'loc',l:'Local backstop',s:'fail open, coarse limit',c:2,r:1,in:6},
      {id:'cfg',l:'Rules',s:'per plan, cached',c:3,r:0,in:0},{id:'ks',l:'Kill switch, dark launch',c:3,r:1,in:6}],
    edges:[{a:'cl',b:'g1'},{a:'cl',b:'g2'},{a:'cl',b:'g3'},{a:'g1',b:'rd',in:2},{a:'g2',b:'rd',in:2},{a:'g3',b:'rd',in:2},{a:'g1',b:'rda'},{a:'g2',b:'rda'},{a:'g3',b:'rda'},{a:'g1',b:'rs'},{a:'g2',b:'rs'},{a:'g3',b:'rs'},{a:'g1',b:'loc',d:1},{a:'cfg',b:'g3',d:1}],
    steps:[
      {k:'naive',hot:[]},
      {k:'bad',hot:['g1','g2','g3']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['rd']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['rda']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['rda']},
      {k:'fix',hot:[]}],
    counters:[{l:'Most one key can get per second (limit 100)',v:[E.rl.local,E.rl.local,100,'117 to 119',100,100,100,100,100],fmt:x=>typeof x==='number'?n0(x):x},
      {l:'Added latency per request',v:[0,0,E.rl.lat,E.rl.lat,E.rl.lat,E.rl.lat,E.rl.lat,E.rl.lat,E.rl.lat],fmt:x=>x?F(x,1)+' ms':'0'},
      {l:'If the limiter fails',v:['n/a','n/a','API down','API down','API down','API down','API keeps working','API keeps working','API keeps working'],fmt:txt}]};
  // 3. Chat
  SPECS.chat={lanes:['Clients','Connections','Routing','Storage','Async'],
    nodes:[{id:'cl',l:'Phones and browsers',c:0,r:0,in:0},
      {id:'api',l:'HTTP API',s:'poll every 5 s',c:1,r:0,in:0,out:2},{id:'gw',l:'Gateway servers',s:'WebSockets, ~100',c:1,r:0,in:2},
      {id:'msg',l:'Message service',c:2,r:0,in:0,out:4},{id:'reg',l:'Session registry',s:'user to gateway',c:2,r:1,in:4,out:6},{id:'cs',l:'Channel servers',s:'consistent hash ring',c:2,r:0,in:4},
      {id:'pres',l:'Presence',s:'TTL keys, batched',c:2,r:2,in:8},
      {id:'db',l:'Postgres',s:'messages table',c:3,r:0,in:0,out:6,kind:'store'},{id:'wc',l:'Wide-column store',s:'(channel, bucket), id',c:3,r:0,in:6,kind:'store'},
      {id:'push',l:'Push notifications',s:'offline users',c:4,r:0,in:4}],
    edges:[{a:'cl',b:'api'},{a:'api',b:'msg'},{a:'msg',b:'db'},{a:'cl',b:'gw'},{a:'gw',b:'cs'},{a:'gw',b:'reg'},{a:'cs',b:'db'},{a:'cs',b:'wc'},{a:'cs',b:'push'},{a:'gw',b:'pres'}],
    steps:[
      {k:'naive',hot:[]},
      {k:'bad',hot:['api']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['msg']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['db']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['gw']},
      {k:'fix',hot:[]}],
    counters:[{l:'Requests a second just to stay up to date',v:[E.chat.poll,E.chat.poll,0,0,0,0,0,0,0],fmt:n0,d:'with persistent connections, none'},
      {l:'Worst-case delay to see a message',v:['5 s','5 s','push','push','push','push','push','push','push'],fmt:txt},
      {l:'Messages stored per year (3 copies)',v:[E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr,E.chat.tbyr],fmt:x=>n0(x)+' TB'},
      {l:'Databases holding history',v:[1,1,1,1,1,1,'many partitions','many partitions','many partitions'],fmt:x=>typeof x==='number'?'1 (single)':x}]};
  // 4. Feed
  SPECS.feed={lanes:['Clients','App','Timelines','Storage','Async'],
    nodes:[{id:'cl',l:'App',c:0,r:0,in:0},
      {id:'tl',l:'Timeline service',s:'merge at read time',c:1,r:0,in:0,out:2},{id:'tl2',l:'Timeline service',s:'read cached list',c:1,r:0,in:2,out:4},{id:'tl3',l:'Timeline service',s:'list + celebrity merge',c:1,r:0,in:4},
      {id:'post',l:'Post service',c:1,r:1,in:0},
      {id:'rc',l:'Timeline cache',s:'Redis, 800 ids, x3',c:2,r:0,in:2,out:6},{id:'rc2',l:'Timeline cache',s:'active users only',c:2,r:0,in:6},
      {id:'db',l:'Posts and follows',s:'indexed by author',c:3,r:0,in:0,kind:'store'},
      {id:'fo',l:'Fan-out workers',s:'queue of deliveries',c:4,r:0,in:2},{id:'th',l:'Celebrity rule',s:'no fan-out above N',c:4,r:1,in:4}],
    edges:[{a:'cl',b:'tl'},{a:'cl',b:'tl2'},{a:'cl',b:'tl3'},{a:'cl',b:'post'},{a:'tl',b:'db'},{a:'tl2',b:'rc'},{a:'tl3',b:'rc'},{a:'tl3',b:'rc2'},{a:'tl3',b:'db',in:4},{a:'post',b:'db'},{a:'post',b:'fo',in:2},{a:'fo',b:'rc'},{a:'fo',b:'rc2'},{a:'th',b:'fo',d:1}],
    steps:[
      {k:'naive',hot:[]},
      {k:'bad',hot:['tl','db']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['fo']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['rc']},
      {k:'fix',hot:[]}],
    counters:[{l:'Work per timeline read',v:['~75 lookups + merge','~75 lookups + merge','1 lookup','1 lookup','1 lookup + a few','1 lookup + a few','1 lookup + a few'],fmt:txt},
      {l:'Index lookups a second for reads',v:[E.feed.onread,E.feed.onread,300000,300000,300000,300000,300000],fmt:n0},
      {l:'Inserts for one celebrity post',v:[0,0,E.feed.celeb_ins,E.feed.celeb_ins,0,0,0],fmt:n0},
      {l:'Timeline cache RAM',v:[0,0,E.feed.ram,E.feed.ram,E.feed.ram,E.feed.ram,'active users only'],fmt:x=>typeof x==='number'?F(x,2)+' TB':x}]};
  // 5. LLM gateway
  SPECS.gw={lanes:['Teams','Gateway','Policy and state','Models','Async'],
    nodes:[{id:'apps',l:'Team apps',s:'40 services, scripts',c:0,r:0,in:0},
      {id:'gw',l:'LLM gateway',s:'OpenAI-compatible',c:1,r:0,in:2},{id:'gw2',l:'Gateway replicas',s:'2+ zones, stateless',c:1,r:1,in:10},
      {id:'keys',l:'Virtual keys',s:'real keys held here',c:2,r:0,in:2},{id:'bud',l:'Budget counters',s:'tokens, reserve then settle',c:2,r:1,in:4},{id:'pii',l:'PII redaction',s:'per-team policy',c:2,r:2,in:8},
      {id:'va',l:'Vendor A',c:3,r:0,in:0},{id:'vb',l:'Vendor B',c:3,r:1,in:6},{id:'self',l:'Self-hosted model',s:'for data that stays',c:3,r:2,in:8},
      {id:'ue',l:'Usage events',s:'queue to warehouse',c:4,r:0,in:2}],
    edges:[{a:'apps',b:'va',out:2},{a:'apps',b:'gw'},{a:'apps',b:'gw2'},{a:'gw',b:'keys'},{a:'gw',b:'bud'},{a:'gw',b:'pii'},{a:'gw',b:'va'},{a:'gw',b:'vb'},{a:'gw',b:'self'},{a:'gw',b:'ue'},{a:'gw2',b:'bud'}],
    steps:[
      {k:'naive',hot:[]},
      {k:'bad',hot:['apps']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['gw']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['va']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['apps','va']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['gw']},
      {k:'fix',hot:[]}],
    counters:[{l:'Spend attributed to a team',v:['0%','0%','100%','100%','100%','100%','100%','100%','100%','100%','100%'],fmt:txt},
      {l:'Places holding real vendor keys',v:['every team','every team','1','1','1','1','1','1','1','1','1'],fmt:txt},
      {l:'Providers behind each alias',v:[1,1,1,1,1,1,2,2,3,3,3],fmt:n0},
      {l:'Model spend a day (illustrative prices)',v:Array(11).fill(E.gw.cday),fmt:x=>'$'+n0(x)}]};
  // 6. RAG
  SPECS.rag={lanes:['Sources','Ingestion','Index','Query','Quality'],
    nodes:[{id:'src',l:'Wiki, drives, tickets',s:'5 M documents',c:0,r:0,in:0},
      {id:'cron',l:'Nightly export',s:'whole corpus',c:1,r:0,in:0,out:6},{id:'q',l:'Change events',s:'queue, idempotent',c:1,r:0,in:6},{id:'emb',l:'Chunk and embed',s:'versioned upserts',c:1,r:1,in:2},
      {id:'kw',l:'Keyword index',s:'full text',c:2,r:0,in:0,out:2},{id:'vec',l:'Vector index',s:'HNSW, 35 M chunks',c:2,r:0,in:2},{id:'bm',l:'BM25 index',c:2,r:1,in:4},{id:'acl',l:'ACL groups per chunk',c:2,r:2,in:8},
      {id:'ask',l:'Ask service',s:'retrieve, prompt, cite',c:3,r:0,in:0},{id:'rr',l:'Reranker',c:3,r:1,in:4},{id:'llm',l:'LLM',c:3,r:2,in:0},
      {id:'ev',l:'Golden set and judges',s:'two scores',c:4,r:0,in:10}],
    edges:[{a:'src',b:'cron'},{a:'cron',b:'kw'},{a:'cron',b:'emb'},{a:'src',b:'q'},{a:'q',b:'emb'},{a:'emb',b:'vec'},{a:'emb',b:'bm'},{a:'ask',b:'kw'},{a:'ask',b:'vec'},{a:'ask',b:'bm'},{a:'ask',b:'rr'},{a:'ask',b:'llm'},{a:'ask',b:'acl'},{a:'ev',b:'ask',d:1}],
    steps:[
      {k:'naive',hot:[]},
      {k:'bad',hot:['kw']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['vec']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['cron']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['ask']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['llm']},
      {k:'fix',hot:[]}],
    counters:[{l:'Prompt content',v:['5 whole documents','5 whole documents','8 chunks','8 chunks','8 reranked chunks','8 reranked chunks','8 reranked chunks','8 reranked chunks','8 reranked chunks','8 reranked chunks','8 reranked chunks'],fmt:txt},
      {l:'Time for an edit to be searchable',v:['up to 24 h','up to 24 h','up to 24 h','up to 24 h','up to 24 h','up to 24 h','minutes','minutes','minutes','minutes','minutes'],fmt:txt},
      {l:'Raw vectors to hold',v:[0,0,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb,E.rag.vgb],fmt:x=>x?n0(x)+' GB':'none'},
      {l:'Permission checks',v:['none','none','none','none','none','none','none','none','per chunk','per chunk','per chunk'],fmt:txt}]};
  // 7. Job scheduler
  SPECS.job={lanes:['Owners','Scheduling','Queue','Workers','Records'],
    nodes:[{id:'own',l:'Teams',s:'register jobs',c:0,r:0,in:0},
      {id:'cron',l:'crontab',s:'one machine runs all',c:1,r:0,in:0,out:2},{id:'s2',l:'Two schedulers',s:'both read what is due',c:1,r:0,in:2,out:4},{id:'s3',l:'Schedulers',s:'SKIP LOCKED claims',c:1,r:0,in:4},{id:'jit',l:'Jitter',s:'spread the hour',c:1,r:1,in:8},
      {id:'qu',l:'Run queue',s:'priorities, bounded',c:2,r:0,in:6},
      {id:'w',l:'Workers',s:'lease + heartbeat',c:3,r:0,in:6},
      {id:'db',l:'jobs and runs',s:'unique (job, time)',c:4,r:0,in:2,kind:'store'}],
    edges:[{a:'own',b:'cron'},{a:'own',b:'db',in:2},{a:'s2',b:'db'},{a:'s3',b:'db'},{a:'s3',b:'qu'},{a:'qu',b:'w'},{a:'w',b:'db'},{a:'jit',b:'s3',d:1}],
    steps:[
      {k:'naive',hot:[]},
      {k:'bad',hot:['cron']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['s2']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['s3']},
      {k:'fix',hot:[]},
      {k:'bad',hot:['qu','w']},
      {k:'fix',hot:[]}],
    counters:[{l:'Machines whose loss stops all jobs',v:[1,1,0,0,0,0,0,0,0],fmt:n0},
      {l:'Double runs possible on scheduler failover',v:['n/a','n/a','yes','yes','no','no','no','no','no'],fmt:txt},
      {l:'Runs started in the top-of-hour second',v:[E.job.burst,E.job.burst,E.job.burst,E.job.burst,E.job.burst,E.job.burst,E.job.burst,E.job.burst,E.job.spr],fmt:n0},
      {l:'Run history',v:['none','none',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day',F(E.job.hist,0)+' GB a day'],fmt:txt}]};
  window.DESIGN_SPECS=SPECS;
  // mount everything
  const scale={url:['shortens','clicks'],rl:['rps'],chat:['dau'],feed:['users','reads','posts'],gw:['emp','auto'],rag:['docs','qday'],job:['runs']};
  Object.keys(SPECS).forEach(d=>{
    if(document.getElementById('est-'+d))EST.mount('est-'+d,d,scale[d]);
  });
  // measured: rate limiter race and feed
  const M=window.MEAS;
  const rn=M.race.naive.map(x=>x.admitted),ra=M.race.atomic.map(x=>x.admitted);
  const el=document.getElementById('race-out');
  if(el){const mx=Math.max(...rn)*1.08;
    const bar=(lab,v,col)=>'<div style="display:grid;grid-template-columns:minmax(0,9em) minmax(0,1fr) 3.4em;gap:8px;align-items:center;font-size:12.5px;margin:3px 0"><span>'+lab+'</span><span style="height:14px;background:var(--soft);border-radius:3px;position:relative;overflow:hidden"><span style="position:absolute;left:0;top:0;bottom:0;width:'+(v/mx*100).toFixed(1)+'%;background:'+col+'"></span><span style="position:absolute;top:0;bottom:0;left:'+(100/mx*100).toFixed(1)+'%;border-left:2px dashed var(--ink)"></span></span><span style="text-align:right">'+v+'</span></div>';
    el.innerHTML=rn.map((v,i)=>bar('Check-then-act, run '+(i+1),v,'var(--bad)')).join('')+ra.map((v,i)=>bar('Atomic, run '+(i+1),v,'var(--good)')).join('')+'<div class="small mute">Requests admitted; dashed line: the limit of 100.</div>';
    document.getElementById('race-n').textContent=rn.join(', ')+' requests (17 to 19% over the limit)';}
  const f=M.feed,ft=document.getElementById('feed-tab');
  if(ft){ft.innerHTML='<thead><tr><th>What was timed</th><th class="num">Median</th><th class="num">p99</th></tr></thead><tbody>'+
    '<tr><td>Read 50 newest, fan-out on read (join at read time)</td><td class="num">'+ms(f.read_on_read.median_ms)+'</td><td class="num">'+ms(f.read_on_read.p99_ms)+'</td></tr>'+
    '<tr><td>Read 50 newest, precomputed timeline</td><td class="num">'+F(f.read_precomputed.median_ms,3)+' ms</td><td class="num">'+F(f.read_precomputed.p99_ms,3)+' ms</td></tr>'+
    '<tr><td>Fan out one post, most-followed account ('+n0(f.top_followers)+' followers)</td><td class="num">'+ms(f.fanout_ms_top)+'</td><td class="num">n/a</td></tr>'+
    '<tr><td>Fan out one post, median account ('+n0(f.median_followers)+' followers)</td><td class="num">'+F(f.fanout_ms_median,2)+' ms</td><td class="num">n/a</td></tr>'+
    '<tr><td>Timelines table: rows, size</td><td class="num">'+n0(f.timeline_rows)+'</td><td class="num">'+n0(f.timeline_bytes/1e6)+' MB</td></tr></tbody>';
    document.getElementById('feed-speed').textContent=F(f.read_on_read.median_ms/f.read_precomputed.median_ms,0);
    document.getElementById('feed-fan').textContent=F(f.fanout_ms_top/f.fanout_ms_median,0);}
  // feed: the two pairs as bars, each pair on its own linear scale (medians from inputs/pg_measured.json)
  const fb=document.getElementById('feed-bars');
  if(fb){const pairs=[{t:'Read the 50 newest posts',r:[['fan-out on read (join)',f.read_on_read.median_ms,'var(--bad)'],['precomputed timeline',f.read_precomputed.median_ms,'var(--good)']]},
      {t:'Write one post into followers\' timelines',r:[['most-followed ('+n0(f.top_followers)+' followers)',f.fanout_ms_top,'var(--bad)'],['median account ('+n0(f.median_followers)+')',f.fanout_ms_median,'var(--good)']]}];
    function draw(){const W=RD.width(fb),nar=W<520,lw=nar?0:Math.min(230,W*0.36),vw=62,bw=W-lw-vw-8;let y=0,s='';
      pairs.forEach(pr=>{s+=RD.t(0,y+12,RD.esc(pr.t),{w:700});y+=20;const mx=Math.max(...pr.r.map(r=>r[1]));
        pr.r.forEach(r=>{if(nar){s+=RD.t(0,y+11,RD.esc(r[0]),{fill:'var(--mute)'});y+=15}else s+=RD.t(0,y+12,RD.esc(r[0]),{fill:'var(--mute)'});
          const w=Math.max(2,bw*r[1]/mx);s+='<rect x="'+lw+'" y="'+(y+1)+'" width="'+w.toFixed(1)+'" height="14" rx="3" fill="'+r[2]+'"/>';
          s+=RD.t(lw+w+6,y+12,(r[1]<1?F(r[1],3):F(r[1],1))+' ms');y+=22});y+=8});
      fb.innerHTML=RD.svg(W,y,s,'Measured medians: fan-out on read against a precomputed timeline, and fan-out cost by account size')}
    draw();RD.onRender(draw);RD.onResize(draw);}
})();
