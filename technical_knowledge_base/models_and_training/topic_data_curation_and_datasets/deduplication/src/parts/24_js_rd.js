// ---- Reading tab: inline charts, calculators, predict-then-reveal ----
(function(){
  const U=DPU,$=id=>document.getElementById(id),esc=U.esc;
  // predict-then-reveal
  document.querySelectorAll('#t-read .pr').forEach(pr=>{pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
    pr.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));b.classList.add(b.dataset.k===pr.dataset.ans?'right':'wrong');
    pr.querySelector('.opts button[data-k="'+pr.dataset.ans+'"]').classList.add('right');pr.querySelector('.ans').hidden=false}))});
  RD.tabLinks($('t-read'));

  // DCLM Table 17 (published): removal share and Core score, 1B-1x, 76B-token pool
  const T17=[['None',0,24.7],['Exact',13,26.0],['MinHash',18,25.6],['Suffix array',33,26.6],['Bloom filter',26,26.8],['Exact+MinHash',24,25.0],['Exact+SA',36,26.2],['MinHash+SA',37,26.3],['Exact+MinHash+SA',41,26.8]];
  function dclm(){const el=$('rd-dclm17'),w=Math.min(720,RD.width(el)),h=250;
    const F=U.frame(w,h,[-2,45],[24.4,27.1],{xt:[0,10,20,30,40],xf:v=>v+'%',yt:[24.5,25,25.5,26,26.5,27],xl:'tokens removed',yl:'Core score'});
    let g=F.g;g+='<line x1="'+F.m.l+'" x2="'+(w-F.m.r)+'" y1="'+F.Y(24.7)+'" y2="'+F.Y(24.7)+'" stroke="var(--mute)" stroke-dasharray="3 3"/>';
    const narrow=w<520;
    T17.forEach(([n,x,y],i)=>{g+='<circle cx="'+F.X(x)+'" cy="'+F.Y(y)+'" r="5" fill="'+(i?'var(--acc)':'var(--mute)')+'"><title>'+n+': '+x+'% removed, Core '+y+'</title></circle>';
      const lab=narrow?String(i+1):n,right=x>30;g+=RD.t(F.X(x)+(right?-8:8),F.Y(y)+(i===8?14:-6),lab,{fs:10.5,a:right?'end':'start'})});
    el.innerHTML=RD.svg(w,h,g,'DCLM Table 17: dedup removal against Core score')+(narrow?'<p class="small mute">'+T17.map((r,i)=>(i+1)+' '+r[0]).join(', ')+'</p>':'')}
  // estimator spread vs k (measured, 24 pairs x 2,000 families)
  function variance(){const el=$('rd-var'),w=Math.min(720,RD.width(el)),h=230,S=DP.seeds;
    const F=U.frame(w,h,[0.25,1],[0,0.14],{xt:[0.3,0.4,0.5,0.6,0.7,0.8,0.9,1],xf:v=>v.toFixed(1),yt:[0,0.04,0.08,0.12],yf:v=>v.toFixed(2),xl:'true Jaccard of the pair',yl:'sd of the estimate'});
    let g=F.g;const ks=[[16,'var(--bad)'],[112,'var(--acc)'],[1024,'var(--good)']];
    ks.forEach(([k,c])=>{const pts=[];for(let i=25;i<=100;i++){const s=i/100;pts.push([F.X(s),F.Y(Math.sqrt(s*(1-s)/k))])}g+='<path d="'+U.path(pts)+'" fill="none" stroke="'+c+'" stroke-width="1.5"/>';
      S.pairs.forEach(p=>{g+='<circle cx="'+F.X(p.j).toFixed(1)+'" cy="'+F.Y(p.sd[String(k)]).toFixed(1)+'" r="3.5" fill="'+c+'"><title>k '+k+', J '+p.j+': sd '+p.sd[String(k)]+'</title></circle>'});
      g+=RD.t(F.X(0.27),F.Y(Math.sqrt(0.27*0.73/k))-6,'k = '+U.fmt(k),{fs:10.5,fill:c})});
    el.innerHTML=RD.svg(w,h,g,'Standard deviation of the MinHash estimate against Jaccard for three signature sizes')}
  // birthday calculator
  function bday(){const n=+$('rd-bd-n').value,b=+$('rd-bd-b').value,e=n*(n-1)/2*Math.pow(2,-b);
    $('rd-bd-out').innerHTML='expected colliding pairs: <b>'+(e<1e-3?e.toExponential(1):U.fmt(e,e<10?2:0))+'</b>; set of hashes: '+U.bytes(n*b/8)}
  ['rd-bd-n','rd-bd-b'].forEach(id=>$(id).addEventListener('change',bday));bday();
  // SimHash: Hamming distance against Jaccard for pairs with J >= 0.01, plus recall by k
  function sim(){const el=$('rd-sim-plot'),w=Math.min(720,RD.width(el)),h=240,S=DP.sim;
    const F=U.frame(w,h,[0,1],[0,40],{xt:[0,0.2,0.4,0.6,0.8,1],xf:v=>v.toFixed(1),yt:[0,3,8,16,24,32,40],xl:'true Jaccard',yl:'Hamming distance (bits)'});
    let g=F.g;g+='<rect x="'+F.m.l+'" y="'+F.Y(3)+'" width="'+(w-F.m.l-F.m.r)+'" height="'+(F.Y(0)-F.Y(3))+'" fill="var(--good)" opacity=".12"/>'+RD.t(F.m.l+6,F.Y(3)-3,'k &le; 3 (Manku et al.)',{fs:10.5,fill:'var(--good)'});
    g+='<line x1="'+F.X(0.8)+'" x2="'+F.X(0.8)+'" y1="'+F.m.t+'" y2="'+(h-F.m.b)+'" stroke="var(--ink)" stroke-dasharray="4 3"/>';
    S.pts.forEach(p=>{g+='<circle cx="'+F.X(p[0]).toFixed(1)+'" cy="'+F.Y(Math.min(40,p[2])).toFixed(1)+'" r="2.6" fill="var(--acc)" opacity=".55"/>'});
    el.innerHTML=RD.svg(w,h,g,'SimHash Hamming distance against Jaccard similarity');
    const r=S.rows;$('rd-sim-note').innerHTML='<span class="lbl me">measured</span> '+U.fmt(S.pts.length)+' pairs with Jaccard &ge; 0.01 (dots overlap: 143 identical sets sit at 1, 0 bits). Pairs with J &ge; 0.8 found ('+S.pairs_ge08+' in all): '+[0,3,5,8,11,16].map(k=>'k = '+k+': '+r[k].hit08).join('; ')+'.'}
  // suffix arrays: repeated-span share against scope, and four corpora
  function sa(){const el=$('rd-sa-scope'),A=DP.sa;if(!A||!A.scope){el.innerHTML='';return}
    const w=Math.min(720,RD.width(el)),rows=[];
    rows.push(['run0 filtered, 1 WARC (2,692 docs)',A.tokens.bytes_230.frac,A.tokens.bytes_230.frac_keep_one]);
    A.scope.forEach(s=>rows.push(['FineWeb 2024-30, first '+U.fmt(s.docs)+' rows (up to '+s.warc_files_upto+' WARCs)',s.L230.frac,s.L230.frac_keep_one]));
    const NM={fineweb:'FineWeb, 16,000 random rows',fineweb_edu:'FineWeb-Edu, 16,000 random rows',dclm:'DCLM-baseline, first 16,000 rows',nemotron_high:'Nemotron-CC high, first 16,000 rows'};
    if(A.corpora)Object.keys(NM).forEach(k=>{if(A.corpora[k])rows.push([NM[k],A.corpora[k].L230.frac,A.corpora[k].L230.frac_keep_one])});
    const mx=Math.max(...rows.map(r=>r[1]))*1.1;
    let g='<div class="bars">'+rows.map(r=>'<div class="row"><span class="nm">'+esc(r[0])+'</span><span class="track" style="position:relative"><span class="fill" style="position:absolute;left:0;top:0;bottom:0;opacity:.35;width:'+(100*r[1]/mx).toFixed(1)+'%"></span><span class="fill" style="position:absolute;left:0;top:0;bottom:0;width:'+(100*r[2]/mx).toFixed(1)+'%"></span></span><span class="val">'+U.pct(r[1],2)+'</span></div>').join('')+'</div>';
    el.innerHTML=g;
    $('rd-sa-note').innerHTML='<span class="lbl me">measured</span> share of text bytes inside spans of &ge; 230 bytes that occur at least twice in the sample (light bar: remove every copy; dark: keep one), Google\'s tool at 4e9888ac. The FineWeb rows are FineWeb\'s output, already deduplicated by MinHash per crawl, and they are grouped by source WARC, so more rows means more WARC files. The four corpora were sampled differently (random row groups, first rows of a shard, head of a part file), so compare them loosely.'}
  // semantic: removals per eps for three encoders
  function sem(){const el=$('rd-sem-plot'),S=DP.sem,w=Math.min(720,RD.width(el)),h=220;
    const F=U.frame(w,h,[0,0.16],[40,100],{xt:[0.01,0.05,0.1,0.15],xf:v=>v,yt:[40,60,80,100],xl:'&epsilon; (remove if cosine &ge; 1 &minus; &epsilon;)',yl:'documents removed'});
    let g=F.g;const C={arctic:'var(--acc)',bge:'var(--bad)',minilm:'var(--good)'},N={arctic:'arctic-embed-m',bge:'bge-small',minilm:'MiniLM-L6'};
    Object.keys(C).forEach((k,i)=>{const pts=S.sweep[k].map(r=>[F.X(r.eps),F.Y(r.removed)]);g+='<path d="'+U.path(pts)+'" fill="none" stroke="'+C[k]+'" stroke-width="2"/>';
      pts.forEach(p=>{g+='<circle cx="'+p[0]+'" cy="'+p[1]+'" r="3" fill="'+C[k]+'"/>'});g+=RD.t(F.m.l+8,F.m.t+14+i*14,N[k],{fs:10.5,fill:C[k]})});
    const ag=S.agree;g+='';
    el.innerHTML=RD.svg(w,h,g,'Documents removed by SemDeDup for three encoders');
    $('rd-sem-note').innerHTML='<span class="lbl me">measured</span> 2,692 filtered documents, 20 k-means clusters. Removed by all three encoders / by any: '+['0.01','0.05','0.1','0.15'].map(e=>'&epsilon; '+e+': '+ag[e].all3+' / '+ag[e].any).join('; ')+'.'}
  // scale calculator
  function scale(){const n=+$('rd-sc-n').value,b=+$('rd-sc-b').value,k=+$('rd-sc-k').value,d=+$('rd-sc-d').value;
    const ptr=Math.ceil(Math.log2(n*b)/8),rows=[
      ['Text itself','documents &times; bytes',n*b],
      ['Exact: set of 64-bit document hashes','8 bytes per document (a hash table 1.5 to 2&times; more)',n*8],
      ['Exact: Bloom filter, 0.1% false positives','14.4 bits per document',n*14.4/8],
      ['Paragraph Bloom filter, 1%','9.6 bits per paragraph, 39 non-blank lines per document (run0 extracted, measured)',n*39*9.6/8],
      ['MinHash signatures','documents &times; '+k+' &times; 8 bytes',n*k*8],
      ['Union-find in a Python dict (datatrove)','about 140 bytes per duplicated document (measured, tracemalloc)',n*d*140],
      ['Union-find in an int64 array','8 bytes per document',n*8],
      ['Suffix array on disk','text &times; '+ptr+'-byte pointers (smallest width that addresses the text)',n*b*ptr],
      ['Suffix array, RAM while building one shard','7 to 15 bytes per text byte (measured on 13 to 162 MB); here per 700 GB shard',700e9*7],
      ['Embeddings for semantic dedup','768 dimensions &times; 2 bytes (fp16)',n*768*2]];
    $('rd-sc-tab').innerHTML='<thead><tr><th>State</th><th>Formula</th><th class="num">Size</th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="small">'+r[1]+'</td><td class="num">'+U.bytes(r[2])+'</td></tr>').join('')+'</tbody>'}
  ['rd-sc-n','rd-sc-b','rd-sc-k','rd-sc-d'].forEach(id=>$(id).addEventListener('change',scale));scale();
  const all=()=>{dclm();variance();sim();sa();sem()};
  RD.onRender(all);RD.onResize(all);all();
})();
