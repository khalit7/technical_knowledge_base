// ---- Transforms lab, sections 1 and 2: tracing animation, tracer types, loops, unrolled vs scan ----
(function(){
  const {D,esc,$,onRender,width,n0,stat,seg,anim}=XF,T=D.trace;
  const PR={
    dot_general:'a matrix multiply. dot_general is one primitive for every contraction (matmul, batched matmul, einsum); its parameters name which dimensions are contracted and which are batch dimensions.',
    broadcast_in_dim:'stretches an array to a larger shape (here the bias f32[128] to f32[1,1,128]) so it can be added at every position. In the compiled program this is usually free: no copy is made.',
    add:'elementwise add.',sub:'elementwise subtract.',mul:'elementwise multiply.',div:'elementwise divide.',neg:'negate.',exp:'elementwise exponential.',max:'elementwise maximum.',
    erfc:'the complementary error function: exact GELU is x/2 * erfc(-x/sqrt 2), set with approximate=False to match PyTorch.',
    copy:'a copy JAX inserts inside jax.nn.gelu; XLA removes it when compiling.',
    reshape:'only changes how the same numbers are indexed (128 channels become 4 heads of 32). No arithmetic.',
    transpose:'reorders dimensions (heads before positions, or keys transposed for q @ k^T). No arithmetic; the compiler often folds it into the next matmul.',
    reduce_max:'the maximum along the last axis (per query row).',reduce_sum:'a sum along the last axis.',
    stop_gradient:'jax.nn.softmax subtracts the row maximum for numerical safety and wraps it in stop_gradient, so the backward pass does not differentiate the max (it cancels out anyway).',
    jit:'a nested jitted function: jnp.tril and jnp.where are themselves jitted, so the trace holds a call with its own small jaxpr inside (shown collapsed here).'
  };
  const st={fn:'attention'};
  const pyEl=$('xf-tr-py'),jxEl=$('xf-tr-jx'),cnt=$('xf-tr-cnt'),cap=$('xf-tr-cap');
  const outShape=t=>{const m=/^\s*\S+?:(\S+)\s=/.exec(t.split('\n')[0]);return m?m[1]:''};
  const collapse=t=>{const ls=t.split('\n');return ls.length>4&&/ = (jit|pjit)\[/.test(ls[0])?ls[0]+' ... ]  (nested jaxpr, '+(ls.length-1)+' lines)':t};
  function build(){
    const F=T[st.fn];
    pyEl.innerHTML=F.src.map((l,i)=>'<div data-i="'+i+'"><span class="ln">'+(F.src_start+i)+'</span>'+esc(l)+'</div>').join('');
    jxEl.innerHTML='<div class="done">'+esc(F.head)+'</div>'+F.eqns.map((e,k)=>'<div data-k="'+k+'">'+esc(collapse(e))+'</div>').join('')+'<div data-k="foot">'+esc(F.foot)+'</div>';
  }
  function draw(i){
    const F=T[st.fn],N=F.eqns.length,k=i-1;
    pyEl.querySelectorAll('div').forEach(d=>{const li=+d.dataset.i;d.className=(k>=0&&k<N&&F.line[k]===li)?'cur':''});
    let cur=null;
    jxEl.querySelectorAll('div[data-k]').forEach(d=>{const kk=d.dataset.k;
      if(kk==='foot'){d.className=i===N+1?'cur':'todo';if(i===N+1)cur=d;return}
      const q=+kk;d.className=q<k?'done':q===k?'cur':'todo';if(q===k)cur=d});
    if(cur){const p=jxEl;const top=cur.offsetTop-p.clientHeight/2+cur.offsetHeight/2;p.scrollTop=Math.max(0,top)}
    else if(i===0)jxEl.scrollTop=0;
    const pr=F.prims.slice(0,Math.max(0,Math.min(N,k+1)));
    const c=n=>pr.filter(p=>n.includes(p)).length;
    cnt.innerHTML=stat('equations recorded',pr.length+' / '+N)+stat('matrix multiplies',c(['dot_general']))+stat('shape-only ops',c(['reshape','transpose','broadcast_in_dim']),'reshape, transpose, broadcast')+stat('Python lines',F.src.length,'run once, then gone');
    if(i===0){cap.innerHTML='<b>Before tracing.</b> The Python function as written. <code>jax.make_jaxpr</code> will call it once with a tracer of abstract value <code>f32[32,128,128]</code> in place of the activations and record each array operation. Press play or step.';return}
    if(i===N+1){cap.innerHTML='<b>After tracing.</b> '+N+' equations, no Python left: the variables, the helper functions, the generator expression and the shape arithmetic all ran once and disappeared. This typed program is what jit compiles, grad differentiates and vmap batches. The <code>in (...)</code> line names the output.';return}
    const e=F.eqns[k],p=F.prims[k],li=F.line[k],inner=F.inner[k];
    let where=li!=null?'Python line '+(F.src_start+li):'';
    if(inner)where+=', inside <code>'+esc(inner)+'</code>';else if(st.fn==='mlp')where+=', inside <code>jax.nn.gelu(approximate=False)</code>';
    let extra='';
    if(p==='div'&&/5\.65685/.test(e))extra=' The Python expression <code>math.sqrt(dh)</code> was evaluated while tracing and is now the literal 5.656854152679443.';
    cap.innerHTML='<b>Equation '+(k+1)+' of '+N+': <code>'+esc(p)+'</code></b> &rarr; <code>'+esc(outShape(e))+'</code>. From '+where+'. '+(PR[p]?PR[p][0].toUpperCase()+PR[p].slice(1):'')+extra;
  }
  build();
  const A=anim({card:'xf-tr-card',ctl:'xf-tr-ctl',n:T.attention.eqns.length+2,draw,ms:1100,label:'Tracing step'});
  seg($('xf-tr-fn'),v=>{st.fn=v;build();A.reset(T[v].eqns.length+2)});
  // tracer types
  const order=['no transformation','jit','make_jaxpr','grad','vmap','jit(vmap(grad))'];
  $('xf-tracers').innerHTML='<tr><th>called under</th><th>Python type of the argument</th><th>printed</th></tr>'+order.filter(k=>T.tracers[k]).map(k=>{const s=T.tracers[k],j=s.indexOf(': ');
    return '<tr><td><code>'+esc(k)+'</code></td><td><code>'+esc(s.slice(0,j))+'</code></td><td class="mono">'+esc(s.slice(j+2))+'</td></tr>'}).join('');
  // loops table
  const L=T.loops;
  $('xf-loops').innerHTML='<tr><th>written as</th><th class="num">equations</th><th class="num">inside</th><th class="num">value</th><th>jax.grad</th></tr>'+Object.keys(L).map(k=>{const r=L[k];
    return '<tr><td><code>'+esc(k)+'</code></td><td class="num">'+r.top+'</td><td class="num">'+r.total+'</td><td class="num">'+(+r.value).toFixed(4)+'</td><td>'+(typeof r.grad==='number'?(+r.grad).toFixed(6):'<span class="xf-lbl c">error</span> '+esc(r.grad.split('. ')[0])+'.')+'</td></tr>'}).join('');
  // unrolled vs scan chart
  function scanChart(){
    const el=$('xf-scan-chart');const R=T.loop_vs_scan;const W=Math.min(width(el),720),H=230,ml=46,mr=14,mt=12,mb=34;
    const xs=R.map(r=>r.layers),xl=v=>ml+(Math.log2(v)-Math.log2(xs[0]))/(Math.log2(xs[xs.length-1])-Math.log2(xs[0]))*(W-ml-mr);
    const ymax=Math.max(...R.map(r=>r.unrolled_top))*1.08,yl=v=>H-mb-(v/ymax)*(H-mt-mb);
    let s='';for(let v=0;v<=ymax;v+=500){s+='<line x1="'+ml+'" x2="'+(W-mr)+'" y1="'+yl(v)+'" y2="'+yl(v)+'" stroke="var(--line)"/><text x="'+(ml-6)+'" y="'+(yl(v)+4)+'" text-anchor="end" font-size="11" fill="var(--mute)">'+n0(v)+'</text>'}
    xs.forEach(v=>{s+='<text x="'+xl(v)+'" y="'+(H-mb+16)+'" text-anchor="middle" font-size="11" fill="var(--mute)">'+v+'</text>'});
    s+='<text x="'+((ml+W-mr)/2)+'" y="'+(H-4)+'" text-anchor="middle" font-size="11" fill="var(--mute)">layers (log scale)</text>';
    const line=(k,c)=>'<polyline fill="none" stroke="'+c+'" stroke-width="2.2" points="'+R.map(r=>xl(r.layers)+','+yl(r[k])).join(' ')+'"/>'+R.map(r=>'<circle cx="'+xl(r.layers)+'" cy="'+yl(r[k])+'" r="3.2" fill="'+c+'"><title>'+r.layers+' layers: '+r[k]+' equations</title></circle>').join('');
    s+=line('unrolled_top','var(--c2)')+line('scan_total','var(--c1)');
    const last=R[R.length-1];
    s+='<text x="'+(xl(last.layers)-6)+'" y="'+(yl(last.unrolled_top)+14)+'" text-anchor="end" font-size="11" fill="var(--c2)">'+n0(last.unrolled_top)+'</text><text x="'+(xl(last.layers)-6)+'" y="'+(yl(last.scan_total)-7)+'" text-anchor="end" font-size="11" fill="var(--c1)">'+last.scan_total+'</text>';
    el.innerHTML='<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" role="img" aria-label="Jaxpr equations against number of layers">'+s+'</svg>';
    const r4=R.find(r=>r.layers===4),r1=R.find(r=>r.layers===1),r2=R.find(r=>r.layers===2);
    $('xf-scan-note').innerHTML='Real counts from <code>jax.make_jaxpr</code> of the forward pass at each depth (same width, batch and context). The Python loop adds '+(r2.unrolled_top-r1.unrolled_top)+' equations per layer ('+r4.unrolled_top+' at the running example\'s 4 layers, '+n0(last.unrolled_top)+' at 32); the scan version is '+r4.scan_top+' top-level equations with a '+(r4.scan_total-r4.scan_top)+'-equation body, at every depth. Tracing time grew from '+(1e3*r1.trace_s_unrolled).toFixed(0)+' ms to '+(1e3*last.trace_s_unrolled).toFixed(0)+' ms unrolled and stayed near '+(1e3*r4.trace_s_scan).toFixed(0)+' ms with scan (measured on Apple M1 Pro (CPU), shared machine, low priority; one run each, rough).';
  }
  onRender(scanChart);scanChart();
})();
