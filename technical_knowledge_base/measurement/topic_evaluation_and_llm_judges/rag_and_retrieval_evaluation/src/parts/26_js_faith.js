// ---- Reading: faithfulness stepper. One real RAGTruth answer: passages and answer, split into claims, verdict per claim,
// then each instrument's documented rule applied to the same verdicts. The split and verdicts are our reading (see the note under the card).
// RD.anim with the step list sx-fs on the left (2026-11-09; the per-step caption moved into the list).
(function(){
  const $=id=>document.getElementById(id),esc=RD.esc;if(!$('fs-card'))return;
  const it=RDATA.rt.items.find(x=>x.id==='14354');
  const V={sup:['ok','supported by passage 2'],con:['bad','contradicts passage 2'],abs:['unk','not in the passages']};
  const A={
    mis:{m:'mistral-7B-instruct',drop:'"the question is asking for information about the core Carry On stars who are still alive" restates the question: no fact to check (TruLens drops such trivial sentences too).',
      c:[['The passages name six core Carry On stars still alive: Barbara Windsor, Julian Holloway, Jim Dale, June Whitfield, Leslie Phillips and Valerie Leon.','sup'],
         ['All of them except Barbara Windsor have passed away.','con'],
         ['Barbara Windsor is still alive.','sup']],
      sc:[['RAGAS rule','2/3 = 0.67','supported / claims'],['DeepEval default','2/3 = 0.67','not contradicted / claims'],['NLI entailment','2/3 = 0.67','entailed / claims (ALCE, HHEM style)'],['RAGTruth annotators','hallucinated','1 span: Evident Conflict']]},
    l13:{m:'llama-2-13b-chat',drop:'"the answer to the question \'Is Kenneth Williams still alive?\' is: No" restates a question nobody asked; what it asserts is the claim below.',
      c:[['Kenneth Williams has passed away (the answer says passage 3 says so).','abs']],
      sc:[['RAGAS rule','0/1 = 0','an unsupported claim fails'],['DeepEval default','1/1 = 1','uncontradicted counts as faithful; 0 with penalize_ambiguous_claims=True'],['NLI entailment','0/1 = 0','neutral is not entailed'],['RAGTruth annotators','hallucinated','Subtle Baseless Info, implicit_true']]}};
  let cur='mis';
  function draw(i){
    const a=A[cur],r=it.r.find(x=>x.m===a.m);
    let h='<div class="pipe"><div class="col"><div class="hd">Passage 2 (holds the answer)</div><div class="psg gold">'+esc(it.p[1].slice(0,330))+'...</div></div>'+
      '<div class="col"><div class="hd">Answer ('+MN[a.m]+')</div><div class="ans">'+esc(r.text)+'</div></div></div>';
    if(i>=1){h+='<div class="fs-claims">'+a.c.map((c,j)=>'<div class="fs-c">'+(i>=2?'<span class="verd '+V[c[1]][0]+' v">'+V[c[1]][1]+'</span>':'')+'<b>claim '+(j+1)+'</b>: '+esc(c[0])+'</div>').join('')+
      '<div class="fs-c off small">dropped: '+esc(a.drop)+'</div></div>'}
    if(i>=3)h+='<div class="fs-sc">'+a.sc.map(s=>RD.stat(s[0],s[1],esc(s[2]))).join('')+'</div>';
    $('fs-body').innerHTML=h;
  }
  const S=RD.anim({card:'fs-card',ctl:'fs-ctl',n:4,draw,ms:4600,label:'Faithfulness step',list:'sx-fs'});
  // the last step's explanation differs between the two answers: the step list holds both, one shown
  RD.seg($('fs-ans'),m=>{cur=m;document.querySelectorAll('#sx-fs [data-fs]').forEach(x=>x.hidden=x.dataset.fs!==m);S.reset(4)});
})();
