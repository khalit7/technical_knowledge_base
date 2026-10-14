// ---- Tool map: reading MTEB and BEIR (zero-shot table from mteb metadata, SciFact scores by who ran them) ----
(function(){
  const M=window.MAP,D=M.D,$=M.$,esc=M.esc,T=D.mteb;
  $('map-lb-n').textContent=T.n_tasks+' tasks, '+T.retrieval_tasks.length+' of them retrieval ('+T.retrieval_tasks.join(', ')+'), as listed by mteb '+T.version;
  $('map-lb-v').textContent=T.version;
  $('map-lb-tab').querySelector('tbody').innerHTML=T.models.slice().sort((a,b)=>a.zsr-b.zsr||a.zs-b.zs).map(m=>'<tr><td>'+esc(m.m)+' <span class="mute small">('+esc(m.rel)+')</span></td><td class="n">'+M.fmtP(m.n)+'</td><td class="n">'+m.zs+'%</td><td class="n">'+m.zsr+'%</td><td>'+(m.tr.length?esc(m.tr.join(', ')):'<span class="mute">none</span>')+'</td><td>'+(m.beir.length?esc(m.beir.join(', ')):'<span class="mute">none</span>')+'</td></tr>').join('');
  const f=x=>Number(x).toFixed(3);
  $('map-lb-sf').querySelector('tbody').innerHTML=D.sf.map(r=>'<tr><td>'+esc(r[0])+'</td><td class="n">'+f(r[1])+'</td><td class="n">'+f(r[2])+'</td><td class="n">'+f(r[3])+'</td><td class="n">'+f(r[4])+'</td><td>'+M.link(r[5],r[6])+'</td></tr>').join('');
  const g=k=>D.sf.find(r=>r[0]===k);const b=g('bge-small-en-v1.5'),q=g('Qwen3-Embedding-0.6B');
  M.predict('map-pr2','c',()=>'On SciFact, measured here, bge-small scores nDCG@10 '+f(b[2])+' against '+f(q[2])+' for Qwen3-Embedding-0.6B (the MTEB results repo agrees: '+f(b[1])+' and '+f(q[1])+'). On NFCorpus, the second running-example set, the order flips: '+f(q[4])+' for Qwen3 against '+f(b[4])+'. And gte-modernbert (149M) beats both on SciFact. One dataset is not the average, and the average is not your data.');
})();
