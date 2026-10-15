// ---- Contamination checker tab (t-dgcc) ----
(function(){
  const E=RD.esc,$=id=>document.getElementById(id),K=DG.checker,CN={};DG.corpora.forEach(c=>CN[c.key]=c.label);
  const col=k=>DGC[k]||'var(--mute)';
  const worst=o=>DGCAT.find(k=>o.cats[k])||'phrase';
  let sel=null,pairSel=0;
  // rules table
  (function(){const R=DG.rules,rows=[['gpt3_13','GPT-3: any shared 13-gram'],['tulu_8_50','Tulu 3: one document covers more than 50% (8-grams)'],['longest_50','ConTAM-style: longest run at least 50% of the item'],['datatrove','datatrove default (documents removed)']];
    let h='<table class="cc-rules"><thead><tr><th>Rule</th><th>Data</th><th class="num">pairs</th><th class="num">items</th><th class="num">copy</th><th class="num">variant / source</th><th class="num">false positives</th></tr></thead><tbody>';
    rows.forEach(([k,n])=>['web','post'].forEach(g=>{const r=R[k+'|'+g];if(!r)return;const c=r.cats;const fp=(c.passage||0)+(c.phrase||0)+(c.diagram||0);
      h+='<tr><td>'+(g==='web'?n:'')+'</td><td>'+(g==='web'?'web text':'post-training')+'</td><td class="num">'+(r.pairs_label||r.pairs)+'</td><td class="num">'+(k==='datatrove'?'-':r.items)+'</td><td class="num">'+(c.copy||0)+'</td><td class="num">'+((c.variant||0)+(c.source||0))+'</td><td class="num">'+(r.fp_label!=null?r.fp_label:fp)+'</td></tr>'}));
    $('cc-rules').innerHTML=h+'</tbody></table>'})();
  const bs=[...new Set(K.map(o=>o.b))];
  $('cc-b').innerHTML=bs.map(b=>'<option value="'+b+'">'+E(DG.bench_names[b])+' ('+K.filter(o=>o.b===b).length+' items flagged)</option>').join('');
  $('cc-b').value=bs.includes('mmlu_test')?'mmlu_test':bs[0];
  $('cc-cat').innerHTML+=DGCAT.map(k=>'<option value="'+k+'">'+k+'</option>').join('');
  $('cc-c').innerHTML+=DG.corpora.filter(c=>c.pairs).map(c=>'<option value="'+c.key+'">'+E(c.label)+'</option>').join('');
  $('cc-leg').innerHTML=DGCAT.map(k=>'<span style="--sw:'+col(k)+'">'+k+'</span>').join('');
  function list(){const b=$('cc-b').value,cat=$('cc-cat').value,cc=$('cc-c').value;
    const L=K.filter(o=>o.b===b&&(!cat||o.cats[cat])&&(!cc||o.p.some(p=>p.c===cc)));
    L.sort((x,y)=>DGCAT.indexOf(worst(x))-DGCAT.indexOf(worst(y))||x.x-y.x);
    $('cc-list').innerHTML=L.length?L.map(o=>'<button data-i="'+o.i+'" style="--sw:'+col(worst(o))+'" class="'+(sel&&sel.i===o.i?'on':'')+'">#'+o.x+' <span class="mute">'+o.n+'</span></button>').join(''):'<span class="small mute">No item matches these filters.</span>';
    if(!sel||!L.includes(sel)){sel=L[0]||null;pairSel=0}
    show()}
  function show(){const box=$('cc-item');if(!sel){box.innerHTML='';return}
    $('cc-list').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.i===sel.i));
    const p=sel.p[pairSel]||sel.p[0];
    let h='<h3 style="margin:10px 0 2px">'+E(DG.bench_names[sel.b])+' #'+sel.x+' <span class="small mute">'+sel.nt+' tokens; flagged in '+sel.n+' document'+(sel.n>1?'s':'')+(sel.n>sel.p.length?' (distinct matches shown: '+sel.p.length+')':'')+'</span></h3>';
    const inR=k=>p.rg.some(r=>k>=r[0]&&k<r[1]);
    h+='<div class="cc-tok">'+(sel.off?'<span class="mute">... </span>':'')+sel.t.map((w,j)=>{const k=j+sel.off;return '<span class="'+(inR(k)?'h ':'')+(k<sel.nq?'q':'')+'">'+E(w)+'</span>'}).join(' ')+(sel.off+sel.t.length<sel.nt?' <span class="mute">...</span>':'')+'</div>';
    h+=sel.p.map((q,k)=>{const cov=Math.round(q.cov8*100);
      const chip=(n,y)=>'<span class="cc-chip '+(y==null?'':(y?'y':'n'))+'">'+n+(y==null?': not run':y?': flags':': passes')+'</span>';
      return '<div class="cc-pair'+(k===pairSel?' on':'')+'" data-k="'+k+'" style="--sw:'+col(q.cat)+'" tabindex="0"><div class="hd"><b style="color:'+col(q.cat)+'">'+E(q.cat)+'</b><span>'+E(CN[q.c]||q.c)+'</span><span class="mute">doc '+E(q.d)+'</span></div>'+
        '<div class="hd">'+chip('13-gram',q.m13>0)+chip('Tulu 3 (8-gram, '+cov+'%)',q.cov8>0.5)+chip('longest run '+q.run,q.run>=0.5*sel.nt)+chip('datatrove',q.dt)+'</div>'+
        (q.note?'<div class="small">'+E(q.note)+'</div>':'')+'<div class="cc-win">'+E(q.win)+'</div></div>'}).join('');
    box.innerHTML=h}
  ['cc-b','cc-cat','cc-c'].forEach(id=>$(id).addEventListener('change',()=>{sel=null;list()}));
  $('cc-list').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sel=K.find(o=>o.i===+b.dataset.i);pairSel=0;show()});
  $('cc-item').addEventListener('click',e=>{const d=e.target.closest('.cc-pair');if(!d)return;pairSel=+d.dataset.k;show()});
  $('cc-item').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const d=e.target.closest('.cc-pair');if(!d)return;pairSel=+d.dataset.k;show()});
  $('cc-cat').value='copy';
  (window.TAB_RENDER=window.TAB_RENDER||{})['t-dgcc']=[()=>{if(!$('cc-list').children.length)list()}];
  list();
})();
