// ---- Roofline lab (t-roof): the interactive lab, the measured tables, MFU, predict-then-check ----
(function(){
  const R=window.ROOFX,D=R.D,$=id=>document.getElementById(id);
  if(!$('t-roof'))return;
  const chipOf=id=>D.chips.find(c=>c.id===id);
  const m1=chipOf('m1g');
  const precOfCase=n=>/fp16/.test(n)?'fp16':/bf16/.test(n)?'bf16':'fp32';
  const SH={
    linear:{label:'Batch (tokens processed together)',n:13,v:i=>Math.pow(2,i),d:0},
    attn_dec:{label:'Context length (tokens in the KV cache)',n:9,v:i=>512*Math.pow(2,i),d:3},
    attn_pre:{label:'Prompt length (tokens)',n:9,v:i=>128*Math.pow(2,i),d:4},
    softmax:{label:'Row length',n:9,v:i=>128*Math.pow(2,i),d:5},
    vadd:{label:'Vector length (elements)',n:11,v:i=>Math.pow(2,9+2*i),d:9}
  };
  const OPT2={linear:{label:'Width of the layer (K = N)',opts:[[4096,'4096'],[8192,'8192'],[16384,'16384']],def:8192},
    attn_dec:{label:'Query heads per KV head (GQA group)',opts:[[1,'1 (plain multi-head)'],[4,'4'],[8,'8 (Llama 3 70B)']],def:1}};
  const st={chip:'h100',prec:'bf16',op:'linear',sh:0,o2:8192};
  // ---- fill selects ----
  $('roof-chip').innerHTML=D.chips.map(c=>'<option value="'+c.id+'">'+R.esc(c.name)+'</option>').join('');
  $('roof-chip').value=st.chip;
  function fillPrec(){const c=chipOf(st.chip),ks=Object.keys(c.peaks);
    if(ks.indexOf(st.prec)<0)st.prec=ks.indexOf('bf16')>=0?'bf16':ks[0];
    $('roof-prec').innerHTML=ks.map(k=>'<option value="'+k+'">'+R.PNAME[k]+' ('+R.fF(c.peaks[k]*1e3)+')</option>').join('');$('roof-prec').value=st.prec}
  function fillOpt2(){const o=OPT2[st.op],l=$('roof-gl');
    if(!o){l.hidden=true;return}l.hidden=false;
    l.firstChild.textContent=o.label;$('roof-kn').innerHTML=o.opts.map(x=>'<option value="'+x[0]+'">'+x[1]+'</option>').join('');
    if(!o.opts.some(x=>x[0]===st.o2))st.o2=o.def;$('roof-kn').value=st.o2}
  function params(){const v=SH[st.op].v(st.sh);
    if(st.op==='linear')return {M:v,K:st.o2,N:st.o2};
    if(st.op==='attn_dec')return {B:1,H:32,g:st.o2,L:v,d:128};
    if(st.op==='attn_pre')return {H:32,L:v,d:128};
    if(st.op==='softmax')return {r:16384,c:v};
    return {n:v}}
  function shapeText(p){
    if(st.op==='linear')return 'batch '+p.M.toLocaleString('en-US');
    if(st.op==='attn_dec')return p.L.toLocaleString('en-US')+' tokens';
    if(st.op==='attn_pre')return p.L.toLocaleString('en-US')+' tokens';
    if(st.op==='softmax')return '16,384 rows x '+p.c.toLocaleString('en-US');
    return p.n.toLocaleString('en-US')}
  // the measured M1 Pro case with exactly this shape, if any
  function measured(p){if(st.chip!=='m1g')return null;
    if(st.op==='linear'&&p.K===8192&&st.prec==='fp16')return D.cases.find(c=>c.batch===p.M)||null;
    if(st.op==='attn_dec'&&p.g===1&&p.L===4096&&st.prec==='fp16')return R.caseBy('attention decode');
    if(st.op==='attn_pre'&&p.L===2048&&st.prec==='fp16')return R.caseBy('attention prefill');
    if(st.op==='softmax'&&p.c===4096&&st.prec==='fp32')return R.caseBy('softmax');
    if(st.op==='vadd'&&p.n===134217728&&st.prec==='fp32')return R.caseBy('vector add');
    return null}
  function why(p,e,c){const pn=R.PNAME[st.prec],s=R.BYTES[st.prec],idle=1-e.att/(c.peaks[st.prec]*1e3);
    const side=e.bound==='memory'?'<b>memory-bound</b>: the time is set by moving '+R.fBy(e.bytes)+' at '+R.fB(c.bw)+', and the arithmetic units sit idle '+R.pct(idle)+' of the time':'<b>compute-bound</b>: the time is set by '+R.sig(e.flops/1e9)+' GFLOPs at the '+pn+' peak, and faster memory would not help';
    let t='';
    if(st.op==='linear')t='At '+shapeText(p)+' each weight read from memory is used for '+p.M.toLocaleString('en-US')+' multiply-add'+(p.M>1?'s':'')+' (one per token), so AI = '+R.sig(e.ai)+' FLOPs per byte against a ridge of '+R.sig(e.ridge)+'. '+side+'. '+(e.bound==='memory'?'Batching more tokens is free until AI reaches the ridge, at a batch of about '+R.sig(e.ridge*s/2)+'.':'Past the ridge more batch adds time in proportion: you are using the chip as intended.');
    else if(st.op==='attn_dec')t='Each sequence reads its own KV cache, so neither the context length nor the batch changes the intensity: AI ≈ '+R.sig(e.ai)+' (for 2-byte numbers it is about the number of query heads sharing one KV head). '+side+'. This is why grouped-query attention, multi-head latent attention and KV-cache quantisation exist: they cut the bytes, not the FLOPs.';
    else if(st.op==='attn_pre')t='A fused attention kernel (FlashAttention and its relatives) never writes the L × L score matrix to memory, so AI = L ÷ bytes per number = '+R.sig(e.ai)+'. '+side+'. Unfused, the scores make a round trip through memory and short prompts fall back to memory-bound.';
    else if(st.op==='softmax')t='About 5 FLOPs per number (max, subtract, exponent, sum, divide) for '+(2*s)+' bytes read and written: AI = '+R.sig(e.ai)+' whatever the shape. '+side+'. The remedy is not a faster softmax but fusing it into the kernel next to it, so the numbers are not read again.';
    else t='One add per '+(3*s)+' bytes (two reads, one write): AI = '+R.sig(e.ai)+' at any length. '+side+'. Elementwise kernels like this one are why fusion matters: three of them in a row read and write the data three times.';
    return t}
  function draw(){
    const c=chipOf(st.chip),p=params(),e=R.evalCase(st.chip,st.prec,st.op,p),mc=measured(p);
    $('roof-shl').textContent=SH[st.op].label;$('roof-shv').textContent=shapeText(p);
    const all=$('roof-all').checked;
    const rows=[{chip:c,prec:st.prec,main:true}];
    if(all)D.chips.forEach(x=>{if(x.id===c.id)return;const pr=x.peaks[st.prec]!=null?st.prec:(x.peaks.bf16!=null?'bf16':Object.keys(x.peaks)[0]);rows.push({chip:x,prec:pr,main:false})});
    const xr=[0.02,1e5],ps=rows.map(r=>r.chip.peaks[r.prec]*1e3),bws=rows.map(r=>r.chip.bw);
    const yr=[Math.min.apply(null,bws)*xr[0]*0.5,Math.max.apply(null,ps)*3];
    let pts=[];
    if($('roof-meas').checked&&st.chip==='m1g')pts=D.cases.filter(k=>k.group!=='peak'&&k.ai>0).map(k=>({ai:k.ai,g:k.gf,lo:k.gf_worst,hi:k.gf_best,label:k.name+': '+R.fF(k.gf)+' measured (AI '+R.sig(k.ai)+')'}));
    if($('roof-meas').checked&&st.chip==='m1c')pts=[{ai:0.5,g:D.cpu.mv8.median,lo:D.cpu.mv8.min,hi:D.cpu.mv8.max,label:'matvec 8192 x 8192 fp32, 8 threads: measured on the C++ page'},{ai:85.33,g:D.cpu.mm8.median,lo:D.cpu.mm8.min,hi:D.cpu.mm8.max,label:'blocked matmul 512 fp32, 8 threads: measured on the C++ page'}];
    R.chart({el:$('roof-plot'),chips:rows,pts:pts,cur:{ai:e.ai,g:e.att,label:shapeText(p)},xr:xr,yr:yr,aria:'Roofline of '+c.name+' at '+R.PNAME[st.prec]});
    $('roof-leg').innerHTML=rows.map(r=>'<span><i class="sq" style="background:'+R.COL[r.chip.id]+'"></i>'+R.esc(r.chip.name)+(r.main?'':' ('+R.PNAME[r.prec]+')')+'</span>').join('')+(pts.length?'<span><i style="background:var(--good)"></i>measured kernels (bars: fastest to slowest trial)</span>':'')+'<span><i style="background:var(--ink)"></i>this operation, placed by computed AI</span>';
    let out=R.stat('Arithmetic intensity',R.sig(e.ai)+' FLOP/byte',R.sig(e.flops/1e9)+' GFLOPs over '+R.fBy(e.bytes))+
      R.stat('Ridge point',R.sig(e.ridge)+' FLOP/byte',R.fF(c.peaks[st.prec]*1e3)+' ÷ '+R.fB(c.bw))+
      R.stat('Attainable',R.fF(e.att),R.pct(e.att/(c.peaks[st.prec]*1e3))+' of peak, '+e.bound+'-bound')+
      R.stat('Time at the roof',R.fT(e.t_s),'a lower bound: real kernels are slower');
    if(mc){const fr=mc.gf/e.att;out+=R.stat('Measured on this M1 Pro',R.fF(mc.gf),R.pct(fr)+' of the roof here; '+R.fT(mc.s)+' per call')}
    $('roof-out').innerHTML=out;
    $('roof-why').innerHTML=why(p,e,c);
    $('roof-csrc').innerHTML=(c.kind==='measured'?'<span class="roof-tag m">measured</span> ':'<span class="roof-tag v">vendor</span> ')+R.esc(c.note)+(c.src&&/^http/.test(c.src)?' <a href="'+c.src+'" target="_blank" rel="noopener noreferrer">Source</a> (fetched 2026-10-05).':'');
  }
  function setOp(){st.op=$('roof-op').value;const S=SH[st.op];$('roof-sh').max=S.n-1;st.sh=S.d;$('roof-sh').value=st.sh;fillOpt2();draw()}
  $('roof-chip').addEventListener('change',()=>{st.chip=$('roof-chip').value;fillPrec();draw()});
  $('roof-prec').addEventListener('change',()=>{st.prec=$('roof-prec').value;draw()});
  $('roof-op').addEventListener('change',setOp);
  $('roof-sh').addEventListener('input',()=>{st.sh=+$('roof-sh').value;draw()});
  $('roof-kn').addEventListener('change',()=>{st.o2=+$('roof-kn').value;draw()});
  $('roof-all').addEventListener('change',draw);$('roof-meas').addEventListener('change',draw);
  fillPrec();fillOpt2();
  let lastW=0;
  function render(){const w=$('roof-plot').clientWidth;if(!w)return;lastW=w;draw();drawMfu()}
  R.onRender(render);
  addEventListener('resize',()=>{const w=$('roof-plot').clientWidth;if(w&&w!==lastW)render()});

  // ---- text filled from the data ----
  const m=D.meta,pk32=R.caseBy('peak FMA fp32'),pk16=R.caseBy('peak FMA fp16'),cp=R.caseBy('stream copy'),rd=R.caseBy('stream read');
  const rolled=R.caseBy('FMA fp32, same work'),b1=D.cases.find(c=>c.batch===1),b64=D.cases.find(c=>c.batch===64);
  const nv=R.caseBy('matmul naive'),tl=R.caseBy('matmul tiled'),lb=R.caseBy('matmul MLX library (fp32, 2048)'),l4=R.caseBy('matmul MLX library (fp16, 4096)');
  const h100=chipOf('h100'),set=(id,h)=>{const e=$(id);if(e)e.innerHTML=h};
  set('roof-mdate',m.date);set('roof-mver',m.mlx);set('roof-mload',R.sig(m.load_range[0],2)+' to '+R.sig(m.load_range[1],2)+' on 10 CPU cores');
  set('roof-r-m1',R.sig(m1.peaks.fp16*1e3/m1.bw,2));set('roof-r-h100',R.sig(h100.peaks.bf16*1e3/h100.bw,3));set('roof-rm1b',R.sig(m1.peaks.fp16*1e3/m1.bw,2));
  set('roof-rolled',R.fF(rolled.gf));set('roof-unrolled',R.fF(pk32.gf));
  set('roof-h100x',R.sig(h100.peaks.bf16/h100.peaks.fp32,2));set('roof-bwfrac',R.pct(cp.gbs/200));set('roof-mvbw',R.fB(b1.gbs));
  set('roof-nb',R.fF(0.25*m1.bw));set('roof-tb',R.fF(4*m1.bw));set('roof-tm',R.fF(tl.gf));set('roof-lm',R.pct(lb.gf/pk32.gf));set('roof-gap',R.sig(lb.gf/nv.gf,2));
  set('roof-mfu1',R.pct(l4.gf/pk16.gf));set('roof-mfu2',R.pct(l4.gf/5308));set('roof-iq64',R.sig(b64.s/b1.s,2));
  // spread on the tiles: the three runs' medians (single slow trials, from other jobs on the laptop, are in the table)
  const rr=c=>{const v=c.run_medians_ms.slice().sort((a,b)=>a-b);return [v[0]/1e3,v[v.length-1]/1e3]};
  const spread=c=>{const t=rr(c);return R.fF(c.flops/t[1]/1e9)+' to '+R.fF(c.flops/t[0]/1e9)};
  set('roof-mstats',R.stat('<span class="roof-tag m">measured</span> peak fp32',R.fF(pk32.gf),'runs '+spread(pk32)+'; '+R.pct(pk32.gf/5308)+' of the theoretical 5.31 TFLOP/s')+
    R.stat('<span class="roof-tag m">measured</span> peak fp16',R.fF(pk16.gf),'runs '+spread(pk16)+'; same rate as fp32')+
    R.stat('<span class="roof-tag m">measured</span> bandwidth, copy',R.fB(cp.gbs),'runs '+R.fB(cp.bytes/rr(cp)[1]/1e9)+' to '+R.fB(cp.bytes/rr(cp)[0]/1e9)+'; Apple: 200 GB/s')+
    R.stat('<span class="roof-tag m">measured</span> bandwidth, read-only',R.fB(rd.gbs),'fewer threads, fewer loads in flight')+
    R.stat('Ridge (fp16)',R.sig(m1.peaks.fp16*1e3/m1.bw,3)+' FLOP/byte','M1 Pro CPU, 8 threads: '+R.sig(D.cpu.p8.median/D.cpu.bw8.median,2)+' (C++ page)'));
  // kernel table
  let th='<tr><th>Kernel (all on the M1 Pro GPU)</th><th class="num">AI</th><th class="num">Achieved</th><th class="num">Bytes/s</th><th class="num">Roof at its AI</th><th>Limited by</th></tr>';
  D.cases.filter(k=>k.group!=='peak'&&k.ai>0).forEach(k=>{const pr=precOfCase(k.name),r=R.roof(m1,pr,k.ai),fr=k.gf/r.att;
    let lim=r.bound==='memory'?'memory: '+R.pct(k.gbs/m1.bw)+' of measured bandwidth':'compute: '+R.pct(k.gf/(m1.peaks[pr]*1e3))+' of measured peak';
    if(fr<0.6)lim='the kernel, not the chip: far below a '+r.bound+' roof'+(k.group==='sweep'?' (the library\'s kernel for this shape)':'');
    th+='<tr><td>'+R.esc(k.name)+(k.note&&(k.batch==null||k.batch===1)?'<br><small>'+R.esc(k.note)+'</small>':'')+'</td><td class="num">'+R.sig(k.ai)+'</td><td class="num">'+R.fF(k.gf)+'<br><small>'+R.sig(k.gf_worst)+' to '+R.sig(k.gf_best)+' G</small></td><td class="num">'+R.fB(k.gbs)+'</td><td class="num">'+R.pct(fr)+'</td><td>'+lim+'</td></tr>'});
  set('roof-ktbl',th);
  // three kernels
  const mx=pk32.gf,bar=(n,v,col,sub)=>'<div class="row"><span class="nm">'+n+'</span><span class="track"><span class="fill" style="width:'+(100*v/mx).toFixed(1)+'%;background:'+col+'"></span></span><span class="val">'+R.fF(v).replace(' GFLOP/s',' G').replace(' TFLOP/s',' T')+'</span></div>';
  set('roof-3k',bar('Naive, custom',nv.gf,'var(--bad)')+bar('Tiled 16 x 16, custom',tl.gf,'var(--c5)')+bar('MLX library',lb.gf,'var(--good)')+bar('Peak FMA (the roof)',pk32.gf,'var(--dim)')+'<p class="roof-src">FLOP/s, fp32, 2048 x 2048, medians of 21 trials; T = TFLOP/s, G = GFLOP/s.</p>');
  // Llama 3 table
  let lt='<tr><th class="num">GPUs</th><th class="num">TFLOPs per GPU</th><th class="num">MFU printed</th><th class="num">MFU recomputed</th></tr>';
  D.llama3.rows.forEach(r=>{lt+='<tr><td class="num">'+r.gpus.toLocaleString('en-US')+(r.ctx?' (131k context)':'')+'</td><td class="num">'+r.tflops+'</td><td class="num">'+r.mfu+'%</td><td class="num">'+R.sig(100*r.tflops/989.5,3)+'%</td></tr>'});
  set('roof-l3',lt);
  // MFU calculator
  const PV=[1,3,8,13,34,70,175,405,1000];
  const mopts=[];D.chips.forEach(c=>Object.keys(c.peaks).forEach(k=>{if(k!=='fp4')mopts.push([c.id+'|'+k,c.name+', '+R.PNAME[k]])}));
  $('roof-mchip').innerHTML=mopts.map(o=>'<option value="'+o[0]+'">'+R.esc(o[1])+'</option>').join('');$('roof-mchip').value='h100|bf16';
  function drawMfu(){const N=PV[+$('roof-mp').value]*1e9,tok=+$('roof-mt').value,sel=$('roof-mchip').value.split('|'),c=chipOf(sel[0]),P=c.peaks[sel[1]]*1e12;
    $('roof-mpv').textContent=PV[+$('roof-mp').value].toLocaleString('en-US');$('roof-mtv').textContent=tok.toLocaleString('en-US');
    const ach=6*N*tok,mfu=ach/P;
    $('roof-mout').innerHTML=R.stat('Model FLOP/s per chip',R.fF(ach/1e9),'6 x '+R.sig(N/1e9)+'B x '+tok.toLocaleString('en-US')+' tokens/s')+
      R.stat('MFU',mfu>1?'over 100%: impossible':R.pct(mfu),'of '+R.sig(P/1e12,5)+' TFLOP/s dense '+R.PNAME[sel[1]])+
      R.stat('Tokens/s per chip at 100%',R.sig(P/(6*N)),'the ceiling for this model size')}
  ['roof-mp','roof-mt'].forEach(id=>$(id).addEventListener('input',drawMfu));$('roof-mchip').addEventListener('change',drawMfu);drawMfu();
  // predict, then check
  const b2=D.cases.find(c=>c.batch===2),b16=D.cases.find(c=>c.batch===16),smx=R.evalCase('h100','bf16','softmax',{r:16384,c:4096});
  const dm1=R.evalCase('m1g','fp16','linear',{M:1,K:8192,N:8192}),dh=R.evalCase('h100','bf16','linear',{M:1,K:8192,N:8192});
  const ANS={
    b2:[0,'The roofline says <b>about the same</b>: at batch 2 the layer is still far left of the ridge, so the time is still the time to read 128 MB. But the measurement says otherwise: batch 1 took '+R.fT(b1.s)+', batch 2 took '+R.fT(b2.s)+'. The library ran a different kernel: MLX '+D.meta.mlx+' sends batch 1 to a matrix-vector kernel (gemv), and on this M1 (Apple GPU generation 13) anything wider to its general tiled matrix-multiply kernel, which read memory at only '+R.fB(b2.gbs)+' here; its "wide gemv" kernel for up to 15 vectors is used only on generation 15 or later GPUs (<a href="https://github.com/ml-explore/mlx/blob/v0.32.3/mlx/backend/metal/matmul.cpp" target="_blank" rel="noopener noreferrer">matmul.cpp, Matmul::eval_gpu</a>). By batch 16 the time is '+R.fT(b16.s)+' for 16 times the work. The roofline is a ceiling; which kernel the library picks decides how close you get.'],
    sm:[0,'<b>Memory-bound</b>, at any row length: AI = '+R.sig(smx.ai)+' FLOP/byte against a ridge of '+R.sig(smx.ridge)+'. It can reach at most '+R.pct(smx.att/989.5e3)+' of the H100\'s BF16 peak. On the M1 Pro it ran at '+R.pct(R.caseBy('softmax').gbs/m1.bw)+' of measured bandwidth.'],
    ratio:[0,'<b>About '+R.sig(dm1.t_s/dh.t_s,2)+' times</b>, the bandwidth ratio ('+R.fB(h100.bw)+' against '+R.fB(m1.bw)+'), not the FLOP ratio of about '+R.sig(h100.peaks.bf16*1e3/(m1.peaks.fp16*1e3),1)+' times. At batch 1 both chips are reading weights, and arithmetic does not matter.'],
    fp8:[0,'<b>It doubles</b>: from '+R.sig(chipOf('b200').peaks.bf16*1e3/8000)+' to '+R.sig(chipOf('b200').peaks.fp8*1e3/8000)+' FLOP/byte on B200 (same bandwidth, twice the peak). FP8 also halves the bytes per number, so a layer\'s AI doubles too and big matmuls stay compute-bound; but smaller batches need twice the intensity to use the faster peak.']};
  document.querySelectorAll('#t-roof .roof-pr').forEach(box=>{const a=ANS[box.dataset.q];if(!a)return;
    box.querySelectorAll('.opts button').forEach(b=>b.addEventListener('click',()=>{
      box.querySelectorAll('.opts button').forEach(x=>x.classList.remove('right','wrong'));
      b.classList.add(+b.dataset.a===a[0]?'right':'wrong');box.querySelector('.opts button[data-a="'+a[0]+'"]').classList.add('right');
      const an=box.querySelector('.ans');an.hidden=false;an.innerHTML=(+b.dataset.a===a[0]?'Right. ':'Not quite. ')+a[1]}))});
  window.ROOFX.state=st;window.ROOFX.draw=draw;
})();
