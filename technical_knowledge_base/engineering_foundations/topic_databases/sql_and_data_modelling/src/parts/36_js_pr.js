// ---- Reading: predict, then reveal (answers read from the recorded PostgreSQL results) ----
(function(){
  const D=window.SM_DATA;
  const val=(id,i)=>{try{return D.ex[id].pgres.filter(r=>r.cols)[i].rows[0][0]}catch(e){return '?'}};
  const P={
    'rd-pr-notin':{q:'Predict first. Among the 50 users, how many live in a country where no team-plan user lives? The box below asks it twice, with NOT IN and with NOT EXISTS. What will NOT IN return?',
      opts:['The same number as NOT EXISTS','A few fewer than NOT EXISTS','Zero'],right:2,
      ans:()=>'NOT IN returns <b>'+val('j_notin_null',0)+'</b>, NOT EXISTS returns <b>'+val('j_notin_null',1)+'</b> (PostgreSQL; SQLite agrees). The reason is one NULL in the subquery, explained under the box.'}
  };
  Object.keys(P).forEach(id=>{const el=document.getElementById(id);if(!el)return;const p=P[id];
    el.innerHTML='<div class="q">'+p.q+'</div><div class="opts">'+p.opts.map((o,i)=>'<button data-i="'+i+'">'+o+'</button>').join('')+'</div><div class="ans" hidden></div>';
    el.querySelector('.opts').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
      el.querySelectorAll('.opts button').forEach((x,i)=>{x.classList.toggle('right',i===p.right);x.classList.toggle('wrong',x===b&&i!==p.right)});
      const a=el.querySelector('.ans');a.hidden=false;a.innerHTML=(+b.dataset.i===p.right?'Right. ':'Not quite. ')+p.ans()})});
})();
