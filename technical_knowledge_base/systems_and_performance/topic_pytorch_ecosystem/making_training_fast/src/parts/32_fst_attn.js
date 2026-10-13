// ---- Attention lab: masks position by position and tile by tile; kernel sweep dense vs block-sparse ----
(function(){
  const D=window.FST,U=window.FU,$=U.$,esc=RD.esc;const F=D.flex;if(!F)return;
  const BS=128,W=F.window,PRE=F.prefix;
  let mask='sliding_window',T=1024,mode='flex',A=null,cache={};
  const docLens=T=>F.block_masks.find(b=>b.T===T&&b.mask==='document_causal').doc_lens;
  function fn(m,T){
    if(m==='causal')return (q,k)=>q>=k;
    if(m==='sliding_window')return (q,k)=>q>=k&&q-k<W;
    if(m==='prefix_lm')return (q,k)=>k<PRE||q>=k;
    const L=docLens(T),id=new Int32Array(T);let p=0;L.forEach((n,i)=>{for(let j=0;j<n;j++)id[p++]=i});
    return (q,k)=>id[q]===id[k]&&q>=k;
  }
  function tiles(m,T){const key=m+T;if(cache[key])return cache[key];
    const f=fn(m,T),n=Math.ceil(T/BS),t=new Uint8Array(n*n);let allowed=0;
    for(let i=0;i<n;i++)for(let j=0;j<n;j++){let c=0,tot=0;
      for(let q=i*BS;q<Math.min(T,(i+1)*BS);q++)for(let k=j*BS;k<Math.min(T,(j+1)*BS);k++){tot++;if(f(q,k))c++}
      allowed+=c;t[i*n+j]=c===0?0:c===tot?2:1}
    let full=0,part=0;t.forEach(v=>{if(v===2)full++;else if(v===1)part++});
    return cache[key]={n,t,full,part,empty:n*n-full-part,allowed}}
  const css=v=>getComputedStyle(document.documentElement).getPropertyValue(v).trim()||'#888';
  function drawPos(){
    const cv=$('at-pos'),R=256,ctx=cv.getContext('2d'),f=fn(mask,T),img=ctx.createImageData(R,R);
    const on=hex(css('--c3')),off=hex(css('--soft'));
    for(let y=0;y<R;y++)for(let x=0;x<R;x++){const q=Math.floor((y+0.5)*T/R),k=Math.floor((x+0.5)*T/R);const c=f(q,k)?on:off;const o=4*(y*R+x);img.data[o]=c[0];img.data[o+1]=c[1];img.data[o+2]=c[2];img.data[o+3]=255}
    ctx.putImageData(img,0,0);
  }
  function hex(s){if(s.startsWith('#')){let h=s.slice(1);if(h.length===3)h=h.split('').map(c=>c+c).join('');return [0,2,4].map(i=>parseInt(h.slice(i,i+2),16))}const m=s.match(/\d+/g);return m?m.slice(0,3).map(Number):[128,128,128]}
  function order(tl){const o=[];for(let i=0;i<tl.n;i++)for(let j=0;j<tl.n;j++){if(mode==='dense'||tl.t[i*tl.n+j])o.push([i,j])}return o}
  function drawTile(step){
    const tl=tiles(mask,T),cv=$('at-tile'),ctx=cv.getContext('2d'),S=256,c=S/tl.n;
    const col=[css('--dim'),css('--c5'),css('--c3')];ctx.clearRect(0,0,S,S);
    for(let i=0;i<tl.n;i++)for(let j=0;j<tl.n;j++){ctx.fillStyle=col[tl.t[i*tl.n+j]];ctx.fillRect(j*c+0.5,i*c+0.5,c-1,c-1)}
    const o=order(tl),k=Math.min(o.length,Math.round(step));
    ctx.fillStyle=css('--c2');ctx.globalAlpha=0.35;for(let s=0;s<k;s++)ctx.fillRect(o[s][1]*c+0.5,o[s][0]*c+0.5,c-1,c-1);ctx.globalAlpha=1;
    if(k>0&&k<=o.length){const p=o[k-1];ctx.strokeStyle=css('--c2');ctx.lineWidth=2;ctx.strokeRect(p[1]*c+1,p[0]*c+1,c-2,c-2)}
    return [o,k,tl];
  }
  const NS=40;
  function draw(i){
    const tl=tiles(mask,T),o=order(tl),k=Math.round(o.length*i/(NS-1));const r=drawTile(k);
    const done=o.slice(0,k);const fullN=done.filter(p=>tl.t[p[0]*tl.n+p[1]]===2).length,partN=done.filter(p=>tl.t[p[0]*tl.n+p[1]]===1).length,emptyN=done.length-fullN-partN;
    const all=tl.n*tl.n;
    $('at-cap').innerHTML='<div class="t">'+(mode==='dense'?'SDPA with a dense mask tensor':'FlexAttention with a BlockMask')+': '+k+' of '+o.length+' tiles</div><p>'+(mode==='dense'?'The kernel cannot know a tile is empty without reading the mask, so it computes every tile, scores included, and throws away what the mask forbids. The mask itself is a T &times; T tensor in memory.':'For each row of query tiles the kernel reads two short lists from the BlockMask: full tiles (no mask applied) and partial tiles (mask_mod evaluated inside). Empty tiles never appear in either list.')+'</p>';
    $('at-cnt').innerHTML=RD.stat('Tiles computed',k+' / '+all)+RD.stat('Full',fullN)+RD.stat('Partial',partN)+RD.stat('Empty, computed anyway',emptyN)+RD.stat('Pairs allowed',(100*tl.allowed/(T*T)).toFixed(1)+'%');
  }
  function check(){const tl=tiles(mask,T),r=F.block_masks.find(b=>b.T===T&&b.mask===mask);
    const ok=r.full_blocks===tl.full&&r.partial_blocks===tl.part&&r.skipped_blocks===tl.empty&&r.allowed_pairs===tl.allowed;
    $('at-check').innerHTML=(ok?'<span class="ok">Matches</span>':'<span class="bad">Does not match</span>')+' the BlockMask PyTorch built for this mask (<code>create_block_mask(..., BLOCK_SIZE=128)</code>, recorded): '+r.full_blocks+' full, '+r.partial_blocks+' partial, '+r.skipped_blocks+' empty tiles, '+U.comma(r.allowed_pairs)+' allowed pairs; <code>BlockMask.sparsity()</code> = '+r.sparsity_pct.toFixed(2)+'%. This drawing recomputes the tiles in your browser from the same mask function.'+(mask==='document_causal'?' Document lengths: '+r.doc_lens.join(', ')+'.':'');
    const code={causal:'def causal(b, h, q, k):\n    return q &gt;= k',sliding_window:'def sliding_window(b, h, q, k):          # W = '+W+'\n    return (q &gt;= k) &amp; (q - k &lt; W)',
      document_causal:'doc = torch.tensor(document_id_of_each_position)\ndef document_causal(b, h, q, k):\n    return (doc[q] == doc[k]) &amp; (q &gt;= k)',prefix_lm:'def prefix_lm(b, h, q, k):               # PREFIX = '+PRE+'\n    return (k &lt; PREFIX) | (q &gt;= k)'}[mask];
    $('at-code').innerHTML=code+'\n\nbm = create_block_mask('+mask+', None, None, '+T+', '+T+')\nout = torch.compile(flex_attention)(q, k, v, block_mask=bm)';}
  function all(){drawPos();check();if(A)A.reset(NS);else draw(0)}
  U.seg($('at-mask'),[['causal','Causal'],['sliding_window','Sliding window ('+W+')'],['document_causal','Document (4 packed)'],['prefix_lm','Prefix-LM ('+PRE+')']],m=>{mask=m;all()},mask);
  U.seg($('at-T'),[['256','T = 256'],['1024','T = 1,024'],['4096','T = 4,096']],t=>{T=+t;all()},'1024');
  U.seg($('at-mode'),[['flex','FlexAttention (BlockMask)'],['dense','SDPA, dense mask']],m=>{mode=m;if(A)A.reset(NS)},'flex');
  A=RD.anim({card:'at-card',ctl:'at-ctl',n:NS,ms:160,draw,label:'Tiles computed'});
  (window.TAB_RENDER['t-attn']=window.TAB_RENDER['t-attn']||[]).push(()=>{drawPos();A.redraw()});
  // measured tables
  const TF=D.time_flex&&D.time_flex.results;
  if(TF){let h='<table class="rd-tbl tbl-sm"><thead><tr><th>Device, T</th><th>Mask</th><th class="num">FlexAttention</th><th class="num">SDPA, dense mask</th><th class="num">SDPA is_causal</th></tr></thead><tbody>';
    const g=(d,T,m,i)=>{const r=TF.find(x=>x.device===d&&x.T===T&&x.mask===m&&x.impl.startsWith(i));return r?U.ms(r.median_ms):''};
    ['mps','cpu'].forEach(d=>[1024,4096].forEach(T=>['causal','sliding_window','document_causal','prefix_lm'].forEach(m=>{
      h+='<tr><td>'+d.toUpperCase()+', '+U.comma(T)+'</td><td>'+m.replace('_',' ')+'</td><td class="num">'+g(d,T,m,'flex')+(d==='cpu'?' <span class="small mute">eager</span>':'')+'</td><td class="num">'+g(d,T,m,'sdpa dense')+'</td><td class="num">'+(m==='causal'?g(d,T,'causal','sdpa is'):'')+'</td></tr>'})));
    $('at-time').innerHTML=h+'</tbody></table>';
    $('at-time-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, PyTorch 2.14.1, inference (no gradients), 1 sequence, 8 heads of 64, float32; <code>torch.utils.benchmark.Timer.blocked_autorange</code> medians with a device synchronize per call; bench lock, '+U.load(TF[0].load)+' (src/exp/time_misc.py <code>flex</code>). CPU FlexAttention is eager, which materialises the scores: it is the correctness reference, not a fast path.';}
  const R=F.runs.filter(r=>r.mask&&!r.score_mod);
  let h='<table class="rd-tbl tbl-sm"><thead><tr><th>Device</th><th>Mask or score_mod</th><th class="num">FlexAttention</th><th class="num">SDPA, dense mask</th></tr></thead><tbody>';
  F.runs.filter(r=>r.mask).forEach(r=>{const fl=r.compiled_max_abs_err_vs_f64!=null?r.compiled_max_abs_err_vs_f64.toExponential(1)+' compiled':(r.eager_max_abs_err_vs_f64!=null?r.eager_max_abs_err_vs_f64.toExponential(1)+' eager':'<span class="small mute">not run (compile unsupported)</span>');
    h+='<tr><td>'+r.device.toUpperCase()+'</td><td>'+(r.score_mod?r.mask+' + '+r.score_mod:r.mask.replace('_',' '))+'</td><td class="num">'+fl+'</td><td class="num">'+(r.sdpa_dense_mask_max_abs_err_vs_f64!=null?r.sdpa_dense_mask_max_abs_err_vs_f64.toExponential(1):'')+'</td></tr>'});
  F.runs.filter(r=>r.requires_grad).forEach(r=>{h+='<tr><td>'+r.device.toUpperCase()+'</td><td>backward</td><td colspan="2"><span class="bad">raises:</span> '+esc(r.backward_error)+'</td></tr>'});
  const ce=F.runs.find(r=>r.device==='cpu'&&r.compiled_error);if(ce)h+='<tr><td>CPU</td><td>torch.compile(flex_attention)</td><td colspan="2"><span class="bad">raises:</span> '+esc(ce.compiled_error)+'</td></tr>';
  $('at-corr').innerHTML=h+'</tbody></table>';
})();
