// ---- Reading section 13: einsum cost and backward calculator ----
(function(){
  const sel=document.getElementById('mc-ein-sel'),sz=document.getElementById('mc-ein-sz'),out=document.getElementById('mc-ein-out');
  if(!sel)return;
  const P=[['attention scores','bhqd,bhkd->bhqk','b=2 h=8 q=128 k=128 d=64'],['attention output','bhqk,bhkd->bhqd','b=2 h=8 q=128 k=128 d=64'],
    ['matrix product (the tiny model, one input)','ij,j->i','i=3 j=2'],['linear layer on a batch, Y = X Wᵀ','bn,mn->bm','b=1024 n=512 m=2048'],
    ['batched matrix product','bij,bjk->bik','b=16 i=512 j=64 k=512'],['outer product','i,j->ij','i=3 j=2']];
  sel.innerHTML=P.map((p,i)=>'<option value="'+i+'">'+p[0]+': '+p[1].replace('->','→')+'</option>').join('');
  const fmt=v=>v.toLocaleString('en-US');
  function run(){
    const p=P[+sel.value],spec=p[1],sizes={};
    (sz.value||'').split(/\s+/).forEach(t=>{const m=t.match(/^([a-z])=(\d+)$/);if(m)sizes[m[1]]=+m[2]});
    const c=MC.einsumCost(spec,sizes),[lhs,o]=spec.split('->'),ops=lhs.split(',');
    const missing=c.idx.filter(l=>!(l in sizes));
    let h='<div class="out">'+RD.stat('Multiply-adds',fmt(c.macs),'product of every letter’s size')+RD.stat('FLOPs',fmt(c.flops),'2 per multiply-add')+
      RD.stat('Output shape','('+c.outShape.join(', ')+')',c.summed.length?'summed over '+c.summed.join(', '):'nothing summed')+'</div>';
    if(missing.length)h+='<p class="small" style="color:var(--bad)">No size given for '+missing.join(', ')+'; counted as 1.</p>';
    if(ops.length===2&&ops.every(s=>new Set(s).size===s.length)){
      h+='<div class="small"><b>Backward:</b> gradient for the first operand <code>'+o+','+ops[1]+'→'+ops[0]+'</code>; for the second <code>'+ops[0]+','+o+'→'+ops[1]+'</code>. Each has the same letters, so the same '+fmt(c.flops)+' FLOPs: '+fmt(2*c.flops)+' backward against '+fmt(c.flops)+' forward.</div>';
    }
    out.innerHTML=h;
  }
  sel.addEventListener('change',()=>{sz.value=P[+sel.value][2];run()});
  sz.addEventListener('input',run);
  sz.value=P[0][2];run();
})();
