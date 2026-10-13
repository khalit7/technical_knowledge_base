// ---- Dispatcher walker tab (t-tda-dsp) ----
(function(){
const S=window.TDA.dsp, E=RD.esc, U=window.TDAU, $=id=>document.getElementById(id);
const W=S.walk;
const ladder=[['AutocastCPU','var(--c5)'],['AutogradCPU','var(--c4)'],['ADInplaceOrView','var(--c6)'],['Python (TorchDispatchMode)','var(--c2)'],['CPU','var(--c1)'],['Meta','var(--c3)']];
function why(w,k){const nm=w.name;
  if(k==='AutocastCPU')return 'excluded: Autocast keys are in the excluded set unless autocast is on';
  if(k==='AutogradCPU'){if(nm.includes('inference_mode'))return 'excluded: inference_mode adds every autograd key to the excluded set';if(nm.includes('inference tensor'))return 'not in the key set: an inference tensor carries only CPU and AutocastCPU';if(nm.includes('meta'))return 'not this key: a meta tensor carries AutogradMeta; the boxed autograd fallback ran there, invisible to this log';return ''}
  if(k.startsWith('Python'))return 'not in the key set: no mode is active and no subclass is involved';
  if(k==='CPU')return nm.includes('meta')?'not in the key set: the tensor is on the meta device':'';
  if(k==='Meta')return nm.includes('meta')?'':'not in the key set: no meta tensor';return ''}
const job={AutocastCPU:'casts the input to bfloat16, calls the op again with AutocastCPU excluded',AutogradCPU:'records a node if grad mode is on and an input requires grad (this op has none to record), then redispatches with the autograd keys masked',ADInplaceOrView:'nothing to do for a non-view, non-in-place op: redispatch below','Python (TorchDispatchMode)':'calls the active mode\'s __torch_dispatch__, which logs and calls the op again',CPU:'the arithmetic, x * 2',Meta:'the output shape only'};
function hops(w,k){return ladder.map(([key,c])=>{const vi=w.visits.findIndex(x=>x.key===key);const r=why(w,key);if(vi<0&&key==='Meta'&&!w.name.includes('meta'))return '';if(vi<0&&key==='CPU'&&w.name.includes('meta'))return '<div class="tda-hop off skip" style="--sc:'+c+'"><b>CPU</b><span>'+r+'</span></div>';
  const st=vi<0?(r||'not reached'):(vi<k?'ran #'+(vi+1)+(w.visits[vi].keyset?': key set ['+w.visits[vi].keyset.join(', ')+']':': called by the Python fallback')+', input '+w.visits[vi].dtype+', grad mode '+(w.visits[vi].grad_mode?'on':'off'):'next'+(vi===k?'':' (step '+(vi+1)+')'));
  return '<div class="tda-hop'+(vi===k-1?' on':'')+(vi<0?' off skip':'')+'" style="--sc:'+c+'"><b>'+key+'</b><span>'+E(st)+'</span></div>'}).join('')}
const sa=$('tda-dw-a'), sb=$('tda-dw-b');
[sa,sb].forEach((s,j)=>{s.innerHTML=W.map((w,i)=>'<option value="'+i+'">'+E(w.name)+'</option>').join('');s.value=j?3:0});
function draw(k){const a=W[+sa.value], b=W[+sb.value];
  [[a,'a'],[b,'b']].forEach(([w,s])=>{$('tda-dw-c'+s).textContent=w.code;$('tda-dw-h'+s).innerHTML=hops(w,k);
    $('tda-dw-r'+s).innerHTML=k>=w.visits.length?'Result: '+(w.result.error?'<span class="tda-err">'+E(w.result.error)+'</span>':w.result.dtype+' on '+w.result.device)+'. '+w.visits.length+' kernels ran.':''});
  const n=Math.max(a.visits.length,b.visits.length);
  const pick=(w)=>k>0&&k<=w.visits.length?w.visits[k-1].key:'(done)';
  $('tda-dw-cap').innerHTML=k===0?'<div class="t">Step 0</div><p>Left: '+a.visits.length+' kernels. Right: '+b.visits.length+' kernels. Step through them side by side.</p>':'<div class="t">Kernel '+k+': left '+E(pick(a))+', right '+E(pick(b))+'</div><p>'+E(job[pick(a)]||'')+'</p>';
  an&&an.n!==n+1&&0;}
let an=null;
function steps(){return Math.max(W[+sa.value].visits.length,W[+sb.value].visits.length)+1}
an=RD.anim({card:'tda-dw-card',ctl:'tda-dw-ctl',n:steps(),draw,ms:1300,label:'Kernel'});
[sa,sb].forEach(s=>s.addEventListener('change',()=>an.reset(steps())));
// B: aten calls
const A=S.aten_calls, calls=[...new Set(A.map(a=>a.call))], ctxs=[...new Set(A.map(a=>a.ctx))];
const ctxTls={'training':'default','no_grad':'no_grad','inference_mode':'inference_mode','autocast bf16':'autocast_cpu_bf16'};
const opOf={'torch.mm(x, w)':'aten::mm','F.linear(x, lin.weight, lin.bias)':'aten::linear','x.view(2048)':'aten::view','w2 = w.clone(); w2.add_(1)':'aten::add_.Tensor'};
const ca=$('tda-da-call'), cx=$('tda-da-ctx');ca.innerHTML=calls.map(c=>'<option>'+E(c)+'</option>').join('');cx.innerHTML=ctxs.map(c=>'<option>'+E(c)+'</option>').join('');
const prio=['AutocastCPU','AutogradCPU','ADInplaceOrView','Python','BackendSelect','CPU'];
function drawB(){const r=A.find(a=>a.call===ca.value&&a.ctx===cx.value);const op=opOf[r.call], tb=S.tables[op], tl=S.tls[ctxTls[r.ctx]];
  // effective keys of the main input: its keys (recorded at the Python key) plus TLS included minus excluded
  const inKeys=r.bottom.length?r.bottom[r.bottom.length-1].in_keys[0]:[];
  const srcKeys=r.ctx==='inference_mode'&&r.call.startsWith('w2')?['CPU','AutocastCPU']:['CPU','ADInplaceOrView','AutogradCPU','AutocastCPU'];
  const eff=prio.filter(k=>(srcKeys.includes(k)||tl.include.includes(k))&&!(tl.exclude.includes(k)||(k==='AutogradCPU'&&!tl.effective_cpu.includes('AutogradCPU'))));
  const route=eff.map(k=>{const slot=tb[k];const kind=slot?slot.kind:'empty';return '<div class="tda-hop'+(kind==='fallthrough'?' off skip':'')+'" style="--sc:var(--c'+(1+prio.indexOf(k))+')"><b>'+k+'</b><span>'+kind+(slot?' ('+E(slot.file)+')':'')+'</span></div>'}).join('');
  $('tda-da-out').innerHTML='<div class="tda-two"><div><div class="tda-lbl">Route, reconstructed: effective keys in priority order and the slot each has in '+op+'\'s table</div><div class="tda-hops">'+route+'</div><p class="small mute">The first non-fallthrough slot runs; a math kernel or an autograd kernel calls further ops, which start their own walk below it.</p></div>'+
   '<div><div class="tda-lbl">Seen at the top (TorchFunctionMode, before the dispatcher)</div><div class="tda-ops">'+r.top.map(t=>'<span>'+E(t)+'</span>').join('')+'</div>'+
   '<div class="tda-lbl">Seen at the Python key (TorchDispatchMode, below autograd)</div><div class="tda-ops">'+r.bottom.map(b=>'<span'+(b.out_dtype==='bfloat16'?' class="bf"':'')+'>'+E(b.op)+' &rarr; '+(b.out_dtype||'')+'</span>').join('')+'</div>'+
   U.table(['result',''],[['dtype',r.out_dtype],['grad_fn',r.grad_fn||'None'],['keys',r.out_keys.join(', ')],['inference tensor',r.is_inference]])+'</div></div>';}
[ca,cx].forEach(s=>s.addEventListener('change',drawB));drawB();
(window.TAB_RENDER=window.TAB_RENDER||{})['t-tda-dsp']=[()=>an.redraw()];
})();
