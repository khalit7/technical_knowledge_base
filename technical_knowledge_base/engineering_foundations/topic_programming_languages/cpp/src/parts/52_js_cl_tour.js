// ---- Part 3 Code tour: one token's path through the files, prompt (builds everything) against next token (graph reused) ----
(function(){
  const X=window.CLX,CL=X.CL,TAB='t-cl-tour',esc=X.esc,fmt=X.fmt;
  if(!document.getElementById(TAB)||!CL.v||!window.RD)return;const v=CL.v;
  const GROUPS=[['app','examples/','--c5',['simple.cpp']],['lib','src/ (libllama)','--c1',['llama-context.cpp','models/llama.cpp','llama-kv-cache.cpp','llama-sampler.cpp']],
    ['ggml','ggml/src/','--c3',['ggml.c','ggml-alloc.c','ggml-backend.cpp']],['cpu','ggml/src/ggml-cpu/','--c2',['ggml-cpu.c','repack.cpp','arch/arm/repack.cpp']]];
  const P1=(l,s)=>[l,'t-ca-read',s],P2=(l,s)=>[l,'t-cb-read',s];
  // f: file box; both modes unless only:'prompt'
  const STEPS=[
    {f:'simple.cpp',t:'Fill a batch',ex:'batch_helper',chips:[P1('vectors','ca-std'),['C API','t-cl-read','cl-s3']],
     p:'The prompt is tokenized into 5 ids; <code>batch_set_tokens</code> puts them at positions 0 to 4 and asks for logits only for the last one.',
     n:'The token just sampled goes into a batch of one, at the next position (5 for the first generated token).'},
    {f:'llama-context.cpp',t:'Into the library',ex:'llama_process',chips:[['C API to C++ method','t-cl-read','cl-s8']],
     p:'<code>llama_process</code> is the C entry point; it calls the C++ method <code>llama_context::decode</code>, which splits the batch into micro-batches (one here) and reserves KV cells for its 5 tokens.',
     n:'Same entry point; one token, one KV cell.'},
    {f:'llama-context.cpp',t:'Build or reuse the graph',ex:'process_ubatch',chips:[P1('unique_ptr','ca-own')],
     p:'No graph exists for 5 tokens yet, so <code>can_reuse</code> is false: build the graph, then allocate it.',
     n:'The previous graph had the same shapes, so <code>can_reuse</code> is true: skip building and allocating. Measured: <code>graphs reused = '+v.graphs_reused+'</code> over the run.'},
    {f:'models/llama.cpp',only:'prompt',t:'The model builds its graph',ex:'graph_attn',chips:[P1('templates','ca-tmpl'),P1('inheritance','ca-class'),['structured bindings','t-cl-read','cl-s7']],
     p:'<code>graph&lt;false&gt;</code>\'s constructor loops over 30 layers and calls <code>build_norm</code>, <code>build_qkv</code>, <code>ggml_rope_ext</code>, <code>build_attn</code>, <code>build_ffn</code>. Result: '+v.nodes+' nodes, '+v.n_mulmat+' of them matrix products.'},
    {f:'ggml.c',only:'prompt',t:'Each call records a node',ex:'mul_mat_lazy',chips:[['plain C structs','t-cl-read','cl-s6']],
     p:'<code>ggml_mul_mat</code> computes nothing: it allocates a tensor header, sets <code>op</code> and <code>src</code>, and returns. The whole forward pass is now data.'},
    {f:'ggml-backend.cpp',only:'prompt',t:'The scheduler assigns backends',ex:'sched_assign',chips:[['function pointers','t-cl-read','cl-s8']],
     p:'Every node goes to the backend that holds its weights. All weights are in CPU buffers (mapped and repacked), so the graph is 1 split on the CPU backend.'},
    {f:'ggml-alloc.c',only:'prompt',t:'Memory is planned once',ex:'alloc_refcount',chips:[['reference counts','t-cl-read','cl-s8']],
     p:'Walking the nodes in order, a tensor\'s memory is released when its last reader has run. Every intermediate of the pass fits in '+fmt(v.compute_mib,2)+' MiB.'},
    {f:'llama-kv-cache.cpp',t:'Inputs and KV slots',ex:'kv_cpy_k',chips:[P1('classes','ca-class')],
     p:'<code>set_inputs</code> copies token ids, positions and KV cell indices into the graph\'s input tensors. In the graph, <code>cpy_k</code> is a <code>SET_ROWS</code> node that will write each token\'s K into its cell.',
     n:'Only the inputs change: one token id, position, and cell index. This is all the CPU does before computing.'},
    {f:'ggml-backend.cpp',t:'Compute: through a function pointer',ex:'backend_iface',chips:[['C vtable','t-cl-read','cl-s11']],
     p:'<code>graph_compute</code> calls the CPU backend\'s <code>graph_compute</code> through the <code>ggml_backend_i</code> table of function pointers.',
     n:'Same call, same graph object as last time.'},
    {f:'ggml-cpu.c',t:'4 threads walk every node',ex:'compute_thread',chips:[P2('threads and atomics','cb-s8')],
     p:'Each of the 4 threads runs this loop over all '+v.nodes+' nodes, skipping views, with a barrier after each of the '+v.real_ops+' real operations.',
     n:'The same loop: up to '+v.real_ops+' barriers for one token.'},
    {f:'repack.cpp',t:'Chunks, then gemm or gemv',ex:'gemm_or_gemv',chips:[P2('cache lines','cb-s2'),['chunks','t-cl-read','cl-s9']],
     p:'Each matrix product quantises its input rows to Q8_0, cuts the weight rows into 16 chunks taken from an atomic counter, and per chunk calls <code>gemm</code> for 4 token rows and <code>gemv</code> for the 5th. Measured for the prompt: '+fmt(v.gemm_prompt,0)+' <code>gemm</code> and '+fmt(v.gemv_prompt,0)+' <code>gemv</code> calls.',
     n:'One token row: only <code>gemv</code>. Measured: '+fmt(v.gemv_tok,0)+' calls per token = '+v.n_mulmat+' products &times; 16 chunks.'},
    {f:'arch/arm/repack.cpp',t:'The kernel: SDOT on 4 rows at once',ex:'gemv_kernel',chips:[P2('SIMD','cb-s6'),['Quant blocks','t-cl-quant','']],
     p:'For 4 token rows the twin <code>ggml_gemm_q8_0_4x4_q8_0</code> runs; for the 5th row this loop: 8 <code>vdotq_laneq_s32</code> per 32-weight block, each 16 int8 multiply-adds across 4 interleaved rows.',
     n:'This loop does every multiply of the token: 211 products, every weight of the model once.'},
    {f:'llama-kv-cache.cpp',t:'Attention reads the cache through a view',ex:'kv_get_k',chips:[['strides and views','t-cl-read','cl-s6']],
     p:'<code>FLASH_ATTN_EXT</code> reads K and V through a 4-dimensional view <code>{64, 3, cells}</code> of each layer\'s cache: no copy.',
     n:'The view now covers the previous positions too; the new K and V were just written by <code>SET_ROWS</code>.'},
    {f:'llama-context.cpp',t:'Logits leave the graph',ex:'logits_out',chips:[['batches','t-cl-read','cl-s11']],
     p:'Only the last token asked for logits, so the last layer kept one row (<code>GET_ROWS</code>), and 49,152 floats are copied out of the graph.',
     n:'49,152 floats copied out, the scores for the next token.'},
    {f:'llama-sampler.cpp',t:'Pick the token',ex:'greedy',chips:[['C vtable','t-cl-read','cl-s11']],
     p:'The greedy sampler scans 49,152 logits for the largest: the first generated token is " Paris".',
     n:'Same scan; the token is decided.'},
    {f:'simple.cpp',t:'Print it and go round again',ex:'simple_loop',chips:[P1('strings','ca-std')],
     p:'<code>llama_token_to_piece</code> turns the id into text, it is printed, and the loop builds the next batch. Prompt time measured: '+fmt(v.pp_ms,1)+' ms for 5 tokens.',
     n:'Printed; next batch. Measured: '+fmt(v.tg_ms_tok,2)+' ms per generated token on 4 threads (busy laptop).'}];
  let mode='prompt';
  const seq=()=>STEPS.map((s,i)=>i).filter(i=>!STEPS[i].only||STEPS[i].only===mode);
  // layout of file boxes
  function layout(W){const narrow=W<620,cols=narrow?2:4,gx=8,colW=(W-gx*(cols-1))/cols,bh=26,gap=5,head=18;const pos={};let maxY=0;
    GROUPS.forEach((g,gi)=>{const c=narrow?gi%2:gi,r=narrow?Math.floor(gi/2):0;const x=c*(colW+gx);
      const y0=r*(head+4*(bh+gap)+16);g.box={x,y:y0,w:colW,h:head+g[3].length*(bh+gap)+4};
      g[3].forEach((f,fi)=>{pos[f]={x:x+4,y:y0+head+fi*(bh+gap),w:colW-8,h:bh,g};maxY=Math.max(maxY,y0+head+(fi+1)*(bh+gap)+8)})});
    return {pos,H:maxY+6}}
  function draw(i){const svg=document.getElementById('tr-svg');if(!svg)return;const W=X.width(svg),L=layout(W),order=seq(),k=Math.min(i,order.length-1),cur=STEPS[order[k]];
    let b='';GROUPS.forEach(g=>{b+='<rect x="'+g.box.x+'" y="'+g.box.y+'" width="'+g.box.w+'" height="'+g.box.h+'" rx="6" fill="none" stroke="'+X.css(g[2])+'" stroke-width="1.2" opacity=".7"></rect><text x="'+(g.box.x+6)+'" y="'+(g.box.y+13)+'" font-size="11" fill="'+X.css(g[2])+'" font-weight="600">'+esc(g[1])+'</text>'});
    const visited=new Set(order.slice(0,k+1).map(j=>STEPS[j].f));
    Object.entries(L.pos).forEach(([f,p])=>{const on=f===cur.f,seen=visited.has(f);const unused=!STEPS.some((s,j)=>s.f===f&&order.includes(j));
      b+='<rect x="'+p.x+'" y="'+p.y+'" width="'+p.w+'" height="'+p.h+'" rx="4" fill="'+X.css(on?'--acc2':seen?'--soft':'--bg')+'" stroke="'+X.css(on?'--acc':'--line')+'" stroke-width="'+(on?2:1)+'" opacity="'+(unused?.45:1)+'"></rect>'+
        '<text x="'+(p.x+7)+'" y="'+(p.y+17)+'" font-size="11.5" fill="'+X.css(unused?'--mute':'--ink')+'" font-family="ui-monospace,Menlo,monospace"'+(on?' font-weight="700"':'')+'>'+esc(f)+'</text>'});
    // path so far
    const pts=order.slice(0,k+1).map(j=>{const p=L.pos[STEPS[j].f];return [p.x+p.w-14,p.y+p.h/2]});
    if(pts.length>1)b+='<polyline points="'+pts.map(q=>q.join(',')).join(' ')+'" fill="none" stroke="'+X.css('--bad')+'" stroke-width="1.6" stroke-dasharray="4 3" opacity=".75"></polyline>';
    const q=pts[pts.length-1];b+='<circle cx="'+q[0]+'" cy="'+q[1]+'" r="7" fill="'+X.css('--bad')+'"></circle><text x="'+q[0]+'" y="'+(q[1]+3.5)+'" font-size="9" text-anchor="middle" fill="'+X.css('--bg')+'">'+(mode==='prompt'?'5':'1')+'</text>';
    svg.setAttribute('viewBox','0 0 '+W+' '+L.H);svg.setAttribute('height',L.H);svg.innerHTML=b;
    document.getElementById('tr-cap').innerHTML='<b>Stop '+(k+1)+' of '+order.length+': '+esc(cur.t)+'</b> <span class="mute small">('+esc(cur.f)+')</span><br>'+(mode==='prompt'?cur.p:(cur.n||cur.p));
    document.querySelectorAll('#tr-list button').forEach(bt=>{const j=+bt.dataset.j;bt.classList.toggle('cur',j===order[k]);bt.classList.toggle('skip',!order.includes(j))});
    const e=(CL.src||{})[cur.ex];
    document.getElementById('tr-stop').innerHTML='<h3>'+esc(cur.t)+'</h3><div class="cl-chips">'+cur.chips.map(c=>'<a href="#" class="cl-x" data-xt="'+c[1]+'" data-xs="'+c[2]+'">'+esc(c[0])+'</a>').join('')+'</div>'+
      '<div class="cl-ex" data-ex="'+cur.ex+'"></div><div class="tr-meas">'+(mode==='prompt'?cur.p:(cur.n||cur.p))+'</div>';
    X.fill(document.getElementById('tr-stop'))}
  const list=document.getElementById('tr-list');
  list.innerHTML=STEPS.map((s,j)=>'<button data-j="'+j+'">'+(j+1)+'. '+esc(s.t)+'</button>').join('');
  const an=RD.anim({card:'tr-card',ctl:'tr-ctl',n:seq().length,ms:2200,draw,label:'Stop'});
  list.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const j=+b.dataset.j;const o=seq();const k=o.indexOf(j);if(k>=0)an.go(k)});
  RD.seg(document.getElementById('tr-mode'),m=>{mode=m;an.reset(seq().length)});
  X.onRender(TAB,()=>an.redraw());X.onResize(TAB,()=>an.redraw());
})();
