// ---- Dedup lab: Bloom filter toy and measured false positives; semantic dedup; across crawls; cost calculator
(function(){
  const D=window.DD,X=window.DDX,$=X.$;if(!D||!$('t-dedup'))return;
  // ---- toy Bloom filter over real repeated lines (fixed order, with repeats)
  const base=D.topLong.slice(0,10).map(r=>r[2].slice(0,60));
  const seq=[0,1,2,0,3,4,1,5,6,2,7,8,0,9,3,5].map(i=>base[i%base.length]);
  const M=32;let bits=new Uint8Array(M),pos=0,seen=new Set(),log=[];
  const fnv=(s,seed)=>{let h=(2166136261^seed)>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h%M};
  function render(q){$('dd-bf-bits').innerHTML=[...bits].map((b,i)=>'<span class="'+(b?'on':'')+(q&&q.includes(i)?' q':'')+'">'+i+'</span>').join('');$('dd-bf-log').innerHTML=log.slice(-3).reverse().join('<br>')}
  function next(){if(pos>=seq.length){log.push('<span class="mute">All '+seq.length+' paragraphs fed. Reset to start again.</span>');render();return}
    const k=+$('dd-bf-k').value,s=seq[pos++],hs=[...Array(k).keys()].map(j=>fnv(s,j*40503));
    const hit=hs.every(h=>bits[h]),truth=seen.has(s);
    let msg='"'+X.esc(s.slice(0,48))+'…" bits '+hs.join(', ')+': ';
    if(hit&&truth)msg+='<b>seen</b> (a real repeat, marked)';else if(hit)msg+='<b style="color:var(--bad)">seen, but it is new: a false positive</b>';else{msg+='new, bits set';hs.forEach(h=>bits[h]=1)}
    seen.add(s);log.push(msg);render(hs)}
  function reset(){bits=new Uint8Array(M);pos=0;seen=new Set();log=[];render()}
  $('dd-bf-next').addEventListener('click',next);$('dd-bf-reset').addEventListener('click',reset);
  $('dd-bf-k').addEventListener('input',e=>{$('dd-bf-kv').textContent=e.target.value;reset()});reset();

  // ---- measured false positives
  const B=D.bloom;
  $('dd-bf-bug').textContent=B.min_words_bug.marked_with_min_words_1;
  function bchart(){const el=$('dd-bf-chart'),W=X.width(el),H=Math.min(270,Math.max(220,W*0.42)),L=58,R=12,T=24,B2=36;
    const S=B.sizes.filter(s=>s.bits_per_unique<100),lx=v=>Math.log10(v);
    const x=X.lin(lx(0.8),lx(25),L,W-R),ly=v=>Math.log10(Math.max(1,v)),y=X.lin(0,ly(3e5),H-B2,T);let g='';
    [1,10,100,1e3,1e4,1e5].forEach(v=>{g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(ly(v))+'" y2="'+y(ly(v))+'" stroke="var(--line)"/>'+X.t(L-5,y(ly(v))+4,X.fmt(v),{a:'end',fill:'var(--mute)'})});
    [1,2,4,8,16].forEach(v=>{g+=X.t(x(lx(v)),H-B2+15,v,{a:'middle',fill:'var(--mute)'})});
    // formula curve with optimal integer k
    const n=B.unique;let d='';for(let q=0;q<=120;q++){const bpu=Math.pow(10,lx(0.9)+(lx(24)-lx(0.9))*q/120),m=bpu*n,k=Math.max(1,Math.ceil(bpu*Math.LN2));
      let fp=0;const steps=200;for(let j=0;j<steps;j++){const nj=n*(j+0.5)/steps;fp+=Math.pow(1-Math.exp(-k*nj/m),k)*n/steps}
      d+=(q?'L':'M')+x(lx(bpu)).toFixed(1)+' '+y(ly(fp)).toFixed(1)}
    g+='<path d="'+d+'" fill="none" stroke="var(--acc)" stroke-width="2"/>';
    S.forEach(s=>s.fp_runs.forEach((f,j)=>{g+='<circle cx="'+(x(lx(s.bits_per_unique))+(j-1)*5).toFixed(1)+'" cy="'+y(ly(f)).toFixed(1)+'" r="4" fill="var(--c2)" stroke="var(--bg)"><title>'+s.bytes/1024+' KiB, run '+(j+1)+': '+f+' false positives</title></circle>'}));
    g+=X.t((L+W-R)/2,H-3,'bits per distinct paragraph, m/n (log scale)',{a:'middle',fill:'var(--mute)',fs:10.5});
    g+=X.t(L+4,T-10,'false positives (log)',{fill:'var(--mute)',fs:10.5});
    el.innerHTML=X.svg(W,H,g,'Bloom filter false positives against bits per item, measured with Dolma and from the formula');
    $('dd-bf-tab').innerHTML='<thead><tr><th class="num">filter size</th><th class="num">bits per distinct</th><th class="num">k</th><th class="num">false positives, 3 runs</th><th class="num">expected</th><th class="num">share of new paragraphs</th></tr></thead><tbody>'+
      B.sizes.map(s=>'<tr><td class="num">'+(s.bytes>=1048576?(s.bytes/1048576)+' MiB':(s.bytes/1024)+' KiB')+'</td><td class="num">'+s.bits_per_unique+'</td><td class="num">'+s.k+'</td><td class="num">'+s.fp_runs.map(v=>X.fmt(v)).join(', ')+'</td><td class="num">'+X.fmt(s.fp_expected,1)+'</td><td class="num">'+X.pct(s.fp_runs.reduce((a,b)=>a+b,0)/3/B.unique,3)+'</td></tr>').join('')+'</tbody>';}
  bchart();X.onRender(bchart);

  // ---- semantic
  const SE=D.sem;const cos={};SE.pairs_cos.forEach(p=>{cos[p[0]+','+p[1]]=p[2]});
  const jac={};D.pairs.forEach(p=>{jac[p[0]+','+p[1]]=p[2]});
  const eps=SE.sweep.map(s=>s.eps);
  $('dd-se-time').textContent=D.semSeconds;
  function se(){const k=+$('dd-se-e').value,sw=SE.sweep[k],e=sw.eps;$('dd-se-ev').textContent=e;
    const el=$('dd-se-chart'),W=X.width(el),H=Math.min(300,Math.max(220,W*0.5)),L=42,R=10,T=10,B2=34;
    const x=X.lin(0,1,L,W-R),y=X.lin(0.3,1,H-B2,T);let g='';
    [0.4,0.6,0.8,1].forEach(v=>{g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+X.t(L-5,y(v)+4,v.toFixed(1),{a:'end',fill:'var(--mute)'})});
    [0,0.2,0.4,0.6,0.8,1].forEach(v=>{g+=X.t(x(v),H-B2+15,v.toFixed(1),{a:'middle',fill:'var(--mute)'})});
    g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(1-e)+'" y2="'+y(1-e)+'" stroke="var(--bad)" stroke-dasharray="4 3"/>';
    SE.pairs_cos.forEach(p=>{const c=p[2];if(c<0.3)return;g+='<circle cx="'+x(jac[p[0]+','+p[1]]||0).toFixed(1)+'" cy="'+y(c).toFixed(1)+'" r="2.6" fill="var(--c2)" opacity=".55"/>'});
    D.semExtra.forEach(p=>{g+='<circle cx="'+x(p[3]).toFixed(1)+'" cy="'+y(p[2]).toFixed(1)+'" r="3.4" fill="var(--c4)" opacity=".85"/>'});
    g+=X.t((L+W-R)/2,H-3,'true Jaccard of the pair',{a:'middle',fill:'var(--mute)',fs:10.5});g+=X.t(L+4,T+10,'cosine of the embeddings',{fill:'var(--mute)',fs:10.5});
    el.innerHTML=X.svg(W,H,g,'Cosine similarity against Jaccard similarity for document pairs');
    $('dd-se-out').innerHTML=X.stat('removed, k-means 20',sw.removed_k20,'of '+X.fmt(SE.n)+' documents')+X.stat('removed, all pairs',sw.removed_exact,'no clustering')+X.stat('also in a MinHash cluster',sw.removed_k20_in_minhash_clusters+' of '+sw.removed_k20,(sw.removed_k20-sw.removed_k20_in_minhash_clusters)+' only semantic dedup finds');}
  $('dd-se-e').max=eps.length-1;$('dd-se-e').value=eps.indexOf(0.1);$('dd-se-e').addEventListener('input',se);se();X.onRender(se);
  const SF=D.semFw,SE2=D.semFwEdu;
  if(SF){const ed={};(SE2||[]).forEach(r=>ed[r.eps]=r.removed);
    $('dd-sefw-tab').innerHTML='<thead><tr><th class="num">&epsilon;</th><th class="num">cosine cut</th><th class="num">FineWeb: removed</th><th class="num">of them with a MinHash candidate</th><th class="num">FineWeb-Edu (child page): removed</th></tr></thead><tbody>'+
      SF.sweep.map(r=>'<tr><td class="num">'+r.eps+'</td><td class="num">'+(1-r.eps).toFixed(2)+'</td><td class="num">'+X.fmt(r.removed)+' ('+X.pct(r.removed/SF.n,2)+')</td><td class="num">'+X.fmt(r.with_minhash_candidate)+'</td><td class="num">'+(ed[r.eps]!=null?X.fmt(ed[r.eps])+' ('+X.pct(ed[r.eps]/SF.n,2)+')':'')+'</td></tr>').join('')+'</tbody>';
    $('dd-sefw-note').innerHTML='<span class="lbl me">measured</span> '+X.fmt(SF.n)+' random FineWeb rows of CC-MAIN-2024-30 (already deduplicated per crawl by MinHash), embedded on the Mac\u2019s GPU (MPS, float32, batch 32) with the same arctic-embed-m encoder, 512 tokens, k-means 100 and the same rule as above'+(SF.embed_seconds?' in about '+X.fmt(SF.embed_seconds)+' s (rough, shared machine)':'')+'. Only '+X.fmt(SF.minhash_docs_in_candidates)+' of these rows are in any MinHash 14 \u00d7 8 candidate pair inside the sample, so nearly everything semantic dedup removes here is what per-crawl MinHash leaves. The last column is the {{deduplication child page|n:3f95c17b0d0d8171ac17e43ab5ea276f}}\u2019s run on 50,000 FineWeb-Edu rows with the same encoder and rule. NeMo Curator\u2019s default encoder, embeddinggemma-300m, is gated on Hugging Face and was not run.';}
  const lo=SE.sweep.find(s=>s.eps===0.15);$('dd-se-loose').textContent=lo.removed_k20+' documents, '+(lo.removed_k20-lo.removed_k20_in_minhash_clusters)+' of them outside every MinHash cluster';

  // ---- across files (FineWeb) and crawls (CDX)
  const F=D.fw;
  X.bars($('dd-fw-bars'),[['In FineWeb too',F.groups.in_fineweb,'var(--c3)'],['Removed by our one-file MinHash',F.groups.removed_by_our_minhash,'var(--c2)'],['Kept by us, not in FineWeb',F.groups.kept_by_us_not_in_fineweb,'var(--c4)']],F.filtered);
  $('dd-fw-n').textContent=X.fmt(F.groups.kept_by_us_not_in_fineweb)+' ('+X.pct(F.groups.kept_by_us_not_in_fineweb/F.filtered)+')';
  $('dd-fw-cross').textContent=F.cross_candidates;$('dd-fw-in').textContent=F.inside_candidates;
  const FS=D.fwshard;
  if(FS){const g=FS.ours_with_partner_ge08;$('dd-fwshard').className='co';
    $('dd-fwshard').innerHTML='<div class="t">Against a whole FineWeb shard of the same crawl</div><span class="lbl me">measured</span> '+X.fmt(FS.rows_other_files)+' FineWeb rows from '+X.fmt(FS.files-1)+' other WARC files of CC-MAIN-2024-30 (0.4% of the crawl), MinHash 14 \u00d7 8 joined with our documents, every candidate checked with its true Jaccard. Of the '+X.fmt(F.groups.kept_by_us_not_in_fineweb)+' documents we kept and FineWeb did not, <b>'+g.kept_by_us_not_in_fineweb+'</b> already have a partner at 0.8 or more in this small slice; of the '+X.fmt(F.groups.in_fineweb)+' documents FineWeb kept, '+g.in_fineweb+' do. That is the crawl-wide dedup at work, seen through 0.4% of the crawl. '+g.removed_by_our_minhash+' of the documents our one-file MinHash removed also have a partner here: duplicate families spread across files. Inside the shard, rows that FineWeb kept together: '+X.fmt(FS.inside_candidates)+' candidate pairs under our signatures, mostly between 0.4 and 0.7, and '+X.fmt(FS.inside_ge08)+' at 0.8 or more that survived FineWeb\u2019s own dedup (its run may have used a different hash configuration from datatrove 0.10.1\u2019s defaults, so its candidates need not equal ours). About '+Math.round(FS.seconds/3600*10)/10+' hours of CPU time on 4 processes at low priority (rough).'}
  const CX=D.cdx;
  if(CX){const cr=Object.keys(CX.crawls);
    $('dd-cdx-tab').innerHTML='<thead><tr><th>crawl</th><th class="num">URL captured</th><th class="num">compared</th><th class="num">identical bytes</th><th class="num">J ≥ 0.95</th><th class="num">J ≥ 0.8</th><th class="num">J ≥ 0.5</th></tr></thead><tbody>'+
      cr.map(c=>{const r=CX.crawls[c];return '<tr><td>'+c+'</td><td class="num">'+X.fmt(r.with_capture)+' ('+X.pct(r.with_capture/CX.n)+')</td><td class="num">'+X.fmt(r.compared)+'</td><td class="num">'+X.fmt(r.identical_payload)+'</td><td class="num">'+X.fmt(r.ge['0.95'])+'</td><td class="num">'+X.fmt(r.ge['0.8'])+' ('+X.pct(r.ge['0.8']/CX.n)+' of all)</td><td class="num">'+X.fmt(r.ge['0.5'])+'</td></tr>'}).join('')+'</tbody>';
    const c0=CX.crawls[cr[0]];
    const g8=c=>CX.crawls[c].ge['0.8'];
    $('dd-cdx-read').textContent='Of our '+X.fmt(CX.n)+' documents, '+X.fmt(CX.anyGe08)+' ('+X.pct(CX.anyGe08/CX.n)+') have a copy at Jaccard 0.8 or more under the same URL in at least one of these four older crawls; '+X.fmt(CX.anyCapture)+' were captured in at least one. Per crawl: '+cr.map(c=>c+' '+X.fmt(g8(c))+' ('+X.pct(g8(c)/CX.n)+')').join(', ')+'. The share does not fall steadily with age: it follows which URLs each crawl chose to revisit (the previous crawl captured only '+X.fmt(CX.crawls[cr[0]].with_capture)+' of our URLs). When a page is recaptured its text has usually barely changed, while its HTML has: only '+cr.map(c=>CX.crawls[c].identical_payload).join(', ')+' captures were byte-identical, so a hash of the raw page would miss almost all of these copies. A global MinHash over these five crawls would remove one copy of each; per-crawl dedup keeps them all.';
    function cchart(){const el=$('dd-cdx-chart'),W=X.width(el),H=Math.min(250,Math.max(190,W*0.38)),L=40,R=10,T=12,B2=34;const x=X.lin(0,1,L,W-R);const cols=['var(--c1)','var(--c2)','var(--c3)','var(--c4)'];
      let mx=0;cr.forEach(c=>CX.crawls[c].hist.forEach(v=>mx=Math.max(mx,v)));const y=X.lin(0,mx*1.1,H-B2,T);let g='';
      [0,0.2,0.4,0.6,0.8,1].forEach(v=>{g+=X.t(x(v),H-B2+15,v.toFixed(1),{a:'middle',fill:'var(--mute)'})});
      for(let k=0;k<=3;k++){const v=mx*1.1*k/3;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y(v)+'" y2="'+y(v)+'" stroke="var(--line)"/>'+X.t(L-5,y(v)+4,X.fmt(v),{a:'end',fill:'var(--mute)'})}
      cr.forEach((c,ci)=>{let d='';CX.crawls[c].hist.forEach((v,k)=>{d+=(k?'L':'M')+x(k/20+0.025).toFixed(1)+' '+y(v).toFixed(1)});g+='<path d="'+d+'" fill="none" stroke="'+cols[ci]+'" stroke-width="2"/>'+X.t(x(0.4),T+12+13*ci,c,{fill:cols[ci],fs:11})});
      g+=X.t((L+W-R)/2,H-3,'Jaccard with our version (0.05 bins): documents per bin',{a:'middle',fill:'var(--mute)',fs:10.5});
      el.innerHTML=X.svg(W,H,g,'Similarity of our documents to their captures in earlier crawls')}
    cchart();X.onRender(cchart);
  }else{$('dd-cdx-read').textContent='Measurement still running when this page was built.'}

  // ---- cost calculator
  $('dd-co-mean').textContent=X.fmt(D.exact.filtered.chars/D.exact.filtered.docs);$('dd-co-ops').textContent=X.fmt(D.medShingles*112)+' ('+X.fmt(D.medShingles)+' shingles \u00d7 112 hashes)';
  function co(){const n=Math.pow(10,+$('dd-co-n').value),s=+$('dd-co-s').value,h=+$('dd-co-h').value,p=Math.pow(10,+$('dd-co-p').value);
    $('dd-co-nv').textContent=n>=1e9?(n/1e9).toFixed(2)+' billion':(n/1e6).toFixed(1)+' million';$('dd-co-sv').textContent=X.fmt(s);$('dd-co-hv').textContent=X.fmt(h);$('dd-co-pv').textContent=p.toExponential(0);
    const gb=v=>v>=1e12?(v/1e12).toFixed(2)+' TB':(v/1e9).toFixed(1)+' GB';
    const sig=n*h*8,text=n*s,w=Math.ceil(Math.log2(text)/8),bpi=-Math.log(p)/Math.LN2/Math.LN2;
    $('dd-co-out').innerHTML=X.stat('text',gb(text),'documents × size')+X.stat('MinHash signatures',gb(sig),h+' × 8 bytes per document')+X.stat('Bloom filter, one item per doc',gb(n*bpi/8),bpi.toFixed(1)+' bits per item, k = '+Math.round(bpi*Math.LN2))+X.stat('suffix array',gb(text*(1+w)),'text plus '+w+' bytes per byte; per shard in practice');}
  ['dd-co-n','dd-co-s','dd-co-h','dd-co-p'].forEach(id=>$(id).addEventListener('input',co));co();
})();
