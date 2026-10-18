// ---- Reading tab: census bars, reproduction box, corrections, small-multiple strips, delta tables ----
(function(){
  const G=window.AG;if(!G||!document.getElementById('t-read'))return;
  const {rows,by,$,fmt,fmtB,esc,A}=G,C=G.D.census;
  // census bars (section 0)
  (function(){const el=$('ag-cenb');if(!el)return;
    const K=[['mla','MLA latent'],['sparse','Trained sparse'],['win','Sliding windows'],['hyb','Linear or SSM hybrid'],['moe','Mixture of experts'],['prope','Partial RoPE'],['nope','Layers with no position']];
    const Y=[['2024','2024 and earlier','var(--dim)'],['2025','2025','var(--c6)'],['2026','2026','var(--acc)']];
    function draw(){const w=G.width(el),narrow=w<520,lw=narrow?0:150,bw=Math.max(80,w-lw-60),rh=9;
      let h='<div class="ag-leg">'+Y.map(y=>'<span><i class="ag-sw" style="background:'+y[2]+'"></i>'+y[1]+' ('+C[y[0]].n+' models)</span>').join('')+'</div>';
      K.forEach(([k,l])=>{let s='';Y.forEach((y,j)=>{const v=C[y[0]][k]/C[y[0]].n,x=Math.round(bw*v);s+='<rect x="0" y="'+(j*(rh+2))+'" width="'+Math.max(1,x)+'" height="'+rh+'" rx="2" fill="'+y[2]+'"/><text x="'+(x+4)+'" y="'+(j*(rh+2)+8.5)+'" font-size="10.5" fill="var(--mute)">'+Math.round(100*v)+'%</text>'});
        h+='<div class="row"><span>'+l+'</span><svg viewBox="0 0 '+(bw+40)+' '+(3*(rh+2))+'" width="'+(bw+40)+'" height="'+(3*(rh+2))+'" role="img" aria-label="'+l+' by year">'+s+'</svg></div>'});
      el.innerHTML=h}
    draw();G.onTab('t-read',draw);let t=0;addEventListener('resize',()=>{clearTimeout(t);t=setTimeout(()=>{if(!$('t-read').hidden)draw()},80)})})();
  // reproduction box and corrections (section 1)
  (function(){const st=C.status,el=$('ag-repro');if(!el)return;
    el.innerHTML='<div class="t">Defaults reproduce the gallery, independently</div>Recomputed from each model\'s own config.json with the gallery\'s convention, the KV cache per token matches the gallery\'s published figure for <b>'+st.match+' of '+(st.match+st.differs)+'</b> models within rounding (two of them only once the trained-sparse indexer keys are added, as the gallery does for GQA-based sparse attention). The <b>'+st.differs+'</b> that differ are below, each with the gallery\'s arithmetic reconstructed and the config\'s. Also listed: '+st.nocfg+' entries with no readable config, '+st.galkv+' DeepSeek V4 entries shown with the gallery\'s figure, and rows this page adds (Llama 3.1 8B and 70B, Granite 4.0-H Small, Step-5 Preview whose gallery figure is "N/A", and the tiny GPT).';
    const d=rows.filter(r=>r.status==='differs');
    $('ag-diffs').innerHTML='<div class="tw"><table><thead><tr><th>Model</th><th class="num">Gallery</th><th>How the gallery\'s number reconstructs</th><th class="num">From the config</th><th>Which is right, and the evidence</th></tr></thead><tbody>'+
      d.map(r=>'<tr><td><b>'+esc(r.n)+'</b><br><span class="ag-lab '+(r.kind==='conv'?'der':'unc')+'">'+(r.kind==='conv'?'convention':'correction')+'</span></td><td class="num">'+esc(r.galtxt)+'</td><td class="small">'+esc(r.galhow)+' = '+fmt(r.galbytes)+' bytes</td><td class="num">'+fmtB(r.kv)+'<br><span class="small mute">'+fmt(r.kv)+' bytes</span></td><td class="small">'+esc(r.why)+'</td></tr>').join('')+'</tbody></table></div>'})();
  // small multiples (section 4)
  (function(){const el=$('ag-smb');if(!el)return;$('ag-leg4').innerHTML=G.legend();
    const N=['Tiny GPT (this topic\'s running example)','Llama 3.1 8B','Gemma 3 27B','GPT-OSS 120B','Llama 4 Maverick','SmolLM3 3B','Qwen3 Next 80B-A3B','DeepSeek V3.2','Nemotron 3 Super 120B-A12B','DeepSeek V4-Flash','Gemma 4 31B','Kimi K3'];
    el.innerHTML=N.filter(n=>by[n]).map(n=>{const r=by[n];return '<button class="nm" data-n="'+esc(n)+'" title="Open in Decode a config">'+esc(n.replace(' (this topic\'s running example)',''))+'</button><div>'+G.strips(r)+'</div><span class="v">'+(r.kv?fmtB(r.kv):'compressed')+'</span>'}).join('');
    el.addEventListener('click',e=>{const b=e.target.closest('button.nm');if(!b)return;if(window.AGDEC)window.AGDEC.open(b.dataset.n)})})();
  // per-layer cost table (section 6)
  (function(){const el=$('ag-t6');if(!el)return;
    const N=['Llama 3.1 70B','Qwen3 235B-A22B','GPT-OSS 120B','MiniMax M2 230B','DeepSeek V3','Mistral Large 3','Kimi K3','Gemma 4 31B','Qwen3 Next 80B-A3B','Nemotron 3 Super 120B-A12B'];
    el.innerHTML='<table><thead><tr><th>Model</th><th>Design</th><th>Per growing layer, per token</th><th class="num">Layers that grow</th><th class="num">KV per token</th></tr></thead><tbody>'+N.filter(n=>by[n]).map(n=>{const r=by[n],x=G.explain(r);
      return '<tr><td>'+esc(n)+'</td><td>'+G.FAM[r.fam][0]+'</td><td class="small">'+x.lines.map(l=>'<b>'+l.c+'</b> '+fmt(l.per)+' B: '+esc(l.ph)).join('<br>')+'</td><td class="num">'+x.lines.reduce((a,l)=>a+l.n,0)+' of '+r.L+'</td><td class="num">'+fmtB(r.kv)+'</td></tr>'}).join('')+'</tbody></table>'})();
  // windows: headline against credited (section 7)
  (function(){const el=$('ag-w7b');if(!el)return;
    const W=rows.filter(r=>r.mix&&/S/.test(r.mix)&&r.kv&&r.kvw&&!r.x).sort((a,b)=>b.kv/b.kvw-a.kv/a.kvw);const mx=Math.max(...W.map(r=>r.kv));
    el.innerHTML=W.map(r=>'<div class="row"><span class="nm" title="'+esc(r.n)+'">'+esc(r.n)+'</span><div class="track"><div class="fill" style="width:'+(100*r.kv/mx).toFixed(1)+'%;background:var(--acc2)"></div><div class="fill" style="width:'+Math.max(.6,100*r.kvw/mx).toFixed(1)+'%;background:var(--c6)"></div></div><span class="val">'+(r.kv/r.kvw).toFixed(1)+'×</span></div>').join('')+
      '<p class="small mute">Right: the factor by which crediting the windows shrinks the cache held at 131,072 tokens. Bars to the same scale, largest '+fmtB(mx)+' per token.</p>'})();
  // hybrids (section 8)
  (function(){const el=$('ag-t8');if(!el)return;
    const H=rows.filter(r=>r.mix&&/[LH]/.test(r.mix)&&r.kv&&!r.x).sort((a,b)=>a.dt<b.dt?-1:1);
    el.innerHTML='<table><thead><tr><th>Model</th><th>Released</th><th class="num">Attention layers</th><th class="num">Cache per token</th><th class="num">Fixed state per sequence</th><th class="num">State = cache at</th></tr></thead><tbody>'+H.map(r=>{const nL=(r.mix.match(/[LH]/g)||[]).length,nA=r.L-nL-(r.mix.match(/F/g)||[]).length,sb=G.stateB(r);
      return '<tr><td>'+esc(r.n)+'</td><td style="white-space:nowrap">'+r.dt+'</td><td class="num">'+nA+' of '+(nA+nL)+'</td><td class="num">'+fmtB(r.kv)+'</td><td class="num">'+(sb?fmtB(sb):'<span class="mute">not decoded</span>')+'</td><td class="num">'+(sb?fmt(Math.round(sb/r.kv))+' tokens':'')+'</td></tr>'}).join('')+'</tbody></table><p class="small mute">State: the recurrent matrix state of every linear layer, in FP32 as the root Config calculator keeps it (convolution caches, a few MiB, left out). "Not decoded": lightning-attention (Ling) and short-convolution (LFM2.5) states, whose shapes this page does not read. Nemotron counts exclude its FFN-only blocks. Derived from configs.</p>'})();
  // experts (section 9)
  (function(){const el=$('ag-t9');if(!el)return;
    const M=rows.filter(r=>r.mix&&/e/.test(r.ffn)&&r.dt>='2026'&&!r.x).sort((a,b)=>(b.tot||0)-(a.tot||0)).slice(0,14);
    el.innerHTML='<table><thead><tr><th>2026 model (largest 14)</th><th class="num">Total</th><th class="num">Active</th><th class="num">Routed experts</th><th class="num">Per token</th><th class="num">Shared</th><th class="num">Dense first layers</th></tr></thead><tbody>'+M.map(r=>{const pre=r.ffn.length-r.ffn.replace(/^d+/,'').length;
      return '<tr><td>'+esc(r.n)+'</td><td class="num">'+(r.tot>=1000?(r.tot/1000).toFixed(1)+'T':fmt(r.tot,r.tot%1?1:0)+'B')+'</td><td class="num">'+(r.act?fmt(r.act,r.act%1?1:0)+'B':'')+'</td><td class="num">'+(r.E||'')+'</td><td class="num">'+(r.k||'')+'</td><td class="num">'+(r.sh||0)+'</td><td class="num">'+pre+'</td></tr>'}).join('')+'</tbody></table><p class="small mute">Total and active: the gallery\'s line (<span class="ag-lab gal">gallery</span>, from vendor cards); experts and dense layers read from the configs.</p>'})();
  G.drills(document.getElementById('t-read'));
})();
