// ---- Page-wide helpers (predict widgets, source quotes) and Reading section 1 (tensors). Data: window.TDA (22_tda_data.js) ----
(function(){
const D=window.TDA, E=RD.esc, $=id=>document.getElementById(id);
const fmt=n=>Number(n).toLocaleString('en-US');
window.TDAU={fmt,
  sh:a=>'('+a.join(', ')+(a.length===1?',':'')+')',
  mb:b=>(b/1e6).toFixed(2)+' MB',
  table(head,rows,cls){return '<table class="'+(cls||'rd-tbl')+'"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table>'}
};
const U=window.TDAU;
// predict-then-reveal, anywhere on the page
document.querySelectorAll('[data-pr]').forEach(p=>{p.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
  p.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(x.hasAttribute('data-ok'))x.classList.add('right')});
  if(!b.hasAttribute('data-ok'))b.classList.add('wrong');p.querySelector('.ans').hidden=false}))});
// source quotes: <div class="tda-q" data-q="key" data-hl="line,line"></div>
document.querySelectorAll('.tda-q[data-q]').forEach(el=>{const q=D.src[el.dataset.q];if(!q){el.textContent='missing quote '+el.dataset.q;return}
  const hl=(el.dataset.hl||'').split(',').filter(Boolean).map(Number);
  const lines=q.text.split('\n').map((l,i)=>{const n=q.start+i;return '<span'+(hl.includes(n)?' class="h"':'')+'>'+E(l)+'</span>'}).join('\n');
  el.innerHTML='<div class="cap">'+E(q.caption)+' <a href="'+q.url+'" target="_blank" rel="noopener noreferrer">'+q.file.split('/').pop()+' L'+q.start+'&ndash;'+q.end+' @ v2.14.1</a></div><pre>'+lines+'</pre>'});

const T=D.ten;
// 1.1 view table
(function(){const cs=T.bases.x.cases;const pick=['x','x.t()','x[1]','x[:, 1]','x[1:, 1:3]','x[:, ::2]','x.view(2, 6)','x[0:1].expand(3, 4)','x.diagonal()','x.unfold(1, 2, 1)','x.detach()','x.reshape(12)','x.t().reshape(12)','x.t().contiguous()','x.flip(0)','x[[0, 2]]'];
  const rows=pick.map(p=>cs.find(c=>c.expr===p)).map(c=>['<code>'+E(c.expr)+'</code>',U.sh(c.shape),U.sh(c.stride),c.offset,c.contig?'yes':'no',c.shares?'<b style="color:var(--good)">yes</b>':'<b style="color:var(--bad)">no: copy</b>','<span class="small">'+E(c.values.slice(0,8).map(v=>Math.round(v)).join(' ')+(c.values.length>8?' &hellip;':''))+'</span>']);
  $('tda-viewtbl').innerHTML=U.table(['expression','shape','strides','offset','contiguous','same storage','values read, in order'],rows);})();
$('tda-err-view').textContent='"'+T.errors['x.t().view(12)'].replace('RuntimeError: ','')+'"';
$('tda-err-neg').textContent='"'+T.errors['x.as_strided((3, 4), (-4, 1), 8)'].replace('RuntimeError: ','')+'"';
// 1.2 animation: x.t() view against x.t().contiguous() copy, same input
(function(){const cs=T.bases.x.cases, tv=cs.find(c=>c.expr==='x.t()'), tc=cs.find(c=>c.expr==='x.t().contiguous()');
  let mode='view';const n=12;
  function draw(i){ // i: number of logical elements visited (0..12)
    const k=Math.min(i,n);let log='',st='',nw='';
    for(let e=0;e<n;e++){const v=tv.values[e];if(e%3===0)log+=(e?'</div>':'')+'<div style="display:flex;gap:3px;margin:3px 0">';log+='<div class="tda-cell'+(e<k?' on':'')+(e===k-1?' cur':'')+'"><small>'+e+'</small>'+v+'</div>'}log+='</div>';
    const touched=new Set(tv.addr.slice(0,k));
    for(let a=0;a<n;a++)st+='<div class="tda-cell'+(touched.has(a)?' on':'')+(k&&a===tv.addr[k-1]?' cur':'')+'"><small>'+a+'</small>'+a+'</div>';
    for(let a=0;a<n;a++)nw+='<div class="tda-cell'+(mode==='copy'&&a<k?' cp':' dim')+'"><small>'+a+'</small>'+(mode==='copy'&&a<k?tc.values[a]:'')+'</div>';
    $('tda-ctg-log').innerHTML=log;$('tda-ctg-log').style.display='block';$('tda-ctg-st').innerHTML=st;$('tda-ctg-new').innerHTML=nw;
    $('tda-ctg-nl').textContent=mode==='copy'?'New storage written by contiguous(): '+n+' floats, '+n*4+' bytes, strides (3, 1)':'No new storage: x.t() is strides (1, 4) over the same 12 floats';
    const e=k-1, a=e>=0?tv.addr[e]:null, r=e>=0?Math.floor(e/3):0, c=e>=0?e%3:0;
    $('tda-ctg-cap').innerHTML=k===0?'<div class="t">Step 0: the header</div><p>x.t() has shape (4, 3), strides (1, 4), offset 0. Press play to read it row by row.</p>':
      '<div class="t">Element ['+r+', '+c+'] = storage['+a+']</div><p>address = 0 + '+r+'&times;1 + '+c+'&times;4 = '+a+'. '+(mode==='copy'?'contiguous() copies it to position '+e+' of a new storage, so the copy reads in order afterwards.':'The view reads it in place: consecutive elements are 4 apart in memory, which is why view(12) cannot describe it.')+'</p>';
    $('tda-ctg-cnt').innerHTML=RD.stat('elements read',k+' / 12')+RD.stat('bytes copied',mode==='copy'?k*4:0,'recorded: shares storage '+(mode==='copy'?'no':'yes'))+RD.stat('jumps in storage order',tv.addr.slice(0,k).filter((v,j)=>j&&v!==tv.addr[j-1]+1).length);
  }
  const an=RD.anim({card:'tda-ctg-card',ctl:'tda-ctg-ctl',n:n+1,draw,ms:700,label:'Element'});
  RD.seg($('tda-ctg-seg'),m=>{mode=m;an.reset(n+1);an.play()});
})();
// 1.3 channels_last
(function(){const z=T.bases.z.cases, f=T.cl_facts;
  const rows=[['<code>z</code> (NCHW)',U.sh(z[0].shape),U.sh(z[0].stride),'yes','no',z[0].values.slice(0,8).join(' ')+' &hellip;'],
    ['<code>z.contiguous(memory_format=torch.channels_last)</code>',U.sh(z[1].shape),U.sh(z[1].stride),'no','yes',z[1].storage_values.slice(0,8).join(' ')+' &hellip;'],
    ['<code>zc + 1</code>','same',U.sh(f['(zc + 1).stride']),'no',f['(zc + 1) keeps channels_last']?'yes':'no',''],
    ['<code>nn.Conv2d(3, 4, 1)(zc)</code>',U.sh(f['conv(zc) shape']),U.sh(f['conv(zc).stride']),'no',f['conv(zc) channels_last']?'yes':'no','']];
  $('tda-cl').innerHTML=U.table(['tensor','shape','strides','is_contiguous()','channels_last contiguous','storage in memory order'],rows)+
   '<p class="small mute">z = torch.arange(24.).view(2, 3, 2, 2) (N 2, C 3, H 2, W 2). In channels_last memory the first pixel\'s three channels (0, 4, 8) sit next to each other. Recorded with torch 2.14.1.</p>';
  const tm=D.tim&&D.tim.conv;
  if(tm){const a=tm['NCHW (contiguous)'],b=tm['channels_last'];$('tda-cl-time').innerHTML='Does it pay on a CPU? A 3 &times; 3 convolution, 64 to 64 channels, on (8, 64, 56, 56) took '+a.median_ms+' ms in NCHW against '+b.median_ms+' ms in channels_last <span class="meas">measured on Apple M1 Pro, CPU, 4 threads, median of 3 &times; torch.utils.benchmark</span> (trials '+a.ms.join(', ')+' and '+b.ms.join(', ')+'). On NVIDIA GPUs the gain with tensor-core convolutions is the documented reason for the format; not run here.'}
  else $('tda-cl-time').textContent='';})();
// 1.4 promotion grid, cases, finfo
(function(){const d=T.dtypes, P=T.promote, ab={bool:'bool',uint8:'u8',int8:'i8',int16:'i16',int32:'i32',int64:'i64',float16:'f16',bfloat16:'bf16',float32:'f32',float64:'f64',complex64:'c64',complex128:'c128'};
  const col=t=>t==='bool'?'var(--soft)':/^u?int/.test(t)?'var(--closed2)':/complex/.test(t)?'var(--hl)':'var(--open2)';
  let h='<table class="tda-pgrid"><thead><tr><th></th>'+d.map(t=>'<th>'+ab[t]+'</th>').join('')+'</tr></thead><tbody>';
  d.forEach((r,i)=>{h+='<tr><th>'+ab[r]+'</th>'+d.map((c,j)=>{const v=P[i][j];const odd=v!==r&&v!==c;return '<td style="background:'+col(v)+'"'+(odd?' class="hl" title="neither input"':'')+'>'+ab[v]+'</td>'}).join('')+'</tr>'});
  $('tda-pgrid').innerHTML=h+'</tbody></table><p class="small mute">Outlined cells: the result is neither input (bfloat16 with float16 gives float32; uint8 with int8 gives int16). Colour = category: bool, integer, floating, complex.</p>';
  $('tda-promo').innerHTML=U.table(['expression','result dtype','value','why'],T.promo_cases.map(c=>['<code>'+E(c.case)+'</code>',c.result==='error'?'<span class="tda-err">error</span>':'<b>'+c.result+'</b>','<span class="small">'+E(c.value.join(', '))+'</span>',E(c.note)]))+
   '<p class="small">In place: <code>int64_tensor.add_(0.5)</code> raised <span class="tda-err">'+E(T.inplace_promo_error)+'</span>; <code>float32_tensor.add_(int64_tensor)</code> is fine (the result fits the destination). Default dtype: '+T.default_dtype.replace('torch.','')+'.</p>';
  const F=T.finfo;$('tda-finfo').innerHTML=U.table(['dtype','bits','eps (1 ulp at 1.0)','largest','smallest normal'],['float16','bfloat16','float32','float64'].map(k=>[k,F[k].bits,F[k].eps.toPrecision(4),F[k].max.toPrecision(5),F[k].smallest_normal.toPrecision(4)]));})();
$('tda-pinwarn').textContent='"'+D.dl.pin_memory_warning[0]+'"';
// 1.6 versions
$('tda-vers').innerHTML=U.table(['line','a._version','b._version (b = a[1:])'],T.versions.map(v=>['<code>'+E(v.line)+'</code>',v.a,v.b]));
$('tda-infver').textContent='"'+T.meta['inference tensor']._version.replace('RuntimeError: ','')+'"';
})();
