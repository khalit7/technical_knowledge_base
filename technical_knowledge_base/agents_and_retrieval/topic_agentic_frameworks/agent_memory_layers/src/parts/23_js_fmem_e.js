// ---- Reading section 5: results by ability, per reader ----
(function(){
  const F=FM.F,tb=document.getElementById('fmem-res');if(!tb)return;
  const TY=[['IE','Extraction'],['MS','Multi-session'],['KU','Update'],['TR','Temporal'],['ABS','Abstention']];
  let rd='haiku';
  const col=f=>'color-mix(in srgb,color-mix(in srgb,var(--good) '+Math.round(f*100)+'%,var(--bad)) 38%,transparent)';
  function draw(){
    const rows=FM.SYS.filter(s=>F.A[s.k+'|'+rd]);
    tb.innerHTML='<thead><tr><th class="mh">Memory<small>writer</small></th>'+TY.map(t=>'<th>'+t[1]+'<small>'+F.V['nq.'+t[0]]+' questions</small></th>').join('')+'<th>All<small>25</small></th><th>Evidence<small>no model</small></th></tr></thead><tbody>'+
      rows.map(s=>{const sc=FM.score(s.k,rd);const ev=s.k==='full'?F.EV.full:(s.ev&&F.EV[s.ev]);const en=ev?Object.values(ev).filter(Boolean).length:null;
        return '<tr data-k="'+s.k+'" style="cursor:pointer"><th class="mh">'+s.l+'<small>'+(s.w||'no writer')+'</small></th>'+TY.map(t=>{const b=FM.byType(s.k,rd,t[0]);return '<td class="v" style="background:'+col(b[0]/b[1])+';color:var(--ink)">'+b[0]+'/'+b[1]+'</td>'}).join('')+
        '<td class="v"><b>'+sc[0]+'</b></td><td class="v">'+(en===null?'<span class="mute">n/a</span>':en+'/'+F.V['ev.n'])+'</td></tr>'}).join('')+'</tbody>';
  }
  RD.seg(document.getElementById('fmem-rsr'),m=>{rd=m;draw()});
  tb.addEventListener('click',e=>{const r=e.target.closest('tr[data-k]');if(!r)return;if(window.FMLAB)FMLAB.open(r.dataset.k,rd)});
  draw();
})();
