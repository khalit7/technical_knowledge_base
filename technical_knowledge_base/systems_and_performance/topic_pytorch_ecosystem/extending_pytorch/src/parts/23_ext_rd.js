// ---- Extending PyTorch, Reading tab: data fills, quotes, tables (data: window.EXT from 22_ext_data.js) ----
window.EXTL={native:'F.gelu (reference)',pybind:'Direct call (pybind11)',kernel_only:'custom_op: kernel only',kernel_fake:'custom_op: + fake',full:'custom_op: + fake + autograd',undeclared_mutation:'Undeclared mutation',wrong_fake:'Wrong fake',cpp_bare:'C++ TORCH_LIBRARY, nothing else',cpp_late:'C++ + Python registrations, made late',cpp_full:'C++ + Python registrations, at import'};
window.EXTU=(function(){
  const E=window.EXT,esc=RD.esc;
  function get(path){let o=E;for(const k of path.split('/')){if(o==null)return undefined;o=o[/^\d+$/.test(k)&&Array.isArray(o)?+k:k]}return o}
  function fmt(v,f){
    if(v===undefined||v===null)return '?';
    if(f==='raw')return esc(Array.isArray(v)?'['+v.join(', ')+']':String(v));
    if(typeof v!=='number')return esc(String(v));
    if(f==='i')return Math.round(v).toLocaleString('en-US');
    if(f==='mb')return (v/1e6).toFixed(2);
    if(f==='e'){if(v===0)return '0';const s=v.toExponential(1).split('e');return s[0]+'&times;10<sup>'+(+s[1])+'</sup>'}
    if(/^\d$/.test(f||''))return v.toLocaleString('en-US',{minimumFractionDigits:+f,maximumFractionDigits:+f});
    return String(v);
  }
  function fill(root){(root||document).querySelectorAll('[data-v]').forEach(el=>{const [p,f]=el.dataset.v.split('|');el.innerHTML=fmt(get(p),f)})}
  function quotes(root){(root||document).querySelectorAll('[data-q]').forEach(el=>{const q=E.quotes[el.dataset.q];if(!q)return;
    if(el.classList.contains('ext-qh'))el.innerHTML='<a href="'+q.url+'" target="_blank" rel="noopener noreferrer"><code>'+esc(q.path)+'</code> lines '+q.first+(q.last>q.first?'&ndash;'+q.last:'')+'</a>'+(q.url.includes('/ao/')?' (torchao v0.18.0)':q.url.includes('/helion/')?' (Helion v1.4.0)':' (PyTorch v2.14.1)');
    else el.textContent=q.text})}
  const tbl=(head,rows,cls)=>'<div class="tw"><table class="rd-tbl '+(cls||'')+'"><thead><tr>'+head.map(h=>'<th>'+h+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+c+'</td>').join('')+'</tr>').join('')+'</tbody></table></div>';
  function bars(el,items,unit,dec){const mx=Math.max(...items.map(i=>i.v));
    el.innerHTML=items.map(i=>'<div class="row'+(i.hl?' hl':'')+'"><div class="nm">'+i.k+(i.sub?'<span class="ml">'+i.sub+'</span>':'')+'</div><div class="track"><div class="fill" style="width:'+(100*i.v/mx).toFixed(1)+'%;background:'+(i.c||'var(--acc)')+'"></div></div><div class="val">'+i.v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})+' '+unit+'</div></div>').join('')}
  // horizontal bars drawn as SVG at the measured width; items {k (plain text), sub, v, c}
  function svgBars(el,items,unit,dec){const W=RD.width(el),wide=W>=560,mx=Math.max(...items.map(i=>i.v));
    const lw=wide?Math.min(230,W*0.34):0,vw=78,bx=lw+4,bw=Math.max(60,W-bx-vw-6),rh=wide?34:46;let y=4,b='';
    items.forEach(i=>{const ty=wide?y+13:y+12,by=wide?y+3:y+18,w=Math.max(2,bw*i.v/mx);
      if(wide){b+=RD.t(0,ty,esc(i.k),{fs:12,fill:'var(--ink)'});if(i.sub)b+=RD.t(0,ty+14,esc(i.sub),{fs:11,fill:'var(--mute)'})}
      else{b+=RD.t(0,ty,esc(i.k)+(i.sub?'  ('+esc(i.sub)+')':''),{fs:11.5,fill:'var(--ink)'})}
      b+='<rect x="'+bx+'" y="'+by+'" width="'+w.toFixed(1)+'" height="16" rx="3" fill="'+(i.c||'var(--acc)')+'"/>';
      b+=RD.t(bx+w+5,by+12.5,i.v.toLocaleString('en-US',{minimumFractionDigits:dec,maximumFractionDigits:dec})+' '+unit,{fs:12,fill:'var(--ink)',w:600});
      y+=rh});
    el.innerHTML=RD.svg(W,y+2,b,'bar chart')}
  return {get,fmt,fill,quotes,tbl,bars,svgBars,esc};
})();
(function(){
  const E=window.EXT,U=window.EXTU,esc=RD.esc,$=id=>document.getElementById(id);
  U.fill($('t-read'));U.quotes($('t-read'));
  // predict-then-reveal
  document.querySelectorAll('#t-read .pr').forEach(pr=>{const ok=+pr.dataset.ok,ans=pr.querySelector('.ans');
    pr.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      pr.querySelectorAll('.opts button').forEach(x=>{x.classList.remove('right','wrong');if(+x.dataset.a===ok)x.classList.add('right')});
      if(+b.dataset.a!==ok)b.classList.add('wrong');ans.hidden=false}))});
  // 1.2 schemas
  $('ext-schemas').innerHTML=U.tbl(['Python signature','mutates_args','Inferred schema'],E.schemas.map(s=>['<code>'+esc(s.python)+'</code>',s.mutates_args.length?'<code>'+esc(s.mutates_args.join(', '))+'</code>':'()',s.schema?'<code>'+esc(s.schema)+'</code>':'<span class="ext-err">'+esc(s.error)+'</span>']));
  // 1.4 data-dependent graph
  $('ext-dd').textContent=E.dd.graph;
  // 1.6 dispatch dump of the two-device op
  $('ext-mpsdump').textContent=(E.mps.dispatch_lines||[]).join('\n');
  // 1.7 opcheck grid
  const T=['test_schema','test_autograd_registration','test_faketensor','test_aot_dispatch_dynamic'];
  const order=['native','pybind','kernel_only','kernel_fake','full','undeclared_mutation','wrong_fake','cpp_bare','cpp_late','cpp_full'];
  const cell=o=>!o?'<span class="mute">n/a</span>':o.ok?'<span class="ok" title="passed">pass</span>':'<span class="bad" title="'+esc(o.msg||'')+'">fail</span>';
  $('ext-opgrid').innerHTML=U.tbl(['Variant','schema','autograd reg.','fake','aot dispatch','graphs / breaks','compiled grads'],order.map(k=>{const v=E.variants[k];
    const gb=v.graphs==null?'<span class="bad">error</span>':v.graphs+' / '+v.breaks;
    const cg=!v.comp_ok?'<span class="bad">error</span>':(v.comp_grad_diff>1e-3?'<span class="bad">wrong ('+v.comp_grad_diff.toFixed(2)+')</span>':'<span class="ok">match</span>');
    return [EXTL[k]].concat(T.map(t=>cell(v.opcheck[t]))).concat([gb,cg])}),'tbl-sm');
  // 2.2 inductor wrapper calls
  $('ext-ind-native').textContent=E.inductor.native.calls.join('\n');
  $('ext-ind-custom').textContent=E.inductor.custom_op.calls.join('\n');
  // 2.3 cache trap
  $('ext-trap').innerHTML=U.tbl(['Process','Registrations','Cache settings','Parameters with no gradient'],E.trap.map((r,i)=>[String(i+1),r.mode==='late'?'after a first trace':'at import',Object.keys(r.env).length?'<code>'+esc(Object.entries(r.env).map(([a,b])=>a+'='+b).join(' '))+'</code>':'shared cache',(r.no_grad_params?'<span class="bad">':'<span class="ok">')+r.no_grad_params+' of '+r.params+'</span>']));
  // 3.1 dispatch dump of the C++ op
  $('ext-cppdump').textContent=(E.dispatch_cpp||[]).join('\n');
  // 3.2 per-call bars
  const callNote={'small (64)':'Per call on 64 floats: almost all of it is overhead (Python, dispatcher, allocation).','mlp (8,64,1024)':'Per call on one MLP activation of the running example (524,288 floats): the kernel dominates.'};
  let callM='small (64)';
  function drawCalls(m){if(m)callM=m;m=callM;const c=E.timing.calls_cpu[m];const us=m.startsWith('small');
    U.svgBars($('ext-call-bars'),Object.entries(c).map(([k,v],i)=>({k,v:us?v.median_us:v.median_us/1000,c:['var(--c3)','var(--c1)','var(--c4)','var(--c2)'][i],sub:'runs '+v.runs_us.map(x=>us?x.toFixed(2):(x/1000).toFixed(2)).join(', ')})),us?'\u00b5s':'ms',2);
    $('ext-call-note').textContent=callNote[m]}
  RD.seg($('ext-call-seg'),drawCalls);drawCalls();RD.onRender(()=>drawCalls());RD.onResize(()=>drawCalls());
  // 4.1 shader, 4.3 helion
  $('ext-shader').textContent=E.mps.shader||'';
  const hk=E.helion.kernels;
  $('ext-helion-code').textContent=(hk.gelu.code||'');
  $('ext-helion-tbl').innerHTML=U.tbl(['Helion kernel (metal backend)','Result on MPS','Ref mode on the CPU'],[
    ['tanh GELU (8, 64, 1024)','<span class="ok">ran</span>, max error '+U.fmt(hk.gelu.max_abs_err,'e')+' against <code>F.gelu(approximate="tanh")</code>','n/a'],
    ['exact GELU with <code>torch.erf</code>','<span class="bad">failed</span>: <span class="ext-err">InductorLoweringError at '+esc(hk.gelu_erf.error_node||'')+'</span>','ran, error '+U.fmt(E.helion.ref.gelu_erf,'e')],
    ['row softmax (512, 64)','<span class="bad">failed</span>: <span class="ext-err">'+esc((hk.softmax_rows.error||'').split(/\s*While processing/)[0])+'</span>','ran, error '+U.fmt(E.helion.ref.softmax_rows,'e')]]);
  // 5.1 levels table
  const lv=E.levels;
  $('ext-lv-rows').innerHTML=[['function','<code>__torch_function__</code> (plain subclass)'],['dispatch','<code>__torch_dispatch__</code> wrapper, outputs rewrapped'],['dispatch_unwrap','<code>__torch_dispatch__</code> wrapper, plain outputs']].map(([k,l])=>'<tr><td>'+l+'</td><td>'+lv[k].nf+'</td><td>'+lv[k].nb+'</td><td><code>'+lv[k].loss_type+'</code></td><td><code>'+lv[k].grad_type+'</code></td></tr>').join('');
  // 5.3 int8 stats
  const q=E.int8,st=RD.stat;
  $('ext-int8-stats').innerHTML=st('Block weights, float32',(q.bytes_float/1e6).toFixed(2)+' MB',q.n_quantized+' matrices')+st('Same, Int8Weight',(q.bytes_int8/1e6).toFixed(2)+' MB','int8 qdata + float32 scales')+st('Loss, step 0',q.eager_loss.toFixed(6),'float32: '+E.sub_ref_loss.toFixed(6))+st('Parameters with gradients',q.trainable_with_grad+' of '+q.trainable,'trainable; '+q.frozen_int8+' int8 frozen');
  const ops=o=>Object.entries(o).map(([k,v])=>'<code>'+esc(k)+'</code> &times;'+v).join(', ');
  $('ext-int8-fw').innerHTML=ops(q.eager_forward_ops);$('ext-int8-bw').innerHTML=ops(q.eager_backward_ops);
  // 5.4 AOT graph excerpt and torchao calls
  $('ext-aot').textContent=q.aot_fw_head.slice(2,7).join('\n');
  const ao=E.real.find(r=>r.aten_calls);$('ext-ao-calls').innerHTML=ao?ao.aten_calls.map(c=>'<code>'+esc(c)+'</code>').join(', '):'';
  const fw=E.timing.int8_forward_cpu;
  const drawFw=()=>U.svgBars($('ext-int8-bars'),Object.entries(fw).map(([k,v])=>({k,v:v.median_ms,c:k.includes('int8')?'var(--c4)':'var(--c1)',sub:'runs '+v.runs_ms.join(', ')})),'ms',2);
  drawFw();RD.onRender(drawFw);RD.onResize(drawFw);
  // 5.5 real subclasses
  $('ext-real').innerHTML=U.tbl(['Tensor','Class','Inner tensors (from __tensor_flatten__)','Bytes'],E.real.map(r=>[esc(r.label),'<code>'+esc((r['class']||'').split('.').pop())+'</code>',
    r.inner?r.inner.map(i=>'<code>'+esc(i.name)+'</code> '+(i.dtype?esc(i.dtype.replace('torch.',''))+' ['+i.shape.join(', ')+']':esc(i.type||''))).join('<br>'):'(plain tensor: its own storage)',
    (r.inner_bytes||1048576).toLocaleString('en-US')]),'tbl-sm');
})();
