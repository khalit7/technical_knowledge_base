// ---- Reading section 5: the table of every fine-tune run (the training view itself is the 3D stage Fig. 4, 28d_sc_tl.js, since 2026-11-06) ----
(function(){
  const E=window.EMB,esc=RD.esc;if(!document.getElementById('emb-tl-runs'))return;
  // runs table
  (function(){const t=document.getElementById('emb-tl-runs'),note=document.getElementById('emb-tl-note');
    if(!E.ft){t.innerHTML='<tr><td><span class="emb-pend">pending run</span> the table of all runs (6 arms &times; 3 seeds) appears here.</td></tr>';return}
    let h='<tr><th>arm</th><th class="num">seed</th><th class="num">steps</th><th class="num">SciFact nDCG@10</th><th class="num">NFCorpus nDCG@10</th><th class="num">training s</th></tr>';
    h+='<tr><td>starting model</td><td></td><td></td><td class="num">'+E.ft.base.scifact.ndcg10.toFixed(3)+'</td><td class="num">'+E.ft.base.nfcorpus.ndcg10.toFixed(3)+'</td><td></td></tr>';
    Object.keys(E.ft.arms).forEach(a=>E.ft.arms[a].forEach(r=>{h+='<tr><td>'+esc(a)+'</td><td class="num">'+r.seed+'</td><td class="num">'+r.steps+'</td><td class="num">'+r.scifact.toFixed(3)+'</td><td class="num">'+r.nfcorpus.toFixed(3)+'</td><td class="num">'+r.train_s+'</td></tr>'}));
    t.innerHTML=h;note.textContent='Measured on Apple M1 Pro (MPS); training time includes snapshot encoding.'})();
})();
