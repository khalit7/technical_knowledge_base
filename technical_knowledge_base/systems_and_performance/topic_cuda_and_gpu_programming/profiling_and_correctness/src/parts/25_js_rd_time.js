// ---- Reading section 1: one matmul timed four ways (before/after timeline, to scale, measured medians) ----
(function(){
  const A=PCD.timing.async,f=MC.fmtN;
  const L=A.host_nosync_ms.median,G=A.event_ms.median,S=A.host_sync_ms.median,Q=A.host_queued_ms.median;
  const MODES={
    nosync:{max:G*1.08,report:L,steps:[
      ['The clock starts','t0 = time.perf_counter(). The GPU is idle.'],
      ['The CPU queues the multiply','c = a @ b writes a command into the queue and returns after '+f(L,2)+' ms.'],
      ['The clock stops','t1 is read straight away: the clock says '+f(L,2)+' ms.'],
      ['The GPU does the work afterwards','The multiply runs for '+f(G,2)+' ms after the clock stopped. The reported time is '+f(G/L,0)+' times too small.']],
      els:[{l:'cpu',a:0,b:L,s:1,c:'var(--c1)',t:'queue'},{l:'gpu',a:L,b:L+G,s:3,c:'var(--c2)',t:'matmul'}],br:{a:0,b:L,s:2}},
    sync:{max:S*1.08,report:S,steps:[
      ['Synchronise, then start the clock','The queue is empty, so the clock measures only this call.'],
      ['The CPU queues the multiply','The call returns after '+f(L,2)+' ms, as before.'],
      ['The CPU waits in synchronize()','torch.cuda.synchronize() blocks until the queue is empty.'],
      ['The GPU finishes; the clock stops','The clock says '+f(S,2)+' ms: the multiply plus the launch and the synchronise.']],
      els:[{l:'cpu',a:0,b:L,s:1,c:'var(--c1)',t:'queue'},{l:'cpu',a:L,b:S,s:2,c:'var(--dim)',t:'waiting in synchronize()'},{l:'gpu',a:L,b:L+G,s:2,c:'var(--c2)',t:'matmul'}],br:{a:0,b:S,s:3}},
    event:{max:S*1.08,report:G,steps:[
      ['start.record() puts a marker in the queue','The marker is a command too: the GPU stamps the time when it reaches it.'],
      ['The CPU queues the multiply, then end.record()','Both calls return at once.'],
      ['The GPU runs the multiply between the markers','The CPU synchronises before asking for the result.'],
      ['elapsed_time() reads the two stamps',''+f(G,2)+' ms of GPU time, without the CPU\'s launch overhead.']],
      els:[{l:'cpu',a:0,b:L,s:1,c:'var(--c1)',t:'queue'},{l:'cpu',a:L,b:S,s:2,c:'var(--dim)',t:'synchronize()'},{l:'gpu',a:L,b:L+G,s:2,c:'var(--c2)',t:'matmul'}],
      mk:[{x:L,s:0,t:'start'},{x:L+G,s:1,t:'end'}],br:{a:L,b:L+G,s:3,gpu:1}},
    queued:{max:Q*1.05,report:Q,steps:[
      ['Four earlier multiplies are still queued','The loop above queued them and nobody synchronised.'],
      ['The clock starts, one more multiply is queued','The CPU returns at once; the GPU is still busy with the earlier work.'],
      ['synchronize() waits for the whole queue','It cannot wait for "my" kernel only: it drains everything.'],
      ['The clock stops','It says '+f(Q,1)+' ms, about '+f(Q/G,1)+' multiplies, not one.']],
      els:(function(){const o=[],st=Q-5*G;for(let k=0;k<5;k++){const a=st+k*G,b=a+G;if(b<=0)continue;o.push({l:'gpu',a:Math.max(0,a),b:b,s:k<4?0:1,c:k<4?'var(--c5)':'var(--c2)',t:k<4?'earlier':'yours'})}
        o.push({l:'cpu',a:0,b:L,s:1,c:'var(--c1)',t:''},{l:'cpu',a:L,b:Q,s:2,c:'var(--dim)',t:'waiting in synchronize()'});return o})(),br:{a:0,b:Q,s:3}}
  };
  let mode='nosync';
  const el=document.getElementById('rd-tl-svg'),cap=document.getElementById('rd-tl-cap'),cnt=document.getElementById('rd-tl-cnt');
  function draw(i){
    const m=MODES[mode],W=RD.width(el),Lx=W<500?40:52,R=12,X=v=>Lx+v/m.max*(W-Lx-R),H=150;
    let s='';
    // axis
    const st=m.max>10?5:m.max>2?1:0.5;
    for(let v=0;v<=m.max+1e-9;v+=st){const x=X(v);s+='<line x1="'+x+'" x2="'+x+'" y1="20" y2="118" style="stroke:var(--line)"/>'+RD.t(x,132,f(v,st<1?1:0)+' ms',{a:'middle',fs:10,fill:'var(--mute)'})}
    s+=RD.t(Lx-6,48,'CPU',{a:'end',fs:11,w:600})+RD.t(Lx-6,98,'GPU',{a:'end',fs:11,w:600});
    m.els.forEach(e=>{if(e.s>i)return;const y=e.l==='cpu'?34:84,x=X(e.a),w=Math.max(2,X(e.b)-X(e.a));
      s+='<rect x="'+x.toFixed(1)+'" y="'+y+'" width="'+w.toFixed(1)+'" height="22" rx="3" style="fill:'+e.c+';opacity:.85"/>';
      if(e.t&&w>e.t.length*5.6+6)s+=RD.t(x+4,y+15,e.t,{fs:10.5,fill:e.c==='var(--dim)'?'var(--ink)':'var(--bg)'})});
    (m.mk||[]).forEach(k=>{if(k.s>i)return;const x=X(k.x);s+='<line x1="'+x+'" x2="'+x+'" y1="78" y2="112" style="stroke:var(--c4)" stroke-width="2"/>'+RD.t(x,74,k.t,{a:'middle',fs:10,fill:'var(--c4)'})});
    if(m.br.s<=i){const a=X(m.br.a),b=X(m.br.b),y=m.br.gpu?114:24;s+='<path d="M'+a+' '+(y-4)+'V'+y+'H'+b+'V'+(y-4)+'" fill="none" style="stroke:var(--bad)" stroke-width="2"/>'+RD.t(Math.min(W-R-60,Math.max(a,(a+b)/2)),y-7+(m.br.gpu?20:0),'measured: '+f(m.report,2)+' ms',{a:'middle',fs:11,w:600,fill:'var(--bad)'})}
    el.innerHTML=RD.svg(W,H,s,'CPU and GPU timeline of one matmul');
    const t=m.steps[i];cap.innerHTML='<div class="t">Step '+(i+1)+' of 4: '+t[0]+'</div><p>'+t[1]+'</p>';
    const k=mode==='nosync'?'host_nosync_ms':mode==='sync'?'host_sync_ms':mode==='event'?'event_ms':'host_queued_ms';
    cnt.innerHTML=RD.stat('Timer reports',i>=3?f(m.report,2)+' ms':'...','runs: '+A[k].runs.map(v=>f(v,mode==='nosync'?3:2)).join(', '))+
      RD.stat('GPU time of this multiply',f(G,2)+' ms','event median; runs '+A.event_ms.runs.map(v=>f(v,2)).join(', '))+
      RD.stat('Error',i>=3?(m.report>=G?'+':'')+f((m.report/G-1)*100,0)+'%':'...','against the event time')+
      RD.stat('Throughput implied',i>=3?f(A.flops/m.report/1e9,A.flops/m.report/1e9<10?2:0)+' TFLOP/s':'...','2N&sup3; = '+f(A.flops/1e9,1)+' GFLOP; the M1 Pro GPU peaks near 5 TFLOP/s');
  }
  const an=RD.anim({card:'rd-tl-card',ctl:'rd-tl-ctl',n:4,ms:1600,draw,label:'Timing step'});
  RD.seg(document.getElementById('rd-tl-seg'),v=>{mode=v;an.reset(4);an.play()});
  RD.onResize(()=>an.redraw());
  // predict boxes (all sections)
  document.querySelectorAll('#t-read .pr').forEach(pr=>pr.addEventListener('click',e=>{const b=e.target.closest('button[data-a]');if(!b)return;
    pr.querySelectorAll('button[data-a]').forEach(x=>{x.classList.remove('right','wrong');if(x.dataset.right)x.classList.add('right')});
    if(!b.dataset.right)b.classList.add('wrong');pr.querySelector('.ans').hidden=false}));
  // numbers in prose come from the data
  const V={q_ms:f(Q,2),sync_ms:f(S,3),tiny_ev:f(PCD.timing.tiny.event_ms.median,3),tiny_sync:f(PCD.timing.tiny.per_op_sync_ms.median,3),
    tiny_batch_us:f(PCD.timing.tiny.batched_ms_per_op.median*1000,2)};
  window.RDV=Object.assign(window.RDV||{},V);
})();
