// ---- Retrievers side by side: sample questions and averages from SV.rel ----
(function(){
  const R=SV.rel;if(!R||!document.getElementById('sdCols'))return;
  const NAMES={fts_and:'Postgres full-text, all words',fts_or:'Postgres full-text, any word (ts_rank)',bm25_pg:'BM25 on Postgres lexemes',vector:'Vector (exact cosine)',rrf_bm25_vec:'Hybrid: RRF of BM25 and vector'};
  const KIND={bm25:'BM25 clearly better',vector:'vector clearly better',hybrid:'fusion beats both',all_fail:'all fail'};
  let corp='quora';const sel=document.getElementById('sdQ'),esc=RD.esc;
  function fill(){sel.innerHTML='';R[corp].samples.forEach((s,i)=>{const o=document.createElement('option');o.value=i;o.textContent=(i+1)+'. '+KIND[s.kind]+': '+s.query.slice(0,60)+(s.query.length>60?'...':'');sel.appendChild(o)});draw()}
  function draw(){const s=R[corp].samples[+sel.value||0];if(!s)return;
    document.getElementById('sdQuery').innerHTML='<b>Question:</b> '+esc(s.query)+' <span class="small mute">('+s.n_relevant+' labelled relevant; nDCG@10: BM25 '+s.ndcg.bm25_pg.toFixed(2)+', vector '+s.ndcg.vector.toFixed(2)+', hybrid '+s.ndcg.rrf_bm25_vec.toFixed(2)+')</span>';
    document.getElementById('sdCols').innerHTML=Object.keys(NAMES).map(k=>'<div class="col"><h4>'+NAMES[k]+'</h4>'+(s.top[k].length?'<ol>'+s.top[k].map(d=>'<li class="'+(d.rel?'rel':'')+'">'+esc(d.text.length>160?d.text.slice(0,160)+'...':d.text)+'</li>').join('')+'</ol>':'<p class="small mute">No match: '+(k==='fts_and'?'not every word appears in any stored text.':'nothing returned.')+'</p>')+'</div>').join('');
    document.getElementById('sdRel').innerHTML='<b>Labelled relevant:</b> '+s.relevant.map(t=>'<i>'+esc(t.length>200?t.slice(0,200)+'...':t)+'</i>').join(' | ')}
  function avg(){let h='<table><thead><tr><th>Retriever</th><th class="num">Quora nDCG@10</th><th class="num">Quora recall@10</th><th class="num">SciFact nDCG@10</th><th class="num">SciFact recall@10</th><th class="num">Quora: no result</th></tr></thead><tbody>';
    Object.keys(NAMES).forEach(k=>{const a=R.quora.scores[k],b=R.scifact.scores[k];h+='<tr><td>'+NAMES[k]+'</td><td class="num">'+a.ndcg10.toFixed(3)+'</td><td class="num">'+a.recall10.toFixed(3)+'</td><td class="num">'+b.ndcg10.toFixed(3)+'</td><td class="num">'+b.recall10.toFixed(3)+'</td><td class="num">'+(100*a.empty_share).toFixed(1)+'%</td></tr>'});
    document.getElementById('sdAvg').innerHTML=h+'</tbody></table>'}
  RD.seg(document.getElementById('sdCorp'),m=>{corp=m;fill()});sel.addEventListener('change',draw);
  RD.tabLinks(document.getElementById('t-side'));
  fill();avg();
})();
