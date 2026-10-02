// ---- Ask a trained toy RAG: question builder, index editing, live answer with retrieval and posterior, measured results ----
(function(){if(!$('run'))return;
  const st={m:'tok',y:'2018',k:5,edits:{2018:{},2016:{}}};
  let IDX={2018:IDX18,2016:IDX16};
  const presOf=(ci,y)=>st.edits[y][ci]||(y==='2018'?WD.P18:WD.P16)[ci];
  function rebuild(y){const docs=WD.index(y).map(d=>d.kind==='country'&&st.edits[y][d.i]?Object.assign({},d,{toks:[...WD.C[d.i],':','capital',...WD.K[d.i],'.','president',...st.edits[y][d.i],'.']}):d);IDX[y]=RAG.makeIndex(docs)}
  const tsel=$('rTask'),esel=$('rEnt'),psel=$('rTpl');
  function fillEnt(){const t=tsel.value;let items;
    if(t==='novels')items=WD.A.map((a,i)=>[i,a,WD.testA.has(i)]);
    else if(t==='born')items=WD.people.map((p,i)=>[i,p,WD.questions.find(q=>q.task==='born'&&q.pi===i).split==='test']);
    else items=WD.C.map((c,i)=>[i,c,WD.testC.has(i)]);
    items.sort((a,b)=>(b[2]-a[2])||(a[0]-b[0]));
    esel.innerHTML=items.map(([i,n,h])=>'<option value="'+i+'">'+WD.show(n)+(h?' (held out)':' (training)')+(t==='president'&&WD.changed.includes(i)?', president changed':'')+'</option>').join('');
    if(t==='president'){const c=items.find(x=>x[2]&&WD.changed.includes(x[0]));if(c)esel.value=c[0]}
    [0,1].forEach(k=>{psel.options[k].textContent=RW.world.templates[t][k].map(w=>w==='X'?'…':w).join(' ').replace(' ?','?')})}
  function question(){const t=tsel.value,i=+esel.value,tpl=+psel.value;return WD.questions.find(q=>q.task===t&&q.tpl===tpl&&(t==='novels'?q.ai===i:t==='born'?q.pi===i:q.ci===i))}
  function truth(q,y){if(q.task==='president')return presOf(q.ci,y);return q.y}
  function bar(p,c){return '<span class="pbar" style="display:inline-block;width:70px;height:9px;background:var(--soft);border-radius:2px;vertical-align:middle"><span style="display:block;height:9px;width:'+(70*p).toFixed(1)+'px;background:'+(c||'var(--c1)')+';border-radius:2px"></span></span>'}
  function run(){const q=question(),M=RAG.load(st.m),idx=IDX[st.y],tr=truth(q,st.y);
    $('rQ').innerHTML='<span><b>x:</b> '+WD.show(q.x)+' <span class="mute small">(tokens: '+q.x.join(' ')+')</span></span>';
    let h='';const t0=performance.now();const A=RAG.answer(M,idx,q.x,st.k);const ms=performance.now()-t0;
    const ok=A.y.join(' ')===tr.join(' ');
    h+='<p><b>Answer:</b> <span style="color:var(--'+(ok?'good':'bad')+')">'+(WD.show(A.y)||'(empty)')+'</span> '+(ok?'<span class="ok">matches</span>':'<span class="no">does not match</span>')+' the '+st.y+' index\'s fact ('+WD.show(tr)+'). <span class="small mute">'+ms.toFixed(0)+' ms in your browser.</span></p>';
    {const gold=new Set(q.gold);
      h+='<div class="tw"><table><thead><tr><th>#</th><th>Retrieved document</th><th class="num">p(z|x)</th></tr></thead><tbody>'+A.ret.idx.map((i,j)=>{const p=Math.exp(A.ret.lpz[j]);return '<tr><td>'+(j+1)+'</td><td>'+WD.show(idx[i].toks)+(gold.has(i)?' <span class="small" style="color:var(--good)">gold</span>':'')+'</td><td class="num">'+bar(p)+' '+p.toFixed(3)+'</td></tr>'}).join('')+'</tbody></table></div>';
      if(A.mode==='tok'){h+='<p class="small"><b>Document posterior at each generated token</b>, <i>p</i>(<i>z</i>|<i>x</i>, <i>y<sub>i</sub></i>, <i>y</i><sub>&lt;<i>i</i></sub>), the quantity of the paper\'s %F2%: darker is higher; hover a cell for that document\'s own top proposal.</p>'.replace('%F2%','<a href="'+PAPER.meta.ax+'#S4.F2" target="_blank" rel="noopener noreferrer">Figure 2</a>');
        h+='<div class="tw"><table class="hm"><thead><tr><th>doc</th>'+A.steps.map(s=>'<th>'+(s.tok==='</s>'?'end':s.tok)+'</th>').join('')+'</tr></thead><tbody>'+A.ret.idx.map((i,j)=>'<tr><th>'+(j+1)+'</th>'+A.steps.map(s=>{const p=s.post[j];return '<td class="v" title="document '+(j+1)+' alone proposes '+s.perDocTop[j][0]+' ('+s.perDocTop[j][1].toFixed(2)+')" style="background:color-mix(in srgb,var(--c2) '+(100*p).toFixed(0)+'%,var(--bg))">'+(p<0.005?'':p.toFixed(2))+'</td>'}).join('')+'</tr>').join('')+'</tbody></table></div>'}
      else{h+='<p class="small"><b>RAG-Sequence hypotheses</b> (one greedy answer per document, then Thorough Decoding): <i>p</i>(<i>y</i>|<i>x</i>) and each document\'s <i>p</i><sub>θ</sub>(<i>y</i>|<i>x</i>, <i>z</i>).</p>';
        h+='<div class="tw"><table><thead><tr><th>Hypothesis</th><th class="num">p(y|x)</th>'+A.ret.idx.map((_,j)=>'<th class="num">doc '+(j+1)+'</th>').join('')+'</tr></thead><tbody>'+A.hyps.slice().sort((a,b)=>b.lp-a.lp).map(hh=>'<tr><td>'+(WD.show(hh.y)||'(empty)')+'</td><td class="num">'+Math.exp(hh.lp).toFixed(3)+'</td>'+hh.per.map(v=>'<td class="num">'+(Math.exp(v)<0.0005?'&lt;.001':Math.exp(v).toFixed(3))+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>'}}
    $('rOut').innerHTML=h}
  fillEnt();
  tsel.addEventListener('change',()=>{fillEnt();run()});esel.addEventListener('change',run);psel.addEventListener('change',run);
  segBind('rModel',m=>{st.m=m;run()});segBind('rIdx',y=>{st.y=y;run()});
  $('rK').addEventListener('input',e=>{st.k=+e.target.value;$('rKv').textContent=st.k;run()});
  // editing the memory
  const ec=$('eC'),ep=$('eP');
  ec.innerHTML=WD.C.map((c,i)=>[i,c]).sort((a,b)=>WD.testC.has(b[0])-WD.testC.has(a[0])||a[0]-b[0]).map(([i,c])=>'<option value="'+i+'">'+WD.show(c)+(WD.testC.has(i)?' (held out)':'')+'</option>').join('');
  ep.innerHTML=WD.people.map((p,i)=>'<option value="'+i+'">'+WD.show(p)+'</option>').join('');ep.selectedIndex=7;
  $('eApply').addEventListener('click',()=>{const ci=+ec.value,p=WD.people[+ep.value];st.edits[st.y][ci]=p;rebuild(st.y);
    tsel.value='president';fillEnt();esel.value=ci;run();$('eOut').innerHTML='Wrote "'+WD.show(IDX[st.y][ci].toks)+'" into the '+st.y+' index (document '+(ci+1)+' re-embedded by the document encoder). Asked again above.'});
  $('eReset').addEventListener('click',()=>{st.edits={2018:{},2016:{}};IDX={2018:IDX18,2016:IDX16};$('eOut').textContent='Both indexes restored.';run()});
  onTab('t-run',run);

  // measured results table
  const NM={tok:'RAG-Token',seq:'RAG-Sequence',closed:'Closed book (generator alone)',tok_frozen:'RAG-Token, frozen query encoder',seq_frozen:'RAG-Sequence, frozen query encoder',tok_bm25:'RAG-Token, BM25 retriever',seq_bm25:'RAG-Sequence, BM25 retriever',tok_scratch:'RAG-Token, no retriever pretraining'};
  const TK=['president','capital','born','novels','all'];
  function cellAgg(v,t,key){const xs=[0,1,2].map(s=>res(v,s)).filter(Boolean).map(r=>r.test[t]&&r.test[t][key]).filter(x=>x!=null);if(!xs.length)return '<td class="num mute">n/a</td>';
    const m=xs.reduce((a,b)=>a+b,0)/xs.length;return '<td class="num">'+pct(m,1)+(xs.length>1?'<span class="small mute"> ('+pct(Math.min(...xs),0)+' to '+pct(Math.max(...xs),0)+')</span>':'')+'</td>'}
  const vs=Object.keys(NM).filter(v=>res(v,0));
  $('resTab').innerHTML='<table><thead><tr><th>Variant</th>'+TK.map(t=>'<th class="num">'+t+'</th>').join('')+'<th class="num">recall at 5</th></tr></thead><tbody>'+vs.map(v=>{const r0=res(v,0);const n=[0,1,2].filter(s=>res(v,s)).length;
    return '<tr><td>'+NM[v]+(n>1?' <span class="small mute">('+n+' seeds)</span>':'')+'</td>'+TK.map(t=>cellAgg(v,t,'em')).join('')+(v==='closed'?'<td class="num mute">none</td>':cellAgg(v,'novels','recall').replace('novels',''))+'</tr>'}).join('')+'</tbody></table>';
  const N=RW.results.tok_s0?RW.results.tok_s0.test:null;
  $('resNote').innerHTML=(N?'Held-out questions: '+TK.slice(0,4).map(t=>N[t].n+' '+t).join(', ')+' ('+N.all.n+' in all, two phrasings each). ':'')+'Recall at 5 is shown for the "novels" questions, the only kind that needs two documents (the other kinds are at or near 100% for every dense variant). Where several seeds exist the cell is their mean with the range. Shipped 6-bit weights: RAG-Token '+pct(RW.variants.tok.test_q.all.em,1)+' and RAG-Sequence '+pct(RW.variants.seq.test_q.all.em,1)+' overall (float weights: '+pct(RW.variants.tok.test_float.all.em,1)+' and '+pct(RW.variants.seq.test_float.all.em,1)+')'+(RW.variants.tok.test_q.all.em===RW.variants.tok.test_float.all.em&&RW.variants.seq.test_q.all.em===RW.variants.seq.test_float.all.em?', so quantisation changes no held-out score':', the cost of quantisation')+'. The closed-book generator is measured but not shipped (50 KB for a model that guesses).';
  // in-browser test of the shipped models on every held-out question
  $('tstGo').addEventListener('click',()=>{const b=$('tstGo');b.disabled=true;const T=WD.questions.filter(q=>q.split==='test'),qs=['president','capital','born','novels'].flatMap(t=>T.filter(q=>q.task===t).slice(0,25)),ms=['tok','seq'],cnt={tok:0,seq:0};let i=0;
    const step=()=>{const t0=performance.now();while(i<qs.length*ms.length&&performance.now()-t0<40){const m=ms[Math.floor(i/qs.length)],q=qs[i%qs.length];const A=RAG.answer(RAG.load(m),IDX18,q.x,5);if(A.y.join(' ')===q.y.join(' '))cnt[m]++;i++}
      $('tstOut').textContent=' '+i+' of '+qs.length*ms.length+' answers…';
      if(i<qs.length*ms.length)setTimeout(step,0);else{b.disabled=false;$('tstOut').innerHTML=' In your browser: '+ms.map(m=>({tok:'RAG-Token',seq:'RAG-Sequence'})[m]+' '+cnt[m]+' of '+qs.length+' ('+pct(cnt[m]/qs.length,1)+')').join(', ')+'. PyTorch with the same weights on the same '+qs.length+' questions, at export: '+ms.map(m=>RW.variants[m].test_sub_q?Math.round(RW.variants[m].test_sub_q.all.em*qs.length)+' of '+qs.length:'n/a').join(' and ')+'.'}};step()});
  // training curves from the logs
  function drawCurves(w){const L=[['tok','RAG-Token','var(--c1)'],['seq','RAG-Sequence','var(--c2)']].filter(x=>RW.variants[x[0]].log);
    const H=170,pl=44,pr=100,pt=8,pb=28,all=L.flatMap(x=>RW.variants[x[0]].log.map(p=>p[1])),ymax=Math.max(...all)*1.05,xmax=Math.max(...L.flatMap(x=>RW.variants[x[0]].log.map(p=>p[0])));
    const X=v=>pl+(w-pl-pr)*v/xmax,Y=v=>pt+(H-pt-pb)*(1-v/ymax);let s='';
    [0,ymax/2,ymax].forEach(v=>{s+=ln2(pl,Y(v),w-pr,Y(v),'var(--line)');s+=tx(pl-6,Y(v)+4,v.toFixed(1),{fs:11,a:'end',c:'var(--mute)'})});
    [0,xmax/2,xmax].forEach(v=>{s+=tx(X(v),H-10,fmt(v),{fs:11,a:'middle',c:'var(--mute)'})});
    s+=tx((pl+w-pr)/2,H,'training step',{fs:11,a:'middle',c:'var(--mute)'});
    const ends=[];L.forEach(([k,n,c])=>{const lg=RW.variants[k].log;s+='<polyline fill="none" stroke="'+c+'" stroke-width="1.6" points="'+lg.map(p=>X(p[0]).toFixed(1)+','+Y(p[1]).toFixed(1)).join(' ')+'"/>';ends.push({y:Y(lg[lg.length-1][1]),n:n,c:c,how:'last logged loss '+lg[lg.length-1][1]})});
    s+=endLabels(ends,w-pr+6,14);return svgW(w,H+6,s,'Training loss curves')}
  onTab('t-run',()=>fit($('curves'),w=>{$('curves').innerHTML=drawCurves(w)+'<p class="small mute">Loss is the negative marginal log-likelihood of one answer, averaged over a batch of 32 and logged every 500 steps (one batch each, so it is noisy).</p>'}));

  // what reproduces, generated from the measured results
  (function(){const L=[],r=v=>res(v,0),em=(v,t)=>r(v)&&r(v).test[t]?r(v).test[t].em:null,P=v=>v==null?'n/a':pct(v,1);
    const single=v=>{const R=r(v);if(!R)return null;const T=R.test;const n=['president','capital','born'].reduce((a,t)=>a+T[t].n,0);return ['president','capital','born'].reduce((a,t)=>a+T[t].em*T[t].n,0)/n};
    if(r('closed'))L.push('<b>Reproduces: retrieval beats parametric memory on facts the model was never trained to answer.</b> On held-out single-document questions RAG-Token scores '+P(single('tok'))+' and RAG-Sequence '+P(single('seq'))+'; the closed-book generator, same pretraining and fine-tuning but no retrieval, scores '+P(single('closed'))+'. By design: the toy\'s generator is too small to memorise its pretraining documents (it recovers '+pct(RW.pre.bart_recall,1)+' of the '+fmt(RW.pre.bart_n)+' masked names), so this is the paper\'s direction, not its size (T5-11B closed-book gets 34.5 on NQ).');
    const sw=RW.variants.tok.swap_q;L.push('<b>Reproduces: index hot-swapping</b> (%45%). Same weights, '+sw.all_n+' changed presidents: '+P(sw.all_index2016_leaders2016)+' of 2016 presidents with the 2016 index and '+P(sw.all_index2018_leaders2018)+' of 2018 presidents with the 2018 index; mismatched, '+P(sw.all_index2018_leaders2016)+' and '+P(sw.all_index2016_leaders2018)+' (paper: 70%, 68%, 12%, 4%).');
    L.push('<b>Does not reproduce: RAG-Token combining two documents.</b> Held-out "novels by" questions: RAG-Token '+P(em('tok','novels'))+', RAG-Sequence '+P(em('seq','novels'))+', with both documents retrieved (recall '+P(r('tok').test.novels.recall)+'). RAG-Sequence fails by construction; RAG-Token fails because each document\'s generator proposes its own title with full confidence and the loss never teaches it otherwise (see the predict question in The paper tab). The paper\'s Figure 2 shows real BART is calibrated where this one is not.');
    if(r('tok_frozen'))L.push('<b>Does not reproduce: learned retrieval beating a frozen retriever</b> (Table 6). Frozen query weights: RAG-Token '+P(em('tok_frozen','all'))+' against '+P(em('tok','all'))+' learned'+(r('seq_frozen')?', RAG-Sequence '+P(em('seq_frozen','all'))+' against '+P(em('seq','all')):'')+'. The toy\'s pretrained retriever already finds the gold document for every held-out question, so there is nothing left to learn; the paper does not analyse where its own gains come from.');
    if(r('tok_bm25'))L.push('<b>Reproduces in direction: BM25 is worse than the learned retriever on QA</b> (Table 6). RAG-Token with BM25 logits: '+P(em('tok_bm25','all'))+' overall against '+P(em('tok','all'))+'. BM25 sees only single syllables, so it cannot tell which name a syllable belongs to; the learned retriever has syllable-pair features.');
    if(r('tok_scratch'))L.push('<b>Cannot show: retrieval learned from the answer loss alone.</b> With no retriever pretraining (every weight 1, so retrieval is plain overlap of syllables and syllable pairs), RAG-Token still reaches '+P(em('tok_scratch','all'))+' held-out exact match (against '+P(em('tok','all'))+'): in this world exact name overlap already finds the right document, so there is no retrieval left for the loss to teach. A toy that shows it would need questions worded differently from their documents.');
    $('repList').innerHTML=L.map(x=>'<li>'+x.replace('%45%','<a href="'+PAPER.meta.ax+'#S4.SS5.SSS0.Px3" target="_blank" rel="noopener noreferrer">§4.5</a>')+'</li>').join('')})();
  // facts about the toy
  $('rNdocs').textContent=fmt(RW.pre.ndocs);$('rParams').textContent=fmt(RW.pre.params);
  $('rBart').textContent=pct(RW.pre.bart_recall,1)+' ('+fmt(Math.round(RW.pre.bart_recall*RW.pre.bart_n))+' of '+fmt(RW.pre.bart_n)+')';
  $('rCheck').innerHTML=RW.check?RW.check.summary:'not yet run';
})();
