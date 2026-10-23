// ---- Reading: fill measured lines (process list, the patch diff) from window.VL_KNOB ----
(function(){
  const K=window.VL_KNOB;if(!K)return;
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const ps=document.getElementById('vl-ps-line');
  if(ps&&K.ps_k0_default){const names=K.ps_k0_default.map(l=>l.split(' ').slice(3).join(' ')).filter(c=>/vllm serve|VLLM::/.test(c)).map(c=>/vllm serve/.test(c)?'the API server (vllm serve)':c);
    ps.innerHTML=names.map(n=>'<span class="mono">'+esc(n)+'</span>').join(', ')+' (plus Python\'s multiprocessing resource tracker).'}
  const d=document.getElementById('vl-diff');
  if(d&&K.diff){// show the four source files, not the test (described in step 4)
    const parts=K.diff.split(/^(?=diff --git )/m).filter(p=>!/^diff --git a\/tests\//.test(p));
    d.innerHTML=parts.join('').split('\n').filter(l=>!/^(index |diff --git )/.test(l)).map(l=>{const c=l.startsWith('+')&&!l.startsWith('+++')?'a':(l.startsWith('-')&&!l.startsWith('---')?'d':(l.startsWith('@@')||l.startsWith('---')||l.startsWith('+++')?'c':''));return c?'<span class="'+c+'">'+esc(l)+'</span>':esc(l)}).join('\n')}
})();
