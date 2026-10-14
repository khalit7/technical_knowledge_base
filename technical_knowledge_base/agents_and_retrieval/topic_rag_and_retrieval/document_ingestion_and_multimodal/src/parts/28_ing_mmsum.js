// ---- Reading s10: nDCG@5 table, measured here and published (data: ING.mm) ----
(function(){const M=window.ING&&ING.mm,el=document.getElementById('ing-mm-sum');if(!M||!el)return;
  const sets=Object.keys(M.sets);
  let h='<div class="tw"><table><thead><tr><th>nDCG@5</th>'+sets.map(s=>'<th class="num">'+RD.esc(M.sets[s].label)+'</th>').join('')+'</tr></thead><tbody>';
  M.systems.forEach(sy=>{h+='<tr><td>'+RD.esc(sy.label)+'</td>'+sets.map(s=>{const v=M.sets[s].ndcg5[sy.key],c=M.sets[s].ci[sy.key];return '<td class="num">'+(v==null?'':(sy.pub?'<span class="mute">'+v.toFixed(1)+'</span>':'<b>'+v.toFixed(1)+'</b>'+(c?' <small class="mute">&plusmn;'+c.toFixed(1)+'</small>':'')))+'</td>'}).join('')+'</tr>'});
  el.innerHTML=h+'</tbody></table></div>';
  document.getElementById('ing-mm-sumnote').innerHTML=M.note;
})();
