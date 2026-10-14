// ---- Reading tab (t-read): inline charts and widgets, all drawn from window.VIX (data/*.json) ----
(function(){
  const V=window.VIX;if(!V)return;const R=V.r,$=id=>document.getElementById(id),esc=RD.esc;
  const fmt=x=>x>=1e9?(x/1e9).toFixed(1)+' G':x>=1e6?(x/1e6).toFixed(1)+' M':x>=1e3?(x/1e3).toFixed(1)+' k':String(Math.round(x*10)/10);
  // generic line/scatter chart. series: [{name,color,pts:[[x,y,tip]],dash,dots}]
  function chart(el,series,o){const W=Math.max(270,Math.min(RD.width(el),760)),H=o.h||Math.round(Math.min(360,W*0.56));const L=46,Rm=12,T=12,Bm=36;
    const xs=series.flatMap(s=>s.pts.map(p=>p[0])),ys=series.flatMap(s=>s.pts.map(p=>p[1]));
    const tx=v=>o.xlog?Math.log10(v):v,ty=v=>o.ylog?Math.log10(v):v;
    let x0=o.x0!==undefined?o.x0:Math.min(...xs.map(tx)),x1=o.x1!==undefined?o.x1:Math.max(...xs.map(tx));if(o.xlog){x0=Math.floor(x0*4)/4;x1=Math.ceil(x1*4)/4}
    let y0=o.y0!==undefined?o.y0:Math.min(...ys.map(ty)),y1=o.y1!==undefined?o.y1:Math.max(...ys.map(ty));if(y1===y0)y1=y0+1;if(x1===x0)x1=x0+1;
    const X=v=>L+(tx(v)-x0)/(x1-x0)*(W-L-Rm),Y=v=>T+(1-(ty(v)-y0)/(y1-y0))*(H-T-Bm);let s='';
    const xt=o.xlog?[...Array(Math.floor(x1)-Math.ceil(x0)+1).keys()].map(i=>Math.pow(10,Math.ceil(x0)+i)):(o.xticks||[]);
    xt.forEach(v=>{const x=X(v);s+='<line x1="'+x+'" y1="'+T+'" x2="'+x+'" y2="'+(H-Bm)+'" stroke="var(--line)"/>'+RD.t(x,H-Bm+13,o.xfmt?o.xfmt(v):fmt(v),{a:'middle',fs:10,fill:'var(--mute)'})});
    (o.yticks||[]).forEach(v=>{const y=Y(v);s+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-Rm)+'" y2="'+y+'" stroke="var(--line)"/>'+RD.t(L-4,y+3,o.yfmt?o.yfmt(v):String(v),{a:'end',fs:10,fill:'var(--mute)'})});
    (o.hlines||[]).forEach(h=>{const y=Y(h[0]);s+='<line x1="'+L+'" y1="'+y+'" x2="'+(W-Rm)+'" y2="'+y+'" stroke="'+(h[2]||'var(--bad)')+'" stroke-dasharray="4 3"/>'+RD.t(W-Rm-2,y-4,h[1],{a:'end',fs:10,fill:h[2]||'var(--bad)'})});
    series.forEach(se=>{const p=se.pts.slice();if(se.line!==false&&p.length>1)s+='<polyline fill="none" stroke="'+se.color+'" stroke-width="'+(se.w||1.8)+'"'+(se.dash?' stroke-dasharray="5 3"':'')+' points="'+p.map(q=>X(q[0]).toFixed(1)+','+Y(q[1]).toFixed(1)).join(' ')+'"/>';
      if(se.dots!==false)p.forEach(q=>{s+='<circle cx="'+X(q[0]).toFixed(1)+'" cy="'+Y(q[1]).toFixed(1)+'" r="'+(se.r||3)+'" fill="'+se.color+'"><title>'+esc(q[2]||'')+'</title></circle>'})});
    s+=RD.t((L+W)/2,H-4,o.xlabel||'',{a:'middle',fs:11,fill:'var(--mute)'})+RD.t(L+4,T+10,o.ylabel||'',{fs:11,fill:'var(--mute)'});
    const leg=series.filter(x=>x.name).map(x=>'<span style="white-space:nowrap;margin-right:12px"><span style="display:inline-block;width:14px;height:3px;background:'+x.color+';vertical-align:3px;margin-right:4px"></span>'+esc(x.name)+'</span>').join('');
    el.innerHTML=RD.svg(W,H,s,o.label||'chart')+(leg?'<div class="small" style="margin-top:2px">'+leg+'</div>':'')}
  const C=['var(--c1)','var(--c2)','var(--c3)','var(--c4)','var(--c5)','var(--c6)','var(--ink)'];
  const draws=[];const reg=f=>{draws.push(f);RD.onRender(f)};RD.onResize(()=>draws.forEach(f=>{try{f()}catch(e){window.__jsErr&&window.__jsErr(e.message)}}));
  // ---------- predict widgets
  document.querySelectorAll('#t-read .prd').forEach(p=>p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{const ok=b.dataset.k===p.dataset.ans;
    p.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.k===p.dataset.ans)x.classList.add('right')});if(!ok)b.classList.add('wrong');
    const a=p.querySelector('.ans');a.hidden=false;if(!a.querySelector('.verdict'))a.insertAdjacentHTML('afterbegin','<span class="verdict">'+(ok?'Right.':'Not quite.')+'</span>')})));
  // ---------- R1: nDCG@10 against ANN recall@10 (SciFact)
  reg(()=>{const el=$('vix-r1');if(!el)return;const ex=R.ivf.scifact_exact['ndcg@10'];
    const hp=[];R.hnsw.scifact_qwen3.grid.forEach(g=>g.rows.forEach(r=>hp.push([r.recall10,r['ndcg@10'],'HNSW M'+g.M+' efC'+g.efc+' ef'+r.ef])));
    const ip=[];R.ivf.scifact_qwen3.forEach(g=>g.rows.forEach(r=>ip.push([r.recall10,r['ndcg@10'],'IVF'+g.nlist+' nprobe '+r.nprobe])));
    chart(el,[{name:'HNSW settings',color:'var(--c4)',pts:hp,line:false},{name:'IVF settings',color:'var(--c1)',pts:ip,line:false}],{x0:0.4,x1:1.0,y0:0.35,y1:0.72,xticks:[0.4,0.5,0.6,0.7,0.8,0.9,1.0],xfmt:v=>v.toFixed(1),yticks:[0.4,0.5,0.6,0.7],yfmt:v=>v.toFixed(2),hlines:[[ex,'exact search '+ex.toFixed(3)]],xlabel:'ANN recall@10 (against exact search)',ylabel:'nDCG@10 (human labels)',label:'nDCG against ANN recall'});
    $('vix-r1-cap').textContent='SciFact, 300 test claims, Qwen3-Embedding. Each dot is one index setting ('+hp.length+' HNSW, '+ip.length+' IVF). Measured here, deterministic.'});
  // ---------- R2: exact search calculator + measured scaling
  const sc=R.bench.quora.exact_scaling.map(r=>Object.assign({d:384},r)).concat(R.bench.all4.exact_scaling.filter(r=>r.n===25039).map(r=>Object.assign({d:1024},r))).concat(R.bench.scifact.exact_scaling.filter(r=>r.n===5183).map(r=>Object.assign({d:1024},r)));
  const med=a=>a.slice().sort((x,y)=>x-y)[1];
  const qs=R.bench.quora.exact_scaling.find(r=>r.n===522931);const GB=522931*384*4/(med(qs.ms_per_query_passes)/1000)/1e9;
  function r2(){const n=Math.pow(10,+$('vix-r2-n').value),d=+$('vix-r2-d').value,b=+$('vix-r2-b').value;$('vix-r2-nv').textContent=fmt(n);
    const bytes=n*d*b,ms=bytes/(GB*1e9)*1000;
    $('vix-r2-out').innerHTML=RD.stat('Multiply-adds per query',fmt(n*d),'N &times; d')+RD.stat('Bytes read per query',fmt(bytes)+'B','N &times; d &times; bytes')+RD.stat('Time, one query, one core',ms<1?ms.toFixed(2)+' ms':ms<1000?ms.toFixed(0)+' ms':(ms/1000).toFixed(1)+' s','at the measured '+GB.toFixed(0)+' GB/s')+RD.stat('Queries per second, one core',ms>0?fmt(1000/ms):'','');
    const el=$('vix-r2-plot');const pts=sc.map(r=>[r.n*r.d*4,med(r.ms_per_query_passes),r.n.toLocaleString('en-US')+' x '+r.d+': '+med(r.ms_per_query_passes)+' ms']).sort((a,b)=>a[0]-b[0]);
    chart(el,[{name:'measured (FAISS IndexFlatIP, 1 thread)',color:'var(--c1)',pts},{name:'model: bytes / '+GB.toFixed(0)+' GB/s',color:'var(--mute)',dash:true,dots:false,pts:[[1e7,1e7/(GB*1e9)*1000],[Math.max(1e9,bytes),Math.max(1e9,bytes)/(GB*1e9)*1000]]},{name:'your setting',color:'var(--bad)',line:false,r:5,pts:[[bytes,ms,'your setting']]}],
      {xlog:true,ylog:true,xlabel:'bytes scanned per query (log)',ylabel:'ms per query (log)',yticks:[0.1,1,10,100,1000].filter(v=>v<=Math.max(ms*2,200)),yfmt:v=>String(v),label:'exact search time against bytes'});
    $('vix-r2-cap').textContent='Measured points: SciFact 5,183 x 1,024, the four corpora 25,039 x 1,024 and Quora prefixes from 5,000 to 522,931 x 384, timed under the bench lock (load average '+Math.min(...sc.map(r=>r.load[0])).toFixed(1)+' to '+Math.max(...sc.map(r=>r.load[0])).toFixed(1)+'). Small collections fit in the caches and run faster than the line.'}
  ['vix-r2-n','vix-r2-d','vix-r2-b'].forEach(i=>{const e=$(i);if(e)e.addEventListener(i==='vix-r2-n'?'input':'change',r2)});if($('vix-r2-n'))reg(r2);
  // ---------- R3a: rank of the cell holding each true neighbour
  reg(()=>{const el=$('vix-r3a');if(!el)return;const c=R.ivf.cell_rank_of_true_neighbours;const ks=Object.keys(c.hist);const mx=Math.max(...ks.map(k=>c.hist[k]));
    el.innerHTML='<div class="bars">'+ks.map(k=>'<div class="row"><span class="nm">cell rank '+k+'</span><span class="track"><span class="fill" style="width:'+(100*c.hist[k]/mx).toFixed(1)+'%;background:var(--c1)"></span></span><span class="val">'+c.hist[k]+'</span></div>').join('')+'<div class="row"><span class="nm">rank 13 to 72</span><span class="track"><span class="fill" style="width:'+(100*c.over12/mx).toFixed(1)+'%;background:var(--c2)"></span></span><span class="val">'+c.over12+'</span></div></div>'});
  // ---------- R3: IVF recall curves by nlist
  let r3x='nprobe';RD.seg($('vix-r3-x'),v=>{r3x=v;draw3()});
  function draw3(){const el=$('vix-r3');if(!el)return;const se=R.ivf.scifact_qwen3.map((g,i)=>({name:'nlist '+g.nlist,color:C[i],pts:g.rows.map(r=>[r3x==='nprobe'?r.nprobe:r.ndis,r.recall10,'nlist '+g.nlist+', nprobe '+r.nprobe+': '+r.recall10.toFixed(3)+', '+Math.round(r.ndis)+' distances'])}));
    chart(el,se,{xlog:true,y0:0.3,y1:1.0,yticks:[0.4,0.6,0.8,0.9,1.0],yfmt:v=>v.toFixed(1),xlabel:r3x==='nprobe'?'nprobe (log)':'distances per query (log; exact = 5,183)',ylabel:'recall@10',label:'IVF recall'});
    $('vix-r3-cap').textContent='SciFact, Qwen3-Embedding, FAISS IndexIVFFlat, seed 1234. Measured here, deterministic.'}
  reg(draw3);
  // ---------- R4: quantization bars
  let r4set='scifact',r4rs='0';RD.seg($('vix-r4-set'),v=>{r4set=v;draw4()});RD.seg($('vix-r4-rs'),v=>{r4rs=v;draw4()});
  function draw4(){const el=$('vix-r4');if(!el)return;const rows=R.quant[r4set].rows;const pick=n=>rows.find(r=>r.name===n);
    const base=[['float32 (exact)','Flat (exact float32)',4096],['float16','Scalar fp16',2048],['int8','Scalar int8 (SQ8)',1024],['int4','Scalar int4 (SQ4)',512],['RaBitQ 1-bit','RaBitQ (1 bit)',136,'RaBitQ + rescore x10'],['binary 1-bit','Binary (1 bit), no rescoring',128,'Binary (1 bit), rescore 100'],['PQ 256 B','PQ m=256',256,'PQ m=256 + rescore x10'],['PQ 128 B','PQ m=128',128,'PQ m=128 + rescore x10'],['PQ 64 B','PQ m=64',64,'PQ m=64 + rescore x10'],['OPQ 64 B','OPQ m=64',64],['PQ 32 B','PQ m=32',32,'PQ m=32 + rescore x10'],['OPQ 32 B','OPQ m=32',32],['PQ 16 B','PQ m=16',16,'PQ m=16 + rescore x10'],['OPQ 16 B','OPQ m=16',16],['PQ 8 B','PQ m=8',8,'PQ m=8 + rescore x10']];
    el.innerHTML='<div class="bars">'+base.map(b=>{const r=pick(r4rs==='1'&&b[3]?b[3]:b[1]);if(!r)return '';const v=r.recall10;return '<div class="row"><span class="nm">'+b[0]+' <span class="mute">('+b[2]+' B)</span></span><span class="track"><span class="fill" style="width:'+(100*v).toFixed(1)+'%;background:'+(r4rs==='1'&&b[3]?'var(--c3)':'var(--c1)')+'"></span></span><span class="val">'+v.toFixed(3)+'</span></div>'}).join('')+'</div>';
    $('vix-r4-cap').textContent='Recall@10 against exact search. Bytes are the code per vector (codebooks and the d x d OPQ rotation are shared and not counted). Rescoring: the best 100 by approximate score (binary: 100 Hamming neighbours) re-ranked with float32 vectors. '+R.quant[r4set].n.toLocaleString('en-US')+' vectors, '+R.quant[r4set].queries+' queries.'}
  reg(draw4);
  // ---------- R6l: levels measured vs expected
  reg(()=>{const el=$('vix-r6l');if(!el)return;const s=R.hnsw.scifact_qwen3;const Ms=[4,8,16,32,48];
    let h='<table><tr><th>M</th>'+[0,1,2,3,4,5,6].map(l=>'<th class="num">level '+l+'</th>').join('')+'</tr>';
    Ms.forEach(M=>{const g=s.grid.find(x=>x.M===M);const ex=s.expected_levels[String(M)];h+='<tr><td>'+M+'</td>'+[0,1,2,3,4,5,6].map(l=>{const m=g.graph.level_counts[String(l)]||0,e=ex[String(l)];return '<td class="num">'+(m||e?m+' <span class="mute">('+(e===undefined?'0':e<1?e.toFixed(1):Math.round(e))+')</span>':'')+'</td>'}).join('')+'</tr>'});
    el.innerHTML='<div class="tw">'+h+'</table></div><p class="small mute">Nodes whose top level is l, measured on 5,183 vectors (FAISS, seed 12345), with the expectation N &middot; M<sup>&minus;l</sup>(1 &minus; 1/M) in brackets.</p>'});
  // ---------- R6: M x efConstruction grid + curves
  const efs=R.hnsw.scifact_qwen3.grid[0].rows.map(r=>r.ef);const se6=$('vix-r6-ef');if(se6){efs.forEach(e=>{const o=document.createElement('option');o.value=e;o.textContent=e;if(e===40)o.selected=true;se6.appendChild(o)});se6.addEventListener('change',draw6);$('vix-r6-m').addEventListener('change',draw6)}
  function draw6(){const el=$('vix-r6');if(!el)return;const ef=+se6.value,m=$('vix-r6-m').value;const g=R.hnsw.scifact_qwen3.grid;const Ms=[...new Set(g.map(x=>x.M))],Es=[...new Set(g.map(x=>x.efc))];
    const val=x=>{const r=x.rows.find(r=>r.ef===ef);return m==='ndis'?Math.round(r.ndis):m==='ndcg'?r['ndcg@10'].toFixed(3):r.recall10.toFixed(3)};
    el.innerHTML='<table><tr><th>M \\ efConstruction</th>'+Es.map(e=>'<th class="num">'+e+'</th>').join('')+'<th class="num">bytes per vector</th></tr>'+Ms.map(M=>'<tr><td>'+M+'</td>'+Es.map(e=>'<td class="num">'+val(g.find(x=>x.M===M&&x.efc===e))+'</td>').join('')+'<td class="num">'+Math.round(g.find(x=>x.M===M).index_bytes/R.hnsw.scifact_qwen3.n).toLocaleString('en-US')+'</td></tr>').join('')+'</table>';
    const se=Ms.map((M,i)=>{const x=g.find(y=>y.M===M&&y.efc===100);return {name:'M '+M+' (efC 100)',color:C[i],pts:x.rows.map(r=>[r.ndis,r.recall10,'M '+M+', ef '+r.ef+': '+r.recall10.toFixed(3)+', '+Math.round(r.ndis)+' distances'])}});
    chart($('vix-r6c'),se,{xlog:true,y0:0.6,y1:1.0,yticks:[0.6,0.7,0.8,0.9,1.0],yfmt:v=>v.toFixed(1),xlabel:'distances per query (log; exact = 5,183)',ylabel:'recall@10',label:'HNSW recall against work'});
    $('vix-r6-cap').textContent='SciFact, 300 claims, FAISS IndexHNSWFlat built on one thread; table at ef '+ef+'; curves sweep ef from 10 to 800. Bytes per vector: the serialized index (vectors plus graph) divided by 5,183.'}
  reg(draw6);
  // ---------- R6v: variants
  let r6set='all4';RD.seg($('vix-r6v-set'),v=>{r6set=v;draw6v()});
  function draw6v(){const el=$('vix-r6v');if(!el)return;const v=R.variants[r6set];const nm={hnsw:'HNSW (layers + heuristic)',simple:'layers + closest-M links',flat:'one layer + heuristic'};
    chart(el,['hnsw','simple','flat'].map((k,i)=>({name:nm[k],color:C[i],dash:k==='flat',pts:v.variants[k].rows.map(r=>[r.ndis,r.recall10,nm[k]+', ef '+r.ef+': '+r.recall10.toFixed(3)])})),{xlog:true,y0:0.7,y1:1.0,yticks:[0.7,0.8,0.9,1.0],yfmt:v=>v.toFixed(1),xlabel:'distances per query (log)',ylabel:'recall@10',label:'HNSW variants'});
    $('vix-r6v-cap').textContent=v.n.toLocaleString('en-US')+' vectors, '+v.queries+' queries, M 16, efConstruction '+v.efc+', ef 10 to 160; built with the port (pyhnsw.py). Unreachable nodes on layer 0: '+['hnsw','simple','flat'].map(k=>nm[k]+' '+v.variants[k].unreachable).join(', ')+'.'}
  reg(draw6v);
  // ---------- R7: Vamana vs HNSW
  let r7x='hops';RD.seg($('vix-r7-x'),v=>{r7x=v;draw7()});
  function draw7(){const el=$('vix-r7');if(!el)return;const vm=R.vamana;const se=vm.rows.map((r,i)=>({name:'Vamana alpha '+r.alpha+' (R 32)',color:C[i],pts:r.search.map(x=>[r7x==='hops'?x.hops:x.ndis,x.recall10,'alpha '+r.alpha+', L '+x.L+': '+x.recall10.toFixed(3)])}));
    se.push({name:'HNSW (hnswlib, M 16)',color:'var(--ink)',dash:true,pts:vm.hnsw_same_vectors.rows.map(x=>[r7x==='hops'?x.hops:x.ndis,x.recall10,'HNSW ef '+x.ef+': '+x.recall10.toFixed(3)])});
    chart(el,se,{xlog:true,y0:0.88,y1:1.0,yticks:[0.9,0.95,1.0],yfmt:v=>v.toFixed(2),xlabel:r7x==='hops'?'nodes expanded per query (log)':'distances per query (log)',ylabel:'recall@10',label:'Vamana against HNSW'});
    $('vix-r7-cap').textContent='SciFact, 300 claims. Vamana written here from the paper (L 100 at build, two passes); search list L from 10 to 160. HNSW hops include the upper-layer steps.'}
  reg(draw7);
  // ---------- R8: ScaNN table
  let r8set='scifact';RD.seg($('vix-r8-set'),v=>{r8set=v;draw8()});
  function draw8(){const el=$('vix-r8');if(!el)return;const rows=R.scann.sets[r8set].rows;
    el.innerHTML='<table><tr><th>Configuration</th><th class="num">bytes</th><th class="num">anisotropic (T 0.2)</th><th class="num">isotropic</th></tr>'+
      [...new Set(rows.map(r=>(r.tree?'tree '+r.tree+' leaves, search '+r.leaves_to_search+', ':'')+'AH '+r.dims_per_block+' dims/block'+(r.reorder?', reorder '+r.reorder:'')))].map(k=>{const m=rows.filter(r=>((r.tree?'tree '+r.tree+' leaves, search '+r.leaves_to_search+', ':'')+'AH '+r.dims_per_block+' dims/block'+(r.reorder?', reorder '+r.reorder:''))===k);const a=m.find(r=>r.anisotropic),i=m.find(r=>!r.anisotropic);
      return '<tr><td>'+esc(k)+'</td><td class="num">'+m[0].code_bytes+'</td><td class="num">'+(a?a.recall10.toFixed(3):'')+'</td><td class="num">'+(i?i.recall10.toFixed(3):'')+'</td></tr>'}).join('')+'</table>'}
  reg(draw8);
  // ---------- R9: filter summary table and chart
  reg(()=>{const el=$('vix-r9t');if(!el)return;const F=R.filter,A=R.acorn||{qasper:{},all4:{selectivity:[]}};const g=(rows,s,st)=>rows.find(r=>r.strategy===s&&r.setting===st);
    const sc=[['QASPER, own paper (0.35%)',F.qasper.own,A.qasper.own],['QASPER, another paper (0.35%)',F.qasper.other,A.qasper.other],['Four corpora, random 1%',F.all4.selectivity.find(x=>x.s===0.01).rows,(A.all4.selectivity.find(x=>x.s===0.01)||{}).rows],['Four corpora, random 10%',F.all4.selectivity.find(x=>x.s===0.1).rows,(A.all4.selectivity.find(x=>x.s===0.1)||{}).rows],['Four corpora, another source (24%)',F.all4.source_other,A.all4.source_other]];
    const cols=[['pre-filter + exact',''],['post-filter',"k'=100"],['in-graph (hnswlib rule)','ef=100'],['FAISS HNSW + IDSelector','ef=100'],['ACORN-1 (unpruned graph)','ef=100']];
    el.innerHTML='<table><tr><th>Filter</th><th class="num">pre-filter</th><th class="num">post-filter</th><th class="num">hnswlib in-graph</th><th class="num">FAISS + selector</th><th class="num">ACORN-1</th></tr>'+sc.map(([n,a,b])=>'<tr><td>'+n+'</td>'+cols.map(([s,st])=>{const r=g(a.concat(b||[]),s,st);return '<td class="num">'+(r?r.recall10.toFixed(2)+'<br><span class="mute">'+fmt(r.ndis)+'</span>':'')+'</td>'}).join('')+'</tr>').join('')+'</table><p class="small mute">Each cell: recall@10 (top) and distances per query (below).</p>'});
  reg(()=>{const el=$('vix-r9');if(!el)return;const S=R.filter.all4.selectivity,A=(R.acorn&&R.acorn.all4&&R.acorn.all4.selectivity)||[];
    const best=(rows,s)=>{const c=rows.filter(r=>r.strategy===s).sort((a,b)=>a.ndis-b.ndis);return c.find(r=>r.recall10>=0.95)};
    const ser=[['pre-filter + exact','var(--ink)'],['post-filter','var(--c2)'],['in-graph (hnswlib rule)','var(--c1)'],['ACORN-1 (unpruned graph)','var(--c3)']].map(([s,c])=>({name:s,color:c,pts:S.map((x,i)=>{const ai=A.find(y=>y.s===x.s);const r=best(x.rows.concat(ai?ai.rows:[]),s);return r?[x.s*100,Math.max(1,r.ndis),s+' at '+(x.s*100)+'%: '+r.setting+' recall '+r.recall10.toFixed(3)]:null}).filter(Boolean)}));
    chart(el,ser,{xlog:true,ylog:true,xfmt:v=>v+'%',yticks:[1,10,100,1000,10000],yfmt:v=>fmt(v),xlabel:'share of rows that pass the filter (log)',ylabel:'distances per query',label:'filtered search work'})});
  // ---------- R10: deletes
  reg(()=>{const el=$('vix-r10');if(!el)return;const u=R.updates.rows;
    chart(el,[{name:'tombstones, ef 40',color:'var(--c2)',pts:u.map(r=>[r.deleted_share*100,r.tomb_ef40.ndis,'deleted '+r.deleted_share*100+'%: recall '+r.tomb_ef40.recall10.toFixed(3)])},{name:'rebuilt on live rows, ef 40',color:'var(--c1)',pts:u.map(r=>[r.deleted_share*100,r.rebuilt_ef40.ndis,'deleted '+r.deleted_share*100+'%: recall '+r.rebuilt_ef40.recall10.toFixed(3)])}],
      {x0:0,x1:70,xticks:[0,10,30,50,70],xfmt:v=>v+'%',y0:0,y1:1500,yticks:[0,500,1000,1500],xlabel:'share of rows deleted',ylabel:'distances per query',label:'cost of tombstones'});
    $('vix-r10-cap').textContent='Recall@10 stayed between '+Math.min(...u.map(r=>r.tomb_ef40.recall10)).toFixed(3)+' and '+Math.max(...u.map(r=>r.tomb_ef40.recall10)).toFixed(3)+' with tombstones at ef 40; hnswlib itself gave the same recall as the port at every point ('+u.map(r=>r.hnswlib_tomb_ef40_recall10.toFixed(3)).join(', ')+').'});
  // ---------- R11: memory calculator with checks
  function r11(){const el=$('vix-r11');if(!el)return;const n=Math.pow(10,+$('vix-r11-n').value),d=+$('vix-r11-d').value,M=+$('vix-r11-m').value,m=+$('vix-r11-pq').value;$('vix-r11-nv').textContent=fmt(n);
    const nl=Math.round(Math.sqrt(n));const it=[['Flat float32',n*d*4],['Flat int8',n*d],['IVF-Flat',n*(4*d+8)+nl*4*d],['IVF-PQ '+m+' B',n*(m+8)+nl*4*d+256*4*d],['IVF-PQ + float32 for rescoring',n*(m+8)+nl*4*d+256*4*d+n*4*d],['HNSW (hnswlib), M '+M,n*(4+8*M+4*d+8)+n/(M-1)*(4*M+4)],['HNSW over int8, M '+M,n*(4+8*M+d+8)+n/(M-1)*(4*M+4)],['Binary 1-bit',n*d/8]];
    const mx=Math.max(...it.map(x=>x[1]));const gb=x=>x>=1e12?(x/1e12).toFixed(2)+' TB':x>=1e9?(x/1e9).toFixed(1)+' GB':(x/1e6).toFixed(1)+' MB';
    el.innerHTML='<div class="bars">'+it.map(x=>'<div class="row"><span class="nm">'+x[0]+'</span><span class="track"><span class="fill" style="width:'+(100*x[1]/mx).toFixed(1)+'%;background:var(--c1)"></span></span><span class="val">'+gb(x[1])+'</span></div>').join('')+'</div>'}
  ['vix-r11-n','vix-r11-d','vix-r11-m','vix-r11-pq'].forEach(i=>{const e=$(i);if(e)e.addEventListener(i==='vix-r11-n'?'input':'change',r11)});reg(r11);
  reg(()=>{const el=$('vix-r11-chk');if(!el)return;const pc=R.port_check;const n=pc.n,d=1024,M=16;const lv=pc.levels;let up=0;Object.keys(lv).forEach(l=>{up+=(+l)*lv[l]});
    const fh=n*(4+8*M+4*d+8)+up*(4*M+4)+n*4;const rows=[['hnswlib file, SciFact, M 16 (levels as built)',fh,pc.file_bytes]];
    R.hnsw.scifact_qwen3.grid.filter(g=>g.efc===100).forEach(g=>{const N=R.hnsw.scifact_qwen3.n;let ups=0;Object.keys(g.graph.level_counts).forEach(l=>{ups+=(+l)*g.graph.level_counts[l]});const f=N*4*d+4*(2*g.M*N+g.M*ups)+N*12;rows.push(['FAISS IndexHNSWFlat, SciFact, M '+g.M,f,g.index_bytes])});
    el.innerHTML='<table><tr><th>Index</th><th class="num">formula</th><th class="num">measured</th><th class="num">difference (bytes)</th></tr>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="num">'+Math.round(r[1]).toLocaleString('en-US')+'</td><td class="num">'+r[2].toLocaleString('en-US')+'</td><td class="num">'+Math.round(r[2]-r[1]).toLocaleString('en-US')+'</td></tr>').join('')+'</table><p class="small mute">The few hundred bytes left over are file headers and parameters.</p>'});
  // ---------- R12: scaling of work with N
  let r12t='0.95';RD.seg($('vix-r12-t'),v=>{r12t=v;draw12()});
  function draw12(){const el=$('vix-r12');if(!el||!R.scale)return;const rs=R.scale.rows;const k='at_'+(+r12t);
    const ser=[{name:'exact',color:'var(--ink)',pts:rs.map(r=>[r.n,r.exact_ndis,'exact: '+r.n])},{name:'IVF-Flat (nlist = sqrt N)',color:'var(--c1)',pts:rs.filter(r=>r[k].ivf_ndis).map(r=>[r.n,r[k].ivf_ndis,'nprobe '+r[k].ivf_nprobe])},{name:'HNSW (M 16)',color:'var(--c4)',pts:rs.filter(r=>r[k].hnsw_ndis).map(r=>[r.n,r[k].hnsw_ndis,'ef '+r[k].hnsw_ef])}];
    chart(el,ser,{xlog:true,ylog:true,yticks:[100,1000,10000,100000,1000000],yfmt:v=>fmt(v),xlabel:'vectors N (log)',ylabel:'distances per query at recall '+r12t,label:'work against N'});
    $('vix-r12-cap').textContent='Quora prefixes, MiniLM-L6 384-d, 1,000 queries; the smallest nprobe or ef reaching the target. Measured here, deterministic (FAISS counters).'}
  reg(draw12);
})();
