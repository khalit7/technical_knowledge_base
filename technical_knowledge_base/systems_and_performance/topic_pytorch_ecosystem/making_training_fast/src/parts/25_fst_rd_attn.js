// ---- Reading sections 10 and 11: attention memory and backends, FlexAttention notes, torchao ----
(function(){
  const D=window.FST,U=window.FU,$=U.$,esc=RD.esc;
  // ---- attention memory ----
  const SV=D.attn.saved;
  U.seg($('fst-attmem-seg'),[['cpu','CPU'],['mps','MPS']],dev=>{
    const rows=[];const mx=Math.max(...SV.filter(s=>s.device===dev).map(s=>s.saved_bytes))/1e6;
    [256,1024,2048].forEach(T=>['sdpa','manual'].forEach(h=>{const s=SV.find(x=>x.device===dev&&x.T===T&&x.how===h);
      rows.push({nm:'T = '+U.comma(T)+', '+(h==='sdpa'?'SDPA':'written out'),ml:s.saved_shapes.map(x=>'('+x.join(' &times; ')+')').join(' + '),v:s.saved_bytes/1e6,txt:U.f1(s.saved_bytes/1e6)+' MB',col:h==='sdpa'?'var(--c3)':'var(--c2)'})}));
    U.bars($('fst-attmem-bars'),rows,mx)},'cpu');
  const sv=(d,T,h)=>SV.find(x=>x.device===d&&x.T===T&&x.how===h).saved_bytes;
  $('fst-attmem-read').innerHTML='On the CPU, SDPA ran the flash-style CPU kernel and kept the output and one logsumexp per row and head: '+U.mb(sv('cpu',2048,'sdpa'))+' at 2,048 positions, growing linearly ('+U.mb(sv('cpu',256,'sdpa'))+' at 256). Written out, the same attention kept the 8 &times; T &times; T softmax: '+U.mb(sv('cpu',2048,'manual'))+' at 2,048, '+(sv('cpu',2048,'manual')/sv('cpu',2048,'sdpa')).toFixed(0)+' times more, growing with T&sup2;. On MPS, SDPA with gradients takes the math path and keeps the T &times; T matrix too ('+U.mb(sv('mps',2048,'sdpa'))+'): there is no memory-efficient attention for training on Apple GPUs in PyTorch 2.14.1.';
  // ---- SDPA table ----
  const C=D.attn.cases;
  const short=o=>o?o.replace('aten::',''):'';
  U.seg($('fst-sdpa-seg'),[['cpu','CPU'],['mps','MPS']],dev=>{
    let h='<table class="rd-tbl tbl-sm"><thead><tr><th>Inputs</th><th>Kernel that ran</th><th>Error vs float64</th><th>Forcing FLASH</th><th>Forcing EFFICIENT</th></tr></thead><tbody>';
    C.filter(c=>c.device===dev).forEach(c=>{
      const lab=c.dtype+', ('+c.shape.join(', ')+')'+(c.mask?', '+c.mask+' mask':c.is_causal?', is_causal':'')+(c.dropout?', dropout '+c.dropout:'')+(c.requires_grad?', requires_grad':'');
      const f=k=>{const v=c.forced[k]||'';return v.startsWith('error')?'<span class="ann">raises</span>':short(v)};
      h+='<tr><td>'+lab+'</td><td><code>'+short(c.default_ops[c.default_ops.length-1])+'</code></td><td>'+(c.max_abs_err_vs_f64!=null?c.max_abs_err_vs_f64.toExponential(1):'(random dropout)')+'</td><td>'+f('FLASH_ATTENTION')+'</td><td>'+f('EFFICIENT_ATTENTION')+'</td></tr>'});
    $('fst-sdpa-tbl').innerHTML=h+'</tbody></table>'},'cpu');
  const ef=C.find(c=>c.device==='cpu'&&!c.mask&&!c.dropout&&!c.requires_grad&&c.dtype==='float32').forced.EFFICIENT_ATTENTION;
  $('fst-sdpa-read').innerHTML='Three things stand out. On the CPU the flash kernel handled every case except dropout (dropout sends it to math, as the constraint list says), including boolean and float masks and head size 80, and forcing EFFICIENT or cuDNN raises ("'+esc(ef.replace(/^error: \w+: /,''))+'"). On MPS, forcing any backend changes nothing: the same math kernel runs, because the MPS path never consults the backend choice. And bfloat16 is less exact on the same inputs: largest error '+C.find(c=>c.device==='cpu'&&c.dtype==='bfloat16').max_abs_err_vs_f64.toExponential(1)+' against '+C.find(c=>c.device==='cpu'&&c.dtype==='float32').max_abs_err_vs_f64.toExponential(1)+' for float32, as its 8-bit mantissa (against 24) predicts.';
  // ---- FlexAttention summary ----
  const F=D.flex,bm=(T,m)=>F.block_masks.find(b=>b.T===T&&b.mask===m);
  const mpsr=F.runs.filter(r=>r.device==='mps'&&r.compiled_max_abs_err_vs_f64!=null);
  const maxe=Math.max(...mpsr.map(r=>r.compiled_max_abs_err_vs_f64));
  const TF=D.time_flex&&D.time_flex.results;
  let tx='';
  if(TF){const t=(T,m,i)=>{const r=TF.find(x=>x.device==='mps'&&x.T===T&&x.mask===m&&x.impl===i);return r?r.median_ms:NaN};
    tx=' Timed on MPS at 4,096 positions (inference, float32, bench lock), FlexAttention did not win: sliding window '+U.ms(t(4096,'sliding_window','flex compiled'))+' against '+U.ms(t(4096,'sliding_window','sdpa dense mask'))+' for SDPA with the same mask as a dense boolean tensor (a tie), four documents '+U.ms(t(4096,'document_causal','flex compiled'))+' against '+U.ms(t(4096,'document_causal','sdpa dense mask'))+', causal '+U.ms(t(4096,'causal','flex compiled'))+' against '+U.ms(t(4096,'causal','sdpa is_causal'))+' for SDPA with is_causal. Its cost tracks the tiles it visits (sliding window visits fewest), so block sparsity works as designed; the per-tile kernel is just slower than Apple\'s fused SDPA here. The 2.13 release notes claim "up to ~12x speedup over SDPA on sparse patterns" on MPS <span class="vend">vendor</span>; that did not reproduce on this M1 Pro in float32 (other chips, dtypes and sizes not tried).';}
  $('fst-flex-read').innerHTML='What the BlockMask buys, counted here (deterministic): at 4,096 positions a causal mask leaves '+bm(4096,'causal').sparsity_pct.toFixed(1)+'% of the 128 &times; 128 tiles empty, a 128-token sliding window '+bm(4096,'sliding_window').sparsity_pct.toFixed(1)+'%, four packed documents '+bm(4096,'document_causal').sparsity_pct.toFixed(1)+'%. Correctness on MPS (compiled, T = 256, 4 masks and 2 score_mods): largest difference from a float64 reference '+maxe.toExponential(1)+', the same size as SDPA\'s own error.'+tx;
  const VL=D.varlen;
  const first=m=>m.split('. ')[0]+'.';
  $('fst-varlen-read').innerHTML=VL?('Called here: CPU "'+esc(first(VL.cpu))+'"; MPS "'+esc(first(VL.mps))+'" <span class="meas">measured</span>. Not usable on this machine.'):'';
  // ---- torchao table ----
  const AO=D.ao,P=AO.ptq_big_after_150_steps,base=P[0];
  let h='<table class="rd-tbl tbl-sm"><thead><tr><th>Config</th><th>Weight becomes</th><th class="num">Linear bytes</th><th class="num">Loss</th><th class="num">Max logit diff</th></tr></thead><tbody>';
  P.forEach(r=>{h+='<tr><td><code>'+esc(r.config)+'</code></td>'+(r.ok?'<td><code>'+r.weight_type+'</code></td><td class="num">'+U.f1(r.linear_bytes/1e6)+' MB</td><td class="num">'+r.eval_loss.toFixed(4)+'</td><td class="num">'+(r.max_abs_logit_diff!=null?r.max_abs_logit_diff.toFixed(3):'')+'</td>':'<td colspan="4"><span class="ann">fails here:</span> '+esc(r.error)+'</td>')+'</tr>'});
  $('fst-ao-tbl').innerHTML=h+'</tbody></table>';
  const g=n=>P.find(r=>r.config.startsWith(n));
  $('fst-ao-read').innerHTML='Int8 weight-only cut the Linear weights from '+U.mb(base.linear_bytes)+' to '+U.mb(g('Int8WeightOnly').linear_bytes)+' ('+(base.linear_bytes/g('Int8WeightOnly').linear_bytes).toFixed(2)+' times smaller: 1 byte per weight plus one float32 scale per row) and moved the loss by '+(g('Int8WeightOnly').eval_loss-base.eval_loss).toFixed(5)+'. The surprise is int4: <code>Int4WeightOnlyConfig</code> failed with "ImportError: Requires mslk &gt;= 1.0.0" (it needs a separate kernel package), and the CPU-capable <code>IntxWeightOnlyConfig(int4)</code> stores each 4-bit value in a full byte (<code>IntxUnpackedToInt8Tensor</code>) plus a scale per group of 32, so it is <i>larger</i> than int8 ('+U.mb(g('IntxWeightOnly').linear_bytes)+'). "int4" names the value grid, not the storage; check bytes, do not assume them. float8 weight-only runs on the CPU; dynamic float8 activations do not.';
  // ---- torchao speed ----
  const TA=D.time_ao&&D.time_ao.results;
  if(TA){let M='1';const draw=()=>{const rows=TA.filter(r=>String(r.M)===M);const f=rows.find(r=>r.config==='float32');
      U.bars($('fst-aos-bars'),rows.map(r=>({nm:r.config,ml:(f.median_ms/r.median_ms).toFixed(2)+' times float32\'s speed',v:r.median_ms,txt:U.ms(r.median_ms),col:r.config==='float32'?'var(--c1)':'var(--c5)',hl:r.config==='float32'})))};
    U.seg($('fst-aos-seg'),[['1','1 token (M = 1)'],['2048','2,048 tokens (M = 2,048)']],m=>{M=m;draw()},'1');
    $('fst-aos-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, CPU 4 threads, torchao 0.18.0, <code>torch.utils.benchmark.Timer.blocked_autorange</code> medians, eager (no compile), '+U.load(TA[0].load)+', bench lock (src/exp/time_misc.py <code>ao</code>).';
    const t=(c,m)=>TA.find(r=>r.config===c&&r.M===m).median_ms;
    $('fst-aos-read').innerHTML='Theory says a one-token matmul is memory-bound (every weight read once, used once), so fewer bytes per weight should mean less time. Here the weight-only configs lost even at M = 1: int8 weight-only took '+U.ms(t('int8 weight-only',1))+' and int4 (Intx) '+U.ms(t('int4 (Intx, group 32) weight-only',1))+' against float32\'s '+U.ms(t('float32',1))+', because in eager mode the int8 weight is converted to float32 on every call and then multiplied with an ordinary <code>torch.mm</code> (torchao 0.18.0, <code>quantization/quantize_/workflows/int8/int8_tensor.py</code> L337 to 354): conversion work is added, no reads are saved. The dynamic config multiplies int8 by int8 (<code>int_scaled_matmul</code>, same file L315) and behaved the textbook way in the other direction: dynamic int8 activations with int8 weights took '+U.ms(t('int8 dynamic act + int8 weight',1))+' for one token ('+(t('float32',1)/t('int8 dynamic act + int8 weight',1)).toFixed(1)+' times faster than float32) but '+U.ms(t('int8 dynamic act + int8 weight',2048))+' for 2,048 tokens against '+U.ms(t('float32',2048))+' (float32 BLAS is far better tuned for large matrices here). The lesson that transfers: a quantization config is only as fast as the kernel it reaches on your hardware; on GPUs torchao\'s weight-only paths have dedicated kernels (and are usually used under <code>torch.compile</code>), which this measurement does not represent.';}
  // ---- float8 emulated: two loss curves ----
  const F8=AO.float8_emulated_small;
  if(F8&&F8.float32){
    const el=$('fst-f8-svg');
    const drawF8=()=>{const w=RD.width(el),h=170,L=36,R=8,T=8,B=22,a=F8.float32,b=F8.float8_emulated,n=a.length;
      const ymax=Math.ceil(Math.max(...a,...b)),ymin=Math.floor(Math.min(...a,...b));
      const X=i=>L+(w-L-R)*i/(n-1),Y=v=>T+(h-T-B)*(1-(v-ymin)/(ymax-ymin));
      let s='';for(let g=ymin;g<=ymax;g++)s+='<line x1="'+L+'" x2="'+(w-R)+'" y1="'+Y(g)+'" y2="'+Y(g)+'" stroke="var(--line)"/>'+RD.t(L-4,Y(g)+4,g,{a:'end',fs:10,fill:'var(--mute)'});
      const path=(arr,c)=>'<path d="'+arr.map((v,i)=>(i?'L':'M')+X(i).toFixed(1)+','+Y(v).toFixed(1)).join('')+'" fill="none" stroke="'+c+'" stroke-width="1.6"/>';
      s+=path(a,'var(--c1)')+path(b,'var(--c2)');
      s+=RD.t(L+4,T+12,'float32',{fs:11,fill:'var(--c1)'})+RD.t(L+60,T+12,'float8, emulated',{fs:11,fill:'var(--c2)'})+RD.t(w-R,h-4,'step',{a:'end',fs:10,fill:'var(--mute)'});
      el.innerHTML=RD.svg(w,h,s,'Loss curves')};
    drawF8();RD.onResize(drawF8);RD.onRender(drawF8);
    const a=F8.float32,b=F8.float8_emulated;let im=0;b.forEach((v,i)=>{if(v-a[i]>b[im]-a[im])im=i});
    $('fst-f8-read').innerHTML='Here, 60 steps: the two runs end at '+a[a.length-1].toFixed(3)+' (float32) and '+b[b.length-1].toFixed(3)+' (float8), within the step-to-step noise, except for one spike at step '+im+' ('+b[im].toFixed(2)+' against '+a[im].toFixed(2)+') that the next step recovers from. A spike like that, from a tensor whose scale is set by one large value, is what scaling recipes (per-row scales, MX blocks) and loss-spike monitoring exist for; this run did not investigate its cause.';}
  const Q=AO.qat_small;
  if(Q&&Q.qat){$('fst-qat-read').innerHTML='Run here on the running example (CPU, <code>IntxWeightOnlyConfig(int4, group 32)</code> as the base config): '+Q.pretrain_steps+' float32 steps, then '+Q.finetune_steps+' more steps either in float32 followed by quantization (PTQ) or with fake-quantized weights (QAT) followed by conversion. PTQ: loss '+Q.ptq.eval_loss_float32.toFixed(4)+' before quantizing, '+Q.ptq.eval_loss_int4.toFixed(4)+' after (+'+(Q.ptq.eval_loss_int4-Q.ptq.eval_loss_float32).toFixed(4)+'). QAT: '+Q.qat.eval_loss_fake_quant.toFixed(5)+' with fake quantization and '+Q.qat.eval_loss_int4.toFixed(5)+' after conversion, identical: fake quantization reproduces the converted model\'s numbers exactly, which is the whole point. On a model this small int4 costs almost nothing, so QAT had nothing to recover and ended slightly worse than PTQ; its value shows on large models where PTQ loses accuracy (the formats themselves: {{Quantization and Precision|n:3c65c17b0d0d817b8f41ff66fba4cd0e}}).'.replace(/\{\{([^|]+)\|n:(\w+)\}\}/g,'<a href="https://app.notion.com/p/$2" target="_blank" rel="noopener noreferrer">$1</a>');}
})();
