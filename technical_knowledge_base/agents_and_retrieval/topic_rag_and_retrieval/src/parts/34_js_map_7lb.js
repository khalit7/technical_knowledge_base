// ---- Tool map: reading MTEB and BEIR (zero-shot table from mteb metadata, SciFact scores by who ran them) ----
(function(){
  const M=window.MAP,D=M.D,$=M.$,esc=M.esc,T=D.mteb;
  $('map-lb-n').textContent=T.n_tasks+' tasks, '+T.retrieval_tasks.length+' of them retrieval ('+T.retrieval_tasks.join(', ')+'), as listed by mteb '+T.version;
  $('map-lb-v').textContent=T.version;
  $('map-lb-tab').querySelector('tbody').innerHTML=T.models.slice().sort((a,b)=>a.zsr-b.zsr||a.zs-b.zs).map(m=>'<tr><td>'+esc(m.m)+' <span class="mute small">('+esc(m.rel)+')</span></td><td class="n">'+M.fmtP(m.n)+'</td><td class="n">'+m.zs+'%</td><td class="n">'+m.zsr+'%</td><td>'+(m.tr.length?esc(m.tr.join(', ')):'<span class="mute">none</span>')+'</td><td>'+(m.beir.length?esc(m.beir.join(', ')):'<span class="mute">none</span>')+'</td></tr>').join('');
  $('map-lb-sf').querySelector('tbody').innerHTML=D.sf.map(r=>'<tr'+(r[2].indexOf('measured')===0?' class="hl"':'')+'><td>'+esc(r[0])+'</td><td class="n">'+Number(r[1]).toFixed(4)+'</td><td>'+(r[3]?M.link(r[2],r[3]):esc(r[2]))+'</td></tr>').join('');
  const g=k=>D.sf.find(r=>r[0]===k)[1].toFixed(3);
  M.predict('map-pr2','c',()=>'In the MTEB results repo, SciFact nDCG@10 is '+g('BAAI/bge-small-en-v1.5')+' for bge-small against '+g('Qwen/Qwen3-Embedding-0.6B')+' for Qwen3-Embedding-0.6B, and the setup agent\'s own run of bge-small reproduces '+g('BAAI/bge-small-en-v1.5, exact search')+'. One dataset is not the average, and the average is not your data.');
})();
