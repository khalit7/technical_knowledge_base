// ---- Reading tab: predict widgets, freshness calculator, backfill animation, purge table, end-to-end card, charts ----
(function(){
const P=window.PRD,F=P.f,esc=RD.esc;
const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
const fmt=(x,d)=>x==null?'n/a':Number(x).toLocaleString('en-US',{minimumFractionDigits:d,maximumFractionDigits:d});
// predict, then reveal
document.querySelectorAll('#t-read .prd').forEach(p=>p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
  const ok=b.hasAttribute('data-right');p.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.hasAttribute('data-right'))x.classList.add('right')});
  if(!ok)b.classList.add('wrong');const a=p.querySelector('.ans');a.hidden=false;a.querySelector('.verdict').textContent=ok?'Right.':'Not quite.'})));

// freshness calculator
(function(){
  const $=id=>document.getElementById(id);if(!$('prd-fr-p'))return;
  function draw(){
    const pm=+$('prd-fr-p').value,q=+$('prd-fr-q').value,r=+$('prd-fr-m').value,v=+$('prd-fr-v').value;
    $('prd-fr-pv').textContent=pm===0?'0 (push)':pm;$('prd-fr-qv').textContent=q.toLocaleString('en-US');
    const det=pm*60/2,queue=q/r,emb=1/r,tot=det+queue+emb+v;
    const h=s=>s<1?fmt(s*1000,0)+' ms':s<120?fmt(s,s<10?1:0)+' s':s<7200?fmt(s/60,1)+' min':fmt(s/3600,1)+' h';
    $('prd-fr-out').innerHTML=RD.stat('Detect (half the interval)',h(det),'')+RD.stat('Wait behind the queue',h(queue),q.toLocaleString('en-US')+' docs &divide; '+r+' docs/s')+
      RD.stat('Embed this document',h(emb),'')+RD.stat('Expected lag',h(tot),'sum of the stages');
    const parts=[['detect',det,'--c1'],['queue',queue,'--c2'],['embed',emb,'--c4'],['visible',v,'--c3']];
    $('prd-fr-bar').innerHTML=tot>0?parts.filter(x=>x[1]>0).map(x=>{const w=100*x[1]/tot;return '<span style="width:'+w+'%;background:var('+x[2]+')" title="'+x[0]+' '+h(x[1])+'">'+(w>14?x[0]+' '+h(x[1]):'')+'</span>'}).join(''):'';
  }
  ['prd-fr-p','prd-fr-q','prd-fr-m','prd-fr-v'].forEach(id=>$(id).addEventListener('input',draw));
  ['prd-fr-m','prd-fr-v'].forEach(id=>$(id).addEventListener('change',draw));draw();
})();

// backfill animation (before/after: in place vs dual index)
(function(){
  const B=P.backfill,rows=B.rows,host=document.getElementById('prd-bf-svg');if(!host)return;
  let mode='inplace';
  // fixed random order of the 100 cells (1% of abstracts each), same seed idea as the script: deterministic shuffle
  const order=[...Array(100).keys()];let s=7;for(let i=99;i>0;i--){s=(s*1103515245+12345)%2147483648;const j=s%(i+1);[order[i],order[j]]=[order[j],order[i]]}
  const rank=[];order.forEach((c,i)=>rank[c]=i);
  function draw(i){
    const W=RD.width(host),f=rows[i].f,r=rows[i],narrow=W<560;
    const cO=css('--c1'),cN=css('--c2'),ink=css('--ink'),mute=css('--mute'),line=css('--line');
    const gw=narrow?W:Math.min(mode==='dual'?380:200,W*0.45),cell=Math.min(15,Math.floor((gw-24)/(mode==='dual'?20:10))-2);
    let g='';const nNew=Math.round(f*100);
    function grid(x0,y0,nn,label){let t=RD.t(x0,y0-6,label,{fs:11,fill:mute});
      for(let k=0;k<100;k++){const cx=x0+(k%10)*(cell+2),cy=y0+Math.floor(k/10)*(cell+2);t+='<rect x="'+cx+'" y="'+cy+'" width="'+cell+'" height="'+cell+'" rx="1.5" fill="'+(rank[k]<nn?cN:cO)+'"/>'}return t}
    let gh;
    if(mode==='inplace'){g+=grid(4,18,nNew,'one index: '+nNew+'% of abstracts re-embedded');gh=18+10*(cell+2)}
    else{g+=grid(4,18,0,(f<1?'old index (serving)':'old index (kept for rollback)'));g+=grid(4+10*(cell+2)+14,18,nNew,(f<1?'new index (backfilling) ':'new index (serving)'));gh=18+10*(cell+2)}
    // chart
    const cx0=narrow?36:gw+46,cy0=narrow?gh+30:18,cw=(narrow?W-48:W-cx0-12),ch=narrow?150:Math.max(130,gh-26);
    const X=v=>cx0+v*cw,Y=v=>cy0+ch-(v/0.8)*ch;let c='';
    [0,0.2,0.4,0.6,0.8].forEach(v=>{c+='<line x1="'+cx0+'" x2="'+(cx0+cw)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+line+'"/>'+RD.t(cx0-4,Y(v)+4,v.toFixed(1),{a:'end',fs:10,fill:mute})});
    c+=RD.t(cx0+cw/2,cy0+ch+28,'share re-embedded',{a:'middle',fs:10.5,fill:mute})+RD.t(cx0,cy0+ch+14,'0%',{fs:10,fill:mute})+RD.t(cx0+cw,cy0+ch+14,'100%',{a:'end',fs:10,fill:mute});
    const path=(k,col,dash)=>{let d='';for(let j=0;j<=i;j++)d+=(j?'L':'M')+X(rows[j].f).toFixed(1)+','+Y(k(rows[j])).toFixed(1);return '<path d="'+d+'" fill="none" stroke="'+col+'" stroke-width="2.2"'+(dash?' stroke-dasharray="5 4"':'')+'/>'};
    if(mode==='inplace'){c+=path(x=>x.ndcg_old_query,cO)+path(x=>x.ndcg_new_query,cN)}
    else{c+=path(x=>x.f<1?rows[0].ndcg_old_query:rows[10].ndcg_new_query,ink)}
    const lg=mode==='inplace'?[[cO,'old-model (MiniLM) queries'],[cN,'new-model (bge-small) queries']]:[[ink,'what users get (old index until the switch)']];
    lg.forEach((l,k)=>{c+='<rect x="'+(cx0+4)+'" y="'+(cy0+4+k*15)+'" width="10" height="3" fill="'+l[0]+'"/>'+RD.t(cx0+18,cy0+9+k*15,l[1],{fs:10.5})});
    const H=narrow?cy0+ch+36:Math.max(gh,cy0+ch+34)+4;
    host.innerHTML=RD.svg(W,H,g+c,'Backfill animation');
    const cap=document.getElementById('prd-bf-cap'),out=document.getElementById('prd-bf-out');
    if(mode==='inplace'){
      cap.textContent=f===0?'Start: every abstract has a MiniLM vector; MiniLM queries score '+r.ndcg_old_query.toFixed(3)+'.':
        f<1?nNew+'% overwritten with bge-small vectors. bge-small queries only ever retrieve the re-embedded abstracts (their scores are on a higher scale), MiniLM queries only the old ones: each searches part of the corpus.':
        'Done: bge-small queries score '+r.ndcg_new_query.toFixed(3)+'. Every step in between served worse results than either end.';
      out.innerHTML=RD.stat('Re-embedded',nNew+'%','')+RD.stat('nDCG@10, MiniLM queries',r.ndcg_old_query.toFixed(3),'')+RD.stat('nDCG@10, bge-small queries',r.ndcg_new_query.toFixed(3),'')+RD.stat('top 10 from new vectors (bge-small queries)',Math.round(100*r.top10_new_share_new_query)+'%','');
    }else{
      cap.textContent=f<1?'The old index keeps serving with MiniLM queries ('+rows[0].ndcg_old_query.toFixed(3)+') while the new index fills; nobody queries it except the evaluation.':
        'The new index is complete and evaluated; one atomic switch moves traffic to it ('+rows[10].ndcg_new_query.toFixed(3)+'). The old one stays for rollback. Cost: twice the storage during the backfill.';
      out.innerHTML=RD.stat('New index filled',nNew+'%','')+RD.stat('Serving nDCG@10',(f<1?rows[0].ndcg_old_query:rows[10].ndcg_new_query).toFixed(3),f<1?'old index, MiniLM':'new index, bge-small')+RD.stat('Storage',f<1?'2 indexes':'2 until the old is dropped','');
    }
  }
  const a=RD.anim({card:'prd-bf-card',ctl:'prd-bf-ctl',n:rows.length,draw,ms:1300,label:'Backfill step'});
  RD.seg(document.getElementById('prd-bf-mode'),m=>{mode=m;a.reset(rows.length)});
  RD.onResize(()=>a.redraw());
})();

// purge table
(function(){
  const el=document.getElementById('prd-purge');if(!el)return;
  const ok=v=>v?'<b style="color:var(--bad)">present ('+v+')</b>':'<span style="color:var(--good)">gone</span>';
  let h='<table><thead><tr><th>Step</th><th>Search finds it</th><th>Text in table file</th><th>Vector in table file</th><th>Vector in HNSW index file</th><th>Text in WAL</th></tr></thead><tbody>';
  P.purge.steps.forEach(s=>{h+='<tr><td>'+esc(s.step)+'</td><td>'+(s.found_by_search?'yes':'no')+'</td><td>'+ok(s.heap_marker)+'</td><td>'+ok(s.heap_vector)+'</td><td>'+ok(s.index_vector)+'</td><td>'+ok(s.wal_marker)+'</td></tr>'});
  el.innerHTML=h+'</tbody></table><p class="small mute">Counts are occurrences of the marker text, or of the row\'s first 8 float32 numbers, in the files after CHECKPOINT. WAL settings: wal_keep_size '+esc(P.purge.wal_settings.wal_keep_size)+', max_wal_size '+esc(P.purge.wal_settings.max_wal_size)+', archive_mode '+esc(P.purge.wal_settings.archive_mode)+'.</p>';
})();

// stage table (recorded timings and their sources)
(function(){
  const el=document.getElementById('prd-e2e');if(!el)return;const LT=P.lat,PG=P.pipgen;
  const rows=[['Embed the claim, Qwen3-Embedding-0.6B (MPS)','51.3 p50, 68.4 p90','setup, 100 queries, batch 1','6.1 to 11.8'],
    ['Exact search, 5,183 x 1,024','about '+F.exact_sci_ms+' (derived)','Vector indexes page: '+F.scan_gbps+' GB/s per core scan rate','6 to 14'],
    ['Rerank 30, MiniLM cross-encoder (MPS)','about '+Math.round(30000/LT.rerank_pairs_per_s['ce-minilm-l6'])+' (derived)','setup: 228 to 237 pairs/s over 108,000 pairs',LT.rerank_load['ce-minilm-l6']],
    ['Prefill 5 abstracts, Qwen3-1.7B (Metal)','about '+F.tt_k5+' (derived)','Pipeline lab: median '+F.pip_prefill+' prompt tokens/s over '+F.pip_answers+' answers',F.pip_load],
    ['Decode 64 tokens','about '+Math.round(64000/PG.run.gen_tps_median)+' (derived)','Pipeline lab: median '+F.pip_decode+' tokens/s',F.pip_load]];
  el.innerHTML='<div class="tw"><table><thead><tr><th>Stage</th><th class="num">ms</th><th>Recorded by</th><th>Load average</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+r[1]+'</td><td class="small">'+esc(r[2])+'</td><td class="small">'+r[3]+'</td></tr>').join('')+'</tbody></table></div><p class="small mute">Derived = an amount of work divided by a measured rate.</p>';
  if(P.e2e){const S=P.e2e.summary,ks=[['embed','Embed the claim'],['search','Exact search, top 30'],['rerank','Rerank 30 (MiniLM CE)'],['ttft','Generator: time to first token'],['wall_to_first_token','Whole request to first token'],['gen_total','Generator: 64 output tokens, total']];
    el.innerHTML+='<h3>Measured end to end, one process</h3><div class="tw"><table><thead><tr><th>Stage</th><th class="num">p50 ms</th><th class="num">p90 ms</th><th class="num">p99 ms</th><th>median of each pass</th></tr></thead><tbody>'+ks.map(k=>{const x=S[k[0]];return '<tr><td>'+k[1]+'</td><td class="num">'+fmt(x.p50,1)+'</td><td class="num">'+fmt(x.p90,1)+'</td><td class="num">'+fmt(x.p99,1)+'</td><td class="small mute">'+x.median_per_pass.map(v=>fmt(v,1)).join(', ')+'</td></tr>'}).join('')+'</tbody></table></div><p class="small mute">40 claims &times; 3 passes after a warm-up, bench lock held; load average '+P.e2e.loadavg.map(x=>x[0]+' '+x[1].join('/')).join('; ')+'; '+esc(P.e2e.when)+'.</p>'}
})();

// semantic-cache similarity histogram (opposite vs same verdict pairs)
function scHist(){
  const host=document.getElementById('prd-sc-hist');if(!host)return;
  const M=P.cache.models['qwen3-emb-0.6b'].pairs,W=RD.width(host),H=170,x0=34,x1=W-10,y0=14,y1=H-30;
  const bins=M.opposite_hist.length,bw=(x1-x0)/bins;
  const so=M.opposite_hist.reduce((a,b)=>a+b,0),ss=M.same_hist.reduce((a,b)=>a+b,0);
  const mx=Math.max(...M.opposite_hist.map(v=>v/so),...M.same_hist.map(v=>v/ss));
  const cO=css('--c2'),cS=css('--c3'),mute=css('--mute'),line=css('--line');let g='';
  for(let i=0;i<bins;i++){const ho=(M.opposite_hist[i]/so)/mx*(y1-y0),hs=(M.same_hist[i]/ss)/mx*(y1-y0);
    g+='<rect x="'+(x0+i*bw+1)+'" y="'+(y1-hs)+'" width="'+(bw/2-1)+'" height="'+hs+'" fill="'+cS+'"/><rect x="'+(x0+i*bw+bw/2)+'" y="'+(y1-ho)+'" width="'+(bw/2-1)+'" height="'+ho+'" fill="'+cO+'"/>'}
  g+='<line x1="'+x0+'" x2="'+x1+'" y1="'+y1+'" y2="'+y1+'" stroke="'+line+'"/>';
  [0.5,0.6,0.7,0.8,0.9,1.0].forEach(v=>{const x=x0+(v-0.5)/0.5*(x1-x0);g+=RD.t(x,y1+13,v.toFixed(1),{a:'middle',fs:10,fill:mute})});
  g+=RD.t((x0+x1)/2,y1+26,'cosine of the two claims (Qwen3-Embedding)',{a:'middle',fs:10.5,fill:mute});
  g+='<rect x="'+(x0+4)+'" y="'+(y0)+'" width="10" height="8" fill="'+cO+'"/>'+RD.t(x0+18,y0+8,'opposite verdicts, same abstract ('+M.opposite_n+' pairs)',{fs:10.5});
  g+='<rect x="'+(x0+4)+'" y="'+(y0+14)+'" width="10" height="8" fill="'+cS+'"/>'+RD.t(x0+18,y0+22,'same verdict, same abstract ('+M.same_n+' pairs)',{fs:10.5});
  host.innerHTML=RD.svg(W,H,g,'Similarity of claim pairs');
  document.getElementById('prd-sc-hist-cap').textContent='Share of each kind of pair per similarity bin (pairs below 0.5 not drawn). Medians: opposite '+M.opposite_sim_pct[2].toFixed(3)+', same '+M.same_sim_pct[2].toFixed(3)+'. Measured here on the 1,101 labelled SciFact claims.';
}
// drift chart
function drift(){
  const host=document.getElementById('prd-drift');if(!host)return;
  const D=P.monitor.drift,W=RD.width(host),H=200,x0=34,x1=W-10,y0=10,y1=H-30;
  const cols={scifact:css('--c1'),nfcorpus:css('--c3'),hotpotqa:css('--c2')},names={scifact:'SciFact claims (in domain)',nfcorpus:'NFCorpus questions',hotpotqa:'HotpotQA questions'};
  let g='',mx=0;const y0d=y0+46;Object.values(D).forEach(d=>{const s=d.hist.reduce((a,b)=>a+b,0);d.hist.forEach(v=>mx=Math.max(mx,v/s))});
  Object.entries(D).forEach(([k,d],j)=>{const s=d.hist.reduce((a,b)=>a+b,0),n=d.hist.length;let p='';
    d.hist.forEach((v,i)=>{const x=x0+(i+0.5)/n*(x1-x0),y=y1-(v/s)/mx*(y1-y0d);p+=(i?'L':'M')+x.toFixed(1)+','+y.toFixed(1)});
    g+='<path d="'+p+'" fill="none" stroke="'+cols[k]+'" stroke-width="2"/>'+'<rect x="'+(x1-250)+'" y="'+(y0+j*14)+'" width="10" height="3" fill="'+cols[k]+'"/>'+RD.t(x1-236,y0+5+j*14,names[k]+', median '+d.pct[2].toFixed(3),{fs:10.5})});
  [0.3,0.4,0.5,0.6,0.7,0.8,0.9,1.0].forEach(v=>{const x=x0+(v-0.3)/0.7*(x1-x0);g+=RD.t(x,y1+13,v.toFixed(1),{a:'middle',fs:10,fill:css('--mute')})});
  g+=RD.t((x0+x1)/2,y1+26,'best-match cosine in the SciFact index (bge-small)',{a:'middle',fs:10.5,fill:css('--mute')});
  host.innerHTML=RD.svg(W,H,g,'Best-match similarity per query set');
}
// golden-set power chart
function power(){
  const host=document.getElementById('prd-power');if(!host)return;
  const M=P.monitor,ns=M.ns,W=RD.width(host),H=190,x0=36,x1=W-12,y0=10,y1=H-30;
  const names=['IVF nprobe 1','backfill half done','IVF nprobe 8','HNSW efSearch 16'],cols=[css('--c2'),css('--c4'),css('--c1'),css('--c5')];
  const X=i=>x0+i/(ns.length-1)*(x1-x0),Y=v=>y1-v*(y1-y0);let g='';
  [0,0.5,1].forEach(v=>{g+='<line x1="'+x0+'" x2="'+x1+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="'+css('--line')+'"/>'+RD.t(x0-4,Y(v)+4,Math.round(v*100)+'%',{a:'end',fs:10,fill:css('--mute')})});
  ns.forEach((n,i)=>g+=RD.t(X(i),y1+13,n,{a:'middle',fs:10,fill:css('--mute')}));
  g+=RD.t((x0+x1)/2,y1+26,'golden-set size (claims)',{a:'middle',fs:10.5,fill:css('--mute')});
  let leg='';
  names.forEach((nm,k)=>{const c=M.ci[nm];let p='';ns.forEach((n,i)=>p+=(i?'L':'M')+X(i).toFixed(1)+','+Y(c.power[n]).toFixed(1));
    g+='<path d="'+p+'" fill="none" stroke="'+cols[k]+'" stroke-width="2"/>';ns.forEach((n,i)=>g+='<circle cx="'+X(i)+'" cy="'+Y(c.power[n])+'" r="2.6" fill="'+cols[k]+'"/>');
    leg+='<span><svg width="12" height="4"><rect width="12" height="4" fill="'+cols[k]+'"/></svg>'+esc(nm)+' (nDCG '+c.ndcg.toFixed(3)+')</span>'});
  host.innerHTML=RD.svg(W,H,g,'Power of a paired test by golden-set size');
  document.getElementById('prd-power-leg').innerHTML=leg+'<span>baseline nDCG@10 '+M.baseline_ndcg.toFixed(3)+'</span>';
}
// section 9: the worked example's cost per query, split by stage (cost_model.py's formulas at its defaults)
function costBar(){
  const el=document.getElementById('prd-cost-bar');if(!el||!P.costdef)return;const d=P.costdef;
  const embed=d.q_tok*d.p_embed/1e6,rer=(d.q_tok*d.K+d.K*d.chunk_tok)*d.p_rerank/1e6;
  const sc=d.sys_cached?d.sys_tok:0,gen=((d.sys_tok-sc+d.k*d.chunk_tok+d.q_tok)*d.p_in+sc*d.p_cached+d.out_tok*d.p_out)/1e6;
  const month=(d.n_chunks*d.chunk_tok*d.churn*d.p_embed/1e6+d.n_chunks*d.dims*4/1e9*d.p_gb_month)/d.queries_month;
  const tot=embed+rer+gen+month,parts=[['generate',gen,'--c2'],['rerank',rer,'--c4'],['storage and re-embedding',month,'--c5'],['embed query',embed,'--c1']];
  const u=x=>'$'+(x>=0.0001?x.toFixed(5):x.toFixed(7).replace(/0+$/,''));
  el.innerHTML=parts.map(x=>{const w=100*x[1]/tot;return '<span style="width:'+w+'%;background:var('+x[2]+')">'+(w>20?x[0]+' '+Math.round(w)+'%':'')+'</span>'}).join('');
  document.getElementById('prd-cost-leg').innerHTML=parts.map(x=>'<span><svg width="10" height="10"><rect width="10" height="10" fill="'+css(x[2])+'"/></svg>'+x[0]+' '+u(x[1])+' ('+(100*x[1]/tot).toFixed(1)+'%)</span>').join('');
}
const all=()=>{scHist();drift();power();costBar()};
RD.onRender(all);RD.onResize(all);all();
})();
