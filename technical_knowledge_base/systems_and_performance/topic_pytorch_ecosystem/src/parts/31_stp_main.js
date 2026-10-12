// ---- Inside one step tab (t-step): every widget reads window.STP (31_stp_data.js) ----
(function(){
const P=window.STP, S=P.strs, D=P.tds, ops=P.ops, G=P.graph;
const $=id=>document.getElementById(id);
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const fmt=n=>Number(n).toLocaleString('en-US');
const MB=b=>(b/1e6).toFixed(2)+' MB';
const KB=b=>b>=1e6?MB(b):b>=1e3?(b/1e3).toFixed(1)+' KB':b+' B';
const RM=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);
const renders=[];const onR=f=>{renders.push(f);(window.TAB_RENDER=window.TAB_RENDER||{});(window.TAB_RENDER['t-step']=window.TAB_RENDER['t-step']||[]).push(f)};
let rt=0;addEventListener('resize',()=>{const t=$('t-step');if(!t||t.hidden)return;clearTimeout(rt);rt=setTimeout(()=>renders.forEach(f=>{try{f()}catch(e){}}),80)});
const W=el=>{const w=el&&el.clientWidth;return w&&w>40?w:Math.max(280,Math.min(860,(document.documentElement.clientWidth||900)-60))};
const PHN=['forward','backward','optimizer'],PHC=['var(--c1)','var(--c2)','var(--c3)'];
const BASE=P.plain.base_live;
// own copy of the step-animation controller (RD.anim registers its redraws on the Reading tab only)
function anim(o){
  const a=RD.anim(o);onR(()=>a.redraw());return a;
}
// ---------- recount from the trace ----------
const nPh=[0,0,0];ops.forEach(o=>nPh[o[0]]++);
const phStart=[0,nPh[0],nPh[0]+nPh[1]];
const savedAct=G.reduce((s,g)=>s+g[3].reduce((t,x)=>t+x[4],0),0);
const nSeq=G.filter(g=>g[1]>=0).length,nAcc=G.length-nSeq;
const T=P.timing;
// ---------- head ----------
$('stp-head').innerHTML=RD.stat('Calls into the dispatcher',fmt(ops.length),fmt(nPh[0])+' forward, '+fmt(nPh[1])+' backward, '+fmt(nPh[2])+' optimizer')+
 RD.stat('Autograd graph',fmt(G.length)+' nodes',fmt(nSeq)+' op nodes + '+nAcc+' AccumulateGrad')+
 RD.stat('Kept for backward',MB(savedAct),'activations saved by the graph')+
 RD.stat('Step time, CPU',T.cpu.plain.step.median_ms.toFixed(1)+' ms','median, '+T.threads+' threads; MPS '+T.mps.plain.step.median_ms.toFixed(1)+' ms');
// ---------- 1. views ----------
(function(){
  const V=P.views,names=['x','x.t()','x[:, 1]','x[1]','x.t().contiguous()'];
  const seg=$('stp-vw-seg');seg.innerHTML=names.map((n,i)=>'<button data-m="'+i+'"'+(i?'':' class="on"')+'><code>'+esc(n)+'</code></button>').join('');
  function flat(v){return Array.isArray(v)?v.flatMap(flat):[v]}
  function show(i){
    const n=names[i],d=V[n],base=V.x;
    const vals=flat(d.values);
    // storage cells read, in the tensor's own order
    const idx=[];const sh=d.shape,st=d.stride;
    if(sh.length===2){for(let a=0;a<sh[0];a++)for(let b=0;b<sh[1];b++)idx.push(d.offset+a*st[0]+b*st[1])}
    else for(let a=0;a<sh[0];a++)idx.push(d.offset+a*st[0]);
    const storageVals=d.same_storage?flat(V.x.values):vals.slice();
    // storage of x after construction: 0..11 (x.values recorded before the write-through demo)
    const cells=[];const ord={};idx.forEach((k,j)=>ord[k]=j);
    for(let k=0;k<d.storage_elems;k++)cells.push('<div class="stp-cell'+(k in ord?' on':'')+'"><small>'+k+'</small>'+(d.same_storage?k:storageVals[k])+'</div>');
    const grid=sh.length===2?'<div class="stp-grid" style="grid-template-columns:repeat('+sh[1]+',34px)">'+vals.map(v=>'<div class="stp-cell on">'+v+'</div>').join('')+'</div>':'<div class="stp-cells">'+vals.map(v=>'<div class="stp-cell on">'+v+'</div>').join('')+'</div>';
    $('stp-vw-out').innerHTML='<dl class="kv"><dt>shape</dt><dd><code>('+sh.join(', ')+')</code></dd><dt>stride</dt><dd><code>('+st.join(', ')+')</code></dd><dt>storage offset</dt><dd><code>'+d.offset+'</code></dd><dt>contiguous</dt><dd>'+(d.contiguous?'yes':'<b>no</b>')+'</dd><dt>storage</dt><dd>'+(d.same_storage?'<b style="color:var(--good)">the same storage as x</b> (same <code>data_ptr</code>): nothing copied':'<b style="color:var(--bad)">a new storage</b> of '+d.storage_elems+' elements: copied')+'</dd></dl>'+
      '<div class="small mute">The tensor as you see it:</div>'+grid+
      '<div class="small mute">Its storage (cell number on top), highlighted where it reads:</div><div class="stp-cells">'+cells.join('')+'</div>'+
      '<div class="small mute">Element ['+(sh.length===2?'i, j':'i')+'] = storage['+d.offset+' + '+(sh.length===2?'i&middot;'+st[0]+' + j&middot;'+st[1]:'i&middot;'+st[0])+']</div>';
  }
  RD.seg(seg,m=>show(+m));show(0);
  $('stp-m-verr').textContent='"'+V.t_view_error+'"';
})();
// ---------- predict-then-reveal helper ----------
function predict(id,right,html){
  const c=$(id+'-c'),r=$(id+'-r');
  c.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    c.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));
    const ok=+b.dataset.a===right;r.hidden=false;
    const t=r.querySelector('.co')||r;const h=(ok?'<b>Right.</b> ':'<b>Not quite.</b> ')+(typeof html==='function'?html():html);
    if(t===r)r.innerHTML=h;else t.innerHTML=h;
    r.dispatchEvent(new Event('stp-reveal'))});
}
// ---------- 1b. contiguous() on CPU and MPS ----------
(function(){
  const nm=o=>S[o[1]];
  // CPU: copies in forward (clone/copy ops)
  const cpuF=ops.filter(o=>o[0]===0);
  const cpuCopies=cpuF.filter(o=>/^(clone|contiguous|_to_copy|copy_)/.test(S[o[1]])).length;
  // MPS: the pattern transpose -> clone -> view is the .contiguous() after attention
  const m=P.mps.ops.filter(o=>o[0]===0);let pat=0,pb=0,mclone=0;
  for(let i=0;i<m.length;i++){if(nm(m[i])==='clone')mclone++;
    if(i>0&&i+1<m.length&&nm(m[i])==='clone'&&nm(m[i-1])==='transpose.int'&&/^view/.test(nm(m[i+1]))){pat++;pb+=m[i][4]}}
  predict('stp-pq1',2,()=>'On the CPU it copied <b>0 bytes</b>: the recorded forward has '+cpuCopies+' copy ops. The CPU flash-attention kernel already returns its output laid out as (batch, position, head, 64), so after the transpose the strides are row-major and <code>.contiguous()</code> returns the tensor itself. On MPS attention takes the written-out path, whose output is laid out (batch, head, position, 64); there the same line ran a <code>clone</code> '+pat+' times (once per layer), <b>'+fmt(pb/pat)+' bytes each</b>, '+MB(pb)+' in all. ('+mclone+' clones in the MPS forward; the other '+(mclone-pat)+' come from <code>bmm</code> batching.)');
})();
// ---------- 2. dispatch tables ----------
(function(){
  $('stp-pk').textContent=P.param_keys;
  const keys=['AutocastCPU','AutocastMPS','AutogradCPU','AutogradMPS','ADInplaceOrView','Functionalize','Python','CPU','MPS','Meta'];
  const cls={'kernel':'kern','autograd kernel':'agk','math kernel':'math','backend fallback':'fb','fallthrough':'ft','default backend kernel':'kern'};
  const lab={'default backend kernel':'kernel (default)'};
  let h='<thead><tr><th>operator</th>'+keys.map(k=>'<th>'+k+'</th>').join('')+'</tr></thead><tbody>';
  Object.keys(P.tables).forEach(op=>{const r=P.tables[op];
    h+='<tr><td><code>'+esc(op)+'</code></td>'+keys.map(k=>{const v=r[k]||'';return '<td>'+(v?'<span class="stp-k '+(cls[v]||'')+'">'+esc(lab[v]||v)+'</span>':'')+'</td>'}).join('')+'</tr>'});
  $('stp-dt-t').innerHTML=h+'</tbody>';
})();
// ---------- captions per call ----------
const CAP={
 'arange':'Builds the position indices 0..63 (no gradient: integers).',
 'embedding':'Looks up one row per index: token or position vectors. Saves only the indices for backward.',
 'add.Tensor':'Elementwise add: the residual stream (x + branch), or tokens + positions.',
 'native_layer_norm':'LayerNorm over the 256 features. Also returns each row’s mean and 1/std, which backward reuses.',
 'view':'New shape over the same storage: a header change, no copy.',
 't':'Transposes the weight for x @ Wᵀ: a view (strides swapped), no copy.',
 'addmm':'One kernel: bias + input @ weightᵀ. This is where nn.Linear does its arithmetic on the CPU.',
 'split.Tensor':'Cuts the qkv output into q, k and v: three views into one storage.',
 'transpose.int':'Swaps two dimensions by swapping their strides: a view.',
 '_scaled_dot_product_flash_attention_for_cpu':'Fused causal attention (CPU flash kernel): softmax(QKᵀ/√64)V without materialising the 64×64 score matrix; also returns the log-sum-exp per row, kept for backward.',
 'detach':'An alias with no autograd history (autograd’s own bookkeeping).',
 'gelu':'GELU activation on the 1,024-wide MLP hidden layer.',
 'mm':'Matrix multiply.',
 '_unsafe_view':'A view that autograd treats as a fresh tensor (from matmul on 3-D input).',
 '_log_softmax':'Cross-entropy, part 1: log-softmax over the 43 characters.',
 'nll_loss_forward':'Cross-entropy, part 2: picks the log-probability of each correct character and averages.',
 'ones_like':'Seeds backward: dloss/dloss = 1.',
 'nll_loss_backward':'Gradient of the averaged pick: -1/512 at each correct character.',
 '_log_softmax_backward_data':'Gradient through log-softmax: (softmax minus the one-hot target) / 512, per row.',
 'native_layer_norm_backward':'LayerNorm backward: input, weight and bias gradients, using the saved mean and 1/std.',
 'gelu_backward':'GELU backward: incoming gradient times GELU′(h), from the saved input h.',
 '_scaled_dot_product_flash_attention_for_cpu_backward':'Attention backward: recomputes the scores block by block from q, k, v and the saved log-sum-exp.',
 'sum.dim_IntList':'Bias gradient: the incoming gradient summed over all 512 rows.',
 'cat':'split’s backward: glues the q, k and v gradients back into one tensor.',
 'embedding_dense_backward':'Embedding backward: adds each row’s gradient into the rows that were looked up.',
 'lerp_.Scalar':'AdamW: first moment m ← m + (1 - β1)(g - m), in place.',
 'addcmul_':'AdamW: second moment v ← v + (1 - β2) g·g, in place.',
 '_local_scalar_dense':'.item(): reads the step counter back to Python for the bias correction (adam.py L528).',
 'sqrt':'AdamW: √v, a new temporary.',
 'div.Tensor':'AdamW: √v divided by the bias correction, a new temporary.',
 'addcdiv_':'AdamW: the update itself, p ← p - step_size · m / denom, in place.'
};
function caption(k){
  const o=ops[k],n=S[o[1]],ph=o[0];
  if(ph===1&&n==='add.Tensor')return 'Two gradients arrive for one tensor (it was used twice: by the branch and by the residual skip, or the tied weight by embedding and output layer); autograd adds them.';
  if(ph===1&&n==='detach')return S[o[2]].indexOf('AccumulateGrad')>=0?'AccumulateGrad stores the gradient as the parameter’s .grad: a detached alias, no copy.':CAP.detach;
  if(ph===1&&(n==='t'||n==='view'||n==='transpose.int'))return (n==='t'?'Transposes a saved weight or gradient for the gradient matmul':'Reshapes a gradient to match a forward view')+': a view, no copy.';
  if(ph===1&&n==='mm')return 'Gradient matmul: dInput = dOut @ W, or dW = dOutᵀ @ input (from the saved input).';
  if(ph===2){const nx=ops[k+1]?S[ops[k+1][1]]:'';const sh=D[o[5][0]][0];
    if(n==='add_.Tensor')return sh.length===0?'AdamW: step counter += 1 (a 0-d tensor), in place.':'AdamW: denom += eps, in place.';
    if(n==='mul_.Tensor')return nx==='lerp_.Scalar'?'AdamW decoupled weight decay: p ← p · (1 - lr·wd), in place (matrices only).':'AdamW: v ← β2 · v, in place (then addcmul_).';}
  return CAP[n]||'';
}
// ---------- graph layout (shared by the stepper) ----------
const GL=(function(){
  // group every forward op by module, then place each node in its op's group
  const grp=new Array(ops.length).fill(''),last={};let seenBlocks=false;
  for(let k=0;k<phStart[1];k++){const c=S[ops[k][2]];let g;
    const m=c.match(/^blocks\.(\d+)(?:\.(\w+))?/);
    if(m){seenBlocks=true;const b=m[1];
      if(!m[2])g=last[b]||('Block '+b+' attention');
      else g='Block '+b+(m[2]==='ln1'||m[2]==='attn'?' attention':' MLP');last[b]=g}
    else if(!seenBlocks)g='Embeddings';else g='Head and loss';
    grp[k]=g}
  const rows=['Embeddings'];for(let b=0;b<4;b++)rows.push('Block '+b+' attention','Block '+b+' MLP');rows.push('Head and loss');
  const nodeRow=G.map(g=>{if(g[4]>=0)return rows.indexOf(grp[g[4]]);
    const p=g[5];const m=p.match(/^blocks\.(\d+)\.(\w+)/);
    if(m)return rows.indexOf('Block '+m[1]+(m[2]==='ln1'||m[2]==='attn'?' attention':' MLP'));
    return p.startsWith('ln_f')?rows.length-1:0});
  const members=rows.map(()=>[]);
  G.map((g,i)=>i).sort((a,b)=>{const A=G[a],B=G[b];const la=A[1]<0,lb=B[1]<0;if(la!==lb)return la?1:-1;return la?a-b:A[1]-B[1]}).forEach(i=>members[nodeRow[i]].push(i));
  const hasAct=G.map(g=>g[3].some(s=>s[2]==='a'&&s[4]>0));
  const ordPos=new Array(G.length).fill(1e9);P.bwd_order.forEach((n,j)=>ordPos[n]=j);
  return {rows,members,hasAct,ordPos,grp};
})();
// ---------- 3. the stepper ----------
(function(){
  let ph=0,skipV=false,seq=[];
  const isView=k=>/^(view|t|transpose\.int|_unsafe_view|split\.Tensor|detach)$/.test(S[ops[k][1]]);
  function build(){seq=[];for(let k=phStart[ph];k<phStart[ph]+nPh[ph];k++)if(!skipV||!isView(k))seq.push(k)}
  build();
  const memEl=$('stp-run-mem'),gEl=$('stp-run-g');
  let mem={},gl={};
  function layoutMem(){const w=W(memEl),h=110,pl=44,pr=6,pt=8,pb=18;
    const max=Math.max(...ops.map(o=>o[10]-BASE));const X=k=>pl+(w-pl-pr)*k/(ops.length-1),Y=v=>pt+(h-pt-pb)*(1-v/max);
    let body='';
    for(let p=0;p<3;p++){let d='M'+X(phStart[p]).toFixed(1)+' '+Y(0).toFixed(1);
      for(let k=phStart[p];k<phStart[p]+nPh[p];k++)d+='L'+X(k).toFixed(1)+' '+Y(ops[k][10]-BASE).toFixed(1);
      d+='L'+X(phStart[p]+nPh[p]-1).toFixed(1)+' '+Y(0).toFixed(1)+'Z';
      body+='<path d="'+d+'" fill="'+PHC[p]+'" fill-opacity=".35" stroke="'+PHC[p]+'" stroke-width="1"/>'}
    [0,max/2,max].forEach(v=>{body+='<line x1="'+pl+'" x2="'+(w-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(pl-4,Y(v)+4,(v/1e6).toFixed(0)+' MB',{a:'end',fs:10,fill:'var(--mute)'})});
    body+=RD.t(pl,h-4,'call 1',{fs:10,fill:'var(--mute)'})+RD.t(w-pr,h-4,'call '+ops.length,{a:'end',fs:10,fill:'var(--mute)'});
    body+='<line id="stp-run-cur" x1="0" x2="0" y1="'+pt+'" y2="'+(h-pb)+'" stroke="var(--ink)" stroke-width="1.5"/><circle id="stp-run-dot" r="3.5" fill="var(--ink)"/>';
    memEl.innerHTML=RD.svg(w,h,body,'Live bytes above the base after each call of the step');
    mem={X,Y}}
  memEl.addEventListener('click',e=>{const r=memEl.querySelector('svg').getBoundingClientRect();const w=W(memEl);
    const k=Math.round((e.clientX-r.left)*(w/r.width)-44)/(w-50)*(ops.length-1);go(Math.max(0,Math.min(ops.length-1,Math.round(k))))});
  function layoutG(){const w=W(gEl);const maxN=Math.max(...GL.members.map(m=>m.length));
    const cell=Math.max(4,Math.min(14,Math.floor((w-4)/maxN)-2)),gap=cell>6?2:1,rh=cell+15;
    const pos=new Array(G.length);let body='';
    GL.rows.forEach((r,ri)=>{const y=ri*rh+12;body+=RD.t(0,y-2,r,{fs:10,fill:'var(--mute)'});
      GL.members[ri].forEach((n,j)=>{const x=j*(cell+gap);pos[n]=[x,y];
        body+=G[n][1]<0?'<rect id="stp-gn'+n+'" x="'+(x+cell*.15)+'" y="'+(y+cell*.15)+'" width="'+(cell*.7)+'" height="'+(cell*.7)+'" transform="rotate(45 '+(x+cell/2)+' '+(y+cell/2)+')"/>'
          :'<rect id="stp-gn'+n+'" x="'+x+'" y="'+y+'" width="'+cell+'" height="'+cell+'" rx="1.5"/>'})});
    body+='<g id="stp-ge"></g>';
    gEl.innerHTML=RD.svg(w,GL.rows.length*rh+4,body,'Autograd graph nodes by module');
    gl={pos,cell}}
  const st=n=>{const e=document.getElementById('stp-gn'+n);return e};
  function paintG(k){const o=ops[k],p=o[0];
    const cur=p===0?o[11]:p===1?o[11]:-1;const curOrd=p===1&&o[11]>=0?GL.ordPos[o[11]]:(p===2?1e9:-1);
    G.forEach((g,n)=>{const e=st(n);if(!e)return;let f='none',s='var(--dim)',op=1;
      const created=g[4]<0?(p>0||k>=g[4]):(p>0||g[4]<=k);
      const createdF=p===0?(g[4]>=0?g[4]<=k:false):true;
      if(p===0){if(createdF){f=GL.hasAct[n]?'var(--c1)':'var(--c6)';s=f}}
      else{const done=GL.ordPos[n]<=curOrd;f=done?'var(--c2)':(GL.hasAct[n]?'var(--c1)':'var(--c6)');s=f;if(p===2)op=.35}
      if(n===cur){s='var(--c5)'}
      e.setAttribute('fill',f);e.setAttribute('stroke',s);e.setAttribute('stroke-width',n===cur?2.5:1);e.setAttribute('fill-opacity',op)});
    let ed='';if(cur>=0&&gl.pos[cur]){const c=gl.cell/2,[x0,y0]=gl.pos[cur];G[cur][2].forEach(m=>{const q=gl.pos[m];if(q)ed+='<line x1="'+(x0+c)+'" y1="'+(y0+c)+'" x2="'+(q[0]+c)+'" y2="'+(q[1]+c)+'" stroke="var(--c5)" stroke-width="1.2" opacity=".8"/>'})}
    const ge=$('stp-ge');if(ge)ge.innerHTML=ed}
  const tdesc=(i,isOut,inplace)=>{const t=D[i];let s='('+t[0].join(', ')+') '+t[3]+' stride ('+t[1].join(', ')+')'+(t[2]?' offset '+t[2]:'');
    if(isOut)s+=t[4]>0?' <span class="new">new storage, '+fmt(t[4])+' B</span>':' <span class="shr">'+(inplace?'in place: written into an input':'shares an existing storage (no copy)')+'</span>';return s};
  const KEYDOC={Autocast:'autocast is off: key excluded, skipped',ADInplaceOrViewSkip:'fallthrough for this op: skipped',
    Python:'the recording mode: logs the call, then runs it',ADInplaceOrView:'view or in-place bookkeeping (version counter, view base)'};
  function keyStack(k){const o=ops[k],path=S[o[3]].split('|'),ks=S[o[12]]?S[o[12]].split(','):[];const be=path[path.length-1];
    let h='';const ph=o[0];
    h+='<div class="stp-key top"><b>'+(ph===0?'Python: '+esc(S[o[2]]||'model')+'.forward':ph===1?'autograd engine: '+esc(S[o[2]]||'loss.backward()'):'Python: AdamW.step')+'</b><span>where the call comes from</span></div>';
    ks.filter(x=>/^Autocast/.test(x)).forEach(x=>h+='<div class="stp-key skip"><b>'+x+'</b><span>'+KEYDOC.Autocast+'</span></div>');
    const ag=path.find(x=>/^Autograd/.test(x));
    if(ag){const m=ag.match(/^(\S+) \((.*)\)$/);h+='<div class="stp-key ag"><b>'+m[1]+'</b><span>'+esc(m[2])+'</span></div>'}
    else if(ks.some(x=>/^Autograd/.test(x)))h+='<div class="stp-key skip"><b>'+ks.find(x=>/^Autograd/.test(x))+'</b><span>excluded for this thread</span></div>';
    if(path.indexOf('ADInplaceOrView')>=0)h+='<div class="stp-key ad"><b>ADInplaceOrView</b><span>'+KEYDOC.ADInplaceOrView+'</span></div>';
    else if(ks.indexOf('ADInplaceOrView')>=0)h+='<div class="stp-key skip"><b>ADInplaceOrView</b><span>'+KEYDOC.ADInplaceOrViewSkip+'</span></div>';
    h+='<div class="stp-key py"><b>Python</b><span>'+KEYDOC.Python+'</span></div>';
    h+='<div class="stp-key be"><b>'+be+'</b><span>backend kernel: the arithmetic</span></div>';
    $('stp-run-keys').innerHTML=h;
    $('stp-run-ks').innerHTML='Input key set: '+(ks.length?'<code>'+ks.join(', ')+'</code>':'none (no tensor inputs: the dispatcher uses the device argument)')}
  function draw(i){const k=seq[i];if(k===undefined)return;const o=ops[k],p=o[0],n=S[o[1]];
    $('stp-run-phb').innerHTML='<span class="stp-ph stp-ph'+p+'">'+PHN[p]+'</span>';
    $('stp-run-n').textContent='call '+(k-phStart[p]+1)+' of '+nPh[p]+' in '+PHN[p]+' (#'+(k+1)+' of '+ops.length+' in the step)';
    $('stp-run-op').textContent='aten::'+n;
    const c=S[o[2]];
    $('stp-run-ctx').innerHTML=p===0?(c?'in module <code>'+esc(c)+'</code>':'in GPT.forward'):p===1?(c?'inside node <code>'+esc(c)+'</code>'+(o[11]>=0?', node '+(GL.ordPos[o[11]]+1)+' of '+G.length+' in backward order':''):'in loss.backward()'):'updating <code>'+esc(c)+'</code>';
    $('stp-run-cap').textContent=caption(k);
    const inplace=/_$/.test(n.split('.')[0]);
    let t='';o[5].forEach(x=>t+='<div>in&nbsp; '+tdesc(x)+'</div>');if(o[6]>o[5].length)t+='<div class="mute">+ '+(o[6]-o[5].length)+' more inputs</div>';
    o[7].forEach(x=>t+='<div>out '+tdesc(x,true,inplace)+'</div>');if(o[8]>o[7].length)t+='<div class="mute">+ '+(o[8]-o[7].length)+' more outputs</div>';
    $('stp-run-ten').innerHTML=t;keyStack(k);
    let nodes=0,run=0;if(p===0){for(let j=0;j<=k;j++)if(ops[j][11]>=0)nodes++}else nodes=G.length-nAcc;
    if(p===1&&o[11]>=0)run=GL.ordPos[o[11]]+1;else if(p===2)run=G.length;
    $('stp-run-st').innerHTML=RD.stat('Live above base',MB(o[10]-BASE),'after this call')+RD.stat('New this call',o[9]?fmt(o[9])+' B':'0 B',o[9]?'fresh storage':'view, in place, or scalar')+
      (p===0?RD.stat('Graph nodes',fmt(nodes),'recorded so far (+ '+nAcc+' AccumulateGrad)'):RD.stat('Nodes run',fmt(run)+' / '+G.length,p===2?'graph freed after backward':'in backward order'));
    if(mem.X){const x=mem.X(k);const c1=$('stp-run-cur'),d=$('stp-run-dot');c1.setAttribute('x1',x);c1.setAttribute('x2',x);d.setAttribute('cx',x);d.setAttribute('cy',mem.Y(o[10]-BASE))}
    paintG(k)}
  function relayout(){layoutMem();layoutG()}
  relayout();onR(relayout);
  const A=anim({card:'stp-run',ctl:'stp-run-ctl',n:seq.length,ms:900,label:'Call',draw});
  function setPh(p,k){ph=p;$('stp-run-ph').querySelectorAll('button').forEach(b=>b.classList.toggle('on',+b.dataset.m===p));build();A.reset(seq.length);
    if(k!==undefined){let i=seq.indexOf(k);if(i<0)i=seq.findIndex(x=>x>=k);A.go(Math.max(0,i))}}
  function go(k){setPh(ops[k][0],k)}
  RD.seg($('stp-run-ph'),m=>setPh(+m));
  $('stp-run-skipv').addEventListener('change',e=>{skipV=e.target.checked;const cur=seq[A.i];build();A.reset(seq.length);let i=seq.findIndex(x=>x>=cur);A.go(Math.max(0,i))});
  document.querySelectorAll('#t-step .stp-go').forEach(b=>b.addEventListener('click',()=>{if(skipV){skipV=false;$('stp-run-skipv').checked=false}go(+b.dataset.go);$('stp-run').scrollIntoView({block:'start'})}));
  window.STP_GO=go;
})();
// ---------- 4. graph table ----------
(function(){
  const agg={};G.forEach(g=>{const nm=S[g[0]];const a=agg[nm]=agg[nm]||{n:0,act:0,refs:{},par:0,bat:0};a.n++;
    g[3].forEach(s=>{a.act+=s[4];const key=s[0]+(s[2]==='p'?' (parameter)':s[2]==='b'?' (batch)':'');a.refs[key]=1;if(s[2]==='p')a.par++;if(s[2]==='b')a.bat++})});
  const rows=Object.keys(agg).sort((a,b)=>agg[b].act-agg[a].act||agg[b].n-agg[a].n);
  let h='<thead><tr><th>node</th><th class="num">count</th><th>what it saves</th><th class="num">activation bytes kept</th></tr></thead><tbody>';
  rows.forEach(r=>{const a=agg[r];h+='<tr><td><code>'+esc(r.replace('torch::autograd::',''))+'</code></td><td class="num">'+a.n+'</td><td class="small">'+(Object.keys(a.refs).map(esc).join(', ')||'<span class="mute">nothing</span>')+'</td><td class="num">'+(a.act?fmt(a.act):'0')+'</td></tr>'});
  h+='<tr><td><b>total</b></td><td class="num"><b>'+G.length+'</b></td><td></td><td class="num"><b>'+fmt(savedAct)+'</b></td></tr></tbody>';
  $('stp-g-t').innerHTML=h;
  $('stp-g-n').textContent=G.length+' nodes: '+nSeq+' for differentiable ops (each with a sequence number in creation order) and '+nAcc+' AccumulateGrad nodes, one per parameter tensor, which write .grad';
  $('stp-g-act').textContent=MB(savedAct);
  const dLive=P.plain.live_after_fwd-BASE;
  $('stp-g-note').innerHTML='A storage several nodes keep (q, k and v are views of one qkv output) is counted once, at the first node that keeps it. Parameters and the batch are kept by reference and cost nothing extra. Cross-check: live memory after forward minus before is '+fmt(dLive)+' B = '+fmt(savedAct)+' B kept by the graph + '+fmt(dLive-savedAct)+' B for the logits (8 &times; 64 &times; 43 &times; 4 = 88,064) and the loss (4).';
})();
// ---------- 5. checkpointing before/after ----------
(function(){
  const pl=ops.map(o=>[o[0],o[1],-1,o[4],o[9],o[10]]),ck=P.ckpt.ops;
  const V=[{nm:'Plain',o:pl,col:'var(--c1)',key:'plain'},{nm:'Checkpointed',o:ck,col:'var(--c4)',key:'ckpt'}];
  const N=Math.max(pl.length,ck.length),F=60,per=Math.ceil(N/F);
  let mode='both',lay={};
  const max=Math.max(...pl.map(o=>o[5]),...ck.map(o=>o[5]))-BASE;
  V.forEach(v=>{v.ph=[0,0,0];v.o.forEach(o=>v.ph[o[0]]++);v.peak=0;v.rec=0;v.o.forEach(o=>{if(o[0]===1&&o[3])v.rec++})});
  const el=$('stp-ck-p');
  function layout(){const w=W(el),h=150,pL=44,pr=8,pt=10,pb=20;const X=k=>pL+(w-pL-pr)*k/(N-1),Y=b=>pt+(h-pt-pb)*(1-b/max);
    let b='';[0,max/2,max].forEach(v=>{b+='<line x1="'+pL+'" x2="'+(w-pr)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="var(--line)"/>'+RD.t(pL-4,Y(v)+4,(v/1e6).toFixed(0)+' MB',{a:'end',fs:10,fill:'var(--mute)'})});
    V.forEach((v,j)=>{let d='';v.o.forEach((o,k)=>d+=(k?'L':'M')+X(k).toFixed(1)+' '+Y(o[5]-BASE).toFixed(1));
      b+='<path id="stp-ck-l'+j+'" d="'+d+'" fill="none" stroke="'+v.col+'" stroke-width="1.6"/>';
      // recompute calls marked under the axis
      let r='';v.o.forEach((o,k)=>{if(o[0]===1&&o[3])r+='M'+X(k).toFixed(1)+' '+(h-pb+3)+'v5'});if(r)b+='<path id="stp-ck-r'+j+'" d="'+r+'" stroke="'+v.col+'" stroke-width="1"/>';
      b+='<line id="stp-ck-c'+j+'" y1="'+pt+'" y2="'+(h-pb)+'" stroke="'+v.col+'" stroke-dasharray="3 2"/>'});
    b+='<rect id="stp-ck-mask" x="0" y="0" width="0" height="'+h+'" fill="var(--bg)" opacity=".8"/>';
    b+=RD.t(w-pr,h-4,'calls (ticks: recomputed forward calls inside backward)',{a:'end',fs:10,fill:'var(--mute)'});
    el.innerHTML=RD.svg(w,h,b,'Live bytes per call, plain against checkpointed');lay={X,Y,w,pr}}
  function draw(f){const k=Math.min(N-1,f*per);
    V.forEach((v,j)=>{const show=mode==='both'||mode===v.key;['l','r','c'].forEach(t=>{const e=$('stp-ck-'+t+j);if(e)e.style.display=show?'':'none'});
      const kk=Math.min(k,v.o.length-1),c=$('stp-ck-c'+j);if(c){c.setAttribute('x1',lay.X(kk));c.setAttribute('x2',lay.X(kk))}});
    const m=$('stp-ck-mask');if(m){m.setAttribute('x',lay.X(k)+1);m.setAttribute('width',Math.max(0,lay.w-lay.X(k)-1))}
    let st='',cap=[];
    V.forEach(v=>{if(mode!=='both'&&mode!==v.key)return;const kk=Math.min(k,v.o.length-1),o=v.o[kk];let pk=0,bw=0,rc=0;
      for(let j=0;j<=kk;j++){const q=v.o[j];pk=Math.max(pk,q[5]-BASE);if(q[0]===1){bw++;if(q[3])rc++}}
      st+=RD.stat(v.nm+': live now',MB(o[5]-BASE),'peak so far '+MB(pk))+RD.stat(v.nm+': backward calls',fmt(bw)+(rc?' ('+rc+' recompute)':''),'of '+fmt(v.ph[1])+(v.rec?' ('+v.rec+' recompute)':''));
      const done=kk>=v.o.length-1;cap.push('<b>'+v.nm+'</b>: '+(done?'step finished':PHN[o[0]]+(o[0]===1&&o[3]?', <b>recomputing</b> a block’s forward (<code>'+esc(S[o[1]])+'</code>)':', <code>'+esc(S[o[1]])+'</code>')))});
    $('stp-ck-st').innerHTML=st;$('stp-ck-cap').innerHTML=cap.join('<br>')}
  layout();onR(()=>{layout()});
  const A=anim({card:'stp-ck',ctl:'stp-ck-ctl',n:F+1,ms:280,label:'Progress through the step',draw});
  RD.seg($('stp-ck-m'),m=>{mode=m;A.redraw()});
  const S0=P.plain,S1=P.ckpt.sum,t=T.cpu;
  $('stp-ck-src').innerHTML='Recorded: plain forward leaves '+MB(S0.live_after_fwd-BASE)+' live, checkpointed '+MB(S1.live_after_fwd-BASE)+' (the 4 block inputs, the logits and the loss). Backward calls '+fmt(S0.n_bwd)+' plain against '+fmt(S1.n_bwd)+' checkpointed, '+V[1].rec+' of them recomputing forward ops. Same loss ('+S0.loss+' and '+S1.loss+') and the same gradients. Time on CPU (median of '+T.trials+' &times; '+T.steps+' steps): step '+t.plain.step.median_ms.toFixed(1)+' ms plain, '+t.checkpoint.step.median_ms.toFixed(1)+' ms checkpointed; backward '+t.plain.bwd.median_ms.toFixed(1)+' against '+t.checkpoint.bwd.median_ms.toFixed(1)+' ms. Non-reentrant checkpointing stops each recompute early, once it has rebuilt everything backward will ask for (<a href="https://github.com/pytorch/pytorch/blob/v2.14.1/torch/utils/checkpoint.py#L936-L956" target="_blank" rel="noopener noreferrer">checkpoint.py L936</a>; <a href="https://docs.pytorch.org/docs/stable/checkpoint.html" target="_blank" rel="noopener noreferrer">docs</a>).';
  const cnt=(arr,nm,ph)=>arr.filter(o=>o[0]===ph&&S[o[1]]===nm).length;
  const a0=cnt(ck,'addmm',1),af=cnt(pl,'addmm',0);
  predict('stp-pq2',1,()=>'<b>'+a0+'</b> of the forward’s '+af+'. Each block’s last <code>addmm</code> (<code>mlp.proj</code>) saves its input and its weight, not its output, so nothing backward needs is produced by it: the recompute stops before it, and before the residual add after it. Plain backward makes '+cnt(pl,'addmm',1)+' <code>addmm</code> calls (its gradient matmuls are <code>mm</code>).');
})();
// ---------- 6. gradients off ----------
(function(){
  const tr=ops.filter(o=>o[0]===0).map(o=>[0,o[1],o[3],o[4],o[9],o[10]]);
  const L=[{nm:'Grad mode on',o:tr,t:'grad'},{nm:'torch.no_grad()',o:P.nograd.ops,t:'no_grad'},{nm:'torch.inference_mode()',o:P.infer.ops,t:'inference_mode'}];
  const kind=o=>{const p=S[o[2]];return /records a node/.test(p)?2:/^Autograd/.test(p)?1:0};
  L.forEach(l=>{l.nodes=0;l.ag=0;l.adv=0;l.o.forEach(o=>{const k=kind(o);if(k===2)l.nodes++;if(k)l.ag++;if(S[o[2]].indexOf('ADInplaceOrView')>=0)l.adv++})});
  const N=Math.max(...L.map(l=>l.o.length));const el=$('stp-ng-p');let lay={};
  const COL=['var(--dim)','var(--c4)','var(--c1)'];
  function layout(){const w=W(el),lh=40,pL=0;const cw=(w-2)/N;let b='';
    L.forEach((l,j)=>{const y=j*lh;b+=RD.t(0,y+11,l.nm+': '+l.o.length+' calls',{fs:11,w:600});
      l.o.forEach((o,k)=>{b+='<rect x="'+(k*cw).toFixed(2)+'" y="'+(y+15)+'" width="'+Math.max(1,cw-.4).toFixed(2)+'" height="16" fill="'+COL[kind(o)]+'"/>'});
      b+='<line id="stp-ng-c'+j+'" y1="'+(y+13)+'" y2="'+(y+33)+'" stroke="var(--ink)" stroke-width="2"/>'});
    el.innerHTML=RD.svg(w,L.length*lh,b,'Forward calls with grad on, no_grad and inference_mode')+'<div class="stp-leg"><span><i style="background:var(--c1)"></i>autograd records a node</span><span><i style="background:var(--c4)"></i>autograd kernel entered, nothing to record</span><span><i style="background:var(--dim)"></i>autograd skipped</span></div>';lay={cw}}
  function draw(i){let st='',cap=[];
    L.forEach((l,j)=>{const k=Math.min(i,l.o.length-1),o=l.o[k];const c=$('stp-ng-c'+j);if(c){const x=(k+.5)*lay.cw;c.setAttribute('x1',x);c.setAttribute('x2',x)}
      let nd=0;for(let q=0;q<=k;q++)if(kind(l.o[q])===2)nd++;
      cap.push('<b>'+esc(l.nm)+'</b>: '+(i>=l.o.length?'done':'<code>'+esc(S[o[1]])+'</code>, route '+esc(S[o[2]].split('|').filter(x=>!/^Python/.test(x)).join(' → '))));
      st+=RD.stat(esc(l.nm),fmt(nd)+' nodes','live above base at this call: '+MB(o[5]-BASE))});
    $('stp-ng-cap').innerHTML=cap.join('<br>');$('stp-ng-st').innerHTML=st}
  layout();onR(layout);
  anim({card:'stp-ng',ctl:'stp-ng-ctl',n:N,ms:450,label:'Forward call',draw});
  const tc=T.cpu.forward,tm=T.mps.forward;
  const inf=P.infer.ops,cn=nm=>inf.filter(o=>S[o[1]]===nm).length;
  $('stp-ng-why').innerHTML='Not because it runs fewer kernels. With autograd on, a math-kernel op such as <code>linear</code> decomposes at the autograd key, so the recording mode (at the Python key, below autograd) sees the pieces: <code>t</code>, <code>addmm</code>, <code>view</code>. Under <code>inference_mode</code> the autograd keys are gone, the first key with a kernel is <code>Python</code> (a backend fallback, which outranks the decomposition), and the mode sees the whole op: '+cn('linear')+' <code>linear</code>, '+cn('layer_norm')+' <code>layer_norm</code>, '+cn('scaled_dot_product_attention')+' <code>scaled_dot_product_attention</code>, '+cn('cross_entropy_loss')+' <code>cross_entropy_loss</code>; each still decomposes after the mode passes it on. <code>no_grad</code> differs from grad mode on by only the '+(tr.length-P.nograd.ops.length)+' <code>detach</code> calls autograd makes when an op saves its own output (attention and log-softmax). Live memory above base at the end of forward: '+MB(L[0].o[L[0].o.length-1][5]-BASE)+' with the graph, '+MB(P.nograd.sum.live_after_fwd-BASE)+' under no_grad and '+MB(P.infer.sum.live_after_fwd-BASE)+' under inference_mode (only the logits and the loss). Time per forward, median: CPU '+tc.grad.median_ms.toFixed(2)+' ms with grad, '+tc.no_grad.median_ms.toFixed(2)+' no_grad, '+tc.inference_mode.median_ms.toFixed(2)+' inference_mode; MPS '+tm.grad.median_ms.toFixed(2)+', '+tm.no_grad.median_ms.toFixed(2)+', '+tm.inference_mode.median_ms.toFixed(2)+' ms. Turning the graph off saved about '+Math.round(100*(1-tc.no_grad.median_ms/tc.grad.median_ms))+'% on the CPU and '+Math.round(100*(1-tm.no_grad.median_ms/tm.grad.median_ms))+'% on MPS; no_grad against inference_mode is within the run-to-run spread on both.';
})();
// ---------- 7. time ----------
(function(){
  const c=T.cpu.plain,m=T.mps.plain,mx=Math.max(c.step.max_ms,m.step.max_ms,T.cpu.checkpoint.step.max_ms);
  const row=(nm,v,col,hl)=>'<div class="row'+(hl?' hl':'')+'"><div class="nm">'+nm+'</div><div class="track"><div class="fill" style="width:'+(100*v.median_ms/mx).toFixed(1)+'%;background:'+col+'"></div></div><div class="val">'+v.median_ms.toFixed(1)+' ms</div></div>';
  let h='';
  [['CPU',T.cpu.plain],['MPS',T.mps.plain]].forEach(([d,x])=>{h+='<div class="band">'+d+' (spread across trials: step '+x.step.min_ms.toFixed(1)+' to '+x.step.max_ms.toFixed(1)+' ms)</div>';
    h+=row('whole step',x.step,'var(--ink)',1)+row('forward',x.fwd,PHC[0])+row('backward',x.bwd,PHC[1])+row('optimizer',x.opt,PHC[2])});
  $('stp-t-bars').innerHTML=h;
  const la=a=>a.map(v=>v.toFixed(1)).join(', ');
  $('stp-t-meta').innerHTML='Median of '+T.trials+' trials of '+T.steps+' steps each, after 5 warm-up steps; CPU with '+T.threads+' threads. <b>Measured on Apple M1 Pro</b>, '+T.date+', under the shared bench lock but with other work on the machine: load average '+la(T.load_before)+' before and '+la(T.load_after)+' after (1, 5, 15 minutes), so treat differences under about 10% as noise.';
  const pr=T.profile_cpu;let t='<thead><tr><th>phase</th><th>op</th><th class="num">calls</th><th class="num">self time, &micro;s</th><th class="num">share of phase</th></tr></thead><tbody>';
  ['fwd','bwd','opt'].forEach((ph,j)=>{const x=pr[ph];x.top.slice(0,5).forEach((r,i)=>{t+='<tr>'+(i?'<td></td>':'<td rowspan="1"><span class="stp-ph stp-ph'+j+'">'+PHN[j]+'</span></td>')+'<td><code>'+esc(r[0])+'</code></td><td class="num">'+r[1]+'</td><td class="num">'+fmt(Math.round(r[2]))+'</td><td class="num">'+(100*r[2]/x.self_cpu_us).toFixed(0)+'%</td></tr>'})});
  $('stp-t-prof').innerHTML=t+'</tbody>';
  $('stp-t-pn').innerHTML='One profiled step (step 1 after three warm-up steps), CPU. The profiler counts every ATen call: composite ops before they decompose (<code>linear</code>, <code>layer_norm</code>, <code>matmul</code>) and the calls kernels make inside themselves (<code>as_strided</code>, <code>empty</code>, <code>copy_</code>): '+fmt(pr.fwd.aten_events)+' events in forward, '+fmt(pr.bwd.aten_events)+' in backward and '+fmt(pr.opt.aten_events)+' in the optimizer, against the '+nPh[0]+', '+nPh[1]+' and '+nPh[2]+' calls that enter the dispatcher from above. <code>'+pr.fwd.top[0][0]+'</code> is '+(100*pr.fwd.top[0][2]/pr.fwd.self_cpu_us).toFixed(0)+'% of forward self time and <code>'+pr.bwd.top[0][0]+'</code> '+(100*pr.bwd.top[0][2]/pr.bwd.self_cpu_us).toFixed(0)+'% of backward; the optimizer is all small elementwise calls, 9 or 10 per parameter tensor.';
  const O=P.timing_opt,mo=Math.max(O.cpu.forloop.median_ms,O.mps.forloop.median_ms,O.mps.foreach.median_ms);
  const orow=(nm,v,col)=>'<div class="row"><div class="nm">'+nm+'</div><div class="track"><div class="fill" style="width:'+(100*v.median_ms/mo).toFixed(1)+'%;background:'+col+'"></div></div><div class="val">'+v.median_ms.toFixed(2)+' ms</div></div>';
  $('stp-t-opt').innerHTML=['cpu','mps'].map(d=>'<div class="band">'+d.toUpperCase()+', optimizer phase</div>'+orow('for-loop (default)',O[d].forloop,'var(--dim)')+orow('foreach',O[d].foreach,'var(--c4)')+orow('fused',O[d].fused,PHC[2])).join('');
  predict('stp-pq3',1,()=>'Fused: '+O.cpu.forloop.median_ms.toFixed(2)+' &rarr; '+O.cpu.fused.median_ms.toFixed(2)+' ms on the CPU ('+(O.cpu.forloop.median_ms/O.cpu.fused.median_ms).toFixed(1)+'&times;) and '+O.mps.forloop.median_ms.toFixed(2)+' &rarr; '+O.mps.fused.median_ms.toFixed(2)+' ms on MPS ('+(O.mps.forloop.median_ms/O.mps.fused.median_ms).toFixed(1)+'&times;). <code>foreach</code> barely helps here ('+O.cpu.foreach.median_ms.toFixed(2)+' and '+O.mps.foreach.median_ms.toFixed(2)+' ms): its win is fewer kernel launches, which matters on a GPU, not fewer passes over memory. PyTorch 2.14.1 never picks <code>fused</code> by default; it picks <code>foreach</code> only for CUDA-like devices (<a href="https://github.com/pytorch/pytorch/blob/v2.14.1/torch/utils/_foreach_utils.py#L8-L23" target="_blank" rel="noopener noreferrer">_foreach_utils.py L8 to 23</a>, <a href="https://github.com/pytorch/pytorch/blob/v2.14.1/torch/optim/optimizer.py#L170-L195" target="_blank" rel="noopener noreferrer">optimizer.py L170</a>). Fused AdamW supports CPU and MPS: on this step it is one argument, <code>fused=True</code>, for '+(100*(O.cpu.forloop.median_ms-O.cpu.fused.median_ms)/T.cpu.plain.step.median_ms).toFixed(0)+'% of the CPU step. Optimizer timed separately under the bench lock, '+O.date+', load average '+O.load_before.map(v=>v.toFixed(1)).join(', ')+' before; 5 trials of 20 steps, medians.');
})();
$('stp-ovh').textContent='the optimizer\u2019s '+nPh[2]+' calls over 52 parameter tensors (none above 262,144 numbers) take '+T.cpu.plain.opt.median_ms.toFixed(1)+' ms on the CPU: about '+Math.round(1000*T.cpu.plain.opt.median_ms/nPh[2])+' \u00b5s each';
// ---------- 8. checks (recomputed here, in the browser, from the embedded trace) ----------
(function(){
  const pS=P.plain,H=P.hand,GC=P.gradcheck,CS=P.ckpt_same;
  const ok=b=>b?'<b style="color:var(--good)">pass</b>':'<b style="color:var(--bad)">FAIL</b>';
  const allocSum=ops.reduce((s,o)=>s+o[9],0);
  const mm=P.mps.ops.map(o=>o[6]-o[5]);const mpsD=[Math.min(...mm),Math.max(...mm)];
  const matched=ops.filter(o=>o[0]===0&&o[11]>=0).length;
  const rows=[
   ['Calls per phase recounted from the trace','forward '+nPh[0]+', backward '+nPh[1]+', optimizer '+nPh[2]+' (recorder summary '+pS.n_fwd+', '+pS.n_bwd+', '+pS.n_opt+')',nPh[0]===pS.n_fwd&&nPh[1]===pS.n_bwd&&nPh[2]===pS.n_opt],
   ['Saved activations against live memory','graph keeps '+fmt(savedAct)+' B; live after forward minus before is '+fmt(pS.live_after_fwd-BASE)+' B; the difference, '+fmt(pS.live_after_fwd-BASE-savedAct)+' B, is the logits (88,064) and the loss (4)',pS.live_after_fwd-BASE-savedAct===88068],
   ['Every op node matched to the forward call that created it','matched '+matched+' of '+nSeq+' nodes by creation order and name',matched===nSeq&&pS.unmatched_nodes.length===0],
   ['Live memory returns to base after the step','end of step: base + '+fmt(pS.live_end-BASE)+' B (the logits and loss the script still holds)',pS.live_end-BASE===88068],
   ['Tracked live bytes against the MPS allocator','torch.mps.current_allocated_memory() minus tracked bytes, over all '+P.mps.ops.length+' MPS calls: '+fmt(mpsD[0])+' to '+fmt(mpsD[1])+' B (allocator rounding and its own small buffers)',mpsD[0]>=0&&mpsD[1]<65536],
   ['Hand-derived gradient for <code>blocks.0.mlp.fc</code>','dW = GᵀX and db = ΣG against autograd: max difference '+H.dW_max_abs_diff+' and '+H.db_max_abs_diff+' (same float32 arithmetic); GELU′(h) = Φ(h) + hφ(h) against autograd’s <code>gelu_backward</code>: max relative difference '+H.gelu_rel.toExponential(1),H.dW_rel<1e-5&&H.gelu_rel<1e-5],
   ['torch.autograd.gradcheck (finite differences, float64)','one Block, layer_norm, cross_entropy ('+esc(GC.config)+')',GC.block_input&&GC.layer_norm&&GC.cross_entropy],
   ['Checkpointing changes memory, not the result','loss '+CS.loss_plain.toFixed(4)+' both ways; largest gradient difference over all parameters '+CS.max_abs_grad_diff,CS.max_abs_grad_diff===0],
   ['The same step on CPU and MPS','loss '+pS.loss+' on CPU, '+P.mps.sum.loss+' on MPS; MPS records '+P.mps.sum.n_fwd+' forward and '+P.mps.sum.n_bwd+' backward calls and '+P.mps.graph_nodes+' graph nodes (different kernels, section 2)',pS.loss===P.mps.sum.loss]
  ];
  $('stp-chk').innerHTML='<div class="tw"><table class="stp-tbl"><thead><tr><th>check</th><th>result</th><th></th></tr></thead><tbody>'+rows.map(r=>'<tr><td>'+r[0]+'</td><td class="small">'+r[1]+'</td><td>'+ok(r[2])+'</td></tr>').join('')+'</tbody></table></div><p class="small mute">New storage allocated across the whole step: '+fmt(allocSum)+' B in '+ops.filter(o=>o[9]>0).length+' allocations, most of them freed again within the step.</p>';
})();
})();
