// ---- Reading: faithfulness stepper. One real RAGTruth answer: passages and answer, split into claims, verdict per claim,
// then each instrument's documented rule applied to the same verdicts. The split and verdicts are our reading (see the note under the card).
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;if(!$('fs-card'))return;
  const it=RDATA.rt.items.find(x=>x.id==='14354');
  const V={sup:['ok','supported by passage 2'],con:['bad','contradicts passage 2'],abs:['unk','not in the passages']};
  const A={
    mis:{m:'mistral-7B-instruct',drop:'"the question is asking for information about the core Carry On stars who are still alive" restates the question: no fact to check (TruLens drops such trivial sentences too).',
      c:[['The passages name six core Carry On stars still alive: Barbara Windsor, Julian Holloway, Jim Dale, June Whitfield, Leslie Phillips and Valerie Leon.','sup'],
         ['All of them except Barbara Windsor have passed away.','con'],
         ['Barbara Windsor is still alive.','sup']],
      sc:[['RAGAS rule','2/3 = 0.67','supported / claims'],['DeepEval default','2/3 = 0.67','not contradicted / claims'],['NLI entailment','2/3 = 0.67','entailed / claims (ALCE, HHEM style)'],['RAGTruth annotators','hallucinated','1 span: Evident Conflict']],
      end:'All three rules agree, because the bad claim contradicts the passage: every checker catches a contradiction. RAGTruth marks the same sentence as an Evident Conflict, and the instruments differ only in how they would phrase it.'},
    l13:{m:'llama-2-13b-chat',drop:'"the answer to the question \'Is Kenneth Williams still alive?\' is: No" restates a question nobody asked; what it asserts is the claim below.',
      c:[['Kenneth Williams has passed away (the answer says passage 3 says so).','abs']],
      sc:[['RAGAS rule','0/1 = 0','an unsupported claim fails'],['DeepEval default','1/1 = 1','uncontradicted counts as faithful; 0 with penalize_ambiguous_claims=True'],['NLI entailment','0/1 = 0','neutral is not entailed'],['RAGTruth annotators','hallucinated','Subtle Baseless Info, implicit_true']],
      end:'The instruments split 0 against 1 on the same verdict. The claim is true in the world (Williams died in 1988, per Wikipedia; hence RAGTruth\'s implicit_true flag) but absent from the passages: a system that must answer from its sources should fail it, so RAGAS and the annotators are right for RAG, and DeepEval\'s default is lenient by design. It also fails answer relevance: nobody asked about Williams.'}};
  let cur='mis';
  const T=['The passages and the answer','Split into claims','Verify each claim against the passages','Apply each instrument\'s rule'];
  function draw(i){
    const a=A[cur],r=it.r.find(x=>x.m===a.m);
    let h='<div class="pipe"><div class="col"><div class="hd">Passage 2 (holds the answer)</div><div class="psg gold">'+esc(it.p[1].slice(0,330))+'...</div></div>'+
      '<div class="col"><div class="hd">Answer ('+MN[a.m]+')</div><div class="ans">'+esc(r.text)+'</div></div></div>';
    if(i>=1){h+='<div class="fs-claims">'+a.c.map((c,j)=>'<div class="fs-c">'+(i>=2?'<span class="verd '+V[c[1]][0]+' v">'+V[c[1]][1]+'</span>':'')+'<b>claim '+(j+1)+'</b>: '+esc(c[0])+'</div>').join('')+
      '<div class="fs-c off small">dropped: '+esc(a.drop)+'</div></div>'}
    if(i>=3)h+='<div class="fs-sc">'+a.sc.map(s=>RD.stat(s[0],s[1],esc(s[2]))).join('')+'</div>';
    $('fs-body').innerHTML=h;
    const C=[ 'One real answer from RAGTruth to "carry on cast still alive", with the passage that holds the answer. Passages 1 and 3 are about other actors.',
      'A judge (or a sentence splitter) turns the answer into atomic claims. This step is itself an LLM call, and a different split changes the denominator and sometimes the verdicts.',
      'Each claim is checked against the passages only: supported, contradicted, or simply not there. Whether it is true in the world never enters.',
      a.end];
    $('fs-cap').innerHTML='<div class="t">'+(i+1)+'. '+T[i]+'</div><p>'+C[i]+'</p>';
  }
  const S=RD.anim({card:'fs-card',ctl:'fs-ctl',n:4,draw,ms:2600,label:'Faithfulness step'});
  RD.seg($('fs-ans'),m=>{cur=m;S.reset(4)});
})();
