// ---- Reading section 5: the partitioner explorer (one block's joint graph under each cut) ----
(function(){
  const {$,esc,comma}=TU,P=TCP.aot;if(!$('tcpp-card'))return;
  const K=[['default','default_partition','Save whatever the backward needs that the forward made; recompute nothing. This is what eager autograd does op by op.'],
    ['mincut_1.0','min-cut, budget 1.0 (default)','Inductor\'s default: recompute cheap pointwise and view ops when that saves bytes. Here it recomputes the GELU intermediates and the reshaped attention output (the input of proj) in backward instead of saving them.'],
    ['mincut_0.5','min-cut, budget 0.5','Allowed half the activation bytes: now some matrix multiplies and the attention are recomputed too.'],
    ['mincut_0.2','min-cut, budget 0.2','A fifth of the bytes: most of the block is recomputed.'],
    ['mincut_0.0','min-cut, budget 0.0','Save no activation: the backward reruns the whole forward it needs, like full activation checkpointing.']];
  const J=P.joint;let cur=0,sel=null;
  function cls(name,k){const S=P.block[k],sv=S.saved.some(s=>s[0]===name),fw=S.fw_names.includes(name),bw=S.bw_names.includes(name);
    return sv?'sv':(fw&&bw)?'rc':fw?'fw':'bw'}
  function info(){if(sel===null){$('tcpp-info').textContent='Tap an operation.';return}const n=J[sel];
    $('tcpp-info').innerHTML='<b>'+esc(n[0])+'</b> = '+esc(n[1])+(n[4]?' ('+n[4].join(', ')+'), '+comma(n[3])+' bytes':'')+(n[2].length?'; inputs '+esc(n[2].slice(0,5).join(', ')):'')+'<br>'+K.map(([k,l])=>esc(l)+': <b>'+({sv:'saved',rc:'recomputed',fw:'forward only',bw:'backward'})[cls(n[0],k)]+'</b>').join('; ')}
  function draw(i){cur=i;const k=K[i][0],S=P.block[k];
    $('tcpp-grid').innerHTML=J.map((n,j)=>'<button class="'+cls(n[0],k)+(j===sel?' sel':'')+'" data-j="'+j+'" title="'+esc(n[0]+' '+n[1])+'">'+esc(n[1].split('.')[0])+'</button>').join('');
    $('tcpp-cap').innerHTML='<div class="t">'+esc(K[i][1])+'</div><p>'+K[i][2]+'</p>';
    $('tcpp-cnt').innerHTML=TU.stat('Activation bytes saved',comma(S.saved_bytes_activations))+TU.stat('Tensors crossing the cut',S.saved.length)+TU.stat('Recomputed in backward',S.recomputed.length)+TU.stat('Forward / backward ops',S.fw_ops+' / '+S.bw_ops);
    $('tcpp-tbl').innerHTML=TU.table(['Saved value','Made by','Shape','Bytes','Counted'],S.saved.map(s=>[esc(s[0]),esc(s[1]),s[2]?s[2].join(' x '):'',comma(s[3]),s[4]?'input':s[5]?'view of an input':'yes']));
    info()}
  $('tcpp-grid').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;sel=+b.dataset.j;draw(cur)});
  const A=RD.anim({card:'tcpp-card',ctl:'tcpp-ctl',n:K.length,draw,ms:2600,label:'Partitioner'});
})();
