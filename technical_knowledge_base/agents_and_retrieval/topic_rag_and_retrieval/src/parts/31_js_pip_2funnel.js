// ---- Pipeline lab: the funnel animation (one real claim, four pipelines) ----
(function(){
  const P=window.PIP,D=P.D.funnel,$=P.$,esc=P.esc;
  if(!D){$('pip-fun-cap').textContent='Funnel data missing.';return}
  const RH=28;let mode='hybrid',rr='on',an=null;
  $('pip-fun-claim').textContent='"'+D.claim+'" (SciFact claim '+D.qid+'; gold label '+D.label+')';
  const EV=new Set(D.evidence);
  const short=t=>t.length>95?t.slice(0,92)+'...':t;
  function stages(){const s=['claim'];if(mode==='hybrid')s.push('bm25','dense','hybrid');else s.push('dense');
    if(rr==='on')s.push(mode+'+rr');s.push('prompt','answer');return s}
  const finalList=()=>rr==='on'?mode+'+rr':mode;
  const NAMES={bm25:'BM25',dense:'Dense',hybrid:'Fuse (RRF)','rr':'Rerank',prompt:'Top 3 to prompt',answer:'Answer'};
  function strip(cur){const st=stages();const all=['bm25','dense','hybrid','rr','prompt','answer'];
    $('pip-fun-stages').innerHTML=all.map(a=>{const used=st.some(s=>s===a||(a==='rr'&&s.endsWith('+rr')));
      const on=cur===a||(a==='rr'&&cur.endsWith('+rr'));return '<span class="'+(on?'on':used?'':'off')+'">'+NAMES[a]+'</span>'}).join('')}
  const fmt=(name,s)=>name==='bm25'?s.toFixed(2):name==='dense'?s.toFixed(3):name==='hybrid'?s.toFixed(4):s.toFixed(2);
  function cap(st){
    const R=D.ranks,A=D.answers[finalList()];
    const rk=n=>R[n]==null?'not in the top 100':'rank '+R[n];
    switch(st){
      case 'claim':return 'The claim arrives. The corpus has 5,183 abstracts; one of them ('+(D.evidence.length>1?'or more':'the green row, when it appears')+') is the evidence the annotators found. Goal: get it into the 3 abstracts the generator will read.';
      case 'bm25':return 'BM25 scores every abstract by the claim\'s words it contains (rare words count more). The evidence abstract is at <b>'+rk('bm25')+'</b>: it shares the claim\'s exact terms.';
      case 'dense':return 'The dense retriever embeds the claim and every abstract as vectors and ranks by cosine similarity. Here the evidence is at <b>'+rk('dense')+'</b>: the meaning-level match puts other abstracts on the same topic ahead of it.'+(mode==='dense'?' With dense retrieval only, this is the candidate list.':'');
      case 'hybrid':return 'Reciprocal rank fusion adds 1/(60 + rank) from each list. A document high in either list floats up: the evidence moves to <b>'+rk('hybrid')+'</b>. No score calibration is needed, only ranks.';
      case 'hybrid+rr':case 'dense+rr':return 'The reranker reads the claim and each of the top 30 candidates together (a cross-encoder) and scores the pair. Rows slide to their new places: the evidence goes to <b>'+rk(st)+'</b>. This costs about 6 s per claim on this laptop with Qwen3-Reranker-0.6B.';
      case 'prompt':{const r=D.ranks[finalList()];return 'Only the top '+D.k+' go into the prompt ('+P.n0(A.n_in)+' tokens with the instructions). The evidence is at rank '+(r==null?'over 100':r)+', so it is <b>'+(r!=null&&r<=D.k?'inside':'outside')+'</b> the prompt.'}
      case 'answer':return 'Qwen3-1.7B answers <b>'+esc(A.text)+'</b>. Gold label '+D.label+'. '+(A.strict?'Right label, and the abstract it cites is the annotated evidence.':A.lenient?'Right label, but the cited abstract is not the evidence: right for the wrong reason.':'Wrong label.');
    }return ''}
  function draw(i){
    const st=stages()[i];strip(st);$('pip-fun-cap').innerHTML=cap(st);
    const box=$('pip-fun-list');
    const listName=st==='claim'?null:(st==='prompt'||st==='answer')?finalList():st;
    const lst=listName?D.lists[listName]:[];
    box.style.height=(listName?(lst.length*RH+4):RH)+'px';
    if(!listName)box.innerHTML='';
    const keep=new Set(lst.map(x=>x[0]));
    [...box.querySelectorAll('.pip-row')].forEach(el=>{if(!keep.has(el.dataset.d)){el.style.opacity='0';setTimeout(()=>{if(el.style.opacity==='0')el.remove()},500)}});
    lst.forEach((x,j)=>{let el=box.querySelector('.pip-row[data-d="'+x[0]+'"]');
      if(!el){el=document.createElement('div');el.className='pip-row';el.dataset.d=x[0];el.style.top=(j*RH)+'px';el.style.opacity='0';
        el.innerHTML='<span class="r"></span><span class="t"></span><span class="s"></span>';box.appendChild(el);void el.offsetWidth}
      el.style.opacity='1';el.style.top=(j*RH)+'px';
      el.classList.toggle('gold',EV.has(x[0]));
      el.classList.toggle('cut',(st==='prompt'||st==='answer')&&x[2]>D.k);
      el.querySelector('.r').textContent=(j>=10?'':'')+x[2];
      el.querySelector('.t').textContent=(j>=10?'... ':'')+short(D.titles[x[0]]||x[0]);el.querySelector('.t').title=D.titles[x[0]]||'';
      el.querySelector('.s').textContent=fmt(listName.replace('+rr','rr'),x[1])});
    let cl=box.querySelector('.pip-cutline');
    if(st==='prompt'||st==='answer'){if(!cl){cl=document.createElement('div');cl.className='pip-cutline';cl.innerHTML='<span>prompt ends here</span>';box.appendChild(cl)}cl.style.top=(D.k*RH-2)+'px'}else if(cl)cl.remove();
    const A=D.answers[finalList()];
    $('pip-fun-extra').innerHTML=st==='answer'?'<div class="pip-prompt" aria-label="Generator output">'+esc(A.text)+'</div>':'';
    const R=D.ranks;
    $('pip-fun-cnt').innerHTML=P.D&&[
      ['Evidence rank now',listName?(R[listName]==null?'over 100':R[listName]):'n/a'],
      ['Abstracts scored','5,183'+(st.endsWith('+rr')||st==='prompt'||st==='answer'?(rr==='on'?' + 30 reranked':''):'')],
      ['In the prompt',(st==='prompt'||st==='answer')?D.k+' abstracts':'not yet'],
      ['Answer',st==='answer'?(A.strict?'correct':A.lenient?'label right, citation wrong':'wrong'):'not yet']
    ].map(a=>'<div class="stat"><div class="k">'+a[0]+'</div><div class="v">'+a[1]+'</div></div>').join('');
  }
  function rebuild(){$('pip-fun-list').innerHTML='';if(an)an.reset(stages().length)}
  an=P.anim({card:'pip-fun-card',ctl:'pip-fun-ctl',n:stages().length,draw,ms:2300,label:'Funnel step'});
  P.seg($('pip-fun-mode'),v=>{mode=v;rebuild()});
  P.seg($('pip-fun-rr'),v=>{rr=v;rebuild()});
  // summary of the four pipelines on this claim
  const rows=[['hybrid+rr','BM25 + dense, reranked'],['hybrid','BM25 + dense, no reranker'],['dense+rr','dense only, reranked'],['dense','dense only, no reranker']];
  $('pip-fun-note').innerHTML='<div class="tw"><table><thead><tr><th>Pipeline (same claim)</th><th class="num">evidence rank</th><th>in top 3?</th><th>generator says</th><th>check</th></tr></thead><tbody>'+
    rows.map(r=>{const A=D.answers[r[0]],k=D.ranks[r[0]];return '<tr><td>'+r[1]+'</td><td class="num">'+(k==null?'over 100':k)+'</td><td>'+(k!=null&&k<=D.k?'yes':'no')+'</td><td>'+esc(A.label)+'</td><td>'+(A.strict?'correct':A.lenient?'label only':'wrong')+'</td></tr>'}).join('')+'</tbody></table></div>';
})();
