// ---- Reading section 3: the real torch.profiler trace of one training step, CPU against MPS, and its table ----
(function(){
  const P=PCD.profiler,f=MC.fmtN;let dev='cpu';
  const el=document.getElementById('rd-prof-svg'),tab=document.getElementById('rd-prof-tab'),note=document.getElementById('rd-prof-note');
  function colour(n){if(/^ProfilerStep/.test(n))return 'var(--dim)';if(n==='forward')return 'var(--c1)';if(n==='backward')return 'var(--c2)';if(n==='optimizer'||/^Optimizer/.test(n))return 'var(--c3)';
    if(/mm|addmm|linear/.test(n))return 'var(--c4)';if(/Backward|backward/.test(n))return 'var(--c5)';return 'var(--c6)'}
  function draw(){
    const D=P[dev],W=RD.width(el),L=W<500?58:76,R=10,X=t=>L+t/D.step_us*(W-L-R);
    // lanes: one per thread, rows by nesting depth inside a thread
    const ths=[...new Set(D.events.map(e=>e.th))];const lanes=[];let y=8,s='';
    ths.forEach((th,k)=>{const ev=D.events.filter(e=>e.th===th).sort((a,b)=>a.t-b.t||b.d-a.d),stack=[];let maxd=0;
      ev.forEach(e=>{while(stack.length&&stack[stack.length-1].t+stack[stack.length-1].d<=e.t+0.001)stack.pop();e._dep=stack.length;maxd=Math.max(maxd,e._dep);stack.push(e)});
      const rows=Math.min(maxd+1,6),h=15;
      s+=RD.t(L-6,y+12,W<500?(k===0?'main':'autograd'):(k===0?'main thread':'autograd thread'),{a:'end',fs:10,fill:'var(--mute)'});
      ev.forEach(e=>{if(e._dep>=rows)return;const x=X(e.t),w=Math.max(1,X(e.t+e.d)-x),yy=y+e._dep*(h+2);
        s+='<rect x="'+x.toFixed(1)+'" y="'+yy+'" width="'+w.toFixed(1)+'" height="'+h+'" rx="2" style="fill:'+colour(e.n)+';opacity:.85"><title>'+RD.esc(e.n)+': '+f(e.d,0)+' us at '+f(e.t/1000,2)+' ms</title></rect>';
        const lab=e.n.replace(/^aten::/,'');if(w>lab.length*5.5+6)s+=RD.t(x+3,yy+11,RD.esc(lab),{fs:9.5,fill:'var(--bg)'})});
      y+=rows*(h+2)+12});
    const st=D.step_us/1000>10?5:1;for(let v=0;v<=D.step_us/1000+1e-9;v+=st){const x=X(v*1000);s+='<line x1="'+x+'" x2="'+x+'" y1="'+(y-4)+'" y2="'+y+'" style="stroke:var(--mute)"/>'+RD.t(x,y+12,f(v,0)+' ms',{a:'middle',fs:10,fill:'var(--mute)'})}
    el.innerHTML=RD.svg(W,y+18,s,'torch.profiler trace of one training step');
    tab.innerHTML='<table class="tbl-sm"><thead><tr><th>Operator (top 8 by self CPU time, 2 steps)</th><th class="num">calls</th><th class="num">self CPU, &micro;s</th><th class="num">per call</th><th class="num">GFLOP</th></tr></thead><tbody>'+
      D.rows.slice(0,8).map(r=>'<tr><td class="mname">'+RD.esc(r.name)+'</td><td class="num">'+r.calls+'</td><td class="num">'+f(r.self_cpu_us,0)+'</td><td class="num">'+f(r.self_cpu_us/r.calls,1)+'</td><td class="num">'+(r.flops?f(r.flops/1e9,1):'')+'</td></tr>').join('')+'</tbody></table>';
    note.innerHTML='<span class="meas">measured here</span> PyTorch '+P.torch+', '+(dev==='cpu'?'model on the CPU (2 threads)':'model on the M1 Pro GPU via MPS; CPU activity only')+'. '+RD.esc(D.step)+' lasted '+f(D.step_us/1000,2)+' ms; '+D.events.length+' of its '+D.events_total_in_step+' events are drawn (those of 25 &micro;s or more, plus the phase ranges; up to 6 nesting levels). Wall time per step, synchronised: '+D.wall.map(v=>f(v,1)).join(', ')+' ms (the first is the warm-up of section 2).'+(dev==='mps'?' The empty right part of the step is the CPU waiting in the final synchronise for the GPU to finish the work it queued.':'')+' Colours: grey step, blue forward, orange backward, green optimizer, purple matmuls.';
  }
  RD.seg(document.getElementById('rd-prof-seg'),v=>{dev=v;draw()});
  RD.onRender(draw);RD.onResize(draw);draw();
  const row=(d,n)=>P[d].rows.find(r=>r.name===n);
  Object.assign(window.RDV=window.RDV||{},{pc_mm:f(row('cpu','aten::mm').self_cpu_us/row('cpu','aten::mm').calls,1),pm_mm:f(row('mps','aten::mm').self_cpu_us/row('mps','aten::mm').calls,1),
    pm_step:f(row('mps','ProfilerStep*').self_cpu_us/1000,2),p_acts:P.activities.join(', ')});
})();
