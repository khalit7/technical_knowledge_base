// ---- Language ID: the threshold slider (Reading section 6) and the disagreement tables (a closed block there) ----
(function(){
  const H=EFH,E=window.EF,$=H.$,L=E.lid;if(!$('ef-l-th'))return;
  if(!L){$('ef-l-cnt').innerHTML='<div class="ef-pend">Language-ID run pending.</div>';return}
  const nm=c=>(L.names&&L.names[c])?L.names[c]+' ('+c+')':c;
  const th=$('ef-l-th');
  function upd(){const i=+th.value,t=L.thresholds[i];$('ef-l-thv').textContent=t.toFixed(2);
    $('ef-l-cnt').innerHTML=H.stat('lid.176 English',H.n(L.ft_kept[i]),H.p(L.ft_kept[i],L.n)+' of '+H.n(L.n))+H.stat('GlotLID English',H.n(L.gl_kept[i]),H.p(L.gl_kept[i],L.n))+H.stat('Both',H.n(L.both_kept[i]),'')+H.stat('Only one of them',H.n(L.ft_kept[i]+L.gl_kept[i]-2*L.both_kept[i]),'');
    $('ef-l-note').innerHTML='"English" means the model\'s English probability is above the threshold (datatrove keeps a document when the score is strictly greater, <code>language_filter.py:61-65</code>); the FineWeb2 preset is its rule applied to lid.176\'s scores, '+H.f(L.fw2_th_ft,2)+' <span class="ef-lbl der">derived</span>.';
    H.store.set('lidth',th.value);if(window.EFLidDraw)EFLidDraw()}
  th.addEventListener('input',upd);
  H.chips($('ef-l-pre'),m=>{th.value=m==='fw2'?Math.round(L.fw2_th_ft*100):m;upd()});
  th.value=H.store.get('lidth','65');upd();
  // heat map
  (function(){const h=L.hist2d,mx=Math.max(...h.flat());const c=v=>v?'color-mix(in srgb,var(--acc) '+Math.round(15+85*Math.log(1+v)/Math.log(1+mx))+'%,var(--bg))':'var(--bg)';
    let s='<div class="tw"><table class="ef-hm"><tr><th>lid.176 (rows), GlotLID (columns)</th>'+[...Array(10).keys()].map(j=>'<th>'+(j/10).toFixed(1)+'</th>').join('')+'</tr>';
    for(let i=9;i>=0;i--){s+='<tr><th>'+(i/10).toFixed(1)+' to '+((i+1)/10).toFixed(1)+'</th>'+h[i].map(v=>'<td style="background:'+c(v)+';color:'+(v>mx/8?'var(--bg)':'var(--ink)')+'">'+(v?H.n(v):'')+'</td>').join('')+'</tr>'}
    $('ef-l-hm').innerHTML=s+'</table></div>'})();
  // disagreements
  $('ef-l-ex').innerHTML='<p class="small">Documents above 0.65 for one model and not the other: '+H.n(L.disagree_en)+'. A random sample from organisations\' sites (excerpts scrubbed):</p>'+(L.examples||[]).map(x=>'<div class="ef-row"><div class="h"><b>'+H.esc(x.host)+'</b><span>lid.176: '+H.esc(x.ft)+' '+H.f(x.fts,2)+' (English '+H.f(x.ft_en,2)+')</span><span>GlotLID: '+H.esc(x.gl)+' '+H.f(x.gls,2)+' (English '+H.f(x.gl_en,2)+')</span></div><div class="tx">'+H.esc(x.t)+'</div></div>').join('');
  // pairs
  $('ef-l-pairs').innerHTML='<div class="tw"><table><tr><th>lid.176</th><th>GlotLID</th><th class="n">Documents</th></tr>'+L.top_pairs.map(([a,b,n])=>'<tr><td>'+H.esc(a)+'</td><td>'+H.esc(nm(b))+'</td><td class="n">'+H.n(n)+'</td></tr>').join('')+'</table></div>';
  $('ef-l-low').innerHTML='<p class="small">'+H.n(L.gl_not_in_ft)+' documents; lid.176 called them '+L.gl_not_in_ft_ft_label.map(([a,n])=>H.esc(a)+' '+n).join(', ')+'. GlotLID also put '+H.n(L.gl_noise)+' documents under an "undetermined" or noise label. A spot check of 24 of these found none really in the named language: they are menus, listings and tables (section 6) <span class="ef-lbl lab">hand-checked</span>.</p><div class="tw"><table>'+L.gl_not_in_ft_top.map(([a,n])=>'<tr><td>'+H.esc(nm(a))+'</td><td class="n">'+n+'</td></tr>').join('')+'</table></div>';
  $('ef-l-mix').innerHTML='<p class="small">Of '+H.n(L.en_gl)+' documents GlotLID labels English, '+H.n(L.mix20_en)+' have at least 20% of their line characters confidently in another language (lines of 4+ words, line score 0.5 or more). Most common second language:</p><div class="tw"><table>'+L.mix_langs_en.map(([a,n])=>'<tr><td>'+H.esc(nm(a))+'</td><td class="n">'+n+'</td></tr>').join('')+'</table></div>';
})();
