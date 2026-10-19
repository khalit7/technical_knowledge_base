// ---- Code quotes: <div class="ns-code" data-code="key"></div> filled from NSD.code (located by pattern in src/code/code_refs.py) ----
(function(){
  const D=window.NSD,C=window.NSC;if(!D||!C)return;
  document.querySelectorAll('.ns-code[data-code]').forEach(el=>{
    const ref=D.code.refs[el.dataset.code];if(!ref){el.textContent='(missing quote '+el.dataset.code+')';return}
    const lines=ref.code.split('\n'),w=String(ref.end).length;
    const dedent=Math.min(...lines.filter(l=>l.trim()).map(l=>l.match(/^ */)[0].length));
    el.innerHTML=lines.map((l,i)=>'<span class="ln">'+String(ref.line+i).padStart(w,' ')+'  </span>'+C.esc(l.slice(dedent))).join('\n');
    const src=document.createElement('div');src.className='ns-src';
    src.textContent=(ref.base==='transformers'?'transformers v'+(D.code.transformers_version||'5.20.1')+' ('+D.code.transformers_commit+'), ':'the running example, root ')+ref.file+':'+ref.line+(ref.end!==ref.line?'-'+ref.end:'');
    el.after(src);
  });
})();
