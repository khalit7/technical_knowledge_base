// ---- Stride explorer tab (t-tda-str): recorded tensors from src/exp/tensors.py ----
(function(){
const T=window.TDA.ten, E=RD.esc, U=window.TDAU, $=id=>document.getElementById(id);
let base='x', cur=null, sel=-1;
const bases={x:T.bases.x,y:T.bases.y,z:T.bases.z};
function idxs(shape){let out=[[]];shape.forEach(n=>{const nx=[];out.forEach(p=>{for(let i=0;i<n;i++)nx.push(p.concat(i))});out=nx});return shape.length?out:[[]]}
function view(c){ // normalised: shape, stride, offset, logical values, addr per element, storage values, shares
  const n=c.values.length;let addr=c.addr, st, shares=c.shares;
  if(!addr){addr=[...Array(n).keys()];st=c.values.slice()} // a copy: new contiguous storage holding the values in order
  else if(c.storage_values)st=c.storage_values;
  else st=[...Array(c.storage_elems).keys()];
  return {expr:c.expr,shape:c.shape,stride:c.stride,offset:c.offset,contig:c.contig,cl:c.cl_contig,shares,isView:c.is_view,note:c.note,vals:c.values,addr,st,copy:!c.addr};
}
function chips(){const el=$('tda-s-chips');
  if(base==='run'||base==='free'){el.innerHTML='';return}
  el.innerHTML=bases[base].cases.map((c,i)=>'<button data-i="'+i+'"'+(c.shares||c.addr?'':' class="cp" title="copy"')+'>'+E(c.expr)+'</button>').join('');
  el.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>{el.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));pick(view(bases[base].cases[+b.dataset.i]))}));
  el.querySelector('button').classList.add('on');
}
function pick(v){cur=v;sel=-1;an.reset(v.vals.length+1);draw(0)}
function draw(k){ if(!cur)return;
  const v=cur, ix=idxs(v.shape), n=v.vals.length, cnt={};
  v.addr.slice(0,k).forEach(a=>cnt[a]=(cnt[a]||0)+1);
  const focus=sel>=0?sel:k-1;
  $('tda-s-meta').innerHTML=RD.stat('shape',U.sh(v.shape))+RD.stat('strides',U.sh(v.stride))+RD.stat('offset',v.offset)+RD.stat('contiguous',v.contig?'yes':'no',v.cl!==undefined?'channels_last contiguous: '+(v.cl?'yes':'no'):'')+RD.stat('storage',v.copy?'new (a copy)':(v.shares?'shared':'own'),v.isView?'a view (._base set)':(v.copy?'':'not a view in autograd\'s sense'))+(v.note?RD.stat('note',E(v.note)):'');
  // logical layout: groups over all but the last dim
  const last=v.shape.length?v.shape[v.shape.length-1]:1, groups={};
  ix.forEach((t,e)=>{const g=t.slice(0,-1).join(',');(groups[g]=groups[g]||[]).push(e)});
  const lead=v.shape.length>2, rows2=v.shape.length===2;
  let h='';
  if(v.shape.length<=1){h='<div class="tda-row">'+ix.map((t,e)=>cell(e)).join('')+'</div>'}
  else{const outer={};Object.keys(groups).forEach(g=>{const p=g.split(',');const o=p.slice(0,-1).join(',');(outer[o]=outer[o]||[]).push(groups[g])});
    h=Object.entries(outer).map(([o,rs])=>'<div class="tda-grp">'+(lead?'<div class="g">['+o+', :, :]</div>':'')+rs.map(r=>'<div class="tda-row">'+r.map(cell).join('')+'</div>').join('')+'</div>').join('')}
  function cell(e){return '<div class="tda-cell'+(e<k?' on':'')+(e===focus?' cur':'')+'" data-e="'+e+'"><small>'+e+'</small>'+fmtv(v.vals[e])+'</div>'}
  $('tda-s-log').innerHTML=h;
  $('tda-s-stl').textContent=v.copy?'The new storage this copy owns ('+v.st.length+' floats, in its own order)':(v.st===undefined?'':'The storage ('+v.st.length+' floats'+(base==='z'&&v.expr.startsWith('zc')?', channels_last layout of zc':'')+')');
  const fa=focus>=0?v.addr[focus]:-1;
  $('tda-s-st').innerHTML=v.st.map((s,a)=>'<div class="tda-cell'+(cnt[a]?(cnt[a]>1?' two':' on'):' dim')+(a===fa?' cur':'')+'"><small>'+a+'</small>'+fmtv(s)+(cnt[a]>1?'<b>'+cnt[a]+'&times;</b>':'')+'</div>').join('');
  const reads=v.addr.slice(0,k), jumps=reads.filter((a,j)=>j&&a!==reads[j-1]+1).length;
  if(focus>=0){const t=ix[focus];const terms=t.map((i,d)=>i+'&middot;'+v.stride[d]).join(' + ');
    $('tda-s-cap').innerHTML='<div class="t">element ['+t.join(', ')+'] &rarr; storage['+v.addr[focus]+']</div><p>'+(v.copy?'After the copy the element sits at position '+focus+' of the new storage (contiguous strides).':'address = offset '+v.offset+' + '+terms+' = '+v.addr[focus]+' (the recorded value confirms it). ')+' Read so far: '+k+' of '+n+' elements, '+jumps+' non-consecutive jumps in storage'+(Object.values(cnt).some(c=>c>1)?', some cells read more than once (overlap or stride 0)':'')+'.</p>'}
  else $('tda-s-cap').innerHTML='<div class="t">'+E(v.expr)+'</div><p>'+n+' elements over '+v.st.length+' storage cells. Press play, or click an element.</p>';
  $('tda-s-log').querySelectorAll('.tda-cell').forEach(c=>c.addEventListener('click',()=>{sel=+c.dataset.e;draw(Math.max(k,sel+1))}));
}
const fmtv=x=>Number.isInteger(x)?x:(+x).toFixed(1);
const an=RD.anim({card:'tda-s-card',ctl:'tda-s-ctl',n:13,draw:i=>{sel=-1;draw(i)},ms:600,label:'Element'});
// free mode
function free(){const sh=$('tda-s-fshape').value.split(',').map(s=>parseInt(s,10)), st=$('tda-s-fstride').value.split(',').map(s=>parseInt(s,10)), off=parseInt($('tda-s-foff').value,10);
  const bad=sh.some(x=>!(x>=1&&x<=12))||st.length!==sh.length||st.some(x=>isNaN(x))||isNaN(off)||off<0;
  if(bad){$('tda-s-fmsg').innerHTML='<span class="tda-err">Give 1 to 3 sizes of 1 to 12, one stride per size, offset 0 or more.</span>';return}
  if(st.some(x=>x<0)){$('tda-s-fmsg').innerHTML='<span class="tda-err">Negative strides: torch refuses them.</span>';return}
  const ix=idxs(sh);if(ix.length>48){$('tda-s-fmsg').innerHTML='<span class="tda-err">At most 48 elements here.</span>';return}
  const addr=ix.map(t=>off+t.reduce((a,i,d)=>a+i*st[d],0));const mx=Math.max(...addr);
  if(mx>11){$('tda-s-fmsg').innerHTML='<span class="tda-err">Reads storage['+mx+'] but x has 12 elements. torch refuses such a header; recorded for x.as_strided((3, 4), (4, 1), 2): "'+E(T.errors['x.as_strided((3, 4), (4, 1), 2)'].replace('RuntimeError: ',''))+'"</span>';return}
  let exp=1, contig=true;for(let d=sh.length-1;d>=0;d--){if(sh[d]>1&&st[d]!==exp)contig=false;exp*=sh[d]}
  $('tda-s-fmsg').innerHTML='x.as_strided(('+sh.join(', ')+'), ('+st.join(', ')+'), '+off+')';
  pick({expr:'as_strided',shape:sh,stride:st,offset:off,contig,shares:true,isView:true,note:'computed in the browser',vals:addr.slice(),addr,st:[...Array(12).keys()],copy:false});
}
['tda-s-fshape','tda-s-fstride','tda-s-foff'].forEach(id=>$(id).addEventListener('input',free));
$('tda-s-neg').textContent='"'+T.errors['x.as_strided((3, 4), (-4, 1), 8)'].replace('RuntimeError: ','')+'"';
// running example panel
$('tda-s-run').innerHTML='<p>One <code>qkv</code> Linear output of block 0 (batch 8, 64 positions, 768 = 3 &times; 256 features), split into q, k, v and into 4 heads of 64, exactly as the model does. Recorded on the CPU:</p>'+U.table(['tensor','shape','strides','offset','contiguous','shares qkv\'s storage','storage bytes'],T.running.map(r=>['<code>'+E(r.name)+'</code>',U.sh(r.shape),U.sh(r.stride),r.offset,r.contig?'yes':'no',r.shares_qkv?'yes':'no',U.fmt(r.bytes)]))+'<p class="small">Read it: q, k and v differ only in their offset (0, 256, 512): each row of the (512, 768) block holds one position\'s q, k and v side by side, so k for position 0 starts 256 floats in. The head split is a view with strides (49152, 64, 768, 1): moving one head is 64 floats, moving one position is a whole row of 768. Attention reads these strided views directly. Its output is a new storage of 524,288 bytes whose strides (16384, 64, 256, 1) already put each position\'s 4 heads side by side, so <code>y.transpose(1, 2)</code> is contiguous and the model\'s <code>.contiguous()</code> copies nothing on the CPU.</p>';
RD.seg($('tda-s-base'),m=>{base=m;$('tda-s-free').hidden=m!=='free';$('tda-s-run').hidden=m!=='run';$('tda-s-card').hidden=m==='run';
  $('tda-s-basecode').innerHTML=bases[m]?'<code>'+E(bases[m].expr)+'</code>'+(m==='z'?' and <code>zc = z.contiguous(memory_format=torch.channels_last)</code>':''):'';
  chips();if(bases[m])pick(view(bases[m].cases[0]));else if(m==='free')free();});
$('tda-s-basecode').innerHTML='<code>'+E(bases.x.expr)+'</code>';chips();pick(view(bases.x.cases[0]));
(window.TAB_RENDER=window.TAB_RENDER||{})['t-tda-str']=[()=>an.redraw()];
})();
