// ---- Reading sections 0 to 6: the hunt (phases, stage by stage animation), timing, data, optimizer, precision ----
(function(){
  const D=window.FST,U=window.FU,$=U.$;
  const STAGE={s0:['Baseline','as first written'],s1:['+ DataLoader workers','num_workers=2, persistent, prefetch 2'],s2:['+ fused AdamW','fused=True'],s3:['+ SDPA','F.scaled_dot_product_attention'],
    s4:['+ no per-step sync','log the loss every 10 steps'],s5:['+ bfloat16 autocast','on top of the previous'],s6:['+ torch.compile','float32, bfloat16 reverted'],s7:['+ compile and bfloat16','both together']};
  // latest run per stage
  function stages(dev){const H=D['hunt_time_'+dev];if(!H)return [];const m={};H.runs.forEach(r=>{m[r.stage]=r});return Object.keys(STAGE).filter(k=>m[k]).map(k=>m[k])}
  function phases(dev){const H=D['hunt_phases_'+dev];if(!H)return {};const m={};H.runs.forEach(r=>{m[r.stage]=r});return m}
  // each stage is compared with the stage it was built on; gain = faster beyond the spread, slower = slower beyond it, else neutral
  const BASE={s1:'s0',s2:'s1',s3:'s2',s4:'s3',s5:'s4',s6:'s4',s7:'s6'};
  function path(dev){const st=stages(dev);const by={};st.forEach(r=>by[r.stage]=r);const out=[];
    st.forEach(r=>{let v='base';const b=by[BASE[r.stage]];if(b){v=r.max_ms<b.min_ms?'gain':r.min_ms>b.max_ms?'slower':'neutral'}if(v==='slower'&&(r.stage==='s3'||r.stage==='s4'))v='slowerkept';out.push({r,v,keep:v!=='slower',base:b})});
    // the final configuration: the fastest stage that is not slower than its base
    const ok=out.filter(o=>o.v!=='slower');const best=ok.reduce((a,o)=>!a||o.r.median_ms<a.median_ms?o.r:a,null);
    return {out,best}}
  window.FST_HUNT={stages,phases,path,STAGE};
  // ---- per-phase bars ----
  let phdev='mps';
  function phDraw(){const P=phases(phdev);const s0=P.s0;if(!s0)return;const m=s0.median_ms;
    const rows=['data','forward','backward','optimizer'].map(k=>({nm:k,v:m[k],txt:U.ms(m[k]),col:{data:'var(--c5)',forward:'var(--c1)',backward:'var(--c4)',optimizer:'var(--c3)'}[k]}));
    U.bars($('fst-ph-bars'),rows);
    $('fst-ph-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, '+(phdev==='mps'?'MPS':'CPU, 4 threads')+', PyTorch 2.14.1; median of '+s0.trials.length+' trials of 20 steps after 8 warm-up steps, each phase followed by a device synchronize (which removes overlap, so the phases add up to more than a normal step: '+U.ms(Object.values(m).reduce((a,b)=>a+b,0))+' here against '+U.ms(stages(phdev).find(r=>r.stage==='s0').median_ms)+' timed normally); bench lock, '+U.load(s0.load_before)+' (src/exp/hunt.py phases).'}
  if($('fst-ph-seg'))U.seg($('fst-ph-seg'),[['mps','MPS'],['cpu','CPU']],d=>{phdev=d;phDraw()},'mps');
  // ---- stage-by-stage animation ----
  let hdev='mps',A=null;
  function hDraw(i){const {out}=path(hdev);if(!out.length)return;const mx=out[0].r.median_ms*1.0;
    const cap=out[0].r.median_ms*1.15;
    const rows=out.map((o,k)=>({nm:STAGE[o.r.stage][0],ml:k<=i?({base:'baseline',gain:'kept: faster',neutral:'no measurable change',slower:'slower: reverted',slowerkept:'slightly slower here; kept (see caption)'}[o.v])+'; range '+U.f1(o.r.min_ms)+' to '+U.f1(o.r.max_ms)+(o.r.median_ms>cap?'; bar off scale':''):'',v:k<=i?Math.min(o.r.median_ms,cap):0,txt:k<=i?(o.r.median_ms>=1e4?(o.r.median_ms/1e3).toFixed(1)+' s':U.ms(o.r.median_ms)):'',col:{base:'var(--c2)',gain:'var(--c3)',neutral:'var(--c5)',slower:'var(--dim)',slowerkept:'var(--c5)'}[o.v],hl:k===i}));
    U.bars($('fst-hunt-bars'),rows,cap);
    const o=out[i],ref=o.base?{r:o.base}:null;
    const d=ref?o.r.median_ms-ref.r.median_ms:0;
    const WHY={s0:'Everything as first written.',s1:'Two worker processes build batches in the background, so the 16 ms of Python work per batch overlaps the step.',s2:'One fused kernel updates all 100 parameter tensors instead of several small ops per tensor.',
      s3:hdev==='mps'?'On MPS with gradients, SDPA runs the same math path as the written-out attention (section 10), so there is nothing to gain; it measured a few milliseconds slower. It stays in the later stages anyway, because it is the right default wherever a fused kernel exists (CPU here, CUDA), and a strict hunt on this machine alone would revert it.':'On the CPU, SDPA runs a flash-style kernel instead of materialising the 256 &times; 256 scores per head.',
      s4:hdev==='mps'?'Without .item() every step, the CPU can queue the next step while the GPU works; here the GPU is the bottleneck, so overlap buys little.':'On the CPU .item() costs nothing (no device to wait for): any change is noise.',
      s5:'bfloat16 autocast on hardware without native bfloat16 arithmetic: conversions cost more than they save (section 6).',s6:hdev==='mps'?'Inductor fuses the element-wise ops (LayerNorm, GELU, residual adds, masking) into generated Metal kernels: fewer launches and fewer round trips to memory, a measurable gain here.':'On the CPU the step is dominated by matmuls, which compiled code still hands to the same BLAS library; the fused element-wise kernels saved nothing measurable.',s7:'Compile and bfloat16 together: the bfloat16 cost dominates again.'};
    $('fst-hunt-cap').innerHTML='<div class="t">'+STAGE[o.r.stage][0]+' ('+STAGE[o.r.stage][1]+'): '+U.ms(o.r.median_ms)+(i?', '+(d<=0?'':'+')+U.f1(d)+' ms against '+STAGE[ref.r.stage][0].replace('+ ','')+({base:'',gain:': kept',neutral:': no measurable change',slower:': slower, reverted',slowerkept:': slightly slower here, kept'}[o.v]):'')+'</div><p>'+WHY[o.r.stage]+'</p>'}
  function hInit(){const {out}=path(hdev);if(!A)A=RD.anim({card:'fst-huntcard',ctl:'fst-hunt-ctl',n:Math.max(1,out.length),ms:1500,draw:hDraw,label:'Fix'});else A.reset(Math.max(1,out.length));
    const r0=out[0]&&out[0].r;if(r0)$('fst-hunt-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, '+(hdev==='mps'?'MPS':'CPU, 4 threads')+', PyTorch 2.14.1; per stage the median of '+r0.trials_ms.length+' runs of 20 steps after 8 warm-up steps (bars: median; text: range), timed with a synchronize at both ends; bench lock, '+U.load(r0.load_before)+' at the start. Each stage is compared with the stage it was built on: green, faster beyond the spread of both; amber, within the spread, or slightly slower but kept for the reason in the caption; grey, slower (reverted). bfloat16 and compile are each tried on top of stage 4; compile and bfloat16 together on top of compile (src/exp/hunt.py).'}
  if($('fst-hunt-seg'))U.seg($('fst-hunt-seg'),[['mps','MPS'],['cpu','CPU']],d=>{hdev=d;hInit()},'mps');
  // hunt summary sentence
  const pm=path('mps'),pc=path('cpu');
  const full=p=>['s0','s1','s2','s3','s4','s5','s6'].every(k=>p.out.some(o=>o.r.stage===k));
  if(full(pm)&&full(pc)&&$('fst-pr-hunt')){const s0m=pm.out[0].r.median_ms,s0c=pc.out[0].r.median_ms;
    const g=(p,st)=>{const o=p.out.find(x=>x.r.stage===st);return o?o.r.median_ms:NaN};
    const cs5=pc.out.find(x=>x.r.stage==='s5');
    const order=pm.out.filter(o=>['s1','s2','s5','s6'].includes(o.r.stage)).map(o=>[o.r.stage,(o.r.stage==='s1'?pm.out[0].r:pm.out.find(x=>x.r.stage===(o.r.stage==='s2'?'s1':'s4')).r).median_ms-o.r.median_ms]);
    const bestFix=order.sort((a,b)=>b[1]-a[1])[0][0];const ix={s1:0,s2:1,s5:2,s6:3}[bestFix];
    U.predict('fst-pr-hunt',ix,'Measured (each fix against the stage it was added to): workers saved '+U.f1(g(pm,'s0')-g(pm,'s1'))+' ms, fused AdamW '+U.f1(g(pm,'s1')-g(pm,'s2'))+' ms, bfloat16 '+(g(pm,'s4')-g(pm,'s5')>=0?'saved '+U.f1(g(pm,'s4')-g(pm,'s5')):'cost '+U.f1(g(pm,'s5')-g(pm,'s4')))+' ms, torch.compile '+(g(pm,'s4')-g(pm,'s6')>=0?'saved '+U.f1(g(pm,'s4')-g(pm,'s6')):'cost '+U.f1(g(pm,'s6')-g(pm,'s4')))+' ms. The per-phase bars above already pointed at it: '+U.ms(phases('mps').s0.median_ms.data)+' of data loading and '+U.ms(phases('mps').s0.median_ms.optimizer)+' of optimizer in a step whose GPU work is mostly forward and backward matmuls.');
  }
  // ---- section 1: timer ----
  const TT=D.time_timer&&D.time_timer.results;
  if(TT&&$('fst-timer-bars')){U.bars($('fst-timer-bars'),[
    {nm:'perf_counter around the call',ml:'no synchronize: times the queuing',v:TT.mps_no_sync_ms,txt:U.ms(TT.mps_no_sync_ms),col:'var(--c2)'},
    {nm:'perf_counter with synchronize',ml:'one call: includes noise',v:TT.mps_with_sync_ms,txt:U.ms(TT.mps_with_sync_ms),col:'var(--c5)'},
    {nm:'benchmark.Timer',ml:TT.timer.runs+' runs, IQR '+U.f2(TT.timer.iqr_ms)+' ms',v:TT.timer.median_ms,txt:U.ms(TT.timer.median_ms),col:'var(--c3)',hl:true}]);
    $('fst-timer-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, MPS, (2,048 &times; 2,048) @ (2,048 &times; 2,048) float32 after one warm-up call; bench lock, '+U.load(TT.load)+' (src/exp/time_misc.py <code>timer</code>). The unsynchronised number is '+(TT.timer.median_ms/TT.mps_no_sync_ms).toFixed(0)+' times too small.'}
  // ---- section 4: data loading ----
  const TD=D.time_data&&D.time_data.results;
  if(TD&&$('fst-data-bars')){U.bars($('fst-data-bars'),TD.map(r=>({nm:r.sample_cost_ms?'num_workers='+r.num_workers+(r.num_workers?', prefetch '+r.prefetch_factor:''):'no loading cost',ml:r.sample_cost_ms?'waiting for data: '+U.ms(r.median_wait_ms)+' median':'the loop alone (reference)',v:r.ms_per_step,txt:U.ms(r.ms_per_step),col:!r.sample_cost_ms?'var(--c1)':r.num_workers?'var(--c3)':'var(--c2)',hl:r.num_workers===0&&r.sample_cost_ms>0})));
    const rb=TD.find(r=>!r.sample_cost_ms),r0=TD.find(r=>r.sample_cost_ms&&r.num_workers===0),r1=TD.find(r=>r.num_workers===1),r2=TD.find(r=>r.num_workers===2&&r.prefetch_factor===2);
    $('fst-data-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>; a consumer that sleeps 20 ms per step (it stands in for the training step and leaves the CPU to the workers), samples costing 2 ms of Python work each <span class="ann">illustrative</span>, batch 8; 40 steps after 5 warm-up; bench lock, '+U.load(r0.load)+' (src/exp/time_misc.py <code>data</code>). The reference row has samples that cost nothing: '+U.ms(rb.ms_per_step)+', the 20 ms sleep plus the loop\'s own overhead.';
  }
  // ---- section 5: optimizer ----
  const TO=D.time_optim&&D.time_optim.results;
  if(TO&&$('fst-opt-bars')){let od='cpu';const draw=()=>{const rows=[];['small','big'].forEach(c=>['forloop','foreach','fused'].forEach(i=>{const r=TO.find(x=>x.device===od&&x.config===c&&x.impl===i);
      rows.push({nm:(c==='small'?'Running example':'Larger variant')+', '+i,ml:r.runs+' runs, IQR '+U.f2(r.iqr_ms)+' ms',v:r.median_ms,txt:U.ms(r.median_ms),col:i==='fused'?'var(--c3)':i==='foreach'?'var(--c5)':'var(--c2)'})}));U.bars($('fst-opt-bars'),rows)};
    U.seg($('fst-opt-seg'),[['cpu','CPU'],['mps','MPS']],d=>{od=d;draw()},'cpu');
    const t=(d,c,i)=>TO.find(x=>x.device===d&&x.config===c&&x.impl===i).median_ms;
    $('fst-opt-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, PyTorch 2.14.1, <code>opt.step()</code> alone with gradients present, <code>torch.utils.benchmark.Timer.blocked_autorange</code> median; bench lock, '+U.load(TO[0].load)+' (src/exp/time_misc.py <code>optim</code>).';
  }
  // ---- section 6: precision ----
  const TP=D.time_amp&&D.time_amp.results;
  if(TP&&$('fst-amp-bars')){let ad='cpu';const tf=v=>v>=1e4?(v/1e3).toFixed(1)+' s':U.ms(v);
    const draw=()=>{const R=TP.filter(r=>r.device===ad);const base=r=>r.op==='big step'?R.find(x=>x.op==='big step'&&!x.autocast_bf16):R.find(x=>x.op===r.op&&x.dtype==='float32');
      const rows=R.map(r=>{const q=r.median_ms/base(r).median_ms;return {nm:r.op==='big step'?'Training step, '+(r.autocast_bf16?'autocast bfloat16':'float32'):'Matmul 2,048, '+r.dtype,ml:(r.op==='big step'?'':r.gflops+' GFLOP/s; ')+q.toFixed(q>=10?0:2)+' times float32\'s time'+(q>3?' (bar off scale)':''),v:Math.min(q,3),txt:tf(r.median_ms),col:(r.dtype==='float32'||r.autocast_bf16===false)?'var(--c1)':'var(--c2)'}});
      U.bars($('fst-amp-bars'),rows,3)};
    U.seg($('fst-amp-seg'),[['cpu','CPU'],['mps','MPS']],d=>{ad=d;draw()},'cpu');
    const m=(d,dt)=>TP.find(r=>r.device===d&&r.dtype===dt),s=(d,a)=>TP.find(r=>r.device===d&&r.op==='big step'&&r.autocast_bf16===a).median_ms;
    $('fst-amp-note').innerHTML='<span class="meas">measured on Apple M1 Pro</span>, PyTorch 2.14.1; matmul: <code>Timer.blocked_autorange</code> median, GFLOP/s = 2 &times; 2,048&sup3; / time; step: median of '+(TP.find(r=>r.device==='mps'&&r.op==='big step')||{}).trials+' trials of '+(TP.find(r=>r.device==='mps'&&r.op==='big step')||{}).steps+' steps on MPS and '+(TP.find(r=>r.device==='cpu'&&r.op==='big step')||{}).trials+' of '+(TP.find(r=>r.device==='cpu'&&r.op==='big step')||{}).steps+' on the CPU (bfloat16 steps there take seconds), after warm-up; bench lock, '+U.load(TP[0].load)+' (src/exp/time_misc.py <code>amp</code>).';
  }
})();
