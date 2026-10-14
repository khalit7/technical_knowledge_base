// ---- Dedup lab: at a glance, the before/after showcase, exact dedup tables
(function(){
  const D=window.DD,X=window.DDX,$=X.$;if(!D||!$('t-dedup'))return;
  const C=D.cmp.counts;
  X.bars($('dd-glance'),[
    ['Exact (identical text)',C.exact,'var(--c1)'],
    ['MinHash 14 x 8',C.minhash,'var(--c2)'],
    ['C4 three-sentence spans',C.c4_spans,'var(--c3)'],
    ['Suffix array, half the bytes or more',C.suffix_half,'var(--c5)'],
    ['Semantic, cosine 0.9 or more',C.semantic_eps01,'var(--c4)']],Math.max(C.exact,C.minhash,C.c4_spans,C.suffix_half,C.semantic_eps01)*1.05);
  const O=D.cmp.overlap;
  $('dd-overlap').textContent='Overlaps: all '+O.exact.exact+' exact copies are among MinHash’s '+C.minhash+'; '+O.c4_spans.minhash+' of the '+C.c4_spans+' documents the C4 rule drops are also MinHash removals; semantic dedup shares '+O.semantic_eps01.minhash+' of its '+C.semantic_eps01+' with MinHash; the suffix-array row shares '+O.suffix_half.minhash+'.';

  // ---- showcase: same 14 documents, one step per method
  const S=D.show;
  const steps=[
    {k:null,name:'Before',cap:'All 14 documents as they reach dedup (run0 filtered stage).'},
    {k:'exact',name:'Exact',cap:'Exact hashing removes byte-identical copies only: the banner copied verbatim and the copy of the headed banner. A different heading or one extra sentence is enough to survive.'},
    {k:'minhash',name:'MinHash 14×8',cap:'MinHash removes near-identical pages (the suburb pages, the second privacy policy, the headed banner) and, through chaining in the banner cluster, the stove page with real text.'},
    {k:'c4_spans',name:'C4 spans',cap:'The C4 rule cuts every repeated three-sentence span after its first occurrence: the first banner stays, later banner pages are left with nothing and dropped, and the stove page, once its banner is cut, is under the 50-word minimum and dropped too.'},
    {k:'sa',name:'Suffix array',cap:'Suffix arrays cut repeated spans of 100 bytes or more inside every document and keep no copy: red bars show the share of each document removed. Even the first banner loses its text.'},
    {k:'semantic_eps01',name:'Semantic',cap:'Semantic dedup (cosine 0.9) removes one of the two casino spam articles, which share no 5-word phrase, and all four banners (the copy it keeps is a banner variant outside this set); it keeps the suburb pages.'}];
  const host=$('dd-show');
  host.innerHTML=S.map((d,i)=>'<div class="dd-doc" id="dd-sh'+i+'" style="border-left-color:'+['var(--c2)','var(--c2)','var(--c2)','var(--c2)','var(--c4)','var(--c5)','var(--c5)','var(--c5)','var(--c1)','var(--c1)','var(--c6)','var(--c6)','var(--c3)','var(--c3)'][i]+'"><span class="badge"></span><div class="h">'+X.esc(d.host)+'</div><div class="x">'+X.esc(d.ex)+'</div><div class="why">'+X.esc(d.why)+'</div><div class="cut"><i></i></div></div>').join('');
  $('dd-show-steps').innerHTML=steps.map((s,i)=>'<button data-i="'+i+'">'+s.name+'</button>').join('');
  function draw(i){
    const s=steps[i];
    $('dd-show-steps').querySelectorAll('button').forEach((b,j)=>b.classList.toggle('on',j===i));
    let gone=0;
    S.forEach((d,j)=>{const el=$('dd-sh'+j);let g=0,frac=0;
      if(s.k==='sa'){frac=Math.min(1,d.sa);g=0}else if(s.k){g=d.fate[s.k]}
      if(s.k==='c4_spans'&&!g&&d.fate.c4_spans===0)frac=0;
      el.classList.toggle('gone',!!g);gone+=g;
      el.querySelector('.badge').textContent=g?'removed':(frac>0.005?Math.round(100*frac)+'% cut':'');
      el.querySelector('.cut i').style.width=(s.k==='sa'?100*frac:(g?100:0)).toFixed(0)+'%';});
    $('dd-show-cap').innerHTML='<b>'+s.name+'.</b> '+s.cap+(s.k&&s.k!=='sa'?' <span class="mute">('+gone+' of 14 removed here; '+(s.k==='exact'?C.exact:s.k==='minhash'?C.minhash:s.k==='c4_spans'?C.c4_spans:C.semantic_eps01)+' of 2,692 in the full run.)</span>':'');
  }
  const A=X.anim({card:'dd-show-card',ctl:'dd-show-ctl',n:steps.length,draw,ms:2600,label:'Dedup method step'});
  $('dd-show-steps').addEventListener('click',e=>{const b=e.target.closest('button');if(b)A.go(+b.dataset.i)});

  // ---- exact table
  const E=D.exact,st=['extracted','filtered','final'];
  const row=(lab,f)=>'<tr><td>'+lab+'</td>'+st.map(k=>'<td class="num">'+f(E[k])+'</td>').join('')+'</tr>';
  $('dd-exact-tab').innerHTML='<thead><tr><th>unit</th>'+st.map(k=>'<th class="num">'+k+'<br><span class="mute">'+X.fmt(E[k].docs)+' docs</span></th>').join('')+'</tr></thead><tbody>'+
    row('Whole document, exact: copies removed',e=>X.fmt(e.doc_exact.removed)+' <span class="mute">('+X.pct(e.doc_exact.removed/e.docs)+')</span>')+
    row('Whole document, normalised text',e=>X.fmt(e.doc_norm.removed))+
    row('URL',e=>X.fmt(e.url.removed))+
    row('Lines: repeats of an earlier line',e=>X.fmt(e.lines.dup)+' of '+X.fmt(e.lines.total)+' <span class="mute">('+X.pct(e.lines.dup/e.lines.total)+')</span>')+
    row('Lines: characters removed',e=>X.pct(e.lines.chars_removed/e.chars))+
    row('Lines: documents touched / emptied',e=>X.fmt(e.lines.docs_touched)+' / '+X.fmt(e.lines.docs_emptied))+'</tbody>';
  $('dd-line-ans').textContent='Answer: '+X.pct(E.extracted.lines.dup/E.extracted.lines.total,0)+' ('+X.fmt(E.extracted.lines.dup)+' of '+X.fmt(E.extracted.lines.total)+').';
  function lines(m){const L=m==='long'?D.topLong:D.topLines;
    $('dd-lines-tab').innerHTML='<thead><tr><th>line (start)</th><th class="num">times</th><th class="num">hosts</th></tr></thead><tbody>'+L.map(r=>'<tr><td style="overflow-wrap:anywhere">'+X.esc(r[2].length>110?r[2].slice(0,110)+'…':r[2])+'</td><td class="num">'+X.fmt(r[0])+'</td><td class="num">'+X.fmt(r[1])+'</td></tr>').join('')+'</tbody>'}
  X.seg($('dd-lines-mode'),lines);lines('long');
  // ---- sentence spans
  const T=D.sent;
  $('dd-sent-out').innerHTML=X.stat('Before MinHash: documents dropped',X.fmt(T.filtered.docs_dropped),'of '+X.fmt(T.filtered.docs_in)+'; '+X.fmt(T.filtered.docs_shortened)+' more shortened')+
    X.stat('Before MinHash: characters removed',X.pct(1-T.filtered.chars_out/T.filtered.chars_in,2),X.fmt(T.filtered.chars_in-T.filtered.chars_out)+' characters')+
    X.stat('After MinHash: documents dropped',X.fmt(T.final.docs_dropped),'of '+X.fmt(T.final.docs_in)+'; '+X.fmt(T.final.docs_shortened)+' shortened')+
    X.stat('After MinHash: characters removed',X.pct(1-T.final.chars_out/T.final.chars_in,2),X.fmt(T.final.chars_in-T.final.chars_out)+' characters');
  X.predict('dd-pr1');X.predict('dd-pr2');X.predict('dd-pr3');
})();
