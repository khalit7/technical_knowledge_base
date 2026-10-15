// ---- Label browser ----
(function(){
  const H=EFH,E=window.EF,$=H.$,S=E.labels.summary,Rw=E.labels.rows;if(!$('ef-b-sum')||!S)return;
  const nice=g=>g.replace('drop:','').replace('trap:','trap: ').replace(/_/g,' ').replace('gopher ','Gopher ').replace('n grams','n-grams');
  const groups=Object.keys(S).sort((a,b)=>(a==='kept')-(b==='kept')||a.localeCompare(b));
  const rows=groups.map(g=>{const s=S[g];const kept=g==='kept';const k=kept?s.J:s.W;return {g,s,v:s.n?k/s.n:0,ci:kept?s.junk_ci:s.wrong_ci,txt:k+' / '+s.n}});
  rows.sort((a,b)=>b.v-a.v);
  $('ef-b-sum').innerHTML=rows.map(r=>'<div class="ef-bar" data-g="'+r.g+'" style="cursor:pointer"><div class="nm">'+H.esc(nice(r.g))+'</div><div class="tr"><span class="fl" style="width:'+(100*r.v)+'%;background:'+(r.g.startsWith('trap')?'var(--c5)':r.g==='kept'?'var(--c4)':'var(--bad)')+'"></span><span class="ci" style="left:'+(100*r.ci[0])+'%;width:'+Math.max(0.5,100*(r.ci[1]-r.ci[0]))+'%"></span></div><div class="v">'+r.txt+'</div></div>').join('');
  const gs=groups.slice();
  $('ef-b-g').innerHTML='<option value="all">All groups ('+Rw.length+' documents)</option>'+gs.map(g=>'<option value="'+g+'">'+H.esc(nice(g))+' ('+Rw.filter(r=>r.g===g).length+' here, '+S[g].pipe+' in the Pipeline lab)</option>').join('');
  let lab='all';
  function list(){const g=$('ef-b-g').value;const a=Rw.filter(r=>(g==='all'||r.g===g)&&(lab==='all'||r.l===lab));
    $('ef-b-list').innerHTML='<p class="small mute">'+a.length+' documents</p>'+a.slice(0,120).map(r=>'<div class="ef-row"><div class="h"><span class="ef-l '+r.l+'">'+r.l+'</span><b>'+H.esc(r.host||'(host withheld)')+'</b><span>'+H.esc(nice(r.g))+'</span>'+(r.fw?'<span>in FineWeb</span>':'')+(r.note?'<span>'+H.esc(r.note)+'</span>':'')+'</div><div class="tx">'+(r.t?H.esc(r.t):'<span class="mute">excerpt withheld ('+(r.f==='A'?'adult page':'private individual\'s page')+')</span>')+'</div></div>').join('')+(a.length>120?'<p class="small mute">First 120 shown; narrow the group.</p>':'');
    H.store.set('bg',g)}
  $('ef-b-g').addEventListener('change',list);H.chips($('ef-b-l'),m=>{lab=m;list()});
  $('ef-b-sum').addEventListener('click',e=>{const b=e.target.closest('.ef-bar');if(!b)return;$('ef-b-g').value=b.dataset.g;list();$('ef-b-g').scrollIntoView({block:'nearest'})});
  const sg=H.store.get('bg','all');if([...$('ef-b-g').options].some(o=>o.value===sg))$('ef-b-g').value=sg;list();
})();
