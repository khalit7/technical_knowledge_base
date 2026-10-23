// ---- Reading section 6 (moved from the Autodiff tape tab, 2026-10-23): block 0's MLP through reverse mode (forward pass filling the tape, then the
// linear program before and after transposition, stage by stage) and forward mode, from the recorded jaxprs.
(function(){
const J=window.JC, U=window.JCU, esc=RD.esc, $=id=>document.getElementById(id), T=J.tape, A=J.ad.mlp;
const ST=[{n:'x @ W1',d:'matmul: [4,128] x [128,512]'},{n:'+ b1',d:'bias'},{n:'GELU',d:'exact: 0.5 h erfc(-h/sqrt 2)'},{n:'@ W2',d:'matmul: [4,512] x [512,128]'},{n:'+ b2',d:'bias, gives y [4,128]'}];
const GR=[['W1 grad [128,512]'],['b1 grad [512]'],[],['W2 grad [512,128]'],['b2 grad [128]']];
// where each saved value comes from (stage), read from the recorded descriptions
function jaxStage(r){const s=r.src;if(/constant/.test(s))return 0;if(/literal/.test(s))return 2;if(/argument/.test(s))return 3;if(/copy/.test(s))return 3;return 2}
function jaxLabel(r){const s=r.src;if(/constant/.test(s))return 'x '+r.aval;if(/literal/.test(s))return '0.5 '+r.aval;if(/argument/.test(s))return 'W2 '+r.aval;const m=s.match(/output of (\w+)/);return (m?m[1]:'value')+' '+r.aval}
const RES={jax:A.residuals.map(r=>({st:jaxStage(r),lbl:jaxLabel(r),b:r.bytes})),
  torch:A.torch_saved.map(r=>({st:r.from==='input'?0:r.from==='parameter'?3:r.from==='AddBackward0'?2:3,lbl:(r.from==='input'?'x':r.from==='parameter'?'W2':r.from==='AddBackward0'?'GELU input':'GELU output')+' ['+r.shape.join(',')+']',b:r.bytes}))};
// stage of consumption in the backward pass (JAX: the linear program's constvars by stage; PyTorch: the backward node that unpacks)
const useStage={jax:r=>r.st,torch:r=>r.st};
let mode='rev',who='jax';
function steps(){if(mode==='rev'){const s=[{k:'intro'}];for(let i=0;i<5;i++)s.push({k:'fwd',s:i});for(let i=4;i>=0;i--)s.push({k:'bwd',s:i});s.push({k:'done'});return s}
  const s=[{k:'intro'}];for(let i=0;i<5;i++)s.push({k:'jvp',s:i});s.push({k:'done'});return s}
let S=steps();
const lines=(arr,cls)=>arr.length?arr.map(e=>'<div class="'+(cls(e)||'')+'">'+esc(e.t)+'</div>').join(''):'<div class="dim">(none in this stage)</div>';
function draw(i){const st=S[i]||S[0];const el=$('jcad-svg');
  // stage row and tape row
  let doneF=-1,doneB=5,cur=-1;if(st.k==='fwd'||st.k==='jvp'){doneF=st.s-1;cur=st.s}else if(st.k==='bwd'){doneF=4;doneB=st.s+1;cur=st.s}else if(st.k==='done'){doneF=4;doneB=mode==='rev'?0:5}
  let h='<div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px;margin:6px 0">';
  ST.forEach((x,j)=>{const state=j===cur?'cur':((mode==='rev'&&j>=doneB)||(j<=doneF&&!(mode==='rev'&&st.k==='bwd'&&j<cur)))?'done':'';
    h+='<div class="jc-nest '+state+'" style="margin:0;text-align:center"><div class="nm">'+esc(x.n)+'</div><div class="small mute" style="font-size:11px;line-height:1.25">'+esc(x.d)+'</div></div>'});
  h+='</div><div class="small" style="text-align:center;color:var(--mute);margin:-2px 0 4px">'+(st.k==='bwd'?'&larr; cotangent flows from y back to the weights':(st.k==='jvp'?'value and tangent flow together &rarr;':(st.k==='fwd'?'forward pass &rarr; (computing y and saving residuals)':'&nbsp;')))+'</div>';
  if(mode==='rev'){h+='<div class="small" style="font-weight:600;margin-top:6px">The tape ('+(who==='jax'?'JAX residuals':'PyTorch saved tensors')+')</div><div style="display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:6px">';
    for(let j=0;j<5;j++){const shown=RES[who].filter(r=>r.st===j&&j<=doneF);const used=st.k==='done'||(st.k==='bwd'&&j>=st.s);
      h+='<div class="jc-chips" style="flex-direction:column;align-items:stretch">'+shown.map(r=>'<span class="jc-chip res'+(used?' used':'')+'" title="'+r.b.toLocaleString('en-US')+' bytes">'+esc(r.lbl)+'</span>').join('')+
        ((st.k==='bwd'&&j>=st.s)||st.k==='done'?GR[j].map(g=>'<span class="jc-chip grad">'+esc(g)+'</span>').join(''):'')+'</div>'}
    h+='</div>'}
  el.innerHTML=h;
  // panes and caption
  const P=$('jcad-panes');let cap='',L='',R='',lh='',rh='';
  if(st.k==='intro'){cap=mode==='rev'?'<b>Reverse mode.</b> <code>jax.vjp</code> (and so <code>jax.grad</code>) first runs the forward pass under the linearize interpreter: it computes y and keeps, for each stage, the values the derivative will need. Press play or step.':'<b>Forward mode.</b> <code>jax.jvp(f, (p,), (p_dot,))</code> pushes a tangent (here: ones for every weight) through the same five stages, computed alongside the values. Nothing is kept for later.';
    lh='The program';rh='What happens';L=lines((mode==='rev'?T.vjp:T.jvp).eqns.slice(0,0),()=>'');R='<div class="dim">'+(mode==='rev'?'VJP program: '+T.vjp.eqns.length+' equations ('+T.vjp.eqns.filter(e=>!e.d).length+' forward, '+T.vjp.eqns.filter(e=>e.d).length+' backward)':'JVP program: '+T.jvp.eqns.length+' equations ('+T.jvp.eqns.filter(e=>!e.d).length+' primal, '+T.jvp.eqns.filter(e=>e.d).length+' tangent)')+'</div>'}
  else if(st.k==='fwd'){const eq=T.vjp.eqns.filter((e,k)=>T.vjp.stage[k]===st.s&&!e.d);const saved=RES[who].filter(r=>r.st===st.s);
    cap='<b>Forward, stage '+(st.s+1)+' ('+esc(ST[st.s].n)+').</b> The primal equations run as usual. '+(saved.length?(who==='jax'?'JAX keeps ':'PyTorch saves ')+saved.map(r=>esc(r.lbl)).join(', ')+' for the backward pass.':'Nothing new is kept at this stage.')+(st.s===2&&who==='jax'?' JAX keeps more here than PyTorch: its exact GELU is several primitives (erfc, exp, multiplies), and the linear program needs their outputs; PyTorch\'s fused GeluBackward0 recomputes from the input.':'');
    lh='Forward equations of this stage (VJP program)';rh='Saved for later';L=lines(eq,()=> '');R=saved.length?saved.map(r=>'<div class="on">'+esc(r.lbl)+'  '+r.b.toLocaleString('en-US')+' B</div>').join(''):'<div class="dim">(nothing)</div>'}
  else if(st.k==='bwd'){const before=T.linear.eqns.filter((e,k)=>T.linear.stage[k]===st.s),after=T.transpose.eqns.filter((e,k)=>T.transpose.stage[k]===st.s);
    const why=['the tangent of x @ W1 is x @ W1_dot (x is a residual); transposed, the gradient of W1 is x<sup>T</sup> times the cotangent: a dot_general contracting the token axis, then a transpose.','the bias tangent was broadcast to all 4 tokens; the transpose of a broadcast is a sum: reduce_sum over tokens gives b1\'s gradient.','GELU is elementwise, so its linearization is a multiply by GELU\'(h), built from the saved erfc, exp and scaled values; the transpose of multiplying by a fixed array is multiplying by the same array. Linear, so it transposes term by term (the add_any splits back into two paths).','two terms: W2_dot applied to the saved GELU output (transposes to W2\'s gradient: GELU-output<sup>T</sup> times the cotangent) and the incoming tangent times W2 (transposes to the cotangent times W2<sup>T</sup>, passed on to stage 3).','the bias tangent broadcast to 4 tokens; transposed: reduce_sum over tokens gives b2\'s gradient, and the cotangent of y passes on unchanged.'][st.s];
    cap='<b>Backward, stage '+(st.s+1)+' ('+esc(ST[st.s].n)+').</b> Left, the stage\'s part of the <b>linear program</b> (tangents in, tangents out) as <code>jax.linearize</code> recorded it; right, the same part <b>after transposition</b> (cotangents in, cotangents out), as <code>jax.linear_transpose</code> produced it. Here '+why;
    lh='Before: linear (tangent) program';rh='After: transposed (cotangent) program';L=lines(before,()=>'t');R=lines(after,()=>'on')}
  else if(st.k==='jvp'){const eq=T.jvp.eqns.filter((e,k)=>T.jvp.stage[k]===st.s);
    cap='<b>Stage '+(st.s+1)+' ('+esc(ST[st.s].n)+').</b> Each primitive\'s JVP rule emits the primal equation and the tangent equations together; the tangent of a matmul by weights that also move has two terms (x @ W_dot and x_dot @ W), joined by add_any.';
    lh='Primal equations';rh='Tangent equations (depend on the input tangents)';L=lines(eq.filter(e=>!e.d),()=>'');R=lines(eq.filter(e=>e.d),()=>'t')}
  else {cap=mode==='rev'?'<b>Done.</b> Four weight gradients from one backward pass, the transposed program equal to <code>jax.vjp</code>\'s. Reverse mode cost '+(A.flops['vjp (forward + backward)']/A.flops.forward).toFixed(2)+'x the forward FLOPs here and kept the tape alive until each piece was used. A full Jacobian of y (512 outputs) would need 512 such backward passes, one per output.':'<b>Done.</b> y and y_dot in one pass, '+(A.flops.jvp/A.flops.forward).toFixed(2)+'x the forward FLOPs, with no tape. But y_dot is one directional derivative: the gradient with respect to all 131,712 weights of this MLP would take one JVP per weight. That is why training uses reverse mode.';
    lh='Program outputs';rh='';L='<div>'+esc((mode==='rev'?T.vjp:T.jvp).outvars.join(', '))+'</div>';R='<div class="dim">'+(mode==='rev'?'gradients of b1, W1, b2, W2 (pytree order)':'y, y_dot')+'</div>'}
  P.innerHTML='<div class="jc-pane"><div class="h">'+lh+'</div><div class="jc-lines">'+L+'</div></div><div class="jc-pane"><div class="h">'+rh+'</div><div class="jc-lines">'+R+'</div></div>';
  $('jcad-cap').innerHTML=cap;
  // counters
  const onTape=mode!=='rev'?0:RES[who].filter(r=>r.st<=doneF&&!(st.k==='done'||(st.k==='bwd'&&r.st>=st.s))).reduce((a,r)=>a+r.b,0);
  let eqDone=0;if(mode==='rev'){if(st.k==='fwd'||st.k==='bwd'||st.k==='done')eqDone=T.vjp.eqns.filter((e,k)=>!e.d&&T.vjp.stage[k]<=Math.min(4,st.k==='fwd'?st.s:4)).length;
    if(st.k==='bwd'||st.k==='done')eqDone+=T.transpose.eqns.filter((e,k)=>T.transpose.stage[k]>=(st.k==='done'?0:st.s)).length}
  else eqDone=T.jvp.eqns.filter((e,k)=>T.jvp.stage[k]<=(st.k==='done'?4:(st.k==='jvp'?st.s:-1))).length;
  const grads=mode==='rev'?(st.k==='done'?4:(st.k==='bwd'?GR.filter((g,j)=>j>=st.s&&g.length).length:0)):0;
  $('jcad-cnt').innerHTML=RD.stat('equations run',eqDone,'of '+(mode==='rev'?T.vjp.eqns.length:T.jvp.eqns.length)+' in the program')+
    RD.stat('on the tape now',mode==='rev'?(onTape/1e3).toFixed(1)+' KB':'0 KB',mode==='rev'?(who==='jax'?'JAX residuals':'PyTorch saved tensors')+' not yet used':'forward mode keeps nothing')+
    RD.stat('weight gradients',mode==='rev'?grads+' of 4':'n/a',mode==='rev'?'':'a JVP gives one direction')+
    RD.stat('program FLOPs',((mode==='rev'?A.flops['vjp (forward + backward)']:A.flops.jvp)/1e6).toFixed(2)+' M','XLA cost analysis')}
const an=U.anim({card:'jcad-card',ctl:'jcad-ctl',n:S.length,draw,ms:2600,label:'Autodiff step'});
RD.seg($('jcad-mode'),m=>{mode=m;S=steps();an.reset(S.length)});
RD.seg($('jcad-who'),m=>{who=m;an.redraw()});
})();
