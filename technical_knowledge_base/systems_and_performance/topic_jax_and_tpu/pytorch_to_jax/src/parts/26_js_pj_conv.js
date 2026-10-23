// ---- Reading section 3 (moved from the old Weight conversion tab, 2026-10-23): a transpose animation on a real tile, and the real name map
(function(){if(!document.getElementById('pjwc-tile'))return;
  const C=window.PJ.convert,G=window.PJ.gpt2,esc=RD.esc;
  // ---------------- the tile animation
  let src='lin';const el=document.getElementById('pjwc-tile'),cap=document.getElementById('pjwc-cap');
  const R=6,K=8;
  function colr(v,m){const t=Math.max(-1,Math.min(1,v/m));const a=Math.abs(t);return t<0?'color-mix(in srgb,var(--c1) '+(15+70*a).toFixed(0)+'%,var(--bg))':'color-mix(in srgb,var(--c2) '+(15+70*a).toFixed(0)+'%,var(--bg))'}
  function draw(i){const W=RD.width(el),tile=src==='lin'?C.tile.torch_corner:G.tile.stored_corner;
    const m=Math.max(...tile.flat().map(Math.abs));const gap=W<520?18:40;const cs=Math.max(18,Math.min(46,Math.floor((W-gap-20)/(K+R))));
    const ox2=10+K*cs+gap,Hh=Math.max(R,K)*cs+40;let b='';
    b+=RD.t(10,14,src==='lin'?'as stored by PyTorch: [out, in]':'as stored by Conv1D: [in, out]',{fs:11,fill:'var(--mute)'})+RD.t(ox2,14,src==='lin'?'as Flax needs it: [in, out]':'as JAX needs it: [in, out]',{fs:11,fill:'var(--mute)'});
    // left: the stored matrix; rows already moved fade
    for(let r=0;r<R;r++)for(let c=0;c<K;c++){const moved=src==='lin'?r<i:true;const v=tile[r][c];
      b+='<rect x="'+(10+c*cs)+'" y="'+(22+r*cs)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="3" fill="'+colr(v,m)+'" opacity="'+(moved&&src==='lin'?0.25:1)+'" stroke="'+(src==='lin'&&r===i-1?'var(--acc)':'none')+'"/>';
      if(cs>=34)b+=RD.t(10+c*cs+cs/2-1,22+r*cs+cs/2+3,v.toFixed(2),{a:'middle',fs:9})}
    // right: the target layout, filled as rows arrive (row r of PyTorch becomes column r)
    const n=src==='lin'?Math.min(i,R):R,tr=src==='lin';
    const rr=tr?K:R,cc=tr?R:K;
    for(let r=0;r<rr;r++)for(let c=0;c<cc;c++){const has=tr?c<n:true;const v=tr?tile[c][r]:tile[r][c];
      b+='<rect x="'+(ox2+c*cs)+'" y="'+(22+r*cs)+'" width="'+(cs-2)+'" height="'+(cs-2)+'" rx="3" fill="'+(has?colr(v,m):'var(--soft)')+'" stroke="'+(tr&&c===n-1&&i>0&&i<=R?'var(--acc)':'var(--line)')+'"/>';
      if(has&&cs>=34)b+=RD.t(ox2+c*cs+cs/2-1,22+r*cs+cs/2+3,v.toFixed(2),{a:'middle',fs:9})}
    el.innerHTML=RD.svg(Math.max(W,ox2+Math.max(cc,K)*cs+10),Hh,b,'tile transpose');
    if(src==='lin')cap.innerHTML=i===0?'PyTorch stores <code>'+esc(C.tile.name)+'</code> as [out, in] = [128, 128] and computes x W<sup>T</sup>. Flax\'s kernel is [in, out] and computes x W. Press play: each stored row becomes a column.':
      (i<=R?'Row '+(i-1)+' of the PyTorch weight (output feature '+(i-1)+'\'s weights over the inputs) becomes column '+(i-1)+' of the Flax kernel. This matrix is square, so if you forget the transpose nothing complains: the logits come out wrong by '+PJU.fmt(PJ.hunt.variants.transpose.rungs.logits,'s2')+' (Divergence hunter).':'Done: all '+C.n_transposed+' Linear kernels get this treatment; biases, LayerNorm scales and embeddings are copied as they are.');
    else cap.innerHTML='GPT-2\'s <code>'+esc(G.tile.name)+'</code> is a Hugging Face Conv1D weight, stored [in, out] already: the JAX port uses it as stored, and nothing moves. Transposing it "because it is PyTorch" makes the logits wrong by '+PJU.fmt(G.mistakes.transpose.logits_maxdiff,'s2')+'; the non-square c_attn and c_fc would fail on shape instead.'}
  const a=PJU.anim({card:'pjwc-card',ctl:'pjwc-ctl',n:R+2,draw,ms:1100,label:'Row'});RD.onResize(()=>a.redraw());
  RD.seg(document.getElementById('pjwc-src'),m=>{src=m;a.reset(m==='lin'?R+2:1)});
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
