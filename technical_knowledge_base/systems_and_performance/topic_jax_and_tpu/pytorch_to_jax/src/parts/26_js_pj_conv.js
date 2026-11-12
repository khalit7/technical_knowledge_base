// ---- Reading section 3: the real name map of all 69 tensors (closed block). The transpose animation on a real tile became the 3D stage Fig. 2 (42_js_sc_conv.js) on 2026-11-12.
(function(){if(!document.getElementById('pjwc-names'))return;
  const C=window.PJ.convert,G=window.PJ.gpt2,esc=RD.esc;
  // ---------------- the name list
  const names=document.getElementById('pjwc-names'),det=document.getElementById('pjwc-det');let filt='all';
  function list(){let rows;
    if(filt==='gpt2')rows=G.tensors_shown.map(t=>({torch:t.name,ts:t.shape,nnx:'(same name, same layout)',ns:t.shape,tr:false,g:true}));
    else rows=C.tensors.filter(t=>filt==='all'||t.transpose).map(t=>({torch:t.torch,ts:t.torch_shape,nnx:t.nnx,ns:t.nnx_shape,tr:t.transpose,n:t.n}));
    names.innerHTML=rows.map((r,i)=>'<div class="'+(r.tr?'tr':'')+'" data-i="'+i+'" tabindex="0"><span>'+esc(r.torch)+'</span><span class="sh">'+r.ts.join('x')+'</span><span class="ar">'+(r.tr?'&#8635;':'&rarr;')+'</span><span>'+esc(r.nnx)+'</span><span class="sh">'+r.ns.join('x')+'</span></div>').join('');
    names._rows=rows}
  names.addEventListener('click',e=>{const d=e.target.closest('div[data-i]');if(!d)return;names.querySelectorAll('div.on').forEach(x=>x.classList.remove('on'));d.classList.add('on');
    const r=names._rows[+d.dataset.i];
    det.innerHTML=r.g?'<b>'+esc(r.torch)+'</b> '+r.ts.join(' x ')+(/c_attn\.weight|c_fc\.weight|c_proj\.weight/.test(r.torch)?': a Conv1D weight, already [in, out]; used as stored.':/wte/.test(r.torch)?': the token embedding, and (transposed in the matmul, x @ wte.T) the output head too.':': copied as stored.'):
      '<dl><dt>PyTorch</dt><dd><code>'+esc(r.torch)+'</code> '+r.ts.join(' x ')+'</dd><dt>Flax NNX</dt><dd><code>'+esc(r.nnx)+'</code> '+r.ns.join(' x ')+'</dd><dt>rule</dt><dd>'+(r.tr?'kernel &larr; weight<sup>T</sup> (a Linear layer)':/scale$/.test(r.nnx)?'scale &larr; weight (LayerNorm)':/embedding$/.test(r.nnx)?'embedding &larr; weight':'bias &larr; bias')+'</dd><dt>elements</dt><dd>'+(r.n||0).toLocaleString('en-US')+'</dd></dl>'});
  RD.seg(document.getElementById('pjwc-filter'),m=>{filt=m;list();det.textContent='Click a row.'});
  list();
})();
