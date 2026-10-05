// ---- Roofline lab (t-roof): one linear layer crossing the ridge, measured on the M1 Pro and computed on an H100 ----
(function(){
  const R=window.ROOFX,D=R.D,$=id=>document.getElementById(id);
  if(!$('roof-anplot'))return;
  const m1=D.chips.find(c=>c.id==='m1g'),h100=D.chips.find(c=>c.id==='h100');
  const sweep=D.cases.filter(c=>c.group==='sweep').sort((a,b)=>a.batch-b.batch);
  let mode='m1';
  function stepData(i){const k=sweep[i],M=k.batch;
    if(mode==='m1')return {M:M,ai:k.ai,g:k.gf,t:k.s,lo:k.gf_worst,hi:k.gf_best,P:m1.peaks.fp16*1e3,bw:m1.bw,ridge:m1.peaks.fp16*1e3/m1.bw,meas:true};
    const e=R.evalCase('h100','bf16','linear',{M:M,K:8192,N:8192});
    return {M:M,ai:e.ai,g:e.att,t:e.t_s,P:h100.peaks.bf16*1e3,bw:h100.bw,ridge:e.ridge,meas:false}}
  function caption(i){const d=stepData(i),pv=i?stepData(i-1):null,bound=d.ai*d.bw<d.P?'memory':'compute';
    let c='<b>Batch '+d.M.toLocaleString('en-US')+'</b>: AI '+R.sig(d.ai)+' FLOP/byte, ridge '+R.sig(d.ridge)+'. ';
    if(i===0)c+=d.meas?'One token: every one of the 67 million weights is read once and used once. The kernel reads memory at '+R.fB(sweep[0].gbs)+', right at the measured bandwidth roof: this is as fast as batch 1 can ever be on this chip.':'One token: the H100 reads the same 128 MB at 3.35 TB/s, about 20 times faster than the M1 Pro, while using under 1% of its BF16 peak.';
    else{const tr=d.t/pv.t;
      c+=(d.meas?'Measured: ':'Computed: ')+'twice the tokens took '+tr.toFixed(2)+' times as long. ';
      if(bound==='memory')c+=tr<1.3?'Nearly free: the weights are read once either way, so the extra tokens ride along.':d.meas?(i===1?'Not free here although the roof says it should be: MLX switches from its matrix-vector kernel to its general tiled kernel once there is more than one row, and on this GPU that kernel is far below the roof at small batches.':'Not free here although the roof says it should be: the library\'s tiled kernel is still far below the roof at this batch (which tile configuration it chose was not inspected here).'):'Still memory-bound.';
      else c+=pv.ai*pv.bw<pv.P?'<b>The layer has crossed the ridge</b>: from now on the arithmetic, not the memory, sets the time.':'Compute-bound: doubling the work doubles the time, and the chip is doing what it was built for.'}
    return c}
  function draw(i){const d=stepData(i),chip=mode==='m1'?m1:h100,prec=mode==='m1'?'fp16':'bf16';
    const trail=[];for(let j=0;j<i;j++){const q=stepData(j);trail.push({ai:q.ai,g:q.g,r:3,fill:'var(--dim)',label:'batch '+q.M})}
    R.chart({el:$('roof-anplot'),chips:[{chip:chip,prec:prec,main:true}],pts:trail,cur:{ai:d.ai,g:d.g,label:'batch '+d.M},xr:[0.3,3000],yr:mode==='m1'?[20,20000]:[400,4e6],aria:'One linear layer at growing batch on the '+chip.name});
    $('roof-ancap').innerHTML=caption(i);
    const tok=d.t/d.M;
    $('roof-anout').innerHTML=R.stat('Batch',d.M.toLocaleString('en-US'),mode==='m1'?'measured, median of 21 trials':'computed from the vendor roof')+
      R.stat('Time per call',R.fT(d.t),d.meas?'trials '+R.fT(sweep[i].s_min)+' to '+R.fT(sweep[i].s_max):'at the roof, a lower bound')+
      R.stat('Time per token',R.fT(tok),i?R.sig(stepData(0).t/tok,3)+'x faster per token than batch 1':'the decode case')+
      R.stat('Achieved',R.fF(d.g),R.pct(d.g/d.P)+' of '+(d.meas?'measured':'vendor')+' peak');
  }
  // step controller: play, pause, step, scrub, speed; animates only on screen in the visible tab; paused under reduced motion
  const ctl=$('roof-anctl'),card=$('roof-s-anim');
  ctl.innerHTML='<button id="roof-an-b" aria-label="Previous step">&#9664;&#9664;</button><button id="roof-an-p" aria-label="Play">&#9654; Play</button><button id="roof-an-f" aria-label="Next step">&#9654;&#9654;</button><input type="range" id="roof-an-s" min="0" max="'+(sweep.length-1)+'" value="0" aria-label="Batch step"><label class="small">Speed <select id="roof-an-v"><option value="0.5">0.5x</option><option value="1" selected>1x</option><option value="2">2x</option></select></label>';
  const st={i:0,play:false,timer:0,vis:false,started:false,spd:1},n=sweep.length;
  const live=()=>st.vis&&!document.hidden&&card.offsetParent!==null;
  function show(){$('roof-an-s').value=st.i;draw(st.i)}
  function tick(){st.timer=0;if(!st.play||!live())return;if(st.i>=n-1){setPlay(false);return}st.i++;show();if(st.i>=n-1){setPlay(false);return}st.timer=setTimeout(tick,1700/st.spd)}
  function kick(){if(st.play&&live()&&!st.timer)st.timer=setTimeout(tick,1700/st.spd);else if(!live()&&st.timer){clearTimeout(st.timer);st.timer=0}}
  function setPlay(p){st.play=p;$('roof-an-p').innerHTML=p?'&#10073;&#10073; Pause':'&#9654; Play';$('roof-an-p').setAttribute('aria-label',p?'Pause':'Play');
    if(!p&&st.timer){clearTimeout(st.timer);st.timer=0}if(p&&st.i>=n-1){st.i=0;show()}kick()}
  $('roof-an-p').addEventListener('click',()=>setPlay(!st.play));
  $('roof-an-f').addEventListener('click',()=>{setPlay(false);st.i=Math.min(n-1,st.i+1);show()});
  $('roof-an-b').addEventListener('click',()=>{setPlay(false);st.i=Math.max(0,st.i-1);show()});
  $('roof-an-s').addEventListener('input',e=>{setPlay(false);st.i=+e.target.value;show()});
  $('roof-an-v').addEventListener('change',e=>{st.spd=+e.target.value});
  document.querySelectorAll('#roof-anmode button').forEach(b=>b.addEventListener('click',()=>{
    document.querySelectorAll('#roof-anmode button').forEach(x=>x.classList.toggle('on',x===b));mode=b.dataset.m;setPlay(false);st.i=0;show();if(!R.RM)setPlay(true)}));
  if('IntersectionObserver' in window){new IntersectionObserver(es=>{st.vis=es[es.length-1].isIntersecting;
    if(st.vis&&!st.started&&card.offsetParent){st.started=true;if(!R.RM){st.i=0;show();setPlay(true)}}kick()},{threshold:.2}).observe(card)}else st.vis=true;
  document.addEventListener('visibilitychange',kick);
  let lastW=0;
  R.onRender(()=>{const w=$('roof-anplot').clientWidth;if(w){lastW=w;show()}kick()});
  addEventListener('resize',()=>{const w=$('roof-anplot').clientWidth;if(w&&w!==lastW){lastW=w;show()}});
  window.ROOFX.anim={setMode:m=>{mode=m},draw:draw,n:n};
})();
