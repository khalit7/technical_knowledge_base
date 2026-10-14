// ---- Vector search lab: exact vs HNSW vs IVF-PQ lists; the two recalls; the frontier summary ----
(function(){
  const V=window.VEC,$=V.$,esc=V.esc,f3=V.f3;
  // --- before/after lists
  const LS=V.D.lists,RH=28;
  const stages=[{nm:'Exact',list:LS.exact,sc:'cos'},{nm:'HNSW',list:LS.hnsw.list,sc:'cos'},{nm:'IVF-PQ',list:LS.ivfpq.list,sc:'score'}];
  const exIds=LS.exact.map(x=>x.id);
  const all={};stages.forEach(s=>s.list.forEach(x=>{all[x.id]=all[x.id]||x}));
  const box=$('vec-ba-list');
  const rowsEl={};
  Object.keys(all).forEach(id=>{const x=all[id];const e=document.createElement('div');e.className='vec-row'+(x.rel?' gold':'');
    e.innerHTML='<span class="r"></span><span class="t" title="'+esc(x.title)+'">'+esc(x.title)+'</span><span class="s"></span>';e.style.top='0px';e.style.opacity=0;box.appendChild(e);rowsEl[id]=e});
  const maxMiss=Math.max(...stages.map(s=>exIds.filter(id=>!s.list.some(x=>x.id===id)).length));
  box.style.height=((10+maxMiss)*RH+22)+'px';
  const sep=document.createElement('div');sep.className='vec-small';sep.style.position='absolute';sep.style.left='0';sep.textContent='true top 10 not returned:';box.appendChild(sep);
  const rc=LS.relevant_cells&&LS.relevant_cells[0];
  const caps=[
    'Exact search compares the claim with all 5,183 abstracts. The abstract annotators marked relevant ("'+esc(LS.exact.find(x=>x.rel).title)+'") is at rank '+(LS.exact.findIndex(x=>x.rel)+1)+'. This list is the reference both indexes are judged against.',
    'HNSW ('+esc(LS.hnsw.params)+') walks a graph instead of scanning. It returns '+LS.hnsw.list.filter(x=>exIds.includes(x.id)).length+' of the exact top 10; the walk stopped before reaching the others, so abstracts from exact ranks '+LS.hnsw.list.filter(x=>!exIds.includes(x.id)).map(x=>x.exact_rank).join(' and ')+' fill in. The relevant abstract survives, and the scores are exact cosines, so the order of what it found is right.',
    'IVF-PQ ('+esc(LS.ivfpq.params)+') opens the 4 nearest of 72 clusters and compares 32-byte codes. The relevant abstract lives in the cluster ranked '+(rc?rc.cell_rank:'?')+' for this claim, which was not opened, so it is gone. The codes also reorder what was found: the right column is the estimated score, and an abstract from exact rank '+Math.max(...LS.ivfpq.list.map(x=>x.exact_rank||0))+' climbs into the top 10. Rescoring cannot bring back what the cluster step skipped; a larger nprobe can.'];
  function draw(i){
    const s=stages[i];const inL=new Set(s.list.map(x=>x.id));
    Object.keys(rowsEl).forEach(id=>{const e=rowsEl[id];const k=s.list.findIndex(x=>x.id===id);
      e.classList.remove('miss','new');
      if(k>=0){const x=s.list[k];e.style.top=(k*RH)+'px';e.style.opacity=1;e.querySelector('.r').textContent=(k+1)+(x.exact_rank&&x.exact_rank!==k+1?' ('+x.exact_rank+')':'');
        e.querySelector('.s').textContent=(s.sc==='cos'?x.cos:x.score).toFixed(3);if(!exIds.includes(id))e.classList.add('new')}
      else if(exIds.includes(id)){const m=exIds.filter(z=>!inL.has(z)).indexOf(id);e.style.top=((10+m)*RH+22)+'px';e.style.opacity=1;e.classList.add('miss');
        e.querySelector('.r').textContent='('+(exIds.indexOf(id)+1)+')';e.querySelector('.s').textContent=all[id].cos.toFixed(3)}
      else{e.style.opacity=0}});
    sep.style.top=(10*RH+4)+'px';sep.style.display=exIds.some(z=>!inL.has(z))?'block':'none';
    $('vec-ba-cap').innerHTML='<b>Step '+(i+1)+' of 3, '+s.nm+'.</b> '+caps[i]+' <span class="vec-small">Rank (exact rank in brackets when different); right column: '+(s.sc==='cos'?'true cosine':'IVF-PQ\'s estimate')+'.</span>';
    $('vec-ba-seg').querySelectorAll('button').forEach(b=>{b.classList.toggle('on',+b.dataset.v===i);b.setAttribute('aria-pressed',+b.dataset.v===i?'true':'false')});
  }
  const A=V.anim({card:'vec-ba-card',ctl:'vec-ba-ctl',n:3,draw,ms:3800,label:'Index'});
  $('vec-ba-seg').addEventListener('click',e=>{const b=e.target.closest('button');if(b)A.go(+b.dataset.v)});
  const claimLine=document.createElement('div');claimLine.className='small';claimLine.innerHTML='Claim: <b>'+esc(LS.claim)+'</b>';$('vec-ba-cap').before(claimLine);

  // --- two recalls
  const TR=V.D.tr,rows=TR.rows,ex=rows[0];
  const FC={flat:'var(--ink)',hnsw:'var(--c1)',ivf:'var(--c3)',ivfpq:'var(--c2)','ivfpq+rescore':'var(--c4)'};
  const FN={flat:'exact',hnsw:'HNSW (efSearch 8 to 256)',ivf:'IVF-Flat (nprobe 1 to 32)',ivfpq:'IVF-PQ (nprobe 1 to 32)','ivfpq+rescore':'IVF-PQ + rescore 100'};
  function twoPlot(){
    const el=$('vec-two-plot'),W=V.width(el),H=270,L=46,R=12,T=10,B=40;
    const X=v=>L+(v-0.4)/0.62*(W-L-R),Y=v=>T+(1-(v-0.45)/0.42)*(H-T-B);
    let s='';
    for(let v=0.5;v<=0.86;v+=0.1)s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+V.T(L-5,Y(v)+4,v.toFixed(1),{a:'end',fs:10,fill:'var(--mute)'});
    for(let v=0.4;v<=1.001;v+=0.1)s+=V.T(X(v),H-B+14,v.toFixed(1),{a:'middle',fs:10,fill:'var(--mute)'});
    s+=V.T(L+(W-L-R)/2,H-6,'ANN recall@10 (against exact search)',{a:'middle',fs:10.5,fill:'var(--mute)'})+V.T(L-40,T+6,'',{fs:10});
    s+='<line x1="'+X(0.45)+'" y1="'+Y(0.45*ex.recall10)+'" x2="'+X(1)+'" y2="'+Y(ex.recall10)+'" stroke="var(--mute)" stroke-dasharray="4 3"/>';
    s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(ex.recall10)+'" y2="'+Y(ex.recall10)+'" stroke="var(--good)" stroke-dasharray="2 3"/>'+V.T(X(0.42),Y(ex.recall10)+13,'ceiling: exact search '+f3(ex.recall10),{fs:10,fill:'var(--good)'});
    Object.keys(FC).forEach(f=>{const R2=rows.filter(r=>r.family===f).sort((a,b)=>a.ann_recall10-b.ann_recall10);
      if(R2.length>1)s+='<path d="'+R2.map((r,i)=>(i?'L':'M')+X(r.ann_recall10).toFixed(1)+' '+Y(r.recall10).toFixed(1)).join('')+'" fill="none" stroke="'+FC[f]+'" stroke-width="1.4"/>';
      R2.forEach(r=>{s+='<circle cx="'+X(r.ann_recall10).toFixed(1)+'" cy="'+Y(r.recall10).toFixed(1)+'" r="'+(f==='flat'?5:3.5)+'" fill="'+FC[f]+'"><title>'+esc(r.label)+': ANN '+f3(r.ann_recall10)+', retrieval '+f3(r.recall10)+', nDCG '+f3(r.ndcg10)+'</title></circle>'})});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Retrieval recall against ANN recall">'+s+'</svg><div class="vec-leg">'+Object.keys(FC).map(k=>'<span><i style="background:'+FC[k]+'"></i>'+FN[k]+'</span>').join('')+'</div>';
  }
  const kept=rows.filter(r=>r.per_query);let ki=kept.findIndex(r=>r.label.indexOf('nprobe 8')>=0);if(ki<0)ki=1;
  $('vec-two-seg').innerHTML=kept.map((r,i)=>'<button data-v="'+i+'"'+(i===ki?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+esc(r.label.replace('Exact (flat)','Exact').replace(' M32 efSearch',' ef').replace('IVF72,PQ32','IVF-PQ').replace('IVF72','IVF'))+'</button>').join('');
  const GC={both:'var(--good)',lost:'var(--bad)',model:'var(--dim)',gain:'var(--c4)',part:'var(--c5)'};
  function grid(){
    const r=kept[ki],e=ex.per_query,q=r.per_query;let n={both:0,lost:0,model:0,gain:0,part:0};
    const cells=q.ret.map((v,i)=>{const x=e.ret[i];let k;
      if(x===0&&v===0)k='model';else if(v<x)k=v===0?'lost':'part';else if(v>x)k='gain';else k='both';n[k]++;
      return '<span style="background:'+GC[k]+'" title="claim '+(i+1)+': exact finds '+V.pc(x,0)+' of its relevant abstracts, this index '+V.pc(v,0)+'; '+(q.ann[i]*10).toFixed(0)+' of the exact top 10 returned"></span>'});
    $('vec-two-grid').innerHTML=cells.join('');
    $('vec-two-leg').innerHTML=[['both','found as well as exact search: '+n.both],['lost','exact finds it, the index loses it: '+n.lost],['part','the index loses some of several: '+n.part],['model','not in the exact top 10 either (the model\'s miss): '+n.model],['gain','the index finds more than exact (luck): '+n.gain]].map(([k,t])=>'<span><i style="background:'+GC[k]+'"></i>'+t+'</span>').join('');
    $('vec-two-note').innerHTML='<b>'+esc(r.label)+'</b>: ANN recall@10 '+f3(r.ann_recall10)+', retrieval recall@10 '+f3(r.recall10)+' (exact '+f3(ex.recall10)+'), nDCG@10 '+f3(r.ndcg10)+' (exact '+f3(ex.ndcg10)+'). Grey squares are failures no index setting can fix: the embedding model ranked the relevant abstract below 10. '+(r.family==='flat'?'':'Orange squares are the index\'s own losses.');
  }
  $('vec-two-seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;ki=+b.dataset.v;$('vec-two-seg').querySelectorAll('button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});grid()});
  const n8=rows.find(r=>r.label==='IVF72 nprobe 8');
  $('vec-two-pr-ans').innerHTML=V.pc(n8.recall10)+' (nDCG@10 '+f3(n8.ndcg10)+' against '+f3(ex.ndcg10)+'). The proportional guess, '+f3(ex.recall10)+' &times; '+f3(n8.ann_recall10)+' = '+V.pc(ex.recall10*n8.ann_recall10)+', is close: the index does not know which neighbours are relevant, so it loses them at about the rate it loses any neighbour. ANN recall is a fine proxy for the damage an index does, and says nothing about the '+V.pc(1-ex.recall10)+' that exact search already misses.';
  V.predict($('vec-two-pr'));

  // --- frontier summary
  const F=V.D.front;
  const FF={flat:['Exact (flat)','var(--ink)'],ivf:['IVF-Flat','var(--c3)'],ivfpq:['IVF-PQ','var(--c2)'],sq:['int8 (SQ8, flat and HNSW)','var(--c5)'],binary:['Binary (1 bit), with or without rescoring','var(--c4)'],hnsw:['HNSW','var(--c1)']};
  function front(){
    const el=$('vec-fr-plot'),W=V.width(el),H=270,L=50,R=12,T=10,B=40;
    const X=v=>L+(v-0.6)/0.41*(W-L-R),ly=v=>Math.log10(v),Y=v=>T+(1-(ly(v)-1)/(ly(30000)-1))*(H-T-B);
    let s='';
    [10,100,1000,10000].forEach(v=>{s+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v).toFixed(1)+'" y2="'+Y(v).toFixed(1)+'" stroke="var(--line)"/>'+V.T(L-5,Y(v)+4,v.toLocaleString('en-US'),{a:'end',fs:10,fill:'var(--mute)'})});
    [0.6,0.7,0.8,0.9,1].forEach(v=>{s+=V.T(X(v),H-B+14,v.toFixed(1),{a:'middle',fs:10,fill:'var(--mute)'})});
    s+=V.T(L+(W-L-R)/2,H-6,'ANN recall@10 on Quora (522,931 vectors, 384 dims)',{a:'middle',fs:10.5,fill:'var(--mute)'})+V.T(L+4,T+10,'queries per second, one core (log)',{fs:10,fill:'var(--mute)'});
    Object.keys(FF).forEach(f=>{F.points.filter(p=>p.family===f).forEach(p=>{s+='<circle cx="'+X(p.recall10).toFixed(1)+'" cy="'+Y(p.qps).toFixed(1)+'" r="3.8" fill="'+FF[f][1]+'"><title>'+esc(p.label)+': recall '+f3(p.recall10)+', '+V.n0(p.qps)+' QPS, '+V.n0(p.bytes)+' bytes per vector</title></circle>'})});
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Recall against queries per second on Quora">'+s+'</svg><div class="vec-leg">'+Object.keys(FF).map(k=>'<span><i style="background:'+FF[k][1]+'"></i>'+FF[k][0]+'</span>').join('')+'</div>';
    const fam=Object.keys(FF);
    $('vec-fr-tbl').innerHTML='<tr><th>family</th><th>fastest setting with recall &ge; 0.95</th><th class="num">QPS</th><th class="num">bytes / vector</th><th>with recall &ge; 0.99</th><th class="num">QPS</th></tr>'+
      fam.map(f=>{const a=F.best.find(x=>x.family===f&&x.thr===0.95),b=F.best.find(x=>x.family===f&&x.thr===0.99);
        return '<tr><td>'+FF[f][0]+'</td><td>'+(a.label?esc(a.label)+' ('+f3(a.recall10)+')':'none: best '+f3(a.max_recall))+'</td><td class="num">'+(a.qps?V.n0(a.qps):'')+'</td><td class="num">'+(a.bytes?V.n0(a.bytes):'')+'</td><td>'+(b.label?esc(b.label)+' ('+f3(b.recall10)+')':'none: best '+f3(b.max_recall))+'</td><td class="num">'+(b.qps?V.n0(b.qps):'')+'</td></tr>'}).join('');
    const bl=l=>F.builds.find(x=>x.label===l);
    $('vec-fr-note').innerHTML='Bytes per vector include the index\'s own structures (graph links, cluster ids); binary + rescoring counts the float32 vectors kept for rescoring. Builds on one thread: IVF '+bl('IVF2892,Flat').s.toFixed(0)+' s, IVF-PQ '+bl('IVF2892,PQ24').s.toFixed(0)+' s, HNSW M16 '+bl('FAISS HNSW16 efC100').s.toFixed(0)+' s, HNSW with int8 '+bl('HNSW32,SQ8').s.toFixed(0)+' s. Measured '+esc(F.when)+', load average '+F.load[0]+' to '+F.load[1]+' on a shared machine: the order of magnitude and the shape transfer, the exact QPS do not (a server core, several threads and batching all change them). hnswlib is left out because version 0.8.0 has no ARM SIMD, so its times on this Mac are a platform effect.';
  }
  V.onRender(()=>{A.redraw();twoPlot();grid();front()});
})();
