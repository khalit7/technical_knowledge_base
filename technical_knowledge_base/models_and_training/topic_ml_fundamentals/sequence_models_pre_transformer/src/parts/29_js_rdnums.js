// ---- Reading: numbers written into the text from the data (so text and charts cannot disagree) ----
(function(){
  const $=id=>document.getElementById(id);
  if(!$('t-read'))return;
  const E=SQ.glove.ev,pct=v=>(100*v).toFixed(1)+'%';
  if($('rd-glove-n')){const it=E.include_top_answer,n=E.full_include.n;
    $('rd-glove-n').innerHTML=RD.stat('Question words excluded',pct(E.full_exclude.total),'semantic '+pct(E.full_exclude.semantic)+', syntactic '+pct(E.full_exclude.syntactic))+
      RD.stat('Not excluded',pct(E.full_include.total),'the answer is a question word in '+pct((it.a+it.b+it.c)/n)+' of questions')+
      RD.stat('Top 30,000 words, excluded',pct(E.top30k_exclude.total),E.top30k_exclude.n.toLocaleString('en-GB')+' questions, as word2vec\'s own tool')}
  const S=SQ.mem.summ,sum=(k,f)=>[10,20,50,100].reduce((a,t)=>a+S[k+'_'+t][f],0);
  if($('rd-m-r10'))$('rd-m-r10').textContent=S.rnn_10.solved_in_range;
  if($('rd-m-g'))$('rd-m-g').textContent='the LSTM solved it within its training lengths in '+sum('lstm','solved_in_range')+' of 36 runs and the GRU in '+sum('gru','solved_in_range')+' of 36 (beyond the training lengths the GRU trained on lengths up to 10 held in only '+S.gru_10.solved+' of 9)';
  if($('mr-note'))$('mr-note').innerHTML='Each line is one seed at the best of three learning rates; "solved" means at least 99% at every test length in range. Plain RNN runs solved within their training lengths: '+[10,20,50,100].map(t=>S['rnn_'+t].solved_in_range+' of 9 (up to '+t+')').join(', ')+'.';
})();
