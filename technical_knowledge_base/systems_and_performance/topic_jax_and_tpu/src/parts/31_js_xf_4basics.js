// ---- Transforms lab, sections 4 to 7: side effects, immutable arrays, keys, pytree explorer ----
(function(){
  const {D,esc,$,n0,stat}=XF,B=D.basics;
  const arr=a=>'['+a.map(v=>{const s=(+v).toFixed(4).replace(/\.?0+$/,'');return s==='-0'?'0':s}).join(', ')+']';
  const row=(...c)=>'<tr>'+c.map(x=>'<td>'+x+'</td>').join('')+'</tr>';
  // side effects: section retired 2026-10-23 (now JAX core, section 3)
  // immutable arrays
  const I=B.immut,IT=B.immut_torch;
  $('xf-immut').innerHTML='<tr><th>operation on x = arange(5.)</th><th>JAX result</th><th>PyTorch</th></tr>'+
    row('<code>x.at[0].set(9.0)</code>',arr(I.set)+'<br><span class="small mute">x itself is still '+arr(I.x_after)+'</span>','<code>t[0] = 9.0</code>: '+arr(IT.setitem)+' (t changed in place)')+
    row('<code>x.at[1:3].add(10.0)</code>',arr(I.add),'<code>t[1:3] += 10</code>')+
    row('<code>x.at[-1].multiply(2.0)</code>',arr(I.mul),'<code>t[-1] *= 2</code>')+
    row('<code>x.at[0].max(3.0)</code>',arr(I.max),'<code>t[0] = max(t[0], 3)</code>')+
    row('<code>x.at[[0, 0, 0]].add(1.0)</code>',arr(I.dup_add)+' <span class="xf-lbl p">accumulates</span>','<code>t[[0,0,0]] += 1</code>: '+arr(IT.dup_iadd)+'<br><code>index_put_(..., accumulate=True)</code>: '+arr(IT.index_put_accumulate));
  // keys: section retired 2026-10-23 (now JAX core, section 10)
  // what counts as a leaf
  $('xf-leaves').innerHTML='<tr><th>path</th><th>leaf</th></tr>'+B.leafdemo.map(l=>row('<code>'+esc(l.path)+'</code>','<code>'+esc(l.leaf)+'</code>')).join('');
  // ---- pytree explorer
  const PT=D.pytree;
  const parse=p=>{const out=[];p.replace(/\['([^']+)'\]|\[(\d+)\]/g,(m,a,b)=>{out.push(a!=null?a:+b);return ''});return out};
  const root={name:'params',kids:[],leaves:[],path:[]};
  PT.leaves.forEach((l,idx)=>{const toks=parse(l.path);let n=root;n.leaves.push(idx);
    toks.forEach((t,j)=>{let c=n.kids.find(k=>k.name===t);if(!c){c={name:t,kids:[],leaves:[],path:toks.slice(0,j+1)};n.kids.push(c)}c.leaves.push(idx);n=c});n.leaf=l;n.idx=idx});
  const torchName=toks=>{const s=toks.map(String);
    if(s[0]==='tok_emb'||s[0]==='pos_emb')return [s[0]+'.weight',false];
    if(s[0]==='head')return ['head.weight',true];
    if(s[0]==='ln_f')return ['ln_f.'+(s[1]==='scale'?'weight':'bias'),false];
    if(s[0]==='blocks'){const i=s[1];if(s[2]==='ln1'||s[2]==='ln2')return ['blocks.'+i+'.'+s[2]+'.'+(s[3]==='scale'?'weight':'bias'),false];
      return ['blocks.'+i+'.'+s[2]+'.'+s[3]+'.'+(s[4]==='w'?'weight':'bias'),s[4]==='w']}
    return ['?',false]};
  const open=new Set(['','blocks','blocks/0']);
  let sel=null;
  const key=n=>n.path.join('/');
  const size=n=>n.leaves.reduce((a,i)=>a+PT.leaves[i].size,0);
  const lab=n=>typeof n.name==='number'?'['+n.name+']':n===root?'params':'[\''+n.name+'\']';
  function render(n){
    const k=key(n),isLeaf=!!n.leaf,isOpen=open.has(k);
    let h='<button data-k="'+esc(k)+'" class="'+(sel===k?'sel':'')+'" aria-expanded="'+(isLeaf?'':isOpen)+'">'+(isLeaf?'&nbsp;&nbsp;':isOpen?'&#9662; ':'&#9656; ')+'<span class="k">'+esc(lab(n))+'</span> <span class="m">'+(isLeaf?'f32'+JSON.stringify(n.leaf.shape):n.leaves.length+' leaves, '+n0(size(n)))+'</span></button>';
    if(!isLeaf&&isOpen)h+='<span class="ind">'+n.kids.map(render).join('')+'</span>';
    return h;
  }
  const find=k=>{let n=root;if(!k)return n;for(const t of k.split('/')){n=n.kids.find(c=>String(c.name)===t);if(!n)return null}return n};
  function detail(n){
    const el=$('xf-pt-detail');
    if(!n){el.innerHTML='<p class="small mute">Select a node.</p>';return}
    const path=n===root?'params':'params'+n.path.map(t=>typeof t==='number'?'['+t+']':'[\''+t+'\']').join('');
    if(n.leaf){const [tn,tr]=torchName(n.path);
      el.innerHTML='<h3><code>'+esc(path)+'</code></h3><dl class="kv"><dt>abstract value</dt><dd><code>'+esc(n.leaf.dtype)+JSON.stringify(n.leaf.shape)+'</code></dd><dt>parameters</dt><dd>'+n0(n.leaf.size)+' ('+n0(4*n.leaf.size)+' bytes)</dd><dt>leaf index</dt><dd>'+n.idx+' of '+PT.leaves.length+' in <code>jax.tree.leaves(params)</code></dd><dt>PyTorch name</dt><dd><code>'+esc(tn)+'</code>'+(tr?' (stored transposed: PyTorch keeps Linear weights [out, in], this dict keeps [in, out] so the model computes <code>x @ w</code>)':'')+'</dd></dl>'}
    else{const s=size(n);
      el.innerHTML='<h3><code>'+esc(path)+'</code></h3><dl class="kv"><dt>kind</dt><dd>'+(n===root||typeof n.kids[0].name==='string'?'dict':'list')+' with '+n.kids.length+' children</dd><dt>leaves</dt><dd>'+n.leaves.length+' (indices '+n.leaves[0]+' to '+n.leaves[n.leaves.length-1]+' in flatten order)</dd><dt>parameters</dt><dd>'+n0(s)+' ('+(100*s/PT.n_params).toFixed(1)+'% of the model; '+(4*s/1e6).toFixed(2)+' MB in float32)</dd></dl>'+
        (n===root?'<p class="small">One call, <code>jax.tree.leaves(params)</code>, gives all '+PT.n_leaves+' arrays in a fixed order (dict keys sorted); <code>jax.tree.structure(params)</code> gives the shape of the nesting. That pair is what jit hashes for its cache key and what optax walks.</p>':'')}
  }
  const tree=$('xf-pt-tree');
  function draw(){tree.innerHTML=render(root);detail(find(sel||''))}
  tree.addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(!b)return;const k=b.dataset.k,n=find(k);if(!n)return;
    if(!n.leaf){if(open.has(k)&&sel===k)open.delete(k);else open.add(k)}sel=k;draw()});
  sel='';draw();
  $('xf-pt-cnt').innerHTML=stat('leaves',PT.n_leaves,'arrays in the pytree')+stat('parameters',n0(PT.n_params),'all float32')+stat('bytes',(B.param_bytes/1e6).toFixed(2)+' MB','parameters only')+stat('PyTorch state_dict',PT.n_torch_tensors+' tensors','same arrays, flat names');
})();
