// ---- Reading section 6: what @triton.autotune does at a call (stepper over tutorial 03's 16 configurations, compiled for sm_90a) ----
// Data: window.TGD.sweep rows 'mm_*' for sm_90a (registers, shared memory), TG_ARCH (per-block limit, from 32_js_cfg.js).
// Timing per configuration is the do_bench default (about 25 ms warm-up + 100 ms timed), not a measurement.
(function(){
  const D=window.TGD,$=id=>document.getElementById(id);if(!$('rd-at-card')||!D||!window.TG_ARCH)return;
  const T='sm_90a',lim=TG_ARCH[T].smemBlock,kb=b=>(b/1024).toFixed(b%1024?1:0)+' KB';
  const rows=D.sweep.filter(r=>r.t===T&&r.k.startsWith('mm_'));
  const over=rows.filter(r=>r.smem>lim).length,fit=rows.length-over,ms=125;
  const regs=rows.map(r=>r.regs),sm=rows.map(r=>r.smem);
  const S=[
    {t:'A call arrives with a key the tuner has not seen',p:'The key is the values of the key arguments (M, N, K) plus the dtype of every tensor argument. Nothing is stored for this one, so the tuner must choose.',c:[0,0,0,0],show:0},
    {t:'Every configuration is compiled',p:'Each configuration is a different set of constexpr values, so a different specialisation and a different binary (section 1). Here registers run from '+Math.min(...regs)+' to '+Math.max(...regs)+' per thread and shared memory from '+kb(Math.min(...sm))+' to '+kb(Math.max(...sm))+'.',c:[rows.length,0,0,0],show:1},
    {t:over+' configurations cannot launch on this GPU',p:'Their shared memory is over the '+kb(lim)+' per-block limit. They compiled fine; loading them raises OutOfResources, which the tuner times as infinitely slow and skips, silently.',c:[rows.length,over,0,0],show:2},
    {t:'The '+fit+' that fit are timed',p:'Each runs under triton.testing.do_bench: about 25 ms of warm-up and 100 ms of timed runs, clearing the L2 cache before each timed run, on the same tensors (so a kernel that writes its inputs needs reset_to_zero or restore_value).',c:[rows.length,over,fit,fit*ms],show:3},
    {t:'The fastest is kept, in memory, under the key',p:'Which one wins depends on the shapes and needs a GPU: not run here. The launch grid is then computed from the winner\'s BM and BN (the lambda META).',c:[rows.length,over,fit,fit*ms],show:4},
    {t:'The next call with the same key costs nothing',p:'A dictionary lookup: no compile, no timing, straight to the stored winner.',c:[rows.length,over,fit,fit*ms],show:5},
    {t:'A call with a new key starts again from step 2',p:'Every distinct (M, N, K, dtypes) pays the compile and the timing again. A key that changes on every call, such as a sequence length, re-tunes forever: bucket it or leave it out of key.',c:[rows.length*2,over*2,fit*2,fit*ms*2],show:6}];
  function draw(i){
    const s=S[i];
    $('rd-at-grid').innerHTML=rows.map((r,j)=>{const c=r.cx,bad=r.smem>lim;
      let cls='';if(s.show>=1)cls='on';if(s.show>=2&&bad)cls='out';if(s.show>=3&&!bad)cls='tm';
      return '<div class="'+cls+'"><b>'+c.BM+' x '+c.BN+' x '+c.BK+'</b>'+r.nw+' warps, '+r.ns+' stages'+
        (s.show>=1?'<br>'+r.regs+' regs, '+kb(r.smem):'')+
        (s.show>=2&&bad?'<br><span class="x">OutOfResources</span>':'')+(s.show>=3&&!bad?'<br><span class="ok">timed</span>':'')+'</div>'}).join('');
    $('rd-at-cap').innerHTML='<div class="t">Step '+(i+1)+' of '+S.length+': '+RD.esc(s.t)+'</div><p>'+RD.esc(s.p)+'</p>';
    const c=s.c;
    $('rd-at-cnt').innerHTML=RD.stat('compiled',c[0])+RD.stat('skipped (OutOfResources)',c[1])+RD.stat('timed',c[2])+RD.stat('timing, derived',(c[3]/1000).toFixed(c[3]?1:0)+' s','configs timed x 125 ms');
  }
  RD.anim({card:'rd-at-card',ctl:'rd-at-ctl',n:S.length,draw,ms:3600,label:'Autotuning step'});
})();
