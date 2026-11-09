// ---- Union-find: the 31-cluster table (Reading section 4, closed block); the replay is the 3D stage 42_js_sc_uf.js ----
(function(){
  const F=DP.uf,U=DPU,$=id=>document.getElementById(id),esc=U.esc;
  $('dp-uf-eq').textContent=F.equals_run0?F.removed+' documents, identical ids':'MISMATCH';
  const short=h=>h.replace(/^www\./,'');
  // table of all clusters
  function table(){$('dp-uf-tab').innerHTML='<thead><tr><th class="num">#</th><th class="num">size</th><th>hosts (first of '+'up to 4)</th><th class="num">Jaccard min to max</th><th class="num">removed</th><th class="num">removed with 0.8 check</th></tr></thead><tbody>'+
      F.clusters.map((c,i)=>'<tr><td class="num">'+(i+1)+'</td><td class="num">'+c.n+'</td><td>'+c.hosts.map(h=>esc(short(h))).join(', ')+(c.nhosts>4?' and '+(c.nhosts-4)+' more':'')+'</td><td class="num">'+c.j_min.toFixed(2)+' to '+c.j_max.toFixed(2)+'</td><td class="num">'+(c.n-1)+'</td><td class="num">'+c.chk+'</td></tr>').join('')+'</tbody>';
    $('dp-uf-tabnote').innerHTML='Total: '+F.removed+' removed by datatrove, '+F.removed_with_check08+' with the check. The kept root is the longest member in '+F.kept_is_longest+' of 31 clusters and the lowest document index in '+F.kept_is_first+'. Candidate pair records written: '+F.pair_records+' ('+F.distinct_pairs+' distinct pairs).'}
  table();
})();
