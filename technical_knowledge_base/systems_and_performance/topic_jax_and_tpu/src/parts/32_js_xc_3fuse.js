// ---- Compiler lab, section 2: the MLP block's 29 jaxpr equations moving into XLA's 4 kernels (before/after animation) ----
(function(){
  const X=window.XC,D=X.D,$=X.$;const box=$('xc-fz');if(!box)return;
  const M=D.demo,E=M.eqns,K=M.kernels,NK=K.length;
  const cls=p=>p==='dot_general'?'mm':(p==='reduce_sum'?'red':(p==='broadcast_in_dim'||p==='copy'?'mov':'ew'));
  const colr={mm:'var(--c2)',red:'var(--c4)',mov:'var(--mute)',ew:'var(--c1)'};
  const kname=k=>({'library (YNNPACK) fusion':'library fusion','multi-op loop fusion':'loop fusion','single op':'single op'}[k.cat]||k.cat);
  const ktitle=[
    'Kernel 1: LayerNorm + first matmul + bias ('+K[0].n+' ops, '+kname(K[0])+')',
    'Kernel 2: exact GELU, erfc expanded ('+K[1].n+' ops, '+kname(K[1])+')',
    'Kernel 3: second matmul ('+kname(K[2])+')',
    'Kernel 4: bias + residual add ('+K[3].n+' ops, '+kname(K[3])+')'];
  // captions per step
  const removed=E.filter(e=>e.k==null).length;
  const cse=E.find(e=>e.how&&/common-subexpression/.test(e.how));
  const caps=[
    '<b>Before.</b> Eager execution: each of the '+E.length+' equations is its own kernel, reading its inputs from memory and writing its output back. Colours: elementwise, reductions, matmuls, data movement (broadcasts and copies).',
    '<b>Kernel 1.</b> LayerNorm (two means, a subtraction, a square root, a division, scale and shift), the first matmul and its bias become <b>one kernel</b>. Broadcasts vanish into their consumers. '+(cse?'One equation, the second <code>x - mu</code>, is the same computation as an earlier one: XLA computes it once (common-subexpression elimination).':''),
    '<b>Kernel 2.</b> The exact GELU, <code>0.5 x (1 + erf(x / sqrt 2))</code>: its <code>erfc</code> is a polynomial of about 90 elementwise operations, all fused into one loop over the 32 x 128 x 512 hidden activations. Eagerly, each would be a pass over 8.4 MB.',
    '<b>Kernel 3.</b> The second matmul stands alone (a library call on this CPU).',
    '<b>Kernel 4.</b> The second bias and the residual add share one pass over the output.',
    '<b>After.</b> '+E.length+' equations became '+NK+' kernels. '+(removed?removed+' equation (a <code>copy</code> left by GELU\'s lowering) disappeared entirely. ':'')+'Bytes moved fell from '+X.mb(M.eagerBytes)+' to '+X.mb(M.xlaBytes)+' ('+(M.eagerBytes/M.xlaBytes).toFixed(1)+'x less), with the same '+X.gf(M.flops)+' of arithmetic.'];
  const N=NK+2;
  let chips=[],kbs=[];
  function build(){
    box.innerHTML='';chips=E.map((e,i)=>{const d=document.createElement('div');d.className='xc-chip';d.style.background=colr[cls(e.p)];
      d.textContent=e.p.replace('broadcast_in_dim','bcast').replace('dot_general','dot').replace('integer_pow','pow').replace('reduce_sum','rsum');
      d.title='#'+i+'  '+e.t+'\n'+e.s+'  ('+e.src+')'+(e.how?'\n'+e.how:'')+(e.k!=null?'\n-> kernel '+(e.k+1):'');box.appendChild(d);return d});
    kbs=K.map((k,j)=>{const d=document.createElement('div');d.className='xc-kbox';d.innerHTML='<div class="h">'+X.esc(ktitle[j])+'</div>';box.appendChild(d);return d});
  }
  function draw(s){
    if(!chips.length)build();
    const W=X.width(box),cols=W<430?4:(W<700?6:8),gap=5,cw=Math.floor((W-gap*(cols-1))/cols),ch=22;
    const gathered=k=>k!=null&&k<Math.min(s,NK);
    // zone A: equations not yet gathered (kept at their original grid slot)
    const restIdx=E.map((e,i)=>i).filter(i=>!gathered(E[i].k));
    const rowsA=s===0?Math.ceil(E.length/cols):(restIdx.length?Math.ceil(E.length/cols):0);
    let y=0;
    E.forEach((e,i)=>{if(!gathered(e.k)){const c=chips[i];c.style.width=cw+'px';c.style.left=((i%cols)*(cw+gap))+'px';c.style.top=(Math.floor(i/cols)*(ch+gap))+'px';
      c.classList.toggle('gone',s===N-1&&e.k==null)}});
    y=rowsA*(ch+gap)+(rowsA?10:0);
    // zone B: kernel boxes for gathered kernels
    const bw=W,inner=Math.max(2,cols-1),icw=Math.floor((bw-16-gap*(inner-1))/inner);
    K.forEach((k,j)=>{const kb=kbs[j];const on=j<Math.min(s,NK);kb.classList.toggle('on',on);
      const mem=E.map((e,i)=>i).filter(i=>E[i].k===j),rows=Math.max(1,Math.ceil(mem.length/inner));
      const h=22+rows*(ch+gap)+4;kb.style.left='0px';kb.style.width=bw+'px';kb.style.top=y+'px';kb.style.height=h+'px';
      if(on){mem.forEach((i,q)=>{const c=chips[i];c.style.width=icw+'px';c.style.left=(8+(q%inner)*(icw+gap))+'px';c.style.top=(y+22+Math.floor(q/inner)*(ch+gap))+'px';c.classList.remove('gone')});y+=h+8}});
    box.style.height=Math.max(y,40)+'px';
    // counters
    const nG=Math.min(s,NK),eagerLeft=E.filter(e=>!gathered(e.k)&&!(s===N-1&&e.k==null)).length;
    const kern=nG+eagerLeft;
    let bytes=E.filter(e=>!gathered(e.k)&&!(s===N-1&&e.k==null)).reduce((a,e)=>a+e.b,0)+K.slice(0,nG).reduce((a,k)=>a+k.io,0);
    $('xc-fz-cnt').innerHTML=[['Kernels launched',X.n0(kern)],['Bytes moved',X.mb(bytes)],['Equations still separate',X.n0(eagerLeft)]].map(c=>'<div class="stat"><div class="k">'+c[0]+'</div><div class="v">'+c[1]+'</div></div>').join('');
    $('xc-fz-cap').innerHTML=caps[s];
    $('xc-fz-seg').querySelectorAll('button').forEach(b=>{const on=(b.dataset.v==='0'&&s===0)||(b.dataset.v==='last'&&s===N-1);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')});
  }
  $('xc-fz-leg').innerHTML=[['ew','elementwise'],['red','reduction'],['mm','matmul'],['mov','broadcast or copy']].map(c=>'<span><i style="background:'+colr[c[0]]+'"></i>'+c[1]+'</span>').join('');
  const A=X.anim({card:'xc-fz-card',ctl:'xc-fz-ctl',n:N,draw,ms:2600,label:'Fusion step'});
  $('xc-fz-seg').addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;A.go(b.dataset.v==='0'?0:N-1)});
})();
