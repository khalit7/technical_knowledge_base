// ---- Port drills tab: real snippets and their real outputs (src/runs/out/drills.json)
(function(){
  const D=window.PJ.drills.drills,esc=RD.esc,el=document.getElementById('pjdr'),pick=document.getElementById('pjdr-pick');
  const done={};
  pick.innerHTML=D.map((d,i)=>'<option value="'+i+'">'+(i+1)+'. '+esc(d.title)+'</option>').join('');
  function show(i){const d=D[i];
    el.innerHTML='<h4>'+esc(d.title)+'</h4><div class="pj-grp">PyTorch</div><pre class="pj-code wrap">'+esc(d.torch)+'</pre><pre class="pj-code pj-out wrap">'+esc(d.torch_out)+'</pre>'+
      '<div class="pj-grp">Which JAX port matches it?</div><div class="cands">'+d.cands.map(c=>'<button class="cand" data-c="'+c.id+'"><pre>'+esc(c.code)+'</pre><div class="res" hidden></div></button>').join('')+'</div>';
    el.querySelectorAll('.cand').forEach(b=>b.addEventListener('click',()=>reveal(i,b.dataset.c)));
    if(done[i])reveal(i,done[i])}
  function reveal(i,chosen){const d=D[i];done[i]=chosen;
    el.querySelectorAll('.cand').forEach(b=>{const c=d.cands.find(x=>x.id===b.dataset.c);b.classList.toggle('right',c.right);b.classList.toggle('wrong',!c.right&&b.dataset.c===chosen);
      const r=b.querySelector('.res');r.hidden=false;
      r.innerHTML=(b.dataset.c===chosen?'<b>Your choice.</b> ':'')+(c.right?'<b>Matches.</b> ':'<b>Wrong.</b> ')+(c.ok?'Printed <code>'+esc(c.out)+'</code>':'Raised <code>'+esc(c.out)+'</code>')+
        (c.maxdiff_vs_torch!=null?' (max |diff| from PyTorch '+PJU.fmt(c.maxdiff_vs_torch,'s2')+')':'')+'. '+esc(c.why)+'.'});
    const n=Object.keys(done).length,ok=Object.keys(done).filter(k=>D[k].cands.find(c=>c.id===done[k]).right).length;
    document.getElementById('pjdr-score').textContent=ok+' of '+n+' answered drills right'}
  pick.addEventListener('change',()=>show(+pick.value));
  document.getElementById('pjdr-next').addEventListener('click',()=>{pick.value=String((+pick.value+1)%D.length);show(+pick.value)});
  show(0);
})();
