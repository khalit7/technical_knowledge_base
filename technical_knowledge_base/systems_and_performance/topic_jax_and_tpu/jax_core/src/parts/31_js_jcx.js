// ---- Jaxpr explorer tab (t-jcx): six recorded jaxprs, click an equation for its anatomy and data flow.
(function(){
const J=window.JC, U=window.JCU, esc=RD.esc, $=id=>document.getElementById(id), E=J.ex;
const DESC={dot_general:'Generalised matrix product: contracts the dimensions in dimension_numbers (contracting, batch). Every @ and einsum lands here.',
 add:'Elementwise addition.',add_any:'Addition of two tangents or cotangents (appears in derivative programs where a value is used twice).',mul:'Elementwise multiplication.',sub:'Elementwise subtraction.',div:'Elementwise division.',neg:'Negation.',
 broadcast_in_dim:'Broadcast to a larger shape; broadcast_dimensions says where the input axes go. Created by implicit broadcasting and by constants such as jnp.ones.',
 reshape:'Change the shape without moving data (in the logical view).',transpose:'Permute axes.',reduce_sum:'Sum over the listed axes.',reduce_max:'Maximum over the listed axes.',max:'Elementwise maximum.',
 erfc:'Complementary error function; exact GELU is 0.5 x erfc(-x / sqrt 2) x x.',exp:'Exponential.',tanh:'Hyperbolic tangent.',sin:'Sine.',sqrt:'Square root.',square:'x * x.',integer_pow:'x to a fixed integer power (y in params).',
 iota:'Integers 0, 1, 2, ... along a dimension (used to build masks such as tril).',ge:'Elementwise >=, a bool array.',gt:'Elementwise >.',lt:'Elementwise <.',select_n:'Elementwise choice between arrays by a predicate or index: what jnp.where and a batched cond become.',
 convert_element_type:'Cast to new_dtype (also drops a weak type).',stop_gradient:'Identity whose derivative is zero (detach).',copy:'A copy that keeps a value distinct for autodiff bookkeeping; XLA removes it.',
 jit:'A nested jax.jit call (printed as pjit in older versions): its own jaxpr runs inline here. Many jnp functions are jitted internally.',
 cond:'Run one of branches (index 0 is the false branch) chosen by an int; the branches are sub-jaxprs.',scan:'A loop with a carry: jaxpr is the body, length the trip count, ft_in/ft_out describe which inputs are carried, constant or scanned.',
 while:'A loop with a run-time trip count: cond_jaxpr decides, body_jaxpr updates the carry. Not reverse-differentiable.',custom_jvp_call:'A function with a custom JVP rule: call_jaxpr is the primal program, jvp the rule.',
 custom_vjp_call:'A function with custom forward and backward functions.',debug_print:'jax.debug.print: no outputs, an effect, so it survives dead-code elimination and runs every call.',
 remat2:'jax.checkpoint: its jaxpr is recomputed in the backward pass instead of storing its intermediates; policy says what may be saved.',slice:'Static slice.',squeeze:'Remove axes of size 1.'};
let cur=E.order[0], sel=null;
function short(e){const ps=Object.keys(e.params).filter(k=>typeof e.params[k]==='string'&&['axes','dimension_numbers','new_dtype','y','permutation','length','name','broadcast_dimensions','new_sizes','fmt'].includes(k)).map(k=>k+'='+e.params[k].replace(/np\.int64\((-?\d+)\)/g,'$1'));
  const subs=Object.keys(e.params).filter(k=>typeof e.params[k]!=='string');
  return e.out.map(o=>o.v+':'+o.aval).join(' ')+(e.out.length?' = ':'')+e.prim+(ps.length||subs.length?'['+ps.concat(subs.map(k=>k+'={...}')).join(' ')+']':'')+' '+e.in.map(i=>i.v||i.lit).join(' ')}
function subRows(j,depth){let h='';j.eqns.forEach(e=>{h+='<div class="dim" style="padding-left:'+(8+14*depth)+'px">'+esc(short(e))+'</div>';
  Object.keys(e.params).forEach(k=>{const p=e.params[k];if(p&&p.jaxpr)h+='<div class="dim" style="padding-left:'+(8+14*(depth+1))+'px">'+esc(k)+':</div>'+subRows(p.jaxpr,depth+2);
    if(p&&p.jaxprs)p.jaxprs.forEach((s,bi)=>{h+='<div class="dim" style="padding-left:'+(8+14*(depth+1))+'px">'+esc(k)+'['+bi+']:</div>'+subRows(s,depth+2)})})});return h}
function draw(){const X=E.items[cur];
  $('jcx-note').innerHTML=esc(X.note);$('jcx-code').textContent=X.code;$('jcx-text').textContent=X.text;
  $('jcx-stats').innerHTML=RD.stat('top-level equations',X.n_eqns_top,'')+RD.stat('with sub-jaxprs',X.n_eqns_total,'')+RD.stat('invars',X.invars.length,X.invars.map(v=>v.aval).join(' ').slice(0,60))+RD.stat('constvars',X.constvars.length,'closed-over arrays');
  const prims=Object.entries(X.prims).sort((a,b)=>b[1]-a[1]);U.bars($('jcx-prims'),prims.map(([k,v])=>({nm:k,v:v,txt:String(v),c:'var(--c4)'})));
  // producers and consumers among top-level equations
  const prod={};X.eqns.forEach((e,i)=>e.out.forEach(o=>{prod[o.v]=i}));
  let rel={};if(sel!==null){const e=X.eqns[sel];e.in.forEach(v=>{if(v.v&&prod[v.v]!==undefined)rel[prod[v.v]]='prod'});
    const outs=new Set(e.out.map(o=>o.v));X.eqns.forEach((f,j)=>{if(f.in.some(v=>outs.has(v.v)))rel[j]='cons'})}
  let h='<div class="dim">{ lambda '+esc(X.constvars.map(v=>v.v+':'+v.aval).join(' '))+'; '+esc(X.invars.map(v=>v.v+':'+v.aval).join(' '))+'. let</div>';
  X.eqns.forEach((e,i)=>{h+='<div class="click'+(i===sel?' on':'')+(rel[i]?' '+rel[i]:'')+'" data-i="'+i+'"><span class="ln">'+i+'</span>'+esc(short(e))+'</div>'});
  h+='<div class="dim">in ('+esc(X.outvars.map(v=>v.v||v.lit).join(', '))+') }</div>';
  $('jcx-lines').innerHTML=h;
  $('jcx-lines').querySelectorAll('div.click').forEach(d=>d.addEventListener('click',()=>{sel=+d.dataset.i;draw()}));
  detail(X,prod)}
function detail(X,prod){const el=$('jcx-detail');if(sel===null){el.innerHTML='<b>Click an equation.</b><p class="jc-tip">Start with a <code>dot_general</code> (a matmul) or, in the control-flow programs, with <code>cond</code>, <code>scan</code> or <code>while</code> to see their sub-jaxprs. Green rows produce this equation\'s inputs; orange rows consume its outputs.</p>';return}
  const e=X.eqns[sel];const io=(a,isIn)=>a.map(v=>'<code>'+esc(v.v||v.lit)+'</code> <span class="mute">'+esc(v.aval)+'</span>'+(isIn?(v.lit?' (literal)':(prod[v.v]!==undefined?' from eqn '+prod[v.v]:(X.constvars.some(c=>c.v===v.v)?' (constvar)':' (invar)'))):'')).join('<br>');
  let ps='';Object.keys(e.params).forEach(k=>{const p=e.params[k];
    if(typeof p==='string')ps+='<dt>'+esc(k)+'</dt><dd><code>'+esc(p.replace(/np\.int64\((-?\d+)\)/g,'$1'))+'</code></dd>';
    else if(p.jaxpr)ps+='<dt>'+esc(k)+'</dt><dd><div class="jc-sub jc-lines" style="max-height:220px">'+subRows(p.jaxpr,0)+'</div></dd>';
    else if(p.jaxprs)ps+='<dt>'+esc(k)+'</dt><dd>'+p.jaxprs.map((s,i)=>'<div class="mute small">branch '+i+'</div><div class="jc-sub jc-lines">'+subRows(s,0)+'</div>').join('')+'</dd>'});
  let src='';if(e.src){src='<code>'+esc(e.src.file)+':'+e.src.line+'</code> in <code>'+esc(e.src.fn)+'</code>';const t=e.src.file==='model_jax.py'&&E.lines[String(e.src.line)];if(t)src+='<pre class="jc-code" style="margin:4px 0">'+esc(t.trim())+'</pre>'}
  el.innerHTML='<div style="font-size:15px;font-weight:600">eqn '+sel+': <code>'+esc(e.prim)+'</code></div><p class="jc-tip">'+esc(DESC[e.prim]||'A JAX primitive.')+'</p><dl><dt>inputs</dt><dd>'+(io(e.in,true)||'none')+'</dd><dt>outputs</dt><dd>'+(io(e.out,false)||'none (an effect only)')+'</dd>'+ps+(e.effects.length?'<dt>effects</dt><dd><code>'+esc(e.effects.join(', '))+'</code></dd>':'')+'<dt>from</dt><dd>'+(src||'<span class="mute">no user frame (created inside JAX)</span>')+'</dd></dl>'}
$('jcx-pick').innerHTML='<span class="seg" id="jcx-seg">'+E.order.map((k,i)=>'<button data-m="'+k+'"'+(i===0?' class="on"':'')+'>'+esc({mlp:'MLP',ln:'LayerNorm',attn:'Attention',grad_mlp:'grad of MLP',cf:'Control flow',misc:'jit, custom_jvp, effects'}[k]||k)+'</button>').join('')+'</span>';
RD.seg($('jcx-seg'),m=>{cur=m;sel=null;draw()});
draw();
})();
