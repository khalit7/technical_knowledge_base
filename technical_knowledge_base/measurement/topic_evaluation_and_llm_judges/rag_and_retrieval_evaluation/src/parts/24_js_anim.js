// ---- Reading: the before/after animation. One real question through retrieve then generate, scored end to end (before),
// then split into the retrieval half and the generation half (after). Labels: MS MARCO is_selected, SciFact qrels, RAGTruth spans.
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;
  const pipe=$('an-pipe'),cnt=$('an-cnt'),cap=$('an-cap'),mSel=$('an-model'),cSel=$('an-case'),mWrap=$('an-mwrap');
  const it=RDATA.rt.items.find(x=>x.id==='14354'),C54=RDATA.case54;
  // Our reading of each answer against MS MARCO's reference answer (six names "still alive" in the passage).
  const E2E={
    'gpt-4-0613':[1,'names all six people the reference answer names'],
    'gpt-3.5-turbo-0613':[1,'names all six people the reference answer names'],
    'llama-2-70b-chat':[1,'names all six, with their ages'],
    'llama-2-13b-chat':[0,'answers a different question (is Kenneth Williams alive?) and names none of the six'],
    'llama-2-7b-chat':[0,'names three of the six, then says it is unable to answer'],
    'mistral-7B-instruct':[0,'names the six, then says all but Barbara Windsor have died']};
  const GEN={
    'gpt-4-0613':[1,'No span marked: every claim is in passage 2.'],
    'gpt-3.5-turbo-0613':[1,'No span marked: every claim is in passage 2.'],
    'llama-2-70b-chat':[1,'No span marked: names and ages are all in passage 2.'],
    'llama-2-13b-chat':[0,'RAGTruth marks the Kenneth Williams sentence as Subtle Baseless Info, flagged implicit_true: true in the world, absent from the passages. Faithfulness fails, and answer relevance fails too: it answers a question nobody asked.'],
    'llama-2-7b-chat':[0,'No span marked, so a faithfulness metric passes it (1.0). The failure is completeness: three of the six names in passage 2 are missing, and the closing refusal contradicts the list. Only context recall against the reference, or a correctness check, catches it.'],
    'mistral-7B-instruct':[0,'RAGTruth marks "All of these actors have passed away except for Barbara Windsor" as Evident Conflict: passage 2 says all six are alive.']};
  RDATA.rt.models.forEach(m=>{const o=document.createElement('option');o.value=m;o.textContent=MN[m];mSel.appendChild(o)});
  mSel.value='mistral-7B-instruct';
  let mode='after',cs='carry';
  const STEPS={
    carry:{before:['q','ret','gen','e2e','end'],after:['q','ret','gen','e2e','rh','gh','verdict','world']},
    ampk:{before:['q','ret','gen','e2e','end'],after:['q','ret','gen','e2e','rh','gh','verdict','fix']}};
  const st=()=>STEPS[cs][mode];
  function spanHTML(text,sps,on){
    if(!on||!sps.length)return esc(text);
    const s=sps.slice().sort((a,b)=>a[0]-b[0]);let h='',p=0;
    s.forEach(x=>{if(x[0]<p)return;h+=esc(text.slice(p,x[0]))+'<mark class="h on'+(x[3]?' t':'')+'" title="'+esc(x[2])+'">'+esc(text.slice(x[0],x[1]))+'</mark>';p=x[1]});
    return h+esc(text.slice(p));
  }
  function view(s){
    const k=st().indexOf(s),at=n=>{const j=st().indexOf(n);return j>=0&&k>=j};
    let q,ps,ans,sps=[],gold=[],e2e,gen,hd2='Retrieved (top 3)',fixed=false;
    if(cs==='carry'){const m=mSel.value,r=it.r.find(x=>x.m===m);
      q=it.q;ps=it.p.map((t,i)=>({t:'passage '+(i+1),x:t.length>330?t.slice(0,330)+'...':t}));ans=r.text;sps=r.sp;gold=it.sel;e2e=E2E[m];gen=GEN[m];
    }else{fixed=at('fix');const R=C54.runs[fixed?'hybrid_rrf':'bm25_lucene'];const gid=C54.gold[0][0];
      q='Claim: '+C54.claim;ps=R.ids.map((d,i)=>({t:'#'+(i+1)+' '+R.titles[i],x:R.snips[i]+'...'}));ans=R.answer;gold=R.ids.map(d=>d===gid?1:0);
      e2e=A54[fixed?'hybrid_rrf':'bm25_lucene'].e2e;gen=A54[fixed?'hybrid_rrf':'bm25_lucene'].gen;hd2=fixed?'Retrieved by the hybrid (top 3)':'Retrieved by BM25 (top 3)'}
    const showG=mode==='after'&&at('rh');
    let h='<div class="col"><div class="hd">Question</div><div class="small">'+esc(q)+'</div></div>';
    h+='<div class="col'+(at('ret')?'':' off')+'"><div class="hd">'+hd2+'</div>'+ps.map((p,i)=>'<div class="psg'+(showG&&gold[i]?' gold':'')+'"><div class="pt">'+esc(p.t)+(showG&&gold[i]?' &#10003; holds the answer':'')+'</div>'+esc(p.x)+'</div>').join('')+
      (showG&&!gold.some(x=>x)?'<div class="psg miss"><div class="pt">Not retrieved: the labelled passage</div>'+esc(cs==='ampk'?'Metformin reverses established lung fibrosis in a bleomycin model (BM25 rank '+C54.gold[0][2]+')':'')+'</div>':'')+'</div>';
    h+='<div class="col'+(at('gen')?'':' off')+'"><div class="hd">Answer'+(cs==='carry'?' ('+MN[mSel.value]+')':' (Qwen2.5-1.5B-Instruct)')+'</div><div class="ans">'+(at('gen')?spanHTML(ans,sps,mode==='after'&&at('gh')):'')+'</div>'+
      (at('e2e')?'<div><span class="verd '+(e2e[0]?'ok':'bad')+'">end to end: '+(e2e[0]?'correct':'wrong')+'</span>'+
        (showG?'<span class="verd '+(gold.some(x=>x)?'ok':'bad')+'">retrieval: '+(gold.some(x=>x)?'passed':'failed')+'</span>':'')+
        (mode==='after'&&at('gh')?'<span class="verd '+(gen[0]?'ok':'bad')+'">generation: '+(gen[0]?'passed':'failed')+'</span>':'')+'</div>':'')+'</div>';
    pipe.innerHTML=h;
    // counters
    const hit=gold.some(x=>x)?1:0,fi=gold.indexOf(1),p3=gold.filter(x=>x).length/3;
    let c=RD.stat('End to end',at('e2e')?(e2e[0]?'correct':'wrong'):'?','against the reference');
    c+=RD.stat('hit@3',mode==='after'&&at('rh')?hit:'?','gold passage in prompt');
    c+=RD.stat('precision@3',mode==='after'&&at('rh')?p3.toFixed(2):'?','labelled passages / 3');
    c+=RD.stat('RR',mode==='after'&&at('rh')?(fi>=0?(1/(fi+1)).toFixed(2):'0'):'?','1 / rank of first hit');
    c+=RD.stat('Faithful',mode==='after'&&at('gh')?(cs==='carry'?(sps.length?'no ('+sps.length+' span'+(sps.length>1?'s':'')+')':'yes'):gen[2]):'?',cs==='carry'?'RAGTruth spans':'our reading');
    cnt.innerHTML=c;
  }
  // Our reading of the two SciFact answers (filled from the generated text; see src/README.md)
  const A54=window.A54_READING;
  function caption(s){
    const i=st().indexOf(s)+1;let t='',p='';
    if(cs==='carry'){const m=mSel.value,e=E2E[m],g=GEN[m];
      const T={q:['A real question','MS MARCO question "carry on cast still alive", one of RAGTruth\'s 989 question-answering items. The instruction: answer strictly from the three passages, or reply "Unable to answer based on given passages."'],
        ret:['Retrieve','The three passages RAGTruth kept from MS MARCO\'s ten Bing results. Nobody has looked at labels yet.'],
        gen:['Generate',MN[m]+' writes its answer from the three passages (temperature 0.7, as released). Switch the generator to see the other five.'],
        e2e:['Score end to end','Against MS MARCO\'s reference answer (six named actors), this answer is '+(e[0]?'correct':'wrong')+': it '+e[1]+'.'],
        end:['The usual report',(e[0]?'Correct, so it goes into the accuracy number and nobody looks further.':'Wrong. A single accuracy number records a miss and nothing else: was the evidence missing, or misused? The instinct is "try a bigger model" or "tune the retriever", chosen by guesswork.')+' Switch to After to split it.'],
        rh:['Score the retrieval half','MS MARCO\'s annotator marked passage 2 as the one the answer was written from (is_selected). So hit@3 = 1, precision@3 = 1/3, RR = 1/2: the evidence reached the prompt, whatever the answer says. This half is identical for all six generators.'],
        gh:['Score the generation half',g[1]],
        verdict:['Which half failed',e[0]&&g[0]?'Neither, against the passages and the reference. Hold on to that: the next step is about the passages themselves.':'The generator. Retrieval delivered the answer-bearing passage; '+(m==='llama-2-7b-chat'?'the answer left half of it out.':'the answer contradicted or ignored it.')+' The fix is the prompt, the model or the instruction, not the retriever.'],
        world:['And the world','Both halves can pass and the answer still be wrong today: passage 2 dates from about 2014, and four of the six (June Whitfield, Barbara Windsor, Leslie Phillips, Julian Holloway) have died since, per Wikipedia on 4 October 2026. Faithfulness checks the answer against the passages, never the passages against the world. Corpus freshness is a third thing to test.']};
      [t,p]=T[s];
    }else{const B=A54.bm25_lucene,H=A54.hybrid_rrf;
      const T={q:['A real claim','SciFact test claim 54: "AMP-activated protein kinase (AMPK) activation increases inflammation-related fibrosis in the lungs." SciFact\'s annotators label it CONTRADICT, from a paper showing metformin, an AMPK activator, reverses lung fibrosis in mice.'],
        ret:['Retrieve','BM25 over the 5,183 SciFact abstracts (our run, k1 = 0.9, b = 0.4) returns three abstracts about AMPK, none about the lung.'],
        gen:['Generate','Qwen2.5-1.5B-Instruct answers from those three, with RAGTruth\'s instruction to say "Unable to answer" if the passages do not settle it.'],
        e2e:['Score end to end',B.e2e[1]],
        end:['The usual report','One more miss in the accuracy number. Which half to fix is not in it. Switch to After to split it.'],
        rh:['Score the retrieval half','SciFact\'s qrels name one relevant abstract, "Metformin reverses established lung fibrosis in a bleomycin model"; BM25 ranked it at '+C54.gold[0][2]+'. So hit@3 = 0, precision@3 = 0, RR@3 = 0: the evidence never reached the prompt.'],
        gh:['Score the generation half',B.gen[1]],
        verdict:['Which half failed','Both, in order: retrieval missed the evidence, and the generator answered anyway instead of refusing. Fix retrieval first; a better generator could at best refuse, it cannot find what was not given.'],
        fix:['Fix the half that failed','Same claim, same generator, retrieval swapped for BM25 plus the MiniLM dense run fused by RRF (our hybrid). The labelled abstract is now at rank '+C54.gold[0][6]+'. '+H.e2e[1]+' '+H.gen[1]]};
      [t,p]=T[s];}
    cap.innerHTML='<div class="t">'+i+'. '+t+'</div><p>'+p+'</p>';
  }
  function draw(i){const s=st()[i];view(s);caption(s)}
  const A=RD.anim({card:'an-card',ctl:'an-ctl',n:st().length,draw,ms:2600,label:'Animation step'});
  RD.seg($('an-mode'),m=>{mode=m;A.reset(st().length);A.play()});
  cSel.addEventListener('change',()=>{cs=cSel.value;mWrap.style.display=cs==='carry'?'':'none';A.reset(st().length)});
  mSel.addEventListener('change',()=>A.redraw());
})();
